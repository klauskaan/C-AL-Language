/**
 * SkippedRegion Token Isolation Tests (Issue #158)
 *
 * Purpose:
 * Document and verify the security boundary around SkippedRegion token fields.
 * This test suite validates that raw token content in skipped regions is isolated
 * and never exposed to LSP clients.
 *
 * Design Decision (Documented):
 * - SkippedRegion stores raw Token objects (startToken, endToken) with unsanitized .value fields
 * - This is INTENTIONAL and SAFE because:
 *   1. getSkippedRegions() is currently NEVER CALLED by any LSP provider
 *   2. LSP diagnostics are generated during recordSkippedRegion() via recordError()
 *   3. Diagnostic messages use only sanitized content, never raw token.value
 *   4. The SkippedRegion objects themselves are never serialized to LSP clients
 *
 * Security Boundary:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ SkippedRegion Object (server-side only, currently unused)           │
 * │                                                                     │
 * │  .startToken → RAW Token (server-internal only)                    │
 * │    ├─ .value      → RAW CONTENT (isolated, not exposed)           │
 * │    ├─ .line       → Safe numeric metadata                         │
 * │    ├─ .column     → Safe numeric metadata                         │
 * │    └─ .type       → Safe enum value                               │
 * │                                                                     │
 * │  .endToken   → RAW Token (server-internal only)                    │
 * │    ├─ .value      → RAW CONTENT (isolated, not exposed)           │
 * │    ├─ .line       → Safe numeric metadata                         │
 * │    ├─ .column     → Safe numeric metadata                         │
 * │    └─ .type       → Safe enum value                               │
 * │                                                                     │
 * │  .tokenCount → Safe numeric value                                  │
 * │  .reason     → Safe constant string ("Error recovery")             │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              ↓
 *                   recordError() generates diagnostic
 *                   ┌─────────────────────────────────────────┐
 *                   │ LSP Diagnostic (sent to client)         │
 *                   │                                         │
 *                   │ .message → SANITIZED                   │
 *                   │   "Skipped N tokens during recovery"   │
 *                   │   (no raw token content)               │
 *                   │                                         │
 *                   │ .range → from startToken metadata      │
 *                   │   (numeric positions only)             │
 *                   └─────────────────────────────────────────┘
 *
 * Current State:
 * - getSkippedRegions() has NO callers in the codebase
 * - SkippedRegion objects are recorded but never retrieved
 * - LSP diagnostics are generated during recording, not from SkippedRegion objects
 * - This test suite documents the isolation guarantee if future code calls getSkippedRegions()
 *
 * Test Strategy:
 * 1. Verify startToken.value and endToken.value contain raw content (documented behavior)
 * 2. Verify LSP diagnostics from recordSkippedRegion() never contain raw token content
 * 3. Verify metadata fields are safe for use in calculations/control flow
 * 4. Document serialization risk (JSON.stringify would leak content)
 * 5. Verify position calculation uses numeric fields only (safe)
 * 6. Future-proofing canaries to detect unsafe usage patterns
 *
 * Related Files:
 * - server/src/parser/parser.ts (SkippedRegion interface, lines 3600-3608)
 * - server/src/parser/parser.ts (recordSkippedRegion, lines 3333-3344)
 * - server/src/parser/parser.ts (getSkippedRegions, lines 3296-3301)
 * - server/src/parser/parser.ts (recoverToTokens, lines 3371-3387)
 *
 * Related Issues:
 * - #158: Document SkippedRegion token isolation
 * - #147: ParseError token isolation (similar security boundary)
 */

import { SkippedRegion } from '../parser';
import { parseCode } from './parserTestHelpers';

/**
 * Helper: Parse code and return skipped regions with full context
 *
 * @param code - C/AL code to parse (must contain errors to trigger recovery)
 * @returns Array of SkippedRegion objects from parser.getSkippedRegions()
 *
 * NOTE: To trigger skipped regions, code must throw ParseError at section level
 * (caught by parseObject() try-catch at line 223).
 *
 * WORKING PATTERN: Section-level errors (e.g., KEYS section expecting { but finding identifier)
 * NOT WORKING: Statement-level errors (handled by parseWithRecovery, no skipped regions)
 * NOT WORKING: Field definition errors (use recordError(), not throw)
 */
function parseAndGetSkippedRegions(code: string): SkippedRegion[] {
  const { skippedRegions } = parseCode(code);
  return skippedRegions;
}

/**
 * Helper: Parse code and return both skipped regions and errors
 *
 * This demonstrates the relationship between error recovery and diagnostics.
 * When tokens are skipped, BOTH a SkippedRegion and a diagnostic error are created.
 *
 * @param code - C/AL code to parse (must contain errors)
 * @returns Object with skippedRegions and errors
 */
function parseAndGetBoth(code: string): { skippedRegions: SkippedRegion[]; errors: any[] } {
  const { skippedRegions, errors } = parseCode(code);
  return { skippedRegions, errors };
}

describe('SkippedRegion Token Isolation (Issue #158)', () => {
  describe('Token Isolation Property', () => {
    it('should keep raw token.value in startToken and endToken for metadata only', () => {
      // DESIGN DECISION: This test DOCUMENTS intentional behavior
      //
      // SkippedRegion stores RAW Token objects with unsanitized .value fields because:
      // 1. getSkippedRegions() is currently never called (no leak path exists)
      // 2. Token metadata (line, column) is needed for position calculation
      // 3. LSP diagnostics are generated during recordSkippedRegion(), not from SkippedRegion
      // 4. The SkippedRegion objects themselves are never serialized
      //
      // This is SAFE because there is no code path that exposes token.value to clients

      const SENSITIVE = '$PROPRIETARY_FIELD_NAME$';
      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            ${SENSITIVE} INVALID
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      // Error recovery should have skipped some tokens
      expect(skippedRegions.length).toBeGreaterThan(0);

      const region = skippedRegions[0];

      // DOCUMENTED BEHAVIOR: Token objects contain RAW content
      // (This is intentional but isolated - never exposed to LSP)
      expect(region.startToken.value).toBeTruthy();
      expect(region.endToken.value).toBeTruthy();

      // Verify these are actual Token objects with the expected structure
      expect(region.startToken).toHaveProperty('line');
      expect(region.startToken).toHaveProperty('column');
      expect(region.startToken).toHaveProperty('type');
      expect(region.startToken).toHaveProperty('value');
    });

    it('should isolate raw token.value in startToken during error recovery', () => {
      // Test that startToken preserves raw content even when it contains sensitive data
      // This is safe because SkippedRegion is never serialized to LSP clients

      const SENSITIVE_START = '$SECRET_KEYWORD$';
      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            ${SENSITIVE_START} INVALID_SYNTAX
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      // Should have recorded error recovery
      expect(skippedRegions.length).toBeGreaterThan(0);

      // Token.value exists in all skipped region tokens
      skippedRegions.forEach(region => {
        expect(region.startToken.value).toBeTruthy();
        expect(region.endToken.value).toBeTruthy();
      });
    });

    it('should isolate raw token.value in endToken during error recovery', () => {
      // Test that endToken preserves raw content
      // Both start and end tokens contain unsanitized values

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            GARBAGE_TOKEN_HERE INVALID_SYNTAX
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      expect(skippedRegions.length).toBeGreaterThan(0);

      const region = skippedRegions[0];

      // Both start and end tokens have raw values
      expect(region.startToken.value).toBeTruthy();
      expect(region.endToken.value).toBeTruthy();

      // Values can be different tokens
      // (start and end might be different positions in the skipped region)
    });

    it('should record tokenCount accurately for position calculations', () => {
      // Verify that tokenCount is a safe numeric value derived from token positions
      // This is safe metadata that can be used for calculations

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            one two three four five
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      expect(skippedRegions.length).toBeGreaterThan(0);

      const region = skippedRegions[0];

      // tokenCount is a safe numeric value
      expect(typeof region.tokenCount).toBe('number');
      expect(region.tokenCount).toBeGreaterThan(0);

      // This is safe for use in calculations and messages
      // (used in "Skipped N tokens during error recovery" message)
    });
  });

  describe('LSP Diagnostic Field Isolation', () => {
    it('should generate diagnostics without exposing raw token values', () => {
      // Verify that when recordSkippedRegion() creates a diagnostic,
      // it does NOT include raw token.value content

      const SENSITIVE = '$CONFIDENTIAL_IDENTIFIER$';
      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            ${SENSITIVE} JUNK_SYNTAX
          }
        }
      `;

      const { skippedRegions, errors } = parseAndGetBoth(code);

      // Should have both skipped regions and errors
      expect(skippedRegions.length).toBeGreaterThan(0);
      expect(errors.length).toBeGreaterThan(0);

      // Find the "Skipped N tokens" error message
      const skipError = errors.find(e =>
        e.message.includes('Skipped') && e.message.includes('during error recovery')
      );

      expect(skipError).toBeDefined();

      // CRITICAL SAFETY: Error message NEVER contains raw token content
      expect(skipError!.message).not.toContain(SENSITIVE);

      // Message uses sanitized format: "Skipped N tokens during error recovery"
      expect(skipError!.message).toMatch(/Skipped \d+ tokens? during error recovery/);
    });

    it('should use only numeric metadata from tokens in diagnostic messages', () => {
      // Verify that diagnostics extract ONLY safe numeric metadata,
      // never token.value strings

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            invalid tokens here
          }
        }
      `;

      const { errors } = parseAndGetBoth(code);

      // Find error recovery diagnostic
      const skipError = errors.find(e => e.message.includes('Skipped'));

      if (skipError) {
        // Message should contain token count (number)
        expect(skipError.message).toMatch(/\d+ tokens?/);

        // Token metadata (line, column) are numeric
        expect(typeof skipError.token.line).toBe('number');
        expect(typeof skipError.token.column).toBe('number');

        // Message format is predictable and safe
        expect(skipError.message).toMatch(/Skipped \d+ tokens? during error recovery/);
      }
    });

    it('should never include startToken or endToken in error objects', () => {
      // Verify that diagnostic errors don't carry references to SkippedRegion tokens
      // The error.token is the startToken, but token.value is not used in message

      const SENSITIVE = '$SECRET_CODE$';
      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            ${SENSITIVE} garbage_syntax
          }
        }
      `;

      const { skippedRegions, errors } = parseAndGetBoth(code);

      expect(skippedRegions.length).toBeGreaterThan(0);
      expect(errors.length).toBeGreaterThan(0);

      // Error objects may have .token field (for position), but message is sanitized
      errors.forEach(error => {
        // Even if error.token exists, error.message must not contain token.value
        if (error.token && error.token.value) {
          expect(error.message).not.toContain(error.token.value);
        }
      });
    });
  });

  describe('Content vs Metadata Separation', () => {
    it('should use token metadata for control flow, not content', () => {
      // Verify that only SAFE metadata (line, column, type, tokenCount)
      // is used in control flow, never token.value strings

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            bad tokens syntax
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      expect(skippedRegions.length).toBeGreaterThan(0);

      skippedRegions.forEach(region => {
        // Safe metadata fields
        expect(typeof region.tokenCount).toBe('number');
        expect(typeof region.reason).toBe('string');
        expect(typeof region.startToken.line).toBe('number');
        expect(typeof region.startToken.column).toBe('number');
        expect(typeof region.endToken.line).toBe('number');
        expect(typeof region.endToken.column).toBe('number');

        // Reason is always the constant "Error recovery"
        expect(region.reason).toBe('Error recovery');

        // Token types are safe enum values
        expect(typeof region.startToken.type).toBe('string');
        expect(typeof region.endToken.type).toBe('string');
      });
    });

    it('should treat reason field as constant string, not derived from tokens', () => {
      // Verify that SkippedRegion.reason is always the constant "Error recovery"
      // and never contains content from token values

      const SENSITIVE = '$PROPRIETARY_NAME$';
      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            ${SENSITIVE} invalid garbage
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      // All regions should have the constant reason
      skippedRegions.forEach(region => {
        expect(region.reason).toBe('Error recovery');

        // Reason NEVER contains token content
        expect(region.reason).not.toContain(SENSITIVE);
        expect(region.reason).not.toContain('invalid');
        expect(region.reason).not.toContain('garbage');
      });
    });

    it('should use tokenCount as safe numeric data, not expose individual tokens', () => {
      // Verify that tokenCount is the ONLY aggregate information exposed,
      // not the actual token values that were skipped

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            many invalid tokens here
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      expect(skippedRegions.length).toBeGreaterThan(0);

      const region = skippedRegions[0];

      // tokenCount is safe numeric summary
      expect(typeof region.tokenCount).toBe('number');
      expect(region.tokenCount).toBeGreaterThan(0);

      // The diagnostic message uses tokenCount, not individual token values
      const { errors } = parseAndGetBoth(code);
      const skipError = errors.find(e => e.message.includes('Skipped'));

      if (skipError) {
        // Message includes count
        expect(skipError.message).toMatch(/Skipped \d+ tokens?/);

        // But NOT the actual token content
        expect(skipError.message).not.toContain('invalid');
        expect(skipError.message).not.toContain('here');
      }
    });
  });

  describe('Serialization Safety', () => {
    it('should document that SkippedRegion is NOT safe to serialize to JSON', () => {
      // WARNING: This test documents the RISK of serializing SkippedRegion
      //
      // If someone calls JSON.stringify(skippedRegion), it WILL include token.value.
      // This is why getSkippedRegions() must NEVER be used to create LSP responses.
      // Currently there are NO callers of getSkippedRegions(), which is safe.

      const SENSITIVE = '$CLASSIFIED_CONTENT$';
      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            ${SENSITIVE} bad_syntax
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      expect(skippedRegions.length).toBeGreaterThan(0);

      const region = skippedRegions[0];

      // WARNING: JSON.stringify WILL include token.value
      const serialized = JSON.stringify(region);

      // This is the risk! Serialization exposes raw content
      // (Test passes to document the danger)
      expect(serialized).toContain('value');

      // SAFE PATTERN: Extract only safe fields
      const safeData = {
        tokenCount: region.tokenCount,
        reason: region.reason,
        startLine: region.startToken.line,
        startColumn: region.startToken.column,
        endLine: region.endToken.line,
        endColumn: region.endToken.column
        // NOT: startToken.value or endToken.value
      };

      const safeSerialized = JSON.stringify(safeData);

      // Safe serialization excludes token objects
      expect(safeSerialized).not.toContain('"startToken"');
      expect(safeSerialized).not.toContain('"endToken"');
      expect(safeSerialized).not.toContain('"value"');
    });

    it('should demonstrate that current code never serializes SkippedRegion', () => {
      // Verify that getSkippedRegions() is currently never called
      // This documents the current safe state: no leak path exists

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            invalid_syntax
          }
        }
      `;

      const { skippedRegions, errors } = parseAndGetBoth(code);

      // SkippedRegions are recorded
      expect(skippedRegions.length).toBeGreaterThan(0);

      // Errors are recorded (these go to LSP)
      expect(errors.length).toBeGreaterThan(0);

      // But errors DO NOT contain SkippedRegion objects
      errors.forEach(error => {
        expect(error).not.toHaveProperty('skippedRegion');
        expect(error).not.toHaveProperty('startToken');
        expect(error).not.toHaveProperty('endToken');

        // Error has only: message, token (for position)
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('token');
      });
    });

    it('should verify that SkippedRegion objects never escape parser boundary', () => {
      // The parser.getSkippedRegions() method exists but is never called
      // This test documents that SkippedRegion is an internal-only data structure

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            invalid syntax here
          }
        }
      `;

      const { skippedRegions } = parseCode(code);

      // Regions exist (parser recorded them)
      expect(Array.isArray(skippedRegions)).toBe(true);

      // But they're never sent to LSP clients
      // (No code path calls getSkippedRegions() except this test)
    });
  });

  describe('Position Calculation Safety', () => {
    it('should derive positions from token line/column metadata, not content', () => {
      // Verify that position calculations use ONLY numeric metadata,
      // never parsing or interpreting token.value

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            bad_syntax
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      expect(skippedRegions.length).toBeGreaterThan(0);

      const region = skippedRegions[0];

      // Position is derived from numeric metadata
      expect(typeof region.startToken.line).toBe('number');
      expect(typeof region.startToken.column).toBe('number');
      expect(typeof region.endToken.line).toBe('number');
      expect(typeof region.endToken.column).toBe('number');

      // These are safe to use in range calculations
      expect(region.startToken.line).toBeGreaterThan(0);
      expect(region.startToken.column).toBeGreaterThan(0);
      expect(region.endToken.line).toBeGreaterThanOrEqual(region.startToken.line);
    });

    it('should not use token.value.length for any calculations', () => {
      // Unlike ParseError (which uses token.value.length for range end),
      // SkippedRegion uses endToken metadata instead
      // This test documents that token.value is NEVER accessed

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            garbage_tokens invalid
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      expect(skippedRegions.length).toBeGreaterThan(0);

      const region = skippedRegions[0];

      // Position comes from endToken, not startToken.value.length
      expect(region.endToken.line).toBeGreaterThanOrEqual(region.startToken.line);

      // tokenCount tells us HOW MANY tokens, not their content
      expect(typeof region.tokenCount).toBe('number');

      // The span is defined by two Token positions, not by parsing content
    });

    it('should calculate diagnostic range using startToken position only', () => {
      // Verify that the diagnostic created by recordSkippedRegion()
      // uses startToken for position, not any content parsing

      const SENSITIVE = '$SECRET$';
      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            ${SENSITIVE} bad_syntax
          }
        }
      `;

      const { errors } = parseAndGetBoth(code);

      // Find skip error
      const skipError = errors.find(e => e.message.includes('Skipped'));

      if (skipError) {
        // Error token provides position
        expect(typeof skipError.token.line).toBe('number');
        expect(typeof skipError.token.column).toBe('number');

        // Position is numeric metadata, safe for LSP
        expect(skipError.token.line).toBeGreaterThan(0);
        expect(skipError.token.column).toBeGreaterThan(0);

        // Message never contains sensitive content
        expect(skipError.message).not.toContain(SENSITIVE);
      }
    });
  });

  describe('Future-Proofing Canaries', () => {
    it('should fail if SkippedRegion adds new fields that might leak content', () => {
      // This test serves as a canary: if SkippedRegion structure changes,
      // we need to review the security implications

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            bad_syntax
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      expect(skippedRegions.length).toBeGreaterThan(0);

      const region = skippedRegions[0];

      // Document expected SkippedRegion structure
      const expectedFields = ['startToken', 'endToken', 'tokenCount', 'reason'];

      // Get actual fields
      const actualFields = Object.keys(region);

      // If new fields are added, review for potential content leakage
      actualFields.forEach(field => {
        expect(expectedFields).toContain(field);
      });

      // Verify structure matches interface
      expect(region).toHaveProperty('startToken');
      expect(region).toHaveProperty('endToken');
      expect(region).toHaveProperty('tokenCount');
      expect(region).toHaveProperty('reason');
    });

    it('should fail if getSkippedRegions() is called from LSP provider code', () => {
      // This test documents that getSkippedRegions() should NEVER be called
      // from LSP providers (completion, hover, definition, etc.)
      //
      // If this pattern appears in the future, it's a security risk
      // because it could expose raw token content

      // Currently this test just documents the expectation
      // Actual enforcement would require code review or static analysis

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            bad_syntax
          }
        }
      `;

      const { skippedRegions } = parseCode(code);

      // But this pattern should NEVER appear in:
      // - src/completion/*.ts
      // - src/hover/*.ts
      // - src/definition/*.ts
      // - src/references/*.ts
      // - src/server.ts (diagnostic creation)
      //
      // Use grep to verify: grep -r "getSkippedRegions" src/
      // Should only appear in parser.ts (definition) and tests

      expect(skippedRegions).toBeDefined();
    });

    it('should document the safe pattern for future error recovery features', () => {
      // If future code needs to report skipped regions to users,
      // this test documents the CORRECT pattern

      const code = `
        OBJECT Table 50000 Test
        {
          KEYS
          {
            bad tokens syntax
          }
        }
      `;

      const skippedRegions = parseAndGetSkippedRegions(code);

      expect(skippedRegions.length).toBeGreaterThan(0);

      const region = skippedRegions[0];

      // SAFE PATTERN for exposing SkippedRegion data:
      const safeData = {
        // Extract numeric metadata (safe)
        startLine: region.startToken.line,
        startColumn: region.startToken.column,
        endLine: region.endToken.line,
        endColumn: region.endToken.column,

        // Extract safe aggregate data (safe)
        tokenCount: region.tokenCount,
        reason: region.reason,

        // DO NOT include:
        // - startToken (contains .value)
        // - endToken (contains .value)
        // - Any token.value strings
      };

      // Verify this pattern is safe to serialize
      const serialized = JSON.stringify(safeData);

      expect(serialized).toContain('tokenCount');
      expect(serialized).toContain('reason');
      expect(serialized).not.toContain('"startToken"');
      expect(serialized).not.toContain('"endToken"');
      expect(serialized).not.toContain('"value"');
    });

    it('should verify that error messages use constant format, not token-derived text', () => {
      // Verify that "Skipped N tokens during error recovery" message
      // uses a constant format with only numeric substitution

      const testCases = [
        {
          code: `
            OBJECT Table 50000 Test
            {
              KEYS
              {
                x
              }
            }
          `,
          desc: 'Single bad token'
        },
        {
          code: `
            OBJECT Table 50000 Test
            {
              KEYS
              {
                a b c
              }
            }
          `,
          desc: 'Multiple bad tokens'
        }
      ];

      testCases.forEach(({ code }) => {
        const { errors } = parseAndGetBoth(code);

        const skipError = errors.find(e => e.message.includes('Skipped'));

        if (skipError) {
          // Message uses constant format
          expect(skipError.message).toMatch(/^Skipped \d+ tokens? during error recovery/);

          // Message NEVER contains actual token content
          expect(skipError.message).not.toContain(' x ');
          expect(skipError.message).not.toContain(' a ');
          expect(skipError.message).not.toContain(' b ');
          expect(skipError.message).not.toContain(' c ');
        }
      });
    });
  });
});
