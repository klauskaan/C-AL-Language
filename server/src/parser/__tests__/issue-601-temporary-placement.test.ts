/**
 * Issue #601: Parser silently drops VAR section when TEMPORARY keyword appears before variable name
 *
 * When the parser encounters `TEMPORARY VarName : Record N;` (invalid placement),
 * it silently drops the entire VAR section without reporting an error.
 *
 * Correct syntax: `VarName : TEMPORARY Record N;`
 * Invalid syntax:  `TEMPORARY VarName : Record N;` (TEMPORARY before variable name)
 *
 * Before fix:
 * - Parser silently ignores the entire VAR section
 * - No parse error is recorded
 * - Subsequent procedures in the same CODE section are also dropped
 *
 * After fix:
 * - Parser reports an error: "TEMPORARY keyword must appear after the colon, not before variable name"
 * - Recovery synchronizes to the next variable or procedure
 * - Subsequent variables and procedures are still parsed
 *
 * Test cases verify:
 * 1. Error detection for misplaced TEMPORARY
 * 2. Recovery: subsequent variable in same VAR section is parsed
 * 3. Recovery: procedure body (BEGIN/END) is still parsed
 * 4. Recovery: subsequent procedures are parsed (cascade fix)
 * 5. Correct syntax regression: valid TEMPORARY placement still works
 * 6. @-syntax variant: TEMPORARY with numbered variables
 * 7. QuotedIdentifier variant: TEMPORARY with quoted names
 */

import { parseCode } from './parserTestHelpers';

describe('Issue #601 - TEMPORARY keyword placement', () => {
  describe('Invalid syntax: TEMPORARY before variable name', () => {
    it('should report error when TEMPORARY appears before variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      TEMPORARY Customer : Record 18;
  }
}`;
      const { errors } = parseCode(code);

      // Test case 1: Error detection
      const temporaryError = errors.find(e =>
        e.message.includes('TEMPORARY') &&
        (e.message.includes('placement') || e.message.includes('position') || e.message.includes('before'))
      );
      expect(temporaryError).toBeDefined();
    });

    it('should recover and parse subsequent variable in same VAR section', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      TEMPORARY Customer : Record 18;
      OtherVar : Integer;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Test case 1: Error is reported
      const temporaryError = errors.find(e =>
        e.message.includes('TEMPORARY') &&
        (e.message.includes('placement') || e.message.includes('position') || e.message.includes('before'))
      );
      expect(temporaryError).toBeDefined();

      // Test case 2: Recovery - subsequent variable is parsed
      const variables = ast.object?.code?.variables || [];
      const otherVar = variables.find(v => v.name === 'OtherVar');
      expect(otherVar).toBeDefined();
      expect(otherVar?.dataType.typeName).toBe('Integer');
    });

    it('should recover and parse procedure body after bad TEMPORARY in VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      TEMPORARY Customer : Record 18;
    BEGIN
      MESSAGE('Test');
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Test case 1: Error is reported
      const temporaryError = errors.find(e =>
        e.message.includes('TEMPORARY') &&
        (e.message.includes('placement') || e.message.includes('position') || e.message.includes('before'))
      );
      expect(temporaryError).toBeDefined();

      // Test case 3: Recovery - procedure body is parsed
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBeGreaterThan(0);

      const testProc = procedures.find(p => p.name === 'TestProc');
      expect(testProc).toBeDefined();
      expect(testProc!.body).toBeDefined();
      expect(testProc!.body.length).toBeGreaterThan(0);
    });

    it('should recover and parse subsequent procedures (cascade fix)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      TEMPORARY Customer : Record 18;
    BEGIN
      MESSAGE('First');
    END;

    PROCEDURE SecondProc();
    BEGIN
      MESSAGE('Second');
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Test case 1: Error is reported
      const temporaryError = errors.find(e =>
        e.message.includes('TEMPORARY') &&
        (e.message.includes('placement') || e.message.includes('position') || e.message.includes('before'))
      );
      expect(temporaryError).toBeDefined();

      // Test case 4: Recovery - subsequent procedure is parsed
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);

      const firstProc = procedures.find(p => p.name === 'FirstProc');
      expect(firstProc).toBeDefined();

      const secondProc = procedures.find(p => p.name === 'SecondProc');
      expect(secondProc).toBeDefined();
      expect(secondProc!.body).toBeDefined();
      expect(secondProc!.body.length).toBeGreaterThan(0);
    });
  });

  describe('Invalid syntax: TEMPORARY with @-syntax', () => {
    it('should report error for TEMPORARY before variable name with @-numbering', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      TEMPORARY Customer@1000 : Record 18;
  }
}`;
      const { errors } = parseCode(code);

      // Test case 6: @-syntax variant
      const temporaryError = errors.find(e =>
        e.message.includes('TEMPORARY') &&
        (e.message.includes('placement') || e.message.includes('position') || e.message.includes('before'))
      );
      expect(temporaryError).toBeDefined();
    });

    it('should recover and parse subsequent variable after bad TEMPORARY with @-syntax', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      TEMPORARY Customer@1000 : Record 18;
      OtherVar@1001 : Integer;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Error is reported
      const temporaryError = errors.find(e =>
        e.message.includes('TEMPORARY') &&
        (e.message.includes('placement') || e.message.includes('position') || e.message.includes('before'))
      );
      expect(temporaryError).toBeDefined();

      // Recovery: subsequent variable is parsed
      const variables = ast.object?.code?.variables || [];
      const otherVar = variables.find(v => v.name === 'OtherVar');
      expect(otherVar).toBeDefined();
      expect(otherVar?.dataType.typeName).toBe('Integer');
    });
  });

  describe('Invalid syntax: TEMPORARY with QuotedIdentifier', () => {
    it('should report error for TEMPORARY before QuotedIdentifier variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      TEMPORARY "Quoted Name" : Record 18;
  }
}`;
      const { errors } = parseCode(code);

      // Test case 7: QuotedIdentifier variant
      const temporaryError = errors.find(e =>
        e.message.includes('TEMPORARY') &&
        (e.message.includes('placement') || e.message.includes('position') || e.message.includes('before'))
      );
      expect(temporaryError).toBeDefined();
    });

    it('should recover and parse subsequent variable after bad TEMPORARY with QuotedIdentifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      TEMPORARY "Quoted Name" : Record 18;
      OtherVar : Integer;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Error is reported
      const temporaryError = errors.find(e =>
        e.message.includes('TEMPORARY') &&
        (e.message.includes('placement') || e.message.includes('position') || e.message.includes('before'))
      );
      expect(temporaryError).toBeDefined();

      // Recovery: subsequent variable is parsed
      const variables = ast.object?.code?.variables || [];
      const otherVar = variables.find(v => v.name === 'OtherVar');
      expect(otherVar).toBeDefined();
      expect(otherVar?.dataType.typeName).toBe('Integer');
    });
  });

  describe('Correct syntax regression', () => {
    it('should parse valid TEMPORARY placement (after colon) without errors', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Customer : TEMPORARY Record 18;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Test case 5: Correct syntax regression
      expect(errors).toHaveLength(0);

      const variables = ast.object?.code?.variables || [];
      expect(variables.length).toBe(1);
      expect(variables[0].name).toBe('Customer');
      expect(variables[0].dataType.typeName).toBe('Record 18');
      expect(variables[0].isTemporary).toBe(true);
    });

    it('should parse valid TEMPORARY with @-syntax without errors', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Customer@1000 : TEMPORARY Record 18;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const variables = ast.object?.code?.variables || [];
      expect(variables.length).toBe(1);
      expect(variables[0].name).toBe('Customer');
      expect(variables[0].isTemporary).toBe(true);
    });

    it('should parse valid TEMPORARY with QuotedIdentifier without errors', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      "Quoted Name" : TEMPORARY Record 18;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const variables = ast.object?.code?.variables || [];
      expect(variables.length).toBe(1);
      expect(variables[0].name).toBe('Quoted Name');
      expect(variables[0].isTemporary).toBe(true);
    });

    it('should parse multiple TEMPORARY variables correctly', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Customer : TEMPORARY Record 18;
      Vendor : TEMPORARY Record 23;
      NormalVar : Integer;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);

      const variables = ast.object?.code?.variables || [];
      expect(variables.length).toBe(3);

      expect(variables[0].name).toBe('Customer');
      expect(variables[0].isTemporary).toBe(true);

      expect(variables[1].name).toBe('Vendor');
      expect(variables[1].isTemporary).toBe(true);

      expect(variables[2].name).toBe('NormalVar');
      expect(variables[2].isTemporary).toBeUndefined();
    });
  });
});
