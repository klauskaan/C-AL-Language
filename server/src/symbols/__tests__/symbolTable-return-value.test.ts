/**
 * SymbolTable Tests - Named Return Values
 *
 * Tests for symbol table handling of named return values.
 * Named return values should:
 * - Be automatically registered as variables in procedure scope
 * - Resolve to the correct type (the return type)
 * - NOT leak to parent scope
 * - Be accessible within the procedure body
 *
 * Issue #572: Tests verify that the symbol table correctly handles
 * the implicit variable declaration created by named return values.
 *
 * These tests SHOULD FAIL before implementation (validating the diagnosis).
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../symbolTable';
import { CALDocument } from '../../parser/ast';

/**
 * Helper to lex and parse C/AL code into an AST
 */
function parseCode(code: string): CALDocument {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Helper to parse code and build a symbol table from it
 */
function buildSymbolTable(code: string): SymbolTable {
  const ast = parseCode(code);
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);
  return symbolTable;
}

describe('SymbolTable - Named Return Values', () => {
  describe('Return value registration', () => {
    it('should register return value as symbol in procedure scope', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetValue() Result : Integer;
    BEGIN
      Result := 42;
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      // The return value 'Result' should be registered in the procedure's scope
      const procedureScope = symbolTable.getRootScope().children[0];
      expect(procedureScope).toBeDefined();

      const resultSymbol = procedureScope.getOwnSymbol('result'); // case-insensitive
      expect(resultSymbol).toBeDefined();
      expect(resultSymbol!.name).toBe('Result');
      expect(resultSymbol!.kind).toBe('variable');
      expect(resultSymbol!.type).toBe('Integer');
    });

    it('should register return value with correct type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetName() CustomerName : Text[50];
    BEGIN
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];
      const returnSymbol = procedureScope.getOwnSymbol('customername');

      expect(returnSymbol).toBeDefined();
      expect(returnSymbol!.type).toBe('Text[50]');
    });

    it('should register return value for Record type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetCustomer() Cust : Record 18;
    BEGIN
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];
      const returnSymbol = procedureScope.getOwnSymbol('cust');

      expect(returnSymbol).toBeDefined();
      expect(returnSymbol!.type).toBe('Record 18');
    });

    it('should register return value for array type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetValues() Values : ARRAY [10] OF Integer;
    BEGIN
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];
      const returnSymbol = procedureScope.getOwnSymbol('values');

      expect(returnSymbol).toBeDefined();
      // Type representation may vary; key point is it's registered
      expect(returnSymbol!.type).toBeDefined();
    });
  });

  describe('Return value scope isolation', () => {
    it('should not leak return value to parent scope', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetValue() Result : Integer;
    BEGIN
      Result := 42;
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      // 'Result' should NOT be in global scope
      const globalSymbol = symbolTable.getRootScope().getOwnSymbol('result');
      expect(globalSymbol).toBeUndefined();
    });

    it('should not leak return value to sibling procedure scope', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE First() Result : Integer;
    BEGIN
      Result := 1;
    END;

    PROCEDURE Second();
    BEGIN
      // Result should not be accessible here
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      // Result should only be in First's scope, not Second's
      const firstScope = symbolTable.getRootScope().children[0];
      const secondScope = symbolTable.getRootScope().children[1];

      expect(firstScope.getOwnSymbol('result')).toBeDefined();
      expect(secondScope.getOwnSymbol('result')).toBeUndefined();
    });
  });

  describe('Return value resolution', () => {
    it('should resolve return value reference in procedure body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetValue() Result : Integer;
    BEGIN
      Result := 42;
      EXIT(Result);
    END;
  }
}`;
      const ast = parseCode(code);
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);

      // Both uses of 'Result' in the body should resolve
      const procedureScope = symbolTable.getRootScope().children[0];
      const resultSymbol = procedureScope.getOwnSymbol('result');

      expect(resultSymbol).toBeDefined();
      expect(resultSymbol!.name).toBe('Result');
    });

    it('should allow return value to coexist with parameters', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Add(A : Integer; B : Integer) Sum : Integer;
    BEGIN
      Sum := A + B;
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];

      // All three should be registered: parameters A, B and return value Sum
      expect(procedureScope.getOwnSymbol('a')).toBeDefined();
      expect(procedureScope.getOwnSymbol('b')).toBeDefined();
      expect(procedureScope.getOwnSymbol('sum')).toBeDefined();

      // Verify types
      expect(procedureScope.getOwnSymbol('a')!.type).toBe('Integer');
      expect(procedureScope.getOwnSymbol('b')!.type).toBe('Integer');
      expect(procedureScope.getOwnSymbol('sum')!.type).toBe('Integer');
    });

    it('should allow return value to coexist with local variables', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetValue() Result : Integer;
    VAR
      Temp : Integer;
    BEGIN
      Temp := 42;
      Result := Temp;
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];

      // Both should be registered: local variable Temp and return value Result
      expect(procedureScope.getOwnSymbol('temp')).toBeDefined();
      expect(procedureScope.getOwnSymbol('result')).toBeDefined();
    });
  });

  describe('Return value name conflicts', () => {
    it('should handle return value with same name as parameter (error case)', () => {
      // This is likely an error in real C/AL, but parser should handle gracefully
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test(Value : Integer) Value : Text;
    BEGIN
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];

      // Symbol table should register both (or handle the conflict gracefully)
      // The exact behavior is implementation-dependent
      const valueSymbol = procedureScope.getOwnSymbol('value');
      expect(valueSymbol).toBeDefined();
    });

    it('should handle return value with same name as local variable (error case)', () => {
      // This is likely an error in real C/AL, but parser should handle gracefully
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test() Value : Integer;
    VAR
      Value : Text;
    BEGIN
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];

      // Symbol table should detect or handle the naming conflict
      const valueSymbol = procedureScope.getOwnSymbol('value');
      expect(valueSymbol).toBeDefined();
    });
  });

  describe('Return value with @number suffix', () => {
    it('should register return value with @number suffix', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetValue() Result@1005 : Integer;
    BEGIN
      Result := 42;
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];
      const resultSymbol = procedureScope.getOwnSymbol('result');

      expect(resultSymbol).toBeDefined();
      expect(resultSymbol!.name).toBe('Result');
      expect(resultSymbol!.type).toBe('Integer');
    });
  });

  describe('Multiple procedures with named returns', () => {
    it('should handle multiple procedures each with their own return value', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE First() A : Integer;
    BEGIN
      A := 1;
    END;

    PROCEDURE Second() B : Text;
    BEGIN
      B := 'Hello';
    END;

    PROCEDURE Third() C : Boolean;
    BEGIN
      C := TRUE;
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      // Each procedure should have its own scope with its own return value
      const firstScope = symbolTable.getRootScope().children[0];
      const secondScope = symbolTable.getRootScope().children[1];
      const thirdScope = symbolTable.getRootScope().children[2];

      expect(firstScope.getOwnSymbol('a')).toBeDefined();
      expect(firstScope.getOwnSymbol('a')!.type).toBe('Integer');

      expect(secondScope.getOwnSymbol('b')).toBeDefined();
      expect(secondScope.getOwnSymbol('b')!.type).toBe('Text');

      expect(thirdScope.getOwnSymbol('c')).toBeDefined();
      expect(thirdScope.getOwnSymbol('c')!.type).toBe('Boolean');

      // Return values should not leak between scopes
      expect(firstScope.getOwnSymbol('b')).toBeUndefined();
      expect(secondScope.getOwnSymbol('a')).toBeUndefined();
      expect(thirdScope.getOwnSymbol('a')).toBeUndefined();
    });
  });

  describe('Backward compatibility - unnamed returns', () => {
    it('should not create implicit symbol for unnamed return type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetValue() : Integer;
    BEGIN
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];

      // No implicit variable should be created for unnamed returns
      // (procedure scope should only have explicitly declared variables)
      expect(procedureScope.getOwnSymbols().length).toBe(0);
    });

    it('should handle procedure with no return type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const procedureScope = symbolTable.getRootScope().children[0];

      // No implicit variable should be created
      expect(procedureScope.getOwnSymbols().length).toBe(0);
    });
  });
});
