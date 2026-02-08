/**
 * Markdown Escaping Utility Tests
 *
 * Tests for the escapeMarkdown utility that safely escapes markdown special characters
 * in diagnostic messages and hover information displayed to users.
 *
 * Purpose:
 * - Escape markdown special characters to prevent formatting issues in LSP messages
 * - Convert all newline types (LF, CRLF, CR) to visible \n for clarity
 * - Critical: Backslash must be escaped FIRST to prevent double-escaping
 *
 * Key Requirements:
 * - Escape these markdown characters: | * _ ` [ ] < > # ~ \
 * - Normalize all newlines to visible \n
 * - Handle edge cases: empty strings, no special chars, backslash ordering
 */

import { escapeMarkdown } from '../escapeMarkdown';

describe('escapeMarkdown', () => {
  describe('basic markdown character escaping', () => {
    it('should escape pipe character', () => {
      expect(escapeMarkdown('a|b')).toBe('a\\|b');
    });

    it('should escape asterisk', () => {
      expect(escapeMarkdown('a*b')).toBe('a\\*b');
    });

    it('should escape underscore', () => {
      expect(escapeMarkdown('a_b')).toBe('a\\_b');
    });

    it('should escape backtick', () => {
      expect(escapeMarkdown('a`b')).toBe('a\\`b');
    });

    it('should escape opening square bracket', () => {
      expect(escapeMarkdown('a[b')).toBe('a\\[b');
    });

    it('should escape closing square bracket', () => {
      expect(escapeMarkdown('a]b')).toBe('a\\]b');
    });

    it('should escape opening angle bracket', () => {
      expect(escapeMarkdown('a<b')).toBe('a\\<b');
    });

    it('should escape closing angle bracket', () => {
      expect(escapeMarkdown('a>b')).toBe('a\\>b');
    });

    it('should escape hash symbol', () => {
      expect(escapeMarkdown('a#b')).toBe('a\\#b');
    });

    it('should escape tilde', () => {
      expect(escapeMarkdown('a~b')).toBe('a\\~b');
    });

    it('should escape all markdown special characters combined', () => {
      const input = '|*_`[]<>#~';
      const expected = '\\|\\*\\_\\`\\[\\]\\<\\>\\#\\~';
      expect(escapeMarkdown(input)).toBe(expected);
    });
  });

  describe('backslash escaping', () => {
    // CRITICAL: Backslash must be escaped FIRST to prevent double-escaping
    // If we escape other characters first, we'd turn "a*b" -> "a\*b" -> "a\\*b" (wrong!)
    // Correct order: "a\b" -> "a\\b", then "a*b" -> "a\*b"
    it('should escape backslash character', () => {
      expect(escapeMarkdown('a\\b')).toBe('a\\\\b');
    });

    it('should escape backslash before escaping other characters', () => {
      // Input: "a\*b" (backslash followed by asterisk)
      // Correct: "a\\\\\\*b" (escaped backslash + escaped asterisk)
      // Wrong: "a\\*b" (if asterisk escaped first, backslash second)
      expect(escapeMarkdown('a\\*b')).toBe('a\\\\\\*b');
    });

    it('should handle multiple backslashes', () => {
      expect(escapeMarkdown('a\\\\b')).toBe('a\\\\\\\\b');
    });
  });

  describe('newline handling', () => {
    it('should convert Unix newline (LF) to visible \\n', () => {
      expect(escapeMarkdown('line1\nline2')).toBe('line1\\nline2');
    });

    it('should convert Windows newline (CRLF) to visible \\n', () => {
      expect(escapeMarkdown('line1\r\nline2')).toBe('line1\\nline2');
    });

    it('should convert old Mac newline (CR) to visible \\n', () => {
      expect(escapeMarkdown('line1\rline2')).toBe('line1\\nline2');
    });

    it('should handle mixed newline types in same string', () => {
      const input = 'unix\nwindows\r\nmac\rend';
      const expected = 'unix\\nwindows\\nmac\\nend';
      expect(escapeMarkdown(input)).toBe(expected);
    });

    it('should handle multiple consecutive newlines', () => {
      expect(escapeMarkdown('a\n\nb')).toBe('a\\n\\nb');
      expect(escapeMarkdown('a\r\n\r\nb')).toBe('a\\n\\nb');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(escapeMarkdown('')).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(escapeMarkdown('hello world')).toBe('hello world');
    });

    it('should handle string with only alphanumeric characters', () => {
      expect(escapeMarkdown('ABC123xyz')).toBe('ABC123xyz');
    });

    it('should handle string with only spaces', () => {
      expect(escapeMarkdown('   ')).toBe('   ');
    });
  });

  describe('complex scenarios', () => {
    it('should handle literal backslash followed by actual newline', () => {
      // Input has both a backslash character AND a newline
      expect(escapeMarkdown('text\\\nmore')).toBe('text\\\\\\nmore');
    });

    it('should handle realistic error message with multiple special characters', () => {
      const input = 'Expected <identifier> but got "*" at line 5';
      const expected = 'Expected \\<identifier\\> but got "\\*" at line 5';
      expect(escapeMarkdown(input)).toBe(expected);
    });

    it('should handle C/AL code snippet with various characters', () => {
      const input = 'PROCEDURE Test(Var: Record 18)\nBEGIN\n  IF (Amount > 0) THEN\nEND;';
      const expected = 'PROCEDURE Test(Var: Record 18)\\nBEGIN\\n  IF (Amount \\> 0) THEN\\nEND;';
      expect(escapeMarkdown(input)).toBe(expected);
    });

    it('should handle markdown-heavy syntax', () => {
      const input = '**bold** _italic_ `code` [link](url) <tag>';
      const expected = '\\*\\*bold\\*\\* \\_italic\\_ \\`code\\` \\[link\\](url) \\<tag\\>';
      expect(escapeMarkdown(input)).toBe(expected);
    });

    it('should handle mixed special characters and newlines', () => {
      const input = 'Error: Field <Name> is|invalid\nCheck value: [1..10]';
      const expected = 'Error: Field \\<Name\\> is\\|invalid\\nCheck value: \\[1..10\\]';
      expect(escapeMarkdown(input)).toBe(expected);
    });
  });

  describe('escaping order verification', () => {
    // This test verifies that backslash is escaped FIRST
    // If order is wrong, this test will catch it
    it('should produce correct output when input contains backslash and other special chars', () => {
      const testCases = [
        { input: '\\|', expected: '\\\\\\|' },  // backslash + pipe
        { input: '\\*', expected: '\\\\\\*' },  // backslash + asterisk
        { input: '\\_', expected: '\\\\\\_' },  // backslash + underscore
        { input: '\\`', expected: '\\\\\\`' },  // backslash + backtick
        { input: '\\[', expected: '\\\\\\[' },  // backslash + bracket
      ];

      testCases.forEach(({ input, expected }) => {
        expect(escapeMarkdown(input)).toBe(expected);
      });
    });
  });
});
