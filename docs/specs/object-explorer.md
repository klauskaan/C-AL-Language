# Object Explorer — Feature Specification

Working spec for autonomous implementation. Definitive over ROADMAP.md where they conflict.

---

## What It Is

A WebView panel that opens in an editor tab (not a sidebar). Displays all C/AL objects in the workspace in a filterable, sortable table. Lets you find and navigate to any object fast.

Command: `C/AL: Object Explorer`
Keybinding: `Ctrl+Shift+F12`

The editor-tab placement is intentional — it mimics C/SIDE muscle memory where you shuffled between open files and the Object Designer. Do not implement as a sidebar panel or tree view.

The primary design reference is the C/SIDE Object Designer (see screenshot in session). The AL Explorer (Microsoft) and AL Object Designer (Sagi) were also studied but C/SIDE is the UX target.

---

## Scope

### v1

Everything in this spec is v1. Nothing else is in scope.

**Explicitly out of scope for v1:**
- PROCEDURES tab (v2)
- FIELDS tab (v2)
- Keyboard shortcuts for type filter buttons (Alt+T etc.)

---

## Data Model

Each row in the table represents one C/AL object. The data comes from two sources in the file:

### From the object declaration line

```
OBJECT Table 18 Customer
```

| Field | Value | Notes |
|-------|-------|-------|
| `type` | `Table` | One of: Table, Page, Report, Codeunit, XMLport, Query, MenuSuite |
| `id` | `18` | Integer |
| `name` | `Customer` | String, preserving original casing |
| `uri` | — | Absolute file path (for navigation) |

### From OBJECT-PROPERTIES section

```
OBJECT-PROPERTIES
{
  Date=24-03-19;
  Time=12:00:00;
  Modified=Yes;
  Version List=NAVW114.00,NAVDK14.00;
}
```

| Field | Key in file | Type | Notes |
|-------|-------------|------|-------|
| `date` | `Date` | string | Raw value as found, e.g. `24-03-19` |
| `time` | `Time` | string | Raw value as found, e.g. `12:00:00` |
| `modified` | `Modified` | boolean | `Yes` → true, anything else → false |
| `versionList` | `Version List` | string | Raw value, may be empty string |

**All four fields are optional.** OBJECT-PROPERTIES may be absent entirely, or individual keys may be missing. Missing values display as empty cells — not an error.

### Object type for files with multiple objects

A single `.cal` or `.txt` file may contain more than one OBJECT block. Each object is a separate row. The `uri` for each row is the same file path; navigation jumps to the start of that specific object's declaration line within the file.

---

## Required Parser Change

**Current state:** `skipObjectPropertiesSection()` at `server/src/parser/parser.ts:596` discards the entire OBJECT-PROPERTIES block.

**Required change:** Parse OBJECT-PROPERTIES into the AST and expose it on `ObjectDeclaration`.

### What to add to the AST

Add an optional field to `ObjectDeclaration`:

```typescript
objectProperties?: ObjectProperties;
```

Where:

```typescript
interface ObjectProperties {
  date?: string;        // raw value of Date key, e.g. "24-03-19"
  time?: string;        // raw value of Time key, e.g. "12:00:00"
  modified?: boolean;   // true if Modified=Yes
  versionList?: string; // raw value of Version List key, empty string if key present but blank
}
```

### Parsing rules

- The section is a flat list of `Key=Value;` pairs inside `{ }`.
- Keys are case-insensitive for matching (`date`, `Date`, `DATE` all match).
- Extract `Date`, `Time`, `Modified`, and `Version List`. All other keys are read and discarded.
- `Version List` is two tokens (`Version` and `List`) — handle the space in the key name.
- If parsing fails on a particular key-value pair, skip that pair and continue. Do not fail the whole object parse.
- The section is always at the top of the object body, before PROPERTIES. If it is absent, `objectProperties` is `undefined`.

### Existing parsing infrastructure

`parsePropertySection()` at `server/src/parser/parser.ts:616` handles the general `PROPERTIES { }` pattern including `parseWithRecovery`. The OBJECT-PROPERTIES parser can follow the same pattern but simpler — no nesting, no triggers, just key=value pairs.

Reuse `TokenType.ObjectProperties` (already lexed) and `TokenType.LeftBrace` / `TokenType.RightBrace`.

---

## Required Workspace Index Change

The `WorkspaceIndex` at `server/src/workspaceSymbol/workspaceIndex.ts` needs to expose object metadata for the explorer to consume.

### New data structure

```typescript
export interface ObjectMetadata {
  type: string;         // "Table", "Page", etc.
  id: number;
  name: string;
  uri: string;          // absolute file path
  line: number;         // 0-based line of the OBJECT declaration (for navigation)
  date?: string;
  time?: string;
  modified?: boolean;
  versionList?: string;
}
```

### New method on WorkspaceIndex

```typescript
getObjectList(): ObjectMetadata[]
```

Returns all indexed objects across all files, in no particular order. The explorer handles filtering and sorting on the client side.

### Indexing behavior

- Called during the existing indexing pass — no separate indexing step.
- One entry per object per file. A file with three OBJECT blocks produces three entries.
- When a file is removed (`workspaceIndex.remove(filePath)`), its entries are removed.
- When a file is re-indexed, its previous entries are replaced.

---

## UI Specification

### Visual style

Use VS Code CSS variables throughout (`--vscode-editor-background`, `--vscode-editor-foreground`, `--vscode-list-activeSelectionBackground`, etc.). The panel must adapt correctly to light and dark themes without any custom color values hardcoded.

Do not add borders between table cells or between rows. Row separation comes from row height and hover/selection state only.

### Panel layout

```
┌──────────────────┬──────────────────────────────────────────────────────────────┐
│  ◈  Object Explorer                                                [↺] [⊞]     │
├──────────────────┼──────────────────────────────────────────────────────────────┤
│                  │  Search: [ Type to filter...                ] [Clear filters]│
│  Table           ├───┬──────┬──────────────────┬──────────┬──────┬──────────────┤
│  Page            │   │  ID ↑│ Name            ↑│ Date    ↑│ Mod ↑│ Version List↑│
│  Report          ├───┼──────┼──────────────────┼──────────┼──────┼──────────────┤
│  Codeunit        │   │[    ]│[                ]│[        ]│[    ]│[            ]│
│  XMLport         ├───┼──────┼──────────────────┼──────────┼──────┼──────────────┤
│  Query           │ ▶ │ ■ │  18 │ Customer         │ 24-03-19 │ Yes  │ NAVW114.00   │
│  MenuSuite       │   │ □ │  21 │ Vendor           │          │      │              │
│  ─────────────   ├───┴──────┴──────────────────┴──────────┴──────┴──────────────┤
│  All             │  Showing 1,392 of 7,677 objects — filtered      [ ] Marked   │
└──────────────────┴──────────────────────────────────────────────────────────────┘
```

**Left panel:** Vertical list of type buttons. Active type is visually highlighted. "All" at the bottom, separated by a divider. When a specific type is selected, the Type column is hidden from the table (redundant).

**Name search bar:** Prominent single input at the top — the most common operation. Uses friendly multi-word matching (see Name search section), not strict filter syntax.

**Filter row:** A row of input cells immediately below the column headers, one cell per column. Each cell accepts C/SIDE filter expressions (ranges, operators, wildcards — see Filter syntax section). This is how every column becomes filterable: ID `50000..59999`, Date `01-01-19..31-12-19`, Modified `Yes`, Version List `@*DK*`.

The filter row cells are visually lighter than data rows — distinct but unobtrusive when empty. An active filter (non-empty cell) is visually highlighted so the user can see at a glance which columns are filtered.

**Mark column:** Leftmost column, narrow (~30px). Checkboxes for marking rows. Header checkbox marks/unmarks all currently visible rows.

**Row cursor:** The `▶` indicator shown in the first data column of the currently selected row.

**Footer:** Row count + `— filtered` indicator left, "Marked only" toggle right.

**`[↺]`** = Refresh. **`[⊞]`** = Reset column layout. **`[Clear filters]`** = clear name search and all filter row cells simultaneously.

Time column is included in the table but omitted from the ASCII above for width. It sits between Date and Modified and has its own filter row cell.

### Header

Small icon + "Object Explorer" title text, left-aligned. Use a simple NAV-evoking icon — a grid or table symbol is fine; the exact icon is not specified here.

### Type filter — left panel

- Vertical list of buttons: Table, Page, Report, Codeunit, XMLport, Query, MenuSuite, then a divider, then All.
- Clicking a type filters the table to that type only.
- Clicking "All" (or the already-active type) clears the type filter.
- Only one type active at a time.
- The active button is visually distinguished — filled/highlighted vs ghost for inactive.
- Each button has a small icon matching C/SIDE's object type icons. The exact icons are left to the implementer; they should be visually distinct per type.
- Buttons do **not** show counts. Counts add clutter and change as filters are applied; the row count footer is sufficient.

### Marks

Marks are a temporary, session-scoped flag on individual rows. They solve a problem filters cannot: selecting a non-contiguous, multi-type working set with no common field value — mark a Table, a Report, and a Codeunit, then switch to "Marked only" to see just those three.

This is the C/SIDE finsql mark feature, restored. The visual is a small square glyph in a dedicated column: `□` unmarked, `■` marked. The RTC used blue row highlighting for selection — that is a different system. Finsql used the square glyph column throughout, which is what we emulate here.

**Mark column:** Second narrow column from the left (after the row cursor column), fixed width (~20px), not resizable, not sortable. Displays a small square indicator per row: empty `□` when unmarked, filled `■` when marked. This matches the C/SIDE finsql visual exactly — it is a square glyph, not a modern checkbox with a tick. The header cell of this column has its own square that marks/unmarks all visible rows.

**Keyboard — Ctrl+F1:** Toggles the mark on the current row. If multiple rows are selected (highlighted with Shift+click or Ctrl+click), Ctrl+F1 toggles the mark on **all selected rows simultaneously** — this is the key power behaviour. Works the same whether rows are currently marked or not (it toggles each independently).

**Mark all visible:** Ctrl+A selects all currently visible rows, then Ctrl+F1 marks them all. If all are already marked, this unmarks them all (toggle applies per row).

**Click mark square:** Clicking a row's mark square `□`/`■` toggles its mark. This is the mouse equivalent of Ctrl+F1 on that row.

**Header mark square:** Clicking the mark square in the column header marks or unmarks all currently visible rows (respects active filters). Consistent with Ctrl+A + Ctrl+F1 behaviour.

**View > Marked Only:** Filters the table to show only marked rows. Equivalent to the "Marked only" toggle in the footer.

**View > Show All:** Removes the Marked Only filter, returning to the full view. Does not clear the marks themselves — rows remain marked, they just become visible again alongside unmarked rows.

**Edit > Toggle Mark:** Menu equivalent of Ctrl+F1, for discoverability.

**Persistence:** Session-only. Marks are lost when the panel is closed or VS Code restarts. They are not stored anywhere. This matches C/SIDE behaviour exactly.

**Marks survive filters and sorts:** Marking Table 18 then switching to show Pages does not unmark Table 18. Changing sort order does not affect marks. The marked set is independent of the current view.

**Marks and type filter:** The "Marked only" view shows marked objects regardless of which type is selected in the left panel — this is the point. You can mark a Table and a Codeunit, select "Marked only", and see both even if the left panel is set to a specific type. The type panel is overridden by Marked Only.

### Filter syntax

The ID, Version List, and Date filter fields all support the standard C/SIDE filter expression syntax. Name search uses a friendlier text approach (see below).

| Expression | Meaning | Typical use |
|------------|---------|-------------|
| `50000` | Exact match | Find one object by ID |
| `50000..59999` | Range (inclusive) | Partner/customisation number range |
| `..49999` | Up to and including | Base application objects only |
| `50000..` | From value upward | All customisation-range objects |
| `<>0` | Not equal | |
| `>50000` | Greater than | |
| `1\|6\|99` | OR — either value | Find a few specific IDs |
| `>50&<100` | AND — both conditions | |
| `5999\|8100..8490` | Combined OR + range | |
| `*Co*` | Wildcard: contains | |
| `Co*` | Wildcard: starts with | |
| `?` | Wildcard: exactly one character | `Hans?n` → Hansen, Hanson |
| `@*co*` | Case-insensitive contains | `@*dk*` matches DK, dk, Dk |

Plain text with no operators is an exact match. Empty field = no filter.

Note: `<>` combined with wildcards (`<>*text*`) is supported but exclusion on text fields may behave unexpectedly — it is reliable for numeric exact values and ranges.

### Name search

Name uses a friendlier text search rather than strict filter syntax. Exploratory name searching is the most common operation and multi-word matching is more useful here than filter operators.

- Labelled "Search:" with an input field.
- Placeholder text: "Type to filter".
- Matches against the object Name field, case-insensitive.
- Input is debounced — apply the filter 300ms after the user stops typing.
- **Single word:** substring match anywhere in the name. `order` matches `Sales Order`, `Order Header`, `Back Order`.
- **Multiple words (space-separated):** all words must appear in the name, in any order. `sales order` matches `Sales Order` and `Order Sales` and `Process Sales Order`. This is the NAV RTC Client search behaviour.

### Filter row — per-column filtering

Every column except the mark column has a filter input cell in the filter row. All cells support the full C/SIDE filter syntax described above.

**ID cell** — most common use: `50000..59999` (partner range), `>49999`, `1|6|99`, `..100`.

**Name cell** — supports filter syntax (`*Sales*`, `Co*`) as an alternative to the top search bar. Unlike the top search bar, the Name filter cell is exact filter syntax — it does not do multi-word matching. Both can be active simultaneously; they are ANDed.

**Date cell** — examples: `01-01-19..31-12-19` (date range), `>01-01-20` (since a date). Note: NAV date format in files is `DD-MM-YY` — filter values should match that format.

**Time cell** — same syntax as Date. Rarely needed in practice but supported for completeness.

**Modified cell** — type `Yes` to show only modified objects, `No` for unmodified, empty for all.

**Version List cell** — examples: `*MYCO*`, `@*dk*`, `*NAVW114*`, `*MYCO*|*MYCO2*`, `<>*NAVW*`.

All filter row cells are applied simultaneously (AND logic). Empty cell = no filter on that column.

### Clear all filters

The **`[Clear filters]`** button next to the name search resets everything simultaneously:
- Clears the name search
- Clears all filter row cells (ID, Name, Date, Time, Modified, Version List)

Does **not** reset the type selection in the left panel — that is navigation state, not a filter.

Keyboard shortcut: **Shift+Ctrl+F7** (matches C/SIDE muscle memory).

The button is visually dimmed when no filters are active, prominent when any filter is set.

### Filter active indicator

When any filter field is non-empty (or Modified is checked), the footer appends `— filtered` to the row count: `Showing 1,392 of 7,677 objects — filtered`. This makes it immediately obvious that the view is not showing everything.

### Columns

Default column order and default widths:

| Column | Default width | Sortable | Notes |
|--------|--------------|----------|-------|
| ▶ (cursor) | 12px | No | Fixed. Shows `▶` on the selected row, empty on all others |
| □ (mark) | 20px | No | Fixed. Empty square `□` = unmarked, filled `■` = marked |
| Type | 90px | Yes | Shows small type icon + text |
| ID | 60px | Yes | Right-aligned, numeric sort |
| Name | 250px | Yes | |
| Date | 80px | Yes | Raw string from file |
| Time | 80px | Yes | Raw string from file |
| Modified | 80px | Yes | Displays "Yes" / "" |
| Version List | 200px | Yes | Truncated with ellipsis if too long |

The Type column shows the row cursor `▶` inline for the selected row, replacing the type icon on that row only.

**Type column visibility:** When a specific type is selected in the left panel (i.e. not "All"), the Type column is hidden — it is redundant since every row is the same type. The column reappears when "All" is selected. This matches C/SIDE behaviour and gives more room to the Name column.

### Sorting

- Click any column header (except mark) to sort by that column.
- Click again to reverse direction.
- The active sort column shows an arrow inline after the column name: `Name ↑` or `Name ↓`.
- Unsorted columns show no arrow.
- Default sort: Type ascending, then ID ascending (natural browse order matching C/SIDE default).
- ID sorts numerically, not lexicographically.
- Name, Version List sort lexicographically, case-insensitive.
- Date and Time sort as strings — lexicographic sort on NAV's `DD-MM-YY` format will not be chronological; that is acceptable for v1.
- Modified sorts false before true (unmodified first).

### Row interaction

- **Click** any row to select it (highlighted with `--vscode-list-activeSelectionBackground`).
- **Enter** on a selected row opens the file and navigates to the object declaration line.
- **Double-click** also opens and navigates.
- **Arrow up/down** move selection between rows.
- The Object Explorer panel stays open after navigation.
- Use `vscode.window.showTextDocument` with the object's line position.

### Keyboard shortcuts within the panel

| Key | Action |
|-----|--------|
| ↑ / ↓ | Move row selection up/down |
| Enter | Navigate to selected object |
| Escape | Clear the focused filter input |
| Tab | Move focus between filter inputs and the table |
| Ctrl+Home | Jump to first row |
| Ctrl+End | Jump to last row |
| Ctrl+F1 | Toggle mark on current row (or all selected rows if multiple selected) |
| Ctrl+A | Select all visible rows (combine with Ctrl+F1 to mark/unmark all) |
| Shift+Ctrl+F7 | Clear all filters |

### Column resizing

Columns (except the mark column) are resizable by dragging the column header divider. Resized widths are part of the persisted state.

`[⊞]` Reset layout button (top right) restores all columns to default widths and resets sort to default. Does not clear filters.

### Row count

Footer line (left side): `Showing X of Y objects` where X = rows currently visible after all filters, Y = total objects in workspace.

### Loading state

While the workspace is indexing or a refresh is in progress, show a loading indicator in place of the table (or as an overlay). The panel must not show a blank/empty state during a load that is still in progress — "no results" and "still loading" must be visually distinct.

### Refresh

- `[↺]` Manual refresh button triggers a full re-index of the workspace.
- Auto-refresh: when the workspace index receives an update for any file (add, change, remove), the explorer panel refreshes its data if the panel is open.

### State persistence

The following state persists across VS Code restarts using the VS Code extension global state API (not `localStorage`):

| State | Persisted |
|-------|-----------|
| Active type filter | Yes |
| Name search text | No — clear on restart |
| Filter row contents (all cells) | No — clear on restart |
| Sort column and direction | Yes |
| Column widths | Yes |
| Marked rows | No — session only |

Search text is intentionally not persisted — a stale filter on open is more surprising than a cleared one.

### Row density

Configurable via VS Code setting `cal.objectExplorer.rowHeight`:

| Value | Row height | Description |
|-------|-----------|-------------|
| `comfortable` | 40px | Default, easy to click |
| `compact` | 28px | More rows visible |
| `dense` | 20px | Maximum density |

This is a setting, not a control inside the panel. The panel reads it on open. Changing the setting while the panel is open takes effect on next open.

### Virtual scrolling

At 7,677 objects, rendering all rows at once is not acceptable. Render only the rows visible in the viewport plus a buffer (e.g. 20 rows above and below). Standard virtual list technique — track scroll position, compute visible range, render that slice of the filtered/sorted array.

The exact implementation approach (custom or library) is left to the implementer.

---

## Architecture

### Components

```
src/extension.ts                       ← register command + keybinding
server/src/parser/parser.ts            ← parse OBJECT-PROPERTIES into AST
server/src/workspaceSymbol/
  workspaceIndex.ts                    ← add ObjectMetadata, getObjectList()
src/objectExplorer/
  objectExplorerProvider.ts            ← create/manage WebviewPanel, message routing
  webview/
    index.html                         ← panel HTML
    main.js                            ← filtering, sorting, marks, virtual scroll, message handling
    style.css                          ← table styles
```

All new files under `src/objectExplorer/` live in the extension client (not the LSP server). The LSP server provides data via a custom LSP request; the extension client renders it.

### Communication

The extension queries the LSP server for object metadata via a custom request:

```
Request:  cal/getObjectList
Response: ObjectMetadata[]
```

The extension holds the data and passes it to the WebView via `panel.webview.postMessage`. The WebView does all filtering, sorting, marking, and rendering in JS — it does not call back to the extension for filtered subsets.

### WebView message protocol

| Direction | Message type | Payload | Purpose |
|-----------|-------------|---------|---------|
| Extension → WebView | `data` | `{ objects: ObjectMetadata[] }` | Initial data load or refresh |
| Extension → WebView | `loading` | `{ loading: boolean }` | Show/hide loading indicator |
| Extension → WebView | `restoreState` | `{ typeFilter, sortColumn, sortDir, columnWidths }` | Restore persisted state on load |
| Extension → WebView | `refresh` | — | Trigger data reload (on file change) |
| Extension → WebView | `error` | `{ message: string }` | Language server unavailable |
| WebView → Extension | `ready` | — | WebView loaded, request data |
| WebView → Extension | `navigate` | `{ uri: string, line: number }` | User opened an object |
| WebView → Extension | `saveState` | `{ typeFilter, sortColumn, sortDir, columnWidths }` | Persist UI state |

---

## Acceptance Criteria

### Parser

- [ ] `ObjectDeclaration` has an `objectProperties` field.
- [ ] A file with a complete OBJECT-PROPERTIES section populates all four fields correctly.
- [ ] A file with no OBJECT-PROPERTIES section produces `objectProperties: undefined`.
- [ ] A file with a partial OBJECT-PROPERTIES section populates present keys and leaves others undefined.
- [ ] `Modified=Yes` → `modified: true`. `Modified=No` → `modified: false`.
- [ ] All existing parser tests continue to pass.

### Workspace index

- [ ] `getObjectList()` returns one entry per object in the workspace.
- [ ] A file with two OBJECT blocks produces two entries with the same URI.
- [ ] Removing a file removes its entries from `getObjectList()`.
- [ ] Re-indexing a file replaces its previous entries.

### UI — filtering

- [ ] Selecting a type in the left panel shows only objects of that type.
- [ ] Selecting the already-active type (or "All") returns to showing all types.
- [ ] Single-word name search matches any object whose name contains that word (case-insensitive).
- [ ] Multi-word name search (`sales order`) matches objects whose name contains all words in any order.
- [ ] Name search is debounced — filter does not apply until 300ms after the user stops typing.
- [ ] Filter row ID cell: `50000..59999` shows only objects in that range.
- [ ] Filter row ID cell: `1|6|99` shows only those three objects.
- [ ] Filter row ID cell: `>49999` shows all objects with ID above 49999.
- [ ] Filter row Modified cell: `Yes` shows only modified objects, `No` shows only unmodified.
- [ ] Filter row Version List cell: `@*ABC*` matches regardless of case.
- [ ] Filter row Version List cell: `*ABC*|*DEF*` matches either tag.
- [ ] Filter row Date cell: `01-01-19..31-12-19` filters to that date range.
- [ ] All active filters compose — type panel + name search + all filter row cells apply simultaneously (AND logic).
- [ ] Name search and filter row Name cell can both be active simultaneously; they AND together.
- [ ] Active filter row cells are visually highlighted so the user can see which columns are filtered.
- [ ] "Clear filters" button resets name search and all filter row cells; does not reset type panel selection.
- [ ] Shift+Ctrl+F7 triggers "Clear filters".
- [ ] Footer shows `— filtered` suffix when any filter is active.
- [ ] Type column is hidden when a specific type is selected in the left panel, and visible when "All" is selected.

### UI — marks

- [ ] Clicking a row's mark square `□`/`■` toggles its mark.
- [ ] Ctrl+F1 toggles the mark on the current row.
- [ ] Ctrl+F1 with multiple rows selected toggles the mark on all selected rows simultaneously.
- [ ] Ctrl+A selects all visible rows; subsequent Ctrl+F1 marks (or unmarks) all of them.
- [ ] Header checkbox marks all currently visible rows; clicking again unmarks them.
- [ ] "Marked only" (footer toggle / View > Marked Only) filters to only marked rows.
- [ ] "Marked only" overrides the type panel — marked objects of any type are shown together.
- [ ] View > Show All (or toggling "Marked only" off) restores full view without clearing marks.
- [ ] Marks survive filter changes and sort changes within the session.
- [ ] Marks survive type panel changes within the session.
- [ ] Marked state is cleared when the panel is closed or VS Code restarts.

### UI — sorting

- [ ] Clicking a column header sorts by that column.
- [ ] Clicking the same header again reverses order.
- [ ] ID column sorts numerically (ID 9 before ID 18, not "18" before "9").

### UI — navigation

- [ ] Enter key on a selected row opens the file and positions the cursor at the object declaration line.
- [ ] Double-clicking a row does the same.
- [ ] Arrow keys move row selection up and down.
- [ ] Escape clears the focused filter input.
- [ ] The Object Explorer panel remains open after navigation.

### UI — state persistence

- [ ] Active type filter and sort state survive closing and reopening VS Code.
- [ ] Search text is cleared on restart (not persisted).
- [ ] Column widths survive closing and reopening VS Code.
- [ ] Reset layout restores default column widths and default sort.

### UI — loading state

- [ ] A loading indicator is visible while the workspace indexes on first open.
- [ ] A loading indicator is visible during a manual refresh.
- [ ] The loading state is visually distinct from the empty/no-results state.

### UI — performance

- [ ] Panel opens and displays first rows within 2 seconds on a 7,677-file corpus.
- [ ] Typing in the name search field does not cause visible lag (filter applies within one animation frame or debounced appropriately).

### UI — edge cases

- [ ] A workspace with zero `.cal` files shows an empty table with `Showing 0 of 0 objects`.
- [ ] Objects with an empty Version List display an empty cell, not an error.
- [ ] The panel handles a file being deleted while open (entry disappears on next refresh).

---

## What We Are Not Building

To be explicit:

- No EVENTS tab, APIS tab, or EXTENSIBLE ENUMS tab — those are AL concepts.
- No "Run" button — objects run in C/SIDE, not VS Code.
- No "New" or "Design" toolbar buttons — same reason.
- No cross-file go-to-definition triggered from the explorer — clicking a row opens the file, that's it.
- No AL Explorer feature parity beyond what is explicitly listed above.
- No code generation (new page from table, etc.) — AL concept.
- No page designer — AL concept.

---

## v3 — CSV Export

Export the currently filtered and sorted view to a semicolon-delimited CSV file (semicolon is the NAV convention — comma would conflict with number formatting in some locales).

Columns: Type, ID, Name, Date, Time, Modified, Version List.

The export reflects exactly what the user sees — active filters apply. File saved via VS Code's `saveDialog` API.

---

## v2 — PROCEDURES tab

Cross-file procedure search. Each row: Object Type, Object ID, Object Name, Procedure Name, Visibility (LOCAL or not). Click → jump to procedure source. Depends on the workspace index being enriched with procedure-level metadata.

---

## v2 — FIELDS tab

Cross-file field reference. Each row: Table ID, Table Name, Field No., Field Name, Data Type. Click → jump to field definition. Useful for cross-referencing field IDs across tables.
