/**
 * Control Flow END Token Consumption Bug Tests
 *
 * BUG PATTERN: When IF/WHILE/FOR/WITH statements have empty bodies (only comments),
 * the parser incorrectly consumes the END token that belongs to an enclosing structure
 * (like a procedure's BEGIN-END block), leaving the enclosing structure unclosed.
 *
 * EXAMPLE from production code (TAB6000900.TXT, line 173):
 * ```
 * PROCEDURE Foo();
 * BEGIN
 *   ... code ...
 *   IF NOT FIND THEN
 *     // comment only (empty body)
 * END;  // BUG: Parser treats this as closing the IF, NOT the procedure
 *
 * PROCEDURE Bar();  // ERROR: Parser thinks this is nested inside Foo()
 * ```
 *
 * After the fix, the parser should recognize that control flow statements
 * cannot consume END tokens that belong to enclosing BEGIN-END blocks.
 */

import { parseCode } from './parserTestHelpers';

describe('Parser - Control Flow END Token Consumption Bug', () => {
  describe('IF statement with empty body consuming enclosing END', () => {
    it('should NOT consume procedure END when IF has empty body followed by END', () => {
      // This is the exact bug pattern from TAB6000900.TXT line 173-177
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    BEGIN
      IF NOT SomeCondition THEN
        // Empty body - just a comment
    END;

    PROCEDURE SecondProc();
    BEGIN
      EXIT;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // EXPECTED BEHAVIOR (after fix):
      // - No parse errors
      // - Both procedures should parse as separate top-level procedures
      // - SecondProc should NOT be nested inside FirstProc

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0]?.name).toBe('FirstProc');
      expect(procedures[1]?.name).toBe('SecondProc');

      // Verify FirstProc contains the IF statement in its body
      const firstProcBody = procedures[0]?.body || [];
      expect(firstProcBody.length).toBe(1);
      expect(firstProcBody[0]?.type).toBe('IfStatement');

      // Verify SecondProc is NOT nested inside FirstProc
      // (it should be a top-level procedure, not in FirstProc's body)
      expect(procedures[0]?.body?.length).toBe(1); // Only the IF statement
    });

    it('should handle multiple IFs with empty bodies before procedure END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    BEGIN
      IF Condition1 THEN
        // empty
      IF Condition2 THEN
        // empty
      IF Condition3 THEN
        // empty
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0]?.name).toBe('FirstProc');
      expect(procedures[1]?.name).toBe('SecondProc');

      // FirstProc has nested IF statements due to how empty bodies are parsed
      // IF Condition1 THEN (IF Condition2 THEN (IF Condition3 THEN))
      const firstProcBody = procedures[0]?.body || [];
      expect(firstProcBody.length).toBe(1);
      expect(firstProcBody[0]?.type).toBe('IfStatement');
    });

    it('should handle IF with empty body in procedure with VAR parameters', () => {
      // Pattern inspired by ValidateShortcutDimCode procedure structure
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc(FieldNumber@1000 : Integer;VAR ShortcutDimCode@1001 : Code[20]);
    BEGIN
      IF FieldNumber = 0 THEN
        // Empty - just validation that does nothing
    END;

    PROCEDURE SecondProc();
    BEGIN
      EXIT;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0]?.name).toBe('FirstProc');
      expect(procedures[1]?.name).toBe('SecondProc');

      // Verify FirstProc has correct parameters
      const firstProc = procedures[0];
      expect(firstProc?.parameters?.length).toBe(2);
      expect(firstProc?.parameters?.[0]?.name).toBe('FieldNumber');
      expect(firstProc?.parameters?.[1]?.name).toBe('ShortcutDimCode');
    });

    it('should handle nested IF with empty inner IF before procedure END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    BEGIN
      IF OuterCondition THEN BEGIN
        DoSomething;
        IF InnerCondition THEN
          // Empty inner IF
      END;
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
    });
  });

  describe('WHILE statement with empty body consuming enclosing END', () => {
    it('should NOT consume procedure END when WHILE has empty body followed by END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10 DO
        // Empty loop body
    END;

    PROCEDURE SecondProc();
    BEGIN
      EXIT;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0]?.name).toBe('FirstProc');
      expect(procedures[1]?.name).toBe('SecondProc');

      const firstProcBody = procedures[0]?.body || [];
      expect(firstProcBody.length).toBe(1);
      expect(firstProcBody[0]?.type).toBe('WhileStatement');
    });

    it('should handle WHILE with method call condition and empty body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      Customer : Record 18;
    BEGIN
      WHILE Customer.NEXT <> 0 DO
        // Just advancing through records
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
    });
  });

  describe('FOR statement with empty body consuming enclosing END', () => {
    it('should NOT consume procedure END when FOR has empty body followed by END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        // Empty loop
    END;

    PROCEDURE SecondProc();
    BEGIN
      EXIT;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0]?.name).toBe('FirstProc');
      expect(procedures[1]?.name).toBe('SecondProc');

      const firstProcBody = procedures[0]?.body || [];
      expect(firstProcBody.length).toBe(1);
      expect(firstProcBody[0]?.type).toBe('ForStatement');
    });

    it('should handle FOR DOWNTO with empty body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 10 DOWNTO 1 DO
        // Empty countdown
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
    });
  });

  describe('WITH statement with empty body consuming enclosing END', () => {
    it('should NOT consume procedure END when WITH has empty body followed by END', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      Customer : Record 18;
    BEGIN
      WITH Customer DO
        // Empty WITH body
    END;

    PROCEDURE SecondProc();
    BEGIN
      EXIT;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0]?.name).toBe('FirstProc');
      expect(procedures[1]?.name).toBe('SecondProc');

      const firstProcBody = procedures[0]?.body || [];
      expect(firstProcBody.length).toBe(1);
      expect(firstProcBody[0]?.type).toBe('WithStatement');
    });

    it('should handle WITH accessing record fields pattern', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      SalesHeader : Record 36;
    BEGIN
      WITH SalesHeader DO
        // Just setting up context, no actual operations
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
    });
  });

  describe('Mixed control flow with empty bodies', () => {
    it('should handle IF and WHILE with empty bodies in same procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      i : Integer;
    BEGIN
      IF i = 0 THEN
        // Initialize check
      WHILE i < 10 DO
        // Processing loop
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);

      // IF with empty body has WHILE as its body statement (due to no explicit separator)
      const firstProcBody = procedures[0]?.body || [];
      expect(firstProcBody.length).toBe(1);
      expect(firstProcBody[0]?.type).toBe('IfStatement');
      // The WHILE statement is the body of the IF statement (parsed as nested statement)
      const ifStmt = firstProcBody[0] as any;
      expect(ifStmt?.thenBranch?.type).toBe('WhileStatement');
    });

    it('should handle all control flow types with empty bodies', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      i : Integer;
      Customer : Record 18;
    BEGIN
      IF i = 0 THEN
        // check
      WHILE i < 10 DO
        // loop
      FOR i := 1 TO 5 DO
        // iterate
      WITH Customer DO
        // context
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);

      // All control flow statements are nested due to empty bodies with no explicit separators
      // IF (WHILE (FOR (WITH)))
      const firstProcBody = procedures[0]?.body || [];
      expect(firstProcBody.length).toBe(1);
      expect(firstProcBody[0]?.type).toBe('IfStatement');
    });
  });

  describe('Complex real-world scenario - AllocateRatio pattern', () => {
    it('should handle pattern from TAB6000900 AllocateRatio procedure', () => {
      // Synthetic version inspired by the actual bug location
      // The real bug is at line 173: IF NOT FIND THEN // comment END;
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE AllocateRatio();
    VAR
      CostAllocation : Record 1000;
      TotalRatio : Decimal;
    BEGIN
      CostAllocation.RESET;
      IF CostAllocation.FIND('-') THEN BEGIN
        REPEAT
          TotalRatio := TotalRatio + CostAllocation.Amount;
        UNTIL CostAllocation.NEXT = 0;
      END;

      IF NOT FIND THEN
        // May happen if filter is active
    END;

    PROCEDURE ValidateShortcutDimCode(FieldNumber@1000 : Integer;VAR ShortcutDimCode@1001 : Code[20]);
    BEGIN
      // ValidateShortcutDimCode implementation
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // This is the critical test - the pattern that actually fails in production
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0]?.name).toBe('AllocateRatio');
      expect(procedures[1]?.name).toBe('ValidateShortcutDimCode');

      // AllocateRatio should have 4 statements: RESET call, first IF with BEGIN-END, empty statement from semicolon, second IF with empty body
      const allocateBody = procedures[0]?.body || [];
      expect(allocateBody.length).toBe(4);
      expect(allocateBody[0]?.type).toBe('CallStatement');
      expect(allocateBody[1]?.type).toBe('IfStatement');
      expect(allocateBody[2]?.type).toBe('EmptyStatement');
      expect(allocateBody[3]?.type).toBe('IfStatement');

      // ValidateShortcutDimCode should have parameters with @ syntax (@ numbers are parsed but not stored in AST)
      const validateProc = procedures[1];
      expect(validateProc?.parameters?.length).toBe(2);
      expect(validateProc?.parameters?.[0]?.name).toBe('FieldNumber');
      expect(validateProc?.parameters?.[1]?.name).toBe('ShortcutDimCode');
      expect(validateProc?.parameters?.[1]?.isVar).toBe(true);
    });
  });

  describe('Regression: patterns that should continue working', () => {
    it('should still accept control flow with explicit BEGIN-END blocks', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    BEGIN
      IF Condition THEN BEGIN
        // Block with comment
      END;
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
    });

    it('should still accept control flow with actual statements', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    BEGIN
      IF Condition THEN
        EXIT;
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
    });
  });
});
