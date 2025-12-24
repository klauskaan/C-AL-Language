/**
 * Tests for Go to Definition Provider
 */

import { DefinitionProvider } from '../definitionProvider';
import { SymbolTable } from '../../symbols/symbolTable';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Location } from 'vscode-languageserver';

/**
 * Helper to create a TextDocument from a string
 */
function createDocument(content: string, uri: string = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to create a mock token for tests with required properties
 */
function mockToken(overrides: { line?: number; column?: number; value?: string } = {}): any {
  return {
    type: 'IDENTIFIER',
    value: overrides.value || 'test',
    line: overrides.line || 1,
    column: overrides.column || 1,
    startOffset: 0,
    endOffset: 4
  };
}

/**
 * Helper to parse content and build symbol table
 */
function parseAndBuildSymbols(content: string): { ast: any; symbolTable: SymbolTable } {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);
  return { ast, symbolTable };
}

describe('DefinitionProvider', () => {
  let provider: DefinitionProvider;

  beforeEach(() => {
    provider = new DefinitionProvider();
  });

  describe('Basic Symbol Lookup', () => {
    it('should find variable definition', () => {
      const doc = createDocument('MyVar');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'MyVar',
        kind: 'variable',
        token: mockToken({ line: 5, column: 3, value: 'MyVar' }),
        type: 'Integer'
      });

      const result = provider.getDefinition(doc, Position.create(0, 2), undefined, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.uri).toBe('file:///test.cal');
      expect(result?.range.start.line).toBe(4); // 0-based (line 5 -> 4)
      expect(result?.range.start.character).toBe(2); // 0-based (column 3 -> 2)
    });

    it('should find procedure definition', () => {
      const doc = createDocument('MyProcedure');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'MyProcedure',
        kind: 'procedure',
        token: mockToken({ line: 10, column: 1, value: 'MyProcedure' })
      });

      const result = provider.getDefinition(doc, Position.create(0, 5), undefined, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.range.start.line).toBe(9);
      expect(result?.range.start.character).toBe(0);
    });

    it('should find field definition', () => {
      const doc = createDocument('Name');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'Name',
        kind: 'field',
        token: mockToken({ line: 3, column: 5, value: 'Name' }),
        type: 'Text100'
      });

      const result = provider.getDefinition(doc, Position.create(0, 2), undefined, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.range.start.line).toBe(2);
      expect(result?.range.start.character).toBe(4);
    });

    it('should return null for unknown symbol', () => {
      const doc = createDocument('UnknownSymbol');

      const symbolTable = new SymbolTable();
      // Empty symbol table - no symbols added

      const result = provider.getDefinition(doc, Position.create(0, 5), undefined, symbolTable);

      expect(result).toBeNull();
    });

    it('should return null when not on identifier', () => {
      const doc = createDocument('   ');
      const symbolTable = new SymbolTable();

      const result = provider.getDefinition(doc, Position.create(0, 1), undefined, symbolTable);

      expect(result).toBeNull();
    });
  });

  describe('Case Insensitivity', () => {
    it('should find symbol regardless of case', () => {
      const doc = createDocument('myvar');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'MyVar',
        kind: 'variable',
        token: mockToken({ value: 'MyVar' }),
        type: 'Integer'
      });

      const result = provider.getDefinition(doc, Position.create(0, 2), undefined, symbolTable);

      expect(result).not.toBeNull();
    });

    it('should find UPPERCASE reference to lowercase symbol', () => {
      const doc = createDocument('MYVAR');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'myvar',
        kind: 'variable',
        token: mockToken({ value: 'myvar' }),
        type: 'Integer'
      });

      const result = provider.getDefinition(doc, Position.create(0, 2), undefined, symbolTable);

      expect(result).not.toBeNull();
    });
  });

  describe('Integration with Parser', () => {
    it('should find variable definition from parsed code', () => {
      // Code with variable declaration and usage
      // Parser expects: { fieldNo ; fieldName ; dataType } and CODE without braces
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  VAR
    Counter : Integer;

  PROCEDURE DoSomething();
  BEGIN
    Counter := 1;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseAndBuildSymbols(code);

      // Find the line where Counter is USED (not defined)
      const lines = code.split('\n');
      const usageLineIndex = lines.findIndex(l => l.includes('Counter := 1'));

      // Position cursor on 'Counter' in the usage line
      const usageLine = lines[usageLineIndex];
      const counterCol = usageLine.indexOf('Counter');

      const result = provider.getDefinition(doc, Position.create(usageLineIndex, counterCol + 3), ast, symbolTable);

      expect(result).not.toBeNull();
      // Should point to where Counter is DEFINED in VAR section
      const defLineIndex = lines.findIndex(l => l.includes('Counter : Integer'));
      expect(result?.range.start.line).toBe(defLineIndex);
    });

    it('should find field definition from parsed code', () => {
      // Parser expects: { fieldNo ; fieldName ; dataType } and CODE without braces
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
  { 2 ;   ; Name ; Text50 }
}
CODE
  PROCEDURE DoSomething();
  BEGIN
    Name := 'Test';
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseAndBuildSymbols(code);

      // Find where Name is USED
      const lines = code.split('\n');
      const usageLineIndex = lines.findIndex(l => l.includes("Name := 'Test'"));
      const usageLine = lines[usageLineIndex];
      const nameCol = usageLine.indexOf('Name');

      const result = provider.getDefinition(doc, Position.create(usageLineIndex, nameCol + 2), ast, symbolTable);

      expect(result).not.toBeNull();
      // Should point to field definition
      const defLineIndex = lines.findIndex(l => l.includes('Name ; Text50'));
      expect(result?.range.start.line).toBe(defLineIndex);
    });

    it('should find procedure definition from parsed code', () => {
      // Parser expects: { fieldNo ; fieldName ; dataType } and CODE without braces
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; No ; Code10 }
}
CODE
  PROCEDURE MyProcedure();
  BEGIN
  END;

  PROCEDURE CallIt();
  BEGIN
    MyProcedure;
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseAndBuildSymbols(code);

      // Find where MyProcedure is CALLED (not defined)
      const lines = code.split('\n');
      const usageLineIndex = lines.findIndex(l => l.trim() === 'MyProcedure;');
      const usageLine = lines[usageLineIndex];
      const procCol = usageLine.indexOf('MyProcedure');

      const result = provider.getDefinition(doc, Position.create(usageLineIndex, procCol + 5), ast, symbolTable);

      expect(result).not.toBeNull();
      // Should point to procedure definition
      const defLineIndex = lines.findIndex(l => l.includes('PROCEDURE MyProcedure'));
      expect(result?.range.start.line).toBe(defLineIndex);
    });
  });

  describe('Field Access (Dot Notation)', () => {
    it('should find field definition after dot via symbol table', () => {
      // Fields are added to symbol table, so Rec.CustomerName should still find CustomerName
      // Parser expects: { fieldNo ; fieldName ; dataType } and CODE without braces
      const code = `OBJECT Table 50000 Test
FIELDS
{
  { 1 ;   ; CustomerNo ; Code20 }
  { 2 ;   ; CustomerName ; Text100 }
}
CODE
  PROCEDURE DoSomething();
  VAR
    Rec : Record 50000;
  BEGIN
    Rec.CustomerName := 'Test';
  END;

  BEGIN
  END.`;
      const doc = createDocument(code);
      const { ast, symbolTable } = parseAndBuildSymbols(code);

      // Find the line with Rec.CustomerName
      const lines = code.split('\n');
      const usageLineIndex = lines.findIndex(l => l.includes('Rec.CustomerName'));
      const usageLine = lines[usageLineIndex];
      // Position cursor on 'CustomerName' (after the dot)
      const dotPos = usageLine.indexOf('.');
      const customerNameCol = dotPos + 1; // right after the dot

      const result = provider.getDefinition(doc, Position.create(usageLineIndex, customerNameCol + 5), ast, symbolTable);

      // Should find CustomerName in the symbol table (as a field)
      expect(result).not.toBeNull();
      const defLineIndex = lines.findIndex(l => l.includes('CustomerName ; Text100'));
      expect(result?.range.start.line).toBe(defLineIndex);
    });

    it('should find field via direct symbol table lookup', () => {
      // When the identifier is a known field, it should be found
      const doc = createDocument('CustomerName');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'CustomerName',
        kind: 'field',
        token: mockToken({ line: 5, column: 10, value: 'CustomerName' }),
        type: 'Text100'
      });

      const result = provider.getDefinition(doc, Position.create(0, 5), undefined, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.range.start.line).toBe(4); // Line 5 (1-based) -> 4 (0-based)
    });
  });

  describe('Location Range Accuracy', () => {
    it('should return correct range for symbol', () => {
      const doc = createDocument('TestSymbol');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'TestSymbol',
        kind: 'variable',
        token: mockToken({ line: 10, column: 5, value: 'TestSymbol' }),
        type: 'Integer'
      });

      const result = provider.getDefinition(doc, Position.create(0, 5), undefined, symbolTable);

      expect(result).not.toBeNull();
      // Line 10 (1-based) -> 9 (0-based)
      expect(result?.range.start.line).toBe(9);
      expect(result?.range.end.line).toBe(9);
      // Column 5 (1-based) -> 4 (0-based)
      expect(result?.range.start.character).toBe(4);
      // End character = start + length of 'TestSymbol' (10)
      expect(result?.range.end.character).toBe(14);
    });

    it('should include correct URI in location', () => {
      const uri = 'file:///home/user/project/test.cal';
      const doc = createDocument('MyVar', uri);

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'MyVar',
        kind: 'variable',
        token: mockToken({ value: 'MyVar' }),
        type: 'Integer'
      });

      const result = provider.getDefinition(doc, Position.create(0, 2), undefined, symbolTable);

      expect(result).not.toBeNull();
      expect(result?.uri).toBe(uri);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      const doc = createDocument('');
      const symbolTable = new SymbolTable();

      const result = provider.getDefinition(doc, Position.create(0, 0), undefined, symbolTable);

      expect(result).toBeNull();
    });

    it('should handle cursor at start of identifier', () => {
      const doc = createDocument('MyVar');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'MyVar',
        kind: 'variable',
        token: mockToken({ value: 'MyVar' })
      });

      const result = provider.getDefinition(doc, Position.create(0, 0), undefined, symbolTable);

      expect(result).not.toBeNull();
    });

    it('should handle cursor at end of identifier', () => {
      const doc = createDocument('MyVar');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'MyVar',
        kind: 'variable',
        token: mockToken({ value: 'MyVar' })
      });

      const result = provider.getDefinition(doc, Position.create(0, 5), undefined, symbolTable);

      // Should still work when cursor is at end of identifier
      expect(result).not.toBeNull();
    });

    it('should handle identifiers with underscores', () => {
      const doc = createDocument('My_Var_Name');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'My_Var_Name',
        kind: 'variable',
        token: mockToken({ value: 'My_Var_Name' })
      });

      const result = provider.getDefinition(doc, Position.create(0, 5), undefined, symbolTable);

      expect(result).not.toBeNull();
    });

    it('should handle identifiers with numbers', () => {
      const doc = createDocument('Var123');

      const symbolTable = new SymbolTable();
      symbolTable.getRootScope().addSymbol({
        name: 'Var123',
        kind: 'variable',
        token: mockToken({ value: 'Var123' })
      });

      const result = provider.getDefinition(doc, Position.create(0, 3), undefined, symbolTable);

      expect(result).not.toBeNull();
    });

    it('should not match keywords', () => {
      // Keywords like BEGIN, END, IF should not be treated as symbol definitions
      const doc = createDocument('BEGIN');
      const symbolTable = new SymbolTable();
      // Empty - no BEGIN defined

      const result = provider.getDefinition(doc, Position.create(0, 2), undefined, symbolTable);

      expect(result).toBeNull();
    });
  });

  describe('Without Symbol Table', () => {
    it('should return null when no symbol table provided', () => {
      const doc = createDocument('MyVar');

      const result = provider.getDefinition(doc, Position.create(0, 2), undefined, undefined);

      expect(result).toBeNull();
    });
  });
});
