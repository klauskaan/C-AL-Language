/**
 * Issue #692: parseCodeSection recovery paths do not call recordSkippedRegion
 *
 * Two recovery paths in parseCodeSection() skip tokens without recording the skipped
 * region for diagnostic consumers:
 *
 * 1. Unexpected-token path (Unknown-typed token mid-section): advances past the token
 *    and skips to the next procedure boundary, but does not call recordSkippedRegion().
 *
 * 2. Catch-block path (ParseError thrown during parseProcedure/parseTrigger/parseEvent):
 *    skips to the next procedure boundary, but does not call recordSkippedRegion().
 *
 * Fix: Add recordSkippedRegion() calls to both paths, following the pattern established
 * by recoverToTokens() — capture startToken before the loop, count advances, call
 * recordSkippedRegion(startToken, this.previous(), skipCount, 'Error recovery') if
 * skipCount > 0.
 *
 * Diagnostic tests: assert skippedRegions.length > 0 after triggering each path.
 * These tests FAIL before the fix (both paths leave skippedRegions empty) and pass after.
 */

import { parseCode } from './parserTestHelpers';

describe('Issue #692 - parseCodeSection recovery paths record skipped regions', () => {
  it('unexpected-token path records a skipped region for the Unknown token', () => {
    // @unexpected is tokenized as Unknown type — triggers the unexpected-token recovery path.
    // The path advances past it and skips to the next procedure boundary.
    // After the fix, that skipped span must appear in skippedRegions.
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
    const { ast, errors, skippedRegions } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    // Both procedures still parsed (existing behaviour from #688 fix)
    expect(codeSection.procedures.length).toBe(2);
    // Error already recorded by the unexpected-token path (parse-unexpected-token)
    expect(errors.length).toBeGreaterThan(0);
    // DIAGNOSTIC: skipped region must be recorded — fails before fix
    expect(skippedRegions.length).toBeGreaterThan(0);
  });

  it('catch-block path records a skipped region after malformed PROCEDURE declaration', () => {
    // "PROCEDURE BEGIN END;" causes parseProcedure() to throw a ParseError (BEGIN is not
    // a valid procedure name). The catch block skips BEGIN, END, and ; before stopping at
    // the next PROCEDURE boundary token.
    // After the fix, those skipped tokens must appear in skippedRegions.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc@1();
    BEGIN
    END;

    PROCEDURE BEGIN
    END;

    PROCEDURE SecondProc@2();
    BEGIN
    END;
  }
}`;
    const { ast, errors, skippedRegions } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    // SecondProc must still be parsed after recovery
    expect(codeSection.procedures.length).toBeGreaterThanOrEqual(1);
    const names = codeSection.procedures.map((p: { name: string }) => p.name);
    expect(names).toContain('SecondProc');
    // Error already recorded by the catch block
    expect(errors.length).toBeGreaterThan(0);
    // DIAGNOSTIC: skipped region must be recorded — fails before fix
    expect(skippedRegions.length).toBeGreaterThan(0);
  });

  it('no skipped regions for clean input (regression)', () => {
    // Regression: recordSkippedRegion must NOT be called when parsing succeeds cleanly.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;
  }
}`;
    const { ast, errors, skippedRegions } = parseCode(code);
    expect(ast.object).toBeDefined();
    expect(ast.object!.code!.procedures.length).toBe(1);
    expect(errors.length).toBe(0);
    expect(skippedRegions.length).toBe(0);
  });
});
