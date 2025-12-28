---
name: cal-provider-development
description: Guide for implementing LSP providers (completion, hover, definition, references, signature help) using the provider base class, symbol table, and semantic token system
allowed-tools: Read, Grep, Glob, Edit, Bash(npm test*)
---

# C/AL Provider Development

Guide for implementing Language Server Protocol (LSP) providers for the C/AL extension.

## Provider Architecture Overview

```
server/src/
├── providers/
│   └── baseProvider.ts         # Abstract base class
├── completion/
│   └── completionProvider.ts   # IntelliSense
├── hover/
│   └── hoverProvider.ts        # Hover information
├── definition/
│   └── definitionProvider.ts   # Go-to-definition
├── references/
│   └── referencesProvider.ts   # Find all references
├── signatureHelp/
│   └── signatureHelpProvider.ts # Parameter hints
└── semanticTokens/
    └── semanticTokensProvider.ts # Semantic highlighting
```

## Base Provider Class

### Location
`server/src/providers/baseProvider.ts`

### Purpose
- Shared functionality across all providers
- Symbol resolution helpers
- Document lifecycle management
- Error handling

### Implementation

```typescript
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Parser } from '../parser/parser';
import { SymbolTable } from '../utils/symbolTable';

abstract class BaseProvider {
  protected parser: Parser;
  protected symbolTable: SymbolTable;

  constructor() {
    this.parser = new Parser();
    this.symbolTable = new SymbolTable();
  }

  /**
   * Parse document and build symbol table
   */
  protected prepareDocument(document: TextDocument): void {
    const ast = this.parser.parse(document.getText());

    // Build symbol table from AST
    this.symbolTable.clear();
    this.symbolTable.buildFromAST(ast);
  }

  /**
   * Resolve symbol at given position
   */
  protected getSymbolAtPosition(
    document: TextDocument,
    position: Position
  ): Symbol | undefined {
    const offset = document.offsetAt(position);
    const word = this.getWordAtOffset(document, offset);

    if (!word) return undefined;

    return this.symbolTable.resolve(word, position);
  }

  /**
   * Get word at offset
   */
  protected getWordAtOffset(
    document: TextDocument,
    offset: number
  ): string | undefined {
    const text = document.getText();
    let start = offset;
    let end = offset;

    // Find word boundaries
    while (start > 0 && /[\w@]/.test(text[start - 1])) start--;
    while (end < text.length && /[\w@]/.test(text[end])) end++;

    return text.substring(start, end);
  }

  /**
   * Convert Position to offset
   */
  protected positionToOffset(document: TextDocument, position: Position): number {
    return document.offsetAt(position);
  }

  /**
   * Convert offset to Position
   */
  protected offsetToPosition(document: TextDocument, offset: number): Position {
    return document.positionAt(offset);
  }
}
```

## Symbol Table

### Location
`server/src/utils/symbolTable.ts`

### Purpose
- Multi-scope symbol resolution
- Variable, procedure, field lookup
- Scope tracking

### Implementation

```typescript
interface Symbol {
  name: string;
  kind: SymbolKind;
  type?: string;
  location: SourceLocation;
  scope: Scope;
}

enum SymbolKind {
  Variable,
  Procedure,
  Field,
  Parameter,
  Property
}

interface Scope {
  symbols: Map<string, Symbol>;
  parent?: Scope;
}

class SymbolTable {
  private globalScope: Scope;
  private currentScope: Scope;

  constructor() {
    this.globalScope = { symbols: new Map() };
    this.currentScope = this.globalScope;
  }

  /**
   * Enter new scope
   */
  pushScope(): void {
    const newScope: Scope = {
      symbols: new Map(),
      parent: this.currentScope
    };
    this.currentScope = newScope;
  }

  /**
   * Exit current scope
   */
  popScope(): void {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
  }

  /**
   * Add symbol to current scope
   */
  define(symbol: Symbol): void {
    this.currentScope.symbols.set(symbol.name.toLowerCase(), symbol);
  }

  /**
   * Resolve symbol (search up scope chain)
   */
  resolve(name: string, position?: Position): Symbol | undefined {
    const key = name.toLowerCase(); // C/AL is case-insensitive
    let scope: Scope | undefined = this.currentScope;

    while (scope) {
      const symbol = scope.symbols.get(key);
      if (symbol) return symbol;
      scope = scope.parent;
    }

    return undefined;
  }

  /**
   * Build symbol table from AST
   */
  buildFromAST(ast: ObjectDeclaration): void {
    const visitor = new SymbolCollectorVisitor(this);
    visitor.visit(ast);
  }
}
```

## Implementing LSP Providers

### Completion Provider Pattern

```typescript
import { BaseProvider } from '../providers/baseProvider';
import {
  CompletionItem,
  CompletionItemKind,
  CompletionParams
} from 'vscode-languageserver/node';

class CompletionProvider extends BaseProvider {
  provide(params: CompletionParams): CompletionItem[] {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    this.prepareDocument(document);

    const completions: CompletionItem[] = [];

    // Add keywords
    completions.push(...this.getKeywordCompletions());

    // Add symbols from symbol table
    completions.push(...this.getSymbolCompletions());

    // Add built-in functions
    completions.push(...this.getBuiltInFunctions());

    return completions;
  }

  private getKeywordCompletions(): CompletionItem[] {
    return KEYWORDS.map(keyword => ({
      label: keyword,
      kind: CompletionItemKind.Keyword,
      documentation: getKeywordDocumentation(keyword)
    }));
  }

  private getSymbolCompletions(): CompletionItem[] {
    const symbols = this.symbolTable.getAllSymbols();

    return symbols.map(symbol => ({
      label: symbol.name,
      kind: this.symbolKindToCompletionKind(symbol.kind),
      detail: symbol.type,
      documentation: symbol.documentation
    }));
  }

  private symbolKindToCompletionKind(kind: SymbolKind): CompletionItemKind {
    switch (kind) {
      case SymbolKind.Variable: return CompletionItemKind.Variable;
      case SymbolKind.Procedure: return CompletionItemKind.Function;
      case SymbolKind.Field: return CompletionItemKind.Field;
      default: return CompletionItemKind.Text;
    }
  }
}
```

### Hover Provider Pattern

```typescript
class HoverProvider extends BaseProvider {
  provide(params: HoverParams): Hover | null {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    this.prepareDocument(document);

    const symbol = this.getSymbolAtPosition(document, params.position);
    if (!symbol) return null;

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: this.formatSymbolDocumentation(symbol)
      },
      range: this.getSymbolRange(document, symbol)
    };
  }

  private formatSymbolDocumentation(symbol: Symbol): string {
    const parts: string[] = [];

    // Add type information
    if (symbol.type) {
      parts.push(`\`\`\`cal\n${symbol.name} : ${symbol.type}\n\`\`\``);
    }

    // Add documentation
    if (symbol.documentation) {
      parts.push(symbol.documentation);
    }

    // Add location
    parts.push(`*Defined at line ${symbol.location.line}*`);

    return parts.join('\n\n');
  }
}
```

### Definition Provider Pattern

```typescript
class DefinitionProvider extends BaseProvider {
  provide(params: DefinitionParams): Location | null {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    this.prepareDocument(document);

    const symbol = this.getSymbolAtPosition(document, params.position);
    if (!symbol) return null;

    return {
      uri: params.textDocument.uri,
      range: this.locationToRange(symbol.location)
    };
  }

  private locationToRange(location: SourceLocation): Range {
    return {
      start: {
        line: location.line - 1,
        character: location.column - 1
      },
      end: {
        line: location.line - 1,
        character: location.column + location.length - 1
      }
    };
  }
}
```

### References Provider Pattern

```typescript
class ReferencesProvider extends BaseProvider {
  provide(params: ReferenceParams): Location[] {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    this.prepareDocument(document);

    const symbol = this.getSymbolAtPosition(document, params.position);
    if (!symbol) return [];

    // Find all references to this symbol
    const references = this.findReferences(symbol, document);

    return references.map(ref => ({
      uri: params.textDocument.uri,
      range: this.offsetToRange(document, ref.start, ref.end)
    }));
  }

  private findReferences(
    symbol: Symbol,
    document: TextDocument
  ): Array<{ start: number; end: number }> {
    const references: Array<{ start: number; end: number }> = [];
    const text = document.getText();
    const pattern = new RegExp(`\\b${symbol.name}\\b`, 'gi');

    let match;
    while ((match = pattern.exec(text)) !== null) {
      references.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return references;
  }
}
```

### Signature Help Provider Pattern

```typescript
class SignatureHelpProvider extends BaseProvider {
  provide(params: SignatureHelpParams): SignatureHelp | null {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    this.prepareDocument(document);

    // Find function call context
    const functionCall = this.getFunctionCallContext(document, params.position);
    if (!functionCall) return null;

    // Look up function signature
    const symbol = this.symbolTable.resolve(functionCall.name);
    if (!symbol || symbol.kind !== SymbolKind.Procedure) return null;

    return {
      signatures: [
        {
          label: this.formatSignature(symbol),
          documentation: symbol.documentation,
          parameters: symbol.parameters.map(param => ({
            label: param.name,
            documentation: param.documentation
          }))
        }
      ],
      activeSignature: 0,
      activeParameter: functionCall.parameterIndex
    };
  }

  private formatSignature(symbol: Symbol): string {
    const params = symbol.parameters
      .map(p => `${p.name} : ${p.type}`)
      .join('; ');

    const returnType = symbol.returnType ? ` : ${symbol.returnType}` : '';

    return `${symbol.name}(${params})${returnType}`;
  }
}
```

## Semantic Tokens Provider

### Purpose
Provide intelligent, AST-based syntax highlighting beyond TextMate grammar.

### Implementation

```typescript
class SemanticTokensProvider extends BaseProvider {
  private legend: SemanticTokensLegend = {
    tokenTypes: [
      'namespace', 'class', 'function', 'variable',
      'parameter', 'property', 'keyword'
    ],
    tokenModifiers: [
      'declaration', 'readonly', 'static', 'deprecated'
    ]
  };

  provideFull(params: SemanticTokensParams): SemanticTokens {
    const document = documents.get(params.textDocument.uri);
    if (!document) return { data: [] };

    const ast = this.parser.parse(document.getText());
    const tokensBuilder = new SemanticTokensBuilder();

    // Visit AST and emit tokens
    const visitor = new SemanticTokensVisitor(tokensBuilder, this.legend);
    visitor.visit(ast);

    return tokensBuilder.build();
  }
}

class SemanticTokensVisitor extends ASTVisitor<void> {
  constructor(
    private builder: SemanticTokensBuilder,
    private legend: SemanticTokensLegend
  ) {
    super();
  }

  visitProcedureDeclaration(node: ProcedureDeclaration): void {
    const tokenType = this.legend.tokenTypes.indexOf('function');
    const modifiers = node.isLocal
      ? 1 << this.legend.tokenModifiers.indexOf('declaration')
      : 0;

    this.builder.push(
      node.location.line - 1,
      node.location.column - 1,
      node.name.length,
      tokenType,
      modifiers
    );

    super.visitProcedureDeclaration(node);
  }

  visitVariableDeclaration(node: VariableDeclaration): void {
    const tokenType = this.legend.tokenTypes.indexOf('variable');
    const modifiers = 1 << this.legend.tokenModifiers.indexOf('declaration');

    this.builder.push(
      node.location.line - 1,
      node.location.column - 1,
      node.name.length,
      tokenType,
      modifiers
    );
  }
}
```

## Testing LSP Features

### Mock Document Setup

```typescript
import { TextDocument } from 'vscode-languageserver-textdocument';

function createMockDocument(content: string, uri = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

describe('CompletionProvider', () => {
  it('should provide keyword completions', () => {
    const document = createMockDocument('BE');
    const provider = new CompletionProvider();

    const position = { line: 0, character: 2 };
    const completions = provider.provide({ textDocument: { uri: document.uri }, position });

    expect(completions).toContainEqual(
      expect.objectContaining({ label: 'BEGIN' })
    );
  });
});
```

### Position Calculations

```typescript
describe('DefinitionProvider', () => {
  it('should find procedure definition', () => {
    const document = createMockDocument(`
      PROCEDURE Calculate@1();
      BEGIN
        Calculate();
      END;
    `);

    const provider = new DefinitionProvider();

    // Position at "Calculate" in the call
    const position = { line: 3, character: 10 };
    const location = provider.provide({
      textDocument: { uri: document.uri },
      position
    });

    expect(location).toEqual({
      uri: document.uri,
      range: {
        start: { line: 1, character: 6 },
        end: { line: 1, character: 15 }
      }
    });
  });
});
```

### Expected Result Validation

```typescript
describe('HoverProvider', () => {
  it('should show variable type on hover', () => {
    const document = createMockDocument(`
      VAR
        Customer@1000 : Record 18;
    `);

    const provider = new HoverProvider();
    const position = { line: 2, character: 10 }; // On "Customer"

    const hover = provider.provide({
      textDocument: { uri: document.uri },
      position
    });

    expect(hover).toMatchObject({
      contents: {
        kind: MarkupKind.Markdown,
        value: expect.stringContaining('Customer : Record 18')
      }
    });
  });
});
```

## LSP Best Practices

### Performance Considerations

```typescript
// ✅ Good: Cache parsed AST
class Provider extends BaseProvider {
  private astCache = new Map<string, { ast: AST; version: number }>();

  protected prepareDocument(document: TextDocument): void {
    const cached = this.astCache.get(document.uri);

    if (cached && cached.version === document.version) {
      // Use cached AST
      this.symbolTable.buildFromAST(cached.ast);
      return;
    }

    // Parse and cache
    const ast = this.parser.parse(document.getText());
    this.astCache.set(document.uri, { ast, version: document.version });
    this.symbolTable.buildFromAST(ast);
  }
}

// ❌ Bad: Parse on every request
protected prepareDocument(document: TextDocument): void {
  const ast = this.parser.parse(document.getText()); // Always parses!
  this.symbolTable.buildFromAST(ast);
}
```

### Null Safety

```typescript
// ✅ Good: Check for null/undefined
provide(params: HoverParams): Hover | null {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const symbol = this.getSymbolAtPosition(document, params.position);
  if (!symbol) return null;

  return this.createHover(symbol);
}

// ❌ Bad: Assume values exist
provide(params: HoverParams): Hover | null {
  const document = documents.get(params.textDocument.uri)!; // May crash!
  const symbol = this.getSymbolAtPosition(document, params.position)!;
  return this.createHover(symbol);
}
```

### Error Handling

```typescript
// ✅ Good: Graceful error handling
provide(params: CompletionParams): CompletionItem[] {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    this.prepareDocument(document);
    return this.getCompletions(document, params.position);
  } catch (error) {
    console.error('Completion error:', error);
    return []; // Return empty array, don't crash LSP server
  }
}

// ❌ Bad: Unhandled errors
provide(params: CompletionParams): CompletionItem[] {
  const document = documents.get(params.textDocument.uri)!;
  this.prepareDocument(document); // May throw!
  return this.getCompletions(document, params.position);
}
```

## Quick Reference

```typescript
// Provider Base Class
class MyProvider extends BaseProvider {
  provide(params): Result {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    this.prepareDocument(document);
    const symbol = this.getSymbolAtPosition(document, params.position);

    return this.processSymbol(symbol);
  }
}

// Symbol Table
symbolTable.define(symbol);           // Add symbol
symbolTable.resolve(name, position);  // Look up symbol
symbolTable.pushScope();              // Enter scope
symbolTable.popScope();               // Exit scope

// Testing
const document = createMockDocument(code);
const provider = new Provider();
const result = provider.provide({ textDocument: { uri: document.uri }, position });
expect(result).toEqual(expected);
```
