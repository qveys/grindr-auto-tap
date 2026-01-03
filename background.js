/**
 * Background Service Worker for Grindr Auto Tap extension
 * Manages logs storage and messaging from content scripts
 */

// Storage for logs
let logs = [];
const MAX_LOGS = 1000;

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