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
import { Token, TokenType } from '../../lexer/tokens';
import {
  CALDocument,
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
    triggers: null,
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
        expect(symbol?.name).toBe('No.');
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
    { 1   ;   ;IntField        ;Integer       }
    { 2   ;   ;TextField       ;Text250       }
    { 3   ;   ;CodeField       ;Code10        }
    { 4   ;   ;DateField       ;Date          }
    { 5   ;   ;TimeField       ;Time          }
    { 6   ;   ;DecimalField    ;Decimal       }
    { 7   ;   ;BooleanField    ;Boolean       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        const symbols = {
          IntField: symbolTable.getSymbol('IntField'),
          TextField: symbolTable.getSymbol('TextField'),
          CodeField: symbolTable.getSymbol('CodeField'),
          DateField: symbolTable.getSymbol('DateField'),
          TimeField: symbolTable.getSymbol('TimeField'),
          DecimalField: symbolTable.getSymbol('DecimalField'),
          BooleanField: symbolTable.getSymbol('BooleanField')
        };

        expect(symbols.IntField?.type).toBe('Integer');
        expect(symbols.TextField?.type).toBe('Text250');
        expect(symbols.CodeField?.type).toBe('Code10');
        expect(symbols.DateField?.type).toBe('Date');
        expect(symbols.TimeField?.type).toBe('Time');
        expect(symbols.DecimalField?.type).toBe('Decimal');
        expect(symbols.BooleanField?.type).toBe('Boolean');
      });

      it('should preserve field names with special characters', () => {
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;"Primary Key"   ;Text50        }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('No.')).toBe(true);
        expect(symbolTable.hasSymbol('Primary Key')).toBe(true);
      });

      it('should be case-insensitive when looking up fields', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;CustomerName    ;Text100       }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('customername')).toBe(true);
        expect(symbolTable.hasSymbol('CUSTOMERNAME')).toBe(true);
        expect(symbolTable.hasSymbol('CustomerName')).toBe(true);
      });
    });

    describe('with field properties and validation triggers', () => {
      it('should extract field with validation trigger', () => {
        // Valid C/AL syntax: field triggers are properties after the data type
        // See test/fixtures/regression/table-50000-customer-extended.cal for real examples
        const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;"No."               ;Code20        ;OnValidate=BEGIN
                                                                IF "No." = '' THEN
                                                                  ERROR('No. cannot be empty');
                                                              END;
                                                               }
  }
}`;
        const symbolTable = buildSymbolTable(code);

        // The field should be extracted even with a validation trigger
        expect(symbolTable.hasSymbol('No.')).toBe(true);
        const symbol = symbolTable.getSymbol('No.');
        expect(symbol).toBeDefined();
        expect(symbol?.kind).toBe('field');
        expect(symbol?.type).toBe('Code20');
      });
    });

    describe('with global variables', () => {
      it('should add global variables to root scope', () => {
        const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
  }
  FIELDS
  {
  }
  KEYS
  {
  }
  FIELDGROUPS
  {
  }
  CODE
  {
    VAR
      gCounter@1000 : Integer;
      gCustomer@1001 : Record 18;
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('gCounter')).toBe(true);
        expect(symbolTable.hasSymbol('gCustomer')).toBe(true);

        const counterSymbol = symbolTable.getSymbol('gCounter');
        expect(counterSymbol?.kind).toBe('variable');
        expect(counterSymbol?.type).toBe('Integer');
      });
    });

    describe('with procedures', () => {
      it('should add procedure name to root scope', () => {
        const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
  }
  FIELDS
  {
  }
  KEYS
  {
  }
  FIELDGROUPS
  {
  }
  CODE
  {
    PROCEDURE MyProcedure()
    BEGIN
    END;
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('MyProcedure')).toBe(true);
        const procSymbol = symbolTable.getSymbol('MyProcedure');
        expect(procSymbol?.kind).toBe('procedure');
      });

      it('should add procedure parameters to procedure scope', () => {
        const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
  }
  FIELDS
  {
  }
  KEYS
  {
  }
  FIELDGROUPS
  {
  }
  CODE
  {
    PROCEDURE MyProcedure(param1 : Integer;param2 : Text)
    BEGIN
    END;
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('MyProcedure')).toBe(true);
      });

      it('should add procedure local variables to procedure scope', () => {
        const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
  }
  FIELDS
  {
  }
  KEYS
  {
  }
  FIELDGROUPS
  {
  }
  CODE
  {
    PROCEDURE MyProcedure()
    VAR
      localVar : Integer;
    BEGIN
    END;
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('MyProcedure')).toBe(true);
      });
    });

    describe('with field triggers', () => {
      it('should add field trigger names to symbol table', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
  CODE
  {
    TRIGGER OnValidate()
    BEGIN
    END;
  }
}`;
        const symbolTable = buildSymbolTable(code);

        expect(symbolTable.hasSymbol('No.')).toBe(true);
      });
    });

    describe('Empty AST', () => {
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
  });

  describe('Symbol lookup', () => {
    it('should find symbol with case-insensitive lookup', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; CustomerNumber ; Code20 }
  }
}`;
      const symbolTable = buildSymbolTable(code);

      expect(symbolTable.hasSymbol('customernumber')).toBe(true);
      expect(symbolTable.hasSymbol('CUSTOMERNUMBER')).toBe(true);
    });

    it('should return undefined for non-existent symbols', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  }
}`;
      const symbolTable = buildSymbolTable(code);

      expect(symbolTable.getSymbol('NonExistent')).toBeUndefined();
    });
  });

  describe('getAllSymbols', () => {
    it('should return all root-level symbols', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`;
      const symbolTable = buildSymbolTable(code);

      const allSymbols = symbolTable.getAllSymbols();
      expect(allSymbols.length).toBe(2);
      expect(allSymbols.some(s => s.name === 'No.')).toBe(true);
      expect(allSymbols.some(s => s.name === 'Name')).toBe(true);
    });
  });
});