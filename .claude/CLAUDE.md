# C/AL Language Support Extension

## Collaboration Style

We work as **pair programming partners**. Klaus provides vision and direction, Claude orchestrates agents and implements. Proactively share observations and push back when something doesn't feel right.

**Never use plan mode.** Use the architect + adversarial-reviewer loop below instead.

---

## Workflow

Implementation work happens in a git worktree (`../worktree-issue-{number}`) to keep main clean. The file-ops agent handles creation, collision detection, and cleanup. No issue number? Create one first via github-issues — even a title and one-line description is enough. The issue gets fleshed out as work progresses.

```
1. INVESTIGATE  -  code-detective finds root cause
2. PLAN         -  architect designs, adversarial-reviewer critiques until approved
3. TEST FIRST   -  test-writer writes tests, then test-runner verifies they fail
4. IMPLEMENT    -  senior-developer executes the plan
5. REVIEW       -  adversarial-reviewer (always), plus typescript-reviewer and/or
                    cal-expert when relevant (TS changes, C/AL semantics)
6. COMMIT       -  file-ops commits with "Fixes #X", pushes to feature branch
7. MERGE        -  merge-agent merges to main, cleans up worktree
                    (if senior-merge-engineer was needed, run adversarial-reviewer before cleanup)
```

**Skip steps that aren't needed.** Trivial changes don't need an architect. Use judgment — but lean toward investigating. A detailed issue description tells you WHAT is happening, not WHY. Skip the detective only after glancing at the relevant code to confirm the root cause is genuinely obvious (single file, clear cause, no ambiguity about where to fix) — don't trust the issue description alone. For bugs and non-trivial features, default to investigating.

**Show your reasoning when skipping.** When skipping INVESTIGATE or PLAN, state your reasoning to the user before proceeding. Reference what you checked, not just your conclusion. This makes judgment visible and gives the user a chance to course-correct before work starts.
- Good: "Skipping investigation: checked `parser.ts` lines 40-55, the fix is a missing case in the switch — single file, clear cause, no ambiguity."
- Not: "Skipping investigation — this looks straightforward."

**Read the full issue.** Before starting work, fetch issue comments (`gh issue view N -c`), not just the description. Comments often contain clarifications, revised scope, or review feedback from prior work.

**Staleness of workflow-spawned issues.** Issues created during work on another issue ("Discovered during #N", "Deferred from #N") may go stale if the referenced code changes after filing. When picking up such an issue, check how many commits have touched the relevant files since it was created — count commits, not calendar days. High churn means investigate even if the description looks obvious; no churn means the original observation still holds.

**TDD:** Tests should fail before implementation (bug fixes and new features). If they pass immediately, the diagnosis might be wrong. Exceptions: refactoring, test coverage tasks, regression tests.

**Review is mandatory.** adversarial-reviewer runs before every commit. It catches scope creep and drift that compound if unchecked.

**When things go wrong:**
- Tests fail after implementation? Small fix → just fix it. Design flaw → re-plan. Wrong root cause → re-investigate.
- Senior-developer returns REJECTED? Back to PLAN with the rejection feedback.
- Reviewer finds issues? Fix them, get re-reviewed. Design flaw → back to plan.
- Going in circles? Stop after 2-3 iterations and escalate to the user with what you've tried.

**Feedback:** When reviewers give feedback, handle each item:
- **Fix it** — in PLAN: architect revises; in REVIEW: senior-developer changes code
- **Defer it** — spawn github-issues agent to create a tracking issue, then move on
- **Acknowledge it** — valid observation, no action needed (meta-observations only)
- **Dismiss it** — not applicable, explain why

**Issue Creation Bias.** When a finding is valid but out-of-scope, prefer creating a tracking issue over acknowledging and moving on. Untracked observations get lost. This bias applies across all phases — investigation, planning, and review.

Only an explicit "APPROVED" exits the loop — "approved if you clarify X" means clarify X first. Report all feedback items and their dispositions to the user for visibility.

**Boy Scout Rule:** Fix trivial issues (unused imports, typos, formatting) spotted during review. If it needs tests or touches other files, create an issue instead.

**Assumption verification:** During planning, the architect lists key assumptions. The reviewer flags critical ones with `[VERIFY]`. The orchestrator confirms flagged items with fresh tool calls before proceeding.

---

## Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| **code-detective** | Opus | Root cause investigation, impact analysis |
| **architect** | Opus | Implementation planning, design decisions |
| **adversarial-reviewer** | Opus | Code review, find bugs, prevent scope creep |
| **senior-developer** | Sonnet | All implementation: features, fixes, refactoring, trivial changes |
| **test-writer** | Sonnet | Write tests (TDD workflow) |
| **test-runner** | Haiku | Run tests, analyze failures |
| **typescript-reviewer** | Sonnet | Type safety, TS best practices |
| **cal-expert** | Sonnet | C/AL correctness, AL prevention |
| **file-ops** | Sonnet | Git operations: commits, branches, worktrees |
| **merge-agent** | Sonnet | Merge branches, resolve simple conflicts |
| **senior-merge-engineer** | Opus | Complex merge conflict resolution |
| **github-issues** | Haiku | Create/update GitHub issues |

---

## Critical Context

### C/AL is not AL
- **C/AL:** NAV 2013 through BC14 (this extension)
- **AL:** BC15+ (NOT supported)
- **Never add AL-only features** — causes NAV compilation errors. Use `/cal-reference` to check.

### test/REAL/ — Proprietary NAV Objects
Real NAV C/AL objects (gitignored). Read freely for analysis, never copy content to committed files or reference in public artifacts (PRs, issues, commit messages). Create synthetic fixtures instead.

### File Encoding
NAV exports use Windows OEM codepages (typically CP850 for Western Europe). The LSP server relies on VS Code's encoding handling. `files.autoGuessEncoding: true` is configured in `.vscode/settings.json`.

### Git Hooks
Custom hooks live in `.githooks/` (not `.git/hooks/`). `core.hooksPath` is auto-configured via `npm install`. The `pre-merge-commit` hook warns on deletion reintroduction (defense-in-depth for the rebase-before-merge workflow). See `.githooks/README.md` for details and known coverage gaps.

---

## Architecture

```
├── syntaxes/              # TextMate grammar
├── src/extension.ts       # LSP client entry
├── server/src/
│   ├── lexer/             # Tokenization
│   ├── parser/            # AST generation
│   ├── types/             # Type definitions
│   ├── symbols/           # Symbol table
│   ├── visitor/           # AST visitor pattern
│   ├── trivia/            # Whitespace and comment handling
│   ├── providers/         # Base provider class
│   ├── completion/        # IntelliSense
│   ├── hover/             # Hover info
│   ├── definition/        # Go-to-definition
│   ├── references/        # Find references
│   ├── signatureHelp/     # Parameter hints
│   ├── semantic/          # Semantic highlighting
│   ├── documentSymbol/    # Document outline
│   ├── codelens/          # Code lens actions
│   └── server.ts          # LSP server entry
├── test/fixtures/         # Synthetic tests (commit these)
├── test/regression/       # Regression test cases
└── test/REAL/             # Confidential (gitignored)
```

---

## Commands

Test commands run from `server/` — check CWD first, you may already be there.

```bash
npm run compile                       # Build all (from project root)
npm run watch                         # Watch mode (from project root)
npm test                              # All tests (from server/)
npm test -- --watch                   # TDD mode
npm test -- --coverage                # Coverage
npm test -- -u                        # Update snapshots
npm run perf:quick                    # Quick benchmark
```

**TypeScript errors:** Run `npm run compile` before investigating — IDE diagnostics can be stale. Test files showing false positives for Jest globals (`describe`, `it`) are normal; verify by running the tests.

---

## Skills

Invoke before working on related areas:

| Working on... | Invoke |
|---------------|--------|
| Adding syntax/keywords | `/cal-reference` |
| Lexer/parser files | `/cal-parser-development` |
| LSP providers | `/cal-provider-development` |
| Writing tests | `/cal-dev-guide` |
| C/AL text format | `/cal-object-format` |

---

## Practices

Things we've learned:
1. **Adversarial review in PLAN phase** catches conflicting assumptions early
2. **TDD validation** — tests must fail first or the diagnosis is suspect
3. **Verify edits** — re-read files after editing; silent tool failures happen
4. **Explicit issue closure** — use `Fixes #X` in commit messages, not just `#X`
5. **Agent resume can fail** — if an agent returns nothing on resume, start it fresh with full context
6. **Show reasoning when skipping** — state what you checked and why it's safe to skip, not just "this is straightforward"; issue descriptions can be wrong, outdated, or incomplete

---

## Known Issues

**Agent Resume Failure:** Tracked in [claude-code#16861](https://github.com/anthropics/claude-code/issues/16861). If an agent returns 0 tokens on resume, retry without the resume parameter and provide full context in the prompt.
