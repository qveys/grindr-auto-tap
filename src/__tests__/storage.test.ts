/**
 * Tests for Storage utility
 */
import { Storage, StorageData } from '../utils/storage';

describe('Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should get a value from storage', async () => {
      const mockValue = true;
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (key, callback) => {
          if (callback) {
            callback({ [key as string]: mockValue });
          }
          return Promise.resolve({ [key as string]: mockValue });
        }
      );

      const result = await Storage.get('enabled');
      expect(result).toBe(mockValue);
    });

    it('should return default value if key not found', async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (_key, callback) => {
          if (callback) {
            callback({});
          }
          return Promise.resolve({});
        }
      );

      const result = await Storage.get('enabled');
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (chrome.storage.local.get as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );
      // Ensure logger's storage.get for logging works (it uses callbacks)
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys: string | string[] | null, callback) => {
          // If keys is ['logs'], it's the logger trying to save logs
          if (Array.isArray(keys) && keys.includes('logs')) {
            if (callback) {
              callback({ logs: [] });
            }
            return Promise.resolve({ logs: [] });
          }
          // Otherwise, it's the test case - reject
          return Promise.reject(new Error('Storage error'));
        }
      );
      (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);

      const result = await Storage.get('enabled');
      expect(result).toBe(false);
    });
  });

  describe('set', () => {
    it('should set a value in storage', async () => {
      (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);

      await Storage.set('enabled', true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ enabled: true });
    });

    it('should throw error on failure', async () => {
      const error = new Error('Storage error');
      (chrome.storage.local.set as jest.Mock).mockRejectedValue(error);

      await expect(Storage.set('enabled', true)).rejects.toThrow(
        'Storage error'
      );
    });
  });

  describe('getAll', () => {
    it('should get all storage data', async () => {
      const mockData: Partial<StorageData> = {
        enabled: true,
        interval: 10,
      };
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (_key, callback) => {
          if (callback) {
            callback(mockData);
          }
          return Promise.resolve(mockData);
        }
      );

      const result = await Storage.getAll();
      expect(result.enabled).toBe(true);
      expect(result.interval).toBe(10);
    });
  });

  describe('clear', () => {
    it('should clear storage', async () => {
      (chrome.storage.local.clear as jest.Mock).mockResolvedValue(undefined);

      await Storage.clear();
      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });
  });
});
