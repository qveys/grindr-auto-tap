from __future__ import annotations

from typing import List, Optional, Tuple
import logging

from playwright.sync_api import Locator, Page

# Removed unused ElementNotFoundException import


class IElementLocator:
    def locate_element_by_css_selectors(self, page: Page, selectors: List[str], timeout_ms: int) -> Optional[Locator]: ...
    def locate_element_by_xpath_selectors(self, page: Page, xpaths: List[str], timeout_ms: int) -> Optional[Locator]: ...
    def wait_for_element_visibility(self, element: Locator, timeout_ms: int) -> bool: ...
    def find_first_visible_element(self, page: Page, selectors: List[str], xpaths: List[str], timeout_ms: int, cycles: int) -> Optional[Locator]: ...


class ElementLocator(IElementLocator):
    def locate_element_by_css_selectors(self, page: Page, selectors: List[str], timeout_ms: int) -> Optional[Locator]:
        debug_logger = logging.getLogger("grindr.debug")
        for selector in selectors:
            try:
                debug_logger.debug(f"FIND css | selector={selector!r} | timeout_ms={timeout_ms}")
                el = page.locator(selector).first
                el.wait_for(state="visible", timeout=timeout_ms)
                return el
            except Exception:
                continue
        return None

    def locate_element_by_xpath_selectors(self, page: Page, xpaths: List[str], timeout_ms: int) -> Optional[Locator]:
        debug_logger = logging.getLogger("grindr.debug")
        for xp in xpaths:
            try:
                debug_logger.debug(f"FIND xpath | selector={xp!r} | timeout_ms={timeout_ms}")
                el = page.locator(f"xpath={xp}").first
                el.wait_for(state="visible", timeout=timeout_ms)
                return el
            except Exception:
                continue
        return None

    def wait_for_element_visibility(self, element: Locator, timeout_ms: int) -> bool:
        try:
            logging.getLogger("grindr.debug").debug(f"WAIT visible | element={element}")
            element.wait_for(state="visible", timeout=timeout_ms)
            return True
        except Exception:
            return False

    def find_first_visible_element(self, page: Page, selectors: List[str], xpaths: List[str], timeout_ms: int, cycles: int) -> Optional[Locator]:
        for _ in range(cycles):
            el = self.locate_element_by_css_selectors(page, selectors, timeout_ms)
            if el:
                return el
            el = self.locate_element_by_xpath_selectors(page, xpaths, timeout_ms)
            if el:
                return el
        return None
