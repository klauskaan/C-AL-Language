/**
 * Lexer Tests - Object Type Detection (Issue #98)
 *
 * Tests the objectType field in LexerContextState that exposes the type of the
 * C/AL object being tokenized (TABLE, CODEUNIT, PAGE, REPORT, etc.).
 *
 * This feature enables safe validation of object-specific edge cases, such as
 * RDLDATA sections in Report objects.
 */

import { Lexer } from '../lexer';

describe('Lexer - Object Type Detection', () => {
  describe('Basic Object Type Detection', () => {
    it('should detect TABLE object type', () => {
      const code = 'OBJECT Table 18 Customer';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('TABLE');
    });

    it('should detect CODEUNIT object type', () => {
      const code = 'OBJECT Codeunit 50000 "My Codeunit"';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('CODEUNIT');
    });

    it('should detect PAGE object type', () => {
      const code = 'OBJECT Page 22 "Customer List"';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('PAGE');
    });

    it('should detect REPORT object type', () => {
      const code = 'OBJECT Report 206 "Sales - Invoice"';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('REPORT');
    });

    it('should detect QUERY object type', () => {
      const code = 'OBJECT Query 50000 "My Query"';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('QUERY');
    });

    it('should detect XMLPORT object type', () => {
      const code = 'OBJECT XMLport 1220 "Data Exch Import"';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('XMLPORT');
    });

    it('should detect MENUSUITE object type', () => {
      const code = 'OBJECT MenuSuite 7001 "Finance Menu"';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('MENUSUITE');
    });
  });

  describe('Case Insensitivity', () => {
    it('should detect table object type with lowercase keyword', () => {
      const code = 'OBJECT table 18 Customer';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('TABLE');
    });

    it('should detect table object type with all caps TABLE', () => {
      const code = 'OBJECT TABLE 18 Customer';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('TABLE');
    });

    it('should detect table object type with mixed case TaBlE', () => {
      const code = 'OBJECT TaBlE 18 Customer';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('TABLE');
    });
  });

  describe('Complete Object Definitions', () => {
    it('should detect object type in complete table definition', () => {
      const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=010125D;
    Time=120000T;
  }
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
    { ;No. ;Clustered=Yes }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('TABLE');
    });

    it('should detect object type in complete codeunit definition', () => {
      const code = `OBJECT Codeunit 50000 "Test Codeunit"
{
  OBJECT-PROPERTIES
  {
    Date=010125D;
  }
  PROPERTIES
  {
    OnRun=BEGIN
            MESSAGE('Hello');
          END;
  }
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      x := 42;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('CODEUNIT');
    });

    it('should detect object type in complete report definition', () => {
      const code = `OBJECT Report 206 "Sales - Invoice"
{
  OBJECT-PROPERTIES
  {
    Date=010125D;
  }
  PROPERTIES
  {
    CaptionML=ENU=Sales - Invoice;
  }
  DATASET
  {
    { 1000 ;DataItem;               ;Sales Header         }
    { 1001 ;Column ;                ;No_SalesHeader       }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBe('REPORT');
    });
  });

  describe('Multi-Object Files', () => {
    it('should reflect the FIRST object type when multiple objects exist', () => {
      const code = `OBJECT Table 18 Customer
{
}
OBJECT Codeunit 50000 Test
{
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      // Should report the FIRST object type
      expect(state.objectType).toBe('TABLE');
    });

    it('should detect codeunit when it is the first object', () => {
      const code = `OBJECT Codeunit 50000 First
{
}
OBJECT Table 18 Second
{
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      // Should report the FIRST object type
      expect(state.objectType).toBe('CODEUNIT');
    });
  });

  describe('Error Handling and Malformed Input', () => {
    it('should return null objectType for empty input', () => {
      const code = '';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBeNull();
    });

    it('should return null objectType when no OBJECT keyword exists', () => {
      const code = 'Table 18 Customer';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBeNull();
    });

    it('should return null objectType when object type is missing', () => {
      const code = 'OBJECT 50000 Customer';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBeNull();
    });

    it('should return null objectType when object type is invalid', () => {
      const code = 'OBJECT Invalid 50000 "Bad Type"';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBeNull();
    });

    it('should return null objectType when only OBJECT keyword exists', () => {
      const code = 'OBJECT';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBeNull();
    });

    it('should return null objectType when curly braces appear between OBJECT and type keyword', () => {
      // Documented limitation: C/SIDE never generates this pattern
      // The opening brace is interpreted as the object body delimiter,
      // so the type token is not in the expected position (index 1 after OBJECT)
      const code = `OBJECT { unexpected } Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=010125D;
  }
  PROPERTIES
  {
    CaptionML=ENU=Customer;
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state.objectType).toBeNull();
    });
  });

  describe('Object Type Keywords in Code', () => {
    it('should not be confused by Table as variable name in CODE block', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      Table : Integer;
    BEGIN
      Table := 42;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      // Should still report CODEUNIT, not TABLE
      expect(state.objectType).toBe('CODEUNIT');
    });

    it('should not be confused by Page as identifier in CODE block', () => {
      const code = `OBJECT Table 18 Customer
{
  CODE
  {
    PROCEDURE ShowPage();
    VAR
      Page : Integer;
    BEGIN
      Page := 22;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      // Should still report TABLE, not PAGE
      expect(state.objectType).toBe('TABLE');
    });

    it('should not be confused by object type in property value', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  PROPERTIES
  {
    Description=This opens a Page;
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      // Should still report CODEUNIT despite "Page" in description
      expect(state.objectType).toBe('CODEUNIT');
    });
  });

  describe('Backward Compatibility', () => {
    it('should preserve all existing LexerContextState fields', () => {
      const code = 'OBJECT Table 18 Customer';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      // Verify all existing fields are still present
      expect(state).toHaveProperty('contextStack');
      expect(state).toHaveProperty('braceDepth');
      expect(state).toHaveProperty('bracketDepth');
      expect(state).toHaveProperty('inPropertyValue');
      expect(state).toHaveProperty('fieldDefColumn');
      expect(state).toHaveProperty('currentSectionType');
      expect(state).toHaveProperty('contextUnderflowDetected');

      // Verify the new field is added
      expect(state).toHaveProperty('objectType');
    });

    it('should maintain correct values for existing fields', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.   ;Code20 }
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      // Existing behavior should be unchanged
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
      expect(state.bracketDepth).toBe(0);
      expect(state.inPropertyValue).toBe(false);
      expect(state.fieldDefColumn).toBe('NONE');
      expect(state.currentSectionType).toBeNull();
      expect(state.contextUnderflowDetected).toBe(false);

      // New field should have correct value
      expect(state.objectType).toBe('TABLE');
    });
  });

  describe('State Before Tokenization', () => {
    it('should return null objectType before tokenize() is called', () => {
      const code = 'OBJECT Table 18 Customer';
      const lexer = new Lexer(code);
      // DO NOT call tokenize()
      const state = lexer.getContextState();

      // objectType should be null since we haven't tokenized yet
      expect(state.objectType).toBeNull();
    });
  });
});
