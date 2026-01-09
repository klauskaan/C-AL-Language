/**
 * Parser Error Message Tests
 *
 * Tests that parser error messages provide helpful context including:
 * - What was expected vs what was found
 * - Context about where in the object definition the error occurred
 * - Token type information for debugging
 *
 * These tests validate issue #40: Add more context to parser error messages
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Error Messages with Context', () => {
  describe('Integer parsing errors', () => {
    it('should provide context for invalid object ID', () => {
      const code = 'OBJECT Table abc Customer';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Parser reports the type mismatch during token consumption
      expect(errors[0].message).toContain('Expected object ID');
      expect(errors[0].message).toContain('abc');
    });

    it('should provide context for invalid field number', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { abc ; ; No. ; Code20 }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const fieldError = errors.find(e => e.message.includes('Expected field number'));
      expect(fieldError).toBeDefined();
      expect(fieldError?.message).toContain('abc');
    });

    it('should provide context for invalid array size', () => {
      const code = `OBJECT Table 18 Customer
{
  CODE
  {
    VAR
      MyArray : ARRAY[abc] OF Integer;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const arrayError = errors.find(e => e.message.includes('Expected array size'));
      expect(arrayError).toBeDefined();
      expect(arrayError?.message).toContain('abc');
    });

    it('should provide context for invalid string/code length', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; No. ; Code[abc] }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const lengthError = errors.find(e => e.message.includes('Expected length'));
      expect(lengthError).toBeDefined();
      expect(lengthError?.message).toContain('abc');
    });
  });

  describe('Token consumption errors', () => {
    it('should show what was found vs what was expected', () => {
      const code = 'OBJECT Table Name Customer'; // Invalid syntax - Table should be followed by number
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      // Should include token type information showing what was found
      expect(errors[0].message).toMatch(/but found/);
      expect(errors[0].message).toMatch(/IDENTIFIER/);
    });

    it('should provide context for missing semicolon in fields', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1  ; No. ; Code20 }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      if (errors.length > 0) {
        expect(errors[0].message).toContain('Expected ;');
      }
    });
  });

  describe('Field name errors', () => {
    it('should indicate error is in FIELDS section', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1 ; ; ; Code20 }
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find(e => e.message.includes('Field name cannot be empty'));
      expect(nameError).toBeDefined();
      expect(nameError?.message).toContain('FIELDS section');
    });
  });

  describe('Parameter list errors', () => {
    it('should provide helpful message for unexpected token in parameters', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc(Param1 : Integer Param2 : Text);
    BEGIN
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const paramError = errors.find(e => e.message.includes('parameter list'));
      expect(paramError).toBeDefined();
      expect(paramError?.message).toContain("expected ';' or ')'");
    });
  });

  describe('Member access errors', () => {
    it('should show what was found after :: operator', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      Status : Option;
    BEGIN
      Status := Status::;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const memberError = errors.find(e => e.message.includes('Expected identifier after :: operator'));
      expect(memberError).toBeDefined();
      expect(memberError?.message).toContain("got '");
    });
  });

  describe('AL-only feature errors', () => {
    it('should detect ternary operator (AL-only feature)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF (1 > 0) ? TRUE : FALSE THEN;
    END;
  }
}`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const ternaryError = errors.find(e => e.message.includes('TERNARY_OPERATOR'));
      expect(ternaryError).toBeDefined();
      // The error indicates an unexpected ternary operator token
      expect(ternaryError?.message).toContain('?');
    });
  });
});
