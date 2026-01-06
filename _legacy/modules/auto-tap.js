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
   * Checks if the profile has already been tapped and clicks the appropriate button.
   * Updates counters and global stats accordingly.
   *
   * @param {{alreadyTappedCount: number, tappedCount: number}} counters - Counters object tracking tapped profiles
   * @returns {Promise<{processed: boolean, shouldContinue: boolean}>} Object indicating if profile was processed and if loop should continue
   * @throws {Error} If clicking on buttons fails
   *
   * @example
   * const counters = { alreadyTappedCount: 0, tappedCount: 0 };
   * const result = await processProfile(counters);
   * if (result.shouldContinue) {
   *   // Continue to next profile
   * }
   */
  async function processProfile(counters) {
    const tapBtn = document.querySelector(SELECTORS.PROFILE.TAP_BUTTON);
    const nextBtn = document.querySelector(SELECTORS.PROFILE.NEXT_PROFILE);

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
   * Wait for the next profile button to appear in the DOM
   * Polls the DOM until the button is found or timeout is reached.
   * Respects script stop flags to allow graceful interruption.
   *
   * @returns {Promise<boolean>} True if button appeared within timeout, false otherwise
   *
   * @example
   * const buttonAppeared = await waitForNextProfileButton();
   * if (!buttonAppeared) {
   *   logger('warn', 'Content', 'Button never appeared');
   *   return;
   * }
   */
  async function waitForNextProfileButton() {
    const waitStartTime = Date.now();
    while (!document.querySelector(SELECTORS.PROFILE.NEXT_PROFILE) && (Date.now() - waitStartTime) < TIMEOUTS.BUTTON_WAIT) {
      if (!window.__grindrRunning || window.__grindrStopped) {
        logger('info', 'Content', '⏹️ Script arrêté pendant l\'attente du bouton');
        return false;
      }
      await delay(DELAYS.MEDIUM);
    }
    return !!document.querySelector(SELECTORS.PROFILE.NEXT_PROFILE);
  }

  /**
   * Check if the script should continue running
   * Validates against stop flags, maximum duration, and maximum iterations.
   * Logs appropriate warnings when limits are reached.
   *
   * @param {number} startTime - Start timestamp in milliseconds (from Date.now())
   * @param {number} iterationCount - Current iteration count (number of profiles processed)
   * @returns {boolean} True if should continue, false if should stop
   *
   * @example
   * const startTime = Date.now();
   * let iterationCount = 0;
   * while (shouldContinue(startTime, iterationCount)) {
   *   // Process profiles
   *   iterationCount++;
   * }
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
   * Processes profiles until limits are reached or script is stopped.
   * Initializes global stats, waits for the first profile button,
   * then enters the main processing loop. Sends final statistics
   * to webhook when complete or on error.
   *
   * Sets up global state (window.__grindrStats, window.__grindrRunning)
   * and cleans up after completion.
   *
   * @returns {Promise<void>} Resolves when script completes or stops
   * @throws {Error} Rethrows any fatal errors after sending error stats
   *
   * @example
   * // Start the auto-tap script
   * await autoTapAndNext();
   * // Script will run until stopped or limits reached
   */
  async function autoTapAndNext() {
    const startTime = Date.now();
    const counters = {
      alreadyTappedCount: 0,
      tappedCount: 0
    };
    let stats = null;

    // Initialize stats using StateManager
    const { StateManager } = window;
    if (StateManager) {
      StateManager.initializeStats({
        startTime: startTime,
        alreadyTappedCount: 0,
        tappedCount: 0
      });
    } else {
      // Fallback if StateManager not available
      window.__grindrStats = {
        startTime: startTime,
        alreadyTappedCount: 0,
        tappedCount: 0
      };
    }

    logger('info', 'Content', `🚀 Démarrage du script à ${formatDate(startTime)}`);

    try {
      let iterationCount = 0;

      // Wait for next profile button to appear
      const buttonAppeared = await waitForNextProfileButton();
      if (!buttonAppeared) {
        return;
      }

      // Main loop
      while (document.querySelector(SELECTORS.PROFILE.NEXT_PROFILE) && shouldContinue(startTime, iterationCount)) {
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
      // Use StateManager for proper cleanup
      const { StateManager } = window;
      if (StateManager) {
        StateManager.setState(StateManager.State.STOPPED);
        StateManager.clearStats();
        StateManager.setLastRunTime(Date.now());
      } else {
        // Fallback if StateManager not available
        window.__grindrRunning = false;
        window.__grindrStats = null; // Set to null instead of delete (non-configurable)
        window.__grindrLastRun = Date.now();
      }

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