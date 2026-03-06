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

// ── State ──

/** @type {ObjectMetadata[]} */
let allObjects = [];

/** @type {ObjectMetadata[]} */
let filteredObjects = [];

/** @type {string | null} Active type filter. null means "All" (no type filter). */
let activeType = null;

// ── DOM References ──

const objectList = /** @type {HTMLTableSectionElement} */ (document.getElementById('object-list'));
const table = /** @type {HTMLTableElement} */ (objectList.closest('table'));
const rowCountEl = /** @type {HTMLSpanElement} */ (document.getElementById('row-count'));
const typeBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.type-btn'));

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

// ── Rendering ──

/**
 * Render filteredObjects into the table body using innerHTML for performance.
 */
function renderTable() {
  const parts = [];
  for (const obj of filteredObjects) {
    parts.push(
      `<tr data-uri="${esc(obj.uri)}" data-line="${obj.line}">` +
      `<td class="col-cursor"></td>` +
      `<td class="col-mark"></td>` +
      `<td class="col-type">${esc(obj.type)}</td>` +
      `<td class="col-id">${esc(String(obj.id))}</td>` +
      `<td class="col-name">${esc(obj.name)}</td>` +
      `<td class="col-date">${esc(obj.date || '')}</td>` +
      `<td class="col-time">${esc(obj.time || '')}</td>` +
      `<td class="col-mod">${obj.modified ? 'Yes' : ''}</td>` +
      `<td class="col-version">${esc(obj.versionList || '')}</td>` +
      `</tr>`
    );
  }
  objectList.innerHTML = parts.join('');
  updateRowCount();
}

/**
 * Update the footer row count display.
 */
function updateRowCount() {
  const total = allObjects.length;
  const shown = filteredObjects.length;
  if (total === 0) {
    rowCountEl.textContent = 'No objects loaded';
    return;
  }
  const suffix = shown < total ? ' \u2014 filtered' : '';
  rowCountEl.textContent = `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} objects${suffix}`;
}

// ── Filtering ──

/**
 * Apply all active filters to allObjects, producing filteredObjects, then re-render.
 * This is the single composable filter point — future filters (name search, column
 * filters) extend here with AND logic.
 */
function applyFilters() {
  filteredObjects = activeType
    ? allObjects.filter(obj => obj.type === activeType)
    : allObjects;
  renderTable();
  table.classList.toggle('type-hidden', activeType !== null);
}

// ── Type Filter ──

/**
 * Set the active type filter, update button states, and re-apply filters.
 * @param {string | null} type - Type string to activate, or null for "All" (no filter).
 */
function setActiveType(type) {
  activeType = type;
  typeBtns.forEach(btn => {
    const isAll = btn.dataset.type === 'All';
    const isActive = isAll ? type === null : btn.dataset.type === type;
    btn.classList.toggle('active', isActive);
  });
  applyFilters();
}

// Initialize: "All" is active by default on load.
setActiveType(null);

// Attach click handlers to type buttons.
typeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    if (type === 'All' || type === activeType) {
      // "All" always clears filter; clicking the active type toggles it off.
      setActiveType(null);
    } else {
      setActiveType(type || null);
    }
  });
});

// ── Message Handling ──

window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.type) {
    case 'data':
      allObjects = message.objects || [];
      applyFilters();
      break;
    case 'loading':
      // Will show/hide loading indicator in future issues
      break;
    case 'restoreState':
      if (message.state && message.state.activeType !== undefined) {
        setActiveType(message.state.activeType);
      }
      break;
  }
});

vscode.postMessage({ type: 'ready' });
