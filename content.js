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