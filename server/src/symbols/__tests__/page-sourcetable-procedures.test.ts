/**
 * Page SourceTable Procedure Injection Tests
 *
 * Tests for Issue #611: Pages with SourceTable property should have all procedures
 * from that table available as symbols in the page's root scope.
 *
 * Tests for Issue #617: symbol.name should preserve original casing (e.g. 'CalcFields',
 * not 'CALCFIELDS') when procedures are injected from a Map<string, string> registry
 * where keys are uppercase and values are original-cased names.
 *
 * Tests for Issue #619: Pages with a declared procedure whose name matches a source-table
 * procedure should have the page's own declaration overwrite the pre-injected symbol.
 *
 * These tests verify that:
 * - Procedures from SourceTable are injected into root scope with kind='procedure'
 * - Procedure lookup is case-insensitive
 * - Multiple procedures from the same table are all injected
 * - Non-page objects don't get procedure injection
 * - Graceful handling of missing/empty procedure registry
 * - Field injection and procedure injection coexist correctly
 * - symbol.name preserves original casing from the registry (Issue #617)
 * - Page-declared procedure with same name as injected procedure overwrites the injection (Issue #619)
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
 * Helper to build symbol table with optional field registry and procedure registry.
 * The procedure registry uses Map<string, string> per table where key=UPPERCASE and
 * value=original-cased name (e.g. 'CALCFIELDS' -> 'CalcFields').
 */
function buildSymbolTableWithProcedureRegistry(
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

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'INIT'], ['GET', 'GET']]));

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

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'INIT']]));

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

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([
        ['CALCFIELDS', 'CalcFields'],
        ['INIT', 'INIT'],
        ['GET', 'GET'],
        ['VALIDATE', 'VALIDATE'],
        ['MODIFY', 'MODIFY'],
        ['INSERT', 'INSERT'],
        ['DELETE', 'DELETE'],
        ['FIND', 'FIND']
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

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'INIT']]));

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
      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(27, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'INIT']]));

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

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map<string, string>());

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

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'INIT']]));

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

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'INIT']]));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(false);
      expect(rootScope.hasOwnSymbol('INIT')).toBe(false);
      expect(rootScope.hasOwnSymbol('MyField')).toBe(true);
    });
  });

  describe('Shadowing', () => {
    it('should allow page-declared procedure to overwrite injected source-table procedure', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
  CODE
  {
    PROCEDURE CalcFields();
    VAR
      LocalVar : Integer;
    BEGIN
    END;
  }
}`;

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'INIT']]));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureRegistry);
      const rootScope = symbolTable.getRootScope();

      // CalcFields should still be present in root scope
      expect(rootScope.hasOwnSymbol('CalcFields')).toBe(true);
      const calcFieldsSymbol = rootScope.getOwnSymbol('CalcFields');
      expect(calcFieldsSymbol).toBeDefined();
      expect(calcFieldsSymbol!.kind).toBe('procedure');

      // The page's own declaration should have won (AST walk runs after injection and overwrites).
      // Verify this by checking that a child scope was created for CalcFields containing the
      // local variable from the page's own declaration. Injection does not create child scopes,
      // so the presence of LocalVar proves the AST-walked version is the one that survived.
      const calcFieldsScope = rootScope.children.find(scope =>
        scope.getOwnSymbol('LocalVar') !== undefined
      );
      expect(calcFieldsScope).toBeDefined();
      const localVar = calcFieldsScope!.getOwnSymbol('LocalVar');
      expect(localVar).toBeDefined();
      expect(localVar!.kind).toBe('variable');
      expect(localVar!.type).toBe('Integer');

      // Other injected procedures not declared by the page should still be present
      expect(rootScope.hasOwnSymbol('INIT')).toBe(true);
      expect(rootScope.getOwnSymbol('INIT')!.kind).toBe('procedure');
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

      const procedureRegistry = new Map<number, Map<string, string>>();
      procedureRegistry.set(18, new Map([['CALCFIELDS', 'CalcFields'], ['INIT', 'INIT']]));

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

describe('Page SourceTable Procedure Injection - Original Casing Preservation (Issue #617)', () => {
  describe('symbol.name preserves original casing from procedure map', () => {
    it('should store CalcFields with original mixed-case name, not uppercase CALCFIELDS', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const procedureMap = new Map<number, Map<string, string>>();
      procedureMap.set(18, new Map([
        ['CALCFIELDS', 'CalcFields'],
        ['INIT', 'Init'],
        ['GET', 'Get']
      ]));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureMap);
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

    it('should not store procedure name in uppercase when original casing is mixed', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const procedureMap = new Map<number, Map<string, string>>();
      procedureMap.set(18, new Map([
        ['CALCFIELDS', 'CalcFields']
      ]));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureMap);
      const rootScope = symbolTable.getRootScope();

      const symbol = rootScope.getOwnSymbol('calcfields');
      expect(symbol).toBeDefined();
      expect(symbol!.name).not.toBe('CALCFIELDS');
      expect(symbol!.name).toBe('CalcFields');
    });

    it('should preserve original casing for all procedures in the map', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const procedureMap = new Map<number, Map<string, string>>();
      procedureMap.set(18, new Map([
        ['CALCFIELDS',  'CalcFields'],
        ['INIT',        'Init'],
        ['GET',         'Get'],
        ['VALIDATE',    'Validate'],
        ['MODIFY',      'Modify'],
        ['INSERT',      'Insert'],
        ['DELETE',      'Delete'],
        ['FIND',        'Find']
      ]));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureMap);
      const rootScope = symbolTable.getRootScope();

      const expected = ['CalcFields', 'Init', 'Get', 'Validate', 'Modify', 'Insert', 'Delete', 'Find'];
      for (const name of expected) {
        const sym = rootScope.getOwnSymbol(name);
        expect(sym).toBeDefined();
        expect(sym!.name).toBe(name);
      }
    });
  });

  describe('case-insensitive lookup still works after original casing is preserved', () => {
    it('should find CalcFields via hasSymbol regardless of input casing', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const procedureMap = new Map<number, Map<string, string>>();
      procedureMap.set(18, new Map([
        ['CALCFIELDS', 'CalcFields'],
        ['INIT', 'Init']
      ]));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureMap);
      const rootScope = symbolTable.getRootScope();

      expect(rootScope.hasSymbol('calcfields')).toBe(true);
      expect(rootScope.hasSymbol('CALCFIELDS')).toBe(true);
      expect(rootScope.hasSymbol('CalcFields')).toBe(true);
      expect(rootScope.hasSymbol('CalcFIELDS')).toBe(true);

      expect(rootScope.hasSymbol('init')).toBe(true);
      expect(rootScope.hasSymbol('INIT')).toBe(true);
      expect(rootScope.hasSymbol('Init')).toBe(true);
    });

    it('should return original-cased name regardless of which casing was used to look it up', () => {
      const code = `OBJECT Page 21 "Customer Card"
{
  PROPERTIES
  {
    SourceTable=Table18;
  }
}`;

      const procedureMap = new Map<number, Map<string, string>>();
      procedureMap.set(18, new Map([
        ['CALCFIELDS', 'CalcFields']
      ]));

      const symbolTable = buildSymbolTableWithProcedureRegistry(code, undefined, procedureMap);
      const rootScope = symbolTable.getRootScope();

      const viaLower = rootScope.getOwnSymbol('calcfields');
      expect(viaLower).toBeDefined();
      expect(viaLower!.name).toBe('CalcFields');

      const viaUpper = rootScope.getOwnSymbol('CALCFIELDS');
      expect(viaUpper).toBeDefined();
      expect(viaUpper!.name).toBe('CalcFields');

      const viaMixed = rootScope.getOwnSymbol('CalcFields');
      expect(viaMixed).toBeDefined();
      expect(viaMixed!.name).toBe('CalcFields');
    });
  });
});
