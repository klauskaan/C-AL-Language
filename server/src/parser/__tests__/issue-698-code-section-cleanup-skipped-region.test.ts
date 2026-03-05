/**
 * Issue #698: parseCodeSection closing-brace cleanup loop does not call recordSkippedRegion
 *
 * The closing-brace cleanup loop in parseCodeSection() (after the main while loop and
 * after the documentation-trigger handler) skips unconsumed tokens to reach the closing '}'
 * without calling recordSkippedRegion(). This means diagnostic consumers never see that
 * those tokens were silently discarded.
 *
 * The cleanup loop runs when tokens remain between the end of the procedure list (or the
 * doc-trigger body) and the closing '}'. One way to trigger this: an identifier token
 * that is not a keyword recognised by the main while loop causes the loop to exit via the
 * else-break branch. The doc-trigger handler is then NOT entered (the current token is not
 * BEGIN), so the cleanup loop must advance past the remaining tokens to find '}'.
 *
 * Fix: capture startToken before the loop, count advances with skipCount, and push directly
 * to this.skippedRegions when skipCount > 0. Note: recordSkippedRegion() is intentionally NOT
 * used — that helper also calls recordError(), which would generate false-positive parse errors
 * for valid C/AL code (e.g. empty control flow leaving END unconsumed) that triggers this loop.
 *
 * Diagnostic test: assert skippedRegions.length > 0 after triggering the cleanup path.
 * Fails before the fix (cleanup loop does not call recordSkippedRegion) and passes after.
 */

import { parseCode } from './parserTestHelpers';

describe('Issue #698 - parseCodeSection closing-brace cleanup loop records skipped regions', () => {
  it('cleanup loop records a skipped region when stray tokens precede the closing brace', () => {
    // OrphanedToken is a plain identifier — not a C/AL keyword, not Unknown type.
    // The main while loop encounters it and falls to the else-break branch (it is not
    // PROCEDURE / TRIGGER / EVENT / BEGIN / Unknown-non-}). After the break the parser
    // is positioned at OrphanedToken; this.check(Begin) is false, so the doc-trigger
    // handler is skipped. The cleanup loop must advance past OrphanedToken and the
    // subsequent BEGIN / END / Period tokens to reach '}'.
    // Before the fix: cleanup loop advances silently — skippedRegions stays empty.
    // After the fix:  recordSkippedRegion() is called — skippedRegions.length > 0.
    // prettier-ignore
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    OrphanedToken

    BEGIN
    END.
  }
}`;
    const { ast, skippedRegions } = parseCode(code);
    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    // TestProc must still be parsed — the cleanup path does not discard already-parsed procedures
    expect(codeSection.procedures.length).toBe(1);
    const names = codeSection.procedures.map((p: { name: string }) => p.name);
    expect(names).toContain('TestProc');
    // DIAGNOSTIC: cleanup loop must record the skipped region — fails before fix
    expect(skippedRegions.length).toBeGreaterThan(0);
  });

  it('no skipped regions when the CODE section is clean and needs no cleanup (regression)', () => {
    // Regression guard: recordSkippedRegion must NOT be called when parsing succeeds cleanly
    // and the closing brace is the immediate next token after the procedure list.
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
