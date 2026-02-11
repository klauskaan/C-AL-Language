import { Token } from '../lexer/tokens';

/**
 * Find a token containing the given offset using binary search.
 *
 * @param tokens - Array of tokens sorted by startOffset (ascending)
 * @param offset - Character offset in the document
 * @returns The token containing the offset, or undefined if not found
 *
 * @remarks
 * - Tokens are assumed to be sorted by startOffset (lexer guarantee)
 * - A token contains an offset if: startOffset <= offset < endOffset
 * - Zero-length EOF tokens (startOffset === endOffset) will never match
 * - Tokens may have gaps between them (returns undefined for gaps)
 * - O(log n) time complexity
 */
export function findTokenAtOffset(tokens: readonly Token[], offset: number): Token | undefined {
  if (tokens.length === 0) {
    return undefined;
  }

  let left = 0;
  let right = tokens.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const token = tokens[mid];

    // Check if offset is within this token's range
    if (token.startOffset <= offset && offset < token.endOffset) {
      return token;
    }

    // If offset is before this token, search left half
    if (offset < token.startOffset) {
      right = mid - 1;
    }
    // If offset is at or after this token's end, search right half
    else {
      left = mid + 1;
    }
  }

  // No token contains this offset (gap between tokens or out of range)
  return undefined;
}
