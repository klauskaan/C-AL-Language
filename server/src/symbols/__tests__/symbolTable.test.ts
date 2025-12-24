/**
 * SymbolTable Tests
 *
 * Tests for the SymbolTable class which extracts and stores symbols
 * from C/AL AST nodes. Covers symbol extraction from fields, variables,
 * and procedures, as well as case-insensitive lookup operations.
 * Also tests the Scope class and SymbolTable scope hierarchy.
 * Verifies that symbols are properly scoped with parent/child relationships,
 * variable shadowing works correctly, and position-aware lookups function properly.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { Scope, SymbolTable, Symbol } from '../symbolTable';
import { CALDocument } from '../../parser/ast';
import { Token, TokenType } from '../../lexer/tokens';
import {
  ObjectDeclaration,
  ObjectKind,
  CodeSection,
  FieldSection,
  ProcedureDeclaration,
  TriggerDeclaration,
  VariableDeclaration,
  ParameterDeclaration,
  DataType,
  FieldDeclaration
} from '../../parser/ast';

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

/**
 * Helper to create a mock token with required fields
 */
function createMockToken(
  value: string,
  offset: number = 0,
  line: number = 1,
  column: number = 1
): Token {
  return {
    type: TokenType.Identifier,
    value,
    line,
    column,
    startOffset: offset,
    endOffset: offset + value.length
  };
}

/**
 * Helper to create a mock DataType
 */
function createMockDataType(typeName: string): DataType {
  const token = createMockToken(typeName);
  return {
    type: 'DataType',
    typeName,
    startToken: token,
    endToken: token
  };
}

/**
 * Helper to create a mock Symbol
 */
function createMockSymbol(
  name: string,
  kind: Symbol['kind'] = 'variable',
  offset: number = 0,
  type?: string
): Symbol {
  return {
    name,
    kind,
    token: createMockToken(name, offset),
    type
  };
}

/**
 * Helper to create a mock VariableDeclaration
 */
function createMockVariable(name: string, typeName: string, offset: number = 0): VariableDeclaration {
  const startToken = createMockToken(name, offset);
  return {
    type: 'VariableDeclaration',
    name,
    dataType: createMockDataType(typeName),
    startToken,
    endToken: startToken
  };
}

/**
 * Helper to create a mock ParameterDeclaration
 */
function createMockParameter(name: string, typeName: string, offset: number = 0): ParameterDeclaration {
  const startToken = createMockToken(name, offset);
  return {
    type: 'ParameterDeclaration',
    name,
    dataType: createMockDataType(typeName),
    isVar: false,
    startToken,
    endToken: startToken
  };
}

/**
 * Helper to create a mock FieldDeclaration
 */
function createMockField(fieldNo: number, fieldName: string, typeName: string, offset: number = 0): FieldDeclaration {
  const startToken = createMockToken(fieldName, offset);
  return {
    type: 'FieldDeclaration',
    fieldNo,
    fieldClass: '',
    fieldName,
    dataType: createMockDataType(typeName),
    properties: null,
    startToken,
    endToken: startToken
  };
}

/**
 * Helper to create a mock ProcedureDeclaration
 */
function createMockProcedure(
  name: string,
  parameters: ParameterDeclaration[],
  variables: VariableDeclaration[],
  startOffset: number = 0,
  endOffset: number = 100
): ProcedureDeclaration {
  const startToken = createMockToken(name, startOffset);
  const endToken = createMockToken('END', endOffset);
  return {
    type: 'ProcedureDeclaration',
    name,
    parameters,
    returnType: null,
    isLocal: false,
    variables,
    body: [],
    startToken,
    endToken
  };
}

/**
 * Helper to create a mock TriggerDeclaration
 */
function createMockTrigger(
  name: string,
  variables: VariableDeclaration[],
  startOffset: number = 0,
  endOffset: number = 100
): TriggerDeclaration {
  const startToken = createMockToken(name, startOffset);
  const endToken = createMockToken('END', endOffset);
  return {
    type: 'TriggerDeclaration',
    name,
    variables,
    body: [],
    startToken,
    endToken
  };
}

/**
 * Helper to create a minimal CALDocument AST
 */
function createMockAST(options: {
  fields?: FieldDeclaration[];
  globalVariables?: VariableDeclaration[];
  procedures?: ProcedureDeclaration[];
  triggers?: TriggerDeclaration[];
}): CALDocument {
  const startToken = createMockToken('OBJECT');
  const endToken = createMockToken('}', 1000);

  const codeSection: CodeSection | null = (options.globalVariables || options.procedures || options.triggers) ? {
    type: 'CodeSection',
    variables: options.globalVariables || [],
    procedures: options.procedures || [],
    triggers: options.triggers || [],
    startToken,
    endToken
  } : null;

  const fieldSection: FieldSection | null = options.fields ? {
    type: 'FieldSection',
    fields: options.fields,
    startToken,
    endToken
  } : null;

  const objectDecl: ObjectDeclaration = {
    type: 'ObjectDeclaration',
    objectKind: ObjectKind.Table,
    objectId: 18,
    objectName: 'TestTable',
    properties: null,
    fields: fieldSection,
    keys: null,
    fieldGroups: null,
    code: codeSection,
    startToken,
    endToken
  };

  return {
    type: 'CALDocument',
    object: objectDecl,
    startToken,
    endToken
  };
}

describe('Scope Class', () => {
  describe('Constructor and Parent/Child Relationships', () => {
    it('should create a root scope with null parent', () => {
      const scope = new Scope(null);
      expect(scope.parent).toBeNull();
      expect(scope.children).toEqual([]);
    });

    it('should link child scope to parent', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);

      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);
    });

    it('should allow multiple children per parent', () => {
      const parent = new Scope(null);
      const child1 = new Scope(parent);
      const child2 = new Scope(parent);
      const child3 = new Scope(parent);

      expect(parent.children.length).toBe(3);
      expect(parent.children).toContain(child1);
      expect(parent.children).toContain(child2);
      expect(parent.children).toContain(child3);
    });

    it('should initialize with default offset values', () => {
      const scope = new Scope(null);
      expect(scope.startOffset).toBe(0);
      expect(scope.endOffset).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should allow setting custom offset values', () => {
      const scope = new Scope(null);
      scope.startOffset = 100;
      scope.endOffset = 200;

      expect(scope.startOffset).toBe(100);
      expect(scope.endOffset).toBe(200);
    });
  });

  describe('addSymbol', () => {
    it('should add a symbol to the scope', () => {
      const scope = new Scope(null);
      const symbol = createMockSymbol('myVar', 'variable', 0, 'Integer');

      scope.addSymbol(symbol);

      expect(scope.hasOwnSymbol('myVar')).toBe(true);
    });

    it('should overwrite existing symbol with same name', () => {
      const scope = new Scope(null);
      const symbol1 = createMockSymbol('myVar', 'variable', 0, 'Integer');
      const symbol2 = createMockSymbol('myVar', 'variable', 10, 'Text');

      scope.addSymbol(symbol1);
      scope.addSymbol(symbol2);

      const retrieved = scope.getOwnSymbol('myVar');
      expect(retrieved?.type).toBe('Text');
    });
  });

  describe('hasOwnSymbol', () => {
    it('should return true for symbol in this scope', () => {
      const scope = new Scope(null);
      scope.addSymbol(createMockSymbol('localVar'));

      expect(scope.hasOwnSymbol('localVar')).toBe(true);
    });

    it('should return false for symbol not in this scope', () => {
      const scope = new Scope(null);

      expect(scope.hasOwnSymbol('unknown')).toBe(false);
    });

    it('should NOT check parent scope', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);
      parent.addSymbol(createMockSymbol('parentVar'));

      expect(child.hasOwnSymbol('parentVar')).toBe(false);
    });

    it('should be case-insensitive', () => {
      const scope = new Scope(null);
      scope.addSymbol(createMockSymbol('MyVariable'));

      expect(scope.hasOwnSymbol('myvariable')).toBe(true);
      expect(scope.hasOwnSymbol('MYVARIABLE')).toBe(true);
      expect(scope.hasOwnSymbol('MyVariable')).toBe(true);
    });
  });

  describe('getOwnSymbol', () => {
    it('should return symbol from this scope', () => {
      const scope = new Scope(null);
      const symbol = createMockSymbol('myVar', 'variable', 0, 'Integer');
      scope.addSymbol(symbol);

      const retrieved = scope.getOwnSymbol('myVar');
      expect(retrieved).toBe(symbol);
    });

    it('should return undefined for unknown symbol', () => {
      const scope = new Scope(null);

      expect(scope.getOwnSymbol('unknown')).toBeUndefined();
    });

    it('should NOT check parent scope', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);
      parent.addSymbol(createMockSymbol('parentVar'));

      expect(child.getOwnSymbol('parentVar')).toBeUndefined();
    });
  });

  describe('getOwnSymbols', () => {
    it('should return empty array for empty scope', () => {
      const scope = new Scope(null);

      expect(scope.getOwnSymbols()).toEqual([]);
    });

    it('should return all symbols in this scope', () => {
      const scope = new Scope(null);
      const symbol1 = createMockSymbol('var1');
      const symbol2 = createMockSymbol('var2');
      scope.addSymbol(symbol1);
      scope.addSymbol(symbol2);

      const symbols = scope.getOwnSymbols();
      expect(symbols.length).toBe(2);
      expect(symbols).toContain(symbol1);
      expect(symbols).toContain(symbol2);
    });

    it('should NOT include symbols from parent scope', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);
      parent.addSymbol(createMockSymbol('parentVar'));
      child.addSymbol(createMockSymbol('childVar'));

      const childSymbols = child.getOwnSymbols();
      expect(childSymbols.length).toBe(1);
      expect(childSymbols[0].name).toBe('childVar');
    });
  });

  describe('getSymbol (with parent chain traversal)', () => {
    it('should return symbol from this scope', () => {
      const scope = new Scope(null);
      const symbol = createMockSymbol('localVar');
      scope.addSymbol(symbol);

      expect(scope.getSymbol('localVar')).toBe(symbol);
    });

    it('should return symbol from parent scope when not in this scope', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);
      const parentSymbol = createMockSymbol('parentVar');
      parent.addSymbol(parentSymbol);

      expect(child.getSymbol('parentVar')).toBe(parentSymbol);
    });

    it('should traverse multiple parent levels', () => {
      const grandparent = new Scope(null);
      const parent = new Scope(grandparent);
      const child = new Scope(parent);
      const gpSymbol = createMockSymbol('gpVar');
      grandparent.addSymbol(gpSymbol);

      expect(child.getSymbol('gpVar')).toBe(gpSymbol);
    });

    it('should return undefined when symbol not found in any scope', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);

      expect(child.getSymbol('unknown')).toBeUndefined();
    });

    it('should shadow parent symbol with same name (inner takes precedence)', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);
      const parentSymbol = createMockSymbol('x', 'variable', 0, 'Integer');
      const childSymbol = createMockSymbol('x', 'variable', 50, 'Text');
      parent.addSymbol(parentSymbol);
      child.addSymbol(childSymbol);

      // Child scope should return its own symbol
      expect(child.getSymbol('x')).toBe(childSymbol);
      expect(child.getSymbol('x')?.type).toBe('Text');

      // Parent scope should still return its symbol
      expect(parent.getSymbol('x')).toBe(parentSymbol);
      expect(parent.getSymbol('x')?.type).toBe('Integer');
    });

    it('should be case-insensitive across scope chain', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);
      parent.addSymbol(createMockSymbol('ParentVar'));

      expect(child.getSymbol('parentvar')).toBeDefined();
      expect(child.getSymbol('PARENTVAR')).toBeDefined();
    });
  });

  describe('hasSymbol (with parent chain traversal)', () => {
    it('should return true for symbol in this scope', () => {
      const scope = new Scope(null);
      scope.addSymbol(createMockSymbol('localVar'));

      expect(scope.hasSymbol('localVar')).toBe(true);
    });

    it('should return true for symbol in parent scope', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);
      parent.addSymbol(createMockSymbol('parentVar'));

      expect(child.hasSymbol('parentVar')).toBe(true);
    });

    it('should return false when symbol not found', () => {
      const parent = new Scope(null);
      const child = new Scope(parent);

      expect(child.hasSymbol('unknown')).toBe(false);
    });
  });
});

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
    });
  });

  describe('buildFromAST - Empty AST', () => {
    it('should handle AST with no object', () => {
      const symbolTable = new SymbolTable();
      const ast: CALDocument = {
        type: 'CALDocument',
        object: null,
        startToken: createMockToken(''),
        endToken: createMockToken('')
      };

      symbolTable.buildFromAST(ast);

      expect(symbolTable.getAllSymbols()).toEqual([]);
    });
  });

  describe('buildFromAST - Fields', () => {
    it('should add fields to root scope', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        fields: [
          createMockField(1, 'No.', 'Code20', 10),
          createMockField(2, 'Name', 'Text50', 30)
        ]
      });

      symbolTable.buildFromAST(ast);

      expect(symbolTable.hasSymbol('No.')).toBe(true);
      expect(symbolTable.hasSymbol('Name')).toBe(true);

      const noSymbol = symbolTable.getSymbol('No.');
      expect(noSymbol?.kind).toBe('field');
      expect(noSymbol?.type).toBe('Code20');
    });
  });

  describe('buildFromAST - Global Variables', () => {
    it('should add global variables to root scope', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        globalVariables: [
          createMockVariable('gCounter', 'Integer', 50),
          createMockVariable('gCustomer', 'Record', 70)
        ]
      });

      symbolTable.buildFromAST(ast);

      expect(symbolTable.hasSymbol('gCounter')).toBe(true);
      expect(symbolTable.hasSymbol('gCustomer')).toBe(true);

      const counterSymbol = symbolTable.getSymbol('gCounter');
      expect(counterSymbol?.kind).toBe('variable');
      expect(counterSymbol?.type).toBe('Integer');
    });
  });

  describe('buildFromAST - Procedures', () => {
    it('should add procedure name to root scope', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure('MyProcedure', [], [], 100, 200)
        ]
      });

      symbolTable.buildFromAST(ast);

      expect(symbolTable.hasSymbol('MyProcedure')).toBe(true);
      const procSymbol = symbolTable.getSymbol('MyProcedure');
      expect(procSymbol?.kind).toBe('procedure');
    });
  });
});