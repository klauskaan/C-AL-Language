// @ts-check

// eslint-disable-next-line no-undef
// @ts-ignore -- acquireVsCodeApi is injected by VS Code into the webview runtime
const vscode = acquireVsCodeApi();

// ── Type Definitions ──

/**
 * @typedef {Object} ObjectMetadata
 * @property {string} type
 * @property {number} id
 * @property {string} name
 * @property {string} uri
 * @property {number} line
 * @property {string} [date]
 * @property {string} [time]
 * @property {boolean} [modified]
 * @property {string} [versionList]
 */

// ── Constants ──────────────────────────────────────────────────────────────
const BUFFER_ROWS = 20;
const COLUMN_COUNT = 9;

// ── State ──────────────────────────────────────────────────────────────────
/** @type {ObjectMetadata[]} */
let allObjects = [];
/** @type {ObjectMetadata[]} */
let filteredObjects = [];
let ROW_HEIGHT = 40;
let activeTypeFilter = /** @type {string|null} */ (null);
let searchText = '';
let selectedIndex = -1;
let renderedStart = -1;
let renderedEnd = -1;
/** @type {Set<string>} */
const markedObjects = new Set();
let markedOnly = false;
/** @type {string|null} */
let sortColumn = null; // null = default sort (Type asc, then ID asc)
/** @type {'asc'|'desc'} */
let sortDir = 'asc';
/** @type {Object.<string, number>} Default column widths matching CSS class defaults */
const DEFAULT_COLUMN_WIDTHS = { type: 90, id: 60, name: 250, date: 80, time: 80, mod: 80, version: 200 };
/** @type {number} Minimum column width in pixels */
const MIN_COLUMN_WIDTH = 20;
/** @type {Object.<string, number>} Current column widths (content-box px) */
let columnWidths = Object.assign({}, DEFAULT_COLUMN_WIDTHS);

// ── DOM refs ───────────────────────────────────────────────────────────────
const tableWrapper = /** @type {HTMLElement} */ (document.getElementById('table-wrapper'));
const tbody = /** @type {HTMLElement} */ (document.getElementById('object-list'));
const table = /** @type {HTMLTableElement} */ (tbody.closest('table'));
const rowCountEl = /** @type {HTMLElement} */ (document.getElementById('row-count'));
const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('search-input'));

// ── Filter engine ──────────────────────────────────────────────────────────
/** @type {{ matchesFilter: function(string|number|boolean, string): boolean }} */
// @ts-ignore -- injected by filterEngine.js <script> tag
const filterEngine = /** @type {any} */ (/** @type {any} */ (window).filterEngine) || { matchesFilter: () => true };
const matchesFilter = filterEngine.matchesFilter.bind(filterEngine);

// ── Column filter state ─────────────────────────────────────────────────────

/**
 * Maps filter-row td CSS class to ObjectMetadata field and type metadata.
 * @type {Object.<string, {field: string, isBoolean: boolean, isNumeric: boolean}>}
 */
const CLASS_TO_FIELD = {
  'col-type':    { field: 'type',        isBoolean: false, isNumeric: false },
  'col-id':      { field: 'id',          isBoolean: false, isNumeric: true  },
  'col-name':    { field: 'name',        isBoolean: false, isNumeric: false },
  'col-date':    { field: 'date',        isBoolean: false, isNumeric: false },
  'col-time':    { field: 'time',        isBoolean: false, isNumeric: false },
  'col-mod':     { field: 'modified',    isBoolean: true,  isNumeric: false },
  'col-version': { field: 'versionList', isBoolean: false, isNumeric: false }
};

/**
 * Sort configuration for each column key.
 * type: 'string-ci' = case-insensitive string, 'numeric', 'boolean', 'string-raw'
 * @type {Object.<string, {field: string, type: string}>}
 */
const SORT_CONFIG = {
  'type':        { field: 'type',        type: 'string-ci'  },
  'id':          { field: 'id',          type: 'numeric'    },
  'name':        { field: 'name',        type: 'string-ci'  },
  'date':        { field: 'date',        type: 'string-raw' },
  'time':        { field: 'time',        type: 'string-raw' },
  'modified':    { field: 'modified',    type: 'boolean'    },
  'versionList': { field: 'versionList', type: 'string-ci'  }
};

/**
 * Compare two ObjectMetadata values by the given sort config entry.
 * @param {ObjectMetadata} a
 * @param {ObjectMetadata} b
 * @param {{field: string, type: string}} cfg
 * @returns {number}
 */
function compareByConfig(a, b, cfg) {
  const av = /** @type {any} */ (a)[cfg.field];
  const bv = /** @type {any} */ (b)[cfg.field];
  if (cfg.type === 'numeric') {
    return (av || 0) - (bv || 0);
  }
  if (cfg.type === 'boolean') {
    // false (unmodified) before true (modified)
    return (av ? 1 : 0) - (bv ? 1 : 0);
  }
  if (cfg.type === 'string-ci') {
    return (av || '').toLowerCase().localeCompare((bv || '').toLowerCase());
  }
  // string-raw
  return (av || '') < (bv || '') ? -1 : (av || '') > (bv || '') ? 1 : 0;
}

/**
 * Sort an array of ObjectMetadata in-place using current sort state.
 * @param {ObjectMetadata[]} arr
 */
function sortObjects(arr) {
  if (sortColumn === null) {
    // Default: Type ascending, then ID ascending
    arr.sort((a, b) => {
      const typeDiff = compareByConfig(a, b, SORT_CONFIG['type']);
      if (typeDiff !== 0) return typeDiff;
      return compareByConfig(a, b, SORT_CONFIG['id']);
    });
  } else {
    const cfg = SORT_CONFIG[sortColumn];
    if (!cfg) return;
    const mul = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => compareByConfig(a, b, cfg) * mul);
  }
}

/**
 * Update sort arrow indicators on column header elements.
 */
function updateSortIndicators() {
  document.querySelectorAll('thead th[data-sort]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    const indicator = th.querySelector('.sort-indicator');
    if (indicator) indicator.textContent = '';
  });

  if (sortColumn === null) return;

  const activeTh = document.querySelector(`thead th[data-sort="${sortColumn}"]`);
  if (!activeTh) return;
  activeTh.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  const indicator = activeTh.querySelector('.sort-indicator');
  if (indicator) indicator.textContent = sortDir === 'asc' ? '\u2191' : '\u2193';
}

/**
 * Apply current columnWidths to the header <th> elements.
 * With table-layout: fixed, setting width on <th> controls the entire column.
 */
function applyColumnWidths() {
  const headerRow = document.querySelector('thead tr:first-child');
  if (!headerRow) return;
  headerRow.querySelectorAll('th').forEach(th => {
    const colClass = Array.from(th.classList).find(c => c.startsWith('col-'));
    if (!colClass) return;
    const key = colClass.replace('col-', '');
    if (columnWidths[key] !== undefined) {
      th.style.width = columnWidths[key] + 'px';
    }
  });
}

/**
 * Send current UI state to the extension for persistence (#729).
 * Called after resize end and after reset layout.
 */
function sendSaveState() {
  vscode.postMessage({
    type: 'saveState',
    typeFilter: activeTypeFilter,
    sortColumn: sortColumn,
    sortDir: sortDir,
    columnWidths: Object.assign({}, columnWidths)
  });
}

// ── Column resize handles ─────────────────────────────────────────────────

/**
 * Create resize handles on resizable column headers.
 * Cursor and mark columns are not resizable.
 */
function initResizeHandles() {
  const headerRow = document.querySelector('thead tr:first-child');
  if (!headerRow) return;
  headerRow.querySelectorAll('th').forEach(th => {
    const colClass = Array.from(th.classList).find(c => c.startsWith('col-'));
    if (!colClass) return;
    const key = colClass.replace('col-', '');
    if (key === 'cursor' || key === 'mark') return;
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startResize(e, th, key);
    });
    // Prevent click on handle from bubbling to <th> sort handler
    handle.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    th.appendChild(handle);
  });
}

/**
 * @param {MouseEvent} startEvent
 * @param {HTMLElement} th
 * @param {string} key - column key matching DEFAULT_COLUMN_WIDTHS
 */
function startResize(startEvent, th, key) {
  const startX = startEvent.clientX;
  const startWidth = columnWidths[key]; // Use stored state (content-box px), not DOM measurement

  /** @param {MouseEvent} e */
  function onMouseMove(e) {
    const delta = e.clientX - startX;
    const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + delta);
    columnWidths[key] = newWidth;
    th.style.width = newWidth + 'px';
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    sendSaveState();
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

/**
 * @typedef {{ input: HTMLInputElement, td: HTMLElement, field: string, isBoolean: boolean, isNumeric: boolean }} FilterInput
 */

/** @type {FilterInput[]} */
const filterInputs = [];
document.querySelectorAll('.filter-row td input').forEach(input => {
  const td = /** @type {HTMLElement} */ (/** @type {HTMLElement} */ (input).parentElement);
  if (!td) return;
  const colClass = Array.from(td.classList).find(c => Object.prototype.hasOwnProperty.call(CLASS_TO_FIELD, c));
  if (!colClass) return;
  const meta = CLASS_TO_FIELD[colClass];
  filterInputs.push({ input: /** @type {HTMLInputElement} */ (input), td, ...meta });
});

// ── Helpers ──

/**
 * Escape a value for safe insertion into HTML text content or double-quoted attributes.
 * @param {string} str
 * @returns {string}
 */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Unique key for an object, used as the mark state identifier.
 * @param {ObjectMetadata} obj
 * @returns {string}
 */
function objectKey(obj) {
  return obj.type + '-' + obj.id;
}

// ── Virtual scroll spacers ─────────────────────────────────────────────────
const spacerTop = document.createElement('tr');
spacerTop.className = 'virtual-spacer';
const spacerTopCell = document.createElement('td');
spacerTopCell.setAttribute('colspan', String(COLUMN_COUNT));
spacerTop.appendChild(spacerTopCell);

const spacerBottom = document.createElement('tr');
spacerBottom.className = 'virtual-spacer';
const spacerBottomCell = document.createElement('td');
spacerBottomCell.setAttribute('colspan', String(COLUMN_COUNT));
spacerBottom.appendChild(spacerBottomCell);

tbody.appendChild(spacerTop);
tbody.appendChild(spacerBottom);

// ── Rendering ──────────────────────────────────────────────────────────────
let rafPending = false;

function scheduleRender() {
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      updateVirtualList();
    });
  }
}

function updateVirtualList() {
  const scrollTop = tableWrapper.scrollTop;
  const viewportH = (tableWrapper.clientHeight || 600) - getHeaderHeight();
  const total = filteredObjects.length;

  const visStart = Math.floor(scrollTop / ROW_HEIGHT);
  const visEnd = Math.ceil((scrollTop + viewportH) / ROW_HEIGHT);
  const start = Math.max(0, visStart - BUFFER_ROWS);
  const end = Math.min(total, visEnd + BUFFER_ROWS);

  if (start === renderedStart && end === renderedEnd) return;

  spacerTop.style.height = (start * ROW_HEIGHT) + 'px';
  spacerBottom.style.height = (Math.max(0, total - end) * ROW_HEIGHT) + 'px';

  // Remove existing data rows between spacers
  let node = spacerTop.nextSibling;
  while (node && node !== spacerBottom) {
    const next = node.nextSibling;
    tbody.removeChild(/** @type {ChildNode} */ (node));
    node = next;
  }

  // Insert new rows
  const frag = document.createDocumentFragment();
  for (let i = start; i < end; i++) {
    frag.appendChild(makeRow(filteredObjects[i], i));
  }
  tbody.insertBefore(frag, spacerBottom);

  renderedStart = start;
  renderedEnd = end;
}

function updateMarkAllState() {
  const markAllCb = /** @type {HTMLInputElement|null} */ (document.getElementById('mark-all'));
  if (!markAllCb) return;
  const total = filteredObjects.length;
  if (total === 0) {
    markAllCb.checked = false;
    markAllCb.indeterminate = false;
    return;
  }
  let markedCount = 0;
  for (const obj of filteredObjects) {
    if (markedObjects.has(objectKey(obj))) markedCount++;
  }
  if (markedCount === 0) {
    markAllCb.checked = false;
    markAllCb.indeterminate = false;
  } else if (markedCount === total) {
    markAllCb.checked = true;
    markAllCb.indeterminate = false;
  } else {
    markAllCb.indeterminate = true;
  }
}

/**
 * @param {ObjectMetadata} obj
 * @param {number} index
 * @returns {HTMLTableRowElement}
 */
function makeRow(obj, index) {
  const tr = /** @type {HTMLTableRowElement} */ (document.createElement('tr'));
  tr.dataset.index = String(index);
  if (index === selectedIndex) tr.classList.add('selected');

  // Cursor cell
  const tdCursor = document.createElement('td');
  tdCursor.className = 'col-cursor';
  tr.appendChild(tdCursor);

  // Mark cell
  const tdMark = document.createElement('td');
  tdMark.className = 'col-mark';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = markedObjects.has(objectKey(obj));
  cb.addEventListener('change', function () {
    if (cb.checked) {
      markedObjects.add(objectKey(obj));
    } else {
      markedObjects.delete(objectKey(obj));
    }
    updateMarkAllState();
  });
  tdMark.appendChild(cb);
  tr.appendChild(tdMark);

  appendCell(tr, 'col-type', obj.type || '');
  appendCell(tr, 'col-id', obj.id !== undefined ? String(obj.id) : '');
  appendCell(tr, 'col-name', obj.name || '');
  appendCell(tr, 'col-date', obj.date || '');
  appendCell(tr, 'col-time', obj.time || '');
  appendCell(tr, 'col-mod', obj.modified ? 'Yes' : '');
  appendCell(tr, 'col-version', obj.versionList || '');

  return tr;
}

/**
 * @param {HTMLTableRowElement} tr
 * @param {string} cls
 * @param {string} text
 */
function appendCell(tr, cls, text) {
  const td = document.createElement('td');
  td.className = cls;
  td.textContent = text;
  tr.appendChild(td);
}

// ── Filtering ──────────────────────────────────────────────────────────────
function applyFilters() {
  filteredObjects = allObjects.slice();

  if (!markedOnly && activeTypeFilter) {
    filteredObjects = filteredObjects.filter(obj => obj.type === activeTypeFilter);
  }

  if (searchText) {
    const words = searchText.toLowerCase().split(/\s+/).filter(Boolean);
    filteredObjects = filteredObjects.filter(obj => {
      const name = (obj.name || '').toLowerCase();
      return words.every(w => name.includes(w));
    });
  }

  // Column filters (filter row) — each active cell ANDs with the others
  const activeColumnFilters = filterInputs.filter(f => f.input.value.trim() !== '');
  if (activeColumnFilters.length > 0) {
    filteredObjects = filteredObjects.filter(obj => {
      return activeColumnFilters.every(f => {
        /** @type {string|number|boolean} */
        let fieldVal;
        if (f.isBoolean) {
          // Pass raw boolean; engine normalizes true→"Yes", false→"No".
          // undefined coerced to false: objects without OBJECT-PROPERTIES
          // display blank and match filter "No" — consistent with display.
          fieldVal = !!(/** @type {any} */ (obj)[f.field] ?? false);
        } else if (f.isNumeric) {
          // Pass raw number so engine uses numeric (not lexicographic) comparisons
          fieldVal = /** @type {any} */ (obj)[f.field];
        } else {
          fieldVal = /** @type {any} */ (obj)[f.field] || '';
        }
        return matchesFilter(fieldVal, f.input.value.trim());
      });
    });
  }

  if (markedOnly) {
    filteredObjects = filteredObjects.filter(obj => markedObjects.has(objectKey(obj)));
  }

  sortObjects(filteredObjects);
  selectedIndex = -1;
  renderedStart = -1;
  renderedEnd = -1;
  tableWrapper.scrollTop = 0;
  scheduleRender();
  updateRowCount();
  updateClearButton();
  updateSortIndicators();
  table.classList.toggle('type-hidden', activeTypeFilter !== null && !markedOnly);
  updateMarkAllState();
}

function hasActiveFilters() {
  if (searchInput.value.trim() !== '') return true;
  return filterInputs.some(f => f.input.value.trim() !== '');
}

function updateClearButton() {
  if (btnClearFilters) {
    const hasActive = hasActiveFilters();
    btnClearFilters.classList.toggle('filters-inactive', !hasActive);
    btnClearFilters.setAttribute('aria-disabled', hasActive ? 'false' : 'true');
  }
}

function updateRowCount() {
  const total = allObjects.length;
  const shown = filteredObjects.length;
  const filterSuffix = hasActiveFilters() ? ' \u2014 filtered' : '';
  if (total === 0) {
    rowCountEl.textContent = 'No objects loaded';
  } else if (shown === total) {
    rowCountEl.textContent = shown.toLocaleString() + ' objects' + filterSuffix;
  } else {
    rowCountEl.textContent = 'Showing ' + shown.toLocaleString() + ' of ' + total.toLocaleString() + ' objects' + filterSuffix;
  }
}

// ── Keyboard navigation ─────────────────────────────────────────────────────
function getHeaderHeight() {
  const thead = document.querySelector('thead');
  return thead ? thead.offsetHeight : 56;
}

function scrollToSelectedRow() {
  if (selectedIndex < 0) return;
  const headerH = getHeaderHeight();
  const rowTop = selectedIndex * ROW_HEIGHT;
  const rowBottom = rowTop + ROW_HEIGHT;
  const visTop = tableWrapper.scrollTop + headerH;
  const visBottom = tableWrapper.scrollTop + tableWrapper.clientHeight;

  if (rowTop < visTop) {
    tableWrapper.scrollTop = rowTop - headerH;
  } else if (rowBottom > visBottom) {
    tableWrapper.scrollTop = rowBottom - tableWrapper.clientHeight;
  }
}

document.addEventListener('keydown', (e) => {
  // Global shortcut: Shift+Ctrl+F7 = Clear filters (C/SIDE muscle memory)
  if (e.shiftKey && e.ctrlKey && e.key === 'F7') {
    e.preventDefault();
    if (btnClearFilters) btnClearFilters.click();
    return;
  }

  if (e.target instanceof HTMLInputElement) {
    if (e.key === 'Escape') {
      /** @type {HTMLInputElement} */ (e.target).value = '';
      e.target.dispatchEvent(new Event('input'));
    }
    return;
  }

  const total = filteredObjects.length;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (selectedIndex < total - 1) {
      selectedIndex++;
      scrollToSelectedRow();
      scheduleRender();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (selectedIndex > 0) {
      selectedIndex--;
      scrollToSelectedRow();
      scheduleRender();
    }
  } else if (e.key === 'Enter') {
    if (selectedIndex >= 0 && filteredObjects[selectedIndex]) {
      const obj = filteredObjects[selectedIndex];
      vscode.postMessage({ type: 'navigate', uri: obj.uri, line: obj.line });
    }
  } else if (e.key === 'Home' && e.ctrlKey) {
    e.preventDefault();
    if (total > 0) {
      selectedIndex = 0;
      tableWrapper.scrollTop = 0;
      scheduleRender();
    }
  } else if (e.key === 'End' && e.ctrlKey) {
    e.preventDefault();
    if (total > 0) {
      selectedIndex = total - 1;
      scrollToSelectedRow();
      scheduleRender();
    }
  }
});

// ── Event: row click / double-click (event delegation) ────────────────────
tbody.addEventListener('click', (e) => {
  const tr = /** @type {HTMLElement} */ (e.target instanceof HTMLElement ? e.target.closest('tr') : null);
  if (!tr || tr.classList.contains('virtual-spacer')) return;
  const idx = parseInt(tr.dataset.index || '', 10);
  if (isNaN(idx)) return;
  selectedIndex = idx;
  scheduleRender();
});

tbody.addEventListener('dblclick', (e) => {
  const tr = /** @type {HTMLElement} */ (e.target instanceof HTMLElement ? e.target.closest('tr') : null);
  if (!tr || tr.classList.contains('virtual-spacer')) return;
  const idx = parseInt(tr.dataset.index || '', 10);
  if (isNaN(idx) || !filteredObjects[idx]) return;
  const obj = filteredObjects[idx];
  vscode.postMessage({ type: 'navigate', uri: obj.uri, line: obj.line });
});

// ── Event: scroll ──────────────────────────────────────────────────────────
tableWrapper.addEventListener('scroll', scheduleRender, { passive: true });

// ── Event: resize ──────────────────────────────────────────────────────────
new ResizeObserver(scheduleRender).observe(tableWrapper);

// ── Event: type filter buttons ─────────────────────────────────────────────
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = /** @type {HTMLElement} */ (btn).dataset.type || 'All';
    if (type === 'All') {
      activeTypeFilter = null;
    } else {
      activeTypeFilter = activeTypeFilter === type ? null : type;
    }
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    if (activeTypeFilter === null) {
      const allBtn = document.querySelector('.type-btn-all');
      if (allBtn) allBtn.classList.add('active');
    } else {
      btn.classList.add('active');
    }
    applyFilters();
  });
});

// Set initial active state
const allTypeBtn = document.querySelector('.type-btn-all');
if (allTypeBtn) allTypeBtn.classList.add('active');

// ── Event: column header sort ───────────────────────────────────────────────
document.querySelectorAll('thead th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const col = /** @type {HTMLElement} */ (th).dataset.sort || '';
    if (!col || !SORT_CONFIG[col]) return;
    if (sortColumn === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = col;
      sortDir = 'asc';
    }
    applyFilters();
  });
});

// ── Event: search bar ──────────────────────────────────────────────────────
let searchTimer = 0;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = /** @type {number} */ (/** @type {unknown} */ (setTimeout(() => {
    searchText = searchInput.value;
    applyFilters();
  }, 300)));
});

// ── Event: filter row inputs ────────────────────────────────────────────────
let filterRowTimer = 0;
filterInputs.forEach(f => {
  f.input.addEventListener('input', () => {
    // Update visual highlight immediately
    f.td.classList.toggle('has-filter', f.input.value.trim() !== '');
    // Debounce the actual filtering (150ms — faster than search bar)
    clearTimeout(filterRowTimer);
    filterRowTimer = /** @type {number} */ (/** @type {unknown} */ (setTimeout(applyFilters, 150)));
  });
});

// ── Event: clear filters ───────────────────────────────────────────────────
const btnClearFilters = document.getElementById('btn-clear-filters');
if (btnClearFilters) {
  btnClearFilters.addEventListener('click', () => {
    searchInput.value = '';
    searchText = '';
    filterInputs.forEach(f => {
      f.input.value = '';
      f.td.classList.remove('has-filter');
    });
    applyFilters();
  });
}

// ── Event: mark-all checkbox ───────────────────────────────────────────────
const markAllCb = /** @type {HTMLInputElement|null} */ (document.getElementById('mark-all'));
if (markAllCb) {
  markAllCb.addEventListener('change', function () {
    filteredObjects.forEach(obj => {
      if (markAllCb.checked) {
        markedObjects.add(objectKey(obj));
      } else {
        markedObjects.delete(objectKey(obj));
      }
    });
    applyFilters();
  });
}

// ── Event: marked-only toggle ──────────────────────────────────────────────
const markedOnlyCb = /** @type {HTMLInputElement|null} */ (document.getElementById('marked-only'));
if (markedOnlyCb) {
  markedOnlyCb.addEventListener('change', function () {
    markedOnly = markedOnlyCb.checked;
    applyFilters();
  });
}

// ── Event: refresh button ──────────────────────────────────────────────────
const btnRefresh = document.getElementById('btn-refresh');
if (btnRefresh) {
  btnRefresh.addEventListener('click', () => {
    vscode.postMessage({ type: 'refresh' });
  });
}

// ── Event: reset layout button ────────────────────────────────────────────
const btnResetLayout = document.getElementById('btn-reset-layout');
if (btnResetLayout) {
  btnResetLayout.addEventListener('click', () => {
    columnWidths = Object.assign({}, DEFAULT_COLUMN_WIDTHS);
    applyColumnWidths();
    sortColumn = null;
    sortDir = 'asc';
    if (allObjects.length > 0) {
      applyFilters();
    } else {
      updateSortIndicators();
    }
    vscode.postMessage({ type: 'resetLayout' });
    sendSaveState();
  });
}

// ── Message handler ────────────────────────────────────────────────────────
window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.type) {
    case 'data':
      allObjects = message.objects || [];
      applyFilters();
      break;
    case 'loading':
      if (message.loading && allObjects.length === 0) {
        rowCountEl.textContent = 'Loading\u2026';
      }
      break;
    case 'restoreState':
      if (message.rowHeight && typeof message.rowHeight === 'number') {
        ROW_HEIGHT = message.rowHeight;
      }
      if (message.typeFilter && message.typeFilter !== 'All') {
        activeTypeFilter = message.typeFilter;
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.type-btn[data-type="${message.typeFilter}"]`);
        if (btn) btn.classList.add('active');
      }
      if (message.sortColumn && SORT_CONFIG[message.sortColumn]) {
        sortColumn = message.sortColumn;
        sortDir = message.sortDir === 'desc' ? 'desc' : 'asc';
      }
      if (message.columnWidths && typeof message.columnWidths === 'object') {
        for (const key of Object.keys(DEFAULT_COLUMN_WIDTHS)) {
          if (typeof message.columnWidths[key] === 'number' && message.columnWidths[key] >= MIN_COLUMN_WIDTH) {
            columnWidths[key] = message.columnWidths[key];
          }
        }
        applyColumnWidths();
      }
      if (allObjects.length > 0) {
        applyFilters();
      }
      break;
    case 'resetLayout':
      columnWidths = Object.assign({}, DEFAULT_COLUMN_WIDTHS);
      applyColumnWidths();
      sortColumn = null;
      sortDir = 'asc';
      if (allObjects.length > 0) {
        applyFilters();
      } else {
        updateSortIndicators();
      }
      break;
  }
});

// ── Initial ────────────────────────────────────────────────────────────────
initResizeHandles();
applyColumnWidths();
vscode.postMessage({ type: 'ready' });
updateClearButton();
