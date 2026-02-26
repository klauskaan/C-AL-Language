/**
 * Named Return Values Tests
 *
 * Tests parser support for C/AL procedures with named return values.
 * C/AL allows procedures to declare a named variable for the return value:
 *
 *   PROCEDURE Foo() ReturnVar : Text;
 *
 * This syntax defines both the return type (Text) AND the return variable name (ReturnVar).
 * The return variable is automatically declared in procedure scope and can be used in the body.
 *
 * Issue #572: Parser currently fails silently on this pattern, causing cascading failures
 * where all subsequent procedures in the CODE section are lost.
 *
 * These tests SHOULD FAIL before implementation (validating the diagnosis).
 */

import { parseCode } from './parserTestHelpers';
import { ProcedureDeclaration } from '../ast';

describe('Parser - Named Return Values', () => {
  describe('Basic named return value syntax', () => {
    it('should parse procedure with named return value', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Foo() ReturnVar : Text;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('Foo');
      expect(proc.returnType).toBeDefined();
      expect(proc.returnType!.typeName).toBe('Text');

      // The key assertion: return value should have a name
      expect(proc.returnValueName).toBe('ReturnVar');
    });

    it('should parse named return value with @number suffix', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetValue() Result@1005 : Decimal;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('GetValue');
      expect(proc.returnType).toBeDefined();
      expect(proc.returnType!.typeName).toBe('Decimal');
      expect(proc.returnValueName).toBe('Result');
    });
  });

  describe('Named return with parameters', () => {
    it('should parse named return value with parameters', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Calculate(X@1000 : Integer; Y@1001 : Integer) Result : Decimal;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('Calculate');
      expect(proc.parameters).toHaveLength(2);
      expect(proc.parameters[0].name).toBe('X');
      expect(proc.parameters[1].name).toBe('Y');
      expect(proc.returnType).toBeDefined();
      expect(proc.returnType!.typeName).toBe('Decimal');
      expect(proc.returnValueName).toBe('Result');
    });

    it('should parse named return with VAR parameters', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Process(VAR Data@1000 : Text) Success : Boolean;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('Process');
      expect(proc.parameters).toHaveLength(1);
      expect(proc.parameters[0].name).toBe('Data');
      expect(proc.parameters[0].isVar).toBe(true);
      expect(proc.returnType).toBeDefined();
      expect(proc.returnType!.typeName).toBe('Boolean');
      expect(proc.returnValueName).toBe('Success');
    });
  });

  describe('Named return with full procedure body', () => {
    it('should parse procedure with named return, VAR section, and body', () => {
      // This validates the cascading failure fix
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetCustomerName(CustNo : Code[20]) CustomerName : Text[50];
    VAR
      Customer : Record 18;
    BEGIN
      IF Customer.GET(CustNo) THEN
        CustomerName := Customer.Name;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('GetCustomerName');
      expect(proc.parameters).toHaveLength(1);
      expect(proc.returnType).toBeDefined();
      expect(proc.returnType!.typeName).toBe('Text[50]'); // Parser includes length in typeName
      expect(proc.returnType!.length).toBe(50);
      expect(proc.returnValueName).toBe('CustomerName');

      // Verify VAR section parsed
      expect(proc.variables).toHaveLength(1);
      expect(proc.variables[0].name).toBe('Customer');

      // Verify body parsed
      expect(proc.body.length).toBeGreaterThan(0);
    });

    it('should parse procedure with named return used in body', () => {
      // Validates that the return variable can be referenced in the procedure body
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Add(A : Integer; B : Integer) Sum : Integer;
    BEGIN
      Sum := A + B;
      EXIT(Sum);
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('Add');
      expect(proc.returnValueName).toBe('Sum');
      expect(proc.body.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple procedures with named returns', () => {
    it('should parse multiple consecutive procedures with named returns', () => {
      // This is the key cascading failure regression test
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE First() Result : Boolean;
    BEGIN
      Result := TRUE;
    END;

    PROCEDURE Second() Output : Text;
    BEGIN
      Output := 'Hello';
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();

      // BOTH procedures must be parsed (not just the first one)
      expect(ast.object!.code!.procedures).toHaveLength(2);

      const proc1 = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc1.name).toBe('First');
      expect((proc1 as any).returnValueName).toBe('Result');
      expect(proc1.returnType!.typeName).toBe('Boolean');

      const proc2 = ast.object!.code!.procedures[1] as ProcedureDeclaration;
      expect(proc2.name).toBe('Second');
      expect((proc2 as any).returnValueName).toBe('Output');
      expect(proc2.returnType!.typeName).toBe('Text');
    });

    it('should parse three procedures with mixed return styles', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE WithNamed() Result : Boolean;
    BEGIN
    END;

    PROCEDURE WithUnnamed() : Text;
    BEGIN
    END;

    PROCEDURE WithAnotherNamed() Value : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(3);

      const proc1 = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc1.name).toBe('WithNamed');
      expect((proc1 as any).returnValueName).toBe('Result');

      const proc2 = ast.object!.code!.procedures[1] as ProcedureDeclaration;
      expect(proc2.name).toBe('WithUnnamed');
      expect((proc2 as any).returnValueName).toBeUndefined();

      const proc3 = ast.object!.code!.procedures[2] as ProcedureDeclaration;
      expect(proc3.name).toBe('WithAnotherNamed');
      expect((proc3 as any).returnValueName).toBe('Value');
    });
  });

  describe('Backward compatibility', () => {
    it('should still parse unnamed return type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetValue() : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('GetValue');
      expect(proc.returnType).toBeDefined();
      expect(proc.returnType!.typeName).toBe('Integer');
      expect(proc.returnValueName).toBeUndefined();
    });

    it('should still parse procedure with no return type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('DoSomething');
      expect(proc.returnType).toBeNull();
      expect(proc.returnValueName).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should parse keyword as return variable name', () => {
      // C/AL allows keywords as identifiers in many contexts
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE IsValid() OK : Boolean;
    BEGIN
      OK := TRUE;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('IsValid');
      expect(proc.returnValueName).toBe('OK');
    });

    it('should parse LOCAL procedure with named return', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    LOCAL PROCEDURE GetResult() Result : Boolean;
    BEGIN
      Result := TRUE;
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('GetResult');
      expect(proc.isLocal).toBe(true);
      expect(proc.returnValueName).toBe('Result');
      expect(proc.returnType!.typeName).toBe('Boolean');
    });

    it('should parse complex return type with named return', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetData() Result : Record 18;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('GetData');
      expect(proc.returnValueName).toBe('Result');
      expect(proc.returnType!.typeName).toContain('Record');
      expect(proc.returnType!.tableId).toBe(18);
    });

    it('should parse array return type with named return', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetArray() Values : ARRAY [10] OF Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('GetArray');
      expect(proc.returnValueName).toBe('Values');
      expect(proc.returnType!.dimensions).toBeDefined();
      expect(proc.returnType!.dimensions![0]).toBe(10);
    });
  });
});
