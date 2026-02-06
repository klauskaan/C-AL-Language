import { Token } from '../lexer/tokens';
import {
  CALDocument,
  VariableDeclaration,
  ProcedureDeclaration,
  TriggerDeclaration,
  EventDeclaration,
  FieldDeclaration
} from '../parser/ast';
import { Type } from '../types/types';
import { resolveType, resolveVariableType } from '../types/typeResolver';
import { ASTVisitor } from '../visitor/astVisitor';
import { ASTWalker } from '../visitor/astWalker';

export interface Symbol {
  name: string;
  kind: 'variable' | 'parameter' | 'field' | 'procedure' | 'function';
  token: Token;
  /** Syntactic type name as a string (for backwards compatibility) */
  type?: string;
  /** Resolved semantic type (when available from type resolution) */
  resolvedType?: Type;
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

/**
 * Visitor that collects symbols from AST nodes and builds a hierarchical scope structure.
 * Used internally by SymbolTable to build symbol tables using the ASTWalker.
 */
class SymbolCollectorVisitor implements Partial<ASTVisitor> {
  private readonly rootScope: Scope;
  private currentScope: Scope;

  constructor(rootScope: Scope) {
    this.rootScope = rootScope;
    this.currentScope = rootScope;
  }

  /**
   * Visit a FieldDeclaration node and add it to the current scope
   */
  visitFieldDeclaration(node: FieldDeclaration): void | false {
    // Skip if no nameToken (error recovery case)
    if (!node.nameToken) return;

    this.currentScope.addSymbol({
      name: node.fieldName,
      kind: 'field',
      token: node.nameToken,
      type: node.dataType.typeName,
      resolvedType: resolveType(node.dataType)
    });

    // Field triggers are now handled by the walker traversing node.triggers
    // and calling visitTriggerDeclaration for each trigger
  }

  /**
   * Visit a VariableDeclaration node and add it to the current scope.
   * This captures both global variables (in CodeSection) and local variables.
   */
  visitVariableDeclaration(node: VariableDeclaration): void | false {
    this.currentScope.addSymbol({
      name: node.name,
      kind: 'variable',
      token: node.startToken,
      type: node.dataType.typeName,
      resolvedType: resolveVariableType(node)
    });
  }

  /**
   * Visit a ProcedureDeclaration node and add it to the current scope.
   * Creates a child scope for the procedure's local variables and parameters.
   */
  visitProcedureDeclaration(node: ProcedureDeclaration): void | false {
    // Add procedure name to current scope (so it can be called from anywhere)
    this.currentScope.addSymbol({
      name: node.name,
      kind: 'procedure',
      token: node.nameToken ?? node.startToken
    });

    // Create child scope for procedure body
    const procScope = new Scope(this.currentScope);
    procScope.startOffset = node.startToken.startOffset;
    procScope.endOffset = node.endToken.endOffset;

    // Add parameters to procedure scope
    for (const param of node.parameters) {
      procScope.addSymbol({
        name: param.name,
        kind: 'parameter',
        token: param.startToken,
        type: param.dataType.typeName,
        resolvedType: resolveType(param.dataType)
      });
    }

    // Switch to procedure scope to collect local variables, then restore
    const prevScope = this.currentScope;
    this.currentScope = procScope;

    // Manually add local variables to procedure scope
    for (const variable of node.variables) {
      procScope.addSymbol({
        name: variable.name,
        kind: 'variable',
        token: variable.startToken,
        type: variable.dataType.typeName,
        resolvedType: resolveVariableType(variable)
      });
    }

    // Restore previous scope
    this.currentScope = prevScope;

    // Return false to prevent walker from re-traversing children
    return false;
  }

  /**
   * Visit a TriggerDeclaration node and add its local variables to a child scope.
   */
  visitTriggerDeclaration(node: TriggerDeclaration): void | false {
    // Create child scope for trigger body
    const triggerScope = new Scope(this.currentScope);
    triggerScope.startOffset = node.startToken.startOffset;
    triggerScope.endOffset = node.endToken.endOffset;

    // Switch to trigger scope, handle variables, then restore
    const prevScope = this.currentScope;
    this.currentScope = triggerScope;

    // Add local variables to trigger scope
    for (const variable of node.variables) {
      triggerScope.addSymbol({
        name: variable.name,
        kind: 'variable',
        token: variable.startToken,
        type: variable.dataType.typeName,
        resolvedType: resolveVariableType(variable)
      });
    }

    // Restore previous scope
    this.currentScope = prevScope;

    // Return false to prevent walker from re-traversing children
    return false;
  }

  /**
   * Visit an EventDeclaration node and add its parameters and local variables to a child scope.
   * Event handlers are similar to procedures but are triggered by DotNet control add-in events.
   */
  visitEventDeclaration(node: EventDeclaration): void | false {
    // Create child scope for event body
    const eventScope = new Scope(this.currentScope);
    eventScope.startOffset = node.startToken.startOffset;
    eventScope.endOffset = node.endToken.endOffset;

    // Switch to event scope, handle parameters and variables, then restore
    const prevScope = this.currentScope;
    this.currentScope = eventScope;

    // Add parameters to event scope
    for (const param of node.parameters) {
      eventScope.addSymbol({
        name: param.name,
        kind: 'parameter',
        token: param.startToken,
        type: param.dataType.typeName,
        resolvedType: resolveType(param.dataType)
      });
    }

    // Add local variables to event scope
    for (const variable of node.variables) {
      eventScope.addSymbol({
        name: variable.name,
        kind: 'variable',
        token: variable.startToken,
        type: variable.dataType.typeName,
        resolvedType: resolveVariableType(variable)
      });
    }

    // Restore previous scope
    this.currentScope = prevScope;

    // Return false to prevent walker from re-traversing children
    return false;
  }
}

export class SymbolTable {
  /** Root scope containing global symbols (fields, global variables, procedures) */
  private rootScope: Scope = new Scope(null);

  /**
   * Build symbol table from AST using the visitor pattern.
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

    const walker = new ASTWalker();
    const visitor = new SymbolCollectorVisitor(this.rootScope);

    walker.walk(ast, visitor);
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

  /**
   * Helper method to define a global symbol for testing purposes.
   * Creates a synthetic token and adds the symbol to the root scope.
   * @param symbol - Symbol definition with name, kind, type, and offsets
   */
  public defineGlobal(symbol: {
    name: string;
    kind: 'variable' | 'parameter' | 'field' | 'procedure' | 'function';
    type?: string;
    startOffset: number;
    endOffset: number;
  }): void {
    // Create a synthetic token for the symbol
    const syntheticToken: Token = {
      type: 'IDENTIFIER' as any,
      value: symbol.name,
      line: 1,
      column: 1,
      startOffset: symbol.startOffset,
      endOffset: symbol.endOffset
    };

    this.rootScope.addSymbol({
      name: symbol.name,
      kind: symbol.kind,
      type: symbol.type,
      token: syntheticToken
    });
  }
}