import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  SemanticTokensBuilder,
  SemanticTokensParams,
  Diagnostic,
  DiagnosticSeverity,
  CompletionItem,
  CompletionParams,
  Hover,
  HoverParams,
  SignatureHelp,
  SignatureHelpParams,
  Location,
  DefinitionParams,
  ReferenceParams,
  CodeLens,
  CodeLensParams,
  DocumentSymbol,
  DocumentSymbolParams,
  PrepareRenameParams,
  RenameParams,
  WorkspaceEdit,
  WorkspaceSymbolParams,
  SymbolInformation,
  FoldingRange,
  FoldingRangeParams
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { SemanticTokensProvider, getSemanticTokensLegend } from './semantic/semanticTokens';
import { CALDocument } from './parser/ast';
import { ParseError } from './parser/parser';
import { CompletionProvider } from './completion';
import { HoverProvider } from './hover';
import { SignatureHelpProvider } from './signatureHelp';
import { DefinitionProvider } from './definition';
import { ReferenceProvider } from './references';
import { CodeLensProvider } from './codelens';
import { DocumentSymbolProvider } from './documentSymbol';
import { RenameProvider } from './rename';
import { WorkspaceSymbolProvider, DEFAULT_MAX_SYMBOLS } from './workspaceSymbol';
import { FoldingRangeProvider } from './foldingRange/foldingRangeProvider';
import { SymbolTable } from './symbols/symbolTable';
import { formatError } from './utils/sanitize';
import { SemanticAnalyzer } from './semantic/semanticAnalyzer';
import { DepthLimitedWalker } from './visitor/depthLimitedWalker';
import { DocumentDebouncer } from './utils/documentDebouncer';
import { CALSettings, defaultSettings } from './settings';
import { BuiltinRegistry } from './builtins';
import { WorkspaceIndex } from './workspaceSymbol/workspaceIndex';
import { fileURLToPath } from 'url';
import { hasCalExtension, hasTxtExtension } from './utils/fileExtensions';
import { isCalContent } from './utils/calDetection';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Shared builtin registry (injected into providers)
const builtinRegistry = new BuiltinRegistry();

// Semantic tokens provider
const semanticTokensProvider = new SemanticTokensProvider();

// Completion provider
const completionProvider = new CompletionProvider();

// Hover provider
const hoverProvider = new HoverProvider(builtinRegistry);

// Signature help provider
const signatureHelpProvider = new SignatureHelpProvider(builtinRegistry);

// Definition provider
const definitionProvider = new DefinitionProvider();

// Reference provider
const referenceProvider = new ReferenceProvider();

// CodeLens provider
const codeLensProvider = new CodeLensProvider();

// DocumentSymbol provider (Outline view)
const documentSymbolProvider = new DocumentSymbolProvider();

// Rename provider
const renameProvider = new RenameProvider();

// WorkspaceSymbol provider (Ctrl+T - Go to Symbol in Workspace)
const workspaceSymbolProvider = new WorkspaceSymbolProvider(
  documentSymbolProvider,
  connection
);

// WorkspaceIndex (file-based symbol indexing)
const workspaceIndex = new WorkspaceIndex();

// FoldingRange provider (code folding)
const foldingRangeProvider = new FoldingRangeProvider();

// Semantic analyzer (runs all semantic validations)
const semanticAnalyzer = new SemanticAnalyzer(builtinRegistry);

// Depth-limited walker (stack overflow protection - Issue #220)
const depthLimitedWalker = new DepthLimitedWalker();

// Cache for parsed documents (includes symbol table and parse errors)
interface ParsedDocument {
  ast: CALDocument;
  lexer: Lexer;
  symbolTable: SymbolTable;
  errors: ParseError[];
}
const documentCache = new Map<string, ParsedDocument>();

// Store workspace folders for indexing
let workspaceFolders: string[] = [];

connection.onInitialize((params: InitializeParams) => {
  connection.console.log('C/AL Language Server initializing...');

  // Capture workspace folders
  if (params.workspaceFolders) {
    workspaceFolders = params.workspaceFolders
      .map(folder => {
        try {
          return fileURLToPath(folder.uri);
        } catch (error) {
          connection.console.warn(`Failed to convert workspace folder URI: ${folder.uri}`);
          return null;
        }
      })
      .filter((path): path is string => path !== null);

    connection.console.log(`Workspace folders: ${workspaceFolders.join(', ')}`);
  }

  // Check if semantic highlighting is enabled via initialization options
  const initOptions = params.initializationOptions as { semanticHighlighting?: boolean } | undefined;
  const semanticHighlightingEnabled = initOptions?.semanticHighlighting ?? true;

  connection.console.log(`Semantic highlighting: ${semanticHighlightingEnabled ? 'enabled' : 'disabled'}`);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Only register semantic tokens provider if enabled
      semanticTokensProvider: semanticHighlightingEnabled ? {
        legend: getSemanticTokensLegend(),
        full: true,
        range: false
      } : undefined,
      completionProvider: {
        triggerCharacters: ['.', ':'],
        resolveProvider: false
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ','],
        retriggerCharacters: [',']
      },
      definitionProvider: true,
      referencesProvider: true,
      codeLensProvider: {
        resolveProvider: false
      },
      documentSymbolProvider: true,
      renameProvider: {
        prepareProvider: true
      },
      workspaceSymbolProvider: true,
      foldingRangeProvider: true
    }
  };

  connection.console.log('Capabilities registered: semanticTokens, completion, hover, signatureHelp, definition, references, codeLens, documentSymbol, rename, workspaceSymbol, foldingRanges');
  return result;
});

/**
 * Index all .cal files (and optionally .txt files) in workspace folders
 * Runs asynchronously after server initialization
 */
async function indexWorkspace(): Promise<void> {
  if (workspaceFolders.length === 0) {
    connection.console.log('No workspace folders to index');
    return;
  }

  connection.console.log('Starting workspace indexing...');

  const includeTxtFiles = currentSettings.workspaceIndexing.includeTxtFiles;

  for (const folder of workspaceFolders) {
    try {
      await workspaceIndex.indexDirectory(folder, { includeTxtFiles });
      connection.console.log(`Indexed ${folder}: ${workspaceIndex.fileCount} files, ${workspaceIndex.symbolCount} symbols`);
    } catch (error) {
      connection.console.error(`Failed to index ${folder}: ${formatError(error)}`);
    }
  }

  connection.console.log(`Workspace indexing complete: ${workspaceIndex.fileCount} files, ${workspaceIndex.symbolCount} symbols`);
}

connection.onInitialized(async () => {
  connection.console.log('C/AL Language Server initialized');
  await updateSettings();

  // Start workspace indexing (non-blocking)
  indexWorkspace().catch(error => {
    connection.console.error(`Workspace indexing failed: ${formatError(error)}`);
  });
});

// Handle configuration changes
connection.onDidChangeConfiguration(() => {
  updateSettings();
});

// Handle file system changes (create, update, delete)
connection.onDidChangeWatchedFiles(async (params) => {
  for (const change of params.changes) {
    try {
      const filePath = fileURLToPath(change.uri);

      // Check if file is .cal or .txt
      const isCalFile = hasCalExtension(filePath);
      const isTxtFile = hasTxtExtension(filePath);

      // Skip files that are neither .cal nor .txt
      if (!isCalFile && !isTxtFile) {
        continue;
      }

      // For .txt files, skip if includeTxtFiles setting is false
      if (isTxtFile && !currentSettings.workspaceIndexing.includeTxtFiles) {
        continue;
      }

      // FileChangeType: Created = 1, Changed = 2, Deleted = 3
      if (change.type === 3) {
        // File deleted
        workspaceIndex.remove(filePath);
        connection.console.log(`Removed from index: ${filePath}`);
      } else {
        // File created or changed
        // For .txt files, run heuristic check first
        if (isTxtFile) {
          const hasCalContent = await isCalContent(filePath);
          if (!hasCalContent) {
            // Not a C/AL file, skip indexing
            continue;
          }
        }

        const timestamp = Date.now();
        const wasUpdated = await workspaceIndex.updateIfNotFresher(filePath, timestamp);
        if (wasUpdated) {
          connection.console.log(`Updated in index: ${filePath}`);
        }
      }
    } catch (error) {
      connection.console.warn(`Failed to handle file change for ${change.uri}: ${formatError(error)}`);
    }
  }
});

/**
 * Update settings from client and re-validate all documents
 */
async function updateSettings(): Promise<void> {
  try {
    // Query diagnostics section
    const diagnosticsConfig = await connection.workspace.getConfiguration('cal.diagnostics');
    // Query workspaceIndexing section
    const workspaceIndexingConfig = await connection.workspace.getConfiguration('cal.workspaceIndexing');

    // Extract diagnostics settings with type safety
    const warnDeprecated = diagnosticsConfig !== null && typeof diagnosticsConfig === 'object' &&
                          typeof (diagnosticsConfig as { warnDeprecated?: unknown }).warnDeprecated === 'boolean'
      ? (diagnosticsConfig as { warnDeprecated: boolean }).warnDeprecated
      : defaultSettings.diagnostics.warnDeprecated;

    const warnUnknownAttributes = diagnosticsConfig !== null && typeof diagnosticsConfig === 'object' &&
                                  typeof (diagnosticsConfig as { warnUnknownAttributes?: unknown }).warnUnknownAttributes === 'boolean'
      ? (diagnosticsConfig as { warnUnknownAttributes: boolean }).warnUnknownAttributes
      : defaultSettings.diagnostics.warnUnknownAttributes;

    const warnActionNesting = diagnosticsConfig !== null && typeof diagnosticsConfig === 'object' &&
                              typeof (diagnosticsConfig as { warnActionNesting?: unknown }).warnActionNesting === 'boolean'
      ? (diagnosticsConfig as { warnActionNesting: boolean }).warnActionNesting
      : defaultSettings.diagnostics.warnActionNesting;

    // Extract workspaceIndexing settings with type safety
    const includeTxtFiles = workspaceIndexingConfig !== null && typeof workspaceIndexingConfig === 'object' &&
                            typeof (workspaceIndexingConfig as { includeTxtFiles?: unknown }).includeTxtFiles === 'boolean'
      ? (workspaceIndexingConfig as { includeTxtFiles: boolean }).includeTxtFiles
      : defaultSettings.workspaceIndexing.includeTxtFiles;

    // Detect setting changes that require re-indexing
    const previousIncludeTxtFiles = currentSettings.workspaceIndexing.includeTxtFiles;
    const settingChanged = previousIncludeTxtFiles !== includeTxtFiles;

    // Update settings
    currentSettings = {
      diagnostics: {
        warnDeprecated,
        warnUnknownAttributes,
        warnActionNesting
      },
      workspaceIndexing: {
        includeTxtFiles
      }
    };

    connection.console.log(`Settings updated: warnDeprecated=${warnDeprecated}, warnUnknownAttributes=${warnUnknownAttributes}, warnActionNesting=${warnActionNesting}, includeTxtFiles=${includeTxtFiles}`);

    // Re-index workspace if includeTxtFiles setting changed
    if (settingChanged) {
      connection.console.log(`includeTxtFiles changed (${previousIncludeTxtFiles} -> ${includeTxtFiles}), re-indexing workspace...`);

      // Clear existing index
      workspaceIndex.clear();

      // Re-index with new settings
      indexWorkspace().catch(error => {
        connection.console.error(`Workspace re-indexing failed: ${formatError(error)}`);
      });
    }

    // Re-validate all open documents
    documents.all().forEach(doc => validateTextDocument(doc));
  } catch (error) {
    connection.console.error(`Error updating settings: ${formatError(error)}`);
    // On error, keep current settings
  }
}

// Handle semantic tokens request
connection.languages.semanticTokens.on((params: SemanticTokensParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return { data: [] };
  }

  try {
    // Parse the document
    const { ast, lexer } = parseDocument(document);

    // Build semantic tokens
    const builder = new SemanticTokensBuilder();
    semanticTokensProvider.buildSemanticTokens(lexer.getTokens(), ast, builder);

    return builder.build();
  } catch (error) {
    connection.console.error(`Error building semantic tokens: ${formatError(error)}`);
    return { data: [] };
  }
});

// Handle completion requests
connection.onCompletion((params: CompletionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  try {
    const { ast, symbolTable } = parseDocument(document);
    const triggerCharacter = params.context?.triggerCharacter;

    return completionProvider.getCompletions(
      document,
      params.position,
      ast,
      symbolTable,
      triggerCharacter
    );
  } catch (error) {
    connection.console.error(`Error getting completions: ${formatError(error)}`);
    return [];
  }
});

// Handle hover requests
connection.onHover((params: HoverParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  try {
    const { ast, symbolTable, lexer } = parseDocument(document);

    return hoverProvider.getHover(
      document,
      params.position,
      ast,
      symbolTable,
      lexer.getTokens()
    );
  } catch (error) {
    connection.console.error(`Error getting hover info: ${formatError(error)}`);
    return null;
  }
});

// Handle signature help requests
connection.onSignatureHelp((params: SignatureHelpParams): SignatureHelp | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  try {
    const { ast, symbolTable } = parseDocument(document);

    return signatureHelpProvider.getSignatureHelp(
      document,
      params.position,
      ast,
      symbolTable
    );
  } catch (error) {
    connection.console.error(`Error getting signature help: ${formatError(error)}`);
    return null;
  }
});

// Handle definition requests (Go to Definition - F12)
connection.onDefinition((params: DefinitionParams): Location | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  try {
    const { ast, symbolTable } = parseDocument(document);

    return definitionProvider.getDefinition(
      document,
      params.position,
      ast,
      symbolTable
    );
  } catch (error) {
    connection.console.error(`Error getting definition: ${formatError(error)}`);
    return null;
  }
});

// Handle references requests (Find All References - Shift+F12)
connection.onReferences((params: ReferenceParams): Location[] => {
  connection.console.log(`[References] Request at line ${params.position.line}, char ${params.position.character}`);
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    connection.console.log('[References] No document found');
    return [];
  }

  try {
    const { ast } = parseDocument(document);
    connection.console.log(`[References] AST parsed, object type: ${ast.object?.type || 'none'}`);
    if (ast.object) {
      connection.console.log(`[References] Fields: ${ast.object.fields?.fields?.length || 0}`);
      connection.console.log(`[References] Code section: ${ast.object.code ? 'yes' : 'no'}`);
      if (ast.object.code) {
        connection.console.log(`[References] Global vars: ${ast.object.code.variables?.length || 0}`);
        connection.console.log(`[References] Procedures: ${ast.object.code.procedures?.length || 0}`);
        connection.console.log(`[References] Triggers: ${ast.object.code.triggers?.length || 0}`);
      }
    }

    const results = referenceProvider.getReferences(
      document,
      params.position,
      ast,
      params.context.includeDeclaration,
      (msg) => connection.console.log(msg)
    );
    connection.console.log(`[References] Found ${results.length} references`);
    return results;
  } catch (error) {
    connection.console.error(`Error getting references: ${formatError(error)}`);
    return [];
  }
});

// Handle CodeLens requests
connection.onCodeLens((params: CodeLensParams): CodeLens[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  try {
    const { ast } = parseDocument(document);
    return codeLensProvider.getCodeLenses(document, ast);
  } catch (error) {
    connection.console.error(`Error getting code lenses: ${formatError(error)}`);
    return [];
  }
});

// Handle DocumentSymbol requests (Outline view)
connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
  connection.console.log(`[DocumentSymbol] Request for: ${params.textDocument.uri}`);
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    connection.console.log('[DocumentSymbol] No document found');
    return [];
  }

  try {
    const { ast } = parseDocument(document);
    connection.console.log(`[DocumentSymbol] AST parsed, object: ${ast.object?.objectKind || 'none'}`);
    const symbols = documentSymbolProvider.getDocumentSymbols(document, ast);
    connection.console.log(`[DocumentSymbol] Returning ${symbols.length} top-level symbols`);
    if (symbols.length > 0 && symbols[0].children) {
      connection.console.log(`[DocumentSymbol] Root has ${symbols[0].children.length} children`);
    }
    return symbols;
  } catch (error) {
    connection.console.error(`Error getting document symbols: ${formatError(error)}`);
    return [];
  }
});

// Handle prepareRename requests (Validate rename position)
connection.onPrepareRename((params: PrepareRenameParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  try {
    const { ast, symbolTable, lexer } = parseDocument(document);
    return renameProvider.prepareRename(
      document,
      params.position,
      ast,
      symbolTable,
      lexer.getTokens()
    );
  } catch (error) {
    connection.console.error(`Error preparing rename: ${formatError(error)}`);
    return null;
  }
});

// Handle rename requests (Perform rename)
connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  try {
    const { ast, symbolTable, lexer } = parseDocument(document);
    return renameProvider.getRenameEdits(
      document,
      params.position,
      params.newName,
      ast,
      symbolTable,
      lexer.getTokens()
    );
  } catch (error) {
    connection.console.error(`Error performing rename: ${formatError(error)}`);
    return null;
  }
});

// Handle workspace symbol requests (Ctrl+T - Go to Symbol in Workspace)
connection.onWorkspaceSymbol((params: WorkspaceSymbolParams): SymbolInformation[] => {
  connection.console.log(`[WorkspaceSymbol] Query: "${params.query}"`);

  try {
    // Parse all open documents using cache
    const parsedDocs = Array.from(documents.all()).map(doc => {
      const { ast } = parseDocument(doc);
      return { uri: doc.uri, textDocument: doc, ast };
    });

    // Get symbols from open documents
    const openDocSymbols = workspaceSymbolProvider.search(params.query, parsedDocs);

    // Get symbols from workspace index
    const indexedSymbols = workspaceIndex.getAllSymbols();

    // Filter indexed symbols by query (case-insensitive substring match)
    const normalizedQuery = params.query.toLowerCase();
    const filteredIndexedSymbols = params.query === ''
      ? indexedSymbols
      : indexedSymbols.filter(symbol => symbol.name.toLowerCase().includes(normalizedQuery));

    // Merge: open documents take priority (deduplicate by URI)
    const openDocUris = new Set(parsedDocs.map(doc => doc.uri));
    const uniqueIndexedSymbols = filteredIndexedSymbols.filter(
      symbol => !openDocUris.has(symbol.location.uri)
    );

    const results = [...openDocSymbols, ...uniqueIndexedSymbols].slice(0, DEFAULT_MAX_SYMBOLS);
    connection.console.log(`[WorkspaceSymbol] Returning ${results.length} symbols (${openDocSymbols.length} from open docs, ${uniqueIndexedSymbols.length} from index)`);
    return results;
  } catch (error) {
    connection.console.error(`Error getting workspace symbols: ${formatError(error)}`);
    return [];
  }
});

// Handle folding range requests
connection.onFoldingRanges((params: FoldingRangeParams): FoldingRange[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  try {
    const { ast, lexer } = parseDocument(document);
    return foldingRangeProvider.provide(document, ast, lexer);
  } catch (error) {
    connection.console.error(`Error providing folding ranges: ${formatError(error)}`);
    return [];
  }
});

// Per-URI debounce for semantic analysis (split diagnostic strategy - Issue #183)
const semanticDebouncer = new DocumentDebouncer(300);

// Settings cache (defaults to standard values)
let currentSettings: CALSettings = defaultSettings;

// Handle document changes - invalidate cache and revalidate
documents.onDidChangeContent(change => {
  // CRITICAL: Clear cache before validation to ensure fresh parse
  documentCache.delete(change.document.uri);
  validateTextDocument(change.document);
});

// Handle document open
documents.onDidOpen(event => {
  validateTextDocument(event.document);
});

// Validate and provide diagnostics (split strategy - Issue #183)
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  try {
    const uri = textDocument.uri;

    // Parse document and get cached errors (no double parsing!)
    const { ast, symbolTable, errors } = parseDocument(textDocument);

    // Convert parse errors to diagnostics
    const parseDiagnostics: Diagnostic[] = errors.map(error => ({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: error.token.line - 1, character: error.token.column - 1 },
        // Use source span (includes quotes) for accurate error underlining
        end: { line: error.token.line - 1, character: error.token.column + (error.token.endOffset - error.token.startOffset) - 1 }
      },
      message: error.message,
      source: 'cal',
      code: error.code
    }));

    // IMMEDIATE: Send parse diagnostics (preserve current responsive UX)
    connection.sendDiagnostics({ uri, diagnostics: parseDiagnostics });

    // DEBOUNCED: Semantic analysis (300ms delay, per-URI)
    const version = textDocument.version;
    semanticDebouncer.schedule(uri, version, (checkUri) => {
      const doc = documents.get(checkUri);
      return doc ? { version: doc.version } : undefined;
    }, () => {
      try {
        // Run semantic validations with current settings
        const semanticDiagnostics = semanticAnalyzer.analyze(ast, symbolTable, uri, currentSettings);

        // Check for excessive nesting depth (DoS protection - Issue #220)
        depthLimitedWalker.resetDiagnostics();
        depthLimitedWalker.walk(ast, {}); // Empty visitor - just checking depth
        const depthDiagnostics = depthLimitedWalker.getDiagnostics();

        // Merge all diagnostics (parse + semantic + depth)
        const allDiagnostics = [...parseDiagnostics, ...semanticDiagnostics, ...depthDiagnostics];

        // Send combined diagnostics to client
        connection.sendDiagnostics({ uri, diagnostics: allDiagnostics });
      } catch (error) {
        connection.console.error(`Error in semantic analysis: ${formatError(error)}`);
        // On error, send only parse diagnostics
        connection.sendDiagnostics({ uri, diagnostics: parseDiagnostics });
      }
    });
  } catch (error) {
    connection.console.error(`Error validating document: ${formatError(error)}`);
  }
}

// Parse a document and cache the result (includes errors to avoid double parsing)
function parseDocument(document: TextDocument): ParsedDocument {
  const uri = document.uri;
  const text = document.getText();

  // Check cache
  const cached = documentCache.get(uri);
  if (cached) {
    return cached;
  }

  // Lex and parse
  const lexer = new Lexer(text);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const errors = parser.getErrors();

  // Build symbol table
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast, workspaceIndex.getTableRegistry());

  // Cache result including errors
  const result: ParsedDocument = { ast, lexer, symbolTable, errors };
  documentCache.set(uri, result);

  return result;
}

// Clear cache when document is closed
documents.onDidClose(async (event) => {
  // Cancel pending semantic analysis for this document
  semanticDebouncer.cancel(event.document.uri);
  documentCache.delete(event.document.uri);

  // Re-index the file from disk (if it's a .cal or .txt file)
  try {
    const filePath = fileURLToPath(event.document.uri);
    const isCalFile = hasCalExtension(filePath);
    const isTxtFile = hasTxtExtension(filePath);

    if (isCalFile) {
      // Always re-index .cal files
      await workspaceIndex.add(filePath);
      connection.console.log(`Re-indexed closed document: ${filePath}`);
    } else if (isTxtFile && currentSettings.workspaceIndexing.includeTxtFiles) {
      // For .txt files, check if it's C/AL content first
      const hasCalContent = await isCalContent(filePath);
      if (hasCalContent) {
        await workspaceIndex.add(filePath);
        connection.console.log(`Re-indexed closed document: ${filePath}`);
      }
    }
  } catch (error) {
    // If file was deleted or can't be read, remove from index
    try {
      const filePath = fileURLToPath(event.document.uri);
      workspaceIndex.remove(filePath);
      connection.console.log(`Removed deleted document from index: ${filePath}`);
    } catch (conversionError) {
      // URI conversion failed, skip
    }
  }
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

connection.console.log('C/AL Language Server started');
