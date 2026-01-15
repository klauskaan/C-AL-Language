/**
 * Lexer Tests - Edge Cases and Error Recovery
 *
 * PURPOSE:
 * This test file documents the lexer's edge case handling and error recovery behavior.
 * It consolidates tests for boundary conditions, malformed input, and error scenarios
 * that don't fit naturally into domain-specific test files (comments, literals, etc.).
 *
 * RELATIONSHIP TO OTHER TEST FILES:
 * - comments.test.ts: Comment tokenization and interactions (INCLUDES unclosed curly/C-style)
 * - literals.test.ts: Date/time literal formats and validation
 * - multiline-strings.test.ts: Multi-line string support
 * - quoted-identifiers.test.ts: Quoted identifier vs string distinction (INCLUDES unclosed quoted identifier/string)
 * - lexer.test.ts: Core tokenization, keywords, operators (INCLUDES empty string)
 *
 * COVERAGE AUDIT SUMMARY:
 * These edge cases are ALREADY TESTED elsewhere:
 * - Empty string: lexer.test.ts:20-35 (Basic tokenization)
 * - Unclosed string: quoted-identifiers.test.ts:192-200
 * - Unclosed quoted identifier: quoted-identifiers.test.ts:182-190
 * - Unclosed curly comment: comments.test.ts:155-161
 * - Unclosed C-style comment: comments.test.ts:251-259
 *
 * WHY CONSOLIDATED HERE VS. DISTRIBUTED:
 * 1. Edge cases span multiple domains - no single feature owns them
 * 2. Error recovery patterns are cross-cutting concerns
 * 3. Easier to audit coverage gaps when edge cases are in one place
 * 4. Prevents test duplication across domain files
 * 5. Documents "known unknowns" - edge cases we explicitly tested for
 *
 * TEST CATEGORIES:
 * - Invalid date/time formats (valid format tested in literals.test.ts)
 * - Operator ambiguities at boundaries
 * - Context transitions at EOF
 * - Deeply nested structures
 * - Maximum length limits
 * - Unicode edge cases
 * - Mixed valid/invalid content
 *
 * NOTE: This file focuses on NEW edge cases not already covered in other test files.
 * See audit summary above for tests that already exist elsewhere.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Edge Cases and Error Recovery', () => {
  describe('Invalid date/time literals', () => {
    // Valid date/time formats are tested in literals.test.ts
    // This section tests INVALID formats and boundary conditions

    it('should reject time literal with invalid digit count (5 digits)', () => {
      const code = '12345T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should tokenize as integer + identifier (too short for time)
      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('12345');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('T');
    });

    it('should reject decimal number followed by D', () => {
      const code = '123.45D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should tokenize as decimal + identifier (not a date)
      expect(tokens[0].type).toBe(TokenType.Decimal);
      expect(tokens[0].value).toBe('123.45');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('D');
    });

    it('should handle lowercase d and t as identifiers', () => {
      const code = '060120d 120000t';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // C/AL date/time literals require uppercase D and T
      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('060120');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('d');
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[2].value).toBe('120000');
      expect(tokens[3].type).toBe(TokenType.Identifier);
      expect(tokens[3].value).toBe('t');
    });
  });

  describe('Operator ambiguities', () => {
    it('should distinguish consecutive colons from double colon', () => {
      const code = 'a : : b';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // With spaces, should tokenize as separate colons
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Colon);
      expect(tokens[2].type).toBe(TokenType.Colon);
      expect(tokens[3].type).toBe(TokenType.Identifier);
    });

    it('should handle scope operator at end of input', () => {
      const code = 'Status::';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[2].type).toBe(TokenType.EOF);
    });

    it('should distinguish += from + followed by =', () => {
      const code = 'x += 5; y := x + = z;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // x, +=, 5, ;, y, :=, x, +, =, z, ;, EOF
      expect(tokens[1].type).toBe(TokenType.PlusAssign);
      expect(tokens[7].type).toBe(TokenType.Plus);
      expect(tokens[8].type).toBe(TokenType.Equal);
    });

    it('should handle decimal numbers vs range operator', () => {
      const code = '3.14 1..10';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Decimal);
      expect(tokens[0].value).toBe('3.14');
      expect(tokens[1].type).toBe(TokenType.Integer);
      expect(tokens[2].type).toBe(TokenType.DotDot);
    });
  });

  describe('Context transitions at EOF', () => {
    it('should handle EOF immediately after BEGIN', () => {
      const code = 'BEGIN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.EOF);
    });

    it('should handle EOF immediately after CASE', () => {
      const code = 'BEGIN CASE Status OF';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.Case);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[3].type).toBe(TokenType.Of);
      expect(tokens[4].type).toBe(TokenType.EOF);
    });

    it('should handle EOF inside property value', () => {
      const code = 'Caption=';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Equal);
      expect(tokens[2].type).toBe(TokenType.EOF);
    });
  });

  describe('Deeply nested structures', () => {
    it('should handle deeply nested parentheses', () => {
      const code = '((((((((((x))))))))))';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      let leftParenCount = 0;
      let rightParenCount = 0;
      for (const token of tokens) {
        if (token.type === TokenType.LeftParen) leftParenCount++;
        if (token.type === TokenType.RightParen) rightParenCount++;
      }

      expect(leftParenCount).toBe(10);
      expect(rightParenCount).toBe(10);
    });

    it('should handle deeply nested brackets', () => {
      const code = 'Array[Index[SubIndex[DeepIndex[VeryDeepIndex]]]]';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      let leftBracketCount = 0;
      let rightBracketCount = 0;
      for (const token of tokens) {
        if (token.type === TokenType.LeftBracket) leftBracketCount++;
        if (token.type === TokenType.RightBracket) rightBracketCount++;
      }

      expect(leftBracketCount).toBe(4);
      expect(rightBracketCount).toBe(4);
    });

    it('should handle deeply nested BEGIN...END blocks', () => {
      const code = `BEGIN
        BEGIN
          BEGIN
            BEGIN
              x := 1;
            END;
          END;
        END;
      END;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      let beginCount = 0;
      let endCount = 0;
      for (const token of tokens) {
        if (token.type === TokenType.Begin) beginCount++;
        if (token.type === TokenType.End) endCount++;
      }

      expect(beginCount).toBe(4);
      expect(endCount).toBe(4);
    });
  });

  describe('Maximum length scenarios', () => {
    it('should handle very long identifiers', () => {
      const longIdentifier = 'a'.repeat(250);
      const code = `${longIdentifier} := 1;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe(longIdentifier);
    });

    it('should handle very long string literals', () => {
      const longString = 'x'.repeat(1000);
      const code = `'${longString}'`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe(longString);
    });

    it('should handle very long numbers', () => {
      const longNumber = '1234567890'.repeat(10);
      const code = longNumber;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe(longNumber);
    });
  });

  describe('Unicode and special characters', () => {
    it('should handle identifiers with extended Latin characters', () => {
      // Test Latin-1 Supplement (À-ÿ) and Latin Extended-A (Ā-ſ)
      const code = 'Ångström Größe Château Łódź';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Ångström');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('Größe');
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Château');
      expect(tokens[3].type).toBe(TokenType.Identifier);
      expect(tokens[3].value).toBe('Łódź');
    });

    it('should handle multiplication and division operators vs Unicode', () => {
      // × (U+00D7) and ÷ (U+00F7) should NOT be valid in identifiers
      const code = 'a × b ÷ c';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should produce: identifier, unknown, identifier, unknown, identifier
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('a');
      expect(tokens[1].type).toBe(TokenType.Unknown);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('b');
      expect(tokens[3].type).toBe(TokenType.Unknown);
      expect(tokens[4].type).toBe(TokenType.Identifier);
      expect(tokens[4].value).toBe('c');
    });

    it('should handle zero-width characters gracefully', () => {
      // Zero-width space (U+200B) is not recognized as whitespace by the lexer,
      // so it produces an Unknown token between 'x' and 'y'
      const code = 'x\u200By := 1;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Expected tokens: Identifier(x), Unknown(\u200B), Identifier(y), Assign, Integer(1), Semicolon, EOF
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('x');
      expect(tokens[1].type).toBe(TokenType.Unknown);
      expect(tokens[1].value).toBe('\u200B');
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('y');
      expect(tokens[3].type).toBe(TokenType.Assign);
      expect(tokens[4].type).toBe(TokenType.Integer);
      expect(tokens[5].type).toBe(TokenType.Semicolon);
      expect(tokens[6].type).toBe(TokenType.EOF);
    });
  });

  describe('Mixed valid and invalid content', () => {
    it('should recover from invalid token and continue parsing', () => {
      const code = 'x := @ 5 + $ 10;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should produce: identifier, :=, unknown(@), integer, +, unknown($), integer, ;
      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Unknown);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[4].type).toBe(TokenType.Plus);
      expect(tokens[5].type).toBe(TokenType.Unknown);
      expect(tokens[6].type).toBe(TokenType.Integer);
      expect(tokens[7].type).toBe(TokenType.Semicolon);
    });

    it('should handle mix of valid and unclosed strings', () => {
      const code = "'valid' 'unclosed";
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.String);
      expect(tokens[0].value).toBe('valid');
      expect(tokens[1].type).toBe(TokenType.Unknown);
      // The lexer strips the leading quote from unclosed strings, so the value
      // is the string content without the opening quote
      expect(tokens[1].value).toBe('unclosed');
    });

    it('should handle valid code after unclosed comment', () => {
      // Note: Without BEGIN, '{' is a structural brace (not a comment)
      // Use BEGIN to put lexer in CODE context where { starts a comment
      const code = 'BEGIN { unclosed comment x := 1;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // First token is BEGIN keyword
      expect(tokens[0].type).toBe(TokenType.Begin);

      // Unclosed comment in CODE context produces Unknown token with value '{'
      expect(tokens[1].type).toBe(TokenType.Unknown);
      expect(tokens[1].value).toBe('{');

      // Lexer should reach EOF gracefully
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });
  });

  describe('Context stack underflow detection', () => {
    it('should detect context underflow from extra END', () => {
      const code = 'BEGIN END END';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.contextUnderflowDetected).toBe(true);
    });

    it('should not detect underflow for balanced BEGIN...END', () => {
      const code = 'BEGIN x := 1; END;';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should handle multiple underflows gracefully', () => {
      const code = 'END END END';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.contextUnderflowDetected).toBe(true);
    });
  });

  describe('Boundary conditions', () => {
    it('should handle single character input', () => {
      const code = ';';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Semicolon);
      expect(tokens[1].type).toBe(TokenType.EOF);
    });

    it('should handle whitespace-only input', () => {
      const code = '   \t  \n  ';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle input with only comments', () => {
      const code = '// comment 1\n/* comment 2 */';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle very short valid C/AL code', () => {
      const code = '0';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('0');
      expect(tokens[1].type).toBe(TokenType.EOF);
    });
  });

  describe('Position tracking accuracy', () => {
    it('should track line numbers through mixed content', () => {
      const code = `x := 1;
'multi
line
string'
y := 2;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the 'y' identifier
      const yToken = tokens.find(t => t.value === 'y');
      expect(yToken).toBeDefined();
      expect(yToken!.line).toBe(5);
    });

    it('should track column positions correctly', () => {
      const code = '   x   :=   5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].column).toBe(4);  // x starts at column 4
      expect(tokens[1].column).toBe(8);  // := starts at column 8
      expect(tokens[2].column).toBe(13); // 5 starts at column 13
    });

    it('should track offsets correctly', () => {
      const code = 'BEGIN END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(5);
      expect(tokens[1].startOffset).toBe(6);
      expect(tokens[1].endOffset).toBe(9);
    });
  });
});
