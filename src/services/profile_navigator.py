from __future__ import annotations

import time
from typing import Optional
import logging

from playwright.sync_api import Locator, Page

from ..infrastructure.exceptions import NavigationException
from ..infrastructure.decorators import retry
from ..models.browser_config import AppConfig
from .element_locator import IElementLocator


class ProfileNavigator:
    def __init__(self, locator: IElementLocator, config: AppConfig, selectors: dict) -> None:
        self._locator = locator
        self._config = config
        self._selectors = selectors

    def find_tap_button(self, page: Page) -> Optional[Locator]:
        sels = self._config_selectors("tap_buttons")
        return self._locator.find_first_visible_element(
            page,
            selectors=sels["css"],
            xpaths=sels["xpath"],
            timeout_ms=self._config.app.timeouts.element_wait,
            cycles=self._config.retry.element_location,
        )

    def find_next_button(self, page: Page) -> Optional[Locator]:
        sels = self._config_selectors("next_buttons")
        return self._locator.find_first_visible_element(
            page,
            selectors=sels["css"],
            xpaths=sels["xpath"],
            timeout_ms=self._config.app.timeouts.element_wait,
            cycles=self._config.retry.element_location,
        )

    def execute_tap_cycle(self, page: Page, max_cycles: int) -> int:
        cycles = 0
        while cycles < max_cycles:
            next_btn = self.find_next_button(page)
            if not next_btn:
                break
            tap_btn = self.find_tap_button(page)
            if tap_btn:
                self._click_with_timeout(tap_btn, self._config.app.timeouts.click_timeout)
                time.sleep(1)
            self._click_with_timeout(next_btn, self._config.app.timeouts.click_timeout)
            time.sleep(1)
            cycles += 1
        return cycles

    def get_click_timeout(self) -> int:
        return self._config.app.timeouts.click_timeout

    def get_element_wait_timeout(self) -> int:
        return self._config.app.timeouts.element_wait

    def _login_cascade_selector(self) -> str:
        login = self._selectors.get("login", {})
        return login.get("cascade", "#cascade")

    def _login_lets_go_selector(self) -> str:
        login = self._selectors.get("login", {})
        return login.get("lets_go_button", "#beta-dismiss-btn")

    def open_first_profile(self, page: Page) -> None:
        # Dismiss beta banner if present
        try:
            page.locator(self._login_lets_go_selector()).first.click(timeout=self.get_element_wait_timeout())
        except Exception:
            pass
        # Wait for cascade and open first profile
        cas = page.locator(self._login_cascade_selector()).first
        cas.wait_for(state="visible", timeout=self.get_element_wait_timeout())
        cas.locator(":scope > *").first.click(timeout=self.get_click_timeout())

    @retry(max_attempts=3, backoff_factor=2)
    def _click_with_timeout(self, element: Locator, timeout_ms: int) -> None:
        try:
            debug_logger = logging.getLogger("grindr.debug")
            try:
                ident = element.evaluate("el => el.id || el.getAttribute('aria-label') || el.innerText || el.outerHTML?.slice(0,120)")
            except Exception:
                ident = str(element)
            debug_logger.debug(f"CLICK start | target={ident!r} | timeout_ms={timeout_ms}")
            element.click(timeout=timeout_ms)
            debug_logger.debug(f"CLICK ok | target={ident!r}")
        except Exception as exc:
            raise NavigationException("Click failed", {"error": str(exc)})

    def _config_selectors(self, key: str):
        pa = self._selectors.get("profile_actions", {})
        sels = pa.get(key, {})
        return {"css": sels.get("css", []), "xpath": sels.get("xpath", [])}
