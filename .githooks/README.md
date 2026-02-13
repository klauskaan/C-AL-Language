# Git Hooks

This directory contains custom Git hooks for the C-AL-Language project.

## Auto-Configuration

Git hooks are automatically configured when you run `npm install` in the project root. The `postinstall` script sets `core.hooksPath` to `.githooks`, which tells Git to use hooks from this directory instead of `.git/hooks/`.

To manually configure:
```bash
git config core.hooksPath .githooks
```

## Hooks

### pre-commit

**Purpose:** Warns when performance baselines are stale (version mismatch with package.json).

**When it runs:** Before every commit.

**Behavior:**
- Compares `package.json` version with `server/src/__tests__/performance/baselines/baselines.json` version
- Exits silently if baseline doesn't exist (expected for new projects)
- Emits warning to stderr on version mismatch
- Never blocks commits (always exits 0)

**Expected workflow:**
1. Bump version in `package.json` (e.g., `0.4.6` → `0.5.0`)
2. Hook detects mismatch on next commit
3. Developer updates baseline:
   ```bash
   cd server
   npm run perf:benchmark && npm run perf:update-baseline
   ```
4. Baseline version now matches package version

### post-commit

**Purpose:** Notifies FileTimelineTracker when commits are made to the main branch, enabling drift tracking for the rebase-before-merge workflow.

**When it runs:** After every successful commit.

**Behavior:**
- Only processes commits on `main` or `master` branches
- Skips worktree branches (auto-claude feature branches)
- Runs in background to avoid slowing down commits
- Never blocks commits (always exits 0)

### pre-merge-commit

**Purpose:** Warns when a merge reintroduces lines that were deleted on the target branch since the merge base. Part of the defense-in-depth strategy for the rebase-before-merge workflow.

**When it runs:** Before completing an auto-merge (clean merge without conflicts).

**Behavior:**
- Validates `GIT_REFLOG_ACTION` to extract merge source
- Computes merge base between HEAD and merge source
- Finds lines deleted on target branch: `git diff <merge-base>..HEAD`
- Finds lines added by merge: `git diff --cached HEAD`
- Reports intersection (reintroduced deletions) as warnings
- Filters trivial lines (blank lines, lone braces, standalone keywords)
- Never blocks merges (always exits 0)

**File patterns checked:** `*.ts *.js *.json *.md *.cal *.txt *.TXT *.yml`

**COVERAGE GAP:** This hook only fires for clean auto-merges. When a merge has conflicts, Git uses the regular `commit` hook (not `pre-merge-commit`) for the conflict-resolution commit. This means:
- Clean merges: hook runs, deletion reintroduction is detected
- Conflict merges: hook does NOT run, detection is missed

This is a known limitation of Git's hook system. The defense is still valuable for clean merges, which are the most common case.

## GitHub Merge Button Limitation

The GitHub merge button (web UI) does not trigger local Git hooks. These hooks only run for local `git merge` commands. For comprehensive protection:
1. Prefer local merges over GitHub's merge button
2. Rely on the rebase-before-merge workflow to prevent most reintroductions
3. Treat these hooks as defense-in-depth, not primary prevention

## Testing Hooks

### Manual Test

```bash
# Test post-commit
git commit --allow-empty -m "Test commit"

# Test pre-merge-commit (requires a merge scenario)
git checkout -b test-branch
# Make changes and commit
git checkout main
git merge test-branch  # Hook runs if merge is clean
```

### Check Hook Configuration

```bash
git config core.hooksPath
# Should output: .githooks
```

## Disabling Temporarily

To bypass hooks for a single operation:

```bash
git commit --no-verify    # Skip pre-commit, commit-msg, post-commit
git merge --no-verify     # Skip pre-merge-commit
```

Use `--no-verify` sparingly — hooks exist to catch problems.
