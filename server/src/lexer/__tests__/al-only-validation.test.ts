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
        // Use EXTENDS at the start to ensure it's detected
        const code = `EXTENDS "Customer" { }`;
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
        // Use IMPLEMENTS at the start to ensure it's detected
        const code = `IMPLEMENTS IMyInterface { }`;
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
        // Use consecutive AL-only keywords that the parser will scan through
        const code = `ENUM INTERFACE MODIFY`;
        const errors = getParseErrors(code);

        // Should have multiple AL-only errors - parser scans consecutive AL-only tokens
        const alOnlyErrors = errors.filter(e => e.message.includes('AL-only keyword'));
        expect(alOnlyErrors.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('AL-only access modifiers', () => {
    describe('INTERNAL access modifier rejection', () => {
      it('should reject INTERNAL access modifier with clear error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    INTERNAL PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const internalError = errors.find(e => e.message.includes("'INTERNAL'"));
        expect(internalError).toBeDefined();
        expect(internalError!.message).toContain('AL-only access modifier');
        expect(internalError!.message).toContain('not supported in C/AL');
      });

      it('should tokenize INTERNAL as ALOnlyAccessModifier', () => {
        const lexer = new Lexer('INTERNAL');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyAccessModifier);
        expect(tokens[0].value).toBe('INTERNAL');
      });
    });

    describe('PROTECTED access modifier rejection', () => {
      it('should reject PROTECTED access modifier with clear error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROTECTED PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const protectedError = errors.find(e => e.message.includes("'PROTECTED'"));
        expect(protectedError).toBeDefined();
        expect(protectedError!.message).toContain('AL-only access modifier');
        expect(protectedError!.message).toContain('not supported in C/AL');
      });

      it('should tokenize PROTECTED as ALOnlyAccessModifier', () => {
        const lexer = new Lexer('PROTECTED');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyAccessModifier);
        expect(tokens[0].value).toBe('PROTECTED');
      });
    });

    describe('PUBLIC access modifier rejection', () => {
      it('should reject PUBLIC access modifier with clear error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PUBLIC PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const publicError = errors.find(e => e.message.includes("'PUBLIC'"));
        expect(publicError).toBeDefined();
        expect(publicError!.message).toContain('AL-only access modifier');
        expect(publicError!.message).toContain('not supported in C/AL');
      });

      it('should tokenize PUBLIC as ALOnlyAccessModifier', () => {
        const lexer = new Lexer('PUBLIC');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyAccessModifier);
        expect(tokens[0].value).toBe('PUBLIC');
      });
    });

    describe('All AL-only access modifiers recognition', () => {
      const alOnlyAccessModifiers = ['INTERNAL', 'PROTECTED', 'PUBLIC'];

      it.each(alOnlyAccessModifiers)('should recognize %s as AL-only access modifier', (modifier) => {
        const lexer = new Lexer(modifier);
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyAccessModifier);
        expect(tokens[0].value).toBe(modifier);
      });

      it.each(alOnlyAccessModifiers)('should reject %s with appropriate error', (modifier) => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    ${modifier} PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const modifierError = errors.find(e => e.message.includes(`'${modifier}'`));
        expect(modifierError).toBeDefined();
        expect(modifierError!.message).toContain('AL-only access modifier');
        expect(modifierError!.message).toContain('not supported in C/AL');
      });
    });

    describe('LOCAL access modifier acceptance', () => {
      it('should accept LOCAL as valid C/AL access modifier', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    LOCAL PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        // Should not have any AL-only access modifier errors
        const accessModifierErrors = errors.filter(e => e.message.includes('AL-only access modifier'));
        expect(accessModifierErrors.length).toBe(0);
      });

      it('should tokenize LOCAL as Local keyword (not ALOnlyAccessModifier)', () => {
        const lexer = new Lexer('LOCAL');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.Local);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyAccessModifier);
        expect(tokens[0].value).toBe('LOCAL');
      });

      it('should parse LOCAL procedure without access modifier errors', () => {
        const code = `LOCAL PROCEDURE MyProc@1();
BEGIN
END;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Verify LOCAL is tokenized correctly
        const localToken = tokens.find(t => t.value.toUpperCase() === 'LOCAL');
        expect(localToken).toBeDefined();
        expect(localToken!.type).toBe(TokenType.Local);
      });
    });

    describe('Case insensitivity for access modifiers', () => {
      it('should reject INTERNAL regardless of case', () => {
        const variants = ['INTERNAL', 'internal', 'Internal', 'iNtErNaL'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyAccessModifier);
        }
      });

      it('should reject PROTECTED regardless of case', () => {
        const variants = ['PROTECTED', 'protected', 'Protected', 'pRoTeCtEd'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyAccessModifier);
        }
      });

      it('should reject PUBLIC regardless of case', () => {
        const variants = ['PUBLIC', 'public', 'Public', 'pUbLiC'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyAccessModifier);
        }
      });

      it('should accept LOCAL regardless of case', () => {
        const variants = ['LOCAL', 'local', 'Local', 'lOcAl'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.Local);
          expect(tokens[0].type).not.toBe(TokenType.ALOnlyAccessModifier);
        }
      });

      it('should preserve original case in token value', () => {
        const code = 'iNtErNaL';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.ALOnlyAccessModifier);
        expect(tokens[0].value).toBe('iNtErNaL'); // Original case preserved
      });
    });

    describe('Error message quality for access modifiers', () => {
      it('should suggest using LOCAL instead', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    INTERNAL PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const internalError = errors.find(e => e.message.includes("'INTERNAL'"));
        expect(internalError).toBeDefined();
        expect(internalError!.message).toContain('Use LOCAL instead');
      });

      it('should mention C/AL in error message', () => {
        const code = `PUBLIC PROCEDURE Test();`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const publicError = errors.find(e => e.message.includes('PUBLIC'));
        expect(publicError).toBeDefined();
        expect(publicError!.message).toContain('C/AL');
      });

      it('should indicate the feature is AL-only', () => {
        const code = `PROTECTED PROCEDURE Test();`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const protectedError = errors.find(e => e.message.includes('PROTECTED'));
        expect(protectedError).toBeDefined();
        expect(protectedError!.message).toContain('AL-only');
      });
    });

    describe('Error recovery for access modifiers', () => {
      it('should continue parsing after AL-only access modifier error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    INTERNAL PROCEDURE First@1();
    BEGIN
    END;

    LOCAL PROCEDURE Second@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        // Parser should not crash
        expect(() => getParseErrors(code)).not.toThrow();
      });

      it('should report multiple AL-only access modifier errors', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    INTERNAL PROCEDURE First@1();
    BEGIN
    END;

    PROTECTED PROCEDURE Second@2();
    BEGIN
    END;

    PUBLIC PROCEDURE Third@3();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);

        // Should have multiple AL-only access modifier errors
        const accessModifierErrors = errors.filter(e => e.message.includes('AL-only access modifier'));
        expect(accessModifierErrors.length).toBeGreaterThanOrEqual(3);
      });

      it('should handle mix of AL-only keywords and access modifiers', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    INTERNAL PROCEDURE First@1();
    BEGIN
      ENUM Test { }
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);

        // Should have both types of errors
        const accessModifierErrors = errors.filter(e => e.message.includes('AL-only access modifier'));
        const keywordErrors = errors.filter(e => e.message.includes('AL-only keyword'));

        expect(accessModifierErrors.length).toBeGreaterThanOrEqual(1);
        expect(keywordErrors.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Ternary operator rejection', () => {
    describe('Ternary operator (? :) tokenization', () => {
      it('should tokenize ? as TernaryOperator', () => {
        const lexer = new Lexer('?');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.TernaryOperator);
        expect(tokens[0].value).toBe('?');
      });

      it('should tokenize ? in expression context', () => {
        const code = 'x ? y : z';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const questionToken = tokens.find(t => t.value === '?');
        expect(questionToken).toBeDefined();
        expect(questionToken!.type).toBe(TokenType.TernaryOperator);
      });

      it('should tokenize conditional-like ternary expression', () => {
        const code = 'condition ? trueValue : falseValue';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const questionToken = tokens.find(t => t.value === '?');
        expect(questionToken).toBeDefined();
        expect(questionToken!.type).toBe(TokenType.TernaryOperator);
      });
    });

    describe('Ternary operator parser rejection', () => {
      it('should reject ternary operator with clear error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Result@1 : Integer;
      Condition@2 : Boolean;
    BEGIN
      Result := Condition ? 1 : 0;
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const ternaryError = errors.find(e => e.message.includes('ternary') || e.message.includes('?'));
        expect(ternaryError).toBeDefined();
        expect(ternaryError!.message).toContain('not supported in C/AL');
      });

      it('should indicate ternary is AL-only', () => {
        // Use ? at the start so it's detected immediately
        const code = '?';
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const ternaryError = errors.find(e => e.message.includes('ternary'));
        expect(ternaryError).toBeDefined();
        expect(ternaryError!.message).toContain('AL-only');
      });

      it('should suggest using IF-THEN-ELSE instead', () => {
        // Use ? at the start so it's detected immediately
        const code = '?';
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const ternaryError = errors.find(e => e.message.includes('ternary'));
        expect(ternaryError).toBeDefined();
        expect(ternaryError!.message).toContain('IF-THEN-ELSE');
      });
    });

    describe('Ternary operator in various contexts', () => {
      it('should reject ternary in assignment', () => {
        const code = 'result := a > b ? a : b;';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const questionToken = tokens.find(t => t.value === '?');
        expect(questionToken).toBeDefined();
        expect(questionToken!.type).toBe(TokenType.TernaryOperator);
      });

      it('should reject ternary in function call argument', () => {
        const code = 'MyFunc(x > 0 ? x : -x);';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const questionToken = tokens.find(t => t.value === '?');
        expect(questionToken).toBeDefined();
        expect(questionToken!.type).toBe(TokenType.TernaryOperator);
      });

      it('should reject nested ternary operators', () => {
        const code = 'a ? b ? c : d : e';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const questionTokens = tokens.filter(t => t.value === '?');
        expect(questionTokens.length).toBe(2);
        questionTokens.forEach(token => {
          expect(token.type).toBe(TokenType.TernaryOperator);
        });
      });
    });

    describe('Error recovery for ternary operator', () => {
      it('should continue parsing after ternary operator error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      x := a ? b : c;
    END;

    PROCEDURE AnotherProc@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        // Parser should not crash
        expect(() => getParseErrors(code)).not.toThrow();
      });

      it('should report multiple ternary operator errors', () => {
        // Test with consecutive ternary operators that the parser will scan
        const code = `? ? ?`;
        const errors = getParseErrors(code);

        // Should have multiple ternary errors - parser scans consecutive AL-only tokens
        const ternaryErrors = errors.filter(e => e.message.includes('ternary'));
        expect(ternaryErrors.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Preprocessor directive rejection', () => {
    describe('#if directive tokenization', () => {
      it('should tokenize #if as PreprocessorDirective', () => {
        const lexer = new Lexer('#if');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.PreprocessorDirective);
        expect(tokens[0].value).toBe('#if');
      });

      it('should tokenize #if with condition', () => {
        const code = '#if CLEAN23';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.PreprocessorDirective);
        expect(tokens[0].value).toBe('#if');
      });
    });

    describe('#else directive tokenization', () => {
      it('should tokenize #else as PreprocessorDirective', () => {
        const lexer = new Lexer('#else');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.PreprocessorDirective);
        expect(tokens[0].value).toBe('#else');
      });
    });

    describe('#endif directive tokenization', () => {
      it('should tokenize #endif as PreprocessorDirective', () => {
        const lexer = new Lexer('#endif');
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.PreprocessorDirective);
        expect(tokens[0].value).toBe('#endif');
      });
    });

    describe('Preprocessor directive parser rejection', () => {
      it('should reject #if directive with clear error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      #if CLEAN23
        DoSomething;
      #endif
    END;

    BEGIN
    END.
  }
}`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const preprocessorError = errors.find(e => e.message.includes('#if') || e.message.includes('preprocessor'));
        expect(preprocessorError).toBeDefined();
        expect(preprocessorError!.message).toContain('not supported in C/AL');
      });

      it('should reject #else directive with clear error', () => {
        // Use #else at the start to ensure it's detected
        const code = `#else`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const elseError = errors.find(e => e.message.includes('#else') || e.message.includes('preprocessor'));
        expect(elseError).toBeDefined();
      });

      it('should reject #endif directive with clear error', () => {
        // Use #endif at the start to ensure it's detected
        const code = `#endif`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const endifError = errors.find(e => e.message.includes('#endif') || e.message.includes('preprocessor'));
        expect(endifError).toBeDefined();
      });

      it('should indicate preprocessor directives are AL-only', () => {
        const code = '#if CLEAN23';
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const preprocessorError = errors.find(e => e.message.includes('preprocessor') || e.message.includes('#if'));
        expect(preprocessorError).toBeDefined();
        expect(preprocessorError!.message).toContain('AL-only');
      });
    });

    describe('All preprocessor directives recognition', () => {
      const preprocessorDirectives = ['#if', '#else', '#endif'];

      it.each(preprocessorDirectives)('should recognize %s as preprocessor directive', (directive) => {
        const lexer = new Lexer(directive);
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.PreprocessorDirective);
        expect(tokens[0].value).toBe(directive);
      });

      it.each(preprocessorDirectives)('should reject %s with appropriate error', (directive) => {
        const code = `${directive} CONDITION`;
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        const directiveError = errors.find(e =>
          e.message.includes(`'${directive}'`) ||
          e.message.includes('preprocessor')
        );
        expect(directiveError).toBeDefined();
        expect(directiveError!.message).toContain('AL-only');
        expect(directiveError!.message).toContain('not supported in C/AL');
      });
    });

    describe('Case sensitivity for preprocessor directives', () => {
      it('should recognize #IF regardless of case', () => {
        const variants = ['#if', '#IF', '#If', '#iF'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.PreprocessorDirective);
        }
      });

      it('should recognize #ELSE regardless of case', () => {
        const variants = ['#else', '#ELSE', '#Else', '#eLsE'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.PreprocessorDirective);
        }
      });

      it('should recognize #ENDIF regardless of case', () => {
        const variants = ['#endif', '#ENDIF', '#Endif', '#eNdIf'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.PreprocessorDirective);
        }
      });

      it('should preserve original case in token value', () => {
        const code = '#eLsE';
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        expect(tokens[0].type).toBe(TokenType.PreprocessorDirective);
        expect(tokens[0].value).toBe('#eLsE'); // Original case preserved
      });
    });

    describe('Preprocessor block detection', () => {
      it('should detect complete #if/#endif block', () => {
        const code = `#if CLEAN23
// some code
#endif`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const preprocessorTokens = tokens.filter(t => t.type === TokenType.PreprocessorDirective);
        expect(preprocessorTokens.length).toBe(2);
        expect(preprocessorTokens[0].value.toLowerCase()).toBe('#if');
        expect(preprocessorTokens[1].value.toLowerCase()).toBe('#endif');
      });

      it('should detect complete #if/#else/#endif block', () => {
        const code = `#if CLEAN23
// some code
#else
// other code
#endif`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const preprocessorTokens = tokens.filter(t => t.type === TokenType.PreprocessorDirective);
        expect(preprocessorTokens.length).toBe(3);
        expect(preprocessorTokens[0].value.toLowerCase()).toBe('#if');
        expect(preprocessorTokens[1].value.toLowerCase()).toBe('#else');
        expect(preprocessorTokens[2].value.toLowerCase()).toBe('#endif');
      });

      it('should detect nested preprocessor blocks', () => {
        const code = `#if OUTER
  #if INNER
    code
  #endif
#endif`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const preprocessorTokens = tokens.filter(t => t.type === TokenType.PreprocessorDirective);
        expect(preprocessorTokens.length).toBe(4);
      });
    });

    describe('Error recovery for preprocessor directives', () => {
      it('should continue parsing after preprocessor directive error', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    BEGIN
      #if CLEAN23
        DoSomething;
      #endif
    END;

    PROCEDURE AnotherProc@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
        // Parser should not crash
        expect(() => getParseErrors(code)).not.toThrow();
      });

      it('should report multiple preprocessor directive errors', () => {
        // Use consecutive preprocessor directives that the parser will scan
        const code = `#if #else #endif`;
        const errors = getParseErrors(code);

        // Should have multiple preprocessor errors - parser scans consecutive AL-only tokens
        const preprocessorErrors = errors.filter(e =>
          e.message.includes('preprocessor')
        );
        expect(preprocessorErrors.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('edge cases', () => {
    describe('case insensitivity', () => {
      const alOnlyKeywords = ['ENUM', 'INTERFACE', 'EXTENDS', 'MODIFY', 'IMPLEMENTS'];

      it.each(alOnlyKeywords)('should recognize %s in any case variation', (keyword) => {
        const variants = [
          keyword.toUpperCase(),
          keyword.toLowerCase(),
          keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase(),
          keyword.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('')
        ];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        }
      });

      it('should preserve original case in token value for AL-only keywords', () => {
        const variants = ['eNuM', 'InTeRfAcE', 'ExTeNdS', 'MoDiFy', 'ImPlEmEnTs'];

        for (const variant of variants) {
          const lexer = new Lexer(variant);
          const tokens = lexer.tokenize();
          expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
          expect(tokens[0].value).toBe(variant); // Original case preserved
        }
      });

      it('should preserve original case in error messages', () => {
        const code = 'eNuM Test { }';
        const errors = getParseErrors(code);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain("'eNuM'");
      });
    });

    describe('AL keywords in comments not rejected', () => {
      it('should not reject ENUM inside line comment', () => {
        const code = `// This is ENUM comment
x := 5;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Should have: identifier, :=, integer, semicolon, EOF
        // No ALOnlyKeyword token should exist
        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject INTERFACE inside line comment', () => {
        const code = `// TODO: INTERFACE definition needed
MyProc();`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject EXTENDS inside line comment', () => {
        const code = `// This EXTENDS the base class
someVar := 1;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject MODIFY inside line comment', () => {
        const code = `// MODIFY this later
result := 42;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject IMPLEMENTS inside line comment', () => {
        const code = `// This IMPLEMENTS the interface
DoSomething();`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject AL-only keywords inside block comment in CODE block', () => {
        const code = `BEGIN { ENUM INTERFACE EXTENDS MODIFY IMPLEMENTS } END`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject multiple AL-only keywords in comments', () => {
        const code = `// ENUM values: INTERFACE, EXTENDS, MODIFY, IMPLEMENTS
x := 1;
// More ENUM stuff
y := 2;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject preprocessor directives inside comments', () => {
        const code = `// #if CLEAN23 - this is commented out
x := 1;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const preprocessorTokens = tokens.filter(t => t.type === TokenType.PreprocessorDirective);
        expect(preprocessorTokens.length).toBe(0);
      });

      it('should not reject access modifiers inside comments', () => {
        const code = `// INTERNAL PROTECTED PUBLIC access modifiers
LOCAL PROCEDURE Test@1();
BEGIN
END;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const accessModifierTokens = tokens.filter(t => t.type === TokenType.ALOnlyAccessModifier);
        expect(accessModifierTokens.length).toBe(0);
      });
    });

    describe('AL keywords in strings not rejected', () => {
      it('should not reject ENUM inside string literal', () => {
        const code = `MESSAGE('This is an ENUM value');`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject INTERFACE inside string literal', () => {
        const code = `MyText := 'INTERFACE definition';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject EXTENDS inside string literal', () => {
        const code = `ERROR('Class EXTENDS base');`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject MODIFY inside string literal', () => {
        const code = `Description := 'MODIFY record';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject IMPLEMENTS inside string literal', () => {
        const code = `Label := 'IMPLEMENTS interface';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject all AL-only keywords inside single string', () => {
        const code = `MESSAGE('ENUM INTERFACE EXTENDS MODIFY IMPLEMENTS');`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should not reject preprocessor directives inside strings', () => {
        const code = `Text := '#if #else #endif';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const preprocessorTokens = tokens.filter(t => t.type === TokenType.PreprocessorDirective);
        expect(preprocessorTokens.length).toBe(0);
      });

      it('should not reject access modifiers inside strings', () => {
        const code = `Label := 'INTERNAL PROTECTED PUBLIC';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const accessModifierTokens = tokens.filter(t => t.type === TokenType.ALOnlyAccessModifier);
        expect(accessModifierTokens.length).toBe(0);
      });

      it('should not reject ternary operator characters inside strings', () => {
        const code = `Text := 'condition ? true : false';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const ternaryTokens = tokens.filter(t => t.type === TokenType.TernaryOperator);
        expect(ternaryTokens.length).toBe(0);
      });
    });

    describe('quoted identifiers allowed', () => {
      it('should allow "ENUM" as quoted identifier', () => {
        const code = `"ENUM" := 'value';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
        expect(tokens[0].value).toBe('ENUM');

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should allow "INTERFACE" as quoted identifier', () => {
        const code = `"INTERFACE" := 'value';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
        expect(tokens[0].value).toBe('INTERFACE');

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should allow "EXTENDS" as quoted identifier', () => {
        const code = `"EXTENDS" := 'value';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
        expect(tokens[0].value).toBe('EXTENDS');

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should allow "MODIFY" as quoted identifier', () => {
        const code = `"MODIFY" := 'value';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
        expect(tokens[0].value).toBe('MODIFY');

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should allow "IMPLEMENTS" as quoted identifier', () => {
        const code = `"IMPLEMENTS" := 'value';`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
        expect(tokens[0].value).toBe('IMPLEMENTS');

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should allow "INTERNAL" as quoted identifier', () => {
        const code = `"INTERNAL" := TRUE;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
        expect(tokens[0].value).toBe('INTERNAL');

        const accessModifierTokens = tokens.filter(t => t.type === TokenType.ALOnlyAccessModifier);
        expect(accessModifierTokens.length).toBe(0);
      });

      it('should allow "PROTECTED" as quoted identifier', () => {
        const code = `"PROTECTED" := FALSE;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
        expect(tokens[0].value).toBe('PROTECTED');

        const accessModifierTokens = tokens.filter(t => t.type === TokenType.ALOnlyAccessModifier);
        expect(accessModifierTokens.length).toBe(0);
      });

      it('should allow "PUBLIC" as quoted identifier', () => {
        const code = `"PUBLIC" := 1;`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
        expect(tokens[0].value).toBe('PUBLIC');

        const accessModifierTokens = tokens.filter(t => t.type === TokenType.ALOnlyAccessModifier);
        expect(accessModifierTokens.length).toBe(0);
      });

      it('should allow quoted identifiers with AL-only keywords in field context', () => {
        const code = `CALCFIELDS("ENUM Value", "INTERFACE Name");`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const quotedIdentifiers = tokens.filter(t => t.type === TokenType.QuotedIdentifier);
        expect(quotedIdentifiers.length).toBe(2);
        expect(quotedIdentifiers[0].value).toBe('ENUM Value');
        expect(quotedIdentifiers[1].value).toBe('INTERFACE Name');

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });

      it('should allow mixed case AL-only keywords in quoted identifiers', () => {
        const code = `"Enum" + "interface" + "Extends"`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const quotedIdentifiers = tokens.filter(t => t.type === TokenType.QuotedIdentifier);
        expect(quotedIdentifiers.length).toBe(3);

        const alOnlyTokens = tokens.filter(t => t.type === TokenType.ALOnlyKeyword);
        expect(alOnlyTokens.length).toBe(0);
      });
    });

    describe('partial matches not rejected', () => {
      it('should not reject ENUMERATE (contains ENUM)', () => {
        const code = `ENUMERATE`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject ENUMERATION (contains ENUM)', () => {
        const code = `ENUMERATION`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject INTERFACING (contains INTERFACE)', () => {
        const code = `INTERFACING`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject EXTENDABLE (contains EXTEND)', () => {
        const code = `EXTENDABLE`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject MODIFIER (contains MODIFY)', () => {
        const code = `MODIFIER`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject MODIFYING (contains MODIFY)', () => {
        const code = `MODIFYING`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject IMPLEMENTATION (contains IMPLEMENT)', () => {
        const code = `IMPLEMENTATION`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject IMPLEMENTING (contains IMPLEMENT)', () => {
        const code = `IMPLEMENTING`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject INTERNALLY (contains INTERNAL)', () => {
        const code = `INTERNALLY`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyAccessModifier);
      });

      it('should not reject PROTECTED_FLAG (contains PROTECTED)', () => {
        const code = `PROTECTED_FLAG`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyAccessModifier);
      });

      it('should not reject PUBLICITY (contains PUBLIC)', () => {
        const code = `PUBLICITY`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyAccessModifier);
      });

      it('should not reject prefixed keywords like MYENUM', () => {
        const code = `MYENUM`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject suffixed keywords like ENUM123', () => {
        const code = `ENUM123`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should not reject underscored keywords like ENUM_VALUE', () => {
        const code = `ENUM_VALUE`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.Identifier);
        expect(tokens[0].type).not.toBe(TokenType.ALOnlyKeyword);
      });

      it('should still reject exact matches with surrounding whitespace', () => {
        const code = `  ENUM  `;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[0].value).toBe('ENUM');
      });

      it('should reject exact match even if followed by operators', () => {
        const code = `ENUM+INTERFACE`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        expect(tokens[0].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[0].value).toBe('ENUM');
        expect(tokens[1].type).toBe(TokenType.Plus);
        expect(tokens[2].type).toBe(TokenType.ALOnlyKeyword);
        expect(tokens[2].value).toBe('INTERFACE');
      });
    });
  });
});
