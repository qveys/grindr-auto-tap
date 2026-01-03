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