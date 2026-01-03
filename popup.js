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