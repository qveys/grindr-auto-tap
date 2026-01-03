/**
 * Popup Script for Grindr Auto Tap extension
 * Handles UI interactions and settings management
 */

// Get DOM elements
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const saveButton = document.getElementById('saveButton');
const clearLogsButton = document.getElementById('clearLogsButton');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const logsContainer = document.getElementById('logsContainer');

// Settings elements
const loginMethodSelect = document.getElementById('loginMethod');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const autoLoginCheckbox = document.getElementById('autoLogin');
const webhookURLInput = document.getElementById('webhookURL');

// Stats elements
const totalTapsSpan = document.getElementById('totalTaps');
const durationSpan = document.getElementById('duration');

let isRunning = false;
let logsPoller = null;

/**
 * Initialize popup when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  updateUI();
  pollLogs();
});

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      'loginMethod',
      'grindrEmail',
      'grindrPassword',
      'autoLogin',
      'n8nWebhookURL'
    ]);

    if (result.loginMethod) loginMethodSelect.value = result.loginMethod;
    if (result.grindrEmail) emailInput.value = result.grindrEmail;
    if (result.grindrPassword) passwordInput.value = result.grindrPassword;
    if (result.autoLogin !== undefined) autoLoginCheckbox.checked = result.autoLogin;
    if (result.n8nWebhookURL) webhookURLInput.value = result.n8nWebhookURL;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      loginMethod: loginMethodSelect.value,
      grindrEmail: emailInput.value,
      grindrPassword: passwordInput.value,
      autoLogin: autoLoginCheckbox.checked,
      n8nWebhookURL: webhookURLInput.value
    };

    await chrome.storage.local.set(settings);
    showNotification('Settings saved successfully', 'success');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showNotification('Failed to save settings', 'error');
  }
}

/**
 * Update UI state based on running status
 */
function updateUI() {
  startButton.disabled = isRunning;
  stopButton.disabled = !isRunning;

  if (isRunning) {
    statusIndicator.classList.add('active');
    statusText.textContent = 'Running';
  } else {
    statusIndicator.classList.remove('active');
    statusText.textContent = 'Ready';
  }
}

/**
 * Start auto-tap
 */
async function handleStartClick() {
  try {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab[0]) {
      showNotification('No active tab found', 'error');
      return;
    }

    isRunning = true;
    updateUI();

    chrome.tabs.sendMessage(tab[0].id, { action: 'startAutoTap' }).catch(err => {
      console.error('Failed to start auto-tap:', err);
      isRunning = false;
      updateUI();
      showNotification('Failed to start auto-tap', 'error');
    });
  } catch (error) {
    console.error('Failed to start:', error);
    showNotification('Failed to start auto-tap', 'error');
  }
}

/**
 * Stop auto-tap
 */
async function handleStopClick() {
  try {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab[0]) {
      showNotification('No active tab found', 'error');
      return;
    }

    isRunning = false;
    updateUI();

    chrome.tabs.sendMessage(tab[0].id, { action: 'stopAutoTap' }).catch(err => {
      console.error('Failed to stop auto-tap:', err);
      showNotification('Failed to stop auto-tap', 'error');
    });
  } catch (error) {
    console.error('Failed to stop:', error);
    showNotification('Failed to stop auto-tap', 'error');
  }
}

/**
 * Poll for logs periodically
 */
function pollLogs() {
  const pollFn = async () => {
    try {
      chrome.runtime.sendMessage({ action: 'getLogs' }, (response) => {
        if (response && response.logs) {
          displayLogs(response.logs);
        }
      });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  // Poll every 500ms
  logsPoller = setInterval(pollFn, 500);
  pollFn(); // Call immediately
}