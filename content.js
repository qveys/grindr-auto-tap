/**
 * Content Script for Grindr Auto Tap extension
 * Main orchestrator that coordinates all modules
 */

// Logger for content script
function log(level, message, data = null) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'addLog',
      logEntry: {
        timestamp: Date.now(),
        level: level,
        location: 'ContentScript',
        message: message,
        data: data
      }
    }).catch(err => {
      console.error('Failed to send log:', err);
    });
  }
}

/**
 * Perform auto-login if configured
 */
async function performAutoLogin() {
  try {
    log('info', 'Checking auto-login setting');

    const result = await chrome.storage.local.get(['autoLogin', 'loginMethod', 'grindrEmail', 'grindrPassword']);

    if (!result.autoLogin) {
      log('debug', 'Auto-login disabled');
      return true; // Not an error, just disabled
    }

    const { loginMethod = 'email', grindrEmail, grindrPassword } = result;

    // Check if already logged in
    if (typeof window.AuthModule !== 'undefined' && window.AuthModule.checkLoginStatus()) {
      log('info', 'Already logged in');
      return true;
    }

    log('info', 'Performing auto-login', { method: loginMethod });

    // Perform login
    let success = false;
    if (loginMethod === 'email' && grindrEmail && grindrPassword) {
      success = await window.AuthModule.performLogin('email', grindrEmail, grindrPassword);
    } else if (loginMethod === 'facebook') {
      success = await window.AuthModule.performLogin('facebook');
    } else if (loginMethod === 'google') {
      success = await window.AuthModule.performLogin('google');
    } else if (loginMethod === 'apple') {
      success = await window.AuthModule.performLogin('apple');
    } else {
      log('warn', 'Invalid or missing login method');
      return false;
    }

    if (success) {
      log('info', 'Auto-login completed successfully');
    } else {
      log('error', 'Auto-login failed');
    }

    return success;
  } catch (error) {
    log('error', 'Auto-login error', { error: error.message });
    return false;
  }
}

/**
 * Initialize content script and set up message listeners
 */
function initializeContentScript() {
  log('info', 'Content script initialized on page');

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handlePopupMessage(request, sendResponse);
  });

  // Perform auto-login if configured
  performAutoLogin().catch(err => {
    log('error', 'Failed to perform auto-login', { error: err.message });
  });
}

/**
 * Handle messages from popup UI
 * @param {Object} request - Message request
 * @param {Function} sendResponse - Response callback
 */
function handlePopupMessage(request, sendResponse) {
  if (request.action === 'startAutoTap') {
    log('info', 'Start auto-tap requested');
    startAutoTap();
    sendResponse({ success: true });
  } else if (request.action === 'stopAutoTap') {
    log('info', 'Stop auto-tap requested');
    stopAutoTap();
    sendResponse({ success: true });
  } else if (request.action === 'getStatus') {
    sendResponse({ status: 'idle' });
  }
}

let autoTapRunning = false;
let autoTapStats = null;

/**
 * Start auto-tap operation
 */
async function startAutoTap() {
  if (autoTapRunning) {
    log('warn', 'Auto-tap already running');
    return;
  }

  log('info', 'Auto-tap starting');
  autoTapRunning = true;

  try {
    // Initialize statistics
    if (typeof window.StatsModule === 'undefined') {
      log('error', 'StatsModule not available');
      autoTapRunning = false;
      return;
    }

    autoTapStats = window.StatsModule.initializeStats();
    const result = await chrome.storage.local.get(['minDelayHours', 'n8nWebhookURL']);
    const minDelayHours = result.minDelayHours || 12;
    const webhookUrl = result.n8nWebhookURL || 'https://n8n.quentinveys.be/webhook/grindr-stats';

    log('info', 'Auto-tap loop starting', { minDelayHours });

    while (autoTapRunning) {
      // Check if profile is visible
      if (typeof window.ProfileOpenerModule === 'undefined') {
        log('error', 'ProfileOpenerModule not available');
        break;
      }

      if (!window.ProfileOpenerModule.isProfileVisible()) {
        log('warn', 'No profile visible, waiting');
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Perform single tap
      const success = await window.ProfileOpenerModule.performSingleTap();

      // Update statistics
      if (success) {
        autoTapStats = window.StatsModule.recordSuccessfulTap(autoTapStats);
      } else {
        autoTapStats = window.StatsModule.recordFailedTap(autoTapStats);
      }

      log('debug', 'Tap iteration', {
        total: autoTapStats.totalTaps,
        successful: autoTapStats.successfulTaps,
        failed: autoTapStats.failedTaps
      });

      // Wait before next tap
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Finalize and send statistics
    if (autoTapStats) {
      autoTapStats = window.StatsModule.finalizeStats(autoTapStats);
      log('info', 'Sending webhook with statistics', { stats: autoTapStats });
      await window.StatsModule.sendWebhook(autoTapStats, webhookUrl);
    }
  } catch (error) {
    log('error', 'Auto-tap error', { error: error.message });
  } finally {
    autoTapRunning = false;
    log('info', 'Auto-tap completed', { stats: autoTapStats });
  }
}

/**
 * Stop auto-tap operation
 */
function stopAutoTap() {
  log('info', 'Auto-tap stopping');
  autoTapRunning = false;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}