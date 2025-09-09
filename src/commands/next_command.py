from __future__ import annotations

from dataclasses import dataclass

from playwright.sync_api import Page

from ..services.profile_navigator import ProfileNavigator
from .base_command import CommandResult, ICommand


@dataclass
class NextProfileCommand(ICommand):
    page: Page
    navigator: ProfileNavigator

    def execute(self) -> CommandResult:
        btn = self.navigator.find_next_button(self.page)
        if not btn:
            return CommandResult(success=False, message="next not found")
        try:
            btn.click(timeout=self.navigator.get_click_timeout())
            return CommandResult(success=True, message="next clicked")
        except Exception as exc:
            return CommandResult(success=False, message=f"next click failed: {exc}")

    def can_undo(self) -> bool:
        return False

    def undo(self) -> None:
        pass
