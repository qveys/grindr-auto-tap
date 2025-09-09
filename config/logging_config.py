from __future__ import annotations

import logging
import logging.handlers
from pathlib import Path
from typing import Any, Dict, Optional

DEFAULT_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DEFAULT_DATEFMT = "%Y-%m-%d %H:%M:%S"


def setup_logging(*, level: str = "INFO", verbose_level: str = "DEBUG", log_file: Optional[str] = "logs/grindr_auto_tap.log", console_enabled: bool = True, file_enabled: bool = True, fmt: str = DEFAULT_FORMAT, datefmt: str = DEFAULT_DATEFMT) -> Dict[str, logging.Logger]:
    """Configure two-level logging: INFO logger and DEBUG logger.

    Returns a dict with 'logger' and 'debug_logger'.
    """
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(logging.DEBUG)

    loggers: Dict[str, logging.Logger] = {}

    formatter = logging.Formatter(fmt=fmt, datefmt=datefmt)

    if console_enabled:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, level.upper(), logging.INFO))
        console_handler.setFormatter(formatter)
        root.addHandler(console_handler)

    if file_enabled and log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=10 * 1024 * 1024, backupCount=5)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)

    logger = logging.getLogger("grindr.app")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    debug_logger = logging.getLogger("grindr.debug")
    debug_logger.setLevel(getattr(logging, verbose_level.upper(), logging.DEBUG))

    loggers["logger"] = logger
    loggers["debug_logger"] = debug_logger

    logger.info("Logging configured")
    return loggers
