/**
 * RenameProvider for C/AL language server
 * Handles rename preparation and execution
 */

import { ProviderBase } from '../providers/providerBase';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range, WorkspaceEdit, TextEdit } from 'vscode-languageserver';
import { CALDocument } from '../parser/ast';
import { SymbolTable } from '../symbols/symbolTable';
import { Lexer } from '../lexer/lexer';
import { Token, TokenType, KEYWORDS } from '../lexer/tokens';
import { ReferenceProvider } from '../references/referenceProvider';

/**
 * Provider for rename operations (F2)
 * Extends ProviderBase to reuse common text scanning utilities
 */
export class RenameProvider extends ProviderBase {
  /**
   * Validate if rename is possible at the given position.
   * Returns the range of the symbol to rename and a placeholder text,
   * or null if rename is not possible at this position.
   *
   * @param document - The text document
   * @param position - The cursor position
   * @param ast - The parsed AST (optional)
   * @param symbolTable - The symbol table (optional)
   * @returns Object with range and placeholder, or null if rename not possible
   */
  public prepareRename(
    document: TextDocument,
    position: Position,
    ast: CALDocument | undefined,
    symbolTable: SymbolTable | undefined
  ): { range: Range; placeholder: string } | null {
    // Find the actual token at this position to check its type
    const token = this.getTokenAtPosition(document, position);
    if (!token) {
      return null;
    }

    // Only Identifier and QuotedIdentifier tokens can be renamed
    if (!this.isRenameableToken(token)) {
      return null;
    }

    // Optionally validate against AST/symbol table
    if (symbolTable) {
      // token.value already has quotes stripped by the lexer for QuotedIdentifier tokens
      const identifierName = token.value;

      // Verify the symbol exists in the symbol table
      const symbol = symbolTable.getSymbolAtOffset(identifierName, token.startOffset);
      if (!symbol) {
        // Not a known symbol, might be a type annotation or keyword
        return null;
      }
    }

    // Get the identifier text and range
    return this.getIdentifierRangeAndText(document, token);
  }

  /**
   * Perform the rename operation.
   * Returns a WorkspaceEdit containing all text changes.
   *
   * @param document - The text document
   * @param position - The cursor position
   * @param newName - The new name for the symbol
   * @param ast - The parsed AST (optional)
   * @param symbolTable - The symbol table (optional)
   * @returns WorkspaceEdit with text changes, or null if operation fails
   */
  public getRenameEdits(
    document: TextDocument,
    position: Position,
    newName: string,
    ast: CALDocument | undefined,
    symbolTable: SymbolTable | undefined
  ): WorkspaceEdit | null {
    // Find the token at the cursor position
    const token = this.getTokenAtPosition(document, position);
    if (!token || !this.isRenameableToken(token)) {
      return null;
    }

    // Validate the new name
    const symbolType = this.getSymbolType(token, symbolTable, document.offsetAt(position));
    const validationError = this.validateNewName(newName, symbolType);
    if (validationError) {
      throw new Error(validationError);
    }

    // Get all references using ReferenceProvider
    if (!ast) {
      return null;
    }

    const referenceProvider = new ReferenceProvider();
    const references = referenceProvider.getReferences(document, position, ast, true);

    if (references.length === 0) {
      return null;
    }

    // Filter references to only include those in the correct scope
    const filteredReferences = this.filterReferencesByScope(
      references,
      token,
      symbolTable,
      document
    );

    // Determine if the new name needs quotes
    const needsQuotes = this.needsQuotes(newName);

    // Generate TextEdits for each reference
    const edits: TextEdit[] = filteredReferences.map(location => {
      // Determine the replacement text based on quote logic
      const replacementText = this.getReplacementText(newName, needsQuotes);

      return TextEdit.replace(location.range, replacementText);
    });

    // Create and return WorkspaceEdit
    return {
      changes: {
        [document.uri]: edits
      }
    };
  }

  /**
   * Find the token at the given position by tokenizing the document.
   * Returns the token that contains the cursor position.
   *
   * @param document - The text document
   * @param position - The cursor position
   * @returns The token at the position, or undefined if not found
   */
  private getTokenAtPosition(document: TextDocument, position: Position): Token | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Tokenize the document
    const lexer = new Lexer(text);
    const tokens = lexer.tokenize();

    // Find the token that contains the cursor position
    // Note: endOffset is inclusive (the last character of the token)
    for (const token of tokens) {
      // Skip whitespace and comment tokens
      if (token.type === TokenType.Whitespace ||
          token.type === TokenType.NewLine ||
          token.type === TokenType.Comment) {
        continue;
      }

      // Check if cursor is within this token's range
      // For quoted identifiers, the cursor can be anywhere within the quotes
      if (token.startOffset <= offset && offset < token.endOffset) {
        return token;
      }
    }

    return undefined;
  }

  /**
   * Check if a token is renameable (Identifier or QuotedIdentifier, but not a keyword).
   *
   * @param token - The token to check
   * @returns True if the token can be renamed
   */
  private isRenameableToken(token: Token): boolean {
    // Must be an identifier or quoted identifier
    if (token.type !== TokenType.Identifier && token.type !== TokenType.QuotedIdentifier) {
      return false;
    }

    // Check if it's a keyword (keywords cannot be renamed)
    if (KEYWORDS.has(token.value.toLowerCase())) {
      return false;
    }

    return true;
  }

  /**
   * Get the identifier range and text from a token.
   * For QuotedIdentifier tokens, the token's startOffset/endOffset include the quotes,
   * but token.value already has quotes stripped by the lexer.
   *
   * @param document - The text document
   * @param token - The identifier token
   * @returns Object with range (including quotes for QuotedIdentifier) and placeholder (without quotes)
   */
  private getIdentifierRangeAndText(document: TextDocument, token: Token): { range: Range; placeholder: string } {
    // Calculate range from token offsets
    // Note: For QuotedIdentifier, startOffset points to the opening quote
    //       and endOffset points after the closing quote, so the range includes quotes
    const start = document.positionAt(token.startOffset);
    const end = document.positionAt(token.endOffset);
    const range: Range = { start, end };

    // token.value already has quotes stripped by the lexer for QuotedIdentifier tokens
    const placeholder = token.value;

    return { range, placeholder };
  }

  /**
   * Validate the new name according to C/AL identifier rules.
   * Returns error message if invalid, or null if valid.
   *
   * @param newName - The proposed new name
   * @param symbolType - The type of symbol being renamed
   * @returns Error message if invalid, null if valid
   */
  private validateNewName(newName: string, symbolType: string): string | null {
    // Empty/whitespace
    if (!newName || !newName.trim()) {
      return 'Name cannot be empty';
    }

    // Reserved keywords (case-insensitive)
    if (KEYWORDS.has(newName.toLowerCase())) {
      return `Cannot rename to '${newName}' - reserved keyword`;
    }

    // Starts with number
    if (/^\d/.test(newName)) {
      return 'Name cannot start with a number';
    }

    // Contains invalid characters (double-quote and other special chars)
    // Valid characters: alphanumeric, underscore, space, period, dash, apostrophe
    // But double-quote and special chars like $, @, <, > are invalid inside an identifier
    if (/["$<>@#%&*(){}[\]\\|;:,?]/.test(newName)) {
      return 'Name contains invalid characters';
    }

    // Length limits
    const maxLength = symbolType === 'procedure' ? 128 : 30;
    if (newName.length > maxLength) {
      return `Name is too long (maximum ${maxLength} characters for ${symbolType})`;
    }

    return null; // Valid
  }

  /**
   * Check if a name needs to be quoted.
   * Names with spaces or special characters (except underscore) need quotes.
   *
   * @param name - The identifier name
   * @returns True if the name needs quotes
   */
  private needsQuotes(name: string): boolean {
    // Check if name contains anything other than alphanumeric and underscore
    return /[^a-zA-Z0-9_]/.test(name);
  }

  /**
   * Determine the symbol type for validation purposes.
   *
   * @param token - The token being renamed
   * @param symbolTable - The symbol table
   * @param offset - Document offset
   * @returns Symbol type string
   */
  private getSymbolType(token: Token, symbolTable: SymbolTable | undefined, offset: number): string {
    if (!symbolTable) {
      return 'variable'; // Default to variable if no symbol table
    }

    const symbol = symbolTable.getSymbolAtOffset(token.value, offset);
    if (!symbol) {
      return 'variable'; // Default
    }

    switch (symbol.kind) {
      case 'procedure':
      case 'function':
        return 'procedure';
      case 'parameter':
        return 'parameter';
      case 'field':
        return 'field';
      case 'variable':
      default:
        return 'variable';
    }
  }

  /**
   * Filter references to only include those in the correct scope.
   * This implements scope-aware renaming where local variables don't affect globals.
   *
   * @param references - All references found by ReferenceProvider
   * @param originToken - The token at the cursor position
   * @param symbolTable - The symbol table
   * @param document - The text document
   * @returns Filtered array of references
   */
  private filterReferencesByScope(
    references: { uri: string; range: Range }[],
    originToken: Token,
    symbolTable: SymbolTable | undefined,
    document: TextDocument
  ): { uri: string; range: Range }[] {
    if (!symbolTable) {
      // Without symbol table, return all references (no scope filtering)
      return references;
    }

    // Get the symbol at the origin position
    const originOffset = originToken.startOffset;
    const originSymbol = symbolTable.getSymbolAtOffset(originToken.value, originOffset);

    if (!originSymbol) {
      // If we can't find the origin symbol, return all references
      return references;
    }

    // Filter references to only those that resolve to the same symbol definition
    return references.filter(ref => {
      // Get the actual token at the reference position to get the correct offset
      const refToken = this.getTokenAtPosition(document, ref.range.start);
      if (!refToken) {
        return false;
      }

      // Use the token's startOffset for symbol resolution
      const refSymbol = symbolTable.getSymbolAtOffset(refToken.value, refToken.startOffset);

      // Check if this reference resolves to the same symbol as the origin
      // We compare by token offset since each symbol has a unique definition location
      return refSymbol && refSymbol.token.startOffset === originSymbol.token.startOffset;
    });
  }

  /**
   * Get the replacement text for a reference, handling quote logic.
   *
   * @param newName - The new name (without quotes)
   * @param needsQuotes - Whether the new name needs quotes
   * @returns The replacement text with appropriate quoting
   */
  private getReplacementText(newName: string, needsQuotes: boolean): string {
    if (needsQuotes) {
      // New name needs quotes
      return `"${newName}"`;
    } else {
      // New name doesn't need quotes
      return newName;
    }
  }
}
