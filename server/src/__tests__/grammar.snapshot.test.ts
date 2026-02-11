/**
 * TextMate Grammar Scope Tests
 *
 * Purpose: Regression testing for TextMate grammar scopes defined in syntaxes/cal.tmLanguage.json
 *
 * What it tests:
 * - Scope assignments for grammar repository rules (keywords, operators, comments, etc.)
 * - Context-dependent behavior (e.g., curly braces as comments vs. structural delimiters)
 * - Token classification for syntax highlighting
 *
 * Snapshot format:
 * - Lines prefixed with '>' show the original source code
 * - Token lines show: JSON-quoted text (left-padded to ~25 chars) + innermost scope
 * - Example:
 *     >PROCEDURE MyProc@1();
 *      "PROCEDURE"               keyword.other.cal
 *      " "                       source.cal
 *      "MyProc"                  entity.name.function.cal
 *      "@1"                      constant.numeric.at-number.cal
 *
 * How to update snapshots:
 * - Run: npm test -- -u
 * - Review changes carefully before committing
 * - Verify that scope changes match intended grammar modifications
 *
 * How to add new tests:
 * - Add a new test case with inline code string
 * - Call toGrammarSnapshot() with the code
 * - Use expect(result).toMatchSnapshot()
 * - Run with -u to generate initial snapshot
 */

import { initializeGrammar, toGrammarSnapshot } from './helpers/grammar';

// Initialize grammar once before all tests
beforeAll(async () => {
  await initializeGrammar();
});

describe('TextMate Grammar Scopes', () => {
  describe('Object declarations', () => {
    it('should tokenize minimal object declaration', async () => {
      const code = `OBJECT Table 18 Customer
{
}`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize different object types', async () => {
      const code = `OBJECT Codeunit 50000 MyCodeunit
{
}`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize page object', async () => {
      const code = `OBJECT Page 21 Customer Card
{
}`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize report object', async () => {
      const code = `OBJECT Report 101 Sales Invoice
{
}`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Procedure declarations', () => {
    it('should tokenize simple procedure with at-number', async () => {
      const code = `PROCEDURE Calculate@1();`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize procedure with parameters', async () => {
      const code = `PROCEDURE Process@1(VAR Amount@1000 : Decimal; Count@1001 : Integer);`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize procedure with External attribute', async () => {
      const code = `[External]
PROCEDURE PublicMethod@1();`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize procedure with TryFunction attribute', async () => {
      const code = `[TryFunction]
LOCAL PROCEDURE TryOperation@1() : Boolean;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize procedure with EventSubscriber attribute', async () => {
      const code = `[EventSubscriber(Table,18,OnAfterInsert,'',false,false)]
LOCAL PROCEDURE OnCustomerInsert@1();`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    describe('Attributes - case insensitivity', () => {
      it('should tokenize lowercase External attribute', async () => {
        const code = `[external]
PROCEDURE PublicMethod@1();`;
        const result = await toGrammarSnapshot(code);
        expect(result).toMatchSnapshot();
      });

      it('should tokenize mixed-case External attribute', async () => {
        const code = `[ExTerNal]
PROCEDURE PublicMethod@1();`;
        const result = await toGrammarSnapshot(code);
        expect(result).toMatchSnapshot();
      });

      it('should tokenize lowercase TryFunction attribute', async () => {
        const code = `[tryfunction]
LOCAL PROCEDURE TryOperation@1() : Boolean;`;
        const result = await toGrammarSnapshot(code);
        expect(result).toMatchSnapshot();
      });

      it('should tokenize mixed-case TryFunction attribute', async () => {
        const code = `[TrYfUnCtIoN]
LOCAL PROCEDURE TryOperation@1() : Boolean;`;
        const result = await toGrammarSnapshot(code);
        expect(result).toMatchSnapshot();
      });

      it('should tokenize lowercase EventSubscriber attribute', async () => {
        const code = `[eventsubscriber(Table,18,OnAfterInsert,'',false,false)]
LOCAL PROCEDURE OnCustomerInsert@1();`;
        const result = await toGrammarSnapshot(code);
        expect(result).toMatchSnapshot();
      });

      it('should tokenize mixed-case EventSubscriber attribute', async () => {
        const code = `[eVeNtSuBsCrIbEr(Table,18,OnAfterInsert,'',false,false)]
LOCAL PROCEDURE OnCustomerInsert@1();`;
        const result = await toGrammarSnapshot(code);
        expect(result).toMatchSnapshot();
      });
    });
  });

  describe('Code blocks - context-dependent curly braces', () => {
    it('should tokenize BEGIN/END with statements', async () => {
      const code = `BEGIN
  Amount := 100;
  MESSAGE('Done');
END`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should treat curly braces as comments inside BEGIN/END', async () => {
      const code = `BEGIN
  { This is a comment }
  MESSAGE('Hello');
END`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should treat curly braces as structural in field definitions', async () => {
      const code = `FIELDS
{
  { 1   ;   ;No.                 ;Code20        }
}`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize nested BEGIN/END blocks', async () => {
      const code = `BEGIN
  IF Amount > 0 THEN BEGIN
    Total := Total + Amount;
  END;
END`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Variable declarations', () => {
    it('should tokenize simple variable', async () => {
      const code = `MyVar@1001 : Integer;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize record variable', async () => {
      const code = `Customer@1000 : Record 18;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize TEMPORARY variable', async () => {
      const code = `TempCustomer@1000 : TEMPORARY Record 18;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Expressions and operators', () => {
    it('should tokenize assignment operator', async () => {
      const code = `Amount := 100;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize comparison operators', async () => {
      const code = `IF (A = B) AND (C <> D) AND (E > F) THEN`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize scope operator', async () => {
      const code = `Status := Status::Open;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize range operator', async () => {
      const code = `Customer.SETRANGE("No.", '10000'..'20000');`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize logical operators', async () => {
      const code = `Result := (A AND B) OR (NOT C);`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Comments - all three types', () => {
    it('should tokenize line comment', async () => {
      const code = `// This is a line comment
Amount := 100;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize C-style block comment', async () => {
      const code = `/* This is a
   multi-line comment */
Amount := 100;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize curly brace comment in code block', async () => {
      const code = `BEGIN
  { Traditional NAV comment }
  Amount := 100;
END`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Strings and literals', () => {
    it('should tokenize single-quoted string', async () => {
      const code = `MESSAGE('Hello, World!');`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize string with escaped quotes', async () => {
      const code = `MESSAGE('It''s escaped');`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize date literal', async () => {
      const code = `MyDate := 060120D;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize time literal', async () => {
      const code = `MyTime := 120000T;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize numeric literals', async () => {
      const code = `Amount := 123.45;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Control flow keywords', () => {
    it('should tokenize IF/THEN/ELSE', async () => {
      const code = `IF Amount > 0 THEN
  Total := Total + Amount
ELSE
  Total := 0;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize CASE/OF', async () => {
      const code = `CASE Status OF
  Status::Open: Amount := 100;
  Status::Closed: Amount := 0;
END;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize REPEAT/UNTIL', async () => {
      const code = `REPEAT
  Count := Count + 1;
UNTIL Count > 10;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize FOR/TO/DO', async () => {
      const code = `FOR I := 1 TO 10 DO
  Total := Total + I;`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Field definitions', () => {
    it('should tokenize standard field', async () => {
      const code = `{ 1   ;   ;No.                 ;Code20        }`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize field with trigger', async () => {
      const code = `{ 1   ;   ;No.                 ;Code20
                                         OnValidate=BEGIN
                                           TESTFIELD(Name);
                                         END;
                                          }`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });
  });

  describe('Section keywords', () => {
    it('should tokenize OBJECT-PROPERTIES compound keyword', async () => {
      const code = `OBJECT-PROPERTIES
{
  Date=01/06/20;
}`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize FIELDS section', async () => {
      const code = `FIELDS
{
}`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize KEYS section', async () => {
      const code = `KEYS
{
}`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });

    it('should tokenize CODE section', async () => {
      const code = `CODE
{
}`;
      const result = await toGrammarSnapshot(code);
      expect(result).toMatchSnapshot();
    });
  });
});
