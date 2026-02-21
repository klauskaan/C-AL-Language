/**
 * Tests for Column/Filter name extraction from Query ELEMENTS section (Issue #529)
 *
 * Query objects have an ELEMENTS section in the same { id ; parent ; type ; name ; properties }
 * format as Report DATASET sections. Column and Filter elements have names (COL_4) that are
 * identifiers used in code:
 *
 *   currQuery.SETFILTER(GLAccount, '>0');
 *   currQuery.SETRANGE(PostingDate, TODAY);
 *
 * After the fix:
 * 1. The Query ELEMENTS section is scanned instead of blindly skipped
 * 2. Column/Filter names are extracted from COL_4 (4th semicolon-delimited column)
 * 3. They are registered as VariableDeclaration nodes in the global scope
 * 4. The undefined-identifier validator no longer warns on Column/Filter references
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
// Group 1: Parser extracts Column/Filter names from Query ELEMENTS section
// ---------------------------------------------------------------------------

describe('Parser - Column/Filter name extraction from Query ELEMENTS section', () => {
  it('should extract a simple named Column into code.variables', () => {
    const code = `OBJECT Query 50001 "My Query"
{
  ELEMENTS
  {
    { 1   ;    ;DataItem;                    ;
               DataItemTable=Table17 }

    { 2   ;1   ;Column  ;PostingDate         ;
               DataSource=Posting Date }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    const names = variables.map(v => v.name);
    expect(names).toContain('PostingDate');
  });

  it('should extract a named Filter element into code.variables', () => {
    const code = `OBJECT Query 50001 "My Query"
{
  ELEMENTS
  {
    { 1   ;    ;DataItem;                    ;
               DataItemTable=Table17 }

    { 7   ;1   ;Filter  ;GLAccount           ;
               DataSource=G/L Account No. }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    const names = variables.map(v => v.name);
    expect(names).toContain('GLAccount');
  });

  it('should extract multiple columns and filters into code.variables', () => {
    const code = `OBJECT Query 50001 "My Query"
{
  ELEMENTS
  {
    { 1   ;    ;DataItem;                    ;
               DataItemTable=Table17 }

    { 7   ;1   ;Filter  ;GLAccount           ;
               DataSource=G/L Account No. }

    { 2   ;1   ;Column  ;PostingDate         ;
               DataSource=Posting Date }

    { 3   ;1   ;Column  ;DocumentNo          ;
               DataSource=Document No. }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    const names = variables.map(v => v.name);
    expect(names).toContain('GLAccount');
    expect(names).toContain('PostingDate');
    expect(names).toContain('DocumentNo');
  });

  it('should NOT extract a blank-named Column (COL_4 empty)', () => {
    const code = `OBJECT Query 50001 "My Query"
{
  ELEMENTS
  {
    { 1   ;    ;DataItem;                    ;
               DataItemTable=Table17 }

    { 4   ;1   ;Column  ;                    ;
               DataSource=Count }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    // Blank-named Column must not produce an entry
    expect(variables).toHaveLength(0);
  });

  it('should NOT extract DataItem rows — only Column and Filter rows', () => {
    const code = `OBJECT Query 50001 "My Query"
{
  ELEMENTS
  {
    { 1   ;    ;DataItem;TopCustomers        ;
               DataItemTable=Table18 }

    { 2   ;1   ;Column  ;CustomerName        ;
               DataSource=Name }
  }
  CODE
  {
  }
}`;

    const { ast } = parseCode(code);

    const variables = ast.object?.code?.variables ?? [];
    const names = variables.map(v => v.name);
    expect(names).toContain('CustomerName');
    expect(names).not.toContain('TopCustomers');
  });
});

// ---------------------------------------------------------------------------
// Group 2: Symbol table integration
// ---------------------------------------------------------------------------

describe('SymbolTable - Column/Filter names from Query ELEMENTS section', () => {
  it('should register Column name as a symbol with kind "variable"', () => {
    const code = `OBJECT Query 50001 "My Query"
{
  ELEMENTS
  {
    { 1   ;    ;DataItem;                    ;
               DataItemTable=Table17 }

    { 2   ;1   ;Column  ;PostingDate         ;
               DataSource=Posting Date }
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

    expect(symbolTable.hasSymbol('PostingDate')).toBe(true);
    expect(symbolTable.getSymbol('PostingDate')?.kind).toBe('variable');
  });

  it('should register Filter name as a symbol with kind "variable"', () => {
    const code = `OBJECT Query 50001 "My Query"
{
  ELEMENTS
  {
    { 1   ;    ;DataItem;                    ;
               DataItemTable=Table17 }

    { 7   ;1   ;Filter  ;GLAccount           ;
               DataSource=G/L Account No. }
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

    expect(symbolTable.hasSymbol('GLAccount')).toBe(true);
    expect(symbolTable.getSymbol('GLAccount')?.kind).toBe('variable');
  });
});

// ---------------------------------------------------------------------------
// Group 3: Undefined-identifier validation
// ---------------------------------------------------------------------------

describe('UndefinedIdentifierValidator - Query ELEMENTS Column/Filter references', () => {
  it('should not produce undefined-identifier diagnostic for named Column used in CODE section', () => {
    const code = `OBJECT Query 50001 "My Query"
{
  ELEMENTS
  {
    { 1   ;    ;DataItem;                    ;
               DataItemTable=Table17 }

    { 2   ;1   ;Column  ;PostingDate         ;
               DataSource=Posting Date }
  }
  CODE
  {
    VAR
      currQuery@1 : Query;

    PROCEDURE TestProc@1();
    BEGIN
      currQuery.SETFILTER(PostingDate, '>%1', TODAY);
    END;

    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const postingDateDiagnostic = diagnostics.find(d => d.message.includes('PostingDate'));
    expect(postingDateDiagnostic).toBeUndefined();
  });

  it('should not produce undefined-identifier diagnostic for named Filter used in CODE section', () => {
    const code = `OBJECT Query 50001 "My Query"
{
  ELEMENTS
  {
    { 1   ;    ;DataItem;                    ;
               DataItemTable=Table17 }

    { 7   ;1   ;Filter  ;GLAccount           ;
               DataSource=G/L Account No. }
  }
  CODE
  {
    VAR
      currQuery@1 : Query;

    PROCEDURE TestProc@1();
    BEGIN
      currQuery.SETFILTER(GLAccount, '>0');
    END;

    BEGIN
    END.
  }
}`;

    const diagnostics = validateUndefinedIdentifiers(code);

    const glAccountDiagnostic = diagnostics.find(d => d.message.includes('GLAccount'));
    expect(glAccountDiagnostic).toBeUndefined();
  });
});
