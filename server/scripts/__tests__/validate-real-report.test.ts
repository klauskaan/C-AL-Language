/**
 * Tests for generateMarkdownReport function in validate-real.ts
 *
 * Tests cover all markdown escaping issues from investigation:
 * - Line 105: Object type in table (e.g., "T|B" from filename)
 * - Line 117: Filename in table with pipe characters
 * - Line 128: Filename in header with # characters
 * - Line 132: Error message in list with markdown syntax
 *
 * Tests were written to fail first (TDD), then implementation was added.
 * Tests now verify escaping works correctly.
 */

import { generateMarkdownReport, ValidationResult } from '../validate-real';
import { escapeMarkdown } from '../../src/utils/escapeMarkdown';

// Mock timers for deterministic timestamps
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));

/**
 * Factory function to create ValidationResult objects with sensible defaults.
 */
function createValidationResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    file: 'test.txt',
    lines: 100,
    parseTime: 10,
    errors: [],
    ...overrides
  };
}

describe('generateMarkdownReport (validate-real.ts)', () => {
  describe('Line 105 - Object type in table', () => {
    it('should escape pipe in object type (first 3 chars of filename)', () => {
      // Filename: "T|B12345.TXT" -> object type is "T|B"
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'T|B12345.TXT',
          errors: [
            { line: 1, column: 1, message: 'Test error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Should escape pipe in object type column
      expect(report).toContain('| T\\|B |');
      // Should not contain unescaped pipe (which breaks table)
      expect(report).not.toContain('| T|B |');
    });

    it('should escape asterisk in object type', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'T*B12345.TXT',
          errors: [
            { line: 1, column: 1, message: 'Test error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Should escape asterisk in object type
      expect(report).toContain('| T\\*B |');
      expect(report).not.toContain('| T*B |');
    });

    it('should escape underscore in object type', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'T_B12345.TXT',
          errors: [
            { line: 1, column: 1, message: 'Test error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Should escape underscore in object type
      expect(report).toContain('| T\\_B |');
      expect(report).not.toContain('| T_B |');
    });
  });

  describe('Line 117 - Filename in table', () => {
    it('should escape pipe in filename in "Top 20" table', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'file|with|pipes.txt',
          errors: [
            { line: 1, column: 1, message: 'Test error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Filename appears in markdown link format: [display](url)
      // Display text should be escaped, URL should NOT be escaped
      expect(report).toContain('[file\\|with\\|pipes.txt](test/REAL/file|with|pipes.txt)');
    });

    it('should escape asterisk in filename in table', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'file*asterisk.txt',
          errors: [
            { line: 1, column: 1, message: 'Test error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Asterisk in display text should be escaped
      expect(report).toContain('[file\\*asterisk.txt](test/REAL/file*asterisk.txt)');
    });

    it('should escape square brackets in filename', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'file[bracket].txt',
          errors: [
            { line: 1, column: 1, message: 'Test error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Brackets in display text should be escaped (breaks markdown links)
      expect(report).toContain('[file\\[bracket\\].txt](test/REAL/file[bracket].txt)');
    });
  });

  describe('Line 128 - Filename in header', () => {
    it('should escape hash in filename in h3 header', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'file#hash.txt',
          errors: [
            { line: 1, column: 1, message: 'Test error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Header format: ### [filename](url) (X errors)
      // Hash in display text should be escaped
      expect(report).toContain('### [file\\#hash.txt](test/REAL/file#hash.txt)');

      // Should not create unintended nested header
      expect(report).not.toMatch(/###\s+\[file#hash\.txt\]/);
    });

    it('should escape pipe in filename in header', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'file|pipe.txt',
          errors: [
            { line: 1, column: 1, message: 'Test error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Pipe in header display text should be escaped
      expect(report).toContain('### [file\\|pipe.txt](test/REAL/file|pipe.txt)');
    });

    it('should escape asterisk in filename in header', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'file*star.txt',
          errors: [
            { line: 1, column: 1, message: 'Test error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Asterisk in header display text should be escaped
      expect(report).toContain('### [file\\*star.txt](test/REAL/file*star.txt)');
    });
  });

  describe('Line 132 - Error message in list', () => {
    it('should escape markdown bold syntax in error message', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'test.txt',
          errors: [
            { line: 10, column: 5, message: 'Expected **bold** text' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Error message should have escaped asterisks
      expect(report).toContain('Expected \\*\\*bold\\*\\* text');
      // Should not render as bold
      expect(report).not.toContain('Expected **bold** text');
    });

    it('should escape markdown italic syntax in error message', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'test.txt',
          errors: [
            { line: 10, column: 5, message: 'Expected _italic_ text' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Underscores should be escaped
      expect(report).toContain('Expected \\_italic\\_ text');
      expect(report).not.toContain('Expected _italic_ text');
    });

    it('should escape markdown code syntax in error message', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'test.txt',
          errors: [
            { line: 10, column: 5, message: 'Expected `code` block' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Backticks should be escaped
      expect(report).toContain('Expected \\`code\\` block');
      expect(report).not.toContain('Expected `code` block');
    });

    it('should escape multiple markdown constructs in error message', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'test.txt',
          errors: [
            { line: 10, column: 5, message: 'Error: **bold** _italic_ `code` [link]' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // All special characters should be escaped
      expect(report).toContain('Error: \\*\\*bold\\*\\* \\_italic\\_ \\`code\\` \\[link\\]');
    });

    it('should escape pipe in error message', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'test.txt',
          errors: [
            { line: 10, column: 5, message: 'Expected OR (|) operator' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Pipe should be escaped
      expect(report).toContain('Expected OR (\\|) operator');
    });
  });

  describe('Integration - Special characters in all four locations', () => {
    it('should escape special characters in all affected report sections', () => {
      // This comprehensive test covers all four locations:
      // 1. Object type in table (line 105)
      // 2. Filename in "Top 20" table (line 117)
      // 3. Filename in detailed header (line 128)
      // 4. Error message in list (line 132)

      const results: ValidationResult[] = [
        createValidationResult({
          file: 'T|B12345#Special[File].txt', // Special chars in filename
          lines: 500,
          parseTime: 250,
          errors: [
            {
              line: 10,
              column: 5,
              message: 'Parse error: Expected **END** but got _BEGIN_' // Special chars in error
            },
            {
              line: 20,
              column: 8,
              message: 'Syntax error with `backticks` and |pipes|'
            }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // 1. Object type should be escaped (line 105)
      expect(report).toContain('| T\\|B |');

      // 2. Filename in table should be escaped (line 117)
      expect(report).toContain('[T\\|B12345\\#Special\\[File\\].txt](test/REAL/T|B12345#Special[File].txt)');

      // 3. Filename in header should be escaped (line 128)
      expect(report).toContain('### [T\\|B12345\\#Special\\[File\\].txt](test/REAL/T|B12345#Special[File].txt)');

      // 4. Error messages should be escaped (line 132)
      expect(report).toContain('Expected \\*\\*END\\*\\* but got \\_BEGIN\\_');
      expect(report).toContain('Syntax error with \\`backticks\\` and \\|pipes\\|');

      // Verify report structure is intact
      expect(report).toContain('# C/AL Parser Validation Report');
      expect(report).toContain('## Error Distribution by Object Type');
      expect(report).toContain('## Top 20 Files with Most Errors');
      expect(report).toContain('## Detailed Error Listings');
    });

    it('should handle backslash escaping correctly to prevent double-escaping', () => {
      // Critical test: backslash in filename or error message
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'file\\with\\backslash.txt',
          errors: [
            { line: 10, column: 5, message: 'Path error: C:\\NAV\\Data' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Backslash should be escaped (doubled)
      expect(report).toContain('file\\\\with\\\\backslash.txt');
      expect(report).toContain('Path error: C:\\\\NAV\\\\Data');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty error message', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'test.txt',
          errors: [
            { line: 1, column: 1, message: '' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // Should not crash on empty message
      expect(report).toContain('# C/AL Parser Validation Report');
      expect(report).toContain('test.txt');
    });

    it('should handle filename with only special characters', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: '|*_#[].txt',
          errors: [
            { line: 1, column: 1, message: 'Error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      // All special characters should be escaped in display text
      expect(report).toContain('\\|\\*\\_\\#\\[\\].txt');
    });

    it('should handle successful parsing (no errors) without escaping issues', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'file|with|pipe.txt',
          errors: [] // No errors, file parsed successfully
        })
      ];

      const report = generateMarkdownReport(results);

      // Should show success message
      expect(report).toContain('🎉 **All files parsed successfully!**');
      // No detail sections should appear (early return in success case)
      expect(report).not.toContain('## Error Distribution');
    });
  });

  describe('Report structure validation', () => {
    it('should include timestamp in correct ISO format', () => {
      const results: ValidationResult[] = [createValidationResult()];
      const report = generateMarkdownReport(results);

      expect(report).toMatch(/\*\*Generated:\*\* \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      expect(report).toContain('**Generated:** 2024-01-15T10:00:00.000Z');
    });

    it('should include all required sections for results with errors', () => {
      const results: ValidationResult[] = [
        createValidationResult({
          file: 'test.txt',
          errors: [
            { line: 1, column: 1, message: 'Error' }
          ]
        })
      ];

      const report = generateMarkdownReport(results);

      expect(report).toContain('# C/AL Parser Validation Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Error Distribution by Object Type');
      expect(report).toContain('## Top 20 Files with Most Errors');
      expect(report).toContain('## Detailed Error Listings');
    });
  });
});
