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

// Détecter les onglets web.grindr.com et injecter automatiquement
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('web.grindr.com')) {
    // Injecter le content script si ce n'est pas déjà fait
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      // Ignorer les erreurs si le script est déjà injecté
      logger('debug', 'Background', 'Script déjà injecté ou erreur: ' + (err?.message || String(err)));
    });
  }

  // Détecter les onglets Apple qui s'ouvrent pour la connexion
  if (changeInfo.status === 'complete' && tab.url && (
    tab.url.includes('apple.com') ||
    tab.url.includes('appleid.apple.com') ||
    tab.url.includes('idmsa.apple.com') ||
    tab.url.includes('signinwithapple')
  )) {
    logger('info', 'Background', '🔍 Onglet Apple détecté: ' + tab.url);
    // Notifier le content script de la page Grindr qu'un onglet Apple a été détecté
    chrome.tabs.query({ url: '*://web.grindr.com/*' }, (grindrTabs) => {
      if (grindrTabs.length > 0) {
        chrome.tabs.sendMessage(grindrTabs[0].id, {
          action: 'applePopupDetected',
          appleTabId: tabId,
          appleTabUrl: tab.url
        }).catch(err => {
          logger('warn', 'Background', 'Impossible d\'envoyer le message au content script: ' + (err?.message || String(err)));
        });
      }
    });
  }
});

// Écouter les messages du content script
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