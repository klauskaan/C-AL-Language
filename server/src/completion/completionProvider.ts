/**
 * Code completion provider for C/AL language server
 * Phase 1: Keyword and data type completion
 * Phase 2: Global symbol completion
 * Phase 3: Built-in function completion
 * Phase 4: Dot trigger and field completion
 * Phase 5: Action completion (context-aware)
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
import { CALDocument, ActionSection, ControlDeclaration } from '../parser/ast';
import { BUILTIN_FUNCTIONS, RECORD_METHODS, BuiltinFunction } from './builtins';
import { ProviderBase } from '../providers/providerBase';
import { getMetadataByTokenType } from '../shared/keywordMetadata';
import { ACTION_TYPES, ACTION_PROPERTIES, ACTION_PROPERTY_VALUES } from './actionCompletions';

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
    case 'action':
      return CompletionItemKind.Event;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
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

      // Add documentation for CODE section to differentiate from CODE data type
      const documentation = displayName === 'CODE' && metadata?.category === 'Section'
        ? 'CODE section marker for procedures and triggers'
        : undefined;

      this.keywordItems.push({
        label: displayName,
        kind: metadata?.completionKind || CompletionItemKind.Keyword,
        insertText: displayName,
        detail: metadata?.category,
        documentation
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
        documentation: 'CODE data type for alphanumeric strings with fixed or variable length'
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
   * Phase 5: Action completion (context-aware)
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

    // Phase 5: Action completion (context-aware)
    if (ast) {
      const offset = document.offsetAt(position);
      const actionSection = this.findActionSectionAtOffset(ast, offset);
      if (actionSection) {
        // Action types
        for (const item of ACTION_TYPES) {
          if (!prefix || item.label.toLowerCase().startsWith(prefix)) {
            items.push(item);
          }
        }
        // Action properties
        for (const item of ACTION_PROPERTIES) {
          if (!prefix || item.label.toLowerCase().startsWith(prefix)) {
            items.push(item);
          }
        }
        // Property values (context-dependent)
        const propName = this.getPropertyNameOnLine(document, position);
        if (propName) {
          const values = ACTION_PROPERTY_VALUES.get(propName.toLowerCase());
          if (values) {
            for (const item of values) {
              if (!prefix || item.label.toLowerCase().startsWith(prefix)) {
                items.push(item);
              }
            }
          }
        }
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

  /**
   * Find ActionSection containing the given offset
   * Searches top-level actions, control properties with ActionList, and nested control properties
   *
   * @param ast - The parsed AST
   * @param offset - Character offset in document
   * @returns ActionSection if found, null otherwise
   */
  private findActionSectionAtOffset(ast: CALDocument, offset: number): ActionSection | null {
    // Guard: early return if object is null
    if (!ast.object) {
      return null;
    }

    // Check top-level ACTIONS section
    if (ast.object.actions) {
      const section = ast.object.actions;
      if (offset >= section.startToken.startOffset && offset < section.endToken.endOffset) {
        return section;
      }
    }

    // Check properties for ActionList property
    if (ast.object.properties?.properties) {
      for (const prop of ast.object.properties.properties) {
        if (prop.actionSection) {
          const section = prop.actionSection;
          if (offset >= section.startToken.startOffset && offset < section.endToken.endOffset) {
            return section;
          }
        }
      }
    }

    // Check controls for properties with ActionList (recursively)
    if (ast.object.controls?.controls) {
      const result = this.findActionSectionInControls(ast.object.controls.controls, offset);
      if (result) {
        return result;
      }
    }

    return null;
  }

  /**
   * Recursively search controls for ActionSection at offset
   *
   * @param controls - Array of control declarations to search
   * @param offset - Character offset in document
   * @returns ActionSection if found, null otherwise
   */
  private findActionSectionInControls(controls: ControlDeclaration[], offset: number): ActionSection | null {
    for (const control of controls) {
      // Check this control's properties for ActionList
      if (control.properties?.properties) {
        for (const prop of control.properties.properties) {
          if (prop.actionSection) {
            const section = prop.actionSection;
            if (offset >= section.startToken.startOffset && offset < section.endToken.endOffset) {
              return section;
            }
          }
        }
      }

      // Recursively check children
      if (control.children && control.children.length > 0) {
        const result = this.findActionSectionInControls(control.children, offset);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  /**
   * Extract property name from the current line (for property value completion)
   * Looks for pattern: PropertyName=
   *
   * @param document - The text document
   * @param position - Current cursor position
   * @returns Property name if found, null otherwise
   */
  private getPropertyNameOnLine(document: TextDocument, position: Position): string | null {
    const text = document.getText();
    const lineStart = document.offsetAt({ line: position.line, character: 0 });
    const cursorOffset = document.offsetAt(position);

    // Get text from line start to cursor
    const lineText = text.substring(lineStart, cursorOffset);

    // Match pattern: PropertyName=
    const match = lineText.match(/^\s*(\w+)\s*=\s*\w*$/);
    if (match) {
      return match[1];
    }

    return null;
  }
}