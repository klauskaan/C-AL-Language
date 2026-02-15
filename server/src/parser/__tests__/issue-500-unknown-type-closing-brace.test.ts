/**
 * Issue #500: Test parser's value-based fallback for closing braces tokenized as UNKNOWN
 *
 * When malformed input like `PROCEDURE BEGIN;` causes lexer context confusion, the closing
 * braces '}' are tokenized as UNKNOWN instead of RIGHT_BRACE. The parser's value-based
 * fallback in parseCodeSection (`this.peek().value === '}'`) ensures the CODE section still
 * identifies the closing brace correctly.
 *
 * This test provides targeted coverage for the fix in commit a262d6a (issue #497).
 */

import { parseCode, tokenize } from './parserTestHelpers';
import { TokenType } from '../../lexer/tokens';

describe('Issue #500 - Parser value-based fallback for UNKNOWN-type closing braces', () => {
  it('should find CODE section closing brace by value when lexer tokenizes it as UNKNOWN', () => {
    // prettier-ignore
    // Location assertions depend on fixture structure - do not reformat
    // PROCEDURE BEGIN; causes lexer context confusion
    const code = `OBJECT Codeunit 1 Test
{
  CODE
  {
    PROCEDURE BEGIN;
  }
}`;
    const { ast } = parseCode(code);

    // Verify object and CODE section parsed
    expect(ast.object).toBeDefined();
    expect(ast.object?.code).toBeDefined();

    const code_section = ast.object!.code!;

    // Core assertion: endToken.value should be '}' even though type is NOT RightBrace
    expect(code_section.endToken.value).toBe('}');

    // Verify the endToken type is UNKNOWN, not RightBrace
    // This documents the lexer confusion that makes value-based fallback necessary
    expect(code_section.endToken.type).toBe(TokenType.Unknown);
    expect(code_section.endToken.type).not.toBe(TokenType.RightBrace);

    // Verify it's the CODE section closing brace (line 6), not the object closing brace (line 7)
    expect(code_section.endToken.line).toBe(6);

    // Sanity check: endToken should be after startToken
    expect(code_section.endToken.startOffset).toBeGreaterThan(code_section.startToken.startOffset);
  });

  it('should tokenize closing braces as UNKNOWN when lexer context is confused', () => {
    // This test documents the lexer precondition that makes issue #500 meaningful
    const code = `OBJECT Codeunit 1 Test { CODE { PROCEDURE BEGIN; } }`;
    const tokens = tokenize(code);

    // Find the two '}' tokens
    const closingBraces = tokens.filter(t => t.value === '}');
    expect(closingBraces.length).toBe(2);

    // Both should be UNKNOWN type due to lexer context confusion from PROCEDURE BEGIN;
    expect(closingBraces[0].type).toBe(TokenType.Unknown);
    expect(closingBraces[1].type).toBe(TokenType.Unknown);
  });
});
