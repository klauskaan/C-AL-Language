/**
 * SetLiteral Scanner
 *
 * Walks the AST and identifies set literals and range operators for semantic highlighting.
 *
 * This scanner builds a context map that distinguishes:
 * - SetBracketOpen: [ in set literal (not array access/declaration)
 * - SetBracketClose: ] in set literal (not array access/declaration)
 * - RangeOperator: .. within range expressions inside set literals
 *
 * The context map uses token.startOffset as keys to enable fast lookup
 * during semantic token generation.
 *
 * Phase 2 of Issue #44: Semantic highlighting for set literals
 */

import { CALDocument, SetLiteral, RangeExpression } from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';

/**
 * Token context types for semantic highlighting
 */
export enum TokenContextType {
  SetBracketOpen = 'SetBracketOpen',
  SetBracketClose = 'SetBracketClose',
  RangeOperator = 'RangeOperator'
}

/**
 * Context map result from scanning
 */
export interface SetLiteralContext {
  contextMap: Map<number, TokenContextType>;
}

/**
 * Visitor that collects set literal and range operator positions
 */
class SetLiteralVisitor implements Partial<ASTVisitor> {
  public contextMap: Map<number, TokenContextType> = new Map();
  private walker: ASTWalker = new ASTWalker();

  /**
   * Visit SetLiteral node and mark its brackets
   * Returns false to prevent automatic child traversal - we'll handle it manually
   */
  visitSetLiteral(node: SetLiteral): void | false {
    // Mark opening bracket
    this.contextMap.set(node.startToken.startOffset, TokenContextType.SetBracketOpen);

    // Mark closing bracket
    this.contextMap.set(node.endToken.startOffset, TokenContextType.SetBracketClose);

    // Manually traverse children with a range-marking visitor
    // This ensures RangeExpression nodes are only marked when inside this SetLiteral
    const rangeVisitor: Partial<ASTVisitor> = {
      visitRangeExpression: (rangeNode: RangeExpression) => {
        if (rangeNode.operatorToken) {
          this.contextMap.set(rangeNode.operatorToken.startOffset, TokenContextType.RangeOperator);
        }
        // Continue traversal
      }
    };

    // Walk each element in the set
    for (const element of node.elements) {
      this.walker.walk(element, rangeVisitor);
    }

    // Return false to prevent automatic child traversal (we handled it manually)
    return false;
  }
}

/**
 * Scan AST for set literals and range operators
 *
 * @param ast - The C/AL document AST
 * @returns Context map with token offsets mapped to their context types
 */
export function scanForSetLiterals(ast: CALDocument): SetLiteralContext {
  const visitor = new SetLiteralVisitor();
  const walker = new ASTWalker();

  // Walk the AST and collect set literal/range contexts
  walker.walk(ast, visitor);

  return {
    contextMap: visitor.contextMap
  };
}
