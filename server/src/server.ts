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
  ReferenceParams
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
import { SymbolTable } from './symbols/symbolTable';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Semantic tokens provider
const semanticTokensProvider = new SemanticTokensProvider();

// Completion provider
const completionProvider = new CompletionProvider();

// Hover provider
const hoverProvider = new HoverProvider();

// Signature help provider
const signatureHelpProvider = new SignatureHelpProvider();

// Definition provider
const definitionProvider = new DefinitionProvider();

// Reference provider
const referenceProvider = new ReferenceProvider();

// Cache for parsed documents (includes symbol table and parse errors)
interface ParsedDocument {
  ast: CALDocument;
  lexer: Lexer;
  symbolTable: SymbolTable;
  errors: ParseError[];
}
const documentCache = new Map<string, ParsedDocument>();

connection.onInitialize((_params: InitializeParams) => {
  connection.console.log('C/AL Language Server initializing...');

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      semanticTokensProvider: {
        legend: getSemanticTokensLegend(),
        full: true,
        range: false
      },
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
      referencesProvider: true
    }
  };

  connection.console.log('Capabilities registered: semanticTokens, completion, hover, signatureHelp, definition, references');
  return result;
});

connection.onInitialized(() => {
  connection.console.log('C/AL Language Server initialized');
});

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
    const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    connection.console.error(`Error building semantic tokens: ${msg}`);
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
    const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    connection.console.error(`Error getting completions: ${msg}`);
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
    const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    connection.console.error(`Error getting hover info: ${msg}`);
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
    const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    connection.console.error(`Error getting signature help: ${msg}`);
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
    const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    connection.console.error(`Error getting definition: ${msg}`);
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
    const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    connection.console.error(`Error getting references: ${msg}`);
    return [];
  }
});

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

// Validate and provide diagnostics
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  try {
    // Parse document and get cached errors (no double parsing!)
    const { errors } = parseDocument(textDocument);

    // Convert parse errors to diagnostics
    const diagnostics: Diagnostic[] = errors.map(error => ({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: error.token.line - 1, character: error.token.column - 1 },
        end: { line: error.token.line - 1, character: error.token.column + error.token.value.length - 1 }
      },
      message: error.message,
      source: 'cal'
    }));

    // Send diagnostics to client
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  } catch (error) {
    const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    connection.console.error(`Error validating document: ${msg}`);
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
  documentCache.delete(event.document.uri);
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

connection.console.log('C/AL Language Server started');
