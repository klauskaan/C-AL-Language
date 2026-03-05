/**
 * Issue #688: parseCodeSection silently drops remaining procedures on unexpected tokens
 *
 * The `else { break }` at lines 2606-2608 exits silently when encountering any token
 * that doesn't match a known keyword. This makes unexpected mid-section tokens
 * indistinguishable from the normal `}` close, causing all remaining procedures to
 * be silently dropped with no diagnostic.
 *
 * Fix: Split into two paths:
 * - `}` → normal exit (break)
 * - Unexpected token → record error, skip to next procedure boundary, continue
 */

import { parseCode } from './parserTestHelpers';

describe('Issue #688 - parseCodeSection recovery on unexpected tokens', () => {
  it('should recover and parse second procedure after unexpected token', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc@1();
    BEGIN
    END;

    @unexpected

    PROCEDURE SecondProc@2();
    BEGIN
    END;
  }
}`;
    const { ast, errors } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    // Both procedures must be parsed — not just the first one
    expect(codeSection.procedures.length).toBe(2);
    expect(codeSection.procedures[0].name).toBe('FirstProc');
    expect(codeSection.procedures[1].name).toBe('SecondProc');
    // At least one error must be recorded for the unexpected token
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should recover and preserve LOCAL flag on LOCAL PROCEDURE after unexpected token', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc@1();
    BEGIN
    END;

    @unexpected

    LOCAL PROCEDURE LocalProc@2();
    BEGIN
    END;
  }
}`;
    const { ast, errors } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    // LocalProc must be parsed AND must retain its LOCAL flag
    expect(codeSection.procedures.length).toBe(2);
    expect(codeSection.procedures[1].name).toBe('LocalProc');
    expect(codeSection.procedures[1].isLocal).toBe(true);
    // Error recorded for unexpected token
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should exit cleanly when unexpected token immediately precedes closing brace', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    @unexpected
  }
}`;
    const { ast, errors } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('TestProc');
    // endToken must be the closing brace — no hang, no infinite loop
    expect(codeSection.endToken.value).toBe('}');
    // Error recorded for unexpected token
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should exit cleanly on normal closing brace with no error (regression)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;
  }
}`;
    const { ast, errors } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('TestProc');
    // No errors for clean input
    expect(errors.length).toBe(0);
  });

  it('should parse all procedures in a normal multi-procedure file (regression)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE ProcA@1();
    BEGIN
    END;

    PROCEDURE ProcB@2();
    BEGIN
    END;

    LOCAL PROCEDURE ProcC@3();
    BEGIN
    END;
  }
}`;
    const { ast, errors } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    expect(codeSection.procedures.length).toBe(3);
    expect(codeSection.procedures[0].name).toBe('ProcA');
    expect(codeSection.procedures[1].name).toBe('ProcB');
    expect(codeSection.procedures[2].name).toBe('ProcC');
    expect(codeSection.procedures[2].isLocal).toBe(true);
    expect(errors.length).toBe(0);
  });
});
