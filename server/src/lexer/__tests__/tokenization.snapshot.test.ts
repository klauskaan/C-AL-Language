/**
 * Lexer Tokenization Snapshot Tests
 *
 * Purpose:
 * Comprehensive snapshot testing for the lexer to validate token stream output
 * across diverse C/AL syntax patterns. These tests capture the complete tokenization
 * of representative code samples.
 *
 * What This Tests:
 * - Core object structures (OBJECT, sections, fields)
 * - Context-dependent tokenization (keywords as identifiers, braces as comments)
 * - Nested blocks and control flow (BEGIN/END, IF/THEN, CASE)
 * - Edge cases (comments, string escaping, literals, quoted identifiers)
 *
 * Snapshot Format:
 * Token streams are captured as compact strings (one token per line):
 * Type:value
 * e.g., OBJECT:"OBJECT"\nTable:"Table"\nINTEGER:"18"
 *
 * Updating Snapshots:
 * - Review changes carefully before updating
 * - Run: npm test -- -u (from server/ directory)
 * - Only update after verifying changes are intentional
 *
 * Coverage Strategy:
 * - Core structures: Validate basic object parsing and sections
 * - Context-dependent: Prove brace/keyword handling varies by context
 * - Nested blocks: Ensure context stack management is correct
 * - Edge cases: Validate literal parsing and special characters
 */

import { Lexer } from '../lexer';
import { Token } from '../tokens';

/**
 * Convert token array to snapshot-friendly string format.
 * Excludes positional information (line, column, offsets) for stability.
 * Uses JSON.stringify for values to show escaping clearly.
 *
 * Format: Type:value (one token per line)
 * Example: OBJECT:"OBJECT"\nTable:"Table"\nINTEGER:"18"
 *
 * @param tokens Token array from lexer
 * @returns Compact string representation
 */
function toSnapshot(tokens: Token[]): string {
  return tokens
    .map(token => `${token.type}:${JSON.stringify(token.value)}`)
    .join('\n');
}

describe('Lexer Tokenization Snapshots', () => {
  describe('Core Object Structures', () => {
    it('should tokenize minimal object', () => {
      const code = 'OBJECT Table 18 { }';
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize object with OBJECT-PROPERTIES section', () => {
      const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=14.01.26;
    Time=12:00:00;
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize object with PROPERTIES section', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    DataPerCompany=Yes;
    Caption=Customer;
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize object with FIELDS section', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize object with CODE section and triggers', () => {
      const code = `OBJECT Table 18 Customer
{
  CODE
  {
    BEGIN
    END.
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize complete table with all sections', () => {
      const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=14.01.26;
  }
  PROPERTIES
  {
    Caption=Customer;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
  KEYS
  {
    {    ;No.                                     }
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });
  });

  describe('Context-Dependent Tokenization', () => {
    it('should tokenize keywords as identifiers in field names', () => {
      const code = `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;BEGIN               ;Integer       }
    { 2   ;   ;END                 ;Integer       }
    { 3   ;   ;CODE                ;Integer       }
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize section keywords in field names', () => {
      const code = `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;PROPERTIES          ;Integer       }
    { 2   ;   ;FIELDGROUPS         ;Integer       }
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize braces as structural tokens in PROPERTIES values', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    Caption={ This is a comment };
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize braces as comments in CODE context (swallowed from token stream)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DoSomething@1();
    BEGIN
      { This is a comment }
      MESSAGE('Hello');
    END;

    BEGIN
    END.
  }
}`;
      // Note: The brace comment content is NOT in the snapshot - it's swallowed by the lexer
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize BEGIN/END in property values as identifiers', () => {
      const code = `OBJECT Table 18 Test
{
  PROPERTIES
  {
    InitValue=Begin;
    TestValue=End;
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize BEGIN/END in OptionCaptionML brackets as identifiers', () => {
      const code = `OBJECT Table 18 Test
{
  FIELDS
  {
    { 1   ;   ;Status              ;Option        ;OptionCaptionML=[ENU=Begin,End,Processing];
                                                    OptionString=Begin,End,Processing }
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize trigger property with BEGIN/END as keywords', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        ;OnValidate=BEGIN
                                                                 TESTFIELD(Name);
                                                               END;
                                                                }
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });
  });

  describe('Nested Blocks and Control Flow', () => {
    it('should tokenize simple BEGIN/END block', () => {
      const code = `BEGIN
  x := 5;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize nested BEGIN/END blocks (2 levels)', () => {
      const code = `BEGIN
  x := 1;
  BEGIN
    y := 2;
  END;
  z := 3;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize deeply nested BEGIN/END blocks (3 levels)', () => {
      const code = `BEGIN
  x := 1;
  BEGIN
    y := 2;
    BEGIN
      z := 3;
    END;
  END;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize IF/THEN/ELSE structure', () => {
      const code = `BEGIN
  IF x > 0 THEN
    y := 1
  ELSE
    y := 2;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize nested IF/THEN/ELSE', () => {
      const code = `BEGIN
  IF x > 0 THEN BEGIN
    IF y > 0 THEN
      z := 1
    ELSE
      z := 2;
  END ELSE
    z := 3;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize CASE statement', () => {
      const code = `BEGIN
  CASE Status OF
    0: Message := 'Open';
    1: Message := 'Closed';
    2: BEGIN
         Message := 'Processing';
         { Comment in case block }
       END;
  END;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize WHILE loop', () => {
      const code = `BEGIN
  WHILE x < 10 DO BEGIN
    x := x + 1;
  END;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize REPEAT/UNTIL loop', () => {
      const code = `BEGIN
  REPEAT
    x := x + 1;
  UNTIL x >= 10;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize FOR loop', () => {
      const code = `BEGIN
  FOR i := 1 TO 10 DO BEGIN
    x := x + i;
  END;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });
  });

  describe('Edge Cases', () => {
    it('should tokenize single-line comment', () => {
      const code = `// This is a comment
x := 5;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize C-style comment', () => {
      const code = `/* This is a
   multi-line comment */
x := 5;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize string literal with escaped quotes', () => {
      const code = `BEGIN
  MESSAGE('don''t');
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize multi-line string literal', () => {
      const code = `BEGIN
  MESSAGE('Line 1
Line 2
Line 3');
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize DATE literal (short format MMDDYY)', () => {
      const code = `x := 060120D;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize DATE literal (long format MMDDYYYY)', () => {
      const code = `x := 06012020D;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize undefined DATE literal', () => {
      const code = `x := 0D;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize TIME literal', () => {
      const code = `x := 120000T;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize undefined TIME literal', () => {
      const code = `x := 0T;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize DateTime literal', () => {
      const code = `x := 060120D120000T;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize undefined DateTime literal', () => {
      const code = `x := 0DT;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize quoted identifier', () => {
      const code = `"Field Name" := 5;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize quoted identifier with special characters', () => {
      const code = `"Field/Name-123" := 5;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize mixed arithmetic operators', () => {
      const code = `x := (a + b) * c / d - e MOD f DIV g;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize compound assignment operators', () => {
      const code = `BEGIN
  x += 5;
  y -= 3;
  z *= 2;
  w /= 4;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize comparison operators', () => {
      const code = `BEGIN
  IF (x = y) AND (a <> b) AND (c < d) AND (e <= f) AND (g > h) AND (i >= j) THEN
    EXIT;
END`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize boolean operators', () => {
      const code = `result := (a AND b) OR (c XOR d) AND (NOT e);`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize OBJECT-PROPERTIES compound keyword', () => {
      const code = `OBJECT-PROPERTIES
{
  Date=14.01.26;
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize Format/Evaluate compound property', () => {
      const code = `OBJECT XMLport 50000 Test
{
  ELEMENTS
  {
    { 1   ;   ;Root                ; ;Format/Evaluate=XML Format/Evaluate }
  }
}`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize scope operator (::)', () => {
      const code = `x := Status::Open;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize range operator (..)', () => {
      const code = `Customer.SETRANGE("No.", '1000'..'2000');`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize AL-only keywords', () => {
      const code = `enum interface extends implements`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize AL-only access modifiers', () => {
      const code = `internal protected public`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize preprocessor directives', () => {
      const code = `#if DEBUG
  MESSAGE('Debug mode');
#endif`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize ternary operator (not supported in C/AL)', () => {
      const code = `result := condition ? trueValue : falseValue;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize decimal numbers', () => {
      const code = `x := 123.45;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize variable with @ number', () => {
      const code = `MyVar@1000 : Integer;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });

    it('should tokenize TEMPORARY keyword in variable declaration', () => {
      const code = `TempCustomer@1000 : TEMPORARY Record 18;`;
      const tokens = new Lexer(code).tokenize();
      expect(toSnapshot(tokens)).toMatchSnapshot();
    });
  });
});
