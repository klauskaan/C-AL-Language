/**
 * WorkspaceSymbol provider for C/AL language server
 * Implements Ctrl+T (Go to Symbol in Workspace) functionality
 *
 * V1 Implementation: Searches only OPEN documents
 * Future: Integrate workspace-wide file indexing
 */

import { SymbolInformation, Location, SymbolKind, DocumentSymbol } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver';
import { DocumentSymbolProvider } from '../documentSymbol/documentSymbolProvider';
import { CALDocument } from '../parser/ast';

export const DEFAULT_MAX_SYMBOLS = 500;

/**
 * WorkspaceSymbol provider class
 * Provides Ctrl+T (Go to Symbol in Workspace) functionality
 */
export class WorkspaceSymbolProvider {
  /**
   * @param documentSymbolProvider - Provider for extracting symbols from documents
   * @param connection - Optional LSP connection for logging
   * @param maxResults - Maximum number of symbols to return (default: DEFAULT_MAX_SYMBOLS)
   */
  constructor(
    private documentSymbolProvider: DocumentSymbolProvider,
    private connection?: Connection,
    private maxResults: number = DEFAULT_MAX_SYMBOLS
  ) {}

  /**
   * Search for symbols across parsed documents
   *
   * @param query - Search string (empty string returns ALL symbols per LSP spec)
   * @param parsedDocuments - Array of pre-parsed documents with AST
   * @returns Array of SymbolInformation matching the query
   */
  public search(
    query: string,
    parsedDocuments: Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>
  ): SymbolInformation[] {
    const results: SymbolInformation[] = [];
    const normalizedQuery = query.toLowerCase();

    // Iterate over all parsed documents
    for (const { uri, textDocument, ast } of parsedDocuments) {
      try {
        // Get hierarchical symbols from DocumentSymbolProvider
        const documentSymbols = this.documentSymbolProvider.getDocumentSymbols(textDocument, ast);

        // Flatten and filter symbols
        for (const docSymbol of documentSymbols) {
          const flatSymbols = this.flattenDocumentSymbols(docSymbol, uri);
          results.push(...flatSymbols);
        }
      } catch (error) {
        // Log warning and continue with other documents
        if (this.connection) {
          this.connection.console.warn(
            `Failed to extract symbols from document ${uri}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    // Filter by query (case-insensitive substring match)
    // Empty query returns all symbols (LSP spec requirement), limited to maxResults
    if (query === '') {
      return results.slice(0, this.maxResults);
    }

    return results
      .filter(symbol => symbol.name.toLowerCase().includes(normalizedQuery))
      .slice(0, this.maxResults);
  }

  /**
   * Flatten hierarchical DocumentSymbol tree into SymbolInformation array
   * Excludes namespace containers (FIELDS, KEYS, TRIGGERS, etc.) and object declaration
   *
   * @param symbol - Root DocumentSymbol to flatten
   * @param uri - Document URI
   * @param containerName - Parent container name (propagated through recursion)
   * @param isRoot - Whether this is the root object declaration (should be excluded)
   * @returns Flattened array of SymbolInformation
   */
  private flattenDocumentSymbols(
    symbol: DocumentSymbol,
    uri: string,
    containerName?: string,
    isRoot = true
  ): SymbolInformation[] {
    const results: SymbolInformation[] = [];

    // Check if this is a namespace container that should be filtered out
    const isNamespaceContainer = symbol.kind === SymbolKind.Namespace;

    // Check if this is the root object declaration (Class kind)
    const isObjectDeclaration = isRoot && symbol.kind === SymbolKind.Class;

    // Add current symbol to results (unless it's a namespace or object declaration)
    if (!isNamespaceContainer && !isObjectDeclaration) {
      const symbolInfo: SymbolInformation = {
        name: symbol.name,
        kind: symbol.kind,
        location: Location.create(uri, symbol.selectionRange)
      };

      // Add container name if present
      if (containerName) {
        symbolInfo.containerName = containerName;
      }

      results.push(symbolInfo);
    }

    // Recursively process children
    if (symbol.children) {
      // Determine container name for children:
      // - If current is namespace, use namespace name as container (FIELDS, KEYS, etc.)
      // - If current is object declaration, don't set container (skip it)
      // - Otherwise, use current symbol name as new containerName
      let childContainer: string | undefined;
      if (isNamespaceContainer) {
        childContainer = symbol.name;
      } else if (isObjectDeclaration) {
        childContainer = undefined;
      } else {
        childContainer = symbol.name;
      }

      for (const child of symbol.children) {
        const childResults = this.flattenDocumentSymbols(child, uri, childContainer, false);
        results.push(...childResults);
      }
    }

    return results;
  }
}
