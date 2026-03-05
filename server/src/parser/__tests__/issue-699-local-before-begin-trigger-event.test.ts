/**
 * Issue #699: parseCodeSection silently discards LOCAL keyword in two additional paths
 *
 * Gap 1 - LOCAL BEGIN: After consuming LOCAL (isLocal=true), if the next token is BEGIN
 *   (doc trigger), the parser hits `else if (check Begin) { break }` and exits without
 *   recording any error for the orphaned LOCAL. The isLocal guard only runs in the final
 *   `else { break }` branch, which BEGIN never reaches.
 *
 * Gap 2 - LOCAL TRIGGER / LOCAL EVENT: After consuming LOCAL (isLocal=true), the parser
 *   calls parseTrigger() or parseEvent() directly without checking isLocal — so the
 *   invalid LOCAL prefix is silently discarded with no diagnostic.
 *
 * Tests 1-3 FAIL before the fix (no error recorded) and pass after.
 * Tests 4-6 are regression tests that pass both before and after.
 */

import { parseCode } from './parserTestHelpers';

describe('Issue #699 - parseCodeSection records error for LOCAL before BEGIN/TRIGGER/EVENT', () => {
  // ────────────────────────────────────────────────────────────────────────────
  // Gap 1: LOCAL followed by BEGIN (doc trigger)
  // ────────────────────────────────────────────────────────────────────────────

  it('should record error when LOCAL is followed by BEGIN (doc trigger)', () => {
    // LOCAL immediately before the doc-trigger BEGIN block.
    // The isLocal guard in the else-break path is never reached because BEGIN
    // has its own else-if branch that breaks without checking isLocal.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    LOCAL

    BEGIN
    END;
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
    const localError = errors.find(e => e.message.includes('LOCAL'));
    expect(localError).toBeDefined();
    expect(localError!.code).toBe('parse-unexpected-token');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Gap 2a: LOCAL followed by TRIGGER
  // ────────────────────────────────────────────────────────────────────────────

  it('should record error when LOCAL is followed by TRIGGER and still parse the trigger', () => {
    // LOCAL before a TRIGGER declaration is invalid C/AL syntax — triggers cannot
    // be local. The parser calls parseTrigger() without checking isLocal,
    // so the orphaned LOCAL is silently discarded.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    LOCAL

    TRIGGER OnValidate@1();
    BEGIN
    END;
  }
}`;
    const { ast, errors } = parseCode(code);

    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    // The valid procedure must still be parsed
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('TestProc');
    // The trigger must still be parsed (recovery requirement)
    expect(codeSection.triggers.length).toBe(1);
    expect(codeSection.triggers[0].name).toBe('OnValidate');

    // DIAGNOSTIC: error must be recorded for the invalid LOCAL prefix — fails before fix
    const localError = errors.find(e => e.message.includes('LOCAL'));
    expect(localError).toBeDefined();
    expect(localError!.code).toBe('parse-unexpected-token');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Gap 2b: LOCAL followed by EVENT
  // ────────────────────────────────────────────────────────────────────────────

  it('should record error when LOCAL is followed by EVENT and still parse the event', () => {
    // LOCAL before an EVENT declaration is invalid C/AL syntax — events cannot
    // be local. The parser calls parseEvent() without checking isLocal,
    // so the orphaned LOCAL is silently discarded.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    LOCAL

    EVENT WebPageViewer@-2::DocumentReady@9();
    BEGIN
    END;
  }
}`;
    const { ast, errors } = parseCode(code);

    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection).toBeDefined();
    // The valid procedure must still be parsed
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('TestProc');
    // The event must still be parsed (recovery requirement)
    expect(codeSection.events.length).toBe(1);
    expect(codeSection.events[0].subscriberName).toBe('WebPageViewer@-2');

    // DIAGNOSTIC: error must be recorded for the invalid LOCAL prefix — fails before fix
    const localError = errors.find(e => e.message.includes('LOCAL'));
    expect(localError).toBeDefined();
    expect(localError!.code).toBe('parse-unexpected-token');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Regression: valid LOCAL PROCEDURE — must remain error-free
  // ────────────────────────────────────────────────────────────────────────────

  it('should produce zero errors for valid LOCAL PROCEDURE and set isLocal on the procedure', () => {
    // LOCAL followed by a valid PROCEDURE is correct C/AL — must remain error-free.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    LOCAL PROCEDURE LocalProc@1();
    BEGIN
    END;
  }
}`;
    const { errors, ast } = parseCode(code);

    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection.procedures.length).toBe(1);
    expect(codeSection.procedures[0].name).toBe('LocalProc');
    expect(codeSection.procedures[0].isLocal).toBe(true);
    expect(errors).toHaveLength(0);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Regression: valid TRIGGER without LOCAL — must remain error-free
  // ────────────────────────────────────────────────────────────────────────────

  it('should produce zero errors for valid TRIGGER without LOCAL', () => {
    // A plain TRIGGER declaration (no LOCAL) must continue to parse without errors.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    TRIGGER OnValidate@1();
    BEGIN
    END;
  }
}`;
    const { errors, ast } = parseCode(code);

    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection.triggers.length).toBe(1);
    expect(codeSection.triggers[0].name).toBe('OnValidate');
    expect(errors).toHaveLength(0);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Regression: valid EVENT without LOCAL — must remain error-free
  // ────────────────────────────────────────────────────────────────────────────

  it('should produce zero errors for valid EVENT without LOCAL', () => {
    // A plain EVENT declaration (no LOCAL) must continue to parse without errors.
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    EVENT WebPageViewer@-2::DocumentReady@9();
    BEGIN
    END;
  }
}`;
    const { errors, ast } = parseCode(code);

    expect(ast.object).toBeDefined();
    const codeSection = ast.object!.code!;
    expect(codeSection.events.length).toBe(1);
    expect(codeSection.events[0].subscriberName).toBe('WebPageViewer@-2');
    expect(errors).toHaveLength(0);
  });
});
