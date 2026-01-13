/**
 * Parser Tests - FOR Loop with Member Expression Variables
 *
 * Tests for parsing FOR loops with record field references (MemberExpression)
 * as loop variables, e.g., FOR Rec.Field := 1 TO 10 DO
 *
 * IMPLEMENTATION STATUS:
 * - Tests 1-6: MemberExpression support is complete and working
 * - Test 7: Regression - simple Identifier still works
 * - Tests 8-10: Invalid syntax correctly produces parse errors
 * - Error recovery validates parser stability
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ForStatement, MemberExpression, Identifier } from '../ast';

describe('Parser - FOR Loop with MemberExpression Variables', () => {
  describe('Basic MemberExpression in FOR loops', () => {
    it('should parse simple MemberExpression as FOR variable', () => {
      // Test Case 1: Simple MemberExpression
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      Customer : Record 18;
    BEGIN
      FOR Customer.Counter := 1 TO 10 DO
        MESSAGE('Loop iteration');
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
      const forStmt = procedure.body[0] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');

      // CRITICAL: Variable should be MemberExpression, not Identifier
      const variable = forStmt.variable as any;
      expect(variable.type).toBe('MemberExpression');

      const memberExpr = variable as MemberExpression;
      expect(memberExpr.object.type).toBe('Identifier');
      expect((memberExpr.object as Identifier).name).toBe('Customer');
      expect(memberExpr.property.name).toBe('Counter');

      // Verify from/to expressions
      expect(forStmt.from.type).toBe('Literal');
      expect(forStmt.to.type).toBe('Literal');
      expect(forStmt.downto).toBe(false);

      // Verify body
      expect(forStmt.body.type).toBe('CallStatement');
    });

    it('should parse quoted identifier in member expression', () => {
      // Test Case 2: Quoted identifier in member
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      Rec : Record 18;
    BEGIN
      FOR Rec."No." := 1 TO 10 DO
        Counter := Counter + 1;
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
      const forStmt = procedure.body[0] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');

      const variable = forStmt.variable as any;
      expect(variable.type).toBe('MemberExpression');

      const memberExpr = variable as MemberExpression;
      expect(memberExpr.object.type).toBe('Identifier');
      expect((memberExpr.object as Identifier).name).toBe('Rec');
      expect(memberExpr.property.name).toBe('No.');
      expect(memberExpr.property.isQuoted).toBe(true);
    });

    it('should parse DOWNTO variant with MemberExpression', () => {
      // Test Case 3: DOWNTO variant
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      Rec : Record 18;
    BEGIN
      FOR Rec.Field := 10 DOWNTO 1 DO
        ProcessItem(Rec.Field);
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
      const forStmt = procedure.body[0] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');
      expect(forStmt.downto).toBe(true);

      const variable = forStmt.variable as any;
      expect(variable.type).toBe('MemberExpression');

      const memberExpr = variable as MemberExpression;
      expect(memberExpr.object.type).toBe('Identifier');
      expect((memberExpr.object as Identifier).name).toBe('Rec');
      expect(memberExpr.property.name).toBe('Field');
    });
  });

  describe('Nested loops with MemberExpression', () => {
    it('should parse nested loops where both use MemberExpression', () => {
      // Test Case 4: Nested loops with member variables
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      Outer : Record 18;
      Inner : Record 27;
    BEGIN
      FOR Outer.i := 1 TO 5 DO
        FOR Inner.j := 1 TO 10 DO
          Total := Outer.i * Inner.j;
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
      const outerFor = procedure.body[0] as ForStatement;
      const innerFor = outerFor.body as ForStatement;

      expect(outerFor.type).toBe('ForStatement');
      expect(innerFor.type).toBe('ForStatement');

      // Verify outer loop uses MemberExpression
      const outerVar = outerFor.variable as any;
      expect(outerVar.type).toBe('MemberExpression');
      expect((outerVar.object as Identifier).name).toBe('Outer');
      expect(outerVar.property.name).toBe('i');

      // Verify inner loop uses MemberExpression
      const innerVar = innerFor.variable as any;
      expect(innerVar.type).toBe('MemberExpression');
      expect((innerVar.object as Identifier).name).toBe('Inner');
      expect(innerVar.property.name).toBe('j');
    });

    it('should parse mixed loop variables - outer Identifier, inner MemberExpression', () => {
      // Test Case 5: Mixed loop variables
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      i : Integer;
      Rec : Record 18;
    BEGIN
      FOR i := 1 TO 5 DO
        FOR Rec.Counter := 1 TO 10 DO
          Process(i, Rec.Counter);
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
      const outerFor = procedure.body[0] as ForStatement;
      const innerFor = outerFor.body as ForStatement;

      // Outer loop: simple Identifier
      expect(outerFor.type).toBe('ForStatement');
      const outerVar = outerFor.variable as any;
      expect(outerVar.type).toBe('Identifier');
      expect(outerVar.name).toBe('i');

      // Inner loop: MemberExpression
      expect(innerFor.type).toBe('ForStatement');
      const innerVar = innerFor.variable as any;
      expect(innerVar.type).toBe('MemberExpression');
      expect((innerVar.object as Identifier).name).toBe('Rec');
      expect(innerVar.property.name).toBe('Counter');
    });
  });

  describe('Real-world pattern - Option field iteration', () => {
    it('should parse option field pattern from NAV codebase', () => {
      // Test Case 6: Option field pattern (real-world)
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE CreateTemplates();
    VAR
      GenJnlTemplate : Record 80;
    BEGIN
      FOR GenJnlTemplate.Type := GenJnlTemplate.Type::General TO GenJnlTemplate.Type::Jobs DO BEGIN
        GenJnlTemplate.INIT;
        GenJnlTemplate.Name := FORMAT(GenJnlTemplate.Type);
        GenJnlTemplate.INSERT;
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
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');

      // Verify variable is MemberExpression
      const variable = forStmt.variable as any;
      expect(variable.type).toBe('MemberExpression');
      expect((variable.object as Identifier).name).toBe('GenJnlTemplate');
      expect(variable.property.name).toBe('Type');

      // Verify from/to are complex member expressions (option values)
      expect(forStmt.from.type).toBe('MemberExpression');
      expect(forStmt.to.type).toBe('MemberExpression');

      // Verify body is a block
      expect(forStmt.body.type).toBe('BlockStatement');
    });
  });

  describe('Regression - simple identifier still works', () => {
    it('should parse traditional FOR loop with simple identifier', () => {
      // Test Case 7: Regression - existing behavior must not break
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      i : Integer;
    BEGIN
      FOR i := 1 TO 10 DO
        Counter := Counter + 1;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse without errors (existing functionality)
      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');

      // Variable should be simple Identifier
      const variable = forStmt.variable as any;
      expect(variable.type).toBe('Identifier');
      expect(variable.name).toBe('i');

      expect(forStmt.from.type).toBe('Literal');
      expect(forStmt.to.type).toBe('Literal');
    });
  });

  describe('Error cases - invalid FOR variable expressions', () => {
    it('should produce error for CallExpression as FOR variable', () => {
      // Test Case 8: Invalid - CallExpression
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    BEGIN
      FOR GetRecord().Field := 1 TO 10 DO
        ProcessItem;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // Should report error - CallExpression is not a valid lvalue
      expect(errors.length).toBeGreaterThan(0);

      const forError = errors.find(e =>
        e.message.includes('Expected') ||
        e.message.includes('variable') ||
        e.message.includes(':=')
      );
      expect(forError).toBeDefined();
    });

    it('should produce error for array access as FOR variable', () => {
      // Test Case 9a: Invalid - ArrayAccessExpression
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      arr : ARRAY[10] OF Integer;
    BEGIN
      FOR arr[1] := 1 TO 10 DO
        ProcessItem;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // Should report error - array indexing is not a valid lvalue in FOR
      expect(errors.length).toBeGreaterThan(0);

      const forError = errors.find(e =>
        e.message.includes('Expected') ||
        e.message.includes('variable') ||
        e.message.includes(':=')
      );
      expect(forError).toBeDefined();
    });

    it('should produce error for literal as FOR variable', () => {
      // Test Case 9: Invalid - Literal
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    BEGIN
      FOR 1 := 1 TO 10 DO
        ProcessItem;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // Should report error - literal is not a valid lvalue
      expect(errors.length).toBeGreaterThan(0);

      // Parser should detect invalid syntax near FOR or :=
      const forError = errors.find(e =>
        e.message.includes('Expected') ||
        e.message.includes('variable') ||
        e.message.toLowerCase().includes('identifier')
      );
      expect(forError).toBeDefined();
    });
  });

  describe('Error recovery', () => {
    it('should recover from invalid FOR variable and continue parsing', () => {
      // Test Case 10: Error recovery
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      i : Integer;
    BEGIN
      FOR 123 := 1 TO 10 DO
        Counter := 1;

      // Parser should recover and parse this statement
      i := 42;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should have errors for invalid FOR
      expect(errors.length).toBeGreaterThan(0);

      // But should still parse the procedure and recover
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      expect(procedure).toBeDefined();
      expect(procedure.name).toBe('TestFor');

      // Should have parsed statements after error (error recovery)
      // Note: The exact structure depends on error recovery implementation
      expect(procedure.body.length).toBeGreaterThan(0);
    });
  });

  describe('Complex MemberExpression patterns', () => {
    it('should parse FOR loop with MemberExpression in BEGIN-END block', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      Config : Record 50000;
    BEGIN
      FOR Config.Status := 1 TO 5 DO BEGIN
        Config.VALIDATE(Status);
        Config.MODIFY;
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
      expect(ast.object).toBeDefined();

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');

      const variable = forStmt.variable as any;
      expect(variable.type).toBe('MemberExpression');
      expect((variable.object as Identifier).name).toBe('Config');
      expect(variable.property.name).toBe('Status');

      expect(forStmt.body.type).toBe('BlockStatement');
    });

    it('should parse FOR loop with quoted object and property', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      "My Record" : Record 50000;
    BEGIN
      FOR "My Record"."Field Value" := 1 TO 10 DO
        ProcessField("My Record"."Field Value");
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
      const forStmt = procedure.body[0] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');

      const variable = forStmt.variable as any;
      expect(variable.type).toBe('MemberExpression');

      const memberExpr = variable as MemberExpression;
      expect((memberExpr.object as Identifier).name).toBe('My Record');
      expect((memberExpr.object as Identifier).isQuoted).toBe(true);
      expect(memberExpr.property.name).toBe('Field Value');
      expect(memberExpr.property.isQuoted).toBe(true);
    });

    it('should parse FOR loop with complex from/to expressions', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      Item : Record 27;
      MinQty : Integer;
      MaxQty : Integer;
    BEGIN
      MinQty := 1;
      MaxQty := 100;
      FOR Item.Quantity := MinQty + 10 TO MaxQty - 5 DO
        Item.MODIFY;
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
      const forStmt = procedure.body[2] as ForStatement;

      expect(forStmt.type).toBe('ForStatement');

      const variable = forStmt.variable as any;
      expect(variable.type).toBe('MemberExpression');
      expect((variable.object as Identifier).name).toBe('Item');
      expect(variable.property.name).toBe('Quantity');

      // Verify from/to are binary expressions
      expect(forStmt.from.type).toBe('BinaryExpression');
      expect(forStmt.to.type).toBe('BinaryExpression');
    });
  });

  describe('AST structure validation', () => {
    it('should have correct token references in FOR with MemberExpression', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFor();
    VAR
      Rec : Record 18;
    BEGIN
      FOR Rec.Field := 1 TO 10 DO
        Counter := 1;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const procedure = ast.object!.code!.procedures[0];
      const forStmt = procedure.body[0] as ForStatement;

      // Verify token references
      expect(forStmt.startToken).toBeDefined();
      expect(forStmt.startToken.type).toBe('FOR');
      expect(forStmt.endToken).toBeDefined();

      // Verify MemberExpression has correct structure
      const variable = forStmt.variable as any;
      expect(variable.type).toBe('MemberExpression');
      expect(variable.startToken).toBeDefined();
      expect(variable.endToken).toBeDefined();
    });
  });
});
