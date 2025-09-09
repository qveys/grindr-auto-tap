from __future__ import annotations

from dataclasses import dataclass
import logging

from playwright.sync_api import Page

from ..services.profile_navigator import ProfileNavigator
from .base_command import CommandResult, ICommand


@dataclass
class TapCommand(ICommand):
    page: Page
    navigator: ProfileNavigator

    def execute(self) -> CommandResult:
        debug_logger = logging.getLogger("grindr.debug")
        btn = self.navigator.find_tap_button(self.page)
        if not btn:
            return CommandResult(success=False, message="tap not found")
        try:
            try:
                ident = btn.evaluate("el => el.id || el.getAttribute('aria-label') || el.innerText || el.outerHTML?.slice(0,120)")
            except Exception:
                ident = str(btn)
            debug_logger.debug(f"CLICK start | target={ident!r}")
            btn.click(timeout=self.navigator.get_click_timeout())
            debug_logger.debug(f"CLICK ok | target={ident!r}")
            return CommandResult(success=True, message="tap clicked")
        except Exception as exc:
            return CommandResult(success=False, message=f"tap click failed: {exc}")

    def can_undo(self) -> bool:
        return False

    def undo(self) -> None:
        pass
