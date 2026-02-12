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
 * Collect folding ranges for multi-line C-style comment blocks
 *
 * Scans the source text for multi-line comments that span 3 or more lines.
 * Skips single-quoted string literals to avoid false positives.
 * Handles escaped quotes inside strings and line terminators.
 *
 * @param text - The full source text to scan
 * @returns Array of FoldingRange items with kind Comment for multi-line comments
 */
export function collectCommentFoldingRanges(text: string): FoldingRange[] {
  const ranges: FoldingRange[] = [];
  let i = 0;
  let line = 0;

  while (i < text.length) {
    const ch = text[i];

    // String skipping (prevent false positives)
    if (ch === "'") {
      i++;
      while (i < text.length) {
        if (text[i] === "'") {
          if (i + 1 < text.length && text[i + 1] === "'") {
            i += 2; // skip escaped quote ''
          } else {
            i++; // advance past closing quote
            break;
          }
        } else if (text[i] === "\r") {
          if (i + 1 < text.length && text[i + 1] === "\n") {
            i += 2; // \r\n as pair
          } else {
            i++;
          }
          line++;
        } else if (text[i] === "\n") {
          i++;
          line++;
        } else {
          i++;
        }
      }
      continue;
    }

    // Skip // line comments (prevent false positives from /* inside //)
    if (ch === "/" && i + 1 < text.length && text[i + 1] === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n" && text[i] !== "\r") {
        i++;
      }
      continue;
    }

    // Comment detection
    if (ch === "/" && i + 1 < text.length && text[i + 1] === "*") {
      const startLine = line;
      i += 2; // advance past /*

      while (i < text.length) {
        if (text[i] === "*" && i + 1 < text.length && text[i + 1] === "/") {
          const endLine = line;
          i += 2; // advance past */

          if (endLine - startLine >= 2) { // 3+ lines
            ranges.push({
              startLine,
              endLine,
              kind: FoldingRangeKind.Comment
            });
          }
          break;
        }

        if (text[i] === "\r") {
          if (i + 1 < text.length && text[i + 1] === "\n") {
            i += 2;
          } else {
            i++;
          }
          line++;
        } else if (text[i] === "\n") {
          i++;
          line++;
        } else {
          i++;
        }
      }
      continue;
    }

    // Line counting
    if (ch === "\r") {
      if (i + 1 < text.length && text[i + 1] === "\n") {
        i += 2;
      } else {
        i++;
      }
      line++;
      continue;
    }

    if (ch === "\n") {
      i++;
      line++;
      continue;
    }

    // Default: advance
    i++;
  }

  return ranges;
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
   * @param document - The text document
   * @param ast - The parsed AST
   * @returns Array of FoldingRange items
   */
  public provide(document: TextDocument, ast: CALDocument): FoldingRange[] {
    // Collect comment folding ranges from raw text (comments are not in the AST)
    const commentRanges = collectCommentFoldingRanges(document.getText());

    // Guard: return comment ranges only if no object in AST
    if (!ast.object) {
      return commentRanges;
    }

    // Collect code folding ranges using visitor pattern
    const visitor = new FoldingRangeCollectorVisitor();
    this.walker.walk(ast, visitor);

    // Combine: comment ranges and code ranges don't overlap
    return commentRanges.concat(visitor.ranges);
  }
}
