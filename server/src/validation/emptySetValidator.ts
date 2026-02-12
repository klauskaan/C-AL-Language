/**
 * Empty Set Validator
 *
 * Detects empty sets in IN expressions (e.g., `IF x IN [] THEN`).
 * Empty sets in IN expressions always evaluate to false, indicating a logic error.
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { CALDocument, BinaryExpression, Expression, SetLiteral } from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';
import { Validator, ValidationContext } from '../semantic/types';

/**
 * Visitor that collects diagnostics for empty sets in IN expressions
 */
class EmptySetValidatorVisitor implements Partial<ASTVisitor> {
  public readonly diagnostics: Diagnostic[] = [];

  /**
   * Visit a BinaryExpression node - check for IN operator with empty sets
   */
  visitBinaryExpression(node: BinaryExpression): void | false {
    // Check if this is an IN expression (case-insensitive)
    if (node.operator.toUpperCase() === 'IN') {
      // Check both operands for empty sets
      // Note: Parser currently only recognizes SetLiteral on RIGHT of IN (x IN [])
      // Left-side checking ([] IN x) is future-proofing if parser support is added
      this.checkOperandForEmptySet(node.left);
      this.checkOperandForEmptySet(node.right);
    }
  }

  /**
   * Check if an operand is an empty SetLiteral and create diagnostic if so
   */
  private checkOperandForEmptySet(operand: Expression): void {
    if (operand.type === 'SetLiteral') {
      // Empty set has no elements (or only malformed elements that parse as empty)
      if (operand.elements.length === 0) {
        // Use endToken for range calculation, fallback to startToken if missing
        const endToken = operand.endToken || operand.startToken;

        // Calculate end position using source span (endOffset - startOffset)
        // This handles multi-character tokens (e.g., ']') correctly without relying on token.value
        const endCharacter = endToken.column + (endToken.endOffset - endToken.startOffset) - 1;

        this.diagnostics.push({
          message: 'Empty set in IN expression - condition will always be false',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              line: operand.startToken.line - 1,    // 1-based to 0-based
              character: operand.startToken.column - 1
            },
            end: {
              line: endToken.line - 1,
              character: endCharacter
            }
          },
          source: 'cal',
          code: 'empty-set'
        });
      }
    }
  }
}

/**
 * Validator that detects empty sets used with the IN operator.
 * Implements the Validator interface for semantic analysis pipeline.
 */
export class EmptySetValidator implements Validator {
  /** Validator name for logging and debugging */
  public readonly name = 'EmptySetValidator';

  /**
   * Validates the AST for empty set usage in IN expressions.
   *
   * @param context - Validation context containing AST and other analysis data
   * @returns Array of diagnostics (warnings for empty sets in IN expressions)
   */
  validate(context: ValidationContext): Diagnostic[] {
    const visitor = new EmptySetValidatorVisitor();
    const walker = new ASTWalker();

    walker.walk(context.ast, visitor);

    return visitor.diagnostics;
  }
}
