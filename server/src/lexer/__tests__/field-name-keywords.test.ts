/**
 * Lexer Tests - Field Names Containing BEGIN/END Keywords
 *
 * Tests the critical distinction between:
 * - Field NAMES containing keywords (should NOT push CODE_BLOCK context)
 * - Trigger CODE containing keywords (SHOULD push CODE_BLOCK context)
 *
 * BUG SCENARIO:
 * When a field is named "Time Begin" or "Shop Fl. Begin -> Time Begin",
 * the lexer incorrectly interprets the word BEGIN as a code block start.
 * This happens because the lexer doesn't track that we're parsing a field
 * name (between second semicolon and data type).
 *
 * Example problematic field:
 *   { 6005550;;Shop Fl. Begin -> Time Begin;Boolean; ... }
 *                     ^^^^^ Incorrectly triggers CODE_BLOCK context
 *
 * CORRECT BEHAVIOR:
 * - Field name position: after second `;` before data type
 * - BEGIN in field name → TEXT VALUE, no context change
 * - BEGIN in trigger code → CODE START, push CODE_BLOCK context
 * - The closing `}` must always be RightBrace, never UNKNOWN
 *
 * ROOT CAUSE:
 * The lexer doesn't track column position in field definitions:
 *   { FieldNo ; Enabled ; FieldName ; DataType ; Properties }
 *              ^^^^^^^   ^^^^^^^^^^
 *              Column 2   Column 3 - BEGIN/END here are TEXT, not keywords
 *
 * These tests MUST FAIL initially to validate the bug exists.
 */

import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Field Names Containing BEGIN/END Keywords', () => {
  describe('Unquoted field names with keyword prefixes', () => {
    it('should handle field name BeginDate without entering CODE_BLOCK', () => {
      // Field name starts with "Begin" but is a single identifier
      const code = `FIELDS
{
  { 1 ; ; BeginDate ; Date }
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

    it('should handle field name EndDate without corrupting context', () => {
      const code = `FIELDS
{
  { 1 ; ; EndDate ; Date }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Quoted field names containing keywords', () => {
    it('should treat BEGIN in quoted field name as text, not code block start', () => {
      // CRITICAL: "Time Begin" is a field NAME (column 3), not a code keyword
      const code = `FIELDS
{
  { 1 ; ; "Time Begin" ; Date }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The closing brace MUST be RightBrace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS section + field

      // No UNKNOWN tokens - this will fail if CODE_BLOCK context is pushed
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Braces should be balanced
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should treat END in quoted field name as text, not code block end', () => {
      const code = `FIELDS
{
  { 1 ; ; "Time End" ; Date }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle field name containing both BEGIN and END keywords', () => {
      // Real-world pattern: "Shop Fl. Begin -> Time Begin"
      const code = `FIELDS
{
  { 1 ; ; "BEGIN to END" ; Text50 }
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

    it('should handle field name that is exactly "BEGIN"', () => {
      // Edge case: field literally named "BEGIN"
      const code = `FIELDS
{
  { 1 ; ; "BEGIN" ; Text10 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle field name that is exactly "END"', () => {
      const code = `FIELDS
{
  { 1 ; ; "END" ; Text10 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Real-world field name patterns from NAV', () => {
    it('should handle "Shop Fl. Begin -> Time Begin" field name', () => {
      // EXACT pattern from TAB5218 that caused the bug report
      const code = `FIELDS
{
  { 6005550 ; ; Shop Fl. Begin -> Time Begin ; Boolean }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // The field must be properly closed
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      // No UNKNOWN tokens (this fails if BEGIN triggers CODE_BLOCK)
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle "Time Begin -> Shop Fl. Begin" field name', () => {
      // Another real pattern from TAB5218
      const code = `FIELDS
{
  { 6005552 ; ; Time Begin -> Shop Fl. Begin ; Boolean }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle "Time End -> Shop Fl. End" field name', () => {
      const code = `FIELDS
{
  { 6005551 ; ; Time End -> Shop Fl. End ; Boolean }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle "Insert missing Begin" field name', () => {
      const code = `FIELDS
{
  { 6005557 ; ; Insert missing Begin ; Boolean }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle "Insert missing End" field name', () => {
      const code = `FIELDS
{
  { 6005558 ; ; Insert missing End ; Boolean }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Field with keyword name AND trigger code', () => {
    it('should distinguish field name "BEGIN Date" from trigger BEGIN keyword', () => {
      // COMPLEX: Field named "BEGIN Date" with OnValidate trigger containing BEGIN...END
      const code = `FIELDS
{
  { 1 ; ; "BEGIN Date" ; Date ; OnValidate=BEGIN x := 1; END; }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Field closing brace must be RightBrace
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2); // FIELDS + field

      // No UNKNOWN tokens
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Verify BEGIN tokens exist (from trigger)
      const beginTokens = tokens.filter(t => t.type === TokenType.Begin);
      expect(beginTokens.length).toBeGreaterThan(0);
    });

    it('should handle "Time Begin" field with CaptionML containing "Begin"', () => {
      // Nested complexity: Field name has BEGIN, caption text has "Begin"
      const code = `FIELDS
{
  { 1 ; ; "Time Begin" ; Time ; CaptionML=[ENU=Time Begin] }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Multiple fields with keyword names in sequence', () => {
    it('should handle consecutive fields with BEGIN/END in names', () => {
      // Multiple fields with problematic names - tests context recovery
      const code = `FIELDS
{
  { 1 ; ; "Time Begin" ; Time }
  { 2 ; ; "Time End" ; Time }
  { 3 ; ; "Begin Date" ; Date }
  { 4 ; ; "End Date" ; Date }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Should have FIELDS section brace + 4 field braces = 5 pairs
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(5);

      // No UNKNOWN tokens (context must recover between fields)
      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);

      // Verify brace balance
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should handle fields with keywords mixed with normal fields', () => {
      const code = `FIELDS
{
  { 1 ; ; "Customer No." ; Code20 }
  { 2 ; ; "Time Begin" ; Time }
  { 3 ; ; Name ; Text50 }
  { 4 ; ; "Time End" ; Time }
  { 5 ; ; Amount ; Decimal }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(6); // FIELDS + 5 fields

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Keys section with keyword names', () => {
    it('should handle BEGIN keyword in key field list', () => {
      // Keys section references field names that may contain keywords
      const code = `KEYS
{
  { ; "BEGIN Date","END Date" ; Clustered=Yes }
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

    it('should handle complex key with multiple keyword-containing field names', () => {
      const code = `KEYS
{
  { ; "Time Begin","Shop Fl. Begin","Time End" }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });
  });

  describe('Integration test - complete table with problematic fields', () => {
    it('should parse table with fields containing BEGIN/END in names', () => {
      // Simplified version of TAB5218 structure
      // NOTE: Omit @ numbers in VAR declarations - lexer tokenizes @ as UNKNOWN by design
      const code = `OBJECT Table 50000 Test Table
{
  PROPERTIES
  {
    CaptionML=ENU=Test Table;
  }
  FIELDS
  {
    { 1   ;   ;Primary Key         ;Code10        }
    { 10  ;   ;Shop Fl. Begin -> Time Begin;Boolean;
                                                   CaptionML=ENU=Shop Fl. Begin -> Time Begin }
    { 11  ;   ;Time End -> Shop Fl. End;Boolean   ;CaptionML=ENU=Time End -> Shop Fl. End }
    { 12  ;   ;Time Begin -> Shop Fl. Begin;Boolean;
                                                   CaptionML=ENU=Time Begin -> Shop Fl. Begin }
    { 20  ;   ;Manual Stamp Begin  ;Time          ;OnValidate=BEGIN
                                                                x := 1;
                                                              END;
                                                   }
  }
  KEYS
  {
    { ; "Primary Key" ; Clustered=Yes }
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
          `This indicates BEGIN in field name triggered CODE_BLOCK context corruption.`
        );
      }
      expect(unknownTokens).toHaveLength(0);

      // Verify balanced braces
      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(leftBraces.length).toBe(rightBraces.length);

      // Should have: PROPERTIES, FIELDS (with 5 fields), KEYS (with 1 key) = proper structure
      expect(rightBraces.length).toBeGreaterThan(8); // At least this many structural braces
    });
  });

  describe('Context corruption symptoms - specific bug indicators', () => {
    it('should NOT create UNKNOWN token for field closing brace after keyword name', () => {
      // Explicit test for the bug symptom: closing `}` becomes UNKNOWN
      const code = `FIELDS
{
  { 1 ; ; "Time Begin" ; Date }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Find the token after the Date type - should be RightBrace
      const dateTypeIndex = tokens.findIndex(t => t.value === 'Date' && t.type === TokenType.Date_Type);
      expect(dateTypeIndex).toBeGreaterThan(-1);

      // Next non-whitespace token should be RightBrace
      const nextTokens = tokens.slice(dateTypeIndex + 1);
      const nextBrace = nextTokens.find(t =>
        t.type === TokenType.RightBrace || t.type === TokenType.Unknown
      );

      expect(nextBrace).toBeDefined();
      expect(nextBrace!.type).toBe(TokenType.RightBrace);
      expect(nextBrace!.type).not.toBe(TokenType.Unknown);
    });

    it('should maintain balanced brace count across fields with keyword names', () => {
      // Context corruption often causes brace count mismatch
      const code = `FIELDS
{
  { 1 ; ; "Begin Field" ; Date }
  { 2 ; ; Normal ; Text50 }
  { 3 ; ; "End Field" ; Date }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const leftBraces = tokens.filter(t => t.type === TokenType.LeftBrace);
      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);

      expect(leftBraces.length).toBe(4); // FIELDS + 3 fields
      expect(rightBraces.length).toBe(4);
      expect(leftBraces.length).toBe(rightBraces.length);
    });

    it('should parse fields after keyword-name field without EOF errors', () => {
      // Bug often causes parser to lose synchronization and hit EOF prematurely
      const code = `FIELDS
{
  { 1 ; ; "Time Begin" ; Time }
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
    it('should handle field name with multiple BEGIN occurrences', () => {
      const code = `FIELDS
{
  { 1 ; ; "BEGIN BEGIN BEGIN" ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle alternating BEGIN and END in field name', () => {
      const code = `FIELDS
{
  { 1 ; ; "BEGIN END BEGIN END" ; Text50 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle field name with BEGIN at start, middle, and end', () => {
      const code = `FIELDS
{
  { 1 ; ; "BEGIN middle BEGIN end BEGIN" ; Text100 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle minimal field definition with keyword name', () => {
      // Shortest possible field with problematic name
      const code = `FIELDS
{
  { 1 ; ; BEGIN ; Text10 }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      const rightBraces = tokens.filter(t => t.type === TokenType.RightBrace);
      expect(rightBraces.length).toBe(2);

      const unknownTokens = tokens.filter(t => t.type === TokenType.Unknown);
      expect(unknownTokens).toHaveLength(0);
    });

    it('should handle field with keyword name and no optional properties', () => {
      const code = `FIELDS
{
  { 1 ; ; "Time Begin" ; Time }
  { 2 ; ; "Time End" ; Time ; OnValidate=BEGIN Validate; END; }
  { 3 ; ; "Time Span" ; Duration }
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
