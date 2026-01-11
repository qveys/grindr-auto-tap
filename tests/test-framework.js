/**
 * @fileoverview Simple test framework for Grindr Auto Tap extension
 * Lightweight testing without external dependencies
 * Compatible with browser environment (no Node.js required)
 */

(function(window) {
  'use strict';

  const tests = [];
  const suites = [];
  let currentSuite = null;

  /**
   * Test results collector
   */
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  /**
   * Define a test suite
   * @param {string} name - Suite name
   * @param {Function} fn - Suite function
   */
  function describe(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeEach: null,
      afterEach: null
    };

    suites.push(suite);
    currentSuite = suite;

    fn();

    currentSuite = null;
  }

  /**
   * Define a test case
   * @param {string} name - Test name
   * @param {Function} fn - Test function
   */
  function test(name, fn) {
    const testCase = {
      name,
      fn,
      suite: currentSuite
    };

    if (currentSuite) {
      currentSuite.tests.push(testCase);
    } else {
      tests.push(testCase);
    }
  }

  /**
   * Setup function to run before each test in suite
   * @param {Function} fn - Setup function
   */
  function beforeEach(fn) {
    if (currentSuite) {
      currentSuite.beforeEach = fn;
    }
  }

  /**
   * Teardown function to run after each test in suite
   * @param {Function} fn - Teardown function
   */
  function afterEach(fn) {
    if (currentSuite) {
      currentSuite.afterEach = fn;
    }
  }

  /**
   * Assertion utilities
   */
  const expect = (actual) => ({
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },

    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },

    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
      }
    },

    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
      }
    },

    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be null`);
      }
    },

    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be undefined`);
      }
    },

    toContain(item) {
      if (!actual.includes(item)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
      }
    },

    toThrow(expectedMessage) {
      try {
        actual();
        throw new Error('Expected function to throw');
      } catch (error) {
        if (expectedMessage && !error.message.includes(expectedMessage)) {
          throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
        }
      }
    },

    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },

    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },

    toHaveLength(expected) {
      if (actual.length !== expected) {
        throw new Error(`Expected length ${actual.length} to be ${expected}`);
      }
    },

    toBeInstanceOf(constructor) {
      if (!(actual instanceof constructor)) {
        throw new Error(`Expected ${actual} to be instance of ${constructor.name}`);
      }
    }
  });

  /**
   * Run all tests
   * @returns {Promise<Object>} Test results
   */
  async function runTests() {
    console.log('🧪 Starting test run...\n');
    results.total = 0;
    results.passed = 0;
    results.failed = 0;
    results.skipped = 0;
    results.errors = [];

    // Run standalone tests
    for (const testCase of tests) {
      await runTest(testCase);
    }

    // Run suite tests
    for (const suite of suites) {
      console.log(`\n📦 ${suite.name}`);

      for (const testCase of suite.tests) {
        // Run beforeEach
        if (suite.beforeEach) {
          try {
            await suite.beforeEach();
          } catch (error) {
            console.error(`  ❌ beforeEach failed: ${error.message}`);
          }
        }

        await runTest(testCase);

        // Run afterEach
        if (suite.afterEach) {
          try {
            await suite.afterEach();
          } catch (error) {
            console.error(`  ❌ afterEach failed: ${error.message}`);
          }
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`Total:   ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`Success: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    if (results.errors.length > 0) {
      console.log('\n' + '='.repeat(50));
      console.log('❌ Failed Tests:');
      results.errors.forEach(({ name, error }) => {
        console.log(`\n  ${name}`);
        console.log(`  Error: ${error.message}`);
        if (error.stack) {
          console.log(`  ${error.stack}`);
        }
      });
    }

    return results;
  }

  /**
   * Run a single test
   * @param {Object} testCase - Test case object
   */
  async function runTest(testCase) {
    results.total++;

    try {
      await testCase.fn();
      results.passed++;
      console.log(`  ✅ ${testCase.name}`);
    } catch (error) {
      results.failed++;
      results.errors.push({ name: testCase.name, error });
      console.log(`  ❌ ${testCase.name}`);
      console.log(`     ${error.message}`);
    }
  }

  /**
   * Mock DOM helpers
   */
  const createMockElement = (tag, attributes = {}) => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  };

  // Export to window
  window.testFramework = {
    describe,
    test,
    beforeEach,
    afterEach,
    expect,
    runTests,
    createMockElement
  };

  // Also export individually
  window.describe = describe;
  window.test = test;
  window.beforeEach = beforeEach;
  window.afterEach = afterEach;
  window.expect = expect;

})(window);
