"""Configuration-backed provider registry and deterministic router."""
from __future__ import annotations

import logging
from dataclasses import dataclass

from app.models.money_rail import MoneyRail, ProviderCapability
from app.providers.base import ProviderInterface, ProviderRoutingError

logger = logging.getLogger(__name__)

_OPERATION_CAPABILITIES = {
    "FUND": ProviderCapability.FUND,
    "SEND": ProviderCapability.SEND,
    "PAY": ProviderCapability.PAY,
    "WITHDRAW": ProviderCapability.WITHDRAW,
}


@dataclass(frozen=True)
class ProviderRegistration:
    """Non-secret operational configuration for one provider adapter."""

    code: str
    rails: frozenset[MoneyRail]
    operations: frozenset[str]
    capabilities: frozenset[ProviderCapability]
    environment: str
    enabled: bool = True
    timeout_seconds: float = 15.0
    max_retries: int = 0

    def __post_init__(self) -> None:
        if not self.code.strip():
            raise ValueError("Provider code is required.")
        if self.timeout_seconds <= 0:
            raise ValueError("Provider timeout must be positive.")
        if self.max_retries < 0:
            raise ValueError("Provider max_retries cannot be negative.")


@dataclass(frozen=True)
class RegisteredProvider:
    adapter: ProviderInterface
    registration: ProviderRegistration


class ProviderRouter:
    """Selects a configured provider for a rail and operation without failover."""

    def __init__(self, environment: str | None = None) -> None:
        if environment is None:
            from app.core.config import settings
            environment = settings.ENVIRONMENT
        self.environment = environment.casefold()
        self._providers: dict[str, RegisteredProvider] = {}
        self._disabled_provider_codes: set[str] = set()
        self._preferred: dict[tuple[str, str], str] = {}

    def register(
        self,
        rail: MoneyRail | None = None,
        adapter: ProviderInterface | None = None,
        *,
        registration: ProviderRegistration | None = None,
    ) -> None:
        """Register an adapter. The rail argument preserves the Block 3 API."""
        if adapter is None:
            raise ValueError("Provider adapter is required.")
        provider_code = str(getattr(adapter, "provider_code", adapter.name)).upper()
        if registration is None:
            rails = frozenset({rail}) if rail is not None else frozenset(adapter.supported_rails)
            registration = ProviderRegistration(
                code=provider_code,
                rails=rails,
                operations=frozenset(_OPERATION_CAPABILITIES),
                capabilities=frozenset(getattr(adapter, "CAPABILITIES", set())),
                environment=self.environment,
            )
        if registration.code.casefold() != provider_code.casefold():
            raise ValueError("Registration code must match adapter provider_code/name.")
        if registration.code.casefold() == "sandbox" and self.environment not in {"development", "test"}:
            raise ProviderRoutingError("Sandbox adapters cannot be registered outside development/test.")
        missing = registration.capabilities - frozenset(getattr(adapter, "CAPABILITIES", set()))
        if missing:
            raise ValueError("Registration declares capabilities the adapter does not implement.")
        if registration.code.casefold() in self._providers:
            raise ValueError(f"Provider {registration.code!r} is already registered.")
        self._providers[registration.code.casefold()] = RegisteredProvider(adapter, registration)
        logger.info("provider_registered", extra={
            "provider_code": registration.code,
            "rails": sorted(r.value for r in registration.rails),
            "environment": registration.environment,
        })

    def set_preferred(self, rail: MoneyRail, operation: str, provider_code: str | None) -> None:
        key = (rail.value, operation.upper())
        if provider_code is None:
            self._preferred.pop(key, None)
            return
        if provider_code.casefold() not in self._providers:
            raise ProviderRoutingError(f"Unknown provider code: {provider_code}.")
        self._preferred[key] = provider_code.casefold()

    def resolve(
        self,
        operation: str,
        rail: MoneyRail,
        currency: str = "GHS",
        *,
        preferred_provider_code: str | None = None,
    ) -> ProviderInterface:
        if currency != "GHS":
            raise ProviderRoutingError(f"Arezak only supports GHS. Cannot route {currency} operation.")
        try:
            rail = rail if isinstance(rail, MoneyRail) else MoneyRail(rail)
        except ValueError as exc:
            raise ProviderRoutingError("Unsupported rail.") from exc
        operation_code = str(getattr(operation, "value", operation)).upper()
        required_capability = _OPERATION_CAPABILITIES.get(operation_code)
        if required_capability is None:
            raise ProviderRoutingError(f"Unsupported operation {operation_code!r}.")

        preferred = preferred_provider_code or self._preferred.get((rail.value, operation_code))
        candidates = list(self._providers.values())
        if preferred:
            candidates = [p for p in candidates if p.registration.code.casefold() == preferred.casefold()]
            if not candidates:
                raise ProviderRoutingError(f"Preferred provider {preferred!r} is not registered.")
        eligible = [
            item for item in candidates
            if item.registration.enabled
            and item.registration.code.casefold() not in self._disabled_provider_codes
            and item.registration.environment.casefold() == self.environment
            and rail in item.registration.rails
            and operation_code in item.registration.operations
            and required_capability in item.registration.capabilities
            and rail in item.adapter.supported_rails
        ]
        if not eligible:
            raise ProviderRoutingError(
                f"No enabled provider supports operation {operation_code!r} on rail {rail.value!r} "
                f"in environment {self.environment!r}."
            )
        # Deterministic configuration order is provider code order; no failover occurs
        # after this one adapter is selected and an attempt is dispatched.
        selected = sorted(eligible, key=lambda item: item.registration.code.casefold())[0]
        logger.info("provider_routed", extra={
            "provider_code": selected.registration.code,
            "rail": rail.value,
            "operation": operation_code,
            "environment": self.environment,
        })
        return selected.adapter

    def registration_for(self, provider_code: str) -> ProviderRegistration:
        try:
            return self._providers[provider_code.casefold()].registration
        except KeyError as exc:
            raise ProviderRoutingError(f"Unknown provider code: {provider_code}.") from exc

    def registered_rails(self) -> list[str]:
        return sorted({rail.value for item in self._providers.values() for rail in item.registration.rails})

    def set_provider_enabled(self, provider_code: str, enabled: bool) -> None:
        code = provider_code.casefold()
        if code not in self._providers:
            raise ProviderRoutingError(f"Unknown provider code: {provider_code}.")
        if enabled:
            self._disabled_provider_codes.discard(code)
        else:
            self._disabled_provider_codes.add(code)

    def by_code(self, provider_code: str) -> ProviderInterface:
        try:
            return self._providers[provider_code.casefold()].adapter
        except KeyError as exc:
            raise ProviderRoutingError(f"Unknown provider code: {provider_code}.") from exc


_default_router: ProviderRouter | None = None


def get_default_router() -> ProviderRouter:
    """Build environment-specific routing. Production has no implicit sandbox."""
    global _default_router
    if _default_router is None:
        from app.core.config import settings
        router = ProviderRouter(settings.ENVIRONMENT)
        provider_mode = getattr(settings, "MONEY_MOVEMENT_MODE", None)
        if settings.ENVIRONMENT.casefold() in {"development", "test"} and provider_mode == "sandbox":
            from app.providers.sandbox import SandboxProvider
            sandbox = SandboxProvider()
            router.register(MoneyRail.SANDBOX, sandbox)
        _default_router = router
    return _default_router


def reset_default_router() -> None:
    """Reset singleton for deterministic configuration tests."""
    global _default_router
    _default_router = None
