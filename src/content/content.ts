/**
 * Content script
 */
import { MessageHandler, MessageType, TapResponse } from '../utils/messaging';
import { logger } from '../utils/logger';

class ContentScript {
  constructor() {
    this.init();
  }

  private init(): void {
    this.setupMessageListener();
    logger.info('Content script initialized');
  }

  private setupMessageListener(): void {
    MessageHandler.onMessage((message, sender, sendResponse) => {
      if (message.type === MessageType.PERFORM_TAP) {
        this.performTap()
          .then((response) => sendResponse(response))
          .catch((error) => {
            logger.error('Tap failed', error as Error);
            sendResponse({ success: false, message: (error as Error).message });
          });
        return true; // Keep message channel open
      }
    });
  }

  private async performTap(): Promise<TapResponse> {
    try {
      // Find clickable elements (buttons, links, etc.)
      const clickableElements = document.querySelectorAll(
        'button, a, [role="button"], [onclick]'
      );

      if (clickableElements.length === 0) {
        return { success: false, message: 'No clickable elements found' };
      }

      // Click the first visible element
      for (const element of Array.from(clickableElements)) {
        if (this.isElementVisible(element as HTMLElement)) {
          (element as HTMLElement).click();
          logger.info('Element clicked successfully');
          return { success: true, message: 'Tap performed' };
        }
      }

      return { success: false, message: 'No visible elements found' };
    } catch (error) {
      logger.error('Tap error', error as Error);
      return { success: false, message: (error as Error).message };
    }
  }

  private isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <=
        (window.innerWidth || document.documentElement.clientWidth)
    );
  }
}

// Initialize content script
new ContentScript();
