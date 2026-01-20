/**
 * Lexer Tests - Code Data Type Context-Aware Tokenization
 *
 * Tests that the lexer correctly distinguishes between:
 * - CODE as a section keyword (TokenType.Code)
 * - Code as a data type (TokenType.Code_Type)
 *
 * These tests SHOULD FAIL initially, demonstrating the bug where
 * Code is tokenized as TokenType.Code or Identifier instead of
 * TokenType.Code_Type in variable declarations and return types.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Code Data Type Context-Aware Tokenization', () => {
  describe('Code as data type in VAR sections', () => {
    it('should tokenize Code as Code_Type in global VAR section', () => {
      const code = `OBJECT Codeunit 1 Test {
  VAR
    CustomerCode : Code[20];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the Code token on line 3 (after colon in VAR declaration)
      const codeToken = tokens.find(t => t.value.toUpperCase() === 'CODE' && t.line === 3);
      expect(codeToken).toBeDefined();
      expect(codeToken?.type).toBe(TokenType.Code_Type);
    });

    it('should tokenize Code as Code_Type inside CODE block local VAR', () => {
      const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Code[20];
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the Code token on line 6 (inside VAR section), not line 2 (section keyword)
      const codeTokens = tokens.filter(t => t.value.toUpperCase() === 'CODE');
      expect(codeTokens.length).toBeGreaterThanOrEqual(2); // Section keyword + data type

      const dataTypeToken = codeTokens.find(t => t.line === 6);
      expect(dataTypeToken).toBeDefined();
      expect(dataTypeToken?.type).toBe(TokenType.Code_Type);
    });

    it('should tokenize Code as Code_Type in table VAR section', () => {
      const code = `OBJECT Table 18 Customer {
  VAR
    Status : Code[10];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const codeToken = tokens.find(t => t.value.toUpperCase() === 'CODE' && t.line === 3);
      expect(codeToken).toBeDefined();
      expect(codeToken?.type).toBe(TokenType.Code_Type);
    });
  });

  describe('Code as procedure return type', () => {
    it('should tokenize Code as Code_Type in procedure return type', () => {
      const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE GetStatus@1() : Code[20];
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the Code token on line 4 (return type declaration)
      const codeToken = tokens.find(t => t.value.toUpperCase() === 'CODE' && t.line === 4);
      expect(codeToken).toBeDefined();
      expect(codeToken?.type).toBe(TokenType.Code_Type);
    });

    it('should tokenize Code as Code_Type in function return type', () => {
      const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    LOCAL FUNCTION GetCode@1() ReturnValue : Code[10];
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const codeToken = tokens.find(t => t.value.toUpperCase() === 'CODE' && t.line === 4);
      expect(codeToken).toBeDefined();
      expect(codeToken?.type).toBe(TokenType.Code_Type);
    });
  });

  describe('CODE section keyword should remain Code', () => {
    it('should tokenize CODE as Code (section keyword)', () => {
      const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    OnRun=VAR BEGIN END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the CODE section keyword on line 2
      const codeToken = tokens.find(t => t.value.toUpperCase() === 'CODE' && t.line === 2);
      expect(codeToken).toBeDefined();
      expect(codeToken?.type).toBe(TokenType.Code);
    });

    it('should tokenize CODE as Code in table object', () => {
      const code = `OBJECT Table 18 Customer {
  PROPERTIES
  {
  }
  CODE
  {
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const codeToken = tokens.find(t => t.value.toUpperCase() === 'CODE' && t.line === 5);
      expect(codeToken).toBeDefined();
      expect(codeToken?.type).toBe(TokenType.Code);
    });
  });

  describe('Multiple Code usages in same file', () => {
    it('should tokenize all Code type usages as Code_Type', () => {
      const code = `OBJECT Codeunit 1 Test {
  VAR
    StatusCode : Code[10];
  CODE
  {
    PROCEDURE Foo@1();
    VAR
      LocalCode : Code[20];
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const codeTokens = tokens.filter(t => t.value.toUpperCase() === 'CODE');
      expect(codeTokens.length).toBeGreaterThanOrEqual(3); // 2 types + 1 section

      // Line 3: StatusCode type - should be Code_Type
      const statusCodeType = codeTokens.find(t => t.line === 3);
      expect(statusCodeType).toBeDefined();
      expect(statusCodeType?.type).toBe(TokenType.Code_Type);

      // Line 4: CODE section - should be Code
      const sectionKeyword = codeTokens.find(t => t.line === 4);
      expect(sectionKeyword).toBeDefined();
      expect(sectionKeyword?.type).toBe(TokenType.Code);

      // Line 8: LocalCode type - should be Code_Type
      const localCodeType = codeTokens.find(t => t.line === 8);
      expect(localCodeType).toBeDefined();
      expect(localCodeType?.type).toBe(TokenType.Code_Type);
    });

    it('should handle mixed Code contexts in complex object', () => {
      const code = `OBJECT Table 50000 Test {
  VAR
    GlobalVar : Code[20];
  FIELDS
  {
    { 1 ; ; StatusCode ; Code[10] }
  }
  CODE
  {
    PROCEDURE Test@1(InputCode : Code[30]) : Code[40];
    VAR
      LocalCode : Code[50];
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const codeTokens = tokens.filter(t => t.value.toUpperCase() === 'CODE');

      // All Code occurrences except the CODE section keyword should be Code_Type
      const dataTypes = codeTokens.filter(t => t.type === TokenType.Code_Type);
      const sectionKeywords = codeTokens.filter(t => t.type === TokenType.Code);

      // Should have: GlobalVar, StatusCode field, InputCode param, return type, LocalCode = 5 data types
      // Should have: 1 CODE section keyword
      expect(dataTypes.length).toBe(5);
      expect(sectionKeywords.length).toBe(1);

      // Verify the CODE section keyword is on line 8
      const sectionKeyword = sectionKeywords.find(t => t.line === 8);
      expect(sectionKeyword).toBeDefined();
    });
  });

  describe('Edge cases with Code tokenization', () => {
    it('should tokenize Code after colon in parameter list', () => {
      const code = `PROCEDURE Test@1(VAR Param : Code[20]);`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const codeToken = tokens.find(t => t.value.toUpperCase() === 'CODE');
      expect(codeToken).toBeDefined();
      expect(codeToken?.type).toBe(TokenType.Code_Type);
    });

    it('should tokenize Code in ARRAY variable declaration', () => {
      const code = `VAR
  Codes : ARRAY[10] OF Code[20];`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const codeToken = tokens.find(t => t.value.toUpperCase() === 'CODE');
      expect(codeToken).toBeDefined();
      expect(codeToken?.type).toBe(TokenType.Code_Type);
    });

    it('should tokenize Code followed by bracket in all contexts', () => {
      const code = `OBJECT Codeunit 1 Test {
  VAR
    x : Code[10];
  CODE
  {
    PROCEDURE Foo@1() : Code[20];
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const codeTokens = tokens.filter(t => t.value.toUpperCase() === 'CODE');

      // Find Code tokens followed by bracket
      const codeWithBracket = codeTokens.filter(token => {
        const tokenIndex = tokens.indexOf(token);
        const nextToken = tokens[tokenIndex + 1];
        return nextToken && nextToken.type === TokenType.LeftBracket;
      });

      // Both VAR declaration (line 3) and return type (line 6) should be Code_Type
      expect(codeWithBracket.length).toBe(2);
      codeWithBracket.forEach(token => {
        expect(token.type).toBe(TokenType.Code_Type);
      });
    });
  });
});
