/**
 * Report REQUESTPAGE SourceTable Field and Procedure Injection Tests (Issue #669)
 *
 * Tests that when a Report has a REQUESTPAGE section with a SourceTable property,
 * the fields and procedures from that table are injected into the report's root
 * scope — using the same mechanism as Pages with SourceTable (Issue #589/#611).
 *
 * The REQUESTPAGE SourceTable is stored on ObjectDeclaration as
 * `requestPageSourceTableId` by the parser and consumed by symbolTable.buildFromAST().
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
 * Helper to build a symbol table for a report with optional registries.
 * Uses table 18 (Customer) and table 27 (Item) in the tableRegistry.
 */
function buildSymbolTable(
  code: string,
  fieldRegistry?: ReadonlyMap<number, ReadonlyMap<string, FieldInfo>>,
  procedureRegistry?: ReadonlyMap<number, ReadonlyMap<string, string>>
): SymbolTable {
  const ast = parseCode(code);
  const symbolTable = new SymbolTable();

  const tableRegistry = new Map<number, string>();
  tableRegistry.set(18, 'Customer');
  tableRegistry.set(27, 'Item');

  symbolTable.buildFromAST(ast, tableRegistry, fieldRegistry, procedureRegistry);
  return symbolTable;
}

describe('Report REQUESTPAGE SourceTable Field Injection', () => {
  describe('Field Injection - Basic Behavior', () => {
    it('should inject fields from REQUESTPAGE SourceTable into report root scope', () => {
      const code = `OBJECT Report 50000 "Customer Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SourceTable=Table18;
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NO.', { originalName: 'No.', typeName: 'Code20' });
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      customerFields.set('ADDRESS', { originalName: 'Address', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTable(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('No.')).toBe(true);
      expect(rootScope.hasOwnSymbol('Name')).toBe(true);
      expect(rootScope.hasOwnSymbol('Address')).toBe(true);

      const nameField = rootScope.getOwnSymbol('Name');
      expect(nameField).toBeDefined();
      expect(nameField!.kind).toBe('field');
      expect(nameField!.type).toBe('Text50');
    });

    it('should make REQUESTPAGE-injected fields case-insensitively lookupable', () => {
      const code = `OBJECT Report 50001 "Customer Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SourceTable=Table18;
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTable(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasSymbol('Name')).toBe(true);
      expect(rootScope.hasSymbol('name')).toBe(true);
      expect(rootScope.hasSymbol('NAME')).toBe(true);
      expect(rootScope.hasSymbol('NaMe')).toBe(true);
    });

    it('should NOT inject fields for a report without REQUESTPAGE section', () => {
      const code = `OBJECT Report 50002 "Plain Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Plain Report;
  }
  DATASET
  {
    { 1000 ;DataItem;               ;DataItemTable=Customer }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTable(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // No REQUESTPAGE SourceTable → no field injection
      expect(rootScope.hasOwnSymbol('Name')).toBe(false);
    });

    it('should NOT inject fields when REQUESTPAGE has no SourceTable property', () => {
      const code = `OBJECT Report 50003 "Report No SourceTable"
{
  PROPERTIES
  {
    CaptionML=ENU=Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SaveValues=Yes;
    }
    CONTROLS
    {
      { 1   ;0   ;Container ;
                  ContainerType=ContentArea }
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const customerFields = new Map<string, FieldInfo>();
      customerFields.set('NAME', { originalName: 'Name', typeName: 'Text50' });
      fieldRegistry.set(18, customerFields);

      const symbolTable = buildSymbolTable(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      // REQUESTPAGE without SourceTable → no field injection
      expect(rootScope.hasOwnSymbol('Name')).toBe(false);
    });
  });

  describe('Edge Cases - Missing/Incomplete Registry', () => {
    it('should not crash when REQUESTPAGE SourceTable table is not in fieldRegistry', () => {
      const code = `OBJECT Report 50004 "Customer Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SourceTable=Table18;
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

      // fieldRegistry exists but only has table 27, not 18
      const fieldRegistry = new Map<number, Map<string, FieldInfo>>();
      const itemFields = new Map<string, FieldInfo>();
      itemFields.set('DESCRIPTION', { originalName: 'Description', typeName: 'Text50' });
      fieldRegistry.set(27, itemFields);

      // Should not crash — graceful empty
      const symbolTable = buildSymbolTable(code, fieldRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('Description')).toBe(false);
    });

    it('should not crash when no fieldRegistry is provided at all', () => {
      const code = `OBJECT Report 50005 "Customer Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SourceTable=Table18;
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

      // No fieldRegistry at all
      const ast = parseCode(code);
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);

      // Should not crash, no fields injected
      const fieldSymbols = symbolTable.getRootScope().getOwnSymbols().filter(s => s.kind === 'field');
      expect(fieldSymbols).toHaveLength(0);
    });
  });

  describe('Procedure Injection from REQUESTPAGE SourceTable', () => {
    it('should inject procedures from REQUESTPAGE SourceTable into report root scope', () => {
      const code = `OBJECT Report 50006 "Customer Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SourceTable=Table18;
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([
        ['CALCFIELDS', 'CalcFields'],
        ['INIT', 'INIT'],
        ['GET', 'GET']
      ]));

      const symbolTable = buildSymbolTable(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasOwnSymbol('INIT')).toBe(true);
      expect(rootScope.hasOwnSymbol('GET')).toBe(true);

      const calcFieldsSymbol = rootScope.getOwnSymbol('CalcFields');
      expect(calcFieldsSymbol).toBeDefined();
      expect(calcFieldsSymbol!.kind).toBe('procedure');
    });

    it('should make REQUESTPAGE-injected procedures case-insensitively lookupable', () => {
      const code = `OBJECT Report 50007 "Customer Report"
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Report;
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      SourceTable=Table18;
    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields']]));

      const symbolTable = buildSymbolTable(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasSymbol('calcfields')).toBe(true);
      expect(rootScope.hasSymbol('CALCFIELDS')).toBe(true);
    });
  });
});
