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
import { ObjectKind } from '../parser/ast';
import { Lexer } from '../lexer/lexer';
import { readFileWithEncodingAsync } from '../utils/encoding';
import { discoverFiles } from '../utils/fileDiscovery';
import { hasCalExtension, hasTxtExtension } from '../utils/fileExtensions';
import { isCalContent } from '../utils/calDetection';
import { flattenDocumentSymbols } from './flattenSymbols';
import { SYSTEM_TABLE_NAMES, SYSTEM_TABLE_FIELDS } from '../builtins/systemTableData';

/**
 * Field information with original casing preserved
 */
export interface FieldInfo {
  originalName: string;  // Preserves original casing: "No.", "Balance (LCY)"
  typeName: string;      // Data type: "Code20", "Decimal"
}

/**
 * Metadata for a single C/AL object, used by the Object Explorer
 */
export interface ObjectMetadata {
  type: string;          // "Table", "Page", "Report", "Codeunit", "XMLport", "Query", "MenuSuite"
  id: number;
  name: string;
  uri: string;           // file:// URI (absolute path)
  line: number;          // 0-based line of the OBJECT declaration
  date?: string;
  time?: string;
  modified?: boolean;
  versionList?: string;
}

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
  private tableRegistry = new Map<number, string>();
  private tableOwner = new Map<number, string>();
  private fileTableContributions = new Map<string, number>();
  private tableFieldRegistry = new Map<number, ReadonlyMap<string, FieldInfo>>();
  private fieldOwner = new Map<number, string>();
  private fileFieldContributions = new Map<string, number>();
  private tableProcedureRegistry = new Map<number, ReadonlyMap<string, string>>();
  private procedureOwner = new Map<number, string>();
  private fileProcedureContributions = new Map<string, number>();
  private fileObjectMetadata = new Map<string, ObjectMetadata[]>();
  private _userTablesIndexed: boolean = false;

  constructor() {
    this.seedSystemTables();
  }

  /**
   * Pre-seed registries with known system table definitions.
   * System table IDs (>= 2,000,000,000) are runtime-only NAV tables not
   * exported as workspace files. Pre-seed the registry with known field
   * definitions. Safe from add()/remove() ownership model: user table IDs
   * cannot reach 2,000,000,000 — NAV reserves this range exclusively for
   * runtime system/virtual tables.
   */
  private seedSystemTables(): void {
    for (const [id, name] of SYSTEM_TABLE_NAMES) {
      this.tableRegistry.set(id, name);
    }
    for (const [id, fields] of SYSTEM_TABLE_FIELDS) {
      this.tableFieldRegistry.set(id, fields);
    }
  }

  /**
   * Index a single file and add it to the index
   *
   * @param filePath - Absolute file path to index
   * @returns Promise that resolves when indexing is complete
   * @throws Error if file cannot be read or parsed
   */
  async add(filePath: string): Promise<void> {
    const indexedAt = Date.now();
    const { symbols, tableInfo, fieldInfo, procedureInfo, objectMetadata } = await this.extractSymbols(filePath);

    // Remove old table contribution for this file (if any)
    const oldId = this.fileTableContributions.get(filePath);
    if (oldId !== undefined) {
      if (this.tableOwner.get(oldId) === filePath) {
        this.tableRegistry.delete(oldId);
        this.tableOwner.delete(oldId);
      }
      this.fileTableContributions.delete(filePath);
    }

    // Add new table contribution (skip system table ID range — reserved for seeded entries)
    if (tableInfo && tableInfo.id < 2_000_000_000) {
      this.tableRegistry.set(tableInfo.id, tableInfo.name);
      this.tableOwner.set(tableInfo.id, filePath);
      this.fileTableContributions.set(filePath, tableInfo.id);
    }

    // Remove old field contribution for this file (if any)
    const oldFieldId = this.fileFieldContributions.get(filePath);
    if (oldFieldId !== undefined) {
      if (this.fieldOwner.get(oldFieldId) === filePath) {
        this.tableFieldRegistry.delete(oldFieldId);
        this.fieldOwner.delete(oldFieldId);
      }
      this.fileFieldContributions.delete(filePath);
    }

    // Add new field contribution (skip system table ID range — reserved for seeded entries)
    if (fieldInfo && fieldInfo.id < 2_000_000_000) {
      this.tableFieldRegistry.set(fieldInfo.id, fieldInfo.fields);
      this.fieldOwner.set(fieldInfo.id, filePath);
      this.fileFieldContributions.set(filePath, fieldInfo.id);
    }

    // Remove old procedure contribution for this file (if any)
    const oldProcId = this.fileProcedureContributions.get(filePath);
    if (oldProcId !== undefined) {
      if (this.procedureOwner.get(oldProcId) === filePath) {
        this.tableProcedureRegistry.delete(oldProcId);
        this.procedureOwner.delete(oldProcId);
      }
      this.fileProcedureContributions.delete(filePath);
    }

    // Add new procedure contribution (skip system table ID range — reserved for seeded entries)
    if (procedureInfo && procedureInfo.id < 2_000_000_000) {
      this.tableProcedureRegistry.set(procedureInfo.id, procedureInfo.procedures);
      this.procedureOwner.set(procedureInfo.id, filePath);
      this.fileProcedureContributions.set(filePath, procedureInfo.id);
    }

    this.fileObjectMetadata.set(filePath, objectMetadata);

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
    const oldId = this.fileTableContributions.get(filePath);
    if (oldId !== undefined) {
      if (this.tableOwner.get(oldId) === filePath) {
        this.tableRegistry.delete(oldId);
        this.tableOwner.delete(oldId);
        // Clear all other fileTableContributions entries that point to the
        // same table ID — they are now orphaned since the owning file is gone.
        for (const [contributorPath, id] of this.fileTableContributions) {
          if (id === oldId) {
            this.fileTableContributions.delete(contributorPath);
          }
        }
      } else {
        this.fileTableContributions.delete(filePath);
      }
    }

    const oldFieldId = this.fileFieldContributions.get(filePath);
    if (oldFieldId !== undefined) {
      if (this.fieldOwner.get(oldFieldId) === filePath) {
        this.tableFieldRegistry.delete(oldFieldId);
        this.fieldOwner.delete(oldFieldId);
        // Clear all other fileFieldContributions entries that point to the
        // same table ID — they are now orphaned since the owning file is gone.
        for (const [contributorPath, id] of this.fileFieldContributions) {
          if (id === oldFieldId) {
            this.fileFieldContributions.delete(contributorPath);
          }
        }
      } else {
        this.fileFieldContributions.delete(filePath);
      }
    }

    const oldProcId = this.fileProcedureContributions.get(filePath);
    if (oldProcId !== undefined) {
      if (this.procedureOwner.get(oldProcId) === filePath) {
        this.tableProcedureRegistry.delete(oldProcId);
        this.procedureOwner.delete(oldProcId);
        for (const [contributorPath, id] of this.fileProcedureContributions) {
          if (id === oldProcId) {
            this.fileProcedureContributions.delete(contributorPath);
          }
        }
      } else {
        this.fileProcedureContributions.delete(filePath);
      }
    }

    this.index.delete(filePath);
    this.fileObjectMetadata.delete(filePath);
  }

  /**
   * Clear all entries from the index
   */
  clear(): void {
    this._userTablesIndexed = false;
    this.index.clear();
    this.tableRegistry.clear();
    this.tableOwner.clear();
    this.fileTableContributions.clear();
    this.tableFieldRegistry.clear();
    this.fieldOwner.clear();
    this.fileFieldContributions.clear();
    this.tableProcedureRegistry.clear();
    this.procedureOwner.clear();
    this.fileProcedureContributions.clear();
    this.fileObjectMetadata.clear();
    this.seedSystemTables();
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
   * Get metadata for all indexed objects across all files.
   * Returns one entry per object — a file with multiple OBJECT blocks produces multiple entries.
   * Used by the Object Explorer to populate its table.
   *
   * @returns Array of ObjectMetadata, in no particular order
   */
  getObjectList(): ObjectMetadata[] {
    const result: ObjectMetadata[] = [];
    for (const entries of this.fileObjectMetadata.values()) {
      result.push(...entries);
    }
    return result;
  }

  /**
   * Get the number of files in the index
   */
  get fileCount(): number {
    return this.index.size;
  }

  /**
   * Get the table registry mapping table IDs to table names.
   * Used by SymbolTable.buildFromAST() to resolve blank-named DataItems.
   *
   * @returns ReadonlyMap of tableId → tableName
   */
  getTableRegistry(): ReadonlyMap<number, string> {
    return this.tableRegistry;
  }

  /**
   * Get the field registry mapping table IDs to field maps.
   * Used by SymbolTable.buildFromAST() to inject SourceTable fields into pages.
   *
   * @returns ReadonlyMap of tableId → (uppercaseFieldName → FieldInfo)
   */
  getFieldRegistry(): ReadonlyMap<number, ReadonlyMap<string, FieldInfo>> {
    return this.tableFieldRegistry;
  }

  /**
   * Get the procedure registry mapping table IDs to procedure name maps.
   * Used by validateMemberProperty() to suppress false-positive undefined-property warnings
   * for user-defined table procedure calls.
   *
   * @returns ReadonlyMap of tableId → ReadonlyMap of (uppercaseName → originalName)
   */
  getProcedureRegistry(): ReadonlyMap<number, ReadonlyMap<string, string>> {
    return this.tableProcedureRegistry;
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
   * Get whether user tables have been indexed (i.e., indexDirectory() has completed).
   * Used to determine if undefined-identifier validation should be enabled for elements sections.
   */
  get userTablesIndexed(): boolean {
    return this._userTablesIndexed;
  }

  /**
   * Signal that all workspace folders have been indexed.
   * Call this once after all indexDirectory() calls complete.
   * Kept separate from indexDirectory() so the flag is not set prematurely
   * when multiple workspace folders are indexed in a loop.
   */
  markIndexingComplete(): void {
    this._userTablesIndexed = true;
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
   * @returns Promise with extracted symbols, table info, field info, and procedure info
   * @throws Error if file cannot be read or parsed
   */
  private async extractSymbols(filePath: string): Promise<{
    symbols: SymbolInformation[];
    tableInfo?: { id: number; name: string };
    fieldInfo?: { id: number; fields: Map<string, FieldInfo> };
    procedureInfo?: { id: number; procedures: Map<string, string> };
    objectMetadata: ObjectMetadata[];
  }> {
    // Read file with encoding detection
    const { content } = await readFileWithEncodingAsync(filePath);

    // Convert to file:// URI
    const uri = pathToFileURL(filePath).href;

    // Scan content for all OBJECT declarations (handles multi-object files)
    const objectMetadata: ObjectMetadata[] = [];
    const objectPattern = /^OBJECT\s+(Table|Page|Report|Codeunit|XMLport|Query|MenuSuite)\s+(\d+)\s+([^\r\n]*?)\s*$/gm;
    let match: RegExpExecArray | null;
    while ((match = objectPattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length - 1;
      objectMetadata.push({
        type: match[1],
        id: parseInt(match[2], 10),
        name: match[3],
        uri,
        line: lineNumber
      });
    }

    // Create TextDocument
    const textDocument = TextDocument.create(uri, 'cal', 1, content);

    // Parse document
    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Populate optional objectProperties fields from the parsed AST
    if (ast.object?.objectProperties) {
      const matchingEntry = objectMetadata.find(m => m.id === ast.object!.objectId);
      if (matchingEntry) {
        matchingEntry.date = ast.object.objectProperties.date;
        matchingEntry.time = ast.object.objectProperties.time;
        matchingEntry.modified = ast.object.objectProperties.modified;
        matchingEntry.versionList = ast.object.objectProperties.versionList;
      }
    }

    // Extract document symbols
    const documentSymbols = this.documentSymbolProvider.getDocumentSymbols(textDocument, ast);

    // Flatten to SymbolInformation
    const symbols: SymbolInformation[] = [];
    for (const docSymbol of documentSymbols) {
      const flatSymbols = flattenDocumentSymbols(docSymbol, uri);
      symbols.push(...flatSymbols);
    }

    // Extract table info for the table registry
    let tableInfo: { id: number; name: string } | undefined;
    let fieldInfo: { id: number; fields: Map<string, FieldInfo> } | undefined;
    let procedureInfo: { id: number; procedures: Map<string, string> } | undefined;

    if (ast.object?.objectKind === ObjectKind.Table && ast.object.objectName) {
      tableInfo = { id: ast.object.objectId, name: ast.object.objectName };

      // Extract field information with uppercase keys
      const fields = new Map<string, FieldInfo>();
      if (ast.object.fields?.fields) {
        for (const field of ast.object.fields.fields) {
          if (field.fieldName) {
            fields.set(field.fieldName.toUpperCase(), {
              originalName: field.fieldName,
              typeName: field.dataType.typeName
            });
          }
        }
      }

      fieldInfo = { id: ast.object.objectId, fields };

      // Extract procedure names: uppercase key for case-insensitive lookup, original value for display.
      // LOCAL procedures are included — false negatives preferred over false positives;
      // cross-object LOCAL procedure calls are a separate diagnostic concern.
      const procedures = new Map<string, string>();
      if (ast.object.code?.procedures) {
        for (const proc of ast.object.code.procedures) {
          if (proc.name) {
            procedures.set(proc.name.toUpperCase(), proc.name);
          }
        }
      }
      procedureInfo = { id: ast.object.objectId, procedures };
    }

    return { symbols, tableInfo, fieldInfo, procedureInfo, objectMetadata };
  }
}
