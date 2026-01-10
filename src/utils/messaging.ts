/**
 * Message passing types and utilities
 */

export enum MessageType {
  TOGGLE_ENABLED = 'TOGGLE_ENABLED',
  UPDATE_INTERVAL = 'UPDATE_INTERVAL',
  GET_STATUS = 'GET_STATUS',
  PERFORM_TAP = 'PERFORM_TAP',
  UPDATE_STATS = 'UPDATE_STATS',
}

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface StatusResponse {
  enabled: boolean;
  interval: number;
  tapCount: number;
  lastTap: string;
}

export interface TapResponse {
  success: boolean;
  message?: string;
}

export class MessageHandler {
  public static async sendMessage<T>(message: Message): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  public static async sendTabMessage<T>(
    tabId: number,
    message: Message
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  public static onMessage(
    callback: (
      message: Message,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => boolean | void
  ): void {
    chrome.runtime.onMessage.addListener(callback);
  }
}
