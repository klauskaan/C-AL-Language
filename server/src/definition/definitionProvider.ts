/**
 * Go to Definition provider for C/AL language server
 * Provides navigation to symbol definitions (F12)
 */

import {
  Location,
  Position,
  Range
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolTable, Symbol } from '../symbols/symbolTable';
import { CALDocument } from '../parser/ast';

/** Regex pattern for valid C/AL identifier characters */
const IDENTIFIER_PATTERN = /[a-zA-Z0-9_]/;

/**
 * Definition provider class
 * Handles "Go to Definition" requests for C/AL symbols
 */
export class DefinitionProvider {
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
   */
  private getWordAtPosition(document: TextDocument, position: Position): { word: string; start: number; end: number } | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Check if we're in an identifier
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
   * Check if we're after a dot (for field access)
   */
  private isAfterDot(document: TextDocument, position: Position): boolean {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Skip backwards over identifier to find dot
    let i = this.scanBackward(text, offset - 1, c => IDENTIFIER_PATTERN.test(c)) - 1;
    // Skip whitespace
    while (i >= 0 && /\s/.test(text[i])) {
      i--;
    }
    return i >= 0 && text[i] === '.';
  }

  /**
   * Convert a symbol's token position to an LSP Location
   */
  private symbolToLocation(symbol: Symbol, documentUri: string): Location {
    const token = symbol.token;

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

    // Look up symbol in symbol table
    if (symbolTable) {
      const symbol = symbolTable.getSymbol(word);
      if (symbol) {
        return this.symbolToLocation(symbol, document.uri);
      }
    }

    // Not found
    return null;
  }
}
