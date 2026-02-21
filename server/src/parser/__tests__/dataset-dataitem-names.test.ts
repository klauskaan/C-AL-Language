/**
 * Tests for DataItem name extraction from Report DATASET section (Issue #511)
 *
 * Currently the parser skips the entire DATASET section via skipUnsupportedSection().
 * DataItem names are never extracted, causing undefined-identifier warnings for
 * every DataItem reference in the CODE section.
 *
 * After the fix:
 * 1. The DATASET section is scanned instead of blindly skipped
 * 2. DataItem names are extracted from COL_4 (4th semicolon-delimited column)
 * 3. They are registered as VariableDeclaration nodes in the global scope
 * 4. The undefined-identifier validator no longer warns on DataItem references
 */

import { parseCode } from './parserTestHelpers';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../../symbols/symbolTable';
import { UndefinedIdentifierValidator } from '../../validation/undefinedIdentifierValidator';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

/**
 * Helper to run undefined-identifier validation on C/AL source code
 */
function validateUndefinedIdentifiers(code: string) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);

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
// Group 1: Parser extracts DataItem names from DATASET section
// ---------------------------------------------------------------------------

describe('Parser - DataItem name extraction from DATASET section', () => {
  it('should extract a simple named DataItem into code.variables', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6455;    ;DataItem;PageLoop            ;
               DataItemTable=Table2000000026 }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    const names = variables.map(v => v.name);
    expect(names).toContain('PageLoop');
  });

  it('should extract multiple named DataItems into code.variables', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6455;    ;DataItem;PageLoop            ;
               DataItemTable=Table2000000026 }
    { 8049;1   ;DataItem;PerEntryLoop        ;
               DataItemTable=Table32 }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    const names = variables.map(v => v.name);
    expect(names).toContain('PageLoop');
    expect(names).toContain('PerEntryLoop');
  });

  it('should extract DataItem names when parent reference (COL_2) is non-empty', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6455;    ;DataItem;OuterLoop           ;
               DataItemTable=Table27 }
    { 8049;1   ;DataItem;InnerLoop           ;
               DataItemTable=Table32;
               DataItemLink=No.=FIELD("No.") }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    const names = variables.map(v => v.name);
    expect(names).toContain('OuterLoop');
    expect(names).toContain('InnerLoop');
  });

  it('should NOT extract Column rows — only DataItem rows', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6455;    ;DataItem;PageLoop            ;
               DataItemTable=Table2000000026 }
    { 3   ;1   ;Column  ;COMPANYNAME         ;
               SourceExpr=COMPANYPROPERTY.DISPLAYNAME }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    const names = variables.map(v => v.name);
    expect(names).toContain('PageLoop');
    expect(names).not.toContain('COMPANYNAME');
  });

  it('should store blank-named DataItem as UnresolvedDataItem with tableId, not discard it', () => {
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

    const { ast } = parseCode(code);

    // A blank-named DataItem must NOT appear in variables (no name to register)
    const variables = ast.object?.code?.variables ?? [];
    expect(variables).toHaveLength(0);

    // But it must be stored as an UnresolvedDataItem so the symbol table can
    // resolve it once the table registry is available
    const unresolvedDataItems = ast.object?.code?.unresolvedDataItems ?? [];
    expect(unresolvedDataItems).toHaveLength(1);
    expect(unresolvedDataItems[0].type).toBe('UnresolvedDataItem');
    expect(unresolvedDataItems[0].tableId).toBe(18);
  });

  it('should NOT produce an UnresolvedDataItem entry for a named DataItem', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6455;    ;DataItem;PageLoop            ;
               DataItemTable=Table2000000026 }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    // Named DataItem goes into variables, not unresolvedDataItems
    const variables = ast.object?.code?.variables ?? [];
    expect(variables.map(v => v.name)).toContain('PageLoop');

    const unresolvedDataItems = ast.object?.code?.unresolvedDataItems ?? [];
    expect(unresolvedDataItems).toHaveLength(0);
  });

  it('should store multiple blank-named DataItems as multiple UnresolvedDataItem entries', () => {
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

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    expect(variables).toHaveLength(0);

    const unresolvedDataItems = ast.object?.code?.unresolvedDataItems ?? [];
    expect(unresolvedDataItems).toHaveLength(2);

    const tableIds = unresolvedDataItems.map(u => u.tableId);
    expect(tableIds).toContain(18);
    expect(tableIds).toContain(36);
  });

  it('should NOT produce an UnresolvedDataItem entry for a Column row with a blank name', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6455;    ;DataItem;PageLoop            ;
               DataItemTable=Table2000000026 }
    { 3   ;1   ;Column  ;                   ;
               SourceExpr=COMPANYPROPERTY.DISPLAYNAME }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    // Column rows must never generate UnresolvedDataItem entries
    const unresolvedDataItems = ast.object?.code?.unresolvedDataItems ?? [];
    const hasColumnEntry = unresolvedDataItems.some(u => u.type !== 'UnresolvedDataItem');
    expect(hasColumnEntry).toBe(false);

    // The blank Column row must also not appear in variables
    const variables = ast.object?.code?.variables ?? [];
    expect(variables.map(v => v.name)).toContain('PageLoop');
    expect(variables).toHaveLength(1);
  });

  it('should not store an UnresolvedDataItem when DataItemTable property is missing', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6569;    ;DataItem;                    ;
               CaptionML=ENU=Test }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    // Without DataItemTable=TableN the tableId cannot be determined;
    // such rows must be silently skipped rather than producing a null/invalid entry
    const unresolvedDataItems = ast.object?.code?.unresolvedDataItems ?? [];
    const hasInvalidEntry = unresolvedDataItems.some(u => u.tableId == null);
    expect(hasInvalidEntry).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group 2: Symbol table integration
// ---------------------------------------------------------------------------

describe('SymbolTable - DataItem names from DATASET section', () => {
  it('should register DataItem name as a symbol with kind "variable"', () => {
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6455;    ;DataItem;PageLoop            ;
               DataItemTable=Table2000000026 }
  }
  CODE
  {
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    expect(symbolTable.hasSymbol('PageLoop')).toBe(true);
    expect(symbolTable.getSymbol('PageLoop')?.kind).toBe('variable');
  });

  it('should not produce undefined-identifier diagnostic for DataItem referenced in CODE section', () => {
    // This is the key regression test.
    // Before the fix: the parser skips DATASET entirely, so PageLoop is never
    // registered in the symbol table, and the validator emits an
    // undefined-identifier warning for "PageLoop.Number".
    // After the fix: PageLoop is registered and no warning is emitted.
    const code = `OBJECT Report 50001 Test
{
  DATASET
  {
    { 6455;    ;DataItem;PageLoop            ;
               DataItemTable=Table2000000026 }
  }
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      IF PageLoop.Number = 1 THEN
        MESSAGE('test');
    END;

    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const pageLoopDiagnostic = diagnostics.find(d => d.message.includes('PageLoop'));
    expect(pageLoopDiagnostic).toBeUndefined();
  });
});
