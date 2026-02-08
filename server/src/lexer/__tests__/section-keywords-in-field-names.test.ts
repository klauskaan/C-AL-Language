/**
 * Lexer Tests - Section Keywords in Field Names
 *
 * Tests handling of section keywords (Code, Properties, FieldGroups, Actions,
 * DataItems, RequestForm) when they appear in field names.
 *
 * BUG SCENARIO:
 * When unquoted section keywords appear in COL_3 (field name position) of a
 * field definition, the lexer incorrectly:
 * 1. Sets currentSectionType = null
 * 2. Sets lastWasSectionKeyword = true
 * 3. Corrupts the lexer context for subsequent tokens
 *
 * Example problematic field:
 *   { 1 ; ; Code ; Code[20] }
 *           ^^^^ First "Code" is field name (COL_3), should NOT affect context
 *
 * CORRECT BEHAVIOR:
 * - Field name position (COL_3): after second `;` before data type
 * - Section keyword in field name → treated as TEXT, NO context change
 * - Section keyword at top level → proper section start, context changes
 * - The closing `}` must always be RightBrace, never UNKNOWN
 *
 * ROOT CAUSE:
 * The lexer treats section keywords as special regardless of position within
 * field definitions. It doesn't distinguish between:
 *   { FieldNo ; Enabled ; FieldName ; DataType }
 *                         ^^^^^^^^^ COL_3 - section keywords here are TEXT
 * And:
 *   } Properties { ... }
 *     ^^^^^^^^^^ Top-level section keyword
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Section Keywords in Field Names', () => {
  describe('Individual section keywords in field names (COL_3)', () => {
    it('should handle "Code" as field name without corrupting context', () => {
      // "Code" in COL_3 should be treated as field name text
      const code = `FIELDS
{
  { 1 ; ; Code ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The closing brace should be RightBrace, not UNKNOWN
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS section + field

      // Verify no UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Verify brace balance
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "Properties" as field name without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Properties ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "FieldGroups" as field name without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; FieldGroups ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "Actions" as field name without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; Actions ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "DataItems" as field name without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; DataItems ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "RequestForm" as field name without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; RequestForm ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('Dual CODE meaning - field name vs data type', () => {
    it('should handle "Code" as both field name and data type', () => {
      // CRITICAL: First "Code" is field name (COL_3), second "Code" is data type
      const code = `FIELDS
{
  { 1 ; ; Code ; Code[20] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find both "Code" tokens
      const codeTokens = tokens.filter(t =>
        t.value.toUpperCase() === 'CODE' &&
        (t.type === TokenType.Identifier || t.type === TokenType.Code_Type)
      );
      // Should have at least 2: field name + data type
      expect(codeTokens.length).toBeGreaterThanOrEqual(2);

      // The closing brace MUST be RightBrace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS section + field

      // No UNKNOWN tokens - this will fail if context is corrupted
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Braces should be balanced
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle "Code" field name with non-Code data type', () => {
      // "Code" as field name, but data type is Text
      const code = `FIELDS
{
  { 1 ; ; Code ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Cascading corruption - section keyword followed by BEGIN/END in field name', () => {
    it('should handle field with section keyword name BEFORE field with BEGIN in name', () => {
      // Field 1 has section keyword "Code", field 2 has "BEGIN Date"
      // If context is corrupted by field 1, field 2 will fail
      const code = `FIELDS
{
  { 1 ; ; Code ; Text50 }
  { 2 ; ; "BEGIN Date" ; Date }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 3 right braces: FIELDS section + 2 fields
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(3);

      // No UNKNOWN tokens (proves context recovered after field 1)
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Braces balanced
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle field with section keyword name AFTER field with BEGIN in name', () => {
      // Reverse order: field 1 has "BEGIN Date", field 2 has section keyword
      const code = `FIELDS
{
  { 1 ; ; "BEGIN Date" ; Date }
  { 2 ; ; Properties ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(3);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle interleaved section keyword and BEGIN/END field names', () => {
      // Multiple fields with various problematic names
      const code = `FIELDS
{
  { 1 ; ; Code ; Text50 }
  { 2 ; ; "Time Begin" ; Time }
  { 3 ; ; Properties ; Text50 }
  { 4 ; ; "Time End" ; Time }
  { 5 ; ; Actions ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 6 right braces: FIELDS section + 5 fields
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(6);

      // No UNKNOWN tokens (context must recover between all fields)
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Verify brace balance
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('Nested braces in field definitions', () => {
    it('should handle section keyword field name with nested braces in properties', () => {
      // "Code" as field name with CaptionML containing braces
      const code = `FIELDS
{
  { 1 ; ; Code ; Code[20] ; CaptionML=[ENU=Code] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Field closing brace must be RightBrace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS section + field

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Verify LEFT_BRACKET is tokenized (from CaptionML=[...])
      const leftBrackets = tokens.filter(t => t.type === TokenType.LeftBracket);
      expect(leftBrackets.length).toBeGreaterThan(0);
    });

    it('should NOT push SECTION_LEVEL context for nested braces in properties', () => {
      // Verify that `{` in property values doesn't push spurious SECTION_LEVEL
      const code = `FIELDS
{
  { 1 ; ; Code ; Code[20] ; SomeProperty={ nested } }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Field closing brace must be RightBrace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(3); // FIELDS section + field + nested property braces

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Braces should be balanced
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('Multi-word field names containing section keywords', () => {
    it('should handle "SWIFT Code" as field name', () => {
      const code = `FIELDS
{
  { 1 ; ; SWIFT Code ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle "Customer Properties" as field name', () => {
      const code = `FIELDS
{
  { 1 ; ; Customer Properties ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle "Action Items" as field name', () => {
      const code = `FIELDS
{
  { 1 ; ; Action Items ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle field name starting with section keyword', () => {
      // "Code Description" starts with "Code"
      const code = `FIELDS
{
  { 1 ; ; Code Description ; Text100 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle field name ending with section keyword', () => {
      // "Item Code" ends with "Code"
      const code = `FIELDS
{
  { 1 ; ; Item Code ; Code20 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Section keywords in different section types', () => {
    it('should handle section keyword in FIELDS section', () => {
      const code = `FIELDS
{
  { 1 ; ; Code ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle section keyword in KEYS section (field reference)', () => {
      // Keys section references field names that may be section keywords
      const code = `KEYS
{
  { ; Code ; Clustered=Yes }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // KEYS section + key definition = 2 pairs
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle section keyword in CONTROLS section (SourceExpr)', () => {
      // CONTROLS section with field reference that is a section keyword
      const code = `CONTROLS
{
  { 1   ; ; Code ; Field }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Mixed case section keywords', () => {
    it('should handle lowercase "code" as field name', () => {
      const code = `FIELDS
{
  { 1 ; ; code ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle uppercase "CODE" as field name', () => {
      const code = `FIELDS
{
  { 1 ; ; CODE ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle mixed case "Code" as field name', () => {
      const code = `FIELDS
{
  { 1 ; ; Code ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle all section keywords in mixed case', () => {
      const code = `FIELDS
{
  { 1 ; ; code ; Text50 }
  { 2 ; ; PROPERTIES ; Text50 }
  { 3 ; ; FieldGroups ; Text50 }
  { 4 ; ; actions ; Text50 }
  { 5 ; ; DataItems ; Text50 }
  { 6 ; ; requestform ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 7 right braces: FIELDS section + 6 fields
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(7);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Integration test - complete table with section keyword field names', () => {
    it('should parse table with multiple section keyword field names', () => {
      // Complete table structure with problematic field names
      const code = `OBJECT Table 50000 Test Table
{
  PROPERTIES
  {
    CaptionML=ENU=Test Table;
  }
  FIELDS
  {
    { 1   ;   ;Primary Key         ;Code10        }
    { 10  ;   ;Code                ;Code20        ;CaptionML=ENU=Code }
    { 11  ;   ;Properties          ;Text50        ;CaptionML=ENU=Properties }
    { 12  ;   ;FieldGroups         ;Text50        ;CaptionML=ENU=FieldGroups }
    { 13  ;   ;Actions             ;Text50        ;CaptionML=ENU=Actions }
    { 14  ;   ;DataItems           ;Text50        ;CaptionML=ENU=DataItems }
    { 15  ;   ;RequestForm         ;Text50        ;CaptionML=ENU=RequestForm }
    { 20  ;   ;SWIFT Code          ;Code20        ;OnValidate=BEGIN
                                                                x := 1;
                                                              END;
                                                   }
  }
  KEYS
  {
    { ; "Primary Key" ; Clustered=Yes }
    { ; Code }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Verify no UNKNOWN tokens - this is the integration success criterion
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      if (unknownTokens.length > 0) {
        const unknownDetails = unknownTokens.map(t =>
          `"${t.value}" at line ${t.line}:${t.column}`
        );
        throw new Error(
          `BUG DETECTED: Found ${unknownTokens.length} UNKNOWN tokens: ${unknownDetails.join(', ')}. ` +
          `This indicates section keyword in field name triggered context corruption.`
        );
      }
      expect(unknownTokens).toHaveLength(0);

      // Verify balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);

      // Should have: PROPERTIES, FIELDS (with 8 fields), KEYS (with 2 keys)
      expect(rightBraces.length).toBeGreaterThan(11); // At least this many structural braces
    });
  });

  describe('Context corruption symptoms - specific bug indicators', () => {
    it('should NOT create UNKNOWN token for field closing brace after section keyword name', () => {
      // Explicit test for the bug symptom: closing `}` becomes UNKNOWN
      const code = `FIELDS
{
  { 1 ; ; Code ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the token after the Text50 type - should be RightBrace
      const textTypeIndex = tokens.findIndex(t =>
        t.value.includes('Text') && t.type === TokenType.Identifier
      );
      expect(textTypeIndex).toBeGreaterThan(-1);

      // Next non-whitespace token should be RightBrace
      const nextTokens = tokens.slice(textTypeIndex + 1);
      const nextBrace = nextTokens.find(t =>
        t.type === TokenType.RightBrace || t.type === TokenType.Unknown
      );

      expect(nextBrace).toBeDefined();
      expect(nextBrace!.type).toBe(TokenType.RightBrace);
      expect(nextBrace!.type).not.toBe(TokenType.Unknown);
    });

    it('should maintain balanced brace count across fields with section keyword names', () => {
      // Context corruption often causes brace count mismatch
      const code = `FIELDS
{
  { 1 ; ; Code ; Text50 }
  { 2 ; ; Normal ; Text50 }
  { 3 ; ; Properties ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);

      expect(leftBraces.length).toBe(4); // FIELDS + 3 fields
      expect(rightBraces.length).toBe(4);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should parse fields after section keyword field name without EOF errors', () => {
      // Bug often causes parser to lose synchronization and hit EOF prematurely
      const code = `FIELDS
{
  { 1 ; ; Code ; Code20 }
  { 2 ; ; "Customer No." ; Code20 }
  { 3 ; ; Name ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // All three field numbers should be tokenized
      const fieldNumbers = tokens.filter(t =>
        t.type === TokenType.Integer &&
        ['1', '2', '3'].includes(t.value)
      );
      expect(fieldNumbers.length).toBe(3);

      // EOF should be the last token, not appearing prematurely
      const eofTokens = tokens.filter(t => t.type === TokenType.EOF);
      expect(eofTokens.length).toBe(1);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle field name with multiple section keyword occurrences', () => {
      const code = `FIELDS
{
  { 1 ; ; "Code Code Code" ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle alternating section keywords in field name', () => {
      const code = `FIELDS
{
  { 1 ; ; "Code Properties Actions" ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle minimal field definition with section keyword name', () => {
      // Shortest possible field with section keyword name
      const code = `FIELDS
{
  { 1 ; ; Code ; Text10 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle field with section keyword name and no optional properties', () => {
      const code = `FIELDS
{
  { 1 ; ; Code ; Code20 }
  { 2 ; ; Properties ; Text50 ; OnValidate=BEGIN Validate; END; }
  { 3 ; ; Actions ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle all six section keywords in consecutive fields', () => {
      // Test all six problematic keywords in one test
      const code = `FIELDS
{
  { 1 ; ; Code ; Text50 }
  { 2 ; ; Properties ; Text50 }
  { 3 ; ; FieldGroups ; Text50 }
  { 4 ; ; Actions ; Text50 }
  { 5 ; ; DataItems ; Text50 }
  { 6 ; ; RequestForm ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have 7 right braces: FIELDS section + 6 fields
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(7);

      // No UNKNOWN tokens (context must recover between all fields)
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Verify brace balance
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });
  });

  describe('ELEMENTS section - section keywords in element names', () => {
    describe('Individual section keywords in element names (COL_3)', () => {
      it('should handle "BEGIN" as element name without corrupting context', () => {
        const code = `ELEMENTS
{
  { BEGIN ; Element ; SourceField=BeginDate }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2); // ELEMENTS section + element

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "Code" as element name without corrupting context', () => {
        const code = `ELEMENTS
{
  { Code ; Element ; SourceField=Code }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "Properties" as element name without corrupting context', () => {
        const code = `ELEMENTS
{
  { Properties ; Element ; SourceField=Properties }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });
    });

    describe('Cascading corruption in ELEMENTS section', () => {
      it('should handle multiple elements with section keyword names', () => {
        const code = `ELEMENTS
{
  { Code ; Element ; SourceField=Code }
  { Properties ; Element ; SourceField=Properties }
  { BEGIN ; Element ; SourceField=BeginDate }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(4); // ELEMENTS section + 3 elements

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });
    });

    describe('Integration test - XMLport with element keyword names', () => {
      it('should parse XMLport with section keywords in element names', () => {
        const code = `OBJECT XMLport 50000 Test Export
{
  PROPERTIES
  {
    CaptionML=ENU=Test Export;
  }
  ELEMENTS
  {
    { Root                      ;Element ;Table=Customer }
    { Code                      ;Element ;SourceField=Code }
    { Properties                ;Element ;SourceField=Properties }
    { BEGIN                     ;Element ;SourceField=BeginDate }
    { END                       ;Element ;SourceField=EndDate }
  }
  CODE
  {
    BEGIN
      x := 1;
    END.
  }
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
  });

  describe('ELEMENTS section - section keywords in dataitem names', () => {
    describe('Individual section keywords in dataitem names (COL_3)', () => {
      it('should handle "Code" as dataitem name without corrupting context', () => {
        const code = `ELEMENTS
{
  { Code ; Table ; Code ; SourceType=Text}
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2); // ELEMENTS section + dataitem

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "Properties" as dataitem name without corrupting context', () => {
        const code = `ELEMENTS
{
  { Properties ; ; Properties ; SourceType=Text}
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "BEGIN" as dataitem name without corrupting context', () => {
        const code = `ELEMENTS
{
  { BEGIN ; ; BEGIN ; SourceType=Text}
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "END" as dataitem name without corrupting context', () => {
        const code = `ELEMENTS
{
  { END ; ; END ; SourceType=Text}
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });
    });

    describe('Cascading corruption in ELEMENTS section', () => {
      it('should handle multiple dataitems with section keyword names', () => {
        const code = `ELEMENTS
{
  { Code ; ; Code ; SourceType=Text}
  { Properties ; ; Properties ; SourceType=Text}
  { BEGIN ; ; BEGIN ; SourceType=Text}
  { END ; ; END ; SourceType=Text}
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(5); // ELEMENTS section + 4 dataitems

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });
    });

    describe('Mixed case in ELEMENTS section', () => {
      it('should handle mixed case section keywords in dataitem names', () => {
        const code = `ELEMENTS
{
  { code ; ; code ; SourceType=Text}
  { PROPERTIES ; ; PROPERTIES ; SourceType=Text}
  { Begin ; ; Begin ; SourceType=Text}
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(4);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });
    });

    describe('Integration test - Report with dataitem keyword names', () => {
      it('should parse Report with section keywords in dataitem names', () => {
        const code = `OBJECT Report 50000 Test Report
{
  PROPERTIES
  {
    CaptionML=ENU=Test Report;
  }
  ELEMENTS
  {
    { Customer          ;         ;Customer                          }
    { Code              ;         ;Code           ;SourceType=Text}
    { Properties        ;         ;Properties     ;SourceType=Text}
    { BEGIN             ;         ;BEGIN          ;SourceType=Text}
    { END               ;         ;END            ;SourceType=Text}
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      CaptionML=ENU=Options;
    }
  }
  CODE
  {
    BEGIN
      x := 1;
    END.
  }
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
  });

  describe('ACTIONS section - section keywords in action names', () => {
    describe('Individual section keywords in action names (COL_3)', () => {
      it('should handle "Code" as action name without corrupting context', () => {
        const code = `ACTIONS
{
  { 1 ; ; Code ; Action }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2); // ACTIONS section + action

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "Properties" as action name without corrupting context', () => {
        const code = `ACTIONS
{
  { 1 ; ; Properties ; Action }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "BEGIN" as action name without corrupting context', () => {
        const code = `ACTIONS
{
  { 1 ; ; BEGIN ; Action }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "END" as action name without corrupting context', () => {
        const code = `ACTIONS
{
  { 1 ; ; END ; Action }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "Actions" as action name without corrupting context', () => {
        const code = `ACTIONS
{
  { 1 ; ; Actions ; Action }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle "DataItems" as action name without corrupting context', () => {
        const code = `ACTIONS
{
  { 1 ; ; DataItems ; Action }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });
    });

    describe('Cascading corruption in ACTIONS section', () => {
      it('should handle multiple actions with section keyword names', () => {
        const code = `ACTIONS
{
  { 1 ; ; Code ; Action }
  { 2 ; ; Properties ; Action }
  { 3 ; ; BEGIN ; Action }
  { 4 ; ; END ; Action }
  { 5 ; ; Actions ; Action }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(6); // ACTIONS section + 5 actions

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });

      it('should handle action with section keyword name and OnAction trigger', () => {
        const code = `ACTIONS
{
  { 1 ; ; Code ; Action ; OnAction=BEGIN
                                      Message('Test');
                                    END; }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(2);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });
    });

    describe('Mixed case in ACTIONS section', () => {
      it('should handle mixed case section keywords in action names', () => {
        const code = `ACTIONS
{
  { 1 ; ; code ; Action }
  { 2 ; ; PROPERTIES ; Action }
  { 3 ; ; Begin ; Action }
  { 4 ; ; End ; Action }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(5);

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });
    });

    describe('Action groups and nested actions', () => {
      it('should handle section keywords in action group names', () => {
        const code = `ACTIONS
{
  { 1 ; ; Code ; ActionGroup }
  { 2 ; 1 ; Action1 ; Action }
  { 3 ; 1 ; Action2 ; Action }
}`;
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
        expect(rightBraces.length).toBe(4); // ACTIONS section + 3 actions

        const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
        expect(unknownTokens).toHaveLength(0);

        const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
        expect(leftBraces.length).toBe(rightBraces.length);
      });
    });

    describe('Integration test - Page with action keyword names', () => {
      it('should parse Page with section keywords in action names', () => {
        const code = `OBJECT Page 50000 Test Page
{
  PROPERTIES
  {
    CaptionML=ENU=Test Page;
    SourceTable=Customer;
  }
  CONTROLS
  {
    { 1   ; ; Name ; Field ; SourceExpr="No." }
  }
  ACTIONS
  {
    { 1   ;   ;Code                ;ActionGroup }
    { 2   ;1  ;Properties          ;Action      ;OnAction=BEGIN
                                                             Message('Test');
                                                           END; }
    { 3   ;1  ;BEGIN               ;Action      ;OnAction=BEGIN
                                                             x := 1;
                                                           END; }
    { 4   ;   ;END                 ;ActionGroup }
    { 5   ;4  ;Actions             ;Action      }
    { 6   ;4  ;DataItems           ;Action      }
  }
  CODE
  {
    VAR
      x : Integer;

    BEGIN
      x := 1;
    END.
  }
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
  });

  describe('Cross-section integration - all structured sections', () => {
    it('should handle section keywords across FIELDS, CONTROLS, ELEMENTS, ELEMENTS, and ACTIONS', () => {
      const code = `OBJECT Page 50000 Complete Test
{
  PROPERTIES
  {
    CaptionML=ENU=Test;
  }
  CONTROLS
  {
    { 1 ; ; Code ; Field }
    { 2 ; ; Properties ; Field }
  }
  ACTIONS
  {
    { 1 ; ; BEGIN ; Action }
    { 2 ; ; END ; Action }
    { 3 ; ; Code ; Action }
  }
  CODE
  {
    BEGIN
      x := 1;
    END.
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle Report with ELEMENTS containing section keyword names', () => {
      const code = `OBJECT Report 50000 Complete Report
{
  PROPERTIES
  {
    CaptionML=ENU=Complete Report;
  }
  ELEMENTS
  {
    { Customer    ;         ;Customer                }
    { Code        ;         ;Code        ;OnPreDataItem=BEGIN
                                                       x := 1;
                                                     END; }
    { Properties  ;         ;Properties  ;SourceType=Text}
    { BEGIN       ;         ;BEGIN       ;SourceType=Text}
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
      CaptionML=ENU=Options;
    }
    CONTROLS
    {
      { 1 ; ; Code ; Field }
    }
  }
  CODE
  {
    VAR
      x : Integer;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle XMLport with ELEMENTS containing section keyword names', () => {
      const code = `OBJECT XMLport 50000 Complete XMLport
{
  PROPERTIES
  {
    CaptionML=ENU=Complete XMLport;
  }
  ELEMENTS
  {
    { Root           ;Element ;Table=Customer }
    { Code           ;Element ;SourceField=Code }
    { Properties     ;Element ;SourceField=Properties ;MinOccurs=Zero }
    { BEGIN          ;Element ;SourceField=BeginDate ;OnAfterGetField=BEGIN
                                                                        x := 1;
                                                                      END; }
    { END            ;Element ;SourceField=EndDate }
  }
  CODE
  {
    VAR
      x : Integer;

    BEGIN
    END.
  }
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
});
