/**
 * @fileoverview State Manager for Grindr Auto Tap extension
 * Centralized state management replacing scattered window.__grindr* globals.
 *
 * Features:
 * - Validated state transitions (IDLE → STARTING → RUNNING → STOPPING → STOPPED)
 * - Observer pattern for state change notifications
 * - Centralized statistics management with validation
 * - Persistent lastRunTime tracking via chrome.storage
 * - Backward compatibility aliases for existing code
 *
 * @module StateManager
 */

(function() {
  'use strict';

  /**
   * @enum {string}
   * @readonly
   * Script execution states
   */
  const State = {
    IDLE: 'idle',           // Not active
    STARTING: 'starting',   // Starting up
    RUNNING: 'running',     // Currently running
    STOPPING: 'stopping',   // Shutting down
    STOPPED: 'stopped',     // Stopped
    ERROR: 'error'          // Error state
  };

  // Internal state
  let currentState = State.IDLE;
  let currentStats = null;
  let lastRunTime = null;
  let listeners = [];

  /**
   * Valid state transitions
   * @type {Object<string, string[]>}
   */
  const validTransitions = {
    [State.IDLE]: [State.STARTING],
    [State.STARTING]: [State.RUNNING, State.ERROR, State.STOPPED],
    [State.RUNNING]: [State.STOPPING, State.ERROR],
    [State.STOPPING]: [State.STOPPED, State.ERROR],
    [State.STOPPED]: [State.IDLE],
    [State.ERROR]: [State.IDLE]
  };

  /**
   * Change state with validation
   * @param {string} newState - New state to transition to
   * @throws {Error} If transition is invalid
   */
  function setState(newState) {
    if (!Object.values(State).includes(newState)) {
      throw new Error(`Invalid state: ${newState}`);
    }

    // Check if transition is valid
    const allowedTransitions = validTransitions[currentState] || [];
    if (!allowedTransitions.includes(newState)) {
      throw new Error(
        `Invalid state transition: ${currentState} → ${newState}. ` +
        `Allowed: ${allowedTransitions.join(', ')}`
      );
    }

    const oldState = currentState;
    currentState = newState;

    // Notify listeners
    notifyListeners({
      type: 'stateChange',
      oldState,
      newState,
      timestamp: Date.now()
    });

    // Persist if needed
    if (newState === State.STOPPED || newState === State.ERROR) {
      setLastRunTime(Date.now());
    }
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  function getState() {
    return currentState;
  }

  /**
   * Check if script is running
   * Returns true for both STARTING and RUNNING states (script is active)
   * @returns {boolean} True if script is running or starting
   */
  function isRunning() {
    return currentState === State.STARTING || currentState === State.RUNNING;
  }

  /**
   * Check if script can start
   * @returns {boolean} True if script can start
   */
  function canStart() {
    return currentState === State.IDLE;
  }

  /**
   * Initialize statistics for a new session
   * @param {number} startTime - Start timestamp
   * @throws {Error} If startTime is invalid
   */
  function initializeStats(startTime) {
    if (!Number.isFinite(startTime) || startTime <= 0) {
      throw new Error(`Invalid startTime: ${startTime}`);
    }

    currentStats = {
      startTime,
      endTime: null,
      duration: 0,
      alreadyTappedCount: 0,
      tappedCount: 0,
      totalCount: 0,
      error: false,
      errorMessage: null
    };

    notifyListeners({
      type: 'statsInitialized',
      stats: { ...currentStats },
      timestamp: Date.now()
    });
  }

  /**
   * Update statistics
   * @param {Object} updates - Fields to update
   * @param {number} [updates.alreadyTappedCount] - Count of already tapped profiles
   * @param {number} [updates.tappedCount] - Count of newly tapped profiles
   * @param {boolean} [updates.error] - Error flag
   * @param {string} [updates.errorMessage] - Error message
   * @throws {Error} If stats not initialized or validation fails
   */
  function updateStats(updates) {
    if (!currentStats) {
      throw new Error('Stats not initialized. Call initializeStats() first.');
    }

    // Validation
    if (updates.alreadyTappedCount !== undefined && updates.alreadyTappedCount < 0) {
      throw new Error('alreadyTappedCount cannot be negative');
    }
    if (updates.tappedCount !== undefined && updates.tappedCount < 0) {
      throw new Error('tappedCount cannot be negative');
    }

    const oldStats = { ...currentStats };
    currentStats = {
      ...currentStats,
      ...updates,
      totalCount: (updates.alreadyTappedCount !== undefined ? updates.alreadyTappedCount : currentStats.alreadyTappedCount) +
                  (updates.tappedCount !== undefined ? updates.tappedCount : currentStats.tappedCount)
    };

    notifyListeners({
      type: 'statsUpdate',
      oldStats,
      newStats: { ...currentStats },
      timestamp: Date.now()
    });
  }

  /**
   * Get current statistics
   * @returns {Object|null} Copy of stats or null if not initialized
   */
  function getStats() {
    return currentStats ? { ...currentStats } : null;
  }

  /**
   * Finalize statistics (end of session)
   * @param {number} endTime - End timestamp
   * @throws {Error} If no stats to finalize or endTime is invalid
   */
  function finalizeStats(endTime) {
    if (!currentStats) {
      throw new Error('No stats to finalize');
    }

    if (!Number.isFinite(endTime) || endTime < currentStats.startTime) {
      throw new Error(`Invalid endTime: ${endTime}`);
    }

    currentStats.endTime = endTime;
    currentStats.duration = endTime - currentStats.startTime;

    notifyListeners({
      type: 'statsFinalized',
      stats: { ...currentStats },
      timestamp: Date.now()
    });
  }

  /**
   * Clear statistics
   */
  function clearStats() {
    const oldStats = currentStats;
    currentStats = null;

    notifyListeners({
      type: 'statsCleared',
      oldStats,
      timestamp: Date.now()
    });
  }

  /**
   * Set last run timestamp
   * @param {number} timestamp - Timestamp in milliseconds
   * @throws {Error} If timestamp is invalid
   */
  function setLastRunTime(timestamp) {
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      throw new Error(`Invalid timestamp: ${timestamp}`);
    }

    lastRunTime = timestamp;

    // Persist to storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ __grindrLastRun: timestamp }).catch(err => {
        console.error('Failed to persist lastRunTime:', err);
      });
    }

    notifyListeners({
      type: 'lastRunTimeSet',
      lastRunTime: timestamp,
      timestamp: Date.now()
    });
  }

  /**
   * Get last run timestamp
   * @returns {number|null} Last run timestamp or null
   */
  function getLastRunTime() {
    return lastRunTime;
  }

  /**
   * Load last run timestamp from storage
   * @returns {Promise<number|null>} Last run timestamp or null
   */
  async function loadLastRunTime() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return null;
    }

    try {
      const result = await chrome.storage.local.get(['__grindrLastRun']);
      if (result.__grindrLastRun) {
        lastRunTime = result.__grindrLastRun;
        return lastRunTime;
      }
    } catch (err) {
      console.error('Failed to load lastRunTime:', err);
    }

    return null;
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Callback function called on state changes
   * @returns {Function} Unsubscribe function
   * @throws {Error} If callback is not a function
   */
  function subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    listeners.push(callback);

    // Return unsubscribe function
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners
   * @param {Object} event - Event to send
   * @private
   */
  function notifyListeners(event) {
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }

  /**
   * Reset state to IDLE (preserves lastRunTime)
   */
  function reset() {
    currentState = State.IDLE;
    currentStats = null;
    // lastRunTime preserved across resets
  }

  /**
   * Get complete state snapshot
   * @returns {Object} Complete serializable state
   */
  function getSnapshot() {
    return {
      state: currentState,
      stats: currentStats ? { ...currentStats } : null,
      lastRunTime,
      timestamp: Date.now()
    };
  }

  // Export to global
  window.StateManager = {
    // Constants
    State,

    // State management
    setState,
    getState,
    isRunning,
    canStart,

    // Stats management
    initializeStats,
    updateStats,
    getStats,
    finalizeStats,
    clearStats,

    // Last run tracking
    setLastRunTime,
    getLastRunTime,
    loadLastRunTime,

    // Listeners
    subscribe,

    // Utilities
    reset,
    getSnapshot
  };

  /**
   * Backward compatibility: window.__grindrRunning
   * @deprecated Use StateManager.isRunning() instead
   */
  Object.defineProperty(window, '__grindrRunning', {
    get: () => isRunning(),
    set: (value) => {
      console.warn('DEPRECATED: Use StateManager.setState() instead of window.__grindrRunning');
      if (value && canStart()) {
        // Properly transition through STARTING first, then to RUNNING
        setState(State.STARTING);
        setState(State.RUNNING);
      } else if (!value && isRunning()) {
        setState(State.STOPPING);
      }
    }
  });

  /**
   * Backward compatibility: window.__grindrStopped
   * @deprecated Use StateManager.getState() === State.STOPPED instead
   */
  Object.defineProperty(window, '__grindrStopped', {
    get: () => currentState === State.STOPPED,
    set: (value) => {
      console.warn('DEPRECATED: Use StateManager.setState() instead of window.__grindrStopped');
      if (value && currentState !== State.STOPPED) {
        setState(State.STOPPED);
      }
    }
  });

  /**
   * Backward compatibility: window.__grindrStats
   * @deprecated Use StateManager.getStats() instead
   */
  Object.defineProperty(window, '__grindrStats', {
    get: () => getStats(),
    set: (value) => {
      console.warn('DEPRECATED: Use StateManager.updateStats() or initializeStats() instead of window.__grindrStats');
      if (value === null) {
        clearStats();
      } else if (value && typeof value === 'object') {
        if (!currentStats) {
          initializeStats(value.startTime || Date.now());
        }
        updateStats(value);
      }
    }
  });

  /**
   * Backward compatibility: window.__grindrLastRun
   * @deprecated Use StateManager.getLastRunTime() instead
   */
  Object.defineProperty(window, '__grindrLastRun', {
    get: () => getLastRunTime(),
    set: (value) => {
      console.warn('DEPRECATED: Use StateManager.setLastRunTime() instead of window.__grindrLastRun');
      if (value) {
        setLastRunTime(value);
      }
    }
  });

  // Load lastRunTime on initialization
  if (typeof chrome !== 'undefined' && chrome.storage) {
    loadLastRunTime().catch(err => {
      console.error('Failed to load lastRunTime on init:', err);
    });
  }
})();
