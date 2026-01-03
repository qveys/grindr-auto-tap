/**
 * Content script for Grindr Auto Tap extension
 * Handles authentication, profile opening, and auto-tap functionality
 */

// ============================================================================
// UTILITIES
// ============================================================================

// Logger function
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'unknown',
    message: message,
    data: data
  };

  // Log to console as well
  const consoleMethod = level === 'error' ? console.error :
    level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
        console.log;
  consoleMethod(`[${location}] ${message}`, data || '');

  // Send to background script to store
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'addLog',
      logEntry: logEntry
    }).catch(err => {
      // Silently fail if background script is not available
    });
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}min ${seconds}s`;
  }
  return `${seconds}s`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTextNodes(root) {
  const result = [];

  function walk(node) {
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const txt = child.textContent.trim();
        if (txt) result.push(txt);
      } else {
        walk(child);
      }
    });
  }

  walk(root);
  return result; // tableau de strings
}

// Constants
const DELAYS = {
  SHORT: 50,
  MEDIUM: 100,
  NORMAL: 200,
  LONG: 300,
  VERY_LONG: 500,
  SECOND: 1000,
  TWO_SECONDS: 2000,
  TWO_AND_HALF_SECONDS: 2500,
  THREE_SECONDS: 3000,
  RANDOM_MIN: 50,
  RANDOM_MAX: 50,
};

const TIMEOUTS = {
  LOGIN: 10000,
  APPLE_LOGIN: 15000,
  APPLE_POPUP: 15000,
  APPLE_POPUP_CLOSE: 15000,
  WEBHOOK_REQUEST: 10000,
  BUTTON_WAIT: 10000,
  APPLE_BUTTON_RETRY: 2000,
  APPLE_TAB_CHECK: 1000,
};

const LIMITS = {
  MAX_ITERATIONS: 10000,
  MAX_DURATION_HOURS: 2,
  MAX_DURATION_MS: 2 * 60 * 60 * 1000,
  MAX_DEBUG_LOGS: 1000,
  MAX_RETRIES: 8,
  DEFAULT_RETRIES: 2,
  MAX_APPLE_BUTTON_RETRIES: 8,
};

const DEFAULTS = {
  MIN_DELAY_HOURS: 12,
  AUTO_LOGIN: true,
  AUTO_START: true,
  LOGIN_METHOD: 'email',
};

const SELECTORS = {
  EMAIL_INPUT: 'input[type="email"], input[type="text"][name*="email" i], input[type="text"][placeholder*="email" i], input[type="text"][id*="email" i]',
  PASSWORD_INPUT: 'input[type="password"], input[name*="password" i], input[id*="password" i]',
  LOGIN_BUTTON: 'button[type="submit"], form button, button.btn-primary, button.primary',
  CAPTCHA: '[data-captcha], iframe[src*="recaptcha"], .g-recaptcha',
  NEXT_PROFILE: 'img[alt="Next Profile"]',
  TAP_BUTTON: 'button[aria-label="Tap"]',
  PROFILE_GRIDCELL: 'div[role="gridcell"]',
  BETA_DISMISS: '#beta-dismiss-btn',
  PROFILE_INDICATORS: 'img[alt="Next Profile"], button[aria-label="Tap"], [data-testid*="profile"], nav, header',
  PROFILE_VIEW: '[data-testid*="profile-view"], [class*="profile-view"], [class*="ProfileView"]',
  FACEBOOK_BUTTON: 'button[title="Log In With Facebook"], button[title*="Facebook" i], button[aria-label*="Facebook" i], button[data-provider="facebook"]',
  GOOGLE_BUTTON: 'button[title="Log In With Google"], button[title*="Google" i], button[aria-label*="Google" i], button[data-provider="google"]',
  APPLE_BUTTON: 'button[title="Log In With Apple"], button[title*="Apple" i], button[aria-label*="Apple" i], button[data-provider="apple"]',
  ERROR_MESSAGE: '.error, .alert-error, [role="alert"]',
};

const APPLE = {
  SIGN_IN_BUTTON_ID: 'sign-in',
  BUTTON_CLASSES: 'button.signin-v2__buttons-wrapper__button-wrapper__button, button.button-rounded-rectangle',
  POPUP_CHECK_INTERVAL: 1000,
};

const URLS = {
  DEFAULT_WEBHOOK: 'https://n8n.quentinveys.be/webhook/grindr-stats',
  GRINDR_DOMAIN: 'web.grindr.com',
  APPLE_DOMAINS: ['apple.com', 'appleid.apple.com', 'idmsa.apple.com', 'signinwithapple'],
};
