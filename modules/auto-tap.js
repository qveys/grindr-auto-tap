/**
 * Auto-tap module for Grindr Auto Tap extension
 * Handles the main auto-tap loop that processes profiles
 */

(function() {
  'use strict';

  // Dependencies: window.Constants, window.Logger, window.DOMHelpers, window.Formatters, window.Stats
  const { SELECTORS, DELAYS, TIMEOUTS, LIMITS } = window.Constants;
  const { logger } = window.Logger;
  const { delay, getTextNodes } = window.DOMHelpers;
  const { formatDate, formatDuration } = window.Formatters;
  const { createStatsFromState, createErrorStats, sendFinalStats } = window.Stats;

  /**
   * Process a single profile (tap if needed, then go to next)
   * @param {Object} counters - Counters object {alreadyTappedCount, tappedCount}
   * @returns {Promise<{processed: boolean, shouldContinue: boolean}>}
   */
  async function processProfile(counters) {
    const tapBtn = document.querySelector(SELECTORS.TAP_BUTTON);
    const nextBtn = document.querySelector(SELECTORS.NEXT_PROFILE);

    if (!nextBtn) {
      logger('warn', 'Content', '⚠️ Bouton "Next Profile" introuvable, arrêt de la boucle');
      return { processed: false, shouldContinue: false };
    }

    const modalRoot = document.querySelector(".MuiModal-root .MuiStack-root");
    const textNodes = modalRoot ? getTextNodes(modalRoot) : [];

    if (!tapBtn) {
      logger('debug', 'Content', '➡️ déjà tapper, au suivant', textNodes);
      counters.alreadyTappedCount++;
      window.__grindrStats.alreadyTappedCount = counters.alreadyTappedCount;

      try {
        nextBtn.click();
      } catch (clickError) {
        logger('error', 'Content', '❌ Erreur lors du clic sur nextBtn: ' + clickError.message);
        throw clickError;
      }
    } else {
      logger('debug', 'Content', '🔥 à tapper', textNodes);
      counters.tappedCount++;
      window.__grindrStats.tappedCount = counters.tappedCount;

      try {
        tapBtn.click();
        await delay(DELAYS.SECOND);
        nextBtn.click();
        await delay(DELAYS.SECOND);
      } catch (clickError) {
        logger('error', 'Content', '❌ Erreur lors du clic: ' + clickError.message);
        throw clickError;
      }
    }

    await delay(DELAYS.TWO_SECONDS);
    return { processed: true, shouldContinue: true };
  }

  /**
   * Wait for the next profile button to appear
   * @returns {Promise<boolean>} True if button appeared, false if timeout
   */
  async function waitForNextProfileButton() {
    const waitStartTime = Date.now();
    while (!document.querySelector(SELECTORS.NEXT_PROFILE) && (Date.now() - waitStartTime) < TIMEOUTS.BUTTON_WAIT) {
      if (!window.__grindrRunning || window.__grindrStopped) {
        logger('info', 'Content', '⏹️ Script arrêté pendant l\'attente du bouton');
        return false;
      }
      await delay(DELAYS.MEDIUM);
    }
    return !!document.querySelector(SELECTORS.NEXT_PROFILE);
  }

  /**
   * Check if the script should continue running
   * @param {number} startTime - Start timestamp
   * @param {number} iterationCount - Current iteration count
   * @returns {boolean} True if should continue, false if should stop
   */
  function shouldContinue(startTime, iterationCount) {
    if (!window.__grindrRunning || window.__grindrStopped) {
      logger('info', 'Content', '⏹️ Script arrêté, interruption de la boucle');
      return false;
    }

    const currentDuration = Date.now() - startTime;
    if (currentDuration > LIMITS.MAX_DURATION_MS) {
      logger('warn', 'Content', `⚠️ Durée maximale atteinte (${formatDuration(LIMITS.MAX_DURATION_MS)}), arrêt du script`);
      return false;
    }

    if (iterationCount > LIMITS.MAX_ITERATIONS) {
      logger('warn', 'Content', `⚠️ Nombre maximum d'itérations atteint (${LIMITS.MAX_ITERATIONS}), arrêt du script`);
      return false;
    }

    return true;
  }

  /**
   * Main auto-tap loop
   * Processes profiles until limits are reached or script is stopped
   * @returns {Promise<void>}
   */
  async function autoTapAndNext() {
    const startTime = Date.now();
    const counters = {
      alreadyTappedCount: 0,
      tappedCount: 0
    };
    let stats = null;

    window.__grindrStats = {
      startTime: startTime,
      alreadyTappedCount: 0,
      tappedCount: 0
    };

    logger('info', 'Content', `🚀 Démarrage du script à ${formatDate(startTime)}`);

    try {
      let iterationCount = 0;

      // Wait for next profile button to appear
      const buttonAppeared = await waitForNextProfileButton();
      if (!buttonAppeared) {
        return;
      }

      // Main loop
      while (document.querySelector(SELECTORS.NEXT_PROFILE) && shouldContinue(startTime, iterationCount)) {
        iterationCount++;

        try {
          const result = await processProfile(counters);
          if (!result.shouldContinue) {
            break;
          }
        } catch (loopError) {
          logger('error', 'Content', '❌ Erreur dans la boucle: ' + loopError.message);
          await delay(DELAYS.SECOND);
          continue;
        }
      }

      // Create and send final stats
      const endTime = Date.now();
      stats = createStatsFromState(
        startTime,
        endTime,
        counters.alreadyTappedCount,
        counters.tappedCount
      );

      await sendFinalStats(stats, false);
      logger('info', 'Content', '✅ Fin de la boucle');

    } catch (error) {
      logger('error', 'Content', '❌ Erreur fatale dans autoTapAndNext: ' + error.message, error);

      const endTime = Date.now();
      stats = createErrorStats(
        createStatsFromState(
          startTime,
          endTime,
          counters.alreadyTappedCount,
          counters.tappedCount
        ),
        error
      );

      await sendFinalStats(stats, true);
      throw error;
    } finally {
      window.__grindrRunning = false;
      if (window.__grindrStats) {
        delete window.__grindrStats;
      }
      window.__grindrLastRun = Date.now();

      // Notifier le popup que le script s'est arrêté
      if (window.notifyPopupScriptStatus) {
        window.notifyPopupScriptStatus(false);
      }
    }
  }

  // Export to global scope
  window.AutoTap = {
    autoTapAndNext
  };
})();

