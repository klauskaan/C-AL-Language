/**
 * Integration tests for system table false-positive suppression
 *
 * Tests that pages/codeunits referencing NAV system/virtual table fields
 * (ID >= 2,000,000,000) do NOT produce false-positive undefined-identifier
 * warnings when WorkspaceIndex is used to provide registries.
 *
 * These tests FAIL before implementation because WorkspaceIndex does not
 * pre-seed system table definitions, so the field registry is empty for
 * system tables, causing false-positive undefined-identifier warnings.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { UndefinedIdentifierValidator } from '../undefinedIdentifierValidator';
import { Diagnostic } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';
import { WorkspaceIndex } from '../../workspaceSymbol/workspaceIndex';

/**
 * Helper that uses WorkspaceIndex registries (the real seeded registries) to validate.
 * This is the integration-level helper that exercises the full seeding path.
 */
function validateWithWorkspaceIndex(code: string): Diagnostic[] {
  const workspaceIndex = new WorkspaceIndex();
  const tableRegistry = workspaceIndex.getTableRegistry();
  const fieldRegistry = workspaceIndex.getFieldRegistry();

  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast, tableRegistry, fieldRegistry);

  const builtins = new BuiltinRegistry();

  const context: ValidationContext = {
    ast,
    symbolTable,
    builtins,
    documentUri: 'file:///test.cal',
    userTablesIndexed: workspaceIndex.userTablesIndexed,
    fieldRegistry,
    tableRegistry
  };

  const validator = new UndefinedIdentifierValidator();
  return validator.validate(context);
}

describe('UndefinedIdentifierValidator - System Table Integration', () => {
  describe('Integer table (2000000026) field suppression', () => {
    it('should not produce undefined-identifier for Number field on page with SourceTable=Table2000000026', () => {
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Page 50000 "Test Integer Page"
{
  PROPERTIES
  {
    SourceTable=Table2000000026;
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF Number = 0 THEN
        EXIT;
    END;
  }
}`;

      const diagnostics = validateWithWorkspaceIndex(code);

      const numberError = diagnostics.find(d =>
        d.message.includes('Number') && d.code === 'undefined-identifier'
      );
      expect(numberError).toBeUndefined();
    });

    it('should have Integer table (2000000026) in WorkspaceIndex field registry after construction', () => {
      const workspaceIndex = new WorkspaceIndex();
      const fieldRegistry = workspaceIndex.getFieldRegistry();

      expect(fieldRegistry.has(2000000026)).toBe(true);
      const integerFields = fieldRegistry.get(2000000026);
      expect(integerFields).toBeDefined();
      expect(integerFields!.has('NUMBER')).toBe(true);
    });
  });

  describe('Date table (2000000007) field suppression', () => {
    it('should not produce undefined-identifier for Period Start field on page with SourceTable=Table2000000007', () => {
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Page 50001 "Test Date Page"
{
  PROPERTIES
  {
    SourceTable=Table2000000007;
  }
  CODE
  {
    PROCEDURE TestProc();
    VAR
      StartDate : Date;
    BEGIN
      StartDate := "Period Start";
    END;
  }
}`;

      const diagnostics = validateWithWorkspaceIndex(code);

      const periodStartError = diagnostics.find(d =>
        d.message.includes('Period Start') && d.code === 'undefined-identifier'
      );
      expect(periodStartError).toBeUndefined();
    });

    it('should not produce undefined-identifier for Period End field on page with SourceTable=Table2000000007', () => {
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Page 50002 "Test Date Page End"
{
  PROPERTIES
  {
    SourceTable=Table2000000007;
  }
  CODE
  {
    PROCEDURE TestProc();
    VAR
      EndDate : Date;
    BEGIN
      EndDate := "Period End";
    END;
  }
}`;

      const diagnostics = validateWithWorkspaceIndex(code);

      const periodEndError = diagnostics.find(d =>
        d.message.includes('Period End') && d.code === 'undefined-identifier'
      );
      expect(periodEndError).toBeUndefined();
    });

    it('should have Date table (2000000007) in WorkspaceIndex field registry after construction', () => {
      const workspaceIndex = new WorkspaceIndex();
      const fieldRegistry = workspaceIndex.getFieldRegistry();

      expect(fieldRegistry.has(2000000007)).toBe(true);
      const dateFields = fieldRegistry.get(2000000007);
      expect(dateFields).toBeDefined();
      expect(dateFields!.has('PERIOD START')).toBe(true);
      expect(dateFields!.has('PERIOD END')).toBe(true);
    });
  });

  describe('Codeunit TableNo field injection (Integer table 2000000026)', () => {
    it('should not produce undefined-identifier for Number field in codeunit with TableNo=2000000026', () => {
      // Location assertions depend on fixture structure - do not reformat
      const code = `OBJECT Codeunit 50000 "Test Integer Codeunit"
{
  PROPERTIES
  {
    TableNo=2000000026;
    OnRun=BEGIN
            IF Number = 0 THEN
              EXIT;
          END;

  }
  CODE
  {
  }
}`;

      const diagnostics = validateWithWorkspaceIndex(code);

      const numberError = diagnostics.find(d =>
        d.message.includes('Number') && d.code === 'undefined-identifier'
      );
      expect(numberError).toBeUndefined();
    });

    it('should have Integer table (2000000026) in WorkspaceIndex field registry (codeunit path precondition)', () => {
      const workspaceIndex = new WorkspaceIndex();
      const fieldRegistry = workspaceIndex.getFieldRegistry();

      expect(fieldRegistry.has(2000000026)).toBe(true);
      const integerFields = fieldRegistry.get(2000000026);
      expect(integerFields).toBeDefined();
      expect(integerFields!.has('NUMBER')).toBe(true);
    });
  });
});
