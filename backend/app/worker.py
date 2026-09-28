"""Polling entry point for the PostgreSQL transactional outbox."""
import logging
import time
from app.db.session import SessionLocal
from app.services.outbox_worker import process_outbox_events

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run() -> None:
    logger.info("money_movement_outbox_worker_started")
    while True:
        try:
            with SessionLocal() as db:
                processed = process_outbox_events(db, batch_size=20)
            if processed == 0:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("money_movement_outbox_worker_stopped")
            return
        except Exception:
            logger.exception("money_movement_outbox_worker_iteration_failed")
            time.sleep(2)


if __name__ == "__main__":
    run()
