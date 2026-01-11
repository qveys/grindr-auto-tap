/**
 * Background service worker
 */
import { Storage } from '../utils/storage';
import {
  MessageHandler,
  MessageType,
  Message,
  StatusResponse,
} from '../utils/messaging';
import { logger } from '../utils/logger';

class BackgroundService {
  private intervalId: number | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupMessageListener();
    void this.restoreState();
    logger.info('Background service initialized');
  }

  private setupMessageListener(): void {
    MessageHandler.onMessage((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse).catch((error) => {
        logger.error('Message handling failed', error as Error);
        sendResponse({ error: (error as Error).message });
      });
      return true; // Keep message channel open for async response
    });
  }

  private async handleMessage(
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): Promise<void> {
    logger.debug(`Received message: ${message.type}`);

    switch (message.type) {
      case MessageType.TOGGLE_ENABLED:
        await this.toggleEnabled();
        sendResponse(await this.getStatus());
        break;

      case MessageType.UPDATE_INTERVAL:
        if (
          message.payload &&
          typeof message.payload === 'object' &&
          'interval' in message.payload
        ) {
          await this.updateInterval(message.payload.interval as number);
        }
        sendResponse(await this.getStatus());
        break;

      case MessageType.GET_STATUS:
        sendResponse(await this.getStatus());
        break;

      case MessageType.UPDATE_STATS:
        await this.updateStats();
        break;

      default:
        logger.warn(`Unknown message type: ${message.type}`);
        sendResponse({ error: 'Unknown message type' });
    }
  }

  private async restoreState(): Promise<void> {
    const enabled = await Storage.get('enabled');
    if (enabled) {
      await this.startTapping();
    }
  }

  private async toggleEnabled(): Promise<void> {
    const enabled = await Storage.get('enabled');
    const newState = !enabled;
    await Storage.set('enabled', newState);

    if (newState) {
      await this.startTapping();
    } else {
      this.stopTapping();
    }

    logger.info(`Extension ${newState ? 'enabled' : 'disabled'}`);
  }

  private async updateInterval(interval: number): Promise<void> {
    await Storage.set('interval', interval);
    const enabled = await Storage.get('enabled');
    if (enabled) {
      this.stopTapping();
      await this.startTapping();
    }
    logger.info(`Interval updated to ${interval}s`);
  }

  private async startTapping(): Promise<void> {
    const interval = await Storage.get('interval');
    this.intervalId = setInterval(() => {
      this.performTap().catch((error) => {
        logger.error('Tap failed', error as Error);
      });
    }, interval * 1000) as unknown as number;
    logger.info(`Started tapping with ${interval}s interval`);
  }

  private stopTapping(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped tapping');
    }
  }

  private async performTap(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        logger.warn('No active tab found');
        return;
      }

      await MessageHandler.sendTabMessage(tab.id, {
        type: MessageType.PERFORM_TAP,
      });

      await this.updateStats();
    } catch (error) {
      logger.error('Failed to perform tap', error as Error);
    }
  }

  private async updateStats(): Promise<void> {
    const tapCount = await Storage.get('tapCount');
    await Storage.set('tapCount', tapCount + 1);
    await Storage.set('lastTap', new Date().toLocaleTimeString());
  }

  private async getStatus(): Promise<StatusResponse> {
    const data = await Storage.getAll();
    return {
      enabled: data.enabled,
      interval: data.interval,
      tapCount: data.tapCount,
      lastTap: data.lastTap,
    };
  }
}

// Initialize background service
new BackgroundService();
