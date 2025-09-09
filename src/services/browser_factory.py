from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Tuple

from playwright.sync_api import BrowserContext, Page, Playwright

from ..infrastructure.exceptions import BrowserLaunchException
from ..models.browser_config import AppConfig


class IBrowserFactory:
    def create_firefox_context(self, pw: Playwright, config: AppConfig) -> Tuple[BrowserContext, Page]: ...
    def create_chromium_fallback(self, pw: Playwright, config: AppConfig) -> Tuple[BrowserContext, Page]: ...
    def configure_browser_options(self, config: AppConfig) -> Dict[str, Any]: ...


class BrowserFactory(IBrowserFactory):
    def create_firefox_context(self, pw: Playwright, config: AppConfig) -> Tuple[BrowserContext, Page]:
        opts = self.configure_browser_options(config)
        profile = self._ensure_profile_dir(".firefox-user-data")
        try:
            context = pw.firefox.launch_persistent_context(user_data_dir=str(profile), **opts)
        except Exception as exc:
            temp = self._ensure_fresh_temp_profile(".firefox-user-data-temp")
            try:
                context = pw.firefox.launch_persistent_context(user_data_dir=str(temp), **opts)
            except Exception:
                raise BrowserLaunchException("Firefox launch failed", {"error": str(exc)})
        page = context.pages[0] if context.pages else context.new_page()
        return context, page

    def create_chromium_fallback(self, pw: Playwright, config: AppConfig) -> Tuple[BrowserContext, Page]:
        opts = self.configure_browser_options(config)
        profile = self._ensure_profile_dir(".chromium-user-data")
        context = pw.chromium.launch_persistent_context(user_data_dir=str(profile), **opts)
        page = context.pages[0] if context.pages else context.new_page()
        return context, page

    def configure_browser_options(self, config: AppConfig) -> Dict[str, Any]:
        b = config.browser
        return {
            "headless": b.headless,
            "permissions": ["geolocation"],
            "geolocation": {"latitude": b.geolocation.latitude, "longitude": b.geolocation.longitude},
            "locale": b.locale,
            "viewport": {"width": b.viewport.width, "height": b.viewport.height},
        }

    def _ensure_profile_dir(self, name: str) -> Path:
        path = Path(name).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _ensure_fresh_temp_profile(self, name: str) -> Path:
        import shutil
        path = Path(name).resolve()
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
        path.mkdir(parents=True, exist_ok=True)
        return path
