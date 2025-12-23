import { Token } from '../lexer/tokens';
import {
  CALDocument,
  VariableDeclaration,
  ProcedureDeclaration,
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
  private symbols: Map<string, Symbol> = new Map();

  /**
   * Build symbol table from AST
   */
  public buildFromAST(ast: CALDocument): void {
    this.symbols.clear();

    if (!ast.object) {
      return;
    }

    const obj = ast.object;

    // Add fields
    if (obj.fields) {
      for (const field of obj.fields.fields) {
        this.addSymbol({
          name: this.normalizeIdentifier(field.fieldName),
          kind: 'field',
          token: field.startToken,
          type: field.dataType.typeName
        });
      }
    }

    // Add code section symbols
    if (obj.code) {
      // Global variables
      for (const variable of obj.code.variables) {
        this.addSymbol({
          name: this.normalizeIdentifier(variable.name),
          kind: 'variable',
          token: variable.startToken,
          type: variable.dataType.typeName
        });
      }

      // Procedures
      for (const procedure of obj.code.procedures) {
        this.addSymbol({
          name: this.normalizeIdentifier(procedure.name),
          kind: 'procedure',
          token: procedure.startToken
        });

        // TODO: Add local variables and parameters in nested scope
      }
    }
  }

  /**
   * Check if a symbol exists (case-insensitive)
   */
  public hasSymbol(name: string): boolean {
    return this.symbols.has(this.normalizeIdentifier(name));
  }

  /**
   * Get a symbol by name (case-insensitive)
   */
  public getSymbol(name: string): Symbol | undefined {
    return this.symbols.get(this.normalizeIdentifier(name));
  }

  /**
   * Add a symbol to the table
   */
  private addSymbol(symbol: Symbol): void {
    this.symbols.set(this.normalizeIdentifier(symbol.name), symbol);
  }

  /**
   * Normalize identifier for case-insensitive lookup
   */
  private normalizeIdentifier(name: string): string {
    return name.toLowerCase();
  }

  /**
   * Get all symbols
   */
  public getAllSymbols(): Symbol[] {
    return Array.from(this.symbols.values());
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
