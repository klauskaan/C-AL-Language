/**
 * Sanitization Utility
 *
 * Provides functions to prevent code leakage in error messages, test output,
 * and diagnostic messages.
 *
 * Security Principle:
 * These functions must NEVER expose literal source code content in their output.
 * Only safe metadata (length, position, character codes) is returned.
 *
 * Use Cases:
 * - Lexer/parser error messages
 * - Test diagnostics and assertions
 * - Logging and debug output
 * - Any scenario where proprietary C/AL code must not be exposed
 */

/**
 * Sanitizes content by replacing it with metadata (length and optional offset).
 *
 * Security Rationale:
 * When parsing proprietary C/AL code (especially in test/REAL/), we must prevent
 * the literal source code from appearing in error messages, logs, or test output.
 * This function provides safe metadata that is useful for debugging without
 * exposing the actual content.
 *
 * @param content - The content to sanitize (will not appear in output)
 * @param options - Optional configuration
 * @param options.offset - Position in the source where this content appears
 * @param options.maxDisplay - Maximum display length (does NOT affect reported length)
 * @returns A sanitized string containing only metadata, never the actual content
 *
 * @example
 * sanitizeContent('x := 5;')
 * // => '[content sanitized, 7 chars]'
 *
 * @example
 * sanitizeContent('x := 5;', { offset: 42 })
 * // => '[content sanitized, 7 chars at offset 42]'
 */
export function sanitizeContent(
  content: string,
  options?: { offset?: number; maxDisplay?: number }
): string {
  const length = content.length;
  const offset = options?.offset;

  // Note: maxDisplay affects what would be displayed in UI, but we never display content.
  // We still report the full length for accuracy.

  if (offset !== undefined) {
    return `[content sanitized, ${length} chars at offset ${offset}]`;
  }

  return `[content sanitized, ${length} chars]`;
}

/**
 * Sanitizes a comparison between expected and actual values.
 *
 * Security Rationale:
 * When assertions fail in tests or when the lexer/parser encounters unexpected
 * tokens, we need to report that a mismatch occurred without exposing the actual
 * token values (which could be proprietary identifiers, keywords, or literals).
 *
 * @param expected - The expected value (will not appear in output)
 * @param actual - The actual value (will not appear in output)
 * @param offset - Optional position in the source where the mismatch occurred
 * @returns A sanitized string describing the mismatch using only length metadata
 *
 * @example
 * sanitizeComparison('Customer', 'Cust')
 * // => '[token value mismatch: expected 8 chars, got 4 chars]'
 *
 * @example
 * sanitizeComparison('PROCEDURE', 'FUNCTION', 42)
 * // => '[token value mismatch: expected 9 chars, got 8 chars at offset 42]'
 */
export function sanitizeComparison(
  expected: string,
  actual: string,
  offset?: number
): string {
  const expectedLength = expected.length;
  const actualLength = actual.length;

  if (offset !== undefined) {
    return `[token value mismatch: expected ${expectedLength} chars, got ${actualLength} chars at offset ${offset}]`;
  }

  return `[token value mismatch: expected ${expectedLength} chars, got ${actualLength} chars]`;
}

/**
 * Sanitizes a single character by replacing it with its character code.
 *
 * Security Rationale:
 * When the lexer encounters unexpected characters or when reporting character-level
 * errors, we need to identify the character without exposing it literally. The
 * character code provides unambiguous identification while preventing leakage.
 *
 * Edge Case Handling:
 * - Control characters (0-31): Reported by code (e.g., '\n' = code 10)
 * - Unicode characters: Reports the code unit value
 * - Multi-character strings: Only the first character is processed
 * - Emoji and surrogate pairs: Reports the first code unit
 *
 * @param char - The character to sanitize (only first character used if string is longer)
 * @returns A sanitized string containing only the character code
 *
 * @example
 * sanitizeChar('A')
 * // => '[char sanitized, code 65]'
 *
 * @example
 * sanitizeChar('@')
 * // => '[char sanitized, code 64]'
 *
 * @example
 * sanitizeChar('\n')
 * // => '[char sanitized, code 10]'
 */
export function sanitizeChar(char: string): string {
  if (!char || char.length === 0) {
    return '[char sanitized, empty string]';
  }

  const code = char.charCodeAt(0);

  return `[char sanitized, code ${code}]`;
}
