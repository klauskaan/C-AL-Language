/**
 * Code completion provider for C/AL language server
 * Phase 1: Keyword and data type completion
 * Phase 2: Global symbol completion
 * Phase 3: Built-in function completion
 * Phase 4: Dot trigger and field completion
 */

import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemTag,
  Position
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { KEYWORDS, TokenType } from '../lexer/tokens';
import { SymbolTable, Symbol, Scope } from '../symbols/symbolTable';
import { CALDocument } from '../parser/ast';
import { BUILTIN_FUNCTIONS, RECORD_METHODS, BuiltinFunction } from './builtins';
import { ProviderBase } from '../providers/providerBase';
import { getMetadataByTokenType } from '../shared/keywordMetadata';

/**
 * Map symbol kind to completion item kind
 */
function mapSymbolKind(kind: Symbol['kind']): CompletionItemKind {
  switch (kind) {
    case 'variable':
      return CompletionItemKind.Variable;
    case 'parameter':
      return CompletionItemKind.Variable;
    case 'field':
      return CompletionItemKind.Field;
    case 'procedure':
      return CompletionItemKind.Function;
    case 'function':
      return CompletionItemKind.Function;
    default:
      return CompletionItemKind.Text;
  }
}

/**
 * Build completion item from builtin function
 */
function buildBuiltinItem(func: BuiltinFunction): CompletionItem {
  const item: CompletionItem = {
    label: func.name,
    kind: CompletionItemKind.Function,
    detail: func.signature,
    documentation: func.documentation,
    insertText: func.name
  };

  // Add deprecation indicator if the function is deprecated
  if (func.deprecated) {
    item.tags = [CompletionItemTag.Deprecated];
    item.documentation = `${func.documentation}\n\n**Deprecated:** ${func.deprecated}`;
  }

  return item;
}

/**
 * Collect all symbols visible from a scope by walking up the parent chain.
 * Inner scope symbols take precedence over outer scope symbols (shadowing).
 * @param scope - The starting scope
 * @returns Array of visible symbols
 */
function getVisibleSymbols(scope: Scope): Symbol[] {
  const seenNames = new Set<string>();
  const symbols: Symbol[] = [];
  let currentScope: Scope | null = scope;

  // Walk up the scope chain, collecting symbols
  // Inner scope symbols are added first, so they take precedence (shadowing)
  while (currentScope !== null) {
    for (const symbol of currentScope.getOwnSymbols()) {
      const normalizedName = symbol.name.toLowerCase();
      // Only add if not already seen (respects shadowing)
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        symbols.push(symbol);
      }
    }
    currentScope = currentScope.parent;
  }

  return symbols;
}

/**
 * Main completion provider class
 * Extends ProviderBase for shared text scanning utilities
 */
export class CompletionProvider extends ProviderBase {
  private keywordItems: CompletionItem[] = [];

  constructor() {
    super();
    this.initializeKeywords();
  }

  /**
   * Initialize keyword completion items from KEYWORDS map
   */
  private initializeKeywords(): void {
    for (const [keyword, tokenType] of KEYWORDS) {
      // Use proper case for display (capitalize first letter)
      const displayName = keyword.toUpperCase();
      const metadata = getMetadataByTokenType(tokenType);

      this.keywordItems.push({
        label: displayName,
        kind: metadata?.completionKind || CompletionItemKind.Keyword,
        insertText: displayName,
        detail: metadata?.category
      });
    }

    // Add CODE as Data Type (Code_Type) - CODE already added as Section from KEYWORDS loop
    const codeTypeMetadata = getMetadataByTokenType(TokenType.Code_Type);
    if (codeTypeMetadata) {
      this.keywordItems.push({
        label: 'CODE',
        kind: CompletionItemKind.TypeParameter,
        insertText: 'CODE',
        detail: codeTypeMetadata.category,
      });
    }
  }

  /**
   * Get the prefix (partial word) at/before the cursor position for filtering
   * Unlike getWordAtPosition, this only returns the text before the cursor
   *
   * @param document - The text document
   * @param position - The cursor position
   * @returns The prefix string (may be empty)
   */
  private getPrefixAtPosition(document: TextDocument, position: Position): string {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const start = this.scanBackward(text, offset - 1, c => ProviderBase.IDENTIFIER_PATTERN.test(c));
    return text.substring(start, offset);
  }

  /**
   * Get completions for the given document and position
   *
   * Phase 1: Keywords and data types
   * Phase 2: Global symbols (variables, fields, procedures)
   * Phase 3: Built-in functions
   * Phase 4: Dot trigger completions
   */
  public getCompletions(
    document: TextDocument,
    position: Position,
    ast?: CALDocument,
    symbolTable?: SymbolTable,
    triggerCharacter?: string
  ): CompletionItem[] {
    const items: CompletionItem[] = [];

    // Phase 4: Handle dot trigger
    if (triggerCharacter === '.' || this.isAfterDot(document, position)) {
      return this.getDotCompletions(document, position, ast, symbolTable);
    }

    // Get the current word prefix for filtering
    const prefix = this.getPrefixAtPosition(document, position).toLowerCase();

    // Phase 1: Keyword completion
    for (const item of this.keywordItems) {
      if (!prefix || item.label.toLowerCase().startsWith(prefix)) {
        items.push(item);
      }
    }

    // Phase 2: Symbol completion - scope-aware
    if (symbolTable) {
      // Get the offset from cursor position for scope-aware lookup
      const offset = document.offsetAt(position);
      const scope = symbolTable.getScopeAtOffset(offset);
      // Get only symbols visible from the current scope (respects shadowing)
      const visibleSymbols = getVisibleSymbols(scope);

      for (const symbol of visibleSymbols) {
        if (!prefix || symbol.name.toLowerCase().startsWith(prefix)) {
          items.push({
            label: symbol.name,
            kind: mapSymbolKind(symbol.kind),
            detail: symbol.type || symbol.kind,
            insertText: symbol.name
          });
        }
      }
    }

    // Phase 3: Built-in functions
    for (const func of BUILTIN_FUNCTIONS) {
      if (!prefix || func.name.toLowerCase().startsWith(prefix)) {
        items.push(buildBuiltinItem(func));
      }
    }

    return items;
  }

  /**
   * Get completions after a dot operator (Phase 4)
   */
  private getDotCompletions(
    document: TextDocument,
    position: Position,
    ast?: CALDocument,
    symbolTable?: SymbolTable
  ): CompletionItem[] {
    const items: CompletionItem[] = [];
    const prefix = this.getPrefixAtPosition(document, position).toLowerCase();

    // Get the identifier before the dot
    const varName = this.getIdentifierBeforeDot(document, position);

    if (varName && symbolTable) {
      // Use scope-aware lookup to find the symbol
      const offset = document.offsetAt(position);
      const symbol = symbolTable.getSymbolAtOffset(varName, offset);

      if (symbol) {
        // We found the symbol - check its type
        if (symbol.type?.toLowerCase().startsWith('record')) {
          // It's a Record type - show Record methods
          for (const method of RECORD_METHODS) {
            if (!prefix || method.name.toLowerCase().startsWith(prefix)) {
              items.push(buildBuiltinItem(method));
            }
          }

          // Add table fields if we're editing the table itself
          if (ast?.object?.fields) {
            for (const field of ast.object.fields.fields) {
              const fieldName = field.fieldName;
              if (!prefix || fieldName.toLowerCase().startsWith(prefix)) {
                // Quote field names with spaces
                const insertText = fieldName.includes(' ') ? `"${fieldName}"` : fieldName;
                items.push({
                  label: fieldName,
                  kind: CompletionItemKind.Field,
                  detail: field.dataType.typeName,
                  insertText: insertText
                });
              }
            }
          }
        }
        // For non-Record types, return empty - we don't know what methods to suggest
        // Future: Add type-specific methods for other types (Page, Report, etc.)
        return items;
      }
    }

    // Fallback: Symbol not found in symbol table
    // This happens when variable hasn't been parsed yet or is external
    // Show Record methods as a reasonable guess since Records are most common
    if (varName) {
      for (const method of RECORD_METHODS) {
        if (!prefix || method.name.toLowerCase().startsWith(prefix)) {
          items.push(buildBuiltinItem(method));
        }
      }
    }

    return items;
  }
}