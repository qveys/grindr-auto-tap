from src.infrastructure.config_loader import ConfigurationLoader
import tempfile
from pathlib import Path
import yaml
import pytest


def test_load_valid_app_config(tmp_path: Path):
    cfg = {
        "app": {
            "max_cycles": 10,
            "base_url": "https://example.com",
            "timeouts": {"page_load": 1000, "element_wait": 1000, "click_timeout": 500, "popup_timeout": 500},
        },
        "browser": {
            "viewport": {"width": 100, "height": 100},
            "locale": "fr-FR",
            "geolocation": {"latitude": 0.0, "longitude": 0.0},
            "headless": True,
        },
        "retry": {"max_attempts": 3, "backoff_factor": 2, "element_location": 2, "click_action": 2},
    }
    p = tmp_path / "app.yaml"
    p.write_text(yaml.safe_dump(cfg), encoding="utf-8")
    loader = ConfigurationLoader()
    loaded = loader.load_app_config(p)
    assert loaded["app"]["max_cycles"] == 10


def test_invalid_missing_keys(tmp_path: Path):
    bad = {"app": {}}
    p = tmp_path / "bad.yaml"
    p.write_text(yaml.safe_dump(bad), encoding="utf-8")
    loader = ConfigurationLoader()
    with pytest.raises(Exception):
        loader.load_app_config(p)
