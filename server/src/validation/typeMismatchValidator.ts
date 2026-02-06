/**
 * Type Mismatch Validator
 *
 * Detects type mismatches in assignment statements where the source value
 * cannot be assigned to the target variable according to C/AL type compatibility rules.
 *
 * Phase 1 Implementation:
 * - Validates simple assignments (Identifier := Literal/Identifier)
 * - Skips complex expressions (binary operations, function calls, etc.)
 * - Skips complex assignment targets (member access)
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import {
  CALDocument,
  AssignmentStatement,
  Identifier,
  Literal,
  ProcedureDeclaration,
  TriggerDeclaration,
  EventDeclaration,
  VariableDeclaration,
  ParameterDeclaration,
  DataType,
  Property
} from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';
import { Validator, ValidationContext } from '../semantic/types';
import { SymbolTable } from '../symbols/symbolTable';
import { Type } from '../types/types';
import { isAssignmentCompatible, inferLiteralType, typeToString } from '../types/typeUtils';

/**
 * Visitor that collects diagnostics for type mismatches in assignment statements.
 * Uses manual traversal control to properly handle scope-dependent constructs.
 */
class TypeMismatchVisitor implements Partial<ASTVisitor> {
  public readonly diagnostics: Diagnostic[] = [];

  /**
   * Constructor
   * @param symbolTable - Symbol table for identifier resolution
   * @param walker - ASTWalker instance for manual child traversal
   */
  constructor(
    private readonly symbolTable: SymbolTable,
    private readonly walker: ASTWalker
  ) {}

  /**
   * Visit AssignmentStatement - check for type mismatches
   * Returns false to prevent automatic traversal
   */
  visitAssignmentStatement(node: AssignmentStatement): false {
    // Phase 1: Only handle simple identifier targets
    if (node.target.type !== 'Identifier') {
      return false; // Skip complex targets (member access, array indexing, etc.)
    }

    const target = node.target as Identifier;

    // Look up target symbol
    const targetSymbol = this.symbolTable.getSymbolAtOffset(
      target.name,
      target.startToken.startOffset
    );

    // Skip if no symbol or no resolved type
    if (!targetSymbol || !targetSymbol.resolvedType) {
      return false;
    }

    const targetType = targetSymbol.resolvedType;

    // Skip if target type is unknown (cannot validate)
    if (targetType.kind === 'unknown') {
      return false;
    }

    // Resolve value type
    let valueType;

    if (node.value.type === 'Literal') {
      // Literal value: infer type from literal
      const literal = node.value as Literal;
      valueType = inferLiteralType(literal.literalType);
    } else if (node.value.type === 'Identifier') {
      // Identifier value: look up symbol and get resolved type
      const valueIdent = node.value as Identifier;
      const valueSymbol = this.symbolTable.getSymbolAtOffset(
        valueIdent.name,
        valueIdent.startToken.startOffset
      );

      if (!valueSymbol || !valueSymbol.resolvedType) {
        return false; // Cannot resolve value type
      }

      valueType = valueSymbol.resolvedType;
    } else {
      // Complex expression (binary operation, function call, etc.)
      return false; // Skip for Phase 1
    }

    // Skip if value type is unknown (cannot validate)
    if (!valueType || valueType.kind === 'unknown') {
      return false;
    }

    // Check assignment compatibility
    if (!isAssignmentCompatible(valueType, targetType)) {
      // Create diagnostic for type mismatch
      this.addDiagnostic(node, targetType, valueType);
    }

    return false; // Prevent automatic traversal
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
   * Add diagnostic for type mismatch
   */
  private addDiagnostic(
    node: AssignmentStatement,
    targetType: Type,
    valueType: Type
  ): void {
    // Format type strings for diagnostic message
    const targetTypeStr = typeToString(targetType);
    const valueTypeStr = typeToString(valueType);

    // Calculate end position for the entire assignment statement
    const endToken = node.endToken || node.startToken;
    const endCharacter = endToken.column + (endToken.endOffset - endToken.startOffset) - 1;

    this.diagnostics.push({
      message: `Type mismatch: cannot assign ${valueTypeStr} to ${targetTypeStr}`,
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
      source: 'cal'
    });
  }
}

/**
 * Validator that detects type mismatches in assignment statements.
 * Implements the Validator interface for semantic analysis pipeline.
 */
export class TypeMismatchValidator implements Validator {
  /** Validator name for logging and debugging */
  public readonly name = 'TypeMismatchValidator';

  /**
   * Validates the AST for type mismatches in assignment statements.
   *
   * @param context - Validation context containing AST and symbol table
   * @returns Array of diagnostics (warnings for type mismatches)
   */
  validate(context: ValidationContext): Diagnostic[] {
    const walker = new ASTWalker();
    const visitor = new TypeMismatchVisitor(
      context.symbolTable,
      walker  // Pass walker reference for manual traversal
    );

    walker.walk(context.ast, visitor);

    return visitor.diagnostics;
  }
}
