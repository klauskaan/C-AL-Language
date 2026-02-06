/**
 * Builtins Module Tests
 *
 * Tests for the unified builtins module that consolidates:
 * - Builtin function data (BUILTIN_FUNCTIONS, RECORD_METHODS)
 * - Builtin registry for semantic validation
 *
 * These tests validate:
 * 1. Data integrity (counts, required fields, no duplicates)
 * 2. Category consistency (global vs record)
 * 3. Registry derivation from data arrays
 * 4. Dual-purpose functions (COPY, RENAME)
 * 5. Known issues (CREATEGUID vs CREATEGUIDS typo, CALCTIME not in C/AL)
 */

import { BuiltinFunction, BUILTIN_FUNCTIONS, RECORD_METHODS } from '../builtinData';
import { BuiltinRegistry } from '../builtinRegistry';

describe('Builtins Module', () => {
  describe('Data Integrity - BUILTIN_FUNCTIONS', () => {
    it('should have exactly 71 global function entries', () => {
      expect(BUILTIN_FUNCTIONS).toHaveLength(71);
    });

    it('should have all required fields for each entry', () => {
      BUILTIN_FUNCTIONS.forEach((fn) => {
        expect(fn).toHaveProperty('name');
        expect(fn).toHaveProperty('signature');
        expect(fn).toHaveProperty('documentation');
        expect(fn).toHaveProperty('category');

        expect(typeof fn.name).toBe('string');
        expect(typeof fn.signature).toBe('string');
        expect(typeof fn.documentation).toBe('string');
        expect(typeof fn.category).toBe('string');
      });
    });

    it('should have no duplicate names', () => {
      const names = BUILTIN_FUNCTIONS.map((fn) => fn.name.toUpperCase());
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have category !== "record" for all entries', () => {
      BUILTIN_FUNCTIONS.forEach((fn) => {
        expect(fn.category).not.toBe('record');
      });
    });

    it('should include CREATEGUID (not CREATEGUIDS)', () => {
      const createguid = BUILTIN_FUNCTIONS.find((fn) => fn.name === 'CREATEGUID');
      expect(createguid).toBeDefined();
      expect(createguid?.category).toBe('system');
    });

    it('should NOT include CALCTIME (not a real C/AL function)', () => {
      const calctime = BUILTIN_FUNCTIONS.find((fn) => fn.name === 'CALCTIME');
      expect(calctime).toBeUndefined();
    });

    it('should include RENAME as a file function', () => {
      const rename = BUILTIN_FUNCTIONS.find((fn) => fn.name === 'RENAME');
      expect(rename).toBeDefined();
      expect(rename?.category).toBe('file');
    });
  });

  describe('Data Integrity - RECORD_METHODS', () => {
    it('should have exactly 54 record method entries', () => {
      // 53 existing + RENAME (added as dual-purpose)
      expect(RECORD_METHODS).toHaveLength(54);
    });

    it('should have all required fields for each entry', () => {
      RECORD_METHODS.forEach((fn) => {
        expect(fn).toHaveProperty('name');
        expect(fn).toHaveProperty('signature');
        expect(fn).toHaveProperty('documentation');
        expect(fn).toHaveProperty('category');

        expect(typeof fn.name).toBe('string');
        expect(typeof fn.signature).toBe('string');
        expect(typeof fn.documentation).toBe('string');
        expect(typeof fn.category).toBe('string');
      });
    });

    it('should have no duplicate names', () => {
      const names = RECORD_METHODS.map((fn) => fn.name.toUpperCase());
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have category === "record" for all entries', () => {
      RECORD_METHODS.forEach((fn) => {
        expect(fn.category).toBe('record');
      });
    });

    it('should include RENAME as a record method', () => {
      const rename = RECORD_METHODS.find((fn) => fn.name === 'RENAME');
      expect(rename).toBeDefined();
      expect(rename?.category).toBe('record');
    });

    it('should include COPY as a record method', () => {
      const copy = RECORD_METHODS.find((fn) => fn.name === 'COPY');
      expect(copy).toBeDefined();
      expect(copy?.category).toBe('record');
    });
  });

  describe('Dual-Purpose Functions', () => {
    it('should have RENAME in BOTH arrays (global file function AND record method)', () => {
      const globalRename = BUILTIN_FUNCTIONS.find((fn) => fn.name === 'RENAME');
      const recordRename = RECORD_METHODS.find((fn) => fn.name === 'RENAME');

      expect(globalRename).toBeDefined();
      expect(recordRename).toBeDefined();
      expect(globalRename?.category).toBe('file');
      expect(recordRename?.category).toBe('record');
    });

    it('should have COPY in BOTH arrays (global file function AND record method)', () => {
      const globalCopy = BUILTIN_FUNCTIONS.find((fn) => fn.name === 'COPY');
      const recordCopy = RECORD_METHODS.find((fn) => fn.name === 'COPY');

      expect(globalCopy).toBeDefined();
      expect(recordCopy).toBeDefined();
      expect(globalCopy?.category).toBe('file');
      expect(recordCopy?.category).toBe('record');
    });
  });

  describe('Registry Derivation', () => {
    let registry: BuiltinRegistry;

    beforeEach(() => {
      registry = new BuiltinRegistry();
    });

    it('should recognize all BUILTIN_FUNCTIONS as global functions', () => {
      BUILTIN_FUNCTIONS.forEach((fn) => {
        expect(registry.isGlobalFunction(fn.name)).toBe(true);
      });
    });

    it('should have global function count matching BUILTIN_FUNCTIONS length', () => {
      let count = 0;
      BUILTIN_FUNCTIONS.forEach((fn) => {
        if (registry.isGlobalFunction(fn.name)) {
          count++;
        }
      });
      expect(count).toBe(BUILTIN_FUNCTIONS.length);
    });

    it('should recognize all RECORD_METHODS as record methods', () => {
      RECORD_METHODS.forEach((fn) => {
        expect(registry.isRecordMethod(fn.name)).toBe(true);
      });
    });

    it('should have record method count matching RECORD_METHODS length', () => {
      let count = 0;
      RECORD_METHODS.forEach((fn) => {
        if (registry.isRecordMethod(fn.name)) {
          count++;
        }
      });
      expect(count).toBe(RECORD_METHODS.length);
    });

    it('should recognize COPY as BOTH a global function AND a record method', () => {
      expect(registry.isGlobalFunction('COPY')).toBe(true);
      expect(registry.isRecordMethod('COPY')).toBe(true);
    });

    it('should recognize RENAME as BOTH a global function AND a record method', () => {
      expect(registry.isGlobalFunction('RENAME')).toBe(true);
      expect(registry.isRecordMethod('RENAME')).toBe(true);
    });

    it('should work case-insensitively', () => {
      expect(registry.isGlobalFunction('MESSAGE')).toBe(true);
      expect(registry.isGlobalFunction('message')).toBe(true);
      expect(registry.isGlobalFunction('MeSsAgE')).toBe(true);

      expect(registry.isRecordMethod('FIND')).toBe(true);
      expect(registry.isRecordMethod('find')).toBe(true);
      expect(registry.isRecordMethod('FiNd')).toBe(true);
    });

    it('should NOT recognize CREATEGUIDS (with typo S)', () => {
      expect(registry.isGlobalFunction('CREATEGUIDS')).toBe(false);
    });

    it('should recognize CREATEGUID (correct spelling)', () => {
      expect(registry.isGlobalFunction('CREATEGUID')).toBe(true);
    });

    it('should NOT recognize CALCTIME (not a real C/AL function)', () => {
      expect(registry.isGlobalFunction('CALCTIME')).toBe(false);
    });
  });

  describe('Registry Deprecation', () => {
    let registry: BuiltinRegistry;

    beforeEach(() => {
      registry = new BuiltinRegistry();
    });

    it('should return deprecation reason for RECORDLEVELLOCKING', () => {
      const recordlevelLocking = RECORD_METHODS.find(
        (fn) => fn.name === 'RECORDLEVELLOCKING'
      );
      expect(recordlevelLocking?.deprecated).toBeDefined();

      const reason = registry.getRecordMethodDeprecation('RECORDLEVELLOCKING');
      expect(reason).toBe(recordlevelLocking?.deprecated);
    });

    it('should return deprecation reason for CONSISTENT', () => {
      const consistent = RECORD_METHODS.find((fn) => fn.name === 'CONSISTENT');
      expect(consistent?.deprecated).toBeDefined();

      const reason = registry.getRecordMethodDeprecation('CONSISTENT');
      expect(reason).toBe(consistent?.deprecated);
    });

    it('should return deprecation reason for GETRECORDID', () => {
      const getrecordid = RECORD_METHODS.find((fn) => fn.name === 'GETRECORDID');
      expect(getrecordid?.deprecated).toBeDefined();

      const reason = registry.getRecordMethodDeprecation('GETRECORDID');
      expect(reason).toBe(getrecordid?.deprecated);
    });

    it('should return undefined for non-deprecated record methods', () => {
      expect(registry.getRecordMethodDeprecation('FIND')).toBeUndefined();
      expect(registry.getRecordMethodDeprecation('INSERT')).toBeUndefined();
    });

    it('should return undefined for global functions', () => {
      expect(registry.getGlobalFunctionDeprecation('MESSAGE')).toBeUndefined();
    });

    it('should return undefined for non-existent functions', () => {
      expect(registry.getRecordMethodDeprecation('NOTAFUNCTION')).toBeUndefined();
      expect(registry.getGlobalFunctionDeprecation('CALCTIME')).toBeUndefined();
    });
  });

  describe('Registry Getter Methods', () => {
    let registry: BuiltinRegistry;

    beforeEach(() => {
      registry = new BuiltinRegistry();
    });

    it('should return full function object for global function', () => {
      const func = registry.getGlobalFunction('MESSAGE');
      expect(func).toBeDefined();
      expect(func?.name).toBe('MESSAGE');
      expect(func?.signature).toBeDefined();
      expect(func?.documentation).toBeDefined();
      expect(func?.category).not.toBe('record');
    });

    it('should return full function object for record method', () => {
      const func = registry.getRecordMethod('FIND');
      expect(func).toBeDefined();
      expect(func?.name).toBe('FIND');
      expect(func?.signature).toBeDefined();
      expect(func?.documentation).toBeDefined();
      expect(func?.category).toBe('record');
    });

    it('should be case-insensitive for getGlobalFunction', () => {
      expect(registry.getGlobalFunction('MESSAGE')).toBeDefined();
      expect(registry.getGlobalFunction('message')).toBeDefined();
      expect(registry.getGlobalFunction('MeSsAgE')).toBeDefined();
      expect(registry.getGlobalFunction('MESSAGE')?.name).toBe('MESSAGE');
    });

    it('should be case-insensitive for getRecordMethod', () => {
      expect(registry.getRecordMethod('FIND')).toBeDefined();
      expect(registry.getRecordMethod('find')).toBeDefined();
      expect(registry.getRecordMethod('FiNd')).toBeDefined();
      expect(registry.getRecordMethod('FIND')?.name).toBe('FIND');
    });

    it('should return undefined for non-existent global function', () => {
      expect(registry.getGlobalFunction('NOTAFUNCTION')).toBeUndefined();
      expect(registry.getGlobalFunction('CALCTIME')).toBeUndefined();
    });

    it('should return undefined for non-existent record method', () => {
      expect(registry.getRecordMethod('NOTAMETHOD')).toBeUndefined();
    });

    it('should handle dual-purpose RENAME correctly', () => {
      const globalRename = registry.getGlobalFunction('RENAME');
      const recordRename = registry.getRecordMethod('RENAME');

      expect(globalRename).toBeDefined();
      expect(recordRename).toBeDefined();
      expect(globalRename?.category).toBe('file');
      expect(recordRename?.category).toBe('record');
    });

    it('should handle dual-purpose COPY correctly', () => {
      const globalCopy = registry.getGlobalFunction('COPY');
      const recordCopy = registry.getRecordMethod('COPY');

      expect(globalCopy).toBeDefined();
      expect(recordCopy).toBeDefined();
      expect(globalCopy?.category).toBe('file');
      expect(recordCopy?.category).toBe('record');
    });
  });
});
