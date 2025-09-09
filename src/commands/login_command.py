from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from playwright.sync_api import Page

from ..infrastructure.exceptions import AuthenticationException
from ..models.auth_credentials import AuthCredentials
from ..services.auth_strategy import IAuthenticationStrategy
from .base_command import CommandResult, ICommand


@dataclass
class LoginCommand(ICommand):
    page: Page
    strategy: IAuthenticationStrategy
    credentials: AuthCredentials

    def execute(self) -> CommandResult:
        ok = self.strategy.authenticate(self.page, self.credentials)
        return CommandResult(success=ok, message="login ok" if ok else "login failed")

    def can_undo(self) -> bool:
        return False

    def undo(self) -> None:
        pass
