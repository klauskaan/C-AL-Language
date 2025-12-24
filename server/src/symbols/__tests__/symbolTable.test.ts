/**
 * Symbol Table Tests
 *
 * Tests for the Scope class and SymbolTable scope hierarchy.
 * Verifies that symbols are properly scoped with parent/child relationships,
 * variable shadowing works correctly, and position-aware lookups function properly.
 */

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

describe('SymbolTable Class', () => {
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

    it('should create child scope for procedure', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure('TestProc', [], [], 100, 200)
        ]
      });

      symbolTable.buildFromAST(ast);

      const rootScope = symbolTable.getRootScope();
      expect(rootScope.children.length).toBe(1);
    });

    it('should add procedure parameters to procedure scope', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure(
            'Calculate',
            [
              createMockParameter('pInput', 'Integer', 110),
              createMockParameter('pOutput', 'Decimal', 130)
            ],
            [],
            100,
            200
          )
        ]
      });

      symbolTable.buildFromAST(ast);

      // Parameters should be in the procedure scope, not root
      expect(symbolTable.getRootScope().hasOwnSymbol('pInput')).toBe(false);
      expect(symbolTable.getRootScope().hasOwnSymbol('pOutput')).toBe(false);

      // But accessible via position-aware lookup
      const procScope = symbolTable.getScopeAtOffset(150);
      expect(procScope.hasOwnSymbol('pInput')).toBe(true);
      expect(procScope.hasOwnSymbol('pOutput')).toBe(true);

      const paramSymbol = procScope.getOwnSymbol('pInput');
      expect(paramSymbol?.kind).toBe('parameter');
      expect(paramSymbol?.type).toBe('Integer');
    });

    it('should add procedure local variables to procedure scope', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure(
            'ProcessData',
            [],
            [
              createMockVariable('lCounter', 'Integer', 120),
              createMockVariable('lTotal', 'Decimal', 140)
            ],
            100,
            200
          )
        ]
      });

      symbolTable.buildFromAST(ast);

      // Local variables should be in the procedure scope, not root
      expect(symbolTable.getRootScope().hasOwnSymbol('lCounter')).toBe(false);

      // But accessible via position-aware lookup
      const procScope = symbolTable.getScopeAtOffset(150);
      expect(procScope.hasOwnSymbol('lCounter')).toBe(true);
      expect(procScope.hasOwnSymbol('lTotal')).toBe(true);
    });
  });

  describe('buildFromAST - Triggers', () => {
    it('should create child scope for trigger', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        triggers: [
          createMockTrigger('OnInsert', [], 100, 200)
        ]
      });

      symbolTable.buildFromAST(ast);

      const rootScope = symbolTable.getRootScope();
      expect(rootScope.children.length).toBe(1);
    });

    it('should add trigger local variables to trigger scope', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        triggers: [
          createMockTrigger(
            'OnValidate',
            [
              createMockVariable('lOldValue', 'Text', 120),
              createMockVariable('lNewValue', 'Text', 140)
            ],
            100,
            200
          )
        ]
      });

      symbolTable.buildFromAST(ast);

      // Local variables should not be in root scope
      expect(symbolTable.getRootScope().hasOwnSymbol('lOldValue')).toBe(false);

      // But accessible via position-aware lookup
      const triggerScope = symbolTable.getScopeAtOffset(150);
      expect(triggerScope.hasOwnSymbol('lOldValue')).toBe(true);
      expect(triggerScope.hasOwnSymbol('lNewValue')).toBe(true);
    });
  });

  describe('getScopeAtOffset', () => {
    it('should return root scope for offset outside any procedure', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure('TestProc', [], [], 100, 200)
        ]
      });

      symbolTable.buildFromAST(ast);

      const scope = symbolTable.getScopeAtOffset(50);
      expect(scope).toBe(symbolTable.getRootScope());
    });

    it('should return procedure scope for offset inside procedure', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure('TestProc', [], [], 100, 200)
        ]
      });

      symbolTable.buildFromAST(ast);

      const scope = symbolTable.getScopeAtOffset(150);
      expect(scope).not.toBe(symbolTable.getRootScope());
      expect(scope.parent).toBe(symbolTable.getRootScope());
    });

    it('should find correct procedure scope when multiple procedures exist', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure(
            'FirstProc',
            [createMockParameter('p1', 'Integer', 110)],
            [],
            100,
            200
          ),
          createMockProcedure(
            'SecondProc',
            [createMockParameter('p2', 'Text', 310)],
            [],
            300,
            400
          )
        ]
      });

      symbolTable.buildFromAST(ast);

      const firstScope = symbolTable.getScopeAtOffset(150);
      expect(firstScope.hasOwnSymbol('p1')).toBe(true);
      expect(firstScope.hasOwnSymbol('p2')).toBe(false);

      const secondScope = symbolTable.getScopeAtOffset(350);
      expect(secondScope.hasOwnSymbol('p2')).toBe(true);
      expect(secondScope.hasOwnSymbol('p1')).toBe(false);
    });
  });

  describe('getSymbolAtOffset', () => {
    it('should find global symbol from anywhere', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        globalVariables: [createMockVariable('gCounter', 'Integer', 10)],
        procedures: [createMockProcedure('TestProc', [], [], 100, 200)]
      });

      symbolTable.buildFromAST(ast);

      // From root context
      expect(symbolTable.getSymbolAtOffset('gCounter', 50)?.name).toBe('gCounter');

      // From inside procedure
      expect(symbolTable.getSymbolAtOffset('gCounter', 150)?.name).toBe('gCounter');
    });

    it('should find local symbol inside procedure', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure(
            'TestProc',
            [createMockParameter('pParam', 'Integer', 110)],
            [createMockVariable('lLocal', 'Text', 130)],
            100,
            200
          )
        ]
      });

      symbolTable.buildFromAST(ast);

      // Inside procedure - should find local symbols
      expect(symbolTable.getSymbolAtOffset('pParam', 150)?.kind).toBe('parameter');
      expect(symbolTable.getSymbolAtOffset('lLocal', 150)?.kind).toBe('variable');

      // Outside procedure - should not find local symbols
      expect(symbolTable.getSymbolAtOffset('pParam', 50)).toBeUndefined();
      expect(symbolTable.getSymbolAtOffset('lLocal', 50)).toBeUndefined();
    });

    it('should shadow global variable with local variable of same name', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        globalVariables: [createMockVariable('x', 'Integer', 10)],
        procedures: [
          createMockProcedure(
            'TestProc',
            [],
            [createMockVariable('x', 'Text', 120)],
            100,
            200
          )
        ]
      });

      symbolTable.buildFromAST(ast);

      // Outside procedure - should find global x (Integer)
      const globalX = symbolTable.getSymbolAtOffset('x', 50);
      expect(globalX?.type).toBe('Integer');

      // Inside procedure - should find local x (Text) which shadows global
      const localX = symbolTable.getSymbolAtOffset('x', 150);
      expect(localX?.type).toBe('Text');
    });
  });

  describe('getAllSymbols', () => {
    it('should return symbols from all scopes', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        fields: [createMockField(1, 'FieldA', 'Code20', 10)],
        globalVariables: [createMockVariable('gVar', 'Integer', 50)],
        procedures: [
          createMockProcedure(
            'MyProc',
            [createMockParameter('pParam', 'Text', 110)],
            [createMockVariable('lLocal', 'Decimal', 130)],
            100,
            200
          )
        ]
      });

      symbolTable.buildFromAST(ast);

      const allSymbols = symbolTable.getAllSymbols();

      // Should have: FieldA, gVar, MyProc, pParam, lLocal
      expect(allSymbols.length).toBe(5);

      const names = allSymbols.map(s => s.name);
      expect(names).toContain('FieldA');
      expect(names).toContain('gVar');
      expect(names).toContain('MyProc');
      expect(names).toContain('pParam');
      expect(names).toContain('lLocal');
    });

    it('should include symbols from multiple procedure scopes', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure('Proc1', [], [createMockVariable('var1', 'Integer', 110)], 100, 200),
          createMockProcedure('Proc2', [], [createMockVariable('var2', 'Text', 310)], 300, 400)
        ]
      });

      symbolTable.buildFromAST(ast);

      const allSymbols = symbolTable.getAllSymbols();
      const names = allSymbols.map(s => s.name);

      expect(names).toContain('Proc1');
      expect(names).toContain('Proc2');
      expect(names).toContain('var1');
      expect(names).toContain('var2');
    });
  });

  describe('getSymbol (root scope lookup)', () => {
    it('should find symbol from root scope chain', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        globalVariables: [createMockVariable('gTest', 'Integer', 10)]
      });

      symbolTable.buildFromAST(ast);

      expect(symbolTable.getSymbol('gTest')?.name).toBe('gTest');
    });

    it('should be case-insensitive', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        globalVariables: [createMockVariable('MyVariable', 'Integer', 10)]
      });

      symbolTable.buildFromAST(ast);

      expect(symbolTable.getSymbol('myvariable')).toBeDefined();
      expect(symbolTable.getSymbol('MYVARIABLE')).toBeDefined();
      expect(symbolTable.getSymbol('MyVariable')).toBeDefined();
    });
  });

  describe('hasSymbol (root scope lookup)', () => {
    it('should return true for global symbol', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        globalVariables: [createMockVariable('gExists', 'Integer', 10)]
      });

      symbolTable.buildFromAST(ast);

      expect(symbolTable.hasSymbol('gExists')).toBe(true);
    });

    it('should return false for unknown symbol', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({});

      symbolTable.buildFromAST(ast);

      expect(symbolTable.hasSymbol('doesNotExist')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty procedure scope', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [createMockProcedure('EmptyProc', [], [], 100, 200)]
      });

      symbolTable.buildFromAST(ast);

      const procScope = symbolTable.getScopeAtOffset(150);
      expect(procScope.getOwnSymbols()).toEqual([]);
      expect(procScope.parent).toBe(symbolTable.getRootScope());
    });

    it('should handle procedure with only parameters', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure(
            'ParamOnlyProc',
            [createMockParameter('p1', 'Integer', 110)],
            [],
            100,
            200
          )
        ]
      });

      symbolTable.buildFromAST(ast);

      const procScope = symbolTable.getScopeAtOffset(150);
      expect(procScope.getOwnSymbols().length).toBe(1);
      expect(procScope.hasOwnSymbol('p1')).toBe(true);
    });

    it('should handle multiple procedures and triggers', () => {
      const symbolTable = new SymbolTable();
      const ast = createMockAST({
        procedures: [
          createMockProcedure('Proc1', [], [], 100, 200),
          createMockProcedure('Proc2', [], [], 300, 400)
        ],
        triggers: [
          createMockTrigger('OnInsert', [], 500, 600),
          createMockTrigger('OnModify', [], 700, 800)
        ]
      });

      symbolTable.buildFromAST(ast);

      const rootScope = symbolTable.getRootScope();
      // 2 procedures + 2 triggers = 4 child scopes
      expect(rootScope.children.length).toBe(4);
    });

    it('should rebuild symbol table on multiple buildFromAST calls', () => {
      const symbolTable = new SymbolTable();

      // First build
      const ast1 = createMockAST({
        globalVariables: [createMockVariable('var1', 'Integer', 10)]
      });
      symbolTable.buildFromAST(ast1);
      expect(symbolTable.hasSymbol('var1')).toBe(true);

      // Second build (should replace)
      const ast2 = createMockAST({
        globalVariables: [createMockVariable('var2', 'Text', 10)]
      });
      symbolTable.buildFromAST(ast2);

      expect(symbolTable.hasSymbol('var1')).toBe(false);
      expect(symbolTable.hasSymbol('var2')).toBe(true);
    });
  });
});
