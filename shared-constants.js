/**
 * @fileoverview Shared constants for Grindr Auto Tap extension
 * Centralized configuration for delays, timeouts, limits, selectors, and URLs.
 * Compatible with both service workers (background/background.js) and content scripts.
 *
 * All timing values are in milliseconds unless otherwise specified.
 * Constants are exported to window/self scope for easy access across modules.
 */

/**
 * @typedef {Object} SharedConstants
 * @property {Object} DELAYS - Timing delays for various operations
 * @property {Object} TIMEOUTS - Maximum wait times for operations
 * @property {Object} LIMITS - Safety limits (iterations, duration, retries)
 * @property {Object} LOGGING - Logging configuration
 * @property {Object} DEFAULTS - Default values for configuration
 * @property {Object} URLS - URLs and domains
 * @property {Object} SELECTORS - DOM selectors organized by functional domain
 * @property {Object} STATUS_TIMEOUTS - Status message display durations
 * @property {Object} APPLE - Apple login specific configuration
 */
const SharedConstants = {
  // Delays (in milliseconds)
  DELAYS: {
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
  },

  // Timeouts (in milliseconds)
  TIMEOUTS: {
    LOGIN: 10000,
    APPLE_LOGIN: 15000,
    APPLE_POPUP: 15000,
    APPLE_POPUP_CLOSE: 15000,
    WEBHOOK_REQUEST: 10000,
    BUTTON_WAIT: 10000,
    APPLE_BUTTON_RETRY: 2000,
    APPLE_TAB_CHECK: 1000,
  },

  // Limits
  LIMITS: {
    MAX_ITERATIONS: 10000,
    MAX_DURATION_HOURS: 2,
    MAX_DURATION_MS: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
    MAX_DEBUG_LOGS: 1000,
    MAX_RETRIES: 8,
    DEFAULT_RETRIES: 2,
    MAX_APPLE_BUTTON_RETRIES: 8,
  },

  // Logging configuration
  LOGGING: {
    MAX_LOGS: 1000, // Maximum number of logs to keep in storage
    MAX_VISIBLE_LOGS: 50, // Maximum number of logs to display in popup
    STATUS_CHECK_INTERVAL: 2000, // Interval for checking script status (in ms)
  },

  // Default values
  DEFAULTS: {
    MIN_DELAY_HOURS: 12,
    AUTO_LOGIN: true,
    AUTO_START: true,
    LOGIN_METHOD: 'email',
  },

  // URLs
  URLS: {
    DEFAULT_WEBHOOK: 'https://n8n.quentinveys.be/webhook/grindr-stats',
    GRINDR_DOMAIN: 'web.grindr.com',
    APPLE_DOMAINS: [
      'apple.com',
      'appleid.apple.com',
      'idmsa.apple.com',
      'signinwithapple',
    ],
  },

  // DOM Selectors - Organized by functional domain
  SELECTORS: {
    // Authentication selectors
    AUTH: {
      EMAIL_INPUT: 'input[type="email"], input[type="text"][name*="email" i], input[type="text"][placeholder*="email" i], input[type="text"][id*="email" i]',
      PASSWORD_INPUT: 'input[type="password"], input[name*="password" i], input[id*="password" i]',
      LOGIN_BUTTON: 'button[type="submit"], form button, button.btn-primary, button.primary',
      CAPTCHA: '[data-captcha], iframe[src*="recaptcha"], .g-recaptcha',
      FACEBOOK_BUTTON: 'button[title="Log In With Facebook"], button[title*="Facebook" i], button[aria-label*="Facebook" i], button[data-provider="facebook"]',
      GOOGLE_BUTTON: 'button[title="Log In With Google"], button[title*="Google" i], button[aria-label*="Google" i], button[data-provider="google"]',
      APPLE_BUTTON: 'button[title="Log In With Apple"], button[title*="Apple" i], button[aria-label*="Apple" i], button[data-provider="apple"]',
      ERROR_MESSAGE: '.error, .alert-error, [role="alert"]',
    },

    // Profile interaction selectors
    PROFILE: {
      NEXT_PROFILE: 'img[alt="Next Profile"]',
      TAP_BUTTON: 'button[aria-label="Tap"]',
      GRIDCELL: 'div[role="gridcell"]',
      BETA_DISMISS: '#beta-dismiss-btn',
      INDICATORS: 'img[alt="Next Profile"], button[aria-label="Tap"], [data-testid*="profile"], nav, header',
      VIEW: '[data-testid*="profile-view"], [class*="profile-view"], [class*="ProfileView"]',
      CASCADE_CELL_IMG: '[data-testid="cascadeCellContainer"] img',
      USER_AVATAR_IMG: '[data-testid="userAvatar"] img',
      CLOSE_CHAT_BUTTON: '[aria-label="close chat"]',
    },
  },

  // Status message timeouts (in milliseconds)
  STATUS_TIMEOUTS: {
    SUCCESS: 3000,
    ERROR: 5000,
    INFO: 4000,
  },

  // Apple login specific
  APPLE: {
    SIGN_IN_BUTTON_ID: 'sign-in',
    BUTTON_CLASSES: 'button.signin-v2__buttons-wrapper__button-wrapper__button, button.button-rounded-rectangle',
    POPUP_CHECK_INTERVAL: 1000,
  },
};

// Export for service workers (background/background.js)
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  // Service worker context
  self.Constants = SharedConstants;
  const { DELAYS, TIMEOUTS, LIMITS, LOGGING, DEFAULTS, URLS, SELECTORS, STATUS_TIMEOUTS, APPLE } = SharedConstants;
  self.DELAYS = DELAYS;
  self.TIMEOUTS = TIMEOUTS;
  self.LIMITS = LIMITS;
  self.LOGGING = LOGGING;
  self.DEFAULTS = DEFAULTS;
  self.URLS = URLS;
  self.SELECTORS = SELECTORS;
  self.STATUS_TIMEOUTS = STATUS_TIMEOUTS;
  self.APPLE = APPLE;
}

// Export for content scripts (via window)
if (typeof window !== 'undefined') {
  window.Constants = SharedConstants;
  const { DELAYS, TIMEOUTS, LIMITS, LOGGING, DEFAULTS, URLS, SELECTORS, STATUS_TIMEOUTS, APPLE } = SharedConstants;
  window.DELAYS = DELAYS;
  window.TIMEOUTS = TIMEOUTS;
  window.LIMITS = LIMITS;
  window.LOGGING = LOGGING;
  window.DEFAULTS = DEFAULTS;
  window.URLS = URLS;
  window.SELECTORS = SELECTORS;
  window.STATUS_TIMEOUTS = STATUS_TIMEOUTS;
  window.APPLE = APPLE;
}

// Export for popup.js (HTML context)
if (typeof document !== 'undefined' && typeof chrome !== 'undefined') {
  if (typeof window !== 'undefined') {
    window.Constants = SharedConstants;
  }
}
