/**
 * SemanticAnalyzer
 *
 * Main entry point for semantic analysis.
 * Coordinates validators via ValidationPipeline and provides ValidationContext.
 */

import { Diagnostic } from 'vscode-languageserver';
import { CALDocument } from '../parser/ast';
import { SymbolTable } from '../symbols/symbolTable';
import { BuiltinRegistry } from './builtinRegistry';
import { ValidationPipeline } from './validationPipeline';
import { ValidationContext } from './types';
import { EmptySetValidator } from '../validation/emptySetValidator';
import { UndefinedIdentifierValidator } from '../validation/undefinedIdentifierValidator';
import { UnusedVariableValidator } from '../validation/unusedVariableValidator';

export class SemanticAnalyzer {
  /** Builtin function and method registry */
  private builtins: BuiltinRegistry;

  /** Validation pipeline that runs all validators */
  private pipeline: ValidationPipeline;

  constructor() {
    // Initialize builtin registry
    this.builtins = new BuiltinRegistry();

    // Initialize validation pipeline
    this.pipeline = new ValidationPipeline();

    // Register validators
    this.registerValidators();
  }

  /**
   * Register all validators with the pipeline
   */
  private registerValidators(): void {
    // Register EmptySetValidator (modified to use ValidationContext)
    this.pipeline.registerValidator(new EmptySetValidator());

    // Register UndefinedIdentifierValidator
    this.pipeline.registerValidator(new UndefinedIdentifierValidator());

    // Register UnusedVariableValidator
    this.pipeline.registerValidator(new UnusedVariableValidator());

    // Future validators will be registered here:
    // this.pipeline.registerValidator(new TypeCheckValidator());
    // etc.
  }

  /**
   * Analyze the document and return diagnostics.
   *
   * @param ast - Parsed AST to analyze
   * @param symbolTable - Symbol table for the document
   * @param documentUri - URI of the document being analyzed
   * @returns Array of diagnostics (may be empty)
   */
  public analyze(
    ast: CALDocument,
    symbolTable: SymbolTable,
    documentUri: string
  ): Diagnostic[] {
    // Assemble validation context
    const context: ValidationContext = {
      ast,
      symbolTable,
      builtins: this.builtins,
      documentUri
    };

    // Run validation pipeline
    return this.pipeline.run(context);
  }
}
