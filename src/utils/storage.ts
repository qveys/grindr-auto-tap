/**
 * Chrome storage wrapper with TypeScript support
 */
import { logger } from './logger';

export interface StorageData {
  enabled: boolean;
  interval: number;
  tapCount: number;
  lastTap: string;
}

export class Storage {
  private static readonly DEFAULT_DATA: StorageData = {
    enabled: false,
    interval: 5,
    tapCount: 0,
    lastTap: 'Never',
  };

  public static async get<K extends keyof StorageData>(
    key: K
  ): Promise<StorageData[K]> {
    try {
      const result = await chrome.storage.local.get(key);
      return (result[key] as StorageData[K]) ?? this.DEFAULT_DATA[key];
    } catch (error) {
      logger.error(`Failed to get storage key: ${key}`, error as Error);
      return this.DEFAULT_DATA[key];
    }
  }

  public static async getAll(): Promise<StorageData> {
    try {
      const result = await chrome.storage.local.get(null);
      return { ...this.DEFAULT_DATA, ...result } as StorageData;
    } catch (error) {
      logger.error('Failed to get all storage data', error as Error);
      return this.DEFAULT_DATA;
    }
  }

  public static async set<K extends keyof StorageData>(
    key: K,
    value: StorageData[K]
  ): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
      logger.debug(`Storage updated: ${key} = ${String(value)}`);
    } catch (error) {
      logger.error(`Failed to set storage key: ${key}`, error as Error);
      throw error;
    }
  }

  public static async setAll(data: Partial<StorageData>): Promise<void> {
    try {
      await chrome.storage.local.set(data);
      logger.debug('Storage updated with multiple keys');
    } catch (error) {
      logger.error('Failed to set storage data', error as Error);
      throw error;
    }
  }

  public static async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
      logger.info('Storage cleared');
    } catch (error) {
      logger.error('Failed to clear storage', error as Error);
      throw error;
    }
  }
}
