/**
 * Issue #320: Parser - Missing colon in CASE values not recovered properly
 *
 * Tests parser recovery when a colon is missing after a CASE branch value.
 *
 * Expected behavior:
 * - Parser creates a partial CaseBranch with the value but empty statements
 * - Parser recovers at the next valid branch (identifier followed by colon)
 * - Parser does NOT stop at identifiers in function arguments (identifier followed by comma)
 *
 * Before fix: Parser stops recovery at first identifier, treating function arguments as branches
 * After fix: Parser looks ahead for colon to distinguish branch labels from function arguments
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { CaseStatement, CaseBranch, Identifier, Literal } from '../ast';

describe('Issue #320 - Missing colon recovery', () => {
  describe('Recovery at identifier with colon', () => {
    it('should create partial branch and recover at next valid branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
      ValidIdent@1001 : Integer;
    BEGIN
      CASE x OF
        1 MESSAGE('Error');
        ValidIdent: MESSAGE('Valid');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should detect missing colon error
      expect(errors.length).toBeGreaterThan(0);
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Should have 2 branches: partial branch with value 1, recovered branch with ValidIdent
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.branches.length).toBe(2);

      // First branch: partial (has value, no statements)
      const firstBranch = caseStmt.branches[0];
      expect(firstBranch.type).toBe('CaseBranch');
      expect(firstBranch.values.length).toBe(1);
      expect(firstBranch.values[0].type).toBe('Literal');
      expect((firstBranch.values[0] as Literal).value).toBe(1);
      expect(firstBranch.statements.length).toBe(0);

      // Second branch: recovered (ValidIdent)
      const secondBranch = caseStmt.branches[1];
      expect(secondBranch.type).toBe('CaseBranch');
      expect(secondBranch.values.length).toBe(1);
      expect(secondBranch.values[0].type).toBe('Identifier');
      expect((secondBranch.values[0] as Identifier).name).toBe('ValidIdent');
      expect(secondBranch.statements.length).toBeGreaterThan(0);
    });

    it('should not stop at identifiers in function arguments', () => {
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should detect missing colon error
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Should have exactly 2 branches (not 3 or more from function arguments)
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.branches.length).toBe(2);

      // First branch: partial with value 1
      expect(caseStmt.branches[0].values[0].type).toBe('Literal');
      expect((caseStmt.branches[0].values[0] as Literal).value).toBe(1);
      expect(caseStmt.branches[0].statements.length).toBe(0);

      // Second branch: ValidIdent (not 'a', 'b', or 'c')
      expect(caseStmt.branches[1].values[0].type).toBe('Identifier');
      expect((caseStmt.branches[1].values[0] as Identifier).name).toBe('ValidIdent');
    });
  });

  describe('Recovery with multiple numeric values', () => {
    it('should recover when missing colon is followed by multiple numeric branches', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        1 MESSAGE('Error');
        2: MESSAGE('Two');
        3: MESSAGE('Three');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should detect missing colon error
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Should have 3 branches: partial (1), recovered (2), recovered (3)
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.branches.length).toBe(3);

      // First branch: partial
      expect((caseStmt.branches[0].values[0] as Literal).value).toBe(1);
      expect(caseStmt.branches[0].statements.length).toBe(0);

      // Second branch: recovered (value 2)
      expect((caseStmt.branches[1].values[0] as Literal).value).toBe(2);
      expect(caseStmt.branches[1].statements.length).toBeGreaterThan(0);

      // Third branch: recovered (value 3)
      expect((caseStmt.branches[2].values[0] as Literal).value).toBe(3);
      expect(caseStmt.branches[2].statements.length).toBeGreaterThan(0);
    });
  });

  describe('Recovery with nested function calls', () => {
    it('should skip deeply nested identifiers in function arguments', () => {
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
    BEGIN
      CASE x OF
        1 Func1(Func2(a, b), Func3(a));
        Ready: MESSAGE('Ready');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();

      // Should have exactly 2 branches despite nested function calls with identifiers
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.branches.length).toBe(2);

      // Second branch should be 'Ready', not 'a' or 'b' from function arguments
      expect(caseStmt.branches[1].values[0].type).toBe('Identifier');
      expect((caseStmt.branches[1].values[0] as Identifier).name).toBe('Ready');
    });
  });

  describe('Error reporting', () => {
    it('should report missing colon error with proper message', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        1 MESSAGE('Error');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();
      expect(colonError?.message).toMatch(/Expected : after case branch value/);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing colon as last branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        2 MESSAGE('Error');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should detect error
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Should still parse first branch correctly
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.branches.length).toBeGreaterThanOrEqual(1);
      expect((caseStmt.branches[0].values[0] as Literal).value).toBe(1);
    });

    it('should handle missing colon with ELSE branch following', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestCase@1();
    VAR
      x@1000 : Integer;
    BEGIN
      CASE x OF
        1 MESSAGE('Error');
        ELSE
          MESSAGE('Default');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should detect missing colon
      const colonError = errors.find(e => e.message.includes('Expected : after case branch value'));
      expect(colonError).toBeDefined();

      // Should recover and parse ELSE branch
      const procedures = ast.object?.code?.procedures || [];
      const statements = procedures[0]?.body || [];
      const caseStmt = statements[0] as CaseStatement;

      expect(caseStmt.type).toBe('CaseStatement');
      expect(caseStmt.elseBranch).toBeDefined();
      expect(caseStmt.elseBranch?.length).toBeGreaterThan(0);
    });
  });
});
