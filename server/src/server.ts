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
import { WorkspaceSymbolProvider } from './workspaceSymbol';
import { FoldingRangeProvider } from './foldingRange/foldingRangeProvider';
import { SymbolTable } from './symbols/symbolTable';
import { formatError } from './utils/sanitize';
import { SemanticAnalyzer } from './semantic/semanticAnalyzer';
import { DepthLimitedWalker } from './visitor/depthLimitedWalker';
import { DocumentDebouncer } from './utils/documentDebouncer';
import { CALSettings, defaultSettings } from './settings';
import { BuiltinRegistry } from './builtins';

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

connection.onInitialize((params: InitializeParams) => {
  connection.console.log('C/AL Language Server initializing...');

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

connection.onInitialized(() => {
  connection.console.log('C/AL Language Server initialized');
  updateSettings();
});

// Handle configuration changes
connection.onDidChangeConfiguration(() => {
  updateSettings();
});

/**
 * Update settings from client and re-validate all documents
 */
async function updateSettings(): Promise<void> {
  try {
    // Query narrow section (cal.diagnostics)
    const config = await connection.workspace.getConfiguration('cal.diagnostics');

    // Defensive null checking
    if (config !== null && typeof config === 'object') {
      const diagnosticsConfig = config as { warnDeprecated?: unknown };

      // Extract warnDeprecated with type safety
      const warnDeprecated = typeof diagnosticsConfig.warnDeprecated === 'boolean'
        ? diagnosticsConfig.warnDeprecated
        : defaultSettings.diagnostics.warnDeprecated;

      // Update settings
      currentSettings = {
        diagnostics: {
          warnDeprecated
        }
      };

      connection.console.log(`Settings updated: warnDeprecated=${warnDeprecated}`);
    } else {
      // Config query returned null/undefined - use defaults
      currentSettings = defaultSettings;
      connection.console.log('Settings update: config query returned null, using defaults');
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
    const { ast, symbolTable } = parseDocument(document);
    return renameProvider.prepareRename(
      document,
      params.position,
      ast,
      symbolTable
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
    const { ast, symbolTable } = parseDocument(document);
    return renameProvider.getRenameEdits(
      document,
      params.position,
      params.newName,
      ast,
      symbolTable
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

    const results = workspaceSymbolProvider.search(params.query, parsedDocs);
    connection.console.log(`[WorkspaceSymbol] Returning ${results.length} symbols`);
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
    const { ast } = parseDocument(document);
    return foldingRangeProvider.provide(document, ast);
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
      source: 'cal'
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
  symbolTable.buildFromAST(ast);

  // Cache result including errors
  const result: ParsedDocument = { ast, lexer, symbolTable, errors };
  documentCache.set(uri, result);

  return result;
}

// Clear cache when document is closed
documents.onDidClose(event => {
  // Cancel pending semantic analysis for this document
  semanticDebouncer.cancel(event.document.uri);
  documentCache.delete(event.document.uri);
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

connection.console.log('C/AL Language Server started');
