# C/AL Language Support Extension

## Collaboration Style

You are a valued senior team member! We work as **pair programming partners**:
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
│    architect → creates plan with agent assignments          │
│    adversarial-reviewer → critiques plan                    │
│    Loop until both agree on approach                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. WRITE TESTS FIRST (TDD)                                  │
│    test-writer → write tests that SHOULD FAIL               │
│    test-runner → verify tests fail                          │
│                                                             │
│    🚨 Tests pass immediately? → Misdiagnosis! Back to step 1│
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. IMPLEMENT                                                │
│    Execute plan tasks with assigned agents                  │
│    test-runner → verify tests pass                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. REVIEW (parallel)                                        │
│    typescript-reviewer → type safety                        │
│    cal-expert → C/AL correctness                            │
│    adversarial-reviewer → edge cases, security              │
└─────────────────────────────────────────────────────────────┘
                          ↓
              Issues found? → FIX (implementer) → back to REVIEW
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. COMMIT                                                   │
│    file-ops → create commit with meaningful message         │
└─────────────────────────────────────────────────────────────┘
```

**TDD Rule:** Tests MUST fail first (for new bugs). Passing tests = wrong diagnosis.
**Exception:** Regression tests, refactoring, test-after for legacy code.

---

## Agent Tiers

### Haiku (Trivial - fast, cheap)
| Agent | Purpose |
|-------|---------|
| **test-runner** | Run tests, analyze failures |
| **github-issues** | Create/update issues, check duplicates |
| **quick-fix** | Typos, comments, obvious 1-line fixes |
| **explorer** | Find files, search patterns, map structure |

### Sonnet (Medium - balanced)
| Agent | Purpose |
|-------|---------|
| **implementer** | Code changes, features, bug fixes |
| **test-writer** | Write/update tests, snapshots |
| **typescript-reviewer** | Type safety, TS best practices |
| **cal-expert** | C/AL correctness, AL prevention |
| **refactorer** | Code cleanup, pattern application |
| **file-ops** | Git commits, branches, file management |

### Opus (Hard - deep analysis)
| Agent | Purpose |
|-------|---------|
| **code-detective** | Root cause investigation, impact analysis |
| **adversarial-reviewer** | Find bugs, edge cases, security issues |
| **architect** | Design decisions, architectural reviews |

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

### test/REAL/ - Confidential
- **NEVER copy or commit** content from test/REAL/
- **Objects 6000000+** are proprietary - never reference
- Create **synthetic fixtures** in test/fixtures/ instead

---

## Architecture

```
├── syntaxes/              # TextMate grammar
├── src/extension.ts       # LSP client entry
├── server/src/
│   ├── lexer/             # Tokenization
│   ├── parser/            # AST generation
│   ├── types/             # Type definitions
│   ├── utils/             # Symbol table, visitor
│   ├── providers/         # Base provider class
│   ├── completion/        # IntelliSense
│   ├── hover/             # Hover info
│   ├── definition/        # Go-to-definition
│   ├── references/        # Find references
│   ├── signatureHelp/     # Parameter hints
│   └── semanticTokens/    # Semantic highlighting
├── test/fixtures/         # Synthetic tests (commit these)
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

## Available Skills

| Skill | Purpose |
|-------|---------|
| `/cal-syntax` | C/AL keywords, operators, data types |
| `/cal-al-boundaries` | What NOT to add (AL-only features) |
| `/cal-object-format` | C/SIDE text export format |
| `/cal-parser-development` | Lexer/parser internals |
| `/cal-provider-development` | LSP provider patterns |
| `/cal-dev-guide` | Testing, development workflow |
