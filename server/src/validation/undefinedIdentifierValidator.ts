/**
 * Undefined Identifier Validator
 *
 * Detects references to undefined variables, procedures, and fields.
 * Uses ScopeTracker to suppress false positives for field access inside WITH blocks.
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import type { ElementsSection } from '../parser/ast';
import {
  Identifier,
  VariableDeclaration,
  ParameterDeclaration,
  DataType,
  FieldDeclaration,
  ProcedureDeclaration,
  TriggerDeclaration,
  EventDeclaration,
  Property,
  WithStatement,
  MemberExpression,
  CallExpression,
} from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';
import { Validator, ValidationContext } from '../semantic/types';
import { ScopeTracker } from '../semantic/scopeTracker';
import { SymbolTable } from '../symbols/symbolTable';
import { BuiltinRegistry } from '../semantic/builtinRegistry';
import { isRecordType } from '../types/types';

/**
 * Record methods whose arguments include field references (not variable identifiers).
 * Maps method name (UPPERCASE) to which argument positions are field references:
 * - 'first': Only the first argument is a field reference
 * - 'all': All arguments are field references
 *
 * Non-field arguments (e.g., value args in SETRANGE, SETFILTER) are still validated.
 */
const FIELD_REFERENCE_METHODS: Map<string, 'first' | 'all'> = new Map([
  ['SETRANGE', 'first'],
  ['SETFILTER', 'first'],
  ['GETRANGEMIN', 'first'],
  ['GETRANGEMAX', 'first'],
  ['GETFILTER', 'first'],
  ['VALIDATE', 'first'],
  ['TESTFIELD', 'first'],
  ['FIELDERROR', 'first'],
  ['FIELDNAME', 'first'],
  ['FIELDNO', 'first'],
  ['FIELDCAPTION', 'first'],
  ['FIELDACTIVE', 'first'],
  ['MODIFYALL', 'first'],
  ['SETCURRENTKEY', 'all'],
  ['CALCFIELDS', 'all'],
  ['CALCSUMS', 'all'],
  ['COPYFILTER', 'all'],
]);

/**
 * Check if a field exists in the field map (case-insensitive).
 * @param fields - Field map (key: field name, value: field type)
 * @param name - Field name to check
 * @returns True if field exists (case-insensitive match)
 */
function hasFieldCaseInsensitive(
  fields: ReadonlyMap<string, string>,
  name: string
): boolean {
  const normalizedName = name.toLowerCase();
  for (const fieldName of fields.keys()) {
    if (fieldName.toLowerCase() === normalizedName) {
      return true;
    }
  }
  return false;
}

/**
 * Visitor that collects diagnostics for undefined identifiers.
 * Uses manual traversal control to properly handle scope-dependent constructs.
 */
class UndefinedIdentifierVisitor implements Partial<ASTVisitor> {
  public readonly diagnostics: Diagnostic[] = [];
  private readonly hasTableRegistry: boolean;
  private readonly fieldRegistry?: ReadonlyMap<number, ReadonlyMap<string, string>>;

  /**
   * Constructor
   * @param scopeTracker - Tracker for WITH statement context
   * @param symbolTable - Symbol table for identifier resolution
   * @param builtins - Registry of builtin functions
   * @param walker - ASTWalker instance for manual child traversal
   * @param hasTableRegistry - Whether table registry has been populated
   * @param fieldRegistry - Field registry providing cross-file field information
   */
  constructor(
    private readonly scopeTracker: ScopeTracker,
    private readonly symbolTable: SymbolTable,
    private readonly builtins: BuiltinRegistry,
    private readonly walker: ASTWalker,
    hasTableRegistry: boolean,
    fieldRegistry?: ReadonlyMap<number, ReadonlyMap<string, string>>
  ) {
    this.hasTableRegistry = hasTableRegistry;
    this.fieldRegistry = fieldRegistry;
  }

  /**
   * Visit WithStatement - enter WITH context, walk children, exit WITH context
   * Returns false to prevent automatic traversal
   */
  visitWithStatement(node: WithStatement): false {
    // Walk the record expression
    this.walker.walk(node.record, this);

    // Enter WITH context before walking body
    this.scopeTracker.enterWith();

    // Walk the body
    this.walker.walk(node.body, this);

    // Exit WITH context
    this.scopeTracker.exitWith();

    return false; // Prevent automatic traversal
  }

  /**
   * Visit MemberExpression - only walk the object part (not the property)
   * Returns false to prevent automatic traversal
   */
  visitMemberExpression(node: MemberExpression): false {
    // Only walk the object (left side), not the property (right side)
    // Example: Customer."No." - walk Customer, skip "No."
    this.walker.walk(node.object, this);

    return false; // Prevent automatic traversal
  }

  /**
   * Visit CallExpression - handle callee specially, validate or skip field-reference arguments
   * Returns false to prevent automatic traversal
   */
  visitCallExpression(node: CallExpression): false {
    // Walk the callee (receiver + method name)
    this.walker.walk(node.callee, this);

    // Determine if this is a record method call with field-reference arguments
    const fieldRefMode = this.getFieldReferenceMode(node);

    // Walk arguments, handling field-reference positions specially
    for (let i = 0; i < node.arguments.length; i++) {
      const isFieldRefArg =
        (fieldRefMode === 'all') ||
        (fieldRefMode === 'first' && i === 0);

      if (isFieldRefArg) {
        // This argument is a field reference - try cross-file validation
        this.validateFieldArgument(node, node.arguments[i]);
      } else {
        // Regular argument - walk normally
        this.walker.walk(node.arguments[i], this);
      }
    }

    return false; // Prevent automatic traversal
  }

  /**
   * Determine if a call expression is a record method with field-reference arguments.
   * Returns the field-reference mode ('first', 'all') or undefined if not applicable.
   */
  private getFieldReferenceMode(node: CallExpression): 'first' | 'all' | undefined {
    if (node.callee.type === 'MemberExpression') {
      const memberExpr = node.callee as MemberExpression;
      const methodName = memberExpr.property.name.toUpperCase();
      return FIELD_REFERENCE_METHODS.get(methodName);
    }

    return undefined;
  }

  /**
   * Validate a field argument using the field registry.
   * If validation cannot be performed (no registry, receiver type unknown, etc.),
   * skip validation (graceful degradation).
   * If validation can be performed and field is NOT found, flag it as undefined.
   * @param callNode - The call expression node
   * @param argNode - The argument node (should be an Identifier for field reference)
   */
  private validateFieldArgument(callNode: CallExpression, argNode: any): void {
    // Only validate simple Identifier nodes
    if (argNode.type !== 'Identifier') {
      // Skip validation for complex expressions (e.g., MemberExpression receivers)
      return;
    }

    const fieldName = (argNode as Identifier).name;

    // Skip if no field registry available
    if (!this.fieldRegistry) {
      return;
    }

    // Extract receiver from CallExpression
    // CallExpression.callee is a MemberExpression: receiver.method(args)
    if (callNode.callee.type !== 'MemberExpression') {
      return;
    }

    const memberExpr = callNode.callee as MemberExpression;
    const receiver = memberExpr.object;

    // Only handle simple Identifier receivers (e.g., Customer.SETRANGE)
    // Skip MemberExpression receivers (e.g., Rec."Sales Line".SETRANGE)
    if (receiver.type !== 'Identifier') {
      return;
    }

    const receiverIdent = receiver as Identifier;

    // Resolve receiver symbol via symbol table
    const symbol = this.symbolTable.getSymbolAtOffset(
      receiverIdent.name,
      receiverIdent.startToken.startOffset
    );
    if (!symbol || !symbol.resolvedType) {
      // Receiver type unknown - skip validation (graceful degradation)
      return;
    }

    // Check if receiver is a Record type
    if (!isRecordType(symbol.resolvedType)) {
      // Not a Record - skip field validation
      return;
    }

    const tableId = symbol.resolvedType.tableId;

    // Skip if tableId is 0 (unresolved/generic Record)
    if (tableId === 0) {
      return;
    }

    // Look up table in field registry
    const tableFields = this.fieldRegistry.get(tableId);
    if (!tableFields) {
      // Table not in registry - skip validation (graceful degradation)
      return;
    }

    // Check if field exists (case-insensitive)
    if (!hasFieldCaseInsensitive(tableFields, fieldName)) {
      // Field NOT found - flag as undefined
      this.addFieldDiagnostic(argNode as Identifier);
    }
    // Field found - no diagnostic, no further traversal
  }

  /**
   * Skip variable declarations - these define identifiers, not reference them
   */
  visitVariableDeclaration(_node: VariableDeclaration): false {
    return false; // Skip traversal
  }

  /**
   * Skip parameter declarations - these define identifiers, not reference them
   */
  visitParameterDeclaration(_node: ParameterDeclaration): false {
    return false; // Skip traversal
  }

  /**
   * Skip data type nodes - type names are not identifier references
   */
  visitDataType(_node: DataType): false {
    return false; // Skip traversal
  }

  /**
   * Skip field declarations - these define identifiers, not reference them
   */
  visitFieldDeclaration(_node: FieldDeclaration): false {
    return false; // Skip traversal
  }

  /**
   * Visit ProcedureDeclaration - only walk the body
   * Returns false to prevent automatic traversal
   */
  visitProcedureDeclaration(node: ProcedureDeclaration): false {
    // Walk only the body statements
    for (const stmt of node.body) {
      this.walker.walk(stmt, this);
    }

    return false; // Prevent automatic traversal
  }

  /**
   * Visit TriggerDeclaration - only walk the body
   * Returns false to prevent automatic traversal
   */
  visitTriggerDeclaration(node: TriggerDeclaration): false {
    // Walk only the body statements
    for (const stmt of node.body) {
      this.walker.walk(stmt, this);
    }

    return false; // Prevent automatic traversal
  }

  /**
   * Visit EventDeclaration - only walk the body
   * Returns false to prevent automatic traversal
   */
  visitEventDeclaration(node: EventDeclaration): false {
    // Walk only the body statements
    for (const stmt of node.body) {
      this.walker.walk(stmt, this);
    }

    return false; // Prevent automatic traversal
  }

  /**
   * Visit Property - only walk trigger body if present
   * Returns false to prevent automatic traversal
   */
  visitProperty(node: Property): false {
    // Only walk trigger body if present (e.g., OnRun trigger)
    if (node.triggerBody) {
      for (const stmt of node.triggerBody) {
        this.walker.walk(stmt, this);
      }
    }

    return false; // Prevent automatic traversal
  }

  /**
   * Skip XMLport ELEMENTS section if table registry is not populated.
   *
   * XMLport elements reference record variables by table display name
   * (e.g., "Data Exch. Def") but the symbol table only registers the
   * element name (e.g., DataExchDef). These names never match, causing
   * false positives for every identifier in trigger bodies.
   *
   * When table registry is available, table display names are registered
   * from SourceTable properties, enabling proper validation.
   */
  visitElementsSection(_node: ElementsSection): false | void {
    if (!this.hasTableRegistry) {
      return false; // Skip traversal - suppresses false positives
    }
    // Otherwise, allow traversal (return void/undefined)
  }

  /**
   * Visit Identifier - check if undefined and create diagnostic if needed
   */
  visitIdentifier(node: Identifier): void {
    // Use ScopeTracker to determine if this identifier should be flagged
    const shouldFlag = this.scopeTracker.shouldFlagAsUndefined(
      node.name,
      node.startToken.startOffset,
      this.symbolTable,
      this.builtins
    );

    if (shouldFlag) {
      this.addDiagnostic(node);
    }
  }

  /**
   * Add diagnostic for undefined identifier
   */
  private addDiagnostic(node: Identifier): void {
    // Calculate end position
    const endToken = node.endToken || node.startToken;
    const endCharacter = endToken.column + (endToken.endOffset - endToken.startOffset) - 1;

    this.diagnostics.push({
      message: `Undefined identifier: '${node.name}'`,
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: node.startToken.line - 1,    // 1-based to 0-based
          character: node.startToken.column - 1
        },
        end: {
          line: endToken.line - 1,
          character: endCharacter
        }
      },
      source: 'cal',
      code: 'undefined-identifier'
    });
  }

  /**
   * Add diagnostic for undefined field
   */
  private addFieldDiagnostic(node: Identifier): void {
    // Calculate end position
    const endToken = node.endToken || node.startToken;
    const endCharacter = endToken.column + (endToken.endOffset - endToken.startOffset) - 1;

    this.diagnostics.push({
      message: `Undefined field: '${node.name}'`,
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: node.startToken.line - 1,    // 1-based to 0-based
          character: node.startToken.column - 1
        },
        end: {
          line: endToken.line - 1,
          character: endCharacter
        }
      },
      source: 'cal',
      code: 'undefined-field'
    });
  }
}

/**
 * Validator that detects undefined identifier references.
 * Implements the Validator interface for semantic analysis pipeline.
 */
export class UndefinedIdentifierValidator implements Validator {
  /** Validator name for logging and debugging */
  public readonly name = 'UndefinedIdentifierValidator';

  /**
   * Validates the AST for undefined identifier references.
   *
   * @param context - Validation context containing AST, symbol table, and builtins
   * @returns Array of diagnostics (warnings for undefined identifiers)
   */
  validate(context: ValidationContext): Diagnostic[] {
    const scopeTracker = new ScopeTracker();
    const walker = new ASTWalker();
    const visitor = new UndefinedIdentifierVisitor(
      scopeTracker,
      context.symbolTable,
      context.builtins,
      walker,  // Pass walker reference for manual traversal
      context.hasTableRegistry ?? false,
      context.fieldRegistry
    );

    walker.walk(context.ast, visitor);

    return visitor.diagnostics;
  }
}
