from src.services.browser_factory import BrowserFactory
from src.models.browser_config import AppConfig, AppSettings, BrowserOptions, Viewport, Geolocation, Timeouts, RetryPolicy


def test_configure_browser_options():
    cfg = AppConfig(
        app=AppSettings(max_cycles=1, base_url="https://ex", timeouts=Timeouts(page_load=1, element_wait=1, click_timeout=1, popup_timeout=1)),
        browser=BrowserOptions(viewport=Viewport(width=10, height=10), locale="fr-FR", geolocation=Geolocation(latitude=0.0, longitude=0.0), headless=True),
        retry=RetryPolicy(max_attempts=1, backoff_factor=2, element_location=1, click_action=1),
    )
    opts = BrowserFactory().configure_browser_options(cfg)
    assert opts["viewport"] == {"width": 10, "height": 10}
    assert opts["locale"] == "fr-FR"
    assert opts["headless"] is True
