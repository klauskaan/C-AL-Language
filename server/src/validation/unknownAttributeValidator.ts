/**
 * Unknown Attribute Validator
 *
 * Detects unknown procedure attributes in C/AL code.
 * Valid C/AL attributes: External, TryFunction, Integration, EventSubscriber.
 *
 * Uses Levenshtein distance to suggest corrections for typos.
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { ProcedureAttribute } from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { ASTVisitor } from '../visitor/astVisitor';
import { Validator, ValidationContext } from '../semantic/types';
import { isKnownAttribute, KNOWN_CAL_ATTRIBUTES_CASED } from './attributeData';

/**
 * AL-only attributes that should not receive suggestions
 * These are legitimate keywords in AL but not valid in C/AL
 */
const AL_ONLY_ATTRIBUTES_LOWER = [
  'internal',      // BC 19+ access modifier
  'scope',         // BC 15+ scope modifier
  'businessevent', // BC 15+ event type
  'internalevent', // BC 15+ event type (not the same as Integration)
  'integrationevent', // BC 15+ attribute
  'obsolete',      // BC 15+ deprecation
  'serviceenabled' // AL-only web service marker
];

/**
 * Compute Levenshtein distance between two strings
 * Used for suggesting similar attribute names
 */
function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  // Create distance matrix
  const dp: number[][] = Array(aLen + 1).fill(null).map(() => Array(bLen + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= aLen; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= bLen; j++) {
    dp[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[aLen][bLen];
}

/**
 * Visitor that collects diagnostics for unknown procedure attributes
 */
class UnknownAttributeValidatorVisitor implements Partial<ASTVisitor> {
  public readonly diagnostics: Diagnostic[] = [];

  /**
   * Visit a ProcedureAttribute node - check if it's a known C/AL attribute
   */
  visitProcedureAttribute(node: ProcedureAttribute): void | false {
    const attributeName = node.name;

    // Check if this is a valid C/AL attribute (case-insensitive)
    if (isKnownAttribute(attributeName)) {
      return; // Valid attribute, no diagnostic
    }

    // Check if this is an AL-only attribute (don't suggest alternatives)
    const attributeNameLower = attributeName.toLowerCase();
    const isALOnly = AL_ONLY_ATTRIBUTES_LOWER.includes(attributeNameLower);

    // Generate diagnostic message
    let message: string;

    if (isALOnly) {
      // AL-only attribute - no suggestion
      message = `Unknown attribute '[${attributeName}]'`;
    } else {
      // Unknown attribute - find best suggestion using Levenshtein distance
      let bestMatch: string | undefined;
      let bestDistance = Infinity;

      for (const validAttr of KNOWN_CAL_ATTRIBUTES_CASED) {
        const distance = levenshteinDistance(attributeName, validAttr);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = validAttr;
        }
      }

      if (bestDistance <= 2) {
        // Close match found - suggest it
        message = `Unknown attribute '[${attributeName}]'. Did you mean '${bestMatch}'?`;
      } else {
        // No close match - just report as unknown
        message = `Unknown attribute '[${attributeName}]'`;
      }
    }

    // Report diagnostic
    this.diagnostics.push({
      message,
      severity: DiagnosticSeverity.Warning,
      range: {
        start: {
          line: node.startToken.line - 1,      // 1-based to 0-based
          character: node.startToken.column - 1
        },
        end: {
          line: node.endToken.line - 1,
          character: node.endToken.column + (node.endToken.endOffset - node.endToken.startOffset) - 1
        }
      },
      source: 'cal'
    });
  }
}

/**
 * Validator that detects unknown procedure attributes.
 * Implements the Validator interface for semantic analysis pipeline.
 */
export class UnknownAttributeValidator implements Validator {
  /** Validator name for logging and debugging */
  public readonly name = 'UnknownAttributeValidator';

  /**
   * Validates the AST for unknown procedure attributes.
   *
   * @param context - Validation context containing AST and settings
   * @returns Array of diagnostics (warnings for unknown attributes)
   */
  validate(context: ValidationContext): Diagnostic[] {
    // Early return if warnUnknownAttributes is disabled
    if (context.settings?.diagnostics?.warnUnknownAttributes === false) {
      return [];
    }

    const visitor = new UnknownAttributeValidatorVisitor();
    const walker = new ASTWalker();

    walker.walk(context.ast, visitor);

    return visitor.diagnostics;
  }
}
