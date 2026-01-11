/**
 * @fileoverview Async helpers for unified promise handling
 * Provides utilities for safe async operations with timeout and error handling
 */

(function() {
  'use strict';

  /**
   * Safe async wrapper with timeout protection
   * Executes a promise with automatic timeout and standardized error handling.
   * Returns a result object instead of throwing, making error handling consistent.
   *
   * @template T
   * @param {Promise<T>} promise - Promise to execute
   * @param {number} [timeoutMs=10000] - Timeout in milliseconds (default: 10s)
   * @returns {Promise<{success: boolean, data?: T, error?: Error}>} Result object
   *
   * @example
   * const { success, data, error } = await safeAsync(
   *   fetchUserData(),
   *   5000
   * );
   * if (success) {
   *   console.log('Data:', data);
   * } else {
   *   console.error('Error:', error.message);
   * }
   */
  async function safeAsync(promise, timeoutMs = 10000) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout exceeded')), timeoutMs)
      );

      const data = await Promise.race([promise, timeoutPromise]);
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Retry a function with exponential backoff
   * Useful for operations that may fail temporarily (network requests, etc.)
   *
   * @template T
   * @param {() => Promise<T>} fn - Async function to retry
   * @param {number} [maxRetries=3] - Maximum number of retry attempts
   * @param {number} [initialDelay=1000] - Initial delay in milliseconds
   * @param {number} [factor=2] - Backoff factor (delay multiplier)
   * @returns {Promise<T>} Result from successful execution
   * @throws {Error} Last error if all retries fail
   *
   * @example
   * const data = await retry(
   *   () => fetch('/api/data').then(r => r.json()),
   *   3,  // max retries
   *   1000 // initial delay 1s
   * );
   */
  async function retry(fn, maxRetries = 3, initialDelay = 1000, factor = 2) {
    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= factor;
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep/delay utility (Promise-based)
   * Pauses execution for specified duration. More semantic than raw setTimeout.
   *
   * @param {number} ms - Duration in milliseconds
   * @returns {Promise<void>} Promise that resolves after the delay
   *
   * @example
   * console.log('Starting...');
   * await sleep(2000);
   * console.log('2 seconds later');
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute promises in parallel with a concurrency limit
   * Useful for batch operations where too many parallel requests could overwhelm resources
   *
   * @template T
   * @param {Array<() => Promise<T>>} tasks - Array of promise-returning functions
   * @param {number} [concurrency=5] - Maximum number of concurrent promises
   * @returns {Promise<T[]>} Array of results in order
   *
   * @example
   * const urls = ['url1', 'url2', 'url3', ...];
   * const tasks = urls.map(url => () => fetch(url));
   * const results = await parallelLimit(tasks, 3); // max 3 concurrent requests
   */
  async function parallelLimit(tasks, concurrency = 5) {
    const results = [];
    const executing = [];

    for (const [index, task] of tasks.entries()) {
      const promise = task().then(result => {
        results[index] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        executing.splice(0, executing.findIndex(p => p === promise) + 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Debounce async function calls
   * Ensures function is only called once after a specified delay since last invocation
   *
   * @template T
   * @param {(...args: any[]) => Promise<T>} fn - Async function to debounce
   * @param {number} delayMs - Delay in milliseconds
   * @returns {(...args: any[]) => Promise<T>} Debounced function
   *
   * @example
   * const debouncedSearch = debounce(async (query) => {
   *   return await searchAPI(query);
   * }, 500);
   *
   * // Only the last call within 500ms will execute
   * debouncedSearch('a');
   * debouncedSearch('ab');
   * debouncedSearch('abc'); // Only this executes
   */
  function debounce(fn, delayMs) {
    let timeoutId;
    let latestResolve;
    let latestReject;

    return function(...args) {
      clearTimeout(timeoutId);

      return new Promise((resolve, reject) => {
        latestResolve = resolve;
        latestReject = reject;

        timeoutId = setTimeout(async () => {
          try {
            const result = await fn.apply(this, args);
            latestResolve(result);
          } catch (error) {
            latestReject(error);
          }
        }, delayMs);
      });
    };
  }

  // Export to global scope
  window.AsyncHelpers = {
    safeAsync,
    retry,
    sleep,
    parallelLimit,
    debounce
  };

  // Export individual functions for convenience
  window.safeAsync = safeAsync;
  window.retryAsync = retry;
  window.sleep = sleep;
})();
