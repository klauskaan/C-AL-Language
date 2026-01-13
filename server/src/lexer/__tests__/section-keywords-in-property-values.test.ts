/**
 * Lexer Tests - Section Keywords in Property Values
 *
 * Tests handling of section keywords (CODE, FIELDS, KEYS, PROPERTIES, etc.)
 * when they appear inside property VALUES (not field names or structural positions).
 *
 * BUG SCENARIO:
 * When section keywords appear inside property values like CaptionML, OptionCaptionML,
 * etc., the lexer incorrectly:
 * 1. Resets currentSectionType = null (for CODE, PROPERTIES, etc.)
 * 2. Sets lastWasSectionKeyword = true
 * 3. Corrupts the lexer context for subsequent tokens
 *
 * Example problematic property:
 *   CaptionML=[ENU=SWIFT Code]
 *                      ^^^^ "Code" keyword appears in property value
 *
 * CORRECT BEHAVIOR:
 * - Section keywords in property values → treated as TEXT, NO context change
 * - Section keywords at top level → proper section start, context changes
 * - The inPropertyValue flag should protect keywords from affecting context
 *
 * ROOT CAUSE:
 * The updateContextForKeyword() method doesn't check inPropertyValue flag for
 * section keywords. It has guards for structural columns but not for property values.
 *
 * Real-world example from TAB5218.TXT line 411:
 *   { 411 ; ;SWIFT Code ; Code20 ; CaptionML=[..;ENU=SWIFT Code] }
 *   The "Code" in "SWIFT Code" was already fixed by structural column protection.
 *   But the "Code" in CaptionML=[ENU=SWIFT Code] still corrupts context.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Section Keywords in Property Values', () => {
  describe('CODE keyword in property values', () => {
    it('should handle "Code" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; CaptionML=[ENU=Swift Code] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
      expect(rightBraces.length).toBe(2); // FIELDS section + field
    });

    it('should handle "CODE" in uppercase CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; CaptionML=[ENU=AREA CODE] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "Code" in OptionCaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Type ; Option ; OptionCaptionML=[ENU=Code,Name,Address];
                          OptionString=Code,Name,Address }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle real-world example: SWIFT Code in CaptionML', () => {
      // Based on TAB5218.TXT line 411
      const code = `FIELDS
{
  { 411 ; ; "SWIFT Code" ; Code20 ; CaptionML=[DAN=SWIFT-kode;
                                               DEU=SWIFT-Code;
                                               ENU=SWIFT Code;
                                               ESP=Código SWIFT] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The critical test: no UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      if (unknownTokens.length > 0) {
        const unknownDetails = unknownTokens.map(t =>
          `"${t.value}" at line ${t.line}:${t.column}`
        );
        throw new Error(
          `BUG: Section keyword in CaptionML corrupted context. ` +
          `Found ${unknownTokens.length} UNKNOWN tokens: ${unknownDetails.join(', ')}`
        );
      }
      expect(unknownTokens).toHaveLength(0);

      // Balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
      expect(rightBraces.length).toBe(2); // FIELDS section + field
    });
  });

  describe('PROPERTIES keyword in property values', () => {
    it('should handle "Properties" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; CaptionML=[ENU=Customer Properties] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "Properties" in ToolTipML without corrupting context', () => {
      const code = `CONTROLS
{
  { 1 ; ; Name ; Field ; ToolTipML=[ENU=Specifies the properties] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('FIELDS keyword in property values', () => {
    it('should handle "Fields" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Count ; Integer ; CaptionML=[ENU=Number of Fields] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "FIELDS" in uppercase CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Setup ; Text50 ; CaptionML=[ENU=CONFIGURE FIELDS] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('KEYS keyword in property values', () => {
    it('should handle "Keys" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Setup ; Text50 ; CaptionML=[ENU=Primary Keys] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('CONTROLS keyword in property values', () => {
    it('should handle "Controls" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Setup ; Text50 ; CaptionML=[ENU=Page Controls] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('ELEMENTS keyword in property values', () => {
    it('should handle "Elements" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Count ; Integer ; CaptionML=[ENU=Number of Elements] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('DATAITEMS keyword in property values', () => {
    it('should handle "DataItems" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Setup ; Text50 ; CaptionML=[ENU=Report DataItems] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('ACTIONS keyword in property values', () => {
    it('should handle "Actions" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Setup ; Text50 ; CaptionML=[ENU=Page Actions] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('REQUESTFORM keyword in property values', () => {
    it('should handle "RequestForm" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Setup ; Text50 ; CaptionML=[ENU=Report RequestForm] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('FIELDGROUPS keyword in property values', () => {
    it('should handle "FieldGroups" in CaptionML without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Setup ; Text50 ; CaptionML=[ENU=Table FieldGroups] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('Multiple section keywords in same property value', () => {
    it('should handle multiple section keywords in CaptionML', () => {
      const code = `FIELDS
{
  { 1 ; ; Setup ; Text50 ; CaptionML=[ENU=Code Properties Fields Actions] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle section keywords in multiple properties', () => {
      const code = `FIELDS
{
  { 1 ; ; Setup ; Text50 ; CaptionML=[ENU=Swift Code];
                           ToolTipML=[ENU=The SWIFT code for properties] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('Section keywords in various property types', () => {
    it('should handle section keyword in multi-language property', () => {
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; CaptionML=[DAN=Kode;
                                     DEU=Code;
                                     ENU=Code;
                                     ESP=Código] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle section keyword in Description property', () => {
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; Description=This field contains the code }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle section keyword in OptionString', () => {
      const code = `FIELDS
{
  { 1 ; ; Type ; Option ; OptionString=Code,Properties,Actions }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('Integration tests - complete field definitions', () => {
    it('should parse field with section keyword in both name and property value', () => {
      // Field name is "Code" (protected by structural column guard)
      // CaptionML contains "Code" (protected by inPropertyValue guard)
      const code = `FIELDS
{
  { 1 ; ; Code ; Code20 ; CaptionML=[ENU=Code] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should parse multiple fields with section keywords in property values', () => {
      const code = `FIELDS
{
  { 1 ; ; Name1 ; Text50 ; CaptionML=[ENU=Swift Code] }
  { 2 ; ; Name2 ; Text50 ; CaptionML=[ENU=Customer Properties] }
  { 3 ; ; Name3 ; Text50 ; CaptionML=[ENU=Page Actions] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(4); // FIELDS section + 3 fields
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should parse complete table with section keywords everywhere', () => {
      // Ultimate integration test: section keywords in field names AND property values
      const code = `OBJECT Table 50000 Complete Test
{
  PROPERTIES
  {
    CaptionML=ENU=Test with Code;
  }
  FIELDS
  {
    { 1   ; ; "Primary Key" ; Code10  ; CaptionML=ENU=Key Code }
    { 10  ; ; Code          ; Code20  ; CaptionML=ENU=Swift Code }
    { 11  ; ; Properties    ; Text50  ; CaptionML=ENU=Item Properties }
    { 12  ; ; Actions       ; Text50  ; CaptionML=ENU=Page Actions }
  }
  KEYS
  {
    { ; "Primary Key" }
    { ; Code }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The ultimate validation: no UNKNOWN tokens at all
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      if (unknownTokens.length > 0) {
        const unknownDetails = unknownTokens.map(t =>
          `"${t.value}" at line ${t.line}:${t.column}`
        );
        throw new Error(
          `BUG: Section keywords in property values corrupted context. ` +
          `Found ${unknownTokens.length} UNKNOWN tokens: ${unknownDetails.join(', ')}`
        );
      }
      expect(unknownTokens).toHaveLength(0);

      // Balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('Edge cases - section keywords at property value boundaries', () => {
    it('should handle section keyword at start of CaptionML value', () => {
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; CaptionML=[ENU=Code Description] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle section keyword at end of CaptionML value', () => {
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; CaptionML=[ENU=Description Code] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle section keyword as entire CaptionML value', () => {
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; CaptionML=[ENU=Code] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Context boundary tests - property value should not leak', () => {
    it('should exit property value mode after semicolon', () => {
      // After CaptionML=...; the next identifier should NOT be in property value
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; CaptionML=[ENU=Code]; Editable=No }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle nested brackets in property value correctly', () => {
      // Brackets inside CaptionML should not break property value tracking
      const code = `FIELDS
{
  { 1 ; ; Name ; Text50 ; CaptionML=[DAN=Kode [Default];ENU=Code [Default]] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('REGRESSION: Multi-line ML properties with keywords on continuation lines', () => {
    it('should tokenize "Actions" in multi-line PromotedActionCategoriesML as IDENTIFIER', () => {
      // Based on PAG6213182.TXT lines 21-22
      // BUG: "Actions" on continuation line is tokenized as ACTIONS keyword, corrupting context
      const code = `PROPERTIES
{
  PromotedActionCategoriesML=[DAN=Hjem,Handlinger,Rapporter;
                              ENU=Home,Actions,Reports];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find all tokens with "Actions" value
      const actionsTokens = tokens.filter(t =>
        t.value.toUpperCase() === 'ACTIONS'
      );

      // There should be exactly one "Actions" token
      expect(actionsTokens.length).toBeGreaterThan(0);

      // All "Actions" tokens inside property value should be IDENTIFIER, not ACTIONS keyword
      actionsTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should tokenize "Begin" and "End" in multi-line OptionCaptionML as IDENTIFIER', () => {
      // Based on TAB6005575.TXT lines 59-60
      // BUG: "Begin" and "End" on continuation line are tokenized as BEGIN/END keywords
      const code = `FIELDS
{
  { 4 ; ; "Begin/End" ; Option ;
    OptionCaptionML=[DAN=Begynd,Slut;
                     ENU=Begin,End];
    NotBlank=Yes }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find "Begin" tokens inside property value (not the InitValue)
      const beginTokens = tokens.filter(t =>
        t.value.toUpperCase() === 'BEGIN' && t.line >= 4
      );

      // Find "End" tokens inside property value
      const endTokens = tokens.filter(t =>
        t.value.toUpperCase() === 'END' && t.line === 5
      );

      // These should be IDENTIFIER tokens, not BEGIN/END keywords
      beginTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });

      endTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "Actions" at start of continuation line after indentation', () => {
      // Edge case: keyword appears as first non-whitespace token on continuation line
      const code = `PROPERTIES
{
  PromotedActionCategoriesML=[DAN=Start;
                              ENU=Home,
                              Actions];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find "Actions" token
      const actionsTokens = tokens.filter(t =>
        t.value.toUpperCase() === 'ACTIONS'
      );

      // Should be IDENTIFIER, not ACTIONS keyword
      actionsTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle multiple keywords on separate continuation lines', () => {
      // Multiple section keywords across multiple continuation lines
      const code = `PROPERTIES
{
  TestPropertyML=[DAN=Start,Kode,Slut;
                  ENU=Begin,
                  Code,
                  End,
                  Actions];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find all keyword-like tokens inside property value
      const beginTokens = tokens.filter(t => t.value.toUpperCase() === 'BEGIN');
      const codeTokens = tokens.filter(t => t.value.toUpperCase() === 'CODE');
      const endTokens = tokens.filter(t => t.value.toUpperCase() === 'END');
      const actionsTokens = tokens.filter(t => t.value.toUpperCase() === 'ACTIONS');

      // All should be IDENTIFIER tokens
      [...beginTokens, ...codeTokens, ...endTokens, ...actionsTokens].forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should not corrupt context after multi-line property with keyword', () => {
      // Test that subsequent properties are parsed correctly
      const code = `PROPERTIES
{
  PageType=Card;
  PromotedActionCategoriesML=[DAN=Hjem;
                              ENU=Home,Actions];
  InsertAllowed=No;
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify "InsertAllowed" property is parsed correctly after multi-line property
      const insertAllowedTokens = tokens.filter(t =>
        t.value === 'InsertAllowed'
      );
      expect(insertAllowedTokens.length).toBeGreaterThan(0);
      expect(insertAllowedTokens[0].type).toBe(TokenType.Identifier);

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle real NAV pattern: PAG6213182.TXT PromotedActionCategoriesML', () => {
      // Exact real-world pattern from failing file
      const code = `OBJECT Page 6213182 Test
{
  PROPERTIES
  {
    PageType=Card;
    PromotedActionCategoriesML=[DAN=Hjem,Handlinger,Rapporter,Medarbejdere,Sag;
                                ENU=Home,Actions,Reports,Employees,Jobs];
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find "Actions" token on continuation line
      const actionsTokens = tokens.filter(t =>
        t.value === 'Actions' && t.line === 7
      );

      // Should be IDENTIFIER, not ACTIONS keyword
      expect(actionsTokens.length).toBeGreaterThan(0);
      actionsTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });

      // Critical: no UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      if (unknownTokens.length > 0) {
        const unknownDetails = unknownTokens.map(t =>
          `"${t.value}" at line ${t.line}:${t.column}`
        );
        throw new Error(
          `BUG: "Actions" keyword on continuation line corrupted context. ` +
          `Found ${unknownTokens.length} UNKNOWN tokens: ${unknownDetails.join(', ')}`
        );
      }
      expect(unknownTokens).toHaveLength(0);

      // Balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle real NAV pattern: TAB6005575.TXT OptionCaptionML with Begin/End', () => {
      // Exact real-world pattern from failing file
      const code = `OBJECT Table 6005575 Test
{
  FIELDS
  {
    { 4 ; ; "Begin/End" ; Option ;
      InitValue=Begin;
      CaptionML=[DAN=Begynd/Slut;
                 ENU=Begin/End];
      OptionCaptionML=[DAN=Begynd,Slut;
                       ENU=Begin,End];
      OptionString=Begin,End;
      NotBlank=Yes }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find "Begin" and "End" tokens on continuation line (line 10)
      const continuationLineTokens = tokens.filter(t => t.line === 10);
      const beginTokens = continuationLineTokens.filter(t =>
        t.value === 'Begin'
      );
      const endTokens = continuationLineTokens.filter(t =>
        t.value === 'End'
      );

      // Should be IDENTIFIER tokens
      beginTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });
      endTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });

      // Critical: no UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      if (unknownTokens.length > 0) {
        const unknownDetails = unknownTokens.map(t =>
          `"${t.value}" at line ${t.line}:${t.column}`
        );
        throw new Error(
          `BUG: "Begin"/"End" keywords on continuation line corrupted context. ` +
          `Found ${unknownTokens.length} UNKNOWN tokens: ${unknownDetails.join(', ')}`
        );
      }
      expect(unknownTokens).toHaveLength(0);

      // Balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should verify token stream balance for multi-line ML property with keywords', () => {
      // Comprehensive balance check: all brackets, braces, and structure
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
    PromotedActionCategoriesML=[DAN=Hjem,Handlinger;
                                ENU=Home,Actions,Reports];
  }
  CONTROLS
  {
    { 1 ; ; Name ; Field }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
      expect(leftBraces.length).toBe(4); // OBJECT, PROPERTIES, CONTROLS, field

      // Balanced brackets
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      const rightBrackets = tokens.filter(t => t.type === TokenType.RightBracket);
      expect(leftBrackets.length).toBe(rightBrackets.length);
      expect(leftBrackets.length).toBe(1); // ML property value

      // Verify "Actions" is IDENTIFIER
      const actionsTokens = tokens.filter(t => t.value === 'Actions');
      expect(actionsTokens.length).toBeGreaterThan(0);
      actionsTokens.forEach(token => {
        expect(token.type).toBe(TokenType.Identifier);
      });
    });
  });
});
