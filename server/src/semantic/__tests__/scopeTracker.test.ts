/**
 * ScopeTracker Tests
 *
 * Tests for tracking WITH statement scopes and determining when to flag undefined identifiers.
 * The ScopeTracker handles:
 * - Entering and exiting WITH statement scopes
 * - Nested WITH statements
 * - Determining if currently inside a WITH statement
 * - Deciding whether to flag identifiers as undefined based on context
 *
 * Key Rule: Inside WITH statements, unknown identifiers might be record fields,
 * so they should NOT be flagged as undefined.
 */

import { ScopeTracker } from '../scopeTracker';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../builtinRegistry';

describe('ScopeTracker - Basic WITH Tracking', () => {
  let tracker: ScopeTracker;

  beforeEach(() => {
    tracker = new ScopeTracker();
  });

  it('should create a tracker', () => {
    expect(tracker).toBeDefined();
  });

  it('should not be inside WITH initially', () => {
    expect(tracker.isInsideWith()).toBe(false);
  });

  it('should track entering WITH statement', () => {
    tracker.enterWith();
    expect(tracker.isInsideWith()).toBe(true);
  });

  it('should track exiting WITH statement', () => {
    tracker.enterWith();
    expect(tracker.isInsideWith()).toBe(true);

    tracker.exitWith();
    expect(tracker.isInsideWith()).toBe(false);
  });

  it('should handle multiple enter/exit cycles', () => {
    // First WITH
    tracker.enterWith();
    expect(tracker.isInsideWith()).toBe(true);
    tracker.exitWith();
    expect(tracker.isInsideWith()).toBe(false);

    // Second WITH
    tracker.enterWith();
    expect(tracker.isInsideWith()).toBe(true);
    tracker.exitWith();
    expect(tracker.isInsideWith()).toBe(false);

    // Third WITH
    tracker.enterWith();
    expect(tracker.isInsideWith()).toBe(true);
    tracker.exitWith();
    expect(tracker.isInsideWith()).toBe(false);
  });
});

describe('ScopeTracker - Nested WITH Statements', () => {
  let tracker: ScopeTracker;

  beforeEach(() => {
    tracker = new ScopeTracker();
  });

  it('should track nested WITH statements (2 levels)', () => {
    tracker.enterWith(); // WITH Customer DO
    expect(tracker.isInsideWith()).toBe(true);

    tracker.enterWith(); // WITH Vendor DO (nested)
    expect(tracker.isInsideWith()).toBe(true);

    tracker.exitWith(); // Exit inner WITH
    expect(tracker.isInsideWith()).toBe(true); // Still in outer WITH

    tracker.exitWith(); // Exit outer WITH
    expect(tracker.isInsideWith()).toBe(false);
  });

  it('should track nested WITH statements (3 levels)', () => {
    tracker.enterWith(); // Level 1
    expect(tracker.isInsideWith()).toBe(true);

    tracker.enterWith(); // Level 2
    expect(tracker.isInsideWith()).toBe(true);

    tracker.enterWith(); // Level 3
    expect(tracker.isInsideWith()).toBe(true);

    tracker.exitWith(); // Exit level 3
    expect(tracker.isInsideWith()).toBe(true);

    tracker.exitWith(); // Exit level 2
    expect(tracker.isInsideWith()).toBe(true);

    tracker.exitWith(); // Exit level 1
    expect(tracker.isInsideWith()).toBe(false);
  });

  it('should track nested WITH statements (deep nesting)', () => {
    const depth = 10;

    // Enter nested WITHs
    for (let i = 0; i < depth; i++) {
      tracker.enterWith();
      expect(tracker.isInsideWith()).toBe(true);
    }

    // Exit nested WITHs
    for (let i = 0; i < depth - 1; i++) {
      tracker.exitWith();
      expect(tracker.isInsideWith()).toBe(true); // Still inside at least one WITH
    }

    tracker.exitWith(); // Exit last WITH
    expect(tracker.isInsideWith()).toBe(false);
  });
});

describe('ScopeTracker - shouldFlagAsUndefined Outside WITH', () => {
  let tracker: ScopeTracker;
  let symbolTable: SymbolTable;
  let builtins: BuiltinRegistry;

  beforeEach(() => {
    tracker = new ScopeTracker();
    symbolTable = new SymbolTable();
    builtins = new BuiltinRegistry();
  });

  it('should flag unknown identifier outside WITH', () => {
    // Not inside WITH, identifier not in symbols or builtins
    const shouldFlag = tracker.shouldFlagAsUndefined(
      'UnknownVariable',
      5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(true);
  });

  it('should NOT flag known symbol outside WITH', () => {
    // Add symbol to table
    symbolTable.defineGlobal({
      name: 'KnownVariable',
      kind: 'variable',
      type: 'Integer',
      startOffset: 0,
      endOffset: 10
    });

    const shouldFlag = tracker.shouldFlagAsUndefined(
      'KnownVariable',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag builtin function outside WITH', () => {
    // MESSAGE is a builtin function
    const shouldFlag = tracker.shouldFlagAsUndefined(
      'MESSAGE',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag builtin method outside WITH', () => {
    // FIND is a builtin record method
    const shouldFlag = tracker.shouldFlagAsUndefined(
      'FIND',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should handle case-insensitive symbol lookup outside WITH', () => {
    symbolTable.defineGlobal({
      name: 'MyVariable',
      kind: 'variable',
      type: 'Integer',
      startOffset: 0,
      endOffset: 10
    });

    // Different case variations
    expect(tracker.shouldFlagAsUndefined('MyVariable', 5, symbolTable, builtins)).toBe(false);
    expect(tracker.shouldFlagAsUndefined('MYVARIABLE', 5, symbolTable, builtins)).toBe(false);
    expect(tracker.shouldFlagAsUndefined('myvariable', 5, symbolTable, builtins)).toBe(false);
  });
});

describe('ScopeTracker - shouldFlagAsUndefined Inside WITH', () => {
  let tracker: ScopeTracker;
  let symbolTable: SymbolTable;
  let builtins: BuiltinRegistry;

  beforeEach(() => {
    tracker = new ScopeTracker();
    symbolTable = new SymbolTable();
    builtins = new BuiltinRegistry();
    tracker.enterWith(); // Enter WITH scope
  });

  it('should NOT flag unknown identifier inside WITH (could be field)', () => {
    // Inside WITH, unknown identifier might be a record field
    const shouldFlag = tracker.shouldFlagAsUndefined(
      'PossiblyAField',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag builtins inside WITH', () => {
    // MESSAGE is a builtin, should not be flagged anywhere
    const shouldFlag = tracker.shouldFlagAsUndefined(
      'MESSAGE',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag declared locals inside WITH', () => {
    symbolTable.defineGlobal({
      name: 'LocalVar',
      kind: 'variable',
      type: 'Integer',
      startOffset: 0,
      endOffset: 10
    });

    const shouldFlag = tracker.shouldFlagAsUndefined(
      'LocalVar',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag record methods inside WITH', () => {
    // FIND is a record method
    const shouldFlag = tracker.shouldFlagAsUndefined(
      'FIND',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag ERROR function inside WITH', () => {
    const shouldFlag = tracker.shouldFlagAsUndefined(
      'ERROR',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag FORMAT function inside WITH', () => {
    const shouldFlag = tracker.shouldFlagAsUndefined(
      'FORMAT',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag any identifier inside WITH (conservative approach)', () => {
    // Even completely unknown identifiers should not be flagged inside WITH
    // because they could be fields of the WITH record
    const identifiers = [
      'SomeField',
      'AnotherField',
      'No',
      'Name',
      'Amount',
      'Status',
      'Type'
    ];

    identifiers.forEach(identifier => {
      const shouldFlag = tracker.shouldFlagAsUndefined(
        identifier,
              5,
        symbolTable,
        builtins
      );
      expect(shouldFlag).toBe(false);
    });
  });
});

describe('ScopeTracker - shouldFlagAsUndefined Nested WITH', () => {
  let tracker: ScopeTracker;
  let symbolTable: SymbolTable;
  let builtins: BuiltinRegistry;

  beforeEach(() => {
    tracker = new ScopeTracker();
    symbolTable = new SymbolTable();
    builtins = new BuiltinRegistry();
  });

  it('should NOT flag inside nested WITH (level 1)', () => {
    tracker.enterWith();

    const shouldFlag = tracker.shouldFlagAsUndefined(
      'Field1',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag inside nested WITH (level 2)', () => {
    tracker.enterWith(); // WITH Customer DO
    tracker.enterWith(); // WITH Vendor DO

    const shouldFlag = tracker.shouldFlagAsUndefined(
      'Field2',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should NOT flag inside nested WITH (level 3)', () => {
    tracker.enterWith();
    tracker.enterWith();
    tracker.enterWith();

    const shouldFlag = tracker.shouldFlagAsUndefined(
      'Field3',
            5,
      symbolTable,
      builtins
    );
    expect(shouldFlag).toBe(false);
  });

  it('should flag after exiting all nested WITHs', () => {
    tracker.enterWith();
    tracker.enterWith();

    // Inside nested WITH
    expect(tracker.shouldFlagAsUndefined('Unknown', 5, symbolTable, builtins)).toBe(false);

    tracker.exitWith();
    // Still inside one WITH
    expect(tracker.shouldFlagAsUndefined('Unknown', 5, symbolTable, builtins)).toBe(false);

    tracker.exitWith();
    // Outside all WITHs
    expect(tracker.shouldFlagAsUndefined('Unknown', 5, symbolTable, builtins)).toBe(true);
  });
});

describe('ScopeTracker - Edge Cases', () => {
  let tracker: ScopeTracker;
  let symbolTable: SymbolTable;
  let builtins: BuiltinRegistry;

  beforeEach(() => {
    tracker = new ScopeTracker();
    symbolTable = new SymbolTable();
    builtins = new BuiltinRegistry();
  });

  it('should handle exitWith when not inside WITH', () => {
    // Should not crash if exitWith called without matching enterWith
    expect(() => tracker.exitWith()).not.toThrow();
    expect(tracker.isInsideWith()).toBe(false);
  });

  it('should handle multiple exitWith calls', () => {
    tracker.enterWith();
    tracker.exitWith();
    tracker.exitWith(); // Extra exit
    tracker.exitWith(); // Another extra exit

    // Should handle gracefully
    expect(tracker.isInsideWith()).toBe(false);
  });

  it('should handle empty identifier', () => {
    const shouldFlag = tracker.shouldFlagAsUndefined(
      '',
            5,
      symbolTable,
      builtins
    );
    // Empty identifier behavior - probably should flag as invalid
    expect(typeof shouldFlag).toBe('boolean');
  });

  it('should handle very long identifier', () => {
    const longIdentifier = 'A'.repeat(1000);
    const shouldFlag = tracker.shouldFlagAsUndefined(
      longIdentifier,
            5,
      symbolTable,
      builtins
    );
    expect(typeof shouldFlag).toBe('boolean');
  });

  it('should handle identifier with special characters', () => {
    // C/AL quoted identifiers can contain spaces and special chars
    const specialIdentifier = 'Field with Spaces';
    const shouldFlag = tracker.shouldFlagAsUndefined(
      specialIdentifier,
            5,
      symbolTable,
      builtins
    );
    expect(typeof shouldFlag).toBe('boolean');
  });

  it('should handle whitespace in identifier', () => {
    const shouldFlag = tracker.shouldFlagAsUndefined(
      '  SpacedIdentifier  ',
            5,
      symbolTable,
      builtins
    );
    expect(typeof shouldFlag).toBe('boolean');
  });
});

describe('ScopeTracker - Real-World WITH Patterns', () => {
  let tracker: ScopeTracker;
  let symbolTable: SymbolTable;
  let builtins: BuiltinRegistry;

  beforeEach(() => {
    tracker = new ScopeTracker();
    symbolTable = new SymbolTable();
    builtins = new BuiltinRegistry();
  });

  it('should handle WITH Customer DO pattern', () => {
    // WITH Customer DO
    //   VALIDATE("No.");
    //   INSERT;
    // END;

    tracker.enterWith();

    // "No." is a field reference - should not be flagged
    expect(tracker.shouldFlagAsUndefined('No', 5, symbolTable, builtins)).toBe(false);

    // VALIDATE is a record method - should not be flagged
    expect(tracker.shouldFlagAsUndefined('VALIDATE', 5, symbolTable, builtins)).toBe(false);

    // INSERT is a record method - should not be flagged
    expect(tracker.shouldFlagAsUndefined('INSERT', 5, symbolTable, builtins)).toBe(false);

    tracker.exitWith();

    // Outside WITH, unknown field should be flagged
    expect(tracker.shouldFlagAsUndefined('No', 5, symbolTable, builtins)).toBe(true);
  });

  it('should handle nested WITH SalesHeader, SalesLine pattern', () => {
    // WITH SalesHeader DO BEGIN
    //   WITH SalesLine DO BEGIN
    //     Amount := Quantity * "Unit Price";
    //   END;
    // END;

    tracker.enterWith(); // SalesHeader

    // Inside first WITH
    expect(tracker.shouldFlagAsUndefined('Status', 5, symbolTable, builtins)).toBe(false);

    tracker.enterWith(); // SalesLine

    // Inside nested WITH
    expect(tracker.shouldFlagAsUndefined('Quantity', 5, symbolTable, builtins)).toBe(false);
    expect(tracker.shouldFlagAsUndefined('Unit Price', 5, symbolTable, builtins)).toBe(false);
    expect(tracker.shouldFlagAsUndefined('Amount', 5, symbolTable, builtins)).toBe(false);

    tracker.exitWith(); // Exit SalesLine

    // Back in SalesHeader WITH
    expect(tracker.shouldFlagAsUndefined('Document Type', 5, symbolTable, builtins)).toBe(false);

    tracker.exitWith(); // Exit SalesHeader

    // Outside all WITHs
    expect(tracker.shouldFlagAsUndefined('Quantity', 5, symbolTable, builtins)).toBe(true);
  });

  it('should distinguish between builtins and fields inside WITH', () => {
    tracker.enterWith();

    // Builtins should never be flagged
    expect(tracker.shouldFlagAsUndefined('MESSAGE', 5, symbolTable, builtins)).toBe(false);
    expect(tracker.shouldFlagAsUndefined('ERROR', 5, symbolTable, builtins)).toBe(false);
    expect(tracker.shouldFlagAsUndefined('FIND', 5, symbolTable, builtins)).toBe(false);

    // Unknown identifiers (potential fields) should not be flagged inside WITH
    expect(tracker.shouldFlagAsUndefined('CustomField', 5, symbolTable, builtins)).toBe(false);
  });
});
