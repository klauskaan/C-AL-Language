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
 */

import { calculatePercentile, isReportFile } from '../../../scripts/lexer-health';

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
