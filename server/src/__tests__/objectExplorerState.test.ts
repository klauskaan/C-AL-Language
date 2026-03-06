/**
 * Object Explorer State Manager Tests
 *
 * Tests for the extracted state management module used by the Object Explorer
 * WebView. This module is a client-side WebView file tested via Node.js.
 *
 * The module is located at src/objectExplorer/webview/stateManager.js
 * (project root) and does not exist yet — these tests drive the TDD
 * implementation.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const stateManager = require('../../../src/objectExplorer/webview/stateManager') as {
  DEFAULT_COLUMN_WIDTHS: Record<string, number>;
  MIN_COLUMN_WIDTH: number;
  validateColumnWidths(
    incoming: unknown,
    current: Record<string, number>,
    defaults: Record<string, number>,
    minWidth: number
  ): Record<string, number>;
  buildSaveStateMessage(state: {
    typeFilter: string | null;
    sortColumn: string | null;
    sortDir: string;
    columnWidths: Record<string, number>;
  }): {
    type: string;
    typeFilter: string | null;
    sortColumn: string | null;
    sortDir: string;
    columnWidths: Record<string, number>;
  };
};

const { DEFAULT_COLUMN_WIDTHS, MIN_COLUMN_WIDTH, validateColumnWidths, buildSaveStateMessage } = stateManager;

describe('Object Explorer State Manager', () => {

  // ── Constants ─────────────────────────────────────────────────────────────

  describe('DEFAULT_COLUMN_WIDTHS', () => {
    it('should have exactly the expected keys: type, id, name, date, time, mod, version', () => {
      const keys = Object.keys(DEFAULT_COLUMN_WIDTHS).sort();
      expect(keys).toEqual(['date', 'id', 'mod', 'name', 'time', 'type', 'version']);
    });

    it('should have correct values for all columns', () => {
      expect(DEFAULT_COLUMN_WIDTHS).toEqual({
        type: 90,
        id: 60,
        name: 250,
        date: 80,
        time: 80,
        mod: 80,
        version: 200,
      });
    });
  });

  describe('MIN_COLUMN_WIDTH', () => {
    it('should equal 20', () => {
      expect(MIN_COLUMN_WIDTH).toBe(20);
    });
  });

  // ── validateColumnWidths ──────────────────────────────────────────────────

  describe('validateColumnWidths', () => {
    const defaults = { type: 90, id: 60, name: 250, date: 80, time: 80, mod: 80, version: 200 };
    const current =  { type: 90, id: 60, name: 250, date: 80, time: 80, mod: 80, version: 200 };
    const minWidth = 20;

    it('should accept all valid incoming widths and return them in the result', () => {
      const incoming = { type: 100, id: 70, name: 300, date: 90, time: 90, mod: 90, version: 220 };
      const result = validateColumnWidths(incoming, current, defaults, minWidth);
      expect(result).toEqual(incoming);
    });

    it('should update valid keys and retain current values for missing keys', () => {
      const incoming = { type: 120, name: 300 };
      const result = validateColumnWidths(incoming, current, defaults, minWidth);
      expect(result.type).toBe(120);
      expect(result.name).toBe(300);
      expect(result.id).toBe(current.id);
      expect(result.date).toBe(current.date);
      expect(result.time).toBe(current.time);
      expect(result.mod).toBe(current.mod);
      expect(result.version).toBe(current.version);
    });

    it('should accept a width exactly at MIN_COLUMN_WIDTH (20)', () => {
      const incoming = { type: 20 };
      const result = validateColumnWidths(incoming, current, defaults, minWidth);
      expect(result.type).toBe(20);
    });

    it('should reject a width below MIN_COLUMN_WIDTH and retain the current value', () => {
      const incoming = { type: 10 };
      const result = validateColumnWidths(incoming, current, defaults, minWidth);
      expect(result.type).toBe(current.type);
    });

    it('should reject a string value for a key and retain the current value', () => {
      const incoming = { type: 'wide' } as unknown as Record<string, number>;
      const result = validateColumnWidths(incoming, current, defaults, minWidth);
      expect(result.type).toBe(current.type);
    });

    it('should reject a null value for a key and retain the current value', () => {
      const incoming = { type: null } as unknown as Record<string, number>;
      const result = validateColumnWidths(incoming, current, defaults, minWidth);
      expect(result.type).toBe(current.type);
    });

    it('should reject an undefined value for a key and retain the current value', () => {
      const incoming = { type: undefined } as unknown as Record<string, number>;
      const result = validateColumnWidths(incoming, current, defaults, minWidth);
      expect(result.type).toBe(current.type);
    });

    it('should ignore extra keys in incoming that are not in defaults', () => {
      const incoming = { type: 100, unknownColumn: 999 } as unknown as Record<string, number>;
      const result = validateColumnWidths(incoming, current, defaults, minWidth);
      expect(Object.prototype.hasOwnProperty.call(result, 'unknownColumn')).toBe(false);
    });

    it('should return a new object (not mutate current)', () => {
      const currentCopy = { ...current };
      const incoming = { type: 110 };
      const result = validateColumnWidths(incoming, currentCopy, defaults, minWidth);
      expect(result).not.toBe(currentCopy);
      expect(currentCopy.type).toBe(current.type);
    });

    it('should return a new object (not return the incoming reference)', () => {
      const incoming = { type: 90, id: 60, name: 250, date: 80, time: 80, mod: 80, version: 200 };
      const result = validateColumnWidths(incoming, current, defaults, minWidth);
      expect(result).not.toBe(incoming);
    });

    it('should return a copy of current when incoming is null (no crash)', () => {
      const result = validateColumnWidths(null, current, defaults, minWidth);
      expect(result).toEqual(current);
      expect(result).not.toBe(current);
    });

    it('should return a copy of current when incoming is a non-object string (no crash)', () => {
      const result = validateColumnWidths('bad', current, defaults, minWidth);
      expect(result).toEqual(current);
      expect(result).not.toBe(current);
    });
  });

  // ── buildSaveStateMessage ─────────────────────────────────────────────────

  describe('buildSaveStateMessage', () => {
    const baseState = {
      typeFilter: 'Table' as string | null,
      sortColumn: 'name' as string | null,
      sortDir: 'asc',
      columnWidths: { type: 90, id: 60, name: 250, date: 80, time: 80, mod: 80, version: 200 },
    };

    it('should return an object with type equal to "saveState"', () => {
      const result = buildSaveStateMessage(baseState);
      expect(result.type).toBe('saveState');
    });

    it('should include typeFilter from input state in the result', () => {
      const result = buildSaveStateMessage(baseState);
      expect(result.typeFilter).toBe('Table');
    });

    it('should include sortColumn from input state in the result', () => {
      const result = buildSaveStateMessage(baseState);
      expect(result.sortColumn).toBe('name');
    });

    it('should include sortDir from input state in the result', () => {
      const result = buildSaveStateMessage(baseState);
      expect(result.sortDir).toBe('asc');
    });

    it('should return a shallow copy of columnWidths (not the same reference)', () => {
      const result = buildSaveStateMessage(baseState);
      expect(result.columnWidths).not.toBe(baseState.columnWidths);
    });

    it('should return columnWidths with the same values as the input state', () => {
      const result = buildSaveStateMessage(baseState);
      expect(result.columnWidths).toEqual(baseState.columnWidths);
    });

    it('should handle null typeFilter without error', () => {
      const state = { ...baseState, typeFilter: null };
      const result = buildSaveStateMessage(state);
      expect(result.typeFilter).toBeNull();
    });

    it('should handle null sortColumn without error', () => {
      const state = { ...baseState, sortColumn: null };
      const result = buildSaveStateMessage(state);
      expect(result.sortColumn).toBeNull();
    });

    it('should pass through "desc" sortDir correctly', () => {
      const state = { ...baseState, sortDir: 'desc' };
      const result = buildSaveStateMessage(state);
      expect(result.sortDir).toBe('desc');
    });

    it('should pass through an arbitrary sortDir value correctly', () => {
      const state = { ...baseState, sortDir: 'asc' };
      const result = buildSaveStateMessage({ ...state, sortDir: 'asc' });
      expect(result.sortDir).toBe('asc');
    });
  });

});
