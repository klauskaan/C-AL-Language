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
      it('should extract a single global variable from a codeunit object', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              Counter : Integer;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('Counter')).toBe(true);
        const symbol = symbolTable.getSymbol('Counter');
        expect(symbol).toBeDefined();
        expect(symbol?.name).toBe('counter');
        expect(symbol?.kind).toBe('variable');
        expect(symbol?.type).toBe('Integer');
      });

      it('should extract multiple global variables from a codeunit object', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              Counter : Integer;
              Name : Text;
              Amount : Decimal;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('Counter')).toBe(true);
        expect(symbolTable.hasSymbol('Name')).toBe(true);
        expect(symbolTable.hasSymbol('Amount')).toBe(true);

        const allSymbols = symbolTable.getAllSymbols();
        const variableSymbols = allSymbols.filter(s => s.kind === 'variable');
        expect(variableSymbols.length).toBe(3);
      });

      it('should extract a single procedure from a codeunit object', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE PublicMethod();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('PublicMethod')).toBe(true);
        const symbol = symbolTable.getSymbol('PublicMethod');
        expect(symbol).toBeDefined();
        expect(symbol?.name).toBe('publicmethod');
        expect(symbol?.kind).toBe('procedure');
      });

      it('should extract multiple procedures from a codeunit object', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE FirstProc();
            BEGIN
            END;

            PROCEDURE SecondProc();
            BEGIN
            END;

            PROCEDURE ThirdProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('FirstProc')).toBe(true);
        expect(symbolTable.hasSymbol('SecondProc')).toBe(true);
        expect(symbolTable.hasSymbol('ThirdProc')).toBe(true);

        const allSymbols = symbolTable.getAllSymbols();
        const procedureSymbols = allSymbols.filter(s => s.kind === 'procedure');
        expect(procedureSymbols.length).toBe(3);
      });

      it('should extract both global variables and procedures together', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              GlobalVar : Integer;
              AnotherVar : Text;

            PROCEDURE Process();
            BEGIN
            END;

            PROCEDURE Calculate();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        // Check variables
        expect(symbolTable.hasSymbol('GlobalVar')).toBe(true);
        expect(symbolTable.hasSymbol('AnotherVar')).toBe(true);
        expect(symbolTable.getSymbol('GlobalVar')?.kind).toBe('variable');
        expect(symbolTable.getSymbol('AnotherVar')?.kind).toBe('variable');

        // Check procedures
        expect(symbolTable.hasSymbol('Process')).toBe(true);
        expect(symbolTable.hasSymbol('Calculate')).toBe(true);
        expect(symbolTable.getSymbol('Process')?.kind).toBe('procedure');
        expect(symbolTable.getSymbol('Calculate')?.kind).toBe('procedure');

        // Total count
        const allSymbols = symbolTable.getAllSymbols();
        expect(allSymbols.length).toBe(4);
      });

      it('should correctly extract variable types for various data types', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              IntVar : Integer;
              DecVar : Decimal;
              TextVar : Text;
              BoolVar : Boolean;
              DateVar : Date;
              CodeVar : Code;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.getSymbol('IntVar')?.type).toBe('Integer');
        expect(symbolTable.getSymbol('DecVar')?.type).toBe('Decimal');
        expect(symbolTable.getSymbol('TextVar')?.type).toBe('Text');
        expect(symbolTable.getSymbol('BoolVar')?.type).toBe('Boolean');
        expect(symbolTable.getSymbol('DateVar')?.type).toBe('Date');
        expect(symbolTable.getSymbol('CodeVar')?.type).toBe('Code');
      });

      it('should extract LOCAL procedures with correct symbol kind', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            LOCAL PROCEDURE PrivateHelper();
            BEGIN
            END;

            PROCEDURE PublicMethod();
            BEGIN
            END;

            LOCAL PROCEDURE AnotherPrivate();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        // All procedures (local and public) should be extracted
        expect(symbolTable.hasSymbol('PrivateHelper')).toBe(true);
        expect(symbolTable.hasSymbol('PublicMethod')).toBe(true);
        expect(symbolTable.hasSymbol('AnotherPrivate')).toBe(true);

        // All should have 'procedure' kind
        expect(symbolTable.getSymbol('PrivateHelper')?.kind).toBe('procedure');
        expect(symbolTable.getSymbol('PublicMethod')?.kind).toBe('procedure');
        expect(symbolTable.getSymbol('AnotherPrivate')?.kind).toBe('procedure');
      });

      it('should handle quoted variable names correctly', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              "Temp Customer Entry" : Integer;
              "VAR With Spaces" : Text;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('Temp Customer Entry')).toBe(true);
        expect(symbolTable.hasSymbol('VAR With Spaces')).toBe(true);
      });

      it('should normalize variable names to lowercase for case-insensitive lookup', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              CustomerNo : Code;
              ALLCAPS : Integer;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        // Original case
        expect(symbolTable.hasSymbol('CustomerNo')).toBe(true);
        expect(symbolTable.hasSymbol('ALLCAPS')).toBe(true);

        // Different cases should also work
        expect(symbolTable.hasSymbol('customerno')).toBe(true);
        expect(symbolTable.hasSymbol('CUSTOMERNO')).toBe(true);
        expect(symbolTable.hasSymbol('allcaps')).toBe(true);
        expect(symbolTable.hasSymbol('Allcaps')).toBe(true);

        // Symbol.name should be normalized (lowercase)
        expect(symbolTable.getSymbol('CustomerNo')?.name).toBe('customerno');
        expect(symbolTable.getSymbol('ALLCAPS')?.name).toBe('allcaps');
      });

      it('should normalize procedure names to lowercase for case-insensitive lookup', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE ProcessData();
            BEGIN
            END;

            PROCEDURE UPPERCASEPROC();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        // Original case
        expect(symbolTable.hasSymbol('ProcessData')).toBe(true);
        expect(symbolTable.hasSymbol('UPPERCASEPROC')).toBe(true);

        // Different cases should also work
        expect(symbolTable.hasSymbol('processdata')).toBe(true);
        expect(symbolTable.hasSymbol('PROCESSDATA')).toBe(true);
        expect(symbolTable.hasSymbol('uppercaseproc')).toBe(true);

        // Symbol.name should be normalized (lowercase)
        expect(symbolTable.getSymbol('ProcessData')?.name).toBe('processdata');
      });

      it('should store variable token reference for position tracking', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              TrackedVar : Integer;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const symbol = symbolTable.getSymbol('TrackedVar');

        expect(symbol?.token).toBeDefined();
        expect(symbol?.token.value).toBeDefined();
      });

      it('should store procedure token reference for position tracking', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE TrackedProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const symbol = symbolTable.getSymbol('TrackedProc');

        expect(symbol?.token).toBeDefined();
        expect(symbol?.token.value).toBeDefined();
      });

      it('should extract Record type variables with table ID in type name', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              Customer : Record 18;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('Customer')).toBe(true);
        const symbol = symbolTable.getSymbol('Customer');
        expect(symbol?.kind).toBe('variable');
        // The type should include the Record type information
        expect(symbol?.type).toContain('Record');
      });

      it('should extract TEMPORARY Record type variables', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              TempCustomer : TEMPORARY Record 18;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('TempCustomer')).toBe(true);
        const symbol = symbolTable.getSymbol('TempCustomer');
        expect(symbol?.kind).toBe('variable');
        // The type should include the Record type information
        expect(symbol?.type).toContain('Record');
      });

      it('should set symbol kind to variable for all variable declarations', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              Var1 : Integer;
              Var2 : Text;
              Var3 : Record 18;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbols = allSymbols.filter(s => s.kind === 'variable');
        expect(variableSymbols.length).toBe(3);
        variableSymbols.forEach(symbol => {
          expect(symbol.kind).toBe('variable');
        });
      });

      it('should set symbol kind to procedure for all procedure declarations', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE Proc1();
            BEGIN
            END;

            LOCAL PROCEDURE Proc2();
            BEGIN
            END;

            PROCEDURE Proc3();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        const procedureSymbols = allSymbols.filter(s => s.kind === 'procedure');
        expect(procedureSymbols.length).toBe(3);
        procedureSymbols.forEach(symbol => {
          expect(symbol.kind).toBe('procedure');
        });
      });

      it('should handle procedure with @number syntax', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            LOCAL PROCEDURE CheckCreditLimit@2() : Boolean;
            BEGIN
              EXIT(TRUE);
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('CheckCreditLimit')).toBe(true);
        const symbol = symbolTable.getSymbol('CheckCreditLimit');
        expect(symbol?.kind).toBe('procedure');
      });

      it('should handle variable with @number syntax', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              TempCustomer@1009 : TEMPORARY Record 50000;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('TempCustomer')).toBe(true);
        const symbol = symbolTable.getSymbol('TempCustomer');
        expect(symbol?.kind).toBe('variable');
      });
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
