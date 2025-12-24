/**
 * Abstract base class for C/AL language server providers
 * Contains shared utility methods for text scanning and word extraction
 */

import { Position, Location, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Token } from '../lexer/tokens';

/**
 * Abstract base class providing common text scanning utilities
 * for completion, hover, definition, and reference providers
 */
export abstract class ProviderBase {
  /** Regex pattern for valid C/AL identifier characters */
  protected static readonly IDENTIFIER_PATTERN = /[a-zA-Z0-9_]/;

  /**
   * Helper to scan backwards from an offset while a predicate is true
   * Returns the position after scanning (exclusive start of matched region)
   *
   * @param text - The text to scan
   * @param startOffset - The offset to start scanning from
   * @param predicate - Function that returns true while scanning should continue
   * @returns The position after scanning backwards
   */
  protected scanBackward(text: string, startOffset: number, predicate: (char: string) => boolean): number {
    let pos = startOffset;
    while (pos >= 0 && predicate(text[pos])) {
      pos--;
    }
    return pos + 1;
  }

  /**
   * Helper to scan forwards from an offset while a predicate is true
   * Returns the position at end of scanning (exclusive end of matched region)
   *
   * @param text - The text to scan
   * @param startOffset - The offset to start scanning from
   * @param predicate - Function that returns true while scanning should continue
   * @returns The position after scanning forwards
   */
  protected scanForward(text: string, startOffset: number, predicate: (char: string) => boolean): number {
    let pos = startOffset;
    while (pos < text.length && predicate(text[pos])) {
      pos++;
    }
    return pos;
  }

  /**
   * Get the word at the cursor position
   * Returns structured object with word and offsets, or null if not on an identifier
   *
   * @param document - The text document
   * @param position - The cursor position
   * @returns Object with word, start, and end offsets, or null if not on identifier
   */
  protected getWordAtPosition(document: TextDocument, position: Position): { word: string; start: number; end: number } | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Check if we're in an identifier
    if (offset > 0 && !ProviderBase.IDENTIFIER_PATTERN.test(text[offset]) && !ProviderBase.IDENTIFIER_PATTERN.test(text[offset - 1])) {
      return null;
    }

    const start = this.scanBackward(text, offset - 1, c => ProviderBase.IDENTIFIER_PATTERN.test(c));
    const end = this.scanForward(text, offset, c => ProviderBase.IDENTIFIER_PATTERN.test(c));

    if (start >= end) {
      return null;
    }

    return {
      word: text.substring(start, end),
      start,
      end
    };
  }

  /**
   * Check if we're after a dot operator (for method/field access)
   * Handles partial identifiers typed after the dot
   *
   * @param document - The text document
   * @param position - The cursor position
   * @returns True if position is after a dot operator
   */
  protected isAfterDot(document: TextDocument, position: Position): boolean {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Skip backwards over identifier and whitespace to find dot
    let i = this.scanBackward(text, offset - 1, c => ProviderBase.IDENTIFIER_PATTERN.test(c)) - 1;
    // Skip whitespace
    while (i >= 0 && /\s/.test(text[i])) {
      i--;
    }
    return i >= 0 && text[i] === '.';
  }

  /**
   * Get the identifier before the dot operator
   * Used to determine the type context for member access
   *
   * @param document - The text document
   * @param position - The cursor position (after the dot)
   * @returns The identifier before the dot, or null if not found
   */
  protected getIdentifierBeforeDot(document: TextDocument, position: Position): string | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Skip backwards over identifier (prefix after dot) and whitespace to find dot
    let dotPos = this.scanBackward(text, offset - 1, c => ProviderBase.IDENTIFIER_PATTERN.test(c)) - 1;
    // Skip whitespace
    while (dotPos >= 0 && /\s/.test(text[dotPos])) {
      dotPos--;
    }

    if (dotPos < 0 || text[dotPos] !== '.') {
      return null;
    }

    // Find the identifier before the dot
    const end = dotPos;
    const start = this.scanBackward(text, end - 1, c => ProviderBase.IDENTIFIER_PATTERN.test(c));

    if (start >= end) {
      return null;
    }

    return text.substring(start, end);
  }

  /**
   * Convert a token's position to an LSP Location
   * Handles coordinate conversion from 1-based (token) to 0-based (LSP)
   *
   * @param token - The token containing position information (line, column, value)
   * @param documentUri - The document URI
   * @returns Location object for use in LSP responses
   */
  protected tokenToLocation(token: Token, documentUri: string): Location {
    // Token line and column are 1-based, LSP wants 0-based
    const startLine = token.line - 1;
    const startChar = token.column - 1;
    const endChar = startChar + token.value.length;

    const range: Range = {
      start: { line: startLine, character: startChar },
      end: { line: startLine, character: endChar }
    };

    return {
      uri: documentUri,
      range
    };
  }
}
