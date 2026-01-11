/**
 * @fileoverview Script Manager for Popup
 * Handles script start/stop and status checking.
 * @module PopupScriptManager
 */

(function() {
  'use strict';

  const logger = window.createLogger ? window.createLogger('PopupScriptManager') : window.logger;
  const { showStatus } = window.PopupUI || {};

  // Last known script status
  let lastKnownScriptStatus = null;

  /**
   * Update script control buttons
   * @param {boolean} isRunning - Whether script is running
   */
  function updateScriptButtons(isRunning) {
    const startBtn = document.getElementById('startScript');
    const stopBtn = document.getElementById('stopScript');

    if (!startBtn || !stopBtn) return;

    if (isRunning) {
      startBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
    } else {
      startBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
    }
  }

  /**
   * Check script status
   * @param {number} [retryCount=0] - Current retry count
   * @param {boolean} [isPeriodicCheck=false] - Whether this is a periodic check
   */
  function checkScriptStatus(retryCount = 0, isPeriodicCheck = false) {
    // Try active tab first
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      let targetTab = null;

      if (activeTabs[0] && activeTabs[0].url && activeTabs[0].url.includes('web.grindr.com')) {
        targetTab = activeTabs[0];
      } else {
        // If active tab is not Grindr, search all Grindr tabs
        chrome.tabs.query({ url: '*://web.grindr.com/*' }, (grindrTabs) => {
          if (grindrTabs.length > 0) {
            targetTab = grindrTabs[0];
            queryScriptStatus(targetTab.id, retryCount, isPeriodicCheck);
          }
        });
        return;
      }

      if (targetTab) {
        queryScriptStatus(targetTab.id, retryCount, isPeriodicCheck);
      }
    });
  }

  /**
   * Query script status in specific tab
   * @param {number} tabId - Tab ID
   * @param {number} retryCount - Retry count
   * @param {boolean} isPeriodicCheck - Whether periodic check
   * @private
   */
  function queryScriptStatus(tabId, retryCount, isPeriodicCheck) {
    chrome.tabs.sendMessage(tabId, { action: 'getScriptStatus' }, (response) => {
      if (chrome.runtime.lastError) {
        // Retry if possible
        if (retryCount < 3) {
          if (!isPeriodicCheck) {
            logger('debug', 'PopupScriptManager', `⚠️ Status check error (attempt ${retryCount + 1}/3): ${chrome.runtime.lastError.message}`);
          }
          setTimeout(() => {
            checkScriptStatus(retryCount + 1, isPeriodicCheck);
          }, 500);
        } else if (!isPeriodicCheck) {
          logger('warn', 'PopupScriptManager', '❌ Cannot check script status after 3 attempts');
        }
      } else if (response) {
        const isRunning = response.isRunning || false;
        // Log only if status changed or first check
        if (lastKnownScriptStatus !== isRunning) {
          logger('info', 'PopupScriptManager', `📊 Script status: ${isRunning ? 'running' : 'stopped'}`);
          lastKnownScriptStatus = isRunning;
        }
        updateScriptButtons(isRunning);
      }
    });
  }

  /**
   * Start script
   */
  function startScript() {
    logger('info', 'PopupScriptManager', '📤 Manual script start requested...');

    // Try active tab first
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      let targetTab = null;

      if (activeTabs[0] && activeTabs[0].url && activeTabs[0].url.includes('web.grindr.com')) {
        targetTab = activeTabs[0];
        sendStartScriptMessage(targetTab.id);
      } else {
        // If active tab is not Grindr, search all Grindr tabs
        chrome.tabs.query({ url: '*://web.grindr.com/*' }, (grindrTabs) => {
          if (grindrTabs.length > 0) {
            targetTab = grindrTabs[0];
            logger('info', 'PopupScriptManager', `🔍 Grindr tab found: ${targetTab.id} (${targetTab.url})`);
            sendStartScriptMessage(targetTab.id);
          } else {
            showStatus && showStatus('⚠️ Ouvrez web.grindr.com', 'error');
            logger('warn', 'PopupScriptManager', '⚠️ Cannot start script: no Grindr tab found');
          }
        });
      }
    });
  }

  /**
   * Send start script message to tab
   * @param {number} tabId - Tab ID
   * @private
   */
  function sendStartScriptMessage(tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'startScript' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus && showStatus('❌ Erreur: ' + chrome.runtime.lastError.message, 'error');
        logger('error', 'PopupScriptManager', '❌ Script start error: ' + chrome.runtime.lastError.message);
        updateScriptButtons(false);
      } else if (response && response.success) {
        showStatus && showStatus('▶️ Script démarré', 'success');
        logger('info', 'PopupScriptManager', '✅ Script started manually');
        updateScriptButtons(true);
      } else {
        showStatus && showStatus('❌ Échec du démarrage: ' + (response?.error || 'Erreur inconnue'), 'error');
        logger('error', 'PopupScriptManager', '❌ Script start failed: ' + (response?.error || 'Unknown error'));
        updateScriptButtons(false);
      }
    });
  }

  /**
   * Stop script
   */
  function stopScript() {
    logger('info', 'PopupScriptManager', '📤 Manual script stop requested...');

    // Find ALL Grindr tabs
    chrome.tabs.query({ url: '*://web.grindr.com/*' }, (tabs) => {
      if (tabs.length === 0) {
        showStatus && showStatus('⚠️ Aucun onglet web.grindr.com trouvé', 'error');
        logger('warn', 'PopupScriptManager', '⚠️ Cannot stop script: no Grindr tab found');
        return;
      }

      // Send stop message to all Grindr tabs
      let successCount = 0;
      let errorCount = 0;
      let pending = tabs.length;

      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'stopScript' }, (response) => {
          pending--;

          if (chrome.runtime.lastError) {
            errorCount++;
            logger('error', 'PopupScriptManager', `❌ Stop error in tab ${tab.id}: ${chrome.runtime.lastError.message}`);
          } else if (response && response.success) {
            successCount++;
          } else {
            errorCount++;
            logger('error', 'PopupScriptManager', `❌ Stop failed in tab ${tab.id}: ${response?.error || 'Unknown error'}`);
          }

          // Once all tabs responded
          if (pending === 0) {
            if (successCount > 0) {
              showStatus && showStatus('⏹️ Script arrêté', 'success');
              logger('info', 'PopupScriptManager', `✅ Script stopped manually in ${successCount} tab(s)`);
              updateScriptButtons(false);
            } else {
              showStatus && showStatus('❌ Échec de l\'arrêt dans tous les onglets', 'error');
              logger('error', 'PopupScriptManager', '❌ Stop failed in all tabs');
              updateScriptButtons(true);
            }
          }
        });
      });
    });
  }

  /**
   * Initialize status checking
   * Performs initial status check only - status updates are event-driven via chrome.runtime.onMessage
   */
  function initializeStatusCheck() {
    // Initial check with retries
    checkScriptStatus(0, false);

    logger('info', 'PopupScriptManager', '✅ Event-driven status updates enabled (no polling)');
  }

  // Export to global scope
  window.PopupScriptManager = {
    startScript,
    stopScript,
    checkScriptStatus,
    updateScriptButtons,
    initializeStatusCheck
  };
})();
