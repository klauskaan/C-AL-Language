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
import { FieldInfo } from '../workspaceSymbol/workspaceIndex';
import { EmptySetValidator } from '../validation/emptySetValidator';
import { UndefinedIdentifierValidator } from '../validation/undefinedIdentifierValidator';
import { UnusedVariableValidator } from '../validation/unusedVariableValidator';
import { TypeMismatchValidator } from '../validation/typeMismatchValidator';
import { DeprecatedFunctionValidator } from '../validation/deprecatedFunctionValidator';
import { UnknownAttributeValidator } from '../validation/unknownAttributeValidator';
import { ActionNestingValidator } from '../validation/actionNestingValidator';
import { CALSettings } from '../settings';

/**
 * Options for semantic analysis
 */
export interface AnalyzeOptions {
  /** User settings (optional) */
  settings?: CALSettings;

  /** Whether user tables have been indexed (used for conditional validation) */
  userTablesIndexed?: boolean;

  /** Table registry mapping table numbers to table names (optional) */
  tableRegistry?: ReadonlyMap<number, string>;

  /** Field registry mapping table numbers to field info (optional, used for member property validation) */
  fieldRegistry?: ReadonlyMap<number, ReadonlyMap<string, FieldInfo>>;

  /** Procedure registry mapping table numbers to procedure name maps (uppercaseName → originalName) (optional, used for member property validation) */
  procedureRegistry?: ReadonlyMap<number, ReadonlyMap<string, string>>;
}

export class SemanticAnalyzer {
  /** Builtin function and method registry */
  private builtins: BuiltinRegistry;

  /** Validation pipeline that runs all validators */
  private pipeline: ValidationPipeline;

  constructor(builtins: BuiltinRegistry) {
    // Store injected builtin registry
    this.builtins = builtins;

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

    // Register TypeMismatchValidator
    this.pipeline.registerValidator(new TypeMismatchValidator());

    // Register DeprecatedFunctionValidator
    this.pipeline.registerValidator(new DeprecatedFunctionValidator());

    // Register UnknownAttributeValidator
    this.pipeline.registerValidator(new UnknownAttributeValidator());

    // Register ActionNestingValidator
    this.pipeline.registerValidator(new ActionNestingValidator());

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
   * @param options - Optional analysis options (settings, registries)
   * @returns Array of diagnostics (may be empty)
   */
  public analyze(
    ast: CALDocument,
    symbolTable: SymbolTable,
    documentUri: string,
    options?: AnalyzeOptions
  ): Diagnostic[] {
    // Destructure options with defaults
    const { settings, userTablesIndexed, tableRegistry, fieldRegistry, procedureRegistry } = options ?? {};

    // Assemble validation context
    const context: ValidationContext = {
      ast,
      symbolTable,
      builtins: this.builtins,
      documentUri,
      settings,
      userTablesIndexed,
      tableRegistry,
      fieldRegistry,
      procedureRegistry
    };

    // Run validation pipeline
    return this.pipeline.run(context);
  }
}
