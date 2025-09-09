from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional


class GrindrAutomationException(Exception):
    """Base exception for all automation errors."""

    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.context: Dict[str, Any] = context or {}
        self.timestamp: datetime = datetime.now()

    def __str__(self) -> str:
        base = super().__str__()
        return f"{base} | context={self.context} | ts={self.timestamp.isoformat()}"


class BrowserLaunchException(GrindrAutomationException):
    pass


class AuthenticationException(GrindrAutomationException):
    pass


class ElementNotFoundException(GrindrAutomationException):
    pass


class NavigationException(GrindrAutomationException):
    pass


class ConfigurationException(GrindrAutomationException):
    pass
