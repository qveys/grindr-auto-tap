/**
 * Tests for utils/formatters.js
 */

describe('Formatters', () => {
  test('formatDate should format timestamp correctly', () => {
    const timestamp = new Date('2024-01-15T14:30:45.123Z').getTime();
    const result = window.Formatters.formatDate(timestamp);

    // Should match format: DD/MM/YYYY HH:MM:SS.mmm
    expect(result).toContain('/');
    expect(result).toContain(':');
    expect(result).toContain('.');
    expect(result.split('/').length).toBe(3);
  });

  test('formatDuration should format milliseconds correctly', () => {
    // 1 hour, 23 minutes, 45 seconds
    const duration = (1 * 60 * 60 * 1000) + (23 * 60 * 1000) + (45 * 1000);
    const result = window.Formatters.formatDuration(duration);

    expect(result).toContain('1h');
    expect(result).toContain('23m');
    expect(result).toContain('45s');
  });

  test('formatDuration should handle seconds only', () => {
    const duration = 45 * 1000; // 45 seconds
    const result = window.Formatters.formatDuration(duration);

    expect(result).toBe('45s');
  });

  test('formatDuration should handle minutes and seconds', () => {
    const duration = (5 * 60 * 1000) + (30 * 1000); // 5min 30s
    const result = window.Formatters.formatDuration(duration);

    expect(result).toContain('5m');
    expect(result).toContain('30s');
  });

  test('formatDuration should handle hours, minutes, and seconds', () => {
    const duration = (2 * 60 * 60 * 1000) + (15 * 60 * 1000) + (10 * 1000);
    const result = window.Formatters.formatDuration(duration);

    expect(result).toContain('2h');
    expect(result).toContain('15m');
    expect(result).toContain('10s');
  });

  test('formatDuration should handle zero duration', () => {
    const result = window.Formatters.formatDuration(0);
    expect(result).toBe('0s');
  });

  test('formatDuration should pad single digits', () => {
    const duration = (1 * 60 * 60 * 1000) + (5 * 60 * 1000) + (7 * 1000);
    const result = window.Formatters.formatDuration(duration);

    expect(result).toContain('1h');
    expect(result).toContain('05m'); // Should be padded
    expect(result).toContain('07s'); // Should be padded
  });
});
