/**
 * RenameProvider for C/AL language server
 * Handles rename preparation and execution
 */

import { ProviderBase } from '../providers/providerBase';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range, WorkspaceEdit, TextEdit } from 'vscode-languageserver';
import { CALDocument, CallExpression, FieldDeclaration, MemberExpression, ProcedureDeclaration } from '../parser/ast';
import { ASTWalker } from '../visitor/astWalker';
import { SymbolTable } from '../symbols/symbolTable';
import { Lexer } from '../lexer/lexer';
import { Token, TokenType, KEYWORDS } from '../lexer/tokens';
import { ReferenceProvider } from '../references/referenceProvider';
import { findTokenAtOffset } from '../shared/tokenSearch';

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
   * @param tokens - Pre-tokenized tokens (optional, for reuse)
   * @returns Object with range and placeholder, or null if rename not possible
   */
  public prepareRename(
    document: TextDocument,
    position: Position,
    ast: CALDocument | undefined,
    symbolTable: SymbolTable | undefined,
    tokens?: readonly Token[]
  ): { range: Range; placeholder: string } | null {
    const offset = document.offsetAt(position);

    // Check if we're on a multi-token field (cursor might be on a token or between tokens)
    if (ast) {
      const field = this.findFieldByPartialToken(ast, offset);
      if (field) {
        // Use field's full range instead of single token
        return this.getFieldIdentifierRangeAndText(document, field);
      }
    }

    // Not a multi-token field, get token at position for regular identifier
    const text = document.getText();
    const resolvedTokens = tokens ?? new Lexer(text).tokenize();
    const token = findTokenAtOffset(resolvedTokens, offset);
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

    // #797: refuse renaming a member-property that resolves member-blind to a shadowing local/parameter.
    if (this.refusesMemberPropertyRename(ast, symbolTable, token)) {
      return null;
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
   * @param tokens - Pre-tokenized tokens (optional, for reuse)
   * @returns WorkspaceEdit with text changes, or null if operation fails
   */
  public getRenameEdits(
    document: TextDocument,
    position: Position,
    newName: string,
    ast: CALDocument | undefined,
    symbolTable: SymbolTable | undefined,
    tokens?: readonly Token[]
  ): WorkspaceEdit | null {
    // Get all references using ReferenceProvider
    if (!ast) {
      return null;
    }

    // Check if we're renaming a multi-token field (cursor might be on a token or between tokens)
    const offset = document.offsetAt(position);
    const field = this.findFieldByPartialToken(ast, offset);

    let filteredReferences: { uri: string; range: Range }[];
    let symbolType: string;

    if (field) {
      // Multi-token field: collect references manually using field name
      // No scope filtering needed - fields are global to the table
      filteredReferences = this.collectFieldReferences(document, ast, field, symbolTable, tokens);
      symbolType = 'field';
    } else {
      // Not a multi-token field, get token at position for regular rename
      const resolvedTokens = tokens ?? new Lexer(document.getText()).tokenize();
      const token = findTokenAtOffset(resolvedTokens, offset);
      if (!token || !this.isRenameableToken(token)) {
        return null;
      }

      // #797: refuse renaming a member-property that resolves member-blind to a shadowing local/parameter.
      if (this.refusesMemberPropertyRename(ast, symbolTable, token)) {
        return null;
      }

      // Validate symbol type
      symbolType = this.getSymbolType(token, symbolTable, offset, ast);

      // Regular symbol: use ReferenceProvider.
      // #794: symbolTable AND resolvedTokens are REQUIRED here, not optional. Without them,
      // getReferences skips #791's member-property drop (referenceProvider.ts gate
      // `if (symbolTable && tokens)`) and returns member-property occurrences such as the
      // `Employee` in `SomeRec.Employee`. filterReferencesByScope below is member-BLIND, so it
      // would then rewrite that occurrence when renaming a same-named local -> data corruption.
      // The two filters are COMPLEMENTARY and BOTH load-bearing:
      //   - getReferences (with symbolTable+tokens): member-property drop + PERMISSIVE scope
      //     (keepUnresolved:true) — keeps name-matches that resolve to no in-scope symbol.
      //   - filterReferencesByScope: FAIL-CLOSED narrowing — drops those unresolved keeps
      //     (e.g. a WITH-block implicit field of the same name) so renaming a local never
      //     rewrites a WITH-implicit field. Do NOT remove either filter or these two args.
      const referenceProvider = new ReferenceProvider();
      const references = referenceProvider.getReferences(
        document, position, ast, true, symbolTable, resolvedTokens
      );

      if (references.length === 0) {
        return null;
      }

      // Filter references to only include those in the correct scope
      filteredReferences = this.filterReferencesByScope(
        references,
        token,
        offset,
        symbolTable,
        ast,
        document,
        resolvedTokens
      );
    }

    if (filteredReferences.length === 0) {
      return null;
    }

    // Validate the new name
    const validationError = this.validateNewName(newName, symbolType);
    if (validationError) {
      throw new Error(validationError);
    }

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
   * @param ast - The parsed AST (optional)
   * @returns Symbol type string
   */
  private getSymbolType(token: Token, symbolTable: SymbolTable | undefined, offset: number, ast?: CALDocument): string {
    if (!symbolTable) {
      return 'variable'; // Default to variable if no symbol table
    }

    const symbol = symbolTable.getSymbolAtOffset(token.value, offset);

    // AST FALLBACK: Check if token is part of a multi-token field
    if (!symbol && ast) {
      const field = this.findFieldByPartialToken(ast, offset);
      if (field) {
        return 'field';
      }
    }

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
   * @param originOffset - The document offset of the origin position
   * @param symbolTable - The symbol table
   * @param ast - The parsed AST (optional)
   * @param document - The text document
   * @param tokens - Pre-tokenized tokens (optional, for reuse)
   * @returns Filtered array of references
   */
  private filterReferencesByScope(
    references: { uri: string; range: Range }[],
    originToken: Token,
    originOffset: number,
    symbolTable: SymbolTable | undefined,
    ast: CALDocument | undefined,
    document: TextDocument,
    tokens?: readonly Token[]
  ): { uri: string; range: Range }[] {
    if (!symbolTable) {
      // Without symbol table, return all references (no scope filtering)
      return references;
    }

    // Get the symbol at the origin position
    const originSymbol = symbolTable.getSymbolAtOffset(originToken.value, originToken.startOffset);

    // AST FALLBACK: For multi-token fields, don't filter by scope
    if (!originSymbol && ast) {
      const field = this.findFieldByPartialToken(ast, originOffset);
      if (field) {
        // Fields are global to the table - return all references
        return references;
      }
    }

    if (!originSymbol) {
      // If we can't find the origin symbol, return all references
      return references;
    }

    // Filter references to only those that resolve to the same symbol definition
    const resolvedTokens = tokens ?? new Lexer(document.getText()).tokenize();
    return references.filter(ref => {
      const refOffset = document.offsetAt(ref.range.start);
      const refToken = findTokenAtOffset(resolvedTokens, refOffset);
      if (!refToken) {
        return false;
      }

      // #801: when renaming a PROCEDURE/function, never rewrite a same-named FIELD's DECLARATION token.
      // The field decl resolves member-blind to the procedure under last-write-wins root scope, so the
      // identity test below would otherwise keep it. A FIELDS-section declaration is structurally never a
      // procedure reference. (Field member accesses / bare field uses remain a tracked residual — #802.)
      if (originSymbol.kind === 'procedure' || originSymbol.kind === 'function') {
        const f = this.findFieldByPartialToken(ast, refToken.startOffset);
        if (f && f.nameToken?.startOffset === refToken.startOffset) {
          return false;
        }
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


  /**
   * #800: decide whether a text-matched field-name token should be renamed when renaming a field
   * from its FIELDS-section declaration. collectFieldReferences is text-based, so it also matches a
   * same-named shadowing local/parameter. Drop tokens that resolve to a shadowing variable/parameter;
   * keep the field declaration, bare field uses (kind 'field'), member-property uses (Rec.Field), and
   * unresolved tokens (Policy A: strictly subset-removing — never under-renames a legitimate field ref).
   *
   * Guard order (MUST be preserved):
   *   1. Declaration rescue: the field's own nameToken offset is always kept, even when a same-named
   *      global VAR has overwritten kind:'field' with kind:'variable' in the (last-write-wins) root
   *      scope symbol map. Without this, `getSymbolAtOffset` at the decl offset returns 'variable' and
   *      the kind check below drops the declaration → silent 0-edit no-op (#800 regression).
   *   2. Proc-ref drop (#801): tokens that are POSITIVE procedure-reference evidence (procedure
   *      declaration nameTokens and CallExpression callees) are dropped BEFORE the member-property
   *      rescue. This is required so that a member CALL `Rec.Amount(5)` (in the set) is dropped,
   *      while a bare member ACCESS `Rec.Amount` (no parens, not in the set) still reaches the
   *      member rescue below and is kept.
   *   3. Member-property rescue: Rec.Field resolves member-blind to the shadowing local
   *      (the #798 gap), so a kind check would otherwise wrongly drop a legitimate Rec.Field use.
   *      MUST run before the var/param kind check (step 4).
   *   4. Kind check: drop tokens that resolve to 'variable' or 'parameter' (shadowing local/param).
   *   5. Keep: field-identity or unresolved token.
   */
  private keepFieldReferenceToken(
    ast: CALDocument,
    symbolTable: SymbolTable | undefined,
    field: FieldDeclaration,
    anchorOffset: number,
    procRefOffsets: Set<number>
  ): boolean {
    if (!symbolTable) return true;                                   // fail-safe no-op (preserve current behavior)
    // #800: the field's own declaration must always be renamed, even if a same-named global VAR
    // overwrote the field in the (last-write-wins) root-scope symbol map. Without this, the decl
    // resolves to the global 'variable' and would be wrongly dropped -> silent 0-edit no-op.
    if (anchorOffset === field.nameToken?.startOffset) return true;  // 1. DECLARATION RESCUE (must be first)
    if (procRefOffsets.has(anchorOffset)) return false;              // 2. proc-ref drop (#801)
    if (this.isCursorOnMemberProperty(ast, anchorOffset)) return true; // 3. member-property rescue
    const sym = symbolTable.getSymbolAtOffset(field.fieldName, anchorOffset);
    if (sym && (sym.kind === 'variable' || sym.kind === 'parameter')) return false; // 4. DROP shadowing local/param
    return true;                                                      // 5. KEEP field-identity / unresolved
  }

  /**
   * True if the token starting at `tokenStartOffset` is the `property` of some MemberExpression
   * (e.g. the `Amount` in `Rec.Amount`). Used to refuse renames that would otherwise unify a
   * member-property with a same-named shadowing local/parameter (#797).
   *
   * The visitor returns void (NOT false) so ASTWalker auto-traverses object+property and nested
   * member chains (A.B.C) are each visited at any depth.
   */
  private isCursorOnMemberProperty(ast: CALDocument, tokenStartOffset: number): boolean {
    const walker = new ASTWalker();
    let found = false;
    walker.walk(ast, {
      visitMemberExpression: (node: MemberExpression): void => {
        if (node.property?.startToken?.startOffset === tokenStartOffset) {
          found = true;
        }
      },
    });
    return found;
  }

  /**
   * #801: Collect offsets of all tokens that are POSITIVE procedure-reference evidence via one
   * ASTWalker pass. Returns the set of startOffsets that are:
   *   - a ProcedureDeclaration's nameToken (the declaration site itself), or
   *   - the callee of a CallExpression with parens (bare call `Amount(5)` or member call
   *     `Rec.Amount(5)`).
   *
   * Returning void (not false) from visitCallExpression lets the walker auto-descend into call
   * arguments so nested calls are also captured.
   */
  private collectProcedureReferenceOffsets(ast: CALDocument): Set<number> {
    const offsets = new Set<number>();
    const walker = new ASTWalker();
    walker.walk(ast, {
      visitProcedureDeclaration: (node: ProcedureDeclaration): void => {
        if (node.nameToken) {
          offsets.add(node.nameToken.startOffset);
        }
      },
      visitCallExpression: (node: CallExpression): void => {
        const callee = node.callee;
        if (callee.type === 'Identifier') {
          offsets.add(callee.startToken.startOffset);
        } else if (callee.type === 'MemberExpression') {
          offsets.add(callee.property.startToken.startOffset);
        }
      },
    });
    return offsets;
  }

  /**
   * #797: A rename whose origin token is a member-property (e.g. `Rec.Amount`) must NOT be driven by a
   * same-named shadowing local/parameter. The engine is member-blind (no cross-object receiver-type →
   * field-list resolution; that gap is tracked by #798), so the safe, fail-closed behavior is to refuse:
   * renaming via the member would otherwise corrupt the unrelated local. Keying on kind variable/parameter
   * is what keeps the no-shadow field-via-member rename (kind 'field') and procedure member-calls
   * (kind 'procedure') working.
   *
   * Note: this only fires when the cursor is on a MemberExpression.property. A WITH-implicit field used as
   * a BARE identifier (e.g. `Status := 2` inside `WITH Rec DO`) is not a MemberExpression, so it is out of
   * reach of this predicate by construction — that broader member-resolution case belongs to #798.
   */
  private refusesMemberPropertyRename(
    ast: CALDocument | undefined,
    symbolTable: SymbolTable | undefined,
    token: Token
  ): boolean {
    if (!ast || !symbolTable) return false;
    if (!this.isCursorOnMemberProperty(ast, token.startOffset)) return false;
    const origin = symbolTable.getSymbolAtOffset(token.value, token.startOffset);
    return !!origin && (origin.kind === 'variable' || origin.kind === 'parameter');
  }

  /**
   * Find a field declaration that contains the given document offset.
   * Used when cursor is on ANY token of a multi-token field name.
   *
   * @param ast - The parsed AST
   * @param offset - The document offset
   * @returns The field declaration, or null if not found
   */
  private findFieldByPartialToken(ast: CALDocument | undefined, offset: number): FieldDeclaration | null {
    if (!ast?.object?.fields?.fields) return null;

    for (const field of ast.object.fields.fields) {
      if (!field.nameToken) continue;

      const startOffset = field.nameToken.startOffset;
      const endOffset = startOffset + field.fieldName.length;

      if (offset >= startOffset && offset < endOffset) {
        return field;
      }
    }
    return null;
  }

  /**
   * Get the full range and text for a field declaration.
   * Handles both quoted and unquoted multi-token field names.
   *
   * @param document - The text document
   * @param field - The field declaration
   * @returns Object with range and placeholder text
   */
  private getFieldIdentifierRangeAndText(
    document: TextDocument,
    field: FieldDeclaration
  ): { range: Range; placeholder: string } {
    if (!field.nameToken) {
      throw new Error('Field nameToken is undefined');
    }

    let startOffset: number;
    let endOffset: number;

    if (field.nameToken.type === TokenType.QuotedIdentifier) {
      // Quoted: range from token start to token end (includes quotes)
      startOffset = field.nameToken.startOffset;
      endOffset = field.nameToken.endOffset;
    } else {
      // Unquoted multi-token: range = first token start + full name length
      startOffset = field.nameToken.startOffset;
      endOffset = startOffset + field.fieldName.length;
    }

    const startPos = document.positionAt(startOffset);
    const endPos = document.positionAt(endOffset);

    return {
      range: { start: startPos, end: endPos },
      placeholder: field.fieldName
    };
  }

  /**
   * Collect all references to a specific field by searching the AST.
   * This method handles multi-token field names by using the full field name from the AST.
   *
   * @param document - The text document
   * @param ast - The parsed AST
   * @param field - The field declaration to find references for
   * @param tokens - Pre-tokenized tokens (optional, for reuse)
   * @returns Array of locations where the field is referenced
   */
  private collectFieldReferences(
    document: TextDocument,
    ast: CALDocument,
    field: FieldDeclaration,
    symbolTable: SymbolTable | undefined,
    tokens?: readonly Token[]
  ): { uri: string; range: Range }[] {
    const references: { uri: string; range: Range }[] = [];
    const fieldName = field.fieldName.toLowerCase();

    // Get all field names from AST to check for prefix collisions
    const allFieldNames = (ast.object?.fields?.fields || [])
      .map(f => f.fieldName.toLowerCase())
      .filter(name => name !== fieldName); // Exclude the current field

    // Now search for all usages (including definition) in the code
    // We'll use the lexer to find all tokens and match them against the field name
    const text = document.getText();
    const resolvedTokens = tokens ?? new Lexer(text).tokenize();

    // #801: collect all procedure-reference offsets once before iterating tokens
    const procRefOffsets = this.collectProcedureReferenceOffsets(ast);

    for (let i = 0; i < resolvedTokens.length; i++) {
      const token = resolvedTokens[i];

      // For quoted identifiers, check if the token value matches the field name
      if (token.type === TokenType.QuotedIdentifier) {
        if (token.value.toLowerCase() === fieldName) {
          if (this.keepFieldReferenceToken(ast, symbolTable, field, token.startOffset, procRefOffsets)) {
            const start = document.positionAt(token.startOffset);
            const end = document.positionAt(token.endOffset);
            references.push({ uri: document.uri, range: { start, end } });
          }
        }
        continue;
      }

      // For unquoted multi-token fields, check if this token starts a sequence matching the field name
      // We check all tokens (including keywords) because field names can contain reserved words
      // Skip only structural tokens
      if (token.type === TokenType.LeftParen ||
          token.type === TokenType.RightParen ||
          token.type === TokenType.Semicolon) {
        continue;
      }

      // Try to match the full field name starting from this position
      const potentialMatch = text.substring(token.startOffset, token.startOffset + field.fieldName.length);

      if (potentialMatch.toLowerCase() === fieldName) {
        // Verify this is actually a complete match (not part of a longer identifier)
        // Check the character BEFORE and AFTER the match to ensure word boundaries
        const charBefore = token.startOffset > 0 ? text[token.startOffset - 1] : null;
        const charAfter = text[token.startOffset + field.fieldName.length];

        // Before: should be non-identifier char (or start of file)
        const validBefore = !charBefore || !/[a-zA-Z0-9_]/.test(charBefore);
        // After: should be non-identifier char (or end of file)
        const validAfter = !charAfter || !/[a-zA-Z0-9_]/.test(charAfter);

        if (validBefore && validAfter) {
          // CRITICAL: Check for prefix collision with other fields
          // If we're matching "Update" but there's a field "Update Count", we might be
          // matching the prefix of "Update Count" instead of the actual "Update" field
          let isPrefixOfLongerField = false;

          for (const otherFieldName of allFieldNames) {
            if (otherFieldName.startsWith(fieldName)) {
              // There's a longer field that starts with this field name
              // Check if the text at this position matches the longer field
              const longerMatch = text.substring(token.startOffset, token.startOffset + otherFieldName.length);
              if (longerMatch.toLowerCase() === otherFieldName) {
                // This is actually a reference to the longer field, not our field
                isPrefixOfLongerField = true;
                break;
              }
            }
          }

          if (!isPrefixOfLongerField) {
            if (this.keepFieldReferenceToken(ast, symbolTable, field, token.startOffset, procRefOffsets)) {
              const start = document.positionAt(token.startOffset);
              const end = document.positionAt(token.startOffset + field.fieldName.length);
              references.push({ uri: document.uri, range: { start, end } });
            }
          }
        }
      }
    }

    return references;
  }
}
