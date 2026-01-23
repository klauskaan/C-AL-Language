/**
 * FoldingRangeProvider for C/AL language server
 * Provides code folding regions for C/AL constructs
 */

import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CALDocument,
  ProcedureDeclaration,
  TriggerDeclaration,
  IfStatement,
  CaseStatement,
  ForStatement,
  WhileStatement,
  RepeatStatement,
  WithStatement,
  BlockStatement,
  PropertySection,
  FieldSection,
  KeySection,
  FieldGroupSection,
  CodeSection
} from '../parser/ast';
import { ASTVisitor } from '../visitor/astVisitor';
import { ASTWalker } from '../visitor/astWalker';

/**
 * Visitor that collects folding ranges from the AST
 */
class FoldingRangeCollectorVisitor implements Partial<ASTVisitor> {
  /** Collected folding ranges */
  public ranges: FoldingRange[] = [];

  /**
   * Visit procedure declaration - create folding range for entire procedure
   */
  visitProcedureDeclaration(node: ProcedureDeclaration): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, undefined);
    // Continue traversing children (procedure body may contain nested foldable constructs)
  }

  /**
   * Visit trigger declaration - create folding range for entire trigger
   */
  visitTriggerDeclaration(node: TriggerDeclaration): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, undefined);
    // Continue traversing children
  }

  /**
   * Visit IF statement - create folding range if it spans multiple lines
   */
  visitIfStatement(node: IfStatement): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, undefined);
    // Continue traversing children (then/else branches may have nested constructs)
  }

  /**
   * Visit CASE statement - create folding range
   */
  visitCaseStatement(node: CaseStatement): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, undefined);
    // Continue traversing children (branches may have nested constructs)
  }

  /**
   * Visit FOR loop - create folding range
   */
  visitForStatement(node: ForStatement): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, undefined);
    // Continue traversing children (loop body may have nested constructs)
  }

  /**
   * Visit WHILE loop - create folding range
   */
  visitWhileStatement(node: WhileStatement): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, undefined);
    // Continue traversing children
  }

  /**
   * Visit REPEAT...UNTIL loop - create folding range
   */
  visitRepeatStatement(node: RepeatStatement): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, undefined);
    // Continue traversing children
  }

  /**
   * Visit WITH statement - create folding range
   */
  visitWithStatement(node: WithStatement): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, undefined);
    // Continue traversing children
  }

  /**
   * Visit BEGIN...END block - create folding range
   */
  visitBlockStatement(node: BlockStatement): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, undefined);
    // Continue traversing children (nested blocks)
  }

  /**
   * Visit PROPERTIES section - create folding range with Region kind
   */
  visitPropertySection(node: PropertySection): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, FoldingRangeKind.Region);
    // Continue traversing children
  }

  /**
   * Visit FIELDS section - create folding range with Region kind
   */
  visitFieldSection(node: FieldSection): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, FoldingRangeKind.Region);
    // Continue traversing children
  }

  /**
   * Visit KEYS section - create folding range with Region kind
   */
  visitKeySection(node: KeySection): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, FoldingRangeKind.Region);
    // Continue traversing children
  }

  /**
   * Visit FIELDGROUPS section - create folding range with Region kind
   */
  visitFieldGroupSection(node: FieldGroupSection): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, FoldingRangeKind.Region);
    // Continue traversing children
  }

  /**
   * Visit CODE section - create folding range with Region kind
   */
  visitCodeSection(node: CodeSection): void | false {
    const effectiveEndToken = node.endToken || node.startToken;
    this.addFoldingRange(node.startToken.line, effectiveEndToken.line, FoldingRangeKind.Region);
    // Continue traversing children
  }

  /**
   * Helper to add a folding range with coordinate conversion and validation
   *
   * @param startLine - 1-based start line from token
   * @param endLine - 1-based end line from token
   * @param kind - Optional folding range kind (Region for sections, undefined for code constructs)
   */
  private addFoldingRange(startLine: number, endLine: number, kind: FoldingRangeKind | undefined): void {
    // Convert from 1-based (token) to 0-based (LSP)
    const startLineZeroBased = startLine - 1;

    // Convert to 0-based, then subtract 1 to exclude the terminator line (END, UNTIL, etc.)
    // This keeps the terminator visible when folded
    const endLineZeroBased = endLine - 1 - 1;

    // Skip single-line constructs (not useful for folding)
    if (endLineZeroBased <= startLineZeroBased) {
      return;
    }

    // Create folding range
    const range: FoldingRange = {
      startLine: startLineZeroBased,
      endLine: endLineZeroBased
    };

    // Add kind if specified (for sections)
    if (kind !== undefined) {
      range.kind = kind;
    }

    this.ranges.push(range);
  }
}

/**
 * FoldingRangeProvider class
 * Provides folding ranges for C/AL documents
 */
export class FoldingRangeProvider {
  /** Shared ASTWalker instance (stateless, can be reused) */
  private readonly walker = new ASTWalker();

  /**
   * Provide folding ranges for a C/AL document
   *
   * @param document - The text document (kept for API consistency with other providers, currently unused)
   * @param ast - The parsed AST
   * @returns Array of FoldingRange items
   */
  public provide(document: TextDocument, ast: CALDocument): FoldingRange[] {
    // Guard: return empty array if no object in AST
    if (!ast.object) {
      return [];
    }

    // Collect folding ranges using visitor pattern
    const visitor = new FoldingRangeCollectorVisitor();
    this.walker.walk(ast, visitor);

    return visitor.ranges;
  }
}
