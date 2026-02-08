/**
 * C/AL String Unescaping Utility Tests
 *
 * Tests for the unescapeCalString utility that converts C/AL escaped strings
 * to their literal values by replacing doubled single quotes ('') with single quotes (').
 *
 * Purpose:
 * - Convert C/AL string escaping ('') to actual single quotes (')
 * - Handle edge cases: empty strings, consecutive escapes, boundary positions
 * - Critical for hover providers and string literal analysis
 *
 * C/AL String Escaping Rules:
 * - Single quotes within strings are escaped by doubling them
 * - Example: 'It''s working' represents the string "It's working"
 * - Input to this function is the content WITHOUT surrounding quotes
 */

import { unescapeCalString } from '../string';

describe('unescapeCalString', () => {
  describe('basic unescaping', () => {
    it('should return empty string unchanged', () => {
      expect(unescapeCalString('')).toBe('');
    });

    it('should return string with no escaped quotes unchanged', () => {
      expect(unescapeCalString('Hello')).toBe('Hello');
    });

    it('should convert single escaped quote to single quote', () => {
      expect(unescapeCalString("It''s")).toBe("It's");
    });

    it('should convert single pair of quotes to single quote', () => {
      expect(unescapeCalString("''")).toBe("'");
    });
  });

  describe('multiple escaped quotes', () => {
    it('should convert multiple escaped quotes in one string', () => {
      expect(unescapeCalString("Don''t say ''hello''")).toBe("Don't say 'hello'");
    });

    it('should convert multiple consecutive escaped quotes', () => {
      expect(unescapeCalString("''''")).toBe("''");
    });

    it('should convert string with only escaped quotes', () => {
      expect(unescapeCalString("''''''")).toBe("'''");
    });
  });

  describe('boundary positions', () => {
    it('should handle escaped quote at start of string', () => {
      expect(unescapeCalString("''Hello")).toBe("'Hello");
    });

    it('should handle escaped quote at end of string', () => {
      expect(unescapeCalString("Hello''")).toBe("Hello'");
    });

    it('should handle escaped quotes at both start and end', () => {
      expect(unescapeCalString("''text''")).toBe("'text'");
    });
  });

  describe('complex scenarios', () => {
    it('should handle realistic C/AL error message', () => {
      expect(unescapeCalString("The customer''s address is invalid")).toBe("The customer's address is invalid");
    });

    it('should handle multiple escaped quotes in sentence', () => {
      expect(unescapeCalString("It''s John''s book")).toBe("It's John's book");
    });

    it('should handle consecutive and non-consecutive escaped quotes', () => {
      expect(unescapeCalString("''''Hello'' World''")).toBe("''Hello' World'");
    });

    it('should handle long string with many escaped quotes', () => {
      const input = "Don''t worry, it''s not that we''re unprepared";
      const expected = "Don't worry, it's not that we're unprepared";
      expect(unescapeCalString(input)).toBe(expected);
    });
  });

  describe('edge cases with other characters', () => {
    it('should not affect other special characters', () => {
      expect(unescapeCalString('Hello "World"')).toBe('Hello "World"');
    });

    it('should not affect backslashes', () => {
      expect(unescapeCalString('C:\\Path\\File')).toBe('C:\\Path\\File');
    });

    it('should handle escaped quotes mixed with other punctuation', () => {
      expect(unescapeCalString("It''s working! (Really?)")).toBe("It's working! (Really?)");
    });

    it('should handle numbers and escaped quotes', () => {
      expect(unescapeCalString("Customer''s balance: 123.45")).toBe("Customer's balance: 123.45");
    });
  });

  describe('realistic C/AL string literals', () => {
    it('should handle typical C/AL message string', () => {
      // Common pattern: MESSAGE('Customer''s name is %1',Name);
      expect(unescapeCalString("Customer''s name is %1")).toBe("Customer's name is %1");
    });

    it('should handle C/AL validation message', () => {
      expect(unescapeCalString("You can''t delete this record")).toBe("You can't delete this record");
    });

    it('should handle C/AL confirmation dialog', () => {
      expect(unescapeCalString("Do you want to save the customer''s changes?")).toBe("Do you want to save the customer's changes?");
    });

    it('should handle string with possessive and contraction', () => {
      expect(unescapeCalString("The user''s password can''t be empty")).toBe("The user's password can't be empty");
    });
  });

  describe('performance and stress cases', () => {
    it('should handle very long string efficiently', () => {
      const input = 'a'.repeat(1000) + "''" + 'b'.repeat(1000);
      const expected = 'a'.repeat(1000) + "'" + 'b'.repeat(1000);
      expect(unescapeCalString(input)).toBe(expected);
    });

    it('should handle many escaped quotes efficiently', () => {
      const input = "''".repeat(100);
      const expected = "'".repeat(100);
      expect(unescapeCalString(input)).toBe(expected);
    });
  });
});
