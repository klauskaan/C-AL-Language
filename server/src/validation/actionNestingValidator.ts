/**
 * Action Nesting Validator
 *
 * Validates action nesting rules in C/AL ACTIONS sections:
 * 1. Root actions must be ActionContainer
 * 2. ActionContainer must only appear at root level
 * 3. Action and Separator cannot have children
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { ActionDeclaration, ActionSection } from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';
import { Validator, ValidationContext } from '../semantic/types';

/**
 * Visitor that collects diagnostics for invalid action nesting
 */
class ActionNestingValidatorVisitor implements Partial<ASTVisitor> {
  public readonly diagnostics: Diagnostic[] = [];

  /**
   * Visit an ActionSection node - validate action nesting rules
   */
  visitActionSection(node: ActionSection): void | false {
    // Handle recursion manually - return false to prevent ASTWalker from traversing
    this.validateActionSection(node);
    return false;
  }

  /**
   * Validate an entire action section
   */
  private validateActionSection(section: ActionSection): void {
    // Validate each root-level action
    for (const action of section.actions) {
      this.validateRootAction(action);
    }
  }

  /**
   * Validate a root-level action (must be ActionContainer)
   */
  private validateRootAction(action: ActionDeclaration): void {
    // Skip if parser recovery node (rawActionType indicates parse error)
    if (action.rawActionType !== undefined) {
      return;
    }

    // Rule 1: Root actions must be ActionContainer
    if (action.actionType !== 'ActionContainer') {
      this.diagnostics.push({
        message: `${action.actionType} cannot be a root action; expected ActionContainer`,
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: action.startToken.line - 1,
            character: action.startToken.column - 1
          },
          end: {
            line: action.endToken.line - 1,
            character: action.endToken.column + (action.endToken.endOffset - action.endToken.startOffset) - 1
          }
        },
        source: 'cal',
        code: 'action-nesting-root'
      });
    }

    // Recursively validate children
    for (const child of action.children) {
      this.validateNestedAction(child);
    }
  }

  /**
   * Validate a nested action (not at root level)
   * @param action - The action to validate
   */
  private validateNestedAction(action: ActionDeclaration): void {
    // Skip if parser recovery node
    if (action.rawActionType !== undefined) {
      return;
    }

    // Rule 2: ActionContainer must only appear at root level
    if (action.actionType === 'ActionContainer') {
      this.diagnostics.push({
        message: `ActionContainer must be at root level, not nested inside another action`,
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: action.startToken.line - 1,
            character: action.startToken.column - 1
          },
          end: {
            line: action.endToken.line - 1,
            character: action.endToken.column + (action.endToken.endOffset - action.endToken.startOffset) - 1
          }
        },
        source: 'cal',
        code: 'action-nesting-container'
      });
    }

    // Rule 3: Action and Separator cannot have children
    if ((action.actionType === 'Action' || action.actionType === 'Separator') && action.children.length > 0) {
      this.diagnostics.push({
        message: `${action.actionType} cannot have child actions (has ${action.children.length})`,
        severity: DiagnosticSeverity.Warning,
        range: {
          start: {
            line: action.startToken.line - 1,
            character: action.startToken.column - 1
          },
          end: {
            line: action.endToken.line - 1,
            character: action.endToken.column + (action.endToken.endOffset - action.endToken.startOffset) - 1
          }
        },
        source: 'cal',
        code: 'action-nesting-leaf'
      });
    }

    // Recursively validate children
    for (const child of action.children) {
      this.validateNestedAction(child);
    }
  }
}

/**
 * Validator that detects invalid action nesting in ACTIONS sections.
 * Implements the Validator interface for semantic analysis pipeline.
 */
export class ActionNestingValidator implements Validator {
  /** Validator name for logging and debugging */
  public readonly name = 'ActionNestingValidator';

  /**
   * Validates the AST for invalid action nesting.
   *
   * @param context - Validation context containing AST and settings
   * @returns Array of diagnostics (warnings for invalid nesting)
   */
  validate(context: ValidationContext): Diagnostic[] {
    // Early return if warnActionNesting is disabled
    if (context.settings?.diagnostics?.warnActionNesting === false) {
      return [];
    }

    const visitor = new ActionNestingValidatorVisitor();
    const walker = new ASTWalker();

    walker.walk(context.ast, visitor);

    return visitor.diagnostics;
  }
}
