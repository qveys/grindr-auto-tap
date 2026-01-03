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

  // Setup edit mode button listeners
  setupEditModeButtons();

  // Setup authentication listeners
  setupAuthListeners();

  // Load initial data
  await loadSavedData();

  // Check script status
  await checkScriptStatus();

  // Setup script control buttons
  setupScriptControls();

  // Setup message listeners
  setupMessageListeners();
});

/**
 * Setup message listeners
 */
function setupMessageListeners() {
  // Listen for status updates from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStatus') {
      showStatus(request.message, request.type || 'info');
    } else if (request.action === 'scriptStatusChanged') {
      updateScriptButtons(request.isRunning || false);
    }
  });
}

/**
 * Setup script control buttons
 */
function setupScriptControls() {
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');

  if (startButton) {
    startButton.addEventListener('click', startScript);
  }
  if (stopButton) {
    stopButton.addEventListener('click', stopScript);
  }
}

/**
 * Start script
 */
async function startScript() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      showStatus('No active tab found', 'error');
      return;
    }

    // Verify tab URL contains 'web.grindr.com'
    if (!tabs[0].url || !tabs[0].url.includes('web.grindr.com')) {
      showStatus('Please open web.grindr.com', 'error');
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: 'startScript' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Failed to start script', 'error');
        logger('error', 'startScript', 'Failed to start script', { error: chrome.runtime.lastError.message });
      } else {
        showStatus('Script started', 'success');
        updateScriptButtons(true);
      }
    });
  } catch (error) {
    logger('error', 'startScript', 'Failed to start script', { error: error.message });
    showStatus('Failed to start script', 'error');
  }
}

/**
 * Stop script
 */
async function stopScript() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      showStatus('No active tab found', 'error');
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: 'stopScript' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Failed to stop script', 'error');
        logger('error', 'stopScript', 'Failed to stop script', { error: chrome.runtime.lastError.message });
      } else {
        showStatus('Script stopped', 'success');
        updateScriptButtons(false);
      }
    });
  } catch (error) {
    logger('error', 'stopScript', 'Failed to stop script', { error: error.message });
    showStatus('Failed to stop script', 'error');
  }
}

/**
 * Setup authentication listeners
 */
function setupAuthListeners() {
  const loginMethod = document.getElementById('loginMethod');
  const deleteAuthBtn = document.getElementById('deleteAuthBtn');

  if (loginMethod) {
    loginMethod.addEventListener('change', handleLoginMethodChange);
  }
  if (deleteAuthBtn) {
    deleteAuthBtn.addEventListener('click', deleteCredentials);
  }

  // Set save callback for auth edit mode manager
  if (editModeManagers && editModeManagers.auth) {
    editModeManagers.auth.saveCallback = saveCredentials;
    editModeManagers.auth.loadEditCallback = loadAuthToEdit;
  }

  // Set save callback for webhook edit mode manager
  if (editModeManagers && editModeManagers.webhook) {
    editModeManagers.webhook.saveCallback = saveWebhook;
    editModeManagers.webhook.loadEditCallback = loadWebhookToEdit;
  }

  // Set save callback for minDelay edit mode manager
  if (editModeManagers && editModeManagers.minDelay) {
    editModeManagers.minDelay.saveCallback = saveMinDelay;
    editModeManagers.minDelay.loadEditCallback = loadMinDelayToEdit;
  }
}

/**
 * Setup edit mode button listeners
 */
function setupEditModeButtons() {
  const editAuthBtn = document.getElementById('editAuth');
  const editWebhookBtn = document.getElementById('editWebhook');
  const editMinDelayBtn = document.getElementById('editMinDelay');

  if (editAuthBtn) {
    editAuthBtn.addEventListener('click', () => toggleEditMode('auth'));
  }
  if (editWebhookBtn) {
    editWebhookBtn.addEventListener('click', () => toggleEditMode('webhook'));
  }
  if (editMinDelayBtn) {
    editMinDelayBtn.addEventListener('click', () => toggleEditMode('minDelay'));
  }
}

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
 * Toggle edit mode for a specific section
 * @param {string} section - Section name (auth, webhook, minDelay)
 */
function toggleEditMode(section) {
  if (editModeManagers && editModeManagers[section]) {
    editModeManagers[section].toggle();
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

// Auto-cancel edit mode on popup close
window.addEventListener('beforeunload', cancelEditMode);
window.addEventListener('pagehide', cancelEditMode);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelEditMode();
  }
});

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
 * Save webhook URL
 */
async function saveWebhook() {
  const webhookURLInput = document.getElementById('webhookURL');
  if (!webhookURLInput) return;

  const url = webhookURLInput.value.trim();

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    showStatus('Invalid URL format', 'error');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'saveWebhookURL',
      url: url
    });

    if (response && response.success) {
      showStatus('Webhook URL saved', 'success');
      if (editModeManagers && editModeManagers.webhook) {
        editModeManagers.webhook.exitEditMode();
      }
      await loadWebhookDisplay();
    } else {
      showStatus('Failed to save webhook URL', 'error');
    }
  } catch (error) {
    logger('error', 'saveWebhook', 'Failed to save webhook URL', { error: error.message });
    showStatus('Failed to save webhook URL', 'error');
  }
}

/**
 * Load webhook display
 */
async function loadWebhookDisplay() {
  // Only update when webhook tab is active
  if (activeTab !== 'webhook') return;

  // Preserve edit mode if already editing
  if (editModeManagers && editModeManagers.webhook && editModeManagers.webhook.isEditing()) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ action: 'getWebhookURL' });
    const url = response && response.url ? response.url : 'https://n8n.quentinveys.be/webhook/grindr-stats';

    const webhookURLDisplay = document.getElementById('webhookURLDisplay');
    if (webhookURLDisplay) {
      webhookURLDisplay.textContent = url;
    }
  } catch (error) {
    logger('error', 'loadWebhookDisplay', 'Failed to load webhook display', { error: error.message });
  }
}

/**
 * Load webhook to edit form
 */
async function loadWebhookToEdit() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getWebhookURL' });
    const url = response && response.url ? response.url : 'https://n8n.quentinveys.be/webhook/grindr-stats';

    const webhookURLInput = document.getElementById('webhookURL');
    if (webhookURLInput) {
      webhookURLInput.value = url;
    }
  } catch (error) {
    logger('error', 'loadWebhookToEdit', 'Failed to load webhook to edit', { error: error.message });
  }
}

/**
 * Save min delay
 */
async function saveMinDelay() {
  const minDelayHoursInput = document.getElementById('minDelayHours');
  if (!minDelayHoursInput) return;

  const hours = parseFloat(minDelayHoursInput.value);

  // Validate hours >= 0
  if (isNaN(hours) || hours < 0) {
    showStatus('Hours must be >= 0', 'error');
    return;
  }

  try {
    await chrome.storage.local.set({ minDelayHours: hours });
    showStatus('Min delay saved', 'success');
    if (editModeManagers && editModeManagers.minDelay) {
      editModeManagers.minDelay.exitEditMode();
    }
    await loadMinDelayDisplay();
  } catch (error) {
    logger('error', 'saveMinDelay', 'Failed to save min delay', { error: error.message });
    showStatus('Failed to save min delay', 'error');
  }
}

/**
 * Save auto-start
 */
async function saveAutoStart() {
  const autoStartCheckbox = document.getElementById('autoStart');
  if (!autoStartCheckbox) return;

  const autoStart = autoStartCheckbox.checked;

  try {
    await chrome.storage.local.set({ autoStart: autoStart });
    // No status message for auto-start (direct save)
  } catch (error) {
    logger('error', 'saveAutoStart', 'Failed to save auto-start', { error: error.message });
  }
}

/**
 * Load min delay display
 */
async function loadMinDelayDisplay() {
  try {
    const result = await chrome.storage.local.get(['minDelayHours']);
    const hours = result.minDelayHours !== undefined ? result.minDelayHours : 12;

    const minDelayDisplay = document.getElementById('minDelayDisplay');
    if (minDelayDisplay) {
      minDelayDisplay.textContent = `${hours}h`;
    }
  } catch (error) {
    logger('error', 'loadMinDelayDisplay', 'Failed to load min delay display', { error: error.message });
  }
}

/**
 * Load min delay to edit form
 */
async function loadMinDelayToEdit() {
  try {
    const result = await chrome.storage.local.get(['minDelayHours']);
    const hours = result.minDelayHours !== undefined ? result.minDelayHours : 12;

    const minDelayHoursInput = document.getElementById('minDelayHours');
    if (minDelayHoursInput) {
      minDelayHoursInput.value = hours;
    }
  } catch (error) {
    logger('error', 'loadMinDelayToEdit', 'Failed to load min delay to edit', { error: error.message });
  }
}

/**
 * Load auto-start
 */
async function loadAutoStart() {
  try {
    const result = await chrome.storage.local.get(['autoStart']);
    const autoStart = result.autoStart !== undefined ? result.autoStart : true;

    const autoStartCheckbox = document.getElementById('autoStart');
    if (autoStartCheckbox) {
      autoStartCheckbox.checked = autoStart;
      autoStartCheckbox.addEventListener('change', saveAutoStart);
    }
  } catch (error) {
    logger('error', 'loadAutoStart', 'Failed to load auto-start', { error: error.message });
  }
}

/**
 * Format timestamp
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Escape HTML
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Load logs
 */
async function loadLogs() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getLogs' });
    const logs = response && response.logs ? response.logs : [];

    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) return;

    // Clear container
    logsContainer.innerHTML = '';

    // Sort logs by timestamp (oldest first)
    const sortedLogs = [...logs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    sortedLogs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry log-${log.level || 'info'}`;

      const timestamp = formatTimestamp(log.timestamp || Date.now());
      const location = escapeHtml(log.location || 'unknown');
      const message = escapeHtml(log.message || '');

      // Use textContent for security (avoid innerHTML)
      const timestampEl = document.createElement('span');
      timestampEl.className = 'log-timestamp';
      timestampEl.textContent = `[${timestamp}] `;

      const locationEl = document.createElement('span');
      locationEl.className = 'log-location';
      locationEl.textContent = `[${location}] `;

      const messageEl = document.createElement('span');
      messageEl.className = 'log-message';
      messageEl.textContent = message;

      logEntry.appendChild(timestampEl);
      logEntry.appendChild(locationEl);
      logEntry.appendChild(messageEl);

      // Show log data as JSON if present
      if (log.data) {
        const dataEl = document.createElement('pre');
        dataEl.className = 'log-data';
        dataEl.textContent = JSON.stringify(log.data, null, 2);
        logEntry.appendChild(dataEl);
      }

      logsContainer.appendChild(logEntry);
    });

    // Auto-scroll to bottom
    scrollLogsToBottom();
  } catch (error) {
    logger('error', 'loadLogs', 'Failed to load logs', { error: error.message });
  }
}

/**
 * Scroll logs container to bottom
 */
function scrollLogsToBottom() {
  const logsContainer = document.getElementById('logsContainer');
  if (logsContainer) {
    requestAnimationFrame(() => {
      logsContainer.scrollTop = logsContainer.scrollHeight;
    });
  }
}

/**
 * Clear logs
 */
async function clearLogs() {
  const confirmed = await showConfirm(
    'Clear Logs',
    'Are you sure you want to clear all logs?'
  );

  if (!confirmed) return;

  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearLogs' });
    if (response && response.success) {
      await loadLogs();
      showStatus('Logs cleared', 'success');
    } else {
      showStatus('Failed to clear logs', 'error');
    }
  } catch (error) {
    logger('error', 'clearLogs', 'Failed to clear logs', { error: error.message });
    showStatus('Failed to clear logs', 'error');
  }
}

// Setup clear logs button
document.addEventListener('DOMContentLoaded', () => {
  const clearLogsButton = document.getElementById('clearLogsButton');
  if (clearLogsButton) {
    clearLogsButton.addEventListener('click', clearLogs);
  }

  // Real-time logs updates via chrome.storage.onChanged
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.extensionLogs && activeTab === 'logs') {
      loadLogs();
    }
  });
});

/**
 * Show status message
 * @param {string} message - Status message
 * @param {string} type - Status type (success, error, info)
 */
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';

  // Auto-hide after timeout
  const timeouts = {
    success: 3000,
    error: 5000,
    info: 4000
  };
  const timeout = timeouts[type] || 4000;

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, timeout);
}

/**
 * Show confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @returns {Promise<boolean>} True if confirmed, false otherwise
 */
async function showConfirm(title, message) {
  return new Promise((resolve) => {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');

    if (!modalOverlay || !modalTitle || !modalMessage || !modalCancel || !modalConfirm) {
      resolve(false);
      return;
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalOverlay.classList.add('show');

    const cleanup = () => {
      modalOverlay.classList.remove('show');
      modalCancel.removeEventListener('click', onCancel);
      modalConfirm.removeEventListener('click', onConfirm);
      modalOverlay.removeEventListener('click', onOverlayClick);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onOverlayClick = (e) => {
      if (e.target === modalOverlay) {
        cleanup();
        resolve(false);
      }
    };

    modalCancel.addEventListener('click', onCancel);
    modalConfirm.addEventListener('click', onConfirm);
    modalOverlay.addEventListener('click', onOverlayClick);
  });
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
 * Handle login method change
 */
function handleLoginMethodChange() {
  const loginMethod = document.getElementById('loginMethod');
  const authEmailEdit = document.getElementById('authEmailEdit');
  const authPasswordEdit = document.getElementById('authPasswordEdit');
  const authEmailDisplay = document.getElementById('authEmailDisplay');

  if (!loginMethod) return;

  const method = loginMethod.value;
  const showEmailFields = method === 'email';

  if (authEmailEdit) {
    authEmailEdit.style.display = showEmailFields ? 'flex' : 'none';
  }
  if (authPasswordEdit) {
    authPasswordEdit.style.display = showEmailFields ? 'flex' : 'none';
  }
  if (authEmailDisplay) {
    authEmailDisplay.style.display = showEmailFields ? 'block' : 'none';
  }
}

/**
 * Save credentials
 */
async function saveCredentials() {
  const loginMethod = document.getElementById('loginMethod');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const autoLoginCheckbox = document.getElementById('autoLogin');

  if (!loginMethod) return;

  const method = loginMethod.value;
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const autoLogin = autoLoginCheckbox ? autoLoginCheckbox.checked : false;

  // Validate email and password for email method
  if (method === 'email') {
    if (!email) {
      showStatus('Email is required', 'error');
      return;
    }
    if (!password) {
      showStatus('Password is required', 'error');
      return;
    }
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'saveCredentials',
      loginMethod: method,
      email: method === 'email' ? email : null,
      password: method === 'email' ? password : null,
      autoLogin: autoLogin
    });

    if (response && response.success) {
      showStatus('Credentials saved', 'success');
      if (editModeManagers && editModeManagers.auth) {
        editModeManagers.auth.exitEditMode();
      }
      await loadAuthDisplay();
    } else {
      showStatus('Failed to save credentials', 'error');
    }
  } catch (error) {
    logger('error', 'saveCredentials', 'Failed to save credentials', { error: error.message });
    showStatus('Failed to save credentials', 'error');
  }
}

/**
 * Delete credentials
 */
async function deleteCredentials() {
  const confirmed = await showConfirm(
    'Delete Credentials',
    'Are you sure you want to delete your saved credentials?'
  );

  if (!confirmed) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteCredentials'
    });

    if (response && response.success) {
      showStatus('Credentials deleted', 'success');
      // Clear form fields
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const loginMethod = document.getElementById('loginMethod');
      const autoLoginCheckbox = document.getElementById('autoLogin');

      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
      if (loginMethod) loginMethod.value = 'email';
      if (autoLoginCheckbox) autoLoginCheckbox.checked = false;

      await loadAuthDisplay();
    } else {
      showStatus('Failed to delete credentials', 'error');
    }
  } catch (error) {
    logger('error', 'deleteCredentials', 'Failed to delete credentials', { error: error.message });
    showStatus('Failed to delete credentials', 'error');
  }
}

/**
 * Load authentication display
 */
async function loadAuthDisplay() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getCredentials' });
    if (response) {
      const method = response.loginMethod || 'email';
      const methodNames = {
        email: 'Email',
        facebook: 'Facebook',
        google: 'Google',
        apple: 'Apple'
      };

      const authMethodDisplay = document.getElementById('authMethodDisplay');
      const authEmailValue = document.getElementById('authEmailValue');
      const authEmailDisplay = document.getElementById('authEmailDisplay');
      const autoLoginDisplay = document.getElementById('autoLoginDisplay');

      if (authMethodDisplay) {
        authMethodDisplay.textContent = methodNames[method] || method;
      }

      if (method === 'email' && response.email) {
        if (authEmailValue) {
          authEmailValue.textContent = response.email;
        }
        if (authEmailDisplay) {
          authEmailDisplay.style.display = 'block';
        }
      } else {
        if (authEmailDisplay) {
          authEmailDisplay.style.display = 'none';
        }
      }

      if (autoLoginDisplay) {
        autoLoginDisplay.checked = response.autoLogin !== false;
      }
    }
  } catch (error) {
    logger('error', 'loadAuthDisplay', 'Failed to load auth display', { error: error.message });
  }
}

/**
 * Load authentication to edit form
 */
async function loadAuthToEdit() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getCredentials' });
    if (response) {
      const loginMethod = document.getElementById('loginMethod');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const autoLoginCheckbox = document.getElementById('autoLogin');

      if (loginMethod) {
        loginMethod.value = response.loginMethod || 'email';
        handleLoginMethodChange();
      }
      if (emailInput) {
        emailInput.value = response.email || '';
      }
      if (passwordInput) {
        passwordInput.value = response.password || '';
      }
      if (autoLoginCheckbox) {
        autoLoginCheckbox.checked = response.autoLogin !== false;
      }
    }
  } catch (error) {
    logger('error', 'loadAuthToEdit', 'Failed to load auth to edit', { error: error.message });
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
