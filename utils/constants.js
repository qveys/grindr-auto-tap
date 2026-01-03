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
};