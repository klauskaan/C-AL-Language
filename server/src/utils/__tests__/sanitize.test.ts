/**
 * Sanitization Utility Tests
 *
 * Tests for the sanitization utility that prevents code leakage in error messages,
 * test output, and diagnostic messages.
 *
 * TDD Principle: These tests MUST FAIL initially since the utility doesn't exist yet.
 *
 * Purpose:
 * - Prevent proprietary C/AL code from appearing in logs/errors
 * - Provide safe metadata (length, offset, char codes) instead of content
 * - Used in lexer/parser error messages and test diagnostics
 *
 * Security Requirement:
 * - ZERO content leakage - input strings must NEVER appear in output
 * - Only metadata (length, position, character codes) is safe
 */

import {
  sanitizeContent,
  sanitizeComparison,
  sanitizeChar,
  stripPaths
} from '../sanitize';

describe('Sanitization Utility', () => {
  describe('sanitizeContent', () => {
    describe('Basic functionality', () => {
      it('should sanitize simple content without offset', () => {
        const result = sanitizeContent('x := 5;');

        expect(result).toBe('[content sanitized, 7 chars]');
        expect(result).not.toContain('x');
        expect(result).not.toContain(':=');
        expect(result).not.toContain('5');
      });

      it('should sanitize content with offset', () => {
        const result = sanitizeContent('x := 5;', { offset: 42 });

        expect(result).toBe('[content sanitized, 7 chars at offset 42]');
        expect(result).not.toContain('x');
        expect(result).not.toContain(':=');
        expect(result).not.toContain('5');
      });

      it('should sanitize content with maxDisplay limit', () => {
        const longContent = 'TEMPORARY Customer : Record 18;';
        const result = sanitizeContent(longContent, { maxDisplay: 10 });

        // Should still report full length, not displayed length
        expect(result).toBe('[content sanitized, 31 chars]');
        expect(result).not.toContain('TEMPORARY');
        expect(result).not.toContain('Customer');
        expect(result).not.toContain('Record');
      });

      it('should sanitize content with both offset and maxDisplay', () => {
        const result = sanitizeContent('TEMPORARY Customer', { offset: 100, maxDisplay: 5 });

        expect(result).toBe('[content sanitized, 18 chars at offset 100]');
        expect(result).not.toContain('TEMPORARY');
        expect(result).not.toContain('Customer');
      });
    });

    describe('Zero content leakage - security critical', () => {
      it('should NOT leak variable names', () => {
        const variableName = 'MySecretVariableName';
        const result = sanitizeContent(variableName);

        expect(result).not.toContain(variableName);
        expect(result).not.toContain('Secret');
        expect(result).not.toContain('Variable');
      });

      it('should NOT leak C/AL keywords', () => {
        const keywords = 'TEMPORARY PROCEDURE BEGIN END';
        const result = sanitizeContent(keywords);

        expect(result).not.toContain('TEMPORARY');
        expect(result).not.toContain('PROCEDURE');
        expect(result).not.toContain('BEGIN');
        expect(result).not.toContain('END');
      });

      it('should NOT leak string literals', () => {
        const stringLiteral = "'Customer not found'";
        const result = sanitizeContent(stringLiteral);

        expect(result).not.toContain('Customer');
        expect(result).not.toContain('not found');
      });

      it('should NOT leak numeric literals', () => {
        const numeric = '12345.67';
        const result = sanitizeContent(numeric);

        expect(result).not.toContain('12345');
        expect(result).not.toContain('.67');
      });

      it('should NOT leak operators', () => {
        const operators = ':= + - * / <> >= <=';
        const result = sanitizeContent(operators);

        expect(result).not.toContain(':=');
        expect(result).not.toContain('<>');
        expect(result).not.toContain('>=');
        expect(result).not.toContain('<=');
      });

      it('should NOT leak partial content via substring matching', () => {
        const content = 'CustomerTableRecord';
        const result = sanitizeContent(content);

        // Check no partial matches
        expect(result).not.toContain('Customer');
        expect(result).not.toContain('Table');
        expect(result).not.toContain('Record');
        expect(result).not.toContain('Cust');
        expect(result).not.toContain('Rec');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        const result = sanitizeContent('');

        expect(result).toBe('[content sanitized, 0 chars]');
      });

      it('should handle single character', () => {
        const result = sanitizeContent('A');

        expect(result).toBe('[content sanitized, 1 chars]');
        expect(result).not.toContain('A');
      });

      it('should handle whitespace-only content', () => {
        const result = sanitizeContent('   \t\n  ');

        expect(result).toBe('[content sanitized, 7 chars]');
      });

      it('should handle Unicode characters', () => {
        const unicode = 'Opgørelse'; // Danish: ø = U+00F8
        const result = sanitizeContent(unicode);

        expect(result).toBe('[content sanitized, 9 chars]');
        expect(result).not.toContain('ø');
        expect(result).not.toContain('Opgørelse');
      });

      it('should handle multi-byte Unicode correctly', () => {
        const emoji = '🚀 Launch'; // Emoji = 2 code units
        const result = sanitizeContent(emoji);

        // Should count JavaScript string length (code units)
        expect(result).toBe('[content sanitized, 9 chars]');
        expect(result).not.toContain('🚀');
        expect(result).not.toContain('Launch');
      });

      it('should handle very long content (1000+ chars)', () => {
        const longContent = 'X'.repeat(1000);
        const result = sanitizeContent(longContent);

        expect(result).toBe('[content sanitized, 1000 chars]');
        expect(result).not.toContain('X');
      });

      it('should handle content with only symbols', () => {
        const symbols = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
        const result = sanitizeContent(symbols);

        expect(result).toBe('[content sanitized, 30 chars]');
        // Ensure no symbols leaked
        expect(result).not.toContain('@');
        expect(result).not.toContain('#');
        expect(result).not.toContain('$');
      });

      it('should handle newlines and special characters', () => {
        const multiline = 'Line1\nLine2\rLine3\r\nLine4';
        const result = sanitizeContent(multiline);

        expect(result).toBe('[content sanitized, 24 chars]');
        expect(result).not.toContain('Line1');
        expect(result).not.toContain('Line2');
      });

      it('should handle offset of 0', () => {
        const result = sanitizeContent('content', { offset: 0 });

        expect(result).toBe('[content sanitized, 7 chars at offset 0]');
      });

      it('should handle large offset values', () => {
        const result = sanitizeContent('x', { offset: 999999 });

        expect(result).toBe('[content sanitized, 1 chars at offset 999999]');
      });
    });

    describe('Real-world C/AL scenarios', () => {
      it('should sanitize table declaration', () => {
        const tableDecl = 'OBJECT Table 18 Customer';
        const result = sanitizeContent(tableDecl);

        expect(result).toBe('[content sanitized, 24 chars]');
        expect(result).not.toContain('Customer');
        expect(result).not.toContain('18');
      });

      it('should sanitize field definition', () => {
        const field = '{ 1   ;   ;No.                 ;Code20        }';
        const result = sanitizeContent(field);

        expect(result).toBe('[content sanitized, 47 chars]');
        expect(result).not.toContain('No.');
        expect(result).not.toContain('Code20');
      });

      it('should sanitize procedure signature', () => {
        const proc = 'PROCEDURE CalculateTotal(Amount : Decimal) : Decimal;';
        const result = sanitizeContent(proc);

        expect(result).toBe('[content sanitized, 53 chars]');
        expect(result).not.toContain('CalculateTotal');
        expect(result).not.toContain('Amount');
        expect(result).not.toContain('Decimal');
      });

      it('should sanitize variable declaration with TEMPORARY', () => {
        const varDecl = 'TEMPORARY Customer : Record 18;';
        const result = sanitizeContent(varDecl);

        expect(result).toBe('[content sanitized, 31 chars]');
        expect(result).not.toContain('TEMPORARY');
        expect(result).not.toContain('Customer');
      });
    });

    describe('Metadata format validation', () => {
      it('should follow consistent format pattern', () => {
        const result1 = sanitizeContent('test');
        const result2 = sanitizeContent('different', { offset: 50 });

        // Check pattern: [content sanitized, N chars] or [content sanitized, N chars at offset M]
        expect(result1).toMatch(/^\[content sanitized, \d+ chars\]$/);
        expect(result2).toMatch(/^\[content sanitized, \d+ chars at offset \d+\]$/);
      });

      it('should handle plural/singular correctly', () => {
        const single = sanitizeContent('X');
        const multiple = sanitizeContent('XY');

        // Both should use "chars" consistently
        expect(single).toContain('1 chars');
        expect(multiple).toContain('2 chars');
      });
    });
  });

  describe('sanitizeComparison', () => {
    describe('Basic functionality', () => {
      it('should sanitize comparison without offset', () => {
        const result = sanitizeComparison('Customer', 'Cust');

        expect(result).toBe('[token value mismatch: expected 8 chars, got 4 chars]');
        expect(result).not.toContain('Customer');
        expect(result).not.toContain('Cust');
      });

      it('should sanitize comparison with offset', () => {
        const result = sanitizeComparison('Customer', 'Cust', 100);

        expect(result).toBe('[token value mismatch: expected 8 chars, got 4 chars at offset 100]');
        expect(result).not.toContain('Customer');
        expect(result).not.toContain('Cust');
      });
    });

    describe('Zero content leakage - security critical', () => {
      it('should NOT leak expected value', () => {
        const expected = 'SecretKeyword';
        const actual = 'PUBLIC';
        const result = sanitizeComparison(expected, actual);

        expect(result).not.toContain('Secret');
        expect(result).not.toContain('Keyword');
        expect(result).not.toContain(expected);
      });

      it('should NOT leak actual value', () => {
        const expected = 'EXPECTED';
        const actual = 'ActualSecret';
        const result = sanitizeComparison(expected, actual);

        expect(result).not.toContain('Actual');
        expect(result).not.toContain('Secret');
        expect(result).not.toContain(actual);
      });

      it('should NOT leak when values are identical', () => {
        const value = 'IdenticalSecret';
        const result = sanitizeComparison(value, value);

        expect(result).not.toContain('Identical');
        expect(result).not.toContain('Secret');
        expect(result).not.toContain(value);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty strings', () => {
        const result = sanitizeComparison('', '');

        expect(result).toBe('[token value mismatch: expected 0 chars, got 0 chars]');
      });

      it('should handle expected empty, actual non-empty', () => {
        const result = sanitizeComparison('', 'content');

        expect(result).toBe('[token value mismatch: expected 0 chars, got 7 chars]');
        expect(result).not.toContain('content');
      });

      it('should handle expected non-empty, actual empty', () => {
        const result = sanitizeComparison('content', '');

        expect(result).toBe('[token value mismatch: expected 7 chars, got 0 chars]');
        expect(result).not.toContain('content');
      });

      it('should handle very different lengths', () => {
        const short = 'X';
        const long = 'Y'.repeat(1000);
        const result = sanitizeComparison(long, short);

        expect(result).toBe('[token value mismatch: expected 1000 chars, got 1 chars]');
        expect(result).not.toContain('X');
        expect(result).not.toContain('Y');
      });

      it('should handle Unicode in both values', () => {
        const expected = 'Opgørelse'; // 9 chars
        const actual = 'Opg';        // 3 chars
        const result = sanitizeComparison(expected, actual);

        expect(result).toBe('[token value mismatch: expected 9 chars, got 3 chars]');
        expect(result).not.toContain('ø');
        expect(result).not.toContain('Opgørelse');
        expect(result).not.toContain('Opg');
      });

      it('should handle offset 0', () => {
        const result = sanitizeComparison('ABC', 'XYZ', 0);

        expect(result).toBe('[token value mismatch: expected 3 chars, got 3 chars at offset 0]');
      });
    });

    describe('Real-world token comparison scenarios', () => {
      it('should sanitize keyword mismatch', () => {
        const result = sanitizeComparison('PROCEDURE', 'FUNCTION', 42);

        expect(result).toBe('[token value mismatch: expected 9 chars, got 8 chars at offset 42]');
        expect(result).not.toContain('PROCEDURE');
        expect(result).not.toContain('FUNCTION');
      });

      it('should sanitize identifier mismatch', () => {
        const result = sanitizeComparison('CustomerRec', 'Customer', 100);

        expect(result).toBe('[token value mismatch: expected 11 chars, got 8 chars at offset 100]');
        expect(result).not.toContain('CustomerRec');
        expect(result).not.toContain('Customer');
      });

      it('should sanitize same-length different content', () => {
        const result = sanitizeComparison('BEGIN', 'UNTIL', 50);

        expect(result).toBe('[token value mismatch: expected 5 chars, got 5 chars at offset 50]');
        expect(result).not.toContain('BEGIN');
        expect(result).not.toContain('UNTIL');
      });
    });

    describe('Format validation', () => {
      it('should follow consistent format pattern', () => {
        const result1 = sanitizeComparison('A', 'B');
        const result2 = sanitizeComparison('A', 'B', 50);

        expect(result1).toMatch(/^\[token value mismatch: expected \d+ chars, got \d+ chars\]$/);
        expect(result2).toMatch(/^\[token value mismatch: expected \d+ chars, got \d+ chars at offset \d+\]$/);
      });
    });
  });

  describe('sanitizeChar', () => {
    describe('Basic functionality', () => {
      it('should sanitize ASCII letter', () => {
        const result = sanitizeChar('A');

        expect(result).toBe('[char sanitized, code 65]');
        expect(result).not.toContain('A');
      });

      it('should sanitize ASCII digit', () => {
        const result = sanitizeChar('5');

        expect(result).toBe('[char sanitized, code 53]');
        // Note: '5' appears in the char code '53', so we cannot assert not.toContain('5')
      });

      it('should sanitize ASCII symbol', () => {
        const result = sanitizeChar('@');

        expect(result).toBe('[char sanitized, code 64]');
        expect(result).not.toContain('@');
      });

      it('should sanitize space', () => {
        const result = sanitizeChar(' ');

        expect(result).toBe('[char sanitized, code 32]');
      });
    });

    describe('Zero content leakage - security critical', () => {
      it('should NOT leak the character', () => {
        const char = 'X';
        const result = sanitizeChar(char);

        expect(result).not.toContain('X');
        expect(result).toContain('88'); // char code for 'X'
      });

      it('should NOT leak special characters', () => {
        const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*'];

        for (const char of specialChars) {
          const result = sanitizeChar(char);
          expect(result).not.toContain(char);
          expect(result).toContain('code');
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle null character', () => {
        const result = sanitizeChar('\0');

        expect(result).toBe('[char sanitized, code 0]');
      });

      it('should handle newline', () => {
        const result = sanitizeChar('\n');

        expect(result).toBe('[char sanitized, code 10]');
      });

      it('should handle carriage return', () => {
        const result = sanitizeChar('\r');

        expect(result).toBe('[char sanitized, code 13]');
      });

      it('should handle tab', () => {
        const result = sanitizeChar('\t');

        expect(result).toBe('[char sanitized, code 9]');
      });

      it('should handle backspace', () => {
        const result = sanitizeChar('\b');

        expect(result).toBe('[char sanitized, code 8]');
      });
    });

    describe('Unicode characters', () => {
      it('should sanitize Danish ø', () => {
        const result = sanitizeChar('ø');

        expect(result).toBe('[char sanitized, code 248]'); // U+00F8 = 248
        expect(result).not.toContain('ø');
      });

      it('should sanitize Danish æ', () => {
        const result = sanitizeChar('æ');

        expect(result).toBe('[char sanitized, code 230]'); // U+00E6 = 230
        expect(result).not.toContain('æ');
      });

      it('should sanitize Danish å', () => {
        const result = sanitizeChar('å');

        expect(result).toBe('[char sanitized, code 229]'); // U+00E5 = 229
        expect(result).not.toContain('å');
      });

      it('should sanitize German ü', () => {
        const result = sanitizeChar('ü');

        expect(result).toBe('[char sanitized, code 252]'); // U+00FC = 252
        expect(result).not.toContain('ü');
      });

      it('should sanitize emoji (first code unit)', () => {
        const emoji = '🚀';
        const result = sanitizeChar(emoji);

        // Should get first code unit of surrogate pair
        const codeUnit = emoji.charCodeAt(0);
        expect(result).toBe(`[char sanitized, code ${codeUnit}]`);
        expect(result).not.toContain('🚀');
      });
    });

    describe('C/AL specific characters', () => {
      it('should sanitize colon', () => {
        const result = sanitizeChar(':');

        expect(result).toBe('[char sanitized, code 58]');
        expect(result).not.toContain(':');
      });

      it('should sanitize semicolon', () => {
        const result = sanitizeChar(';');

        expect(result).toBe('[char sanitized, code 59]');
        expect(result).not.toContain(';');
      });

      it('should sanitize dot/period', () => {
        const result = sanitizeChar('.');

        expect(result).toBe('[char sanitized, code 46]');
        expect(result).not.toContain('.');
      });

      it('should sanitize curly brace', () => {
        const result = sanitizeChar('{');

        expect(result).toBe('[char sanitized, code 123]');
        expect(result).not.toContain('{');
      });

      it('should sanitize square bracket', () => {
        const result = sanitizeChar('[');

        expect(result).toBe('[char sanitized, code 91]');
      });

      it('should sanitize single quote', () => {
        const result = sanitizeChar("'");

        expect(result).toBe('[char sanitized, code 39]');
        expect(result).not.toContain("'");
      });
    });

    describe('Format validation', () => {
      it('should follow consistent format pattern', () => {
        const result = sanitizeChar('Z');

        expect(result).toMatch(/^\[char sanitized, code \d+\]$/);
      });

      it('should handle all printable ASCII characters', () => {
        // ASCII 32-126 are printable
        for (let code = 32; code <= 126; code++) {
          const char = String.fromCharCode(code);
          const result = sanitizeChar(char);

          expect(result).toBe(`[char sanitized, code ${code}]`);
          // Note: Cannot assert not.toContain(char) because some chars appear in their own codes
          // e.g., '3' has code 51, '2' has code 50, etc.
        }
      });

      it('should handle all control characters (0-31)', () => {
        for (let code = 0; code < 32; code++) {
          const char = String.fromCharCode(code);
          const result = sanitizeChar(char);

          expect(result).toBe(`[char sanitized, code ${code}]`);
        }
      });
    });

    describe('Multi-character input handling', () => {
      it('should only process first character of string', () => {
        const result = sanitizeChar('ABC');

        // Should only show first char code (A = 65)
        expect(result).toBe('[char sanitized, code 65]');
        expect(result).not.toContain('ABC');
        expect(result).not.toContain('B');
        expect(result).not.toContain('C');
      });
    });
  });

  describe('Snapshot tests for format stability', () => {
    it('should maintain stable output format for sanitizeContent', () => {
      const samples = [
        sanitizeContent('x := 5;'),
        sanitizeContent('x := 5;', { offset: 42 }),
        sanitizeContent('TEMPORARY Customer : Record 18;'),
        sanitizeContent(''),
        sanitizeContent('A')
      ];

      expect(samples).toMatchSnapshot();
    });

    it('should maintain stable output format for sanitizeComparison', () => {
      const samples = [
        sanitizeComparison('Customer', 'Cust'),
        sanitizeComparison('Customer', 'Cust', 100),
        sanitizeComparison('PROCEDURE', 'FUNCTION', 42),
        sanitizeComparison('', ''),
        sanitizeComparison('X', 'Y'.repeat(1000))
      ];

      expect(samples).toMatchSnapshot();
    });

    it('should maintain stable output format for sanitizeChar', () => {
      const samples = [
        sanitizeChar('A'),
        sanitizeChar('5'),
        sanitizeChar('@'),
        sanitizeChar(' '),
        sanitizeChar('\n'),
        sanitizeChar('ø'),
        sanitizeChar('\0')
      ];

      expect(samples).toMatchSnapshot();
    });
  });

  describe('Integration scenarios', () => {
    it('should work together in error message construction', () => {
      const position = 42;
      const expectedToken = 'PROCEDURE';
      const actualToken = 'FUNCTION';
      const currentChar = 'F';

      const comparisonMsg = sanitizeComparison(expectedToken, actualToken, position);
      const charMsg = sanitizeChar(currentChar);

      // Build error message (would be done by lexer/parser)
      const errorMsg = `${comparisonMsg} - started with ${charMsg}`;

      // Verify no content leaked
      expect(errorMsg).not.toContain('PROCEDURE');
      expect(errorMsg).not.toContain('FUNCTION');
      expect(errorMsg).not.toContain('F');

      // Verify metadata present
      expect(errorMsg).toContain('at offset 42');
      expect(errorMsg).toContain('code 70'); // 'F' = 70
    });

    it('should handle nested sanitization calls', () => {
      const content = 'MySecretVariable';
      const sanitized1 = sanitizeContent(content);
      const sanitized2 = sanitizeContent(sanitized1);

      // Double sanitization should not leak original
      expect(sanitized1).not.toContain('Secret');
      expect(sanitized2).not.toContain('Secret');

      // Second sanitization should report length of first sanitization output
      expect(sanitized2).toContain('chars]');
    });
  });

  describe('stripPaths', () => {
    describe('Unix path redaction', () => {
      it('should redact basic Unix path', () => {
        const result = stripPaths('test/REAL/file.txt');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Unix path with nested directories', () => {
        const result = stripPaths('test/REAL/Codeunit/Object.txt');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Unix path without trailing content', () => {
        const result = stripPaths('test/REAL');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Unix path with trailing slash', () => {
        const result = stripPaths('test/REAL/');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Unix path in error context', () => {
        const result = stripPaths('Error at test/REAL/foo.cal:42');

        expect(result).toBe('Error at <REDACTED>:42');
      });
    });

    describe('Windows path redaction', () => {
      it('should redact basic Windows path', () => {
        const result = stripPaths('test\\REAL\\file.txt');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Windows path with nested directories', () => {
        const result = stripPaths('test\\REAL\\Codeunit\\Object.txt');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Windows path without trailing content', () => {
        const result = stripPaths('test\\REAL');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Windows path with trailing backslash', () => {
        const result = stripPaths('test\\REAL\\');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Windows path in error context', () => {
        const result = stripPaths('Error at test\\REAL\\foo.cal:42');

        expect(result).toBe('Error at <REDACTED>:42');
      });
    });

    describe('Case variation handling', () => {
      it('should redact TEST/REAL (uppercase test)', () => {
        const result = stripPaths('TEST/REAL/file.txt');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact test/Real (mixed case REAL)', () => {
        const result = stripPaths('test/Real/file.txt');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Test/real (capitalized test, lowercase REAL)', () => {
        const result = stripPaths('Test/real/file.txt');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact TeSt/ReAl (random case)', () => {
        const result = stripPaths('TeSt/ReAl/file.txt');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact TEST\\REAL (Windows, uppercase)', () => {
        const result = stripPaths('TEST\\REAL\\file.txt');

        expect(result).toBe('<REDACTED>');
      });

      it('should redact Test\\Real (Windows, mixed case)', () => {
        const result = stripPaths('Test\\Real\\file.txt');

        expect(result).toBe('<REDACTED>');
      });
    });

    describe('Multiple occurrences', () => {
      it('should redact multiple Unix paths', () => {
        const result = stripPaths('test/REAL/a and test/REAL/b');

        expect(result).toBe('<REDACTED> and <REDACTED>');
      });

      it('should redact multiple Windows paths', () => {
        const result = stripPaths('test\\REAL\\a and test\\REAL\\b');

        expect(result).toBe('<REDACTED> and <REDACTED>');
      });

      it('should redact mixed Unix and Windows paths', () => {
        const result = stripPaths('test/REAL/a and test\\REAL\\b');

        expect(result).toBe('<REDACTED> and <REDACTED>');
      });

      it('should redact multiple paths with different cases', () => {
        const result = stripPaths('test/REAL/a and TEST/Real/b and Test/real/c');

        expect(result).toBe('<REDACTED> and <REDACTED> and <REDACTED>');
      });
    });

    describe('Negative cases - should NOT redact', () => {
      it('should NOT redact when test and REAL have no separator', () => {
        const result = stripPaths('testXREAL.txt');

        expect(result).toBe('testXREAL.txt');
      });

      it('should NOT redact when prefix is not test', () => {
        const result = stripPaths('context/REAL/file.txt');

        expect(result).toBe('context/REAL/file.txt');
      });

      it('should NOT redact when test is not standalone', () => {
        const result = stripPaths('mytest/REAL/foo');

        expect(result).toBe('mytest/REAL/foo');
      });

      it('should NOT redact when test has word boundary issue', () => {
        const result = stripPaths('retest/REAL/foo');

        expect(result).toBe('retest/REAL/foo');
      });

      it('should NOT redact partial matches', () => {
        const result = stripPaths('testing/REALITY/file.txt');

        expect(result).toBe('testing/REALITY/file.txt');
      });

      it('should NOT redact when REAL is not preceded by test', () => {
        const result = stripPaths('data/REAL/file.txt');

        expect(result).toBe('data/REAL/file.txt');
      });

      it('should NOT redact when test is prefixed with underscore', () => {
        const result = stripPaths('_test/REAL/foo');

        expect(result).toBe('_test/REAL/foo');
      });

      it('should NOT redact when test is prefixed with a digit', () => {
        const result = stripPaths('2test/REAL/foo');

        expect(result).toBe('2test/REAL/foo');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        const result = stripPaths('');

        expect(result).toBe('');
      });

      it('should handle string with no paths', () => {
        const result = stripPaths('No paths here');

        expect(result).toBe('No paths here');
      });

      it('should handle just test/REAL with no path components', () => {
        const result = stripPaths('test/REAL');

        expect(result).toBe('<REDACTED>');
      });

      it('should handle path at start of string', () => {
        const result = stripPaths('test/REAL/file.txt in error');

        expect(result).toBe('<REDACTED> in error');
      });

      it('should handle path at end of string', () => {
        const result = stripPaths('Found in test/REAL/file.txt');

        expect(result).toBe('Found in <REDACTED>');
      });

      it('should preserve content after redacted path', () => {
        const result = stripPaths('test/REAL/file.txt:42:10');

        expect(result).toBe('<REDACTED>:42:10');
      });

      it('should handle mixed separators in same path (should not occur in practice)', () => {
        const result = stripPaths('test/REAL\\file.txt');

        // Should redact test/REAL part
        expect(result).toContain('<REDACTED>');
      });
    });

    describe('Real-world error message scenarios', () => {
      it('should redact path in lexer error', () => {
        const result = stripPaths('Unexpected token at test/REAL/Table50000.txt:12:5');

        expect(result).toBe('Unexpected token at <REDACTED>:12:5');
      });

      it('should redact path in parser error', () => {
        const result = stripPaths('Parse error in test/REAL/Codeunit80000.txt: Expected END');

        expect(result).toBe('Parse error in <REDACTED>: Expected END');
      });

      it('should redact path in stack trace style message', () => {
        const result = stripPaths('  at Parser.parse (test/REAL/file.cal:42:10)');

        expect(result).toBe('  at Parser.parse (<REDACTED>:42:10)');
      });

      it('should redact multiple paths in comparison message', () => {
        const result = stripPaths('Diff between test/REAL/a.cal and test/REAL/b.cal');

        expect(result).toBe('Diff between <REDACTED> and <REDACTED>');
      });

      it('should redact Windows path in error', () => {
        const result = stripPaths('File not found: test\\REAL\\Table18.txt');

        expect(result).toBe('File not found: <REDACTED>');
      });
    });

    describe('Zero content leakage - security critical', () => {
      it('should NOT leak directory names after test/REAL', () => {
        const result = stripPaths('test/REAL/Codeunit/MySecretCode.txt');

        expect(result).not.toContain('Codeunit');
        expect(result).not.toContain('Secret');
        expect(result).not.toContain('Code.txt');
      });

      it('should NOT leak filename after redaction', () => {
        const result = stripPaths('Error in test/REAL/ProprietaryObject.cal');

        expect(result).not.toContain('Proprietary');
        expect(result).not.toContain('Object');
        expect(result).not.toContain('.cal');
      });

      it('should NOT leak object IDs in paths', () => {
        const result = stripPaths('test/REAL/Codeunit6000000.txt');

        expect(result).not.toContain('6000000');
        expect(result).not.toContain('Codeunit');
      });

      it('should only show redaction marker', () => {
        const result = stripPaths('test/REAL/VerySecretInternalCode.txt');

        expect(result).toBe('<REDACTED>');
        expect(result).not.toContain('test');
        expect(result).not.toContain('REAL');
        expect(result).not.toContain('Secret');
      });
    });

    describe('Format validation', () => {
      it('should use consistent redaction marker', () => {
        const result1 = stripPaths('test/REAL/a.txt');
        const result2 = stripPaths('test\\REAL\\b.txt');
        const result3 = stripPaths('TEST/REAL/c.txt');

        expect(result1).toBe('<REDACTED>');
        expect(result2).toBe('<REDACTED>');
        expect(result3).toBe('<REDACTED>');
      });

      it('should preserve non-path content exactly', () => {
        const result = stripPaths('Error: Something at test/REAL/file.txt failed');

        expect(result).toBe('Error: Something at <REDACTED> failed');
      });
    });
  });
});
