/**
 * Position Validator
 *
 * Validates that token positions match document content and that tokenization
 * is complete and accurate. This is a critical diagnostic tool for identifying
 * lexer bugs and ensuring round-trip fidelity.
 *
 * @module validation/positionValidator
 */

import { Token, TokenType } from '../lexer/tokens';
import { looksLikeCode } from '../trivia/triviaComputer';
import { sanitizeContent, sanitizeComparison } from '../utils/sanitize';

/**
 * Result of position validation
 */
export interface ValidationResult {
  /** Whether validation passed (no errors) */
  isValid: boolean;
  /** Fatal errors that indicate incorrect tokenization */
  errors: string[];
  /** Non-fatal warnings (e.g., suspicious trivia content) */
  warnings: string[];
}

/**
 * Note on offset semantics:
 * - startOffset: Inclusive start position (0-indexed)
 * - endOffset: Exclusive end position (half-open interval [start, end))
 *
 * Example: For "OBJECT" at offset 0:
 *   startOffset = 0
 *   endOffset = 6
 *   document.substring(0, 6) = "OBJECT"
 */

/**
 * Validates that token positions accurately reflect document content.
 *
 * This function performs comprehensive validation:
 * 1. Token positions match document substrings
 * 2. Token values match expected content (accounting for quote handling)
 * 3. No overlaps or gaps between tokens (except valid trivia)
 * 4. Special handling for String and QuotedIdentifier tokens
 *
 * String and QuotedIdentifier tokens have special semantics:
 * - String: positions INCLUDE quotes, value EXCLUDES quotes and converts escapes ('' -> ')
 * - QuotedIdentifier: positions INCLUDE quotes, value EXCLUDES quotes, NO escapes
 *
 * @param document - The source document text
 * @param tokens - The token array from lexer.tokenize()
 * @returns ValidationResult with errors and warnings
 *
 * @example
 * ```typescript
 * const lexer = new Lexer(code);
 * const tokens = lexer.tokenize();
 * const result = validateTokenPositions(code, tokens);
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
export function validateTokenPositions(
  document: string,
  tokens: Token[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle empty document
  if (tokens.length === 0) {
    return { isValid: true, errors, warnings };
  }

  // Handle document with only EOF token
  if (tokens.length === 1 && tokens[0].type === TokenType.EOF) {
    return { isValid: true, errors, warnings };
  }

  let lastEndOffset = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check for overlap
    if (token.startOffset < lastEndOffset) {
      errors.push(
        `Token overlap at offset ${token.startOffset}: ` +
        `token starts before previous token ends (${lastEndOffset})`
      );
      return { isValid: false, errors, warnings };
    }

    // Check for gap and validate trivia content
    if (token.startOffset > lastEndOffset) {
      const triviaText = document.substring(lastEndOffset, token.startOffset);
      const triviaResult = parseTriviaForValidation(triviaText);

      if (!triviaResult.isValid) {
        errors.push(
          `Invalid trivia at offset ${lastEndOffset}: ` +
          `contains non-trivia content ${sanitizeContent(triviaResult.invalidContent!)}`
        );
        return { isValid: false, errors, warnings };
      }

      // Collect trivia warnings
      warnings.push(...triviaResult.warnings);
    }

    // Skip value check for EOF token (it's zero-length)
    if (token.type === TokenType.EOF) {
      lastEndOffset = token.startOffset; // EOF is at the end, zero-length
      continue;
    }

    // Extract actual document content at token position
    const documentContent = document.substring(token.startOffset, token.endOffset);

    // Validate token based on type
    let expectedValue: string;

    if (token.type === TokenType.String) {
      // String: positions include quotes ('...'), value excludes quotes and unescapes
      expectedValue = validateStringToken(documentContent);
    } else if (token.type === TokenType.QuotedIdentifier) {
      // QuotedIdentifier: positions include quotes ("..."), value excludes quotes, NO escapes
      expectedValue = validateQuotedIdentifierToken(documentContent);
    } else if (token.type === TokenType.Unknown) {
      // Unknown: handle 7 sources
      expectedValue = validateUnknownToken(documentContent);
    } else {
      // Regular token: direct match
      expectedValue = documentContent;
    }

    if (token.value !== expectedValue) {
      errors.push(
        `Token value mismatch at offset ${token.startOffset}: ` +
        sanitizeComparison(expectedValue, token.value, token.startOffset)
      );
      return { isValid: false, errors, warnings };
    }

    lastEndOffset = token.endOffset;
  }

  return { isValid: true, errors, warnings };
}

/**
 * Unescape string content by converting '' to '
 */
function unescapeStringContent(content: string): string {
  return content.replace(/''/g, "'");
}

/**
 * Validate String token and return expected value.
 * Returns error string instead of throwing to make validator robust.
 */
function validateStringToken(documentContent: string): string {
  // Positions include delimiters ('...')
  // Value excludes delimiters and has escapes processed ('' -> ')
  if (!documentContent.startsWith("'")) {
    return `[ERROR: String token missing opening quote: ${sanitizeContent(documentContent)}]`;
  }

  // Handle edge case: empty unclosed string (just "'")
  if (documentContent.length === 1 || !documentContent.endsWith("'")) {
    return `[ERROR: String token missing closing quote: ${sanitizeContent(documentContent)}]`;
  }

  // Extract content between quotes
  const content = documentContent.substring(1, documentContent.length - 1);

  // Unescape '' to '
  return unescapeStringContent(content);
}

/**
 * Validate QuotedIdentifier token and return expected value.
 * Returns error string instead of throwing to make validator robust.
 */
function validateQuotedIdentifierToken(documentContent: string): string {
  // Positions include delimiters ("...")
  // Value excludes delimiters
  // NO escape processing (QuotedIdentifiers don't support "" escapes in C/AL)
  if (!documentContent.startsWith('"')) {
    return `[ERROR: QuotedIdentifier token missing opening quote: ${sanitizeContent(documentContent)}]`;
  }

  // Handle edge case: empty unclosed quoted identifier (just '"')
  if (documentContent.length === 1 || !documentContent.endsWith('"')) {
    return `[ERROR: QuotedIdentifier token missing closing quote: ${sanitizeContent(documentContent)}]`;
  }

  // Extract content between quotes (no escape processing)
  return documentContent.substring(1, documentContent.length - 1);
}

/**
 * Validate Unknown token and return expected value
 *
 * Unknown tokens come from 7 sources:
 * 1. Unclosed strings: startsWith("'") && !endsWith("'") - strip quote, unescape
 * 2. Unclosed quoted identifiers: startsWith('"') && !endsWith('"') - strip quote
 * 3. Single-char tokens (@, }, unrecognized char): direct match
 * 4. Unclosed brace comments: starts with '{', no closing '}' - value is '{'
 * 5. Unclosed C-style comments: starts with '/*', no closing '*/' - value is '/*'
 */
function validateUnknownToken(documentContent: string): string {
  // Unclosed brace comment: { comment... (starts with '{', but no closing '}')
  if (documentContent.startsWith('{') && !documentContent.includes('}')) {
    return '{';
  }

  // Unclosed C-style comment: /* comment... (starts with '/*', but no closing '*/')
  if (documentContent.startsWith('/*') && !documentContent.includes('*/')) {
    return '/*';
  }

  // Unclosed string: 'hello (starts with ', doesn't end with ')
  // Handle edge case: empty unclosed string (just "'")
  if (documentContent.startsWith("'") && (documentContent.length === 1 || !documentContent.endsWith("'"))) {
    const content = documentContent.substring(1);
    return unescapeStringContent(content);
  }

  // Unclosed quoted identifier: "test (starts with ", doesn't end with ")
  // Handle edge case: empty unclosed quoted identifier (just '"')
  if (documentContent.startsWith('"') && (documentContent.length === 1 || !documentContent.endsWith('"'))) {
    return documentContent.substring(1);
  }

  // Single-char tokens (@, }, unrecognized char): direct match
  return documentContent;
}

/**
 * Parse trivia content for validation
 *
 * Uses looksLikeCode from triviaComputer to detect suspicious brace comments.
 */
function parseTriviaForValidation(text: string): {
  isValid: boolean;
  invalidContent?: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  let pos = 0;

  while (pos < text.length) {
    const remaining = text.substring(pos);

    // Line comment: //
    if (remaining.startsWith('//')) {
      const endOfLine = remaining.indexOf('\n');
      const length = endOfLine === -1 ? remaining.length : endOfLine;
      pos += length;
      continue;
    }

    // C-style block comment: /* ... */
    if (remaining.startsWith('/*')) {
      const endIdx = remaining.indexOf('*/');
      const length = endIdx === -1 ? remaining.length : endIdx + 2;
      pos += length;
      continue;
    }

    // Brace-style block comment: { ... }
    if (remaining.startsWith('{')) {
      const endIdx = remaining.indexOf('}');
      const length = endIdx === -1 ? remaining.length : endIdx + 1;
      const content = remaining.substring(1, endIdx === -1 ? length : endIdx);

      // Use looksLikeCode heuristic (imported from triviaComputer)
      if (looksLikeCode(content)) {
        warnings.push(
          `Brace content looks like code, not comment: ` +
          sanitizeContent(content)
        );
      }

      pos += length;
      continue;
    }

    // CRLF newline
    if (remaining.startsWith('\r\n')) {
      pos += 2;
      continue;
    }

    // LF newline
    if (remaining.startsWith('\n')) {
      pos += 1;
      continue;
    }

    // CR newline (rare)
    if (remaining.startsWith('\r')) {
      pos += 1;
      continue;
    }

    // Whitespace: space, tab
    if (remaining[0] === ' ' || remaining[0] === '\t') {
      pos += 1;
      continue;
    }

    // Invalid: non-whitespace, non-comment character in trivia
    return {
      isValid: false,
      invalidContent: remaining[0],
      warnings
    };
  }

  return { isValid: true, warnings };
}
