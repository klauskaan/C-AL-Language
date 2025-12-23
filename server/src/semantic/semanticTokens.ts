import { SemanticTokensBuilder } from 'vscode-languageserver';
import { Token, TokenType } from '../lexer/tokens';
import { CALDocument } from '../parser/ast';

/**
 * Semantic token types - these will be sent to the client
 * The client will map these to appropriate colors
 */
export enum SemanticTokenTypes {
  Keyword = 0,
  String = 1,
  Number = 2,
  Operator = 3,
  Variable = 4,
  Function = 5,
  Parameter = 6,
  Property = 7,
  Type = 8,
  Comment = 9
}

/**
 * Semantic token modifiers
 */
export enum SemanticTokenModifiers {
  Declaration = 0,
  Definition = 1,
  Readonly = 2,
  Static = 3
}

/**
 * Get the legend for semantic tokens (must be sent to client during initialization)
 */
export function getSemanticTokensLegend(): { tokenTypes: string[], tokenModifiers: string[] } {
  return {
    tokenTypes: [
      'keyword',
      'string',
      'number',
      'operator',
      'variable',
      'function',
      'parameter',
      'property',
      'type',
      'comment'
    ],
    tokenModifiers: [
      'declaration',
      'definition',
      'readonly',
      'static'
    ]
  };
}

/**
 * Semantic Tokens Provider
 *
 * This is the key feature that solves the quoted identifier issue.
 * By providing semantic tokens, we can make quoted identifiers like "Line No."
 * appear the same as regular identifiers like Description, even though the
 * TextMate grammar scopes them differently for bracket matching purposes.
 */
export class SemanticTokensProvider {
  /**
   * Build semantic tokens from tokens and AST
   */
  public buildSemanticTokens(tokens: Token[], ast: CALDocument, builder: SemanticTokensBuilder): void {
    // Process all tokens and assign semantic token types
    for (const token of tokens) {
      this.processToken(token, builder);
    }
  }

  private processToken(token: Token, builder: SemanticTokensBuilder): void {
    const tokenType = this.mapTokenTypeToSemantic(token);

    if (tokenType === null) {
      return; // Skip tokens we don't want to highlight semantically
    }

    // Calculate line and character position (0-based)
    const line = token.line - 1; // Tokens use 1-based line numbers
    const char = token.column - 1; // Tokens use 1-based column numbers
    const length = token.value.length;

    // Add the semantic token
    builder.push(line, char, length, tokenType, 0);
  }

  /**
   * Map lexer token types to semantic token types
   *
   * IMPORTANT: Quoted identifiers are mapped to 'variable' type, making them
   * appear the same as regular identifiers despite having different TextMate scopes.
   */
  private mapTokenTypeToSemantic(token: Token): number | null {
    switch (token.type) {
      // Keywords
      case TokenType.Object:
      case TokenType.Table:
      case TokenType.Page:
      case TokenType.Report:
      case TokenType.Codeunit:
      case TokenType.Query:
      case TokenType.XMLport:
      case TokenType.MenuSuite:
      case TokenType.Properties:
      case TokenType.Fields:
      case TokenType.Keys:
      case TokenType.FieldGroups:
      case TokenType.Code:
      case TokenType.If:
      case TokenType.Then:
      case TokenType.Else:
      case TokenType.Case:
      case TokenType.Of:
      case TokenType.While:
      case TokenType.Do:
      case TokenType.Repeat:
      case TokenType.Until:
      case TokenType.For:
      case TokenType.To:
      case TokenType.DownTo:
      case TokenType.Exit:
      case TokenType.Break:
      case TokenType.Procedure:
      case TokenType.Function:
      case TokenType.Local:
      case TokenType.Var:
      case TokenType.Trigger:
      case TokenType.Begin:
      case TokenType.End:
      case TokenType.True:
      case TokenType.False:
      case TokenType.Div:
      case TokenType.Mod:
      case TokenType.And:
      case TokenType.Or:
      case TokenType.Not:
      case TokenType.Xor:
      case TokenType.In:
      case TokenType.With:
      case TokenType.Array:
      case TokenType.Temporary:
        return SemanticTokenTypes.Keyword;

      // Data types
      case TokenType.Boolean:
      case TokenType.Integer_Type:
      case TokenType.Decimal_Type:
      case TokenType.Text:
      case TokenType.Code_Type:
      case TokenType.Date_Type:
      case TokenType.Time_Type:
      case TokenType.DateTime_Type:
      case TokenType.Record:
      case TokenType.RecordID:
      case TokenType.RecordRef:
      case TokenType.FieldRef:
      case TokenType.BigInteger:
      case TokenType.BigText:
      case TokenType.BLOB:
      case TokenType.GUID:
      case TokenType.Duration:
      case TokenType.Option:
      case TokenType.Char:
      case TokenType.Byte:
      case TokenType.TextConst:
        return SemanticTokenTypes.Type;

      // Literals
      case TokenType.String:
        return SemanticTokenTypes.String;

      case TokenType.Integer:
      case TokenType.Decimal:
        return SemanticTokenTypes.Number;

      // Identifiers and Quoted Identifiers
      // THIS IS THE KEY: Both regular and quoted identifiers get the same semantic type
      case TokenType.Identifier:
      case TokenType.QuotedIdentifier:
        return SemanticTokenTypes.Variable;

      // Operators
      case TokenType.Plus:
      case TokenType.Minus:
      case TokenType.Multiply:
      case TokenType.Divide:
      case TokenType.Assign:
      case TokenType.Equal:
      case TokenType.NotEqual:
      case TokenType.Less:
      case TokenType.LessEqual:
      case TokenType.Greater:
      case TokenType.GreaterEqual:
      case TokenType.Dot:
      case TokenType.DotDot:
      case TokenType.DoubleColon:
        return SemanticTokenTypes.Operator;

      // Comments
      case TokenType.Comment:
        return SemanticTokenTypes.Comment;

      // Skip other tokens (punctuation, whitespace, etc.)
      default:
        return null;
    }
  }
}
