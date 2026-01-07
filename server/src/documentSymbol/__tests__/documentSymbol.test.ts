import { DocumentSymbolProvider } from '../documentSymbolProvider';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolKind } from 'vscode-languageserver';

/**
 * Helper to create a TextDocument from C/AL code
 */
function createDocument(content: string, uri = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to parse C/AL code into AST
 */
function parseContent(content: string) {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return { ast, parser };
}

describe('DocumentSymbolProvider', () => {
  let provider: DocumentSymbolProvider;

  beforeEach(() => {
    provider = new DocumentSymbolProvider();
  });

  describe('Basic Functionality', () => {
    it('should return empty array for empty file', () => {
      const code = '';
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols).toEqual([]);
    });

    it('should return root symbol for object declaration', () => {
      const code = `OBJECT Table 50000 Test
{
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      expect(symbols[0].name).toBe('Table 50000 "Test"');
      expect(symbols[0].kind).toBe(SymbolKind.Class);
    });

    it('should handle different object types', () => {
      const testCases = [
        { code: 'OBJECT Table 50000 Test\n{\n}', expected: 'Table 50000 "Test"' },
        { code: 'OBJECT Codeunit 50000 Test\n{\n}', expected: 'Codeunit 50000 "Test"' },
        { code: 'OBJECT Page 50000 Test\n{\n}', expected: 'Page 50000 "Test"' },
        { code: 'OBJECT Report 50000 Test\n{\n}', expected: 'Report 50000 "Test"' },
        { code: 'OBJECT Query 50000 Test\n{\n}', expected: 'Query 50000 "Test"' },
        { code: 'OBJECT XMLport 50000 Test\n{\n}', expected: 'XMLport 50000 "Test"' },
      ];

      for (const { code, expected } of testCases) {
        const doc = createDocument(code);
        const { ast } = parseContent(code);
        const symbols = provider.getDocumentSymbols(doc, ast);

        expect(symbols.length).toBe(1);
        expect(symbols[0].name).toBe(expected);
      }
    });
  });

  describe('Field Section', () => {
    it('should include FIELDS group for table with fields', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);

      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      expect(symbols[0].children).toBeDefined();

      const fieldsGroup = symbols[0].children?.find(c => c.name === 'FIELDS');
      expect(fieldsGroup).toBeDefined();
      expect(fieldsGroup?.kind).toBe(SymbolKind.Namespace);
      expect(fieldsGroup?.children?.length).toBe(2);
    });

    it('should show field details with type information', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const fieldsGroup = symbols[0].children?.find(c => c.name === 'FIELDS');
      const field = fieldsGroup?.children?.[0];

      expect(field?.name).toBe('1 "No."');
      expect(field?.kind).toBe(SymbolKind.Field);
      expect(field?.detail).toBe('Code[20]');
    });
  });

  describe('Keys Section', () => {
    it('should include KEYS group for table with keys', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
  KEYS
  {
    {    ;"No."                  ;Clustered=Yes }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const keysGroup = symbols[0].children?.find(c => c.name === 'KEYS');
      expect(keysGroup).toBeDefined();
      expect(keysGroup?.kind).toBe(SymbolKind.Namespace);
      expect(keysGroup?.children?.length).toBe(1);
      expect(keysGroup?.children?.[0].kind).toBe(SymbolKind.Key);
    });
  });

  describe('Code Section', () => {
    it('should include PROCEDURES group for codeunit with procedures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    PROCEDURE AnotherProc@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      expect(proceduresGroup).toBeDefined();
      expect(proceduresGroup?.kind).toBe(SymbolKind.Namespace);
      expect(proceduresGroup?.children?.length).toBe(2);
    });

    it('should show procedure signature with parameters', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(Param1@1000 : Integer;VAR Param2@1001 : Text);
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('TestProc(Param1: Integer; VAR Param2: Text)');
      expect(proc?.kind).toBe(SymbolKind.Method);
    });

    it('should show procedure return type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestFunc@1() : Boolean;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const func = proceduresGroup?.children?.[0];

      expect(func?.name).toBe('TestFunc() : Boolean');
    });

    it('should show LOCAL prefix for local procedures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    LOCAL PROCEDURE LocalProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      expect(proc?.name).toBe('LOCAL LocalProc()');
    });

    it('should include TRIGGERS group for object with triggers', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    TRIGGER OnRun@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const triggersGroup = symbols[0].children?.find(c => c.name === 'TRIGGERS');
      expect(triggersGroup).toBeDefined();
      expect(triggersGroup?.kind).toBe(SymbolKind.Namespace);
      expect(triggersGroup?.children?.length).toBe(1);
      expect(triggersGroup?.children?.[0].name).toBe('OnRun');
      expect(triggersGroup?.children?.[0].kind).toBe(SymbolKind.Event);
    });

    it('should include VAR group for global variables', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      GlobalVar@1000 : Integer;
      AnotherVar@1001 : Text;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const varGroup = symbols[0].children?.find(c => c.name === 'VAR');
      expect(varGroup).toBeDefined();
      expect(varGroup?.kind).toBe(SymbolKind.Namespace);
      expect(varGroup?.children?.length).toBe(2);

      const globalVar = varGroup?.children?.[0];
      expect(globalVar?.name).toBe('GlobalVar');
      expect(globalVar?.kind).toBe(SymbolKind.Variable);
      expect(globalVar?.detail).toBe('Integer');
    });

    it('should NOT show local variables in procedures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      LocalVar@1000 : Integer;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      // Should NOT have a VAR group (no global variables)
      const varGroup = symbols[0].children?.find(c => c.name === 'VAR');
      expect(varGroup).toBeUndefined();

      // Procedure should NOT have children (local vars not shown)
      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];
      expect(proc?.children).toBeUndefined();
    });
  });

  describe('Hierarchical Structure', () => {
    it('should create proper hierarchy for complete table', () => {
      const code = `OBJECT Table 50000 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
  KEYS
  {
    {    ;"No."                  ;Clustered=Yes }
  }
  CODE
  {
    VAR
      TempRec@1000 : Record 50000;

    PROCEDURE ValidateNo@1();
    BEGIN
    END;

    TRIGGER OnInsert@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      const root = symbols[0];

      expect(root.name).toBe('Table 50000 "Customer"');
      expect(root.children?.length).toBe(5); // FIELDS, KEYS, VAR, TRIGGERS, PROCEDURES

      const groups = root.children!.map(c => c.name);
      expect(groups).toContain('FIELDS');
      expect(groups).toContain('KEYS');
      expect(groups).toContain('VAR');
      expect(groups).toContain('TRIGGERS');
      expect(groups).toContain('PROCEDURES');
    });
  });

  describe('Range Information', () => {
    it('should have correct range for object (0-based lines)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      // Object starts on line 1 (0-based: 0)
      expect(symbols[0].range.start.line).toBe(0);
      expect(symbols[0].selectionRange.start.line).toBe(0);
    });

    it('should have valid range and selectionRange', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      const proceduresGroup = symbols[0].children?.find(c => c.name === 'PROCEDURES');
      const proc = proceduresGroup?.children?.[0];

      // All ranges should be valid
      expect(proc?.range).toBeDefined();
      expect(proc?.selectionRange).toBeDefined();
      expect(proc?.range.start.line).toBeGreaterThanOrEqual(0);
      expect(proc?.range.end.line).toBeGreaterThanOrEqual(proc?.range.start.line ?? 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle object with no sections', () => {
      const code = `OBJECT Codeunit 50000 Empty
{
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      expect(symbols[0].name).toBe('Codeunit 50000 "Empty"');
      expect(symbols[0].children).toEqual([]);
    });

    it('should handle quoted object names', () => {
      const code = `OBJECT Table 50000 "Sales Header"
{
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols[0].name).toBe('Table 50000 "Sales Header"');
    });

    it('should handle table with only fields (no code section)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
}`;
      const doc = createDocument(code);
      const { ast } = parseContent(code);
      const symbols = provider.getDocumentSymbols(doc, ast);

      expect(symbols.length).toBe(1);
      const fieldsGroup = symbols[0].children?.find(c => c.name === 'FIELDS');
      expect(fieldsGroup).toBeDefined();
      expect(fieldsGroup?.children?.length).toBe(1);
    });
  });
});
