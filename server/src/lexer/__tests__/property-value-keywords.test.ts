/**
 * Lexer Tests - Property Value Keywords vs Code Triggers
 *
 * Tests the critical distinction between:
 * - Keywords used as PROPERTY VALUES (should NOT push CODE_BLOCK context)
 * - Keywords used in TRIGGER CODE (SHOULD push CODE_BLOCK context)
 *
 * BUG SCENARIO:
 * When BEGIN appears in a property value like `InitValue=Begin;`, the lexer
 * incorrectly interprets it as a code block start and pushes CODE_BLOCK context.
 * This corrupts subsequent brace handling:
 *   - The closing `}` of the field definition becomes UNKNOWN token
 *   - The parser cannot recognize field boundaries
 *
 * CORRECT BEHAVIOR:
 * - `InitValue=Begin;` → BEGIN is a TEXT VALUE, no context change
 * - `OnValidate=BEGIN code END;` → BEGIN is CODE START, push CODE_BLOCK context
 *
 * These tests MUST FAIL initially to validate the bug exists.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Property Value Keywords vs Code Triggers', () => {
  describe('Non-trigger properties - BEGIN should NOT push CODE_BLOCK', () => {
    it('should treat BEGIN in InitValue as property text value, not code block', () => {
      // CRITICAL: InitValue=Begin; should NOT trigger CODE_BLOCK context
      // The `}` after semicolon must be RightBrace, not UNKNOWN
      const code = `FIELDS
{
  { 1 ; ; MyField ; Option ; InitValue=Begin; }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the closing brace of the field definition
      // It should be RightBrace, not UNKNOWN
      const closingBrace = tokens.find((t, i) => {
        // Look for brace after InitValue=Begin;
        const prevToken = tokens[i - 1];
        return prevToken?.type === TokenType.Semicolon &&
               t.type === TokenType.RightBrace &&
               t.value === '}';
      });

      // THE FAILING ASSERTION:
      // Currently, this brace is tokenized as UNKNOWN due to CODE_BLOCK context corruption
      expect(closingBrace).toBeDefined();
      expect(closingBrace!.type).toBe(TokenType.RightBrace);

      // Verify no UNKNOWN tokens exist
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should treat BEGIN in OptionString as option value, not code block', () => {
      // OptionString can contain BEGIN and END as valid option values
      const code = `FIELDS
{
  { 1 ; ; Status ; Option ; OptionString=Begin,End,Processing }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The closing brace should be RightBrace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBeGreaterThan(0);

      // No UNKNOWN tokens should exist
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should treat BEGIN in Description as text content, not code block', () => {
      // Description property can contain keywords as natural text
      const code = `FIELDS
{
  { 1 ; ; MyField ; Code20 ; Description=Begin of the process }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The closing brace should be properly recognized
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS section brace + field brace

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle END in InitValue without corrupting context', () => {
      // END keyword in property values should also NOT affect context
      const code = `FIELDS
{
  { 1 ; ; MyField ; Option ; InitValue=End; }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle multiple properties with keyword values in same field', () => {
      // Multiple properties with keyword values in a single field
      const code = `FIELDS
{
  { 1 ; ; Status ; Option ; OptionString=Begin,Middle,End; InitValue=Begin; Description=Begin state }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // All braces should be structural RightBrace tokens
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Trigger properties - BEGIN SHOULD push CODE_BLOCK', () => {
    it('should push CODE_BLOCK context for OnValidate trigger with BEGIN', () => {
      // OnValidate is a TRIGGER property - BEGIN...END should start code block
      const code = `FIELDS
{
  { 1 ; ; MyField ; Code20 ; OnValidate=BEGIN x := 1; END; }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find BEGIN token
      const beginToken = tokens.find(t => t.type === TokenType.Begin);
      expect(beginToken).toBeDefined();

      // The closing brace of the field should still be RightBrace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS + field

      // Verify no UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle OnInsert table trigger with BEGIN...END', () => {
      // OnInsert is a table-level trigger
      const code = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
    OnInsert=BEGIN DoInsert; END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const beginToken = tokens.find(t => t.type === TokenType.Begin);
      const endToken = tokens.find(t => t.type === TokenType.End);
      expect(beginToken).toBeDefined();
      expect(endToken).toBeDefined();

      // All braces should be structural
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // PROPERTIES closing + object closing

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle OnLookup field trigger with BEGIN...END', () => {
      // OnLookup is a field-level trigger
      const code = `FIELDS
{
  { 1 ; ; CustomerNo ; Code20 ; OnLookup=BEGIN Lookup; END; }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const beginToken = tokens.find(t => t.type === TokenType.Begin);
      const endToken = tokens.find(t => t.type === TokenType.End);
      expect(beginToken).toBeDefined();
      expect(endToken).toBeDefined();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should treat braces as comments inside trigger BEGIN...END', () => {
      // Inside trigger code, { } should be treated as COMMENTS
      const code = `FIELDS
{
  { 1 ; ; MyField ; Code20 ; OnValidate=BEGIN { comment } x := 1; END; }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The { } inside BEGIN...END should be skipped as comments
      // We should find: BEGIN, x, :=, 1, ;, END
      const beginIndex = tokens.findIndex(t => t.type === TokenType.Begin);
      const endIndex = tokens.findIndex(t => t.type === TokenType.End);

      expect(beginIndex).toBeGreaterThan(-1);
      expect(endIndex).toBeGreaterThan(beginIndex);

      // Between BEGIN and END, check for the code tokens (not the comment)
      const codeTokens = tokens.slice(beginIndex + 1, endIndex);
      const xToken = codeTokens.find(t => t.value === 'x');
      expect(xToken).toBeDefined();

      // No LeftBrace or RightBrace should exist between BEGIN and END
      // (they should be consumed as comments)
      const braceTokensInCode = codeTokens.filter(t =>
        t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace
      );
      expect(braceTokensInCode).toHaveLength(0);

      // Field closing brace should still be structural RightBrace
      const allRightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(allRightBraces.length).toBe(2); // FIELDS + field

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Mixed scenarios - properties and triggers in same field', () => {
    it('should handle field with both non-trigger and trigger properties', () => {
      // CRITICAL TEST: Field has InitValue=Begin (property value) AND OnValidate=BEGIN (trigger code)
      // This is the most complex scenario that exposes the bug
      const code = `FIELDS
{
  { 1 ; ; Status ; Option ;
    OptionString=Begin,End;
    InitValue=Begin;
    OnValidate=BEGIN ValidateStatus; END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The field closing brace should be RightBrace, not UNKNOWN
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS + field

      // No UNKNOWN tokens should exist
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Verify BEGIN and END tokens are only for trigger code, not property values
      // NEW BEHAVIOR (after bug fix): The lexer distinguishes between:
      // - OptionString=Begin,End  -> IDENTIFIER tokens (property values)
      // - InitValue=Begin         -> IDENTIFIER token (property value)
      // - OnValidate=BEGIN...END  -> BEGIN/END keywords (code delimiters)
      // Total: 1 BEGIN token (OnValidate), 1 END token (OnValidate)
      const beginTokens = tokens.filter(t => t.type === TokenType.Begin);
      const endTokens = tokens.filter(t => t.type === TokenType.End);
      expect(beginTokens.length).toBe(1); // Only OnValidate BEGIN (not property values)
      expect(endTokens.length).toBe(1); // Only OnValidate END (not property values)

      // Verify "Begin" and "End" in property values are IDENTIFIER tokens
      const identifiers = tokens.filter(t => t.type === TokenType.Identifier && (t.value === 'Begin' || t.value === 'End'));
      expect(identifiers.length).toBe(3); // OptionString Begin, OptionString End, InitValue Begin
    });

    it('should handle multiple fields with mix of property values and triggers', () => {
      // Multiple fields with different property/trigger combinations
      const code = `FIELDS
{
  { 1 ; ; Field1 ; Option ; InitValue=Begin; }
  { 2 ; ; Field2 ; Code20 ; OnValidate=BEGIN Check; END; }
  { 3 ; ; Field3 ; Option ; OptionString=Begin,End }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have: FIELDS section brace + 3 field braces = 4 pairs
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(4);

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Context corruption symptoms - what the bug causes', () => {
    it('should NOT corrupt closing brace of field with InitValue=Begin', () => {
      // This test explicitly checks the bug symptom:
      // The closing `}` becoming UNKNOWN instead of RightBrace
      const code = `FIELDS
{
  { 1 ; ; MyField ; Option ; InitValue=Begin; }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the last RightBrace (should be the field closing brace)
      const lastRightBrace = tokens.reverse().find(t => t.type === TokenType.RightBrace);
      tokens.reverse(); // restore order

      expect(lastRightBrace).toBeDefined();
      expect(lastRightBrace!.value).toBe('}');

      // Critical assertion: NO tokens should be UNKNOWN
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      if (unknownTokens.length > 0) {
        // Provide detailed failure info to help diagnose
        const unknownValues = unknownTokens.map(t => `"${t.value}" at line ${t.line}`);
        throw new Error(
          `BUG DETECTED: Found ${unknownTokens.length} UNKNOWN tokens: ${unknownValues.join(', ')}. ` +
          `This indicates CODE_BLOCK context was incorrectly pushed by property value.`
        );
      }
      expect(unknownTokens).toHaveLength(0);
    });

    it('should maintain balanced braces with property value keywords', () => {
      // Context corruption causes unbalanced brace detection
      const code = `FIELDS
{
  { 1 ; ; Field1 ; Option ; InitValue=Begin; }
  { 2 ; ; Field2 ; Option ; InitValue=End; }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);

      // Should be balanced: FIELDS section + 2 fields = 3 pairs
      expect(leftBraces.length).toBe(3);
      expect(rightBraces.length).toBe(3);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle subsequent fields after field with InitValue=Begin', () => {
      // Bug often corrupts parsing of subsequent fields
      const code = `FIELDS
{
  { 1 ; ; Status ; Option ; InitValue=Begin; }
  { 2 ; ; Name ; Code50 }
  { 3 ; ; Amount ; Decimal }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // All 3 fields should be properly closed
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(4); // FIELDS + 3 fields

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // All field numbers should be recognized
      const fieldNumbers = tokens.filter(t =>
        t.type === TokenType.Integer &&
        ['1', '2', '3'].includes(t.value)
      );
      expect(fieldNumbers.length).toBe(3);
    });
  });

  describe('Property name recognition - ensure triggers are distinguished', () => {
    it('should recognize OnValidate as trigger property name', () => {
      const code = `OnValidate=BEGIN x := 1; END;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // OnValidate should be recognized as an identifier (property name)
      const onValidateToken = tokens.find(t => t.value === 'OnValidate' || t.value === 'ONVALIDATE');
      expect(onValidateToken).toBeDefined();

      // Followed by = sign and BEGIN
      const beginToken = tokens.find(t => t.type === TokenType.Begin);
      expect(beginToken).toBeDefined();
    });

    it('should recognize OnInsert as trigger property name', () => {
      const code = `OnInsert=BEGIN DoInsert; END;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const onInsertToken = tokens.find(t => t.value === 'OnInsert' || t.value === 'ONINSERT');
      expect(onInsertToken).toBeDefined();
    });

    it('should recognize InitValue as non-trigger property name', () => {
      const code = `InitValue=Begin;`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // InitValue should be an identifier
      const initValueToken = tokens.find(t => t.value === 'InitValue' || t.value === 'INITVALUE');
      expect(initValueToken).toBeDefined();

      // No BEGIN token should be created (it's a value, not a keyword in this context)
      // Note: The current implementation may tokenize "Begin" as Begin token,
      // but it should NOT push CODE_BLOCK context
    });
  });

  describe('Edge cases', () => {
    it('should handle empty trigger BEGIN END', () => {
      const code = `FIELDS
{
  { 1 ; ; MyField ; Code20 ; OnValidate=BEGIN END; }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const beginToken = tokens.find(t => t.type === TokenType.Begin);
      const endToken = tokens.find(t => t.type === TokenType.End);
      expect(beginToken).toBeDefined();
      expect(endToken).toBeDefined();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle case variations of BEGIN in property values', () => {
      const testCases = ['Begin', 'BEGIN', 'begin'];

      testCases.forEach(beginVariant => {
        const code = `FIELDS
{
  { 1 ; ; MyField ; Option ; InitValue=${beginVariant}; }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2); // FIELDS + field

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);
      });
    });

    it('should handle properties with semicolons in complex field', () => {
      // Semicolons are property delimiters - ensure proper parsing
      const code = `FIELDS
{
  { 1 ; ; Field1 ; Option ;
    OptionString=A,B,C;
    InitValue=Begin;
    Description=Test;
    OnValidate=BEGIN Validate; END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Count semicolons (property delimiters + statement terminators)
      const semicolons = tokens.filter(t => t.type === TokenType.Semicolon);
      expect(semicolons.length).toBeGreaterThan(0);

      // Verify field structure is intact
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS + field

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });
});
