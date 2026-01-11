/**
 * Test setup file
 */

// Mock Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    lastError: undefined,
  },
  storage: {
    local: {
      get: jest.fn((_keys, callback) => {
        if (callback) {
          callback({});
        }
        return Promise.resolve({});
      }),
      set: jest.fn((_data, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      clear: jest.fn((callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
} as unknown as typeof chrome;
