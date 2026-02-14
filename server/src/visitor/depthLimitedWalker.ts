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
import {
  ActionDeclaration,
  ControlDeclaration,
  XMLportElement,
  IfStatement,
  WhileStatement,
  ForStatement,
  RepeatStatement,
  CaseStatement,
  WithStatement
} from '../parser/ast';

export const DEFAULT_MAX_DEPTH = 100;

/**
 * Physical stack safety limit, independent of the semantic maxDepth.
 *
 * This prevents V8 stack overflow (RangeError: Maximum call stack size exceeded)
 * when processing pathologically nested ASTs. The walker's recursive traversal
 * uses 5-8 stack frames per nesting level depending on statement type:
 *
 *   - IF/WHILE/FOR: ~5 frames/level (walk -> override -> super -> walkStatement -> walk)
 *   - CASE:         ~8 frames/level (walk -> override -> super -> walk(branch) -> caseBranch -> walkStatement -> walk)
 *
 * Measured worst-case safe depth: ~1,400 levels (CaseStatement with test harness overhead).
 * Value of 1000 provides a ~1.4x safety margin against the worst case.
 *
 * Methodology: Binary search for max non-overflowing depth using simulated frame patterns
 * on Node.js/V8 (Linux x86_64), with 200 frames of overhead for test/LSP harness.
 *
 * If V8 stack limits change or the walker's call structure changes, re-measure with:
 *   createNestedCaseStatements(N) and walk() until stack overflow is found.
 */
export const PHYSICAL_STACK_LIMIT = 1000;

export class DepthLimitedWalker extends ASTWalker {
  private currentDepth = 0;
  private diagnostics: Diagnostic[] = [];
  private readonly maxDepth: number;
  private readonly effectiveLimit: number;

  constructor(maxDepth: number = DEFAULT_MAX_DEPTH) {
    super();
    this.maxDepth = maxDepth;
    this.effectiveLimit = Math.min(maxDepth, PHYSICAL_STACK_LIMIT);
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

    if (this.currentDepth > this.effectiveLimit) {
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

    if (this.currentDepth > this.effectiveLimit) {
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

    if (this.currentDepth > this.effectiveLimit) {
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

  protected override walkIfStatement(
    node: IfStatement,
    visitor: Partial<ASTVisitor>
  ): void {
    this.currentDepth++;

    if (this.currentDepth > this.effectiveLimit) {
      this.emitDepthExceededDiagnostic(node, 'if statement');
      this.currentDepth--;
      return;
    }

    try {
      super.walkIfStatement(node, visitor);
    } finally {
      this.currentDepth--;
    }
  }

  protected override walkWhileStatement(
    node: WhileStatement,
    visitor: Partial<ASTVisitor>
  ): void {
    this.currentDepth++;

    if (this.currentDepth > this.effectiveLimit) {
      this.emitDepthExceededDiagnostic(node, 'while statement');
      this.currentDepth--;
      return;
    }

    try {
      super.walkWhileStatement(node, visitor);
    } finally {
      this.currentDepth--;
    }
  }

  protected override walkForStatement(
    node: ForStatement,
    visitor: Partial<ASTVisitor>
  ): void {
    this.currentDepth++;

    if (this.currentDepth > this.effectiveLimit) {
      this.emitDepthExceededDiagnostic(node, 'for statement');
      this.currentDepth--;
      return;
    }

    try {
      super.walkForStatement(node, visitor);
    } finally {
      this.currentDepth--;
    }
  }

  protected override walkRepeatStatement(
    node: RepeatStatement,
    visitor: Partial<ASTVisitor>
  ): void {
    this.currentDepth++;

    if (this.currentDepth > this.effectiveLimit) {
      this.emitDepthExceededDiagnostic(node, 'repeat statement');
      this.currentDepth--;
      return;
    }

    try {
      super.walkRepeatStatement(node, visitor);
    } finally {
      this.currentDepth--;
    }
  }

  protected override walkCaseStatement(
    node: CaseStatement,
    visitor: Partial<ASTVisitor>
  ): void {
    this.currentDepth++;

    if (this.currentDepth > this.effectiveLimit) {
      this.emitDepthExceededDiagnostic(node, 'case statement');
      this.currentDepth--;
      return;
    }

    try {
      super.walkCaseStatement(node, visitor);
    } finally {
      this.currentDepth--;
    }
  }

  protected override walkWithStatement(
    node: WithStatement,
    visitor: Partial<ASTVisitor>
  ): void {
    this.currentDepth++;

    if (this.currentDepth > this.effectiveLimit) {
      this.emitDepthExceededDiagnostic(node, 'with statement');
      this.currentDepth--;
      return;
    }

    try {
      super.walkWithStatement(node, visitor);
    } finally {
      this.currentDepth--;
    }
  }

  private emitDepthExceededDiagnostic(
    node: ActionDeclaration | ControlDeclaration | XMLportElement | IfStatement | WhileStatement | ForStatement | RepeatStatement | CaseStatement | WithStatement,
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
      message: `Nesting depth ${this.currentDepth} exceeds limit ${this.effectiveLimit} for ${elementType}. Deep nesting may indicate malformed input.`,
      source: 'cal',
      code: 'nesting-depth-exceeded'
    });
  }
}
