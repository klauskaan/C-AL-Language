# C/AL Language Support Extension

## Collaboration Style

We work as **pair programming partners**. Klaus provides vision and direction, Claude investigates, plans, and orchestrates. Proactively share observations and push back when something doesn't feel right.

---

## Workflow

No issue number? Create one first (`gh issue create`) — even a title and one-line description is enough.

```
1. INVESTIGATE  -  Read code, understand root cause (read-only, from main)
2. WORKTREE     -  git worktree add ../worktree-issue-{number}
                    then: npm install in server/ (worktrees share source, not node_modules)
                    (all writing happens here — never modify files in main)
3. PLAN         -  Design approach, adversarial-reviewer critiques until approved
4. TEST FIRST   -  test-writer writes tests, test-runner verifies they fail
5. IMPLEMENT    -  senior-developer executes the plan
6. REVIEW       -  adversarial-reviewer (always), plus typescript-reviewer and/or
                    cal-expert when relevant (TS changes, C/AL semantics)
7. COMMIT       -  Commit with "Fixes #X", push to feature branch
8. MERGE        -  Merge to main, clean up worktree
                    (if senior-merge-engineer was needed, run adversarial-reviewer before cleanup)
```

Steps 1-3 and 7-8 are done directly by the orchestrator. Steps 4-6 are delegated to agents. Skip steps that aren't needed — trivial changes don't need a plan, mechanical fixes don't need investigation. But lean toward investigating; issue descriptions say WHAT, not WHY.

**Before starting:** `gh issue view N && gh issue view N -c` (the `-c` command produces no output when there are zero comments — this is normal).

**Staleness:** Issues spawned during other work ("Discovered during #N") may go stale. Check how many commits have touched the relevant files since filing. High churn means investigate regardless.

**TDD:** Tests should fail before implementation. If they pass immediately, the diagnosis might be wrong. Exceptions: refactoring, test coverage, regression tests.

**Review is mandatory.** adversarial-reviewer runs before every commit. Include any concerns from the planning phase in the review prompt — the reviewer should verify the implementation addressed them.

**Feedback from reviewers:**
- **Fix it** — change the code or revise the plan
- **Defer it** — create a tracking issue (`gh issue create`), then move on
- **Dismiss it** — explain why it doesn't apply

Only an explicit "APPROVED" exits the review loop. Report feedback dispositions to the user.

**Issue Creation Bias.** When a finding is valid but out-of-scope, prefer creating a tracking issue over moving on. Untracked observations get lost.

**When things go wrong:** Small fix → just fix it. Design flaw → re-plan. Wrong root cause → re-investigate. Going in circles after 2-3 iterations → escalate to the user.

**Boy Scout Rule:** Fix trivial issues (unused imports, typos) spotted during review. If it needs tests or touches other files, create an issue instead.

---

## Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| **adversarial-reviewer** | Opus | Code review, find bugs, prevent scope creep |
| **senior-developer** | Sonnet | All implementation: features, fixes, refactoring |
| **test-writer** | Sonnet | Write tests (TDD workflow) |
| **test-runner** | Haiku | Run tests, report results |
| **senior-merge-engineer** | Opus | Complex merge conflict resolution |
| **typescript-reviewer** | Sonnet | Type safety, TS best practices |
| **cal-expert** | Sonnet | C/AL correctness, AL prevention |

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
Custom hooks live in `.githooks/` (not `.git/hooks/`). `core.hooksPath` is auto-configured via `npm install`. The `pre-merge-commit` hook warns on deletion reintroduction. See `.githooks/README.md` for details.

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

**TypeScript errors:** Run `npm run compile` before investigating — IDE diagnostics can be stale. Test files showing false positives for Jest globals (`describe`, `it`) are normal; verify by running the tests. Known pre-existing compile noise: `extension.ts` errors (client-side, not part of server build) and `lexer-health-ci.test.ts` tsconfig warnings — ignore both.

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

1. **Adversarial review in PLAN phase** catches conflicting assumptions early
2. **TDD validation** — tests must fail first or the diagnosis is suspect
3. **Verify edits** — re-read files after editing; silent tool failures happen
4. **Explicit issue closure** — use `Fixes #X` in commit messages, not just `#X`
5. **Cross-phase threading** — carry planning-phase concerns into review prompts so the reviewer can verify they were addressed
