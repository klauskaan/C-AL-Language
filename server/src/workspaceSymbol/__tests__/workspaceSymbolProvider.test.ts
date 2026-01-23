/**
 * Tests for Workspace Symbol Provider (Ctrl+T)
 *
 * IMPORTANT: V1 Implementation Limitation
 * This provider searches only OPEN documents, not all workspace files.
 * Future enhancement: Integrate workspace-wide indexing.
 */

import { WorkspaceSymbolProvider } from '../workspaceSymbolProvider';
import { DocumentSymbolProvider } from '../../documentSymbol/documentSymbolProvider';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolKind, SymbolInformation } from 'vscode-languageserver';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { CALDocument } from '../../parser/ast';

/**
 * Helper to create a TextDocument from C/AL code
 */
function createDocument(content: string, uri = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Helper to parse a document and return AST
 */
function parseDocument(document: TextDocument): CALDocument {
  const lexer = new Lexer(document.getText());
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Helper to manage parsed documents for testing
 */
class ParsedDocumentManager {
  private documents: Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }> = [];

  add(doc: TextDocument): void {
    const ast = parseDocument(doc);
    this.documents.push({ uri: doc.uri, textDocument: doc, ast });
  }

  all(): Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }> {
    return this.documents;
  }
}

/**
 * Mock Connection for testing
 */
class MockConnection {
  console = {
    warn: jest.fn<void, [string]>(),
    error: jest.fn<void, [string]>(),
    log: jest.fn<void, [string]>()
  };
}

describe('WorkspaceSymbolProvider', () => {
  let provider: WorkspaceSymbolProvider;
  let parsedDocs: ParsedDocumentManager;
  let documentSymbolProvider: DocumentSymbolProvider;
  let mockConnection: MockConnection;

  beforeEach(() => {
    parsedDocs = new ParsedDocumentManager();
    documentSymbolProvider = new DocumentSymbolProvider();
    mockConnection = new MockConnection();
    provider = new WorkspaceSymbolProvider(
      documentSymbolProvider,
      mockConnection as any
    );
  });

  describe('Empty Workspace', () => {
    it('should return empty array when no documents open', () => {
      const result = provider.search('TestProc', parsedDocs.all());

      expect(result).toEqual([]);
    });

    it('should return empty array for empty query with no documents', () => {
      const result = provider.search('', parsedDocs.all());

      expect(result).toEqual([]);
    });
  });

  describe('Single Document Symbols', () => {
    it('should return symbols matching query from single document', () => {
      const code = `OBJECT Codeunit 50000 TestCode
{
  CODE
  {
    PROCEDURE MyTestProcedure@1();
    BEGIN
    END;

    PROCEDURE AnotherProc@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///test1.cal');
      parsedDocs.add(doc);

      const result = provider.search('Test', parsedDocs.all());

      // Should find MyTestProcedure (contains 'Test')
      expect(result.length).toBeGreaterThan(0);
      const procSymbol = result.find((s: SymbolInformation) => s.name.includes('MyTestProcedure'));
      expect(procSymbol).toBeDefined();
      expect(procSymbol?.kind).toBe(SymbolKind.Method);
    });

    it('should filter symbols by query string (case-insensitive)', () => {
      const code = `OBJECT Table 50000 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;Address         ;Text100       }
  }
  CODE
  {
    PROCEDURE ValidateNo@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///customer.cal');
      parsedDocs.add(doc);

      // Case-insensitive search for 'validate'
      const result = provider.search('validate', parsedDocs.all());

      expect(result.length).toBe(1);
      expect(result[0].name).toContain('ValidateNo');
      expect(result[0].kind).toBe(SymbolKind.Method);
    });

    it('should return empty array for non-matching query', () => {
      const code = `OBJECT Codeunit 50000 TestCode
{
  CODE
  {
    PROCEDURE MyProcedure@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///test.cal');
      parsedDocs.add(doc);

      const result = provider.search('NonExistentSymbol', parsedDocs.all());

      expect(result).toEqual([]);
    });

    it('should return all symbols when query is empty', () => {
      const code = `OBJECT Table 50000 Simple
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`;
      const doc = createDocument(code, 'file:///simple.cal');
      parsedDocs.add(doc);

      const result = provider.search('', parsedDocs.all());

      // Empty query returns ALL symbols (LSP spec)
      // Should include: 2 fields (FIELDS namespace excluded)
      expect(result.length).toBe(2);
    });
  });

  describe('Multiple Document Search', () => {
    it('should return symbols from multiple open documents', () => {
      const code1 = `OBJECT Codeunit 50001 Utils
{
  CODE
  {
    PROCEDURE FormatText@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const code2 = `OBJECT Table 50002 Data
{
  FIELDS
  {
    { 1   ;   ;Value           ;Integer       }
  }
}`;
      const doc1 = createDocument(code1, 'file:///utils.cal');
      const doc2 = createDocument(code2, 'file:///data.cal');
      parsedDocs.add(doc1);
      parsedDocs.add(doc2);

      const result = provider.search('', parsedDocs.all());

      // Should get symbols from both documents
      expect(result.length).toBeGreaterThan(0);
      const procSymbol = result.find((s: SymbolInformation) => s.name.includes('FormatText'));
      const fieldSymbol = result.find((s: SymbolInformation) => s.name.includes('Value'));
      expect(procSymbol).toBeDefined();
      expect(fieldSymbol).toBeDefined();
      expect(procSymbol?.location.uri).toBe('file:///utils.cal');
      expect(fieldSymbol?.location.uri).toBe('file:///data.cal');
    });

    it('should filter across multiple documents', () => {
      const code1 = `OBJECT Codeunit 50001 Validator
{
  CODE
  {
    PROCEDURE ValidateEmail@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const code2 = `OBJECT Codeunit 50002 Parser
{
  CODE
  {
    PROCEDURE ValidateXML@1();
    BEGIN
    END;

    PROCEDURE ParseData@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc1 = createDocument(code1, 'file:///validator.cal');
      const doc2 = createDocument(code2, 'file:///parser.cal');
      parsedDocs.add(doc1);
      parsedDocs.add(doc2);

      const result = provider.search('Validate', parsedDocs.all());

      // Should find both ValidateEmail and ValidateXML
      expect(result.length).toBe(2);
      const validateSymbols = result.filter((s: SymbolInformation) => s.name.includes('Validate'));
      expect(validateSymbols.length).toBe(2);

      // Should NOT find ParseData
      const parseSymbol = result.find((s: SymbolInformation) => s.name.includes('ParseData'));
      expect(parseSymbol).toBeUndefined();
    });
  });

  describe('Symbol Flattening and Nesting', () => {
    it('should flatten nested symbols (procedures under PROCEDURES namespace)', () => {
      const code = `OBJECT Codeunit 50000 MyCode
{
  CODE
  {
    PROCEDURE FirstProc@1();
    BEGIN
    END;

    PROCEDURE SecondProc@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///mycode.cal');
      parsedDocs.add(doc);

      const result = provider.search('', parsedDocs.all());

      // Should get flattened procedures, not the PROCEDURES group
      const procSymbols = result.filter((s: SymbolInformation) => s.kind === SymbolKind.Method);
      expect(procSymbols.length).toBe(2);
      expect(procSymbols.some((s: SymbolInformation) => s.name.includes('FirstProc'))).toBe(true);
      expect(procSymbols.some((s: SymbolInformation) => s.name.includes('SecondProc'))).toBe(true);
    });

    it('should preserve container name for nested symbols', () => {
      const code = `OBJECT Codeunit 50000 MyCode
{
  CODE
  {
    PROCEDURE MyProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///mycode.cal');
      parsedDocs.add(doc);

      const result = provider.search('MyProc', parsedDocs.all());

      expect(result.length).toBe(1);
      // Container should be "PROCEDURES" (the group it came from)
      expect(result[0].containerName).toBe('PROCEDURES');
    });

    it('should exclude namespace containers from results', () => {
      const code = `OBJECT Table 50000 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
  }
  KEYS
  {
    {    ;"No."                  ;Clustered=Yes }
  }
  CODE
  {
    VAR
      GlobalVar@1000 : Integer;

    PROCEDURE MyProc@1();
    BEGIN
    END;

    TRIGGER OnInsert@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///customer.cal');
      parsedDocs.add(doc);

      const result = provider.search('', parsedDocs.all());

      // Should NOT include: FIELDS, KEYS, VAR, PROCEDURES, TRIGGERS namespaces
      const namespaceSymbols = result.filter((s: SymbolInformation) => s.kind === SymbolKind.Namespace);
      expect(namespaceSymbols.length).toBe(0);

      // SHOULD include: field, key, variable, procedure, trigger
      const fieldSymbol = result.find((s: SymbolInformation) => s.kind === SymbolKind.Field);
      const keySymbol = result.find((s: SymbolInformation) => s.kind === SymbolKind.Key);
      const varSymbol = result.find((s: SymbolInformation) => s.kind === SymbolKind.Variable);
      const procSymbol = result.find((s: SymbolInformation) => s.kind === SymbolKind.Method);
      const triggerSymbol = result.find((s: SymbolInformation) => s.kind === SymbolKind.Event);

      expect(fieldSymbol).toBeDefined();
      expect(keySymbol).toBeDefined();
      expect(varSymbol).toBeDefined();
      expect(procSymbol).toBeDefined();
      expect(triggerSymbol).toBeDefined();
    });
  });

  describe('Symbol Kinds', () => {
    it('should preserve symbol kinds for triggers (Event)', () => {
      const code = `OBJECT Table 50000 Test
{
  CODE
  {
    TRIGGER OnInsert@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///test.cal');
      parsedDocs.add(doc);

      const result = provider.search('OnInsert', parsedDocs.all());

      expect(result.length).toBe(1);
      expect(result[0].kind).toBe(SymbolKind.Event);
    });

    it('should preserve symbol kinds for procedures (Method)', () => {
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
      const doc = createDocument(code, 'file:///test.cal');
      parsedDocs.add(doc);

      const result = provider.search('TestProc', parsedDocs.all());

      expect(result.length).toBe(1);
      expect(result[0].kind).toBe(SymbolKind.Method);
    });

    it('should preserve symbol kinds for fields (Field)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;MyField         ;Integer       }
  }
}`;
      const doc = createDocument(code, 'file:///test.cal');
      parsedDocs.add(doc);

      const result = provider.search('MyField', parsedDocs.all());

      expect(result.length).toBe(1);
      expect(result[0].kind).toBe(SymbolKind.Field);
    });

    it('should preserve symbol kinds for keys (Key)', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;"No."             ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
  KEYS
  {
    {    ;"No.",Name             ;Clustered=Yes }
  }
}`;
      const doc = createDocument(code, 'file:///test.cal');
      parsedDocs.add(doc);

      const result = provider.search('', parsedDocs.all());

      const keySymbol = result.find((s: SymbolInformation) => s.kind === SymbolKind.Key);
      expect(keySymbol).toBeDefined();
      expect(keySymbol?.name).toBe('(unnamed key)');
    });

    it('should preserve symbol kinds for variables (Variable)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      MyVariable@1000 : Integer;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///test.cal');
      parsedDocs.add(doc);

      const result = provider.search('MyVariable', parsedDocs.all());

      expect(result.length).toBe(1);
      expect(result[0].kind).toBe(SymbolKind.Variable);
    });
  });

  describe('Parse Errors and Edge Cases', () => {
    it('should handle document with parse errors gracefully', () => {
      const validCode = `OBJECT Codeunit 50000 ValidCode
{
  CODE
  {
    PROCEDURE ValidProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const invalidCode = `OBJECT Codeunit 50001 BrokenCode
{
  CODE
  {
    PROCEDURE BrokenProc@1(
    // Missing closing paren and body
`;
      const doc1 = createDocument(validCode, 'file:///valid.cal');
      const doc2 = createDocument(invalidCode, 'file:///broken.cal');
      parsedDocs.add(doc1);
      parsedDocs.add(doc2);

      const result = provider.search('', parsedDocs.all());

      // Should still return symbols from valid document
      expect(result.length).toBeGreaterThan(0);
      const validSymbol = result.find((s: SymbolInformation) => s.name.includes('ValidProc'));
      expect(validSymbol).toBeDefined();

      // Parser handles errors internally without throwing or logging warnings
      // The provider gracefully returns partial results from valid documents
    });

    it('should handle empty documents gracefully', () => {
      const emptyDoc = createDocument('', 'file:///empty.cal');
      parsedDocs.add(emptyDoc);

      const result = provider.search('Test', parsedDocs.all());

      expect(result).toEqual([]);
    });

    it('should handle documents with only object declaration', () => {
      const code = `OBJECT Codeunit 50000 Empty
{
}`;
      const doc = createDocument(code, 'file:///empty.cal');
      parsedDocs.add(doc);

      const result = provider.search('', parsedDocs.all());

      // No symbols inside the object
      expect(result).toEqual([]);
    });
  });

  describe('Location Information', () => {
    it('should include correct URI in symbol location', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const uri = 'file:///workspace/test.cal';
      const doc = createDocument(code, uri);
      parsedDocs.add(doc);

      const result = provider.search('MyProc', parsedDocs.all());

      expect(result.length).toBe(1);
      expect(result[0].location.uri).toBe(uri);
    });

    it('should include valid range in symbol location', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///test.cal');
      parsedDocs.add(doc);

      const result = provider.search('MyProc', parsedDocs.all());

      expect(result.length).toBe(1);
      expect(result[0].location.range).toBeDefined();
      expect(result[0].location.range.start.line).toBeGreaterThanOrEqual(0);
      expect(result[0].location.range.end.line).toBeGreaterThanOrEqual(
        result[0].location.range.start.line
      );
    });
  });

  describe('Partial Match Filtering', () => {
    it('should match substring anywhere in symbol name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyTestProcedure@1();
    BEGIN
    END;

    PROCEDURE TestUtility@2();
    BEGIN
    END;

    PROCEDURE UtilityMethod@3();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///test.cal');
      parsedDocs.add(doc);

      const result = provider.search('Test', parsedDocs.all());

      // Should match: MyTestProcedure, TestUtility (both contain 'Test')
      expect(result.length).toBe(2);
      expect(result.some((s: SymbolInformation) => s.name.includes('MyTestProcedure'))).toBe(true);
      expect(result.some((s: SymbolInformation) => s.name.includes('TestUtility'))).toBe(true);

      // Should NOT match: UtilityMethod
      expect(result.some((s: SymbolInformation) => s.name.includes('UtilityMethod') && !s.name.includes('Test'))).toBe(false);
    });

    it('should be case-insensitive', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProcedure@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///test.cal');
      parsedDocs.add(doc);

      const resultLower = provider.search('myprocedure', parsedDocs.all());
      const resultUpper = provider.search('MYPROCEDURE', parsedDocs.all());
      const resultMixed = provider.search('MyProCeDuRe', parsedDocs.all());

      expect(resultLower.length).toBe(1);
      expect(resultUpper.length).toBe(1);
      expect(resultMixed.length).toBe(1);
    });
  });

  describe('Complex Document Structures', () => {
    it('should handle table with all section types', () => {
      const code = `OBJECT Table 50000 ComplexTable
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
      GlobalCounter@1000 : Integer;

    PROCEDURE ValidateData@1();
    BEGIN
    END;

    TRIGGER OnInsert@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const doc = createDocument(code, 'file:///complex.cal');
      parsedDocs.add(doc);

      const result = provider.search('', parsedDocs.all());

      // Should include: 2 fields, 1 key, 1 variable, 1 procedure, 1 trigger = 6 symbols
      expect(result.length).toBe(6);

      const kinds = result.map((s: SymbolInformation) => s.kind);
      expect(kinds).toContain(SymbolKind.Field);
      expect(kinds).toContain(SymbolKind.Key);
      expect(kinds).toContain(SymbolKind.Variable);
      expect(kinds).toContain(SymbolKind.Method);
      expect(kinds).toContain(SymbolKind.Event);
    });
  });
});
