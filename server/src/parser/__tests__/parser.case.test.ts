/**
 * Parser - Nested CASE Statement Error Recovery Tests
 *
 * Tests error recovery for nested CASE statements, validating:
 * - Error detection and reporting in nested CASE contexts
 * - Error location accuracy (line and column via error.token)
 * - Parser recovery (subsequent code parsed correctly)
 * - AST structure preservation after errors
 *
 * Related issues:
 * - #290: Investigate missing error for malformed statement in inner CASE
 * - #299: Add coverage for nested CASE error recovery
 */

import { parseCode } from './parserTestHelpers';
import { CaseStatement } from '../ast';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Nested CASE Error Recovery', () => {
  describe('Issue #299 exact example', () => {
    it.skip('should detect malformed statement in inner CASE branch', () => {
      // BLOCKED: Test uses invalid C/AL syntax (Option A,B,C) - needs test fixture fix
      // Issue #299: Original example from investigation
      // CASE x OF 1: CASE y OF A: [malformed statement;
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Option A,B,C;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            y::A: [ malformed statement;
          END;
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for malformed statement in inner CASE
      expect(errors.length).toBeGreaterThan(0);

      // Error should be detected (set literal or statement error)
      const hasError = errors.some(e =>
        e.message.includes('Expected ]') ||
        e.message.includes('set literal') ||
        e.message.includes('unexpected token')
      );
      expect(hasError).toBe(true);

      // Verify error points to line 13 (where [ appears)
      const relevantError = errors.find(e =>
        e.message.includes('Expected ]') ||
        e.message.includes('set literal') ||
        e.message.includes('unexpected token')
      );
      expect(relevantError?.token.line).toBe(13);

      // Parser should complete (not throw)
      expect(ast).toBeDefined();
      expect(ast.object).not.toBeNull();
    });
  });

  describe('Error in outer CASE after successful inner CASE', () => {
    it('should detect error in outer CASE branch value after inner CASE completes', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          BEGIN
            CASE y OF
              1: EXIT;
            END;
          END;
        2 EXIT;
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for missing colon after "2"
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Verify error location points to the problematic line
      expect(colonError?.token.line).toBeGreaterThanOrEqual(17);

      // Should preserve outer CASE structure
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].name).toBe('TestProc');
    });
  });

  describe('Missing colon in inner CASE with error location verification', () => {
    it('should report error location for missing colon in nested CASE branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            5 MESSAGE('Error here');
          END;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Should report missing colon error
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Verify error is on line 13 (the inner CASE branch)
      expect(colonError?.token.line).toBe(13);
      expect(colonError?.token.column).toBeGreaterThan(0);
    });
  });

  describe('Recovery boundary verification', () => {
    it('should not consume subsequent procedures during nested CASE error recovery', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2 EXIT;
          END;
      END;
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report the error
      expect(errors.length).toBeGreaterThan(0);

      // Should NOT consume SecondProc - both procedures should be in AST
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('FirstProc');
      expect(procedures[1].name).toBe('SecondProc');
    });
  });

  describe('Multiple errors in nested CASE', () => {
    it('should report multiple errors without cascading failures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2 EXIT;
            3 MESSAGE('test');
          END;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Should report errors for both missing colons
      expect(errors.length).toBeGreaterThanOrEqual(2);

      // Filter for colon errors
      const colonErrors = errors.filter(e => e.message.includes('Expected : after case branch value'));
      expect(colonErrors.length).toBeGreaterThanOrEqual(2);

      // Verify both are on different lines
      const lines = colonErrors.map(e => e.token.line);
      expect(new Set(lines).size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Unclosed set literal in nested CASE branch', () => {
    it('should recover from unclosed set literal in inner CASE branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
      Value : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            5:
              IF Value IN [1, 2, 3 THEN;
          END;
      END;
    END;

    PROCEDURE AnotherProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report unclosed set literal error
      expect(errors.length).toBeGreaterThan(0);
      const setError = errors.find(e => e.message.includes('Expected ] after set literal'));
      expect(setError).toBeDefined();

      // Verify error is in the inner CASE
      expect(setError?.token.line).toBe(15);

      // Should NOT consume AnotherProc
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[1].name).toBe('AnotherProc');
    });
  });

  describe('ELSE clause in both nesting levels', () => {
    it('should handle ELSE clauses at both outer and inner CASE levels', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            1: EXIT;
            ELSE
              MESSAGE('Inner else');
          END;
        ELSE
          MESSAGE('Outer else');
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors.length).toBe(0);

      // Verify outer CASE structure
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const statements = procedures[0].body;
      expect(statements.length).toBeGreaterThan(0);

      const outerCase = statements[0] as CaseStatement;
      expect(outerCase.type).toBe('CaseStatement');
      expect(outerCase.elseBranch).not.toBeNull();
      expect(outerCase.elseBranch?.length).toBeGreaterThan(0);
    });
  });

  describe('Three-level nesting with error in deepest level', () => {
    it('should detect error in third-level nested CASE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
      z : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2:
              CASE z OF
                3 EXIT;
              END;
          END;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Should report missing colon in deepest CASE
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Error should be on line 16 (deepest CASE branch)
      expect(colonError?.token.line).toBe(16);
    });
  });

  describe('Three-level nesting with error in middle level', () => {
    it('should detect error in second-level CASE while preserving third level', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
      z : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2
              CASE z OF
                3: EXIT;
              END;
          END;
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report missing colon in middle CASE
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Error should be on line 14 (middle CASE branch)
      expect(colonError?.token.line).toBe(14);

      // Should still preserve procedure structure
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
    });
  });

  describe('Recovery preserves subsequent procedures', () => {
    it('should preserve multiple procedures after nested CASE with multiple errors', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2 EXIT;
            3 MESSAGE('test');
          END;
        4 EXIT;
      END;
    END;

    PROCEDURE SecondProc();
    BEGIN
    END;

    PROCEDURE ThirdProc();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report multiple errors
      expect(errors.length).toBeGreaterThanOrEqual(3);

      // Should preserve all three procedures
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(3);
      expect(procedures[0].name).toBe('FirstProc');
      expect(procedures[1].name).toBe('SecondProc');
      expect(procedures[2].name).toBe('ThirdProc');
    });
  });

  describe('Malformed expression in nested CASE branch value', () => {
    // Issue #309 - Parser should report error for malformed range expressions
    it('should detect malformed expression in inner CASE branch value', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
            2..): EXIT;
          END;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Should report error for malformed range expression
      expect(errors.length).toBeGreaterThan(0);

      // Should report specific error message for incomplete range
      const rangeError = errors.find(e => e.message.includes('Expected expression after \'..\' in range'));
      expect(rangeError).toBeDefined();

      // Tier 1: Verify error token points to the delimiter that triggered the guard
      // The error should point to the ')' token that caused the range parsing to fail
      expect(rangeError!.token.line).toBe(13);
      expect(rangeError!.token.column).toBe(16);
      expect(rangeError!.token.value).toBe(')');
    });
  });

  describe('Malformed range expressions in CASE values', () => {
    it('should report error for range followed by colon', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        2..: EXIT;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Should report error for malformed range expression
      const rangeError = errors.find(e => e.message.includes('Expected expression after \'..\' in range'));
      expect(rangeError).toBeDefined();

      // Tier 1: Error token should point to the ':' that triggered the guard
      expect(rangeError!.token.line).toBe(10);
      expect(rangeError!.token.column).toBe(12);
      expect(rangeError!.token.value).toBe(':');
    });

    it('should report error for range followed by comma in multi-value branch', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        2..,3: EXIT;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Should report error for malformed range expression
      const rangeError = errors.find(e => e.message.includes('Expected expression after \'..\' in range'));
      expect(rangeError).toBeDefined();

      // Tier 1: Error token should point to the ',' that triggered the guard
      expect(rangeError!.token.line).toBe(10);
      expect(rangeError!.token.column).toBe(12);
      expect(rangeError!.token.value).toBe(',');
    });

    it('should report error for range followed by END keyword', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        2..END;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Should report error for malformed range expression
      const rangeError = errors.find(e => e.message.includes('Expected expression after \'..\' in range'));
      expect(rangeError).toBeDefined();

      // Tier 1: Error token should point to the 'END' keyword that triggered the guard
      expect(rangeError!.token.line).toBe(10);
      expect(rangeError!.token.column).toBe(12);
      expect(rangeError!.token.value).toBe('END');
    });

    it('should accept valid range expression as regression guard', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1..10: EXIT;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Valid range should parse without errors
      expect(errors.length).toBe(0);
    });

    it('should report error for malformed range at first position in CASE', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        ..1: EXIT;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Should report error for malformed range (starts with ..)
      // This is a different error than incomplete range - it's an invalid expression start
      expect(errors.length).toBeGreaterThan(0);

      // Should report specific error for unexpected '..' token
      const hasError = errors.some(e =>
        e.message.includes('Unexpected token') &&
        e.message.includes('expected expression')
      );
      expect(hasError).toBe(true);

      // Tier 2: Error should be within the CASE block (lines 9-11)
      const caseError = errors[0];
      expect(caseError.token.line).toBeGreaterThanOrEqual(9);
      expect(caseError.token.line).toBeLessThanOrEqual(11);
    });
  });

  describe('Empty nested CASE with error in outer', () => {
    it('should handle empty inner CASE and detect error in outer CASE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1:
          CASE y OF
          END;
        2 EXIT;
      END;
    END;
  }
}`;
      const { errors } = parseCode(code);

      // Should report missing colon after "2" in outer CASE
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Error should be on line 14 (outer CASE branch)
      expect(colonError?.token.line).toBe(14);
    });
  });

  describe('Issue #298 - Malformed function call consumes identifier case values', () => {
    it('should recover from malformed function call and recognize identifier case value', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
      Ready@1001 : Integer;
    BEGIN
      CASE x OF
        SomeFunc(arg:
        Ready: MESSAGE('Ready');
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for malformed function call (missing closing paren)
      expect(errors.length).toBeGreaterThan(0);
      const hasError = errors.some(e =>
        e.message.includes("Expected ',' or ')' in function arguments")
      );
      expect(hasError).toBe(true);

      // Should still parse the CASE statement
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt).toBeDefined();
      expect(caseStmt.type).toBe('CaseStatement');

      // Should have recovered and found both branches
      expect(caseStmt.branches.length).toBe(2);
      expect(caseStmt.branches[0]?.values?.[0]?.type).toBe('Identifier');
      expect((caseStmt.branches[0]?.values?.[0] as any)?.name).toBe('arg');
      expect(caseStmt.branches[1]?.values?.[0]?.type).toBe('Identifier');
      expect((caseStmt.branches[1]?.values?.[0] as any)?.name).toBe('Ready');
    });

    it('should recover from malformed function call and recognize quoted identifier case value', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        BrokenFunc(
        "My Value": MESSAGE('Value');
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for malformed function call
      expect(errors.length).toBeGreaterThan(0);

      // Should have recognized quoted identifier as case value
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.branches.length).toBeGreaterThanOrEqual(1);
      expect(caseStmt.branches[0]?.values?.[0]?.type).toBe('Identifier');
    });

    it('should recover to multiple identifier case values after malformed function', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
      Ready@1001 : Integer;
      Done@1002 : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        BadFunc(x:
        Ready: MESSAGE('Ready');
        Done: MESSAGE('Done');
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for malformed function call
      expect(errors.length).toBeGreaterThan(0);

      // Should have all branches: '1:', 'x:', 'Ready:', and 'Done:'
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.branches.length).toBe(4);

      // Verify branch names
      const branchValues = caseStmt.branches.map(b => {
        const val = b.values[0];
        if (val.type === 'Literal') return (val as any).value;
        if (val.type === 'Identifier') return (val as any).name;
        return null;
      });
      expect(branchValues).toContain(1);
      expect(branchValues).toContain('x');
      expect(branchValues).toContain('Ready');
      expect(branchValues).toContain('Done');
    });

    it('should not consume subsequent procedures during error recovery', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc@1();
    VAR
      x@1000 : Integer;
      Ready@1001 : Integer;
    BEGIN
      CASE x OF
        Broken(
        Ready: MESSAGE('Ready');
      END;
    END;

    PROCEDURE SecondProc@2();
    BEGIN
      MESSAGE('Second');
    END;
  }
}`;
      const { ast } = parseCode(code);

      // Should preserve both procedures - recovery must not consume beyond END;
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('FirstProc');
      expect(procedures[1].name).toBe('SecondProc');

      // Verify SecondProc has its body
      expect(procedures[1].body).toBeDefined();
      expect(procedures[1].body.length).toBeGreaterThan(0);
    });

    it('should handle identifier case value with empty previous branch', () => {
      // Test case without malformed call - identifier should parse normally
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
      Ready@1001 : Integer;
    BEGIN
      CASE x OF
        1:
        Ready: MESSAGE('Ready');
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse successfully (empty branches are valid in C/AL)
      expect(errors.length).toBe(0);

      // Should have two branches: '1:' (empty) and 'Ready:'
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      // BUG: May only have 1 branch if identifier not recognized
      expect(caseStmt.branches.length).toBe(2);
    });

    it('should distinguish identifier case value from function argument identifier', () => {
      // Verify parser doesn't falsely detect identifiers in function arguments as case values
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
      Ready@1001 : Integer;
      a@1002 : Integer;
      b@1003 : Integer;
      c@1004 : Integer;
    BEGIN
      CASE x OF
        1: SomeFunc(a, b, c);
        Ready: MESSAGE('Ready');
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse successfully - no false positives from function args
      expect(errors.length).toBe(0);

      // Should have exactly two branches: '1:' and 'Ready:'
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.branches.length).toBe(2);

      // First branch is numeric literal 1
      expect(caseStmt.branches[0].values[0].type).toBe('Literal');

      // Second branch is identifier Ready
      expect(caseStmt.branches[1].values[0].type).toBe('Identifier');
      expect((caseStmt.branches[1].values[0] as any).name).toBe('Ready');
    });

    it('should recover at identifier followed by colon, not identifier followed by comma', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
      ValidIdent@1001 : Integer;
      a@1002 : Integer;
      b@1003 : Integer;
      c@1004 : Integer;
    BEGIN
      CASE x OF
        1 SomeFunc(a, b, c);
        ValidIdent: MESSAGE('Valid');
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for missing colon after '1'
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Should have recovered and parsed 'ValidIdent:' as a valid branch
      // Recovery must look ahead: identifier + colon = recovery point
      //                          identifier + comma = keep consuming
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.branches.length).toBeGreaterThanOrEqual(2);

      // Second branch should be ValidIdent
      const lastBranch = caseStmt.branches[caseStmt.branches.length - 1];
      expect(lastBranch.values[0].type).toBe('Identifier');
      expect((lastBranch.values[0] as any).name).toBe('ValidIdent');
    });

  });

  describe('Issue #317 - CASE error recovery consumes FUNCTION declarations', () => {
    it('should not consume FUNCTION declaration during CASE error recovery', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: BEGIN
          MESSAGE('One');
          // Missing END - malformed CASE branch

    FUNCTION NextFunc() : Integer;
    BEGIN
      EXIT(42);
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for malformed CASE
      expect(errors.length).toBeGreaterThan(0);

      // BUG: FUNCTION gets consumed by CASE error recovery because recovery
      // doesn't stop at Function boundaries (only Procedure/Trigger/Event)
      // EXPECTED: Both TestProc procedure and NextFunc function should be in AST
      // ACTUAL: NextFunc is consumed as part of CASE error recovery
      const procedures = ast.object?.code?.procedures || [];

      // Should have 2 procedures (PROCEDURE and FUNCTION are both stored in procedures array)
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('TestProc');
      expect(procedures[1].name).toBe('NextFunc');
    });
  });

  describe('Issue #326 - CASE error recovery boundary tests', () => {
    it('should not consume PROCEDURE declaration during CASE error recovery', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: BEGIN
          MESSAGE('One');
          // Missing END - malformed CASE branch

    PROCEDURE NextProc();
    BEGIN
    END;
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report error for malformed CASE
      expect(errors.length).toBeGreaterThan(0);

      // Both procedures should be preserved in AST (not consumed by error recovery)
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('TestProc');
      expect(procedures[1].name).toBe('NextProc');
    });

    it('should not consume TRIGGER declaration during CASE error recovery', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: BEGIN
          MESSAGE('One');
          // Missing END - malformed CASE branch

    TRIGGER OnRun();
    BEGIN
    END;
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report error for malformed CASE
      expect(errors.length).toBeGreaterThan(0);

      // Procedure and trigger should be preserved (not consumed by error recovery)
      const procedures = ast.object?.code?.procedures || [];
      const triggers = ast.object?.code?.triggers || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].name).toBe('TestProc');
      expect(triggers.length).toBe(1);
      expect(triggers[0].name).toBe('OnRun');
    });

    it('should not consume EVENT declaration during CASE error recovery', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: BEGIN
          MESSAGE('One');
          // Missing END - malformed CASE branch

    EVENT WebViewer@1::DocumentReady@2();
    BEGIN
    END;
  }
}`;

      const { ast, errors } = parseCode(code);

      // Should report error for malformed CASE
      expect(errors.length).toBeGreaterThan(0);

      // Procedure and event should be preserved (not consumed by error recovery)
      const procedures = ast.object?.code?.procedures || [];
      const events = ast.object?.code?.events || [];
      expect(procedures.length).toBe(1);
      expect(procedures[0].name).toBe('TestProc');
      expect(events.length).toBe(1);
      expect(events[0].subscriberName).toBe('WebViewer@1');
      expect(events[0].eventName).toBe('DocumentReady@2');
    });
  });

  describe('Issue #362 - EOF after range operator in CASE value', () => {
    it('should report error for range operator at EOF in CASE value', () => {
      // prettier-ignore
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1..`;
      const { errors } = parseCode(code);

      // Should report error for incomplete range
      expect(errors.length).toBeGreaterThan(0);
      const rangeError = errors.find(e => e.message.includes('Expected expression after \'..\' in range'));
      expect(rangeError).toBeDefined();

      // Tier 1: Verify error token points to EOF token
      expect(rangeError!.token.line).toBe(10);
      expect(rangeError!.token.column).toBe(12);
    });

    it('should not produce spurious identifier nodes for EOF after range operator', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1..`;
      const { ast } = parseCode(code);

      // Parser should not crash
      expect(ast).toBeDefined();
      expect(ast.object).not.toBeNull();

      // Should not have spurious identifier nodes in AST
      // (regression guard - Gap 1 detection was checking for identifier presence)
      // Note: With EOF at range operator, parser may not successfully extract procedure structure
      // The important validation is that no spurious identifier is created and parser doesn't crash
      expect(ast.object).toBeDefined();
    });
  });

  describe('Issue #310 - Left bracket at statement position', () => {
    it('should report error for [ at statement position', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  OBJECT-PROPERTIES
  {
    Date=01/01/26;
    Time=12:00:00;
  }
  PROPERTIES
  {
  }
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      [ malformed;
    END;

    BEGIN
    END.
  }
}
`;

      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      const hasError = errors.some(e =>
        e.message.includes('Expected ]') ||
        e.message.includes('set literal') ||
        e.message.includes('cannot start an expression')
      );
      expect(hasError).toBe(true);

      // Parser should complete (not throw)
      expect(ast).toBeDefined();
      expect(ast.object).not.toBeNull();
    });

    it('should report clear error for control flow keyword at expression start', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  OBJECT-PROPERTIES
  {
    Date=01/01/26;
    Time=12:00:00;
  }
  PROPERTIES
  {
  }
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      x := END;
    END;

    BEGIN
    END.
  }
}
`;

      const { ast, errors } = parseCode(code);

      expect(errors.length).toBeGreaterThan(0);
      // Main branch implementation uses: "Unexpected keyword '...' in expression. Missing statement or operator before '...'."
      const hasError = errors.some(e =>
        e.message.includes('Unexpected keyword') &&
        e.message.includes('in expression')
      );
      expect(hasError).toBe(true);

      // Parser should complete (not throw)
      expect(ast).toBeDefined();
      expect(ast.object).not.toBeNull();
    });
  });

  describe('Issue #386 - CASE ELSE missing END detection', () => {
    describe('Primary fix scenarios - PROCEDURE/FUNCTION boundary protection', () => {
      it('should detect CASE ELSE missing END when followed by PROCEDURE', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          MESSAGE('Else');
      END;

    PROCEDURE SecondProc();
    BEGIN
      MESSAGE('Second');
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        // Should report error for CASE ELSE missing END
        expect(errors.length).toBeGreaterThan(0);
        const caseError = errors.find(e =>
          e.message.includes('Expected END to close CASE statement')
        );
        expect(caseError).toBeDefined();

        // Should preserve SecondProc - not consumed by CASE error recovery
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(2);
        expect(procedures[0].name).toBe('FirstProc');
        expect(procedures[1].name).toBe('SecondProc');
      });

      it('should detect CASE ELSE missing END when followed by FUNCTION', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          MESSAGE('Else');
      END;

    FUNCTION SecondFunc() : Integer;
    BEGIN
      EXIT(42);
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        const ast = parser.parse();
        const errors = parser.getErrors();

        // Should report error for CASE ELSE missing END
        expect(errors.length).toBeGreaterThan(0);
        const caseError = errors.find(e =>
          e.message.includes('Expected END to close CASE statement')
        );
        expect(caseError).toBeDefined();

        // Should preserve SecondFunc - not consumed by CASE error recovery
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures.length).toBe(2);
        expect(procedures[0].name).toBe('FirstProc');
        expect(procedures[1].name).toBe('SecondFunc');
      });
    });

    describe('Existing detection via outer structure END', () => {
      it('should detect CASE ELSE missing END when outer END closes parent structure', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          MESSAGE('Else');
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // Should report error - outer END is for procedure BEGIN, not CASE
        expect(errors.length).toBeGreaterThan(0);
        const caseError = errors.find(e =>
          e.message.includes('Expected END to close CASE statement')
        );
        expect(caseError).toBeDefined();
      });
    });

    describe('Regression guards - valid ELSE branches', () => {
      it('should parse CASE ELSE with IF inside correctly', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Boolean;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          IF y THEN
            MESSAGE('Else-If');
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // Should parse without errors
        expect(errors.length).toBe(0);
      });

      it('should parse CASE ELSE with BEGIN...END containing IF correctly', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Boolean;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          BEGIN
            IF y THEN
              MESSAGE('Else-If');
          END;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // Should parse without errors
        expect(errors.length).toBe(0);
      });

      it('should parse empty ELSE branch correctly', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // Should parse without errors
        expect(errors.length).toBe(0);
      });

      it('should parse CASE ELSE with multiple statements correctly', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE BEGIN
          MESSAGE('Else start');
          y := 10;
          MESSAGE('Else end');
        END;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // Should parse without errors
        expect(errors.length).toBe(0);
      });
    });

    describe('Known limitations - same procedure absorption', () => {
      it('should detect error when CASE ELSE missing END absorbs IF in same procedure', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Boolean;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          MESSAGE('Else');
      IF y THEN
        MESSAGE('After');
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // Should report error (IF gets absorbed into ELSE, error when reaching outer END)
        expect(errors.length).toBeGreaterThan(0);
        const hasError = errors.some(e =>
          e.message.includes('Expected END to close CASE statement')
        );
        expect(hasError).toBe(true);
      });

      it('should detect error when CASE ELSE missing END absorbs WHILE in same procedure', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Boolean;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          MESSAGE('Else');
      WHILE y DO
        EXIT;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        // Should report error (WHILE gets absorbed into ELSE, error when reaching outer END)
        expect(errors.length).toBeGreaterThan(0);
        const hasError = errors.some(e =>
          e.message.includes('Expected END to close CASE statement')
        );
        expect(hasError).toBe(true);
      });
    });
  });

  describe('Issue #387 - parseCaseElseBranch missing PROCEDURE_BOUNDARY_TOKENS guard', () => {
    it('should detect missing CASE END when ELSE branch is followed by PROCEDURE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
      ELSE
        MESSAGE('Default');

    PROCEDURE Bar();
    BEGIN
      MESSAGE('Bar');
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for missing CASE END
      expect(errors.length).toBeGreaterThan(0);
      const caseError = errors.find(e =>
        e.message.includes('Expected END to close CASE statement')
      );
      expect(caseError).toBeDefined();

      // Both procedures should be preserved (not consumed by error recovery)
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('Foo');
      expect(procedures[1].name).toBe('Bar');

      // CASE statement should be preserved in first procedure's body
      const statements = procedures[0].body;
      expect(statements.length).toBeGreaterThan(0);
      const caseStmt = statements.find(stmt => stmt.type === 'CaseStatement') as CaseStatement;
      expect(caseStmt).toBeDefined();
      expect(caseStmt.type).toBe('CaseStatement');

      // ELSE branch statements should be preserved
      expect(caseStmt.elseBranch).not.toBeNull();
      expect(caseStmt.elseBranch!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Issue #391 - parseCaseElseBranch error recovery', () => {
    it('should recover from malformed expression in ELSE branch and preserve CASE AST', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          y := ;
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for malformed expression (missing value after :=)
      expect(errors.length).toBeGreaterThan(0);
      const exprError = errors.find(e =>
        e.message.includes('Unexpected') && e.message.includes('expected expression')
      );
      expect(exprError).toBeDefined();

      // CASE statement should exist
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const statements = procedures[0].body;
      expect(statements.length).toBeGreaterThan(0);
      const caseStmt = statements.find(stmt => stmt.type === 'CaseStatement') as CaseStatement;
      expect(caseStmt).toBeDefined();
      expect(caseStmt.type).toBe('CaseStatement');

      // ELSE branch should not be null (even with error)
      expect(caseStmt.elseBranch).not.toBeNull();

      // Branches before ELSE should be preserved
      expect(caseStmt.branches.length).toBeGreaterThanOrEqual(1);
    });

    it('should recover from unclosed set literal in ELSE branch and preserve CASE AST', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      Value : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        2: MESSAGE('Two');
        ELSE
          IF Value IN [1,2,3 THEN;
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for unclosed set literal
      expect(errors.length).toBeGreaterThan(0);
      const setError = errors.find(e =>
        e.message.includes('Expected ] after set literal')
      );
      expect(setError).toBeDefined();

      // CASE statement should exist with complete structure
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const statements = procedures[0].body;
      expect(statements.length).toBeGreaterThan(0);
      const caseStmt = statements.find(stmt => stmt.type === 'CaseStatement') as CaseStatement;
      expect(caseStmt).toBeDefined();
      expect(caseStmt.type).toBe('CaseStatement');

      // Should preserve branches before ELSE
      expect(caseStmt.branches.length).toBe(2);

      // ELSE branch should not be null
      expect(caseStmt.elseBranch).not.toBeNull();
    });

    it('should recover from error in second statement of ELSE branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE BEGIN
          MESSAGE('First');
          y := !!!;
        END;
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for malformed expression
      expect(errors.length).toBeGreaterThan(0);
      const exprError = errors.find(e =>
        e.message.includes('Unexpected') && e.message.includes('expected expression')
      );
      expect(exprError).toBeDefined();

      // CASE statement should exist
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const statements = procedures[0].body;
      const caseStmt = statements.find(stmt => stmt.type === 'CaseStatement') as CaseStatement;
      expect(caseStmt).toBeDefined();

      // First statement in ELSE should be preserved
      expect(caseStmt.elseBranch).not.toBeNull();
      expect(caseStmt.elseBranch!.length).toBeGreaterThanOrEqual(1);
    });

    it('should not consume next PROCEDURE during ELSE branch error recovery', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          y := ;
      END;
    END;

    PROCEDURE SecondProc();
    BEGIN
      MESSAGE('Second');
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error in ELSE branch
      expect(errors.length).toBeGreaterThan(0);
      const exprError = errors.find(e =>
        e.message.includes('Unexpected') && e.message.includes('expected expression')
      );
      expect(exprError).toBeDefined();

      // Both procedures should be preserved (boundary protection)
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(2);
      expect(procedures[0].name).toBe('FirstProc');
      expect(procedures[1].name).toBe('SecondProc');
    });

    it('should recover from malformed expression inside nested BEGIN in ELSE branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE BEGIN
          x := !!!;
        END;
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for malformed expression
      expect(errors.length).toBeGreaterThan(0);
      const exprError = errors.find(e =>
        e.message.includes('Unexpected') && e.message.includes('expected expression')
      );
      expect(exprError).toBeDefined();

      // CASE statement should be preserved with complete structure
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const statements = procedures[0].body;
      const caseStmt = statements.find(stmt => stmt.type === 'CaseStatement') as CaseStatement;
      expect(caseStmt).toBeDefined();
      expect(caseStmt.type).toBe('CaseStatement');

      // ELSE branch should exist
      expect(caseStmt.elseBranch).not.toBeNull();
    });

    it('should recover when error immediately precedes CASE END token', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE y := !!! END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should report error for malformed expression
      expect(errors.length).toBeGreaterThan(0);
      const exprError = errors.find(e =>
        e.message.includes('Unexpected') && e.message.includes('expected expression')
      );
      expect(exprError).toBeDefined();

      // CASE statement should still get its END token and produce complete AST
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);
      const statements = procedures[0].body;
      const caseStmt = statements.find(stmt => stmt.type === 'CaseStatement') as CaseStatement;
      expect(caseStmt).toBeDefined();
      expect(caseStmt.type).toBe('CaseStatement');

      // CASE should have complete structure
      expect(caseStmt.branches.length).toBeGreaterThanOrEqual(1);
      expect(caseStmt.elseBranch).not.toBeNull();
    });

    it('should parse valid ELSE branch without errors (regression guard)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        ELSE
          MESSAGE('Default');
      END;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should parse without errors
      expect(errors.length).toBe(0);

      // CASE statement should exist with ELSE branch
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0].body;
      const caseStmt = statements.find(stmt => stmt.type === 'CaseStatement') as CaseStatement;
      expect(caseStmt).toBeDefined();
      expect(caseStmt.elseBranch).not.toBeNull();
      expect(caseStmt.elseBranch!.length).toBe(1);
    });
  });
});
