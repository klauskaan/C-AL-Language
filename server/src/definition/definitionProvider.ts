/**
 * Go to Definition provider for C/AL language server
 * Provides navigation to symbol definitions (F12)
 */

import {
  Location,
  Position
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolTable, Symbol } from '../symbols/symbolTable';
import { CALDocument } from '../parser/ast';
import { ProviderBase } from '../providers/providerBase';

/**
 * Definition provider class
 * Handles "Go to Definition" requests for C/AL symbols
 */
export class DefinitionProvider extends ProviderBase {
  /**
   * Convert a symbol's token position to an LSP Location
   */
  private symbolToLocation(symbol: Symbol, documentUri: string): Location {
    return this.tokenToLocation(symbol.token, documentUri);
  }

  /**
   * Get definition location for a position in the document
   *
   * @param document - The text document
   * @param position - The cursor position
   * @param ast - The parsed AST (optional)
   * @param symbolTable - The symbol table with definitions
   * @returns Location of the definition, or null if not found
   */
  public getDefinition(
    document: TextDocument,
    position: Position,
    ast?: CALDocument,
    symbolTable?: SymbolTable
  ): Location | null {
    // Get the word at cursor position
    const wordInfo = this.getWordAtPosition(document, position);
    if (!wordInfo) {
      return null;
    }

    const word = wordInfo.word;

    // Check if we're after a dot (field access like "Rec.Name")
    if (this.isAfterDot(document, position)) {
      // For field access, try to find the field in the AST
      if (ast?.object?.fields) {
        const field = ast.object.fields.fields.find(
          f => f.fieldName.toLowerCase() === word.toLowerCase()
        );
        if (field && field.startToken) {
          return this.symbolToLocation(
            {
              name: field.fieldName,
              kind: 'field',
              token: field.startToken,
              type: field.dataType.typeName
            },
            document.uri
          );
        }
      }
    }

    // Look up symbol in symbol table using position-aware scope lookup
    // This ensures proper resolution when variables are shadowed in nested scopes
    if (symbolTable) {
      const symbol = symbolTable.getSymbolAtOffset(word, wordInfo.start);
      if (symbol) {
        return this.symbolToLocation(symbol, document.uri);
      }
    }

    // Not found
    return null;
  }
}