/**
 * Lexer Tests - Bracket Depth Tracking in Property Values
 *
 * Tests the bracket depth tracking feature that prevents semicolons inside
 * bracketed property values from incorrectly resetting the inPropertyValue flag.
 *
 * BUG SCENARIO:
 * Property values can contain semicolons inside brackets, like:
 *   CaptionML=[DAN=Start;ENU=Begin]
 *
 * Without bracket depth tracking, the semicolon is treated as a property delimiter,
 * causing the lexer to reset inPropertyValue prematurely. This leads to:
 * - Keywords like "Begin" in caption text being treated as code keywords
 * - CODE_BLOCK context being pushed incorrectly
 * - Closing `}` braces being tokenized as UNKNOWN instead of RightBrace
 *
 * CORRECT BEHAVIOR:
 * Track bracket depth `[]` and only reset inPropertyValue when:
 *   - A semicolon is encountered AND
 *   - bracketDepth === 0
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Bracket Depth Tracking in Property Values', () => {
  describe('CaptionML with semicolons between language codes', () => {
    it('should NOT reset inPropertyValue for semicolon inside brackets [DAN=...;ENU=...]', () => {
      // CRITICAL: The semicolon between DAN and ENU is INSIDE brackets
      // It should NOT reset inPropertyValue
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
    CaptionML=[DAN=Start;ENU=Begin];
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The closing brace of PROPERTIES section should be RightBrace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // PROPERTIES + OBJECT

      // No UNKNOWN tokens should exist
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle three language codes with two semicolons in brackets', () => {
      const code = `OBJECT Table 1 {
  PROPERTIES {
    CaptionML=[DAN=Start;ENU=Begin;DEU=Anfang];
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // PROPERTIES + OBJECT

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle CaptionML in field properties', () => {
      // Fields can also have CaptionML with semicolons
      const code = `OBJECT Table 1 {
  FIELDS {
    { 1 ; ; MyField ; Code20 ; CaptionML=[DAN=Felt;ENU=Field] }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(3); // OBJECT + FIELDS + field

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('BEGIN keyword in caption text within brackets', () => {
    it('should NOT push CODE_BLOCK context for BEGIN in CaptionML text - REAL BUG PATTERN', () => {
      // EXACT code from TAB5218.TXT lines 511-516 that triggers the bug
      // Field name contains "Begin" (now protected in structural column by dd1116e)
      // CaptionML has semicolon between DAN and ENU (BUG: resets inPropertyValue at line 866)
      // ENU caption contains "Begin" (incorrectly treated as BEGIN keyword when inPropertyValue=false)
      // Result: CODE_BLOCK is pushed, next field's { becomes block comment, closing braces become UNKNOWN
      // Note: FIELDS context added to enable column tracking protection
      const code = `OBJECT Table 5218 {
  FIELDS {
    { 6005550;;Shop Fl. Begin -> Time Begin;Boolean;
                                                   CaptionML=[DAN=Job start -> Tid start;
                                                              ENU=Shop Fl. Begin -> Time Begin] }
    { 6005551;;Time End -> Shop Fl. End;Boolean   ;CaptionML=[DAN=Tid slut -> Job slut;
                                                              ENU=Time End -> Shop Fl. End] }
    { 6005552;;Time Begin -> Shop Fl. Begin;Boolean }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // BUG SYMPTOM: Closing braces are tokenized as UNKNOWN instead of RightBrace
      // because semicolon inside CaptionML brackets resets inPropertyValue
      const unknownBraces = tokens.filter(t => t.type === TokenType.Unknown && (t.value === '}' || t.value === '{'));

      // THIS TEST SHOULD FAIL before implementing the fix!
      // After fix: unknownBraces.length should be 0
      // Before fix: unknownBraces.length will be 2 (the } at line 3 and { at line 6)
      expect(unknownBraces).toHaveLength(0); // Should be 0 after fix, currently FAILS with 2
    });

    it('should handle END keyword in caption text within brackets', () => {
      const code = `OBJECT Table 1 {
  PROPERTIES {
    CaptionML=[DAN=End Process;ENU=Finish];
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // PROPERTIES + OBJECT

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle both BEGIN and END in same CaptionML', () => {
      const code = `OBJECT Table 1 {
  PROPERTIES {
    CaptionML=[DAN=Begin to End;ENU=Start to Finish];
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // PROPERTIES + OBJECT

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle other keywords like IF, THEN in caption text', () => {
      const code = `OBJECT Table 1 {
  PROPERTIES {
    CaptionML=[DAN=If Then Else;ENU=Conditional];
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // PROPERTIES + OBJECT

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Empty and malformed brackets', () => {
    it('should handle empty brackets []', () => {
      const code = `PROPERTIES
{
  CaptionML=[];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle semicolon inside otherwise empty brackets [;]', () => {
      // Edge case: malformed but should not crash
      const code = `PROPERTIES
{
  Property=[;];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should not crash and should still tokenize closing brace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);
    });

    it('should handle multiple semicolons inside brackets [;;]', () => {
      const code = `PROPERTIES
{
  Property=[;;];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Trailing semicolon inside brackets', () => {
    it('should handle trailing semicolon [ENU=Test;]', () => {
      const code = `PROPERTIES
{
  CaptionML=[ENU=Test;];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle leading semicolon [;ENU=Test]', () => {
      const code = `PROPERTIES
{
  CaptionML=[;ENU=Test];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle semicolons around value [;DAN=Test;ENU=Value;]', () => {
      const code = `PROPERTIES
{
  CaptionML=[;DAN=Test;ENU=Value;];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Nested brackets', () => {
    it('should handle nested brackets [[inner]]', () => {
      // C/AL may not use nested brackets in practice, but lexer should handle it
      const code = `PROPERTIES
{
  Property=[[inner]];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle semicolon in nested brackets [[a;b]]', () => {
      const code = `PROPERTIES
{
  Property=[[a;b]];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle multiple nesting levels [[[a;b;c]]]', () => {
      const code = `PROPERTIES
{
  Property=[[[a;b;c]]];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Unclosed brackets - malformed input recovery', () => {
    it('should handle unclosed bracket followed by closing brace [ENU=Test }', () => {
      // Malformed: missing closing bracket before brace
      // Lexer should still tokenize the brace as RightBrace, not UNKNOWN
      const code = `PROPERTIES
{
  CaptionML=[ENU=Test;
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Even with malformed input, brace should be recognized
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBeGreaterThan(0);

      // The brace should not be UNKNOWN
      const lastBrace = rightBraces[rightBraces.length - 1];
      expect(lastBrace.type).toBe(TokenType.RightBrace);
    });

    it('should handle unclosed bracket at end of file', () => {
      const code = `PROPERTIES
{
  CaptionML=[ENU=Test`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should not crash
      expect(tokens.length).toBeGreaterThan(0);

      // EOF token should exist
      const eofToken = tokens.find(t => t.type === TokenType.EOF);
      expect(eofToken).toBeDefined();
    });

    it('should handle multiple unclosed brackets [[ followed by brace', () => {
      const code = `PROPERTIES
{
  Property=[[test;
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBeGreaterThan(0);

      // The brace should be tokenized as RightBrace
      expect(rightBraces[rightBraces.length - 1].type).toBe(TokenType.RightBrace);
    });
  });

  describe('Verify closing braces after bracketed properties', () => {
    it('should tokenize } as RightBrace after CaptionML with brackets', () => {
      const code = `PROPERTIES
{
  CaptionML=[DAN=Test;ENU=Value];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the closing brace
      const lastRightBrace = tokens.reverse().find(t => t.type === TokenType.RightBrace);
      tokens.reverse(); // restore order

      expect(lastRightBrace).toBeDefined();
      expect(lastRightBrace!.type).toBe(TokenType.RightBrace);
      expect(lastRightBrace!.value).toBe('}');

      // CRITICAL: This brace should NOT be UNKNOWN
      const braceAsUnknown = tokens.find(t =>
        t.type === TokenType.Unknown && t.value === '}'
      );
      expect(braceAsUnknown).toBeUndefined();
    });

    it('should tokenize } as RightBrace in field with CaptionML', () => {
      const code = `FIELDS
{
  { 1 ; ; MyField ; Code20 ; CaptionML=[DAN=Felt;ENU=Field] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // All closing braces should be RightBrace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS + field

      // No braces should be UNKNOWN
      const unknownBraces = tokens.filter(t =>
        t.type === TokenType.Unknown && t.value === '}'
      );
      expect(unknownBraces).toHaveLength(0);
    });

    it('should tokenize } as RightBrace after multiple properties with brackets', () => {
      const code = `OBJECT Table 1 {
  PROPERTIES {
    CaptionML=[DAN=Test1;ENU=Value1];
    OptionCaptionML=[DAN=Opt;ENU=Option];
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // PROPERTIES + OBJECT

      // No UNKNOWN tokens for braces
      const unknownBraces = tokens.filter(t =>
        t.type === TokenType.Unknown && (t.value === '}' || t.value === '{')
      );
      expect(unknownBraces).toHaveLength(0);
    });
  });

  describe('Complex scenarios - multiple fields and properties', () => {
    it('should handle multiple fields with CaptionML containing semicolons', () => {
      const code = `OBJECT Table 1 {
  FIELDS {
    { 1 ; ; Field1 ; Code20 ; CaptionML=[DAN=Felt1;ENU=Field1] }
    { 2 ; ; Field2 ; Integer ; CaptionML=[DAN=Felt2;ENU=Field2] }
    { 3 ; ; Field3 ; Option ; CaptionML=[DAN=Begin;ENU=Start] }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have: OBJECT + FIELDS + 3 fields = 5 total right braces
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(5);

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle field with CaptionML and trigger code', () => {
      // Complex case: Field has both CaptionML with semicolons AND trigger code
      const code = `OBJECT Table 1 {
  FIELDS {
    { 1 ; ; Status ; Option ;
      CaptionML=[DAN=Begin Status;ENU=Start Status];
      OnValidate=BEGIN
        CheckStatus;
      END;
    }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Field structure should be intact: OBJECT + FIELDS + field = 3 right braces
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(3);

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle table with PROPERTIES and FIELDS both using brackets', () => {
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
    CaptionML=[DAN=Test;ENU=Test Table];
  }
  FIELDS
  {
    { 1 ; ; MyField ; Code20 ; CaptionML=[DAN=Felt;ENU=Field] }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // PROPERTIES, FIELDS, field, and OBJECT closing braces
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(4);

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('OptionCaptionML - similar to CaptionML', () => {
    it('should handle OptionCaptionML with semicolons in brackets', () => {
      const code = `FIELDS
{
  { 1 ; ; Status ; Option ;
    OptionString=Open,Closed;
    OptionCaptionML=[DAN=Åben,Lukket;ENU=Open,Closed]
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS + field

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle OptionCaptionML with keywords in captions', () => {
      const code = `FIELDS
{
  { 1 ; ; Phase ; Option ;
    OptionString=Begin,End;
    OptionCaptionML=[DAN=Begin,End;ENU=Start,Finish]
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Bracket depth reset after closing bracket', () => {
    it('should reset inPropertyValue after closing bracket and semicolon', () => {
      // After [DAN=...;ENU=...]; the semicolon AFTER ] should reset inPropertyValue
      const code = `PROPERTIES
{
  CaptionML=[DAN=Test;ENU=Value];
  DataPerCompany=Yes;
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Both properties should be recognized correctly
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle property after bracketed property without semicolon', () => {
      // Sometimes properties are separated by newlines without semicolons
      const code = `PROPERTIES
{
  CaptionML=[DAN=Test;ENU=Value]
  DataPerCompany=Yes
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle multiple bracketed properties in sequence', () => {
      const code = `PROPERTIES
{
  CaptionML=[DAN=Test1;ENU=Value1];
  OptionCaptionML=[DAN=Opt1;ENU=Option1];
  Description=[This is a;description with semicolon];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Edge case: semicolons in string literals inside brackets', () => {
    it('should handle string with semicolon inside brackets', () => {
      // If property value contains a string literal inside brackets
      const code = `PROPERTIES
{
  Property=['Value1;Value2'];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle CaptionML with strings containing semicolons', () => {
      const code = `PROPERTIES
{
  CaptionML=[DAN='Test;Value';ENU='Name;Field'];
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Regression - ensure fix does not break normal property parsing', () => {
    it('should still reset inPropertyValue for semicolon OUTSIDE brackets', () => {
      // Normal case: semicolon not in brackets should still work as delimiter
      const code = `PROPERTIES
{
  DataPerCompany=Yes;
  CaptionML=ENU=Test;
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle properties without brackets normally', () => {
      const code = `PROPERTIES
{
  DataPerCompany=Yes;
  Description=Test Description;
  AutoIncrement=No;
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(1);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle field properties without brackets', () => {
      const code = `FIELDS
{
  { 1 ; ; MyField ; Code20 ; Description=Test Field; Editable=No }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });
});
