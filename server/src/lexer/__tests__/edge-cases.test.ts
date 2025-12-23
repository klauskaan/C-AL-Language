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
      const code = '"Beträg"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Beträg');
    });

    it('should handle accented characters', () => {
      const code = '"Café Name"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Café Name');
    });

    it('should handle mixed Unicode and ASCII', () => {
      const code = '"Order Ørder 123"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Order Ørder 123');
    });

    it('should handle Unicode in string literals', () => {
      const code = "'Café au lait'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Café au lait');
    });

    it('should handle extended Latin characters', () => {
      const code = '"Łódź"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Łódź');
    });

    it('should handle unquoted identifiers with Unicode', () => {
      const code = 'Kundør';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Behavior depends on lexer implementation - should not crash
      expect(tokens.length).toBeGreaterThan(0);
    });

    // Additional comprehensive Unicode tests

    it('should handle Danish/Norwegian specific characters (æøå)', () => {
      const code = '"Køb Æble Ålborg"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Køb Æble Ålborg');
    });

    it('should handle Swedish specific characters (åäö)', () => {
      const code = '"Försäljning Årsredovisning"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Försäljning Årsredovisning');
    });

    it('should handle Spanish characters (ñ, ¿, ¡)', () => {
      const code = '"Año España"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Año España');
    });

    it('should handle French characters (ç, œ, ê)', () => {
      const code = '"Français Cœur Fenêtre"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Français Cœur Fenêtre');
    });

    it('should handle German sharp S (ß)', () => {
      const code = '"Straße Größe"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Straße Größe');
    });

    it('should handle Icelandic characters (þ, ð)', () => {
      const code = '"Þetta Maður"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Þetta Maður');
    });

    it('should handle Greek characters', () => {
      const code = '"Αλφα Βήτα Γάμα"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Αλφα Βήτα Γάμα');
    });

    it('should handle Cyrillic characters', () => {
      const code = '"Привет Мир"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Привет Мир');
    });

    it('should handle Chinese characters', () => {
      const code = '"客户名称"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('客户名称');
    });

    it('should handle Japanese characters (hiragana)', () => {
      const code = '"こんにちは"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('こんにちは');
    });

    it('should handle Japanese characters (katakana)', () => {
      const code = '"カタカナ"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('カタカナ');
    });

    it('should handle Korean characters', () => {
      const code = '"안녕하세요"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('안녕하세요');
    });

    it('should handle Arabic characters', () => {
      const code = '"مرحبا"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('مرحبا');
    });

    it('should handle Hebrew characters', () => {
      const code = '"שלום"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('שלום');
    });

    it('should handle Thai characters', () => {
      const code = '"สวัสดี"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('สวัสดี');
    });

    it('should handle currency symbols', () => {
      const code = '"Price € Amount £ Value ¥"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Price € Amount £ Value ¥');
    });

    it('should handle mathematical symbols', () => {
      const code = '"Formula ∑ ∏ ∞"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Formula ∑ ∏ ∞');
    });

    it('should handle superscript and subscript characters', () => {
      const code = '"Value² H₂O"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Value² H₂O');
    });

    it('should handle Unicode in realistic NAV field context', () => {
      const code = '"Beløb (DKK)"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Beløb (DKK)');
    });

    it('should handle Unicode with escaped quotes', () => {
      const code = '"Café ""au lait"""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Café "au lait"');
    });

    it('should handle multiple Unicode identifiers in expression', () => {
      const code = '"Beløb" + "Mængde" - "Pris"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Beløb');
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('Mængde');
      expect(tokens[3].type).toBe(TokenType.Minus);
      expect(tokens[4].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[4].value).toBe('Pris');
    });

    it('should handle Unicode in assignment with string literal', () => {
      const code = '"Kundenavn" := \'Müller & Søn\';';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Kundenavn');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('Müller & Søn');
    });

    it('should handle Unicode in CALCFIELDS context', () => {
      const code = 'CALCFIELDS("Beløb");';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('CALCFIELDS');
      expect(tokens[1].type).toBe(TokenType.LeftParen);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('Beløb');
      expect(tokens[3].type).toBe(TokenType.RightParen);
      expect(tokens[4].type).toBe(TokenType.Semicolon);
    });

    it('should handle Unicode in IF statement context', () => {
      const code = 'IF "Beløb" > 0 THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Beløb');
      expect(tokens[2].type).toBe(TokenType.Greater);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[3].value).toBe('0');
      expect(tokens[4].type).toBe(TokenType.Then);
    });

    it('should handle emojis in quoted identifiers', () => {
      const code = '"Status 🔵"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Status 🔵');
    });

    it('should handle emojis in string literals', () => {
      const code = "'Hello 👋 World 🌍'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Hello 👋 World 🌍');
    });

    it('should handle zero-width characters gracefully', () => {
      // Zero-width space (U+200B) between A and B
      const code = '"A\u200BB"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      // The zero-width space should be preserved
      expect(tokens[0].value).toBe('A\u200BB');
    });

    it('should handle right-to-left override characters', () => {
      // Contains RTL override character
      const code = '"Field\u202EValue"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field\u202EValue');
    });

    it('should handle combining diacritical marks', () => {
      // e followed by combining acute accent (é constructed differently)
      const code = '"Cafe\u0301"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Cafe\u0301');
    });

    it('should handle Unicode string with escaped quotes', () => {
      const code = "'Müller''s Café'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("Müller's Café");
    });

    it('should preserve Unicode character integrity in long identifiers', () => {
      const code = '"ÆØÅ Længere Identifier Med Mange Danske Tegn ÆØÅ"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('ÆØÅ Længere Identifier Med Mange Danske Tegn ÆØÅ');
    });

    it('should handle mixed scripts in single identifier', () => {
      // Mix of Latin, Cyrillic, and Greek
      const code = '"Field Поле Πεδίο"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field Поле Πεδίο');
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

    // Additional comprehensive tests for very long identifiers

    it('should handle identifiers with exactly 30 characters', () => {
      const code = '"ABCDEFGHIJKLMNOPQRSTUVWXYZabcd"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZabcd');
      expect(tokens[0].value.length).toBe(30);
    });

    it('should handle identifiers with exactly 31 characters', () => {
      const code = '"ABCDEFGHIJKLMNOPQRSTUVWXYZabcde"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZabcde');
      expect(tokens[0].value.length).toBe(31);
    });

    it('should handle identifiers with 500+ characters', () => {
      const longName = 'X'.repeat(500);
      const code = `"${longName}"`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe(longName);
      expect(tokens[0].value.length).toBe(500);
    });

    it('should handle identifiers with 1000+ characters', () => {
      const longName = 'Y'.repeat(1000);
      const code = `"${longName}"`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe(longName);
      expect(tokens[0].value.length).toBe(1000);
    });

    it('should handle realistic long NAV field name', () => {
      const code = '"Outstanding Purchase Order Line Amount Including VAT (LCY)"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Outstanding Purchase Order Line Amount Including VAT (LCY)');
    });

    it('should handle long identifier with special characters', () => {
      const code = '"Very-Long_Field.Name (With Special) Characters % In It!"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Very-Long_Field.Name (With Special) Characters % In It!');
    });

    it('should handle long identifier with Unicode characters', () => {
      const code = '"Sehr Langer Feldname Mit Vielen Umlauten äöü Und Anderen Zeichen ÆØÅ"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Sehr Langer Feldname Mit Vielen Umlauten äöü Und Anderen Zeichen ÆØÅ');
    });

    it('should handle long identifier with escaped quotes', () => {
      const code = '"Very Long Field Name With ""Escaped Quotes"" That Exceeds Thirty Characters"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Very Long Field Name With "Escaped Quotes" That Exceeds Thirty Characters');
    });

    it('should handle long identifier in assignment context', () => {
      const code = '"ThisIsAVeryLongIdentifierNameThatExceedsThirtyCharacters" := 0;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('ThisIsAVeryLongIdentifierNameThatExceedsThirtyCharacters');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[3].type).toBe(TokenType.Semicolon);
    });

    it('should handle long identifier in CALCFIELDS context', () => {
      const code = 'CALCFIELDS("Outstanding Purchase Order Line Amount Including VAT");';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('CALCFIELDS');
      expect(tokens[1].type).toBe(TokenType.LeftParen);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('Outstanding Purchase Order Line Amount Including VAT');
      expect(tokens[3].type).toBe(TokenType.RightParen);
      expect(tokens[4].type).toBe(TokenType.Semicolon);
    });

    it('should handle long identifier in IF statement context', () => {
      const code = 'IF "ThisIsAVeryLongIdentifierNameExceedingThirtyCharacters" > 0 THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('ThisIsAVeryLongIdentifierNameExceedingThirtyCharacters');
      expect(tokens[2].type).toBe(TokenType.Greater);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[4].type).toBe(TokenType.Then);
    });

    it('should handle multiple long identifiers in expression', () => {
      const code = '"FirstVeryLongIdentifierOverThirtyCharacters" + "SecondVeryLongIdentifierOverThirtyCharacters"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('FirstVeryLongIdentifierOverThirtyCharacters');
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('SecondVeryLongIdentifierOverThirtyCharacters');
    });

    it('should handle long string literals with 500+ characters', () => {
      const longString = 'S'.repeat(500);
      const code = `'${longString}'`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe(longString);
      expect(tokens[0].value.length).toBe(500);
    });

    it('should handle long string literals with escaped quotes', () => {
      const code = "'This is a very long string literal that has ''escaped quotes'' and exceeds thirty characters easily'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("This is a very long string literal that has 'escaped quotes' and exceeds thirty characters easily");
    });

    it('should correctly track position for very long identifiers with escaped quotes', () => {
      const code = '"Long ""Escaped"" Identifier With Many Characters And Double Quotes Inside"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(code.length);
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
    });

    it('should handle long unquoted identifier followed by operators', () => {
      const longName = 'VeryLongIdentifierWithoutAnySpacesOrSpecialCharacters';
      const code = `${longName} := 100;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe(longName);
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[2].value).toBe('100');
    });

    it('should handle long identifier at end of file without newline', () => {
      const longName = 'LongIdentifierAtEndOfFileWithNoNewline'.repeat(2);
      const code = `"${longName}"`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe(longName);
      // Should have EOF token
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    it('should handle repeating pattern in long identifier', () => {
      const pattern = 'ABC123';
      const longName = pattern.repeat(20);
      const code = `"${longName}"`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe(longName);
      expect(tokens[0].value.length).toBe(120);
    });

    it('should handle long identifier with numbers throughout', () => {
      const code = '"Field123Name456With789Numbers012Throughout345ThisLongIdentifier"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field123Name456With789Numbers012Throughout345ThisLongIdentifier');
    });

    it('should handle long identifier in realistic table field context', () => {
      const code = 'Rec."Prepayment Invoice Line Amount Including VAT Excl. Discount (LCY)" := 0;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Rec');
      expect(tokens[1].type).toBe(TokenType.Dot);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('Prepayment Invoice Line Amount Including VAT Excl. Discount (LCY)');
      expect(tokens[3].type).toBe(TokenType.Assign);
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

  describe('Adjacent escaped quotes - comprehensive tests', () => {
    // Tests for double-quote escaped sequences in identifiers

    it('should handle four consecutive escaped quotes (two escaped quotes)', () => {
      const code = '"Test""""""""End"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      // 8 quotes inside = 4 escaped quotes
      expect(tokens[0].value).toBe('Test""""End');
    });

    it('should handle escaped quote immediately after opening quote', () => {
      const code = '""""A"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('"A');
    });

    it('should handle escaped quote immediately before closing quote', () => {
      const code = '"A""""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('A"');
    });

    it('should handle alternating escaped quotes and text', () => {
      const code = '"A""B""C""D""E"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('A"B"C"D"E');
    });

    it('should handle maximum density of escaped quotes', () => {
      // Every other position is an escaped quote
      const code = '""""""""""';  // 10 quotes = empty + 4 escaped quotes
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('""""');
    });

    it('should correctly track position with multiple adjacent escaped quotes', () => {
      const code = '"A""""B" "C"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // First token: "A""""B" is 8 characters in source, value is A""B
      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(8);
      expect(tokens[0].value).toBe('A""B');

      // Second token: "C" starts at position 9
      expect(tokens[1].startOffset).toBe(9);
      expect(tokens[1].endOffset).toBe(12);
      expect(tokens[1].value).toBe('C');
    });

    it('should handle escaped quotes at multiple positions', () => {
      const code = '"""Middle""End"""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('"Middle"End"');
    });

    it('should handle adjacent identifiers both with escaped quotes', () => {
      const code = '"A""" "B"""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('A"');
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('B"');
    });
  });

  describe('Adjacent escaped quotes in strings - comprehensive tests', () => {
    // Tests for single-quote escaped sequences in strings

    it('should handle adjacent escaped single quotes in strings', () => {
      const code = "'Test''''Value'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("Test''Value");
    });

    it('should handle escaped quote at start of string', () => {
      const code = "''''Start'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("'Start");
    });

    it('should handle escaped quote at end of string', () => {
      const code = "'End''''";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("End'");
    });

    it('should handle string with only escaped quotes', () => {
      const code = "''''''";  // 6 quotes = empty + 2 escaped quotes
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("''");
    });

    it('should handle single escaped quote (just two single-quotes)', () => {
      const code = "''''";  // 4 quotes = opening, two for escaped quote, closing
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("'");
    });

    it('should handle multiple escaped quotes throughout string', () => {
      const code = "'It''s John''s car''s door'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("It's John's car's door");
    });

    it('should handle consecutive escaped quote pairs in string', () => {
      const code = "'A''''''B'";  // A followed by 3 escaped quotes, then B
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("A'''B");
    });

    it('should correctly track position for strings with escaped quotes', () => {
      const code = "'A''B' 'C'";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(6);
      expect(tokens[0].value).toBe("A'B");

      expect(tokens[1].startOffset).toBe(7);
      expect(tokens[1].endOffset).toBe(10);
      expect(tokens[1].value).toBe('C');
    });
  });

  describe('Mixed quote type edge cases', () => {
    it('should handle identifier with single quotes and string with double quotes', () => {
      const code = '"Field\'s Name" := \'He said "hello"\'';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe("Field's Name");
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('He said "hello"');
    });

    it('should handle complex expression with both escaped quote types', () => {
      const code = '"Field ""Name""" := \'Value''s content\';';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field "Name"');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe("Value's content");
      expect(tokens[3].type).toBe(TokenType.Semicolon);
    });

    it('should handle adjacent string and identifier with escaped quotes', () => {
      const code = "'Text''s'" + ' "Field"""';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe("Text's");
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Field"');
    });

    it('should handle identifier with embedded double quote followed by string with embedded single quote', () => {
      const code = 'IF "He ""said""" = \'It\'\'s true\' THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('He "said"');
      expect(tokens[2].type).toBe(TokenType.Equal);
      expect(tokens[3].type).toBe(TokenType.String);
      expect(tokens[3].value).toBe("It's true");
      expect(tokens[4].type).toBe(TokenType.Then);
    });
  });

  describe('Boundary and stress edge cases', () => {
    it('should handle identifier followed immediately by keyword without space', () => {
      // This should tokenize as identifier containing "Field", then IF keyword
      // because identifiers cannot contain "IF" directly
      const code = '"Field"IF';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field');
      expect(tokens[1].type).toBe(TokenType.If);
    });

    it('should handle string followed immediately by keyword without space', () => {
      const code = "'Text'IF";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Text');
      expect(tokens[1].type).toBe(TokenType.If);
    });

    it('should handle identifier followed by operator without space', () => {
      const code = '"Field":=0';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Integer);
    });

    it('should handle string followed by operator without space', () => {
      const code = "'Text'+0";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('Text');
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.Integer);
    });

    it('should handle very long identifier with many escaped quotes', () => {
      // Create a pattern with escaped quotes distributed throughout
      const code = '"Start "" Middle "" More "" Text "" End"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Start " Middle " More " Text " End');
    });

    it('should handle identifier containing only escaped quotes of various lengths', () => {
      // 2 quotes inside = 1 escaped quote
      const code1 = '""""';
      let lexer = new Lexer(code1);
      let tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('"');

      // 4 quotes inside = 2 escaped quotes
      const code2 = '""""""';
      lexer = new Lexer(code2);
      tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('""');

      // 6 quotes inside = 3 escaped quotes
      const code3 = '""""""""';
      lexer = new Lexer(code3);
      tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('"""');
    });

    it('should handle alternating identifiers and strings in complex expression', () => {
      const code = '"A" + \'B\' + "C" + \'D\' + "E"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('A');
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('B');
      expect(tokens[3].type).toBe(TokenType.Plus);
      expect(tokens[4].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[4].value).toBe('C');
      expect(tokens[5].type).toBe(TokenType.Plus);
      expect(tokens[6].type).toBe(TokenType.String);
      expect(tokens[6].value).toBe('D');
      expect(tokens[7].type).toBe(TokenType.Plus);
      expect(tokens[8].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[8].value).toBe('E');
    });

    it('should handle newline immediately after quoted identifier', () => {
      const code = '"Field"\n"NextField"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field');
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('NextField');
      expect(tokens[1].line).toBe(2);
    });

    it('should handle carriage return and newline sequences', () => {
      const code = '"Field1"\r\n"Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Field2');
    });

    it('should handle identifier with all printable ASCII characters', () => {
      const code = '"!@#$%^&*()-_=+[]{}|;:,.<>?/~`"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('!@#$%^&*()-_=+[]{}|;:,.<>?/~`');
    });

    it('should handle escaped quotes with surrounding special characters', () => {
      const code = '"[""Name""]"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('["Name"]');
    });
  });

  describe('Realistic C/AL patterns with edge cases', () => {
    it('should handle NAV-style filter expression with escaped quotes', () => {
      const code = '"Description" := \'Filter contains ""special"" text\';';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Description');
      expect(tokens[1].type).toBe(TokenType.Assign);
      // Double quotes inside single-quoted string are literal, not escaped
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe('Filter contains ""special"" text');
    });

    it('should handle NAV-style MESSAGE with quotes in text', () => {
      const code = "MESSAGE('The field ''Customer Name'' is empty');";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MESSAGE');
      expect(tokens[1].type).toBe(TokenType.LeftParen);
      expect(tokens[2].type).toBe(TokenType.String);
      expect(tokens[2].value).toBe("The field 'Customer Name' is empty");
      expect(tokens[3].type).toBe(TokenType.RightParen);
      expect(tokens[4].type).toBe(TokenType.Semicolon);
    });

    it('should handle table field reference with unusual characters', () => {
      const code = 'Rec."Customer''s ""Special"" Order No." := 1;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Rec');
      expect(tokens[1].type).toBe(TokenType.Dot);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      // Single quote is literal in double-quoted identifier, double quote is escaped
      expect(tokens[2].value).toBe('Customer\'s "Special" Order No.');
      expect(tokens[3].type).toBe(TokenType.Assign);
    });

    it('should handle complex IF statement with multiple quote types', () => {
      const code = 'IF "Line ""No.""" > 0 THEN MESSAGE(\'Line''s empty\');';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Line "No."');
      expect(tokens[2].type).toBe(TokenType.Greater);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[4].type).toBe(TokenType.Then);
      expect(tokens[5].type).toBe(TokenType.Identifier);
      expect(tokens[6].type).toBe(TokenType.LeftParen);
      expect(tokens[7].type).toBe(TokenType.String);
      expect(tokens[7].value).toBe("Line's empty");
      expect(tokens[8].type).toBe(TokenType.RightParen);
      expect(tokens[9].type).toBe(TokenType.Semicolon);
    });

    it('should handle SETFILTER with complex filter string', () => {
      const code = 'SETFILTER("Amount ""LCY""", \'>0&<>''''&<>""special""\');';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('SETFILTER');
      expect(tokens[1].type).toBe(TokenType.LeftParen);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('Amount "LCY"');
      expect(tokens[3].type).toBe(TokenType.Comma);
      expect(tokens[4].type).toBe(TokenType.String);
      expect(tokens[4].value).toBe('>0&<>\'\'&<>""special""');
    });
  });
});
