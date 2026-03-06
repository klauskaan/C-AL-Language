/**
 * Object Explorer State Manager
 *
 * Manages column width defaults, validation, and save-state message construction.
 * UMD-lite module: works in both Node.js (Jest via require()) and the browser (webview).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(); // Node.js / Jest
  } else {
    root.stateManager = factory(); // Browser / webview
  }
})(typeof self !== 'undefined' ? self : this, function () {

  /** @type {Object.<string, number>} Default column widths matching CSS class defaults */
  var DEFAULT_COLUMN_WIDTHS = Object.freeze({
    type: 90, id: 60, name: 250, date: 80, time: 80, mod: 80, version: 200
  });

  /** @type {number} Minimum column width in pixels */
  var MIN_COLUMN_WIDTH = 20;

  /**
   * Validate and merge incoming column widths against current widths.
   * Returns a new object — never mutates current or incoming.
   *
   * @param {Object.<string, number>|null|undefined} incoming  Widths from persisted state
   * @param {Object.<string, number>} current                  Current live widths
   * @param {Object.<string, number>} defaults                 Default widths (keys are authoritative)
   * @param {number} minWidth                                   Minimum allowed width
   * @returns {Object.<string, number>}
   */
  function validateColumnWidths(incoming, current, defaults, minWidth) {
    if (incoming === null || incoming === undefined || typeof incoming !== 'object') {
      return Object.assign({}, current);
    }
    var result = {};
    var keys = Object.keys(defaults);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (typeof incoming[key] === 'number' && incoming[key] >= minWidth) {
        result[key] = incoming[key];
      } else {
        result[key] = current[key];
      }
    }
    return result;
  }

  /**
   * Build the saveState message object from the current UI state.
   * columnWidths is shallow-copied to prevent external mutation.
   *
   * @param {{ typeFilter: string|null, sortColumn: string|null, sortDir: string, columnWidths: Object.<string, number> }} state
   * @returns {{ type: string, typeFilter: string|null, sortColumn: string|null, sortDir: string, columnWidths: Object.<string, number> }}
   */
  function buildSaveStateMessage(state) {
    return {
      type: 'saveState',
      typeFilter: state.typeFilter,
      sortColumn: state.sortColumn,
      sortDir: state.sortDir,
      columnWidths: Object.assign({}, state.columnWidths)
    };
  }

  return {
    DEFAULT_COLUMN_WIDTHS: DEFAULT_COLUMN_WIDTHS,
    MIN_COLUMN_WIDTH: MIN_COLUMN_WIDTH,
    validateColumnWidths: validateColumnWidths,
    buildSaveStateMessage: buildSaveStateMessage
  };
});
