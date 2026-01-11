/**
 * Tests for MessageHandler utility
 */
import { MessageHandler, MessageType } from '../utils/messaging';

describe('MessageHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message and return response', async () => {
      const mockResponse = { success: true };
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation(
        (_message, callback) => {
          callback(mockResponse);
        }
      );

      const result = await MessageHandler.sendMessage({
        type: MessageType.GET_STATUS,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should reject on error', async () => {
      const error = { message: 'Test error' };
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation(
        (_message, callback) => {
          (chrome.runtime as { lastError?: { message: string } }).lastError =
            error;
          callback(null);
        }
      );

      await expect(
        MessageHandler.sendMessage({ type: MessageType.GET_STATUS })
      ).rejects.toThrow('Test error');

      (chrome.runtime as { lastError?: { message: string } }).lastError =
        undefined;
    });
  });

  describe('sendTabMessage', () => {
    it('should send a message to a tab', async () => {
      const mockResponse = { success: true };
      (chrome.tabs.sendMessage as jest.Mock).mockImplementation(
        (_tabId, _message, callback) => {
          callback(mockResponse);
        }
      );

      const result = await MessageHandler.sendTabMessage(1, {
        type: MessageType.PERFORM_TAP,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('onMessage', () => {
    it('should register message listener', () => {
      const callback = jest.fn();
      MessageHandler.onMessage(callback);
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(
        callback
      );
    });
  });
});
