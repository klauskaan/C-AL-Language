/**
 * Lexer Health Script - Helper Function Tests
 *
 * Tests the exported helper functions from server/scripts/lexer-health.ts.
 * The main execution block is a standalone executable and is not directly testable
 * due to process.exit() calls, but core validation logic has been extracted into
 * testable functions.
 *
 * Test Coverage:
 * - validateDirectoryForReport(): Directory validation with structured results
 * - calculatePercentile(): Percentile calculation with edge cases
 * - isReportFile(): Report file detection
 * - formatDuration(): Human-readable duration formatting
 * - calculateETA(): ETA calculation with warmup period
 */

import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import {
  calculatePercentile,
  isReportFile,
  formatDuration,
  calculateETA,
  validateDirectoryForReport,
  writeReport,
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
    // p95 with linear interpolation: position = 0.95 * (100 - 1) = 94.05
    // result = values[94] + 0.05 * (values[95] - values[94]) = 95 + 0.05 * 1 = 95.05
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = calculatePercentile(values, 95);

    expect(result).toBeCloseTo(95.05, 2);
  });

  it('should return correct p99 for dataset 1-100', () => {
    // Dataset: [1, 2, 3, ..., 100]
    // p99 with linear interpolation: position = 0.99 * (100 - 1) = 98.01
    // result = values[98] + 0.01 * (values[99] - values[98]) = 99 + 0.01 * 1 = 99.01
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = calculatePercentile(values, 99);

    expect(result).toBeCloseTo(99.01, 2);
  });

  it('should return single value for all percentiles when array has one element', () => {
    const values = [42];

    expect(calculatePercentile(values, 0)).toBe(42);
    expect(calculatePercentile(values, 50)).toBe(42);
    expect(calculatePercentile(values, 100)).toBe(42);
  });

  it('should handle two-element array correctly', () => {
    const values = [10, 20];

    // p50 should interpolate between the two values
    const p50 = calculatePercentile(values, 50);
    expect(p50).toBe(15);

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

  describe('linear interpolation behavior', () => {
    it('should interpolate between two values at p50', () => {
      // [10, 20] at p50 should return 15 (interpolated midpoint)
      // Current implementation uses Math.round which would return 20
      const values = [10, 20];
      const result = calculatePercentile(values, 50);

      expect(result).toBe(15);
    });

    it('should interpolate at p95 for skewed dataset', () => {
      // [10, 10, 10, 100] at p95
      // Position: (95/100) * (4-1) = 2.85
      // Interpolate between index 2 (value=10) and index 3 (value=100)
      // Result: 10 + 0.85 * (100-10) = 10 + 76.5 = 86.5
      const values = [10, 10, 10, 100];
      const result = calculatePercentile(values, 95);

      expect(result).toBeCloseTo(86.5, 1);
    });

    it('should interpolate at p25 for two-value array', () => {
      // [0, 100] at p25
      // Position: (25/100) * (2-1) = 0.25
      // Interpolate between index 0 (value=0) and index 1 (value=100)
      // Result: 0 + 0.25 * (100-0) = 25
      const values = [0, 100];
      const result = calculatePercentile(values, 25);

      expect(result).toBe(25);
    });

    it('should return exact value when position is integer', () => {
      // [1, 2, 3, 4, 5] at p25
      // Position: (25/100) * (5-1) = 1.0 (exact index)
      // Should return values[1] = 2
      const values = [1, 2, 3, 4, 5];
      const result = calculatePercentile(values, 25);

      expect(result).toBe(2);
    });

    it('should interpolate at p75 for five-value array', () => {
      // [1, 2, 3, 4, 5] at p75
      // Position: (75/100) * (5-1) = 3.0 (exact index)
      // Should return values[3] = 4
      const values = [1, 2, 3, 4, 5];
      const result = calculatePercentile(values, 75);

      expect(result).toBe(4);
    });

    it('should interpolate between non-adjacent values at p50', () => {
      // [1, 10, 20, 100] at p50
      // Position: (50/100) * (4-1) = 1.5
      // Interpolate between index 1 (value=10) and index 2 (value=20)
      // Result: 10 + 0.5 * (20-10) = 15
      const values = [1, 10, 20, 100];
      const result = calculatePercentile(values, 50);

      expect(result).toBe(15);
    });

    it('should interpolate with fractional position at p33', () => {
      // [10, 20, 30] at p33
      // Position: (33/100) * (3-1) = 0.66
      // Interpolate between index 0 (value=10) and index 1 (value=20)
      // Result: 10 + 0.66 * (20-10) = 16.6
      const values = [10, 20, 30];
      const result = calculatePercentile(values, 33);

      expect(result).toBeCloseTo(16.6, 1);
    });
  });

  describe('input validation', () => {
    it('should throw error for percentile < 0', () => {
      const values = [10, 20, 30];

      expect(() => calculatePercentile(values, -1)).toThrow();
      expect(() => calculatePercentile(values, -10)).toThrow();
    });

    it('should throw error for percentile > 100', () => {
      const values = [10, 20, 30];

      expect(() => calculatePercentile(values, 101)).toThrow();
      expect(() => calculatePercentile(values, 150)).toThrow();
    });

    it('should accept percentile = 0 (valid edge case)', () => {
      const values = [10, 20, 30];

      expect(() => calculatePercentile(values, 0)).not.toThrow();
      expect(calculatePercentile(values, 0)).toBe(10);
    });

    it('should accept percentile = 100 (valid edge case)', () => {
      const values = [10, 20, 30];

      expect(() => calculatePercentile(values, 100)).not.toThrow();
      expect(calculatePercentile(values, 100)).toBe(30);
    });

    it('should filter out NaN values from input array', () => {
      // [10, NaN, 20] should be treated as [10, 20]
      // p50 of [10, 20] with interpolation = 15
      const values = [10, NaN, 20];
      const result = calculatePercentile(values, 50);

      expect(result).toBe(15);
      expect(Number.isNaN(result)).toBe(false);
    });

    it('should filter out multiple NaN values', () => {
      // [NaN, 10, NaN, 20, NaN, 30, NaN] should be treated as [10, 20, 30]
      // p50 of [10, 20, 30] = 20
      const values = [NaN, 10, NaN, 20, NaN, 30, NaN];
      const result = calculatePercentile(values, 50);

      expect(result).toBe(20);
    });

    it('should return 0 for array with only NaN values', () => {
      // After filtering NaN, array is empty -> should return 0
      const values = [NaN, NaN, NaN];
      const result = calculatePercentile(values, 50);

      expect(result).toBe(0);
      expect(Number.isNaN(result)).toBe(false);
    });

    it('should handle mixed NaN and valid values at boundaries', () => {
      // [NaN, 100] should be treated as [100]
      // Any percentile of single-element array = that element
      const values = [NaN, 100];
      const result = calculatePercentile(values, 95);

      expect(result).toBe(100);
    });

    it('should filter out Infinity values from input array', () => {
      // [10, Infinity, 20] should be treated as [10, 20]
      // p50 of [10, 20] with interpolation = 15
      const values = [10, Infinity, 20];
      const result = calculatePercentile(values, 50);

      expect(result).toBe(15);
    });

    it('should filter out -Infinity values from input array', () => {
      // [10, -Infinity, 20] should be treated as [10, 20]
      // p50 of [10, 20] with interpolation = 15
      const values = [10, -Infinity, 20];
      const result = calculatePercentile(values, 50);

      expect(result).toBe(15);
    });

    it('should filter out both Infinity and -Infinity values', () => {
      // [Infinity, 10, -Infinity, 20] should be treated as [10, 20]
      const values = [Infinity, 10, -Infinity, 20];
      const result = calculatePercentile(values, 50);

      expect(result).toBe(15);
    });

    it('should return 0 for array with only Infinity values', () => {
      // After filtering, array is empty -> should return 0
      const values = [Infinity, -Infinity];
      const result = calculatePercentile(values, 50);

      expect(result).toBe(0);
    });
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
  it('should return empty array when no .TXT files found', () => {
    // This tests the change from process.exit(2) to return []
    const mockExistsSync = jest.requireMock('fs').existsSync as jest.MockedFunction<typeof existsSync>;
    const mockReaddirSync = jest.requireMock('fs').readdirSync as jest.MockedFunction<typeof readdirSync>;

    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([]);

    // Use the imported function directly (already loaded with mocked fs)
    const { validateAllFiles: validateAllFilesImported } = require('../../../scripts/lexer-health') as typeof import('../../../scripts/lexer-health');
    const results = validateAllFilesImported();

    expect(results).toEqual([]);
    expect(results.length).toBe(0);
  });

  describe('with files parameter', () => {
    let mockExistsSync: jest.MockedFunction<typeof existsSync>;
    let mockReaddirSync: jest.MockedFunction<typeof readdirSync>;
    let mockReadFileSync: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      mockExistsSync = jest.requireMock('fs').existsSync as jest.MockedFunction<typeof existsSync>;
      mockReaddirSync = jest.requireMock('fs').readdirSync as jest.MockedFunction<typeof readdirSync>;
      mockReadFileSync = jest.spyOn(require('fs'), 'readFileSync');
    });

    afterEach(() => {
      mockReadFileSync.mockRestore();
    });

    it('should use provided files array instead of re-validating directory', () => {
      // Mock file content for valid C/AL object
      mockReadFileSync.mockReturnValue(Buffer.from('OBJECT Table 18 Customer\r\n{\r\n}\r\n'));

      const { validateAllFiles } = require('../../../scripts/lexer-health');
      const results = validateAllFiles(['TAB18.TXT']);

      // Should NOT call readdirSync since files were provided
      expect(mockReaddirSync).not.toHaveBeenCalled();

      // Should process the provided file
      expect(results).toHaveLength(1);
      expect(results[0].file).toBe('TAB18.TXT');
    });

    it('should log "No .TXT files found" when provided empty array', () => {
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

      const { validateAllFiles } = require('../../../scripts/lexer-health');
      const results = validateAllFiles([]);

      expect(mockConsoleWarn).toHaveBeenCalledWith('No .TXT files found in test/REAL');
      expect(results).toEqual([]);

      mockConsoleWarn.mockRestore();
    });

    it('should process all provided files and return FileResult array', () => {
      // Mock file content for both files
      mockReadFileSync.mockReturnValue(Buffer.from('OBJECT Table 18 Customer\r\n{\r\n}\r\n'));

      const { validateAllFiles } = require('../../../scripts/lexer-health');
      const results = validateAllFiles(['TAB18.TXT', 'COD50.TXT']);

      expect(results).toHaveLength(2);
      expect(results[0].file).toBe('TAB18.TXT');
      expect(results[1].file).toBe('COD50.TXT');

      // Should NOT call readdirSync
      expect(mockReaddirSync).not.toHaveBeenCalled();
    });

    it('should behave identically for undefined and omitted files parameter', () => {
      // Mock directory validation to succeed
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['TAB18.TXT' as any]);
      mockReadFileSync.mockReturnValue(Buffer.from('OBJECT Table 18 Customer\r\n{\r\n}\r\n'));

      const { validateAllFiles } = require('../../../scripts/lexer-health');
      const results = validateAllFiles(undefined);

      // Should validate directory internally (readdirSync IS called)
      expect(mockReaddirSync).toHaveBeenCalled();
      expect(results).toHaveLength(1);
    });
  });

  describe('readdirSync error handling', () => {
    let mockExistsSync: jest.MockedFunction<typeof existsSync>;
    let mockReaddirSync: jest.MockedFunction<typeof readdirSync>;
    let mockExit: jest.SpyInstance;
    let mockConsoleError: jest.SpyInstance;

    beforeEach(() => {
      mockExistsSync = jest.requireMock('fs').existsSync as jest.MockedFunction<typeof existsSync>;
      mockReaddirSync = jest.requireMock('fs').readdirSync as jest.MockedFunction<typeof readdirSync>;
      mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number | string) => {
        throw new Error(`process.exit called with code ${code}`);
      });
      mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('should handle EACCES error (permission denied) by exiting with code 2', () => {
      // Directory exists, but readdirSync throws permission error
      mockExistsSync.mockReturnValue(true);

      const permissionError: any = new Error('EACCES: permission denied, scandir \'test/REAL\'');
      permissionError.code = 'EACCES';
      permissionError.errno = -13;
      permissionError.syscall = 'scandir';
      permissionError.path = 'test/REAL';

      mockReaddirSync.mockImplementation(() => {
        throw permissionError;
      });

      const { validateAllFiles } = require('../../../scripts/lexer-health');

      // Should throw because process.exit is mocked to throw
      expect(() => validateAllFiles()).toThrow('process.exit called with code 2');

      // Verify error logging occurred
      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleError.mock.calls.some((call: unknown[]) =>
        call.some((arg: unknown) => typeof arg === 'string' && arg.includes('cannot read test/REAL directory'))
      )).toBe(true);

      // Verify process.exit was called with code 2
      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it('should handle generic readdirSync errors by exiting with code 2', () => {
      // Directory exists, but readdirSync throws generic error
      mockExistsSync.mockReturnValue(true);

      const genericError = new Error('Too many open files');
      mockReaddirSync.mockImplementation(() => {
        throw genericError;
      });

      const { validateAllFiles } = require('../../../scripts/lexer-health');

      // Should throw because process.exit is mocked to throw
      expect(() => validateAllFiles()).toThrow('process.exit called with code 2');

      // Verify error logging occurred
      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleError.mock.calls.some((call: unknown[]) =>
        call.some((arg: unknown) => typeof arg === 'string' && arg.includes('cannot read test/REAL directory'))
      )).toBe(true);

      // Verify the error message was included
      expect(mockConsoleError.mock.calls.some((call: unknown[]) =>
        call.some((arg: unknown) => typeof arg === 'string' && arg.includes('Too many open files'))
      )).toBe(true);

      // Verify process.exit was called with code 2
      expect(mockExit).toHaveBeenCalledWith(2);
    });
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

describe('Lexer Health Script - validateDirectoryForReport()', () => {
  let mockExistsSync: jest.MockedFunction<typeof existsSync>;
  let mockReaddirSync: jest.MockedFunction<typeof readdirSync>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync = jest.requireMock('fs').existsSync as jest.MockedFunction<typeof existsSync>;
    mockReaddirSync = jest.requireMock('fs').readdirSync as jest.MockedFunction<typeof readdirSync>;
  });

  describe('directory does not exist', () => {
    it('should return status "not_found" when directory does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = validateDirectoryForReport('/path/to/nonexistent');

      expect(result.status).toBe('not_found');
      expect(result.files).toBeUndefined();
      expect(result.errorDetails).toBeUndefined();
    });

    it('should not call readdirSync when directory does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      validateDirectoryForReport('/path/to/nonexistent');

      expect(mockReaddirSync).not.toHaveBeenCalled();
    });
  });

  describe('read errors', () => {
    it('should return status "read_error" with EACCES code for permission denied', () => {
      mockExistsSync.mockReturnValue(true);

      const permissionError: any = new Error('EACCES: permission denied, scandir \'/test/REAL\'');
      permissionError.code = 'EACCES';
      permissionError.errno = -13;
      permissionError.syscall = 'scandir';
      permissionError.path = '/test/REAL';

      mockReaddirSync.mockImplementation(() => {
        throw permissionError;
      });

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('read_error');
      expect(result.files).toBeUndefined();
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails?.code).toBe('EACCES');
      expect(result.errorDetails?.message).toContain('permission denied');
    });

    it('should return status "read_error" with ENOENT code for TOCTOU race condition', () => {
      // Directory exists during existsSync check but is deleted before readdirSync
      mockExistsSync.mockReturnValue(true);

      const enoentError: any = new Error('ENOENT: no such file or directory, scandir \'/test/REAL\'');
      enoentError.code = 'ENOENT';
      enoentError.errno = -2;
      enoentError.syscall = 'scandir';
      enoentError.path = '/test/REAL';

      mockReaddirSync.mockImplementation(() => {
        throw enoentError;
      });

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('read_error');
      expect(result.files).toBeUndefined();
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails?.code).toBe('ENOENT');
      expect(result.errorDetails?.message).toContain('no such file or directory');
    });

    it('should return status "read_error" for generic filesystem errors', () => {
      mockExistsSync.mockReturnValue(true);

      const genericError = new Error('Too many open files');
      mockReaddirSync.mockImplementation(() => {
        throw genericError;
      });

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('read_error');
      expect(result.files).toBeUndefined();
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails?.message).toBe('Too many open files');
      expect(result.errorDetails?.code).toBeUndefined();
    });

    it('should handle non-Error thrown values in read errors', () => {
      mockExistsSync.mockReturnValue(true);

      mockReaddirSync.mockImplementation(() => {
        throw 'String error message';
      });

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('read_error');
      expect(result.files).toBeUndefined();
      expect(result.errorDetails).toBeDefined();
      expect(result.errorDetails?.message).toBe('String error message');
      expect(result.errorDetails?.code).toBeUndefined();
    });
  });

  describe('empty directory cases', () => {
    it('should return status "empty" when directory contains no files at all', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('empty');
      expect(result.files).toBeUndefined();
      expect(result.errorDetails).toBeUndefined();
    });

    it('should return status "empty" when directory contains only non-.TXT files', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        'README.md' as any,
        'config.json' as any,
        '.gitignore' as any,
        'script.sh' as any
      ]);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('empty');
      expect(result.files).toBeUndefined();
      expect(result.errorDetails).toBeUndefined();
    });

    it('should return status "empty" when directory contains files with various non-.TXT extensions', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        'file.txt.backup' as any,  // Not .TXT extension
        'archive.tar.gz' as any,
        'document.pdf' as any,
        'image.png' as any
      ]);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('empty');
      expect(result.files).toBeUndefined();
      expect(result.errorDetails).toBeUndefined();
    });
  });

  describe('success cases', () => {
    it('should return status "valid" with files array when .TXT files found', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        'TAB18.TXT' as any,
        'COD1.TXT' as any,
        'REP50000.TXT' as any
      ]);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('valid');
      expect(result.files).toBeDefined();
      expect(result.files).toHaveLength(3);
      expect(result.files).toContain('TAB18.TXT');
      expect(result.files).toContain('COD1.TXT');
      expect(result.files).toContain('REP50000.TXT');
      expect(result.errorDetails).toBeUndefined();
    });

    it('should return status "valid" with single .TXT file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['TAB18.TXT' as any]);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('valid');
      expect(result.files).toBeDefined();
      expect(result.files).toHaveLength(1);
      expect(result.files).toContain('TAB18.TXT');
      expect(result.errorDetails).toBeUndefined();
    });

    it('should filter mixed .TXT and non-.TXT files correctly', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        'TAB18.TXT' as any,
        'README.md' as any,
        'COD1.TXT' as any,
        '.gitignore' as any,
        'REP50000.TXT' as any,
        'config.json' as any
      ]);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('valid');
      expect(result.files).toBeDefined();
      expect(result.files).toHaveLength(3);
      expect(result.files).toContain('TAB18.TXT');
      expect(result.files).toContain('COD1.TXT');
      expect(result.files).toContain('REP50000.TXT');
      expect(result.files).not.toContain('README.md');
      expect(result.files).not.toContain('.gitignore');
      expect(result.files).not.toContain('config.json');
      expect(result.errorDetails).toBeUndefined();
    });

    it('should handle .TXT files with different case sensitivity', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        'FILE1.TXT' as any,
        'file2.txt' as any,  // Lowercase extension
        'File3.Txt' as any   // Mixed case
      ]);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('valid');
      expect(result.files).toBeDefined();
      // All should be included since hasTxtExtension() is case-insensitive
      expect(result.files?.length).toBeGreaterThan(0);
    });

    it('should return sorted files array', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        'COD50000.TXT' as any,
        'TAB18.TXT' as any,
        'REP1.TXT' as any
      ]);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('valid');
      expect(result.files).toBeDefined();
      expect(result.files).toEqual(['COD50000.TXT', 'REP1.TXT', 'TAB18.TXT']);
    });
  });

  describe('edge cases', () => {
    it('should handle very large number of files', () => {
      mockExistsSync.mockReturnValue(true);
      const largeFileList = Array.from({ length: 10000 }, (_, i) => `FILE${i}.TXT` as any);
      mockReaddirSync.mockReturnValue(largeFileList);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('valid');
      expect(result.files).toBeDefined();
      expect(result.files).toHaveLength(10000);
    });

    it('should handle special characters in directory path', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['TAB18.TXT' as any]);

      const result = validateDirectoryForReport('/test/REAL with spaces/objects (legacy)');

      expect(result.status).toBe('valid');
      expect(result.files).toHaveLength(1);
    });

    it('should handle files with very long names', () => {
      mockExistsSync.mockReturnValue(true);
      const longFileName = 'REP ' + 'A'.repeat(200) + '.TXT';
      mockReaddirSync.mockReturnValue([longFileName as any]);

      const result = validateDirectoryForReport('/test/REAL');

      expect(result.status).toBe('valid');
      expect(result.files).toContain(longFileName);
    });
  });
});

describe('Lexer Health Script - validateAllFiles() optimization', () => {
  it('should accept optional files parameter to skip directory validation', () => {
    // Test that validateAllFiles can be called with a files array
    const { validateAllFiles } = require('../../../scripts/lexer-health');

    // Mock files array (empty to avoid actual file processing)
    const mockFiles: string[] = [];

    // Should not throw and should return empty array
    const result = validateAllFiles(mockFiles);
    expect(result).toEqual([]);
  });

  // Note: Backward compatibility with undefined parameter is tested at line 511-523
  // in the "should behave identically for undefined and omitted files parameter" test
});

describe('Lexer Health Script - writeReport()', () => {
  let mockMkdirSync: jest.MockedFunction<typeof mkdirSync>;
  let mockWriteFileSync: jest.MockedFunction<typeof writeFileSync>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdirSync = jest.requireMock('fs').mkdirSync as jest.MockedFunction<typeof mkdirSync>;
    mockWriteFileSync = jest.requireMock('fs').writeFileSync as jest.MockedFunction<typeof writeFileSync>;
  });

  describe('success cases', () => {
    it('should return success when directory exists and write succeeds', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const result = writeReport('/reports/output.md', 'Test content');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('/reports/output.md');
      }
      expect(mockMkdirSync).toHaveBeenCalledWith('/reports', { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith('/reports/output.md', 'Test content', 'utf-8');
    });

    it('should return success when directory does not exist and mkdir + write succeed', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const result = writeReport('/new/path/report.md', 'Content here');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('/new/path/report.md');
      }
      expect(mockMkdirSync).toHaveBeenCalledWith('/new/path', { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith('/new/path/report.md', 'Content here', 'utf-8');
    });

    it('should handle nested directory paths correctly', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const result = writeReport('/a/b/c/d/e/report.md', 'Deep nesting');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('/a/b/c/d/e/report.md');
      }
      expect(mockMkdirSync).toHaveBeenCalledWith('/a/b/c/d/e', { recursive: true });
    });

    it('should handle relative paths by deriving correct directory', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const result = writeReport('output/report.md', 'Relative path');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('output/report.md');
      }
      expect(mockMkdirSync).toHaveBeenCalledWith('output', { recursive: true });
    });

    it('should handle root directory path correctly', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const result = writeReport('/report.md', 'Root level');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('/report.md');
      }
      expect(mockMkdirSync).toHaveBeenCalledWith('/', { recursive: true });
    });

    it('should handle filename with no directory component', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const result = writeReport('report.md', 'Current directory');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('report.md');
      }
      // dirname('report.md') returns '.' (current directory)
      expect(mockMkdirSync).toHaveBeenCalledWith('.', { recursive: true });
    });
  });

  describe('mkdir errors', () => {
    it('should return mkdir_error with EACCES code for permission denied', () => {
      const permissionError: any = new Error('EACCES: permission denied, mkdir \'/protected/reports\'');
      permissionError.code = 'EACCES';
      permissionError.errno = -13;
      permissionError.syscall = 'mkdir';
      permissionError.path = '/protected/reports';

      mockMkdirSync.mockImplementation(() => {
        throw permissionError;
      });

      const result = writeReport('/protected/reports/output.md', 'Test content');

      expect(result.status).toBe('mkdir_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.code).toBe('EACCES');
        expect(result.errorDetails.message).toContain('permission denied');
      }
    });

    it('should return mkdir_error with EROFS code for read-only filesystem', () => {
      const rofsError: any = new Error('EROFS: read-only file system, mkdir \'/readonly/reports\'');
      rofsError.code = 'EROFS';
      rofsError.errno = -30;
      rofsError.syscall = 'mkdir';
      rofsError.path = '/readonly/reports';

      mockMkdirSync.mockImplementation(() => {
        throw rofsError;
      });

      const result = writeReport('/readonly/reports/output.md', 'Test content');

      expect(result.status).toBe('mkdir_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.code).toBe('EROFS');
        expect(result.errorDetails.message).toContain('read-only file system');
      }
    });

    it('should return mkdir_error for generic filesystem errors without code', () => {
      const genericError = new Error('Out of memory');

      mockMkdirSync.mockImplementation(() => {
        throw genericError;
      });

      const result = writeReport('/path/reports/output.md', 'Test content');

      expect(result.status).toBe('mkdir_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.message).toBe('Out of memory');
        expect(result.errorDetails.code).toBeUndefined();
      }
    });

    it('should handle non-Error thrown values in mkdir (string)', () => {
      mockMkdirSync.mockImplementation(() => {
        throw 'String error from mkdir';
      });

      const result = writeReport('/path/reports/output.md', 'Test content');

      expect(result.status).toBe('mkdir_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.message).toBe('String error from mkdir');
        expect(result.errorDetails.code).toBeUndefined();
      }
    });

    it('should not call writeFileSync when mkdir fails', () => {
      const mkdirError = new Error('mkdir failed');
      mockMkdirSync.mockImplementation(() => {
        throw mkdirError;
      });

      writeReport('/path/reports/output.md', 'Test content');

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
  });

  describe('write errors', () => {
    it('should return write_error with EACCES code for permission denied', () => {
      mockMkdirSync.mockReturnValue(undefined);

      const permissionError: any = new Error('EACCES: permission denied, open \'/reports/output.md\'');
      permissionError.code = 'EACCES';
      permissionError.errno = -13;
      permissionError.syscall = 'open';
      permissionError.path = '/reports/output.md';

      mockWriteFileSync.mockImplementation(() => {
        throw permissionError;
      });

      const result = writeReport('/reports/output.md', 'Test content');

      expect(result.status).toBe('write_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.code).toBe('EACCES');
        expect(result.errorDetails.message).toContain('permission denied');
      }
    });

    it('should return write_error with ENOSPC code for disk full', () => {
      mockMkdirSync.mockReturnValue(undefined);

      const diskFullError: any = new Error('ENOSPC: no space left on device, write');
      diskFullError.code = 'ENOSPC';
      diskFullError.errno = -28;
      diskFullError.syscall = 'write';

      mockWriteFileSync.mockImplementation(() => {
        throw diskFullError;
      });

      const result = writeReport('/reports/output.md', 'Test content');

      expect(result.status).toBe('write_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.code).toBe('ENOSPC');
        expect(result.errorDetails.message).toContain('no space left on device');
      }
    });

    it('should return write_error with EROFS code for read-only filesystem', () => {
      mockMkdirSync.mockReturnValue(undefined);

      const rofsError: any = new Error('EROFS: read-only file system, write');
      rofsError.code = 'EROFS';
      rofsError.errno = -30;
      rofsError.syscall = 'write';

      mockWriteFileSync.mockImplementation(() => {
        throw rofsError;
      });

      const result = writeReport('/reports/output.md', 'Test content');

      expect(result.status).toBe('write_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.code).toBe('EROFS');
        expect(result.errorDetails.message).toContain('read-only file system');
      }
    });

    it('should return write_error for partial failure (mkdir succeeds, write fails)', () => {
      mockMkdirSync.mockReturnValue(undefined);

      const writeError = new Error('Write failed after mkdir succeeded');
      mockWriteFileSync.mockImplementation(() => {
        throw writeError;
      });

      const result = writeReport('/new/path/output.md', 'Test content');

      expect(result.status).toBe('write_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.message).toBe('Write failed after mkdir succeeded');
      }

      // Verify mkdir was actually called and succeeded
      expect(mockMkdirSync).toHaveBeenCalledWith('/new/path', { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith('/new/path/output.md', 'Test content', 'utf-8');
    });

    it('should return write_error for generic filesystem errors without code', () => {
      mockMkdirSync.mockReturnValue(undefined);

      const genericError = new Error('I/O error');
      mockWriteFileSync.mockImplementation(() => {
        throw genericError;
      });

      const result = writeReport('/reports/output.md', 'Test content');

      expect(result.status).toBe('write_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.message).toBe('I/O error');
        expect(result.errorDetails.code).toBeUndefined();
      }
    });

    it('should handle non-Error thrown values in write (string)', () => {
      mockMkdirSync.mockReturnValue(undefined);

      mockWriteFileSync.mockImplementation(() => {
        throw 'String error from writeFileSync';
      });

      const result = writeReport('/reports/output.md', 'Test content');

      expect(result.status).toBe('write_error');
      if (result.status !== 'success') {
        expect(result.errorDetails).toBeDefined();
        expect(result.errorDetails.message).toBe('String error from writeFileSync');
        expect(result.errorDetails.code).toBeUndefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty content string', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const result = writeReport('/reports/empty.md', '');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('/reports/empty.md');
      }
      expect(mockWriteFileSync).toHaveBeenCalledWith('/reports/empty.md', '', 'utf-8');
    });

    it('should handle very long content strings', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const longContent = 'A'.repeat(1000000); // 1MB
      const result = writeReport('/reports/large.md', longContent);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('/reports/large.md');
      }
      expect(mockWriteFileSync).toHaveBeenCalledWith('/reports/large.md', longContent, 'utf-8');
    });

    it('should handle content with special characters and newlines', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const specialContent = 'Line 1\n\nLine 3\tTab\r\nWindows newline\u2028Line separator';
      const result = writeReport('/reports/special.md', specialContent);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('/reports/special.md');
      }
      expect(mockWriteFileSync).toHaveBeenCalledWith('/reports/special.md', specialContent, 'utf-8');
    });

    it('should handle paths with special characters', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const result = writeReport('/reports (2024)/output [draft].md', 'Content');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.reportPath).toBe('/reports (2024)/output [draft].md');
      }
      expect(mockMkdirSync).toHaveBeenCalledWith('/reports (2024)', { recursive: true });
    });

    // Note: Windows-style paths (C:\reports\output.md) are not tested because
    // Node's path.dirname() is platform-specific. On Linux/Mac, backslashes
    // are not recognized as path separators. The script is primarily used in
    // CI environments on Linux, so cross-platform path handling is not needed.
  });
});
