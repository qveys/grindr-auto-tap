from __future__ import annotations

from typing import Any, Callable, Dict, Type


class DIContainer:
    def __init__(self) -> None:
        self._singletons: Dict[Type, Any] = {}
        self._singleton_factories: Dict[Type, Callable[[], Any]] = {}
        self._transients: Dict[Type, Callable[[], Any]] = {}

    def register_singleton(self, interface: Type, factory: Callable[[], Any]) -> None:
        self._singleton_factories[interface] = factory

    def register_transient(self, interface: Type, factory: Callable[[], Any]) -> None:
        self._transients[interface] = factory

    def resolve(self, interface: Type) -> Any:
        if interface in self._singletons:
            return self._singletons[interface]
        if interface in self._singleton_factories:
            inst = self._singleton_factories[interface]()
            self._singletons[interface] = inst
            return inst
        if interface in self._transients:
            return self._transients[interface]()
        raise KeyError(f"No registration for {interface}")
