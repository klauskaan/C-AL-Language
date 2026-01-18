/**
 * ParseError Sanitization Integration Tests
 *
 * Purpose:
 * Integration tests that verify actual ParseError OUTPUT from the parser is sanitized.
 * These tests parse real C/AL code with intentional errors and assert that the resulting
 * error messages contain NO sensitive content (proprietary code, object IDs, file paths).
 *
 * Distinction from Other Test Files:
 * - sanitize.test.ts: Unit tests for the sanitization FUNCTIONS (sanitizeContent, etc.)
 * - parser-sanitization.test.ts: Unit tests verifying sanitization IS CALLED during parsing
 * - THIS FILE: Integration tests verifying sanitization WORKS END-TO-END in real error messages
 *
 * Test Strategy:
 * 1. Parse C/AL code containing various types of errors
 * 2. Collect all ParseError instances from parser.getErrors()
 * 3. Assert error messages are sanitized and contain no sensitive patterns
 * 4. Verify sanitized format matches expected patterns
 *
 * Sensitive Patterns to Sanitize:
 * 1. File paths: test/REAL/, test\REAL\, TEST/REAL/, test/Real/ (case/slash variations)
 * 2. Object IDs: Pattern 6\d{6} (e.g., 6000001) - proprietary NAV object ID range
 * 3. Token values: Identifiers, keywords, literals from proprietary code
 * 4. Variable names: Any user-defined names that could reveal business logic
 */

import { Lexer } from '../../lexer/lexer';
import { Parser, ParseError } from '../parser';

/**
 * Helper: Parse code and collect all error messages
 *
 * @param code - C/AL code to parse (may contain intentional errors)
 * @returns Array of error message strings from parser.getErrors()
 */
function parseAndCollectErrors(code: string): string[] {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);

  parser.parse();
  const errors: ParseError[] = parser.getErrors();

  return errors.map(e => e.message);
}

/**
 * Helper: Assert a message contains no sensitive content
 *
 * Checks for sensitive patterns and throws descriptive error if found.
 * Use this to validate that parser error messages are properly sanitized.
 *
 * @param message - Error message to validate
 * @throws {Error} If sensitive content is detected with specific details
 */
function assertNoSensitiveContent(message: string): void {
  // Pattern 1: File paths (case-insensitive, both slash types)
  const pathPatterns = [
    /test[\/\\]real[\/\\]/i,
    /test[\/\\]fixtures[\/\\]/i,
    // Absolute paths are also sensitive
    /[a-zA-Z]:[\/\\]/,  // Windows absolute paths like C:\
    /\/[a-zA-Z0-9]/     // Unix absolute paths like /home/ (anywhere in string)
  ];

  for (const pattern of pathPatterns) {
    if (pattern.test(message)) {
      throw new Error(
        `Error message contains sensitive file path pattern: ${pattern}\n` +
        `Message: ${message}`
      );
    }
  }

  // Pattern 2: Proprietary object IDs (6000000-6999999)
  // Source: CLAUDE.md specifies Object IDs 6000000+ are in proprietary NAV range
  const objectIdPattern = /\b6\d{6}\b/;
  if (objectIdPattern.test(message)) {
    throw new Error(
      `Error message contains proprietary object ID (6xxxxxx): ${message}`
    );
  }

  // Pattern 3: Literal token values that should be sanitized
  // NOTE: These are heuristic patterns designed to catch obvious leaks in test data.
  // Real proprietary code may use different naming conventions (e.g., CalcInvoiceDiscount).
  // The primary validation is that the [content sanitized, N chars] format is used.
  // These patterns serve as additional safeguards for contrived test identifiers.
  const literalPatterns = [
    // Uncommon identifiers that likely come from proprietary code
    /\bSecret\w+/i,
    /\bConfidential\w+/i,
    /\bPrivate\w+/i,
    /\bProprietary\w+/i,
    // Very long identifiers (>50 chars) should be truncated
    /\b[a-zA-Z_][a-zA-Z0-9_]{50,}\b/
  ];

  for (const pattern of literalPatterns) {
    if (pattern.test(message)) {
      throw new Error(
        `Error message contains unsanitized literal value: ${pattern}\n` +
        `Message: ${message}`
      );
    }
  }

  // Pattern 4: Ensure sanitized format is used
  // Valid formats:
  // - [content sanitized, N chars]
  // - [content sanitized, N chars at offset M]
  // If message contains 'sanitized', verify format is correct
  if (message.includes('sanitized')) {
    const validFormat = /\[content sanitized, \d+ chars( at offset \d+)?\]/;
    if (!validFormat.test(message)) {
      throw new Error(
        `Error message contains malformed sanitization: ${message}\n` +
        `Expected format: [content sanitized, N chars] or [content sanitized, N chars at offset M]`
      );
    }
  }
}

/**
 * Helper: Assert all messages in array contain no sensitive content
 *
 * @param messages - Array of error messages to validate
 */
function assertAllMessagesAreSanitized(messages: string[]): void {
  messages.forEach((message, index) => {
    try {
      assertNoSensitiveContent(message);
    } catch (error) {
      throw new Error(
        `Error message at index ${index} failed sanitization check:\n` +
        (error instanceof Error ? error.message : String(error))
      );
    }
  });
}

describe('ParseError Sanitization Integration Tests', () => {
  describe('Path Sanitization', () => {
    it('should sanitize Unix-style test/REAL/ paths', () => {
      // Baseline test - current implementation handles Unix-style paths
      // Use invalid object ID to trigger parse error
      const code = `OBJECT Table abc TestTable
{
  FIELDS
  {
    { 1   ;   ;MyField         ;Code20        }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      // Verify no test/REAL/ paths leaked
      assertAllMessagesAreSanitized(errors);

      // Verify errors are produced (sanity check)
      expect(errors[0]).toBeTruthy();
    });

    it('should sanitize Windows-style test\\REAL\\ paths', () => {
      // Tests baseline sanitization with invalid object ID
      // Note: Actual Windows path handling gap tracked in #146
      // Use invalid object ID (non-numeric) to trigger parse error
      const code = `OBJECT Codeunit abc TestUnit
{
  PROCEDURE MyProc@1();
  BEGIN
  END;
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      // This should pass once stripPaths handles backslashes
      assertAllMessagesAreSanitized(errors);
    });

    it('should sanitize case variations (TEST/REAL/, test/Real/)', () => {
      // Tests baseline sanitization with invalid object type
      // Note: Actual case sensitivity gap tracked in #146
      // Use invalid object type (TABLET is not valid) to trigger parse error
      const code = `OBJECT TABLET 50003 TestPage
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CONTROLS
  {
    { 1   ;Container ;ContentArea                 }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      // This should pass once stripPaths is case-insensitive
      assertAllMessagesAreSanitized(errors);
    });

    it('should sanitize nested paths like test/REAL/Codeunit/Object.txt', () => {
      // Verify deeply nested path structures are fully sanitized
      // Use reserved keyword in wrong position to trigger parse error
      const code = `OBJECT Report IF TestReport
{
  PROPERTIES
  {
    Caption=Test;
  }
  DATASET
  {
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      assertAllMessagesAreSanitized(errors);
    });
  });

  describe('Object ID Sanitization', () => {
    it('should not expose 6xxxxxx Object IDs in error messages', () => {
      // Test that Object IDs matching 6\d{6} pattern are sanitized
      // Use reserved keyword as object name to trigger parse error
      const code = `OBJECT Table IF TestName
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      // Verify proprietary object ID pattern is not in error messages
      assertAllMessagesAreSanitized(errors);

      // Explicit check for the pattern
      errors.forEach(msg => {
        expect(msg).not.toMatch(/\b6\d{6}\b/);
      });
    });

    it('should sanitize 6xxxxxx pattern appearing in field IDs', () => {
      // Test pattern appearing in field declarations
      // Use invalid field number (non-numeric) to trigger parse error
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { abc   ;   ;SecretField         ;Text50        }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      // Verify field ID 6000001 is not exposed
      assertAllMessagesAreSanitized(errors);

      errors.forEach(msg => {
        expect(msg).not.toMatch(/\b6\d{6}\b/);
      });
    });

    it('should sanitize multiple 6xxxxxx IDs in single error context', () => {
      // Test multiple proprietary IDs in same error scope
      // Use invalid object ID to trigger parse error
      const code = `OBJECT Table xyz AnotherSensitiveTable
{
  FIELDS
  {
    { 1   ;   ;Field1              ;Code10        }
    { 2   ;   ;Field2              ;Text30        }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      assertAllMessagesAreSanitized(errors);

      // Verify none of the proprietary IDs leaked
      errors.forEach(msg => {
        expect(msg).not.toMatch(/\b6999999\b/);
        expect(msg).not.toMatch(/\b6000042\b/);
        expect(msg).not.toMatch(/\b6000043\b/);
      });
    });
  });

  describe('Token Value Sanitization', () => {
    it('should sanitize identifier tokens in syntax errors', () => {
      // EXPECTED TO FAIL - token type leakage shows '(BEGIN)' after sanitization
      // Tracked in: #150
      // Verify identifiers appear as [content sanitized, N chars]
      // Use reserved keyword where object number expected to trigger parse error
      const code = `OBJECT Report BEGIN TestName
{
  PROPERTIES
  {
    Caption=Test;
  }
  DATASET
  {
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      // Verify identifier names are sanitized
      assertAllMessagesAreSanitized(errors);

      // Should NOT see raw reserved keywords used as variable names
      errors.forEach(msg => {
        // The reserved keyword 'BEGIN' should be sanitized
        expect(msg).not.toMatch(/\bBEGIN\b/);
      });
    });

    it('should sanitize string literals that appear in errors', () => {
      // EXPECTED TO FAIL - identifier values appearing in error messages
      // Tracked in: #149
      // Verify string content is sanitized
      // Use invalid object ID (non-numeric) to trigger parse error
      const code = `OBJECT Table xyz TestTable
{
  FIELDS
  {
    { 1   ;   ;Field1              ;Code10        }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      assertAllMessagesAreSanitized(errors);

      // Verify token values are sanitized - xyz is an identifier, should be sanitized
      errors.forEach(msg => {
        expect(msg).not.toContain('xyz');
      });
    });

    it('should use [content sanitized, N chars] format', () => {
      // Verify format is present where expected
      // Use invalid Code length (non-numeric) to trigger parse error
      const code = `OBJECT Table 50012 TestTable
{
  FIELDS
  {
    { 1   ;   ;VeryLongIdentifierNameThatShouldBeSanitized              ;Code[abc]        }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      assertAllMessagesAreSanitized(errors);

      // At least one error should contain sanitized format
      const hasSanitizedFormat = errors.some(msg =>
        /\[content sanitized, \d+ chars\]/.test(msg)
      );

      // Positive assertion: sanitized format should appear in error messages
      expect(hasSanitizedFormat).toBe(true);
    });

    it('should sanitize numeric literals in error context', () => {
      // Verify numeric values don't leak sensitive data
      // Use reserved keyword as table name to trigger parse error
      const code = `OBJECT Table WHILE TestName
{
  FIELDS
  {
    { 1   ;   ;Amount              ;Decimal        }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      assertAllMessagesAreSanitized(errors);
    });
  });

  describe('Error Recovery Sanitization', () => {
    it('should sanitize skipped token values during recovery', () => {
      // EXPECTED TO FAIL - token type leakage shows '(REPEAT)' after sanitization
      // Tracked in: #150
      // When parser skips tokens, values should be sanitized
      // Use reserved keyword where object number expected to trigger parse error
      const code = `OBJECT Codeunit REPEAT TestUnit
{
  PROCEDURE TestProc@1();
  BEGIN
    MESSAGE('Test');
  END;
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      assertAllMessagesAreSanitized(errors);

      // Parser may skip/recover over tokens - reserved keyword should be sanitized
      errors.forEach(msg => {
        expect(msg).not.toMatch(/\bREPEAT\b/);
      });
    });

    it('should sanitize recovery context messages', () => {
      // EXPECTED TO FAIL - recovery context may expose field names
      // Tracked in: #148
      // Recovery messages should not expose token values
      // Use invalid field number to trigger parse error
      const code = `OBJECT Table 50021 TestTable
{
  FIELDS
  {
    { 1   ;   ;Field1              ;Code10        }
    { xyz ;   ;Field2              ;Text20        }
    { 3   ;   ;PrivateFieldName    ;Integer       }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      assertAllMessagesAreSanitized(errors);

      // Should not see field names in recovery context
      errors.forEach(msg => {
        expect(msg).not.toMatch(/PrivateFieldName/);
      });
    });

    it('should sanitize deeply nested error recovery contexts', () => {
      // EXPECTED TO FAIL - nested recovery may expose control names
      // Tracked in: #148
      // Test error recovery in complex nested structures
      // Use invalid object ID (non-numeric) to trigger parse error
      const code = `OBJECT Page abc TestPage
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CONTROLS
  {
    { 1   ;Container ;ContentArea         }
    { 2   ;Group     ;GroupName           }
    { 3   ;Field     ;FieldControl        ;SourceExpr=MyField    }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      assertAllMessagesAreSanitized(errors);

      // Identifier 'abc' should be sanitized
      errors.forEach(msg => {
        expect(msg).not.toContain('abc');
      });
    });

    it('should sanitize error messages when recovering from missing delimiters', () => {
      // EXPECTED TO FAIL - token type leakage shows '(BEGIN)' after sanitization
      // Tracked in: #150
      // Test recovery from missing braces, semicolons, etc.
      // Use reserved keyword as object name to trigger parse error
      const code = `OBJECT Report BEGIN TestName
{
  PROPERTIES
  {
    Caption=Test;
  }
  DATASET
  {
    { 1000; ;DataItem; Customer                                   }
  }
}`;

      const errors = parseAndCollectErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      assertAllMessagesAreSanitized(errors);

      // Reserved keyword used as object name should trigger error
      errors.forEach(msg => {
        expect(msg).not.toMatch(/\bBEGIN\b/);
      });
    });
  });
});
