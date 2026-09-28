"""
money_movement_hub.py
=====================
Block 3 Orchestrator: bridges the Financial Core and the Provider Ecosystem.

Responsibilities:
  - Enqueue outward movements into the Outbox
  - Process Outbox events (dispatch to provider)
  - Process inbound webhooks (verify + deduplicate + resolve)
  - Reconcile IN_DOUBT transactions via status_query
"""
import uuid
import json
import hashlib
import logging
import time
from typing import Mapping
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.money_rail import MoneyRail
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.provider_attempt import ProviderAttempt
from app.models.outbox_event import OutboxEvent, OutboxStatus
from app.models.webhook_event import WebhookEvent, WebhookProcessingStatus
from app.providers.base import (
    ProviderMovementRequest,
    ProviderResult,
    ProviderStatus,
    ProviderEventType,
    FailureClassification,
    classify_provider_result,
)
from app.providers.router import get_default_router
from app.services.rail_resolver import RailResolver
from app.services.transaction_lifecycle import (
    advance_to_completed,
    advance_to_failed,
    advance_to_in_doubt,
    resolve_from_in_doubt,
)
from app.rules.decision import ConstraintViolationException

logger = logging.getLogger(__name__)


class MoneyMovementHub:
    
    def __init__(self, router=None):
        self.router = router or get_default_router()
        self.rail_resolver = RailResolver()
        
    def enqueue_operation(
        self,
        db: Session,
        transaction: Transaction,
        rail: str,
        request_payload: dict,
    ) -> ProviderAttempt:
        """
        Create the ProviderAttempt and OutboxEvent transactionally.
        Called by financial_operations.py AFTER funds are reserved.
        """
        money_rail = MoneyRail(rail)
        provider = self.router.resolve(transaction.type, money_rail, transaction.currency)
        provider_code = str(getattr(provider, "provider_code", provider.name)).upper()

        destination = (
            request_payload.get("destination_address")
            or request_payload.get("source_address")
            or request_payload.get("merchant_code")
            or ""
        )
        destination_type = request_payload.get("destination_type") or request_payload.get("source_type")
        resolution = self.rail_resolver.resolve(
            destination, money_rail, destination_type=destination_type
        )
        request_payload = dict(request_payload)
        if "destination_address" in request_payload and resolution.normalized_destination:
            request_payload["destination_address"] = resolution.normalized_destination
        elif "source_address" in request_payload and resolution.normalized_destination:
            request_payload["source_address"] = resolution.normalized_destination

        now = datetime.now(timezone.utc)
        
        attempt_number = 1
        # If there are existing attempts, increment
        existing_attempts = db.query(ProviderAttempt).filter_by(transaction_id=transaction.id).count()
        if existing_attempts > 0:
            attempt_number = existing_attempts + 1

        attempt = ProviderAttempt(
            transaction_id=transaction.id,
            provider_code=provider_code,
            rail=rail,
            operation=transaction.type.value,
            attempt_number=attempt_number,
            status="PENDING",
            provider_idempotency_key=f"{transaction.id}_{attempt_number}",
            amount_pesewas=transaction.amount,
            destination_address=resolution.normalized_destination or transaction.destination_address,
            destination_type=transaction.destination_type,
            request_payload=json.dumps(request_payload),
            dispatched_at=None,
        )
        db.add(attempt)
        db.flush()

        outbox_event = OutboxEvent(
            transaction_id=transaction.id,
            provider_attempt_id=attempt.id,
            event_type="DISPATCH_OPERATION",
            payload=json.dumps(request_payload),
        )
        db.add(outbox_event)
        
        return attempt

    def dispatch_outbox_event(self, db: Session, event: OutboxEvent):
        """Called by the async worker to actually hit the network."""
        attempt = db.get(ProviderAttempt, event.provider_attempt_id)
        if not attempt:
            raise ValueError(f"ProviderAttempt {event.provider_attempt_id} not found.")
            
        tx = db.get(Transaction, event.transaction_id)
        if not tx:
            raise ValueError(f"Transaction {event.transaction_id} not found.")

        # Resolve provider
        money_rail = MoneyRail(attempt.rail)
        try:
            provider = self.router.resolve(tx.type, money_rail, tx.currency,
                                           preferred_provider_code=attempt.provider_code if attempt.provider_code != "UNROUTED" else None)
        except Exception as exc:
            # Routing failed before any network request was made, so it is safe
            # to release the reservation as a confirmed local failure.
            attempt.status = "FAILED"
            attempt.error_code = "PROVIDER_UNAVAILABLE"
            attempt.error_message = str(exc)
            logger.warning("provider_routing_failed", extra={
                "arezak_transaction_id": str(tx.id),
                "provider_attempt_id": str(attempt.id),
                "provider_code": attempt.provider_code,
                "rail": attempt.rail,
                "operation": attempt.operation,
                "failure_classification": FailureClassification.ROUTING.value,
            })
            advance_to_failed(db, tx.id, tx.user_id, failure_reason=str(exc),
                              error_code="PROVIDER_UNAVAILABLE")
            return
        
        # Update attempt to dispatched
        attempt.status = "DISPATCHED"
        attempt.provider_code = provider.name
        attempt.dispatched_at = datetime.now(timezone.utc)
        db.flush()
        logger.info("provider_request_sent", extra={
            "arezak_transaction_id": str(tx.id),
            "provider_attempt_id": str(attempt.id),
            "provider_id": attempt.provider_code,
            "rail": attempt.rail,
            "operation": attempt.operation,
            "retry_count": max(0, attempt.attempt_number - 1),
        })
        
        req_payload = json.loads(event.payload)
        
        req = ProviderMovementRequest(
            idempotency_key=attempt.provider_idempotency_key,
            operation=tx.type,
            amount_pesewas=tx.amount,
            currency=tx.currency,
            rail=attempt.rail,
            source_address=req_payload.get("source_address"),
            source_type=req_payload.get("source_type"),
            destination_address=req_payload.get("destination_address"),
            destination_type=req_payload.get("destination_type"),
            merchant_code=req_payload.get("merchant_code"),
            service_type=req_payload.get("service_type"),
        )
        
        dispatch_started = time.monotonic()
        try:
            result = provider.initiate(req)
        except Exception:
            logger.warning("provider_outcome_unknown", extra={
                "arezak_transaction_id": str(tx.id),
                "provider_attempt_id": str(attempt.id),
                "provider_id": provider.name,
            })
            result = ProviderResult(
                status=ProviderStatus.IN_DOUBT,
                error_message="Provider call ended without a definitive response.",
                error_code="PROVIDER_DISPATCH_EXCEPTION"
            )

        logger.info("provider_operation_finished", extra={
            "arezak_transaction_id": str(tx.id),
            "provider_attempt_id": str(attempt.id),
            "provider_code": attempt.provider_code,
            "rail": attempt.rail,
            "operation": attempt.operation,
            "provider_reference": result.provider_reference,
            "provider_status": result.status.value,
            "failure_classification": classify_provider_result(result.status).value,
            "latency_ms": round((time.monotonic() - dispatch_started) * 1000),
            "retry_count": max(0, attempt.attempt_number - 1),
        })

        self._apply_provider_result(db, tx, attempt, result)


    def _apply_provider_result(
        self,
        db: Session,
        tx: Transaction,
        attempt: ProviderAttempt,
        result: ProviderResult,
    ) -> None:
        """Apply the outcome of a provider call to the Transaction + Attempt."""
        if result.amount_pesewas is not None and result.amount_pesewas != attempt.amount_pesewas:
            result = ProviderResult(
                status=ProviderStatus.IN_DOUBT,
                provider_reference=result.provider_reference,
                raw_response=result.raw_response,
                error_code="PROVIDER_AMOUNT_MISMATCH",
                error_message="Provider response amount did not match the request.",
            )
        if result.status == ProviderStatus.SUCCEEDED and (
            result.amount_pesewas is None or result.currency is None
        ):
            result = ProviderResult(
                status=ProviderStatus.IN_DOUBT,
                provider_reference=result.provider_reference,
                raw_response=result.raw_response,
                error_code="PROVIDER_RESULT_INCOMPLETE",
                error_message="Provider success response omitted amount or currency.",
            )
        if result.currency is not None and result.currency != tx.currency:
            result = ProviderResult(
                status=ProviderStatus.IN_DOUBT,
                provider_reference=result.provider_reference,
                raw_response=result.raw_response,
                error_code="PROVIDER_CURRENCY_MISMATCH",
                error_message="Provider response currency did not match the request.",
            )
        raw_json = json.dumps(result.raw_response)
        
        attempt.provider_reference = result.provider_reference
        attempt.response_payload = raw_json
        attempt.error_code = result.error_code
        attempt.error_message = result.error_message
        attempt.responded_at = datetime.now(timezone.utc)
        logger.info("provider_response_received", extra={
            "arezak_transaction_id": str(tx.id),
            "provider_attempt_id": str(attempt.id),
            "provider_id": attempt.provider_code,
            "provider_reference": result.provider_reference,
            "provider_status": result.status.value,
        })
        
        if result.status == ProviderStatus.SUCCEEDED:
            attempt.status = "SUCCEEDED"
            advance_to_completed(
                db, tx.id, tx.user_id,
                provider_reference=result.provider_reference,
                response_payload=raw_json,
                # provider_attempt_id=attempt.id,
            )
            
        elif result.status == ProviderStatus.FAILED:
            attempt.status = "FAILED"
            advance_to_failed(
                db, tx.id, tx.user_id,
                failure_reason=result.error_message or "Provider failure",
                provider_reference=result.provider_reference,
                response_payload=raw_json,
                error_code=result.error_code,
            )
            
        elif result.status == ProviderStatus.PENDING:
            attempt.status = "DISPATCHED" # still waiting
            # tx status stays PROCESSING
            
        elif result.status == ProviderStatus.IN_DOUBT:
            attempt.status = "IN_DOUBT"
            advance_to_in_doubt(
                db, tx.id, tx.user_id,
                reason=result.error_message or "Provider outcome unknown",
                error_code=result.error_code,
                provider_reference=result.provider_reference,
            )


    def ingest_webhook(
        self,
        db: Session,
        provider_code: str,
        payload_bytes: bytes,
        headers: Mapping[str, str],
    ) -> WebhookEvent:
        """
        Ingest a webhook. Authenticates, deduplicates, saves, and resolves.
        """
        provider = self.router.by_code(provider_code)
        provider_code = str(getattr(provider, "provider_code", provider.name)).upper()
        from app.models.money_rail import ProviderCapability
        from app.providers.base import require_capability
        require_capability(provider, ProviderCapability.WEBHOOKS)
        verified_event = provider.verify_webhook(payload_bytes, headers)
        if verified_event.provider_code.casefold() != provider_code.casefold():
            raise ValueError("Verified webhook provider identity does not match route.")
        if not verified_event.provider_event_id or not verified_event.provider_event_id.strip():
            raise ValueError("Webhook event ID is required.")
        # Deduplicate
        payload_hash = hashlib.sha256(payload_bytes).hexdigest()
        existing = db.query(WebhookEvent).filter_by(
            provider_code=provider_code,
            provider_event_id=verified_event.provider_event_id
        ).first()
        
        if existing:
            if existing.payload_hash != payload_hash:
                raise ValueError("Provider event ID was reused with a different payload.")
            logger.info("webhook_duplicate", extra={"provider_code": provider_code,
                                                       "provider_event_id": verified_event.provider_event_id})
            return existing

        if verified_event.occurred_at is None:
            raise ValueError("Webhook event timestamp is required for replay protection.")
        event_time = verified_event.occurred_at
        if event_time.tzinfo is None:
            raise ValueError("Webhook event timestamp must include a timezone.")
        now = datetime.now(timezone.utc)
        if event_time < now - timedelta(minutes=5) or event_time > now + timedelta(minutes=2):
            raise ValueError("Webhook event timestamp is outside the accepted replay window.")
            
        # Create WebhookEvent
        we = WebhookEvent(
            provider_code=provider_code,
            provider_event_id=verified_event.provider_event_id,
            event_type=verified_event.event_type.value,
            provider_reference=verified_event.provider_reference,
            payload_hash=payload_hash,
            payload=payload_bytes.decode('utf-8'),
            received_at=datetime.now(timezone.utc),
        )
        try:
            with db.begin_nested():
                db.add(we)
                db.flush()
        except IntegrityError:
            # A parallel delivery may have inserted this event after our lookup.
            existing = db.query(WebhookEvent).filter_by(
                provider_code=provider_code,
                provider_event_id=verified_event.provider_event_id,
            ).first()
            if existing and existing.payload_hash == payload_hash:
                return existing
            raise ValueError("Provider event ID was reused with a different payload.")
        
        # Try to resolve transaction
        if verified_event.provider_reference:
            attempt = db.query(ProviderAttempt).filter_by(
                provider_code=provider_code,
                provider_reference=verified_event.provider_reference
            ).first()
            
            if attempt:
                tx = db.get(Transaction, attempt.transaction_id)
                # Provider facts must match the immutable request before they can
                # authorize a ledger transition.
                is_final = verified_event.event_type in (
                    ProviderEventType.TRANSACTION_SUCCEEDED,
                    ProviderEventType.TRANSACTION_FAILED,
                )
                if is_final and (type(verified_event.amount_pesewas) is not int
                                 or verified_event.amount_pesewas != attempt.amount_pesewas):
                    raise ValueError("Webhook amount does not match provider attempt.")
                if is_final and (tx is None or verified_event.currency != tx.currency):
                    raise ValueError("Webhook currency does not match transaction.")
                if tx and tx.status in (TransactionStatus.PROCESSING.value, TransactionStatus.IN_DOUBT.value):
                    succeeded = (verified_event.event_type == ProviderEventType.TRANSACTION_SUCCEEDED)
                    failed = (verified_event.event_type == ProviderEventType.TRANSACTION_FAILED)
                    
                    if succeeded or failed:
                        # Before we resolve, we must ensure it's IN_DOUBT or we must use resolve_from_in_doubt
                        # If it's PROCESSING, we can advance to complete/failed.
                        if tx.status == TransactionStatus.IN_DOUBT.value:
                            resolve_from_in_doubt(
                                db, tx.id, tx.user_id,
                                succeeded=succeeded,
                                provider_reference=verified_event.provider_reference,
                                response_payload=we.payload,
                                failure_reason="Webhook failure notification" if failed else None
                            )
                        else:
                            if succeeded:
                                advance_to_completed(
                                    db, tx.id, tx.user_id,
                                    provider_reference=verified_event.provider_reference,
                                    response_payload=we.payload
                                )
                            else:
                                advance_to_failed(
                                    db, tx.id, tx.user_id,
                                    failure_reason="Webhook failure notification",
                                    provider_reference=verified_event.provider_reference,
                                    response_payload=we.payload
                                )
                                
                        attempt.status = "SUCCEEDED" if succeeded else "FAILED"
                        we.resolved_transaction_id = str(tx.id)
                        we.processing_status = WebhookProcessingStatus.PROCESSED
                    else:
                        we.processing_status = WebhookProcessingStatus.PROCESSED # Ignored event
        
        if we.processing_status == WebhookProcessingStatus.RECEIVED:
            # Keep authenticated but unmatched events visible for reconciliation.
            we.processing_status = WebhookProcessingStatus.ERROR
            we.error_message = "No matching provider attempt or actionable transaction."
        we.processed_at = datetime.now(timezone.utc)
        db.commit()
        logger.info("webhook_processed", extra={"provider_code": provider_code,
                                                   "provider_event_id": verified_event.provider_event_id,
                                                   "provider_reference": verified_event.provider_reference,
                                                   "processing_status": we.processing_status})
        return we

    def resolve_in_doubt(self, db: Session, transaction_id: uuid.UUID) -> Transaction:
        """Resolve an uncertain transaction by querying its original provider attempt."""
        self._query_and_resolve(db, transaction_id, allow_processing=False)
        tx = db.get(Transaction, transaction_id)
        if tx is None:
            raise ValueError("Transaction not found.")
        db.refresh(tx)
        return tx

    def reconcile_provider_status(self, db: Session, transaction_id: uuid.UUID):
        """Query provider truth, resolve only a verified final state, and persist evidence."""
        return self._query_and_resolve(db, transaction_id, allow_processing=True)

    def _query_and_resolve(self, db: Session, transaction_id: uuid.UUID,
                           *, allow_processing: bool):
        tx = db.query(Transaction).filter_by(id=transaction_id).with_for_update().first()
        allowed = {TransactionStatus.IN_DOUBT.value}
        if allow_processing:
            allowed.add(TransactionStatus.PROCESSING.value)
        if tx is None or tx.status not in allowed:
            raise ValueError("Transaction is not eligible for provider status inquiry.")
        attempt = (db.query(ProviderAttempt).filter_by(transaction_id=tx.id)
                   .order_by(ProviderAttempt.attempt_number.desc()).first())
        if attempt is None:
            raise ValueError("Provider status inquiry requires an attempt.")
        provider = self.router.by_code(attempt.provider_code)
        from app.models.money_rail import ProviderCapability
        from app.providers.base import require_capability
        if attempt.provider_reference:
            require_capability(provider, ProviderCapability.STATUS_QUERY)
            result = provider.status_query(attempt.provider_reference)
        else:
            require_capability(provider, ProviderCapability.STATUS_QUERY_BY_IDEMPOTENCY_KEY)
            lookup = getattr(provider, "status_query_by_idempotency_key", None)
            if not callable(lookup):
                raise NotImplementedError("Provider declares idempotency status lookup but has no implementation.")
            result = lookup(attempt.provider_idempotency_key)
            if not result.provider_reference:
                raise ValueError("Provider status inquiry did not return a stable reference.")
            # This status response is correlated by the original provider key;
            # persist its discovered reference for future webhooks and inquiries.
            attempt.provider_reference = result.provider_reference
        from app.services.reconciliation import reconcile_transaction
        mismatch = (
            result.provider_reference != attempt.provider_reference
            or result.amount_pesewas != attempt.amount_pesewas
            or result.currency != tx.currency
        )
        if mismatch:
            evidence = reconcile_transaction(
                db, tx.id,
                provider_status=result.status.value,
                provider_reference=result.provider_reference,
                provider_amount_pesewas=result.amount_pesewas,
                provider_currency=result.currency,
            )
            db.commit()
            return evidence
        if result.status not in (ProviderStatus.SUCCEEDED, ProviderStatus.FAILED):
            evidence = reconcile_transaction(
                db, tx.id,
                provider_status=result.status.value,
                provider_reference=result.provider_reference,
                provider_amount_pesewas=result.amount_pesewas,
                provider_currency=result.currency,
            )
            db.commit()
            return evidence
        attempt.response_payload = json.dumps(result.raw_response)
        attempt.responded_at = datetime.now(timezone.utc)
        attempt.status = "SUCCEEDED" if result.status == ProviderStatus.SUCCEEDED else "FAILED"
        if tx.status == TransactionStatus.IN_DOUBT.value:
            resolve_from_in_doubt(
                db, tx.id, tx.user_id,
                succeeded=result.status == ProviderStatus.SUCCEEDED,
                provider_reference=result.provider_reference,
                response_payload=attempt.response_payload,
                failure_reason=result.error_message,
                error_code=result.error_code,
            )
        elif result.status == ProviderStatus.SUCCEEDED:
            advance_to_completed(db, tx.id, tx.user_id,
                                 provider_reference=result.provider_reference,
                                 response_payload=attempt.response_payload)
        else:
            advance_to_failed(db, tx.id, tx.user_id,
                              failure_reason=result.error_message or "Provider failure",
                              provider_reference=result.provider_reference,
                              response_payload=attempt.response_payload,
                              error_code=result.error_code)
        # Record final-state evidence after the legal lifecycle transition.
        final_evidence = reconcile_transaction(
            db, tx.id,
            provider_status=result.status.value,
            provider_reference=result.provider_reference,
            provider_amount_pesewas=result.amount_pesewas,
            provider_currency=result.currency,
        )
        db.commit()
        return final_evidence
