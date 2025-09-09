from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Protocol


@dataclass(frozen=True)
class AppEvent:
    type: str
    message: str
    payload: Dict[str, Any] | None = None


class IObserver(Protocol):
    def notify(self, event: AppEvent) -> None: ...


class EventSubject:
    def __init__(self) -> None:
        self._observers: List[IObserver] = []

    def attach(self, observer: IObserver) -> None:
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: IObserver) -> None:
        if observer in self._observers:
            self._observers.remove(observer)

    def notify_observers(self, event: AppEvent) -> None:
        for obs in list(self._observers):
            try:
                obs.notify(event)
            except Exception:
                # Observers must not crash the subject
                pass


class LoggingObserver:
    def __init__(self, *, logger, debug_logger) -> None:
        self._logger = logger
        self._debug_logger = debug_logger

    def notify(self, event: AppEvent) -> None:
        if event.type.upper().startswith("DEBUG"):
            self._debug_logger.debug(f"{event.type}: {event.message} | {event.payload}")
        else:
            self._logger.info(f"{event.type}: {event.message}")
