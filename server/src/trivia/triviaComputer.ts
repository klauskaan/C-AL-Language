/**
 * Trivia Computer Utility
 *
 * Provides lazy computation of trivia (whitespace and comments) between tokens
 * without modifying the lexer or token interface. Enables round-trip validation
 * by extracting non-token content from document positions.
 *
 * @module trivia/triviaComputer
 */

import { Token, TokenType } from '../lexer/tokens';

/**
 * Types of trivia that can appear between tokens
 */
export type TriviaType = 'whitespace' | 'newline' | 'line-comment' | 'block-comment';

/**
 * A span of trivia (non-token content) in the source document
 */
export interface TriviaSpan {
  /** Starting offset in the document (inclusive) */
  startOffset: number;
  /** Ending offset in the document (exclusive) */
  endOffset: number;
  /** The actual text of the trivia */
  text: string;
  /** Classification of the trivia type */
  type: TriviaType;
}

/**
 * Result of trivia parsing with optional warnings
 */
export interface TriviaResult {
  /** Array of classified trivia spans */
  spans: TriviaSpan[];
  /** Warnings about unexpected content (may indicate lexer bugs) */
  warnings: string[];
}

/**
 * Compute trivia spans between adjacent tokens.
 *
 * This function extracts and classifies all trivia (whitespace, newlines, comments)
 * that appears between the previous token and the current token at the given index.
 *
 * **Edge cases:**
 * - `index = 0`: Returns trivia before the first token (leading trivia)
 * - `index = EOF`: Returns trivia before the EOF token (trailing trivia)
 * - No gap between tokens: Returns empty result
 *
 * **Bounds validation:**
 * - Returns empty result if index is out of bounds
 * - Handles cases where startOffset >= endOffset (no gap)
 *
 * @param document - The source document text
 * @param tokens - The token array from lexer.tokenize()
 * @param index - The index of the "current" token (trivia is BEFORE this token)
 * @returns TriviaResult with classified spans and any warnings
 *
 * @example
 * ```typescript
 * // Get trivia before first token (index 0)
 * const leadingTrivia = computeTriviaBetween(source, tokens, 0);
 *
 * // Get trivia between token 5 and token 6
 * const trivia = computeTriviaBetween(source, tokens, 6);
 *
 * // Get trivia before EOF token
 * const eofIndex = tokens.findIndex(t => t.type === TokenType.EOF);
 * const trailingTrivia = computeTriviaBetween(source, tokens, eofIndex);
 * ```
 */
export function computeTriviaBetween(
  document: string,
  tokens: Token[],
  index: number
): TriviaResult {
  // Bounds validation
  if (index < 0 || index >= tokens.length) {
    return { spans: [], warnings: [] };
  }

  const currentToken = tokens[index];
  const prevToken = index > 0 ? tokens[index - 1] : null;

  // Calculate the gap between tokens
  const startOffset = prevToken ? prevToken.endOffset : 0;
  const endOffset = currentToken.startOffset;

  // No gap between tokens (adjacent)
  if (startOffset >= endOffset) {
    return { spans: [], warnings: [] };
  }

  const triviaText = document.substring(startOffset, endOffset);
  return parseTriviaSpans(triviaText, startOffset);
}

/**
 * Compute trailing trivia after the last meaningful token.
 *
 * This function extracts trivia that appears between the last non-EOF token
 * and the EOF token. This handles the special case where the document ends
 * with whitespace or comments after the last meaningful content.
 *
 * **Edge cases:**
 * - Empty token array: Returns empty result
 * - No EOF token: Returns empty result
 * - EOF is first token (`eofIndex === 0`): Returns empty result (no previous token)
 *
 * @param document - The source document text
 * @param tokens - The token array from lexer.tokenize()
 * @returns TriviaResult with classified spans and any warnings
 *
 * @example
 * ```typescript
 * const tokens = lexer.tokenize(source);
 * const trailingTrivia = computeTrailingTrivia(source, tokens);
 * // Returns whitespace/comments after the last token before EOF
 * ```
 */
export function computeTrailingTrivia(
  document: string,
  tokens: Token[]
): TriviaResult {
  if (tokens.length === 0) {
    return { spans: [], warnings: [] };
  }

  // Find EOF token
  const eofIndex = tokens.findIndex(t => t.type === TokenType.EOF);
  if (eofIndex === -1 || eofIndex === 0) {
    // No EOF token or EOF is the first token (no trailing trivia)
    return { spans: [], warnings: [] };
  }

  // Trivia is between last non-EOF token and EOF
  return computeTriviaBetween(document, tokens, eofIndex);
}

/**
 * Get all trivia as a single concatenated string.
 *
 * Convenience function for round-trip validation. Returns the raw text between
 * the previous token and the current token without classification.
 *
 * **Consistent with computeTriviaBetween:**
 * - Uses the same bounds calculation
 * - Returns empty string if no gap exists
 * - Handles index 0 (trivia before first token)
 *
 * @param document - The source document text
 * @param tokens - The token array from lexer.tokenize()
 * @param index - The index of the "current" token (trivia is BEFORE this token)
 * @returns The trivia text as a string, or empty string if no trivia
 *
 * @example
 * ```typescript
 * // Quick check if there's whitespace between tokens
 * const trivia = getTriviaText(source, tokens, 5);
 * console.log(trivia); // "  \n  " or "" if adjacent
 * ```
 */
export function getTriviaText(
  document: string,
  tokens: Token[],
  index: number
): string {
  // Bounds validation
  if (index < 0 || index >= tokens.length) {
    return '';
  }

  const currentToken = tokens[index];
  const prevToken = index > 0 ? tokens[index - 1] : null;

  const startOffset = prevToken ? prevToken.endOffset : 0;
  const endOffset = currentToken.startOffset;

  // No gap or invalid range
  if (startOffset >= endOffset) {
    return '';
  }

  return document.substring(startOffset, endOffset);
}

/**
 * Parse trivia text into classified spans.
 *
 * Handles all C/AL trivia types:
 * - Whitespace: spaces, tabs
 * - Newlines: CRLF, LF, CR
 * - Line comments: // to end of line
 * - C-style block comments: forward-slash-asterisk ... asterisk-forward-slash
 * - Brace-style block comments: left-brace ... right-brace
 *
 * Context-dependent brace comments:
 * In C/AL, braces are context-dependent:
 * - In CODE_BLOCK context: braces are structural delimiters
 * - In trivia gaps: braces are assumed to be comments
 *
 * This function only processes gaps BETWEEN tokens, so by the time we see
 * a brace here, the lexer has already decided it's not a token. However,
 * if the lexer has bugs, we might misclassify code as comments.
 *
 * Safeguard: We emit a warning if brace content looks like code (contains
 * keywords, semicolons, assignments, etc.)
 *
 * @param text - The trivia text to parse
 * @param baseOffset - The starting offset in the document (for span positioning)
 * @returns TriviaResult with classified spans and warnings
 */
function parseTriviaSpans(text: string, baseOffset: number): TriviaResult {
  const spans: TriviaSpan[] = [];
  const warnings: string[] = [];
  let pos = 0;

  while (pos < text.length) {
    const remaining = text.substring(pos);
    const startOffset = baseOffset + pos;

    // Check for line comment: // to end of line
    if (remaining.startsWith('//')) {
      const endOfLine = remaining.indexOf('\n');
      const length = endOfLine === -1 ? remaining.length : endOfLine;
      spans.push({
        startOffset,
        endOffset: startOffset + length,
        text: remaining.substring(0, length),
        type: 'line-comment'
      });
      pos += length;
      continue;
    }

    // Check for C-style block comment: /* ... */
    if (remaining.startsWith('/*')) {
      const endIdx = remaining.indexOf('*/');
      const length = endIdx === -1 ? remaining.length : endIdx + 2;
      spans.push({
        startOffset,
        endOffset: startOffset + length,
        text: remaining.substring(0, length),
        type: 'block-comment'
      });
      pos += length;
      continue;
    }

    // Check for brace-style block comment: { ... }
    // SAFEGUARD: Validate content doesn't look like code
    if (remaining.startsWith('{')) {
      const endIdx = remaining.indexOf('}');
      const length = endIdx === -1 ? remaining.length : endIdx + 1;
      const content = remaining.substring(1, endIdx === -1 ? length : endIdx);

      // Check for code-like content (heuristic)
      if (looksLikeCode(content)) {
        warnings.push(
          `Brace content at offset ${startOffset} looks like code, not comment: ` +
          `"${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`
        );
      }

      spans.push({
        startOffset,
        endOffset: startOffset + length,
        text: remaining.substring(0, length),
        type: 'block-comment'
      });
      pos += length;
      continue;
    }

    // Check for CRLF newline
    if (remaining.startsWith('\r\n')) {
      spans.push({
        startOffset,
        endOffset: startOffset + 2,
        text: '\r\n',
        type: 'newline'
      });
      pos += 2;
      continue;
    }

    // Check for LF or CR newline
    if (remaining[0] === '\n' || remaining[0] === '\r') {
      spans.push({
        startOffset,
        endOffset: startOffset + 1,
        text: remaining[0],
        type: 'newline'
      });
      pos += 1;
      continue;
    }

    // Whitespace (space, tab)
    if (remaining[0] === ' ' || remaining[0] === '\t') {
      let length = 1;
      while (pos + length < text.length &&
             (text[pos + length] === ' ' || text[pos + length] === '\t')) {
        length++;
      }
      spans.push({
        startOffset,
        endOffset: startOffset + length,
        text: remaining.substring(0, length),
        type: 'whitespace'
      });
      pos += length;
      continue;
    }

    // Unexpected character in trivia - emit warning and skip
    warnings.push(
      `Unexpected character in trivia at offset ${startOffset}: ` +
      `'${remaining[0]}' (code ${remaining.charCodeAt(0)})`
    );
    pos++;
  }

  return { spans, warnings };
}

/**
 * Heuristic to detect if brace content looks like code rather than a comment.
 *
 * Uses a multi-indicator scoring system to avoid false positives:
 * - Strong indicators (weight 2): Assignment, statement-ending semicolons,
 *   BEGIN/END keywords
 * - Weak indicators (weight 1): Control flow keywords (IF...THEN, FOR...TO, etc.)
 * - Threshold: Requires at least 2 indicator points to flag as code
 *
 * This helps distinguish between:
 * - Comments: TODO fix this (0 points - not flagged)
 * - Comments with keywords: if needed update (1 point - not flagged)
 * - Likely code: x := 5; (4 points - flagged: assignment + semicolon)
 * - Likely code: BEGIN END (2 points - flagged: BEGIN alone)
 *
 * Known limitations (false positives):
 * - Comments explaining syntax: "Use := operator for assignment" (may flag)
 * - Comments with multiple keywords: "IF condition THEN action" (may flag)
 * - These are advisory warnings only - human judgment required
 *
 * @param content - The text inside the braces (without the braces)
 * @returns true if content appears to be code (score >= 2), false if likely a comment
 */
export function looksLikeCode(content: string): boolean {
  const trimmed = content.trim();

  // Empty or very short content is probably a comment
  if (trimmed.length < 3) return false;

  let indicatorScore = 0;

  // Strong indicators (weight 2 each) - clear evidence of executable code
  const strongIndicators = [
    /:=\s*\w/,               // Assignment operator followed by identifier
    /;\s*\n/,                // Semicolon followed by newline (statement separator)
    /\bBEGIN\b/i,            // BEGIN keyword (structural)
    /\bEND\s*;/i,            // END followed by semicolon
    /\bIF\b.*\bTHEN\b/i,     // IF...THEN control flow
    /\bFOR\b.*\bTO\b/i,      // FOR...TO loop structure
    /\bWHILE\b.*\bDO\b/i,    // WHILE...DO loop structure
    /\bCASE\b.*\bOF\b/i      // CASE...OF structure
  ];

  for (const pattern of strongIndicators) {
    if (pattern.test(content)) {
      indicatorScore += 2;
    }
  }

  // Weak indicators (weight 1 each) - possible code, but could be in comments
  const weakIndicators = [
    /\bREPEAT\b/i,           // REPEAT keyword
    /\bUNTIL\b/i,            // UNTIL keyword
    /\bWITH\b/i,             // WITH keyword
    /\bEXIT\b/i              // EXIT keyword
  ];

  for (const pattern of weakIndicators) {
    if (pattern.test(content)) {
      indicatorScore += 1;
    }
  }

  // Require at least 2 indicator points to flag as code
  return indicatorScore >= 2;
}
