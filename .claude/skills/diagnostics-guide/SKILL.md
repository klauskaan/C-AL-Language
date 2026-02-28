---
name: diagnostics-guide
description: How to run diagnostic reports and performance benchmarks for the C/AL extension — parser validation, semantic analysis, lexer health, and performance suites
---

# C/AL Diagnostics & Benchmarks Guide

All diagnostic scripts run from the **`server/`** directory. Check your CWD before running — don't blindly `cd server/` if you're already there.

```bash
cd ~/Source/C-AL-Language/server
```

---

## Diagnostic Reports

### 1. Parser Validation (`validate:real`)

Parses all 7,677 files in `test/REAL/` and reports any parse errors.

```bash
npm run validate:real
```

**What it checks:** Every file is lexed and parsed. Any token errors or structural parse failures are recorded.

**Output:** `validation-report.md` (written to project root, ~16s)

**Healthy state:** `Files with errors: 0/7677` — 100% success rate. Any failures here indicate a parser regression; treat as a blocker.

---

### 2. Semantic Validation (`validate:semantic`)

Runs the full semantic analysis pipeline (lex → parse → symbol table → semantic analyzer) on all files and reports diagnostics.

```bash
npm run validate:semantic
```

**What it checks:** `undefined-property`, `undefined-identifier`, `unused-variable`, `type-mismatch`, `deprecated-function` diagnostics across all real C/AL objects. Pre-scans all tables to build a cross-object registry before analyzing.

**Output:** `semantic-report.md` (written to project root, ~60s)

**Healthy state:** The diagnostic counts are a known baseline from real client code — not all are fixable. Watch for:
- Increases in `type-mismatch` count (real semantic bugs)
- Increases in `undefined-identifier` or `undefined-property` on standard NAV objects (symbol table regressions)
- New diagnostic codes appearing unexpectedly

**Typical baseline (7,677 files, as of 2026-02-28):**

| Code | Severity | Count | Files |
|------|----------|-------|-------|
| `undefined-property` | Warning | ~8,611 | ~1,750 |
| `undefined-identifier` | Warning | ~7,349 | ~1,633 |
| `unused-variable` | Warning | ~1,285 | ~314 |
| `deprecated-function` | Hint | ~6 | ~6 |
| `type-mismatch` | Warning | ~1 | ~1 |

`undefined-property` and `undefined-identifier` warnings largely come from cross-object references — fields, procedures, and properties on record variables whose definitions live in other objects. Most are expected and not fixable without broader cross-file analysis. `type-mismatch` and `deprecated-function` counts should be stable.

---

### 3. Lexer Health (`lexer:health`)

Validates tokenization accuracy and performance across all real files. Checks two things per file:
- **Position validation** — every token's reported line/column matches its actual position in the source
- **Clean exit** — the lexer's internal state machine ends cleanly (all stacks unwound, no orphaned context)

```bash
npm run lexer:health
```

**Output:** `.lexer-health/lexer-health-report.md` (written to project root, ~18s)

**Healthy state:** `Files with failures: 0/7677`. Also reports min/avg/max tokenization times — baseline is ~0.86ms avg.

**CI variant** — compares against a baseline threshold (`server/scripts/lexer-health-baseline.json`):

```bash
npm run lexer:health:ci
```

Exit codes: 0 = pass, 1 = regression (failures exceeded baseline), 2 = config error. The baseline uses a ratchet pattern — failures can only decrease over time. Current baseline: `maxFailures: 6` (set when the check was introduced; actual failures are now 0, so the baseline is pessimistic and could be tightened).

---

### 4. Lexer Trace (`lexer:trace`)

Generates a detailed token-level trace for debugging a specific file. Captures every lexer decision: tokens emitted, context stack pushes/pops, flag changes, skipped whitespace, and failed multi-word token attempts.

```bash
npm run lexer:trace -- <path-to-file> [--sanitize]
```

**`--sanitize`** truncates token values to first/last 3 characters — use this when sharing traces to avoid leaking proprietary content.

**Output:** `.lexer-health/<filename>-trace.txt`

**Example:**
```bash
npm run lexer:trace -- test/REAL/TAB18.TXT --sanitize
# => .lexer-health/TAB18-trace.txt
```

Use this when investigating a specific parse error or unexpected tokenization — trace the exact file that's failing, then search for the relevant line in the output.

---

## Performance Benchmarks

All perf commands run from `server/`. They use synthetic fixtures from `test/fixtures/`, not `test/REAL/`.

### Quick Suite (`perf:quick`)

Fast local feedback. Runs all benchmark phases on small and medium fixtures only.

```bash
npm run perf:quick
```

**Duration:** ~45 seconds
**Phases:** Lexer → Parser → Symbol Table → Integration → Semantic Tokens
**Use when:** Iterating on a performance optimization and want rapid feedback.

---

### Standard Suite (`perf:benchmark`)

Comprehensive benchmark suite, used for CI and baseline updates.

```bash
npm run perf:benchmark
```

**Duration:** ~2 minutes
**Phases:** All quick phases + Memory benchmarks
**Output:** `server/src/__tests__/performance/results/all-benchmarks.json` and `standard-suite-summary.json`

Run this before updating performance baselines.

---

### Stress Suite (`perf:stress`)

Deep analysis with complexity fixtures (deep nesting, many procedures, large tables, edge cases) and extreme file sizes (huge/enormous synthetic files).

```bash
npm run perf:stress
```

**Duration:** ~10+ minutes
**Output:** `server/src/__tests__/performance/results/stress-suite-report.json`
**Use when:** Evaluating a significant architectural change to the lexer or parser.

---

### Memory Benchmarks (`perf:memory`)

Profiles heap allocation per parse operation across fixture sizes.

```bash
npm run perf:memory
```

**Duration:** ~1–2 minutes
**Use when:** Investigating a memory regression or validating allocation improvements.

---

### Baseline Comparison (`perf:compare`)

Compares the most recent `perf:benchmark` results against the stored performance baseline. Fails (exit 1) if any benchmark is >20% slower than baseline.

```bash
npm run perf:compare
```

**Requires:** `perf:benchmark` must have been run first (reads `results/all-benchmarks.json`).

---

### Update Baseline (`perf:update-baseline`)

Writes current benchmark results as the new performance baseline.

```bash
npm run perf:update-baseline
```

**When to use:** After a confirmed performance improvement, or after a deliberate architectural change that changes the expected performance envelope. Always run `perf:benchmark` first, then `perf:compare` to confirm the delta is intentional, then update.

---

### Full Perf Pipeline (`perf:all`)

Convenience alias that runs benchmark + memory + compare in sequence.

```bash
npm run perf:all
```

---

## Baseline Version Check (`check:baseline`)

Verifies that the performance baseline version matches the current `package.json` version. Run from the project root.

```bash
npm run check:baseline   # from project root
```

This is also run automatically as a pre-commit hook. A mismatch warns that the baseline may be stale relative to the current version. To resolve:

```bash
cd server
npm run perf:benchmark && npm run perf:update-baseline
```

---

## Running All Three Diagnostic Reports

To run the full diagnostic suite in one go:

```bash
cd ~/Source/C-AL-Language/server
npm run validate:real && npm run validate:semantic && npm run lexer:health
```

Reports are saved to:
- `validation-report.md` — project root
- `semantic-report.md` — project root
- `.lexer-health/lexer-health-report.md` — project root

Total wall time: ~70 seconds.

---

## What to Watch For

| Signal | Likely cause |
|--------|-------------|
| `validate:real` failures appear | Parser regression — check recent parser/lexer changes |
| `type-mismatch` count increases in semantic report | New semantic rule firing on false positives, or real code regression |
| `undefined-identifier` spikes on standard NAV objects | Symbol table regression — builtins or table registry broken |
| `undefined-property` spikes on standard NAV objects | Field registry regression — table fields not being indexed |
| Lexer health position errors | Token position tracking bug — off-by-one in line/column |
| Lexer clean exit failures | State machine bug — a context or flag is not being unwound |
| `perf:compare` regression | Performance regression — profile with `perf:stress` to narrow down |
| Avg tokenization time increase in `lexer:health` | Lexer performance degradation across real files |
