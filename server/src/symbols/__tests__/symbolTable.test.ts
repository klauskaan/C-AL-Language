/**
 * SymbolTable Tests
 *
 * Tests for the SymbolTable class which extracts and stores symbols
 * from C/AL AST nodes. Covers symbol extraction from fields, variables,
 * and procedures, as well as case-insensitive lookup operations.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable, Symbol } from '../symbolTable';
import { CALDocument } from '../../parser/ast';

/**
 * Helper to lex and parse C/AL code into an AST
 */
function parseCode(code: string): CALDocument {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Helper to parse code and build a symbol table from it
 */
function buildSymbolTable(code: string): SymbolTable {
  const ast = parseCode(code);
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);
  return symbolTable;
}

describe('SymbolTable', () => {
  describe('buildFromAST', () => {
    describe('with fields', () => {
      it('should extract a single field from a table object', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('No.')).toBe(true);
        const symbol = symbolTable.getSymbol('No.');
        expect(symbol).toBeDefined();
        expect(symbol?.name).toBe('no.');
        expect(symbol?.kind).toBe('field');
        expect(symbol?.type).toBe('Code20');
      });

      it('should extract multiple fields from a table object', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;Balance         ;Decimal       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('No.')).toBe(true);
        expect(symbolTable.hasSymbol('Name')).toBe(true);
        expect(symbolTable.hasSymbol('Balance')).toBe(true);

        const allSymbols = symbolTable.getAllSymbols();
        expect(allSymbols.length).toBe(3);
      });

      it('should correctly extract field types for various data types', () => {
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;CodeField       ;Code20        }
    { 2   ;   ;TextField       ;Text50        }
    { 3   ;   ;IntField        ;Integer       }
    { 4   ;   ;DecimalField    ;Decimal       }
    { 5   ;   ;DateField       ;Date          }
    { 6   ;   ;BoolField       ;Boolean       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.getSymbol('CodeField')?.type).toBe('Code20');
        expect(symbolTable.getSymbol('TextField')?.type).toBe('Text50');
        expect(symbolTable.getSymbol('IntField')?.type).toBe('Integer');
        expect(symbolTable.getSymbol('DecimalField')?.type).toBe('Decimal');
        expect(symbolTable.getSymbol('DateField')?.type).toBe('Date');
        expect(symbolTable.getSymbol('BoolField')?.type).toBe('Boolean');
      });

      it('should handle quoted field names correctly', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;"Customer Name" ;Text100       }
    { 3   ;   ;"VAT %"         ;Decimal       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('No.')).toBe(true);
        expect(symbolTable.hasSymbol('Customer Name')).toBe(true);
        expect(symbolTable.hasSymbol('VAT %')).toBe(true);
      });

      it('should normalize field names to lowercase for case-insensitive lookup', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
    { 2   ;   ;NAME            ;Text100       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        // Original case
        expect(symbolTable.hasSymbol('CustomerNo')).toBe(true);
        expect(symbolTable.hasSymbol('NAME')).toBe(true);

        // Different cases should also work
        expect(symbolTable.hasSymbol('customerno')).toBe(true);
        expect(symbolTable.hasSymbol('CUSTOMERNO')).toBe(true);
        expect(symbolTable.hasSymbol('name')).toBe(true);
        expect(symbolTable.hasSymbol('Name')).toBe(true);

        // Symbol.name should be normalized (lowercase)
        const symbol = symbolTable.getSymbol('CustomerNo');
        expect(symbol?.name).toBe('customerno');
      });

      it('should store field token reference for position tracking', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;FieldWithToken  ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const symbol = symbolTable.getSymbol('FieldWithToken');

        expect(symbol?.token).toBeDefined();
        expect(symbol?.token.value).toBeDefined();
      });

      it('should set symbol kind to field for all field declarations', () => {
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;Field1          ;Code20        }
    { 2   ;   ;Field2          ;Integer       }
    { 3   ;   ;"Field 3"       ;Text50        }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        allSymbols.forEach(symbol => {
          expect(symbol.kind).toBe('field');
        });
      });
    });

    describe('with variables and procedures', () => {
      // Tests for variable and procedure symbol extraction will be added in subtask 1.3
    });
  });

  describe('hasSymbol', () => {
    // Tests for case-insensitive symbol lookup will be added in subtask 1.4
  });

  describe('getSymbol', () => {
    // Tests for symbol retrieval will be added in subtask 1.4
  });

  describe('getAllSymbols', () => {
    // Tests for getting all symbols will be added in subtask 1.5
  });

  describe('Edge Cases', () => {
    // Edge case tests will be added in subtask 1.6
  });
});
