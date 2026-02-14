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

/**
 * Sanitizes token type representation when it reveals sensitive keywords.
 *
 * Security Rationale:
 * Token types in error messages can reveal reserved keywords and language constructs
 * from proprietary code. This function replaces keyword token types with a generic
 * sanitized representation, while preserving generic token type information for
 * tokens like operators, delimiters, and literals.
 *
 * Keywords that should be sanitized:
 * - Reserved words (BEGIN, END, REPEAT, WHILE, etc.)
 * - Data types (RECORD, BOOLEAN, DECIMAL, etc.)
 * - Object types (TABLE, REPORT, CODEUNIT, etc.)
 * - Control flow (IF, THEN, ELSE, FOR, etc.)
 * - Procedure modifiers (LOCAL, VAR, PROCEDURE, FUNCTION, etc.)
 *
 * Token types that are safe (not revealing keywords):
 * - IDENTIFIER (generic, doesn't reveal specific name)
 * - Operators (PLUS, MINUS, EQUAL, etc.) - symbols, not keywords
 * - Delimiters (LEFT_PAREN, SEMICOLON, etc.) - symbols, not keywords
 * - Literals (INTEGER, STRING, DATE, etc.) - types, not keyword values
 * - Special (EOF, COMMENT) - metadata, not keywords
 *
 * @param tokenType - The token type string (e.g., 'BEGIN', 'IDENTIFIER', 'PLUS')
 * @returns Either the original token type (if safe) or a sanitized representation
 *
 * @example
 * sanitizeTokenType('BEGIN')
 * // => '[token type sanitized]'
 *
 * @example
 * sanitizeTokenType('IDENTIFIER')
 * // => 'IDENTIFIER'  (unchanged - doesn't reveal the actual name)
 *
 * @example
 * sanitizeTokenType('PLUS')
 * // => 'PLUS'  (unchanged - symbol, not a keyword)
 */
export function sanitizeTokenType(tokenType: string): string {
  // Keywords that should be sanitized (reserved words that reveal C/AL structure)
  const SENSITIVE_KEYWORDS = new Set([
    // Object types
    'OBJECT', 'TABLE', 'PAGE', 'REPORT', 'CODEUNIT', 'QUERY', 'XMLPORT', 'MENUSUITE',

    // Sections
    'PROPERTIES', 'OBJECT_PROPERTIES', 'FIELDS', 'KEYS', 'FIELDGROUPS', 'CODE',
    'CONTROLS', 'ACTIONS', 'ELEMENTS', 'REQUESTFORM', 'DATASET',
    'REQUESTPAGE', 'LABELS', 'MENUNODES', 'DATAITEMS', 'SECTIONS',

    // Data types
    'BOOLEAN', 'INTEGER_TYPE', 'DECIMAL_TYPE', 'TEXT', 'CODE_TYPE', 'DATE_TYPE',
    'TIME_TYPE', 'DATETIME_TYPE', 'RECORD', 'RECORDID', 'RECORDREF', 'FIELDREF',
    'BIGINTEGER', 'BIGTEXT', 'BLOB', 'GUID', 'DURATION', 'OPTION', 'CHAR', 'BYTE',
    'TEXTCONST',

    // Control flow
    'IF', 'THEN', 'ELSE', 'CASE', 'OF', 'WHILE', 'DO', 'REPEAT', 'UNTIL', 'FOR',
    'TO', 'DOWNTO', 'EXIT', 'BREAK',

    // Procedure/Function keywords
    'PROCEDURE', 'FUNCTION', 'LOCAL', 'VAR', 'TRIGGER', 'EVENT',

    // Blocks
    'BEGIN', 'END',

    // Boolean
    'TRUE', 'FALSE',

    // Other keywords
    'DIV', 'MOD', 'AND', 'OR', 'NOT', 'XOR', 'IN', 'WITH', 'ARRAY', 'TEMPORARY',
    'INDATASET', 'RUNONCLIENT', 'WITHEVENTS', 'SECURITYFILTERING',

    // AL-only features (also sensitive as they reveal attempted AL code)
    'AL_ONLY_KEYWORD', 'AL_ONLY_ACCESS_MODIFIER', 'TERNARY_OPERATOR',
    'PREPROCESSOR_DIRECTIVE'
  ]);

  // Token types that are safe to display (they don't reveal specific keywords)
  const SAFE_TYPES = new Set([
    // Literals - don't reveal the actual value
    'IDENTIFIER', 'QUOTED_IDENTIFIER', 'INTEGER', 'DECIMAL', 'STRING', 'DATE',
    'TIME', 'DATETIME',

    // Operators - these are symbols, not keywords
    'PLUS', 'MINUS', 'MULTIPLY', 'DIVIDE', 'ASSIGN', 'PLUS_ASSIGN',
    'MINUS_ASSIGN', 'MULTIPLY_ASSIGN', 'DIVIDE_ASSIGN', 'EQUAL', 'NOT_EQUAL',
    'LESS', 'LESS_EQUAL', 'GREATER', 'GREATER_EQUAL', 'DOT', 'DOTDOT',
    'COMMA', 'SEMICOLON', 'COLON', 'DOUBLE_COLON',

    // Delimiters - these are symbols
    'LEFT_PAREN', 'RIGHT_PAREN', 'LEFT_BRACKET', 'RIGHT_BRACKET',
    'LEFT_BRACE', 'RIGHT_BRACE',

    // Special
    'COMMENT', 'WHITESPACE', 'NEWLINE', 'EOF', 'UNKNOWN'
  ]);

  // If it's a known safe type, return it unchanged
  if (SAFE_TYPES.has(tokenType)) {
    return tokenType;
  }

  // If it's a sensitive keyword, sanitize it
  if (SENSITIVE_KEYWORDS.has(tokenType)) {
    return '[token type sanitized]';
  }

  // Unknown token type - sanitize to be safe
  return '[token type sanitized]';
}

/**
 * Redacts test/REAL/ paths from messages to prevent proprietary content leakage.
 *
 * Handles:
 * - Unix paths: test/REAL/file.txt
 * - Windows paths: test\REAL\file.txt
 * - Case variations: TEST/REAL/, test/Real/, Test/real/
 * - With or without trailing content: test/REAL or test/REAL/file.txt
 *
 * Does NOT match:
 * - testXREAL (no path separator after test)
 * - context/REAL/ (wrong prefix)
 * - mytest/REAL/ (prefix not word boundary)
 *
 * Pattern explanation:
 * - (?<![a-zA-Z0-9_]) - Negative lookbehind: prevents matching mid-word like "mytest/REAL/"
 * - test - Literal "test" (case-insensitive due to 'i' flag)
 * - [\/\\] - Forward slash or backslash
 * - real - Literal "REAL" (case-insensitive due to 'i' flag)
 * - (?:[\/\\][^\s:,]*)? - Optional: slash followed by any chars except whitespace, colon, or comma (path content)
 * - gi flags - Global (replace all) + case-insensitive
 *
 * Note: Excludes commas to handle comma-separated lists (e.g., array stringification)
 *
 * Requires Node 10+ for negative lookbehind support.
 *
 * @param msg - Message that may contain file paths
 * @returns Message with test/REAL/ paths replaced by <REDACTED>
 *
 * @example
 * stripPaths("Error in /home/user/project/test/REAL/file.ts at line 10")
 * // => "Error in /home/user/project/<REDACTED> at line 10"
 *
 * @example
 * stripPaths("Failed: C:\\Users\\dev\\src\\test\\REAL\\main.txt")
 * // => "Failed: C:\\Users\\dev\\src\\<REDACTED>"
 */
export function stripPaths(msg: string): string {
  return msg.replace(/(?<![a-zA-Z0-9_])test[\/\\]+real(?:[\/\\][^\s:,]*)?/gi, '<REDACTED>');
}

/**
 * Formats an error for safe logging, sanitizing any test/REAL/ paths.
 *
 * Security Rationale:
 * When errors occur during LSP operations, stack traces may contain file paths
 * from test/REAL/ (proprietary NAV objects). This function ensures all error
 * output is sanitized before logging.
 *
 * Handles:
 * - Error instances with or without stack traces
 * - Non-Error values (strings, objects with toString())
 * - Edge cases defensively (circular references, throwing toString())
 * - Ensures all output is sanitized via stripPaths()
 *
 * @param error - The error value (Error instance or any other value)
 * @returns Sanitized error message safe for logging
 *
 * @example
 * formatError(new Error('Parse failed'))
 * // => 'Error: Parse failed\n    at ...'
 *
 * @example
 * formatError('Error in test/REAL/Table50000.txt')
 * // => 'Error in <REDACTED>'
 */
export function formatError(error: unknown): string {
  try {
    if (error instanceof Error) {
      // Handle Error instances
      const message = error.message || '';
      const stack = error.stack;

      // Determine what to output:
      // - If stack exists and is non-empty, use it (includes message)
      // - If stack is empty string or undefined/deleted, fall back to "Error: ${message}"
      let raw: string;
      if (stack) {
        // Stack exists and is non-empty
        raw = stack;
      } else {
        // Stack is empty string, undefined, or deleted - prefix message with "Error: "
        raw = message ? `Error: ${message}` : '';
      }
      return stripPaths(raw);
    }

    // Handle non-Error values
    return stripPaths(String(error));
  } catch {
    // Defensive: String(error) or error.stack getter could throw
    // (circular reference, malformed toString, etc.)
    // Error handlers must NEVER throw
    return stripPaths(`Error formatting error message (type: ${typeof error})`);
  }
}
