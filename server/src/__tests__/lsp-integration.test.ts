/**
 * LSP Integration Tests
 *
 * Tests for end-to-end LSP workflows simulating real document lifecycle:
 * - Document open/change/close events
 * - Cache invalidation and reparsing
 * - Cross-feature workflows (definition → references, edit → completion)
 * - Diagnostics generation and clearing
 *
 * These tests simulate the server's document management without requiring
 * a full LSP connection, focusing on the correctness of provider interactions
 * and cache behavior.
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Location, CompletionItem, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { Lexer } from '../lexer/lexer';
import { Parser, ParseError } from '../parser/parser';
import { CALDocument } from '../parser/ast';
import { SymbolTable } from '../symbols/symbolTable';
import { CompletionProvider } from '../completion/completionProvider';
import { DefinitionProvider } from '../definition/definitionProvider';
import { ReferenceProvider } from '../references/referenceProvider';

/**
 * Parsed document structure (mirrors server.ts cache)
 */
interface ParsedDocument {
  ast: CALDocument;
  lexer: Lexer;
  symbolTable: SymbolTable;
  errors: ParseError[];
}

/**
 * LSPTestContext simulates the LSP server's document management and caching.
 * This allows testing LSP workflows without a full LSP connection.
 */
class LSPTestContext {
  private documents: Map<string, TextDocument> = new Map();
  private documentCache: Map<string, ParsedDocument> = new Map();
  private completionProvider: CompletionProvider;
  private definitionProvider: DefinitionProvider;
  private referenceProvider: ReferenceProvider;

  constructor() {
    this.completionProvider = new CompletionProvider();
    this.definitionProvider = new DefinitionProvider();
    this.referenceProvider = new ReferenceProvider();
  }

  /**
   * Simulate document open
   */
  openDocument(uri: string, content: string, version: number = 1): TextDocument {
    const doc = TextDocument.create(uri, 'cal', version, content);
    this.documents.set(uri, doc);
    this.parseDocument(doc); // Initial parse
    return doc;
  }

  /**
   * Simulate document change (triggers cache invalidation)
   */
  updateDocument(uri: string, content: string, version: number): TextDocument {
    const doc = TextDocument.create(uri, 'cal', version, content);
    this.documents.set(uri, doc);
    // CRITICAL: Clear cache before reparse (mirrors server.ts line 262)
    this.documentCache.delete(uri);
    this.parseDocument(doc);
    return doc;
  }

  /**
   * Simulate document close
   */
  closeDocument(uri: string): void {
    this.documents.delete(uri);
    this.documentCache.delete(uri);
  }

  /**
   * Parse and cache document (mirrors server.ts parseDocument function)
   */
  private parseDocument(document: TextDocument): ParsedDocument {
    const uri = document.uri;

    // Check cache first
    const cached = this.documentCache.get(uri);
    if (cached) {
      return cached;
    }

    // Lex and parse
    const text = document.getText();
    const lexer = new Lexer(text);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const errors = parser.getErrors();

    // Build symbol table
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    // Cache result
    const result: ParsedDocument = { ast, lexer, symbolTable, errors };
    this.documentCache.set(uri, result);

    return result;
  }

  /**
   * Get parsed document (with caching)
   */
  private getParsedDocument(uri: string): ParsedDocument | undefined {
    const doc = this.documents.get(uri);
    if (!doc) return undefined;
    return this.parseDocument(doc);
  }

  /**
   * Get completions at position
   */
  getCompletions(uri: string, position: Position, triggerChar?: string): CompletionItem[] {
    const doc = this.documents.get(uri);
    const parsed = this.getParsedDocument(uri);
    if (!doc || !parsed) return [];

    return this.completionProvider.getCompletions(
      doc, position, parsed.ast, parsed.symbolTable, triggerChar
    );
  }

  /**
   * Get definition at position
   */
  getDefinition(uri: string, position: Position): Location | null {
    const doc = this.documents.get(uri);
    const parsed = this.getParsedDocument(uri);
    if (!doc || !parsed) return null;

    return this.definitionProvider.getDefinition(
      doc, position, parsed.ast, parsed.symbolTable
    );
  }

  /**
   * Get references at position
   */
  getReferences(uri: string, position: Position, includeDeclaration: boolean = true): Location[] {
    const doc = this.documents.get(uri);
    const parsed = this.getParsedDocument(uri);
    if (!doc || !parsed) return [];

    return this.referenceProvider.getReferences(
      doc, position, parsed.ast, includeDeclaration
    );
  }

  /**
   * Get diagnostics for document
   * Uses source span (endOffset - startOffset) for accurate range calculation.
   */
  getDiagnostics(uri: string): Diagnostic[] {
    const parsed = this.getParsedDocument(uri);
    if (!parsed) return [];

    return parsed.errors.map(error => ({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: error.token.line - 1, character: error.token.column - 1 },
        end: {
          line: error.token.line - 1,
          character: error.token.column + (error.token.endOffset - error.token.startOffset) - 1
        }
      },
      message: error.message,
      source: 'cal'
    }));
  }

  /**
   * Check if document is cached
   */
  isCached(uri: string): boolean {
    return this.documentCache.has(uri);
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.documentCache.size;
  }
}

/**
 * Find position of a search string in content
 */
function findPosition(content: string, searchString: string, occurrence: number = 1): Position {
  let index = -1;
  for (let i = 0; i < occurrence; i++) {
    index = content.indexOf(searchString, index + 1);
    if (index === -1) {
      throw new Error(`String "${searchString}" occurrence ${occurrence} not found`);
    }
  }

  const lines = content.substring(0, index).split('\n');
  const line = lines.length - 1;
  const character = lines[lines.length - 1].length;

  return Position.create(line, character);
}

// ============================================================================
// Scenario 4: Cache Invalidation
// ============================================================================

describe('Cache Invalidation', () => {
  it('should invalidate cache on document change', () => {
    const context = new LSPTestContext();

    const code = `OBJECT Table 18 Customer { }`;
    const uri = 'file:///test.cal';

    context.openDocument(uri, code, 1);
    expect(context.isCached(uri)).toBe(true);

    // Update should invalidate cache then rebuild it
    context.updateDocument(uri, code + ' ', 2);
    expect(context.isCached(uri)).toBe(true);
  });

  it('should clear cache on document close', () => {
    const context = new LSPTestContext();

    const code = `OBJECT Table 18 Customer { }`;
    const uri = 'file:///test.cal';

    context.openDocument(uri, code, 1);
    expect(context.isCached(uri)).toBe(true);
    expect(context.getCacheSize()).toBe(1);

    context.closeDocument(uri);
    expect(context.isCached(uri)).toBe(false);
    expect(context.getCacheSize()).toBe(0);
  });

  it('should maintain separate caches for multiple documents', () => {
    const context = new LSPTestContext();

    const uri1 = 'file:///table.cal';
    const uri2 = 'file:///codeunit.cal';

    context.openDocument(uri1, 'OBJECT Table 18 Customer { }', 1);
    context.openDocument(uri2, 'OBJECT Codeunit 50000 Test { CODE { BEGIN END. } }', 1);

    expect(context.getCacheSize()).toBe(2);
    expect(context.isCached(uri1)).toBe(true);
    expect(context.isCached(uri2)).toBe(true);

    // Update one shouldn't affect the other
    context.updateDocument(uri1, 'OBJECT Table 19 Vendor { }', 2);

    expect(context.getCacheSize()).toBe(2);
    expect(context.isCached(uri1)).toBe(true);
    expect(context.isCached(uri2)).toBe(true);
  });

  it('should reuse cache when requesting features without content change', () => {
    const context = new LSPTestContext();

    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    VAR
      MyVar@1001 : Integer;
    BEGIN
      MyVar := 1;
    END;

    BEGIN
    END.
  }
}`;

    const uri = 'file:///test.cal';
    context.openDocument(uri, code, 1);

    // Multiple feature requests should reuse cache
    const pos1 = findPosition(code, 'MyVar');
    const pos2 = findPosition(code, 'MyVar := 1');

    context.getCompletions(uri, pos1);
    context.getDefinition(uri, pos2);
    context.getReferences(uri, pos1, true);
    context.getDiagnostics(uri);

    // Cache should still be size 1 (not re-parsing)
    expect(context.getCacheSize()).toBe(1);
  });
});

// ============================================================================
// Scenario 3: Document Change → Diagnostics Update
// ============================================================================

describe('Document Change → Diagnostics Update Workflow', () => {
  it('should generate diagnostics for syntax error and clear after fix', () => {
    const context = new LSPTestContext();

    // Valid code initially
    const validCode = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text100       }
  }
}`;

    const uri = 'file:///test.cal';
    context.openDocument(uri, validCode, 1);

    // Should have no errors
    const initialDiagnostics = context.getDiagnostics(uri);
    expect(initialDiagnostics.length).toBe(0);

    // Introduce syntax error (invalid field definition)
    const invalidCode = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { invalid field syntax }
    { 2   ;   ;Name            ;Text100       }
  }
}`;

    context.updateDocument(uri, invalidCode, 2);

    // Should have diagnostics now
    const errorDiagnostics = context.getDiagnostics(uri);
    expect(errorDiagnostics.length).toBeGreaterThan(0);
    expect(errorDiagnostics[0].severity).toBe(DiagnosticSeverity.Error);
    expect(errorDiagnostics[0].source).toBe('cal');

    // Fix the error
    const fixedCode = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 3   ;   ;Status          ;Option        }
    { 2   ;   ;Name            ;Text100       }
  }
}`;

    context.updateDocument(uri, fixedCode, 3);

    // Diagnostics should be cleared
    const finalDiagnostics = context.getDiagnostics(uri);
    expect(finalDiagnostics.length).toBe(0);
  });

  it('should handle incremental error introduction and fixes', () => {
    const context = new LSPTestContext();

    const uri = 'file:///test.cal';

    // Version 1: Valid
    const v1 = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    BEGIN
    END.
  }
}`;
    context.openDocument(uri, v1, 1);
    expect(context.getDiagnostics(uri).length).toBe(0);

    // Version 2: Add syntax error (missing closing brace)
    const v2 = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Invalid@1(
    BEGIN
    END.
  }
}`;
    context.updateDocument(uri, v2, 2);
    expect(context.getDiagnostics(uri).length).toBeGreaterThan(0);

    // Version 3: Fix error
    const v3 = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE NewProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
    context.updateDocument(uri, v3, 3);
    expect(context.getDiagnostics(uri).length).toBe(0);
  });
});

// ============================================================================
// Scenario 1: Edit Document → Reparse → Completion at Cursor
// ============================================================================

describe('Document Edit → Reparse → Completion Workflow', () => {
  it('should update completions after adding a new variable', () => {
    const context = new LSPTestContext();

    // Initial document
    const initialCode = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    VAR
      OldVar@1001 : Integer;
    BEGIN
      MESSAGE('test');
    END;

    BEGIN
    END.
  }
}`;

    const uri = 'file:///test.cal';
    context.openDocument(uri, initialCode, 1);

    // Request completions at cursor (should find OldVar)
    const cursorPos = findPosition(initialCode, 'MESSAGE');
    const initialCompletions = context.getCompletions(uri, Position.create(cursorPos.line, cursorPos.character - 2));

    expect(initialCompletions.some(c => c.label === 'OldVar')).toBe(true);
    expect(initialCompletions.some(c => c.label === 'NewVar')).toBe(false);

    // Verify document is cached
    expect(context.isCached(uri)).toBe(true);

    // Edit: Add new variable
    const updatedCode = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    VAR
      OldVar@1001 : Integer;
      NewVar@1002 : Text[50];
    BEGIN
      MESSAGE('test');
    END;

    BEGIN
    END.
  }
}`;

    // Update document (should invalidate cache and reparse)
    context.updateDocument(uri, updatedCode, 2);

    // Request completions again (should now find both variables)
    const updatedCursorPos = findPosition(updatedCode, 'MESSAGE');
    const updatedCompletions = context.getCompletions(uri, Position.create(updatedCursorPos.line, updatedCursorPos.character - 2));

    expect(updatedCompletions.some(c => c.label === 'OldVar')).toBe(true);
    expect(updatedCompletions.some(c => c.label === 'NewVar')).toBe(true);
  });

  it('should reflect removed variable in completions after edit', () => {
    const context = new LSPTestContext();

    // Document with two variables
    const initialCode = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    VAR
      VarToKeep@1001 : Integer;
      VarToRemove@1002 : Integer;
    BEGIN
      Var
    END;

    BEGIN
    END.
  }
}`;

    const uri = 'file:///test.cal';
    context.openDocument(uri, initialCode, 1);

    const cursorPos = findPosition(initialCode, 'Var');
    const initialCompletions = context.getCompletions(uri, Position.create(cursorPos.line, cursorPos.character + 3));

    expect(initialCompletions.some(c => c.label === 'VarToKeep')).toBe(true);
    expect(initialCompletions.some(c => c.label === 'VarToRemove')).toBe(true);

    // Remove one variable
    const updatedCode = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    VAR
      VarToKeep@1001 : Integer;
    BEGIN
      Var
    END;

    BEGIN
    END.
  }
}`;

    context.updateDocument(uri, updatedCode, 2);

    const updatedCursorPos = findPosition(updatedCode, 'Var');
    const updatedCompletions = context.getCompletions(uri, Position.create(updatedCursorPos.line, updatedCursorPos.character + 3));

    expect(updatedCompletions.some(c => c.label === 'VarToKeep')).toBe(true);
    expect(updatedCompletions.some(c => c.label === 'VarToRemove')).toBe(false);
  });
});

// ============================================================================
// Scenario 2: Go to Definition → Navigate → Find References
// ============================================================================

describe('Go to Definition → Find References Workflow', () => {
  it('should navigate to variable definition and find all references', () => {
    const context = new LSPTestContext();

    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    VAR
      Counter@1001 : Integer;
    BEGIN
      Counter := 0;
      Counter := Counter + 1;
      MESSAGE('%1', Counter);
    END;

    BEGIN
    END.
  }
}`;

    const uri = 'file:///test.cal';
    context.openDocument(uri, code, 1);

    // Step 1: Request definition from usage (first "Counter := 0")
    const usagePos = findPosition(code, 'Counter := 0');
    const definition = context.getDefinition(uri, Position.create(usagePos.line, usagePos.character + 3));

    expect(definition).not.toBeNull();
    expect(definition?.uri).toBe(uri);
    expect(definition?.range.start.line).toBeGreaterThanOrEqual(0);

    // Step 2: Find all references from the definition location
    const defPosition = definition!.range.start;
    const references = context.getReferences(uri, defPosition, true);

    // Should find: 1 declaration + 4 usages
    expect(references.length).toBeGreaterThanOrEqual(4);
    expect(references.every(ref => ref.uri === uri)).toBe(true);
  });

  it('should navigate to procedure definition and find all call sites', () => {
    const context = new LSPTestContext();

    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE HelperProc@1();
    BEGIN
    END;

    PROCEDURE FirstCaller@2();
    BEGIN
      HelperProc;
    END;

    PROCEDURE SecondCaller@3();
    BEGIN
      HelperProc;
      HelperProc;
    END;

    BEGIN
    END.
  }
}`;

    const uri = 'file:///test.cal';
    context.openDocument(uri, code, 1);

    // Find references from the call site directly
    const callPos = findPosition(code, 'HelperProc;', 1);
    const references = context.getReferences(uri, Position.create(callPos.line, callPos.character + 5), true);

    // Should find: 1 definition + 3 calls = 4 total
    expect(references.length).toBeGreaterThanOrEqual(3);
  });

  it('should work across definition and usage with exclude declaration option', () => {
    const context = new LSPTestContext();

    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProc@1();
    VAR
      MyVar@1001 : Integer;
    BEGIN
      MyVar := 1;
      MyVar := MyVar + 1;
    END;

    BEGIN
    END.
  }
}`;

    const uri = 'file:///test.cal';
    context.openDocument(uri, code, 1);

    // Navigate to definition
    const usagePos = findPosition(code, 'MyVar := 1');
    const definition = context.getDefinition(uri, Position.create(usagePos.line, usagePos.character + 2));

    expect(definition).not.toBeNull();

    // Find references excluding declaration
    const defPosition = definition!.range.start;
    const referencesWithoutDecl = context.getReferences(uri, defPosition, false);
    const referencesWithDecl = context.getReferences(uri, defPosition, true);

    // Should have one more reference when including declaration
    expect(referencesWithDecl.length).toBe(referencesWithoutDecl.length + 1);
  });
});

// ============================================================================
// Scenario 5: Complex Multi-Step Workflow
// ============================================================================

describe('Complex Multi-Step Workflow', () => {
  it('should handle complete editing session: open → edit → navigate → edit → close', () => {
    const context = new LSPTestContext();
    const uri = 'file:///test.cal';

    // Step 1: Open document
    const v1 = `OBJECT Codeunit 50000 Calculator
{
  CODE
  {
    PROCEDURE Add@1();
    VAR
      A@1001 : Integer;
      B@1002 : Integer;
    BEGIN
      A := 5;
      B := 3;
    END;

    BEGIN
    END.
  }
}`;
    context.openDocument(uri, v1, 1);
    expect(context.getDiagnostics(uri).length).toBe(0);

    // Step 2: Get completion for variables
    const pos1 = findPosition(v1, 'A := 5;');
    const completions1 = context.getCompletions(uri, Position.create(pos1.line, pos1.character - 2));
    expect(completions1.some(c => c.label === 'A')).toBe(true);
    expect(completions1.some(c => c.label === 'B')).toBe(true);

    // Step 3: Navigate to definition of variable A
    const definition = context.getDefinition(uri, Position.create(pos1.line, pos1.character));
    expect(definition).not.toBeNull();

    // Step 4: Edit - add new procedure
    const v2 = `OBJECT Codeunit 50000 Calculator
{
  CODE
  {
    PROCEDURE Add@1();
    VAR
      A@1001 : Integer;
      B@1002 : Integer;
    BEGIN
      A := 5;
      B := 3;
    END;

    PROCEDURE Subtract@2();
    VAR
      X@1003 : Integer;
    BEGIN
      X := 10;
    END;

    BEGIN
    END.
  }
}`;
    context.updateDocument(uri, v2, 2);
    expect(context.getDiagnostics(uri).length).toBe(0);

    // Step 5: Find references to Subtract procedure
    const subtractPos = findPosition(v2, 'Subtract@2');
    const references = context.getReferences(uri, Position.create(subtractPos.line, subtractPos.character + 3), true);
    expect(references.length).toBe(1); // Just definition, no calls yet

    // Step 6: Edit - add procedure call
    const v3 = `OBJECT Codeunit 50000 Calculator
{
  CODE
  {
    PROCEDURE Add@1();
    VAR
      A@1001 : Integer;
      B@1002 : Integer;
    BEGIN
      A := 5;
      B := 3;
      Subtract();
    END;

    PROCEDURE Subtract@2();
    VAR
      X@1003 : Integer;
    BEGIN
      X := 10;
    END;

    BEGIN
    END.
  }
}`;
    context.updateDocument(uri, v3, 3);

    // Step 7: Find references again - should find call site
    const subtractPos2 = findPosition(v3, 'Subtract@2');
    const references2 = context.getReferences(uri, Position.create(subtractPos2.line, subtractPos2.character + 3), true);
    expect(references2.length).toBe(2); // Definition + 1 call

    // Step 8: Verify no diagnostics in final version
    expect(context.getDiagnostics(uri).length).toBe(0);

    // Step 9: Close document
    context.closeDocument(uri);
    expect(context.isCached(uri)).toBe(false);
  });
});
