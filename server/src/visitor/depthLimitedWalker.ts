/**
 * DepthLimitedWalker - AST walker with stack overflow protection
 *
 * Extends ASTWalker to add depth limiting for deeply nested structures.
 * Used by the LSP server's validation pipeline to protect against DoS
 * attacks via pathologically nested C/AL files.
 *
 * Issue #220: Protect against stack overflow on deeply nested actions
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { ASTWalker } from './astWalker';
import { ASTVisitor } from './astVisitor';
import { ActionDeclaration, ControlDeclaration, XMLportElement } from '../parser/ast';

export const DEFAULT_MAX_DEPTH = 100;

export class DepthLimitedWalker extends ASTWalker {
  private currentDepth = 0;
  private diagnostics: Diagnostic[] = [];
  private readonly maxDepth: number;

  constructor(maxDepth: number = DEFAULT_MAX_DEPTH) {
    super();
    this.maxDepth = maxDepth;
  }

  getDiagnostics(): Diagnostic[] {
    return [...this.diagnostics];
  }

  resetDiagnostics(): void {
    this.diagnostics = [];
    this.currentDepth = 0;
  }

  protected override walkActionDeclaration(
    node: ActionDeclaration,
    visitor: Partial<ASTVisitor>
  ): void {
    this.currentDepth++;

    if (this.currentDepth > this.maxDepth) {
      this.emitDepthExceededDiagnostic(node, 'action');
      this.currentDepth--;
      return; // Stop recursion
    }

    try {
      super.walkActionDeclaration(node, visitor);
    } finally {
      this.currentDepth--;
    }
  }

  protected override walkControlDeclaration(
    node: ControlDeclaration,
    visitor: Partial<ASTVisitor>
  ): void {
    this.currentDepth++;

    if (this.currentDepth > this.maxDepth) {
      this.emitDepthExceededDiagnostic(node, 'control');
      this.currentDepth--;
      return;
    }

    try {
      super.walkControlDeclaration(node, visitor);
    } finally {
      this.currentDepth--;
    }
  }

  protected override walkXMLportElement(
    node: XMLportElement,
    visitor: Partial<ASTVisitor>
  ): void {
    this.currentDepth++;

    if (this.currentDepth > this.maxDepth) {
      this.emitDepthExceededDiagnostic(node, 'XMLport element');
      this.currentDepth--;
      return;
    }

    try {
      super.walkXMLportElement(node, visitor);
    } finally {
      this.currentDepth--;
    }
  }

  private emitDepthExceededDiagnostic(
    node: ActionDeclaration | ControlDeclaration | XMLportElement,
    elementType: string
  ): void {
    // Get position from node's startToken (1-based to 0-based)
    const line = (node.startToken?.line ?? 1) - 1;
    const character = (node.startToken?.column ?? 1) - 1;

    this.diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: {
        start: { line, character },
        end: { line, character: character + 1 }
      },
      message: `Nesting depth ${this.currentDepth} exceeds limit ${this.maxDepth} for ${elementType}. Deep nesting may indicate malformed input.`,
      source: 'cal',
      code: 'nesting-depth-exceeded'
    });
  }
}
