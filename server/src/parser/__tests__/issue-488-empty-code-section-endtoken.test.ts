/**
 * Issue #488: CODE section with only documentation trigger has wrong endToken
 *
 * When a CODE section contains only the documentation trigger (BEGIN...END.) and no
 * procedures or triggers, the parser sets endToken to the opening brace '{' instead
 * of the closing brace '}'.
 *
 * Expected: CodeSection.endToken should point to the '}' closing the CODE section
 * Actual (before fix): CodeSection.endToken points to the '{' opening the CODE section
 */

import { parseCode } from './parserTestHelpers';
import { TokenType } from '../../lexer/tokens';

describe('Issue #488 - Empty CODE section endToken should be closing brace', () => {
  it('should set endToken to closing brace for CODE section with only documentation trigger', () => {
    // prettier-ignore
    // Location assertions depend on fixture structure - do not reformat
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    BEGIN
    END.
  }
}`;
    const { ast } = parseCode(code);

    // Verify object parsed
    expect(ast.object).toBeDefined();
    expect(ast.object?.code).toBeDefined();

    const code_section = ast.object!.code!;

    // Core assertion: endToken should be RightBrace, not LeftBrace
    expect(code_section.endToken.type).toBe(TokenType.RightBrace);

    // Verify it's the closing brace at line 7
    expect(code_section.endToken.line).toBe(7);

    // Verify the endToken is '}', not '{'
    expect(code_section.endToken.value).toBe('}');

    // Sanity check: endToken should be after startToken
    expect(code_section.endToken.startOffset).toBeGreaterThan(code_section.startToken.startOffset);
  });

  it('should set endToken to closing brace for CODE section with procedure and documentation trigger', () => {
    // prettier-ignore
    // Location assertions depend on fixture structure - do not reformat
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
    const { ast } = parseCode(code);

    // Verify object parsed
    expect(ast.object).toBeDefined();
    expect(ast.object?.code).toBeDefined();

    const code_section = ast.object!.code!;

    // Core assertion: endToken should be RightBrace
    expect(code_section.endToken.type).toBe(TokenType.RightBrace);

    // Verify it's the closing brace at line 11
    expect(code_section.endToken.line).toBe(11);

    // Verify the endToken is '}', not the semicolon after procedure END
    expect(code_section.endToken.value).toBe('}');

    // Verify the procedure was parsed
    expect(code_section.procedures).toBeDefined();
    expect(code_section.procedures.length).toBe(1);
    expect(code_section.procedures[0].name).toBe('TestProc');

    // Sanity check: endToken should be after startToken
    expect(code_section.endToken.startOffset).toBeGreaterThan(code_section.startToken.startOffset);
  });

  it('should set endToken to closing brace for CODE section with multiple procedures', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc@1();
    BEGIN
    END;

    PROCEDURE SecondProc@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
    const { ast } = parseCode(code);

    // Verify object parsed
    expect(ast.object).toBeDefined();
    expect(ast.object?.code).toBeDefined();

    const code_section = ast.object!.code!;

    // Core assertion: endToken should be RightBrace
    expect(code_section.endToken.type).toBe(TokenType.RightBrace);

    // Verify the endToken is '}', not a semicolon
    expect(code_section.endToken.value).toBe('}');

    // Verify procedures were parsed
    expect(code_section.procedures.length).toBe(2);
    expect(code_section.procedures[0].name).toBe('FirstProc');
    expect(code_section.procedures[1].name).toBe('SecondProc');

    // Sanity check: endToken should be after startToken
    expect(code_section.endToken.startOffset).toBeGreaterThan(code_section.startToken.startOffset);
  });
});
