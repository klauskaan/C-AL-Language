/**
 * ParseError Token Isolation Tests (Issue #147)
 *
 * Purpose:
 * Document and verify the security boundary around ParseError.token field.
 * This test suite validates that raw token content is isolated and never exposed to LSP clients.
 *
 * Design Decision (Documented):
 * - ParseError.token stores the raw Token object with unsanitized token.value field
 * - This is INTENTIONAL and SAFE because:
 *   1. LSP diagnostics use only error.message (sanitized), never error.token.value
 *   2. token.value.length is used for range calculation (safe - numeric value only)
 *   3. The token object itself is never serialized to the LSP client
 *
 * Security Boundary:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ ParseError Object (server-side only)                            │
 * │                                                                 │
 * │  .message   → SANITIZED (exposed to LSP client)                │
 * │  .token     → RAW CONTENT (server-internal use only)           │
 * │    ├─ .value      → Used for .length calculation ONLY         │
 * │    ├─ .line       → Safe numeric metadata                     │
 * │    ├─ .column     → Safe numeric metadata                     │
 * │    └─ .type       → Safe enum value                           │
 * └─────────────────────────────────────────────────────────────────┘
 *                              ↓
 *                   LSP Diagnostic (sent to client)
 *                   ┌─────────────────────────────┐
 *                   │ .message  (from .message)   │
 *                   │ .range    (from metadata)   │
 *                   │   ├─ start.line             │
 *                   │   ├─ start.character        │
 *                   │   ├─ end.line               │
 *                   │   └─ end.character          │
 *                   │ .severity (constant)        │
 *                   │ .source   (constant)        │
 *                   └─────────────────────────────┘
 *
 * Test Strategy:
 * 1. Verify error.token.value contains raw content (documented behavior)
 * 2. Verify error.message never contains raw content (safety boundary)
 * 3. Verify LSP diagnostic creation pattern uses only safe fields
 * 4. Document serialization risk (JSON.stringify would leak content)
 * 5. Verify position calculation uses numeric length only (safe)
 *
 * Related Files:
 * - server/src/parser/parser.ts (ParseError class definition)
 * - server/src/server.ts (diagnostic creation at lines 343-350)
 * - parse-error-integration.test.ts (end-to-end sanitization tests)
 * - parser-sanitization.test.ts (unit tests for sanitization calls)
 *
 * Related Issues:
 * - #147: Document ParseError.token isolation as intentional design
 * - #150: Sanitize token types in error messages (related security)
 */

import { Lexer } from '../../lexer/lexer';
import { TokenType } from '../../lexer/tokens';
import { Parser, ParseError } from '../parser';

/**
 * Helper: Parse code and return errors with full context
 *
 * @param code - C/AL code to parse (may contain intentional errors)
 * @returns Array of ParseError objects from parser.getErrors()
 */
function parseAndGetErrors(code: string): ParseError[] {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);

  parser.parse();
  return parser.getErrors();
}

/**
 * Helper: Simulate diagnostic creation pattern from server.ts:343-350
 *
 * This replicates the exact pattern used in the LSP server to create diagnostics.
 * It demonstrates that only safe fields are extracted from ParseError.
 *
 * @param error - ParseError to convert to diagnostic
 * @returns Diagnostic object (safe for LSP serialization)
 */
/**
 * Replicates the diagnostic creation pattern from server.ts:343-350
 *
 * IMPORTANT: This helper must stay in sync with server.ts diagnostic creation.
 * If server.ts adds new fields that might expose token.value, these tests
 * may not catch it. Consider periodic review.
 */
function createDiagnostic(error: ParseError) {
  return {
    severity: 1, // DiagnosticSeverity.Error
    range: {
      start: {
        line: error.token.line - 1,
        character: error.token.column - 1
      },
      end: {
        line: error.token.line - 1,
        character: error.token.column + error.token.value.length - 1
      }
    },
    message: error.message,
    source: 'cal'
  };
}

describe('ParseError Token Isolation (Issue #147)', () => {
  describe('Token Isolation Property', () => {
    it('should keep raw token.value for position calculation only', () => {
      // DESIGN DECISION: This test DOCUMENTS intentional behavior
      //
      // ParseError.token.value contains RAW unsanitized content because:
      // 1. We need the actual length for accurate diagnostic range calculation
      // 2. The Token object is never serialized or sent to the LSP client
      // 3. Only error.message (sanitized) is exposed in diagnostics
      //
      // This is SAFE because the LSP diagnostic creation pattern (server.ts:343-350)
      // extracts only: error.message, token.line, token.column, token.value.length

      const SENSITIVE = '$PROPRIETARY_CONTENT$';
      const code = `"${SENSITIVE}`;

      const errors = parseAndGetErrors(code);

      expect(errors.length).toBeGreaterThan(0);
      const error = errors[0];

      // DOCUMENTED BEHAVIOR: token.value contains RAW content
      // (This is intentional for position/length calculation)
      expect(error.token.value).toContain(SENSITIVE);

      // CRITICAL SAFETY: error.message NEVER contains raw content
      expect(error.message).not.toContain(SENSITIVE);
      expect(error.message).toMatch(/\[content sanitized|UNKNOWN/);
    });

    it('should isolate raw token.value for unclosed quoted identifiers', () => {
      // Test that unclosed quoted identifiers keep raw value in token
      // but sanitized value in message

      const SENSITIVE_IDENTIFIER = '$SECRET_TABLE_NAME$';
      const code = `"${SENSITIVE_IDENTIFIER}`;

      const errors = parseAndGetErrors(code);

      expect(errors.length).toBeGreaterThan(0);
      const error = errors[0];

      // Raw value exists in token (for length calculation)
      expect(error.token.value).toContain(SENSITIVE_IDENTIFIER);

      // Message is sanitized
      expect(error.message).not.toContain(SENSITIVE_IDENTIFIER);
    });

    it('should isolate raw token.value for unclosed string literals', () => {
      // Test that unclosed string literals keep raw value in token
      // but sanitized value in message

      const SENSITIVE_STRING = '$CONFIDENTIAL_DATA$';
      const code = `'${SENSITIVE_STRING}`;

      const errors = parseAndGetErrors(code);

      // Find error with sensitive content
      const sensitiveError = errors.find(e =>
        e.token.value.includes(SENSITIVE_STRING)
      );

      expect(sensitiveError).toBeDefined();

      // Raw value in token
      expect(sensitiveError!.token.value).toContain(SENSITIVE_STRING);

      // Sanitized in message
      expect(sensitiveError!.message).not.toContain(SENSITIVE_STRING);
    });

    it('should isolate raw token.value for unknown characters', () => {
      // Test that unknown characters keep raw value in token
      // but sanitized value in message

      const UNKNOWN_CHAR = '~';
      const code = `${UNKNOWN_CHAR}`;

      const errors = parseAndGetErrors(code);

      expect(errors.length).toBeGreaterThan(0);

      // Find UNKNOWN token error
      const unknownError = errors.find(e => e.token.type === TokenType.Unknown);
      expect(unknownError).toBeDefined();

      // Raw value exists in token
      expect(unknownError!.token.value).toBeTruthy();

      // Message is sanitized or mentions UNKNOWN
      const hasSanitized = unknownError!.message.includes('[content sanitized');
      const mentionsUnknown = unknownError!.message.includes('UNKNOWN');
      expect(hasSanitized || mentionsUnknown).toBe(true);
    });
  });

  describe('LSP Diagnostic Field Isolation', () => {
    it('should use error.message not error.token.value for diagnostics', () => {
      // This test simulates the exact diagnostic creation pattern from server.ts:343-350
      // It verifies that diagnostics use only safe fields from ParseError

      const SENSITIVE = '$SECRET_CODE$';
      const code = `"${SENSITIVE}`;

      const errors = parseAndGetErrors(code);

      // Simulate diagnostic creation (as server.ts does)
      const diagnostics = errors.map(error => createDiagnostic(error));

      // Verify diagnostics contain no raw sensitive content
      diagnostics.forEach(diag => {
        // Message is sanitized
        expect(diag.message).not.toContain(SENSITIVE);

        // Range uses numeric values only - safe
        expect(typeof diag.range.start.line).toBe('number');
        expect(typeof diag.range.start.character).toBe('number');
        expect(typeof diag.range.end.line).toBe('number');
        expect(typeof diag.range.end.character).toBe('number');

        // Source is constant string - safe
        expect(diag.source).toBe('cal');

        // Severity is numeric constant - safe
        expect(typeof diag.severity).toBe('number');
      });
    });

    it('should extract only safe numeric metadata from token', () => {
      // Verify that LSP diagnostic creation extracts ONLY safe numeric metadata,
      // never the token.value string itself

      const code = `~`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const diagnostic = createDiagnostic(errors[0]);

      // Verify all extracted fields are safe types
      expect(typeof diagnostic.severity).toBe('number');
      expect(typeof diagnostic.range.start.line).toBe('number');
      expect(typeof diagnostic.range.start.character).toBe('number');
      expect(typeof diagnostic.range.end.line).toBe('number');
      expect(typeof diagnostic.range.end.character).toBe('number');
      expect(typeof diagnostic.message).toBe('string'); // But sanitized!
      expect(typeof diagnostic.source).toBe('string'); // Constant value

      // Verify the diagnostic object has no reference to token object
      expect(diagnostic).not.toHaveProperty('token');
    });

    it('should use token.value.length for range calculation only', () => {
      // Verify that token.value is accessed ONLY for its .length property,
      // which is a safe numeric value, not the string content itself

      const code = `"UnclosedIdentifier`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const error = errors[0];
      const diagnostic = createDiagnostic(error);

      // The .length is used for calculating the end character position
      const expectedLength = error.token.value.length;
      const calculatedEndChar = error.token.column + expectedLength - 1;

      // Verify the diagnostic uses the length-based calculation
      expect(diagnostic.range.end.character).toBe(calculatedEndChar);

      // This is safe because we're using the LENGTH (number), not VALUE (string)
      expect(typeof expectedLength).toBe('number');
      expect(typeof calculatedEndChar).toBe('number');
    });
  });

  describe('Error Message vs Token Value Separation', () => {
    it('should never include raw token.value in error.message', () => {
      // Test all Unknown token sources to ensure none leak token.value

      const testCases = [
        {
          desc: 'Unclosed quoted identifier',
          code: `"$SENSITIVE_ID`
        },
        {
          desc: 'Unclosed string',
          code: `'$SENSITIVE_STR`
        },
        {
          desc: 'Unknown character',
          code: `~`
        }
      ];

      testCases.forEach(({ code }) => {
        const errors = parseAndGetErrors(code);

        errors.forEach(error => {
          if (error.token.type === TokenType.Unknown) {
            // Raw value exists in token (for position calculation)
            expect(error.token.value).toBeTruthy();

            // But NEVER appears in the message
            expect(error.message).not.toContain(error.token.value);

            // Should use sanitized format
            expect(error.message).toMatch(/\[content sanitized|UNKNOWN/);
          }
        });
      });
    });

    it('should sanitize all UNKNOWN token values in messages', () => {
      // Regression test: ensure no UNKNOWN token value leaks into error messages

      const code = `"UnclosedFieldName`;

      const errors = parseAndGetErrors(code);

      // Find UNKNOWN token errors
      const unknownErrors = errors.filter(e => e.token.type === TokenType.Unknown);
      expect(unknownErrors.length).toBeGreaterThan(0);

      unknownErrors.forEach(error => {
        // Token has raw value
        expect(error.token.value).toBeTruthy();

        // Message does NOT contain raw value
        expect(error.message).not.toContain(error.token.value);
      });
    });

    it('should use sanitized format for all error messages', () => {
      // Verify that error messages use proper sanitization markers

      const code = `"$UNCLOSED`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      errors.forEach(error => {
        if (error.token.type === TokenType.Unknown) {
          // Should either be marked as UNKNOWN or use sanitized format
          const isSanitized =
            error.message.includes('[content sanitized') ||
            error.message.includes('UNKNOWN');

          expect(isSanitized).toBe(true);
        }
      });
    });
  });

  describe('Serialization Safety', () => {
    it('should document that token field is not serializable to JSON safely', () => {
      // WARNING: This test documents the RISK of serializing ParseError
      //
      // If someone calls JSON.stringify(error), it WILL include token.value.
      // This is why LSP diagnostics MUST extract only safe fields.

      const SENSITIVE = '$CLASSIFIED$';
      const code = `"${SENSITIVE}`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const error = errors[0];

      // WARNING: If you JSON.stringify(error), it will include token.value
      // This is why LSP diagnostics must extract only error.message
      const serialized = JSON.stringify(error);
      expect(serialized).toContain(SENSITIVE); // <-- This is the risk!

      // SAFE PATTERN: Extract only safe fields
      const safeDiagnostic = {
        message: error.message,
        line: error.token.line,
        column: error.token.column
        // NOT: token.value
      };
      const safeSerialized = JSON.stringify(safeDiagnostic);
      expect(safeSerialized).not.toContain(SENSITIVE);
    });

    it('should demonstrate safe extraction pattern', () => {
      // This test documents the CORRECT way to extract data from ParseError
      // for serialization or LSP transmission

      const SENSITIVE = '$PROPRIETARY_CODE$';
      const code = `"${SENSITIVE}`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const error = errors[0];

      // BAD: Direct serialization includes token.value
      const badSerialization = JSON.stringify(error);
      expect(badSerialization).toContain(SENSITIVE);

      // GOOD: Extract only safe fields (as server.ts does)
      const goodDiagnostic = createDiagnostic(error);
      const goodSerialization = JSON.stringify(goodDiagnostic);
      expect(goodSerialization).not.toContain(SENSITIVE);

      // Verify the good diagnostic has all needed info
      expect(goodDiagnostic.message).toBeTruthy();
      expect(goodDiagnostic.range.start.line).toBeGreaterThanOrEqual(0);
      expect(goodDiagnostic.range.start.character).toBeGreaterThanOrEqual(0);
    });

    it('should verify server.ts pattern creates serialization-safe diagnostics', () => {
      // This test validates that the pattern used in server.ts creates
      // diagnostics that are safe to serialize and send over LSP

      const code = `~`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      // Create diagnostics using server.ts pattern
      const diagnostics = errors.map(error => createDiagnostic(error));

      // Serialize diagnostics (as LSP does)
      const serialized = JSON.stringify(diagnostics);

      // Verify serialization contains only safe data
      // Parse back and verify structure
      const parsed = JSON.parse(serialized);

      expect(Array.isArray(parsed)).toBe(true);
      parsed.forEach((diag: any) => {
        // Has expected structure
        expect(diag).toHaveProperty('severity');
        expect(diag).toHaveProperty('range');
        expect(diag).toHaveProperty('message');
        expect(diag).toHaveProperty('source');

        // Does NOT have token field
        expect(diag).not.toHaveProperty('token');

        // Range has numeric values
        expect(typeof diag.range.start.line).toBe('number');
        expect(typeof diag.range.start.character).toBe('number');
        expect(typeof diag.range.end.line).toBe('number');
        expect(typeof diag.range.end.character).toBe('number');
      });
    });
  });

  describe('Position Calculation', () => {
    it('should use token.value.length for diagnostic range accuracy', () => {
      // Verify that token.value.length is the ONLY way we access token.value
      // in LSP diagnostic creation, and it's safe because length is numeric

      const code = `"UnclosedQuotedIdentifier`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const error = errors[0];

      // Length calculation needs the real value length
      const expectedLength = error.token.value.length;
      const diagnosticEndChar = error.token.column + expectedLength - 1;

      // This is safe because we're using the LENGTH (number), not the VALUE (string)
      expect(typeof expectedLength).toBe('number');
      expect(typeof diagnosticEndChar).toBe('number');
      expect(diagnosticEndChar).toBeGreaterThan(error.token.column);

      // Verify diagnostic creation uses this pattern
      const diagnostic = createDiagnostic(error);
      expect(diagnostic.range.end.character).toBe(diagnosticEndChar);
    });

    it('should calculate accurate ranges for multi-character tokens', () => {
      // Verify range calculation works correctly for tokens of various lengths

      const testCases = [
        { code: `"short` },
        { code: `"VeryLongIdentifierName` },
        { code: `'String with spaces` }
      ];

      testCases.forEach(({ code }) => {
        const errors = parseAndGetErrors(code);
        expect(errors.length).toBeGreaterThan(0);

        const error = errors[0];
        const diagnostic = createDiagnostic(error);

        // Verify range calculation is based on token.value.length
        // LSP ranges are half-open [start, end), so length = end - start
        const expectedRangeLength = error.token.value.length;
        const actualRangeLength =
          diagnostic.range.end.character - diagnostic.range.start.character;

        expect(actualRangeLength).toBe(expectedRangeLength);
      });
    });

    it('should use numeric length even for sensitive token values', () => {
      // Verify that even when token.value contains sensitive data,
      // we only extract its numeric length for range calculation

      const SENSITIVE = 'EXTREMELY_SENSITIVE_PROPRIETARY_IDENTIFIER_NAME';
      const code = `"${SENSITIVE}`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const error = errors[0];

      // Token contains sensitive value (or at least part of it)
      expect(error.token.value).toBeTruthy();

      // But we only use its length (safe numeric value)
      const length = error.token.value.length;
      expect(typeof length).toBe('number');

      // Diagnostic uses only the length
      // LSP ranges are half-open [start, end), so length = end - start
      const diagnostic = createDiagnostic(error);
      const rangeLength =
        diagnostic.range.end.character - diagnostic.range.start.character;

      expect(rangeLength).toBe(length);

      // Diagnostic message is sanitized
      expect(diagnostic.message).not.toContain(SENSITIVE);

      // Diagnostic serialization is safe
      const serialized = JSON.stringify(diagnostic);
      expect(serialized).not.toContain(SENSITIVE);
    });
  });

  describe('Future-Proofing', () => {
    it('should fail if ParseError adds new fields that might leak content', () => {
      // This test serves as a canary: if ParseError structure changes,
      // we need to review the security implications

      const code = `~`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const error = errors[0];

      // Document expected ParseError structure
      const expectedFields = ['message', 'name', 'stack', 'token'];

      // Get actual fields (excluding inherited Error properties we don't control)
      const actualFields = Object.keys(error).filter(key =>
        !['name', 'stack'].includes(key)
      );

      // If new fields are added, this test will fail
      // Review each new field for potential content leakage
      actualFields.forEach(field => {
        expect(expectedFields).toContain(field);
      });
    });

    it('should document the safe diagnostic creation pattern for future maintainers', () => {
      // This test serves as living documentation of the CORRECT pattern
      // for extracting data from ParseError

      const code = `~`;

      const errors = parseAndGetErrors(code);
      expect(errors.length).toBeGreaterThan(0);

      const error = errors[0];

      // SAFE PATTERN (as documented in server.ts:343-350):
      const safeDiagnostic = {
        // Extract sanitized message (safe)
        message: error.message,

        // Extract numeric metadata (safe)
        severity: 1,
        range: {
          start: {
            line: error.token.line - 1,        // Safe: numeric
            character: error.token.column - 1  // Safe: numeric
          },
          end: {
            line: error.token.line - 1,                           // Safe: numeric
            character: error.token.column + error.token.value.length - 1  // Safe: numeric length
          }
        },

        // Constant values (safe)
        source: 'cal'
      };

      // Verify this pattern creates serialization-safe output
      const serialized = JSON.stringify(safeDiagnostic);

      // Should contain message
      expect(serialized).toContain(error.message);

      // Should NOT contain raw token
      expect(serialized).not.toContain('"token"');

      // Should NOT contain token.value string (only its length was used)
      // We can't test this directly, but we verify structure is safe
      const parsed = JSON.parse(serialized);
      expect(parsed).not.toHaveProperty('token');
    });
  });
});
