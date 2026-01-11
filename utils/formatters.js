/**
 * Formatter utilities for Grindr Auto Tap extension
 * Date and duration formatting functions
 */

(function() {
  'use strict';

  /**
   * Format a timestamp to a readable date string
   * Converts a Unix timestamp (in milliseconds) to a localized date string.
   * Uses French date format: DD/MM/YYYY HH:MM:SS
   *
   * @param {number} timestamp - Unix timestamp in milliseconds (from Date.now())
   * @returns {string} Formatted date string in DD/MM/YYYY HH:MM:SS format
   *
   * @example
   * const now = Date.now();
   * const formatted = formatDate(now);
   * // formatted = "04/01/2024 14:30:45"
   *
   * @example
   * logger('info', 'Content', `Script started at ${formatDate(startTime)}`);
   */
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format a duration in milliseconds to a readable string
   * Converts milliseconds to a human-readable duration format.
   * Shows minutes and seconds if duration >= 1 minute, otherwise only seconds.
   *
   * @param {number} ms - Duration in milliseconds (must be >= 0)
   * @returns {string} Formatted duration string (e.g., "5min 30s" or "45s")
   *
   * @example
   * const duration = 330000; // 5.5 minutes
   * const formatted = formatDuration(duration);
   * // formatted = "5min 30s"
   *
   * @example
   * const duration = 45000; // 45 seconds
   * const formatted = formatDuration(duration);
   * // formatted = "45s"
   *
   * @example
   * const elapsed = Date.now() - startTime;
   * logger('info', 'Content', `Script ran for ${formatDuration(elapsed)}`);
   */
  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    }
    return `${seconds}s`;
  }

  // Export to global scope
  window.Formatters = {
    formatDate,
    formatDuration
  };
})();
