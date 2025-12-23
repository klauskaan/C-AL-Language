/**
 * Lexer Tests - Edge Cases
 *
 * Tests for lexer edge cases including:
 * - Nested quoted identifiers with escaped quotes
 * - Unicode characters in identifiers
 * - Very long identifiers (over 30 characters)
 *
 * These tests ensure the lexer handles unusual but valid C/AL code
 * without crashing or producing incorrect tokens.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Edge Cases', () => {
  describe('Nested quoted identifiers with escaped quotes', () => {
    it('should handle escaped quotes in identifiers', () => {
      const code = '"Field with ""quotes"" inside"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field with "quotes" inside');
    });

    it('should handle multiple escaped quotes', () => {
      const code = '"A ""B"" C ""D"" E"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('A "B" C "D" E');
    });

    it('should handle adjacent escaped quotes', () => {
      const code = '"Test""""Value"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Test""Value');
    });

    it('should handle escaped quote at the start', () => {
      const code = '"""QuotedStart"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('"QuotedStart');
    });

    it('should handle escaped quote at the end', () => {
      const code = '"QuotedEnd"""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('QuotedEnd"');
    });

    it('should handle only escaped quotes', () => {
      const code = '""""""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Three sets of "" -> two escaped quotes
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('""');
    });
  });

  describe('Unicode characters in identifiers', () => {
    it('should handle Scandinavian characters', () => {
      const code = '"Kundenr."';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Kundenr.');
    });

    it('should handle German umlauts', () => {
      const code = '"Betr\u00e4g"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Betr\u00e4g');
    });

    it('should handle accented characters', () => {
      const code = '"Caf\u00e9 Name"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Caf\u00e9 Name');
    });

    it('should handle mixed Unicode and ASCII', () => {
      const code = '"Order \u00d8rder 123"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Order \u00d8rder 123');
    });

    it('should handle Unicode in string literals', () => {
      const code = "'Caf\u00e9 au lait'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Caf\u00e9 au lait');
    });

    it('should handle extended Latin characters', () => {
      const code = '"\u0141\u00f3d\u017a"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('\u0141\u00f3d\u017a');
    });

    it('should handle unquoted identifiers with Unicode', () => {
      const code = 'Kund\u00f8r';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Behavior depends on lexer implementation - should not crash
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Very long identifiers', () => {
    it('should handle identifiers over 30 characters', () => {
      const code = '"ThisIsAVeryLongIdentifierNameThatExceedsThirtyCharacters"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('ThisIsAVeryLongIdentifierNameThatExceedsThirtyCharacters');
    });

    it('should handle identifiers with 100+ characters', () => {
      const longName = 'A'.repeat(100);
      const code = `"${longName}"`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe(longName);
    });

    it('should handle long identifiers with spaces', () => {
      const code = '"This Is A Very Long Field Name With Many Words In It Exceeding Normal Limits"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('This Is A Very Long Field Name With Many Words In It Exceeding Normal Limits');
    });

    it('should handle long unquoted identifiers', () => {
      const longName = 'VeryLongIdentifierWithoutSpaces' + 'AndMoreCharacters'.repeat(5);
      const code = longName;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe(longName);
    });

    it('should handle long string literals', () => {
      const longString = 'This is a very long string literal that exceeds normal message lengths';
      const code = `'${longString}'`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe(longString);
    });

    it('should correctly track position for long identifiers', () => {
      const longName = 'VeryLongIdentifier'.repeat(3);
      const code = `"${longName}"`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(code.length);
    });
  });

  describe('Zero-length and whitespace identifiers', () => {
    it('should handle empty quoted identifier', () => {
      const code = '""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('');
    });

    it('should handle whitespace-only quoted identifier', () => {
      const code = '"   "';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('   ');
    });

    it('should handle tab characters in quoted identifier', () => {
      const code = '"Tab\tHere"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Tab\tHere');
    });
  });

  describe('Special character handling', () => {
    it('should handle quoted identifiers with single quotes inside', () => {
      const code = '"Field\'s Value"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe("Field's Value");
    });

    it('should handle strings with double quotes inside', () => {
      const code = '\'Text with "quotes" inside\'';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Text with "quotes" inside');
    });

    it('should handle identifiers with underscores', () => {
      const code = '"Field_Name_With_Underscores"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field_Name_With_Underscores');
    });

    it('should handle identifiers with dots', () => {
      const code = '"Field.Name.With.Dots"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field.Name.With.Dots');
    });

    it('should handle identifiers with parentheses', () => {
      const code = '"Amount (LCY)"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Amount (LCY)');
    });

    it('should handle identifiers with percentage signs', () => {
      const code = '"Line Discount %"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Line Discount %');
    });
  });

  describe('Position tracking edge cases', () => {
    it('should correctly track position after escaped quotes', () => {
      const code = '"A""B" "C"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(6);
      expect(tokens[1].startOffset).toBe(7);
      expect(tokens[1].endOffset).toBe(10);
    });

    it('should correctly track line numbers with multiline preceding content', () => {
      const code = '\n\n"Field"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].line).toBe(3);
      expect(tokens[0].column).toBe(1);
    });

    it('should correctly track column with preceding whitespace', () => {
      const code = '    "Field"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(5);
    });
  });
});
