/**
 * Semantic Analysis Types
 *
 * Core interfaces for the semantic analyzer infrastructure.
 */

import { CALDocument } from '../parser/ast';
import { SymbolTable } from '../symbols/symbolTable';
import { BuiltinRegistry } from './builtinRegistry';
import { Diagnostic } from 'vscode-languageserver';
import { CALSettings } from '../settings';

/**
 * ValidationContext provides all information needed for semantic validation.
 * Passed to each validator during the validation pipeline execution.
 */
export interface ValidationContext {
  /** The parsed AST to validate */
  ast: CALDocument;

  /** Symbol table containing defined symbols (variables, procedures, etc.) */
  symbolTable: SymbolTable;

  /** Registry of builtin functions and methods */
  builtins: BuiltinRegistry;

  /** Document URI for diagnostic reporting */
  documentUri: string;

  /** User settings (optional) */
  settings?: CALSettings;
}

/**
 * Validator interface - all semantic validators must implement this.
 *
 * Architectural Rules:
 * 1. Validators are STATELESS - no instance state between validate() calls
 * 2. Validators are PURE - same input always produces same output
 * 3. Validators are ISOLATED - do not depend on other validators
 * 4. Validators use VISITOR pattern - traverse AST via ASTWalker
 * 5. Validators COLLECT diagnostics - do not throw on errors
 *
 * These rules ensure validators can run in any order, in parallel,
 * and can be safely cached or skipped without affecting correctness.
 */
export interface Validator {
  /** Validator name for logging and debugging */
  readonly name: string;

  /**
   * Validate the document and return diagnostics.
   * @param context - Validation context containing AST, symbols, builtins
   * @returns Array of diagnostics (may be empty)
   */
  validate(context: ValidationContext): Diagnostic[];
}
