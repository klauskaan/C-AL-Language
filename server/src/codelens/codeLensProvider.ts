/**
 * CodeLens provider for C/AL language server
 * Displays reference counts above procedures, triggers, variables, parameters, and fields
 */

import { CodeLens, Position, Range, Command } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CALDocument,
  ProcedureDeclaration,
  TriggerDeclaration,
  VariableDeclaration,
  ParameterDeclaration,
  FieldDeclaration
} from '../parser/ast';
import { ProviderBase } from '../providers/providerBase';
import { ReferenceProvider } from '../references/referenceProvider';
import { ASTVisitor } from '../visitor/astVisitor';
import { ASTWalker } from '../visitor/astWalker';

/**
 * Represents a target for CodeLens display
 */
interface CodeLensTarget {
  name: string;
  kind: 'procedure' | 'trigger' | 'variable' | 'parameter' | 'field';
  line: number;      // 1-based from token
  column: number;    // 1-based from token
}

/**
 * Visitor that collects all declaration nodes for CodeLens display
 */
class CodeLensCollectorVisitor implements Partial<ASTVisitor> {
  public readonly targets: CodeLensTarget[] = [];

  /**
   * Visit a ProcedureDeclaration node - collect as CodeLens target
   */
  visitProcedureDeclaration(node: ProcedureDeclaration): void | false {
    this.targets.push({
      name: node.name,
      kind: 'procedure',
      line: node.startToken.line,
      column: node.startToken.column
    });
  }

  /**
   * Visit a TriggerDeclaration node - collect as CodeLens target
   */
  visitTriggerDeclaration(node: TriggerDeclaration): void | false {
    this.targets.push({
      name: node.name,
      kind: 'trigger',
      line: node.startToken.line,
      column: node.startToken.column
    });
  }

  /**
   * Visit a VariableDeclaration node - collect as CodeLens target
   */
  visitVariableDeclaration(node: VariableDeclaration): void | false {
    this.targets.push({
      name: node.name,
      kind: 'variable',
      line: node.startToken.line,
      column: node.startToken.column
    });
  }

  /**
   * Visit a ParameterDeclaration node - collect as CodeLens target
   */
  visitParameterDeclaration(node: ParameterDeclaration): void | false {
    this.targets.push({
      name: node.name,
      kind: 'parameter',
      line: node.startToken.line,
      column: node.startToken.column
    });
  }

  /**
   * Visit a FieldDeclaration node - collect as CodeLens target
   * Note: FieldDeclaration uses 'fieldName' property instead of 'name'
   */
  visitFieldDeclaration(node: FieldDeclaration): void | false {
    this.targets.push({
      name: node.fieldName,
      kind: 'field',
      line: node.startToken.line,
      column: node.startToken.column
    });
  }
}

/**
 * CodeLens provider class
 * Handles CodeLens requests for C/AL symbols
 * Extends ProviderBase for shared provider functionality
 */
export class CodeLensProvider extends ProviderBase {
  /** Shared ASTWalker instance (stateless, can be reused) */
  private readonly walker = new ASTWalker();

  /** Reference provider for counting symbol references */
  private readonly referenceProvider = new ReferenceProvider();

  /**
   * Get CodeLens items for a document
   *
   * @param document - The text document
   * @param ast - The parsed AST
   * @returns Array of CodeLens items
   */
  public getCodeLenses(document: TextDocument, ast: CALDocument): CodeLens[] {
    // Collect all declaration targets
    const visitor = new CodeLensCollectorVisitor();
    this.walker.walk(ast, visitor);

    const codeLenses: CodeLens[] = [];

    for (const target of visitor.targets) {
      // Calculate range (LSP uses 0-based positions, tokens are 1-based)
      const lensLine = target.line - 1;
      const lensRange: Range = {
        start: { line: lensLine, character: 0 },
        end: { line: lensLine, character: 0 }
      };

      // Calculate symbol position for reference lookup
      // Use the token's column position directly (1-based -> 0-based)
      // The token points to the start of the keyword (PROCEDURE/VAR/etc.)
      // but we need the position of the NAME, which comes after
      // For now, we'll search for the name in the line to find its exact position

      const lineText = document.getText({
        start: { line: lensLine, character: 0 },
        end: { line: lensLine + 1, character: 0 }
      }).trimEnd(); // Remove trailing newline

      // Find the symbol name in the line text
      // Use a more robust search that accounts for:
      // 1. Names appearing after keywords (PROCEDURE/VAR/etc.)
      // 2. @ numbers in the source (e.g., TestProc@1)
      // 3. Quoted identifiers (e.g., "No.")
      const escapedName = target.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Try to match both quoted and unquoted versions
      const namePattern = new RegExp(
        `(?:"${escapedName}"|\\b${escapedName}\\b)(@\\d+)?`
      );
      const match = lineText.match(namePattern);

      if (!match || match.index === undefined) {
        // If we can't find the name, skip this target
        continue;
      }

      // Calculate the character position pointing to the middle of the name
      // We point to the middle to ensure the reference provider can find the symbol
      // even if the cursor is slightly off from the exact start position
      const matchedText = match[0];
      const isQuoted = matchedText.startsWith('"');
      const nameStartOffset = isQuoted ? 1 : 0; // Skip opening quote if present

      const symbolPosition: Position = {
        line: lensLine,
        character: match.index + nameStartOffset + Math.floor(target.name.length / 2)
      };

      // Count references (exclude declaration itself)
      const references = this.referenceProvider.getReferences(
        document,
        symbolPosition,
        ast,
        false  // Don't include declaration in count
      );

      const refCount = references.length;
      const refText = refCount === 1 ? 'reference' : 'references';

      // Create command that opens references panel when clicked
      const command: Command = {
        title: `${refCount} ${refText}`,
        command: 'editor.action.showReferences',
        arguments: [document.uri, symbolPosition, references]
      };

      codeLenses.push({ range: lensRange, command });
    }

    return codeLenses;
  }
}
