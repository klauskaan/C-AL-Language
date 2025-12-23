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

    // Additional comprehensive tests for nested quoted identifiers

    it('should handle single escaped quote (just two double-quotes)', () => {
      // Four quotes: opening, two for escaped quote, closing
      const code = '""""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('"');
    });

    it('should handle escaped quotes in C/AL field expression context', () => {
      const code = 'CALCFIELDS("Field ""Name""");';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // CALCFIELDS ( "Field ""Name""" ) ;
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('CALCFIELDS');
      expect(tokens[1].type).toBe(TokenType.LeftParen);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('Field "Name"');
      expect(tokens[3].type).toBe(TokenType.RightParen);
      expect(tokens[4].type).toBe(TokenType.Semicolon);
    });

    it('should handle escaped quotes in assignment context', () => {
      const code = '"Field ""Value""" := \'Text\';';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field "Value"');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('Text');
    });

    it('should handle multiple identifiers with escaped quotes in same expression', () => {
      const code = '"A ""B""" + "C ""D"""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('A "B"');
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('C "D"');
    });

    it('should handle escaped quotes combined with special characters', () => {
      const code = '"Field-""Name"" (LCY)"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field-"Name" (LCY)');
    });

    it('should handle escaped quotes with spaces around them', () => {
      const code = '"Before "" After"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Before " After');
    });

    it('should handle consecutive escaped quote pairs', () => {
      // Six quotes inside: three escaped quotes
      const code = '"A""""""B"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('A"""B');
    });

    it('should correctly track position for identifier with escaped quotes', () => {
      const code = '"A""B"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(6);
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
    });

    it('should correctly track position when escaped quotes affect length', () => {
      const code = '"X""Y" "Z"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // First token: "X""Y" (6 characters in source, but value is X"Y which is 3 chars)
      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(6);
      expect(tokens[0].value).toBe('X"Y');

      // Second token: "Z" starts at position 7
      expect(tokens[1].startOffset).toBe(7);
      expect(tokens[1].endOffset).toBe(10);
      expect(tokens[1].value).toBe('Z');
    });

    it('should handle escaped quotes in realistic NAV field name', () => {
      // Realistic example: a field that references another field with quotes
      const code = '"Sales ""Line No."""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Sales "Line No."');
    });

    it('should handle complex nested pattern with mixed content', () => {
      const code = '"Field ""A"" - ""B"" Test"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field "A" - "B" Test');
    });

    it('should handle escaped quotes followed by regular identifier', () => {
      const code = '"Quoted""" SimpleField';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Quoted"');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('SimpleField');
    });

    it('should handle escaped quotes in IF statement context', () => {
      const code = 'IF "Field ""Name""" > 0 THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Field "Name"');
      expect(tokens[2].type).toBe(TokenType.Greater);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[3].value).toBe('0');
      expect(tokens[4].type).toBe(TokenType.Then);
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
