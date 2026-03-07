/**
 * Object Explorer Selection Model
 *
 * Manages single-row cursor, multi-row selection (Shift+click range, Ctrl+click toggle),
 * and keyboard navigation state.
 * UMD-lite module: works in both Node.js (Jest via require()) and the browser (webview).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(); // Node.js / Jest
  } else {
    root.selectionModel = factory(); // Browser / webview
  }
})(typeof self !== 'undefined' ? self : this, function () {

  var selectedIndex = -1;
  var anchorIndex = -1;
  /** @type {Set<number>} */
  var selectedSet = new Set();

  /**
   * Guard: returns true if idx is a valid non-negative integer.
   * @param {number} idx
   * @returns {boolean}
   */
  function isValid(idx) {
    return Number.isFinite(idx) && idx >= 0 && idx === Math.floor(idx);
  }

  /**
   * Single click: clear selection, select only idx, set anchor.
   * @param {number} idx
   */
  function clickRow(idx) {
    if (!isValid(idx)) return;
    selectedSet.clear();
    selectedSet.add(idx);
    selectedIndex = idx;
    anchorIndex = idx;
  }

  /**
   * Shift+click: extend range from anchorIndex to idx.
   * If no anchor, behaves like clickRow.
   * @param {number} idx
   */
  function shiftClickRow(idx) {
    if (!isValid(idx)) return;
    if (anchorIndex === -1) {
      clickRow(idx);
      return;
    }
    var lo = Math.min(anchorIndex, idx);
    var hi = Math.max(anchorIndex, idx);
    selectedSet.clear();
    for (var i = lo; i <= hi; i++) {
      selectedSet.add(i);
    }
    selectedIndex = idx;
    // anchorIndex unchanged
  }

  /**
   * Ctrl+click: toggle idx in selection, set cursor and anchor to idx.
   * @param {number} idx
   */
  function ctrlClickRow(idx) {
    if (!isValid(idx)) return;
    if (selectedSet.has(idx)) {
      selectedSet.delete(idx);
    } else {
      selectedSet.add(idx);
    }
    selectedIndex = idx;
    anchorIndex = idx;
  }

  /**
   * Keyboard navigation: clear selection, select only idx, set anchor.
   * @param {number} idx
   */
  function moveToRow(idx) {
    if (!isValid(idx)) return;
    selectedSet.clear();
    selectedSet.add(idx);
    selectedIndex = idx;
    anchorIndex = idx;
  }

  /**
   * Reset all selection state (e.g. after filter change).
   */
  function reset() {
    selectedIndex = -1;
    anchorIndex = -1;
    selectedSet.clear();
  }

  /**
   * Select all rows in a list of `total` items.
   * If total <= 0 or invalid, resets the selection.
   * Sets cursor (selectedIndex) to the last row, anchor to the first.
   * @param {number} total
   */
  function selectAll(total) {
    if (!Number.isFinite(total) || total <= 0) {
      reset();
      return;
    }
    total = Math.floor(total);
    selectedSet.clear();
    for (var i = 0; i < total; i++) {
      selectedSet.add(i);
    }
    selectedIndex = total - 1;
    anchorIndex = 0;
  }

  /**
   * @param {number} idx
   * @returns {boolean}
   */
  function isSelected(idx) {
    return selectedSet.has(idx);
  }

  /**
   * @param {number} idx
   * @returns {boolean}
   */
  function isCursor(idx) {
    return idx === selectedIndex;
  }

  return {
    get selectedIndex() { return selectedIndex; },
    get anchorIndex() { return anchorIndex; },
    get selectedSet() { return new Set(selectedSet); },
    clickRow: clickRow,
    shiftClickRow: shiftClickRow,
    ctrlClickRow: ctrlClickRow,
    moveToRow: moveToRow,
    reset: reset,
    selectAll: selectAll,
    isSelected: isSelected,
    isCursor: isCursor
  };
});
