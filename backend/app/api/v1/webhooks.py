"""Provider webhook ingress. Provider adapters authenticate their own callbacks."""
from fastapi import APIRouter, HTTPException, Request
from app.api.deps import SessionDep
from app.services.money_movement_hub import MoneyMovementHub
from app.providers.base import ProviderRoutingError

router = APIRouter(prefix="/webhooks", tags=["provider-webhooks"])


@router.post("/{provider_code}")
async def receive_provider_webhook(provider_code: str, request: Request, db: SessionDep):
    try:
        event = MoneyMovementHub().ingest_webhook(
            db, provider_code, await request.body(), request.headers
        )
        return {"event_id": str(event.id), "status": event.processing_status}
    except ProviderRoutingError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail="Unknown or unavailable provider.") from exc
    except (ValueError, NotImplementedError) as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid or unverifiable provider webhook.") from exc
