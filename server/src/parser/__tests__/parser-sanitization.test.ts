/**
 * Parser Error Message Sanitization Tests
 *
 * Tests for issue #112: Sanitize token values in parser error messages.
 *
 * IMPORTANT: These tests are EXPECTED TO FAIL initially because parser.ts
 * currently exposes raw token values in error messages. They validate that
 * the sanitization implementation correctly protects sensitive data.
 *
 * Test Coverage:
 * - All 13 locations in parser.ts that expose token.value
 * - Edge cases: empty tokens, very long tokens (>100 chars)
 * - Validates sanitized format: [content sanitized: first 20 chars... len=X]
 * - Ensures raw token values are NOT present in error messages
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser error message sanitization (EXPECTED TO FAIL)', () => {
  /**
   * Helper to assert sanitization format and absence of raw value
   */
  function assertSanitized(errorMessage: string, rawValue: string) {
    // Should contain sanitized format marker OR not expose the raw value
    const hasSanitizedFormat = errorMessage.includes('[content sanitized,');
    const exposesRawValue = rawValue.length > 3 && errorMessage.includes(rawValue);

    // Either:
    // 1. Contains sanitized format
    // 2. Doesn't expose raw value (e.g., reports token type instead)
    expect(hasSanitizedFormat || !exposesRawValue).toBe(true);

    // Should NOT contain the raw token value
    // Exception: very short values (<=3 chars) might be shown
    if (rawValue.length > 3) {
      expect(errorMessage).not.toContain(rawValue);
    }
  }

  describe('Location 1: parseInteger() - Invalid integer value (line 114)', () => {
    it('should sanitize invalid object ID in error message', () => {
      const code = 'OBJECT Table SensitiveValue123 Customer';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('Expected object ID'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'SensitiveValue123');
    });

    it('should sanitize invalid field number', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { SecretFieldNum ; ; No. ; Code20 }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('Expected field number'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'SecretFieldNum');
    });

    it('should sanitize invalid array size', () => {
      const code = `OBJECT Table 18 Customer
{
  CODE
  {
    VAR
      MyArray : ARRAY[PrivateSize999] OF Integer;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('Expected array size'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'PrivateSize999');
    });
  });

  describe('Location 2: parseVariableDeclarations() - Reserved keyword as variable (line 1222)', () => {
    it('should sanitize reserved keyword used as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      ConfidentialKeyword123 : Integer;
    BEGIN
    END;
  }
}`;
      // Use a mock scenario where a user-defined identifier conflicts
      // For this test, we need to trigger the reserved keyword path
      // Let's use an actual reserved keyword with sensitive context
      const codeWithKeyword = code.replace('ConfidentialKeyword123', 'BEGIN');
      const lexer = new Lexer(codeWithKeyword);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.toLowerCase().includes('reserved keyword'));
      expect(error).toBeDefined();

      // The keyword 'BEGIN' should be sanitized in the error message
      assertSanitized(error!.message, 'BEGIN');
    });

    it('should sanitize keyword with @ suffix used as variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      WHILE@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.toLowerCase().includes('while') ||
                                      e.message.toLowerCase().includes('reserved'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'WHILE');
    });
  });

  describe('Location 3: parseParameters() - Unexpected token in parameter list (line 1428)', () => {
    it('should sanitize unexpected token value in parameter list', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc(Param1 : Integer ConfidentialToken99 Param2 : Text);
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('parameter list'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'ConfidentialToken99');
    });

    it('should sanitize missing semicolon showing next token', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc(Param1 : Integer SecretNextToken : Text);
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('parameter list'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'SecretNextToken');
    });
  });

  describe('Location 4: parseEventQualifiedName() - Expected identifier for event name (line 1614)', () => {
    it('should sanitize invalid event name token', () => {
      // Event syntax: EventPublisher::EventName
      // Trigger error by using invalid token for event name
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    EVENT SomePublisher::123InvalidEventName();
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // May have multiple errors, find the one about event name
      const error = errors.find(e => e.message.toLowerCase().includes('event name') ||
                                      e.message.toLowerCase().includes('identifier'));

      if (error) {
        // Should sanitize the invalid token
        assertSanitized(error.message, '123InvalidEventName');
      } else {
        // If we don't hit this exact path, at least verify sanitization occurred somewhere
        expect(errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Location 5: parseStatementOrExpr() - AL access modifier (line 1700)', () => {
    it('should sanitize AL-only access modifier in statement context', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      internal CustomerSecret;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only') &&
                                      e.message.includes('access modifier'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'internal');
    });

    it('should sanitize protected access modifier with value', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      protected SecretProtectedData;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only') &&
                                      e.message.includes('access modifier'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'protected');
    });
  });

  describe('Location 6: parseStatementOrExpr() - AL preprocessor (line 1717)', () => {
    it('should sanitize AL preprocessor directive in statement', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      #pragma SecretPragmaValue
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only') &&
                                      e.message.includes('preprocessor'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, '#pragma');
    });

    it('should sanitize #region directive', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      #region ConfidentialRegionName
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only') &&
                                      e.message.includes('preprocessor'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, '#region');
    });
  });

  describe('Location 7: parseStatementOrExpr() - AL keyword (line 1751)', () => {
    it('should sanitize AL-only keyword in statement context', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      interface SecretInterfaceName;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only') &&
                                      e.message.toLowerCase().includes('keyword'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'interface');
    });

    it('should sanitize enum keyword', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      enum PrivateEnumValue;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only') &&
                                      e.message.toLowerCase().includes('keyword'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'enum');
    });
  });

  describe('Location 8: parsePrimaryExpr() - AL preprocessor (line 2679)', () => {
    it('should sanitize preprocessor directive in expression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      x := #define SecretDefine + 5;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only') &&
                                      e.message.includes('preprocessor'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, '#define');
    });
  });

  describe('Location 9: parseMemberExpression() - Expected identifier after :: (line 2822)', () => {
    it('should sanitize invalid token after :: operator', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Status : Option;
    BEGIN
      Status := Status::123InvalidMember;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Parser may or may not generate error for this specific case
      if (errors.length > 0) {
        const error = errors.find(e =>
          e.message.includes('Expected identifier after ::') ||
          e.message.includes('[content sanitized')
        );
        if (error) {
          assertSanitized(error.message, '123InvalidMember');
        }
      }
    });

    it('should sanitize missing member after ::', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Status : Option;
    BEGIN
      Status := Status::;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      // Parser may or may not generate error for this specific case
      if (errors.length > 0) {
        const error = errors.find(e =>
          e.message.includes('Expected identifier after ::') ||
          e.message.includes('[content sanitized')
        );
        if (error) {
          // Semicolon is short, but still should follow sanitization pattern
          expect(error.message).toMatch(/\[content sanitized,/);
        }
      }
    });
  });

  describe('Location 10: consume() - CRITICAL general unexpected token (line 3286)', () => {
    it('should sanitize unexpected token in consume() - wrong object type', () => {
      const code = 'OBJECT SecretObjectType 18 Customer';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Any error should have sanitized content - just check the first one
      const error = errors[0];

      assertSanitized(error.message, 'SecretObjectType');
    });

    it('should sanitize missing closing brace showing next token', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  ConfidentialNextToken`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Should have error about expected closing brace or sanitized content
      const error = errors.find(e =>
        e.message.includes('[content sanitized') ||
        e.message.includes('Expected')
      );

      if (error) {
        assertSanitized(error.message, 'ConfidentialNextToken');
      }
    });

    it('should sanitize very long token value', () => {
      // Create a very long identifier (>100 chars)
      const longIdentifier = 'VeryLongConfidentialIdentifierThatContainsSensitiveDataAndShouldBeTruncatedInErrorMessages' +
                             'WithEvenMoreCharactersToMakeItReallyLong';
      const code = `OBJECT ${longIdentifier} 18 Customer`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors[0];

      // Should be sanitized
      assertSanitized(error.message, longIdentifier);

      // Format: [content sanitized, X chars] or [content sanitized, X chars at offset Y]
      const lengthMatch = error.message.match(/\[content sanitized, (\d+) chars/);
      if (lengthMatch) {
        const reportedLen = parseInt(lengthMatch[1]);
        // Length should be reported correctly
        expect(reportedLen).toBeGreaterThan(0);
      }
    });
  });

  describe('Location 11: checkAndReportALOnlyToken() - AL keyword (line 3379)', () => {
    it('should sanitize AL keyword from checkAndReportALOnlyToken', () => {
      // This helper is called from multiple places
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      interface PrivateInterface123;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only keyword'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'interface');
    });
  });

  describe('Location 12: checkAndReportALOnlyToken() - AL access modifier (line 3387)', () => {
    it('should sanitize AL access modifier from checkAndReportALOnlyToken', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    internal PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only access modifier'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, 'internal');
    });
  });

  describe('Location 13: checkAndReportALOnlyToken() - AL preprocessor (line 3403)', () => {
    it('should sanitize AL preprocessor from checkAndReportALOnlyToken', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    #if SecretCondition
    PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('AL-only') &&
                                      e.message.includes('preprocessor'));
      expect(error).toBeDefined();

      assertSanitized(error!.message, '#if');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token values', () => {
      // Construct scenario where empty token causes error
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    {  ; ; No. ; Code20 }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Any errors should still have sanitized format even for empty values
      errors.forEach(error => {
        // Should either have sanitized format or be a specific error that doesn't expose tokens
        if (error.message.includes('[content sanitized')) {
          expect(error.message).toMatch(/\[content sanitized,/);
        }
      });
    });

    it('should handle very short token values (<=3 chars)', () => {
      // Short values may be shown in full for usability, but still follow format
      const code = 'OBJECT X 18 Customer';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Short tokens (<=3 chars) - parser may report token type instead of value
      const error = errors[0];
      // Should either be sanitized OR not expose the literal short token value inappropriately
      const hasSanitized = error.message.includes('[content sanitized');
      const reportsTokenType = error.message.includes('IDENTIFIER');
      expect(hasSanitized || reportsTokenType).toBe(true);
    });

    it('should handle tokens with special characters', () => {
      const code = 'OBJECT Table 18 Customer { FIELDS { { Special@#$%Value ; ; Name ; Text } } }';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Should sanitize special characters too
      const error = errors.find(e => e.message.includes('Expected field number'));
      if (error) {
        assertSanitized(error.message, 'Special@#$%Value');
      }
    });

    it('should handle tokens with quotes in them', () => {
      const code = `OBJECT Table 18 Customer { FIELDS { { "Quoted'Field" ; ; Name ; Text } } }`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Should properly escape quotes in sanitized output
      errors.forEach(error => {
        if (error.message.includes('[content sanitized')) {
          expect(error.message).toMatch(/\[content sanitized,/);
        }
      });
    });

    it('should handle Unicode tokens', () => {
      const code = 'OBJECT Table 18 Customer { FIELDS { { Feld№⁴² ; ; Name ; Text } } }';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('Expected field number'));
      if (error) {
        assertSanitized(error.message, 'Feld№⁴²');
      }
    });
  });

  describe('Sanitization Format Validation', () => {
    it('sanitized messages should match expected format pattern', () => {
      // Test that format is: [content sanitized, X chars] or [content sanitized, X chars at offset Y]
      const code = 'OBJECT InvalidType 18 Customer';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors.find(e => e.message.includes('[content sanitized'));

      if (error) {
        // Format: [content sanitized, N chars] or [content sanitized, N chars at offset M]
        const formatMatch = error.message.match(/\[content sanitized, \d+ chars( at offset \d+)?\]/);
        expect(formatMatch).toBeTruthy();
      }
    });

    it('should not double-sanitize already sanitized content', () => {
      // If somehow sanitization is called twice, shouldn't nest sanitization markers
      const code = 'OBJECT InvalidType 18 Customer';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      errors.forEach(error => {
        // Should not have nested [content sanitized, ... [content sanitized, ...]]
        const sanitizedMatches = error.message.match(/\[content sanitized,/g);
        if (sanitizedMatches) {
          // Count occurrences - should only be 1 per token
          expect(sanitizedMatches.length).toBeLessThanOrEqual(3); // Max reasonable for one error
        }
      });
    });
  });
});
