/**
 * Parser Tests: Anonymous Return Value with Decorator
 *
 * Issue #685: parseProcedureReturnType() does not handle the @N : Type pattern —
 * an anonymous return value that has only a decorator (no name before the @).
 *
 * The pattern `PROCEDURE Foo@1() @2 : Integer;` is legal C/AL. The procedure
 * itself carries @1 (its own auto-number), and the return value carries @2
 * (a separate auto-number for the anonymous return slot). There is no return
 * variable name — just @N followed by the type.
 *
 * Root cause: parseProcedureReturnType() checks canBeUsedAsIdentifier() before
 * the @ token, which returns false because @ is not an identifier. The function
 * then falls through to the plain ": Type" branch, but the current token is @
 * rather than :, so neither branch consumes it. The unconsumed @ causes the next
 * procedure declaration to fail, silently dropping it from the AST.
 *
 * These tests reproduce the exact failure described in the issue:
 * - The procedure AFTER the anonymous-decorator procedure is silently dropped
 * - The return type of the anonymous-decorator procedure is not captured
 */

import { parseCode } from './parserTestHelpers';
import { ProcedureDeclaration } from '../ast';
import * as fs from 'fs';
import * as path from 'path';

describe('Parser - Anonymous Return Value with Decorator (@N : Type)', () => {
  describe('Procedure count: subsequent procedure must not be dropped', () => {
    it('should parse all three procedures when middle one has @N : Type return', () => {
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50685 Test
{
  CODE
  {
    PROCEDURE Before@1() : Integer;
    BEGIN
    END;

    PROCEDURE WithAnonymousDecorator@2() @3 : Integer;
    BEGIN
    END;

    PROCEDURE After@4();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();

      // All three procedures must appear — the key regression assertion.
      // Before the fix, After@4 is silently dropped because the @ token from
      // the anonymous return is left unconsumed, corrupting the parse position.
      expect(ast.object!.code!.procedures).toHaveLength(3);
      expect(errors).toHaveLength(0);

      const before = ast.object!.code!.procedures.find(
        (p) => (p as ProcedureDeclaration).name === 'Before'
      ) as ProcedureDeclaration;
      expect(before).toBeDefined();

      const withDecorator = ast.object!.code!.procedures.find(
        (p) => (p as ProcedureDeclaration).name === 'WithAnonymousDecorator'
      ) as ProcedureDeclaration;
      expect(withDecorator).toBeDefined();

      const after = ast.object!.code!.procedures.find(
        (p) => (p as ProcedureDeclaration).name === 'After'
      ) as ProcedureDeclaration;
      expect(after).toBeDefined();
    });

    it('should parse the procedure immediately after an anonymous-decorator procedure', () => {
      // Minimal two-procedure case: the first uses @N : Type, the second must survive.
      const code = `OBJECT Codeunit 50685 Test
{
  CODE
  {
    PROCEDURE First@1() @2 : Boolean;
    BEGIN
    END;

    PROCEDURE Second@3();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(errors).toHaveLength(0);
      expect(ast.object!.code!.procedures).toHaveLength(2);

      const second = ast.object!.code!.procedures.find(
        (p) => (p as ProcedureDeclaration).name === 'Second'
      );
      expect(second).toBeDefined();
    });
  });

  describe('Return type: @N : Type should be captured as a typed return', () => {
    it('should capture return type from @N : Integer pattern', () => {
      const code = `OBJECT Codeunit 50685 Test
{
  CODE
  {
    PROCEDURE GetValue@1() @2 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();
      expect(ast.object!.code!.procedures).toHaveLength(1);
      expect(errors).toHaveLength(0);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('GetValue');
      expect(proc.returnType).toBeDefined();
      expect(proc.returnType).not.toBeNull();
      expect(proc.returnType!.typeName).toBe('Integer');
    });

    it('should capture return type from @N : Text pattern', () => {
      const code = `OBJECT Codeunit 50685 Test
{
  CODE
  {
    PROCEDURE GetName@1() @2 : Text;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('GetName');
      expect(proc.returnType).toBeDefined();
      expect(proc.returnType).not.toBeNull();
      expect(proc.returnType!.typeName).toBe('Text');
    });

    it('should capture return type from @N : Boolean pattern', () => {
      const code = `OBJECT Codeunit 50685 Test
{
  CODE
  {
    PROCEDURE IsValid@1() @2 : Boolean;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.returnType).not.toBeNull();
      expect(proc.returnType!.typeName).toBe('Boolean');
    });

    it('should treat anonymous decorator return as having no return variable name', () => {
      // @N : Type is anonymous — no name before the @, so returnValueName must be absent
      const code = `OBJECT Codeunit 50685 Test
{
  CODE
  {
    PROCEDURE Compute@1() @2 : Decimal;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.returnValueName).toBeUndefined();
    });
  });

  describe('Combination: parameters + @N return decorator', () => {
    it('should parse parameters together with @N : Type return', () => {
      const code = `OBJECT Codeunit 50685 Test
{
  CODE
  {
    PROCEDURE Sum@1(A@10 : Integer;B@11 : Integer) @2 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(ast.object!.code!.procedures).toHaveLength(1);
      expect(errors).toHaveLength(0);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.name).toBe('Sum');
      expect(proc.parameters).toHaveLength(2);
      expect(proc.parameters[0].name).toBe('A');
      expect(proc.parameters[1].name).toBe('B');
      expect(proc.returnType).not.toBeNull();
      expect(proc.returnType!.typeName).toBe('Integer');
    });
  });

  describe('Backward compatibility: plain return types must still work', () => {
    it('should still parse : Type (unnamed return without decorator)', () => {
      const code = `OBJECT Codeunit 50685 Test
{
  CODE
  {
    PROCEDURE Plain@1() : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.returnType!.typeName).toBe('Integer');
      expect(proc.returnValueName).toBeUndefined();
    });

    it('should still parse Name@N : Type (named return with decorator)', () => {
      const code = `OBJECT Codeunit 50685 Test
{
  CODE
  {
    PROCEDURE WithNamedReturn@1() Result@2 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object!.code!.procedures).toHaveLength(1);

      const proc = ast.object!.code!.procedures[0] as ProcedureDeclaration;
      expect(proc.returnType!.typeName).toBe('Integer');
      expect(proc.returnValueName).toBe('Result');
    });
  });

  describe('Fixture: anonymous-return-decorator.cal', () => {
    it('should parse fixture file with all three procedures intact', () => {
      const fixturePath = path.join(
        __dirname,
        '../../../../test/fixtures/regression/anonymous-return-decorator.cal'
      );

      expect(fs.existsSync(fixturePath)).toBe(true);

      const code = fs.readFileSync(fixturePath, 'utf-8');
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).toBeDefined();
      expect(ast.object!.code).toBeDefined();

      // The fixture contains Before, WithAnonymousDecorator, and After.
      // Before the fix, After is silently dropped.
      expect(ast.object!.code!.procedures).toHaveLength(3);

      const names = ast.object!.code!.procedures.map(
        (p) => (p as ProcedureDeclaration).name
      );
      expect(names).toContain('Before');
      expect(names).toContain('WithAnonymousDecorator');
      expect(names).toContain('After');

      // Return type of WithAnonymousDecorator must be captured
      const withDecorator = ast.object!.code!.procedures.find(
        (p) => (p as ProcedureDeclaration).name === 'WithAnonymousDecorator'
      ) as ProcedureDeclaration;
      expect(withDecorator.returnType).not.toBeNull();
      expect(withDecorator.returnType!.typeName).toBe('Integer');
    });
  });
});
