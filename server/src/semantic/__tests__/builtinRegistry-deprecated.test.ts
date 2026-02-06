/**
 * BuiltinRegistry Deprecation Tests
 *
 * Tests for deprecated method detection in the BuiltinRegistry.
 * These tests extend the existing builtinRegistry.test.ts with deprecation-specific functionality.
 *
 * New functionality:
 * - Recognition of deprecated record methods (RECORDLEVELLOCKING, GETRECORDID, CONSISTENT)
 * - getDeprecationReason() returns deprecation message for deprecated methods
 * - getDeprecationReason() returns undefined for non-deprecated methods
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
      const reason = registry.getDeprecationReason('RECORDLEVELLOCKING');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
      expect(reason!.length).toBeGreaterThan(0);
    });

    it('should return deprecation reason for GETRECORDID', () => {
      const reason = registry.getDeprecationReason('GETRECORDID');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
      expect(reason!.length).toBeGreaterThan(0);
    });

    it('should return deprecation reason for CONSISTENT', () => {
      const reason = registry.getDeprecationReason('CONSISTENT');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
      expect(reason!.length).toBeGreaterThan(0);
    });
  });

  describe('Case insensitivity for deprecation reason', () => {
    it('should return reason for recordlevellocking (lowercase)', () => {
      const reason = registry.getDeprecationReason('recordlevellocking');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for RecordLevelLocking (mixed case)', () => {
      const reason = registry.getDeprecationReason('RecordLevelLocking');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for getrecordid (lowercase)', () => {
      const reason = registry.getDeprecationReason('getrecordid');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for GetRecordId (mixed case)', () => {
      const reason = registry.getDeprecationReason('GetRecordId');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for consistent (lowercase)', () => {
      const reason = registry.getDeprecationReason('consistent');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });

    it('should return reason for Consistent (mixed case)', () => {
      const reason = registry.getDeprecationReason('Consistent');

      expect(reason).toBeDefined();
      expect(typeof reason).toBe('string');
    });
  });

  describe('Non-deprecated methods return undefined', () => {
    it('should return undefined for FIND', () => {
      expect(registry.getDeprecationReason('FIND')).toBeUndefined();
    });

    it('should return undefined for GET', () => {
      expect(registry.getDeprecationReason('GET')).toBeUndefined();
    });

    it('should return undefined for INSERT', () => {
      expect(registry.getDeprecationReason('INSERT')).toBeUndefined();
    });

    it('should return undefined for MODIFY', () => {
      expect(registry.getDeprecationReason('MODIFY')).toBeUndefined();
    });

    it('should return undefined for DELETE', () => {
      expect(registry.getDeprecationReason('DELETE')).toBeUndefined();
    });

    it('should return undefined for FINDSET', () => {
      expect(registry.getDeprecationReason('FINDSET')).toBeUndefined();
    });

    it('should return undefined for FINDFIRST', () => {
      expect(registry.getDeprecationReason('FINDFIRST')).toBeUndefined();
    });

    it('should return undefined for FINDLAST', () => {
      expect(registry.getDeprecationReason('FINDLAST')).toBeUndefined();
    });

    it('should return undefined for NEXT', () => {
      expect(registry.getDeprecationReason('NEXT')).toBeUndefined();
    });

    it('should return undefined for SETRANGE', () => {
      expect(registry.getDeprecationReason('SETRANGE')).toBeUndefined();
    });

    it('should return undefined for SETFILTER', () => {
      expect(registry.getDeprecationReason('SETFILTER')).toBeUndefined();
    });

    it('should return undefined for RESET', () => {
      expect(registry.getDeprecationReason('RESET')).toBeUndefined();
    });

    it('should return undefined for INIT', () => {
      expect(registry.getDeprecationReason('INIT')).toBeUndefined();
    });

    it('should return undefined for VALIDATE', () => {
      expect(registry.getDeprecationReason('VALIDATE')).toBeUndefined();
    });

    it('should return undefined for TESTFIELD', () => {
      expect(registry.getDeprecationReason('TESTFIELD')).toBeUndefined();
    });

    it('should return undefined for LOCKTABLE', () => {
      expect(registry.getDeprecationReason('LOCKTABLE')).toBeUndefined();
    });

    it('should return undefined for CALCFIELDS', () => {
      expect(registry.getDeprecationReason('CALCFIELDS')).toBeUndefined();
    });

    it('should return undefined for CALCSUMS', () => {
      expect(registry.getDeprecationReason('CALCSUMS')).toBeUndefined();
    });
  });

  describe('Global functions return undefined', () => {
    it('should return undefined for MESSAGE', () => {
      expect(registry.getDeprecationReason('MESSAGE')).toBeUndefined();
    });

    it('should return undefined for ERROR', () => {
      expect(registry.getDeprecationReason('ERROR')).toBeUndefined();
    });

    it('should return undefined for FORMAT', () => {
      expect(registry.getDeprecationReason('FORMAT')).toBeUndefined();
    });

    it('should return undefined for CONFIRM', () => {
      expect(registry.getDeprecationReason('CONFIRM')).toBeUndefined();
    });

    it('should return undefined for EVALUATE', () => {
      expect(registry.getDeprecationReason('EVALUATE')).toBeUndefined();
    });

    it('should return undefined for STRLEN', () => {
      expect(registry.getDeprecationReason('STRLEN')).toBeUndefined();
    });

    it('should return undefined for UPPERCASE', () => {
      expect(registry.getDeprecationReason('UPPERCASE')).toBeUndefined();
    });

    it('should return undefined for LOWERCASE', () => {
      expect(registry.getDeprecationReason('LOWERCASE')).toBeUndefined();
    });

    it('should return undefined for TODAY', () => {
      expect(registry.getDeprecationReason('TODAY')).toBeUndefined();
    });

    it('should return undefined for TIME', () => {
      expect(registry.getDeprecationReason('TIME')).toBeUndefined();
    });
  });

  describe('Unknown identifiers return undefined', () => {
    it('should return undefined for unknown method', () => {
      expect(registry.getDeprecationReason('UnknownMethod')).toBeUndefined();
    });

    it('should return undefined for user-defined procedure', () => {
      expect(registry.getDeprecationReason('MyCustomProcedure')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(registry.getDeprecationReason('')).toBeUndefined();
    });

    it('should return undefined for syntactic keyword IF', () => {
      expect(registry.getDeprecationReason('IF')).toBeUndefined();
    });

    it('should return undefined for syntactic keyword THEN', () => {
      expect(registry.getDeprecationReason('THEN')).toBeUndefined();
    });

    it('should return undefined for syntactic keyword BEGIN', () => {
      expect(registry.getDeprecationReason('BEGIN')).toBeUndefined();
    });

    it('should return undefined for syntactic keyword END', () => {
      expect(registry.getDeprecationReason('END')).toBeUndefined();
    });
  });
});

describe('BuiltinRegistry - Deprecation Message Content', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should return a meaningful deprecation message for RECORDLEVELLOCKING', () => {
    const reason = registry.getDeprecationReason('RECORDLEVELLOCKING');

    expect(reason).toBeDefined();
    // Should be a non-empty, informative message
    expect(reason!.length).toBeGreaterThan(10);
  });

  it('should return a meaningful deprecation message for GETRECORDID', () => {
    const reason = registry.getDeprecationReason('GETRECORDID');

    expect(reason).toBeDefined();
    expect(reason!.length).toBeGreaterThan(10);
  });

  it('should return a meaningful deprecation message for CONSISTENT', () => {
    const reason = registry.getDeprecationReason('CONSISTENT');

    expect(reason).toBeDefined();
    expect(reason!.length).toBeGreaterThan(10);
  });
});

describe('BuiltinRegistry - Edge Cases', () => {
  let registry: BuiltinRegistry;

  beforeEach(() => {
    registry = new BuiltinRegistry();
  });

  it('should handle whitespace-only string', () => {
    expect(registry.isRecordMethod('   ')).toBe(false);
    expect(registry.getDeprecationReason('   ')).toBeUndefined();
  });

  it('should handle strings with leading/trailing whitespace', () => {
    // Registry should NOT normalize whitespace for these methods
    expect(registry.isRecordMethod('  RECORDLEVELLOCKING  ')).toBe(false);
    expect(registry.getDeprecationReason('  CONSISTENT  ')).toBeUndefined();
  });

  it('should handle very long identifier', () => {
    const longIdentifier = 'A'.repeat(1000);
    expect(registry.isRecordMethod(longIdentifier)).toBe(false);
    expect(registry.getDeprecationReason(longIdentifier)).toBeUndefined();
  });

  it('should handle identifier with numbers', () => {
    expect(registry.isRecordMethod('CONSISTENT123')).toBe(false);
    expect(registry.getDeprecationReason('CONSISTENT123')).toBeUndefined();
  });

  it('should handle identifier with underscores', () => {
    expect(registry.isRecordMethod('CONSISTENT_EXT')).toBe(false);
    expect(registry.getDeprecationReason('CONSISTENT_EXT')).toBeUndefined();
  });
});
