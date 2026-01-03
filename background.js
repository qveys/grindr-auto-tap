// Background script pour gérer les onglets, les requêtes n8n et le storage

// Logger function pour le background script
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Background',
    message: message,
    data: data
  };

  // Log to console as well
  const consoleMethod = level === 'error' ? console.error :
    level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
        console.log;
  consoleMethod(`[${location}] ${message}`, data || '');

  // Store directly in chrome.storage.local
  chrome.storage.local.get(['extensionLogs'], (result) => {
    const logs = result.extensionLogs || [];
    logs.push(logEntry);
    // Garder seulement les 1000 derniers logs
    if (logs.length > 1000) {
      logs.shift();
    }
    chrome.storage.local.set({ extensionLogs: logs });
  });
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addLog') {
    addLog(request.logEntry);
    sendResponse({ success: true });
  } else if (request.action === 'getLogs') {
    sendResponse({ logs: logs });
  } else if (request.action === 'clearLogs') {
    clearLogs();
    sendResponse({ success: true });
  }
});

/**
 * Add a log entry to the logs array
 * @param {Object} logEntry - Log entry object
 */
function addLog(logEntry) {
  logs.push(logEntry);

  // Keep logs size manageable
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }

  // Also save to chrome storage for persistence
  chrome.storage.local.set({ logs: logs }).catch(err => {
    console.error('Failed to save logs to storage:', err);
  });
}

/**
 * Clear all logs
 */
function clearLogs() {
  logs = [];
  chrome.storage.local.set({ logs: [] }).catch(err => {
    console.error('Failed to clear logs from storage:', err);
  });
}

/**
 * Load logs from storage on startup
 */
chrome.storage.local.get(['logs'], (result) => {
  if (result.logs) {
    logs = result.logs;
    console.log(`Loaded ${logs.length} logs from storage`);
  }
});