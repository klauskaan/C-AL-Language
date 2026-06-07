/**
 * Advisory Builtin Validator
 *
 * Detects calls to builtins that are no-ops or always-constant on the NAV 2013+ service tier.
 * Currently seeded with ISSERVICETIER (always TRUE on NAV 2013+; the classic client is gone).
 *
 * WHY CONTROLLED TRAVERSAL (not a simple visitIdentifier-only pass):
 *
 * Two separate concerns require explicit traversal control:
 *
 * 1. Bare vs. SYSTEM. form shadowing distinction:
 *    - Bare `ISSERVICETIER` may be shadowed by a user variable or procedure — in that case
 *      the name resolves to the user symbol, NOT the builtin, and must NOT be flagged.
 *    - `SYSTEM.ISSERVICETIER` always reaches the builtin regardless of any user shadow
 *      (the SYSTEM. qualifier bypasses resolution). It must ALWAYS be flagged.
 *    A pure visitIdentifier-only approach cannot distinguish these two cases because by the
 *    time visitIdentifier fires on the property of a MemberExpression, context is lost.
 *
 * 2. Double-counting hazard:
 *    When `ISSERVICETIER()` appears, the AST is CallExpression(callee=Identifier).
 *    If we visit both the CallExpression and the Identifier naively, we'd emit twice.
 *    visitCallExpression must delegate to its callee node so only one diagnostic fires.
 *
 * For the same reason, visitMemberExpression must NOT re-walk node.property in any branch —
 * in the SYSTEM.<advisory> branch, re-walking would double-count; in all other branches,
 * routing the member name through visitIdentifier would false-positive on a receiver field
 * or method that happens to share a name with an advisory builtin (e.g. Rec.ISSERVICETIER).
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { Identifier, MemberExpression, CallExpression } from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';
import { Validator, ValidationContext } from '../semantic/types';
import { BuiltinRegistry } from '../builtins/builtinRegistry';
import { SymbolTable } from '../symbols/symbolTable';

/**
 * Visitor that collects INFORMATION-level diagnostics for advisory builtin calls.
 *
 * Traversal is controlled manually to handle:
 * - SYSTEM.<name>: always advisory (no shadow guard), property not re-walked (would double-count)
 * - Bare <name>: advisory only when not shadowed by a user symbol
 * - CallExpression: delegates decision to callee node (avoids double-count with visitIdentifier)
 */
class AdvisoryBuiltinValidatorVisitor implements Partial<ASTVisitor> {
  public readonly diagnostics: Diagnostic[] = [];

  constructor(
    private readonly walker: ASTWalker,
    private readonly registry: BuiltinRegistry,
    private readonly symbolTable: SymbolTable
  ) {}

  /**
   * Visit MemberExpression.
   *
   * If this is SYSTEM.<advisoryName>, emit the advisory on node.property UNCONDITIONALLY
   * (SYSTEM. qualifier reaches the builtin past any user shadow — per #809/#813).
   * Then manually walk node.object (to catch any advisories on the object side) but
   * DO NOT walk node.property — it has already been handled here, and re-walking it
   * would route it through visitIdentifier and produce a duplicate diagnostic.
   *
   * If this is NOT a SYSTEM.<advisoryName> member expression, walk only node.object
   * (never node.property — member names are not bare global builtin references).
   *
   * Returns false in all cases to prevent the walker's automatic child traversal.
   */
  visitMemberExpression(node: MemberExpression): false {
    if (
      node.object.type === 'Identifier' &&
      (node.object as Identifier).name.toUpperCase() === 'SYSTEM'
    ) {
      const advisory = this.registry.getGlobalFunctionAdvisory(node.property.name);
      if (advisory !== undefined) {
        // SYSTEM. form always reaches the builtin — no shadow guard needed.
        // Emit on node.property (the advisory function name).
        this.emitAdvisory(node.property, advisory);
        // Walk node.object in case it contains nested advisory sites (it won't here, but
        // this mirrors undefinedIdentifierValidator.ts:119-130 which always walks the object side).
        this.walker.walk(node.object, this);
        // DO NOT walk node.property — it was handled above; re-walking → double diagnostic.
        return false;
      }
    }

    // Walk only the object side. node.property is a member name on the receiver,
    // never a bare global builtin — only SYSTEM.<advisory> properties are flagged
    // (handled above). Routing the property through visitIdentifier here would
    // false-positive on a member named like an advisory builtin (e.g. Rec.ISSERVICETIER).
    this.walker.walk(node.object, this);
    return false;
  }

  /**
   * Visit CallExpression.
   *
   * Manually walks the callee and all arguments, then returns false.
   * The advisory decision is delegated to the callee node:
   * - bare callee (Identifier)   → visitIdentifier fires
   * - SYSTEM. callee (MemberExpression) → visitMemberExpression fires
   *
   * This ensures exactly one diagnostic per call site (no double-count).
   */
  visitCallExpression(node: CallExpression): false {
    this.walker.walk(node.callee, this);
    for (const arg of node.arguments) {
      this.walker.walk(arg, this);
    }
    return false;
  }

  /**
   * Visit Identifier.
   *
   * Emits an advisory if the name resolves to an advisory builtin AND is not
   * shadowed by a user symbol. Position-aware symbol resolution
   * (getSymbolAtOffset) is used so shadows declared as procedure-local variables
   * or parameters are detected, not only root-scope globals (#815). Mirrors
   * deprecatedFunctionValidator's isActualBuiltin guard.
   *
   * Note: This only catches bare references; SYSTEM.<name> is handled in
   * visitMemberExpression and must NOT reach here (the walker is told not to
   * re-walk the property in that path). The shadow guard is position-aware: a
   * builtin name shadowed in any enclosing scope (procedure local/param or root
   * global) resolves to the user symbol and is not flagged.
   */
  visitIdentifier(node: Identifier): void {
    const advisory = this.registry.getGlobalFunctionAdvisory(node.name);
    if (advisory === undefined) {
      return;
    }

    // Check whether a user symbol shadows the builtin at this position. Uses
    // position-aware resolution (getSymbolAtOffset) so a shadow declared as a
    // procedure-local variable or parameter is found, not just a root-scope global
    // (#815). getScopeAtOffset descends to the innermost scope containing the
    // reference; scope.getSymbol then walks up to root, so root globals still match.
    if (this.symbolTable.getSymbolAtOffset(node.name, node.startToken.startOffset) !== undefined) {
      return;
    }

    this.emitAdvisory(node, advisory);
  }

  /**
   * Emit an INFORMATION diagnostic for an advisory builtin reference.
   * Range math identical to deprecatedFunctionValidator (token line/col → 0-based).
   */
  private emitAdvisory(node: Identifier, advisory: string): void {
    this.diagnostics.push({
      message: advisory,
      severity: DiagnosticSeverity.Information,
      range: {
        start: {
          line: node.startToken.line - 1,       // 1-based → 0-based
          character: node.startToken.column - 1
        },
        end: {
          line: node.endToken.line - 1,
          character: node.endToken.column + (node.endToken.endOffset - node.endToken.startOffset) - 1
        }
      },
      source: 'cal',
      code: 'advisory-builtin'
      // No tags — advisory is not deprecated/unnecessary
    });
  }
}

/**
 * Validator that detects no-op-on-RTC builtin calls and emits INFORMATION diagnostics.
 * Implements the Validator interface for the semantic analysis pipeline.
 *
 * Currently seeded with ISSERVICETIER (always returns TRUE on NAV 2013+).
 */
export class AdvisoryBuiltinValidator implements Validator {
  /** Validator name for logging and debugging */
  public readonly name = 'AdvisoryBuiltinValidator';

  /**
   * Validates the AST for advisory builtin calls.
   *
   * @param context - Validation context containing AST and builtin registry
   * @returns Array of INFORMATION diagnostics (empty if warnAdvisory is false)
   */
  validate(context: ValidationContext): Diagnostic[] {
    // Respect the warnAdvisory setting — explicit false disables the validator
    if (context.settings?.diagnostics?.warnAdvisory === false) {
      return [];
    }

    const walker = new ASTWalker();
    const visitor = new AdvisoryBuiltinValidatorVisitor(walker, context.builtins, context.symbolTable);

    walker.walk(context.ast, visitor);

    return visitor.diagnostics;
  }
}
