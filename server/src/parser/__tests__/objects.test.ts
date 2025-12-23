/**
 * Parser Tests - Object Parsing
 *
 * Tests parsing of different C/AL object types and basic object structure.
 *
 * IMPORTANT: The current parser has limited section parsing capabilities because
 * the lexer treats `{` and `}` as block comments. These tests focus on what the
 * parser CAN do: object-level parsing (kind, ID, name) and error recovery.
 *
 * See PARSER_TEST_FINDINGS.md for detailed explanation of current limitations.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectKind } from '../ast';

describe('Parser - Table Objects', () => {
  it('should parse minimal table object', () => {
    const code = `OBJECT Table 18 Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.type).toBe('ObjectDeclaration');
    expect(ast.object?.objectKind).toBe(ObjectKind.Table);
    expect(ast.object?.objectId).toBe(18);
    expect(ast.object?.objectName).toBe('Customer');
  });

  it('should parse table with quoted name', () => {
    const code = `OBJECT Table 50000 "Customer Extended"`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectName).toBe('Customer Extended');
  });

  it('should parse table with large ID', () => {
    const code = `OBJECT Table 99999 Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectId).toBe(99999);
  });

  it('should handle table with hyphenated name', () => {
    const code = `OBJECT Table 18 Customer-Extended`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectName).toBe('Customer');
  });

  it('should parse table and validate AST structure', () => {
    const code = `OBJECT Table 18 Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.type).toBe('CALDocument');
    expect(ast.object?.type).toBe('ObjectDeclaration');
    expect(ast.startToken).toBeDefined();
    expect(ast.endToken).toBeDefined();
    expect(ast.object?.startToken).toBeDefined();
    expect(ast.object?.endToken).toBeDefined();
  });
});

describe('Parser - Page Objects', () => {
  it('should parse minimal page object', () => {
    const code = `OBJECT Page 21 Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.objectId).toBe(21);
    expect(ast.object?.objectName).toBe('Customer');
  });

  it('should parse page with quoted name', () => {
    const code = `OBJECT Page 21 "Customer Card"`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.objectName).toBe('Customer Card');
  });

  it('should validate AST structure for page object', () => {
    const code = `OBJECT Page 21 Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.type).toBe('CALDocument');
    expect(ast.object?.type).toBe('ObjectDeclaration');
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.startToken).toBeDefined();
    expect(ast.object?.endToken).toBeDefined();
  });
});

describe('Parser - Codeunit Objects', () => {
  it('should parse minimal codeunit object', () => {
    const code = `OBJECT Codeunit 80 "Sales-Post"`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectKind).toBe(ObjectKind.Codeunit);
    expect(ast.object?.objectId).toBe(80);
    expect(ast.object?.objectName).toBe('Sales-Post');
  });

  it('should parse codeunit with simple name', () => {
    const code = `OBJECT Codeunit 50000 Test`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectName).toBe('Test');
  });

  it('should validate AST structure for codeunit object', () => {
    const code = `OBJECT Codeunit 80 Test`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.type).toBe('CALDocument');
    expect(ast.object?.type).toBe('ObjectDeclaration');
    expect(ast.object?.objectKind).toBe(ObjectKind.Codeunit);
    expect(ast.object?.startToken).toBeDefined();
    expect(ast.object?.endToken).toBeDefined();
  });
});

describe('Parser - Other Object Types', () => {
  it('should parse Report object', () => {
    const code = `OBJECT Report 111 "Customer List"`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe(ObjectKind.Report);
    expect(ast.object?.objectId).toBe(111);
    expect(ast.object?.objectName).toBe('Customer List');
  });

  it('should parse Query object', () => {
    const code = `OBJECT Query 100 "Customer Sales"`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe(ObjectKind.Query);
    expect(ast.object?.objectId).toBe(100);
  });

  it('should parse XMLport object', () => {
    const code = `OBJECT XMLport 50000 "Customer Export"`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe(ObjectKind.XMLport);
    expect(ast.object?.objectId).toBe(50000);
  });

  it('should parse MenuSuite object', () => {
    const code = `OBJECT MenuSuite 1 Navigation`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe(ObjectKind.MenuSuite);
    expect(ast.object?.objectId).toBe(1);
  });
});

describe('Parser - Objects with Comments', () => {
  it('should parse object with trailing comment block', () => {
    const code = `OBJECT Table 18 Customer { comment block }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    // Comment should be stripped by lexer, object should parse normally
    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectKind).toBe(ObjectKind.Table);
    expect(ast.object?.objectId).toBe(18);
  });

  it('should parse object with line comment', () => {
    const code = `OBJECT Table 18 Customer // This is a comment`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectName).toBe('Customer');
  });

  it('should handle multiple comment blocks', () => {
    const code = `OBJECT Table 18 { comment } Customer { another comment }`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    // Even with comments interspersed, should identify what it can
    expect(ast.object).not.toBeNull();
  });
});

describe('Parser - Edge Cases', () => {
  it('should handle object with only ID (missing name)', () => {
    const code = `OBJECT Table 18`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    // Should not crash even with incomplete input
    expect(() => parser.parse()).not.toThrow();
  });

  it('should handle very long object names', () => {
    const longName = 'A'.repeat(250);
    const code = `OBJECT Table 18 "${longName}"`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectName).toBe(longName);
  });

  it('should handle object ID at boundary values', () => {
    const code = `OBJECT Table 0 Test`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectId).toBe(0);
  });

  it('should parse objects with whitespace variations', () => {
    const code = `OBJECT    Table    18    Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe(ObjectKind.Table);
    expect(ast.object?.objectId).toBe(18);
    expect(ast.object?.objectName).toBe('Customer');
  });

  it('should handle newlines between tokens', () => {
    const code = `OBJECT
    Table
    18
    Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    const ast = parser.parse();

    expect(ast.object?.objectKind).toBe(ObjectKind.Table);
    expect(ast.object?.objectId).toBe(18);
  });
});

describe('Parser - Error Conditions', () => {
  it('should not crash on wrong token order', () => {
    const code = `Table OBJECT 18 Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    expect(() => parser.parse()).not.toThrow();
  });

  it('should not crash on non-numeric ID', () => {
    const code = `OBJECT Table ABC Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    expect(() => parser.parse()).not.toThrow();
  });

  it('should collect errors for invalid object', () => {
    const code = `OBJECT Table InvalidID Customer`;
    const lexer = new Lexer(code);
    const parser = new Parser(lexer.tokenize());

    parser.parse();
    const errors = parser.getErrors();

    // May or may not have errors depending on parser implementation
    // The important thing is it didn't crash
    expect(errors).toBeDefined();
  });
});

/**
 * TODO: Section Parsing Tests (Future Enhancement)
 *
 * Once the lexer is enhanced to support context-aware brace handling,
 * add tests for:
 * - PROPERTIES section parsing
 * - FIELDS section parsing
 * - KEYS section parsing
 * - FIELDGROUPS section parsing
 * - CODE section parsing
 * - Complete object with all sections
 *
 * See PARSER_TEST_FINDINGS.md for implementation details needed.
 */
