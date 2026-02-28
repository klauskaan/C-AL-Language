/**
 * Page SourceTable Procedure Injection Tests
 *
 * Tests for Issue #611: Pages with SourceTable property should have all procedures
 * from that table available as symbols in the page's root scope.
 *
 * These tests verify that:
 * - Procedures from SourceTable are injected into root scope with kind='procedure'
 * - Procedure lookup is case-insensitive
 * - Multiple procedures from the same table are all injected
 * - Non-page objects don't get procedure injection
 * - Graceful handling of missing/empty procedure registry
 * - Field injection and procedure injection coexist correctly
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../symbolTable';
import { CALDocument } from '../../parser/ast';
import { FieldInfo } from '../../workspaceSymbol/workspaceIndex';

/**
 * Helper to parse C/AL code into an AST
 */
function parseCode(code: string): CALDocument {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Helper to build symbol table with optional field registry and procedure registry
 */
function buildSymbolTableWithProcedureRegistry(
  code: string,
  fieldRegistry?: ReadonlyMap<number, ReadonlyMap<string, FieldInfo>>,
  procedureRegistry?: ReadonlyMap<number, ReadonlySet<string>>
): SymbolTable {
  const ast = parseCode(code);
  const symbolTable = new SymbolTable();

  const tableRegistry = new Map<number, string>();
  tableRegistry.set(18, 'Customer');
  tableRegistry.set(27, 'Item');

  symbolTable.buildFromAST(ast, tableRegistry, fieldRegistry, procedureRegistry);
  return symbolTable;
}

describe('Page SourceTable Procedure Injection', () => {
  describe('Basic Behavior', () => {
    it('should inject procedures from SourceTable into page root scope with kind procedure', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Set<string>>();
      procedureRegistry.set(18, new Set(['CalcFields', 'INIT', 'GET']));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasOwnSymbol('INIT')).toBe(true);
      expect(rootScope.hasOwnSymbol('GET')).toBe(true);

      const calcFieldsSymbol = rootScope.getOwnSymbol('CalcFields');
      expect(calcFieldsSymbol).toBeDefined();
      expect(calcFieldsSymbol!.kind).toBe('procedure');

      const initSymbol = rootScope.getOwnSymbol('INIT');
      expect(initSymbol).toBeDefined();
      expect(initSymbol!.kind).toBe('procedure');
    });

    it('should make injected procedures case-insensitive lookupable', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const procedureRegistry = new Map<number, Set<string>>();
      procedureRegistry.set(18, new Set(['CalcFields', 'INIT']));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasSymbol('calcfields')).toBe(true);
      expect(rootScope.hasSymbol('CALCFIELDS')).toBe(true);
      expect(rootScope.hasSymbol('CalcFIELDS')).toBe(true);
      expect(rootScope.hasSymbol('INIT')).toBe(true);
      expect(rootScope.hasSymbol('init')).toBe(true);
      expect(rootScope.hasSymbol('Init')).toBe(true);
    });

    it('should inject all multiple procedures from the same table', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const procedureRegistry = new Map<number, Set<string>>();
      procedureRegistry.set(18, new Set([
        'CalcFields',
        'INIT',
        'GET',
        'VALIDATE',
        'MODIFY',
        'INSERT',
        'DELETE',
        'FIND'
      ]));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      const injectedProcedures = rootScope.getOwnSymbols().filter(s => s.kind === 'procedure');

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasOwnSymbol('INIT')).toBe(true);
      expect(rootScope.hasOwnSymbol('GET')).toBe(true);
      expect(rootScope.hasOwnSymbol('VALIDATE')).toBe(true);
      expect(rootScope.hasOwnSymbol('MODIFY')).toBe(true);
      expect(rootScope.hasOwnSymbol('INSERT')).toBe(true);
      expect(rootScope.hasOwnSymbol('DELETE')).toBe(true);
      expect(rootScope.hasOwnSymbol('FIND')).toBe(true);

      // All 8 table procedures should be present (page's own TestProc is not counted here)
      const tableSourceProcedures = injectedProcedures.filter(s =>
        ['CalcFields', 'INIT', 'GET', 'VALIDATE', 'MODIFY', 'INSERT', 'DELETE', 'FIND']
          .some(name => name.toLowerCase() === s.name.toLowerCase())
      );
      expect(tableSourceProcedures).toHaveLength(8);
    });
  });

  describe('Edge Cases', () => {
    it('should not inject procedures for page with no SourceTable property', () => {
      const code = `OBJECT Page 21 "General Page"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Set<string>>();
      procedureRegistry.set(18, new Set(['CalcFields', 'INIT']));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(false);
      expect(rootScope.hasOwnSymbol('INIT')).toBe(false);
    });

    it('should not inject procedures when SourceTable table is not in procedure registry', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      // Procedure registry exists but only contains table 27, not 18
      const procedureRegistry = new Map<number, Set<string>>();
      procedureRegistry.set(27, new Set(['CalcFields', 'INIT']));

      // Should not crash - graceful degradation
      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(false);
      expect(rootScope.hasOwnSymbol('INIT')).toBe(false);
    });

    it('should not inject procedures when procedure set for SourceTable is empty', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const procedureRegistry = new Map<number, Set<string>>();
      procedureRegistry.set(18, new Set<string>());

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      const injectedProcedures = rootScope.getOwnSymbols().filter(s => s.kind === 'procedure');
      expect(injectedProcedures).toHaveLength(0);
    });

    it('should not crash and inject no procedures when no procedure registry is passed', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      // No procedure registry at all
      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, undefined);
      const rootScope = symbolTable.getRootScope();

      const injectedProcedures = rootScope.getOwnSymbols().filter(s => s.kind === 'procedure');
      expect(injectedProcedures).toHaveLength(0);
    });
  });

  describe('Non-Page Objects', () => {
    it('should not inject procedures for Codeunit even when procedure registry is provided', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Set<string>>();
      procedureRegistry.set(18, new Set(['CalcFields', 'INIT']));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(false);
      expect(rootScope.hasOwnSymbol('INIT')).toBe(false);
    });

    it('should not inject procedures for Table object', () => {
      const code = `OBJECT Table 50000 MyTable
{
  FIELDS
  {
    { 1   ;   ;MyField             ;Text50        }
  }
}`;

      const procedureRegistry = new Map<number, Set<string>>();
      procedureRegistry.set(18, new Set(['CalcFields', 'INIT']));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(false);
      expect(rootScope.hasOwnSymbol('INIT')).toBe(false);
      expect(rootScope.hasOwnSymbol('MyField')).toBe(true);
    });
  });

  describe('Co-existence with Field Injection', () => {
    it('should inject both fields and procedures when both registries are provided', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NO.', { originalName: 'No.', typeName: 'Code20' });
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const procedureRegistry = new Map<number, Set<string>>();
      procedureRegistry.set(18, new Set(['CalcFields', 'INIT']));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, fieldRegistry, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      // Fields are injected
      expect(rootScope.hasOwnSymbol('No.')).toBe(true);
      expect(rootScope.hasOwnSymbol('Name')).toBe(true);
      const noField = rootScope.getOwnSymbol('No.');
      expect(noField).toBeDefined();
      expect(noField!.kind).toBe('field');

      // Procedures are injected
      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasOwnSymbol('INIT')).toBe(true);
      const calcFieldsSymbol = rootScope.getOwnSymbol('CalcFields');
      expect(calcFieldsSymbol).toBeDefined();
      expect(calcFieldsSymbol!.kind).toBe('procedure');

      // Both field and procedure symbols exist
      const fieldSymbols = rootScope.getOwnSymbols().filter(s => s.kind === 'field');
      const procedureSymbols = rootScope.getOwnSymbols().filter(s => s.kind === 'procedure');
      expect(fieldSymbols.length).toBeGreaterThanOrEqual(2);
      expect(procedureSymbols.length).toBeGreaterThanOrEqual(2);
    });
  });
});
