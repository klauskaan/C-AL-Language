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

import { BUILTIN_FUNCTIONS, RECORD_METHODS, SYSTEM_TYPE_KEYWORDS, SYSTEM_QUALIFIABLE } from '../builtinData';
import { BuiltinRegistry } from '../builtinRegistry';

describe('Builtins Module', () => {
  describe('Data Integrity - BUILTIN_FUNCTIONS', () => {
    it('should have exactly 140 global function entries', () => {
      expect(BUILTIN_FUNCTIONS).toHaveLength(140);
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

    describe('Table Connection Functions (NAV 2016+)', () => {
      it('should include SETDEFAULTTABLECONNECTION with category system', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'SETDEFAULTTABLECONNECTION');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });

      it('should include GETDEFAULTTABLECONNECTION with category system', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'GETDEFAULTTABLECONNECTION');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });

      it('should include REGISTERTABLECONNECTION with category system', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'REGISTERTABLECONNECTION');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });

      it('should include UNREGISTERTABLECONNECTION with category system', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'UNREGISTERTABLECONNECTION');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });

      it('should include HASTABLECONNECTION with category system', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'HASTABLECONNECTION');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });
    });

    it('should include SYSTEM as a builtin system object identifier with category system', () => {
      const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'SYSTEM');
      expect(fn).toBeDefined();
      expect(fn?.category).toBe('system');
    });
  });

  describe('Event Subscriber Functions (NAV 2016+)', () => {
    it('should include BINDSUBSCRIPTION with category system', () => {
      const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'BINDSUBSCRIPTION');
      expect(fn).toBeDefined();
      expect(fn?.category).toBe('system');
    });

    it('should include UNBINDSUBSCRIPTION with category system', () => {
      const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'UNBINDSUBSCRIPTION');
      expect(fn).toBeDefined();
      expect(fn?.category).toBe('system');
    });

    it('should include SELECTLATESTVERSION with category system', () => {
      const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'SELECTLATESTVERSION');
      expect(fn).toBeDefined();
      expect(fn?.category).toBe('system');
    });

    it('should have BINDSUBSCRIPTION signature with Codeunit parameter and Boolean return', () => {
      const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'BINDSUBSCRIPTION');
      expect(fn).toBeDefined();
      expect(fn?.signature).toBe('(Codeunit): Boolean');
    });

    it('should have UNBINDSUBSCRIPTION signature with Codeunit parameter and Boolean return', () => {
      const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'UNBINDSUBSCRIPTION');
      expect(fn).toBeDefined();
      expect(fn?.signature).toBe('(Codeunit): Boolean');
    });

    it('should have SELECTLATESTVERSION signature with no parameters', () => {
      const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'SELECTLATESTVERSION');
      expect(fn).toBeDefined();
      expect(fn?.signature).toBe('()');
    });
  });

  describe('Data Integrity - RECORD_METHODS', () => {
    it('should have exactly 71 record method entries', () => {
      // 53 existing + RENAME (added as dual-purpose) + FIELDACTIVE + COPYFILTER + 15 new methods from #604
      expect(RECORD_METHODS).toHaveLength(71);
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

    it('should include FIELDACTIVE as a record method', () => {
      const fieldactive = RECORD_METHODS.find((fn) => fn.name === 'FIELDACTIVE');
      expect(fieldactive).toBeDefined();
      expect(fieldactive?.category).toBe('record');
    });

    it('should have FIELDACTIVE signature that returns Boolean', () => {
      const fieldactive = RECORD_METHODS.find((fn) => fn.name === 'FIELDACTIVE');
      expect(fieldactive).toBeDefined();
      expect(fieldactive?.signature).toContain('Boolean');
    });

    it('should have FIELDACTIVE signature that accepts a Field parameter', () => {
      const fieldactive = RECORD_METHODS.find((fn) => fn.name === 'FIELDACTIVE');
      expect(fieldactive).toBeDefined();
      expect(fieldactive?.signature).toContain('Field');
    });

    it('should include all 15 new Record methods added for issue #604', () => {
      const expectedMethods = [
        'READPERMISSION',
        'WRITEPERMISSION',
        'SETVIEW',
        'GETVIEW',
        'ISTEMPORARY',
        'SETAUTOCALCFIELDS',
        'SETASCENDING',
        'GETASCENDING',
        'HASLINKS',
        'ADDLINK',
        'DELETELINKS',
        'DELETELINK',
        'COPYLINKS',
        'SETPERMISSIONFILTER',
        'SECURITYFILTERING'
      ];

      expectedMethods.forEach((methodName) => {
        const method = RECORD_METHODS.find((fn) => fn.name === methodName);
        expect(method).toBeDefined();
        expect(method?.category).toBe('record');
      });
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

    it('should recognize FIELDACTIVE as a record method', () => {
      expect(registry.isRecordMethod('FIELDACTIVE')).toBe(true);
    });

    it('should NOT recognize FIELDACTIVE as a global function', () => {
      expect(registry.isGlobalFunction('FIELDACTIVE')).toBe(false);
    });

    it('should recognize BINDSUBSCRIPTION as a global function', () => {
      expect(registry.isGlobalFunction('BINDSUBSCRIPTION')).toBe(true);
    });

    it('should NOT recognize BINDSUBSCRIPTION as a record method', () => {
      expect(registry.isRecordMethod('BINDSUBSCRIPTION')).toBe(false);
    });

    it('should recognize UNBINDSUBSCRIPTION as a global function', () => {
      expect(registry.isGlobalFunction('UNBINDSUBSCRIPTION')).toBe(true);
    });

    it('should NOT recognize UNBINDSUBSCRIPTION as a record method', () => {
      expect(registry.isRecordMethod('UNBINDSUBSCRIPTION')).toBe(false);
    });

    it('should recognize SELECTLATESTVERSION as a global function', () => {
      expect(registry.isGlobalFunction('SELECTLATESTVERSION')).toBe(true);
    });

    it('should NOT recognize SELECTLATESTVERSION as a record method', () => {
      expect(registry.isRecordMethod('SELECTLATESTVERSION')).toBe(false);
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

  describe('System Type Keywords', () => {
    let registry: BuiltinRegistry;

    beforeEach(() => {
      registry = new BuiltinRegistry();
    });

    it('should have exactly 21 system type keyword entries', () => {
      expect(SYSTEM_TYPE_KEYWORDS.size).toBe(21);
    });

    it('should recognize DATABASE as a known builtin', () => {
      expect(registry.isKnownBuiltin('DATABASE')).toBe(true);
    });

    it('should recognize PAGE as a known builtin', () => {
      expect(registry.isKnownBuiltin('PAGE')).toBe(true);
    });

    it('should recognize CODEUNIT as a known builtin', () => {
      expect(registry.isKnownBuiltin('CODEUNIT')).toBe(true);
    });

    it('should recognize REPORT as a known builtin', () => {
      expect(registry.isKnownBuiltin('REPORT')).toBe(true);
    });

    it('should recognize XMLPORT as a known builtin', () => {
      expect(registry.isKnownBuiltin('XMLPORT')).toBe(true);
    });

    it('should recognize QUERY as a known builtin', () => {
      expect(registry.isKnownBuiltin('QUERY')).toBe(true);
    });

    it('should recognize ACTION as a known builtin', () => {
      expect(registry.isKnownBuiltin('ACTION')).toBe(true);
    });

    it('should recognize TABLECONNECTIONTYPE as a known builtin', () => {
      expect(registry.isKnownBuiltin('TABLECONNECTIONTYPE')).toBe(true);
    });

    it('should recognize DataClassification as a known builtin', () => {
      expect(registry.isKnownBuiltin('DataClassification')).toBe(true);
    });

    it('should recognize ObsoleteState as a known builtin', () => {
      expect(registry.isKnownBuiltin('ObsoleteState')).toBe(true);
    });

    it('should recognize system type keywords case-insensitively', () => {
      expect(registry.isKnownBuiltin('database')).toBe(true);
      expect(registry.isKnownBuiltin('action')).toBe(true);
    });

    it('should return true for system type keywords via isSystemTypeKeyword', () => {
      expect(registry.isSystemTypeKeyword('DATABASE')).toBe(true);
    });

    it('should return false for global function via isSystemTypeKeyword', () => {
      // MESSAGE is a global function, not a system type keyword
      expect(registry.isSystemTypeKeyword('MESSAGE')).toBe(false);
    });

    it('should return false for record method via isSystemTypeKeyword', () => {
      // FIND is a record method, not a system type keyword
      expect(registry.isSystemTypeKeyword('FIND')).toBe(false);
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

  describe('Missing Builtin Identifiers (#573)', () => {
    let registry: BuiltinRegistry;

    beforeEach(() => {
      registry = new BuiltinRegistry();
    });

    describe('New SYSTEM_FUNCTIONS', () => {
      it('should recognize SENDTRACETAG as a global function with system category', () => {
        expect(registry.isGlobalFunction('SENDTRACETAG')).toBe(true);
        const func = registry.getGlobalFunction('SENDTRACETAG');
        expect(func).toBeDefined();
        expect(func?.category).toBe('system');
      });

      it('should recognize ISNULL as a global function with system category', () => {
        expect(registry.isGlobalFunction('ISNULL')).toBe(true);
        const func = registry.getGlobalFunction('ISNULL');
        expect(func).toBeDefined();
        expect(func?.category).toBe('system');
      });

      it('should recognize GETLASTERRORTEXT as a global function with system category', () => {
        expect(registry.isGlobalFunction('GETLASTERRORTEXT')).toBe(true);
        const func = registry.getGlobalFunction('GETLASTERRORTEXT');
        expect(func).toBeDefined();
        expect(func?.category).toBe('system');
      });

      it('should recognize USERSECURITYID as a global function with system category', () => {
        expect(registry.isGlobalFunction('USERSECURITYID')).toBe(true);
        const func = registry.getGlobalFunction('USERSECURITYID');
        expect(func).toBeDefined();
        expect(func?.category).toBe('system');
      });

      it('should recognize HYPERLINK as a global function with system category', () => {
        expect(registry.isGlobalFunction('HYPERLINK')).toBe(true);
        const func = registry.getGlobalFunction('HYPERLINK');
        expect(func).toBeDefined();
        expect(func?.category).toBe('system');
      });
    });

    describe('New SYSTEM_TYPE_KEYWORDS', () => {
      it('should recognize VERBOSITY as a system type keyword', () => {
        expect(registry.isSystemTypeKeyword('VERBOSITY')).toBe(true);
        expect(registry.isKnownBuiltin('VERBOSITY')).toBe(true);
      });

      it('should recognize CLIENTTYPE as a system type keyword', () => {
        expect(registry.isSystemTypeKeyword('CLIENTTYPE')).toBe(true);
        expect(registry.isKnownBuiltin('CLIENTTYPE')).toBe(true);
      });

      it('should recognize TEXTENCODING as a system type keyword', () => {
        expect(registry.isSystemTypeKeyword('TEXTENCODING')).toBe(true);
        expect(registry.isKnownBuiltin('TEXTENCODING')).toBe(true);
      });
    });

    describe('New RECORD_METHOD', () => {
      it('should recognize COPYFILTER as a record method', () => {
        expect(registry.isRecordMethod('COPYFILTER')).toBe(true);
        const func = registry.getRecordMethod('COPYFILTER');
        expect(func).toBeDefined();
        expect(func?.category).toBe('record');
      });
    });

    describe('Coexistence Tests', () => {
      it('should have both COPYFILTER and COPYFILTERS as distinct record methods', () => {
        const copyfilter = registry.getRecordMethod('COPYFILTER');
        const copyfilters = registry.getRecordMethod('COPYFILTERS');

        expect(copyfilter).toBeDefined();
        expect(copyfilters).toBeDefined();
        expect(copyfilter?.category).toBe('record');
        expect(copyfilters?.category).toBe('record');

        // Verify they are distinct entries
        expect(copyfilter?.name).toBe('COPYFILTER');
        expect(copyfilters?.name).toBe('COPYFILTERS');
      });

      it('should have both ISNULL and ISNULLGUID as distinct global functions', () => {
        const isnull = registry.getGlobalFunction('ISNULL');
        const isnullguid = registry.getGlobalFunction('ISNULLGUID');

        expect(isnull).toBeDefined();
        expect(isnullguid).toBeDefined();
        expect(isnull?.category).toBe('system');
        expect(isnullguid?.category).toBe('system');

        // Verify they are distinct entries
        expect(isnull?.name).toBe('ISNULL');
        expect(isnullguid?.name).toBe('ISNULLGUID');
      });

      it('should have both DELETELINK and DELETELINKS as distinct record methods', () => {
        const deletelink = registry.getRecordMethod('DELETELINK');
        const deletelinks = registry.getRecordMethod('DELETELINKS');

        expect(deletelink).toBeDefined();
        expect(deletelinks).toBeDefined();
        expect(deletelink?.category).toBe('record');
        expect(deletelinks?.category).toBe('record');

        // Verify they are distinct entries
        expect(deletelink?.name).toBe('DELETELINK');
        expect(deletelinks?.name).toBe('DELETELINKS');

        // Verify signatures
        expect(deletelinks?.signature).toBe('()');
        expect(deletelink?.signature).toContain('ID');
      });
    });
  });

  describe('Issue #604 - New Record Methods', () => {
    let registry: BuiltinRegistry;

    beforeEach(() => {
      registry = new BuiltinRegistry();
    });

    describe('Signature Tests', () => {
      it('should have READPERMISSION signature that returns Boolean with no parameters', () => {
        const method = registry.getRecordMethod('READPERMISSION');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('Boolean');
        expect(method?.signature).toBe('(): Boolean');
      });

      it('should have SETVIEW signature that contains String parameter', () => {
        const method = registry.getRecordMethod('SETVIEW');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('String');
      });

      it('should have GETVIEW signature that contains UseNames optional parameter and Text return', () => {
        const method = registry.getRecordMethod('GETVIEW');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('UseNames');
        expect(method?.signature).toContain('Text');
      });

      it('should have SETAUTOCALCFIELDS signature that contains Field1 variadic parameter', () => {
        const method = registry.getRecordMethod('SETAUTOCALCFIELDS');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('Field1');
      });

      it('should have SETASCENDING signature that contains Field and Value parameters', () => {
        const method = registry.getRecordMethod('SETASCENDING');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('Field');
        expect(method?.signature).toContain('Value');
      });

      it('should have GETASCENDING signature that contains Field parameter and Boolean return', () => {
        const method = registry.getRecordMethod('GETASCENDING');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('Field');
        expect(method?.signature).toContain('Boolean');
      });

      it('should have ADDLINK signature that contains URL and Description parameters', () => {
        const method = registry.getRecordMethod('ADDLINK');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('URL');
        expect(method?.signature).toContain('Description');
      });

      it('should have ADDLINK signature that returns Integer', () => {
        const method = registry.getRecordMethod('ADDLINK');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('Integer');
      });

      it('should have CALCFIELDS signature that returns Boolean', () => {
        const method = registry.getRecordMethod('CALCFIELDS');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('Boolean');
      });

      it('should have CHANGECOMPANY signature that returns Boolean', () => {
        const method = registry.getRecordMethod('CHANGECOMPANY');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('Boolean');
      });

      it('should have RENAME record method signature that returns Boolean', () => {
        const rename = registry.getRecordMethod('RENAME');
        expect(rename).toBeDefined();
        expect(rename?.signature).toContain('Boolean');
      });

      it('should have SECURITYFILTERING signature that contains SecurityFilter parameter', () => {
        const method = registry.getRecordMethod('SECURITYFILTERING');
        expect(method).toBeDefined();
        expect(method?.signature).toContain('SecurityFilter');
      });
    });

    describe('Registry Recognition Tests', () => {
      it('should recognize all 15 new methods via isRecordMethod', () => {
        const methods = [
          'READPERMISSION',
          'WRITEPERMISSION',
          'SETVIEW',
          'GETVIEW',
          'ISTEMPORARY',
          'SETAUTOCALCFIELDS',
          'SETASCENDING',
          'GETASCENDING',
          'HASLINKS',
          'ADDLINK',
          'DELETELINKS',
          'DELETELINK',
          'COPYLINKS',
          'SETPERMISSIONFILTER',
          'SECURITYFILTERING'
        ];

        methods.forEach((methodName) => {
          expect(registry.isRecordMethod(methodName)).toBe(true);
        });
      });
    });
  });

  describe('Issue #613 - Missing Builtins', () => {
    let registry: BuiltinRegistry;

    beforeEach(() => {
      registry = new BuiltinRegistry();
    });

    describe('Missing global functions — high frequency', () => {
      it('should recognize PRODUCTNAME as a global function with system category', () => {
        expect(registry.isGlobalFunction('PRODUCTNAME')).toBe(true);
        const fn = registry.getGlobalFunction('PRODUCTNAME');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });

      it('should recognize COPYSTREAM as a global function with file category', () => {
        expect(registry.isGlobalFunction('COPYSTREAM')).toBe(true);
        const fn = registry.getGlobalFunction('COPYSTREAM');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('file');
      });

      it('should recognize GETURL as a global function with system category', () => {
        expect(registry.isGlobalFunction('GETURL')).toBe(true);
        const fn = registry.getGlobalFunction('GETURL');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });

      it('should recognize CLEARLASTERROR as a global function with system category', () => {
        expect(registry.isGlobalFunction('CLEARLASTERROR')).toBe(true);
        const fn = registry.getGlobalFunction('CLEARLASTERROR');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });

      it('should recognize SESSIONID as a global function with system category', () => {
        expect(registry.isGlobalFunction('SESSIONID')).toBe(true);
        const fn = registry.getGlobalFunction('SESSIONID');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });

      it('should recognize ROUNDDATETIME as a global function with date category', () => {
        expect(registry.isGlobalFunction('ROUNDDATETIME')).toBe(true);
        const fn = registry.getGlobalFunction('ROUNDDATETIME');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('date');
      });

      it('should recognize ISSERVICETIER as a global function with system category', () => {
        expect(registry.isGlobalFunction('ISSERVICETIER')).toBe(true);
        const fn = registry.getGlobalFunction('ISSERVICETIER');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });
    });

    describe('Missing global functions — additional', () => {
      const additionalSystemFunctions = [
        'CURRENTCLIENTTYPE',
        'DEFAULTCLIENTTYPE',
        'GETLASTERRORCODE',
        'GETLASTERROROBJECT',
        'GETLASTERRORCALLSTACK',
        'ENCRYPT',
        'DECRYPT',
        'ENCRYPTIONKEYEXISTS',
        'IMPORTENCRYPTIONKEY',
        'EXPORTENCRYPTIONKEY',
      ];

      additionalSystemFunctions.forEach((name) => {
        it(`should recognize ${name} as a global function with system category`, () => {
          expect(registry.isGlobalFunction(name)).toBe(true);
          const fn = registry.getGlobalFunction(name);
          expect(fn).toBeDefined();
          expect(fn?.category).toBe('system');
        });
      });
    });

    describe('System object namespaces', () => {
      const systemObjects = ['TASKSCHEDULER', 'DEBUGGER', 'FILE', 'ISOLATEDSTORAGE', 'NAVAPP'];

      systemObjects.forEach((name) => {
        it(`should recognize ${name} as a global function with system category`, () => {
          expect(registry.isGlobalFunction(name)).toBe(true);
          const fn = registry.getGlobalFunction(name);
          expect(fn).toBeDefined();
          expect(fn?.category).toBe('system');
        });

        it(`should have ${name} with empty signature (system object namespace)`, () => {
          const fn = registry.getGlobalFunction(name);
          expect(fn).toBeDefined();
          expect(fn?.signature).toBe('');
        });

        it(`should NOT recognize ${name} as a record method`, () => {
          expect(registry.isRecordMethod(name)).toBe(false);
        });
      });
    });

    describe('Missing type keywords', () => {
      const missingKeywords = [
        'NOTIFICATIONSCOPE',
        'OBJECTTYPE',
        'SECURITYFILTER',
        'REPORTFORMAT',
        'TRANSACTIONTYPE',
      ];

      missingKeywords.forEach((keyword) => {
        it(`should recognize ${keyword} as a system type keyword`, () => {
          expect(registry.isSystemTypeKeyword(keyword)).toBe(true);
          expect(registry.isKnownBuiltin(keyword)).toBe(true);
        });

        it(`should recognize ${keyword} case-insensitively`, () => {
          expect(registry.isSystemTypeKeyword(keyword.toLowerCase())).toBe(true);
        });
      });
    });

    describe('Count validation', () => {
      it('BUILTIN_FUNCTIONS should have 140 entries after additions', () => {
        expect(BUILTIN_FUNCTIONS).toHaveLength(140);
      });

      it('SYSTEM_TYPE_KEYWORDS should have 21 entries after additions', () => {
        expect(SYSTEM_TYPE_KEYWORDS.size).toBe(21);
      });

      it('should have no duplicate names in BUILTIN_FUNCTIONS', () => {
        const names = BUILTIN_FUNCTIONS.map((fn) => fn.name.toUpperCase());
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
      });
    });
  });

  describe('Issue #623 - Missing Builtins', () => {
    let registry: BuiltinRegistry;

    beforeEach(() => {
      registry = new BuiltinRegistry();
    });

    describe('New global system functions', () => {
      const newSystemFunctions = [
        'GETDOTNETTYPE',
        'CREATE',
        'ISCLEAR',
        'CANLOADTYPE',
        'ENCRYPTIONENABLED',
        'CREATEENCRYPTIONKEY',
        'DELETEENCRYPTIONKEY',
        'APPLICATIONPATH',
        'SERVICEINSTANCEID',
        'ENVIRON',
        'TENANTID',
        'STARTSESSION',
        'ISSESSIONACTIVE',
        'SID',
        'APPLICATIONIDENTIFIER',
        'CODECOVERAGELOG',
        'CODECOVERAGEREFRESH',
        'CODECOVERAGELOAD',
        'CODECOVERAGEINCLUDE',
        'CAPTIONCLASSTRANSLATE',
        'CHANGEUSERPASSWORD',
        'SETUSERPASSWORD',
        'IMPORTDATA',
        'EXPORTDATA',
        'DATAFILEINFORMATION',
        'VARIANT2DATE',
      ];

      newSystemFunctions.forEach((name) => {
        it(`should recognize ${name} as a global function with system category`, () => {
          expect(registry.isGlobalFunction(name)).toBe(true);
          const fn = registry.getGlobalFunction(name);
          expect(fn).toBeDefined();
          expect(fn?.category).toBe('system');
        });
      });
    });

    describe('STRCHECKSUM category', () => {
      it('should recognize STRCHECKSUM as a global function with string category', () => {
        expect(registry.isGlobalFunction('STRCHECKSUM')).toBe(true);
        const fn = registry.getGlobalFunction('STRCHECKSUM');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('string');
      });
    });

    describe('COMPANYPROPERTY system object namespace', () => {
      it('should recognize COMPANYPROPERTY as a global function with system category', () => {
        expect(registry.isGlobalFunction('COMPANYPROPERTY')).toBe(true);
        const fn = registry.getGlobalFunction('COMPANYPROPERTY');
        expect(fn).toBeDefined();
        expect(fn?.category).toBe('system');
      });

      it('should have COMPANYPROPERTY with empty signature (system object namespace)', () => {
        const fn = registry.getGlobalFunction('COMPANYPROPERTY');
        expect(fn).toBeDefined();
        expect(fn?.signature).toBe('');
      });
    });

    describe('New system type keywords', () => {
      it('should recognize DATASCOPE as a system type keyword', () => {
        expect(registry.isSystemTypeKeyword('DATASCOPE')).toBe(true);
        expect(registry.isKnownBuiltin('DATASCOPE')).toBe(true);
      });

      it('should recognize DATASCOPE case-insensitively', () => {
        expect(registry.isSystemTypeKeyword('datascope')).toBe(true);
        expect(registry.isKnownBuiltin('datascope')).toBe(true);
      });

      it('should recognize DEFAULTLAYOUT as a system type keyword', () => {
        expect(registry.isSystemTypeKeyword('DEFAULTLAYOUT')).toBe(true);
        expect(registry.isKnownBuiltin('DEFAULTLAYOUT')).toBe(true);
      });

      it('should recognize DEFAULTLAYOUT case-insensitively', () => {
        expect(registry.isSystemTypeKeyword('defaultlayout')).toBe(true);
        expect(registry.isKnownBuiltin('defaultlayout')).toBe(true);
      });
    });

    describe('Count validation', () => {
      it('BUILTIN_FUNCTIONS.length should equal 140 after issue #623 additions', () => {
        expect(BUILTIN_FUNCTIONS.length).toBe(140);
      });

      it('SYSTEM_TYPE_KEYWORDS.size should equal 21 after issue #623 additions (updated by #687)', () => {
        expect(SYSTEM_TYPE_KEYWORDS.size).toBe(21);
      });
    });
  });

  describe('Issue #653 - Missing Builtins', () => {
    let registry: BuiltinRegistry;

    beforeEach(() => {
      registry = new BuiltinRegistry();
    });

    describe('New global system functions', () => {
      it('should recognize APPLICATIONAREA as a global function with system category', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'APPLICATIONAREA');
        expect(fn).toBeDefined();
        expect(fn?.name).toBe('APPLICATIONAREA');
        expect(registry.isGlobalFunction('APPLICATIONAREA')).toBe(true);
        expect(fn?.category).toBe('system');
      });

      it('should recognize IMPORTSTREAMWITHURLACCESS as a global function', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'IMPORTSTREAMWITHURLACCESS');
        expect(fn).toBeDefined();
        expect(fn?.name).toBe('IMPORTSTREAMWITHURLACCESS');
        expect(fn?.category).toBe('system');
        expect(registry.isGlobalFunction('IMPORTSTREAMWITHURLACCESS')).toBe(true);
      });

      it('should recognize GETDOCUMENTURL as a global function', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'GETDOCUMENTURL');
        expect(fn).toBeDefined();
        expect(fn?.name).toBe('GETDOCUMENTURL');
        expect(fn?.category).toBe('system');
        expect(registry.isGlobalFunction('GETDOCUMENTURL')).toBe(true);
      });

      it('should recognize CURRENTEXECUTIONMODE as a global function', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'CURRENTEXECUTIONMODE');
        expect(fn).toBeDefined();
        expect(fn?.name).toBe('CURRENTEXECUTIONMODE');
        expect(fn?.category).toBe('system');
        expect(registry.isGlobalFunction('CURRENTEXECUTIONMODE')).toBe(true);
      });

      it('should recognize CONTEXTURL as a global function', () => {
        const fn = BUILTIN_FUNCTIONS.find((f) => f.name === 'CONTEXTURL');
        expect(fn).toBeDefined();
        expect(fn?.name).toBe('CONTEXTURL');
        expect(fn?.category).toBe('system');
        expect(registry.isGlobalFunction('CONTEXTURL')).toBe(true);
      });
    });

    describe('AL-only exclusion corrections', () => {
      it('should include EXECUTIONMODE in SYSTEM_TYPE_KEYWORDS (valid C/AL BC14)', () => {
        expect(SYSTEM_TYPE_KEYWORDS.has('EXECUTIONMODE')).toBe(true);
        expect(registry.isSystemTypeKeyword('EXECUTIONMODE')).toBe(true);
      });
    });

    describe('Count validation', () => {
      it('BUILTIN_FUNCTIONS.length should equal 140 after issue #653 additions', () => {
        expect(BUILTIN_FUNCTIONS.length).toBe(140);
      });

      it('SYSTEM_TYPE_KEYWORDS.size should be 21 after issue #687 addition of EXECUTIONMODE', () => {
        expect(SYSTEM_TYPE_KEYWORDS.size).toBe(21);
      });
    });
  });

  describe('Issue #809 - SYSTEM_QUALIFIABLE set', () => {
    // These tests fail to COMPILE until SYSTEM_QUALIFIABLE is exported from builtinData.ts.
    // That compile failure is the intended red state.

    it('should have exactly 63 entries', () => {
      expect(SYSTEM_QUALIFIABLE.size).toBe(63);
    });

    it('should include EVALUATE (category: system, non-deprecated proof case)', () => {
      expect(SYSTEM_QUALIFIABLE.has('EVALUATE')).toBe(true);
    });

    it('should include FORMAT (category: string, cross-category proof case)', () => {
      expect(SYSTEM_QUALIFIABLE.has('FORMAT')).toBe(true);
    });

    it('should include COPYSTREAM (category: file, proof case)', () => {
      expect(SYSTEM_QUALIFIABLE.has('COPYSTREAM')).toBe(true);
    });

    it('should NOT include MESSAGE (dialog category, not SYSTEM-qualifiable)', () => {
      expect(SYSTEM_QUALIFIABLE.has('MESSAGE')).toBe(false);
    });

    it('should NOT include STRLEN (string utility, not SYSTEM-qualifiable)', () => {
      expect(SYSTEM_QUALIFIABLE.has('STRLEN')).toBe(false);
    });

    it('should include ISSERVICETIER (re-added in #813; valid C/AL, offered unqualified)', () => {
      expect(SYSTEM_QUALIFIABLE.has('ISSERVICETIER')).toBe(true);
    });

    it('every member of SYSTEM_QUALIFIABLE must exist in BUILTIN_FUNCTIONS', () => {
      const allNames = new Set(BUILTIN_FUNCTIONS.map(f => f.name.toUpperCase()));
      for (const name of SYSTEM_QUALIFIABLE) {
        expect(allNames.has(name.toUpperCase())).toBe(true);
      }
    });
  });
});
