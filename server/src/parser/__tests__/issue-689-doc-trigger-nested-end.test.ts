/**
 * Issue #689: parseCodeSection documentation trigger scans for END without depth tracking
 *
 * The flat scan at lines 2639–2656 exits on the first END it finds, regardless of nesting.
 * If the documentation trigger body contains nested BEGIN...END or CASE...END blocks,
 * the scanner exits too early, potentially consuming the CODE section's closing brace.
 *
 * Fix: Replace the flat scan with a dual-depth-counting loop (tracking BEGIN and CASE depth
 * separately), mirroring recoverToTokensDepthAware(). Also add a safety bound on RightBrace
 * and SECTION_KEYWORDS.
 *
 * Note: Tests 1–4 pass with both the buggy and fixed code because the existing safety scan
 * at lines 2669–2674 masks the premature exit by skipping leftover tokens. Test 5 is the
 * diagnostic test — the buggy flat scan consumes the closing '}', causing a
 * parse-unclosed-block error.
 */

import { parseCode } from './parserTestHelpers';
import { ParseError } from '../parser';

describe('Issue #689 - Documentation trigger depth tracking', () => {
  it('should correctly skip documentation trigger with nested BEGIN...END', () => {
    // prettier-ignore
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
      BEGIN
      END;
    END.
  }
}`;
    const { ast } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('TestProc');
  });

  it('should correctly skip documentation trigger with double-nested BEGIN...END', () => {
    // prettier-ignore
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
      BEGIN
        BEGIN
        END;
      END;
    END.
  }
}`;
    const { ast } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('TestProc');
  });

  it('should correctly skip documentation trigger with CASE...END inside', () => {
    // CASE...END uses END without paired BEGIN — a depth counter that only tracks
    // BEGIN would prematurely exit when the CASE closes.
    // prettier-ignore
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
      CASE x OF
        1: y := 1;
      END;
    END.
  }
}`;
    const { ast } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('TestProc');
  });

  it('should correctly skip flat documentation trigger (regression)', () => {
    // prettier-ignore
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
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('TestProc');
  });

  it('should not consume closing brace when BEGIN has no matching END (malformed)', () => {
    // DIAGNOSTIC TEST: This test FAILS with the buggy flat scan because the flat scan
    // advances past the '}' closing the CODE section (since '}' is not END), consuming
    // it before the closing-brace finder can see it. The result is a parse-unclosed-block
    // error. With depth tracking + safety bound (break on RightBrace/'}'), the safety
    // bound triggers first, leaving the '}' available for the closing-brace finder.
    // prettier-ignore
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
      BEGIN
    }
}`;
    const { ast, errors } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    // The CODE section closing brace must be found correctly — no unclosed-block error
    const unclosedErrors = errors.filter((e: ParseError) => e.code === 'parse-unclosed-block');
    expect(unclosedErrors.length).toBe(0);
    // The CODE section endToken must be the closing '}'
    expect(codeSection.endToken.value).toBe('}');
  });
});
