"""Provider-independent destination normalization and rail resolution."""
from __future__ import annotations

import re
from dataclasses import dataclass

from app.models.money_rail import MoneyRail


class RailResolutionError(ValueError):
    """A destination cannot be routed through the requested money rail."""


@dataclass(frozen=True)
class RailResolution:
    rail: MoneyRail
    normalized_destination: str
    network_hint: str | None = None
    hint_is_authoritative: bool = False


_GHANA_PHONE = re.compile(r"^(?:\+233|233|0)(\d{9})$")
def normalize_ghana_phone(value: str) -> str:
    """Return E.164 form (+233...) for a Ghana mobile number."""
    if not isinstance(value, str) or not value.strip():
        raise RailResolutionError("A destination phone number is required.")
    compact = re.sub(r"[\s().-]", "", value.strip())
    match = _GHANA_PHONE.fullmatch(compact)
    if not match:
        raise RailResolutionError("Destination must be a valid Ghana phone number.")
    return "+233" + match.group(1)


class RailResolver:
    """Resolve explicit rail selection and normalize destination details.

    Prefix-derived network information is informational only. Number portability
    means a prefix cannot establish the number's current network.
    """

    def resolve(
        self,
        destination: str,
        requested_rail: MoneyRail | str | None = None,
        *,
        destination_type: str | None = None,
    ) -> RailResolution:
        if requested_rail is None:
            raise RailResolutionError("An explicit money rail is required.")
        try:
            rail = requested_rail if isinstance(requested_rail, MoneyRail) else MoneyRail(requested_rail)
        except (TypeError, ValueError) as exc:
            raise RailResolutionError(f"Unsupported rail: {requested_rail!r}.") from exc
        if rail == MoneyRail.UNKNOWN:
            raise RailResolutionError("Destination rail is unknown and cannot be routed.")
        if rail == MoneyRail.SANDBOX:
            if destination_type not in ("MOBILE_MONEY", "EXTERNAL", None):
                raise RailResolutionError("Sandbox rail does not support this destination type.")
            return RailResolution(rail, destination.strip() if destination else "")

        if rail in (MoneyRail.BANK_TRANSFER, MoneyRail.INTERNAL_AREZAK):
            normalized = destination.strip() if isinstance(destination, str) else ""
            if not normalized:
                raise RailResolutionError(f"A destination is required for {rail.value}.")
            return RailResolution(rail, normalized)

        normalized_phone = normalize_ghana_phone(destination)
        # The user-selected rail is explicit. Phone prefixes are deliberately
        # not used to infer an operator because numbers may be ported.
        return RailResolution(rail, normalized_phone)
