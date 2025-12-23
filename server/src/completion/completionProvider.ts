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
  Position,
  TextDocument
} from 'vscode-languageserver';

import { KEYWORDS, TokenType } from '../lexer/tokens';
import { SymbolTable, Symbol, Scope } from '../symbols/symbolTable';
import { CALDocument } from '../parser/ast';
import { BUILTIN_FUNCTIONS, RECORD_METHODS, BuiltinFunction } from './builtins';

/**
 * Categories of keywords for completion
 */
const KEYWORD_CATEGORIES: Map<TokenType, CompletionItemKind> = new Map([
  // Object types - use Class
  [TokenType.Table, CompletionItemKind.Class],
  [TokenType.Page, CompletionItemKind.Class],
  [TokenType.Report, CompletionItemKind.Class],
  [TokenType.Codeunit, CompletionItemKind.Class],
  [TokenType.Query, CompletionItemKind.Class],
  [TokenType.XMLport, CompletionItemKind.Class],
  [TokenType.MenuSuite, CompletionItemKind.Class],

  // Data types - use TypeParameter
  [TokenType.Boolean, CompletionItemKind.TypeParameter],
  [TokenType.Integer_Type, CompletionItemKind.TypeParameter],
  [TokenType.Decimal_Type, CompletionItemKind.TypeParameter],
  [TokenType.Text, CompletionItemKind.TypeParameter],
  [TokenType.Code_Type, CompletionItemKind.TypeParameter],
  [TokenType.Date_Type, CompletionItemKind.TypeParameter],
  [TokenType.Time_Type, CompletionItemKind.TypeParameter],
  [TokenType.DateTime_Type, CompletionItemKind.TypeParameter],
  [TokenType.Record, CompletionItemKind.TypeParameter],
  [TokenType.RecordID, CompletionItemKind.TypeParameter],
  [TokenType.RecordRef, CompletionItemKind.TypeParameter],
  [TokenType.FieldRef, CompletionItemKind.TypeParameter],
  [TokenType.BigInteger, CompletionItemKind.TypeParameter],
  [TokenType.BigText, CompletionItemKind.TypeParameter],
  [TokenType.BLOB, CompletionItemKind.TypeParameter],
  [TokenType.GUID, CompletionItemKind.TypeParameter],
  [TokenType.Duration, CompletionItemKind.TypeParameter],
  [TokenType.Option, CompletionItemKind.TypeParameter],
  [TokenType.Char, CompletionItemKind.TypeParameter],
  [TokenType.Byte, CompletionItemKind.TypeParameter],
  [TokenType.TextConst, CompletionItemKind.TypeParameter],

  // Control flow - use Keyword
  [TokenType.If, CompletionItemKind.Keyword],
  [TokenType.Then, CompletionItemKind.Keyword],
  [TokenType.Else, CompletionItemKind.Keyword],
  [TokenType.Case, CompletionItemKind.Keyword],
  [TokenType.Of, CompletionItemKind.Keyword],
  [TokenType.While, CompletionItemKind.Keyword],
  [TokenType.Do, CompletionItemKind.Keyword],
  [TokenType.Repeat, CompletionItemKind.Keyword],
  [TokenType.Until, CompletionItemKind.Keyword],
  [TokenType.For, CompletionItemKind.Keyword],
  [TokenType.To, CompletionItemKind.Keyword],
  [TokenType.DownTo, CompletionItemKind.Keyword],
  [TokenType.Exit, CompletionItemKind.Keyword],
  [TokenType.Break, CompletionItemKind.Keyword],
  [TokenType.Begin, CompletionItemKind.Keyword],
  [TokenType.End, CompletionItemKind.Keyword],

  // Procedure/Function
  [TokenType.Procedure, CompletionItemKind.Keyword],
  [TokenType.Function, CompletionItemKind.Keyword],
  [TokenType.Local, CompletionItemKind.Keyword],
  [TokenType.Var, CompletionItemKind.Keyword],
  [TokenType.Trigger, CompletionItemKind.Keyword],

  // Operators as keywords
  [TokenType.Div, CompletionItemKind.Operator],
  [TokenType.Mod, CompletionItemKind.Operator],
  [TokenType.And, CompletionItemKind.Operator],
  [TokenType.Or, CompletionItemKind.Operator],
  [TokenType.Not, CompletionItemKind.Operator],
  [TokenType.Xor, CompletionItemKind.Operator],
  [TokenType.In, CompletionItemKind.Operator],

  // Other
  [TokenType.With, CompletionItemKind.Keyword],
  [TokenType.Array, CompletionItemKind.Keyword],
  [TokenType.Temporary, CompletionItemKind.Keyword],
  [TokenType.True, CompletionItemKind.Constant],
  [TokenType.False, CompletionItemKind.Constant],

  // Sections
  [TokenType.Properties, CompletionItemKind.Keyword],
  [TokenType.Fields, CompletionItemKind.Keyword],
  [TokenType.Keys, CompletionItemKind.Keyword],
  [TokenType.FieldGroups, CompletionItemKind.Keyword],
  [TokenType.Code, CompletionItemKind.Keyword],
]);

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
  return {
    label: func.name,
    kind: CompletionItemKind.Function,
    detail: func.signature,
    documentation: func.documentation,
    insertText: func.name
  };
}

/** Regex pattern for valid C/AL identifier characters */
const IDENTIFIER_PATTERN = /[a-zA-Z0-9_]/;

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
 */
export class CompletionProvider {
  private keywordItems: CompletionItem[] = [];

  constructor() {
    this.initializeKeywords();
  }

  /**
   * Helper to scan backwards from an offset while a predicate is true
   * Returns the position after scanning (exclusive start of matched region)
   */
  private scanBackward(text: string, startOffset: number, predicate: (char: string) => boolean): number {
    let pos = startOffset;
    while (pos >= 0 && predicate(text[pos])) {
      pos--;
    }
    return pos + 1;
  }

  /**
   * Initialize keyword completion items from KEYWORDS map
   */
  private initializeKeywords(): void {
    for (const [keyword, tokenType] of KEYWORDS) {
      // Use proper case for display (capitalize first letter)
      const displayName = keyword.toUpperCase();
      const kind = KEYWORD_CATEGORIES.get(tokenType) || CompletionItemKind.Keyword;

      this.keywordItems.push({
        label: displayName,
        kind: kind,
        insertText: displayName,
        detail: this.getKeywordDetail(tokenType)
      });
    }
  }

  /**
   * Get detail text for keyword based on category
   */
  private getKeywordDetail(tokenType: TokenType): string {
    // Object types
    if ([TokenType.Table, TokenType.Page, TokenType.Report, TokenType.Codeunit,
         TokenType.Query, TokenType.XMLport, TokenType.MenuSuite].includes(tokenType)) {
      return 'Object Type';
    }

    // Data types
    if ([TokenType.Boolean, TokenType.Integer_Type, TokenType.Decimal_Type,
         TokenType.Text, TokenType.Code_Type, TokenType.Date_Type, TokenType.Time_Type,
         TokenType.DateTime_Type, TokenType.Record, TokenType.RecordID,
         TokenType.RecordRef, TokenType.FieldRef, TokenType.BigInteger,
         TokenType.BigText, TokenType.BLOB, TokenType.GUID, TokenType.Duration,
         TokenType.Option, TokenType.Char, TokenType.Byte, TokenType.TextConst].includes(tokenType)) {
      return 'Data Type';
    }

    // Control flow
    if ([TokenType.If, TokenType.Then, TokenType.Else, TokenType.Case, TokenType.Of,
         TokenType.While, TokenType.Do, TokenType.Repeat, TokenType.Until,
         TokenType.For, TokenType.To, TokenType.DownTo, TokenType.Exit,
         TokenType.Break].includes(tokenType)) {
      return 'Control Flow';
    }

    // Procedure/Function keywords
    if ([TokenType.Procedure, TokenType.Function, TokenType.Local,
         TokenType.Var, TokenType.Trigger].includes(tokenType)) {
      return 'Declaration';
    }

    // Block keywords
    if ([TokenType.Begin, TokenType.End].includes(tokenType)) {
      return 'Block';
    }

    // Boolean constants
    if ([TokenType.True, TokenType.False].includes(tokenType)) {
      return 'Boolean Constant';
    }

    // Operators
    if ([TokenType.Div, TokenType.Mod, TokenType.And, TokenType.Or,
         TokenType.Not, TokenType.Xor, TokenType.In].includes(tokenType)) {
      return 'Operator';
    }

    // Sections
    if ([TokenType.Properties, TokenType.Fields, TokenType.Keys,
         TokenType.FieldGroups, TokenType.Code].includes(tokenType)) {
      return 'Section';
    }

    return 'Keyword';
  }

  /**
   * Get the word at/before the cursor position
   */
  private getWordAtPosition(document: TextDocument, position: Position): string {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const start = this.scanBackward(text, offset - 1, c => IDENTIFIER_PATTERN.test(c));
    return text.substring(start, offset);
  }

  /**
   * Check if we're after a dot operator (handles prefix like "Rec.FI")
   */
  private isAfterDot(document: TextDocument, position: Position): boolean {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Skip backwards over identifier and whitespace to find dot
    let i = this.scanBackward(text, offset - 1, c => IDENTIFIER_PATTERN.test(c)) - 1;
    // Skip whitespace
    while (i >= 0 && /\s/.test(text[i])) {
      i--;
    }
    return i >= 0 && text[i] === '.';
  }

  /**
   * Get the identifier before the dot (handles prefix like "Rec.FI")
   */
  private getIdentifierBeforeDot(document: TextDocument, position: Position): string | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Skip backwards over identifier (prefix after dot) and whitespace to find dot
    let dotPos = this.scanBackward(text, offset - 1, c => IDENTIFIER_PATTERN.test(c)) - 1;
    // Skip whitespace
    while (dotPos >= 0 && /\s/.test(text[dotPos])) {
      dotPos--;
    }

    if (dotPos < 0 || text[dotPos] !== '.') {
      return null;
    }

    // Find the identifier before the dot
    const end = dotPos;
    const start = this.scanBackward(text, end - 1, c => IDENTIFIER_PATTERN.test(c));

    if (start >= end) {
      return null;
    }

    return text.substring(start, end);
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
    const prefix = this.getWordAtPosition(document, position).toLowerCase();

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
    const prefix = this.getWordAtPosition(document, position).toLowerCase();

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
