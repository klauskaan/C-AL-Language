/**
 * Lexer Tests - Context-Aware Brace Handling
 *
 * Tests the context-aware lexer that distinguishes between:
 * - Structural braces { } in object/section definitions
 * - Block comment braces { } in CODE sections (BEGIN...END blocks)
 *
 * This is a critical feature for C/AL parsing, as the language uses
 * the same delimiters for two different purposes depending on context.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Context-Aware Brace Handling', () => {
  describe('Structural braces in object definitions', () => {
    it('should tokenize braces as structural delimiters after OBJECT keyword', () => {
      const code = 'OBJECT Table 18 Customer { }';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have: OBJECT, Table, 18, Customer, {, }, EOF
      expect(tokens[4].type).toBe(TokenType.LeftBrace);
      expect(tokens[5].type).toBe(TokenType.RightBrace);
    });

    it('should tokenize braces in PROPERTIES section', () => {
      const code = `OBJECT Table 18 Customer
PROPERTIES
{
  CaptionML=ENU=Customer;
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the PROPERTIES keyword
      const propsIndex = tokens.findIndex(t => t.type === TokenType.Properties);
      expect(propsIndex).toBeGreaterThan(-1);

      // Next token should be LeftBrace
      expect(tokens[propsIndex + 1].type).toBe(TokenType.LeftBrace);

      // Should have a matching RightBrace
      const rightBraceIndex = tokens.findIndex((t, i) => i > propsIndex && t.type === TokenType.RightBrace);
      expect(rightBraceIndex).toBeGreaterThan(propsIndex);
    });

    it('should tokenize braces in FIELDS section', () => {
      const code = `OBJECT Table 18 Customer
FIELDS
{
  { 1   ;   ;No.   ;Code20 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the FIELDS keyword
      const fieldsIndex = tokens.findIndex(t => t.type === TokenType.Fields);
      expect(fieldsIndex).toBeGreaterThan(-1);

      // Next token should be LeftBrace (section opening)
      expect(tokens[fieldsIndex + 1].type).toBe(TokenType.LeftBrace);

      // Should also have LeftBrace for field definition
      const leftBraceCount = tokens.filter(t => t.type === TokenType.LeftBrace).length;
      expect(leftBraceCount).toBe(2); // Section brace + field brace
    });

    it('should tokenize braces in KEYS section', () => {
      const code = `OBJECT Table 18 Customer
KEYS
{
  { ;No. ;Clustered=Yes }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the KEYS keyword
      const keysIndex = tokens.findIndex(t => t.type === TokenType.Keys);
      expect(keysIndex).toBeGreaterThan(-1);

      // Next token should be LeftBrace
      expect(tokens[keysIndex + 1].type).toBe(TokenType.LeftBrace);

      // Should have matching braces
      const leftBraceCount = tokens.filter(t => t.type === TokenType.LeftBrace).length;
      const rightBraceCount = tokens.filter(t => t.type === TokenType.RightBrace).length;
      expect(leftBraceCount).toBe(rightBraceCount);
    });

    it('should tokenize nested braces in field definitions', () => {
      const code = `FIELDS
{
  { 1 ; ; Field1 ; Code10 }
  { 2 ; ; Field2 ; Code20 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);

      // Should have: 1 section brace + 2 field braces = 3 pairs
      expect(leftBraces.length).toBe(3);
      expect(rightBraces.length).toBe(3);
    });
  });

  describe('Comment braces in CODE blocks', () => {
    it('should treat braces as comments inside BEGIN...END block', () => {
      const code = `BEGIN
  { This is a comment }
  x := 5;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have: BEGIN, x, :=, 5, ;, END, EOF
      // The { comment } should be completely skipped
      expect(tokens).toHaveLength(7);
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].value).toBe('x');
      expect(tokens[5].type).toBe(TokenType.End);

      // Should NOT have any LeftBrace or RightBrace tokens
      const braceTokens = tokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokens.length).toBe(0);
    });

    it('should handle multiple block comments in CODE section', () => {
      const code = `BEGIN
  { Comment 1 }
  x := 5;
  { Comment 2 }
  y := 10;
  { Comment 3 }
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Comments should be skipped
      const identifiers = tokens.filter(t => t.type === TokenType.Identifier);
      expect(identifiers.map(t => t.value)).toEqual(['x', 'y']);

      // No brace tokens should exist
      const braceTokens = tokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokens.length).toBe(0);
    });

    it('should handle block comments with nested content', () => {
      const code = `BEGIN
  { Multi-line comment
    with various content
    and nested-looking text { }
  }
  result := TRUE;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should tokenize the code, skip the comment
      const resultToken = tokens.find(t => t.value === 'result');
      expect(resultToken).toBeDefined();

      // No brace tokens
      const braceTokens = tokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokens.length).toBe(0);
    });

    it('should handle nested BEGIN...END blocks with comments', () => {
      const code = `BEGIN
  IF x > 0 THEN BEGIN
    { Inner comment }
    DoSomething;
  END;
  { Outer comment }
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Both comments should be skipped
      const beginCount = tokens.filter(t => t.type === TokenType.Begin).length;
      const endCount = tokens.filter(t => t.type === TokenType.End).length;
      expect(beginCount).toBe(2);
      expect(endCount).toBe(2);

      // No brace tokens
      const braceTokens = tokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokens.length).toBe(0);
    });
  });

  describe('Mixed contexts - structural and comment braces', () => {
    it('should handle complete table object with CODE section', () => {
      const code = `OBJECT Table 18 Test
{
  PROPERTIES
  {
    CaptionML=ENU=Test;
  }
  FIELDS
  {
    { 1 ; ; No. ; Code20 }
  }
  CODE
  {
    PROCEDURE DoSomething();
    BEGIN
      { This is a comment }
      x := 5;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have structural braces for sections
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);

      // Structural braces: object{}, PROPERTIES{}, FIELDS{}, field{}, CODE{}
      // The comment brace in BEGIN...END should be skipped
      expect(leftBraces.length).toBe(5);
      expect(rightBraces.length).toBe(5);

      // Should have BEGIN and END tokens
      expect(tokens.some(t => t.type === TokenType.Begin)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.End)).toBe(true);
    });

    it('should transition from OBJECT to PROPERTIES to CODE contexts', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  PROPERTIES
  {
    OnRun=BEGIN { comment } x := 1; END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Structural braces for object and PROPERTIES
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBeGreaterThanOrEqual(2);

      // BEGIN comment END should be handled correctly
      expect(tokens.some(t => t.type === TokenType.Begin)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.End)).toBe(true);
    });

    it('should handle CODE section immediately after FIELDS', () => {
      const code = `FIELDS
{
  { 1 ; ; Field1 ; Code10 }
}
CODE
{
  BEGIN
    { Comment in code }
  END;
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // FIELDS section: 1 section brace + 1 field brace = 2
      // CODE section: 1 section brace = 1
      // Total: 3 pairs of structural braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(3);

      // Comment in BEGIN...END should be skipped
      const beginIndex = tokens.findIndex(t => t.type === TokenType.Begin);
      const endIndex = tokens.findIndex(t => t.type === TokenType.End);
      expect(beginIndex).toBeGreaterThan(-1);
      expect(endIndex).toBeGreaterThan(beginIndex);
    });
  });

  describe('Edge cases and context transitions', () => {
    it('should handle empty sections', () => {
      const code = `PROPERTIES
{
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Properties);
      expect(tokens[1].type).toBe(TokenType.LeftBrace);
      expect(tokens[2].type).toBe(TokenType.RightBrace);
    });

    it('should handle unclosed brace in CODE block gracefully', () => {
      const code = `BEGIN
  { Unclosed comment
  x := 5;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should not crash, should reach EOF
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    it('should handle multiple state transitions', () => {
      const code = `OBJECT Table 1 Test
{
  PROPERTIES { }
  FIELDS { { 1 ; ; F ; Code10 } }
  CODE
  {
    BEGIN { c } END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should successfully tokenize all sections
      expect(tokens.some(t => t.type === TokenType.Properties)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Fields)).toBe(true);
      expect(tokens.some(t => t.type === TokenType.Code)).toBe(true);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    it('should handle comment before section keyword', () => {
      const code = `// Line comment
PROPERTIES
{
  Caption=Test;
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Line comment skipped, structural braces tokenized
      expect(tokens[0].type).toBe(TokenType.Properties);
      expect(tokens[1].type).toBe(TokenType.LeftBrace);
    });

    it('should correctly track line numbers through mixed contexts', () => {
      const code = `OBJECT Table 1 Test
{
  PROPERTIES
  {
  }
  CODE
  {
    BEGIN
      { comment }
      x := 1;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the assignment on line 10
      const assignToken = tokens.find(t => t.value === 'x');
      expect(assignToken).toBeDefined();
      expect(assignToken!.line).toBe(10);
    });
  });

  describe('Context stack management', () => {
    it('should properly nest and unnest contexts with multiple BEGIN...END', () => {
      const code = `BEGIN
  IF TRUE THEN BEGIN
    IF FALSE THEN BEGIN
      { deeply nested comment }
    END;
  END;
END`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const beginCount = tokens.filter(t => t.type === TokenType.Begin).length;
      const endCount = tokens.filter(t => t.type === TokenType.End).length;

      expect(beginCount).toBe(3);
      expect(endCount).toBe(3);

      // Comment should be skipped
      const braceTokens = tokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokens.length).toBe(0);
    });

    it('should return to correct context after CODE block ends', () => {
      const code = `{
  CODE
  {
    BEGIN { comment } END;
  }
  PROPERTIES
  {
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // First { is structural (object level)
      expect(tokens[0].type).toBe(TokenType.LeftBrace);

      // PROPERTIES section should have structural braces
      const propsIndex = tokens.findIndex(t => t.type === TokenType.Properties);
      expect(tokens[propsIndex + 1].type).toBe(TokenType.LeftBrace);
    });

    it('should not push OBJECT_LEVEL context when "object" appears in property values', () => {
      // Bug: When "object" appears in Description property, lexer incorrectly
      // pushes OBJECT_LEVEL context, corrupting subsequent apostrophe handling
      const code = `OBJECT Table 5385 Test
{
  FIELDS
  {
    { 1   ;   ;Field1  ;Text50  ;Description=Reference to the object with which it works. }
    { 2   ;   ;Field2  ;Text50  ;Description=The note's content. }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find Field2's Description property
      // The apostrophe in "note's" should be part of the property value text,
      // NOT treated as a string delimiter

      // Strategy: Look for tokens after the second field number
      const field2Index = tokens.findIndex((t, i) =>
        t.type === TokenType.Integer &&
        t.value === '2' &&
        i > 10 // Skip object ID and first field
      );

      expect(field2Index).toBeGreaterThan(0);

      // After field 2, we should find Description= followed by property value tokens
      // The critical test: there should be NO string tokens with just "s content."
      // (which would indicate the apostrophe was treated as a string delimiter)

      // If the bug is present:
      // - "note's" would be split: "note" + ' (string start) + "s content." + (incomplete)
      // - We'd see a STRING token containing "s content."

      // If correctly parsed:
      // - The entire Description value is tokenized as identifiers/text
      // - No STRING token should appear in this field definition

      // Find the closing brace of Field2
      let braceDepth = 0;
      let inField2 = false;
      let field2Tokens: any[] = [];

      for (let i = field2Index; i < tokens.length; i++) {
        if (tokens[i].type === TokenType.LeftBrace) {
          braceDepth++;
          inField2 = true;
        }
        if (inField2) {
          field2Tokens.push(tokens[i]);
        }
        if (tokens[i].type === TokenType.RightBrace) {
          braceDepth--;
          if (braceDepth === 0) {
            break;
          }
        }
      }

      // Check for the bug signature: STRING token containing "s content."
      // or similar fragment that indicates apostrophe was treated as delimiter
      const stringTokensInField2 = field2Tokens.filter(t => t.type === TokenType.String);

      // The bug would create a STRING token because apostrophe is treated as string start
      // We expect NO string tokens in this field definition (all property values should be
      // tokenized as identifiers or other non-string tokens)
      expect(stringTokensInField2.length).toBe(0);

      // Additional check: The entire field definition should parse without errors
      // and maintain balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace).length;
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace).length;
      expect(leftBraces).toBe(rightBraces);
    });
  });
});
