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

  describe('Date/Time/Boolean keywords in code context', () => {
    describe('Member expressions (PRIMARY BUG - should FAIL initially)', () => {
      it('should tokenize Date after dot as Identifier, not Date_Type', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      RecCustomer : Record 18;
    BEGIN
      RecCustomer.Date := TODAY;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Find the Date token after the dot on line 8
        const dateToken = tokens.find(t => t.value.toUpperCase() === 'DATE' && t.line === 8);
        expect(dateToken).toBeDefined();
        expect(dateToken?.type).toBe(TokenType.Identifier); // Should be Identifier, not Date_Type
      });

      it('should tokenize Time after dot as Identifier, not Time_Type', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      RecVar : Record 50000;
    BEGIN
      RecVar.Time := TIME;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Find the Time token after the dot on line 8
        const timeToken = tokens.find(t => t.value.toUpperCase() === 'TIME' && t.line === 8);
        expect(timeToken).toBeDefined();
        expect(timeToken?.type).toBe(TokenType.Identifier); // Should be Identifier, not Time_Type
      });

      it('should tokenize Boolean after dot as Identifier, not Boolean keyword', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      RecItem : Record 27;
    BEGIN
      RecItem.Boolean := TRUE;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Find the Boolean token after the dot on line 8
        const booleanToken = tokens.find(t => t.value.toUpperCase() === 'BOOLEAN' && t.line === 8);
        expect(booleanToken).toBeDefined();
        expect(booleanToken?.type).toBe(TokenType.Identifier); // Should be Identifier, not Boolean
      });

      it('should handle multiple member accesses with Date/Time/Boolean', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Rec : Record 18;
    BEGIN
      Rec.Date := TODAY;
      Rec.Time := TIME;
      Rec.Boolean := TRUE;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // All Date/Time/Boolean after dots should be Identifiers
        const dateToken = tokens.find(t => t.value.toUpperCase() === 'DATE' && t.line === 8);
        expect(dateToken?.type).toBe(TokenType.Identifier);

        const timeToken = tokens.find(t => t.value.toUpperCase() === 'TIME' && t.line === 9);
        expect(timeToken?.type).toBe(TokenType.Identifier);

        const booleanToken = tokens.find(t => t.value.toUpperCase() === 'BOOLEAN' && t.line === 10);
        expect(booleanToken?.type).toBe(TokenType.Identifier);
      });
    });

    describe('WITH-DO blocks (should FAIL initially)', () => {
      it('should tokenize Date in WITH-DO as Identifier', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Rec : Record 18;
    BEGIN
      WITH Rec DO BEGIN
        Date := TODAY;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Find the Date token on line 9 (inside WITH-DO block)
        const dateToken = tokens.find(t => t.value.toUpperCase() === 'DATE' && t.line === 9);
        expect(dateToken).toBeDefined();
        expect(dateToken?.type).toBe(TokenType.Identifier); // Should be Identifier in WITH-DO
      });

      it('should tokenize Time in WITH-DO as Identifier', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Rec : Record 50000;
    BEGIN
      WITH Rec DO BEGIN
        Time := TIME;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const timeToken = tokens.find(t => t.value.toUpperCase() === 'TIME' && t.line === 9);
        expect(timeToken).toBeDefined();
        expect(timeToken?.type).toBe(TokenType.Identifier);
      });

      it('should tokenize Boolean in WITH-DO as Identifier', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Rec : Record 27;
    BEGIN
      WITH Rec DO BEGIN
        Boolean := FALSE;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const booleanToken = tokens.find(t => t.value.toUpperCase() === 'BOOLEAN' && t.line === 9);
        expect(booleanToken).toBeDefined();
        expect(booleanToken?.type).toBe(TokenType.Identifier);
      });
    });

    describe('CASE blocks (should FAIL initially)', () => {
      it('should tokenize Date as CASE label Identifier', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        Date : MESSAGE('Date case');
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Find the Date token on line 9 (CASE label)
        const dateToken = tokens.find(t => t.value.toUpperCase() === 'DATE' && t.line === 9);
        expect(dateToken).toBeDefined();
        expect(dateToken?.type).toBe(TokenType.Identifier); // Should be Identifier as case label
      });

      it('should classify Date as identifier after case label colon: 1 : Date := TODAY', () => {
        // Test pattern: CASE x OF 1 : Date := TODAY; END;
        // Date after the case label colon should be Identifier, not Date_Type
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
      Date : Date;
    BEGIN
      CASE x OF
        1 : Date := TODAY;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Find the Date token on line 10 (after case label colon "1 :")
        // This is the field/variable name being assigned, not a type declaration
        const dateTokens = tokens.filter(t => t.value.toUpperCase() === 'DATE');

        // First Date on line 7 is the type declaration (should be Date_Type)
        const declarationDate = dateTokens.find(t => t.line === 7);
        expect(declarationDate).toBeDefined();
        expect(declarationDate?.type).toBe(TokenType.Date_Type);

        // Second Date on line 10 is after case label colon (should be Identifier)
        const caseDate = dateTokens.find(t => t.line === 10);
        expect(caseDate).toBeDefined();
        expect(caseDate?.type).toBe(TokenType.Identifier);
      });

      it('should tokenize Time as CASE label Identifier', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        Time : MESSAGE('Time case');
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const timeToken = tokens.find(t => t.value.toUpperCase() === 'TIME' && t.line === 9);
        expect(timeToken).toBeDefined();
        expect(timeToken?.type).toBe(TokenType.Identifier);
      });

      it('should tokenize Boolean as CASE label Identifier', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        Boolean : MESSAGE('Boolean case');
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const booleanToken = tokens.find(t => t.value.toUpperCase() === 'BOOLEAN' && t.line === 9);
        expect(booleanToken).toBeDefined();
        expect(booleanToken?.type).toBe(TokenType.Identifier);
      });
    });

    describe('CRITICAL: Declarations MUST still work (should PASS before AND after)', () => {
      it('should tokenize Date as Date_Type in VAR declaration inside CODE block', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      myVar : Date;
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Find the Date token on line 6 (after colon in VAR)
        const dateToken = tokens.find(t => t.value.toUpperCase() === 'DATE' && t.line === 6);
        expect(dateToken).toBeDefined();
        expect(dateToken?.type).toBe(TokenType.Date_Type); // MUST remain Date_Type
      });

      it('should tokenize Time as Time_Type in VAR declaration inside CODE block', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      t : Time;
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const timeToken = tokens.find(t => t.value.toUpperCase() === 'TIME' && t.line === 6);
        expect(timeToken).toBeDefined();
        expect(timeToken?.type).toBe(TokenType.Time_Type); // MUST remain Time_Type
      });

      it('should tokenize Boolean as Boolean in VAR declaration inside CODE block', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      flag : Boolean;
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const booleanToken = tokens.find(t => t.value.toUpperCase() === 'BOOLEAN' && t.line === 6);
        expect(booleanToken).toBeDefined();
        expect(booleanToken?.type).toBe(TokenType.Boolean); // MUST remain Boolean
      });

      it('should tokenize Boolean in ARRAY OF declaration', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      flags : ARRAY[10] OF Boolean;
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const booleanToken = tokens.find(t => t.value.toUpperCase() === 'BOOLEAN' && t.line === 6);
        expect(booleanToken).toBeDefined();
        expect(booleanToken?.type).toBe(TokenType.Boolean); // Boolean after OF
      });

      it('should tokenize Date as Date_Type in procedure return type', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE GetDate@1() : Date;
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const dateToken = tokens.find(t => t.value.toUpperCase() === 'DATE' && t.line === 4);
        expect(dateToken).toBeDefined();
        expect(dateToken?.type).toBe(TokenType.Date_Type); // Return type must be Date_Type
      });

      it('should tokenize Time as Time_Type in procedure parameter', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1(VAR param : Time);
    BEGIN
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const timeToken = tokens.find(t => t.value.toUpperCase() === 'TIME' && t.line === 4);
        expect(timeToken).toBeDefined();
        expect(timeToken?.type).toBe(TokenType.Time_Type); // Parameter type must be Time_Type
      });
    });

    describe('OBJECT-PROPERTIES regression (should PASS before AND after)', () => {
      it('should tokenize Date in PROPERTIES section as Date keyword', () => {
        const code = `OBJECT Table 18 Customer {
  PROPERTIES
  {
    Date=01/01/2024;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Find the Date token on line 4 (in PROPERTIES)
        const dateToken = tokens.find(t => t.value.toUpperCase() === 'DATE' && t.line === 4);
        expect(dateToken).toBeDefined();
        // In PROPERTIES section, Date is a property name keyword
        // We expect it to remain a keyword token (not Identifier)
        expect(dateToken?.type).not.toBe(TokenType.Identifier);
      });

      it('should tokenize Time in PROPERTIES section as Time keyword', () => {
        const code = `OBJECT Table 18 Customer {
  PROPERTIES
  {
    Time=12:00:00;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const timeToken = tokens.find(t => t.value.toUpperCase() === 'TIME' && t.line === 4);
        expect(timeToken).toBeDefined();
        expect(timeToken?.type).not.toBe(TokenType.Identifier);
      });
    });

    describe('Mixed contexts in same procedure', () => {
      it('should correctly distinguish Date in declaration vs member access', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      myDate : Date;
      Rec : Record 18;
    BEGIN
      Rec.Date := myDate;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Line 6: Date in VAR declaration - should be Date_Type
        const declarationDate = tokens.find(t => t.value.toUpperCase() === 'DATE' && t.line === 6);
        expect(declarationDate).toBeDefined();
        expect(declarationDate?.type).toBe(TokenType.Date_Type);

        // Line 9: Date as member access - should be Identifier
        const memberDate = tokens.find(t => t.value.toUpperCase() === 'DATE' && t.line === 9);
        expect(memberDate).toBeDefined();
        expect(memberDate?.type).toBe(TokenType.Identifier);
      });

      it('should correctly distinguish Time in declaration vs WITH-DO', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      myTime : Time;
      Rec : Record 50000;
    BEGIN
      WITH Rec DO BEGIN
        Time := myTime;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Line 6: Time in VAR declaration - should be Time_Type
        const declarationTime = tokens.find(t => t.value.toUpperCase() === 'TIME' && t.line === 6);
        expect(declarationTime).toBeDefined();
        expect(declarationTime?.type).toBe(TokenType.Time_Type);

        // Line 10: Time in WITH-DO - should be Identifier
        const withDoTime = tokens.find(t => t.value.toUpperCase() === 'TIME' && t.line === 10);
        expect(withDoTime).toBeDefined();
        expect(withDoTime?.type).toBe(TokenType.Identifier);
      });

      it('should correctly distinguish Boolean in all contexts', () => {
        const code = `OBJECT Codeunit 1 Test {
  CODE
  {
    PROCEDURE Test@1();
    VAR
      flag : Boolean;
      Rec : Record 27;
    BEGIN
      CASE flag OF
        Boolean : Rec.Boolean := TRUE;
      END;
    END;
  }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        // Line 6: Boolean in VAR declaration - should be Boolean keyword
        const declarationBoolean = tokens.find(t => t.value.toUpperCase() === 'BOOLEAN' && t.line === 6);
        expect(declarationBoolean).toBeDefined();
        expect(declarationBoolean?.type).toBe(TokenType.Boolean);

        // Line 10: First Boolean (case label) - should be Identifier
        const booleanTokens = tokens.filter(t => t.value.toUpperCase() === 'BOOLEAN' && t.line === 10);
        expect(booleanTokens.length).toBeGreaterThanOrEqual(2);

        // First Boolean on line 10 is case label
        const caseLabelBoolean = booleanTokens[0];
        expect(caseLabelBoolean.type).toBe(TokenType.Identifier);

        // Second Boolean on line 10 is member access
        const memberBoolean = booleanTokens[1];
        expect(memberBoolean.type).toBe(TokenType.Identifier);
      });
    });
  });
});
