/**
 * Tests for blank-named DataItem resolution via table registry (Issue #518)
 *
 * When a Report DATASET row has type=DataItem and a blank name (COL-4 empty),
 * NAV uses the table name as the variable name at runtime.  The parser stores
 * these as UnresolvedDataItem entries so the symbol table can resolve them
 * once a table registry (tableId → tableName) is supplied.
 *
 * After the fix:
 * - buildFromAST(ast, tableRegistry) resolves unresolvedDataItems → named symbols
 * - Without a registry the call must still succeed (graceful degradation)
 * - Full-pipeline: no undefined-identifier diagnostic for resolved DataItem refs
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
 * Mirrors the validateUndefinedIdentifiers helper in dataset-dataitem-names.test.ts
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
    documentUri: 'file:///test.cal'
  };

  const validator = new UndefinedIdentifierValidator();
  return validator.validate(context);
}

// ---------------------------------------------------------------------------
// Group 1: Symbol table resolves blank-named DataItems via registry
// ---------------------------------------------------------------------------

describe('SymbolTable - blank DataItem resolution via table registry', () => {
  it('should register the table name as a variable symbol when registry resolves the tableId', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6569;    ;DataItem;                    ;
               DataItemTable=Table18 }
  }
  CODE
  {
  }
}`;

    const registry = new Map<number, string>([[18, 'Customer']]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    expect(symbolTable.hasSymbol('Customer')).toBe(true);
    expect(symbolTable.getSymbol('Customer')?.kind).toBe('variable');
  });

  it('should use the full multi-word table name as the symbol name', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6569;    ;DataItem;                    ;
               DataItemTable=Table36 }
  }
  CODE
  {
  }
}`;

    const registry = new Map<number, string>([[36, 'Sales Header']]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    expect(symbolTable.hasSymbol('Sales Header')).toBe(true);
    expect(symbolTable.getSymbol('Sales Header')?.kind).toBe('variable');
  });

  it('should look up the resolved symbol case-insensitively', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6569;    ;DataItem;                    ;
               DataItemTable=Table18 }
  }
  CODE
  {
  }
}`;

    const registry = new Map<number, string>([[18, 'Customer']]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    expect(symbolTable.hasSymbol('customer')).toBe(true);
    expect(symbolTable.hasSymbol('CUSTOMER')).toBe(true);
    expect(symbolTable.hasSymbol('Customer')).toBe(true);
  });

  it('should not crash and produce no phantom symbol when called without a registry', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6569;    ;DataItem;                    ;
               DataItemTable=Table18 }
  }
  CODE
  {
  }
}`;

    expect(() => {
      const symbolTable = buildSymbolTableWithRegistry(code);
      // No registry supplied: Customer must NOT appear as a symbol
      expect(symbolTable.hasSymbol('Customer')).toBe(false);
    }).not.toThrow();
  });

  it('should gracefully skip when tableId is not present in the registry', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6569;    ;DataItem;                    ;
               DataItemTable=Table18 }
  }
  CODE
  {
  }
}`;

    // Registry exists but does not contain table 18
    const registry = new Map<number, string>([[99, 'Some Other Table']]);

    expect(() => {
      const symbolTable = buildSymbolTableWithRegistry(code, registry);
      // Table 18 is not in the registry, so no symbol should be created
      expect(symbolTable.hasSymbol('Customer')).toBe(false);
    }).not.toThrow();
  });

  it('should resolve multiple blank-named DataItems from the same registry', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6569;    ;DataItem;                    ;
               DataItemTable=Table18 }
    { 6570;    ;DataItem;                    ;
               DataItemTable=Table36 }
  }
  CODE
  {
  }
}`;

    const registry = new Map<number, string>([
      [18, 'Customer'],
      [36, 'Sales Header']
    ]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    expect(symbolTable.hasSymbol('Customer')).toBe(true);
    expect(symbolTable.hasSymbol('Sales Header')).toBe(true);
    expect(symbolTable.getSymbol('Customer')?.kind).toBe('variable');
    expect(symbolTable.getSymbol('Sales Header')?.kind).toBe('variable');
  });

  it('should continue to register named DataItems correctly alongside blank-named ones', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6455;    ;DataItem;PageLoop            ;
               DataItemTable=Table2000000026 }
    { 6569;    ;DataItem;                    ;
               DataItemTable=Table18 }
  }
  CODE
  {
  }
}`;

    const registry = new Map<number, string>([[18, 'Customer']]);
    const symbolTable = buildSymbolTableWithRegistry(code, registry);

    // Named DataItem still registered under its explicit name
    expect(symbolTable.hasSymbol('PageLoop')).toBe(true);
    expect(symbolTable.getSymbol('PageLoop')?.kind).toBe('variable');

    // Blank DataItem resolved via registry
    expect(symbolTable.hasSymbol('Customer')).toBe(true);
    expect(symbolTable.getSymbol('Customer')?.kind).toBe('variable');
  });
});

// ---------------------------------------------------------------------------
// Group 2: Integration — undefined-identifier validation
// ---------------------------------------------------------------------------

describe('UndefinedIdentifierValidator - blank DataItem with table registry', () => {
  it('should not produce undefined-identifier diagnostic for resolved blank DataItem reference', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6569;    ;DataItem;                    ;
               DataItemTable=Table18 }
  }
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      IF Customer."No." = '' THEN
        MESSAGE('test');
    END;

    BEGIN
    END.
  }
}`;

    const registry = new Map<number, string>([[18, 'Customer']]);
    const diagnostics = validateUndefinedIdentifiers(code, registry);

    const customerDiagnostic = diagnostics.find(d => d.message.includes('Customer'));
    expect(customerDiagnostic).toBeUndefined();
  });

  it('should produce undefined-identifier diagnostic when no registry is provided for blank DataItem', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6569;    ;DataItem;                    ;
               DataItemTable=Table18 }
  }
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      IF Customer."No." = '' THEN
        MESSAGE('test');
    END;

    BEGIN
    END.
  }
}`;

    // Graceful degradation: without a registry, Customer is unknown
    const diagnostics = validateUndefinedIdentifiers(code);

    const customerDiagnostic = diagnostics.find(d => d.message.includes('Customer'));
    expect(customerDiagnostic).toBeDefined();
  });
});
