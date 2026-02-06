/**
 * BuiltinRegistry Deprecation Tests
 *
 * Tests for deprecated method detection in the BuiltinRegistry.
 * These tests extend the existing builtinRegistry.test.ts with deprecation-specific functionality.
 *
 * New functionality:
 * - Recognition of deprecated record methods (RECORDLEVELLOCKING, GETRECORDID, CONSISTENT)
 * - getRecordMethodDeprecation() returns deprecation message for deprecated methods
 * - getRecordMethodDeprecation() returns undefined for non-deprecated methods
 * - Case-insensitive deprecation checks
 */

import { BuiltinRegistry } from '../builtinRegistry';

describe('BuiltinRegistry - Deprecated Record Methods', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  describe('Method recognition', () => {
    it('should recognize RECORDLEVELLOCKING as record method', () => {
      expect(registry.isRecordMethod('RECORDLEVELLOCKING')).toBe(true);
    });

    it('should recognize GETRECORDID as record method', () => {
      expect(registry.isRecordMethod('GETRECORDID')).toBe(true);
    });

    it('should recognize CONSISTENT as record method', () => {
      expect(registry.isRecordMethod('CONSISTENT')).toBe(true);
    });

    it('should NOT recognize deprecated methods as global functions', () => {
      expect(registry.isGlobalFunction('RECORDLEVELLOCKING')).toBe(false);
      expect(registry.isGlobalFunction('GETRECORDID')).toBe(false);
      expect(registry.isGlobalFunction('CONSISTENT')).toBe(false);
    });
  });

  describe('Case insensitivity', () => {
    it('should recognize RECORDLEVELLOCKING in uppercase', () => {
      expect(registry.isRecordMethod('RECORDLEVELLOCKING')).toBe(true);
    });

    it('should recognize recordlevellocking in lowercase', () => {
      expect(registry.isRecordMethod('recordlevellocking')).toBe(true);
    });

    it('should recognize RecordLevelLocking in mixed case', () => {
      expect(registry.isRecordMethod('RecordLevelLocking')).toBe(true);
    });

    it('should recognize GETRECORDID in uppercase', () => {
      expect(registry.isRecordMethod('GETRECORDID')).toBe(true);
    });

    it('should recognize getrecordid in lowercase', () => {
      expect(registry.isRecordMethod('getrecordid')).toBe(true);
    });

    it('should recognize GetRecordId in mixed case', () => {
      expect(registry.isRecordMethod('GetRecordId')).toBe(true);
    });

    it('should recognize CONSISTENT in uppercase', () => {
      expect(registry.isRecordMethod('CONSISTENT')).toBe(true);
    });

    it('should recognize consistent in lowercase', () => {
      expect(registry.isRecordMethod('consistent')).toBe(true);
    });

    it('should recognize Consistent in mixed case', () => {
      expect(registry.isRecordMethod('Consistent')).toBe(true);
    });
  });

  describe('Known builtin check', () => {
    it('should recognize RECORDLEVELLOCKING as known builtin', () => {
      expect(registry.isKnownBuiltin('RECORDLEVELLOCKING')).toBe(true);
    });

    it('should recognize GETRECORDID as known builtin', () => {
      expect(registry.isKnownBuiltin('GETRECORDID')).toBe(true);
    });

    it('should recognize CONSISTENT as known builtin', () => {
      expect(registry.isKnownBuiltin('CONSISTENT')).toBe(true);
    });
  });
});

describe('BuiltinRegistry - Deprecation Reason', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  describe('Deprecated methods return reason', () => {
    it('should return deprecation reason for RECORDLEVELLOCKING', () => {
      const reason = registry.getRecordMethodDeprecation('RECORDLEVELLOCKING');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
      expect(reason!.length).toBeGreaterThan(0);
    });

    it('should return deprecation reason for GETRECORDID', () => {
      const reason = registry.getRecordMethodDeprecation('GETRECORDID');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
      expect(reason!.length).toBeGreaterThan(0);
    });

    it('should return deprecation reason for CONSISTENT', () => {
      const reason = registry.getRecordMethodDeprecation('CONSISTENT');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
      expect(reason!.length).toBeGreaterThan(0);
    });
  });

  describe('Case insensitivity for deprecation reason', () => {
    it('should return reason for recordlevellocking (lowercase)', () => {
      const reason = registry.getRecordMethodDeprecation('recordlevellocking');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for RecordLevelLocking (mixed case)', () => {
      const reason = registry.getRecordMethodDeprecation('RecordLevelLocking');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for getrecordid (lowercase)', () => {
      const reason = registry.getRecordMethodDeprecation('getrecordid');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for GetRecordId (mixed case)', () => {
      const reason = registry.getRecordMethodDeprecation('GetRecordId');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for consistent (lowercase)', () => {
      const reason = registry.getRecordMethodDeprecation('consistent');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for Consistent (mixed case)', () => {
      const reason = registry.getRecordMethodDeprecation('Consistent');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });
  });

  describe('Non-deprecated methods return undefined', () => {
    it('should return undefined for FIND', () => {
      expect(registry.getRecordMethodDeprecation('FIND')).toBeUndefined();
    });

    it('should return undefined for GET', () => {
      expect(registry.getRecordMethodDeprecation('GET')).toBeUndefined();
    });

    it('should return undefined for INSERT', () => {
      expect(registry.getRecordMethodDeprecation('INSERT')).toBeUndefined();
    });

    it('should return undefined for MODIFY', () => {
      expect(registry.getRecordMethodDeprecation('MODIFY')).toBeUndefined();
    });

    it('should return undefined for DELETE', () => {
      expect(registry.getRecordMethodDeprecation('DELETE')).toBeUndefined();
    });

    it('should return undefined for FINDSET', () => {
      expect(registry.getRecordMethodDeprecation('FINDSET')).toBeUndefined();
    });

    it('should return undefined for FINDFIRST', () => {
      expect(registry.getRecordMethodDeprecation('FINDFIRST')).toBeUndefined();
    });

    it('should return undefined for FINDLAST', () => {
      expect(registry.getRecordMethodDeprecation('FINDLAST')).toBeUndefined();
    });

    it('should return undefined for NEXT', () => {
      expect(registry.getRecordMethodDeprecation('NEXT')).toBeUndefined();
    });

    it('should return undefined for SETRANGE', () => {
      expect(registry.getRecordMethodDeprecation('SETRANGE')).toBeUndefined();
    });

    it('should return undefined for SETFILTER', () => {
      expect(registry.getRecordMethodDeprecation('SETFILTER')).toBeUndefined();
    });

    it('should return undefined for RESET', () => {
      expect(registry.getRecordMethodDeprecation('RESET')).toBeUndefined();
    });

    it('should return undefined for INIT', () => {
      expect(registry.getRecordMethodDeprecation('INIT')).toBeUndefined();
    });

    it('should return undefined for VALIDATE', () => {
      expect(registry.getRecordMethodDeprecation('VALIDATE')).toBeUndefined();
    });

    it('should return undefined for TESTFIELD', () => {
      expect(registry.getRecordMethodDeprecation('TESTFIELD')).toBeUndefined();
    });

    it('should return undefined for LOCKTABLE', () => {
      expect(registry.getRecordMethodDeprecation('LOCKTABLE')).toBeUndefined();
    });

    it('should return undefined for CALCFIELDS', () => {
      expect(registry.getRecordMethodDeprecation('CALCFIELDS')).toBeUndefined();
    });

    it('should return undefined for CALCSUMS', () => {
      expect(registry.getRecordMethodDeprecation('CALCSUMS')).toBeUndefined();
    });
  });

  describe('Global functions return undefined', () => {
    it('should return undefined for MESSAGE', () => {
      expect(registry.getRecordMethodDeprecation('MESSAGE')).toBeUndefined();
    });

    it('should return undefined for ERROR', () => {
      expect(registry.getRecordMethodDeprecation('ERROR')).toBeUndefined();
    });

    it('should return undefined for FORMAT', () => {
      expect(registry.getRecordMethodDeprecation('FORMAT')).toBeUndefined();
    });

    it('should return undefined for CONFIRM', () => {
      expect(registry.getRecordMethodDeprecation('CONFIRM')).toBeUndefined();
    });

    it('should return undefined for EVALUATE', () => {
      expect(registry.getRecordMethodDeprecation('EVALUATE')).toBeUndefined();
    });

    it('should return undefined for STRLEN', () => {
      expect(registry.getRecordMethodDeprecation('STRLEN')).toBeUndefined();
    });

    it('should return undefined for UPPERCASE', () => {
      expect(registry.getRecordMethodDeprecation('UPPERCASE')).toBeUndefined();
    });

    it('should return undefined for LOWERCASE', () => {
      expect(registry.getRecordMethodDeprecation('LOWERCASE')).toBeUndefined();
    });

    it('should return undefined for TODAY', () => {
      expect(registry.getRecordMethodDeprecation('TODAY')).toBeUndefined();
    });

    it('should return undefined for TIME', () => {
      expect(registry.getRecordMethodDeprecation('TIME')).toBeUndefined();
    });
  });

  describe('Unknown identifiers return undefined', () => {
    it('should return undefined for unknown method', () => {
      expect(registry.getRecordMethodDeprecation('UnknownMethod')).toBeUndefined();
    });

    it('should return undefined for user-defined procedure', () => {
      expect(registry.getRecordMethodDeprecation('MyCustomProcedure')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(registry.getRecordMethodDeprecation('')).toBeUndefined();
    });

    it('should return undefined for syntactic keyword IF', () => {
      expect(registry.getRecordMethodDeprecation('IF')).toBeUndefined();
    });

    it('should return undefined for syntactic keyword THEN', () => {
      expect(registry.getRecordMethodDeprecation('THEN')).toBeUndefined();
    });

    it('should return undefined for syntactic keyword BEGIN', () => {
      expect(registry.getRecordMethodDeprecation('BEGIN')).toBeUndefined();
    });

    it('should return undefined for syntactic keyword END', () => {
      expect(registry.getRecordMethodDeprecation('END')).toBeUndefined();
    });
  });
});

describe('BuiltinRegistry - Deprecation Message Content', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should return a meaningful deprecation message for RECORDLEVELLOCKING', () => {
    const reason = registry.getRecordMethodDeprecation('RECORDLEVELLOCKING');

    expect(reason).toBeDefined();
    // Should be a non-empty, informative message
    expect(reason!.length).toBeGreaterThan(10);
  });

  it('should return a meaningful deprecation message for GETRECORDID', () => {
    const reason = registry.getRecordMethodDeprecation('GETRECORDID');

    expect(reason).toBeDefined();
    expect(reason!.length).toBeGreaterThan(10);
  });

  it('should return a meaningful deprecation message for CONSISTENT', () => {
    const reason = registry.getRecordMethodDeprecation('CONSISTENT');

    expect(reason).toBeDefined();
    expect(reason!.length).toBeGreaterThan(10);
  });
});

describe('BuiltinRegistry - Context-specific deprecation methods', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  describe('getGlobalFunctionDeprecation', () => {
    it('should return undefined for CONSISTENT (it is a record method, not a global function)', () => {
      expect(registry.getGlobalFunctionDeprecation('CONSISTENT')).toBeUndefined();
    });

    it('should return undefined for RECORDLEVELLOCKING (it is a record method, not a global function)', () => {
      expect(registry.getGlobalFunctionDeprecation('RECORDLEVELLOCKING')).toBeUndefined();
    });

    it('should return undefined for GETRECORDID (it is a record method, not a global function)', () => {
      expect(registry.getGlobalFunctionDeprecation('GETRECORDID')).toBeUndefined();
    });

    it('should return undefined for CONSISTENT in lowercase', () => {
      expect(registry.getGlobalFunctionDeprecation('consistent')).toBeUndefined();
    });

    it('should return undefined for RecordLevelLocking in mixed case', () => {
      expect(registry.getGlobalFunctionDeprecation('RecordLevelLocking')).toBeUndefined();
    });
  });

  describe('getRecordMethodDeprecation', () => {
    it('should return undefined for MESSAGE (MESSAGE is a global function, not a record method)', () => {
      expect(registry.getRecordMethodDeprecation('MESSAGE')).toBeUndefined();
    });

    it('should return undefined for ERROR (ERROR is a global function, not a record method)', () => {
      expect(registry.getRecordMethodDeprecation('ERROR')).toBeUndefined();
    });

    it('should return defined deprecation reason for CONSISTENT', () => {
      const reason = registry.getRecordMethodDeprecation('CONSISTENT');
      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
      expect(reason!.length).toBeGreaterThan(0);
    });

    it('should return defined deprecation reason for RECORDLEVELLOCKING', () => {
      const reason = registry.getRecordMethodDeprecation('RECORDLEVELLOCKING');
      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
      expect(reason!.length).toBeGreaterThan(0);
    });

    it('should return defined deprecation reason for GETRECORDID', () => {
      const reason = registry.getRecordMethodDeprecation('GETRECORDID');
      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
      expect(reason!.length).toBeGreaterThan(0);
    });

    it('should return defined deprecation reason for consistent (lowercase)', () => {
      const reason = registry.getRecordMethodDeprecation('consistent');
      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return defined deprecation reason for GetRecordId (mixed case)', () => {
      const reason = registry.getRecordMethodDeprecation('GetRecordId');
      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });
  });
});

describe('BuiltinRegistry - Names in both maps (RENAME, COPY, DELETE)', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should return undefined for getGlobalFunctionDeprecation(RENAME)', () => {
    expect(registry.getGlobalFunctionDeprecation('RENAME')).toBeUndefined();
  });

  it('should return undefined for getRecordMethodDeprecation(RENAME)', () => {
    expect(registry.getRecordMethodDeprecation('RENAME')).toBeUndefined();
  });

  it('should return undefined for getGlobalFunctionDeprecation(COPY)', () => {
    expect(registry.getGlobalFunctionDeprecation('COPY')).toBeUndefined();
  });

  it('should return undefined for getRecordMethodDeprecation(COPY)', () => {
    expect(registry.getRecordMethodDeprecation('COPY')).toBeUndefined();
  });

  it('should return undefined for getGlobalFunctionDeprecation(DELETE)', () => {
    expect(registry.getGlobalFunctionDeprecation('DELETE')).toBeUndefined();
  });

  it('should return undefined for getRecordMethodDeprecation(DELETE)', () => {
    expect(registry.getRecordMethodDeprecation('DELETE')).toBeUndefined();
  });
});

describe('BuiltinRegistry - Edge Cases', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should handle whitespace-only string', () => {
    expect(registry.isRecordMethod('   ')).toBe(false);
    expect(registry.getRecordMethodDeprecation('   ')).toBeUndefined();
  });

  it('should handle strings with leading/trailing whitespace', () => {
    // Registry should NOT normalize whitespace for these methods
    expect(registry.isRecordMethod('  RECORDLEVELLOCKING  ')).toBe(false);
    expect(registry.getRecordMethodDeprecation('  CONSISTENT  ')).toBeUndefined();
  });

  it('should handle very long identifier', () => {
    const longIdentifier = 'A'.repeat(1000);
    expect(registry.isRecordMethod(longIdentifier)).toBe(false);
    expect(registry.getRecordMethodDeprecation(longIdentifier)).toBeUndefined();
  });

  it('should handle identifier with numbers', () => {
    expect(registry.isRecordMethod('CONSISTENT123')).toBe(false);
    expect(registry.getRecordMethodDeprecation('CONSISTENT123')).toBeUndefined();
  });

  it('should handle identifier with underscores', () => {
    expect(registry.isRecordMethod('CONSISTENT_EXT')).toBe(false);
    expect(registry.getRecordMethodDeprecation('CONSISTENT_EXT')).toBeUndefined();
  });
});
