# Lexer Health CI Integration

## Overview

The lexer health check is integrated into the CI pipeline to prevent lexer regressions from being merged. This document explains how the CI integration works, the ratchet pattern, and how to handle failures.

**Key Principle:** The lexer health baseline follows a **ratchet pattern** - the failure count can only stay the same or decrease over time, never increase. Any increase in failures indicates a regression that must be fixed before merging.

---

## How It Works

### CI Workflow

The lexer health check runs as part of the main CI workflow (`.github/workflows/ci.yml`) on every pull request and push to main:

```yaml
jobs:
  lexer-health:
    name: Lexer Health Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm ci
      - name: Run lexer health check
        run: npm run lexer:health:ci
```

### What Gets Validated

The lexer health check validates all C/AL files in `test/REAL/` against two criteria:

1. **Token Position Validation**: Every token's position must correctly point to its corresponding text in the source document
2. **Clean Exit Validation**: The lexer must consume the entire file with all buffers properly emptied

### Skip Behavior

When `test/REAL/` is missing (e.g., for external contributors or fresh clones), the check:
- Skips execution with exit code 0 (success)
- Emits a GitHub Actions warning annotation for visibility
- Logs: `"test/REAL directory not found - skipping lexer health check"`

**This is expected behavior** for contributors without access to proprietary NAV object files. Core contributors with access to `test/REAL/` should see the full validation run.

---

## The Ratchet Pattern

### What Is It?

The ratchet pattern ensures lexer health can only improve or stay constant, never regress:

- **Baseline**: `server/scripts/lexer-health-baseline.json` stores the maximum allowed failure count
- **Comparison**: CI compares actual failures to baseline
- **Pass**: `actual_failures <= baseline.maxFailures` → CI passes
- **Fail**: `actual_failures > baseline.maxFailures` → CI fails (regression detected)

### Why This Design?

Traditional "zero failures" thresholds are too strict for evolving codebases. The ratchet pattern allows:
1. **Incremental improvement**: Fix bugs that reduce failures, update baseline
2. **Regression prevention**: Any increase in failures blocks the PR
3. **Transparency**: Baseline file is version controlled, changes are explicit

### Baseline File Format

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-15",
  "maxFailures": 6,
  "reason": "Initial baseline established from current lexer state (6 clean exit failures in 7,677 files)",
  "notes": [
    "This baseline uses a ratchet pattern - the failure count can only decrease over time, never increase.",
    "If actual failures < maxFailures, update this file to the new lower value.",
    "If actual failures > maxFailures, this indicates a lexer regression that must be fixed."
  ]
}
```

---

## Exit Codes

The `npm run lexer:health:ci` command exits with specific codes for CI interpretation:

| Exit Code | Meaning | CI Result | Description |
|-----------|---------|-----------|-------------|
| **0** | Pass or Skip | ✅ Success | Actual failures ≤ baseline, or test/REAL not found |
| **1** | Regression | ❌ Failure | Actual failures > baseline (lexer regression detected) |
| **2** | Config Error | ❌ Failure | Baseline file missing, malformed, or empty directory |

### GitHub Actions Annotations

The CI script emits GitHub Actions annotations for visibility:

```bash
# When skipped:
::warning::test/REAL directory not found - skipping lexer health check

# When regression detected:
::error::Lexer health regression detected
```

These annotations appear in the GitHub Actions UI and PR checks.

---

## Handling CI Failures

### Scenario 1: Regression Detected (Exit Code 1)

**Symptoms:**
- CI fails with message: `"Lexer health regression: N additional failures"`
- GitHub Actions shows error annotation

**What This Means:**
Your changes introduced a lexer bug that causes more files to fail validation than the baseline allows.

**How to Fix:**

1. **Run local validation** to reproduce:
   ```bash
   cd server
   npm run lexer:health
   ```

   This generates a detailed report at `.lexer-health/lexer-health-report.md` showing:
   - Which files now fail
   - What specific validation errors occurred
   - Performance metrics

2. **Investigate the failures:**
   - Position validation failures: Token positions don't match source text
   - Clean exit failures: Lexer left buffers in unexpected states

3. **Fix the lexer bug** that caused the new failures

4. **Verify the fix:**
   ```bash
   npm run lexer:health:ci
   ```
   Should exit with code 0

5. **Do NOT update the baseline** unless you've genuinely fixed bugs (see Scenario 2)

### Scenario 2: Improvement Detected

**Symptoms:**
- CI passes but shows message: `"Lexer health improvement detected: N fewer failures"`
- Suggests updating baseline

**What This Means:**
Your changes fixed a lexer bug, reducing the failure count below the baseline.

**How to Update Baseline:**

1. **Verify the improvement is intentional:**
   ```bash
   cd server
   npm run lexer:health
   ```

   Review the report to confirm:
   - Failures genuinely decreased (not a false negative)
   - The reduction aligns with your bug fix intent

2. **Update the baseline file:**
   Edit `server/scripts/lexer-health-baseline.json`:
   ```json
   {
     "version": "1.0.0",
     "lastUpdated": "2026-01-15",
     "maxFailures": 4,  // ← Update to new lower value
     "reason": "Reduced from 6 to 4 failures by fixing XYZ bug (PR #123)",
     "notes": [...]
   }
   ```

3. **Include baseline update in your PR:**
   - Add the baseline update as part of your fix
   - Explain in PR description why failures decreased
   - CI will pass with new baseline

**Why This Matters:**
Updating the baseline "locks in" the improvement, preventing future PRs from regressing back to the old failure count.

### Scenario 3: Configuration Error (Exit Code 2)

**Symptoms:**
- CI fails with message: `"Configuration error: baseline file not found"` or similar
- Or: `"Configuration error: baseline file missing valid maxFailures property"`

**What This Means:**
The baseline file is missing, malformed, or invalid.

**How to Fix:**

1. **Check baseline file exists:**
   ```bash
   ls -la server/scripts/lexer-health-baseline.json
   ```

2. **Validate JSON format:**
   ```bash
   cat server/scripts/lexer-health-baseline.json | jq .
   ```
   Should parse without errors.

3. **Ensure required fields exist:**
   - `maxFailures` must be a number (not string, not null)
   - File must be valid JSON

4. **If baseline was accidentally deleted**, restore from git history or create new baseline:
   ```bash
   cd server
   npm run lexer:health
   # Note the actual failure count from report
   # Create baseline with that value
   ```

---

## Local Validation

### Generate Full Report

```bash
cd server
npm run lexer:health
```

**Output:**
- Report saved to `.lexer-health/lexer-health-report.md` (gitignored)
- Console summary of failures and performance metrics
- Exit code 0 if all files pass, 1 if any fail

**Report Contents:**
- Summary: Total files, success rate, failure breakdown
- Performance metrics: p50, p95, p99 tokenization times
- Performance outliers: Files >2x p95 time
- Detailed failures: Each failing file with specific errors

### Run CI Check Locally

```bash
cd server
npm run lexer:health:ci
```

**Output:**
- Compares actual failures to baseline
- Emits same messages as CI
- Exit code 0 (pass/skip), 1 (regression), or 2 (config error)

**Use Case:**
Pre-commit validation to ensure CI will pass.

---

## Workflow Choice Rationale

### Why Separate from Performance CI?

The lexer health check runs in a separate CI job (`ci.yml`) rather than being integrated into the performance workflow (`performance.yml`):

**1. Different Triggers:**
- **Lexer health**: Runs on every PR and push to main (frequent)
- **Performance**: Runs on-demand or scheduled (infrequent, expensive)

**2. Different Failure Modes:**
- **Lexer health**: Binary pass/fail based on correctness
- **Performance**: Threshold-based, needs manual review of regressions

**3. Different Purposes:**
- **Lexer health**: Gate for PR merges (blocking)
- **Performance**: Monitoring and trend analysis (informational)

**4. Execution Speed:**
- **Lexer health**: Fast (~5-10s for 7,677 files in CI mode)
- **Performance**: Slow (minutes for full benchmark suite)

**5. Resource Requirements:**
- **Lexer health**: Minimal (only needs test/REAL, which is gitignored)
- **Performance**: High (needs profiling tools, warm-up runs)

This separation keeps the PR feedback loop fast while allowing deeper performance analysis on-demand.

---

## Understanding Validation Failures

### Position Validation Failures

**What It Means:**
A token's `position` and `length` fields don't correctly point to its corresponding text in the source document.

**Common Causes:**
- Off-by-one errors in position tracking
- Incorrect length calculation for multi-character tokens
- Unicode character handling issues
- Escaped quote handling in strings (`'don''t'` → `don't`)

**Example Error:**
```
Token mismatch at token 42 (String)
  Expected: 'hello world'
  Actual:   'hello worl'
```

**How to Debug:**
1. Run full report: `npm run lexer:health`
2. Find the failing file in `.lexer-health/lexer-health-report.md`
3. Look at the specific token and position mentioned
4. Check lexer's position tracking code for that token type

### Clean Exit Failures

**What It Means:**
After tokenizing the entire file, the lexer's internal state is not in the expected "clean" state.

**Validation Criteria:**
- `current` must equal source length (all text consumed)
- `line` must equal or exceed line count (all lines processed)
- `peekedChar` must be null (no buffered lookahead)
- `skipWhitespaceBuffer` must be empty (no pending whitespace)
- `rdldata` buffer must be empty (Report RDLDATA sections fully consumed)*

*Note: RDLDATA underflow (buffer not fully consumed) is allowed for Report objects, as C/SIDE sometimes exports incomplete RDLDATA sections.

**Common Causes:**
- Lexer stopped early (didn't reach EOF)
- Lookahead character not properly consumed
- Skip buffer not flushed at EOF
- RDLDATA section boundary misdetection

**Example Violation:**
```
Clean Exit Violations:
  - SKIP_BUFFER_NOT_EMPTY: Skip buffer not empty at EOF
    Expected: []
    Actual:   [{ start: 12345, end: 12350 }]
```

**How to Debug:**
1. Run debug trace: `npm run lexer:trace -- path/to/failing-file.TXT`
2. Review trace output (`.lexer-trace/`) to see lexer state at EOF
3. Check if lexer properly handles end-of-file conditions

---

## Development Workflow Integration

### Before Committing

```bash
cd server
npm run lexer:health:ci
```

If exit code is 0, your changes are safe to commit.

### When Fixing Lexer Bugs

1. Write tests that reproduce the bug (TDD)
2. Fix the bug
3. Run `npm run lexer:health` to verify improvement
4. If failures decreased, update baseline in same commit
5. PR will pass CI with both fix and baseline update

### When Adding New Lexer Features

1. Ensure new features don't increase failure count
2. Run `npm run lexer:health:ci` before pushing
3. If failures increase, investigate why:
   - New token type missing position handling?
   - Context tracking incorrect?
   - Edge case not handled?

---

## Troubleshooting

### "test/REAL directory not found" but I have NAV objects

**Solution:**
Ensure files are in the correct location:
```bash
ls test/REAL/*.TXT | head -5
```

Should show C/AL object files. If not:
1. Check files are in repository root's `test/REAL/`, not `server/test/REAL/`
2. Check files have `.TXT` extension (case-sensitive)
3. Verify gitignore isn't accidentally committed

### CI passes locally but fails in GitHub Actions

**Possible Causes:**
1. **Baseline file not committed**: `git status` should show it as tracked
2. **Node version mismatch**: CI uses Node 20, check local version
3. **npm ci vs npm install**: CI uses `npm ci` for reproducibility

**Solution:**
```bash
# Use exact CI environment
nvm use 20
cd server
rm -rf node_modules package-lock.json
npm install
npm run lexer:health:ci
```

### Baseline update not recognized

**Symptoms:**
Updated `maxFailures` but CI still reports old value.

**Solution:**
1. Verify baseline file is committed: `git status server/scripts/lexer-health-baseline.json`
2. Check file is in correct location: `ls -la server/scripts/lexer-health-baseline.json`
3. Validate JSON is well-formed: `cat server/scripts/lexer-health-baseline.json | jq .`
4. Push baseline file: `git add server/scripts/lexer-health-baseline.json && git commit -m "Update baseline"`

---

## Advanced Topics

### When to Skip CI Check

The lexer health check skips automatically when `test/REAL/` is missing. This is **by design** to support:
- External contributors without NAV object access
- Fresh repository clones before `test/REAL/` is populated
- CI environments where proprietary files cannot be stored

**For core contributors:**
Always populate `test/REAL/` locally to catch regressions before pushing.

### Manual Baseline Reset

If the baseline becomes misaligned (e.g., after major refactoring), you can reset it:

1. **Run full validation:**
   ```bash
   cd server
   npm run lexer:health
   ```

2. **Note actual failure count from report**

3. **Update baseline:**
   ```json
   {
     "maxFailures": <actual_count>,
     "reason": "Baseline reset after major refactoring (PR #XXX)",
     "lastUpdated": "<today>"
   }
   ```

4. **Commit with justification:**
   ```bash
   git add server/scripts/lexer-health-baseline.json
   git commit -m "Reset lexer health baseline after refactoring

   Previous baseline was misaligned due to [reason].
   New baseline: X failures (from full validation run).
   See PR #XXX for context."
   ```

**Important:** Baseline increases should be **rare** and **explicitly justified**. Most changes should either maintain or improve the baseline.

---

## Related Documentation

- **Lexer Development**: See `/.claude/skills/cal-parser-development` for lexer architecture
- **Implementation Plan**: See `/docs/implementation-plan.md` for full feature context
- **Trivia Handling**: See `/server/src/trivia/README.md` for comment/whitespace handling

---

## Quick Reference

| Command | Purpose | Output |
|---------|---------|--------|
| `npm run lexer:health` | Full validation report | `.lexer-health/lexer-health-report.md` |
| `npm run lexer:health:ci` | CI check (baseline comparison) | Exit code 0/1/2 |
| `npm run lexer:trace -- <file>` | Debug trace for specific file | `.lexer-trace/*.trace.md` |

| File | Purpose |
|------|---------|
| `server/scripts/lexer-health.ts` | Validation script implementation |
| `server/scripts/lexer-health-baseline.json` | Baseline threshold (version controlled) |
| `.lexer-health/` | Generated reports (gitignored) |
| `.github/workflows/ci.yml` | CI workflow with lexer health check |
