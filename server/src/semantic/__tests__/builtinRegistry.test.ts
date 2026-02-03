/**
 * BuiltinRegistry Tests
 *
 * Tests for the registry of C/AL built-in functions and methods.
 * The registry distinguishes between:
 * - Global functions: MESSAGE, ERROR, FORMAT, CONFIRM, etc.
 * - Record methods: FIND, GET, INSERT, MODIFY, DELETE, etc.
 * - NOT included: Syntactic keywords (IF, THEN, BEGIN, END)
 *
 * Test Strategy: These tests SHOULD FAIL initially since BuiltinRegistry
 * doesn't exist yet. This validates the tests are meaningful (TDD approach).
 */

import { BuiltinRegistry } from '../builtinRegistry';

describe('BuiltinRegistry - Global Functions', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should recognize MESSAGE as global function', () => {
    expect(registry.isGlobalFunction('MESSAGE')).toBe(true);
  });

  it('should recognize ERROR as global function', () => {
    expect(registry.isGlobalFunction('ERROR')).toBe(true);
  });

  it('should recognize FORMAT as global function', () => {
    expect(registry.isGlobalFunction('FORMAT')).toBe(true);
  });

  it('should recognize CONFIRM as global function', () => {
    expect(registry.isGlobalFunction('CONFIRM')).toBe(true);
  });

  it('should recognize EVALUATE as global function', () => {
    expect(registry.isGlobalFunction('EVALUATE')).toBe(true);
  });

  it('should recognize STRSUBSTNO as global function', () => {
    expect(registry.isGlobalFunction('STRSUBSTNO')).toBe(true);
  });

  it('should recognize STRLEN as global function', () => {
    expect(registry.isGlobalFunction('STRLEN')).toBe(true);
  });

  it('should recognize COPYSTR as global function', () => {
    expect(registry.isGlobalFunction('COPYSTR')).toBe(true);
  });

  it('should recognize ROUND as global function', () => {
    expect(registry.isGlobalFunction('ROUND')).toBe(true);
  });

  it('should recognize ABS as global function', () => {
    expect(registry.isGlobalFunction('ABS')).toBe(true);
  });

  it('should recognize POWER as global function', () => {
    expect(registry.isGlobalFunction('POWER')).toBe(true);
  });

  it('should recognize TODAY as global function', () => {
    expect(registry.isGlobalFunction('TODAY')).toBe(true);
  });

  it('should recognize TIME as global function', () => {
    expect(registry.isGlobalFunction('TIME')).toBe(true);
  });

  it('should recognize WORKDATE as global function', () => {
    expect(registry.isGlobalFunction('WORKDATE')).toBe(true);
  });

  it('should recognize CALCDATE as global function', () => {
    expect(registry.isGlobalFunction('CALCDATE')).toBe(true);
  });
});

describe('BuiltinRegistry - Case Insensitivity', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should recognize MESSAGE in uppercase', () => {
    expect(registry.isGlobalFunction('MESSAGE')).toBe(true);
  });

  it('should recognize message in lowercase', () => {
    expect(registry.isGlobalFunction('message')).toBe(true);
  });

  it('should recognize Message in mixed case', () => {
    expect(registry.isGlobalFunction('Message')).toBe(true);
  });

  it('should recognize mEsSaGe in random case', () => {
    expect(registry.isGlobalFunction('mEsSaGe')).toBe(true);
  });

  it('should recognize FIND in uppercase', () => {
    expect(registry.isRecordMethod('FIND')).toBe(true);
  });

  it('should recognize find in lowercase', () => {
    expect(registry.isRecordMethod('find')).toBe(true);
  });

  it('should recognize Find in mixed case', () => {
    expect(registry.isRecordMethod('Find')).toBe(true);
  });
});

describe('BuiltinRegistry - Record Methods', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should recognize FIND as record method', () => {
    expect(registry.isRecordMethod('FIND')).toBe(true);
  });

  it('should recognize GET as record method', () => {
    expect(registry.isRecordMethod('GET')).toBe(true);
  });

  it('should recognize INSERT as record method', () => {
    expect(registry.isRecordMethod('INSERT')).toBe(true);
  });

  it('should recognize MODIFY as record method', () => {
    expect(registry.isRecordMethod('MODIFY')).toBe(true);
  });

  it('should recognize DELETE as record method', () => {
    expect(registry.isRecordMethod('DELETE')).toBe(true);
  });

  it('should recognize FINDFIRST as record method', () => {
    expect(registry.isRecordMethod('FINDFIRST')).toBe(true);
  });

  it('should recognize FINDLAST as record method', () => {
    expect(registry.isRecordMethod('FINDLAST')).toBe(true);
  });

  it('should recognize FINDSET as record method', () => {
    expect(registry.isRecordMethod('FINDSET')).toBe(true);
  });

  it('should recognize NEXT as record method', () => {
    expect(registry.isRecordMethod('NEXT')).toBe(true);
  });

  it('should recognize SETRANGE as record method', () => {
    expect(registry.isRecordMethod('SETRANGE')).toBe(true);
  });

  it('should recognize SETFILTER as record method', () => {
    expect(registry.isRecordMethod('SETFILTER')).toBe(true);
  });

  it('should recognize RESET as record method', () => {
    expect(registry.isRecordMethod('RESET')).toBe(true);
  });

  it('should recognize INIT as record method', () => {
    expect(registry.isRecordMethod('INIT')).toBe(true);
  });

  it('should recognize VALIDATE as record method', () => {
    expect(registry.isRecordMethod('VALIDATE')).toBe(true);
  });

  it('should recognize TESTFIELD as record method', () => {
    expect(registry.isRecordMethod('TESTFIELD')).toBe(true);
  });

  it('should recognize SETCURRENTKEY as record method', () => {
    expect(registry.isRecordMethod('SETCURRENTKEY')).toBe(true);
  });

  it('should recognize CALCFIELDS as record method', () => {
    expect(registry.isRecordMethod('CALCFIELDS')).toBe(true);
  });

  it('should recognize CALCSUMS as record method', () => {
    expect(registry.isRecordMethod('CALCSUMS')).toBe(true);
  });
});

describe('BuiltinRegistry - Function vs Method Distinction', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should identify MESSAGE as function, not method', () => {
    expect(registry.isGlobalFunction('MESSAGE')).toBe(true);
    expect(registry.isRecordMethod('MESSAGE')).toBe(false);
  });

  it('should identify FIND as method, not function', () => {
    expect(registry.isRecordMethod('FIND')).toBe(true);
    expect(registry.isGlobalFunction('FIND')).toBe(false);
  });

  it('should identify ERROR as function, not method', () => {
    expect(registry.isGlobalFunction('ERROR')).toBe(true);
    expect(registry.isRecordMethod('ERROR')).toBe(false);
  });

  it('should identify INSERT as method, not function', () => {
    expect(registry.isRecordMethod('INSERT')).toBe(true);
    expect(registry.isGlobalFunction('INSERT')).toBe(false);
  });
});

describe('BuiltinRegistry - Unknown Identifiers', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should return false for unknown identifier as function', () => {
    expect(registry.isGlobalFunction('UnknownFunction')).toBe(false);
  });

  it('should return false for unknown identifier as method', () => {
    expect(registry.isRecordMethod('UnknownMethod')).toBe(false);
  });

  it('should return false for user-defined variable', () => {
    expect(registry.isGlobalFunction('myVariable')).toBe(false);
    expect(registry.isRecordMethod('myVariable')).toBe(false);
  });

  it('should return false for user-defined function', () => {
    expect(registry.isGlobalFunction('MyCustomFunction')).toBe(false);
    expect(registry.isRecordMethod('MyCustomFunction')).toBe(false);
  });
});

describe('BuiltinRegistry - Syntactic Keywords NOT Included', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should NOT recognize IF as global function', () => {
    expect(registry.isGlobalFunction('IF')).toBe(false);
  });

  it('should NOT recognize THEN as global function', () => {
    expect(registry.isGlobalFunction('THEN')).toBe(false);
  });

  it('should NOT recognize ELSE as global function', () => {
    expect(registry.isGlobalFunction('ELSE')).toBe(false);
  });

  it('should NOT recognize BEGIN as global function', () => {
    expect(registry.isGlobalFunction('BEGIN')).toBe(false);
  });

  it('should NOT recognize END as global function', () => {
    expect(registry.isGlobalFunction('END')).toBe(false);
  });

  it('should NOT recognize WHILE as global function', () => {
    expect(registry.isGlobalFunction('WHILE')).toBe(false);
  });

  it('should NOT recognize REPEAT as global function', () => {
    expect(registry.isGlobalFunction('REPEAT')).toBe(false);
  });

  it('should NOT recognize UNTIL as global function', () => {
    expect(registry.isGlobalFunction('UNTIL')).toBe(false);
  });

  it('should NOT recognize FOR as global function', () => {
    expect(registry.isGlobalFunction('FOR')).toBe(false);
  });

  it('should NOT recognize TO as global function', () => {
    expect(registry.isGlobalFunction('TO')).toBe(false);
  });

  it('should NOT recognize DOWNTO as global function', () => {
    expect(registry.isGlobalFunction('DOWNTO')).toBe(false);
  });

  it('should NOT recognize DO as global function', () => {
    expect(registry.isGlobalFunction('DO')).toBe(false);
  });

  it('should NOT recognize CASE as global function', () => {
    expect(registry.isGlobalFunction('CASE')).toBe(false);
  });

  it('should NOT recognize OF as global function', () => {
    expect(registry.isGlobalFunction('OF')).toBe(false);
  });

  it('should NOT recognize VAR as global function', () => {
    expect(registry.isGlobalFunction('VAR')).toBe(false);
  });

  it('should NOT recognize PROCEDURE as global function', () => {
    expect(registry.isGlobalFunction('PROCEDURE')).toBe(false);
  });

  it('should NOT recognize EXIT as global function', () => {
    expect(registry.isGlobalFunction('EXIT')).toBe(false);
  });

  it('should NOT recognize OBJECT as global function', () => {
    expect(registry.isGlobalFunction('OBJECT')).toBe(false);
  });

  it('should NOT recognize TABLE as global function', () => {
    expect(registry.isGlobalFunction('TABLE')).toBe(false);
  });

  it('should NOT recognize CODEUNIT as global function', () => {
    expect(registry.isGlobalFunction('CODEUNIT')).toBe(false);
  });

  it('should NOT recognize syntactic keywords as record methods', () => {
    expect(registry.isRecordMethod('IF')).toBe(false);
    expect(registry.isRecordMethod('THEN')).toBe(false);
    expect(registry.isRecordMethod('BEGIN')).toBe(false);
    expect(registry.isRecordMethod('END')).toBe(false);
  });
});

describe('BuiltinRegistry - Edge Cases', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should handle empty string', () => {
    expect(registry.isGlobalFunction('')).toBe(false);
    expect(registry.isRecordMethod('')).toBe(false);
  });

  it('should handle whitespace-only string', () => {
    expect(registry.isGlobalFunction('   ')).toBe(false);
    expect(registry.isRecordMethod('   ')).toBe(false);
  });

  it('should handle string with leading/trailing whitespace', () => {
    // Registry should handle normalization internally
    expect(registry.isGlobalFunction('  MESSAGE  ')).toBe(false); // or true if normalized
  });

  it('should handle very long identifier', () => {
    const longIdentifier = 'A'.repeat(1000);
    expect(registry.isGlobalFunction(longIdentifier)).toBe(false);
    expect(registry.isRecordMethod(longIdentifier)).toBe(false);
  });

  it('should handle identifier with numbers', () => {
    expect(registry.isGlobalFunction('MESSAGE123')).toBe(false);
    expect(registry.isRecordMethod('FIND123')).toBe(false);
  });

  it('should handle identifier with underscores', () => {
    expect(registry.isGlobalFunction('MESSAGE_EXT')).toBe(false);
    expect(registry.isRecordMethod('FIND_CUSTOM')).toBe(false);
  });
});

describe('BuiltinRegistry - Additional Common Functions', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  // System functions
  it('should recognize USERID as global function', () => {
    expect(registry.isGlobalFunction('USERID')).toBe(true);
  });

  it('should recognize COMPANYNAME as global function', () => {
    expect(registry.isGlobalFunction('COMPANYNAME')).toBe(true);
  });

  it('should recognize GUIALLOWED as global function', () => {
    expect(registry.isGlobalFunction('GUIALLOWED')).toBe(true);
  });

  // String functions
  it('should recognize UPPERCASE as global function', () => {
    expect(registry.isGlobalFunction('UPPERCASE')).toBe(true);
  });

  it('should recognize LOWERCASE as global function', () => {
    expect(registry.isGlobalFunction('LOWERCASE')).toBe(true);
  });

  it('should recognize DELCHR as global function', () => {
    expect(registry.isGlobalFunction('DELCHR')).toBe(true);
  });

  it('should recognize CONVERTSTR as global function', () => {
    expect(registry.isGlobalFunction('CONVERTSTR')).toBe(true);
  });

  it('should recognize INCSTR as global function', () => {
    expect(registry.isGlobalFunction('INCSTR')).toBe(true);
  });

  // Math functions
  it('should recognize RANDOM as global function', () => {
    expect(registry.isGlobalFunction('RANDOM')).toBe(true);
  });

  it('should recognize RANDOMIZE as global function', () => {
    expect(registry.isGlobalFunction('RANDOMIZE')).toBe(true);
  });
});
