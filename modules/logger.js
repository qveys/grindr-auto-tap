/**
 * Logger module for Grindr Auto Tap extension
 * Centralized logging system that stores logs with timestamps
 */

const MAX_LOGS = 1000;
const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
};