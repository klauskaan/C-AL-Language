/**
 * Deprecated Function Validator
 *
 * Detects calls to deprecated builtin functions (e.g., GETRECORDID, RECORDLEVELLOCKING, CONSISTENT).
 * Issues hints with strikethrough styling to discourage their use.
 */

import { Diagnostic, DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver';
import { CallExpression, Identifier } from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';
import { Validator, ValidationContext } from '../semantic/types';

/**
 * Visitor that collects diagnostics for deprecated function calls
 */
class DeprecatedFunctionValidatorVisitor implements Partial<ASTVisitor> {
  public readonly diagnostics: Diagnostic[] = [];

  constructor(private context: ValidationContext) {}

  /**
   * Visit a CallExpression node - check if it calls a deprecated function
   */
  visitCallExpression(node: CallExpression): void | false {
    const { callee } = node;

    // Handle record.METHOD() calls (primary - all 3 deprecated are record methods)
    // Record method calls are ALWAYS flagged (no shadowing possible)
    if (callee.type === 'MemberExpression') {
      const methodName = callee.property.name;

      // Check if this is a deprecated builtin record method
      const deprecationReason = this.context.builtins.getRecordMethodDeprecation(methodName);

      if (deprecationReason !== undefined) {
        this.reportDeprecated(callee.property, methodName.toUpperCase(), deprecationReason);
      }
    }
    // Handle direct function calls like FUNCTION() (secondary - for future global functions)
    // Direct calls need shadowing check because user procedures can override builtins
    else if (callee.type === 'Identifier') {
      const functionName = callee.name;

      // Check if this is a deprecated builtin global function
      const deprecationReason = this.context.builtins.getGlobalFunctionDeprecation(functionName);

      // Only report if it's actually a builtin (not shadowed by local symbol)
      if (deprecationReason !== undefined && this.isActualBuiltin(callee)) {
        this.reportDeprecated(callee, functionName.toUpperCase(), deprecationReason);
      }
    }
  }

  /**
   * Check if an identifier refers to the builtin (not shadowed by a user symbol).
   *
   * Position-aware resolution (getSymbolAtOffset) matches AdvisoryBuiltinValidator
   * so a shadow declared as a procedure-local variable or parameter is detected,
   * not only a root-scope global (#815). Note: this branch is currently unreachable
   * because all seeded deprecations are record methods (category: 'record') and
   * there are no deprecated GLOBAL functions, so no test exercises it today. The fix
   * is forward-looking parity — it prevents the same false-positive resurfacing if a
   * deprecated global function is later seeded.
   */
  private isActualBuiltin(identifier: Identifier): boolean {
    // If a user symbol resolves at this position, it shadows the builtin.
    const symbol = this.context.symbolTable.getSymbolAtOffset(
      identifier.name,
      identifier.startToken.startOffset
    );

    // If not found in the scope chain, it must be a builtin.
    return symbol === undefined;
  }

  /**
   * Report a deprecated function call
   */
  private reportDeprecated(node: Identifier, functionName: string, reason: string): void {
    this.diagnostics.push({
      message: `${functionName} is deprecated. ${reason}`,
      severity: DiagnosticSeverity.Hint,
      range: {
        start: {
          line: node.startToken.line - 1,      // 1-based to 0-based
          character: node.startToken.column - 1
        },
        end: {
          line: node.endToken.line - 1,
          character: node.endToken.column + (node.endToken.endOffset - node.endToken.startOffset) - 1
        }
      },
      source: 'cal',
      tags: [DiagnosticTag.Deprecated],
      code: 'deprecated-function'
    });
  }
}

/**
 * Validator that detects deprecated builtin function calls.
 * Implements the Validator interface for semantic analysis pipeline.
 */
export class DeprecatedFunctionValidator implements Validator {
  /** Validator name for logging and debugging */
  public readonly name = 'DeprecatedFunctionValidator';

  /**
   * Validates the AST for deprecated function calls.
   *
   * @param context - Validation context containing AST and builtin registry
   * @returns Array of diagnostics (hints for deprecated functions)
   */
  validate(context: ValidationContext): Diagnostic[] {
    // Early return if warnDeprecated is disabled
    if (context.settings?.diagnostics?.warnDeprecated === false) {
      return [];
    }

    const visitor = new DeprecatedFunctionValidatorVisitor(context);
    const walker = new ASTWalker();

    walker.walk(context.ast, visitor);

    return visitor.diagnostics;
  }
}
