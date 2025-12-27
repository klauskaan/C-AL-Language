# VSCode Integration for Performance Tests

## Overview

While there's no dedicated VSCode extension for performance benchmarks (like there is for Jest), you can run performance tests directly from VSCode using the built-in **Tasks** feature.

## Quick Access

### Method 1: Command Palette (Recommended)

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Tasks: Run Task`
3. Filter by typing `Performance:`
4. Select the test you want to run

### Method 2: Keyboard Shortcut

1. Press `Ctrl+Shift+B` to see all build/test tasks
2. Use arrow keys to navigate to performance tasks
3. Press Enter to run

### Method 3: Terminal Menu

1. Click **Terminal** → **Run Task...**
2. Select a performance task from the list

## Available Tasks

### Test Suites (Complete Runs)

| Task | Duration | Description |
|------|----------|-------------|
| **Performance: Quick Suite** | ~30s | Fast feedback for local development |
| **Performance: Standard Suite** | ~2min | Comprehensive CI-ready tests |
| **Performance: Stress Suite** | ~10min | Deep analysis with all complexity fixtures |

### Individual Benchmarks (Focused Testing)

| Task | Description |
|------|-------------|
| **Performance: Lexer Only** | Test tokenization performance only |
| **Performance: Parser Only** | Test parsing performance only |
| **Performance: Symbol Table Only** | Test symbol table operations only |
| **Performance: Integration Only** | Test full pipeline (lex→parse→symbols) |
| **Performance: Memory Only** | Test memory usage and profiling |

### Baseline Management

| Task | Description |
|------|-------------|
| **Performance: Compare to Baseline** | Compare current results to baseline |
| **Performance: Update Baseline** | Update baseline (after intentional changes) |

## Usage Examples

### During Development

**Scenario:** You just optimized the lexer

1. Press `Ctrl+Shift+P`
2. Type: `Tasks: Run Task`
3. Select: `Performance: Lexer Only`
4. Review results in integrated terminal
5. If improved, run: `Performance: Compare to Baseline`

### Before Committing

**Scenario:** Ready to commit changes

1. Run: `Performance: Quick Suite` (~30s)
2. Verify no regressions
3. Commit your changes

### Before Pull Request

**Scenario:** Final validation before PR

1. Run: `Performance: Standard Suite` (~2min)
2. Run: `Performance: Compare to Baseline`
3. If baseline comparison passes → Create PR
4. If regressions detected → Fix or justify

## Task Output

All tasks use a **dedicated panel** that:
- ✅ Auto-clears on each run (clean output)
- ✅ Stays visible (no auto-hide)
- ✅ Shows colored output (emojis and formatting preserved)
- ✅ Allows scrolling through full results

### Reading Results

Look for these indicators:
- ✅ Green checkmark = PASS (within 10% of baseline)
- ⚠️ Yellow warning = WARN (10-20% slower)
- ❌ Red cross = FAIL (>20% slower, CI will fail)

## Tips & Tricks

### 1. Keep Task Panel Visible

Create a vertical split:
1. Drag the terminal panel to the right side
2. Run performance tasks in dedicated space
3. Keep your code visible on the left

### 2. Compare Multiple Runs

After running a task:
1. Click the "Split Terminal" icon
2. Run the same task again
3. Compare outputs side-by-side

### 3. Terminal History

- Press `↑` in the terminal to re-run last task
- VSCode remembers task output history
- Use scrollback to review previous runs

### 4. Custom Keybindings

Add to your `keybindings.json`:

```json
{
  "key": "ctrl+shift+alt+p",
  "command": "workbench.action.tasks.runTask",
  "args": "Performance: Quick Suite"
}
```

Now `Ctrl+Shift+Alt+P` runs quick suite instantly!

### 5. Run on Save (Advanced)

Install the "Trigger Task on Save" extension, then configure:

```json
{
  "triggerTaskOnSave.tasks": {
    "Performance: Quick Suite": [
      "server/src/lexer/*.ts",
      "server/src/parser/*.ts"
    ]
  }
}
```

## Comparison with Jest Extension

### Jest Extension (Unit Tests)
- ✅ Test explorer UI
- ✅ Inline decorations (✓ or ✗ in editor)
- ✅ Debug single test
- ✅ Run on save
- ❌ Not suitable for long-running benchmarks

### VSCode Tasks (Performance Tests)
- ✅ Run full suites or individual benchmarks
- ✅ Terminal output with full statistics
- ✅ No special extension needed (built-in)
- ✅ Customizable with keybindings
- ❌ No inline decorations
- ❌ No test explorer UI

## Alternative: NPM Scripts View

VSCode also shows npm scripts in the **Explorer** sidebar:

1. Expand **NPM SCRIPTS** section
2. Find `server` → `perf:*` scripts
3. Click ▶ icon to run

Scripts available:
- `perf:quick` - Quick suite
- `perf:benchmark` - Standard suite
- `perf:stress` - Stress suite
- `perf:memory` - Memory tests
- `perf:compare` - Compare to baseline
- `perf:update-baseline` - Update baseline
- `perf:all` - Run all + compare

## Troubleshooting

### Task Not Found

**Problem:** Task doesn't appear in list

**Solution:**
1. Reload VSCode: `Ctrl+Shift+P` → "Reload Window"
2. Verify `.vscode/tasks.json` exists
3. Check tasks.json is valid JSON

### Wrong Working Directory

**Problem:** Task fails with "module not found"

**Solution:**
- Tasks are configured with `"path": "server/"` to run from correct directory
- No action needed - this is handled automatically

### Terminal Cluttered

**Problem:** Too many terminals open

**Solution:**
1. Right-click terminal → "Kill Terminal"
2. Or use: `"panel": "dedicated"` keeps reusing same panel (already configured)

### Can't See Colored Output

**Problem:** Output shows escape codes instead of colors

**Solution:**
- Install "ANSI Colors" extension
- Or check Terminal → Settings → "Integrated: Enable ANSI Colors"

## Advanced: Task Dependencies

You can create composite tasks in `tasks.json`:

```json
{
  "label": "Performance: Test and Compare",
  "dependsOn": [
    "Performance: Standard Suite",
    "Performance: Compare to Baseline"
  ],
  "dependsOrder": "sequence",
  "problemMatcher": []
}
```

Now one task runs benchmarks, then automatically compares!

## Command Line Alternative

Prefer terminal? All tasks are also npm scripts:

```bash
cd server

# Quick feedback
npm run perf:quick

# Standard tests
npm run perf:benchmark

# Individual benchmarks
NODE_OPTIONS='--expose-gc' npx ts-node src/__tests__/performance/benchmarks/lexer.bench.ts

# Compare and update
npm run perf:compare
npm run perf:update-baseline
```

## Summary

While there's no Jest-like extension for performance tests, VSCode's built-in **Tasks** feature provides:

✅ **Easy access** via Command Palette
✅ **Clean output** in dedicated panels
✅ **Customizable** with keybindings
✅ **No installation** required (built into VSCode)
✅ **Flexible** - run suites or individual benchmarks

**Recommended workflow:**
1. Use `Performance: Quick Suite` during development
2. Use `Performance: Standard Suite` before PRs
3. Use individual tasks (`Lexer Only`, etc.) when debugging specific components
