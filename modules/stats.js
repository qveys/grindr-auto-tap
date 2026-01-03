/**
 * Statistics and Webhook module for Grindr Auto Tap extension
 * Handles collecting and sending statistics to N8N webhook
 */

import { formatDate, formatDuration } from '../utils/formatters.js';
import { LIMITS } from '../utils/constants.js';

// Logger function for stats module
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Stats',
    message: message,
    data: data
  };

  // Log to console as well
  const consoleMethod = level === 'error' ? console.error :
    level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
        console.log;
  consoleMethod(`[${location}] ${message}`, data || '');

  // Send to background script to store
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'addLog',
      logEntry: logEntry
    }).catch(err => {
      // Silently fail if background script is not available
      console.error('Failed to send log to background:', err);
    });
  }
}

/**
 * Initialize statistics object with default values
 * @returns {Object} Statistics object
 */
export function initializeStats() {
  const stats = {
    startTime: Date.now(),
    endTime: null,
    totalTaps: 0,
    successfulTaps: 0,
    failedTaps: 0,
    duration: 0,
    timestamp: new Date().toISOString(),
  };
  logger('debug', 'initializeStats', 'Statistics initialized', stats);
  return stats;
}

/**
 * Update statistics with successful tap
 * @param {Object} stats - Statistics object
 * @returns {Object} Updated statistics object
 */
export function recordSuccessfulTap(stats) {
  stats.totalTaps += 1;
  stats.successfulTaps += 1;
  logger('debug', 'recordSuccessfulTap', 'Successful tap recorded', {
    total: stats.totalTaps,
    successful: stats.successfulTaps
  });
  return stats;
}

/**
 * Update statistics with failed tap
 * @param {Object} stats - Statistics object
 * @returns {Object} Updated statistics object
 */
export function recordFailedTap(stats) {
  stats.totalTaps += 1;
  stats.failedTaps += 1;
  logger('debug', 'recordFailedTap', 'Failed tap recorded', {
    total: stats.totalTaps,
    failed: stats.failedTaps
  });
  return stats;
}

/**
 * Finalize statistics and calculate duration
 * @param {Object} stats - Statistics object
 * @returns {Object} Finalized statistics object
 */
export function finalizeStats(stats) {
  stats.endTime = Date.now();
  stats.duration = stats.endTime - stats.startTime;
  stats.successRate = stats.totalTaps > 0 ? (stats.successfulTaps / stats.totalTaps * 100).toFixed(2) : 0;
  logger('info', 'finalizeStats', 'Statistics finalized', {
    duration: stats.duration,
    total: stats.totalTaps,
    successful: stats.successfulTaps,
    failed: stats.failedTaps,
    successRate: stats.successRate
  });
  return stats;
}

/**
 * Send statistics to N8N webhook via background script
 * @param {Object} stats - Finalized statistics object
 * @param {number} retry - Number of retries (default: 2)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function sendToN8NWebhook(stats, retry = 2) {
  try {
    logger('info', 'sendToN8NWebhook', 'Sending statistics via background', { retry });
    
    const response = await chrome.runtime.sendMessage({
      action: 'sendToN8N',
      data: stats,
      retry: retry
    });
    
    if (response && response.success) {
      logger('info', 'sendToN8NWebhook', 'Webhook sent successfully');
      return true;
    } else {
      logger('error', 'sendToN8NWebhook', 'Webhook failed', response);
      return false;
    }
  } catch (error) {
    logger('error', 'sendToN8NWebhook', 'Failed to send webhook', { error: error.message });
    return false;
  }
}

/**
 * Display statistics summary in console
 * @param {Object} stats - Statistics object
 */
export function displayStats(stats) {
  const successRate = stats.totalTaps > 0 ? (stats.successfulTaps / stats.totalTaps * 100).toFixed(1) : 0;
  const duration = formatDuration(stats.duration);
  
  console.log(`📊 Grindr Auto Tap Statistics`);
  console.log(`⏱️  Duration: ${duration}`);
  console.log(`👥 People tapped: ${stats.successfulTaps}/${stats.totalTaps}`);
  console.log(`✅ Success rate: ${successRate}%`);
  console.log(`📅 Date: ${formatDate(stats.startTime)}`);
}

/**
 * Send final statistics with display and webhook
 * @param {Object} stats - Statistics object
 * @param {boolean} isError - Whether this is an error scenario
 */
export async function sendFinalStats(stats, isError = false) {
  try {
    displayStats(stats);
    
    if (!isError) {
      await sendToN8NWebhook(stats);
    }
  } catch (error) {
    logger('error', 'sendFinalStats', 'Failed to send final stats', { error: error.message });
  }
}

/**
 * Create error statistics object
 * @param {string} errorMessage - Error message
 * @returns {Object} Error statistics object
 */
export function createErrorStats(errorMessage) {
  return {
    startTime: Date.now(),
    endTime: Date.now(),
    totalTaps: 0,
    successfulTaps: 0,
    failedTaps: 0,
    duration: 0,
    timestamp: new Date().toISOString(),
    error: errorMessage,
    successRate: 0
  };
}