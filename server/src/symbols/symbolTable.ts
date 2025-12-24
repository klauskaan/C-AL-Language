import { Token } from '../lexer/tokens';
import {
  CALDocument,
  VariableDeclaration,
  ProcedureDeclaration,
  TriggerDeclaration,
  FieldDeclaration
} from '../parser/ast';

export interface Symbol {
  name: string;
  kind: 'variable' | 'parameter' | 'field' | 'procedure' | 'function';
  token: Token;
  type?: string;
}

/**
 * Normalize identifier for case-insensitive lookup.
 * C/AL identifiers are case-insensitive.
 */
function normalizeIdentifier(name: string): string {
  return name.toLowerCase();
}

/**
 * Represents a lexical scope in C/AL code.
 * Scopes form a tree structure with parent/child relationships.
 *
 * - Root scope contains global symbols (fields, global variables, procedures)
 * - Child scopes are created for procedures and triggers
 * - Symbol lookup traverses from current scope up through parent chain
 */
export class Scope {
  /** Symbols defined in this scope, keyed by normalized name */
  private symbols: Map<string, Symbol> = new Map();

  /** Parent scope, null for root scope */
  public parent: Scope | null = null;

  /** Child scopes (procedures, triggers) */
  public children: Scope[] = [];

  /** Start offset of this scope in the document */
  public startOffset: number = 0;

  /** End offset of this scope in the document */
  public endOffset: number = Number.MAX_SAFE_INTEGER;

  /**
   * Create a new scope
   * @param parent - Parent scope, or null for root scope
   */
  constructor(parent: Scope | null = null) {
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
  }

  /**
   * Add a symbol to this scope
   * @param symbol - The symbol to add
   */
  public addSymbol(symbol: Symbol): void {
    this.symbols.set(normalizeIdentifier(symbol.name), symbol);
  }

  /**
   * Check if a symbol exists in this scope only (not parent scopes)
   * @param name - Symbol name (case-insensitive)
   */
  public hasOwnSymbol(name: string): boolean {
    return this.symbols.has(normalizeIdentifier(name));
  }

  /**
   * Get a symbol from this scope only (not parent scopes)
   * @param name - Symbol name (case-insensitive)
   */
  public getOwnSymbol(name: string): Symbol | undefined {
    return this.symbols.get(normalizeIdentifier(name));
  }

  /**
   * Get all symbols defined directly in this scope
   */
  public getOwnSymbols(): Symbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Get a symbol by name, traversing parent chain if not found in this scope.
   * This implements variable shadowing: inner scope symbols take precedence.
   * @param name - Symbol name (case-insensitive)
   * @returns The symbol if found, undefined otherwise
   */
  public getSymbol(name: string): Symbol | undefined {
    const normalized = normalizeIdentifier(name);

    // First check this scope
    const symbol = this.symbols.get(normalized);
    if (symbol) {
      return symbol;
    }

    // Then check parent scope (recursive traversal up the chain)
    if (this.parent) {
      return this.parent.getSymbol(name);
    }

    return undefined;
  }

  /**
   * Check if a symbol exists in this scope or any parent scope.
   * @param name - Symbol name (case-insensitive)
   * @returns true if the symbol is found anywhere in the scope chain
   */
  public hasSymbol(name: string): boolean {
    const normalized = normalizeIdentifier(name);

    // First check this scope
    if (this.symbols.has(normalized)) {
      return true;
    }

    // Then check parent scope
    if (this.parent) {
      return this.parent.hasSymbol(name);
    }

    return false;
  }
}

export class SymbolTable {
  /** Root scope containing global symbols (fields, global variables, procedures) */
  private rootScope: Scope = new Scope(null);

  /**
   * Build symbol table from AST.
   * Creates a hierarchical scope structure:
   * - Root scope: fields, global variables, procedure/trigger names
   * - Child scopes: procedure parameters and local variables, trigger local variables
   */
  public buildFromAST(ast: CALDocument): void {
    // Create fresh root scope
    this.rootScope = new Scope(null);

    if (!ast.object) {
      return;
    }

    const obj = ast.object;

    // Add fields to root scope
    if (obj.fields) {
      for (const field of obj.fields.fields) {
        this.rootScope.addSymbol({
          name: field.fieldName,
          kind: 'field',
          token: field.startToken,
          type: field.dataType.typeName
        });
      }
    }

    // Add code section symbols
    if (obj.code) {
      // Global variables go to root scope
      for (const variable of obj.code.variables) {
        this.rootScope.addSymbol({
          name: variable.name,
          kind: 'variable',
          token: variable.startToken,
          type: variable.dataType.typeName
        });
      }

      // Procedures get their own child scope
      for (const procedure of obj.code.procedures) {
        // Add procedure name to root scope (so it can be called from anywhere)
        this.rootScope.addSymbol({
          name: procedure.name,
          kind: 'procedure',
          token: procedure.startToken
        });

        // Create child scope for procedure body
        const procScope = new Scope(this.rootScope);
        procScope.startOffset = procedure.startToken.startOffset;
        procScope.endOffset = procedure.endToken.endOffset;

        // Add parameters to procedure scope
        for (const param of procedure.parameters) {
          procScope.addSymbol({
            name: param.name,
            kind: 'parameter',
            token: param.startToken,
            type: param.dataType.typeName
          });
        }

        // Add local variables to procedure scope
        for (const variable of procedure.variables) {
          procScope.addSymbol({
            name: variable.name,
            kind: 'variable',
            token: variable.startToken,
            type: variable.dataType.typeName
          });
        }
      }

      // Triggers also get their own child scope
      for (const trigger of obj.code.triggers) {
        // Create child scope for trigger body
        const triggerScope = new Scope(this.rootScope);
        triggerScope.startOffset = trigger.startToken.startOffset;
        triggerScope.endOffset = trigger.endToken.endOffset;

        // Add local variables to trigger scope
        for (const variable of trigger.variables) {
          triggerScope.addSymbol({
            name: variable.name,
            kind: 'variable',
            token: variable.startToken,
            type: variable.dataType.typeName
          });
        }
      }
    }
  }

  /**
   * Get the root scope
   */
  public getRootScope(): Scope {
    return this.rootScope;
  }

  /**
   * Check if a symbol exists in the root scope (case-insensitive).
   * For position-aware lookup, use getScopeAtOffset() then scope.hasSymbol().
   */
  public hasSymbol(name: string): boolean {
    return this.rootScope.hasSymbol(name);
  }

  /**
   * Get a symbol by name from the root scope (case-insensitive).
   * For position-aware lookup, use getScopeAtOffset() then scope.getSymbol().
   */
  public getSymbol(name: string): Symbol | undefined {
    return this.rootScope.getSymbol(name);
  }

  /**
   * Get all symbols from all scopes (root and children).
   * Useful for features that need to show all available symbols.
   */
  public getAllSymbols(): Symbol[] {
    return this.collectAllSymbols(this.rootScope);
  }

  /**
   * Recursively collect all symbols from a scope and its children
   */
  private collectAllSymbols(scope: Scope): Symbol[] {
    const symbols: Symbol[] = [...scope.getOwnSymbols()];
    for (const child of scope.children) {
      symbols.push(...this.collectAllSymbols(child));
    }
    return symbols;
  }

  /**
   * Find the scope that contains a given document offset.
   * Returns the most specific (innermost) scope containing the offset.
   * @param offset - Document offset (character position)
   * @returns The scope containing the offset, or root scope if no child scope matches
   */
  public getScopeAtOffset(offset: number): Scope {
    return this.findScopeAtOffset(this.rootScope, offset);
  }

  /**
   * Recursively find the deepest scope containing the given offset.
   * @param scope - Current scope to search
   * @param offset - Document offset to find
   * @returns The deepest scope containing the offset
   */
  private findScopeAtOffset(scope: Scope, offset: number): Scope {
    // Check each child scope to see if the offset falls within it
    for (const child of scope.children) {
      if (offset >= child.startOffset && offset <= child.endOffset) {
        // Recursively search within this child scope for deeper matches
        return this.findScopeAtOffset(child, offset);
      }
    }
    // No child scope contains the offset, return current scope
    return scope;
  }

  /**
   * Get a symbol by name at a specific document offset.
   * Uses position-aware scope lookup to find the correct symbol
   * when variables are shadowed in nested scopes.
   * @param name - Symbol name (case-insensitive)
   * @param offset - Document offset where the symbol is referenced
   * @returns The symbol if found in the scope chain, undefined otherwise
   */
  public getSymbolAtOffset(name: string, offset: number): Symbol | undefined {
    const scope = this.getScopeAtOffset(offset);
    return scope.getSymbol(name);
  }
}

/**
 * Validate identifiers in the AST and find undefined variables
 */
export class IdentifierValidator {
  /**
   * Find all undefined variable references in the document
   * Returns an array of tokens representing undefined identifiers
   */
  public findUndefinedReferences(tokens: Token[], symbolTable: SymbolTable): Token[] {
    const undefinedRefs: Token[] = [];

    // For now, we'll do a simple check: any identifier that's not in the symbol table
    // is considered potentially undefined. This is very basic and will have false positives.

    // TODO: Implement proper scope tracking and AST traversal for accurate checking

    return undefinedRefs;
  }
}
