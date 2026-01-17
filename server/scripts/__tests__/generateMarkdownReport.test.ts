/**
 * Tests for generateMarkdownReport function
 *
 * Tests cover all edge cases from issue #103:
 * - Empty input, all pass/fail scenarios, mixed results
 * - Large numbers, long filenames, special characters
 * - Performance outliers detection
 * - Current behavior documented with TODO comments for known issues (#113, #114, #115)
 */

import { generateMarkdownReport, FileResult, escapeMarkdown } from '../lexer-health';
import { ExitCategory } from '../../src/lexer/lexer';

// Mock timers for deterministic timestamps
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));

/**
 * Factory function to create FileResult objects with sensible defaults.
 * Uses proper Set construction for categories to match actual runtime behavior.
 *
 * @param overrides - Partial FileResult to override defaults
 * @returns Complete FileResult object
 */
function createFileResult(overrides: Partial<FileResult> = {}): FileResult {
  return {
    file: 'test.txt',
    lines: 100,
    tokenCount: 500,
    tokenizeTime: 10.5,
    positionValidation: {
      isValid: true,
      errors: [],
      warnings: []
    },
    cleanExit: {
      passed: true,
      violations: [],
      categories: new Set()
    },
    ...overrides
  };
}

describe('generateMarkdownReport', () => {
  describe('Empty and edge cases', () => {
    it('should handle zero results (empty input)', () => {
      // Fix for issue #114: Empty results should show "No files to validate", not success
      const results: FileResult[] = [];
      const report = generateMarkdownReport(results);

      // Should contain header
      expect(report).toContain('# Lexer Health Report');

      // Should show warning about no files to validate
      expect(report).toContain('⚠️ **No files to validate**');

      // Should NOT show misleading success message
      expect(report).not.toContain('All files passed validation!');

      // Should not show summary stats for empty input (early return)
      expect(report).not.toContain('**Total files:**');
      expect(report).not.toContain('Performance Metrics');
    });

    it('should handle empty violations array edge case', () => {
      const results: FileResult[] = [
        createFileResult({
          file: 'broken.txt',
          cleanExit: {
            passed: false,
            violations: [], // Edge case: failed but no violations listed
            categories: new Set()
          }
        })
      ];

      const report = generateMarkdownReport(results);

      // Should show file as failure
      expect(report).toContain('## Failures');
      expect(report).toContain('Total files with failures: 1');
      expect(report).toContain('### Clean Exit Failures (1)');
      expect(report).toContain('#### broken.txt');

      // Should handle empty violations gracefully
      expect(report).toContain('**Violations:**');
      // No violations to list, but section should exist
    });

    it('should handle very long filename', () => {
      // TODO: Issue #113 - Markdown table cells are not escaped, long filenames can break rendering
      // Current behavior: Filenames inserted as-is into markdown tables

      // Create 200+ character filename
      const longFilename = 'A'.repeat(200) + '.txt';

      const results: FileResult[] = [];

      // Add 99 fast files at 10ms
      for (let i = 1; i <= 99; i++) {
        results.push(createFileResult({ file: `fast${i}.txt`, tokenizeTime: 10 }));
      }

      // Add 1 slow file with long filename (500ms > threshold = 20ms)
      results.push(createFileResult({
        file: longFilename,
        lines: 1000,
        tokenizeTime: 500
      }));

      const report = generateMarkdownReport(results);

      // Should contain the long filename (current behavior: appears in outliers table)
      expect(report).toContain(longFilename);
      expect(report).toContain('Performance Outliers');
      expect(report).toContain('| File | Lines | Time (ms) | Tokens |');

      // Report should still be well-formed
      expect(report).toContain('# Lexer Health Report');
      expect(report).toContain('**Total files:** 100');
    });

    it('should handle special characters - pipe in filename', () => {
      const filenameWithPipe = 'file|with|pipes.txt';

      const results: FileResult[] = [];

      // Add 99 fast files at 10ms
      for (let i = 1; i <= 99; i++) {
        results.push(createFileResult({ file: `fast${i}.txt`, tokenizeTime: 10 }));
      }

      // Add 1 slow file with pipe characters (500ms > threshold = 20ms)
      results.push(createFileResult({
        file: filenameWithPipe,
        tokenizeTime: 500
      }));

      const report = generateMarkdownReport(results);

      // Pipes should be escaped in markdown table
      expect(report).toContain('file\\|with\\|pipes.txt');
      expect(report).toContain('Performance Outliers');
      expect(report).toContain('# Lexer Health Report');
    });

    it('should handle markdown in error messages', () => {
      const errorWithMarkdown = 'Error: **bold** and _italic_ and `code`';

      const results: FileResult[] = [
        createFileResult({
          file: 'test.txt',
          positionValidation: {
            isValid: false,
            errors: [errorWithMarkdown],
            warnings: []
          }
        })
      ];

      const report = generateMarkdownReport(results);

      // Markdown characters should be escaped
      expect(report).toContain('Error: \\*\\*bold\\*\\* and \\_italic\\_ and \\`code\\`');
      expect(report).toContain('## Failures');
      expect(report).toContain('### Position Validation Failures');
    });
  });

  describe('Success cases', () => {
    it('should show success message when all files pass (100% success)', () => {
      const results: FileResult[] = [
        createFileResult({ file: 'file1.txt', lines: 100 }),
        createFileResult({ file: 'file2.txt', lines: 200 }),
        createFileResult({ file: 'file3.txt', lines: 300 })
      ];

      const report = generateMarkdownReport(results);

      // Should show summary
      expect(report).toContain('**Total files:** 3');
      expect(report).toContain('**Total lines:** 600'); // 100 + 200 + 300
      expect(report).toContain('**Total tokens:** 1,500'); // 3 * 500
      expect(report).toContain('**Files with position errors:** 0');
      expect(report).toContain('**Files with clean exit errors:** 0');
      expect(report).toContain('**Success rate:** 100.00%');

      // Should show success status
      expect(report).toContain('## Status');
      expect(report).toContain('✅ **All files passed validation!**');

      // Should NOT show failures section
      expect(report).not.toContain('## Failures');
    });
  });

  describe('Failure cases', () => {
    it('should show failures when all files fail (0% success)', () => {
      const results: FileResult[] = [
        createFileResult({
          file: 'file1.txt',
          positionValidation: {
            isValid: false,
            errors: ['Position error'],
            warnings: []
          }
        }),
        createFileResult({
          file: 'file2.txt',
          cleanExit: {
            passed: false,
            violations: [{
              category: ExitCategory.STACK_MISMATCH,
              message: 'Invalid state',
              expected: 'EOF',
              actual: 'IDENTIFIER'
            }],
            categories: new Set([ExitCategory.STACK_MISMATCH])
          }
        })
      ];

      const report = generateMarkdownReport(results);

      // Should show 0% success
      expect(report).toContain('**Success rate:** 0.00%');
      expect(report).toContain('**Files with position errors:** 1');
      expect(report).toContain('**Files with clean exit errors:** 1');

      // Should show failures section
      expect(report).toContain('## Failures');
      expect(report).toContain('Total files with failures: 2');

      // Should NOT show success message
      expect(report).not.toContain('All files passed validation!');
    });

    it('should calculate 50% success rate correctly (mixed results)', () => {
      const results: FileResult[] = [
        createFileResult({ file: 'pass.txt' }),
        createFileResult({
          file: 'fail.txt',
          positionValidation: {
            isValid: false,
            errors: ['Error'],
            warnings: []
          }
        })
      ];

      const report = generateMarkdownReport(results);

      // 1 pass, 1 fail = 50%
      expect(report).toContain('**Success rate:** 50.00%');
      expect(report).toContain('**Total files:** 2');
      expect(report).toContain('Total files with failures: 1');
    });

    it('should calculate 99% success rate correctly (99 pass, 1 fail)', () => {
      const results: FileResult[] = [];

      // 99 passing files
      for (let i = 0; i < 99; i++) {
        results.push(createFileResult({ file: `pass${i}.txt` }));
      }

      // 1 failing file
      results.push(createFileResult({
        file: 'fail.txt',
        positionValidation: {
          isValid: false,
          errors: ['Error'],
          warnings: []
        }
      }));

      const report = generateMarkdownReport(results);

      // 99/100 = 99.00%
      expect(report).toContain('**Success rate:** 99.00%');
      expect(report).toContain('**Total files:** 100');
      expect(report).toContain('Total files with failures: 1');
    });

    it('should calculate 1% success rate correctly (1 pass, 99 fail)', () => {
      const results: FileResult[] = [];

      // 1 passing file
      results.push(createFileResult({ file: 'pass.txt' }));

      // 99 failing files
      for (let i = 0; i < 99; i++) {
        results.push(createFileResult({
          file: `fail${i}.txt`,
          positionValidation: {
            isValid: false,
            errors: ['Error'],
            warnings: []
          }
        }));
      }

      const report = generateMarkdownReport(results);

      // 1/100 = 1.00%
      expect(report).toContain('**Success rate:** 1.00%');
      expect(report).toContain('**Total files:** 100');
      expect(report).toContain('Total files with failures: 99');
    });
  });

  describe('Performance metrics', () => {
    it('should calculate performance percentiles correctly', () => {
      // TODO: Issue #115 - Percentile uses Math.round() which may give unexpected results for small datasets
      // Current behavior: position = (percentile/100) * (length-1), then Math.round(position)
      // For [10, 20, 30, 40, 50]:
      // - p50: position = 0.5 * 4 = 2.0, Math.round(2.0) = 2, array[2] = 30 (correct median)
      // - p95: position = 0.95 * 4 = 3.8, Math.round(3.8) = 4, array[4] = 50
      const results: FileResult[] = [
        createFileResult({ tokenizeTime: 10 }),
        createFileResult({ tokenizeTime: 20 }),
        createFileResult({ tokenizeTime: 30 }),
        createFileResult({ tokenizeTime: 40 }),
        createFileResult({ tokenizeTime: 50 })
      ];

      const report = generateMarkdownReport(results);

      // p50 should be median (30)
      expect(report).toContain('**p50 (median):** 30.00ms');

      // Should contain performance metrics section
      expect(report).toContain('## Performance Metrics');
    });

    it('should detect performance outliers (>2x p95)', () => {
      // TODO: Issue #115 - Percentile calculation uses Math.round() which can give unexpected results
      // Current behavior: position = (percentile/100) * (length-1), then Math.round(position)
      //
      // Working fixture to create a detectable outlier:
      // 100 files: 99 at 10ms, 1 at 500ms
      // Sorted: [10, 10, 10, ..., 10, 500] (99 tens, then 500)
      // p95 position = (95/100) * 99 = 94.05, Math.round(94.05) = 94
      // p95 = array[94] = 10ms (since first 99 elements are all 10)
      // outlier threshold = 10 * 2 = 20ms
      // 500ms > 20ms = OUTLIER DETECTED
      const results: FileResult[] = [];

      // Add 99 fast files
      for (let i = 1; i <= 99; i++) {
        results.push(createFileResult({ file: `fast${i}.txt`, tokenizeTime: 10 }));
      }

      // Add 1 slow file
      results.push(createFileResult({ file: 'slow.txt', lines: 1000, tokenizeTime: 500 }));

      const report = generateMarkdownReport(results);

      // Should show outliers section
      expect(report).toContain('### Performance Outliers');
      expect(report).toContain('Found 1 file(s) with tokenization time >2x p95');
      expect(report).toContain('slow.txt');

      // Outlier table should contain the slow file
      expect(report).toMatch(/\| slow\.txt \| 1,?000 \| 500\.00 \| 500 \|/);
    });

    it('should not show outliers section when no outliers exist', () => {
      const results: FileResult[] = [
        createFileResult({ tokenizeTime: 10 }),
        createFileResult({ tokenizeTime: 11 }),
        createFileResult({ tokenizeTime: 12 }),
        createFileResult({ tokenizeTime: 13 })
      ];

      const report = generateMarkdownReport(results);

      // Should NOT show outliers section
      expect(report).not.toContain('Performance Outliers');
      expect(report).not.toContain('Found');
      expect(report).not.toContain('>2x p95');
    });
  });

  describe('Large numbers and formatting', () => {
    it('should handle large numbers with locale formatting', () => {
      const results: FileResult[] = [];

      // Create 10,000+ files
      for (let i = 0; i < 10000; i++) {
        results.push(createFileResult({
          file: `file${i}.txt`,
          lines: 100,
          tokenCount: 500
        }));
      }

      const report = generateMarkdownReport(results);

      // Use regex to match formatted numbers (locale-independent)
      // Accepts both "10,000" and "10.000" depending on locale
      expect(report).toMatch(/\*\*Total files:\*\* 10[,.]000/);
      expect(report).toMatch(/\*\*Total lines:\*\* 1[,.]000[,.]000/); // 10,000 * 100
      expect(report).toMatch(/\*\*Total tokens:\*\* 5[,.]000[,.]000/); // 10,000 * 500

      // Basic structure should still be present
      expect(report).toContain('# Lexer Health Report');
      expect(report).toContain('## Summary');
    });
  });

  describe('Report structure', () => {
    it('should include timestamp in correct ISO format', () => {
      const results: FileResult[] = [createFileResult()];
      const report = generateMarkdownReport(results);

      // Timestamp should match ISO format with mocked time
      expect(report).toMatch(/\*\*Generated:\*\* \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      expect(report).toContain('**Generated:** 2024-01-15T10:00:00.000Z');
    });

    it('should include proprietary data warning', () => {
      const results: FileResult[] = [createFileResult()];
      const report = generateMarkdownReport(results);

      // Should warn about proprietary content
      expect(report).toContain('**WARNING:**');
      expect(report).toContain('proprietary NAV objects');
      expect(report).toContain('Do not copy file names');
      expect(report).toContain('object IDs 6000000+');
    });

    it('should include all required sections for mixed results', () => {
      const results: FileResult[] = [
        createFileResult({ file: 'pass.txt' }),
        createFileResult({
          file: 'fail-position.txt',
          positionValidation: {
            isValid: false,
            errors: ['Position error'],
            warnings: ['Position warning']
          }
        }),
        createFileResult({
          file: 'fail-exit.txt',
          cleanExit: {
            passed: false,
            violations: [{
              category: ExitCategory.STACK_MISMATCH,
              message: 'Invalid state',
              expected: 'EOF',
              actual: 'IDENTIFIER'
            }],
            categories: new Set([ExitCategory.STACK_MISMATCH])
          }
        })
      ];

      const report = generateMarkdownReport(results);

      // Check all required sections exist
      expect(report).toContain('# Lexer Health Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Performance Metrics');
      expect(report).toContain('## Failures');
      expect(report).toContain('### Position Validation Failures');
      expect(report).toContain('### Clean Exit Failures');

      // Check file details are included
      expect(report).toContain('#### fail-position.txt');
      expect(report).toContain('**Errors:**');
      expect(report).toContain('Position error');
      expect(report).toContain('**Warnings:**');
      expect(report).toContain('Position warning');

      expect(report).toContain('#### fail-exit.txt');
      expect(report).toContain('**Violations:**');
      expect(report).toContain('**stack-mismatch:** Invalid state');
      expect(report).toContain('Expected: "EOF"');
      expect(report).toContain('Actual: "IDENTIFIER"');
    });
  });

  describe('escapeMarkdown', () => {
    it('should escape backslash', () => {
      expect(escapeMarkdown('test\\value')).toBe('test\\\\value');
    });

    it('should escape pipe', () => {
      expect(escapeMarkdown('test|value')).toBe('test\\|value');
    });

    it('should escape asterisk', () => {
      expect(escapeMarkdown('test*value')).toBe('test\\*value');
    });

    it('should escape underscore', () => {
      expect(escapeMarkdown('test_value')).toBe('test\\_value');
    });

    it('should escape backtick', () => {
      expect(escapeMarkdown('test`value')).toBe('test\\`value');
    });

    it('should escape square brackets', () => {
      expect(escapeMarkdown('test[value]')).toBe('test\\[value\\]');
    });

    it('should escape angle brackets', () => {
      expect(escapeMarkdown('test<value>')).toBe('test\\<value\\>');
    });

    it('should escape hash', () => {
      expect(escapeMarkdown('test#value')).toBe('test\\#value');
    });

    it('should escape backslash FIRST to prevent double-escaping', () => {
      // Critical test: backslash must be escaped before other characters
      // If backslash is not escaped first:
      //   "test\*value" -> "test\\*value" (escape backslash) -> "test\\\*value" (escape asterisk) WRONG!
      // If backslash IS escaped first:
      //   "test\*value" -> "test\\*value" (escape backslash) -> "test\\\\*value" (escape asterisk) CORRECT!
      expect(escapeMarkdown('test\\*value')).toBe('test\\\\\\*value');
    });

    it('should handle empty string', () => {
      expect(escapeMarkdown('')).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(escapeMarkdown('test value')).toBe('test value');
    });

    it('should handle all special characters combined', () => {
      const input = 'test\\|*_`[]<>#all';
      const expected = 'test\\\\\\|\\*\\_\\`\\[\\]\\<\\>\\#all';
      expect(escapeMarkdown(input)).toBe(expected);
    });
  });

  describe('JSON.stringify output escaping', () => {
    it('should escape markdown characters in violation expected/actual values', () => {
      const results: FileResult[] = [
        createFileResult({
          file: 'test.txt',
          cleanExit: {
            passed: false,
            violations: [{
              category: ExitCategory.STACK_MISMATCH,
              message: 'Stack mismatch with **markdown**',
              expected: 'Expected: *asterisk* and `backtick`',
              actual: 'Actual: _underscore_ and |pipe|'
            }],
            categories: new Set([ExitCategory.STACK_MISMATCH])
          }
        })
      ];

      const report = generateMarkdownReport(results);

      // Markdown characters in violation messages should be escaped
      expect(report).toContain('\\*\\*markdown\\*\\*');
      expect(report).toContain('\\*asterisk\\* and \\`backtick\\`');
      expect(report).toContain('\\_underscore\\_ and \\|pipe\\|');

      // Should still contain failure section
      expect(report).toContain('## Failures');
      expect(report).toContain('### Clean Exit Failures');
    });
  });
});
