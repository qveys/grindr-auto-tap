/**
 * Tests for Logger utility
 */
import { Logger } from '../utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = Logger.getInstance();
    (chrome.storage.local.get as jest.Mock).mockImplementation(
      (_key, callback) => {
        callback({ logs: [] });
      }
    );
    (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
  });

  it('should be a singleton', () => {
    const logger1 = Logger.getInstance();
    const logger2 = Logger.getInstance();
    expect(logger1).toBe(logger2);
  });

  it('should log error messages', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const error = new Error('Test error');

    logger.error('Test message', error);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test message', error);

    consoleErrorSpy.mockRestore();
  });

  it('should set log level', () => {
    logger.setLogLevel('debug');
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    logger.debug('Debug message');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[DEBUG] Debug message');

    consoleErrorSpy.mockRestore();
  });

  it('should clear logs', () => {
    void logger.clearLogs();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ logs: [] });
  });
});
