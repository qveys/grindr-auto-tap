/**
 * Error logging utility for the extension
 */
export class Logger {
  private static instance: Logger;
  private logLevel: 'error' | 'warn' | 'info' | 'debug';

  private constructor() {
    this.logLevel = 'info';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void {
    this.logLevel = level;
  }

  public error(message: string, error?: Error): void {
    console.error(`[ERROR] ${message}`, error || '');
    this.logToStorage('error', message, error);
  }

  public warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`);
      this.logToStorage('warn', message);
    }
  }

  public info(message: string): void {
    if (this.shouldLog('info')) {
      console.error(`[INFO] ${message}`);
      this.logToStorage('info', message);
    }
  }

  public debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.error(`[DEBUG] ${message}`);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  private logToStorage(level: string, message: string, error?: Error): void {
    try {
      const logEntry = {
        level,
        message,
        error: error?.message,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
      };

      chrome.storage.local.get(['logs'], (result) => {
        const logs = (result['logs'] as (typeof logEntry)[]) || [];
        logs.push(logEntry);
        // Keep only last 100 logs
        const recentLogs = logs.slice(-100);
        chrome.storage.local.set({ logs: recentLogs }).catch((err) => {
          console.error('Failed to save logs:', err);
        });
      });
    } catch (err) {
      // Silently fail if storage is not available
      console.error('Failed to log to storage:', err);
    }
  }

  public async getLogs(): Promise<
    Array<{
      level: string;
      message: string;
      error?: string;
      stack?: string;
      timestamp: string;
    }>
  > {
    return new Promise((resolve) => {
      chrome.storage.local.get(['logs'], (result) => {
        resolve(
          (result['logs'] as Array<{
            level: string;
            message: string;
            error?: string;
            stack?: string;
            timestamp: string;
          }>) || []
        );
      });
    });
  }

  public clearLogs(): void {
    chrome.storage.local.set({ logs: [] }).catch((err) => {
      console.error('Failed to clear logs:', err);
    });
  }
}

export const logger = Logger.getInstance();
