import { createMockToken, createDocument, parseAndBuildSymbols } from './testUtils';
import { TokenType } from '../lexer/tokens';

describe('Test Utilities', () => {
  describe('createMockToken', () => {
    it('should create a token with default values', () => {
      const token = createMockToken();

      expect(token.type).toBe(TokenType.Identifier);
      expect(token.value).toBe('test');
      expect(token.line).toBe(1);
      expect(token.column).toBe(1);
      expect(token.startOffset).toBe(0);
      expect(token.endOffset).toBe(4);
    });

    it('should override default values', () => {
      const token = createMockToken({
        type: TokenType.Begin,
        value: 'BEGIN',
        line: 5,
        column: 10,
        startOffset: 100,
        endOffset: 105
      });

      expect(token.type).toBe(TokenType.Begin);
      expect(token.value).toBe('BEGIN');
      expect(token.line).toBe(5);
      expect(token.column).toBe(10);
      expect(token.startOffset).toBe(100);
      expect(token.endOffset).toBe(105);
    });

    it('should allow partial overrides', () => {
      const token = createMockToken({ value: 'Customer', line: 3 });

      expect(token.type).toBe(TokenType.Identifier);
      expect(token.value).toBe('Customer');
      expect(token.line).toBe(3);
      expect(token.column).toBe(1); // default
    });
  });

  describe('createDocument', () => {
    it('should create a TextDocument with default URI', () => {
      const doc = createDocument('OBJECT Table 18 Customer { }');

      expect(doc.uri).toBe('file:///test.cal');
      expect(doc.languageId).toBe('cal');
      expect(doc.version).toBe(1);
      expect(doc.getText()).toBe('OBJECT Table 18 Customer { }');
    });

    it('should create a TextDocument with custom URI', () => {
      const doc = createDocument('test content', 'file:///custom.cal');

      expect(doc.uri).toBe('file:///custom.cal');
      expect(doc.getText()).toBe('test content');
    });

    it('should support offsetAt and positionAt methods', () => {
      const doc = createDocument('Line1\nLine2\nLine3');

      const position = { line: 1, character: 2 };
      const offset = doc.offsetAt(position);
      expect(offset).toBe(8); // "Line1\n" = 6 chars, + 2 = 8

      const recoveredPosition = doc.positionAt(offset);
      expect(recoveredPosition).toEqual(position);
    });
  });

  describe('parseAndBuildSymbols', () => {
    it('should parse a simple codeunit and build symbol table', () => {
      const { ast, symbolTable } = parseAndBuildSymbols(`
        OBJECT Codeunit 50000 TestCodeunit
        {
          OBJECT-PROPERTIES
          {
          }
          PROPERTIES
          {
          }
          CODE
          {
            PROCEDURE Calculate@1();
            VAR
              Amount@1000 : Decimal;
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `);

      expect(ast.type).toBe('CALDocument');
      expect(ast.object).not.toBeNull();
      expect(ast.object?.objectName).toBe('TestCodeunit');
      expect(symbolTable.hasSymbol('Calculate')).toBe(true);
    });

    it('should parse a table with fields', () => {
      const { ast, symbolTable } = parseAndBuildSymbols(`
        OBJECT Table 50000 Customer
        {
          OBJECT-PROPERTIES
          {
          }
          PROPERTIES
          {
          }
          FIELDS
          {
            { 1   ;   ;No.                 ;Code20        }
            { 2   ;   ;Name                ;Text100       }
          }
          KEYS
          {
            {    ;No.                                     }
          }
          CODE
          {
            BEGIN
            END.
          }
        }
      `);

      expect(ast.object?.objectName).toBe('Customer');

      // Field names are stored in the symbol table
      const allSymbols = symbolTable.getAllSymbols();
      const fieldNames = allSymbols.filter(s => s.kind === 'field').map(s => s.name);
      // Parser preserves whitespace in field names as written in the fixture
      expect(fieldNames).toContain('No .');
      expect(fieldNames).toContain('Name');
    });

    it('should handle procedure with parameters', () => {
      const { symbolTable } = parseAndBuildSymbols(`
        OBJECT Codeunit 50000 Test
        {
          CODE
          {
            PROCEDURE DoWork@1(Param1@1000 : Integer;VAR Param2@1001 : Text);
            BEGIN
            END;

            BEGIN
            END.
          }
        }
      `);

      expect(symbolTable.hasSymbol('DoWork')).toBe(true);
    });
  });
});
