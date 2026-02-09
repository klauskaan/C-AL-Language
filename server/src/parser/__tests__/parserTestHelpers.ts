import { Lexer } from '../../lexer/lexer';
import { Token } from '../../lexer/tokens';
import { Parser, ParseError, SkippedRegion } from '../parser';
import { CALDocument } from '../ast';

/**
 * Tokenize C/AL source code.
 *
 * @param code - C/AL source code to tokenize
 * @returns Array of tokens produced by the lexer
 */
export function tokenize(code: string): Token[] {
  const lexer = new Lexer(code);
  return lexer.tokenize();
}

/**
 * Parse C/AL source code and return AST with errors and skipped regions.
 *
 * @param code - C/AL source code to parse
 * @returns Object containing AST, parse errors, and skipped regions
 */
export function parseCode(code: string): {
  ast: CALDocument;
  errors: ParseError[];
  skippedRegions: SkippedRegion[];
} {
  const tokens = tokenize(code);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return {
    ast,
    errors: parser.getErrors(),
    skippedRegions: parser.getSkippedRegions(),
  };
}

/**
 * Assert that parsing C/AL code does not throw an exception.
 *
 * This helper is used to verify that the parser handles code gracefully
 * (even if it produces parse errors) without throwing exceptions.
 *
 * @param code - C/AL source code to parse
 */
export function expectParseNoThrow(code: string): void {
  const tokens = tokenize(code);
  const parser = new Parser(tokens);
  expect(() => parser.parse()).not.toThrow();
}
