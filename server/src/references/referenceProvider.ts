/**
 * Find All References provider for C/AL language server
 * Provides navigation to all usages of a symbol (Shift+F12)
 */

import {
  Location,
  Position
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CALDocument,
  Identifier,
  ProcedureDeclaration,
  VariableDeclaration,
  ParameterDeclaration,
  FieldDeclaration
} from '../parser/ast';
import { Token, TokenType } from '../lexer/tokens';
import { ProviderBase } from '../providers/providerBase';
import { ASTVisitor } from '../visitor/astVisitor';
import { ASTWalker } from '../visitor/astWalker';

/**
 * Represents a reference to a symbol
 */
interface SymbolReference {
  name: string;
  token: Token;
  isDefinition: boolean;
  nameLength?: number;  // Actual length of the name (for multi-token or quoted identifiers)
}

/**
 * Visitor that collects all symbol references from the AST.
 *
 * This visitor implements the ASTVisitor pattern to collect:
 * - Variable definitions and usages
 * - Procedure definitions and calls
 * - Parameter definitions and usages
 * - Field definitions and usages
 *
 * The walker handles all traversal logic, while this visitor focuses
 * solely on collecting references.
 */
class ReferenceCollectorVisitor implements Partial<ASTVisitor> {
  /** Collected symbol references */
  public readonly refs: SymbolReference[] = [];

  /**
   * Visit an Identifier node - collect as a reference (not definition)
   */
  visitIdentifier(node: Identifier): void {
    // Calculate the actual name length for highlighting
    // For quoted identifiers, include the quotes in the range
    const nameLength = node.isQuoted
      ? node.name.length + 2  // +2 for quotes
      : node.name.length;

    this.refs.push({
      name: node.name,
      token: node.startToken,
      isDefinition: false,
      nameLength
    });
  }

  // Note: MemberExpression and ForStatement don't need explicit visitor methods.
  // The walker visits all children automatically:
  // - MemberExpression.property (Identifier) is collected by visitIdentifier
  // - ForStatement.variable (Identifier or MemberExpression) is collected by visitIdentifier

  /**
   * Visit a VariableDeclaration node - collect as a definition
   */
  visitVariableDeclaration(node: VariableDeclaration): void {
    this.refs.push({
      name: node.name,
      token: node.startToken,
      isDefinition: true
    });
  }

  /**
   * Visit a ParameterDeclaration node - collect as a definition
   */
  visitParameterDeclaration(node: ParameterDeclaration): void {
    this.refs.push({
      name: node.name,
      token: node.startToken,
      isDefinition: true
    });
  }

  /**
   * Visit a ProcedureDeclaration node - collect the procedure name as a definition
   */
  visitProcedureDeclaration(node: ProcedureDeclaration): void {
    this.refs.push({
      name: node.name,
      token: node.nameToken ?? node.startToken,
      isDefinition: true
    });
  }

  // Note: TriggerDeclaration doesn't need an explicit visitor method.
  // Triggers don't add a name reference themselves.
  // Their local variables are visited by the walker and collected by visitVariableDeclaration.

  /**
   * Visit a FieldDeclaration node - collect as a definition
   */
  visitFieldDeclaration(node: FieldDeclaration): void {
    // Skip if no nameToken (error recovery case)
    if (!node.nameToken) return;

    // Calculate the actual name length for highlighting
    const nameLength = node.nameToken.type === TokenType.QuotedIdentifier
      ? node.nameToken.value.length + 2  // +2 for quotes
      : node.fieldName.length;            // Full multi-token name

    this.refs.push({
      name: node.fieldName,
      token: node.nameToken,
      isDefinition: true,
      nameLength
    });
  }
}

/**
 * Reference provider class
 * Handles "Find All References" requests for C/AL symbols
 * Extends ProviderBase for shared provider functionality
 */
export class ReferenceProvider extends ProviderBase {
  /** Shared ASTWalker instance (stateless, can be reused) */
  private readonly walker = new ASTWalker();

  /**
   * Get the word at the cursor position
   * Handles both regular identifiers and quoted identifiers (e.g., "No.")
   * Overrides base class to add quoted identifier support for C/AL
   *
   * @param document - The text document
   * @param position - The cursor position
   * @returns Object with word, start, and end offsets, or null if not on identifier
   */
  protected override getWordAtPosition(document: TextDocument, position: Position): { word: string; start: number; end: number } | null {
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

    // Fall back to base class implementation for regular identifiers
    return super.getWordAtPosition(document, position);
  }


  /**
   * Collect all symbol references from the AST using the visitor pattern.
   *
   * Uses ReferenceCollectorVisitor with ASTWalker to traverse the AST
   * and collect all symbol definitions and usages.
   */
  private collectAllReferences(ast: CALDocument): SymbolReference[] {
    const visitor = new ReferenceCollectorVisitor();
    this.walker.walk(ast, visitor);
    return visitor.refs;
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
    return matchingRefs.map(ref => this.tokenToLocation(ref.token, document.uri, ref.nameLength));
  }
}
