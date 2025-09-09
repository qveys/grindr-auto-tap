from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import yaml

from .exceptions import ConfigurationException


class ConfigurationLoader:
    """Load YAML configuration files for app and selectors."""
    def __init__(self) -> None:
        self._cache: Dict[Path, Dict[str, Any]] = {}

    def load_app_config(self, path: str | Path) -> Dict[str, Any]:
        data = self._load_yaml(path)
        self._validate_app_config(data)
        return data

    def load_selectors(self, path: str | Path) -> Dict[str, Any]:
        data = self._load_yaml(path)
        self._validate_selectors(data)
        return data

    def _load_yaml(self, path: str | Path) -> Dict[str, Any]:
        p = Path(path).resolve()
        if not p.exists():
            raise ConfigurationException(f"Config file not found: {p}")
        # Simple cache by mtime/size to avoid re-parsing
        try:
            stat = p.stat()
            cache_key = p
            cached = self._cache.get(cache_key)
        except Exception:
            stat = None
            cached = None
        if cached is not None and getattr(cached, "__meta__", None) == (stat.st_mtime, stat.st_size):
            # Strip meta before returning
            out = dict(cached)
            out.pop("__meta__", None)
            return out
        try:
            with p.open("r", encoding="utf-8") as f:
                loaded = yaml.safe_load(f) or {}
                if not isinstance(loaded, dict):
                    raise ConfigurationException(f"Invalid YAML structure in {p}")
                # store with meta
                meta_wrapped = dict(loaded)
                if stat is not None:
                    meta_wrapped["__meta__"] = (stat.st_mtime, stat.st_size)
                self._cache[p] = meta_wrapped
                return loaded
        except ConfigurationException:
            raise
        except Exception as exc:
            raise ConfigurationException(f"Failed to read YAML: {p}", {"error": str(exc)})

    def _validate_app_config(self, data: Dict[str, Any]) -> None:
        if "app" not in data or "browser" not in data:
            raise ConfigurationException("Missing required keys: 'app'/'browser'")
        # Basic structural type checks (defensive; avoids cryptic KeyErrors downstream)
        app = data.get("app", {})
        browser = data.get("browser", {})
        retry = data.get("retry", {})

        if not isinstance(app, dict):
            raise ConfigurationException("'app' must be a mapping")
        if not isinstance(browser, dict):
            raise ConfigurationException("'browser' must be a mapping")
        if not isinstance(retry, dict):
            raise ConfigurationException("'retry' must be a mapping")

        required_app = {"max_cycles": int, "base_url": str, "timeouts": dict}
        for key, typ in required_app.items():
            if key not in app:
                raise ConfigurationException(f"app.{key} is required")
            if not isinstance(app[key], typ):
                raise ConfigurationException(f"app.{key} must be {typ.__name__}")
        timeouts = app["timeouts"]
        for key in ("page_load", "element_wait", "click_timeout", "popup_timeout"):
            if key not in timeouts or not isinstance(timeouts[key], int):
                raise ConfigurationException(f"app.timeouts.{key} must be int")

        required_browser = {"viewport": dict, "locale": str, "geolocation": dict}
        for key, typ in required_browser.items():
            if key not in browser:
                raise ConfigurationException(f"browser.{key} is required")
            if not isinstance(browser[key], typ):
                raise ConfigurationException(f"browser.{key} must be {typ.__name__}")
        viewport = browser["viewport"]
        for key in ("width", "height"):
            if key not in viewport or not isinstance(viewport[key], int):
                raise ConfigurationException(f"browser.viewport.{key} must be int")
        geoloc = browser["geolocation"]
        for key in ("latitude", "longitude"):
            if key not in geoloc or not isinstance(geoloc[key], (int, float)):
                raise ConfigurationException(f"browser.geolocation.{key} must be number")

        # optional headless coerces via models, but ensure bool or missing
        if "headless" in browser and not isinstance(browser["headless"], bool):
            raise ConfigurationException("browser.headless must be bool if provided")

        required_retry = {"max_attempts": int, "backoff_factor": int, "element_location": int, "click_action": int}
        for key, typ in required_retry.items():
            if key not in retry or not isinstance(retry[key], int):
                raise ConfigurationException(f"retry.{key} must be int")

    def _validate_selectors(self, data: Dict[str, Any]) -> None:
        if "selectors" not in data:
            raise ConfigurationException("Missing 'selectors' root key")
        sels = data["selectors"]
        if not isinstance(sels, dict):
            raise ConfigurationException("'selectors' must be a mapping")
        # Ensure expected groups exist (soft validation; lists may be empty)
        profile = sels.get("profile_actions", {})
        if profile and not isinstance(profile, dict):
            raise ConfigurationException("'selectors.profile_actions' must be a mapping")
        for group in ("tap_buttons", "next_buttons"):
            g = profile.get(group)
            if g is None:
                continue
            if not isinstance(g, dict):
                raise ConfigurationException(f"'selectors.profile_actions.{group}' must be a mapping")
            for k in ("css", "xpath"):
                if k in g and not isinstance(g[k], list):
                    raise ConfigurationException(f"'selectors.profile_actions.{group}.{k}' must be a list")
