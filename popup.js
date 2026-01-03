/**
 * Popup Script for Grindr Auto Tap extension
 * Handles UI interactions and settings management
 */

// Initialize edit mode managers (external from edit-mode.js)
let editModeManagers = null;

// Tab management
const tabs = {
  script: { tab: document.getElementById('tabScript'), content: document.getElementById('contentScript') },
  settings: { tab: document.getElementById('tabSettings'), content: document.getElementById('contentSettings') },
  webhook: { tab: document.getElementById('tabWebhook'), content: document.getElementById('contentWebhook') },
  logs: { tab: document.getElementById('tabLogs'), content: document.getElementById('contentLogs') }
};

// Current active tab
let activeTab = 'script';

/**
 * Initialize popup when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize edit mode managers
  if (typeof createEditModeManagers === 'function') {
    editModeManagers = createEditModeManagers();
  }

  // Setup tab navigation
  setupTabs();

  // Load initial data
  await loadSavedData();

  // Check script status
  await checkScriptStatus();
});

/**
 * Setup tab navigation
 */
function setupTabs() {
  // Add click listeners to all tabs
  Object.keys(tabs).forEach(tabKey => {
    const tabElement = tabs[tabKey].tab;
    if (tabElement) {
      tabElement.addEventListener('click', () => switchTab(tabKey));
    }
  });
}

/**
 * Switch to a different tab
 * @param {string} tabKey - Key of the tab to switch to
 */
function switchTab(tabKey) {
  // Cancel any active edit mode
  cancelEditMode();

  // Remove active class from all tabs and content
  Object.keys(tabs).forEach(key => {
    if (tabs[key].tab) {
      tabs[key].tab.classList.remove('active');
    }
    if (tabs[key].content) {
      tabs[key].content.classList.remove('active');
    }
  });

  // Add active class to selected tab and content
  if (tabs[tabKey] && tabs[tabKey].tab) {
    tabs[tabKey].tab.classList.add('active');
  }
  if (tabs[tabKey] && tabs[tabKey].content) {
    tabs[tabKey].content.classList.add('active');
  }

  activeTab = tabKey;

  // Load data on-demand when activating specific tabs
  if (tabKey === 'webhook') {
    loadWebhookDisplay();
  } else if (tabKey === 'logs') {
    loadLogs();
  }
}

/**
 * Cancel edit mode for all sections
 */
function cancelEditMode() {
  if (editModeManagers) {
    Object.values(editModeManagers).forEach(manager => {
      if (manager && typeof manager.cancel === 'function') {
        manager.cancel();
      }
    });
  }
}

/**
 * Load saved data on popup open
 */
async function loadSavedData() {
  // Load auth, auto-start, min delay
  // Skip webhook loading initially (loaded on-demand)
  await loadAuthDisplay();
  await loadMinDelayDisplay();
  await loadAutoStart();
}

/**
 * Check script status and update buttons
 */
async function checkScriptStatus() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('web.grindr.com')) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
        if (chrome.runtime.lastError) {
          updateScriptButtons(false);
        } else {
          updateScriptButtons(response && response.isRunning);
        }
      });
    } else {
      updateScriptButtons(false);
    }
  } catch (error) {
    logger('error', 'checkScriptStatus', 'Failed to check script status', { error: error.message });
    updateScriptButtons(false);
  }
}

/**
 * Update script control buttons visibility
 * @param {boolean} isRunning - Whether script is running
 */
function updateScriptButtons(isRunning) {
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');

  if (isRunning) {
    if (startButton) startButton.classList.add('hidden');
    if (stopButton) stopButton.classList.remove('hidden');
  } else {
    if (startButton) startButton.classList.remove('hidden');
    if (stopButton) stopButton.classList.add('hidden');
  }
}

/**
 * Logger function for popup
 */
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Popup',
    message: message,
    data: data
  };

  // Send to background for storage
  chrome.runtime.sendMessage({
    action: 'addLog',
    logEntry: logEntry
  }).catch(err => {
    console.error('Failed to send log to background:', err);
  });
}
