/**
 * WorkspaceIndex - Pre-computed symbol index for workspace files
 *
 * Discovers and indexes .cal files in the workspace for fast workspace symbol search.
 * Implements timestamp-based race condition prevention to handle concurrent file updates.
 */

import { SymbolInformation } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { pathToFileURL } from 'url';
import { DocumentSymbolProvider } from '../documentSymbol/documentSymbolProvider';
import { Parser } from '../parser/parser';
import { Lexer } from '../lexer/lexer';
import { readFileWithEncodingAsync } from '../utils/encoding';
import { discoverFiles } from '../utils/fileDiscovery';
import { hasCalExtension, hasTxtExtension } from '../utils/fileExtensions';
import { isCalContent } from '../utils/calDetection';
import { flattenDocumentSymbols } from './flattenSymbols';

/**
 * Index entry for a single file
 */
interface IndexEntry {
  symbols: SymbolInformation[];
  indexedAt: number; // Timestamp when file was indexed
}

/**
 * WorkspaceIndex class
 * Manages pre-computed symbol index for workspace files
 */
export class WorkspaceIndex {
  private index = new Map<string, IndexEntry>();
  private documentSymbolProvider = new DocumentSymbolProvider();

  /**
   * Index a single file and add it to the index
   *
   * @param filePath - Absolute file path to index
   * @returns Promise that resolves when indexing is complete
   * @throws Error if file cannot be read or parsed
   */
  async add(filePath: string): Promise<void> {
    const indexedAt = Date.now();
    const symbols = await this.extractSymbols(filePath);

    this.index.set(filePath, {
      symbols,
      indexedAt
    });
  }

  /**
   * Update a file in the index only if the existing entry is older than the given timestamp
   * Used to prevent race conditions when multiple file change events arrive out of order
   *
   * @param filePath - Absolute file path to update
   * @param timestamp - Timestamp of the change event
   * @returns Promise<boolean> - true if updated, false if rejected (existing entry is fresher)
   */
  async updateIfNotFresher(filePath: string, timestamp: number): Promise<boolean> {
    const existing = this.index.get(filePath);

    // If no existing entry, always accept
    if (!existing) {
      await this.add(filePath);
      return true;
    }

    // If existing entry is fresher, reject update
    if (existing.indexedAt > timestamp) {
      return false;
    }

    // Update entry
    await this.add(filePath);
    return true;
  }

  /**
   * Remove a file from the index
   *
   * @param filePath - Absolute file path to remove
   */
  remove(filePath: string): void {
    this.index.delete(filePath);
  }

  /**
   * Clear all entries from the index
   */
  clear(): void {
    this.index.clear();
  }

  /**
   * Check if a file is in the index
   *
   * @param filePath - Absolute file path to check
   * @returns true if file is indexed, false otherwise
   */
  has(filePath: string): boolean {
    return this.index.has(filePath);
  }

  /**
   * Get all symbols from the index
   *
   * @returns Array of all SymbolInformation from all indexed files
   */
  getAllSymbols(): SymbolInformation[] {
    const allSymbols: SymbolInformation[] = [];

    for (const entry of this.index.values()) {
      allSymbols.push(...entry.symbols);
    }

    return allSymbols;
  }

  /**
   * Get the number of files in the index
   */
  get fileCount(): number {
    return this.index.size;
  }

  /**
   * Get the total number of symbols in the index
   */
  get symbolCount(): number {
    let count = 0;
    for (const entry of this.index.values()) {
      count += entry.symbols.length;
    }
    return count;
  }

  /**
   * Index all .cal files (and optionally .txt files) in a directory (recursively)
   *
   * @param directory - Root directory to index
   * @param options - Indexing options
   * @param options.includeTxtFiles - Whether to index .txt files (default: false)
   * @returns Promise that resolves when indexing is complete
   * @throws Error if directory cannot be read
   */
  async indexDirectory(directory: string, options?: { includeTxtFiles?: boolean }): Promise<void> {
    const includeTxtFiles = options?.includeTxtFiles ?? false;

    // Discover .cal files
    const calFiles = await discoverFiles(directory, hasCalExtension);

    // Discover .txt files if enabled
    const txtFiles = includeTxtFiles ? await discoverFiles(directory, hasTxtExtension) : [];

    // Combine all files to index
    const allFiles = [...calFiles, ...txtFiles];

    // Index each file with event loop yielding
    for (let i = 0; i < allFiles.length; i++) {
      const filePath = allFiles[i];

      try {
        // For .txt files, run heuristic check first
        if (hasTxtExtension(filePath)) {
          const isCalFile = await isCalContent(filePath);
          if (!isCalFile) {
            // Not a C/AL file, skip indexing
            continue;
          }
        }

        await this.add(filePath);

        // Yield to event loop periodically (every 10 files)
        if (i % 10 === 0 && i > 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      } catch (error) {
        // Skip files that fail to index (parse errors, encoding issues, etc.)
        // This is intentional - continue indexing other files
        continue;
      }
    }
  }

  /**
   * Extract symbols from a file
   *
   * @param filePath - Absolute file path
   * @returns Promise<SymbolInformation[]> - Extracted symbols
   * @throws Error if file cannot be read or parsed
   */
  private async extractSymbols(filePath: string): Promise<SymbolInformation[]> {
    // Read file with encoding detection
    const { content } = await readFileWithEncodingAsync(filePath);

    // Convert to file:// URI
    const uri = pathToFileURL(filePath).href;

    // Create TextDocument
    const textDocument = TextDocument.create(uri, 'cal', 1, content);

    // Parse document
    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Extract document symbols
    const documentSymbols = this.documentSymbolProvider.getDocumentSymbols(textDocument, ast);

    // Flatten to SymbolInformation
    const symbols: SymbolInformation[] = [];
    for (const docSymbol of documentSymbols) {
      const flatSymbols = flattenDocumentSymbols(docSymbol, uri);
      symbols.push(...flatSymbols);
    }

    return symbols;
  }
}
