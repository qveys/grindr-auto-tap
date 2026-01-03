// Constants for the Grindr Auto Tap extension
// Exported as global object for use in content scripts

window.Constants = {
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

  // DOM Selectors
  SELECTORS: {
    // Login
    EMAIL_INPUT: 'input[type="email"], input[type="text"][name*="email" i], input[type="text"][placeholder*="email" i], input[type="text"][id*="email" i]',
    PASSWORD_INPUT: 'input[type="password"], input[name*="password" i], input[id*="password" i]',
    LOGIN_BUTTON: 'button[type="submit"], form button, button.btn-primary, button.primary',
    CAPTCHA: '[data-captcha], iframe[src*="recaptcha"], .g-recaptcha',

    // Profile
    NEXT_PROFILE: 'img[alt="Next Profile"]',
    TAP_BUTTON: 'button[aria-label="Tap"]',
    PROFILE_GRIDCELL: 'div[role="gridcell"]',
    BETA_DISMISS: '#beta-dismiss-btn',

    // Login status
    PROFILE_INDICATORS: 'img[alt="Next Profile"], button[aria-label="Tap"], [data-testid*="profile"], nav, header',
    PROFILE_VIEW: '[data-testid*="profile-view"], [class*="profile-view"], [class*="ProfileView"]',

    // Social login buttons
    FACEBOOK_BUTTON: 'button[title="Log In With Facebook"], button[title*="Facebook" i], button[aria-label*="Facebook" i], button[data-provider="facebook"]',
    GOOGLE_BUTTON: 'button[title="Log In With Google"], button[title*="Google" i], button[aria-label*="Google" i], button[data-provider="google"]',
    APPLE_BUTTON: 'button[title="Log In With Apple"], button[title*="Apple" i], button[aria-label*="Apple" i], button[data-provider="apple"]',

    // Error messages
    ERROR_MESSAGE: '.error, .alert-error, [role="alert"]',
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

// Export individual constants for easier access
const { DELAYS, TIMEOUTS, LIMITS, DEFAULTS, URLS, SELECTORS, STATUS_TIMEOUTS, APPLE } = window.Constants;
window.DELAYS = DELAYS;
window.TIMEOUTS = TIMEOUTS;
window.LIMITS = LIMITS;
window.DEFAULTS = DEFAULTS;
window.URLS = URLS;
window.SELECTORS = SELECTORS;
window.STATUS_TIMEOUTS = STATUS_TIMEOUTS;
window.APPLE = APPLE;

// ES6 exports for module imports
export { DELAYS, TIMEOUTS, LIMITS, DEFAULTS, URLS, SELECTORS, STATUS_TIMEOUTS, APPLE };