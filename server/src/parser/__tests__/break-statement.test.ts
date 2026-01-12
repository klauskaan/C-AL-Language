/**
 * Parser Tests - BREAK Statement
 *
 * Tests for BREAK statement parsing. These tests MUST FAIL initially because
 * BreakStatement AST node type hasn't been implemented yet.
 *
 * BREAK is a simple control flow statement that exits loops:
 * - Syntax: BREAK; (no arguments, unlike EXIT which can take a return value)
 * - Valid in: FOR, WHILE, REPEAT-UNTIL, FOREACH loops
 * - Different from CurrReport.BREAK (which is a method call)
 *
 * TDD EXPECTATION:
 * - All tests SHOULD FAIL initially
 * - Tests will pass after BreakStatement is implemented in ast.ts and parser.ts
 * - If tests pass immediately, it indicates a problem with test design or
 *   that BREAK support already exists (unlikely based on investigation)
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - BREAK Statement', () => {
  describe('Basic BREAK statement parsing', () => {
    it('should parse standalone BREAK statement', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO BEGIN
        IF i = 5 THEN
          BREAK;
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
      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.name).toBe('TestBreak');

      // Navigate to the BREAK statement: FOR -> BlockStatement -> IF -> BREAK
      const forStmt = procedure.body[0] as any;
      expect(forStmt.type).toBe('ForStatement');

      const blockStmt = forStmt.body;
      expect(blockStmt.type).toBe('BlockStatement');

      const ifStmt = blockStmt.statements[0];
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch;
      expect(breakStmt.type).toBe('BreakStatement');
      expect(breakStmt.startToken).toBeDefined();
      expect(breakStmt.endToken).toBeDefined();
      // Critical: BREAK has NO value field (unlike EXIT)
      expect(breakStmt.value).toBeUndefined();
    });

    it('should parse BREAK with semicolon', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10 DO
        BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[0] as any;
      expect(whileStmt.type).toBe('WhileStatement');

      const breakStmt = whileStmt.body;
      expect(breakStmt.type).toBe('BreakStatement');
      expect(breakStmt.startToken.type).toBe('BREAK');
      expect(breakStmt.value).toBeUndefined();
    });
  });

  describe('BREAK in different loop types', () => {
    it('should parse BREAK in FOR loop', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 100 DO
        IF i > 50 THEN
          BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as any;
      expect(forStmt.type).toBe('ForStatement');

      const ifStmt = forStmt.body;
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch;
      expect(breakStmt.type).toBe('BreakStatement');
    });

    it('should parse BREAK in WHILE loop', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      Counter : Integer;
    BEGIN
      Counter := 0;
      WHILE TRUE DO BEGIN
        Counter := Counter + 1;
        IF Counter >= 100 THEN
          BREAK;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[1] as any;
      expect(whileStmt.type).toBe('WhileStatement');

      const blockStmt = whileStmt.body;
      expect(blockStmt.type).toBe('BlockStatement');

      const ifStmt = blockStmt.statements[1];
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch;
      expect(breakStmt.type).toBe('BreakStatement');
    });

    it('should parse BREAK in REPEAT-UNTIL loop', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      Found : Boolean;
      Customer : Record 18;
    BEGIN
      Customer.RESET;
      IF Customer.FIND('-') THEN
        REPEAT
          IF Customer."No." = '1000' THEN BEGIN
            Found := TRUE;
            BREAK;
          END;
        UNTIL (Customer.NEXT = 0) OR Found;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const ifStmt = procedure.body[1] as any;
      expect(ifStmt.type).toBe('IfStatement');

      const repeatStmt = ifStmt.thenBranch;
      expect(repeatStmt.type).toBe('RepeatStatement');

      const innerIfStmt = repeatStmt.body[0];
      expect(innerIfStmt.type).toBe('IfStatement');

      const blockStmt = innerIfStmt.thenBranch;
      expect(blockStmt.type).toBe('BlockStatement');

      const breakStmt = blockStmt.statements[1];
      expect(breakStmt.type).toBe('BreakStatement');
    });

    it('should parse BREAK in FOR DOWNTO loop', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
    BEGIN
      FOR i := 100 DOWNTO 1 DO
        IF i < 10 THEN
          BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as any;
      expect(forStmt.type).toBe('ForStatement');

      const ifStmt = forStmt.body;
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch;
      expect(breakStmt.type).toBe('BreakStatement');
    });
  });

  describe('BREAK in IF-THEN-ELSE contexts', () => {
    it('should parse BREAK in IF-THEN branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        IF i = 5 THEN
          BREAK
        ELSE
          MESSAGE('Continue');
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as any;
      const ifStmt = forStmt.body;
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch;
      expect(breakStmt.type).toBe('BreakStatement');

      const elseStmt = ifStmt.elseBranch;
      expect(elseStmt).toBeDefined();
      expect(elseStmt.type).toBe('CallStatement');
    });

    it('should parse BREAK in IF-ELSE branch', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
    BEGIN
      WHILE TRUE DO
        IF i < 5 THEN
          i := i + 1
        ELSE
          BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[0] as any;
      const ifStmt = whileStmt.body;
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.elseBranch;
      expect(breakStmt.type).toBe('BreakStatement');
    });

    it('should parse BREAK in empty control flow pattern', () => {
      // Edge case from adversarial review: IF TRUE THEN BREAK; ELSE;
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
    BEGIN
      WHILE i < 10 DO
        IF TRUE THEN
          BREAK;
        ELSE;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[0] as any;
      const ifStmt = whileStmt.body;
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch;
      expect(breakStmt.type).toBe('BreakStatement');

      const elseStmt = ifStmt.elseBranch;
      expect(elseStmt.type).toBe('EmptyStatement');
    });
  });

  describe('BREAK in BEGIN-END blocks', () => {
    it('should parse BREAK inside BEGIN-END block in loop', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
      Total : Integer;
    BEGIN
      FOR i := 1 TO 100 DO BEGIN
        Total := Total + i;
        IF Total > 500 THEN
          BREAK;
        MESSAGE('Total: %1', Total);
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as any;
      const blockStmt = forStmt.body;
      expect(blockStmt.type).toBe('BlockStatement');
      expect(blockStmt.statements).toHaveLength(3);

      const ifStmt = blockStmt.statements[1];
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch;
      expect(breakStmt.type).toBe('BreakStatement');
    });

    it('should parse multiple BREAK statements in nested BEGIN-END blocks', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
    BEGIN
      WHILE TRUE DO BEGIN
        IF i = 1 THEN BEGIN
          BREAK;
        END;
        IF i = 2 THEN BEGIN
          BREAK;
        END;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[0] as any;
      const blockStmt = whileStmt.body;
      expect(blockStmt.type).toBe('BlockStatement');

      const firstIfStmt = blockStmt.statements[0];
      const firstBreak = firstIfStmt.thenBranch.statements[0];
      expect(firstBreak.type).toBe('BreakStatement');

      const secondIfStmt = blockStmt.statements[1];
      const secondBreak = secondIfStmt.thenBranch.statements[0];
      expect(secondBreak.type).toBe('BreakStatement');
    });
  });

  describe('BREAK vs CurrReport.BREAK distinction', () => {
    it('should parse BREAK as BreakStatement', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    BEGIN
      WHILE TRUE DO
        BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[0] as any;
      const breakStmt = whileStmt.body;

      // CRITICAL: Standalone BREAK should parse as BreakStatement
      expect(breakStmt.type).toBe('BreakStatement');
      expect(breakStmt.value).toBeUndefined();
    });

    it('should parse CurrReport.BREAK as CallStatement', () => {
      const code = `OBJECT Report 50000 TestReport
{
  PROPERTIES
  {
  }
  DATASET
  {
  }
  CODE
  {
    PROCEDURE TestBreak();
    BEGIN
      CurrReport.BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const stmt = procedure.body[0];

      // CRITICAL: CurrReport.BREAK should parse as CallStatement (method call)
      expect(stmt.type).toBe('CallStatement');
      // CurrReport.BREAK is a member expression call, not a BreakStatement
      const callStmt = stmt as any;
      expect(callStmt.expression).toBeDefined();
      expect(callStmt.expression.type).toBe('MemberExpression');
    });

    it('should distinguish BREAK in loops from CurrReport.BREAK in reports', () => {
      const code = `OBJECT Report 50000 TestReport
{
  PROPERTIES
  {
  }
  DATASET
  {
  }
  CODE
  {
    PROCEDURE ProcessData();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO BEGIN
        IF i = 5 THEN
          BREAK;  // Loop BREAK
        IF i = 7 THEN
          CurrReport.BREAK;  // Report BREAK (method call)
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as any;
      const blockStmt = forStmt.body;

      const firstIfStmt = blockStmt.statements[0];
      const loopBreak = firstIfStmt.thenBranch;
      expect(loopBreak.type).toBe('BreakStatement');

      const secondIfStmt = blockStmt.statements[1];
      const reportBreak = secondIfStmt.thenBranch;
      expect(reportBreak.type).toBe('CallStatement');
    });
  });

  describe('BREAK with quoted identifier edge case', () => {
    it('should parse quoted "BREAK" as identifier, not BreakStatement', () => {
      // "BREAK" as a quoted identifier (unlikely but valid C/AL)
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      "BREAK" : Integer;
    BEGIN
      "BREAK" := 42;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      // Verify the variable declaration
      expect(procedure.variables).toHaveLength(1);
      expect(procedure.variables[0].name).toBe('BREAK');

      // Assignment should parse correctly
      const assignStmt = procedure.body[0];
      expect(assignStmt.type).toBe('AssignmentStatement');
    });
  });

  describe('Nested loops with BREAK', () => {
    it('should parse BREAK in nested FOR loops', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
      j : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        FOR j := 1 TO 10 DO
          IF i * j > 50 THEN
            BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const outerFor = procedure.body[0] as any;
      expect(outerFor.type).toBe('ForStatement');

      const innerFor = outerFor.body;
      expect(innerFor.type).toBe('ForStatement');

      const ifStmt = innerFor.body;
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch;
      expect(breakStmt.type).toBe('BreakStatement');
    });

    it('should parse BREAK in nested WHILE and FOR loops', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
      Continue : Boolean;
    BEGIN
      Continue := TRUE;
      WHILE Continue DO BEGIN
        FOR i := 1 TO 100 DO BEGIN
          IF i = 50 THEN
            BREAK;
        END;
        Continue := FALSE;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[1] as any;
      const whileBlock = whileStmt.body;
      const forStmt = whileBlock.statements[0];
      const forBlock = forStmt.body;
      const ifStmt = forBlock.statements[0];
      const breakStmt = ifStmt.thenBranch;

      expect(breakStmt.type).toBe('BreakStatement');
    });

    it('should parse BREAK in deeply nested loop structures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    VAR
      i : Integer;
      j : Integer;
      k : Integer;
    BEGIN
      FOR i := 1 TO 5 DO
        WHILE j < 10 DO
          FOR k := 1 TO 3 DO
            IF k = 2 THEN
              BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      // Navigate through nested structure
      const procedure = ast.object!.code!.procedures[0];
      let currentStmt: any = procedure.body[0];

      // FOR i
      expect(currentStmt.type).toBe('ForStatement');
      currentStmt = currentStmt.body;

      // WHILE j
      expect(currentStmt.type).toBe('WhileStatement');
      currentStmt = currentStmt.body;

      // FOR k
      expect(currentStmt.type).toBe('ForStatement');
      currentStmt = currentStmt.body;

      // IF k = 2
      expect(currentStmt.type).toBe('IfStatement');
      currentStmt = currentStmt.thenBranch;

      // BREAK
      expect(currentStmt.type).toBe('BreakStatement');
    });
  });

  describe('Real-world BREAK patterns', () => {
    it('should parse BREAK in record iteration pattern (FIND-REPEAT)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FindCustomer(CustomerNo : Code[20]) : Boolean;
    VAR
      Customer : Record 18;
      Found : Boolean;
    BEGIN
      Found := FALSE;
      Customer.RESET;
      IF Customer.FIND('-') THEN
        REPEAT
          IF Customer."No." = CustomerNo THEN BEGIN
            Found := TRUE;
            BREAK;
          END;
        UNTIL Customer.NEXT = 0;
      EXIT(Found);
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      expect(procedure.name).toBe('FindCustomer');

      // Navigate to BREAK: IF -> REPEAT -> IF -> BEGIN-END -> BREAK
      const outerIfStmt = procedure.body[2] as any;
      const repeatStmt = outerIfStmt.thenBranch;
      const innerIfStmt = repeatStmt.body[0];
      const blockStmt = innerIfStmt.thenBranch;
      const breakStmt = blockStmt.statements[1];

      expect(breakStmt.type).toBe('BreakStatement');
    });

    it('should parse BREAK with condition checking in WHILE loop', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE ProcessUntilCondition();
    VAR
      Counter : Integer;
      MaxIterations : Integer;
    BEGIN
      Counter := 0;
      MaxIterations := 1000;
      WHILE TRUE DO BEGIN
        Counter := Counter + 1;
        IF Counter >= MaxIterations THEN
          BREAK;
        // Process data
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[2] as any;
      const blockStmt = whileStmt.body;
      const ifStmt = blockStmt.statements[1];
      const breakStmt = ifStmt.thenBranch;

      expect(breakStmt.type).toBe('BreakStatement');
    });

    it('should parse BREAK with early termination pattern', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE SearchArray();
    VAR
      Values : ARRAY[100] OF Integer;
      i : Integer;
      TargetValue : Integer;
    BEGIN
      TargetValue := 42;
      FOR i := 1 TO 100 DO BEGIN
        IF Values[i] = TargetValue THEN BEGIN
          MESSAGE('Found at position %1', i);
          BREAK;
        END;
      END;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(errors).toHaveLength(0);

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[1] as any;
      const blockStmt = forStmt.body;
      const ifStmt = blockStmt.statements[0];
      const innerBlock = ifStmt.thenBranch;
      const breakStmt = innerBlock.statements[1];

      expect(breakStmt.type).toBe('BreakStatement');
    });
  });

  describe('AST structure validation', () => {
    it('should have correct token references in BreakStatement', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    BEGIN
      WHILE TRUE DO
        BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[0] as any;
      const breakStmt = whileStmt.body;

      expect(breakStmt.type).toBe('BreakStatement');
      expect(breakStmt.startToken).toBeDefined();
      expect(breakStmt.startToken.type).toBe('BREAK');
      expect(breakStmt.startToken.value).toBe('BREAK');
      expect(breakStmt.endToken).toBeDefined();
    });

    it('should NOT have value field in BreakStatement (unlike ExitStatement)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    BEGIN
      FOR i := 1 TO 10 DO
        BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as any;
      const breakStmt = forStmt.body;

      expect(breakStmt.type).toBe('BreakStatement');
      // CRITICAL: BREAK never has a value (unlike EXIT which can have EXIT(value))
      expect(breakStmt.value).toBeUndefined();
      expect(breakStmt.hasOwnProperty('value')).toBe(false);
    });

    it('should parse BreakStatement as a valid Statement', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestBreak();
    BEGIN
      WHILE TRUE DO
        BREAK;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const procedure = ast.object!.code!.procedures[0];
      const whileStmt = procedure.body[0] as any;
      const breakStmt = whileStmt.body;

      // BreakStatement should extend Statement interface
      expect(breakStmt.type).toBe('BreakStatement');
      expect(breakStmt.startToken).toBeDefined();
      expect(breakStmt.endToken).toBeDefined();
      // These are the only required fields for Statement interface
    });
  });
});
