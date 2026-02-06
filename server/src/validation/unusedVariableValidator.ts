/**
 * Unused Variable Validator
 *
 * Detects local variables declared but never read.
 * Includes write-only variables (assigned but never read).
 *
 * Scope:
 * - Only checks local variables in procedures, triggers, and events
 * - Does NOT check parameters (caller controls them)
 * - Does NOT check global variables (may be used across procedures)
 *
 * Read contexts:
 * - Variable in expressions (x + 5)
 * - Variable as function arguments (MESSAGE(x))
 * - Variable in conditions (IF/WHILE/REPEAT/CASE)
 * - Variable as object in member expressions (Customer.Field)
 * - Variable in EXIT statements (EXIT(x))
 * - Variable in array indices (arr[i])
 * - Self-referencing assignments (x := x + 1) - RHS is a read
 * - FOR loop control variables (implicitly read by loop)
 *
 * Write-only contexts (should warn):
 * - Plain Identifier in assignment LHS (x := 5)
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import {
  CALDocument,
  VariableDeclaration,
  ProcedureDeclaration,
  TriggerDeclaration,
  EventDeclaration,
  Statement,
  Identifier,
  MemberExpression,
  AssignmentStatement,
  ForStatement,
  WithStatement
} from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';
import { Validator, ValidationContext } from '../semantic/types';
import { Token } from '../lexer/tokens';

/**
 * Tracks information about a local variable for unused detection
 */
interface VariableInfo {
  /** Original variable name (with original casing) */
  name: string;
  /** The startToken of the VariableDeclaration (for diagnostic range) */
  token: Token;
  /** Whether the variable has been read (not just written) */
  hasRead: boolean;
}

/**
 * Top-level visitor that analyzes procedure/trigger/event scopes independently
 */
class UnusedVariableVisitor implements Partial<ASTVisitor> {
  public readonly diagnostics: Diagnostic[] = [];

  constructor(private readonly walker: ASTWalker) {}

  /**
   * Visit ProcedureDeclaration - analyze local variable usage in this scope
   * Returns false to prevent automatic traversal
   */
  visitProcedureDeclaration(node: ProcedureDeclaration): false {
    this.analyzeScope(node.variables, node.body);
    return false;
  }

  /**
   * Visit TriggerDeclaration - analyze local variable usage in this scope
   * Returns false to prevent automatic traversal
   */
  visitTriggerDeclaration(node: TriggerDeclaration): false {
    this.analyzeScope(node.variables, node.body);
    return false;
  }

  /**
   * Visit EventDeclaration - analyze local variable usage in this scope
   * Returns false to prevent automatic traversal
   */
  visitEventDeclaration(node: EventDeclaration): false {
    this.analyzeScope(node.variables, node.body);
    return false;
  }

  /**
   * Skip field declarations - not relevant for local variable analysis
   */
  visitFieldDeclaration(): false {
    return false;
  }

  /**
   * Analyze a single scope (procedure/trigger/event) for unused variables.
   *
   * @param variables - Local variable declarations in this scope
   * @param body - Statement body to analyze for variable reads
   */
  private analyzeScope(variables: VariableDeclaration[], body: Statement[]): void {
    if (variables.length === 0) {
      return; // No variables to check
    }

    // Build map: lowercase name -> VariableInfo
    const variableMap = new Map<string, VariableInfo>();
    for (const varDecl of variables) {
      const key = varDecl.name.toLowerCase();
      variableMap.set(key, {
        name: varDecl.name,      // Preserve original case for diagnostic
        token: varDecl.startToken,
        hasRead: false
      });
    }

    // Walk the body to track variable reads
    const usageVisitor = new UsageTrackingVisitor(variableMap, this.walker);
    for (const stmt of body) {
      this.walker.walk(stmt, usageVisitor);
    }

    // Report variables that were never read
    for (const info of variableMap.values()) {
      if (!info.hasRead) {
        this.addDiagnostic(info);
      }
    }
  }

  /**
   * Create diagnostic for an unused variable
   */
  private addDiagnostic(info: VariableInfo): void {
    // Calculate end position from token
    const endCharacter = info.token.column + (info.token.endOffset - info.token.startOffset) - 1;

    this.diagnostics.push({
      message: `Variable '${info.name}' is declared but never used`,
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: info.token.line - 1,       // 1-based to 0-based
          character: info.token.column - 1
        },
        end: {
          line: info.token.line - 1,
          character: endCharacter
        }
      },
      source: 'cal',
      code: 'unused-variable'
    });
  }
}

/**
 * Inner visitor that tracks variable reads within a single scope's body.
 *
 * Key behaviors:
 * - visitMemberExpression: Walk only object, skip property
 * - visitAssignmentStatement: Skip simple Identifier LHS, walk everything else
 * - visitForStatement: Mark control variable as read (implicitly)
 * - visitIdentifier: Mark variable as read if it matches
 */
class UsageTrackingVisitor implements Partial<ASTVisitor> {
  constructor(
    private readonly variables: Map<string, VariableInfo>,
    private readonly walker: ASTWalker
  ) {}

  /**
   * Visit MemberExpression - only walk the object part, skip property
   * Example: Customer.Name -> walk Customer, skip Name
   * Returns false to prevent automatic traversal
   */
  visitMemberExpression(node: MemberExpression): false {
    // Only walk the object (left side), not the property (right side)
    this.walker.walk(node.object, this);
    return false;
  }

  /**
   * Visit AssignmentStatement - handle LHS specially
   * - Plain Identifier LHS: skip it (write-only)
   * - Other LHS (MemberExpression, ArrayAccess): walk it (reads involved)
   * - Always walk RHS
   * Returns false to prevent automatic traversal
   */
  visitAssignmentStatement(node: AssignmentStatement): false {
    if (node.target.type === 'Identifier') {
      // Simple assignment (x := value) - skip LHS, walk RHS only
      this.walker.walk(node.value, this);
    } else {
      // Complex assignment (Customer.Field := value or arr[i] := value)
      // Walk both target and value (target involves reads)
      this.walker.walk(node.target, this);
      this.walker.walk(node.value, this);
    }
    return false;
  }

  /**
   * Visit ForStatement - mark control variable as read (implicitly)
   * The loop control variable is implicitly read by the loop mechanism
   * Returns false to prevent automatic traversal
   */
  visitForStatement(node: ForStatement): false {
    // Mark the control variable as read
    if (node.variable.type === 'Identifier') {
      const identifier = node.variable as Identifier;
      const info = this.variables.get(identifier.name.toLowerCase());
      if (info) {
        info.hasRead = true;
      }
    }

    // Walk from, to expressions
    this.walker.walk(node.from, this);
    this.walker.walk(node.to, this);

    // Walk body
    this.walker.walk(node.body, this);

    return false;
  }

  /**
   * Visit WithStatement - walk record expression and body
   * Returns false to prevent automatic traversal
   */
  visitWithStatement(node: WithStatement): false {
    // Mark the record variable as read
    this.walker.walk(node.record, this);
    // Walk the body to find variable usages
    this.walker.walk(node.body, this);
    return false;
  }

  /**
   * Visit Identifier - check if it matches a tracked variable and mark as read
   */
  visitIdentifier(node: Identifier): void {
    const key = node.name.toLowerCase();
    const info = this.variables.get(key);
    if (info) {
      info.hasRead = true;
    }
  }
}

/**
 * Validator that detects unused local variables.
 * Implements the Validator interface for semantic analysis pipeline.
 */
export class UnusedVariableValidator implements Validator {
  /** Validator name for logging and debugging */
  public readonly name = 'UnusedVariableValidator';

  /**
   * Validates the AST for unused local variables.
   *
   * @param context - Validation context containing AST and other analysis data
   * @returns Array of diagnostics (warnings for unused variables)
   */
  validate(context: ValidationContext): Diagnostic[] {
    const walker = new ASTWalker();
    const visitor = new UnusedVariableVisitor(walker);

    walker.walk(context.ast, visitor);

    return visitor.diagnostics;
  }
}
