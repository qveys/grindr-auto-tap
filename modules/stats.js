/**
 * Statistics and Webhook module for Grindr Auto Tap extension
 * Handles collecting and sending statistics to N8N webhook
 *
 * Note: This file is loaded as a global script, not as an ES module
 * Functions are attached to window.StatsModule
 */

// Dependencies will be loaded via script tags in manifest.json

// Extract constants from window for easier access
const { DELAYS, TIMEOUTS, URLS } = window.Constants || {};

// Utility function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
function initializeStats() {
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
function recordSuccessfulTap(stats) {
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
function recordFailedTap(stats) {
  stats.totalTaps += 1;
  stats.failedTaps += 1;
  logger('debug', 'recordFailedTap', 'Failed tap recorded', {
    total: stats.totalTaps,
    failed: stats.failedTaps
  });
  return stats;
}