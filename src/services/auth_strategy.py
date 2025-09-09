from __future__ import annotations

import time
from abc import ABC, abstractmethod
import logging
from typing import Optional

from playwright.sync_api import BrowserContext, Page

from ..infrastructure.exceptions import AuthenticationException
from ..models.auth_credentials import AuthCredentials


class IAuthenticationStrategy(ABC):
    @abstractmethod
    def authenticate(self, page: Page, credentials: AuthCredentials) -> bool: ...


class AppleAuthStrategy(IAuthenticationStrategy):
    def __init__(self, selectors: dict) -> None:
        self._apple = selectors.get("apple_auth", {})
        self._login = selectors.get("login", {})
        self._dbg = logging.getLogger("grindr.debug")

    def authenticate(self, page: Page, credentials: AuthCredentials) -> bool:
        try:
            self._dbg.debug("AUTH start | provider='apple'")
            apple_popup = self._open_apple_popup(page)
            if not apple_popup:
                self._dbg.debug("AUTH popup_open_failed | provider='apple'")
                return False
            self._fill_email(apple_popup, credentials.email)
            self._click_sign_in(apple_popup)
            self._click_continue_password(apple_popup)
            self._fill_password(apple_popup, credentials.password)
            self._click_sign_in(apple_popup)
            self._click_continue(apple_popup)
            self._dbg.debug("AUTH ok | provider='apple'")
            return True
        except Exception as exc:
            logging.getLogger("grindr.debug").debug(f"AUTH error | provider='apple' | error={exc}")
            raise AuthenticationException("Apple authentication failed", {"error": str(exc)})

    def _open_apple_popup(self, page: Page) -> Optional[Page]:
        login_btn_sel = self._login.get("apple_login_button", "text=Log In with Apple")
        self._dbg.debug(f"APPLE popup_open | click_selector={login_btn_sel!r}")
        try:
            with page.expect_popup(timeout=5000) as pif:
                page.locator(login_btn_sel).first.click()
            popup = pif.value
            self._dbg.debug(f"APPLE popup_open_ok | url={popup.url}")
            return popup
        except Exception:
            page.locator(login_btn_sel).first.click()
            context: BrowserContext = page.context
            deadline = time.time() + 10
            while time.time() < deadline:
                for p in context.pages:
                    if "apple.com" in (p.url or ""):
                        self._dbg.debug(f"APPLE popup_found_scan | url={p.url}")
                        return p
                time.sleep(0.2)
            self._dbg.debug("APPLE popup_open_timeout")
            return None

    def _fill_email(self, popup: Page, email: str) -> None:
        field_selector = self._apple.get("email_field", "#account_name_text_field")
        field = popup.locator(field_selector)
        self._dbg.debug(f"APPLE fill_email | selector={field_selector!r} | value='***'")
        field.fill(email)
        # Trigger validation to enable the Sign In button (Apple often enables on Enter/blur)
        try:
            field.press("Enter")
            self._dbg.debug("APPLE email_enter_pressed")
        except Exception:
            try:
                field.blur()
                self._dbg.debug("APPLE email_blur")
            except Exception:
                pass

    def _click_sign_in(self, popup: Page) -> None:
        button_selector = self._apple.get("sign_in_button", "#sign-in")
        button = popup.locator(button_selector)
        try:
            self._dbg.debug(f"APPLE click_sign_in_wait | selector={button_selector!r}")
            self._wait_until_enabled(button, timeout_ms=5000)
            button.click()
            self._dbg.debug("APPLE click_sign_in_ok")
            return
        except TimeoutError:
            # Fallback: re-trigger validation and attempt again
            try:
                email_sel = self._apple.get("email_field", "#account_name_text_field")
                email_field = popup.locator(email_sel)
                self._dbg.debug("APPLE click_sign_in_retry_validation")
                email_field.click()
                email_field.press("Enter")
                time.sleep(0.5)
                if button.is_enabled():
                    button.click()
                    self._dbg.debug("APPLE click_sign_in_ok_after_validation")
                    return
            except Exception:
                pass
            # Last resort: remove disabled attributes and click via JS to advance the flow
            try:
                self._dbg.debug("APPLE click_sign_in_force_click")
                button.evaluate("el => { el.removeAttribute('disabled'); el.removeAttribute('aria-disabled'); }")
                # Dispatch a synthetic click to bypass Playwright's enabled check
                button.evaluate("el => el.click()")
            except Exception as exc:
                raise exc

    def _click_continue_password(self, popup: Page) -> None:
        sel = self._apple.get("continue_password_button", "#continue-password")
        try:
            self._dbg.debug(f"APPLE click_continue_password | selector={sel!r}")
            popup.locator(sel).click()
            self._dbg.debug("APPLE click_continue_password_ok")
        except Exception:
            pass

    def _fill_password(self, popup: Page, password: str) -> None:
        sel = self._apple.get("password_field", "#password_text_field")
        self._dbg.debug(f"APPLE fill_password | selector={sel!r} | value='***'")
        popup.locator(sel).fill(password)

    def _click_continue(self, popup: Page) -> None:
        sel = self._apple.get("continue_button", "button:has-text('Continue'), button[aria-label*='Continue'], #continue")
        self._dbg.debug(f"APPLE click_continue | selector={sel!r}")
        popup.locator(sel).click()
        self._dbg.debug("APPLE click_continue_ok")

    def _wait_until_enabled(self, locator, timeout_ms: int = 3000) -> None:
        """Poll until the locator is visible and enabled (Apple often toggles aria-disabled)."""
        deadline = time.time() + (timeout_ms / 1000)
        last_state = None
        while time.time() < deadline:
            try:
                is_visible = locator.is_visible()
                is_enabled = locator.is_enabled()
                aria_disabled = locator.get_attribute("aria-disabled")
                actually_enabled = is_visible and is_enabled and (aria_disabled not in ("true", "True", "1"))
                if actually_enabled:
                    logging.getLogger("grindr.debug").debug("APPLE wait_enabled_ok")
                    return
                last_state = {
                    "visible": is_visible,
                    "enabled": is_enabled,
                    "aria_disabled": aria_disabled,
                }
            except Exception:
                # If the element isn't ready yet, keep polling
                pass
            time.sleep(1)
        logging.getLogger("grindr.debug").debug(f"APPLE wait_enabled_timeout | last_state={last_state}")
        raise TimeoutError(f"Element not enabled before click. Last state: {last_state}")
