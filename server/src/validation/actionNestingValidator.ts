/**
 * Action Nesting Validator
 *
 * Validates action nesting rules in C/AL ACTIONS sections:
 * 1. Root actions must be ActionContainer (skipped for control-property source)
 * 2. ActionContainer must only appear at root level
 * 3. Action and Separator cannot have children
 *
 * Context: The source field on ActionSection indicates origin.
 * 'control-property' ActionLists (in CONTROLS sections) don't require
 * ActionContainer at root — bare Actions are the norm (86/87 corpus instances).
 * All other sources (top-level, property, undefined) enforce Rule 1.
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
    // control-property source (CONTROLS section ActionList) doesn't require
    // ActionContainer at root. All other sources (top-level, property,
    // undefined) enforce the full ruleset — undefined defaults to strict
    // as the safer assumption.
    const skipContainerRequirement = section.source === 'control-property';

    for (const action of section.actions) {
      if (skipContainerRequirement) {
        this.validateControlPropertyRootAction(action);
      } else {
        this.validateRootAction(action);
      }
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
   * Validate a root-level action in control-property context.
   * Rule 1 is skipped (ActionContainer not required at root).
   * Rules 2 and 3 still apply.
   */
  private validateControlPropertyRootAction(action: ActionDeclaration): void {
    // Skip if parser recovery node (rawActionType indicates parse error)
    if (action.rawActionType !== undefined) {
      return;
    }

    // No Rule 1 check — any action type is valid at root in control-property context

    // Rule 3: Action and Separator cannot have children (applies even at root)
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

    // Unconditionally recurse children — this is NOT conditional on Rule 3
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
