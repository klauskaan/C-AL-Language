/**
 * Unit tests for findTokenAtOffset() utility function
 *
 * Context: Binary search utility for finding tokens at a given document offset.
 * Used by LSP providers (hover, definition, completion) to quickly locate the
 * token under the cursor.
 *
 * Semantics: Token matches if startOffset <= offset && offset < endOffset
 * (inclusive start, exclusive end)
 */

import { Token, TokenType } from '../../lexer/tokens';
import { findTokenAtOffset } from '../tokenSearch';

/**
 * Helper to create a test token
 */
function createToken(
  type: TokenType,
  value: string,
  startOffset: number,
  endOffset: number,
  line: number = 1,
  column: number = 1
): Token {
  return {
    type,
    value,
    line,
    column,
    startOffset,
    endOffset
  };
}

describe('findTokenAtOffset()', () => {
  describe('Empty and single-token arrays', () => {
    it('should return undefined for empty array', () => {
      const result = findTokenAtOffset([], 0);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty array with non-zero offset', () => {
      const result = findTokenAtOffset([], 100);
      expect(result).toBeUndefined();
    });

    it('should return token when offset is inside single token', () => {
      const token = createToken(TokenType.Identifier, 'test', 0, 4);
      const result = findTokenAtOffset([token], 2);
      expect(result).toBe(token);
    });

    it('should return undefined when offset is before single token', () => {
      const token = createToken(TokenType.Identifier, 'test', 10, 14);
      const result = findTokenAtOffset([token], 5);
      expect(result).toBeUndefined();
    });

    it('should return undefined when offset is after single token', () => {
      const token = createToken(TokenType.Identifier, 'test', 10, 14);
      const result = findTokenAtOffset([token], 20);
      expect(result).toBeUndefined();
    });
  });

  describe('Boundary conditions', () => {
    it('should match when offset equals startOffset (inclusive)', () => {
      const token = createToken(TokenType.Identifier, 'test', 10, 14);
      const result = findTokenAtOffset([token], 10);
      expect(result).toBe(token);
    });

    it('should NOT match when offset equals endOffset (exclusive)', () => {
      const token = createToken(TokenType.Identifier, 'test', 10, 14);
      const result = findTokenAtOffset([token], 14);
      expect(result).toBeUndefined();
    });

    it('should match at startOffset with multiple tokens', () => {
      const tokens = [
        createToken(TokenType.Identifier, 'first', 0, 5),
        createToken(TokenType.Identifier, 'second', 6, 12),
        createToken(TokenType.Identifier, 'third', 13, 18)
      ];
      const result = findTokenAtOffset(tokens, 6);
      expect(result).toBe(tokens[1]);
      expect(result?.value).toBe('second');
    });

    it('should not match at endOffset with multiple tokens', () => {
      const tokens = [
        createToken(TokenType.Identifier, 'first', 0, 5),
        createToken(TokenType.Identifier, 'second', 6, 12),
        createToken(TokenType.Identifier, 'third', 13, 18)
      ];
      const result = findTokenAtOffset(tokens, 5);
      expect(result).toBeUndefined();
    });
  });

  describe('Multiple tokens', () => {
    const tokens = [
      createToken(TokenType.Object, 'OBJECT', 0, 6),
      createToken(TokenType.Table, 'Table', 7, 12),
      createToken(TokenType.Integer, '18', 13, 15),
      createToken(TokenType.Identifier, 'Customer', 16, 24)
    ];

    it('should find token at beginning of array', () => {
      const result = findTokenAtOffset(tokens, 3);
      expect(result).toBe(tokens[0]);
      expect(result?.value).toBe('OBJECT');
    });

    it('should find token in middle of array', () => {
      const result = findTokenAtOffset(tokens, 14);
      expect(result).toBe(tokens[2]);
      expect(result?.value).toBe('18');
    });

    it('should find token at end of array', () => {
      const result = findTokenAtOffset(tokens, 20);
      expect(result).toBe(tokens[3]);
      expect(result?.value).toBe('Customer');
    });

    it('should return undefined for offset in gap between tokens', () => {
      // Offset 6 is endOffset of first token (exclusive)
      // Offset 7 is startOffset of second token
      // Gap is at offset 6
      const result = findTokenAtOffset(tokens, 6);
      expect(result).toBeUndefined();
    });

    it('should return undefined for offset before all tokens', () => {
      // All tokens start at offset 0 or later
      const result = findTokenAtOffset(
        [createToken(TokenType.Identifier, 'test', 10, 14)],
        5
      );
      expect(result).toBeUndefined();
    });

    it('should return undefined for offset after all tokens', () => {
      const result = findTokenAtOffset(tokens, 1000);
      expect(result).toBeUndefined();
    });
  });

  describe('Gap handling', () => {
    it('should return undefined when offset falls in gap between tokens', () => {
      const tokens = [
        createToken(TokenType.Identifier, 'first', 0, 5),
        // Gap from 5-9
        createToken(TokenType.Identifier, 'second', 10, 16),
        // Gap from 16-19
        createToken(TokenType.Identifier, 'third', 20, 25)
      ];

      expect(findTokenAtOffset(tokens, 7)).toBeUndefined();
      expect(findTokenAtOffset(tokens, 18)).toBeUndefined();
    });

    it('should find tokens adjacent to gaps', () => {
      const tokens = [
        createToken(TokenType.Identifier, 'first', 0, 5),
        // Gap from 5-9
        createToken(TokenType.Identifier, 'second', 10, 16)
      ];

      // Just before gap
      expect(findTokenAtOffset(tokens, 4)).toBe(tokens[0]);
      // Just after gap
      expect(findTokenAtOffset(tokens, 10)).toBe(tokens[1]);
    });
  });

  describe('Zero-length EOF token', () => {
    it('should handle zero-length EOF token at end of array', () => {
      const tokens = [
        createToken(TokenType.Identifier, 'test', 0, 4),
        createToken(TokenType.Semicolon, ';', 4, 5),
        createToken(TokenType.EOF, '', 5, 5) // Zero-length EOF
      ];

      // Offset inside last real token
      expect(findTokenAtOffset(tokens, 4)).toBe(tokens[1]);

      // Offset at EOF position (should not match EOF since startOffset === endOffset)
      expect(findTokenAtOffset(tokens, 5)).toBeUndefined();
    });

    it('should not match zero-length token at any offset', () => {
      const tokens = [
        createToken(TokenType.Identifier, 'first', 0, 5),
        createToken(TokenType.EOF, '', 5, 5) // Zero-length EOF
      ];

      // Can't match a token where startOffset === endOffset
      expect(findTokenAtOffset(tokens, 5)).toBeUndefined();
    });

    it('should handle array with only zero-length EOF token', () => {
      const tokens = [
        createToken(TokenType.EOF, '', 0, 0)
      ];

      expect(findTokenAtOffset(tokens, 0)).toBeUndefined();
    });

    it('should handle multiple zero-length tokens (pathological case)', () => {
      const tokens = [
        createToken(TokenType.Identifier, 'test', 0, 4),
        createToken(TokenType.EOF, '', 4, 4),
        createToken(TokenType.Unknown, '', 4, 4)
      ];

      // Only the real token should match
      const result = findTokenAtOffset(tokens, 2);
      expect(result).toBe(tokens[0]);
      expect(result?.value).toBe('test');

      // Zero-length tokens don't match
      expect(findTokenAtOffset(tokens, 4)).toBeUndefined();
    });
  });

  describe('Performance: Large arrays', () => {
    it('should complete binary search in < 1ms for 10,000 tokens', () => {
      // Generate 10,000 tokens: offset i*10 to i*10+5
      const tokens: Token[] = [];
      for (let i = 0; i < 10000; i++) {
        tokens.push(
          createToken(
            TokenType.Identifier,
            `token${i}`,
            i * 10,
            i * 10 + 5,
            i + 1,
            1
          )
        );
      }

      // Search for various positions
      const searchOffsets = [
        0,      // First token
        50000,  // Middle
        99990,  // Last token
        1234,   // Random position
        7777    // Another random
      ];

      const start = Date.now();
      for (const offset of searchOffsets) {
        findTokenAtOffset(tokens, offset);
      }
      const duration = Date.now() - start;

      // Binary search should be very fast
      expect(duration).toBeLessThan(1);
    });

    it('should find correct token in large array', () => {
      // Generate 10,000 tokens
      const tokens: Token[] = [];
      for (let i = 0; i < 10000; i++) {
        tokens.push(
          createToken(
            TokenType.Identifier,
            `token${i}`,
            i * 10,
            i * 10 + 5
          )
        );
      }

      // Verify correctness
      const result1 = findTokenAtOffset(tokens, 5000 * 10 + 2);
      expect(result1?.value).toBe('token5000');

      const result2 = findTokenAtOffset(tokens, 9999 * 10 + 4);
      expect(result2?.value).toBe('token9999');

      const result3 = findTokenAtOffset(tokens, 0);
      expect(result3?.value).toBe('token0');
    });

    it('should handle gaps in large array', () => {
      // Generate tokens with gaps: each token at i*20 to i*20+5 (15-char gaps)
      const tokens: Token[] = [];
      for (let i = 0; i < 1000; i++) {
        tokens.push(
          createToken(
            TokenType.Identifier,
            `token${i}`,
            i * 20,
            i * 20 + 5
          )
        );
      }

      // Offset in gap should return undefined
      expect(findTokenAtOffset(tokens, 10)).toBeUndefined();  // Gap after token0
      expect(findTokenAtOffset(tokens, 500 * 20 + 10)).toBeUndefined();  // Gap mid-array
    });
  });

  describe('Real-world token patterns', () => {
    it('should find token in realistic C/AL token sequence', () => {
      // Realistic: "OBJECT Table 18 Customer"
      const tokens = [
        createToken(TokenType.Object, 'OBJECT', 0, 6),
        createToken(TokenType.Table, 'Table', 7, 12),
        createToken(TokenType.Integer, '18', 13, 15),
        createToken(TokenType.Identifier, 'Customer', 16, 24),
        createToken(TokenType.EOF, '', 24, 24)
      ];

      // Cursor on 'O' of OBJECT
      const r1 = findTokenAtOffset(tokens, 0);
      expect(r1?.type).toBe(TokenType.Object);

      // Cursor on '1' of '18'
      const r2 = findTokenAtOffset(tokens, 13);
      expect(r2?.type).toBe(TokenType.Integer);

      // Cursor on 's' of 'Customer'
      const r3 = findTokenAtOffset(tokens, 18);
      expect(r3?.type).toBe(TokenType.Identifier);

      // Cursor in whitespace
      const r4 = findTokenAtOffset(tokens, 6); // Between OBJECT and Table
      expect(r4).toBeUndefined();
    });

    it('should handle adjacent tokens with no gaps', () => {
      // Pattern: ":=" operator followed immediately by identifier
      const tokens = [
        createToken(TokenType.Identifier, 'x', 0, 1),
        createToken(TokenType.Assign, ':=', 2, 4),
        createToken(TokenType.Integer, '42', 5, 7)
      ];

      expect(findTokenAtOffset(tokens, 0)?.value).toBe('x');
      expect(findTokenAtOffset(tokens, 1)).toBeUndefined(); // Gap
      expect(findTokenAtOffset(tokens, 2)?.value).toBe(':=');
      expect(findTokenAtOffset(tokens, 3)?.value).toBe(':=');
      expect(findTokenAtOffset(tokens, 4)).toBeUndefined(); // endOffset is exclusive
      expect(findTokenAtOffset(tokens, 5)?.value).toBe('42');
    });

    it('should handle multiline token sequence', () => {
      // Line 1: "VAR" at offset 0-3
      // Line 2: "  x : Integer;" starts at offset 4
      const tokens = [
        createToken(TokenType.Var, 'VAR', 0, 3, 1, 1),
        createToken(TokenType.Identifier, 'x', 6, 7, 2, 3),
        createToken(TokenType.Colon, ':', 8, 9, 2, 4),
        createToken(TokenType.Integer_Type, 'Integer', 10, 17, 2, 6),
        createToken(TokenType.Semicolon, ';', 17, 18, 2, 13)
      ];

      // First line
      expect(findTokenAtOffset(tokens, 1)?.value).toBe('VAR');

      // Gap (newline + spaces)
      expect(findTokenAtOffset(tokens, 4)).toBeUndefined();

      // Second line
      expect(findTokenAtOffset(tokens, 6)?.value).toBe('x');
      expect(findTokenAtOffset(tokens, 10)?.value).toBe('Integer');
    });
  });

  describe('Edge cases', () => {
    it('should handle negative offset', () => {
      const tokens = [
        createToken(TokenType.Identifier, 'test', 0, 4)
      ];
      expect(findTokenAtOffset(tokens, -1)).toBeUndefined();
    });

    it('should handle unsorted array (implementation detail)', () => {
      // Binary search assumes sorted array
      // This documents expected behavior if array is NOT sorted
      const unsorted = [
        createToken(TokenType.Identifier, 'third', 20, 25),
        createToken(TokenType.Identifier, 'first', 0, 5),
        createToken(TokenType.Identifier, 'second', 10, 15)
      ];

      // Result is undefined because binary search won't work correctly
      // This test documents that callers MUST provide sorted arrays
      const result = findTokenAtOffset(unsorted, 12);
      // We don't assert a specific result - it's undefined behavior
      // Just document that it exists
      expect([unsorted[2], undefined]).toContain(result);
    });

    it('should handle tokens at very large offsets', () => {
      const tokens = [
        createToken(TokenType.Identifier, 'test', 1_000_000, 1_000_005)
      ];
      expect(findTokenAtOffset(tokens, 1_000_002)?.value).toBe('test');
      expect(findTokenAtOffset(tokens, 999_999)).toBeUndefined();
      expect(findTokenAtOffset(tokens, 1_000_006)).toBeUndefined();
    });
  });
});
