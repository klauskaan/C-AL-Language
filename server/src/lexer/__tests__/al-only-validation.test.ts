/**
 * AL-Only Feature Validation Tests
 *
 * Tests that AL-only features (from modern AL/Business Central) are properly
 * rejected in C/AL code with clear, actionable error messages.
 *
 * AL-only features not supported in C/AL:
 * - Keywords: ENUM, INTERFACE, EXTENDS, MODIFY, IMPLEMENTS
 * - Access modifiers: INTERNAL, PROTECTED, PUBLIC (only LOCAL is valid)
 * - Ternary operator: ? :
 * - Preprocessor directives: #if, #else, #endif
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';
import { Parser, ParseError } from '../../parser/parser';

/**
 * Helper to simulate what the server does: parse code and convert errors to diagnostics
 */
function getParseErrors(code: string): ParseError[] {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  parser.parse();
  return parser.getErrors();
}

describe('AL-Only Feature Validation', () => {
  describe('AL-only keywords', () => {
    describe('ENUM keyword rejection', () => {
      it('should reject ENUM keyword with clear error', () => {
        const code = `ENUM 50000 MyEnum { }`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain("AL-only keyword 'ENUM'");
        expect(errors[0].message).toContain('not supported in C/AL');
      });

      it('should tokenize ENUM as ALOnlyKeyword', () => {
        const lexer = new Lexer('ENUM');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[0].value).toBe('ENUM');
      });
    });

    describe('INTERFACE keyword rejection', () => {
      it('should reject INTERFACE keyword with clear error', () => {
        const code = `INTERFACE IMyInterface { }`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain("AL-only keyword 'INTERFACE'");
        expect(errors[0].message).toContain('not supported in C/AL');
      });

      it('should tokenize INTERFACE as ALOnlyKeyword', () => {
        const lexer = new Lexer('INTERFACE');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[0].value).toBe('INTERFACE');
      });
    });

    describe('EXTENDS keyword rejection', () => {
      it('should reject EXTENDS keyword with clear error', () => {
        const code = `TABLEEXTENSION 50000 MyExtension EXTENDS "Customer" { }`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        // EXTENDS should appear in errors
        const extendsError = errors.find(e => e.message.includes("'EXTENDS'"));
        expect(extendsError).toBeDefined();
        expect(extendsError!.message).toContain('not supported in C/AL');
      });

      it('should tokenize EXTENDS as ALOnlyKeyword', () => {
        const lexer = new Lexer('EXTENDS');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[0].value).toBe('EXTENDS');
      });
    });

    describe('MODIFY keyword rejection', () => {
      it('should reject MODIFY keyword with clear error', () => {
        const code = `MODIFY CustomerCard { }`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain("AL-only keyword 'MODIFY'");
        expect(errors[0].message).toContain('not supported in C/AL');
      });

      it('should tokenize MODIFY as ALOnlyKeyword', () => {
        const lexer = new Lexer('MODIFY');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[0].value).toBe('MODIFY');
      });
    });

    describe('IMPLEMENTS keyword rejection', () => {
      it('should reject IMPLEMENTS keyword with clear error', () => {
        const code = `CODEUNIT 50000 MyCodeunit IMPLEMENTS IMyInterface { }`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        // IMPLEMENTS should appear in errors
        const implementsError = errors.find(e => e.message.includes("'IMPLEMENTS'"));
        expect(implementsError).toBeDefined();
        expect(implementsError!.message).toContain('not supported in C/AL');
      });

      it('should tokenize IMPLEMENTS as ALOnlyKeyword', () => {
        const lexer = new Lexer('IMPLEMENTS');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[0].value).toBe('IMPLEMENTS');
      });
    });

    describe('All AL-only keywords recognition', () => {
      const alOnlyKeywords = ['ENUM', 'INTERFACE', 'EXTENDS', 'MODIFY', 'IMPLEMENTS'];

      it.each(alOnlyKeywords)('should recognize %s as AL-only keyword', (keyword) => {
        const lexer = new Lexer(keyword);
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[0].value).toBe(keyword);
      });

      it.each(alOnlyKeywords)('should reject %s with appropriate error', (keyword) => {
        const code = `${keyword} Test { }`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const keywordError = errors.find(e => e.message.includes(`'${keyword}'`));
        expect(keywordError).toBeDefined();
        expect(keywordError!.message).toContain('AL-only keyword');
        expect(keywordError!.message).toContain('not supported in C/AL');
      });
    });

    describe('Case insensitivity', () => {
      it('should reject ENUM regardless of case', () => {
        const variants = ['ENUM', 'enum', 'Enum', 'eNuM'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        }
      });

      it('should reject INTERFACE regardless of case', () => {
        const variants = ['INTERFACE', 'interface', 'Interface', 'iNtErFaCe'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        }
      });

      it('should reject EXTENDS regardless of case', () => {
        const variants = ['EXTENDS', 'extends', 'Extends', 'eXtEnDs'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        }
      });

      it('should reject MODIFY regardless of case', () => {
        const variants = ['MODIFY', 'modify', 'Modify', 'mOdIfY'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        }
      });

      it('should reject IMPLEMENTS regardless of case', () => {
        const variants = ['IMPLEMENTS', 'implements', 'Implements', 'iMpLeMeNtS'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        }
      });

      it('should preserve original case in token value', () => {
        const code = 'eNuM';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[0].value).toBe('eNuM'); // Original case preserved
      });
    });

    describe('Error message quality', () => {
      it('should include keyword name in error message', () => {
        const code = 'ENUM Test { }';
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain("'ENUM'");
      });

      it('should mention C/AL in error message', () => {
        const code = 'INTERFACE Test { }';
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('C/AL');
      });

      it('should indicate the feature is AL-only', () => {
        const code = 'EXTENDS Test';
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('AL-only');
      });
    });

    describe('Error recovery', () => {
      it('should continue parsing after AL-only keyword error', () => {
        const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
  CODE
  {
    ENUM Test { }
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        // Parser should not crash
        expect(() => getParseErrors(code)).not.toThrow();
      });

      it('should report multiple AL-only keyword errors', () => {
        const code = `ENUM First { }
INTERFACE Second { }
MODIFY Third { }`;
        const errors = getParseErrors(code);

        // Should have multiple AL-only errors
        const alOnlyErrors = errors.filter(e => e.message.includes('AL-only keyword'));
        expect(alOnlyErrors.length).toBeGreaterThanOrEqual(3);
      });
    });
  });
});
