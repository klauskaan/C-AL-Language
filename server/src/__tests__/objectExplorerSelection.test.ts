/**
 * Object Explorer Selection Model Tests
 *
 * Tests for the stateful selection model used by the Object Explorer WebView.
 * Covers single click, shift-click range selection, ctrl-click toggle,
 * keyboard navigation (moveToRow), reset, and input validation.
 *
 * The module is located at src/objectExplorer/webview/selectionModel.js
 * (project root). It is a client-side WebView file tested via Node.js.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const selection = require('../../../src/objectExplorer/webview/selectionModel') as {
  clickRow(idx: number): void;
  shiftClickRow(idx: number): void;
  ctrlClickRow(idx: number): void;
  moveToRow(idx: number): void;
  reset(): void;
  isSelected(idx: number): boolean;
  isCursor(idx: number): boolean;
  selectedIndex: number;
  anchorIndex: number;
  selectedSet: Set<number>;
};

describe('Object Explorer Selection Model', () => {

  // ── clickRow ───────────────────────────────────────────────────────────────

  describe('clickRow', () => {
    beforeEach(() => selection.reset());

    it('should set isSelected(3) to true after clickRow(3)', () => {
      selection.clickRow(3);
      expect(selection.isSelected(3)).toBe(true);
    });

    it('should set isCursor(3) to true after clickRow(3)', () => {
      selection.clickRow(3);
      expect(selection.isCursor(3)).toBe(true);
    });

    it('should set selectedIndex to 3 after clickRow(3)', () => {
      selection.clickRow(3);
      expect(selection.selectedIndex).toBe(3);
    });

    it('should set anchorIndex to 3 after clickRow(3)', () => {
      selection.clickRow(3);
      expect(selection.anchorIndex).toBe(3);
    });

    it('should not select rows other than the clicked one', () => {
      selection.clickRow(3);
      expect(selection.isSelected(0)).toBe(false);
      expect(selection.isSelected(1)).toBe(false);
      expect(selection.isSelected(2)).toBe(false);
      expect(selection.isSelected(4)).toBe(false);
    });

    it('should replace prior selection when clicking a different row', () => {
      selection.clickRow(3);
      selection.clickRow(7);
      expect(selection.isSelected(7)).toBe(true);
      expect(selection.isSelected(3)).toBe(false);
    });

    it('should set selectedIndex to 7 after clicking row 3 then row 7', () => {
      selection.clickRow(3);
      selection.clickRow(7);
      expect(selection.selectedIndex).toBe(7);
    });

    it('should have selectedSet.size === 1 after a plain click', () => {
      selection.clickRow(3);
      expect(selection.selectedSet.size).toBe(1);
    });
  });

  // ── shiftClickRow ──────────────────────────────────────────────────────────

  describe('shiftClickRow (range selection)', () => {
    beforeEach(() => selection.reset());

    it('should select all rows in a forward range (clickRow(2), shiftClickRow(6))', () => {
      selection.clickRow(2);
      selection.shiftClickRow(6);
      expect(selection.isSelected(2)).toBe(true);
      expect(selection.isSelected(3)).toBe(true);
      expect(selection.isSelected(4)).toBe(true);
      expect(selection.isSelected(5)).toBe(true);
      expect(selection.isSelected(6)).toBe(true);
    });

    it('should set selectedIndex to 6 after forward shift-click to 6', () => {
      selection.clickRow(2);
      selection.shiftClickRow(6);
      expect(selection.selectedIndex).toBe(6);
    });

    it('should keep anchorIndex at 2 after forward shift-click to 6', () => {
      selection.clickRow(2);
      selection.shiftClickRow(6);
      expect(selection.anchorIndex).toBe(2);
    });

    it('should select all rows in a backward range (clickRow(8), shiftClickRow(4))', () => {
      selection.clickRow(8);
      selection.shiftClickRow(4);
      expect(selection.isSelected(4)).toBe(true);
      expect(selection.isSelected(5)).toBe(true);
      expect(selection.isSelected(6)).toBe(true);
      expect(selection.isSelected(7)).toBe(true);
      expect(selection.isSelected(8)).toBe(true);
    });

    it('should set selectedIndex to 4 after backward shift-click to 4', () => {
      selection.clickRow(8);
      selection.shiftClickRow(4);
      expect(selection.selectedIndex).toBe(4);
    });

    it('should keep anchorIndex at 8 after backward shift-click to 4', () => {
      selection.clickRow(8);
      selection.shiftClickRow(4);
      expect(selection.anchorIndex).toBe(8);
    });

    it('should rebuild range from anchor when shift-clicked twice (re-shift replaces range)', () => {
      // anchor stays at 5; second shift-click to 3 replaces range with {3..5}
      selection.clickRow(5);
      selection.shiftClickRow(8);
      selection.shiftClickRow(3);
      expect(selection.isSelected(3)).toBe(true);
      expect(selection.isSelected(4)).toBe(true);
      expect(selection.isSelected(5)).toBe(true);
      // previous range {6,7,8} is gone — replaced, not unioned
      expect(selection.isSelected(6)).toBe(false);
      expect(selection.isSelected(7)).toBe(false);
      expect(selection.isSelected(8)).toBe(false);
    });

    it('should keep anchorIndex at 5 after re-shift', () => {
      selection.clickRow(5);
      selection.shiftClickRow(8);
      selection.shiftClickRow(3);
      expect(selection.anchorIndex).toBe(5);
    });

    it('should behave like clickRow when there is no anchor (reset then shiftClickRow(5))', () => {
      selection.reset();
      selection.shiftClickRow(5);
      expect(selection.isSelected(5)).toBe(true);
      expect(selection.selectedSet.size).toBe(1);
    });

    it('should select only the clicked row when anchor and target are the same row', () => {
      selection.clickRow(5);
      selection.shiftClickRow(5);
      expect(selection.isSelected(5)).toBe(true);
      expect(selection.selectedSet.size).toBe(1);
    });
  });

  // ── ctrlClickRow ───────────────────────────────────────────────────────────

  describe('ctrlClickRow (toggle)', () => {
    beforeEach(() => selection.reset());

    it('should add row 5 to selection without removing row 2 (clickRow(2), ctrlClickRow(5))', () => {
      selection.clickRow(2);
      selection.ctrlClickRow(5);
      expect(selection.isSelected(2)).toBe(true);
      expect(selection.isSelected(5)).toBe(true);
    });

    it('should set isCursor(5) to true after ctrlClickRow(5)', () => {
      selection.clickRow(2);
      selection.ctrlClickRow(5);
      expect(selection.isCursor(5)).toBe(true);
    });

    it('should remove row 2 when ctrl-clicked again (deselect via toggle)', () => {
      selection.clickRow(2);
      selection.ctrlClickRow(5);
      selection.ctrlClickRow(2);
      expect(selection.isSelected(2)).toBe(false);
      expect(selection.isSelected(5)).toBe(true);
    });

    it('should deselect the last remaining row leaving selectedSet empty', () => {
      selection.clickRow(3);
      selection.ctrlClickRow(3);
      expect(selection.isSelected(3)).toBe(false);
      expect(selection.selectedSet.size).toBe(0);
    });

    it('should keep selectedIndex on the deselected row (cursor stays)', () => {
      selection.clickRow(3);
      selection.ctrlClickRow(3);
      expect(selection.selectedIndex).toBe(3);
    });

    it('should keep isCursor(3) true after deselecting the only row', () => {
      selection.clickRow(3);
      selection.ctrlClickRow(3);
      expect(selection.isCursor(3)).toBe(true);
    });

    it('should update anchorIndex to the ctrl-clicked row', () => {
      selection.clickRow(2);
      selection.ctrlClickRow(5);
      expect(selection.anchorIndex).toBe(5);
    });
  });

  // ── moveToRow ──────────────────────────────────────────────────────────────

  describe('moveToRow (keyboard navigation)', () => {
    beforeEach(() => selection.reset());

    it('should clear prior multi-selection and set only the target row', () => {
      selection.clickRow(2);
      selection.ctrlClickRow(5);
      selection.moveToRow(6);
      expect(selection.selectedSet.size).toBe(1);
      expect(selection.isSelected(6)).toBe(true);
      expect(selection.isSelected(2)).toBe(false);
      expect(selection.isSelected(5)).toBe(false);
    });

    it('should set isCursor(6) to true after moveToRow(6)', () => {
      selection.clickRow(2);
      selection.moveToRow(6);
      expect(selection.isCursor(6)).toBe(true);
    });

    it('should set anchorIndex to 6 after moveToRow(6)', () => {
      selection.clickRow(2);
      selection.moveToRow(6);
      expect(selection.anchorIndex).toBe(6);
    });

    it('should set selectedIndex to 6 after moveToRow(6)', () => {
      selection.clickRow(2);
      selection.moveToRow(6);
      expect(selection.selectedIndex).toBe(6);
    });
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  describe('reset', () => {
    beforeEach(() => selection.reset());

    it('should set selectedIndex to -1', () => {
      selection.clickRow(3);
      selection.reset();
      expect(selection.selectedIndex).toBe(-1);
    });

    it('should set anchorIndex to -1', () => {
      selection.clickRow(3);
      selection.reset();
      expect(selection.anchorIndex).toBe(-1);
    });

    it('should clear isSelected for a previously selected row', () => {
      selection.clickRow(3);
      selection.reset();
      expect(selection.isSelected(3)).toBe(false);
    });

    it('should leave selectedSet empty', () => {
      selection.clickRow(3);
      selection.reset();
      expect(selection.selectedSet.size).toBe(0);
    });

    it('should set isCursor(3) to false after reset', () => {
      selection.clickRow(3);
      selection.reset();
      expect(selection.isCursor(3)).toBe(false);
    });
  });

  // ── isSelected / isCursor initial state ───────────────────────────────────

  describe('isSelected and isCursor initial state', () => {
    beforeEach(() => selection.reset());

    it('should return false for isSelected(0) before any action', () => {
      expect(selection.isSelected(0)).toBe(false);
    });

    it('should return false for isSelected(5) before any action', () => {
      expect(selection.isSelected(5)).toBe(false);
    });

    it('should return false for isCursor(0) in initial state', () => {
      expect(selection.isCursor(0)).toBe(false);
    });

    it('should have selectedIndex === -1 in initial state', () => {
      expect(selection.selectedIndex).toBe(-1);
    });

    it('should have anchorIndex === -1 in initial state', () => {
      expect(selection.anchorIndex).toBe(-1);
    });
  });

  // ── selectedIndex and anchorIndex as readable properties ──────────────────

  describe('selectedIndex and anchorIndex readable properties', () => {
    beforeEach(() => selection.reset());

    it('should expose selectedIndex === -1 initially', () => {
      expect(selection.selectedIndex).toBe(-1);
    });

    it('should expose anchorIndex === -1 initially', () => {
      expect(selection.anchorIndex).toBe(-1);
    });

    it('should expose selectedIndex === 5 after clickRow(5)', () => {
      selection.clickRow(5);
      expect(selection.selectedIndex).toBe(5);
    });

    it('should expose anchorIndex === 5 after clickRow(5)', () => {
      selection.clickRow(5);
      expect(selection.anchorIndex).toBe(5);
    });
  });

  // ── Input validation (invalid indices — no-op) ────────────────────────────

  describe('input validation — invalid indices are ignored (no-op)', () => {
    beforeEach(() => selection.reset());

    it('should leave state unchanged when clickRow receives NaN', () => {
      selection.clickRow(NaN);
      expect(selection.selectedIndex).toBe(-1);
      expect(selection.selectedSet.size).toBe(0);
    });

    it('should leave state unchanged when clickRow receives -1', () => {
      selection.clickRow(-1);
      expect(selection.selectedIndex).toBe(-1);
      expect(selection.selectedSet.size).toBe(0);
    });

    it('should leave state unchanged when clickRow receives a non-integer (1.5)', () => {
      selection.clickRow(1.5);
      expect(selection.selectedIndex).toBe(-1);
      expect(selection.selectedSet.size).toBe(0);
    });

    it('should leave state unchanged when shiftClickRow receives NaN after a valid clickRow', () => {
      selection.clickRow(3);
      selection.shiftClickRow(NaN);
      expect(selection.isSelected(3)).toBe(true);
      expect(selection.selectedSet.size).toBe(1);
    });

    it('should leave state unchanged when ctrlClickRow receives -1 after a valid clickRow', () => {
      selection.clickRow(3);
      selection.ctrlClickRow(-1);
      expect(selection.isSelected(3)).toBe(true);
      expect(selection.selectedSet.size).toBe(1);
    });

    it('should leave state unchanged when moveToRow receives NaN', () => {
      selection.clickRow(3);
      selection.moveToRow(NaN);
      expect(selection.isSelected(3)).toBe(true);
      expect(selection.selectedIndex).toBe(3);
    });
  });

});
