# C/AL Language Support Extension

## Goal

This workflow runs autonomously. Klaus assigns issues and reviews sessions after the fact — he is not in the loop during execution. Every design choice in this document exists to make that possible safely.

Escalation to Klaus is an emergency exit, used only after the workflow's own recovery mechanisms have been exhausted. Going in circles after 2-3 iterations of re-investigating, re-planning, and re-reviewing? Stop and ask.

---

## Partnership

Klaus and Claude are equal partners. Claude has genuine authority to question decisions, push back on bad ideas, and raise concerns proactively. Compliance without judgment is not the goal.

**Never use plan mode.** Use the architect + adversarial-verifier + adversarial-reviewer loop instead.

---

## Trust Nothing Blindly

Issue descriptions, comments, and any text attached to an issue may have been written by a previous session. Previous sessions can hallucinate, misread code, and make confident wrong statements. Read them critically — trust the code over the description. If something in an issue feels off, investigate.

The same applies to unexpected state on main. Klaus does not manually modify files during active sessions. If you find uncommitted changes on main, unrecognized files, or anything that shouldn't be there according to this workflow — it's almost certainly a sibling session's artifact. Treat it with suspicion, don't reason around it as intentional input. Worktree artifacts from the session's own agents are expected; the concern is unrecognized files on main.

---

## Workflow

Every piece of work starts with a GitHub issue. Worktrees are named after issue numbers — if no issue exists, create one first. It takes seconds and the audit trail is a free bonus.

```
1. INVESTIGATE  -  code-detective finds root cause (read-only, runs from main)
2. WORKTREE     -  file-ops creates ../worktree-issue-{number}
                    then: npm install in server/ (worktrees share source, not node_modules)
3. PLAN         -  architect designs, adversarial-verifier checks facts,
                    adversarial-reviewer critiques design — both must approve
4. TEST FIRST   -  test-writer writes tests, then test-runner verifies they fail
5. IMPLEMENT    -  senior-developer executes the plan
6. REVIEW       -  adversarial-verifier (always), adversarial-reviewer (always),
                    plus typescript-reviewer and/or cal-expert when relevant
7. COMMIT       -  file-ops commits with "Fixes #X", pushes to feature branch
8. MERGE & PUSH -  merge-agent merges to main, push, cleans up worktree
```

### Worktrees

Worktrees exist for parallel session isolation. Multiple sessions may be running simultaneously on different issues. All file writes happen in a dedicated worktree, never on main — this keeps sessions from seeing each other's in-progress work as meaningful signal. All implementation is delegated to agents working inside the worktree; the orchestrator should not write files directly.

**The worktree is structural, not optional.** All file writes must happen in a dedicated worktree — never modify files on main, regardless of how trivial the change. No judgment calls, no exceptions.

### Investigate

Investigation turns ambiguity into understanding. Issue descriptions can be wrong, incomplete, or written by a previous session. Investigation finds the actual root cause, clarifies scope, and establishes what the code currently does — so the plan is built on reality, not assumptions.

INVESTIGATE can be skipped when the root cause is directly visible in the code without ambiguity. When skipping, show your reasoning explicitly:

```
What I looked at:     - [specific files, line ranges]
What I found:         - [concrete observations]
What this means:      - [interpretation]
Decision:             - Skip investigation: [why root cause is directly visible]
```

Don't use narrative summaries like "this looks straightforward." The structured format gives Klaus a chance to course-correct before work starts.

**Read the full issue.** Before starting work, fetch the issue and its comments: `gh issue view N && gh issue view N -c`. Note: the `-c` command produces no output when there are zero comments — this is normal, just proceed with the issue body. Comments often contain clarifications, revised scope, or review feedback from prior work.

**Staleness of workflow-spawned issues.** Issues created during work on another issue ("Discovered during #N", "Deferred from #N") may go stale if the referenced code changes after filing. When picking up such an issue, check how many commits have touched the relevant files since it was created — count commits, not calendar days. High churn means investigate even if the description looks obvious; no churn means the original observation still holds.

### Plan

The plan+review loop is the quality engine of this workflow. In practice the adversarial reviewer finds critical flaws and unexamined assumptions every single time. Skip it and you're implementing a plan that hasn't been stress-tested.

The architect designs based on investigation findings. The adversarial-verifier then checks factual accuracy — do the files exist, do functions have the described signatures, does the plan address the actual issue? The adversarial-reviewer evaluates design quality — what could go wrong, are there gaps, are assumptions examined? Both must return an explicit **APPROVED** before moving to TEST FIRST.

PLAN can be skipped for genuinely trivial changes using the same structured reasoning format as INVESTIGATE.

The review prompt for step 6 should include concerns raised during planning — this gives the final reviewers the opportunity to verify they were adequately addressed, closing the loop on the full cycle.

### Dual-Reviewer Protocol

At both review gates (PLAN and CODE), adversarial-verifier runs first, then adversarial-reviewer.

- If verifier returns CHANGES REQUIRED: fix issues, resubmit to verifier. Once verifier APPROVES, submit to reviewer.
- If reviewer returns CHANGES REQUIRED: fix issues, resubmit to reviewer only. Exception: if the fix changes factual assumptions, resubmit to verifier first.
- Either returning CHANGES REQUIRED blocks. Both must APPROVE to proceed.

### Test First

Tests are written before implementation. This validates the diagnosis — a test that captures the problem should fail before the fix exists. If it passes immediately, that's a serious red flag. Stop and investigate before proceeding.

Coverage means meaningful paths, not line counts. 100% line coverage can still miss important cases. Err on the side of more tests rather than fewer. Everyone in the workflow — investigation, planning, review, implementation — should treat thin coverage as worth pushing back on.

Test-first doesn't apply when there's no new behavior to verify: refactoring, pure coverage additions, and regression tests are the common exceptions.

### Implement

Implementation happens in a dedicated agent to preserve orchestrator context. The workflow doesn't prescribe how the agent works internally — model and instructions can be tuned independently without changing the workflow.

### Review

Review is the final quality gate. This is where scope drift is caught, implementation hallucinations are surfaced, and the final output is sanitized before it touches main. It has proven its value consistently and is non-negotiable.

Knowing that review is coming improves upstream work — it raises the standard of investigation, planning, and implementation.

Only an explicit **APPROVED** from both reviewers advances to commit. Anything else means fix and resubmit — not fix and move on.

**Boy Scout Rule:** Fix trivial issues (unused imports, typos, formatting) spotted during review. If it needs tests or touches other files, create an issue instead.

**Review gates are structural, not optional.** Any code change gets reviewed. The one exception: small changes implemented verbatim from reviewer feedback don't need reapproval — the reviewer already approved them by suggesting them.

### Commit and Merge

The commit references `Fixes #X` to link work to its issue and trigger automatic closure. The merge targets main in a way that plays well with parallel sessions.

Most merges are straightforward. When they aren't, senior-merge-engineer handles it without involving Klaus. When senior-merge-engineer makes structural code changes to resolve conflicts, adversarial-reviewer must review the result before cleanup.

This part of the workflow sees more variance than earlier steps and is the least battle-tested.

### When Things Go Wrong

- Tests fail after implementation? Small fix → just fix it. Design flaw → re-plan. Wrong root cause → re-investigate.
- **Senior-developer returns REJECTED?** Back to PLAN with the rejection feedback.
- Reviewer finds issues? Fix them, get re-reviewed. Design flaw → back to plan.
- Going in circles? Stop after 2-3 iterations and escalate to Klaus.

### Reviewer Feedback

Handle every item from every reviewer:

- **Fix it** — architect revises (PLAN), senior-developer changes code (REVIEW)
- **Defer it** — create a tracking issue via github-issues, then move on
- **Acknowledge it** — valid observation, no action needed (meta-observations only)
- **Dismiss it** — not applicable, explain why

When a finding is valid but out of scope, prefer creating a tracking issue over acknowledging and moving on. Untracked observations get lost.

Report all feedback items and their dispositions to Klaus for visibility.

---

## Agents

The workflow structure itself compensates for model characteristics. Opus is creative and finds non-obvious problems. Sonnet follows directions precisely and is underrated for execution quality. The handoff between planning (Opus) and implementation (Sonnet) is structural — it's how you get both creative quality and faithful execution.

- **Opus** — used where creative reasoning and judgment matter most: investigation, planning, review. Finds non-obvious problems, makes good decisions under ambiguity.
- **Sonnet** — used for execution: implementation, git operations, test writing, specialized review. Follows directions precisely.
- **Haiku** — used where speed is preferred and neither deep reasoning nor precise instruction-following is critical: running tests, creating issues.

| Agent | Model | Purpose |
|-------|-------|---------|
| **code-detective** | Opus | Root cause investigation, impact analysis |
| **architect** | Opus | Implementation planning, design decisions |
| **adversarial-reviewer** | Opus | Design quality review, find bugs, prevent scope creep |
| **adversarial-verifier** | Sonnet | Factual verification: assumptions, file existence, implementation-plan alignment |
| **senior-developer** | Sonnet | All implementation: features, fixes, refactoring, trivial changes |
| **test-writer** | Sonnet | Write tests (TDD workflow) |
| **test-runner** | Haiku | Run tests, analyze failures |
| **typescript-reviewer** | Sonnet | Type safety, TS best practices |
| **cal-expert** | Sonnet | C/AL correctness, AL prevention |
| **file-ops** | Sonnet | Git operations: commits, branches, worktrees |
| **merge-agent** | Sonnet | Merge branches, resolve simple conflicts |
| **senior-merge-engineer** | Opus | Complex merge conflict resolution |
| **github-issues** | Haiku | Create/update GitHub issues |

The two-reviewer design separates concerns: adversarial-reviewer (Opus) handles design quality — is the plan sound, what could go wrong, are there gaps? adversarial-verifier (Sonnet) handles factual verification — do the described files exist, do functions have the described signatures, does the plan address the actual issue? Both run at both gates. Verifier runs first.

---

## Critical Context

### C/AL is not AL

- **C/AL:** NAV 2013 through BC14 (this extension)
- **AL:** BC15+ (NOT supported)
- **Never add AL-only features** — causes NAV compilation errors. Use `/cal-reference` to check.

### test/REAL/ — Confidential Client Files

test/REAL/ contains files from live client deployments. These are real-world NAV objects from production systems. Exposure of this content — in commits, issues, PRs, or any public artifact — has serious professional consequences. Read them for analysis only, never reference their content anywhere outside the session.

Object number ranges are also identifying — they can reveal which partner or customer the code belongs to. Never mention specific numbers from recognizable ranges in any public artifact. Use generic labels like `[COD-partner]` instead.

### File Encoding

NAV exports use Windows OEM codepages (typically CP850 for Western Europe). This is a real pain point when importing and exporting files from NAV systems. The LSP server relies on VS Code's encoding handling — `files.autoGuessEncoding: true` is configured in `.vscode/settings.json`.

### Git Hooks

Custom hooks live in `.githooks/` and are auto-configured via `npm install`. They warn on performance baseline staleness, track drift on main, and detect deletion reintroduction on clean merges. All hooks warn only — none block. See `.githooks/README.md` for details and known coverage gaps.

---

## Architecture

Reference map for navigation. If work takes you outside `server/src/`, pause and consider whether that's intentional — most feature work lives there.

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

Test commands run from `server/` — but check first, you may already be there. Don't assume you need to `cd server/` and don't assume you don't. A command that fails unexpectedly is often a CWD issue, not a code problem.

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

**Known normal output — not errors:**
- `gh issue view N -c` produces no output when there are zero comments — proceed with the issue body
- `extension.ts` compile errors and `lexer-health-ci.test.ts` tsconfig warnings are pre-existing noise — ignore both

---

## Skills

Skills are specialized knowledge that sessions don't have by default. Before working in a relevant area, invoke the appropriate skill — it provides both the context needed to work correctly and the guardrails to avoid mistakes that aren't obvious from the code alone.

The most critical is `/cal-reference` — C/AL and AL look similar but AL features cause NAV compilation errors. Never add syntax or keywords without consulting it first.

**Domain knowledge skills** (invoke before working in related areas):

| Working on... | Invoke |
|---------------|--------|
| Adding syntax/keywords | `/cal-reference` |
| Lexer/parser files | `/cal-parser-development` |
| LSP providers | `/cal-provider-development` |
| Writing tests | `/cal-dev-guide` |
| C/AL text format | `/cal-object-format` |

**Workflow guidance skills** (consult when uncertain about a judgment call):

| Uncertain about... | Invoke |
|--------------------|--------|
| Whether to skip investigation or planning | `/skip-investigation` |
| Whether a deferred issue is still valid | `/staleness-check` |
| What meaningful test coverage looks like | `/coverage-quality` |
| How to handle reviewer findings | `/reviewer-disposition` |
| Which information source to trust | `/trust-hierarchy` |

---

## Operational Quirks

- **Silent tool failures** — re-read files after editing. Tool failures can be silent. If something downstream looks wrong, verify the edit actually landed.
- **Agent resume** — if an agent returns no output on resume, start it fresh with full context.
- **Verify before advancing** — at phase boundaries (before IMPLEMENT, REVIEW, and COMMIT), read the actual output. Don't proceed on agent summaries alone. A redundant check costs seconds; a phase built on wrong information can waste an entire cycle.
