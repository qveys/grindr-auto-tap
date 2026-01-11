/**
 * Popup UI logic
 */
import { Storage } from '../utils/storage';
import { MessageHandler, MessageType, StatusResponse } from '../utils/messaging';
import { logger } from '../utils/logger';

class PopupUI {
  private toggleBtn: HTMLButtonElement | null = null;
  private statusDot: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;
  private intervalInput: HTMLInputElement | null = null;
  private tapCountEl: HTMLElement | null = null;
  private lastTapEl: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.setupElements();
      this.setupEventListeners();
      await this.loadStatus();
      logger.info('Popup initialized');
    } catch (error) {
      logger.error('Failed to initialize popup', error as Error);
    }
  }

  private setupElements(): void {
    this.toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.intervalInput = document.getElementById('interval') as HTMLInputElement;
    this.tapCountEl = document.getElementById('tap-count');
    this.lastTapEl = document.getElementById('last-tap');
  }

  private setupEventListeners(): void {
    this.toggleBtn?.addEventListener('click', () => {
      this.handleToggle().catch((error) => {
        logger.error('Toggle failed', error as Error);
      });
    });

    this.intervalInput?.addEventListener('change', () => {
      this.handleIntervalChange().catch((error) => {
        logger.error('Interval change failed', error as Error);
      });
    });
  }

  private async loadStatus(): Promise<void> {
    try {
      const status = await MessageHandler.sendMessage<StatusResponse>({
        type: MessageType.GET_STATUS,
      });
      this.updateUI(status);
    } catch (error) {
      logger.error('Failed to load status', error as Error);
      // Fallback to storage
      const data = await Storage.getAll();
      this.updateUI(data);
    }
  }

  private async handleToggle(): Promise<void> {
    try {
      const status = await MessageHandler.sendMessage<StatusResponse>({
        type: MessageType.TOGGLE_ENABLED,
      });
      this.updateUI(status);
    } catch (error) {
      logger.error('Failed to toggle', error as Error);
    }
  }

  private async handleIntervalChange(): Promise<void> {
    const interval = parseInt(this.intervalInput?.value || '5', 10);
    if (interval < 1 || interval > 60) {
      logger.warn('Invalid interval value');
      return;
    }

    try {
      await Storage.set('interval', interval);
      await MessageHandler.sendMessage({
        type: MessageType.UPDATE_INTERVAL,
        payload: { interval },
      });
      logger.info(`Interval updated to ${interval}s`);
    } catch (error) {
      logger.error('Failed to update interval', error as Error);
    }
  }

  private updateUI(status: StatusResponse): void {
    // Update toggle button
    if (this.toggleBtn) {
      this.toggleBtn.textContent = status.enabled ? 'Disable' : 'Enable';
      this.toggleBtn.classList.toggle('active', status.enabled);
    }

    // Update status indicator
    this.statusDot?.classList.toggle('active', status.enabled);
    if (this.statusText) {
      this.statusText.textContent = status.enabled ? 'Active' : 'Inactive';
    }

    // Update interval
    if (this.intervalInput) {
      this.intervalInput.value = status.interval.toString();
    }

    // Update stats
    if (this.tapCountEl) {
      this.tapCountEl.textContent = status.tapCount.toString();
    }
    if (this.lastTapEl) {
      this.lastTapEl.textContent = status.lastTap;
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
});
