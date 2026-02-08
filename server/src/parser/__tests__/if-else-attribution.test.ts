/**
 * IF/ELSE Misattribution Bug Tests
 *
 * BUG: Parser incorrectly attributes ELSE branches when IF statements are nested
 * inside other control flow constructs. The IF parser unconditionally checks for
 * ELSE without considering that in C/AL, a semicolon terminates a statement's
 * ability to claim an ELSE.
 *
 * C/AL SYNTAX RULE:
 * - `IF cond THEN stmt ELSE` - NO semicolon before ELSE (ELSE belongs to this IF)
 * - `IF cond THEN stmt; ELSE` - semicolon terminates IF (ELSE belongs to outer construct)
 *
 * EXAMPLE:
 * ```
 * CASE State OF
 *   1: IF Found THEN
 *        EXIT;     // Semicolon terminates IF
 *   ELSE           // BUG: Parser gives this to IF, should go to CASE
 *     ERROR('Invalid state');
 * END;
 * ```
 *
 * After fix: parseIfStatement() will check `this.previous().type === TokenType.Semicolon`
 * before parsing ELSE, preventing misattribution.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import {
  IfStatement,
  CaseStatement,
  WhileStatement,
  ForStatement,
  WithStatement,
  BlockStatement
} from '../ast';

describe('Parser - IF/ELSE Misattribution Bug', () => {
  describe('CASE...OF with IF statements', () => {
    it('should attribute ELSE to CASE when IF has semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State : Integer;
    BEGIN
      CASE State OF
        1: IF Found THEN
             EXIT;
        ELSE
          ERROR('Invalid state');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);

      const body = procedures[0]?.body || [];
      expect(body.length).toBe(1);
      expect(body[0]?.type).toBe('CaseStatement');

      const caseStmt = body[0] as CaseStatement;
      // CASE should have 1 branch (value: 1) with IF statement
      expect(caseStmt.branches.length).toBe(1);
      expect(caseStmt.branches[0]?.statements.length).toBe(1);
      expect(caseStmt.branches[0]?.statements[0]?.type).toBe('IfStatement');

      // IF statement should NOT have elseBranch (semicolon terminates it)
      const ifStmt = caseStmt.branches[0]?.statements[0] as IfStatement;
      expect(ifStmt.elseBranch).toBeNull();

      // CASE should have elseBranch (ELSE belongs to CASE)
      expect(caseStmt.elseBranch).not.toBeNull();
      expect(caseStmt.elseBranch?.length).toBe(1);
      expect(caseStmt.elseBranch?.[0]?.type).toBe('CallStatement');
    });

    it('should attribute ELSE to IF when no semicolon present', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State : Integer;
    BEGIN
      CASE State OF
        1: IF Found THEN
             EXIT
           ELSE
             ERROR('Not found');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const caseStmt = body[0] as CaseStatement;

      // IF statement SHOULD have elseBranch (no semicolon)
      const ifStmt = caseStmt.branches[0]?.statements[0] as IfStatement;
      expect(ifStmt.elseBranch).not.toBeNull();
      expect(ifStmt.elseBranch?.type).toBe('CallStatement');

      // CASE should NOT have elseBranch (ELSE belongs to IF)
      expect(caseStmt.elseBranch).toBeNull();
    });

    it('should handle multiple CASE branches with IF-ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State : Integer;
    BEGIN
      CASE State OF
        1: IF Cond1 THEN
             Action1;
        2: IF Cond2 THEN
             Action2;
        ELSE
          DefaultAction;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const caseStmt = body[0] as CaseStatement;

      // Both IF statements should NOT have elseBranch
      expect(caseStmt.branches.length).toBe(2);
      const if1 = caseStmt.branches[0]?.statements[0] as IfStatement;
      const if2 = caseStmt.branches[1]?.statements[0] as IfStatement;
      expect(if1.elseBranch).toBeNull();
      expect(if2.elseBranch).toBeNull();

      // CASE should have elseBranch
      expect(caseStmt.elseBranch).not.toBeNull();
      expect(caseStmt.elseBranch?.length).toBe(1);
    });

    it('should attribute ELSE to CASE when IF has BEGIN-END with semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State : Integer;
    BEGIN
      CASE State OF
        1: IF Found THEN BEGIN
             Action1;
             Action2;
           END;
        ELSE
          ERROR('Invalid state');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);

      const body = procedures[0]?.body || [];
      expect(body.length).toBe(1);
      expect(body[0]?.type).toBe('CaseStatement');

      const caseStmt = body[0] as CaseStatement;
      // CASE should have 1 branch (value: 1) with IF statement
      expect(caseStmt.branches.length).toBe(1);
      expect(caseStmt.branches[0]?.statements.length).toBe(1);
      expect(caseStmt.branches[0]?.statements[0]?.type).toBe('IfStatement');

      // IF statement should NOT have elseBranch (BEGIN-END terminated by semicolon)
      const ifStmt = caseStmt.branches[0]?.statements[0] as IfStatement;
      expect(ifStmt.elseBranch).toBeNull();

      // IF's thenBranch should be a BlockStatement
      expect(ifStmt.thenBranch.type).toBe('BlockStatement');
      const block = ifStmt.thenBranch as BlockStatement;
      expect(block.statements.length).toBe(2);

      // CASE should have elseBranch (ELSE belongs to CASE, not IF)
      expect(caseStmt.elseBranch).not.toBeNull();
      expect(caseStmt.elseBranch?.length).toBe(1);
      expect(caseStmt.elseBranch?.[0]?.type).toBe('CallStatement');
    });

    it('should attribute ELSE to IF when BEGIN-END has no semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State : Integer;
    BEGIN
      CASE State OF
        1: IF Found THEN BEGIN
             Action1;
             Action2;
           END
           ELSE
             ERROR('Not found');
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors
      expect(errors.length).toBe(0);
      expect(ast).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.length).toBe(1);

      const body = procedures[0]?.body || [];
      expect(body.length).toBe(1);
      expect(body[0]?.type).toBe('CaseStatement');

      const caseStmt = body[0] as CaseStatement;
      // CASE should have 1 branch (value: 1) with IF statement
      expect(caseStmt.branches.length).toBe(1);
      expect(caseStmt.branches[0]?.statements.length).toBe(1);
      expect(caseStmt.branches[0]?.statements[0]?.type).toBe('IfStatement');

      // IF statement SHOULD have elseBranch (no semicolon before ELSE)
      const ifStmt = caseStmt.branches[0]?.statements[0] as IfStatement;
      expect(ifStmt.elseBranch).not.toBeNull();
      expect(ifStmt.elseBranch?.type).toBe('CallStatement');

      // IF's thenBranch should be a BlockStatement
      expect(ifStmt.thenBranch.type).toBe('BlockStatement');
      const block = ifStmt.thenBranch as BlockStatement;
      expect(block.statements.length).toBe(2);

      // CASE should NOT have elseBranch (ELSE belongs to IF)
      expect(caseStmt.elseBranch).toBeNull();
    });
  });

  describe('Nested IF statements', () => {
    it('should resolve dangling ELSE to innermost IF', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF Outer THEN
        IF Inner THEN
          Action1
        ELSE
          Action2;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const outerIf = body[0] as IfStatement;

      // Outer IF should NOT have elseBranch
      expect(outerIf.elseBranch).toBeNull();

      // Inner IF (thenBranch of outer) SHOULD have elseBranch
      const innerIf = outerIf.thenBranch as IfStatement;
      expect(innerIf.type).toBe('IfStatement');
      expect(innerIf.elseBranch).not.toBeNull();
    });

    it('should give ELSE to outer IF when inner has semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF Outer THEN
        IF Inner THEN
          Action1;
        ELSE
          Action2;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const outerIf = body[0] as IfStatement;

      // Inner IF should NOT have elseBranch (terminated by semicolon)
      const innerIf = outerIf.thenBranch as IfStatement;
      expect(innerIf.elseBranch).toBeNull();

      // Outer IF SHOULD have elseBranch
      expect(outerIf.elseBranch).not.toBeNull();
    });

    it('should handle triple-nested IF with ELSE resolution', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF Level1 THEN
        IF Level2 THEN
          IF Level3 THEN
            Action1;
          ELSE
            Action2;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const level1 = body[0] as IfStatement;
      const level2 = level1.thenBranch as IfStatement;
      const level3 = level2.thenBranch as IfStatement;

      // Level 1 and 3 should NOT have elseBranch
      expect(level1.elseBranch).toBeNull();
      expect(level3.elseBranch).toBeNull();

      // Level 2 SHOULD have elseBranch (Level3 terminated by semicolon)
      expect(level2.elseBranch).not.toBeNull();
    });
  });

  describe('WHILE...DO with IF statements', () => {
    it('should NOT attribute ELSE to WHILE when IF has semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10 DO
        IF Found THEN
          i := i + 1;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const whileStmt = body[0] as WhileStatement;

      expect(whileStmt.type).toBe('WhileStatement');
      const ifStmt = whileStmt.body as IfStatement;
      expect(ifStmt.type).toBe('IfStatement');

      // IF should NOT have elseBranch (semicolon terminates it)
      expect(ifStmt.elseBranch).toBeNull();
    });

    it('should allow IF-ELSE inside WHILE when no semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10 DO
        IF Found THEN
          i := i + 1
        ELSE
          i := i + 2;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const whileStmt = body[0] as WhileStatement;
      const ifStmt = whileStmt.body as IfStatement;

      // IF SHOULD have elseBranch (no semicolon before ELSE)
      expect(ifStmt.elseBranch).not.toBeNull();
    });

    it('should handle WHILE with BEGIN-END containing IF-ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10 DO BEGIN
        IF Found THEN
          Action1
        ELSE
          Action2;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const whileStmt = body[0] as WhileStatement;

      expect(whileStmt.body.type).toBe('BlockStatement');
      const block = whileStmt.body as BlockStatement;

      // Block should have 1 statement: the IF-ELSE
      expect(block.statements.length).toBe(1);

      const ifStmt = block.statements[0] as IfStatement;
      expect(ifStmt.elseBranch).not.toBeNull(); // IF should claim ELSE (no semicolon)
    });

    it('should handle nested WHILE with IF-ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
      j : Integer;
    BEGIN
      WHILE i < 10 DO
        WHILE j < 5 DO
          IF Found THEN
            j := j + 1;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const outerWhile = body[0] as WhileStatement;
      const innerWhile = outerWhile.body as WhileStatement;
      const ifStmt = innerWhile.body as IfStatement;

      // IF should NOT have elseBranch
      expect(ifStmt.elseBranch).toBeNull();
    });
  });

  describe('FOR...TO with IF statements', () => {
    it('should NOT attribute ELSE to FOR when IF has semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        IF Found THEN
          DoSomething;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const forStmt = body[0] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');
      expect(forStmt.downto).toBe(false);

      const ifStmt = forStmt.body as IfStatement;
      expect(ifStmt.elseBranch).toBeNull();
    });

    it('should allow IF-ELSE inside FOR when no semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        IF Found THEN
          Action1
        ELSE
          Action2;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const forStmt = body[0] as ForStatement;
      const ifStmt = forStmt.body as IfStatement;

      expect(ifStmt.elseBranch).not.toBeNull();
    });

    it('should handle FOR with BEGIN-END containing IF-ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO BEGIN
        IF i MOD 2 = 0 THEN
          EvenAction
        ELSE
          OddAction;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const forStmt = body[0] as ForStatement;

      expect(forStmt.body.type).toBe('BlockStatement');
      const block = forStmt.body as BlockStatement;

      // Block should have 1 statement: the IF-ELSE
      expect(block.statements.length).toBe(1);

      // IF should claim ELSE (no semicolon)
      const ifStmt = block.statements[0] as IfStatement;
      expect(ifStmt.elseBranch).not.toBeNull();
    });
  });

  describe('FOR...DOWNTO with IF statements', () => {
    it('should NOT attribute ELSE to FOR DOWNTO when IF has semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 10 DOWNTO 1 DO
        IF Found THEN
          DoSomething;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const forStmt = body[0] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');
      expect(forStmt.downto).toBe(true);

      const ifStmt = forStmt.body as IfStatement;
      expect(ifStmt.elseBranch).toBeNull();
    });

    it('should allow IF-ELSE inside FOR DOWNTO when no semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 10 DOWNTO 1 DO
        IF Found THEN
          Action1
        ELSE
          Action2;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const forStmt = body[0] as ForStatement;
      const ifStmt = forStmt.body as IfStatement;

      expect(ifStmt.elseBranch).not.toBeNull();
    });

    it('should handle FOR DOWNTO with BEGIN-END containing IF-ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      FOR i := 10 DOWNTO 1 DO BEGIN
        IF i > 5 THEN
          HighAction
        ELSE
          LowAction;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const forStmt = body[0] as ForStatement;

      expect(forStmt.body.type).toBe('BlockStatement');
      const block = forStmt.body as BlockStatement;

      // Block should have 1 statement: the IF-ELSE
      expect(block.statements.length).toBe(1);

      const ifStmt = block.statements[0] as IfStatement;
      expect(ifStmt.elseBranch).not.toBeNull(); // IF should claim ELSE (no semicolon)
    });
  });

  describe('WITH...DO with IF statements', () => {
    it('should NOT attribute ELSE to WITH when IF has semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Customer : Record 18;
    BEGIN
      WITH Customer DO
        IF FIND('-') THEN
          MODIFY;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const withStmt = body[0] as WithStatement;

      expect(withStmt.type).toBe('WithStatement');
      const ifStmt = withStmt.body as IfStatement;
      expect(ifStmt.elseBranch).toBeNull();
    });

    it('should allow IF-ELSE inside WITH when no semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Customer : Record 18;
    BEGIN
      WITH Customer DO
        IF FIND('-') THEN
          MODIFY
        ELSE
          INSERT;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const withStmt = body[0] as WithStatement;
      const ifStmt = withStmt.body as IfStatement;

      expect(ifStmt.elseBranch).not.toBeNull();
    });

    it('should handle WITH with BEGIN-END containing IF-ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Customer : Record 18;
    BEGIN
      WITH Customer DO BEGIN
        IF FIND('-') THEN
          MODIFY
        ELSE
          INSERT;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const withStmt = body[0] as WithStatement;

      expect(withStmt.body.type).toBe('BlockStatement');
      const block = withStmt.body as BlockStatement;

      // Block should have 1 statement: the IF-ELSE
      expect(block.statements.length).toBe(1);

      const ifStmt = block.statements[0] as IfStatement;
      expect(ifStmt.elseBranch).not.toBeNull(); // IF should claim ELSE (no semicolon)
    });

    it('should handle nested WITH with IF-ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Customer : Record 18;
      SalesHeader : Record 36;
    BEGIN
      WITH Customer DO
        WITH SalesHeader DO
          IF FIND('-') THEN
            MODIFY;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const outerWith = body[0] as WithStatement;
      const innerWith = outerWith.body as WithStatement;
      const ifStmt = innerWith.body as IfStatement;

      expect(ifStmt.elseBranch).toBeNull();
    });
  });

  describe('Complex nesting scenarios', () => {
    it('should handle IF inside WHILE inside CASE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State : Integer;
      i : Integer;
    BEGIN
      CASE State OF
        1: WHILE i < 10 DO
             IF Found THEN
               i := i + 1;
        ELSE
          DefaultAction;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const caseStmt = body[0] as CaseStatement;

      // IF should NOT have elseBranch
      const whileStmt = caseStmt.branches[0]?.statements[0] as WhileStatement;
      const ifStmt = whileStmt.body as IfStatement;
      expect(ifStmt.elseBranch).toBeNull();

      // CASE should have elseBranch
      expect(caseStmt.elseBranch).not.toBeNull();
    });

    it('should handle IF inside FOR inside CASE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State : Integer;
      i : Integer;
    BEGIN
      CASE State OF
        1: FOR i := 1 TO 10 DO
             IF Found THEN
               DoSomething;
        ELSE
          DefaultAction;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const caseStmt = body[0] as CaseStatement;

      const forStmt = caseStmt.branches[0]?.statements[0] as ForStatement;
      const ifStmt = forStmt.body as IfStatement;
      expect(ifStmt.elseBranch).toBeNull();

      expect(caseStmt.elseBranch).not.toBeNull();
    });

    it('should handle IF inside WITH inside CASE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State : Integer;
      Customer : Record 18;
    BEGIN
      CASE State OF
        1: WITH Customer DO
             IF FIND('-') THEN
               MODIFY;
        ELSE
          DefaultAction;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const caseStmt = body[0] as CaseStatement;

      const withStmt = caseStmt.branches[0]?.statements[0] as WithStatement;
      const ifStmt = withStmt.body as IfStatement;
      expect(ifStmt.elseBranch).toBeNull();

      expect(caseStmt.elseBranch).not.toBeNull();
    });

    it('should handle deeply nested IF-CASE-WHILE-FOR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State : Integer;
      i : Integer;
      j : Integer;
    BEGIN
      IF OuterCondition THEN
        CASE State OF
          1: WHILE i < 10 DO
               FOR j := 1 TO 5 DO
                 IF Found THEN
                   Action;
        END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const outerIf = body[0] as IfStatement;
      const caseStmt = outerIf.thenBranch as CaseStatement;
      const whileStmt = caseStmt.branches[0]?.statements[0] as WhileStatement;
      const forStmt = whileStmt.body as ForStatement;
      const innerIf = forStmt.body as IfStatement;

      // Inner IF should NOT have elseBranch (semicolon terminates)
      expect(innerIf.elseBranch).toBeNull();
      // CASE should NOT have elseBranch (no ELSE clause)
      expect(caseStmt.elseBranch).toBeNull();
      // Outer IF should NOT have elseBranch (no ELSE clause)
      expect(outerIf.elseBranch).toBeNull();
    });

    it('should handle CASE-IF-CASE-IF nesting', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      State1 : Integer;
      State2 : Integer;
    BEGIN
      CASE State1 OF
        1: IF Cond1 THEN
             CASE State2 OF
               10: IF Cond2 THEN
                     Action;
               ELSE
                 InnerCaseElse;
             END;
        ELSE
          OuterCaseElse;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const outerCase = body[0] as CaseStatement;
      const outerIf = outerCase.branches[0]?.statements[0] as IfStatement;
      const innerCase = outerIf.thenBranch as CaseStatement;
      const innerIf = innerCase.branches[0]?.statements[0] as IfStatement;

      // Inner IF should NOT have elseBranch (semicolon terminates)
      expect(innerIf.elseBranch).toBeNull();

      // Inner CASE should have elseBranch
      expect(innerCase.elseBranch).not.toBeNull();

      // Outer IF should NOT have elseBranch (semicolon after END terminates)
      expect(outerIf.elseBranch).toBeNull();

      // Outer CASE should have elseBranch
      expect(outerCase.elseBranch).not.toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should reject orphaned ELSE when IF has semicolon-terminated loop', () => {
      // When IF's then-branch (WHILE) is terminated by semicolon, IF cannot claim ELSE.
      // With no outer construct (CASE/outer IF) to claim it, ELSE is orphaned = syntax error.
      // Per investigation of #310: zero occurrences of orphaned ELSE found in 7,677 real NAV files.
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      IF Condition THEN
        WHILE i < 10 DO
          i := i + 1;
      ELSE
        Action;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // ELSE is orphaned - should be rejected by INVALID_EXPRESSION_STARTERS guard
      expect(errors.length).toBeGreaterThan(0);
      const hasElseError = errors.some(e =>
        e.message.includes('ELSE') ||
        e.message.includes('cannot start an expression')
      );
      expect(hasElseError).toBe(true);
    });

    it('should handle sequential IF statements', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF Cond1 THEN
        Action1;
      IF Cond2 THEN
        Action2
      ELSE
        Action3;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];

      // First IF terminated by semicolon, no elseBranch
      const if1 = body[0] as IfStatement;
      expect(if1.elseBranch).toBeNull();

      // Second IF gets the ELSE
      const if2 = body[1] as IfStatement;
      expect(if2.elseBranch).not.toBeNull();
    });

    it('should handle REPEAT-UNTIL with IF-ELSE', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      i : Integer;
    BEGIN
      REPEAT
        IF Found THEN
          i := i + 1;
      UNTIL i > 10;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBe(0);

      const procedures = ast.object?.code?.procedures || [];
      const body = procedures[0]?.body || [];
      const repeatStmt = body[0];

      expect(repeatStmt?.type).toBe('RepeatStatement');

      // IF inside REPEAT should NOT have elseBranch
      const ifStmt = (repeatStmt as any).body[0] as IfStatement;
      expect(ifStmt.elseBranch).toBeNull();
    });
  });
});
