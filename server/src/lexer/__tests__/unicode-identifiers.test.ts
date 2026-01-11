/**
 * Unicode Identifiers Tests - Extended Latin Character Support
 *
 * Tests support for extended Latin characters in unquoted identifiers,
 * as commonly used in NAV installations in Nordic and European countries.
 *
 * IMPORTANT: These tests MUST FAIL initially because the current lexer
 * only supports ASCII a-z, A-Z in isIdentifierStart().
 *
 * Supported character ranges (after implementation):
 * - Latin-1 Supplement (U+00C0-U+00FF): À-ÿ
 * - Latin Extended-A (U+0100-U+017F): Ā-ſ
 *
 * NOT supported (should remain as separate tokens or unknown):
 * - Math symbols like × (U+00D7) and ÷ (U+00F7)
 * - Currency symbols like € (U+20AC)
 * - Other non-Latin scripts
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Unicode Identifiers', () => {
  describe('Danish characters', () => {
    it('should tokenize identifier with ø (U+00F8) in the middle', () => {
      const code = 'Kundør';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Currently fails: lexer splits into multiple tokens
      // Expected after fix: single IDENTIFIER token
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Kundør');
    });

    it('should tokenize identifier with ø at the start', () => {
      const code = 'øPris';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ø (U+00F8) should be valid identifier start
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('øPris');
    });

    it('should tokenize identifier with ø at the end', () => {
      const code = 'Prisø';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Prisø');
    });

    it('should tokenize identifier with æ (U+00E6)', () => {
      const code = 'Æble';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // æ (U+00E6) should be valid identifier start
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Æble');
    });

    it('should tokenize identifier with Æ (U+00C6) uppercase', () => {
      const code = 'ÆbleKurv';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Æ (U+00C6) should be valid identifier start
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('ÆbleKurv');
    });

    it('should tokenize identifier with å (U+00E5)', () => {
      const code = 'Årsresultat';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // å (U+00E5) should be valid identifier start
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Årsresultat');
    });

    it('should tokenize identifier with Å (U+00C5) uppercase', () => {
      const code = 'ÅrsRegnskab';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Å (U+00C5) should be valid identifier start
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('ÅrsRegnskab');
    });

    it('should tokenize mixed identifier OpgørelseRec', () => {
      const code = 'OpgørelseRec';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Real-world example: ASCII + ø
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('OpgørelseRec');
    });

    it('should tokenize mixed identifier VærdiafstemningData', () => {
      const code = 'VærdiafstemningData';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Real-world example: ASCII + æ
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('VærdiafstemningData');
    });
  });

  describe('Swedish characters', () => {
    it('should tokenize identifier with ö (U+00F6)', () => {
      const code = 'Öppen';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ö (U+00F6) should be valid identifier start
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Öppen');
    });

    it('should tokenize identifier with ä (U+00E4)', () => {
      const code = 'Försäljning';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Both ö and ä should work
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Försäljning');
    });
  });

  describe('German characters', () => {
    it('should tokenize identifier with ö (U+00F6) in German word', () => {
      const code = 'Größe';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Größe');
    });

    it('should tokenize identifier with ß (U+00DF) - German sharp s', () => {
      const code = 'Straße';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ß (U+00DF) should be valid identifier part
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Straße');
    });

    it('should tokenize identifier with ü (U+00FC)', () => {
      const code = 'Übung';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ü (U+00FC) should be valid identifier start
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Übung');
    });
  });

  describe('French characters', () => {
    it('should tokenize identifier with é (U+00E9)', () => {
      const code = 'Café';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // é (U+00E9) should be valid identifier part
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Café');
    });

    it('should tokenize identifier with ç (U+00E7) - c cedilla', () => {
      const code = 'Façade';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ç (U+00E7) should be valid identifier part
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Façade');
    });

    it('should tokenize identifier with è (U+00E8) and é (U+00E9)', () => {
      const code = 'Élève';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Multiple accented characters
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Élève');
    });

    it('should tokenize identifier with à (U+00E0)', () => {
      const code = 'Voilà';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // à (U+00E0) should be valid identifier part
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Voilà');
    });
  });

  describe('Latin Extended-A characters', () => {
    it('should tokenize identifier with Ā (U+0100) - A with macron', () => {
      const code = 'Ābele';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Latin Extended-A should be supported
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Ābele');
    });

    it('should tokenize identifier with Ō (U+014C) - O with macron', () => {
      const code = 'Ōmega';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Latin Extended-A should be supported
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Ōmega');
    });
  });

  describe('Unicode identifiers with numbers', () => {
    it('should tokenize identifier with extended Latin and trailing number', () => {
      const code = 'Beløb2';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ø followed by digit
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Beløb2');
    });

    it('should tokenize identifier with number before extended Latin', () => {
      const code = 'Item3ø';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // digit followed by ø
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Item3ø');
    });

    it('should tokenize identifier with number in middle of extended Latin chars', () => {
      const code = 'Før2Efter';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ø + digit + ASCII
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Før2Efter');
    });
  });

  describe('Invalid identifier starts - math symbols', () => {
    it('should NOT tokenize × (U+00D7) as identifier start', () => {
      const code = '×factor';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // × is multiplication sign, not a letter
      // Should be tokenized as Unknown + Identifier (or similar)
      expect(tokens.length).toBeGreaterThan(2);
      expect(tokens[0].type).not.toBe(TokenType.Identifier);
      // The × should NOT be part of 'factor'
      expect(tokens[0].value).not.toBe('×factor');
    });

    it('should NOT tokenize ÷ (U+00F7) as identifier start', () => {
      const code = '÷result';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ÷ is division sign, not a letter
      // Should be tokenized as Unknown + Identifier (or similar)
      expect(tokens.length).toBeGreaterThan(2);
      expect(tokens[0].type).not.toBe(TokenType.Identifier);
      // The ÷ should NOT be part of 'result'
      expect(tokens[0].value).not.toBe('÷result');
    });

    it('should NOT include × (U+00D7) in identifier part', () => {
      const code = 'test×value';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // × should split the identifier, not be part of it
      const identifiers = tokens.filter(t => t.type === TokenType.Identifier);
      expect(identifiers).toHaveLength(2);
      expect(identifiers[0].value).toBe('test');
      expect(identifiers[1].value).toBe('value');
    });

    it('should NOT include ÷ (U+00F7) in identifier part', () => {
      const code = 'test÷value';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ÷ should split the identifier, not be part of it
      const identifiers = tokens.filter(t => t.type === TokenType.Identifier);
      expect(identifiers).toHaveLength(2);
      expect(identifiers[0].value).toBe('test');
      expect(identifiers[1].value).toBe('value');
    });
  });

  describe('Context tests - full C/AL statements', () => {
    it('should tokenize variable declaration with Danish identifier', () => {
      const code = 'VAR Kundør : Integer;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the identifier token (skip VAR keyword)
      const identifierToken = tokens.find(t => t.value === 'Kundør');
      expect(identifierToken).toBeDefined();
      expect(identifierToken!.type).toBe(TokenType.Identifier);
    });

    it('should tokenize assignment with Danish identifier', () => {
      const code = 'Beløb := 100;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // First token should be the identifier
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Beløb');
    });

    it('should tokenize IF condition with Swedish identifier', () => {
      const code = 'IF Försäljning > 0 THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the identifier token (after IF keyword)
      const identifierToken = tokens.find(t => t.value === 'Försäljning');
      expect(identifierToken).toBeDefined();
      expect(identifierToken!.type).toBe(TokenType.Identifier);
    });

    it('should tokenize procedure call with German identifier', () => {
      const code = 'SetGröße(10);';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // First token should be the identifier
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('SetGröße');
    });

    it('should tokenize field access with French identifier', () => {
      const code = 'Customer.Café';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Pattern: IDENTIFIER DOT IDENTIFIER
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Customer');
      expect(tokens[1].type).toBe(TokenType.Dot);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Café');
    });

    it('should tokenize record variable with multiple extended Latin chars', () => {
      const code = 'VAR OpgørelseRec : Record "Værdiafstemning";';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find both identifiers
      const opgoerelseToken = tokens.find(t => t.value === 'OpgørelseRec');
      expect(opgoerelseToken).toBeDefined();
      expect(opgoerelseToken!.type).toBe(TokenType.Identifier);

      // Note: "Værdiafstemning" is a quoted identifier (double quotes = QuotedIdentifier in C/AL)
      const quotedIdentifierToken = tokens.find(t => t.value === 'Værdiafstemning');
      expect(quotedIdentifierToken).toBeDefined();
      expect(quotedIdentifierToken!.type).toBe(TokenType.QuotedIdentifier);
    });

    it('should tokenize BEGIN...END block with Danish identifiers', () => {
      const code = `
BEGIN
  Kundør := 1;
  Beløb := Årsresultat;
END;
      `;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify all three Danish identifiers are recognized
      const kundorToken = tokens.find(t => t.value === 'Kundør');
      expect(kundorToken).toBeDefined();
      expect(kundorToken!.type).toBe(TokenType.Identifier);

      const belobToken = tokens.find(t => t.value === 'Beløb');
      expect(belobToken).toBeDefined();
      expect(belobToken!.type).toBe(TokenType.Identifier);

      const aarsresultatToken = tokens.find(t => t.value === 'Årsresultat');
      expect(aarsresultatToken).toBeDefined();
      expect(aarsresultatToken!.type).toBe(TokenType.Identifier);
    });

    it('should tokenize complex expression with mixed ASCII and extended Latin', () => {
      const code = 'TotalBeløb := Försäljning + Überschuss - Café;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify all identifiers
      const identifiers = ['TotalBeløb', 'Försäljning', 'Überschuss', 'Café'];
      identifiers.forEach(id => {
        const token = tokens.find(t => t.value === id);
        expect(token).toBeDefined();
        expect(token!.type).toBe(TokenType.Identifier);
      });
    });
  });

  describe('Boundary tests', () => {
    it('should support characters at start of Latin-1 Supplement range (À = U+00C0)', () => {
      const code = 'Àpropos';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // À (U+00C0) is first letter in Latin-1 Supplement
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Àpropos');
    });

    it('should support characters at end of Latin-1 Supplement range (ÿ = U+00FF)', () => {
      const code = 'Laÿla';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ÿ (U+00FF) is last letter in Latin-1 Supplement
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Laÿla');
    });

    it('should support characters at start of Latin Extended-A range (Ā = U+0100)', () => {
      const code = 'Āstart';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Ā (U+0100) is first letter in Latin Extended-A
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Āstart');
    });

    it('should support characters at end of Latin Extended-A range (ſ = U+017F)', () => {
      const code = 'Endſ';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // ſ (U+017F) is long s, last in Latin Extended-A
      expect(tokens).toHaveLength(2); // IDENTIFIER + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Endſ');
    });
  });

  describe('Multiple identifiers in sequence', () => {
    it('should tokenize multiple extended Latin identifiers separated by spaces', () => {
      const code = 'Kundør Beløb Årsresultat';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(4); // 3 IDENTIFIERS + EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Kundør');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('Beløb');
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Årsresultat');
    });

    it('should tokenize extended Latin identifiers separated by operators', () => {
      const code = 'Beløb+Försäljning-Café';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Pattern: IDENTIFIER PLUS IDENTIFIER MINUS IDENTIFIER EOF
      expect(tokens).toHaveLength(6);
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Beløb');
      expect(tokens[1].type).toBe(TokenType.Plus);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Försäljning');
      expect(tokens[3].type).toBe(TokenType.Minus);
      expect(tokens[4].type).toBe(TokenType.Identifier);
      expect(tokens[4].value).toBe('Café');
    });
  });
});
