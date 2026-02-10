import { Token, TokenType } from '../lexer/tokens';

/**
 * Format a token value with appropriate quoting for attribute display
 *
 * Re-wraps token values in their original quote delimiters, re-escaping
 * single quotes in string literals. The lexer strips delimiters and unescapes
 * during tokenization; this function reverses the transformation for display.
 */
export function formatAttributeTokenValue(token: Token): string {
  switch (token.type) {
    case TokenType.String:
      return `'${token.value.replace(/'/g, "''")}'`;
    case TokenType.QuotedIdentifier:
      return `"${token.value}"`;
    default:
      return token.value;
  }
}
