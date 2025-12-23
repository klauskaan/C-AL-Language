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
    describe('case-insensitive lookup', () => {
      it('should return true for symbol lookup with original case', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('CustomerNo')).toBe(true);
      });

      it('should return true for symbol lookup with lowercase', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('customerno')).toBe(true);
      });

      it('should return true for symbol lookup with uppercase', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('CUSTOMERNO')).toBe(true);
      });

      it('should return true for symbol lookup with mixed case', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('cUsToMeRnO')).toBe(true);
        expect(symbolTable.hasSymbol('CuStOmErNo')).toBe(true);
      });

      it('should handle Customer, CUSTOMER, customer all matching the same symbol', () => {
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
        expect(symbolTable.hasSymbol('CUSTOMER')).toBe(true);
        expect(symbolTable.hasSymbol('customer')).toBe(true);
      });

      it('should return false for non-existent symbol', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('NonExistent')).toBe(false);
        expect(symbolTable.hasSymbol('NONEXISTENT')).toBe(false);
        expect(symbolTable.hasSymbol('nonexistent')).toBe(false);
      });

      it('should handle case-insensitive lookup for variables', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              TotalAmount : Decimal;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('TotalAmount')).toBe(true);
        expect(symbolTable.hasSymbol('totalamount')).toBe(true);
        expect(symbolTable.hasSymbol('TOTALAMOUNT')).toBe(true);
        expect(symbolTable.hasSymbol('totalAmount')).toBe(true);
      });

      it('should handle case-insensitive lookup for procedures', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE CalculateTotal();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('CalculateTotal')).toBe(true);
        expect(symbolTable.hasSymbol('calculatetotal')).toBe(true);
        expect(symbolTable.hasSymbol('CALCULATETOTAL')).toBe(true);
        expect(symbolTable.hasSymbol('calculateTotal')).toBe(true);
      });

      it('should handle case-insensitive lookup for quoted identifiers', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;"Customer Name" ;Text100       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('No.')).toBe(true);
        expect(symbolTable.hasSymbol('no.')).toBe(true);
        expect(symbolTable.hasSymbol('NO.')).toBe(true);
        expect(symbolTable.hasSymbol('Customer Name')).toBe(true);
        expect(symbolTable.hasSymbol('customer name')).toBe(true);
        expect(symbolTable.hasSymbol('CUSTOMER NAME')).toBe(true);
      });
    });
  });

  describe('getSymbol', () => {
    describe('case-insensitive retrieval', () => {
      it('should return the same symbol regardless of case used in lookup', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        const symbol1 = symbolTable.getSymbol('CustomerNo');
        const symbol2 = symbolTable.getSymbol('customerno');
        const symbol3 = symbolTable.getSymbol('CUSTOMERNO');

        expect(symbol1).toBeDefined();
        expect(symbol2).toBeDefined();
        expect(symbol3).toBeDefined();
        expect(symbol1).toBe(symbol2);
        expect(symbol2).toBe(symbol3);
      });

      it('should return undefined for non-existent symbol', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.getSymbol('NonExistent')).toBeUndefined();
        expect(symbolTable.getSymbol('nonexistent')).toBeUndefined();
        expect(symbolTable.getSymbol('NONEXISTENT')).toBeUndefined();
      });
    });

    describe('symbol data correctness', () => {
      it('should return correct kind for field symbols', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;Balance         ;Decimal       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.getSymbol('CustomerNo')?.kind).toBe('field');
        expect(symbolTable.getSymbol('Name')?.kind).toBe('field');
        expect(symbolTable.getSymbol('Balance')?.kind).toBe('field');
      });

      it('should return correct kind for variable symbols', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              Counter : Integer;
              Total : Decimal;
              Name : Text;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.getSymbol('Counter')?.kind).toBe('variable');
        expect(symbolTable.getSymbol('Total')?.kind).toBe('variable');
        expect(symbolTable.getSymbol('Name')?.kind).toBe('variable');
      });

      it('should return correct kind for procedure symbols', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE ProcessOrder();
            BEGIN
            END;

            LOCAL PROCEDURE ValidateData();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.getSymbol('ProcessOrder')?.kind).toBe('procedure');
        expect(symbolTable.getSymbol('ValidateData')?.kind).toBe('procedure');
      });

      it('should return correct type for field symbols', () => {
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;CodeField       ;Code20        }
    { 2   ;   ;TextField       ;Text50        }
    { 3   ;   ;IntField        ;Integer       }
    { 4   ;   ;DecimalField    ;Decimal       }
    { 5   ;   ;BoolField       ;Boolean       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.getSymbol('CodeField')?.type).toBe('Code20');
        expect(symbolTable.getSymbol('TextField')?.type).toBe('Text50');
        expect(symbolTable.getSymbol('IntField')?.type).toBe('Integer');
        expect(symbolTable.getSymbol('DecimalField')?.type).toBe('Decimal');
        expect(symbolTable.getSymbol('BoolField')?.type).toBe('Boolean');
      });

      it('should return correct type for variable symbols', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              IntVar : Integer;
              DecVar : Decimal;
              TextVar : Text;
              BoolVar : Boolean;
              DateVar : Date;

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
      });

      it('should return normalized (lowercase) name in symbol data', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
    { 2   ;   ;NAME            ;Text100       }
    { 3   ;   ;mixedCASE       ;Integer       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.getSymbol('CustomerNo')?.name).toBe('customerno');
        expect(symbolTable.getSymbol('NAME')?.name).toBe('name');
        expect(symbolTable.getSymbol('mixedCASE')?.name).toBe('mixedcase');
      });

      it('should include token reference in symbol data', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const symbol = symbolTable.getSymbol('CustomerNo');

        expect(symbol?.token).toBeDefined();
        expect(symbol?.token.value).toBeDefined();
      });

      it('should return complete symbol data for fields with case-insensitive lookup', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        // Use different case for lookup
        const symbol = symbolTable.getSymbol('CUSTOMERNO');

        expect(symbol).toBeDefined();
        expect(symbol?.name).toBe('customerno');
        expect(symbol?.kind).toBe('field');
        expect(symbol?.type).toBe('Code20');
        expect(symbol?.token).toBeDefined();
      });

      it('should return complete symbol data for variables with case-insensitive lookup', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              TotalAmount : Decimal;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        // Use different case for lookup
        const symbol = symbolTable.getSymbol('totalamount');

        expect(symbol).toBeDefined();
        expect(symbol?.name).toBe('totalamount');
        expect(symbol?.kind).toBe('variable');
        expect(symbol?.type).toBe('Decimal');
        expect(symbol?.token).toBeDefined();
      });

      it('should return complete symbol data for procedures with case-insensitive lookup', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE CalculateTotal();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);

        // Use different case for lookup
        const symbol = symbolTable.getSymbol('CALCULATETOTAL');

        expect(symbol).toBeDefined();
        expect(symbol?.name).toBe('calculatetotal');
        expect(symbol?.kind).toBe('procedure');
        expect(symbol?.token).toBeDefined();
      });
    });
  });

  describe('getAllSymbols', () => {
    describe('return value behavior', () => {
      it('should return an empty array for an empty symbol table', () => {
        const symbolTable = new SymbolTable();
        const allSymbols = symbolTable.getAllSymbols();

        expect(allSymbols).toEqual([]);
        expect(allSymbols.length).toBe(0);
      });

      it('should return an empty array when AST has no object', () => {
        const code = '';
        const ast = parseCode(code);
        const symbolTable = new SymbolTable();
        symbolTable.buildFromAST(ast);

        const allSymbols = symbolTable.getAllSymbols();
        expect(allSymbols).toEqual([]);
      });

      it('should return an array, not a Map or other iterable', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        expect(Array.isArray(allSymbols)).toBe(true);
      });
    });

    describe('count verification', () => {
      it('should return correct count for a single field', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        expect(allSymbols.length).toBe(1);
      });

      it('should return correct count for multiple fields', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;Balance         ;Decimal       }
    { 4   ;   ;DateCreated     ;Date          }
    { 5   ;   ;Active          ;Boolean       }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        expect(allSymbols.length).toBe(5);
      });

      it('should return correct count for variables only', () => {
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
        const allSymbols = symbolTable.getAllSymbols();
        const variableSymbols = allSymbols.filter(s => s.kind === 'variable');

        expect(variableSymbols.length).toBe(3);
      });

      it('should return correct count for procedures only', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE Proc1();
            BEGIN
            END;

            PROCEDURE Proc2();
            BEGIN
            END;

            LOCAL PROCEDURE Proc3();
            BEGIN
            END;

            PROCEDURE Proc4();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();
        const procedureSymbols = allSymbols.filter(s => s.kind === 'procedure');

        expect(procedureSymbols.length).toBe(4);
      });

      it('should return correct count for mixed symbol types', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              Var1 : Integer;
              Var2 : Text;
              Var3 : Decimal;

            PROCEDURE Proc1();
            BEGIN
            END;

            PROCEDURE Proc2();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        expect(allSymbols.length).toBe(5);
        expect(allSymbols.filter(s => s.kind === 'variable').length).toBe(3);
        expect(allSymbols.filter(s => s.kind === 'procedure').length).toBe(2);
      });
    });

    describe('content verification', () => {
      it('should include all field symbols with correct data', () => {
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;FieldOne        ;Integer       }
    { 2   ;   ;FieldTwo        ;Text50        }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        const fieldOneSymbol = allSymbols.find(s => s.name === 'fieldone');
        const fieldTwoSymbol = allSymbols.find(s => s.name === 'fieldtwo');

        expect(fieldOneSymbol).toBeDefined();
        expect(fieldOneSymbol?.kind).toBe('field');
        expect(fieldOneSymbol?.type).toBe('Integer');
        expect(fieldOneSymbol?.token).toBeDefined();

        expect(fieldTwoSymbol).toBeDefined();
        expect(fieldTwoSymbol?.kind).toBe('field');
        expect(fieldTwoSymbol?.type).toBe('Text50');
        expect(fieldTwoSymbol?.token).toBeDefined();
      });

      it('should include all variable symbols with correct data', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              Counter : Integer;
              Message : Text;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        const counterSymbol = allSymbols.find(s => s.name === 'counter');
        const messageSymbol = allSymbols.find(s => s.name === 'message');

        expect(counterSymbol).toBeDefined();
        expect(counterSymbol?.kind).toBe('variable');
        expect(counterSymbol?.type).toBe('Integer');
        expect(counterSymbol?.token).toBeDefined();

        expect(messageSymbol).toBeDefined();
        expect(messageSymbol?.kind).toBe('variable');
        expect(messageSymbol?.type).toBe('Text');
        expect(messageSymbol?.token).toBeDefined();
      });

      it('should include all procedure symbols with correct data', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            PROCEDURE PublicProc();
            BEGIN
            END;

            LOCAL PROCEDURE PrivateProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        const publicProcSymbol = allSymbols.find(s => s.name === 'publicproc');
        const privateProcSymbol = allSymbols.find(s => s.name === 'privateproc');

        expect(publicProcSymbol).toBeDefined();
        expect(publicProcSymbol?.kind).toBe('procedure');
        expect(publicProcSymbol?.token).toBeDefined();

        expect(privateProcSymbol).toBeDefined();
        expect(privateProcSymbol?.kind).toBe('procedure');
        expect(privateProcSymbol?.token).toBeDefined();
      });

      it('should include symbols of all types in mixed codeunit', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              GlobalCounter : Integer;

            PROCEDURE MainProcess();
            BEGIN
            END;

            LOCAL PROCEDURE Helper();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        const symbolNames = allSymbols.map(s => s.name);

        expect(symbolNames).toContain('globalcounter');
        expect(symbolNames).toContain('mainprocess');
        expect(symbolNames).toContain('helper');
      });

      it('should return symbols with normalized (lowercase) names', () => {
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;CustomerNo      ;Code20        }
    { 2   ;   ;NAME            ;Text100       }
    { 3   ;   ;MixedCase       ;Integer       }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        allSymbols.forEach(symbol => {
          expect(symbol.name).toBe(symbol.name.toLowerCase());
        });
      });

      it('should return symbols with token references', () => {
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;FieldOne        ;Integer       }
    { 2   ;   ;FieldTwo        ;Text50        }
    { 3   ;   ;FieldThree      ;Decimal       }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        allSymbols.forEach(symbol => {
          expect(symbol.token).toBeDefined();
          expect(symbol.token.value).toBeDefined();
        });
      });

      it('should return symbols with quoted identifiers correctly', () => {
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
        const allSymbols = symbolTable.getAllSymbols();

        const symbolNames = allSymbols.map(s => s.name);

        expect(symbolNames).toContain('no.');
        expect(symbolNames).toContain('customer name');
        expect(symbolNames).toContain('vat %');
      });
    });

    describe('multiple calls behavior', () => {
      it('should return consistent results across multiple calls', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        const firstCall = symbolTable.getAllSymbols();
        const secondCall = symbolTable.getAllSymbols();

        expect(firstCall.length).toBe(secondCall.length);
        expect(firstCall.map(s => s.name).sort()).toEqual(secondCall.map(s => s.name).sort());
      });

      it('should return symbols that match getSymbol results', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              TestVar : Integer;

            PROCEDURE TestProc();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        allSymbols.forEach(symbol => {
          const lookedUp = symbolTable.getSymbol(symbol.name);
          expect(lookedUp).toBe(symbol);
        });
      });

      it('should return symbols that pass hasSymbol check', () => {
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;Field1          ;Code20        }
    { 2   ;   ;Field2          ;Integer       }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        allSymbols.forEach(symbol => {
          expect(symbolTable.hasSymbol(symbol.name)).toBe(true);
        });
      });
    });

    describe('large symbol table', () => {
      it('should return all symbols from table with many fields', () => {
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;Field1          ;Code20        }
    { 2   ;   ;Field2          ;Text100       }
    { 3   ;   ;Field3          ;Integer       }
    { 4   ;   ;Field4          ;Decimal       }
    { 5   ;   ;Field5          ;Boolean       }
    { 6   ;   ;Field6          ;Date          }
    { 7   ;   ;Field7          ;Time          }
    { 8   ;   ;Field8          ;DateTime      }
    { 9   ;   ;Field9          ;Option        }
    { 10  ;   ;Field10         ;GUID          }
  }
}`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        expect(allSymbols.length).toBe(10);
      });

      it('should return all symbols from codeunit with many variables and procedures', () => {
        const code = `OBJECT Codeunit 50000 Test {
          CODE {
            VAR
              Var1 : Integer;
              Var2 : Text;
              Var3 : Decimal;
              Var4 : Boolean;
              Var5 : Date;

            PROCEDURE Proc1();
            BEGIN
            END;

            PROCEDURE Proc2();
            BEGIN
            END;

            PROCEDURE Proc3();
            BEGIN
            END;

            PROCEDURE Proc4();
            BEGIN
            END;

            PROCEDURE Proc5();
            BEGIN
            END;
          }
        }`;
        const symbolTable = buildSymbolTable(code);
        const allSymbols = symbolTable.getAllSymbols();

        expect(allSymbols.length).toBe(10);
        expect(allSymbols.filter(s => s.kind === 'variable').length).toBe(5);
        expect(allSymbols.filter(s => s.kind === 'procedure').length).toBe(5);
      });
    });
  });

  describe('Edge Cases', () => {
    // Edge case tests will be added in subtask 1.6
  });
});
