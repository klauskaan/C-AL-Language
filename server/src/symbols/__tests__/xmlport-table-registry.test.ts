/**
 * Tests for XMLport ELEMENTS table display name resolution via table registry (Issue #559)
 *
 * When an XMLport ELEMENTS row has sourceType=Table and a SourceTable property,
 * NAV uses the table display name as an implicit variable at runtime in ELEMENTS triggers.
 * The parser stores the element name (COL-3) as a symbol, but the table display name
 * also needs to be registered so that references like "Data Exch. Def".VALIDATE(Type)
 * resolve correctly.
 *
 * After the fix:
 * - buildFromAST(ast, tableRegistry) resolves XMLport element SourceTable → table display name
 * - Both element name AND table display name are registered as symbols
 * - Without a registry the call must still succeed (graceful degradation)
 * - Full-pipeline: no undefined-identifier diagnostic for resolved table display name refs
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../symbolTable';
import { UndefinedIdentifierValidator } from '../../validation/undefinedIdentifierValidator';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAst(code: string) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

function buildSymbolTableWithRegistry(
  code: string,
  tableRegistry?: ReadonlyMap<number, string>
): SymbolTable {
  const ast = buildAst(code);
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast, tableRegistry);
  return symbolTable;
}

/**
 * Run undefined-identifier validation with an optional table registry.
 * Mirrors the validateUndefinedIdentifiers helper in dataitem-table-registry.test.ts
 * but threads the registry through buildFromAST.
 */
function validateUndefinedIdentifiers(
  code: string,
  tableRegistry?: ReadonlyMap<number, string>
) {
  const ast = buildAst(code);

  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast, tableRegistry);

  const builtins = new BuiltinRegistry();

  const context: ValidationContext = {
    ast,
    symbolTable,
    builtins,
    documentUri: 'file:///test.cal',
    tableRegistryPopulated: symbolTable.tableRegistryPopulated
  };

  const validator = new UndefinedIdentifierValidator();
  return validator.validate(context);
}

// ---------------------------------------------------------------------------
// Group 1: Symbol table resolves XMLport element SourceTable via registry
// ---------------------------------------------------------------------------

describe('SymbolTable - XMLport ELEMENTS table display name resolution via registry', () => {
  it('should register table display name when registry resolves SourceTable ID', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[1222, 'Data Exch. Def']]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    // Table display name should be registered
    expect(symbolTable.hasSymbol('Data Exch. Def')).toBe(true);
    expect(symbolTable.getSymbol('Data Exch. Def')?.kind).toBe('variable');
  });

  it('should register both element name and table display name for same element', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[1222, 'Data Exch. Def']]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    // Both element name AND table display name should be registered
    expect(symbolTable.hasSymbol('DataExchDef')).toBe(true);
    expect(symbolTable.hasSymbol('Data Exch. Def')).toBe(true);
    expect(symbolTable.getSymbol('DataExchDef')?.kind).toBe('variable');
    expect(symbolTable.getSymbol('Data Exch. Def')?.kind).toBe('variable');
  });

  it('should handle VariableName property: register both VariableName + table display name', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      VariableName=TempTransformationRuleRec;
                                      SourceTable=Table1237 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[1237, 'Transformation Rule']]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    // When VariableName is present, both VariableName and table display name should be registered
    expect(symbolTable.hasSymbol('TempTransformationRuleRec')).toBe(true);
    expect(symbolTable.hasSymbol('Transformation Rule')).toBe(true);
  });

  it('should gracefully skip when no registry provided', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    expect(() => {
      const symbolTable = buildSymbolTableWithRegistry(code);
      // No registry supplied: table display name must NOT appear as a symbol
      expect(symbolTable.hasSymbol('Data Exch. Def')).toBe(false);
      // Element name should still be registered
      expect(symbolTable.hasSymbol('DataExchDef')).toBe(true);
    }).not.toThrow();
  });

  it('should gracefully skip when table ID not in registry', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    // Registry exists but does not contain table 1222
    const registry = new Map<number, string>([[99, 'Some Other Table']]);

    expect(() => {
      const symbolTable = buildSymbolTableWithRegistry(code, registry);
      // Table 1222 is not in the registry, so table display name should not be created
      expect(symbolTable.hasSymbol('Data Exch. Def')).toBe(false);
      // Element name should still be registered
      expect(symbolTable.hasSymbol('DataExchDef')).toBe(true);
    }).not.toThrow();
  });

  it('should handle SourceTable value not in TableNNNN format', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=InvalidFormat }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[1222, 'Data Exch. Def']]);

    expect(() => {
      const symbolTable = buildSymbolTableWithRegistry(code, registry);
      // SourceTable value doesn't match TableNNNN format
      expect(symbolTable.hasSymbol('Data Exch. Def')).toBe(false);
      // Element name should still be registered
      expect(symbolTable.hasSymbol('DataExchDef')).toBe(true);
    }).not.toThrow();
  });

  it('should resolve multiple elements with different SourceTable values', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222 }
    { [{GHI}];2 ;DataExchLineDef     ;Element ;Table   ;
                                      SourceTable=Table1227 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([
      [1222, 'Data Exch. Def'],
      [1227, 'Data Exch. Line Def']
    ]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    expect(symbolTable.hasSymbol('Data Exch. Def')).toBe(true);
    expect(symbolTable.hasSymbol('Data Exch. Line Def')).toBe(true);
    expect(symbolTable.getSymbol('Data Exch. Def')?.kind).toBe('variable');
    expect(symbolTable.getSymbol('Data Exch. Line Def')?.kind).toBe('variable');
  });

  it('should resolve nested child elements recursively', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222 }
    { [{GHI}];2 ;DataExchLineDef     ;Element ;Table   ;
                                      SourceTable=Table1227 }
    { [{JKL}];3 ;DataExchColumnDef   ;Element ;Table   ;
                                      SourceTable=Table1223 }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([
      [1222, 'Data Exch. Def'],
      [1227, 'Data Exch. Line Def'],
      [1223, 'Data Exch. Column Def']
    ]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    expect(symbolTable.hasSymbol('Data Exch. Def')).toBe(true);
    expect(symbolTable.hasSymbol('Data Exch. Line Def')).toBe(true);
    expect(symbolTable.hasSymbol('Data Exch. Column Def')).toBe(true);
  });

  it('should not register display name for Text/Field source types', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222 }
    { [{GHI}];2 ;Code                ;Attribute;Field  ;
                                      SourceField=Data Exch. Def::Code }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[1222, 'Data Exch. Def']]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    // Table element should register display name
    expect(symbolTable.hasSymbol('Data Exch. Def')).toBe(true);
    // Field element should NOT register a separate display name
    // (only the element name 'Code' should be registered)
    expect(symbolTable.hasSymbol('Code')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group 2: Integration — undefined-identifier validation
// ---------------------------------------------------------------------------

describe('UndefinedIdentifierValidator - XMLport ELEMENTS with table registry', () => {
  it('should not produce undefined-identifier diagnostic for resolved table display name reference', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222;
                                      Import::OnBeforeInsertRecord=BEGIN
                                                                     "Data Exch. Def".VALIDATE(Type);
                                                                   END;
                                                                    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[1222, 'Data Exch. Def']]);
    const diagnostics = validateUndefinedIdentifiers(code, registry);

    const dataExchDefDiagnostic = diagnostics.find(d => d.message.includes('Data Exch. Def'));
    expect(dataExchDefDiagnostic).toBeUndefined();
  });

  it('should not produce diagnostic when no registry is provided (suppression active)', () => {
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222;
                                      Import::OnBeforeInsertRecord=BEGIN
                                                                     "Data Exch. Def".VALIDATE(Type);
                                                                   END;
                                                                    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    // Without a registry, suppression is active to avoid false positives
    const diagnostics = validateUndefinedIdentifiers(code);

    const dataExchDefDiagnostic = diagnostics.find(d => d.message.includes('Data Exch. Def'));
    expect(dataExchDefDiagnostic).toBeUndefined();
  });

  it('should not produce false positive when symbol table built without registry (Issue #560)', () => {
    // Simulates startup race: document parsed before indexing completes
    const code = `OBJECT XMLport 1225 Test
{
  OBJECT-PROPERTIES
  {
    Date=;
    Time=;
  }
  ELEMENTS
  {
    { [{ABC}];  ;root                ;Element ;Text     }
    { [{DEF}];1 ;DataExchDef         ;Element ;Table   ;
                                      SourceTable=Table1222;
                                      Import::OnBeforeInsertRecord=BEGIN
                                                                     "Data Exch. Def".VALIDATE(Type);
                                                                   END;
                                                                    }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    // Step 1: Build symbol table WITHOUT registry (simulates empty registry at startup)
    const ast = buildAst(code);
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    // Step 2: Create ValidationContext with tableRegistryPopulated derived from symbolTable.tableRegistryPopulated
    // This is the fix: validation should check whether the symbol table HAD a registry at build time,
    // not whether a registry exists NOW
    const builtins = new BuiltinRegistry();
    const context: ValidationContext = {
      ast,
      symbolTable,
      builtins,
      documentUri: 'file:///test.cal',
      tableRegistryPopulated: symbolTable.tableRegistryPopulated
    };

    // Step 3: Run UndefinedIdentifierValidator
    const validator = new UndefinedIdentifierValidator();
    const diagnostics = validator.validate(context);

    // Step 4: Assert NO diagnostics
    // Validation should not traverse ELEMENTS because tableRegistryPopulated is false
    // (symbol table was built without registry, so validation correctly suppresses ELEMENTS checks)
    const dataExchDefDiagnostic = diagnostics.find(d => d.message.includes('Data Exch. Def'));
    expect(dataExchDefDiagnostic).toBeUndefined();
  });
});
