"""
outbox_worker.py
================
Worker for processing the transactional outbox.
"""
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.outbox_event import OutboxEvent, OutboxStatus

logger = logging.getLogger(__name__)


def process_outbox_events(db: Session, batch_size: int = 10, hub=None) -> int:
    """
    Process PENDING outbox events.
    Returns the number of events processed.
    
    This is meant to be called by a background task loop.
    """
    from app.services.money_movement_hub import MoneyMovementHub
    if not hub: hub = MoneyMovementHub()
    
    # Never resend a request after a worker may have sent it and died before
    # saving the response. Preserve funds and route the row to reconciliation.
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    stale = (db.query(OutboxEvent)
             .filter(OutboxEvent.status == OutboxStatus.PROCESSING,
                     OutboxEvent.last_attempted_at < cutoff).all())
    if stale:
        from app.models.provider_attempt import ProviderAttempt
        from app.models.transaction import Transaction
        from app.services.transaction_lifecycle import advance_to_in_doubt
        for event in stale:
            attempt = db.get(ProviderAttempt, event.provider_attempt_id)
            tx = db.get(Transaction, event.transaction_id)
            if attempt and tx and tx.status == "PROCESSING":
                attempt.status = "IN_DOUBT"
                advance_to_in_doubt(db, tx.id, tx.user_id,
                                    reason="Worker interrupted during provider dispatch",
                                    error_code="WORKER_INTERRUPTED")
            event.status = OutboxStatus.DONE
            event.error_message = "Dispatch outcome requires provider reconciliation."
        db.commit()

    processed_count = 0
    for _ in range(batch_size):
        event = (db.query(OutboxEvent)
                 .filter(OutboxEvent.status == OutboxStatus.PENDING)
                 .order_by(OutboxEvent.created_at.asc())
                 .with_for_update(skip_locked=True)
                 .first())
        if event is None:
            break
        event_id = event.id
        try:
            # Mark processing
            event.status = OutboxStatus.PROCESSING
            event.last_attempted_at = datetime.now(timezone.utc)
            event.attempt_count += 1
            db.commit()
            
            hub.dispatch_outbox_event(db, event)
            
            event.status = OutboxStatus.DONE
            db.commit()
            processed_count += 1
            
        except Exception as e:
            logger.error("outbox_processing_exception", extra={
                "outbox_event_id": str(event_id),
                "error_type": type(e).__name__,
            })
            db.rollback()
            # The exception may have happened after the network accepted the
            # request. Preserve the reservation and never retry under a new
            # provider effect; reconciliation can resolve the original attempt.
            ev = db.get(OutboxEvent, event_id)
            if ev:
                from app.models.provider_attempt import ProviderAttempt
                from app.models.transaction import Transaction
                from app.services.transaction_lifecycle import advance_to_in_doubt
                attempt = db.get(ProviderAttempt, ev.provider_attempt_id)
                tx = db.get(Transaction, ev.transaction_id)
                if tx and tx.status == "PROCESSING":
                    if attempt:
                        attempt.status = "IN_DOUBT"
                        attempt.error_code = "OUTBOX_DISPATCH_EXCEPTION"
                        attempt.error_message = "Dispatch outcome requires provider status reconciliation."
                    advance_to_in_doubt(
                        db, tx.id, tx.user_id,
                        reason="Outbox dispatch ended without a definitive provider outcome.",
                        error_code="OUTBOX_DISPATCH_EXCEPTION",
                    )
                ev.status = OutboxStatus.DONE
                ev.error_message = "Dispatch outcome requires provider reconciliation."
                logger.error("outbox_dispatch_in_doubt", extra={
                    "arezak_transaction_id": str(ev.transaction_id),
                    "provider_attempt_id": str(ev.provider_attempt_id),
                    "error_type": type(e).__name__,
                })
                db.commit()
                
    return processed_count
