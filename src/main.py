from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from typing import Tuple

from playwright.sync_api import sync_playwright, Page, BrowserContext
from dotenv import load_dotenv

from config.logging_config import setup_logging
from src.infrastructure.config_loader import ConfigurationLoader
from src.infrastructure.di_container import DIContainer
from src.infrastructure.exceptions import BrowserLaunchException
from src.infrastructure.logging_service import EventSubject, LoggingObserver, AppEvent
from src.models.auth_credentials import AuthCredentials
from src.models.browser_config import AppConfig
from src.services.auth_strategy import AppleAuthStrategy, IAuthenticationStrategy
from src.services.browser_factory import BrowserFactory, IBrowserFactory
from src.services.element_locator import ElementLocator
from src.services.profile_navigator import ProfileNavigator
from src.commands.base_command import CommandInvoker
from src.commands.login_command import LoginCommand
from src.commands.tap_command import TapCommand
from src.commands.next_command import NextProfileCommand


@dataclass(frozen=True)
class Args:
    config_path: str
    verbose: bool
    max_cycles: int | None
    headless: bool
    log_file: str | None
    dry_run: bool
    quick: bool


def parse_arguments() -> Args:
    parser = argparse.ArgumentParser(description="Grindr auto tap")
    parser.add_argument("--config", dest="config_path", default="config/app_config.yaml")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--max-cycles", type=int, default=None)
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--log-file", default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--quick", action="store_true", help="Shortcut: --verbose --headless --max-cycles 1000")
    ns = parser.parse_args()
    return Args(
        config_path=ns.config_path,
        verbose=ns.verbose,
        max_cycles=ns.max_cycles,
        headless=ns.headless,
        log_file=ns.log_file,
        dry_run=ns.dry_run,
        quick=ns.quick,
    )


def load_configuration(config_path: str) -> Tuple[AppConfig, dict]:
    loader = ConfigurationLoader()
    app_cfg_dict = loader.load_app_config(config_path)
    selectors = loader.load_selectors("config/selectors.yaml")
    return AppConfig.from_dict(app_cfg_dict), selectors.get("selectors", {})


def setup_dependency_injection(config: AppConfig, selectors: dict) -> DIContainer:
    container = DIContainer()

    def browser_factory_provider() -> IBrowserFactory:
        return BrowserFactory()

    container.register_singleton(IBrowserFactory, browser_factory_provider)
    container.register_singleton(IAuthenticationStrategy, lambda: AppleAuthStrategy(selectors))
    container.register_singleton(ElementLocator, lambda: ElementLocator())
    container.register_singleton(ProfileNavigator, lambda: ProfileNavigator(container.resolve(ElementLocator), config, selectors))

    return container


def build_credentials_from_env() -> AuthCredentials:
    email = os.environ.get("GRINDR_EMAIL", "")
    password = os.environ.get("GRINDR_PASSWORD", "")
    return AuthCredentials(email=email, password=password)


def main() -> None:
    # Load environment variables from .env if present
    try:
        load_dotenv()
    except Exception:
        pass
    args = parse_arguments()

    if args.quick:
        args = type(args)(
            config_path=args.config_path,
            verbose=True,
            max_cycles=args.max_cycles or 1000,
            headless=True,
            log_file=args.log_file,
            dry_run=False,
            quick=True,
        )

    logs = setup_logging(level="DEBUG" if args.verbose else "INFO", verbose_level="DEBUG", log_file=args.log_file or "logs/grindr_auto_tap.log")
    logger = logs["logger"]
    debug_logger = logs["debug_logger"]

    # Structured event logging via observer
    subject = EventSubject()
    subject.attach(LoggingObserver(logger=logger, debug_logger=debug_logger))
    def emit(event_type: str, message: str, payload: dict | None = None) -> None:
        try:
            subject.notify_observers(AppEvent(type=event_type, message=message, payload=payload))
        except Exception:
            pass

    config, selectors = load_configuration(args.config_path)
    if args.max_cycles is not None:
        config = type(config)(
            app=type(config.app)(
                max_cycles=args.max_cycles,
                base_url=config.app.base_url,
                timeouts=config.app.timeouts,
            ),
            browser=config.browser,
            retry=config.retry,
        )

    if args.headless:
        config = type(config)(
            app=config.app,
            browser=type(config.browser)(
                viewport=config.browser.viewport,
                locale=config.browser.locale,
                geolocation=config.browser.geolocation,
                headless=True,
            ),
            retry=config.retry,
        )

    container = setup_dependency_injection(config, selectors)
    browser_factory = container.resolve(IBrowserFactory)
    auth_strategy = container.resolve(IAuthenticationStrategy)
    locator = container.resolve(ElementLocator)
    navigator = container.resolve(ProfileNavigator)

    credentials = build_credentials_from_env()

    invoker = CommandInvoker()

    logger.info("Starting Grindr automation session")
    emit("SESSION_START", "Starting Grindr automation session")

    with sync_playwright() as pw:
        context: BrowserContext | None = None
        page: Page | None = None
        try:
            try:
                context, page = browser_factory.create_firefox_context(pw, config)
            except BrowserLaunchException:
                context, page = browser_factory.create_chromium_fallback(pw, config)

            # Enable Playwright tracing when verbose to capture clicks and snapshots
            try:
                if args.verbose:
                    context.tracing.start(screenshots=True, snapshots=True, sources=False)
            except Exception:
                pass

            page.goto(config.app.base_url, timeout=config.app.timeouts.page_load)
            page.wait_for_load_state("networkidle")

            if not args.dry_run:
                login_result = invoker.run(LoginCommand(page=page, strategy=auth_strategy, credentials=credentials))
                emit("AUTH_RESULT", "Apple login executed", {"success": login_result.success, "message": login_result.message})

            # Wait for session ready and open the first profile via navigator
            try:
                navigator.open_first_profile(page)
                emit("SESSION_READY", "Opened first profile from cascade")
            except Exception as exc:
                emit("SESSION_NOT_READY", "Failed to open first profile", {"error": str(exc)})

            cycles_done = 0
            if not args.dry_run:
                while cycles_done < config.app.max_cycles:
                    r1 = invoker.run(TapCommand(page=page, navigator=navigator))
                    r2 = invoker.run(NextProfileCommand(page=page, navigator=navigator))
                    if not r2.success:
                        break
                    cycles_done += 1

            logger.info(f"Profile navigation completed: {cycles_done} cycles processed")
            emit("CYCLES_DONE", "Profile navigation completed", {"cycles": cycles_done})
        except KeyboardInterrupt:
            logger.info("Interrupted by user (Ctrl+C)")
            emit("SESSION_INTERRUPTED", "Interrupted by user")
        finally:
            try:
                if page:
                    page.close()
            except Exception:
                pass
            try:
                if context:
                    # Save trace if collected
                    try:
                        if args and args.verbose:
                            context.tracing.stop(path="logs/trace.zip")
                    except Exception:
                        pass
                    context.close()
                emit("SESSION_END", "Browser context closed")
            except Exception:
                pass


if __name__ == "__main__":
    main()
