/**
 * Lexer Tests - General Lexer Functionality
 *
 * Tests core lexer features including:
 * - Case-insensitive keyword matching (BEGIN vs begin)
 * - Scope operator (::) for Option types
 * - Basic tokenization
 * - Operator recognition
 *
 * Note: Date/time literal tests are NOT included as this functionality
 * is not yet implemented in the lexer, despite TokenType.Date and
 * TokenType.Time being defined in tokens.ts.
 */

import { Lexer, LexerContextState } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - General Functionality', () => {
  describe('Basic tokenization', () => {
    it('should tokenize an empty string', () => {
      const code = '';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should tokenize whitespace-only input', () => {
      const code = '   \t  ';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should tokenize a simple identifier', () => {
      const code = 'Customer';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Customer');
    });

    it('should tokenize identifiers with underscores', () => {
      const code = 'My_Variable';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('My_Variable');
    });

    it('should tokenize identifiers with numbers', () => {
      const code = 'Table18';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Table18');
    });
  });

  describe('Case-insensitive keywords', () => {
    it('should recognize uppercase BEGIN keyword', () => {
      const code = 'BEGIN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[0].value).toBe('BEGIN');
    });

    it('should recognize lowercase begin keyword', () => {
      const code = 'begin';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[0].value).toBe('begin');
    });

    it('should recognize mixed case Begin keyword', () => {
      const code = 'Begin';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[0].value).toBe('Begin');
    });

    it('should recognize uppercase END keyword', () => {
      const code = 'END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.End);
      expect(tokens[0].value).toBe('END');
    });

    it('should recognize lowercase end keyword', () => {
      const code = 'end';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.End);
      expect(tokens[0].value).toBe('end');
    });

    it('should recognize IF/THEN/ELSE in various cases', () => {
      const code = 'IF then Else';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[0].value).toBe('IF');
      expect(tokens[1].type).toBe(TokenType.Then);
      expect(tokens[1].value).toBe('then');
      expect(tokens[2].type).toBe(TokenType.Else);
      expect(tokens[2].value).toBe('Else');
    });

    it('should recognize object type keywords in various cases', () => {
      const code = 'TABLE Page CODEUNIT';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Table);
      expect(tokens[0].value).toBe('TABLE');
      expect(tokens[1].type).toBe(TokenType.Page);
      expect(tokens[1].value).toBe('Page');
      expect(tokens[2].type).toBe(TokenType.Codeunit);
      expect(tokens[2].value).toBe('CODEUNIT');
    });

    it('should recognize data type keywords case-insensitively', () => {
      const code = 'Integer decimal BOOLEAN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Integer_Type);
      expect(tokens[1].type).toBe(TokenType.Decimal_Type);
      expect(tokens[2].type).toBe(TokenType.Boolean);
    });

    it('should distinguish keywords from similar identifiers', () => {
      const code = 'BEGIN MyBegin BEGINNING';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[0].value).toBe('BEGIN');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('MyBegin');
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('BEGINNING');
    });

    it('should preserve original case in token value', () => {
      const code = 'BEgIn';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[0].value).toBe('BEgIn'); // Original case preserved
    });
  });

  describe('Scope operator (::)', () => {
    it('should tokenize double colon operator', () => {
      const code = '::';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.DoubleColon);
      expect(tokens[0].value).toBe('::');
    });

    it('should tokenize option access syntax', () => {
      const code = 'Status::Open';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('Status');
      expect(tokens[1].type).toBe(TokenType.DoubleColon);
      expect(tokens[1].value).toBe('::');
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Open');
    });

    it('should tokenize option assignment', () => {
      const code = 'MyStatus := Status::Released;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('MyStatus');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Identifier);
      expect(tokens[2].value).toBe('Status');
      expect(tokens[3].type).toBe(TokenType.DoubleColon);
      expect(tokens[4].type).toBe(TokenType.Identifier);
      expect(tokens[4].value).toBe('Released');
      expect(tokens[5].type).toBe(TokenType.Semicolon);
    });

    it('should tokenize option comparison', () => {
      const code = 'IF Status = Status::Open THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('Status');
      expect(tokens[2].type).toBe(TokenType.Equal);
      expect(tokens[3].type).toBe(TokenType.Identifier);
      expect(tokens[3].value).toBe('Status');
      expect(tokens[4].type).toBe(TokenType.DoubleColon);
      expect(tokens[5].type).toBe(TokenType.Identifier);
      expect(tokens[5].value).toBe('Open');
      expect(tokens[6].type).toBe(TokenType.Then);
    });

    it('should distinguish :: from : and other operators', () => {
      const code = ': := ::';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Colon);
      expect(tokens[0].value).toBe(':');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[1].value).toBe(':=');
      expect(tokens[2].type).toBe(TokenType.DoubleColon);
      expect(tokens[2].value).toBe('::');
    });
  });

  describe('Numbers', () => {
    it('should tokenize integers', () => {
      const code = '42';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('42');
    });

    it('should tokenize zero', () => {
      const code = '0';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('0');
    });

    it('should tokenize decimal numbers', () => {
      const code = '3.14';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Decimal);
      expect(tokens[0].value).toBe('3.14');
    });

    it('should tokenize large numbers', () => {
      const code = '1000000';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('1000000');
    });

    it('should handle number followed by identifier', () => {
      const code = '123ABC';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Number followed by identifier (not ideal, but current behavior)
      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[0].value).toBe('123');
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[1].value).toBe('ABC');
    });
  });

  describe('Operators', () => {
    it('should tokenize arithmetic operators', () => {
      const code = '+ - * /';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Plus);
      expect(tokens[1].type).toBe(TokenType.Minus);
      expect(tokens[2].type).toBe(TokenType.Multiply);
      expect(tokens[3].type).toBe(TokenType.Divide);
    });

    it('should tokenize comparison operators', () => {
      const code = '= <> < <= > >=';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Equal);
      expect(tokens[1].type).toBe(TokenType.NotEqual);
      expect(tokens[2].type).toBe(TokenType.Less);
      expect(tokens[3].type).toBe(TokenType.LessEqual);
      expect(tokens[4].type).toBe(TokenType.Greater);
      expect(tokens[5].type).toBe(TokenType.GreaterEqual);
    });

    it('should tokenize assignment operator', () => {
      const code = ':=';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Assign);
      expect(tokens[0].value).toBe(':=');
    });

    it('should tokenize dot operators', () => {
      const code = '. ..';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Dot);
      expect(tokens[0].value).toBe('.');
      expect(tokens[1].type).toBe(TokenType.DotDot);
      expect(tokens[1].value).toBe('..');
    });

    it('should distinguish . from .. correctly', () => {
      const code = '1..10';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Integer);
      expect(tokens[1].type).toBe(TokenType.DotDot);
      expect(tokens[2].type).toBe(TokenType.Integer);
    });
  });

  describe('Delimiters', () => {
    it('should tokenize parentheses', () => {
      const code = '()';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.LeftParen);
      expect(tokens[1].type).toBe(TokenType.RightParen);
    });

    it('should tokenize brackets', () => {
      const code = '[]';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.LeftBracket);
      expect(tokens[1].type).toBe(TokenType.RightBracket);
    });

    it('should tokenize semicolons and commas', () => {
      const code = '; ,';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Semicolon);
      expect(tokens[1].type).toBe(TokenType.Comma);
    });

    it('should tokenize colons', () => {
      const code = ':';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Colon);
    });
  });

  describe('Complex expressions', () => {
    it('should tokenize simple assignment', () => {
      const code = 'x := 5;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('x');
      expect(tokens[1].type).toBe(TokenType.Assign);
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[2].value).toBe('5');
      expect(tokens[3].type).toBe(TokenType.Semicolon);
    });

    it('should tokenize IF statement', () => {
      const code = 'IF x > 0 THEN';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.If);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[2].type).toBe(TokenType.Greater);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[4].type).toBe(TokenType.Then);
    });

    it('should tokenize BEGIN-END block', () => {
      const code = 'BEGIN x := 1; END;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.Identifier);
      expect(tokens[2].type).toBe(TokenType.Assign);
      expect(tokens[3].type).toBe(TokenType.Integer);
      expect(tokens[4].type).toBe(TokenType.Semicolon);
      expect(tokens[5].type).toBe(TokenType.End);
      expect(tokens[6].type).toBe(TokenType.Semicolon);
    });

    it('should tokenize function call', () => {
      const code = 'GetValue(10, 20)';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[0].value).toBe('GetValue');
      expect(tokens[1].type).toBe(TokenType.LeftParen);
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[3].type).toBe(TokenType.Comma);
      expect(tokens[4].type).toBe(TokenType.Integer);
      expect(tokens[5].type).toBe(TokenType.RightParen);
    });

    it('should tokenize array access', () => {
      const code = 'MyArray[5]';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier);
      expect(tokens[1].type).toBe(TokenType.LeftBracket);
      expect(tokens[2].type).toBe(TokenType.Integer);
      expect(tokens[3].type).toBe(TokenType.RightBracket);
    });

    it('should tokenize arithmetic expression', () => {
      const code = 'result := (a + b) * c - d / 2;';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Identifier); // result
      expect(tokens[1].type).toBe(TokenType.Assign); // :=
      expect(tokens[2].type).toBe(TokenType.LeftParen); // (
      expect(tokens[3].type).toBe(TokenType.Identifier); // a
      expect(tokens[4].type).toBe(TokenType.Plus); // +
      expect(tokens[5].type).toBe(TokenType.Identifier); // b
      expect(tokens[6].type).toBe(TokenType.RightParen); // )
      expect(tokens[7].type).toBe(TokenType.Multiply); // *
      expect(tokens[8].type).toBe(TokenType.Identifier); // c
      expect(tokens[9].type).toBe(TokenType.Minus); // -
      expect(tokens[10].type).toBe(TokenType.Identifier); // d
      expect(tokens[11].type).toBe(TokenType.Divide); // /
      expect(tokens[12].type).toBe(TokenType.Integer); // 2
      expect(tokens[13].type).toBe(TokenType.Semicolon); // ;
    });
  });

  describe('Date/Time literals', () => {
    // Date and time literal parsing is now implemented in the lexer.
    // Formats:
    // - Date: MMDDYY[YY]D (e.g., 010125D, 06012020D, 0D)
    // - Time: HHMMSS[ms]T (e.g., 120000T, 235959999T)
    // - DateTime: date + time combined (e.g., 010125D120000T)
    //
    // Reference: documentation/cal/cal.md and literals.test.ts for comprehensive tests

    it('should tokenize date literal', () => {
      const code = '010125D';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Date);
      expect(tokens[0].value).toBe('010125D');
    });

    it('should tokenize time literal', () => {
      const code = '120000T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Time);
      expect(tokens[0].value).toBe('120000T');
    });

    it('should tokenize datetime literal', () => {
      const code = '010125D120000T';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.DateTime);
      expect(tokens[0].value).toBe('010125D120000T');
    });
  });

  describe('getContextState()', () => {
    it('should return context state before first tokenization', () => {
      const lexer = new Lexer('OBJECT Table 18 Customer');
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
      expect(state.bracketDepth).toBe(0);
      expect(state.inPropertyValue).toBe(false);
      expect(state.fieldDefColumn).toBe('NONE');
      expect(state.currentSectionType).toBeNull();
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should return context state after tokenizing empty input', () => {
      const lexer = new Lexer('');
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(state.contextStack).toEqual(['NORMAL']);
      expect(state.braceDepth).toBe(0);
      expect(state.bracketDepth).toBe(0);
      expect(state.inPropertyValue).toBe(false);
      expect(state.fieldDefColumn).toBe('NONE');
      expect(state.currentSectionType).toBeNull();
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should return context state after tokenizing simple object', () => {
      const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=010125D;
    Time=120000T;
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(state.contextStack).toBeInstanceOf(Array);
      expect(state.contextStack.every((ctx: string) => typeof ctx === 'string')).toBe(true);
      expect(state.braceDepth).toBe(0);
      expect(state.bracketDepth).toBe(0);
      expect(state.inPropertyValue).toBe(false);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should return context state after tokenizing object with code blocks', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  OBJECT-PROPERTIES
  {
    Date=010125D;
  }
  PROPERTIES
  {
    OnRun=BEGIN
            x := 1;
          END;
  }
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      IF x > 0 THEN
        x := x + 1;
    END;

    BEGIN
    END.
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(state.contextStack).toBeInstanceOf(Array);
      expect(state.braceDepth).toBe(0);
      expect(state.bracketDepth).toBe(0);
      expect(state.inPropertyValue).toBe(false);
      expect(state.contextUnderflowDetected).toBe(false);
    });

    it('should detect context underflow when it occurs', () => {
      const code = 'BEGIN END END'; // Extra END causes underflow
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(state.contextUnderflowDetected).toBe(true);
    });

    it('should reflect all flag values correctly', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(typeof state.braceDepth).toBe('number');
      expect(typeof state.bracketDepth).toBe('number');
      expect(typeof state.inPropertyValue).toBe('boolean');
      expect(typeof state.fieldDefColumn).toBe('string');
      expect(typeof state.contextUnderflowDetected).toBe('boolean');
    });

    it('should return context values as strings not numbers', () => {
      const code = 'BEGIN x := 1; END;';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(state.contextStack).toBeInstanceOf(Array);
      state.contextStack.forEach((ctx: string) => {
        expect(typeof ctx).toBe('string');
        expect(ctx).not.toBeNaN();
      });
    });

    it('should return fieldDefColumn as string', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(typeof state.fieldDefColumn).toBe('string');
      expect(['NONE', 'COL_1', 'COL_2', 'COL_3', 'COL_4', 'PROPERTIES']).toContain(state.fieldDefColumn);
    });

    it('should handle unclosed object/code block - malformed input', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    OnValidate=BEGIN
                 x := 1;
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(state.contextStack).toBeInstanceOf(Array);
      expect(state.braceDepth).toBeGreaterThanOrEqual(0);
    });

    it('should handle re-tokenization on same instance', () => {
      const lexer = new Lexer('OBJECT Table 18 Customer');

      // First tokenization
      lexer.tokenize();
      const state1 = lexer.getContextState();
      expect(state1.contextStack).toBeDefined();

      // Second tokenization (should reset state)
      lexer.tokenize();
      const state2 = lexer.getContextState();

      expect(state2).toBeDefined();
      expect(state2.contextStack).toEqual(['NORMAL']);
      expect(state2.braceDepth).toBe(0);
      expect(state2.bracketDepth).toBe(0);
      expect(state2.inPropertyValue).toBe(false);
      expect(state2.fieldDefColumn).toBe('NONE');
      expect(state2.currentSectionType).toBeNull();
    });

    it('should return currentSectionType as string or null', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
  }
}`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      const validSections = ['FIELDS', 'KEYS', 'CONTROLS', 'ELEMENTS', 'DATAITEMS', 'ACTIONS', 'DATASET', 'REQUESTPAGE', 'LABELS', null];
      expect(validSections).toContain(state.currentSectionType);
    });

    it('should maintain context stack integrity during nested blocks', () => {
      const code = `BEGIN
  IF x > 0 THEN BEGIN
    CASE y OF
      1: BEGIN z := 1; END;
      2: BEGIN z := 2; END;
    END;
  END;
END;`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(state.contextStack).toBeInstanceOf(Array);
      expect(state.contextStack.length).toBeGreaterThanOrEqual(1);
      expect(state.braceDepth).toBe(0);
    });

    it('should track bracket depth correctly', () => {
      const code = 'MyArray[Index[1]]';
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(state.bracketDepth).toBe(0); // Should be balanced after tokenization
    });

    it('should track inPropertyValue flag in PROPERTIES section', () => {
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    Caption='Customer';
    DataPerCompany=Yes`;
      const lexer = new Lexer(code);
      lexer.tokenize();
      const state = lexer.getContextState();

      expect(state).toBeDefined();
      expect(typeof state.inPropertyValue).toBe('boolean');
    });
  });
});
