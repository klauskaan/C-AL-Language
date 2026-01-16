/**
 * Lexer Health Script - Helper Function Tests
 *
 * Tests the exported helper functions from server/scripts/lexer-health.ts.
 * The script itself is a standalone executable and is not directly testable
 * due to process.exit() calls.
 *
 * Test Coverage:
 * - calculatePercentile(): Percentile calculation with edge cases
 * - isReportFile(): Report file detection
 * - formatDuration(): Human-readable duration formatting
 * - calculateETA(): ETA calculation with warmup period
 */

import { existsSync, readdirSync } from 'fs';
import {
  calculatePercentile,
  isReportFile,
  formatDuration,
  calculateETA,
} from '../../../scripts/lexer-health';

jest.mock('fs');

describe('Lexer Health Script - calculatePercentile()', () => {
  it('should return 0 for empty arrays (guard against NaN)', () => {
    const result = calculatePercentile([], 50);

    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it('should return correct p50 (median) for known dataset', () => {
    // Dataset: [10, 20, 30, 40, 50]
    // p50 (median) should be 30
    const values = [10, 20, 30, 40, 50];
    const result = calculatePercentile(values, 50);

    expect(result).toBe(30);
  });

  it('should return correct p95 for dataset 1-100', () => {
    // Dataset: [1, 2, 3, ..., 100]
    // p95 should be 95 (95th element when sorted)
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = calculatePercentile(values, 95);

    expect(result).toBe(95);
  });

  it('should return correct p99 for dataset 1-100', () => {
    // Dataset: [1, 2, 3, ..., 100]
    // p99 should be 99
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = calculatePercentile(values, 99);

    expect(result).toBe(99);
  });

  it('should return single value for all percentiles when array has one element', () => {
    const values = [42];

    expect(calculatePercentile(values, 0)).toBe(42);
    expect(calculatePercentile(values, 50)).toBe(42);
    expect(calculatePercentile(values, 100)).toBe(42);
  });

  it('should handle two-element array correctly', () => {
    const values = [10, 20];

    // p50 should select the higher value (index 1)
    const p50 = calculatePercentile(values, 50);
    expect(p50).toBe(20);

    // p0 should select the lower value (index 0)
    const p0 = calculatePercentile(values, 0);
    expect(p0).toBe(10);
  });

  it('should not mutate the input array', () => {
    const values = [50, 10, 30, 20, 40];
    const original = [...values];

    calculatePercentile(values, 50);

    expect(values).toEqual(original);
  });

  it('should handle unsorted input correctly', () => {
    const values = [50, 10, 30, 20, 40];
    const result = calculatePercentile(values, 50);

    // Should return median (30) after internal sorting
    expect(result).toBe(30);
  });
});

describe('Lexer Health Script - isReportFile()', () => {
  it('should return true for "REP123.TXT"', () => {
    expect(isReportFile('REP123.TXT')).toBe(true);
  });

  it('should return true for "REP 50001 Report Name.TXT"', () => {
    expect(isReportFile('REP 50001 Report Name.TXT')).toBe(true);
  });

  it('should return true for "REP1.TXT"', () => {
    expect(isReportFile('REP1.TXT')).toBe(true);
  });

  it('should return true for "REPXYZ.TXT"', () => {
    expect(isReportFile('REPXYZ.TXT')).toBe(true);
  });

  it('should return false for "COD1.TXT" (Codeunit)', () => {
    expect(isReportFile('COD1.TXT')).toBe(false);
  });

  it('should return false for "TAB18.TXT" (Table)', () => {
    expect(isReportFile('TAB18.TXT')).toBe(false);
  });

  it('should return false for "PAG50000.TXT" (Page)', () => {
    expect(isReportFile('PAG50000.TXT')).toBe(false);
  });

  it('should return false for "XmlPort123.TXT" (XMLport)', () => {
    expect(isReportFile('XmlPort123.TXT')).toBe(false);
  });

  it('should be case-insensitive for "rep123.TXT"', () => {
    // Implementation uses .toUpperCase(), so lowercase should work
    expect(isReportFile('rep123.TXT')).toBe(true);
  });

  it('should be case-insensitive for "Rep123.TXT"', () => {
    expect(isReportFile('Rep123.TXT')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isReportFile('')).toBe(false);
  });

  it('should return false for strings not starting with REP', () => {
    expect(isReportFile('XREP123.TXT')).toBe(false);
    expect(isReportFile('123REP.TXT')).toBe(false);
    expect(isReportFile('Report123.TXT')).toBe(false);
  });
});

describe('Lexer Health Script - formatDuration()', () => {
  describe('invalid inputs', () => {
    it('should return "--" for NaN', () => {
      expect(formatDuration(NaN)).toBe('--');
    });

    it('should return "--" for Infinity', () => {
      expect(formatDuration(Infinity)).toBe('--');
    });

    it('should return "--" for -Infinity', () => {
      expect(formatDuration(-Infinity)).toBe('--');
    });

    it('should return "--" for negative values', () => {
      expect(formatDuration(-1)).toBe('--');
      expect(formatDuration(-30)).toBe('--');
      expect(formatDuration(-3600)).toBe('--');
    });
  });

  describe('seconds only (< 60s)', () => {
    it('should format 0 seconds', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should format single-digit seconds', () => {
      expect(formatDuration(5)).toBe('5s');
    });

    it('should format double-digit seconds', () => {
      expect(formatDuration(45)).toBe('45s');
    });

    it('should format 59 seconds (boundary)', () => {
      expect(formatDuration(59)).toBe('59s');
    });

    it('should round fractional seconds', () => {
      expect(formatDuration(45.7)).toBe('46s');
      expect(formatDuration(45.3)).toBe('45s');
    });
  });

  describe('minutes and seconds (60s - 3599s)', () => {
    it('should format exactly 60 seconds as 1m 0s', () => {
      expect(formatDuration(60)).toBe('1m 0s');
    });

    it('should format 90 seconds as 1m 30s', () => {
      expect(formatDuration(90)).toBe('1m 30s');
    });

    it('should format 135 seconds as 2m 15s', () => {
      expect(formatDuration(135)).toBe('2m 15s');
    });

    it('should format 3599 seconds as 59m 59s (boundary)', () => {
      expect(formatDuration(3599)).toBe('59m 59s');
    });

    it('should format minutes without leading zeros', () => {
      expect(formatDuration(600)).toBe('10m 0s');
    });

    it('should round fractional seconds in minute range', () => {
      expect(formatDuration(90.7)).toBe('1m 31s');
      expect(formatDuration(90.3)).toBe('1m 30s');
    });
  });

  describe('hours and minutes (>= 3600s)', () => {
    it('should format exactly 3600 seconds as 1h 0m', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
    });

    it('should format 3900 seconds as 1h 5m', () => {
      expect(formatDuration(3900)).toBe('1h 5m');
    });

    it('should format 7200 seconds as 2h 0m', () => {
      expect(formatDuration(7200)).toBe('2h 0m');
    });

    it('should format 7380 seconds as 2h 3m', () => {
      expect(formatDuration(7380)).toBe('2h 3m');
    });

    it('should omit seconds in hour range', () => {
      expect(formatDuration(3659)).toBe('1h 0m'); // 1h 0m 59s -> omits seconds, shows 1h 0m
    });

    it('should round fractional seconds that affect minutes', () => {
      // 3659.7 seconds = 1h 0m 59.7s -> rounds to 1h 1m 0s
      expect(formatDuration(3659.7)).toBe('1h 1m');
    });

    it('should format large durations correctly', () => {
      expect(formatDuration(36000)).toBe('10h 0m'); // 10 hours
      expect(formatDuration(86400)).toBe('24h 0m'); // 24 hours
    });
  });
});

describe('Lexer Health Script - validateAllFiles()', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should return empty array when no .TXT files found', () => {
    // This tests the change from process.exit(2) to return []
    const mockExistsSync = jest.requireMock('fs').existsSync as jest.MockedFunction<typeof existsSync>;
    const mockReaddirSync = jest.requireMock('fs').readdirSync as jest.MockedFunction<typeof readdirSync>;

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([]);

    // Re-require the module after mocking to pick up the mocked fs
    const { validateAllFiles } = require('../../../scripts/lexer-health');
    const results = validateAllFiles();

    expect(results).toEqual([]);
    expect(results.length).toBe(0);
  });
});

describe('Lexer Health Script - calculateETA()', () => {
  describe('null returns (invalid inputs)', () => {
    it('should return null when processedCount is 0', () => {
      expect(calculateETA(0, 1000, 5000)).toBeNull();
    });

    it('should return null when processedCount is negative', () => {
      expect(calculateETA(-1, 1000, 5000)).toBeNull();
    });

    it('should return null when totalCount is 0', () => {
      expect(calculateETA(100, 0, 5000)).toBeNull();
    });

    it('should return null when totalCount is negative', () => {
      expect(calculateETA(100, -1, 5000)).toBeNull();
    });

    it('should return null when elapsedMs is 0', () => {
      expect(calculateETA(100, 1000, 0)).toBeNull();
    });

    it('should return null when elapsedMs is negative', () => {
      expect(calculateETA(100, 1000, -1)).toBeNull();
    });

    it('should return null when all inputs are 0', () => {
      expect(calculateETA(0, 0, 0)).toBeNull();
    });
  });

  describe('warmup period (< 100 files)', () => {
    it('should return null when processedCount is 1', () => {
      expect(calculateETA(1, 1000, 100)).toBeNull();
    });

    it('should return null when processedCount is 50', () => {
      expect(calculateETA(50, 1000, 5000)).toBeNull();
    });

    it('should return null when processedCount is 99 (boundary)', () => {
      expect(calculateETA(99, 1000, 9900)).toBeNull();
    });

    it('should calculate ETA when processedCount is exactly 100', () => {
      // 100 files in 10000ms = 100ms per file
      // Remaining: 900 files * 100ms = 90000ms = 90s
      const result = calculateETA(100, 1000, 10000);
      expect(result).toBe(90);
    });
  });

  describe('completion scenarios', () => {
    it('should return 0 when processedCount equals totalCount', () => {
      expect(calculateETA(1000, 1000, 100000)).toBe(0);
    });

    it('should return 0 when processedCount exceeds totalCount', () => {
      expect(calculateETA(1500, 1000, 150000)).toBe(0);
    });
  });

  describe('normal ETA calculations', () => {
    it('should calculate correct ETA for halfway point', () => {
      // 500 files in 50000ms = 100ms per file
      // Remaining: 500 files * 100ms = 50000ms = 50s
      const result = calculateETA(500, 1000, 50000);
      expect(result).toBe(50);
    });

    it('should calculate correct ETA near start (just after warmup)', () => {
      // 100 files in 5000ms = 50ms per file
      // Remaining: 900 files * 50ms = 45000ms = 45s
      const result = calculateETA(100, 1000, 5000);
      expect(result).toBe(45);
    });

    it('should calculate correct ETA near end', () => {
      // 950 files in 95000ms = 100ms per file
      // Remaining: 50 files * 100ms = 5000ms = 5s
      const result = calculateETA(950, 1000, 95000);
      expect(result).toBe(5);
    });

    it('should handle small batch (100 of 150)', () => {
      // 100 files in 10000ms = 100ms per file
      // Remaining: 50 files * 100ms = 5000ms = 5s
      const result = calculateETA(100, 150, 10000);
      expect(result).toBe(5);
    });

    it('should handle large batch (10000 of 50000)', () => {
      // 10000 files in 1000000ms = 100ms per file
      // Remaining: 40000 files * 100ms = 4000000ms = 4000s
      const result = calculateETA(10000, 50000, 1000000);
      expect(result).toBe(4000);
    });
  });

  describe('non-finite result guards', () => {
    it('should return null when calculation would result in Infinity', () => {
      // Processed 100 files in 0ms would create division by zero
      // But elapsedMs=0 is caught earlier as invalid input
      // Test a scenario where math creates Infinity after valid inputs
      const result = calculateETA(100, Number.MAX_SAFE_INTEGER, 1);
      // remainingCount * msPerFile could overflow to Infinity
      expect(result).toBeNull();
    });

    it('should return null when result would be NaN', () => {
      // Edge case: totalCount is very large, could create NaN in calculations
      const result = calculateETA(100, Number.POSITIVE_INFINITY, 10000);
      expect(result).toBeNull();
    });
  });

  describe('rounding behavior', () => {
    it('should return integer seconds (no fractional)', () => {
      // 333 files in 50000ms = 150.15ms per file
      // Remaining: 667 files * 150.15ms = 100150ms = 100.15s
      const result = calculateETA(333, 1000, 50000);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBe(100); // Should round down or use Math.ceil
    });

    it('should handle fractional milliseconds per file', () => {
      // 1000 files in 3333ms = 3.333ms per file
      // Remaining: 1000 files * 3.333ms = 3333ms = 3.333s
      const result = calculateETA(1000, 2000, 3333);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
