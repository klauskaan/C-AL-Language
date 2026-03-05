/**
 * Issue #696: Guard in parseCodeSection treats Unknown-typed '}' as a clean exit,
 * not as an unexpected token requiring recovery.
 *
 * Root cause:
 *   The lexer emits TokenType.Unknown with value '}' when a '}' is encountered at
 *   braceDepth <= 0 (scanRightBrace, lexer.ts ~line 780). This happens when the object
 *   body '{' is absent, so the CODE section's '}' arrives at braceDepth=0.
 *
 * The guard in parseCodeSection (parser.ts ~line 2606):
 *   } else if (this.peek().type === TokenType.Unknown && this.peek().value !== '}') {
 *
 * When type === Unknown AND value === '}', the condition evaluates to false → falls to
 * the `else { break }` arm → clean exit, no error recorded.
 *
 * Test fixture:
 *   Use a quoted object name so the name parser stops at the String token (not greedily
 *   consuming CODE and '}'). Then omit the object body '{' and the CODE section '{'.
 *   The '}' is the very first closing brace the lexer encounters, arriving at braceDepth=0
 *   → emits TokenType.Unknown with value '}':
 *
 *   OBJECT Codeunit 1 'Test'
 *     CODE
 *     }
 *
 * Parser trace:
 *   1. Object header parsed (quoted name 'Test', no '{' for object body → silently continues)
 *   2. While loop: CODE token seen → parseCodeSection() called
 *   3. parseCodeSection consumes CODE, checks for '{' (not found) → records error
 *      "Expected { to open CODE section"
 *   4. While loop: peek is Unknown '}' token
 *   5. Guard check: type === Unknown && value !== '}' → value IS '}', condition false
 *   6. Falls to else { break } → clean exit (no parse-unexpected-token error for '}')
 *   7. endToken detection: this.peek().value === '}' → TRUE → advances, endToken = Unknown '}'
 */

import { parseCode, tokenize } from './parserTestHelpers';
import { TokenType } from '../../lexer/tokens';

describe('Issue #696 - Unknown-typed } is treated as clean CODE section exit, not unexpected token', () => {
  // prettier-ignore
  // Location assertions depend on fixture structure — do not reformat.
  // Quoted name is required: unquoted name parser greedily consumes CODE and '}' up to EOF,
  // so parseCodeSection would never be reached. The quoted name stops at the String token.
  const fixture = `OBJECT Codeunit 1 'Test'
  CODE
  }`;

  describe('Lexer precondition', () => {
    it('should emit TokenType.Unknown for } at braceDepth<=0 (no object body { present)', () => {
      // The fixture has no object body '{', so the first '}' arrives at braceDepth=0.
      // scanRightBrace checks: if (braceDepth <= 0) → addToken(TokenType.Unknown, '}', ...)
      const tokens = tokenize(fixture);

      const closingBraces = tokens.filter(t => t.value === '}');
      expect(closingBraces.length).toBeGreaterThanOrEqual(1);

      // The first '}' must be Unknown — it hits the braceDepth<=0 path
      expect(closingBraces[0].type).toBe(TokenType.Unknown);
      expect(closingBraces[0].type).not.toBe(TokenType.RightBrace);
    });
  });

  describe('Parser guard: Unknown-typed } exits CODE section cleanly', () => {
    it('should define a CODE section when closing brace is Unknown-typed', () => {
      const { ast } = parseCode(fixture);

      // The object header was parsed and CODE section was entered
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).not.toBeNull();
    });

    it('should not record a parse-unexpected-token error for the Unknown-typed }', () => {
      const { errors } = parseCode(fixture);

      // The guard blocks recovery for Unknown-typed '}' — no "Unexpected token" error
      // with value '}' should appear
      const unexpectedBraceErrors = errors.filter(
        e => e.code === 'parse-unexpected-token' && e.token?.value === '}'
      );
      expect(unexpectedBraceErrors).toHaveLength(0);
    });

    it('should set endToken.value to } and endToken.type to Unknown (proves clean break path)', () => {
      const { ast } = parseCode(fixture);

      const codeSection = ast.object!.code!;

      // endToken comes from the value-based fallback: this.peek().value === '}' → advance()
      // This proves the else { break } path was taken, not the recovery path
      expect(codeSection.endToken.value).toBe('}');
      expect(codeSection.endToken.type).toBe(TokenType.Unknown);
    });
  });

  describe('Contrast: Unknown-typed non-} token still triggers recovery with an error', () => {
    it('should record a parse-unexpected-token error for Unknown-typed non-} token in CODE section', () => {
      // '@' is not a valid lexer character for C/AL — it falls through to the default case
      // in the main scan switch and emits TokenType.Unknown with value '@'.
      // The guard: (type === Unknown && value !== '}') → TRUE for '@' → enters recovery.
      // prettier-ignore
      // Location assertions depend on fixture structure — do not reformat
      const contrastFixture = `OBJECT Codeunit 1 Test
{
  CODE
  {
    @stray
  }
}`;
      const { errors } = parseCode(contrastFixture);

      // Recovery path records an error with code 'parse-unexpected-token'
      const unexpectedTokenErrors = errors.filter(e => e.code === 'parse-unexpected-token');
      expect(unexpectedTokenErrors.length).toBeGreaterThanOrEqual(1);
    });

    it('should verify the contrast fixture produces an Unknown-typed @ token inside CODE section', () => {
      // prettier-ignore
      const contrastFixture = `OBJECT Codeunit 1 Test
{
  CODE
  {
    @stray
  }
}`;
      const tokens = tokenize(contrastFixture);

      // '@' is emitted as Unknown with value '@' (default case in main scan switch)
      const atTokens = tokens.filter(t => t.value === '@');
      expect(atTokens.length).toBeGreaterThanOrEqual(1);
      expect(atTokens[0].type).toBe(TokenType.Unknown);
      expect(atTokens[0].type).not.toBe(TokenType.RightBrace);
    });
  });
});
