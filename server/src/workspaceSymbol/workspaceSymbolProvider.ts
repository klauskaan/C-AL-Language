/**
 * WorkspaceSymbol provider for C/AL language server
 * Implements Ctrl+T (Go to Symbol in Workspace) functionality
 *
 * V1 Implementation: Searches only OPEN documents
 * Future: Integrate workspace-wide file indexing
 */

import { SymbolInformation } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver';
import { DocumentSymbolProvider } from '../documentSymbol/documentSymbolProvider';
import { CALDocument } from '../parser/ast';
import { flattenDocumentSymbols } from './flattenSymbols';

export const DEFAULT_MAX_SYMBOLS = 500;

/**
 * WorkspaceSymbol provider class
 * Provides Ctrl+T (Go to Symbol in Workspace) functionality
 */
export class WorkspaceSymbolProvider {
  private maxResults: number;

  /**
   * @param documentSymbolProvider - Provider for extracting symbols from documents
   * @param connection - Optional LSP connection for logging
   * @param maxResults - Maximum number of symbols to return (default: DEFAULT_MAX_SYMBOLS)
   */
  constructor(
    private documentSymbolProvider: DocumentSymbolProvider,
    private connection?: Connection,
    maxResults: number = DEFAULT_MAX_SYMBOLS
  ) {
    if (!Number.isInteger(maxResults) || maxResults < 1) {
      throw new Error(`maxResults must be a positive integer, got ${maxResults}`);
    }
    this.maxResults = maxResults;
  }

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
          const flatSymbols = flattenDocumentSymbols(docSymbol, uri);
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
}
