import os
from pathlib import Path
import shutil
import time
from typing import List, Optional, Tuple

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError, Page, BrowserContext, Playwright # 
from dotenv import load_dotenv

GRINDR_URL = "https://web.grindr.com"

TAP_SELECTORS_CSS: List[str] = [
    "button[aria-label='Tap']",
    "button[aria-label*='Tap' i]",
    "button[data-testid*='tap' i]",
    "[role='button'][aria-label*='Tap' i]",
]
TAP_FALLBACK_SELECTORS_XPATH: List[str] = [
    "//button[@aria-label='Tap']",
    "//button[contains(translate(@aria-label,'TAP','tap'),'tap')]",
    "//*[@role='button' and contains(translate(@aria-label,'TAP','tap'),'tap')]",
]

NEXT_SELECTORS_CSS: List[str] = [
    "div[aria-label='Next Profile']",
    "img[alt='Next Profile']",
    "button[aria-label*='Next' i]",
    ".ProfileV2__RightButtonOverlay-sc-14zklci-2[aria-label='Next Profile']",
]
NEXT_FALLBACK_SELECTORS_XPATH: List[str] = [
    "//div[@aria-label='Next Profile']",
    "//div[@aria-label='Next Profile']//img",
    "//img[@alt='Next Profile']",
    "//button[contains(translate(@aria-label,'NEXT','next'),'next')]",
    "//div[contains(@class,'ProfileV2__RightButtonOverlay') and @aria-label='Next Profile']",
]

def launch_firefox_context(pw: Playwright) -> Tuple[BrowserContext, Page]:
    """Create a persistent browser context and return (context, page).

    Strategy:
    1) Try Firefox with the main profile dir
    2) If it exits immediately, try Firefox with a fresh temp profile
    3) If Firefox still fails, fall back to Chromium persistent context
    """
    viewport = {"width": 1280, "height": 800}

    main_profile = Path(".firefox-user-data").resolve()
    main_profile.mkdir(parents=True, exist_ok=True)

    try:
        context = pw.firefox.launch_persistent_context(
            user_data_dir=str(main_profile),
            headless=False,
            permissions=["geolocation"],
            geolocation={"latitude": 50.84685,  "longitude": 4.35721},
            locale="fr-FR",
            viewport=viewport,
        )
    except Exception:
        temp_profile = Path(".firefox-user-data-temp").resolve()
        if temp_profile.exists():
            shutil.rmtree(temp_profile, ignore_errors=True)
        temp_profile.mkdir(parents=True, exist_ok=True)
        try:
            context = pw.firefox.launch_persistent_context(
                user_data_dir=str(temp_profile),
                headless=False,
                viewport=viewport,
            )
        except Exception:
            # Final fallback: Chromium persistent context
            chromium_profile = Path(".chromium-user-data").resolve()
            chromium_profile.mkdir(parents=True, exist_ok=True)
            context = pw.chromium.launch_persistent_context(
                user_data_dir=str(chromium_profile),
                headless=False,
                viewport=viewport,
            )

    page = context.pages[0] if context.pages else context.new_page()
    return context, page

def find_popup_by_url(context: BrowserContext, substring: str, timeout_ms: int = 10000, poll_ms: int = 200) -> Optional[Page]:
    deadline = time.time() + (timeout_ms / 1000)
    substring_lower = substring.lower()
    while time.time() < deadline:
        for popup_page in context.pages:
            try:
                current_url = (popup_page.url or "").lower()
            except Exception:
                current_url = ""
            if substring_lower in current_url:
                return popup_page
        time.sleep(poll_ms / 1000)
    return None

def find_clickable_quick(page: Page, css_list: Optional[List[str]] = None, xpath_list: Optional[List[str]] = None, per_try_timeout_ms: int = 350, max_cycles: int = 3):
    css_list = css_list or []
    xpath_list = xpath_list or []
    for _ in range(max_cycles):
        for sel in css_list:
            try:
                el = page.locator(sel).first
                el.wait_for(state="visible", timeout=per_try_timeout_ms)
                return el, f"css:{sel}"
            except Exception:
                pass
        for xp in xpath_list:
            try:
                el = page.locator(f"xpath={xp}").first
                el.wait_for(state="visible", timeout=per_try_timeout_ms)
                return el, f"xpath:{xp}"
            except Exception:
                pass
    return None, None


def auto_tap_and_next(page: Page, max_cycles: int = 1000):
    print(f"[auto] start, max_cycles={max_cycles}")
    cycles = 0
    while cycles < max_cycles:
        try:
            print(f"[auto] cycle {cycles}")
            next_btn, src = find_clickable_quick(
                page,
                css_list=NEXT_SELECTORS_CSS,
                xpath_list=NEXT_FALLBACK_SELECTORS_XPATH,
                per_try_timeout_ms=350,
                max_cycles=3,
            )
            if not next_btn:
                print("[auto] no next button -> stop")
                break

            tap_btn, tap_src = find_clickable_quick(
                page,
                css_list=TAP_SELECTORS_CSS,
                xpath_list=TAP_FALLBACK_SELECTORS_XPATH,
                per_try_timeout_ms=300,
                max_cycles=2,
            )
            if tap_btn:
                try:
                    tap_btn.click(timeout=800)
                    print("[auto] tap clicked")
                except Exception:
                    print("[auto] tap click failed")
                time.sleep(1)
            else:
                print("[auto] no tap button (déjà tap?)")

            try:
                next_btn.click(timeout=800)
                print("[auto] next clicked")
            except Exception:
                print("[auto] next click failed")
            time.sleep(1)

            cycles += 1
        except Exception as e:
            print(f"[auto] error: {e}")
            break
    print(f"[auto] done after {cycles} cycles")

def main():
    # Load environment variables if present
    try:
        load_dotenv()
    except Exception:
        pass

    EMAIL = os.environ.get("GRINDR_EMAIL", "")
    PASSWORD = os.environ.get("GRINDR_PASSWORD", "")
    if not EMAIL or not PASSWORD:
        print("Environment variables GRINDR_EMAIL/GRINDR_PASSWORD are required for Apple login.")
        try:
            input("Press Enter to exit...")
        except Exception:
            pass
        return

    with sync_playwright() as pw:
        context, page = launch_firefox_context(pw)
        
        page.goto(GRINDR_URL)
        page.wait_for_load_state("networkidle")
        
        time.sleep(2)

        # Click "Log In with Apple" button and capture popup
        apple_popup: Optional[Page] = None
        try:
            login_apple_button = page.locator("text=Log In with Apple").first
            login_apple_button.wait_for(state="visible", timeout=1000)
            try:
                with page.expect_popup(timeout=10000) as popup_info:
                    login_apple_button.click()
                apple_popup = popup_info.value
                print("Captured Apple popup via expect_popup")
            except Exception:
                # Fallback: click then poll for popup in context.pages
                login_apple_button.click()
                print("Clicked 'Log In with Apple' button; polling for apple.com popup...")
                apple_popup = find_popup_by_url(context, "apple.com", timeout_ms=10000)
        except Exception:
            pass
        
        if apple_popup:
            try:
                # Fill email field
                email_field = apple_popup.locator("#account_name_text_field")
                email_field.wait_for(state="visible", timeout=5000)
                email_field.fill(EMAIL)
                print(f"Filled email field")

                # Click sign-in button
                try:
                    sign_in_button = apple_popup.locator("#sign-in")
                    sign_in_button.wait_for(state="visible", timeout=5000)
                    sign_in_button.click()
                    print("Clicked sign-in button")
                except Exception as e:
                    print(f"Error clicking sign-in button: {e}")
                
                # Click continue/sign in button
                try:
                    continue_password_button = apple_popup.locator("#continue-password")
                    continue_password_button.wait_for(state="visible", timeout=5000)
                    continue_password_button.click()
                    print("Clicked continue password button")
                except Exception as e:
                    print(f"Error clicking continue password button: {e}")

                # Fill password field
                password_field = apple_popup.locator("#password_text_field")
                password_field.wait_for(state="visible", timeout=5000)
                password_field.fill(PASSWORD)
                print(f"Filled password field")

                # Click sign-in button
                try:
                    sign_in_button = apple_popup.locator("#sign-in")
                    sign_in_button.wait_for(state="visible", timeout=5000)
                    sign_in_button.click()
                    print("Clicked sign-in button")
                except Exception as e:
                    print(f"Error clicking sign-in button: {e}")
                
                # Click "Continue" button after Apple authentication
                try:
                    continue_button = apple_popup.locator("button:has-text('Continue'), button[aria-label*='Continue'], #continue")
                    continue_button.wait_for(state="visible", timeout=5000)
                    continue_button.click()
                    print("Clicked Continue button")
                except Exception as e:
                    print(f"Error clicking Continue button: {e}")

            except Exception as e:
                print(f"Error filling Apple ID form: {e}")
        else:
            print("No Apple popup found")

        time.sleep(2)

        # Click "Let's Go!" button
        try:
            lets_go_button = page.locator("#beta-dismiss-btn")
            lets_go_button.wait_for(state="visible", timeout=5000)
            lets_go_button.click()
            print("Clicked Let's Go! button")
        except Exception as e:
            print(f"Error clicking Let's Go! button: {e}")

        time.sleep(2)

        # Open the first profile by clicking the first child of the #cascade element
        try:
            cascade = page.locator("#cascade")
            cascade.wait_for(state="visible", timeout=5000)
            first_child = cascade.locator(":scope > *").first
            first_child.click()
            print("Opened first profile from #cascade")
        except Exception as e:
            print(f"Error opening first profile from #cascade: {e}")

        time.sleep(2)

        auto_tap_and_next(page)

        time.sleep(2)

        input("Press Enter to continue...")
        
        page.close()
        context.close()

if __name__ == "__main__":
    main()
