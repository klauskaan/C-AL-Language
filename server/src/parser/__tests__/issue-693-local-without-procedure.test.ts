/**
 * Issue #693: parseCodeSection silently drops LOCAL keyword when not followed by PROCEDURE
 *
 * In parseCodeSection(), when a LOCAL keyword is consumed but the following token is
 * the closing brace '}', the parser exits via the else { break } path without recording
 * any error. The orphaned LOCAL keyword is silently discarded.
 *
 * Fix: Capture the LOCAL token before consuming it, then record an error in the
 * else { break } path when isLocal is true.
 *
 * Diagnostic test: assert that an error is recorded for the orphaned LOCAL keyword.
 * This test FAILS before the fix (no error recorded) and passes after.
 */

import { parseCode } from './parserTestHelpers';

describe('Issue #693 - parseCodeSection records error for LOCAL without PROCEDURE', () => {
  it('records an error when LOCAL is followed by closing brace', () => {
    // LOCAL immediately before the closing brace — no PROCEDURE follows.
    // The parser should record an error for the orphaned LOCAL keyword.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    LOCAL
  }
}`;
    const { ast, errors } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    // The valid procedure must still be parsed
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('TestProc');
    // DIAGNOSTIC: error must be recorded for the orphaned LOCAL — fails before fix
    expect(errors.length).toBe(1);
    const localError = errors.find(e => e.message.includes('LOCAL'));
    expect(localError).toBeDefined();
    expect(localError!.code).toBe('parse-unexpected-token');
  });

  it('no error for LOCAL followed by PROCEDURE (regression)', () => {
    // LOCAL followed by a valid PROCEDURE is correct — must remain error-free.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    LOCAL PROCEDURE LocalProc@1();
    BEGIN
    END;
  }
}`;
    const { ast, errors } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('LocalProc');
    expect(codeSection.procedures[0].isLocal).toBe(true);
    expect(errors.length).toBe(0);
  });
});
