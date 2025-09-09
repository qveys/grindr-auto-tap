from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any


@dataclass(frozen=True)
class Viewport:
    width: int
    height: int


@dataclass(frozen=True)
class Geolocation:
    latitude: float
    longitude: float


@dataclass(frozen=True)
class Timeouts:
    page_load: int
    element_wait: int
    click_timeout: int
    popup_timeout: int


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int
    backoff_factor: int
    element_location: int
    click_action: int


@dataclass(frozen=True)
class BrowserOptions:
    viewport: Viewport
    locale: str
    geolocation: Geolocation
    headless: bool


@dataclass(frozen=True)
class AppSettings:
    max_cycles: int
    base_url: str
    timeouts: Timeouts


@dataclass(frozen=True)
class AppConfig:
    app: AppSettings
    browser: BrowserOptions
    retry: RetryPolicy

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "AppConfig":
        app = data["app"]
        browser = data["browser"]
        retry = data["retry"]
        return AppConfig(
            app=AppSettings(
                max_cycles=app["max_cycles"],
                base_url=app["base_url"],
                timeouts=Timeouts(**app["timeouts"]),
            ),
            browser=BrowserOptions(
                viewport=Viewport(**browser["viewport"]),
                locale=browser["locale"],
                geolocation=Geolocation(**browser["geolocation"]),
                headless=browser.get("headless", True),
            ),
            retry=RetryPolicy(**retry),
        )
