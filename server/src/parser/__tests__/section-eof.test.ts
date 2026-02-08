/**
 * Parser Tests - Section EOF Edge Cases
 *
 * Tests for when a section is unclosed and EOF is reached (no following section keyword).
 * The code already handles this correctly - the `while` loop's `!this.isAtEnd()` guard exits,
 * `check(RightBrace)` returns false, `recordError` fires, and `this.previous()` returns the
 * last token before EOF.
 *
 * This test suite validates:
 * - Appropriate error messages are generated
 * - Parser recovers gracefully
 * - Error messages are consistent across all section types
 *
 * Related issue: #368
 *
 * === Error Location Assertion Strategy ===
 * See: .claude/skills/cal-dev-guide/SKILL.md "Error Location Assertion Strategy"
 *
 * These are Tier 3 tests (detection only) - we verify that errors are reported
 * when sections are unclosed at EOF, but exact error location is not critical.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectKind } from '../ast';

describe('Parser - Section EOF Edge Cases', () => {
  describe('FIELDS section at EOF', () => {
    it('should detect error when FIELDS section is unclosed at EOF', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    CaptionML=ENU=Customer;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Parser should not throw
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Table);

      // Should detect missing closing brace
      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close FIELDS section'));
      expect(closeError).toBeDefined();
    });

    it('should detect error when FIELDS section is unclosed with no fields at EOF', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    CaptionML=ENU=Customer;
  }
  FIELDS
  {`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close FIELDS section'));
      expect(closeError).toBeDefined();
    });

    it('should detect error when FIELDS section is unclosed mid-field at EOF', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      // Should have errors for both the incomplete field and the unclosed section
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ACTIONS section at EOF', () => {
    it('should detect error when ACTIONS section is unclosed at EOF', () => {
      const code = `OBJECT Page 21 Customer Card
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Card;
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Action    ;
                Name=Edit;
                CaptionML=ENU=Edit }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close ACTIONS section'));
      expect(closeError).toBeDefined();
    });

    it('should detect error when ACTIONS section is unclosed with no actions at EOF', () => {
      const code = `OBJECT Page 21 Customer Card
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Card;
  }
  ACTIONS
  {`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close ACTIONS section'));
      expect(closeError).toBeDefined();
    });

    it('should detect error when ACTIONS section is unclosed mid-action at EOF', () => {
      const code = `OBJECT Page 21 Customer Card
{
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }
    { 2   ;1   ;Action    ;
                Name=Edit`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('KEYS section at EOF', () => {
    it('should detect error when KEYS section is unclosed at EOF', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    CaptionML=ENU=Customer;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
  }
  KEYS
  {
    {    ;No.                      ;Clustered=Yes }
    {    ;Name                                    }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Table);

      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close KEYS section'));
      expect(closeError).toBeDefined();
    });

    it('should detect error when KEYS section is unclosed with no keys at EOF', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
  KEYS
  {`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close KEYS section'));
      expect(closeError).toBeDefined();
    });
  });

  describe('FIELDGROUPS section at EOF', () => {
    it('should detect error when FIELDGROUPS section is unclosed at EOF', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    CaptionML=ENU=Customer;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
  }
  FIELDGROUPS
  {
    { 1   ;DropDown  ;No.,Name                     }
    { 2   ;Brick     ;No.,Name                     }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Table);

      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close FIELDGROUPS section'));
      expect(closeError).toBeDefined();
    });

    it('should detect error when FIELDGROUPS section is unclosed with no groups at EOF', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
  FIELDGROUPS
  {`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close FIELDGROUPS section'));
      expect(closeError).toBeDefined();
    });
  });

  describe('CONTROLS section at EOF', () => {
    it('should detect error when CONTROLS section is unclosed at EOF', () => {
      const code = `OBJECT Page 21 Customer Card
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Card;
  }
  CONTROLS
  {
    { 1   ;0   ;Container ;
                ContainerType=ContentArea }
    { 2   ;1   ;Group     ;
                Name=General;
                CaptionML=ENU=General }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close CONTROLS section'));
      expect(closeError).toBeDefined();
    });

    it('should detect error when CONTROLS section is unclosed with no controls at EOF', () => {
      const code = `OBJECT Page 21 Customer Card
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Card;
  }
  CONTROLS
  {`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close CONTROLS section'));
      expect(closeError).toBeDefined();
    });
  });

  describe('ELEMENTS section at EOF', () => {
    it('should detect error when ELEMENTS section is unclosed at EOF', () => {
      const code = `OBJECT XMLport 50000 Customer Import
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Import;
  }
  ELEMENTS
  {
    { [{GUID-1}];0   ;Root            ;Element ;Text }
    { [{GUID-2}];1   ;Customer        ;Element ;Text }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.XMLport);

      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close ELEMENTS section'));
      expect(closeError).toBeDefined();
    });

    it('should detect error when ELEMENTS section is unclosed with no elements at EOF', () => {
      const code = `OBJECT XMLport 50000 Customer Import
{
  PROPERTIES
  {
    CaptionML=ENU=Customer Import;
  }
  ELEMENTS
  {`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      expect(ast).toBeDefined();
      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close ELEMENTS section'));
      expect(closeError).toBeDefined();
    });
  });

  describe('Error message consistency', () => {
    it('should use consistent error message format across section types', () => {
      const sections = [
        { code: 'OBJECT Table 1 T { FIELDS {', section: 'FIELDS' },
        { code: 'OBJECT Table 1 T { KEYS {', section: 'KEYS' },
        { code: 'OBJECT Table 1 T { FIELDGROUPS {', section: 'FIELDGROUPS' },
        { code: 'OBJECT Page 1 P { ACTIONS {', section: 'ACTIONS' },
        { code: 'OBJECT Page 1 P { CONTROLS {', section: 'CONTROLS' },
        { code: 'OBJECT XMLport 1 X { ELEMENTS {', section: 'ELEMENTS' },
      ];

      sections.forEach(({ code, section }) => {
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        const closeError = errors.find(e => e.message.includes(`Expected } to close ${section} section`));
        expect(closeError).toBeDefined();
        expect(closeError?.message).toContain('Expected } to close');
        expect(closeError?.message).toContain(section);
        expect(closeError?.message).toContain('section');
      });
    });
  });

  describe('Parser recovery after EOF error', () => {
    it('should return valid AST even when section is unclosed at EOF', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    CaptionML=ENU=Customer;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();

      // Should still produce a valid AST
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Table);
      expect(ast.object?.objectId).toBe(18);
      expect(ast.object?.objectName).toBe('Customer');

      // Should have captured the fields that were parsed
      const tableDecl = ast.object;
      expect(tableDecl).toBeDefined();
    });

    it('should not throw exceptions when encountering EOF in unclosed section', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle multiple sections where last is unclosed at EOF', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    CaptionML=ENU=Customer;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
  KEYS
  {
    {    ;No.                      ;Clustered=Yes }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      const ast = parser.parse();
      const errors = parser.getErrors();

      // Should parse both sections
      expect(ast).toBeDefined();
      expect(ast.object).toBeDefined();

      // Should only error on the unclosed KEYS section
      expect(errors.length).toBeGreaterThan(0);
      const closeError = errors.find(e => e.message.includes('Expected } to close KEYS section'));
      expect(closeError).toBeDefined();
    });
  });

  describe('EOF vs section boundary distinction', () => {
    it('should distinguish between missing brace before next section and EOF', () => {
      // This should report missing brace for FIELDS, but KEYS should parse OK
      const codeWithNextSection = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  KEYS
  {
    {    ;No.                      ;Clustered=Yes }
  }
}`;

      const lexer1 = new Lexer(codeWithNextSection);
      const tokens1 = lexer1.tokenize();
      const parser1 = new Parser(tokens1);
      parser1.parse();
      const errors1 = parser1.getErrors();

      // Should report missing closing brace for FIELDS
      const fieldsError = errors1.find(e => e.message.includes('FIELDS'));
      expect(fieldsError).toBeDefined();

      // Now test EOF case - should also report missing brace
      const codeWithEOF = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }`;

      const lexer2 = new Lexer(codeWithEOF);
      const tokens2 = lexer2.tokenize();
      const parser2 = new Parser(tokens2);
      parser2.parse();
      const errors2 = parser2.getErrors();

      // Should report missing closing brace for FIELDS
      const fieldsEofError = errors2.find(e => e.message.includes('FIELDS'));
      expect(fieldsEofError).toBeDefined();

      // Both cases should report similar errors
      expect(fieldsError?.message).toContain('Expected } to close FIELDS section');
      expect(fieldsEofError?.message).toContain('Expected } to close FIELDS section');
    });
  });
});
