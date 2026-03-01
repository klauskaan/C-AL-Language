/**
 * Codeunit TableNo Procedure Injection Tests
 *
 * Tests for Issue #654: Codeunits with TableNo property should have all procedures
 * from that table available as symbols in the codeunit's root scope, mirroring the
 * behavior already implemented for pages (SourceTable -> procedure injection at #611).
 *
 * These tests verify that:
 * - Procedures from TableNo are injected into root scope with kind='procedure'
 * - Procedure lookup is case-insensitive
 * - Multiple procedures from the same table are all injected
 * - Codeunits without TableNo do NOT get procedure injection (regression guard)
 * - Graceful handling of missing procedureRegistry (no-op, no crash)
 * - Field injection and procedure injection coexist correctly
 * - symbol.name preserves original casing from the registry
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../symbolTable';
import { CALDocument } from '../../parser/ast';
import { FieldInfo } from '../../workspaceSymbol/workspaceIndex';

function parseCode(code: string): CALDocument {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

function buildSymbolTable(
  code: string,
  fieldRegistry?: ReadonlyMap<number, ReadonlyMap<string, FieldInfo>>,
  procedureRegistry?: ReadonlyMap<number, ReadonlyMap<string, string>>
): SymbolTable {
  const ast = parseCode(code);
  const symbolTable = new SymbolTable();
  const tableRegistry = new Map<number, string>();
  tableRegistry.set(18, 'Customer');
  symbolTable.buildFromAST(ast, tableRegistry, fieldRegistry, procedureRegistry);
  return symbolTable;
}

describe('Codeunit TableNo Procedure Injection', () => {
  describe('Basic Behavior', () => {
    it('should inject procedures from TableNo table into codeunit root scope with kind procedure', () => {
      const code = `OBJECT Codeunit 50000 CustomerMgt
{
  PROPERTIES
  {
    TableNo=18;
  }
  CODE
  {
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'Init']]));

      const symbolTable = buildSymbolTable(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasOwnSymbol('Init')).toBe(true);

      const calcFieldsSymbol = rootScope.getOwnSymbol('CalcFields');
      expect(calcFieldsSymbol).toBeDefined();
      expect(calcFieldsSymbol!.kind).toBe('procedure');

      const initSymbol = rootScope.getOwnSymbol('Init');
      expect(initSymbol).toBeDefined();
      expect(initSymbol!.kind).toBe('procedure');
    });

    it('should make injected procedures case-insensitively lookupable', () => {
      const code = `OBJECT Codeunit 50000 CustomerMgt
{
  PROPERTIES
  {
    TableNo=18;
  }
  CODE
  {
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'Init']]));

      const symbolTable = buildSymbolTable(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasSymbol('calcfields')).toBe(true);
      expect(rootScope.hasSymbol('CALCFIELDS')).toBe(true);
      expect(rootScope.hasSymbol('CalcFIELDS')).toBe(true);
      expect(rootScope.hasSymbol('Init')).toBe(true);
      expect(rootScope.hasSymbol('init')).toBe(true);
      expect(rootScope.hasSymbol('INIT')).toBe(true);
    });

    it('should inject all multiple procedures from the TableNo table', () => {
      const code = `OBJECT Codeunit 50000 CustomerMgt
{
  PROPERTIES
  {
    TableNo=18;
  }
  CODE
  {
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([
        ['CALCFIELDS', 'CalcFields'],
        ['INIT', 'Init'],
        ['GET', 'Get'],
        ['VALIDATE', 'Validate'],
        ['MODIFY', 'Modify'],
        ['INSERT', 'Insert'],
        ['DELETE', 'Delete'],
        ['FIND', 'Find']
      ]));

      const symbolTable = buildSymbolTable(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasOwnSymbol('Init')).toBe(true);
      expect(rootScope.hasOwnSymbol('Get')).toBe(true);
      expect(rootScope.hasOwnSymbol('Validate')).toBe(true);
      expect(rootScope.hasOwnSymbol('Modify')).toBe(true);
      expect(rootScope.hasOwnSymbol('Insert')).toBe(true);
      expect(rootScope.hasOwnSymbol('Delete')).toBe(true);
      expect(rootScope.hasOwnSymbol('Find')).toBe(true);

      const injectedProcedures = rootScope.getOwnSymbols().filter(s => s.kind === 'procedure');
      const tableSourceProcedures = injectedProcedures.filter(s =>
        ['CalcFields', 'Init', 'Get', 'Validate', 'Modify', 'Insert', 'Delete', 'Find']
          .some(name => name.toLowerCase() === s.name.toLowerCase())
      );
      expect(tableSourceProcedures).toHaveLength(8);
    });

    it('should preserve original casing from the procedure registry', () => {
      const code = `OBJECT Codeunit 50000 CustomerMgt
{
  PROPERTIES
  {
    TableNo=18;
  }
  CODE
  {
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([
        ['CALCFIELDS', 'CalcFields'],
        ['INIT', 'Init'],
        ['GET', 'Get']
      ]));

      const symbolTable = buildSymbolTable(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      const calcFieldsSymbol = rootScope.getOwnSymbol('CalcFields');
      expect(calcFieldsSymbol).toBeDefined();
      expect(calcFieldsSymbol!.name).toBe('CalcFields');

      const initSymbol = rootScope.getOwnSymbol('Init');
      expect(initSymbol).toBeDefined();
      expect(initSymbol!.name).toBe('Init');

      const getSymbol = rootScope.getOwnSymbol('Get');
      expect(getSymbol).toBeDefined();
      expect(getSymbol!.name).toBe('Get');
    });
  });

  describe('No Injection Without TableNo (Regression Guard)', () => {
    it('should not inject procedures for codeunit without TableNo property', () => {
      const code = `OBJECT Codeunit 50000 GenericHelper
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'Init']]));

      const symbolTable = buildSymbolTable(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(false);
      expect(rootScope.hasOwnSymbol('Init')).toBe(false);

      // codeunit's own declared procedures (TestProc) are present but registry-injected ones should not be
    });

    it('should not inject procedures when TableNo table is not in procedure registry', () => {
      const code = `OBJECT Codeunit 50000 CustomerMgt
{
  PROPERTIES
  {
    TableNo=18;
  }
  CODE
  {
    BEGIN
    END;
  }
}`;

      // Registry only has table 27, not table 18
      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(27, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'Init']]));

      const symbolTable = buildSymbolTable(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(false);
      expect(rootScope.hasOwnSymbol('Init')).toBe(false);
    });
  });

  describe('Graceful No-Op Without procedureRegistry', () => {
    it('should not crash and inject no procedures when no procedureRegistry is passed', () => {
      const code = `OBJECT Codeunit 50000 CustomerMgt
{
  PROPERTIES
  {
    TableNo=18;
  }
  CODE
  {
    BEGIN
    END;
  }
}`;

      const symbolTable = buildSymbolTable(code, undefined, undefined);
      const rootScope = symbolTable.getRootScope();

      const injectedProcedures = rootScope.getOwnSymbols().filter(s => s.kind === 'procedure');
      expect(injectedProcedures).toHaveLength(0);
    });

    it('should not crash when procedure set for TableNo is empty', () => {
      const code = `OBJECT Codeunit 50000 CustomerMgt
{
  PROPERTIES
  {
    TableNo=18;
  }
  CODE
  {
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map<string, string>());

      const symbolTable = buildSymbolTable(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      const injectedProcedures = rootScope.getOwnSymbols().filter(s => s.kind === 'procedure');
      expect(injectedProcedures).toHaveLength(0);
    });
  });

  describe('Co-existence With Field Injection', () => {
    it('should inject both fields and procedures when both registries are provided', () => {
      const code = `OBJECT Codeunit 50000 CustomerMgt
{
  PROPERTIES
  {
    TableNo=18;
  }
  CODE
  {
    BEGIN
    END;
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NO.', { originalName: 'No.', typeName: 'Code20' });
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'Init']]));

      const symbolTable = buildSymbolTable(code, fieldRegistry, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      // Fields are injected
      expect(rootScope.hasOwnSymbol('No.')).toBe(true);
      expect(rootScope.hasOwnSymbol('Name')).toBe(true);
      const noField = rootScope.getOwnSymbol('No.');
      expect(noField).toBeDefined();
      expect(noField!.kind).toBe('field');

      // Procedures are injected
      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasOwnSymbol('Init')).toBe(true);
      const calcFieldsSymbol = rootScope.getOwnSymbol('CalcFields');
      expect(calcFieldsSymbol).toBeDefined();
      expect(calcFieldsSymbol!.kind).toBe('procedure');

      // Both kinds exist
      const fieldSymbols = rootScope.getOwnSymbols().filter(s => s.kind === 'field');
      const procedureSymbols = rootScope.getOwnSymbols().filter(s => s.kind === 'procedure');
      expect(fieldSymbols.length).toBeGreaterThanOrEqual(2);
      expect(procedureSymbols.length).toBeGreaterThanOrEqual(2);
    });
  });
});
