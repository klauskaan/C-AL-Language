/**
 * ScopeTracker
 *
 * Tracks WITH statement context during AST traversal.
 * Used to suppress false positives for field access inside WITH blocks.
 */

import { SymbolTable } from '../symbols/symbolTable';
import { BuiltinRegistry } from './builtinRegistry';

export class ScopeTracker {
  /** Stack of WITH statement contexts - depth > 0 means inside WITH */
  private withDepth: number = 0;

  /**
   * Enter a WITH statement context
   */
  public enterWith(): void {
    this.withDepth++;
  }

  /**
   * Exit a WITH statement context
   */
  public exitWith(): void {
    if (this.withDepth > 0) {
      this.withDepth--;
    }
  }

  /**
   * Check if currently inside a WITH statement
   */
  public isInsideWith(): boolean {
    return this.withDepth > 0;
  }

  /**
   * Reset tracker state (for new document analysis)
   */
  public reset(): void {
    this.withDepth = 0;
  }

  /**
   * Determine if an identifier should be flagged as undefined.
   *
   * Logic:
   * 1. If identifier is in symbol table at this offset - NOT an error
   * 2. If identifier is a builtin function/method - NOT an error
   * 3. If inside WITH block - suppress (could be a field access)
   * 4. Otherwise - flag as undefined
   *
   * @param name - Identifier name
   * @param offset - Document offset where identifier appears
   * @param symbolTable - Symbol table for lookup
   * @param builtins - Builtin registry for builtin check
   * @returns true if should flag as undefined, false otherwise
   */
  public shouldFlagAsUndefined(
    name: string,
    offset: number,
    symbolTable: SymbolTable,
    builtins: BuiltinRegistry
  ): boolean {
    // 1. If in scope - NOT an error
    if (symbolTable.getSymbolAtOffset(name, offset)) {
      return false;
    }

    // 2. If builtin - NOT an error (CORRECTED - was inverted in draft)
    if (builtins.isKnownBuiltin(name)) {
      return false;
    }

    // 3. If inside WITH - suppress (could be field)
    if (this.isInsideWith()) {
      return false;
    }

    // 4. Otherwise - flag as undefined
    return true;
  }
}
