/**
 * Find All References provider for C/AL language server
 * Provides navigation to all usages of a symbol (Shift+F12)
 */

import {
  Location,
  Position,
  Range
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CALDocument,
  Expression,
  Statement,
  Identifier,
  BinaryExpression,
  UnaryExpression,
  MemberExpression,
  CallExpression,
  ArrayAccessExpression,
  BlockStatement,
  IfStatement,
  WhileStatement,
  RepeatStatement,
  ForStatement,
  CaseStatement,
  AssignmentStatement,
  CallStatement,
  ExitStatement,
  ProcedureDeclaration,
  TriggerDeclaration
} from '../parser/ast';
import { Token } from '../lexer/tokens';

/** Regex pattern for valid C/AL identifier characters */
const IDENTIFIER_PATTERN = /[a-zA-Z0-9_]/;

/**
 * Represents a reference to a symbol
 */
interface SymbolReference {
  name: string;
  token: Token;
  isDefinition: boolean;
}

/**
 * Reference provider class
 * Handles "Find All References" requests for C/AL symbols
 */
export class ReferenceProvider {
  /**
   * Helper to scan backwards from an offset while a predicate is true
   */
  private scanBackward(text: string, startOffset: number, predicate: (char: string) => boolean): number {
    let pos = startOffset;
    while (pos >= 0 && predicate(text[pos])) {
      pos--;
    }
    return pos + 1;
  }

  /**
   * Helper to scan forwards from an offset while a predicate is true
   */
  private scanForward(text: string, startOffset: number, predicate: (char: string) => boolean): number {
    let pos = startOffset;
    while (pos < text.length && predicate(text[pos])) {
      pos++;
    }
    return pos;
  }

  /**
   * Get the word at the cursor position
   * Handles both regular identifiers and quoted identifiers (e.g., "No.")
   */
  private getWordAtPosition(document: TextDocument, position: Position): { word: string; start: number; end: number } | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Check if we're inside a quoted identifier
    // Scan backwards to find if there's an opening quote before us (without a closing quote between)
    let inQuote = false;
    let quoteStart = -1;
    for (let i = offset - 1; i >= 0; i--) {
      if (text[i] === '"') {
        // Found a quote - check if it's opening or closing
        // Count quotes from start to here to determine
        let quoteCount = 0;
        for (let j = 0; j <= i; j++) {
          if (text[j] === '"') quoteCount++;
        }
        // Odd count means we're inside quotes
        inQuote = quoteCount % 2 === 1;
        if (inQuote) {
          quoteStart = i;
        }
        break;
      }
      // Stop at newline
      if (text[i] === '\n') break;
    }

    if (inQuote && quoteStart >= 0) {
      // Find the closing quote
      let quoteEnd = -1;
      for (let i = offset; i < text.length; i++) {
        if (text[i] === '"') {
          quoteEnd = i;
          break;
        }
        if (text[i] === '\n') break;
      }
      if (quoteEnd > quoteStart) {
        // Return the content inside quotes (without the quotes themselves)
        return {
          word: text.substring(quoteStart + 1, quoteEnd),
          start: quoteStart + 1,
          end: quoteEnd
        };
      }
    }

    // Check if we're in a regular identifier
    if (offset > 0 && !IDENTIFIER_PATTERN.test(text[offset]) && !IDENTIFIER_PATTERN.test(text[offset - 1])) {
      return null;
    }

    const start = this.scanBackward(text, offset - 1, c => IDENTIFIER_PATTERN.test(c));
    const end = this.scanForward(text, offset, c => IDENTIFIER_PATTERN.test(c));

    if (start >= end) {
      return null;
    }

    return {
      word: text.substring(start, end),
      start,
      end
    };
  }

  /**
   * Convert a token to an LSP Location
   */
  private tokenToLocation(token: Token, documentUri: string): Location {
    // Token line and column are 1-based, LSP wants 0-based
    const startLine = token.line - 1;
    const startChar = token.column - 1;
    const endChar = startChar + token.value.length;

    const range: Range = {
      start: { line: startLine, character: startChar },
      end: { line: startLine, character: endChar }
    };

    return {
      uri: documentUri,
      range
    };
  }

  /**
   * Collect all identifier references from an expression
   */
  private collectFromExpression(expr: Expression | null, refs: SymbolReference[]): void {
    if (!expr) return;

    switch (expr.type) {
      case 'Identifier': {
        const id = expr as Identifier;
        refs.push({
          name: id.name,
          token: id.startToken,
          isDefinition: false
        });
        break;
      }

      case 'BinaryExpression': {
        const bin = expr as BinaryExpression;
        this.collectFromExpression(bin.left, refs);
        this.collectFromExpression(bin.right, refs);
        break;
      }

      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        this.collectFromExpression(unary.operand, refs);
        break;
      }

      case 'MemberExpression': {
        const member = expr as MemberExpression;
        this.collectFromExpression(member.object, refs);
        // Also collect the property (field reference)
        refs.push({
          name: member.property.name,
          token: member.property.startToken,
          isDefinition: false
        });
        break;
      }

      case 'CallExpression': {
        const call = expr as CallExpression;
        this.collectFromExpression(call.callee, refs);
        for (const arg of call.arguments) {
          this.collectFromExpression(arg, refs);
        }
        break;
      }

      case 'ArrayAccessExpression': {
        const arr = expr as ArrayAccessExpression;
        this.collectFromExpression(arr.array, refs);
        this.collectFromExpression(arr.index, refs);
        break;
      }

      // Literals don't contain identifiers
      case 'Literal':
        break;

      default:
        // Unknown expression type - ignore
        break;
    }
  }

  /**
   * Collect all identifier references from a statement
   */
  private collectFromStatement(stmt: Statement | null, refs: SymbolReference[]): void {
    if (!stmt) return;

    switch (stmt.type) {
      case 'BlockStatement': {
        const block = stmt as BlockStatement;
        for (const s of block.statements) {
          this.collectFromStatement(s, refs);
        }
        break;
      }

      case 'IfStatement': {
        const ifStmt = stmt as IfStatement;
        this.collectFromExpression(ifStmt.condition, refs);
        this.collectFromStatement(ifStmt.thenBranch, refs);
        if (ifStmt.elseBranch) {
          this.collectFromStatement(ifStmt.elseBranch, refs);
        }
        break;
      }

      case 'WhileStatement': {
        const whileStmt = stmt as WhileStatement;
        this.collectFromExpression(whileStmt.condition, refs);
        this.collectFromStatement(whileStmt.body, refs);
        break;
      }

      case 'RepeatStatement': {
        const repeat = stmt as RepeatStatement;
        for (const s of repeat.body) {
          this.collectFromStatement(s, refs);
        }
        this.collectFromExpression(repeat.condition, refs);
        break;
      }

      case 'ForStatement': {
        const forStmt = stmt as ForStatement;
        // The loop variable is a reference (write)
        refs.push({
          name: forStmt.variable.name,
          token: forStmt.variable.startToken,
          isDefinition: false
        });
        this.collectFromExpression(forStmt.from, refs);
        this.collectFromExpression(forStmt.to, refs);
        this.collectFromStatement(forStmt.body, refs);
        break;
      }

      case 'CaseStatement': {
        const caseStmt = stmt as CaseStatement;
        this.collectFromExpression(caseStmt.expression, refs);
        for (const branch of caseStmt.branches) {
          for (const val of branch.values) {
            this.collectFromExpression(val, refs);
          }
          for (const s of branch.statements) {
            this.collectFromStatement(s, refs);
          }
        }
        if (caseStmt.elseBranch) {
          for (const s of caseStmt.elseBranch) {
            this.collectFromStatement(s, refs);
          }
        }
        break;
      }

      case 'AssignmentStatement': {
        const assign = stmt as AssignmentStatement;
        this.collectFromExpression(assign.target, refs);
        this.collectFromExpression(assign.value, refs);
        break;
      }

      case 'CallStatement': {
        const call = stmt as CallStatement;
        this.collectFromExpression(call.expression, refs);
        break;
      }

      case 'ExitStatement': {
        const exit = stmt as ExitStatement;
        if (exit.value) {
          this.collectFromExpression(exit.value, refs);
        }
        break;
      }

      default:
        // Unknown statement type - ignore
        break;
    }
  }

  /**
   * Collect all references from a procedure
   */
  private collectFromProcedure(proc: ProcedureDeclaration, refs: SymbolReference[]): void {
    // Procedure name is a definition
    refs.push({
      name: proc.name,
      token: proc.startToken,
      isDefinition: true
    });

    // Parameters are definitions
    for (const param of proc.parameters) {
      refs.push({
        name: param.name,
        token: param.startToken,
        isDefinition: true
      });
    }

    // Local variables are definitions
    for (const variable of proc.variables) {
      refs.push({
        name: variable.name,
        token: variable.startToken,
        isDefinition: true
      });
    }

    // Body statements contain references
    // Note: proc.body may contain BlockStatement(s) or direct statements
    for (const stmt of proc.body) {
      this.collectFromStatement(stmt, refs);
    }
  }

  /**
   * Collect all references from a trigger
   */
  private collectFromTrigger(trigger: TriggerDeclaration, refs: SymbolReference[]): void {
    // Local variables are definitions
    for (const variable of trigger.variables) {
      refs.push({
        name: variable.name,
        token: variable.startToken,
        isDefinition: true
      });
    }

    // Body statements contain references
    for (const stmt of trigger.body) {
      this.collectFromStatement(stmt, refs);
    }
  }

  /**
   * Collect all symbol references from the AST
   */
  private collectAllReferences(ast: CALDocument): SymbolReference[] {
    const refs: SymbolReference[] = [];

    if (!ast.object) {
      return refs;
    }

    const obj = ast.object;

    // Fields are definitions
    if (obj.fields) {
      for (const field of obj.fields.fields) {
        refs.push({
          name: field.fieldName,
          token: field.startToken,
          isDefinition: true
        });

        // Collect from field triggers (OnValidate, OnLookup, etc.)
        if (field.triggers) {
          for (const trigger of field.triggers) {
            this.collectFromTrigger(trigger, refs);
          }
        }
      }
    }

    // Code section
    if (obj.code) {
      // Global variables are definitions
      for (const variable of obj.code.variables) {
        refs.push({
          name: variable.name,
          token: variable.startToken,
          isDefinition: true
        });
      }

      // Procedures
      for (const proc of obj.code.procedures) {
        this.collectFromProcedure(proc, refs);
      }

      // Triggers
      for (const trigger of obj.code.triggers) {
        this.collectFromTrigger(trigger, refs);
      }
    }

    return refs;
  }

  /**
   * Find all references to a symbol
   *
   * @param document - The text document
   * @param position - The cursor position
   * @param ast - The parsed AST
   * @param includeDeclaration - Whether to include the declaration in results
   * @returns Array of Locations where the symbol is referenced
   */
  public getReferences(
    document: TextDocument,
    position: Position,
    ast: CALDocument,
    includeDeclaration: boolean = true,
    debugLog?: (msg: string) => void
  ): Location[] {
    // Get the word at cursor position
    const wordInfo = this.getWordAtPosition(document, position);
    if (!wordInfo) {
      debugLog?.(`[References] No word found at position`);
      return [];
    }

    const targetName = wordInfo.word.toLowerCase();
    debugLog?.(`[References] Looking for word: "${wordInfo.word}" (normalized: "${targetName}")`);

    // Collect all references from the AST
    const allRefs = this.collectAllReferences(ast);
    debugLog?.(`[References] Total refs collected from AST: ${allRefs.length}`);
    if (allRefs.length > 0 && allRefs.length <= 20) {
      debugLog?.(`[References] Ref names: ${allRefs.map(r => r.name).join(', ')}`);
    }

    // Filter references that match the target name
    const matchingRefs = allRefs.filter(ref => {
      const matches = ref.name.toLowerCase() === targetName;
      if (!matches) return false;
      // Optionally exclude definitions
      if (!includeDeclaration && ref.isDefinition) return false;
      return true;
    });

    debugLog?.(`[References] Matching refs: ${matchingRefs.length}`);

    // Convert to locations
    return matchingRefs.map(ref => this.tokenToLocation(ref.token, document.uri));
  }
}
