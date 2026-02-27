/**
 * Page SourceTable Field Injection Tests
 *
 * Tests for Issue #589: Pages with SourceTable property should have all fields
 * from that table available as symbols in the page's root scope.
 *
 * These tests verify that:
 * - Fields from SourceTable are injected into root scope with kind='field'
 * - Field lookup is case-insensitive
 * - Field names with special characters work correctly
 * - Local variables shadow SourceTable fields correctly
 * - Non-page objects don't get field injection
 * - Graceful handling of missing/incomplete field registry
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
 * Helper to build symbol table with optional field registry
 */
function buildSymbolTableWithFieldRegistry(
  code: string,
  fieldRegistry?: ReadonlyMap<number, ReadonlyMap<string, FieldInfo>>
): SymbolTable {
  const ast = parseCode(code);
  const symbolTable = new SymbolTable();

  const tableRegistry = new Map<number, string>();
  tableRegistry.set(18, 'Customer');
  tableRegistry.set(27, 'Item');

  symbolTable.buildFromAST(ast, tableRegistry, fieldRegistry);
  return symbolTable;
}

describe('Page SourceTable Field Injection', () => {
  describe('Field Injection - Basic Behavior', () => {
    it('should inject fields from SourceTable into page root scope', () => {
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
      // Customer fields should be available here
    END;
  }
}`;

      // Create field registry with Customer table fields
      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NO.', { originalName: 'No.', typeName: 'Code20' });
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      customerFields.set('ADDRESS', { originalName: 'Address', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // Verify fields are injected into root scope
      expect(rootScope.hasOwnSymbol('No.')).toBe(true);
      expect(rootScope.hasOwnSymbol('Name')).toBe(true);
      expect(rootScope.hasOwnSymbol('Address')).toBe(true);

      // Verify field symbols have correct kind
      const noField = rootScope.getOwnSymbol('No.');
      expect(noField).toBeDefined();
      expect(noField!.kind).toBe('field');
      expect(noField!.type).toBe('Code20');

      const nameField = rootScope.getOwnSymbol('Name');
      expect(nameField).toBeDefined();
      expect(nameField!.kind).toBe('field');
      expect(nameField!.type).toBe('Text50');
    });

    it('should make injected fields case-insensitive lookupable', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NO.', { originalName: 'No.', typeName: 'Code20' });
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // All case variations should resolve to same symbol
      expect(rootScope.hasSymbol('No.')).toBe(true);
      expect(rootScope.hasSymbol('no.')).toBe(true);
      expect(rootScope.hasSymbol('NO.')).toBe(true);
      expect(rootScope.hasSymbol('Name')).toBe(true);
      expect(rootScope.hasSymbol('name')).toBe(true);
      expect(rootScope.hasSymbol('NAME')).toBe(true);
      expect(rootScope.hasSymbol('NaMe')).toBe(true);
    });

    it('should handle field names with special characters', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      // Real NAV field names with special characters
      customerFields.set('E-MAIL', { originalName: 'E-Mail', typeName: 'Text80' });
      customerFields.set('BALANCE (LCY)', { originalName: 'Balance (LCY)', typeName: 'Decimal' });
      customerFields.set('SALESPERSON CODE', { originalName: 'Salesperson Code', typeName: 'Code10' });
      customerFields.set('GEN. BUS. POSTING GROUP', { originalName: 'Gen. Bus. Posting Group', typeName: 'Code10' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('E-Mail')).toBe(true);
      expect(rootScope.hasOwnSymbol('Balance (LCY)')).toBe(true);
      expect(rootScope.hasOwnSymbol('Salesperson Code')).toBe(true);
      expect(rootScope.hasOwnSymbol('Gen. Bus. Posting Group')).toBe(true);

      const emailField = rootScope.getOwnSymbol('E-Mail');
      expect(emailField!.type).toBe('Text80');
    });
  });

  describe('Shadowing and Scope Hierarchy', () => {
    it('should allow local variable to shadow SourceTable field', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Name : Integer;
    BEGIN
      Name := 5;  // Local variable shadows table field
    END;
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);

      // Root scope should have Name as field
      const rootScope = symbolTable.getRootScope();
      expect(rootScope.hasOwnSymbol('Name')).toBe(true);
      const rootName = rootScope.getOwnSymbol('Name');
      expect(rootName!.kind).toBe('field');
      expect(rootName!.type).toBe('Text50');

      // Find procedure scope
      const procScope = symbolTable.getRootScope().children[0];
      expect(procScope).toBeDefined();

      // Procedure scope should have Name as variable (shadowing field)
      const procName = procScope.getOwnSymbol('Name');
      expect(procName).toBeDefined();
      expect(procName!.kind).toBe('variable');
      expect(procName!.type).toBe('Integer');

      // Lookup from procedure scope should find local variable, not field
      const lookedUpName = procScope.getSymbol('Name');
      expect(lookedUpName).toBe(procName);
      expect(lookedUpName!.kind).toBe('variable');
    });

    it('should allow global variable to overwrite injected field', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    VAR
      Name : Integer;

    PROCEDURE TestProc();
    BEGIN
      Name := 5;  // Global variable overwrites injected field
    END;
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // Root scope should have Name as variable (global variable declaration wins)
      const rootName = symbolTable.getRootScope().getOwnSymbol('Name');
      expect(rootName).toBeDefined();
      expect(rootName!.kind).toBe('variable');
      expect(rootName!.type).toBe('Integer');
    });
  });

  describe('Edge Cases - Missing/Incomplete Registry', () => {
    it('should handle page with no SourceTable property gracefully', () => {
      const code = `OBJECT Page 21 "General Page"
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // No fields should be injected
      expect(symbolTable.getRootScope().hasOwnSymbol('Name')).toBe(false);
    });

    it('should handle page with SourceTable but table not in registry', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      // Field registry exists but doesn't contain table 18
      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const itemFields = new Map<string, FieldInfo>();
      itemFields.set('DESCRIPTION', { originalName: 'Description', typeName: 'Text50' });
      fieldRegistry.set(27, itemFields);

      // Should not crash - graceful degradation
      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // No fields should be injected
      expect(symbolTable.getRootScope().hasOwnSymbol('Description')).toBe(false);
    });

    it('should handle page with SourceTable but empty field registry for that table', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      // Table exists in registry but has no fields
      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      fieldRegistry.set(18, new Map<string, FieldInfo>());

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // No fields should be injected (table has no fields)
      expect(symbolTable.getRootScope().getOwnSymbols().filter(s => s.kind === 'field')).toHaveLength(0);
    });

    it('should handle page when no field registry provided at all', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      // No field registry provided
      const ast = parseCode(code);
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);
      const rootScope = symbolTable.getRootScope();

      // Should not crash, no fields injected
      expect(symbolTable.getRootScope().getOwnSymbols().filter(s => s.kind === 'field')).toHaveLength(0);
    });
  });

  describe('Non-Page Objects', () => {
    it('should not inject fields for Codeunit even if SourceTable somehow exists', () => {
      // This shouldn't happen in practice, but test defensive coding
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
    END;
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // No fields should be injected for non-page objects
      expect(symbolTable.getRootScope().hasOwnSymbol('Name')).toBe(false);
    });

    it('should not inject fields for Table object', () => {
      const code = `OBJECT Table 50000 MyTable
{
  FIELDS
  {
    { 1   ;   ;MyField             ;Text50        }
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // Should have MyField from FIELDS section, not Name from registry
      expect(symbolTable.getRootScope().hasOwnSymbol('MyField')).toBe(true);
      expect(symbolTable.getRootScope().hasOwnSymbol('Name')).toBe(false);
    });

    it('should not inject fields for Report even with DataItem SourceTable', () => {
      const code = `OBJECT Report 111 "Customer List"
{
  DATAITEMS
  {
    { 1234; 1   ;Customer            ;Customer              }
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
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // Report DataItems should NOT inject fields into root scope
      // (Different mechanism - handled via DataItem symbols)
      expect(symbolTable.getRootScope().hasOwnSymbol('Name')).toBe(false);
    });
  });

  describe('Multiple Fields', () => {
    it('should inject all fields from SourceTable', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      // Real Customer table fields (partial)
      customerFields.set('NO.', { originalName: 'No.', typeName: 'Code20' });
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      customerFields.set('ADDRESS', { originalName: 'Address', typeName: 'Text50' });
      customerFields.set('CITY', { originalName: 'City', typeName: 'Text30' });
      customerFields.set('PHONE NO.', { originalName: 'Phone No.', typeName: 'Text30' });
      customerFields.set('E-MAIL', { originalName: 'E-Mail', typeName: 'Text80' });
      customerFields.set('BALANCE (LCY)', { originalName: 'Balance (LCY)', typeName: 'Decimal' });
      customerFields.set('CREDIT LIMIT (LCY)', { originalName: 'Credit Limit (LCY)', typeName: 'Decimal' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTableWithFieldRegistry(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();
      const fieldSymbols = symbolTable.getRootScope().getOwnSymbols().filter(s => s.kind === 'field');

      // All 8 fields should be injected
      expect(fieldSymbols).toHaveLength(8);

      // Verify each field is present
      expect(rootScope.hasOwnSymbol('No.')).toBe(true);
      expect(rootScope.hasOwnSymbol('Name')).toBe(true);
      expect(rootScope.hasOwnSymbol('Address')).toBe(true);
      expect(rootScope.hasOwnSymbol('City')).toBe(true);
      expect(rootScope.hasOwnSymbol('Phone No.')).toBe(true);
      expect(rootScope.hasOwnSymbol('E-Mail')).toBe(true);
      expect(rootScope.hasOwnSymbol('Balance (LCY)')).toBe(true);
      expect(rootScope.hasOwnSymbol('Credit Limit (LCY)')).toBe(true);
    });
  });
});
