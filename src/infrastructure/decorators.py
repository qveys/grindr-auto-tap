from __future__ import annotations

import functools
import logging
import random
import time
from typing import Any, Callable, Iterable, Tuple, Type


def log_execution_time(func: Callable[..., Any]) -> Callable[..., Any]:
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start = time.time()
        try:
            return func(*args, **kwargs)
        finally:
            dur = (time.time() - start) * 1000
            logging.getLogger("grindr.debug").debug(f"{func.__name__} executed in {dur:.1f} ms")
    return wrapper


def retry(*, max_attempts: int, backoff_factor: int = 2, exceptions: Tuple[Type[BaseException], ...] = (Exception,)) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            attempt = 0
            delay = 0.2
            while True:
                try:
                    return func(*args, **kwargs)
                except exceptions as exc:
                    attempt += 1
                    if attempt >= max_attempts:
                        raise
                    time.sleep(delay)
                    delay *= backoff_factor + random.random() * 0.1
        return wrapper
    return decorator
