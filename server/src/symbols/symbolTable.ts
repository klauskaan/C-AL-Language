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
