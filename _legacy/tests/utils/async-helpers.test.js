/**
 * Tests for utils/async-helpers.js
 */

describe('AsyncHelpers', () => {
  describe('safeAsync', () => {
    test('should return success for resolved promise', async () => {
      const promise = Promise.resolve('test data');
      const result = await window.AsyncHelpers.safeAsync(promise, 1000);

      expect(result.success).toBe(true);
      expect(result.data).toBe('test data');
      expect(result.error).toBeUndefined();
    });

    test('should return error for rejected promise', async () => {
      const promise = Promise.reject(new Error('Test error'));
      const result = await window.AsyncHelpers.safeAsync(promise, 1000);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Test error');
    });

    test('should timeout slow promises', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 5000));
      const result = await window.AsyncHelpers.safeAsync(slowPromise, 100);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('timeout');
    });
  });

  describe('retry', () => {
    test('should succeed on first try', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return 'success';
      };

      const result = await window.AsyncHelpers.retry(fn, 3, 10);

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    test('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await window.AsyncHelpers.retry(fn, 3, 10);

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('should throw after max retries', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('Permanent failure');
      };

      try {
        await window.AsyncHelpers.retry(fn, 2, 10);
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error.message).toBe('Permanent failure');
        expect(attempts).toBe(3); // Initial + 2 retries
      }
    });
  });

  describe('sleep', () => {
    test('should delay execution', async () => {
      const start = Date.now();
      await window.AsyncHelpers.sleep(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThan(90); // Allow some margin
    });

    test('should return undefined', async () => {
      const result = await window.AsyncHelpers.sleep(10);
      expect(result).toBeUndefined();
    });
  });

  describe('parallelLimit', () => {
    test('should execute tasks in parallel with limit', async () => {
      const executed = [];
      const tasks = [1, 2, 3, 4, 5].map(n => async () => {
        executed.push(n);
        await window.AsyncHelpers.sleep(10);
        return n * 2;
      });

      const results = await window.AsyncHelpers.parallelLimit(tasks, 2);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(executed).toHaveLength(5);
    });

    test('should maintain order of results', async () => {
      const tasks = [3, 1, 2].map(n => async () => {
        await window.AsyncHelpers.sleep(n * 10);
        return n;
      });

      const results = await window.AsyncHelpers.parallelLimit(tasks, 3);

      expect(results).toEqual([3, 1, 2]); // Order preserved despite different delays
    });
  });

  describe('debounce', () => {
    test('should debounce rapid calls', async () => {
      let callCount = 0;
      const fn = async (value) => {
        callCount++;
        return value;
      };

      const debounced = window.AsyncHelpers.debounce(fn, 50);

      debounced('a');
      debounced('b');
      const result = await debounced('c');

      await window.AsyncHelpers.sleep(100);

      expect(callCount).toBe(1); // Only last call executes
      expect(result).toBe('c');
    });

    test('should execute after delay', async () => {
      let executed = false;
      const fn = async () => {
        executed = true;
        return 'done';
      };

      const debounced = window.AsyncHelpers.debounce(fn, 50);
      debounced();

      expect(executed).toBe(false); // Not executed immediately

      await window.AsyncHelpers.sleep(100);

      expect(executed).toBe(true); // Executed after delay
    });
  });
});
