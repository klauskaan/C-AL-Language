/**
 * Deprecated Function Validator
 *
 * Detects calls to deprecated builtin functions (e.g., GETRECORDID, RECORDLEVELLOCKING, CONSISTENT).
 * Issues hints with strikethrough styling to discourage their use.
 */

import { Diagnostic, DiagnosticSeverity, DiagnosticTag } from 'vscode-languageserver';
import { CALDocument, CallExpression, MemberExpression, Identifier } from '../parser/ast';
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
      const memberExpr = callee as MemberExpression;
      const methodName = memberExpr.property.name;

      // Check if this is a deprecated builtin record method
      const deprecationReason = this.context.builtins.getRecordMethodDeprecation(methodName);

      if (deprecationReason !== undefined) {
        this.reportDeprecated(memberExpr.property, methodName.toUpperCase(), deprecationReason);
      }
    }
    // Handle direct function calls like FUNCTION() (secondary - for future global functions)
    // Direct calls need shadowing check because user procedures can override builtins
    else if (callee.type === 'Identifier') {
      const identifier = callee as Identifier;
      const functionName = identifier.name;

      // Check if this is a deprecated builtin global function
      const deprecationReason = this.context.builtins.getGlobalFunctionDeprecation(functionName);

      // Only report if it's actually a builtin (not shadowed by local symbol)
      if (deprecationReason !== undefined && this.isActualBuiltin(identifier)) {
        this.reportDeprecated(identifier, functionName.toUpperCase(), deprecationReason);
      }
    }
  }

  /**
   * Check if an identifier refers to the builtin (not shadowed by local symbol)
   */
  private isActualBuiltin(identifier: Identifier): boolean {
    // Build symbol table from AST if not already built
    if (this.context.symbolTable.getAllSymbols().length === 0) {
      this.context.symbolTable.buildFromAST(this.context.ast);
    }

    // Look up in symbol table - if found locally, it's shadowing the builtin
    const symbol = this.context.symbolTable.getSymbol(identifier.name);

    // If not found in symbol table, it must be a builtin
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
      tags: [DiagnosticTag.Deprecated]
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
