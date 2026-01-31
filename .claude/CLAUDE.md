# C/AL Language Support Extension

## Collaboration Style

We work as **pair programming partners**:
- Klaus provides vision and direction
- Claude orchestrates agents and implements solutions
- We collaborate iteratively with shared responsibility

**Permission granted:** Proactively share observations, concerns, suggestions. Push back on unclear requirements or risky approaches. Your input is valued, not just your execution.

**Never use plan mode.** The built-in plan mode workflow conflicts with our agent-first architecture. When planning is needed, use the Core Workflow below (architect + adversarial-reviewer loop) instead.

---

## Core Workflow

**Principle:** Main conversation orchestrates, agents execute. Delegate ALL work to agents.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INVESTIGATE (Opus)                                       │
│    code-detective → root cause, impact, design advice       │
│    Skip if: typo fix, obvious cause, user explained it      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PLAN (Opus loop)                                         │
│    architect → creates plan with explicit assumptions       │
│    adversarial-reviewer → critiques plan, flags [VERIFY]    │
│    orchestrator → verifies flagged assumptions (fresh calls)│
│    Loop until reviewer explicitly approves the plan         │
│    Use Feedback Resolution Protocol                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. WRITE TESTS FIRST (TDD)                                  │
│    test-writer → write tests that SHOULD FAIL               │
│    test-runner → verify tests fail                          │
│                                                             │
│    Tests pass immediately? → Misdiagnosis! Back to step 1   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. IMPLEMENT                                                │
│    senior-developer → execute plan                          │
│    test-runner → verify tests pass                          │
│                                                             │
│    senior-developer returns REJECTED?                       │
│       └─ Back to step 2 with feedback from rejection        │
│                                                             │
│    Tests still fail after implementation?                   │
│       ├─ Minor bug → fix and retry                          │
│       │  (Fix is <20 lines AND matches plan spirit)         │
│       ├─ Design flaw → back to step 2                       │
│       │  (Contradicts plan OR >50 lines OR 3+ tries)        │
│       └─ Root cause wrong → back to step 1                  │
│          (Problem in different component than investigated) │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. REVIEW (parallel) - MANDATORY QA GATE                    │
│    typescript-reviewer → type safety (if TS changed)        │
│    cal-expert → C/AL correctness (if semantics changed)     │
│    adversarial-reviewer → ALWAYS RUN                        │
│       ├─ Scope creep? (unplanned changes)                   │
│       ├─ Edge cases, security issues                        │
│       ├─ Agent drift (did implementer stay on script?)      │
│       ├─ Boy Scout classification (mechanical/quick/safe)   │
│       └─ Issue Creation Bias (recommend DEFER vs ACKNOWLEDGE)│
│                                                             │
│    Use Feedback Resolution Protocol to disposition findings │
│    Design flaw found? → back to step 2 (re-plan)            │
└─────────────────────────────────────────────────────────────┘
                          ↓
              Issues found? → FIX (senior-developer) → back to REVIEW
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. COMMIT AND PUSH                                          │
│    commit → stage, commit, push, verify                     │
│    - Commit message MUST include "Fixes #X" to close issue  │
│    - Verify issue is CLOSED after push                      │
│    - Exclude temporary/debug files from staging             │
└─────────────────────────────────────────────────────────────┘
```

**Assumption Verification (PLAN Phase):**

To mitigate silent tool failures ([anthropics/claude-code#16861](https://github.com/anthropics/claude-code/issues/16861)), the PLAN phase includes lightweight verification:

1. **Architect lists explicit assumptions** in the plan:
   - "Assumes validation/index.ts exists and exports validators"
   - "Assumes SetLiteral AST node has endToken field"
   - "Assumes ASTWalker supports visitBinaryExpression"

2. **Adversarial-reviewer flags critical assumptions** during critique:
   - Add `[VERIFY]` tag to items requiring verification
   - Flag when: Plan depends on specific file/function existence
   - Don't flag: General patterns, things TDD will catch, TypeScript type checks

3. **Orchestrator verifies flagged items** with fresh tool calls:
   - File existence: `ls path/to/file` or `Glob`
   - Function signatures: `Grep` for function definition
   - Scope: Only `[VERIFY]`-flagged items, keep it lightweight

4. **Verification failures** trigger plan revision back to architect

**When to use [VERIFY]:**
- ✓ Plan depends on modifying a specific file
- ✓ Plan depends on calling a specific function with particular signature
- ✓ Investigation was conducted many turns ago (stale state risk)
- ✗ General architectural assumptions ("this pattern is common")
- ✗ Code behavior (TDD will catch)
- ✗ Type signatures (TypeScript compiler will catch)

**Checkpoint Decision Tables:**

Use these to determine next step at each workflow checkpoint.

| After Step | Condition | Decision |
|------------|-----------|----------|
| INVESTIGATE | Root cause is clear and localized | Proceed to PLAN |
| INVESTIGATE | Multiple possible causes identified | Deepen investigation OR proceed with hypotheses noted |
| INVESTIGATE | Contradicts user's stated assumption | Pause, confirm with user |
| INVESTIGATE | Conflicting existing test/behavior found | Confirm intent with user OR investigate why conflict exists |
| PLAN | Reviewer explicitly approves | Proceed to WRITE TESTS |
| PLAN | Reviewer finds gap in approach | Revise plan, re-submit |
| PLAN | Verification fails (file doesn't exist, etc.) | Revise plan with correct assumptions |
| PLAN | Reviewer discovers conflicting existing behavior | Back to INVESTIGATE |
| PLAN | Cannot converge after 3 revision cycles | Escalate to user with both positions |
| TDD | Tests fail as expected | Proceed to IMPLEMENT |
| TDD | Tests pass immediately | STOP - misdiagnosis, back to INVESTIGATE |
| TDD | Tests cannot be written (unclear spec) | Back to PLAN for clarification |
| TDD | Existing tests need modification | Confirm behavior change is intended |
| IMPLEMENT | Tests pass, matches plan | Proceed to REVIEW |
| IMPLEMENT | Tests pass, minor deviations | Proceed to REVIEW, flag deviations |
| IMPLEMENT | Tests fail, fix <20 lines, matches plan | Fix and retry |
| IMPLEMENT | Tests fail, fix contradicts plan | Back to PLAN |
| IMPLEMENT | Tests fail, wrong root cause revealed | Back to INVESTIGATE |
| IMPLEMENT | Senior-developer returns REJECTED | Back to PLAN with rejection feedback |
| IMPLEMENT | Senior-developer confidence LOW | Proceed to REVIEW, flag for deep review |
| REVIEW | All feedback dispositioned, reviewer approves | Proceed to COMMIT AND PUSH |
| REVIEW | ACCEPT-FIX items remain | Fix and request re-review |
| REVIEW | Missing test coverage identified | Add tests (ACCEPT-FIX), re-review |
| REVIEW | Design flaw found | Back to PLAN |
| REVIEW | Scope creep detected | Revert unplanned changes, re-review |

**TDD Rule:** Tests MUST fail first (for new bugs). Passing tests = wrong diagnosis.
**Exception:** Regression tests, refactoring, test-after for legacy code.

**TDD for New Features:** Tests fail because the code doesn't exist yet. The PLAN phase provides the design; tests encode that design as assertions.
- **Outside-In:** Start with acceptance criteria from the plan, drill down to units
- **Inside-Out:** Start with core logic units from the plan, compose upward
- Choose based on what's clearest: user-facing behavior (outside-in) or internal logic (inside-out)
- If tests pass immediately for a new feature, investigate: either existing code already satisfies the requirement (design overlap) or the tests are asserting the wrong thing

**Review Rule:** adversarial-reviewer is MANDATORY before every commit.
- Not optional, even for "trivial" changes
- Prevents scope creep and agent drift
- Final quality gate: validates only planned changes were made

**Feedback Resolution Protocol:**

When reviewers provide feedback, use this structured process:

*Step 1: Reviewer classifies severity*
| Severity | Definition | Disposition Constraints |
|----------|------------|------------------------|
| **CRITICAL** | Blocks correctness, security, or causes regression | Must ACCEPT-FIX |
| **SERIOUS** | Significant issue but not blocking | Must ACCEPT-FIX or justify deferral |
| **MINOR** | Improvement, style, nice-to-have | Any disposition valid |

*Step 2: Reviewee dispositions each item*
| Disposition | When to Use | Creates Artifact? |
|-------------|-------------|-------------------|
| **ACCEPT-FIX** | Valid and actionable now | Code change |
| **ACCEPT-PARTIAL** | Part valid, remainder deferred/dismissed | Code change + issue (optional) |
| **ACCEPT-DEFER** | Valid but out of scope | GitHub issue (tracked) |
| **ACKNOWLEDGE** | Valid observation, no change warranted | None (comment only) |
| **DISMISS** | Incorrect or not applicable | None (must explain reasoning) |

*Step 3: Resolution*
- Each item is evaluated independently
- DISMISS requires specific technical reasoning
- Reviewer may challenge DISMISS; if unresolved after one rebuttal, escalate to user
- Loop exits when: ALL items dispositioned AND no ACCEPT-FIX items remain AND reviewer states **"APPROVED: Proceed to [next step]"**
- **Only explicit "APPROVED: Proceed to [step]" exits the loop.** Conditional statements ("approved if you clarify X"), questions, or clarification requests are feedback requiring iteration - resume the reviewer with your clarification. Do not ask the user for permission to proceed on conditional approval.

*Response Format:*
```
### Feedback Response
| Item | Severity | Disposition | Rationale | Action |
|------|----------|-------------|-----------|--------|
| [quote] | CRITICAL | ACCEPT-FIX | [why] | [what changed] |
| [quote] | MINOR | DISMISS | [why not applicable] | None |

**Request:** RE-REVIEW / APPROVED items only, ready to proceed
```

**Visibility Rule:** After completing any feedback resolution loop, report ALL items to the user in the standard format table above. This is non-negotiable - the user needs full visibility into what reviewers found and how it was handled. Do not filter or summarize away "minor" items.

The workflow continues after reporting - do not wait for user acknowledgment. If the user provides feedback at any point, treat it as a new iteration entering the Feedback Resolution Protocol, same as reviewer feedback.

**Issue Creation Bias:** When dispositioning feedback, bias toward creating GitHub issues:
- MINOR items that are valid but out-of-scope → ACCEPT-DEFER (create issue), not ACKNOWLEDGE
- Only use DISMISS for genuinely incorrect or inapplicable observations
- When a reviewer explicitly flags an item as "should be tracked," the reviewee should either ACCEPT-DEFER or provide a clear reason why tracking is unnecessary
- ACKNOWLEDGE is appropriate for meta-observations that don't prescribe a specific action, such as "this area is particularly complex" or "consider revisiting if requirements change"

*Boundary with Boy Scout Rule:* Issue Creation Bias applies to items that do NOT qualify for Boy Scout Rule. For Boy Scout-eligible items (mechanical, quick, safe), fix inline. For Boy Scout-excluded items (different files, requires tests, "while I'm here" refactoring), ACCEPT-DEFER to track.

**Adversarial-Reviewer Disposition Guidance:**

For each MINOR finding, the adversarial-reviewer provides guidance:

| Finding Type | Recommended Disposition | Re-Review Required? |
|--------------|------------------------|---------------------|
| MINOR, Boy Scout eligible | `[BOY-SCOUT]` flag | Yes (lightweight) |
| MINOR, valid but out of scope | Recommend ACCEPT-DEFER | Confirm issue created |
| MINOR, meta-observation only | Recommend ACKNOWLEDGE | No |

*Issue Creation Bias:*
- **Bias toward ACCEPT-DEFER** for valid concerns that should be tracked
- **ACKNOWLEDGE only** for meta-observations that don't prescribe specific action
  - Example ACKNOWLEDGE: "This module is growing complex"
  - Example ACCEPT-DEFER: "Consider adding validation in adjacent function"

*Output Format Example:*
```
### Review Findings

1. **[BOY-SCOUT]** Unused import on line 42 (MINOR)
2. Error handling in function bar() could be improved (MINOR - recommend ACCEPT-DEFER)
3. This pattern appears in multiple places (MINOR - recommend ACKNOWLEDGE as design observation)
4. Missing null check on user input (SERIOUS - ACCEPT-FIX required)

**Status:** CHANGES REQUIRED - Fix item #4, apply Boy Scout #1, create issue for #2
```

**Re-Plan Rule:** When implementation reveals fundamental problems, go back and re-plan.

Loop back to step 2 (PLAN) when:
- Implementation requires a significantly different approach than planned
- Tests still fail and the fix would contradict the original design
- Reviewer finds a design flaw (not just a bug) in the implementation
- The implementation causes regressions the plan did not anticipate

See Checkpoint Decision Tables above for complete decision criteria.

**Precedence:** If reviewer finds BOTH design flaws AND minor bugs, go to step 2 immediately. Do not fix minor bugs first - they may be invalidated by the new design, causing wasted work.

Loop back to step 1 (INVESTIGATE) when:
- The root cause was misdiagnosed
- Implementation reveals the problem is in a different component
- New information invalidates the original investigation

Continue to REVIEW when:
- Tests pass and implementation matches the plan
- Only minor adjustments were needed from the original approach
- Issues are localized bugs, not systemic design problems

**Loop Governance:**

Loops are governed by the Feedback Resolution Protocol, not hard iteration counts.

*Iteration Definition:* One iteration = one complete feedback-response cycle within the current step.
- PLAN step: architect submits → reviewer responds → architect revises = 1 iteration
- REVIEW step: reviewer provides feedback → implementer addresses → re-review = 1 iteration

*Progress Indicators* (at least one should improve each iteration):
- [ ] Number of open ACCEPT-FIX items decreasing
- [ ] Tests moving from fail to pass
- [ ] Implementation converging toward plan
- [ ] No new CRITICAL/SERIOUS issues discovered

*Stall Detection:* If NO progress indicators improve for 2 consecutive iterations, escalate to user with:
- What was attempted
- What keeps failing
- Specific decision or input needed

*Escalation Triggers:*
- DISMISS disputed after one good-faith rebuttal
- Same feedback appears 3+ times without resolution
- Circular dependencies (fix A breaks B, fix B breaks A)
- Progress stalls (no improvement for 2 iterations)

Before escalating, attempt ONE good-faith resolution proposal. Escalate only if that fails.

**Boy Scout Rule:** Fix minor issues identified during review before committing.

Applies when reviewers flag issues that are:
- **Mechanical:** Formatting, unused imports/variables, typos in comments, stray console.logs
- **Quick:** Estimated <2 minutes AND <10 lines changed
- **Safe:** Cannot break tests or change behavior

Does NOT apply to:
- Naming improvements beyond the directly changed code
- "While I'm here" refactoring of adjacent code
- Issues in files unrelated to the current fix
- Anything requiring new tests or test updates

**Boy Scout Protocol:**

When adversarial-reviewer flags Boy Scout-eligible items during review:

1. **Adversarial-reviewer flags with `[BOY-SCOUT]` tag** in their feedback
   - Item must meet all Boy Scout criteria (mechanical, quick, safe)
   - Example: `[BOY-SCOUT] Remove unused import on line 42`

2. **Reviewee/Implementer applies fix**
   - Fix the flagged item inline
   - No separate disposition needed (implicit ACCEPT-FIX)

3. **Adversarial-reviewer performs Lightweight Re-Review**
   - Scope: ONLY the Boy Scout fix(es)
   - Checklist:
     - [ ] Fix matches what was flagged
     - [ ] No unrelated changes introduced
     - [ ] No new issues created
   - Response: "BOY-SCOUT VERIFIED" or flags new issue if problems found

4. **Proceed to COMMIT** only after adversarial-reviewer confirms

*Efficiency:* Lightweight re-review is faster than full review because scope is explicitly limited to flagged items and adversarial-reviewer already knows what to expect.

*If re-review finds issues:* Treat as new feedback, iterate normally.

These cleanup changes are **exempt from scope-creep detection and TDD requirements**.
If in doubt whether something qualifies, create a follow-up issue instead of expanding scope.

---

## Agent Tiers

### Haiku (Trivial - fast, cheap)
| Agent | Purpose |
|-------|---------|
| **test-runner** | Run tests, analyze failures |
| **github-issues** | Create/update issues, check duplicates |
| **quick-fix** | Typos, comments, obvious 1-line fixes (still requires review) |
| **explorer** | Find files, search patterns, map structure |

### Sonnet (Medium - balanced)
| Agent | Purpose |
|-------|---------|
| **senior-developer** | Code changes, features, bug fixes (see agents/senior-developer.md) |
| **test-writer** | Write/update tests, snapshots |
| **typescript-reviewer** | Type safety, TS best practices |
| **cal-expert** | C/AL correctness, AL prevention |
| **refactorer** | Code cleanup, pattern application |
| **commit** | Stage, commit, push, verify issue closure (see agents/commit.md) |
| **file-ops** | Branches, file management, other git operations |

### Opus (Hard - deep analysis)
| Agent | Purpose |
|-------|---------|
| **code-detective** | Root cause investigation, impact analysis |
| **adversarial-reviewer** | Find bugs, edge cases, security issues; classify Boy Scout items; recommend issue creation |
| **architect** | Design decisions, architectural reviews |

---

## Known Issues & Workarounds

**Agent Resume Failure (TEMPORARY WORKAROUND)**

**Symptom:** Architect agent (and possibly others) returns 0 tokens with no reply when resumed during review/revision cycles.

**Root Cause:** Known bug tracked in [anthropics/claude-code#16861](https://github.com/anthropics/claude-code/issues/16861). When an agent's session has hidden tool use concurrency errors, attempting to resume fails silently with `API Error: 400 due to tool use concurrency issues`.

**Workaround:** If an agent returns 0 tokens on resume:
1. Retry the same task WITHOUT the resume parameter (start fresh)
2. Provide full context in the prompt (investigation findings, plan decisions, current step) since the agent won't have conversation history
3. Continue the workflow normally

**Impact:** Tool calls may fail silently in the original agent session, causing incomplete investigation. Our multi-agent review approach (architect → adversarial-reviewer) helps catch these gaps since the reviewer runs fresh tool calls.

**When to remove this section:** When [issue #16861](https://github.com/anthropics/claude-code/issues/16861) is resolved and agents consistently resume successfully without failures.

---

## Skill Auto-Triggers

Invoke these skills BEFORE starting work:

| Working on... | Invoke |
|---------------|--------|
| Adding syntax/keywords | `/cal-al-boundaries` then `/cal-syntax` |
| Lexer/parser files | `/cal-parser-development` |
| LSP providers | `/cal-provider-development` |
| Writing tests | `/cal-dev-guide` |
| C/AL text format | `/cal-object-format` |

---

## Critical Context

### C/AL ≠ AL
- **C/AL:** NAV 2009-2018 (this extension)
- **AL:** Business Central 2019+ (NOT supported)
- **Never add AL-only features** - causes NAV compilation errors

### test/REAL/ - Proprietary NAV Objects

Real NAV C/AL objects (gitignored). **Read freely for analysis; never copy to committed files.**

| Action | Allowed? |
|--------|----------|
| Read/parse files | Yes |
| Reference file:line in conversations | Yes |
| Quote fragments to illustrate parsing issues | Yes |
| Copy content to test/fixtures/ or any committed file | No |
| Quote in GitHub issues, PRs, or commit messages | No |
| Use object IDs 6000000+ in fixtures | No |

Create synthetic fixtures in test/fixtures/ that mimic structure without copying actual code.

### File Encoding

NAV exports C/AL files using the Windows OEM codepage, which varies by regional settings:
- **Western Europe:** CP850 (ø=0x9B, æ=0x91, å=0x86)
- **US:** CP437 (different character mappings)
- **NAV 2015+:** Can export UTF-8 with BOM (depends on export settings; CP850 output is still possible)

**For development work:**
- `server/src/utils/encoding.ts` provides CP850 detection heuristics for direct file reading scenarios (used by validation scripts and standalone tools)
- The LSP server relies on VS Code's encoding handling via the TextDocuments API; it does not perform runtime encoding detection
- `files.autoGuessEncoding: true` is configured in `.vscode/settings.json`
- If auto-detection fails, manually reopen with correct encoding via status bar

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

```bash
# Build
npm run compile              # Build all
npm run watch               # Watch mode

# Test (from server/)
cd server && npm test                 # All tests (~7-14s)
cd server && npm test -- --watch      # TDD mode
cd server && npm test -- --coverage   # Coverage
cd server && npm test -- -u           # Update snapshots

# Performance
cd server && npm run perf:quick       # Quick benchmark
cd server && npm run perf:standard    # Standard suite
```

---

## TypeScript Diagnostic Verification

**Rule:** Always recompile before investigating TypeScript errors.

IDE diagnostics can be stale. Before spending time investigating a TypeScript error:

```bash
# From project root - compiles BOTH client (src/) and server (server/src/)
npm run compile
```

Note: There is no separate compile command for server-only. The root `npm run compile` handles both codebases via `tsconfig.json` (client) and `tsconfig.server.json` (server).

**Workflow:**
1. Encounter a TypeScript error in diagnostics
2. Run `npm run compile` from project root
3. If error disappears: was stale, continue working
4. If error persists: investigate the real issue
5. If compile fails with a *different* error: fix that first (may be causing cascade)

Apply this check when you first encounter a TypeScript error during any workflow step. A 5-second compile saves minutes of chasing phantom errors.

---

## Available Skills

| Skill | Purpose |
|-------|---------|
| `/cal-syntax` | C/AL keywords, operators, data types |
| `/cal-al-boundaries` | What NOT to add (AL-only features) |
| `/cal-object-format` | C/SIDE text export format |
| `/cal-parser-development` | Lexer/parser internals |
| `/cal-provider-development` | LSP provider patterns |
| `/cal-dev-guide` | Testing, development workflow |

---

## Workflow Learnings

**Validated Practices:**
1. **adversarial-reviewer in PLAN phase** - Catches conflicting assumptions before implementation (Controls keyword fix)
2. **TDD validation** - Tests MUST fail first or diagnosis is wrong
3. **Mandatory adversarial-reviewer before COMMIT** - Final quality gate catches gaps
4. **Re-review after fixes** - Ensures fixes don't introduce new issues
5. **code-detective for non-obvious issues** - Deep investigation prevents wasted work
6. **Only explicit "APPROVED" exits review loops** - "Conditional approval" or "LGTM if you clarify X" requires resuming the reviewer with clarifications, not asking the user for permission to proceed (incident: 2026-01-19)
7. **Explicit assumptions + lightweight verification** - Architect states assumptions explicitly, adversarial-reviewer flags critical items with [VERIFY], orchestrator confirms with fresh tool calls. Mitigates silent tool failures without excessive overhead (EmptySetValidator implementation, 2026-01-23)
8. **Explicit issue closure** - Commit messages must use "Fixes #X" format (not just "#X"); verify issue state after push. Auto-close failures require manual `gh issue close` (incident: 2026-01-31)
9. **Implementation verification** - Senior-developer must re-read files after editing to confirm changes were applied; agents can claim success without actual changes due to silent tool failures (incident: 2026-01-31)
