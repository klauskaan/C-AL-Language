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
import { RecordType, isRecordType } from '../types/types';
import { FieldInfo } from '../workspaceSymbol/workspaceIndex';

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
  ['SETAUTOCALCFIELDS', 'all'],
  ['SETASCENDING', 'first'],
  ['GETASCENDING', 'first'],
]);

/**
 * Visitor that collects diagnostics for undefined identifiers.
 * Uses manual traversal control to properly handle scope-dependent constructs.
 */
class UndefinedIdentifierVisitor implements Partial<ASTVisitor> {
  public readonly diagnostics: Diagnostic[] = [];
  private readonly userTablesIndexed: boolean;

  /**
   * Constructor
   * @param scopeTracker - Tracker for WITH statement context
   * @param symbolTable - Symbol table for identifier resolution
   * @param builtins - Registry of builtin functions
   * @param walker - ASTWalker instance for manual child traversal
   * @param userTablesIndexed - Whether user tables have been indexed
   * @param fieldRegistry - Optional field registry mapping table numbers to field info
   * @param tableRegistry - Optional table registry mapping table numbers to table names
   */
  constructor(
    private readonly scopeTracker: ScopeTracker,
    private readonly symbolTable: SymbolTable,
    private readonly builtins: BuiltinRegistry,
    private readonly walker: ASTWalker,
    userTablesIndexed: boolean,
    private readonly fieldRegistry?: ReadonlyMap<number, ReadonlyMap<string, FieldInfo>>,
    private readonly tableRegistry?: ReadonlyMap<number, string>,
    private readonly procedureRegistry?: ReadonlyMap<number, ReadonlyMap<string, string>>
  ) {
    this.userTablesIndexed = userTablesIndexed;
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
   * Visit MemberExpression - only walk the object part, validate the property if field registry available
   * Returns false to prevent automatic traversal
   */
  visitMemberExpression(node: MemberExpression): false {
    // Only walk the object (left side), not the property (right side)
    // Example: Customer."No." - walk Customer, skip "No."
    this.walker.walk(node.object, this);

    // Validate the property if field registry is available
    if (this.fieldRegistry) {
      this.validateMemberProperty(node);
    }

    return false; // Prevent automatic traversal
  }

  /**
   * Visit CallExpression - handle callee specially, skip field-reference arguments
   * Returns false to prevent automatic traversal
   */
  visitCallExpression(node: CallExpression): false {
    // Walk the callee (receiver + method name)
    this.walker.walk(node.callee, this);

    // Determine if this is a record method call with field-reference arguments
    const fieldRefMode = this.getFieldReferenceMode(node);

    // Walk arguments, skipping field-reference positions
    for (let i = 0; i < node.arguments.length; i++) {
      if (fieldRefMode === 'all') {
        // All args are field references - skip all
        continue;
      }
      if (fieldRefMode === 'first' && i === 0) {
        // First arg is a field reference - skip it
        continue;
      }
      this.walker.walk(node.arguments[i], this);
    }

    return false; // Prevent automatic traversal
  }

  /**
   * Determine if a call expression is a record method with field-reference arguments.
   * Returns the field-reference mode ('first', 'all') or undefined if not applicable.
   */
  private getFieldReferenceMode(node: CallExpression): 'first' | 'all' | undefined {
    if (node.callee.type !== 'MemberExpression') {
      return undefined;
    }
    const memberExpr = node.callee as MemberExpression;
    const methodName = memberExpr.property.name.toUpperCase();
    return FIELD_REFERENCE_METHODS.get(methodName);
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
    if (!this.userTablesIndexed) {
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
   * Validate member expression property (field/method name).
   * Checks if the property exists on the record variable using field registry.
   *
   * Three layers of graceful degradation:
   * 1. Skip if field registry unavailable
   * 2. Skip if object symbol not found (handled upstream)
   * 3. Skip if table ID not resolved (bare "Record" type)
   */
  private validateMemberProperty(node: MemberExpression): void {
    // Layer 1: Field registry must be available (already checked by caller)
    if (!this.fieldRegistry) {
      return;
    }

    // Get object name from member expression
    if (node.object.type !== 'Identifier') {
      return; // Only validate Identifier.Property form
    }

    const objectName = (node.object as Identifier).name;
    const propertyName = node.property.name;

    // Check if property is a record method BEFORE checking field registry
    // This prevents methods like MODIFY from being flagged as invalid fields
    if (this.builtins.isRecordMethod(propertyName)) {
      return; // Valid record method - no diagnostic needed
    }

    // Layer 2: Look up object symbol with position-aware scoping
    const symbol = this.symbolTable.getSymbolAtOffset(
      objectName,
      node.object.startToken.startOffset
    );

    if (!symbol) {
      return; // Symbol not found - handled by upstream undefined-identifier check
    }

    // Layer 3: Resolve table ID from symbol type
    let tableId: number | undefined;

    // First check: symbol.resolvedType (works for explicit variables)
    if (symbol.resolvedType && isRecordType(symbol.resolvedType)) {
      tableId = symbol.resolvedType.tableId;
    }
    // Second check: parse string type field (works for implicit Table Rec)
    else if (symbol.type) {
      const match = /^Record\s+(\d+)$/i.exec(symbol.type);
      if (match) {
        tableId = parseInt(match[1], 10);
      }
    }

    // Layer 3 fallback: Cannot resolve table ID (e.g., bare "Record" for implicit Page/Report Rec)
    if (tableId === undefined) {
      return; // Gracefully skip validation
    }

    // Look up table fields in field registry
    const tableFields = this.fieldRegistry.get(tableId);
    if (!tableFields) {
      return; // Table not in registry - gracefully skip
    }

    // Check if property exists in table fields (O(1) case-insensitive lookup)
    const fieldExists = tableFields.has(propertyName.toUpperCase());

    // If field doesn't exist, add diagnostic
    if (!fieldExists) {
      // Check if property is a user-defined procedure on this table.
      // Suppresses false-positive undefined-property warnings for legitimate table procedure calls.
      if (this.procedureRegistry) {
        const tableProcedures = this.procedureRegistry.get(tableId);
        if (tableProcedures?.has(propertyName.toUpperCase())) {
          return;
        }
      }
      this.addPropertyDiagnostic(node, propertyName, objectName, tableId);
    }
  }

  /**
   * Add diagnostic for unknown property on record variable.
   */
  private addPropertyDiagnostic(node: MemberExpression, propertyName: string, objectName: string, tableId: number): void {
    // Calculate end position for the property part
    const endToken = node.property.endToken || node.property.startToken;
    const endCharacter = endToken.column + (endToken.endOffset - endToken.startOffset) - 1;

    // Try to get table name from registry, fall back to "Record {tableId}"
    const tableName = this.tableRegistry?.get(tableId) ?? `Record ${tableId}`;

    this.diagnostics.push({
      message: `Unknown field or property: '${propertyName}' on record variable '${objectName}' (${tableName})`,
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: node.property.startToken.line - 1,    // 1-based to 0-based
          character: node.property.startToken.column - 1
        },
        end: {
          line: endToken.line - 1,
          character: endCharacter
        }
      },
      source: 'cal',
      code: 'undefined-property'
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
      context.userTablesIndexed ?? false,
      context.fieldRegistry,
      context.tableRegistry,
      context.procedureRegistry
    );

    walker.walk(context.ast, visitor);

    return visitor.diagnostics;
  }
}
