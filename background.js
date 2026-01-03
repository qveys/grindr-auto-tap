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