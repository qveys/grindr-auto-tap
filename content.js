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