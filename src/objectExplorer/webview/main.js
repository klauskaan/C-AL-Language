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
  const viewportH = tableWrapper.clientHeight || 600;
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
  filteredObjects = allObjects;

  if (activeTypeFilter) {
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

  selectedIndex = -1;
  renderedStart = -1;
  renderedEnd = -1;
  tableWrapper.scrollTop = 0;
  scheduleRender();
  updateRowCount();
  table.classList.toggle('type-hidden', activeTypeFilter !== null);
}

function updateRowCount() {
  const total = allObjects.length;
  const shown = filteredObjects.length;
  if (total === 0) {
    rowCountEl.textContent = 'No objects loaded';
  } else if (shown === total) {
    rowCountEl.textContent = shown.toLocaleString() + ' objects';
  } else {
    rowCountEl.textContent = 'Showing ' + shown.toLocaleString() + ' of ' + total.toLocaleString() + ' objects \u2014 filtered';
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

// ── Event: refresh button ──────────────────────────────────────────────────
const btnRefresh = document.getElementById('btn-refresh');
if (btnRefresh) {
  btnRefresh.addEventListener('click', () => {
    vscode.postMessage({ type: 'refresh' });
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
      if (allObjects.length > 0) {
        applyFilters();
      }
      break;
  }
});

// ── Initial ────────────────────────────────────────────────────────────────
vscode.postMessage({ type: 'ready' });
