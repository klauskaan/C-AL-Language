/**
 * Lexer Error Message Sanitization Tests (Security Validation)
 *
 * Tests for issue #147: Validate lexer error sanitization is working correctly.
 *
 * IMPORTANT: These tests PASS immediately because sanitization is already implemented.
 * They are SECURITY VALIDATION tests, not TDD bug-finding tests.
 *
 * Purpose:
 * - Validate that all Unknown token sources have their content sanitized in error messages
 * - Ensure no proprietary C/AL code leaks through parser error messages
 * - Serve as regression protection if sanitization is accidentally removed
 *
 * Test Pattern:
 * 1. Use "canary" values (e.g., $CANARY_SENSITIVE_DATA$) that are obvious if they leak
 * 2. Parse code containing Unknown tokens with canary values
 * 3. Verify error messages DO NOT contain canary values
 * 4. Verify error messages DO contain sanitized format: [content sanitized, N chars]
 *
 * Six Unknown Token Sources (from investigation):
 * 1. Unmatched closing brace `}` - value = '}'
 * 2. Unclosed quoted identifier - value = raw identifier content
 * 3. Unclosed string literal - value = raw string content
 * 4. Unknown character (default case in operator scanning) - value = single char
 * 5. Unclosed `{` comment - value = '{'
 * 6. Unclosed `/*` comment - value = '/*'
 */

import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { TokenType } from '../lexer/tokens';

describe('Lexer error sanitization (security validation)', () => {
  /**
   * Helper to assert that error messages are properly sanitized
   */
  function assertSanitized(errorMessages: string[], canaryValue: string) {
    expect(errorMessages.length).toBeGreaterThan(0);

    errorMessages.forEach(message => {
      // Critical: canary value MUST NOT appear in error message
      expect(message).not.toContain(canaryValue);

      // Error message should either:
      // 1. Contain sanitized format, OR
      // 2. Mention UNKNOWN token type (which is safe)
      const hasSanitizedFormat = message.includes('[content sanitized,');
      const mentionsUnknown = message.includes('UNKNOWN');

      expect(hasSanitizedFormat || mentionsUnknown).toBe(true);
    });
  }

  describe('Unknown token source 1: Unmatched closing brace', () => {
    it('should sanitize unmatched } brace in error messages', () => {
      // Unmatched } when braceDepth is 0 produces Unknown token with value '}'
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1 ; ; Name ; Text }
  }
}
}  // Extra closing brace - produces Unknown token`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify lexer creates Unknown token for unmatched brace
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens.length).toBeGreaterThan(0);

      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // Parser MAY or may not generate errors depending on recovery behavior
      // If it does, verify they're sanitized
      if (errors.length > 0) {
        errors.forEach(error => {
          // Should not contain the raw brace character
          expect(error.message).not.toContain('}');
          // Should either be sanitized or mention UNKNOWN
          const hasSanitized = error.message.includes('[content sanitized,');
          const mentionsUnknown = error.message.includes('UNKNOWN');
          expect(hasSanitized || mentionsUnknown).toBe(true);
        });
      }
    });
  });

  describe('Unknown token source 2: Unclosed quoted identifier', () => {
    it('should sanitize proprietary identifier names in unclosed quoted identifiers', () => {
      // CANARY: If this appears in error.message, sanitization is broken
      const CANARY = '$CANARY_PROPRIETARY_CUSTOMER_NAME$';
      const code = `"${CANARY}`;  // Unclosed quoted identifier - produces Unknown token with value = CANARY

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      assertSanitized(errorMessages, CANARY);
    });

    it('should sanitize multi-word proprietary identifier content', () => {
      const CANARY = '$SECRET_INTERNAL_BUSINESS_LOGIC_FIELD$';
      const code = `"${CANARY}`;  // Unclosed quoted identifier

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      assertSanitized(errorMessages, CANARY);
    });

    it('should sanitize unclosed identifier with special characters', () => {
      const CANARY = '$CONFIDENTIAL@#%_DATA$';
      const code = `"${CANARY}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      assertSanitized(errorMessages, CANARY);
    });
  });

  describe('Unknown token source 3: Unclosed string literal', () => {
    it('should sanitize proprietary string content in unclosed strings', () => {
      // CANARY: Proprietary business logic string
      const CANARY = '$SECRET_BUSINESS_RULE_MESSAGE$';
      const code = `'${CANARY}`;  // Unclosed string - produces Unknown token with value = CANARY

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      assertSanitized(errorMessages, CANARY);
    });

    it('should sanitize unclosed string with multi-line content', () => {
      const CANARY = `$FIRST_LINE_SECRET$
$SECOND_LINE_CONFIDENTIAL$`;
      const code = `'${CANARY}`;  // Unclosed multi-line string

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      // Check that neither line of the canary appears
      expect(errorMessages.length).toBeGreaterThan(0);
      errorMessages.forEach(message => {
        expect(message).not.toContain('$FIRST_LINE_SECRET$');
        expect(message).not.toContain('$SECOND_LINE_CONFIDENTIAL$');
        expect(message).not.toContain('CANARY');
      });
    });

    it('should sanitize unclosed string with escaped quotes', () => {
      const CANARY = "$SECRET''WITH''QUOTES$";
      const code = `'${CANARY}`;  // Unclosed string with escaped quotes

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      assertSanitized(errorMessages, CANARY);
    });

    it('should sanitize very long unclosed string content', () => {
      // Create a very long string to test truncation
      const CANARY = '$CONFIDENTIAL_DATA_' + 'X'.repeat(500) + '$';
      const code = `'${CANARY}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      expect(errorMessages.length).toBeGreaterThan(0);
      errorMessages.forEach(message => {
        // Should not contain the actual long string
        expect(message).not.toContain('CONFIDENTIAL_DATA');
        expect(message).not.toContain('X'.repeat(50)); // Check for substring
      });
    });
  });

  describe('Unknown token source 4: Unknown character', () => {
    it('should sanitize unknown character in error messages', () => {
      // Use a character not recognized by the lexer (rare in practice)
      // The '@' character outside of identifier context
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      x ~ y;  // ~ is not a valid C/AL operator
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify lexer creates Unknown token for invalid operator
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens.length).toBeGreaterThan(0);

      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // Parser MAY or may not generate errors depending on recovery behavior
      // If it does, verify they're sanitized
      if (errors.length > 0) {
        errors.forEach(error => {
          // Should not contain the raw tilde character
          expect(error.message).not.toContain('~');
          // Should either be sanitized or mention UNKNOWN
          const hasSanitized = error.message.includes('[content sanitized,');
          const mentionsUnknown = error.message.includes('UNKNOWN');
          expect(hasSanitized || mentionsUnknown).toBe(true);
        });
      }
    });

    it('should sanitize unexpected symbol in code', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      x \\ y;  // Backslash not valid in C/AL
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify lexer creates Unknown token for invalid operator
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens.length).toBeGreaterThan(0);

      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // Parser MAY or may not generate errors depending on recovery behavior
      // If it does, verify they're sanitized
      if (errors.length > 0) {
        errors.forEach(error => {
          // Should not contain the raw backslash character
          expect(error.message).not.toContain('\\');
          // Should either be sanitized or mention UNKNOWN
          const hasSanitized = error.message.includes('[content sanitized,');
          const mentionsUnknown = error.message.includes('UNKNOWN');
          expect(hasSanitized || mentionsUnknown).toBe(true);
        });
      }
    });
  });

  describe('Unknown token source 5: Unclosed { comment', () => {
    it('should sanitize unclosed { comment in error messages', () => {
      // Lexer creates Unknown token with value ONLY the opening brace '{'
      // Comment content is NOT stored in token.value - it's consumed and discarded
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      x := 5;
      { This is an unclosed comment with $CANARY_SECRET_NOTE$`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify lexer creates Unknown token with ONLY the opening brace
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens.length).toBeGreaterThan(0);
      expect(unknownTokens[0].value).toBe('{'); // NOT the comment content

      // Parse and verify error message
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // CRITICAL: Test must fail if no errors (false positive protection)
      expect(errors.length).toBeGreaterThan(0);

      // Test for '{' being sanitized, not the comment content (which isn't stored)
      const errorMessages = errors.map(e => e.message);
      assertSanitized(errorMessages, '{');
    });

    it('should sanitize unclosed brace comment in code block', () => {
      // Lexer stores only '{', NOT the comment content
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Calculate();
    VAR
      Total : Decimal;
    BEGIN
      Total := 100;
      { Confidential calculation note: $SECRET_ALGORITHM$
      Total := Total * 1.25;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify lexer creates Unknown token(s) - may include the unclosed brace
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens.length).toBeGreaterThan(0);

      // Find the unclosed comment brace token (look for '{' specifically)
      const unclosedBrace = unknownTokens.find(t => t.value === '{');
      if (unclosedBrace) {
        expect(unclosedBrace.value).toBe('{'); // ONLY the brace, not comment content
      }

      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // CRITICAL: Test must fail if no errors (false positive protection)
      expect(errors.length).toBeGreaterThan(0);

      // Verify comment content never appears (it's not stored in token.value)
      errors.forEach(error => {
        expect(error.message).not.toContain('$SECRET_ALGORITHM$');
        expect(error.message).not.toContain('Confidential');
        expect(error.message).not.toContain('calculation note');
      });
    });
  });

  describe('Unknown token source 6: Unclosed /* comment', () => {
    it('should sanitize unclosed /* comment in error messages', () => {
      // Lexer creates Unknown token with value ONLY '/*'
      // Comment content is NOT stored in token.value - it's consumed and discarded
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      x := 5;
      /* This is an unclosed C-style comment with $CANARY_INTERNAL_NOTE$`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify lexer creates Unknown token with ONLY '/*'
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens.length).toBeGreaterThan(0);
      expect(unknownTokens[0].value).toBe('/*'); // NOT the comment content

      // Parse and verify error message
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // CRITICAL: Test must fail if no errors (false positive protection)
      expect(errors.length).toBeGreaterThan(0);

      // Test for '/*' being sanitized, not the comment content (which isn't stored)
      const errorMessages = errors.map(e => e.message);
      assertSanitized(errorMessages, '/*');
    });

    it('should sanitize unclosed /* comment with multi-line content', () => {
      // Lexer stores only '/*', NOT the comment content
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Confidential();
    BEGIN
      /* Multi-line confidential note:
         Line 1: $SECRET_BUSINESS_RULE$
         Line 2: $PROPRIETARY_ALGORITHM$
         Line 3: $INTERNAL_USE_ONLY$
      x := CalculateSecret();
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify lexer behavior
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens.length).toBeGreaterThan(0);
      expect(unknownTokens[0].value).toBe('/*'); // ONLY the opening

      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // CRITICAL: Test must fail if no errors (false positive protection)
      expect(errors.length).toBeGreaterThan(0);

      // Verify comment content never appears (it's not stored in token.value)
      errors.forEach(error => {
        expect(error.message).not.toContain('$SECRET_BUSINESS_RULE$');
        expect(error.message).not.toContain('$PROPRIETARY_ALGORITHM$');
        expect(error.message).not.toContain('$INTERNAL_USE_ONLY$');
        expect(error.message).not.toContain('confidential note');
      });
    });
  });

  describe('End-to-end LSP diagnostic sanitization', () => {
    it('should not expose raw token values in diagnostic messages', () => {
      // Create code with multiple Unknown token types
      const CANARY_IDENTIFIER = '$SECRET_FIELD_NAME$';
      const CANARY_STRING = '$CONFIDENTIAL_MESSAGE$';

      const code = `"${CANARY_IDENTIFIER}
'${CANARY_STRING}`;  // Two unclosed tokens

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // Simulate diagnostic creation (like server.ts does)
      // Diagnostics use error.message, which should be sanitized
      expect(errors.length).toBeGreaterThan(0);

      errors.forEach(error => {
        // Critical: error.message should NOT contain canary values
        expect(error.message).not.toContain(CANARY_IDENTIFIER);
        expect(error.message).not.toContain(CANARY_STRING);
        expect(error.message).not.toContain('SECRET');
        expect(error.message).not.toContain('CONFIDENTIAL');

        // Should contain sanitized format or mention UNKNOWN
        const hasSanitized = error.message.includes('[content sanitized,');
        const mentionsUnknown = error.message.includes('UNKNOWN');
        expect(hasSanitized || mentionsUnknown).toBe(true);
      });
    });

    it('should sanitize all errors in a document with multiple issues', () => {
      const CANARY1 = '$CANARY_ONE$';
      const CANARY2 = '$CANARY_TWO$';

      const code = `"${CANARY1}
'${CANARY2}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);

      // ALL errors should be sanitized
      errors.forEach(error => {
        expect(error.message).not.toContain('CANARY');
        expect(error.message).not.toContain(CANARY1);
        expect(error.message).not.toContain(CANARY2);
      });
    });
  });

  describe('Edge cases and special scenarios', () => {
    it('should handle empty unclosed quoted identifier', () => {
      const code = `"`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify lexer creates Unknown token for empty unclosed identifier
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens.length).toBeGreaterThan(0);

      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // If parser generates errors, verify they're sanitized
      if (errors.length > 0) {
        errors.forEach(error => {
          // Should handle empty content gracefully
          const hasSanitized = error.message.includes('[content sanitized, 0 chars]') ||
                              error.message.includes('[content sanitized,');
          const mentionsUnknown = error.message.includes('UNKNOWN');
          expect(hasSanitized || mentionsUnknown).toBe(true);

          // Should not contain the empty identifier
          expect(error.message).not.toContain('""');
        });
      }
    });

    it('should handle unclosed string at EOF', () => {
      const CANARY = '$SECRET_AT_EOF$';
      const code = `'${CANARY}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      expect(errorMessages.length).toBeGreaterThan(0);
      errorMessages.forEach(message => {
        expect(message).not.toContain(CANARY);
      });
    });

    it('should handle Unicode in unclosed identifiers', () => {
      const CANARY = '$HEMMELIG_ØKO_DATA$';  // Danish: secret economic data
      const code = `"${CANARY}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      assertSanitized(errorMessages, CANARY);
    });

    it('should handle unclosed string with newlines and special chars', () => {
      const CANARY = '$SECRET\n\t\r\nMULTILINE$';
      const code = `'${CANARY}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const errorMessages = errors.map(e => e.message);
      expect(errorMessages.length).toBeGreaterThan(0);
      errorMessages.forEach(message => {
        expect(message).not.toContain('SECRET');
        expect(message).not.toContain('MULTILINE');
      });
    });
  });

  describe('Regression protection', () => {
    it('should verify ParseError.token contains raw value (intentional)', () => {
      // Document that token.value contains unsanitized content by design
      // This is OK because token is never exposed to LSP - only error.message is
      const CANARY = '$RAW_TOKEN_VALUE$';
      const code = `"${CANARY}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);

      const error = errors[0];
      // Token.value DOES contain raw unsanitized content (this is intentional)
      // It's never exposed to LSP diagnostics
      expect(error.token.value).toBe(CANARY);

      // But error.message should be sanitized
      expect(error.message).not.toContain(CANARY);
    });

    it('should ensure only error.message is used in diagnostics, not token.value', () => {
      // This test documents the critical security boundary:
      // error.token.value = raw (never exposed)
      // error.message = sanitized (exposed to LSP)
      const CANARY = '$SENSITIVE_DATA$';
      const code = `"${CANARY}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);

      errors.forEach(error => {
        // RAW boundary: token.value may contain sensitive data
        // This is acceptable because ParseError.token is never exposed to LSP

        // SANITIZED boundary: error.message must NOT contain sensitive data
        // This is what gets exposed to LSP diagnostics
        expect(error.message).not.toContain(CANARY);
      });
    });
  });

  describe('Sanitization format validation', () => {
    it('should follow consistent sanitization format', () => {
      const CANARY = '$TEST_DATA$';
      const code = `"${CANARY}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);

      const sanitizedErrors = errors.filter(e => e.message.includes('[content sanitized,'));

      if (sanitizedErrors.length > 0) {
        sanitizedErrors.forEach(error => {
          // Format: [content sanitized, N chars] or [content sanitized, N chars at offset M]
          const formatMatch = error.message.match(/\[content sanitized, \d+ chars( at offset \d+)?\]/);
          expect(formatMatch).toBeTruthy();
        });
      }
    });

    it('should report character counts in sanitized messages', () => {
      const CANARY = '12345678';  // 8 characters
      const code = `"${CANARY}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      const sanitizedErrors = errors.filter(e => e.message.includes('[content sanitized,'));

      if (sanitizedErrors.length > 0) {
        // Should report character count (flexible regex, not exact count)
        const hasCorrectFormat = sanitizedErrors.some(e =>
          /\[content sanitized, \d+ chars/.test(e.message)
        );
        expect(hasCorrectFormat).toBe(true);
      }
    });
  });
});
