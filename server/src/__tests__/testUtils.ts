import { Token, TokenType } from '../lexer/tokens';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { CALDocument } from '../parser/ast';
import { SymbolTable } from '../symbols/symbolTable';

/**
 * Create a mock Token with sensible defaults.
 * Useful for unit tests that need token instances without running the full lexer.
 *
 * @param overrides - Partial token properties to override defaults
 * @returns A complete Token object
 *
 * @example
 * const token = createMockToken({ type: TokenType.Begin, value: 'BEGIN' });
 */
export function createMockToken(overrides?: Partial<Token>): Token {
  const value = overrides?.value ?? 'test';
  const startOffset = overrides?.startOffset ?? 0;

  return {
    type: TokenType.Identifier,
    value,
    line: 1,
    column: 1,
    startOffset,
    endOffset: startOffset + value.length,
    ...overrides
  };
}

/**
 * Create a TextDocument from C/AL source code.
 * Uses vscode-languageserver-textdocument to create a proper document instance
 * that can be used with LSP providers.
 *
 * @param content - C/AL source code content
 * @param uri - Optional document URI (defaults to 'file:///test.cal')
 * @returns A TextDocument instance
 *
 * @example
 * const doc = createDocument('OBJECT Table 50000 Customer { }');
 * const position = { line: 0, character: 7 };
 * const offset = doc.offsetAt(position);
 */
export function createDocument(content: string, uri = 'file:///test.cal'): TextDocument {
  return TextDocument.create(uri, 'cal', 1, content);
}

/**
 * Parse C/AL source code and build a symbol table.
 * This is the standard test workflow: Lexer → Parser → SymbolTable.
 *
 * @param content - C/AL source code to parse
 * @returns An object containing the parsed AST and built symbol table
 *
 * @example
 * const { ast, symbolTable } = parseAndBuildSymbols(`
 *   OBJECT Codeunit 50000 MyCodeunit
 *   {
 *     PROCEDURE Calculate@1();
 *     VAR
 *       Amount@1000 : Decimal;
 *     BEGIN
 *     END;
 *   }
 * `);
 *
 * expect(ast.object?.objectName).toBe('MyCodeunit');
 * expect(symbolTable.hasSymbol('Calculate')).toBe(true);
 */
export function parseAndBuildSymbols(content: string): { ast: CALDocument; symbolTable: SymbolTable } {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);

  return { ast, symbolTable };
}
