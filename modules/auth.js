/**
 * Authentication module for Grindr Auto Tap extension
 * Handles login via email, Facebook, Google, and Apple
 *
 * Note: This file is loaded as a global script, not as an ES module
 * Functions are attached to window.AuthModule
 */

// Dependencies will be loaded via script tags in manifest.json

// Extract constants from window for easier access
const { SELECTORS, DELAYS, TIMEOUTS, LIMITS, URLS, APPLE } = window.Constants || {};

// Utility function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Logger function for auth module
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Auth',
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
      console.error('Failed to send log to background:', err);
    });
  }
}

/**
 * Check if user is currently logged in
 * @returns {boolean} True if logged in, false otherwise
 */
function checkLoginStatus() {
  const loginPage = document.querySelector(SELECTORS.EMAIL_INPUT);
  if (loginPage) {
    return false;
  }

  const profileElements = document.querySelector(SELECTORS.PROFILE_INDICATORS);
  if (profileElements) {
    return true;
  }

  return !(window.location.pathname.includes('/login') || window.location.pathname.includes('/signin'));
}

/**
 * Fill email and password fields with human-like delays
 * @param {string} email - Email address to fill
 * @param {string} password - Password to fill
 * @returns {Promise<Object>} Object with emailField and passwordField references
 */
async function fillLoginForm(email, password) {
  const emailField = document.querySelector(SELECTORS.EMAIL_INPUT);
  const passwordField = document.querySelector(SELECTORS.PASSWORD_INPUT);

  if (!emailField || !passwordField) {
    logger('error', 'fillLoginForm', 'Email or password field not found');
    throw new Error('Login form fields not found');
  }

  // Fill email field with human-like typing
  emailField.focus();
  emailField.value = '';
  for (const char of email) {
    emailField.value += char;
    emailField.dispatchEvent(new Event('input', { bubbles: true }));
    emailField.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(DELAYS.SHORT);
  }

  await delay(DELAYS.NORMAL);

  // Fill password field with human-like typing
  passwordField.focus();
  passwordField.value = '';
  for (const char of password) {
    passwordField.value += char;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(DELAYS.SHORT);
  }

  logger('info', 'fillLoginForm', 'Login form filled successfully');
  return { emailField, passwordField };
}

/**
 * Click the login button to submit credentials
 * @returns {Promise<void>}
 */
async function clickLoginButton() {
  const loginButton = document.querySelector(SELECTORS.LOGIN_BUTTON);

  if (!loginButton) {
    logger('error', 'clickLoginButton', 'Login button not found');
    throw new Error('Login button not found');
  }

  await delay(DELAYS.NORMAL);
  loginButton.click();
  logger('info', 'clickLoginButton', 'Login button clicked');
}

/**
 * Wait for login to complete
 * @returns {Promise<void>}
 */
async function waitForLogin() {
  const startTime = Date.now();
  const timeout = TIMEOUTS.LOGIN;

  while (Date.now() - startTime < timeout) {
    // Check if login form is gone (indicating successful login)
    const loginForm = document.querySelector(SELECTORS.EMAIL_INPUT);
    if (!loginForm) {
      logger('info', 'waitForLogin', 'Login completed, form is gone');
      await delay(DELAYS.SECOND);
      return;
    }

    // Check if profile indicators exist (indicating successful login)
    const profileElements = document.querySelector(SELECTORS.PROFILE_INDICATORS);
    if (profileElements) {
      logger('info', 'waitForLogin', 'Login completed, profile elements found');
      return;
    }

    // Check for error messages
    const errorElement = document.querySelector(SELECTORS.ERROR_MESSAGE);
    if (errorElement && errorElement.textContent) {
      const errorMessage = errorElement.textContent.trim();
      logger('error', 'waitForLogin', 'Login failed with error', { error: errorMessage });
      throw new Error(`Login failed: ${errorMessage}`);
    }

    await delay(DELAYS.MEDIUM);
  }

  logger('error', 'waitForLogin', 'Login timeout exceeded');
  throw new Error('Login timeout');
}

/**
 * Perform email login flow
 * @param {string} email - Email address
 * @param {string} password - Password
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function performEmailLogin(email, password) {
  try {
    logger('info', 'performEmailLogin', 'Starting email login flow');

    await fillLoginForm(email, password);
    await clickLoginButton();
    await waitForLogin();

    logger('info', 'performEmailLogin', 'Email login completed successfully');
    return true;
  } catch (error) {
    logger('error', 'performEmailLogin', 'Email login failed', { error: error.message });
    return false;
  }
}

/**
 * Perform Facebook login flow
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function performFacebookLogin() {
  try {
    logger('info', 'performFacebookLogin', 'Starting Facebook login flow');

    const facebookButton = document.querySelector(SELECTORS.FACEBOOK_BUTTON);
    if (!facebookButton) {
      logger('error', 'performFacebookLogin', 'Facebook button not found');
      return false;
    }

    await delay(DELAYS.NORMAL);
    facebookButton.click();
    logger('info', 'performFacebookLogin', 'Facebook button clicked, waiting for popup');

    await waitForLogin();

    logger('info', 'performFacebookLogin', 'Facebook login completed successfully');
    return true;
  } catch (error) {
    logger('error', 'performFacebookLogin', 'Facebook login failed', { error: error.message });
    return false;
  }
}

/**
 * Perform Google login flow
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function performGoogleLogin() {
  try {
    logger('info', 'performGoogleLogin', 'Starting Google login flow');

    const googleButton = document.querySelector(SELECTORS.GOOGLE_BUTTON);
    if (!googleButton) {
      logger('error', 'performGoogleLogin', 'Google button not found');
      return false;
    }

    await delay(DELAYS.NORMAL);
    googleButton.click();
    logger('info', 'performGoogleLogin', 'Google button clicked, waiting for popup');

    await waitForLogin();

    logger('info', 'performGoogleLogin', 'Google login completed successfully');
    return true;
  } catch (error) {
    logger('error', 'performGoogleLogin', 'Google login failed', { error: error.message });
    return false;
  }
}

/**
 * Wait for Apple popup window to open
 * @returns {Promise<Window>} Reference to popup window
 */
async function waitForApplePopupWindow() {
  const startTime = Date.now();
  const timeout = TIMEOUTS.APPLE_POPUP;
  let popupWindow = null;

  const originalWindowOpen = window.open;
  let windowOpenCalled = false;

  // Override window.open to capture popup
  window.open = function(...args) {
    windowOpenCalled = true;
    popupWindow = originalWindowOpen.apply(window, args);
    logger('info', 'waitForApplePopupWindow', 'Popup window opened');
    return popupWindow;
  };

  while (Date.now() - startTime < timeout) {
    if (windowOpenCalled && popupWindow) {
      window.open = originalWindowOpen;
      return popupWindow;
    }
    await delay(DELAYS.MEDIUM);
  }

  window.open = originalWindowOpen;
  logger('error', 'waitForApplePopupWindow', 'Apple popup timeout');
  throw new Error('Apple popup window did not open');
}

/**
 * Click the Apple sign-in button in the popup window
 * @param {Window} popupWindow - Reference to popup window
 * @returns {Promise<void>}
 */
async function clickAppleButtonInTab(popupWindow) {
  try {
    const startTime = Date.now();
    const timeout = TIMEOUTS.APPLE_POPUP;

    while (Date.now() - startTime < timeout) {
      try {
        const signInButton = popupWindow.document.getElementById(APPLE.SIGN_IN_BUTTON_ID);
        if (signInButton) {
          await delay(DELAYS.NORMAL);
          signInButton.click();
          logger('info', 'clickAppleButtonInTab', 'Apple sign-in button clicked in popup');
          return;
        }
      } catch (error) {
        // Popup may not be fully loaded yet
      }

      await delay(DELAYS.MEDIUM);
    }

    logger('error', 'clickAppleButtonInTab', 'Apple button not found in popup');
    throw new Error('Apple button not found in popup');
  } catch (error) {
    logger('error', 'clickAppleButtonInTab', 'Failed to click Apple button', { error: error.message });
    throw error;
  }
}

/**
 * Wait for Apple popup window to close
 * @param {Window} popupWindow - Reference to popup window
 * @returns {Promise<void>}
 */
async function waitForApplePopupClose(popupWindow) {
  try {
    const startTime = Date.now();
    const timeout = TIMEOUTS.APPLE_POPUP_CLOSE;

    while (Date.now() - startTime < timeout) {
      try {
        if (popupWindow.closed) {
          logger('info', 'waitForApplePopupClose', 'Apple popup closed');
          return;
        }
      } catch (error) {
        // Popup reference lost, assume closed
        logger('info', 'waitForApplePopupClose', 'Popup reference lost, assuming closed');
        return;
      }

      await delay(DELAYS.MEDIUM);
    }

    logger('error', 'waitForApplePopupClose', 'Apple popup close timeout');
    throw new Error('Apple popup did not close');
  } catch (error) {
    logger('error', 'waitForApplePopupClose', 'Failed to wait for popup close', { error: error.message });
    throw error;
  }
}

/**
 * Perform Apple login flow
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function performAppleLogin() {
  try {
    logger('info', 'performAppleLogin', 'Starting Apple login flow');

    const appleButton = document.querySelector(SELECTORS.APPLE_BUTTON);
    if (!appleButton) {
      logger('error', 'performAppleLogin', 'Apple button not found');
      return false;
    }

    // Wait for popup window
    const popupPromise = waitForApplePopupWindow();
    await delay(DELAYS.NORMAL);
    appleButton.click();
    logger('info', 'performAppleLogin', 'Apple button clicked, waiting for popup');

    const popupWindow = await popupPromise;
    await clickAppleButtonInTab(popupWindow);
    await waitForApplePopupClose(popupWindow);
    await waitForLogin();

    logger('info', 'performAppleLogin', 'Apple login completed successfully');
    return true;
  } catch (error) {
    logger('error', 'performAppleLogin', 'Apple login failed', { error: error.message });
    return false;
  }
}

/**
 * Main login router - selects method based on login type
 * @param {string} loginMethod - 'email', 'facebook', 'google', or 'apple'
 * @param {string} email - Email address (required for email login)
 * @param {string} password - Password (required for email login)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function performLogin(loginMethod, email, password) {
  try {
    logger('info', 'performLogin', 'Starting login flow', { method: loginMethod });

    switch (loginMethod) {
      case 'email':
        return await performEmailLogin(email, password);
      case 'facebook':
        return await performFacebookLogin();
      case 'google':
        return await performGoogleLogin();
      case 'apple':
        return await performAppleLogin();
      default:
        logger('error', 'performLogin', 'Unknown login method', { method: loginMethod });
        return false;
    }
  } catch (error) {
    logger('error', 'performLogin', 'Login failed', { error: error.message });
    return false;
  }
}