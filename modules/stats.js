/**
 * Statistics module for Grindr Auto Tap extension
 * Handles statistics tracking, display, and webhook sending
 */

(function() {
  'use strict';

  // Dependencies: window.Constants, window.Logger, window.Formatters
  const { LIMITS } = window.Constants;
  const { logger } = window.Logger;
  const { formatDate, formatDuration } = window.Formatters;

  /**
   * Send statistics to n8n webhook via background script
   * Uses centralized messaging utility (window.sendStatsToWebhook) with fallback
   * to direct chrome.runtime.sendMessage if messaging utility not loaded.
   * The background script handles the actual HTTP request to bypass CSP restrictions.
   *
   * @param {{startTime: number, endTime: number, duration: number, alreadyTappedCount: number, tappedCount: number, totalCount: number, error?: boolean, errorMessage?: string}} stats - Statistics object with run metrics
   * @param {number} [retries=LIMITS.DEFAULT_RETRIES] - Number of retries for webhook request
   * @returns {Promise<boolean>} True if sent successfully, false otherwise
   *
   * @example
   * const stats = createStatsFromState(startTime, endTime, 10, 5);
   * const sent = await sendToN8NWebhook(stats);
   * if (sent) {
   *   logger('info', 'Content', 'Stats sent successfully');
   * }
   */
  async function sendToN8NWebhook(stats, retries = LIMITS.DEFAULT_RETRIES) {
    // Use centralized messaging utility if available
    if (typeof window !== 'undefined' && window.sendStatsToWebhook) {
      const response = await window.sendStatsToWebhook(stats, retries);
      if (response && response.success) {
        logger('info', 'Content', '📤 Récapitulatif envoyé à n8n avec succès');
        return true;
      } else {
        logger('error', 'Content', '❌ Erreur lors de l\'envoi du webhook: ' + (response?.error || 'Erreur inconnue'));
        return false;
      }
    }

    // Fallback to direct chrome.runtime.sendMessage if messaging utility not loaded
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'sendToN8N',
        stats: stats,
        retries: retries
      }, (response) => {
        if (chrome.runtime.lastError) {
          logger('error', 'Content', '❌ Erreur communication avec background: ' + chrome.runtime.lastError.message);
          resolve(false);
        } else {
          if (response && response.success) {
            logger('info', 'Content', '📤 Récapitulatif envoyé à n8n avec succès');
            resolve(true);
          } else {
            logger('error', 'Content', '❌ Erreur lors de l\'envoi du webhook: ' + (response?.error || 'Erreur inconnue'));
            resolve(false);
          }
        }
      });
    });
  }

  /**
   * Display statistics in console
   * Logs formatted statistics including start/end times, duration,
   * tap counts, and success rate. Shows error information if present.
   *
   * @param {{startTime: number, endTime: number, duration: number, alreadyTappedCount: number, tappedCount: number, totalCount: number, error?: boolean, errorMessage?: string}} stats - Statistics object to display
   *
   * @example
   * const stats = createStatsFromState(startTime, endTime, 10, 5);
   * displayStats(stats);
   * // Logs: 📊 RÉCAPITULATIF - Début: 01/01/2024 12:00:00, Fin: 01/01/2024 12:05:30...
   */
  function displayStats(stats) {
    const successRate = stats.totalCount > 0 ? ((stats.tappedCount / stats.totalCount) * 100).toFixed(1) : 0;

    logger('info', 'Content', `📊 RÉCAPITULATIF - Début: ${formatDate(stats.startTime)}, Fin: ${formatDate(stats.endTime)}, Durée: ${formatDuration(stats.duration)}`);
    logger('info', 'Content', `👥 Personnes déjà tapées: ${stats.alreadyTappedCount}, Tapées: ${stats.tappedCount}, Total: ${stats.totalCount}, Taux: ${successRate}%`);
    if (stats.error) {
      logger('warn', 'Content', `⚠️ Erreur: ${stats.errorMessage}`);
    }
  }

  /**
   * Create error statistics object
   * Adds error flag and error message to existing stats object.
   * Handles both Error objects and string error messages.
   *
   * @param {{startTime: number, endTime: number, duration: number, alreadyTappedCount: number, tappedCount: number, totalCount: number}} baseStats - Base statistics object
   * @param {Error|string} error - Error object or error message
   * @returns {{startTime: number, endTime: number, duration: number, alreadyTappedCount: number, tappedCount: number, totalCount: number, error: boolean, errorMessage: string}} Statistics object with error information
   *
   * @example
   * const baseStats = createStatsFromState(startTime, endTime, 10, 5);
   * const errorStats = createErrorStats(baseStats, new Error('Profile button not found'));
   * // errorStats.error === true
   * // errorStats.errorMessage === 'Profile button not found'
   */
  function createErrorStats(baseStats, error) {
    return {
      ...baseStats,
      error: true,
      errorMessage: error?.message || String(error) || 'Erreur inconnue'
    };
  }

  /**
   * Create statistics from provided parameters
   * Calculates duration and total count from the provided values.
   *
   * @param {number} startTime - Start timestamp in milliseconds
   * @param {number} endTime - End timestamp in milliseconds
   * @param {number} alreadyTappedCount - Number of profiles that were already tapped
   * @param {number} tappedCount - Number of profiles that were tapped in this run
   * @returns {{startTime: number, endTime: number, duration: number, alreadyTappedCount: number, tappedCount: number, totalCount: number}} Statistics object
   *
   * @example
   * const startTime = Date.now();
   * // ... run script ...
   * const endTime = Date.now();
   * const stats = createStatsFromState(startTime, endTime, 10, 5);
   * // stats.duration === (endTime - startTime)
   * // stats.totalCount === 15
   */
  function createStatsFromState(startTime, endTime, alreadyTappedCount, tappedCount) {
    const duration = endTime - startTime;
    const totalCount = alreadyTappedCount + tappedCount;

    return {
      startTime,
      endTime,
      duration,
      alreadyTappedCount,
      tappedCount,
      totalCount
    };
  }

  /**
   * Create statistics from global window state
   * Reads statistics from window.__grindrStats and creates a stats object.
   * This is a convenience function for creating stats from the running script.
   *
   * @param {number} [endTime=Date.now()] - End timestamp in milliseconds (defaults to current time)
   * @returns {{startTime: number, endTime: number, duration: number, alreadyTappedCount: number, tappedCount: number, totalCount: number}} Statistics object
   * @throws {Error} If window.__grindrStats is not available
   *
   * @example
   * // During script execution
   * window.__grindrStats = { startTime: Date.now(), alreadyTappedCount: 0, tappedCount: 0 };
   * // Later...
   * const stats = createStatsFromGlobalState();
   * // stats contains all calculated values
   */
  function createStatsFromGlobalState(endTime = Date.now()) {
    if (!window.__grindrStats) {
      throw new Error('No stats available in global state');
    }

    return createStatsFromState(
      window.__grindrStats.startTime,
      endTime,
      window.__grindrStats.alreadyTappedCount || 0,
      window.__grindrStats.tappedCount || 0
    );
  }

  /**
   * Send final statistics (with optional error)
   * Displays stats in console and sends them to the webhook.
   * Automatically adds error flag and default message if isError is true
   * and stats doesn't already have error information.
   *
   * @param {{startTime: number, endTime: number, duration: number, alreadyTappedCount: number, tappedCount: number, totalCount: number, error?: boolean, errorMessage?: string}} stats - Statistics object
   * @param {boolean} [isError=false] - Whether an error occurred during execution
   * @returns {Promise<void>} Resolves after stats are displayed and sent
   *
   * @example
   * // Normal completion
   * const stats = createStatsFromState(startTime, endTime, 10, 5);
   * await sendFinalStats(stats, false);
   *
   * @example
   * // Error completion
   * const stats = createStatsFromState(startTime, endTime, 10, 5);
   * await sendFinalStats(stats, true);
   * // stats.error will be set to true automatically
   */
  async function sendFinalStats(stats, isError = false) {
    const statsToSend = { ...stats };

    if (isError && !statsToSend.error) {
      statsToSend.error = true;
      if (!statsToSend.errorMessage) {
        statsToSend.errorMessage = 'Script interrompu prématurément';
      }
    }

    displayStats(statsToSend);
    await sendToN8NWebhook(statsToSend);
  }

  // Export to global scope
  window.Stats = {
    sendToN8NWebhook,
    displayStats,
    createErrorStats,
    createStatsFromState,
    createStatsFromGlobalState,
    sendFinalStats
  };
})();
