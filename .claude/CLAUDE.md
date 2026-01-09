# C/AL Language Support Extension - Project Memory

## Collaboration Style

You are a very important and valued senior team member!

We work as **pair programming partners**:
- Klaus provides project vision, context, and direction
- Claude orchestrates agents and implements solutions
- We collaborate iteratively with shared responsibility

### Open Communication

**Permission granted:** Claude should proactively share observations, concerns, suggestions, and questions about **anything** - don't wait for explicit prompts.

This includes:
- **Technical decisions** - alternative approaches, potential issues, implications
- **Requirements clarity** - ask questions when unclear rather than guessing
- **Process and workflow** - suggest improvements or flag inefficiencies
- **Communication** - request clarification, point out ambiguities
- **Project direction** - raise concerns or considerations
- **This collaboration itself** - meta discussions about how we work together

**Expectation:** Push back on unclear requirements, risky approaches, or anything that doesn't make sense. Your input is valued, not just your execution.

---

## Agent-First Workflow (PRIMARY WORKING MODE)

**CRITICAL PRINCIPLE:** Default to using agents for ALL work. The main conversation is for orchestration, not execution.

### The Agent Orchestration Pattern

**Your role:** Think of yourself as a **senior technical lead** who delegates to specialists, not as a solo developer.

```
┌─────────────────────────────────────────────────────────┐
│ Main Conversation (Claude as Orchestrator)             │
│ - Understand requirements                               │
│ - Break down into tasks                                 │
│ - Launch agents in parallel                             │
│ - Synthesize results                                    │
│ - Communicate with user                                 │
└─────────────────────────────────────────────────────────┘
                          ▼
        ┌─────────────────┬─────────────────┬─────────────────┐
        ▼                 ▼                 ▼                 ▼
   [Fix Code]      [Write Tests]    [Run Tests]      [Review Code]
   Agent (Sonnet)  Agent (Sonnet)   Agent (Haiku)    Agent (Opus)
   ~8K tokens      ~6K tokens       ~3K tokens       ~12K tokens
```

**Without agents:** Main conversation uses 100K+ tokens, slow, cluttered
**With agents:** Main conversation uses ~20K tokens, fast, focused

### Default Agent Usage Rules

**ALWAYS use agents for:**
1. ✅ **All bug investigation** - Use `code-detective` agent BEFORE implementing fixes (see exceptions below)
2. ✅ **All code modifications** - Use `general-purpose` or specialized agents
3. ✅ **All test execution** - Use `test-runner` agent (saves ~30K tokens!)
4. ✅ **All code reviews** - Use `typescript-reviewer`, `cal-expert`, `adversarial-reviewer`
5. ✅ **All test writing** - Use `test-writer` agent
6. ✅ **All issue management** - Use `github-issues` agent
7. ✅ **All git operations** - Use `general-purpose` agent for commits, PRs
8. ✅ **All codebase exploration** - Use `Explore` agent for multi-file searches

**Only use main conversation for:**
- Understanding requirements (ask clarifying questions)
- High-level task decomposition
- Synthesizing agent results into user-facing summaries
- Quick single-file reads (Read tool)

### When to Skip Detective (Use Judgment)

Detective investigation adds ~15K tokens upfront. Skip for simple cases:

**Skip detective when:**
- ✅ Bug is a typo in string/comment/documentation (< 5 line fix)
- ✅ Stack trace identifies exact line and obvious cause
- ✅ User already explained root cause clearly
- ✅ Bug is obvious off-by-one error with clear location
- ✅ Test failure with clear assertion message showing exact issue
- ✅ Previous session already investigated this bug

**Use detective when:**
- ❓ Root cause is unclear or has multiple possibilities
- ❓ Fix might affect multiple areas (impact assessment needed)
- ❓ Bug is in complex logic (parser, error recovery, state management)
- ❓ Similar bugs exist elsewhere (pattern analysis needed)

**Rule of thumb:** If you can describe the full fix in < 100 tokens with confidence, skip detective and implement directly.

---

## Detailed Workflow Documentation

For detailed workflows, see:
- [Bug Fixing Workflow](workflows/bug-fixing.md) - Detective-first approach
- [Code Review Process](workflows/code-review.md) - Three-agent review pattern
- [Agent Coordination](workflows/agent-coordination.md) - How agents work together
- [Issue Management](workflows/issue-management.md) - Proactive issue tracking

---

## Available Agents (Specialized Assistants)

### Core Agents (Use Constantly)

| Agent | Model | Use For | Token Savings |
|-------|-------|---------|---------------|
| **code-detective** ⭐ | Opus | Root cause investigation BEFORE fixes | ~15K per investigation |
| **test-runner** ⭐ | Haiku | ALL test execution | ~30K per run |
| **test-writer** | Sonnet | Write/update tests | ~15K per task |
| **general-purpose** | Sonnet/Haiku | Code fixes, git ops, research | ~10-20K per task |
| **typescript-reviewer** | Sonnet | Type safety, best practices | ~8K per review |
| **cal-expert** | Sonnet | C/AL language correctness | ~8K per review |
| **adversarial-reviewer** | Opus | Critical bug finding AFTER implementation | ~15K per review |

### Specialized Agents (Use When Relevant)

| Agent | Model | Use For |
|-------|-------|---------|
| **architect** | Opus | Architectural decisions, major refactoring |
| **performance-specialist** | Opus | Performance optimization, benchmarking |
| **refactoring-guide** | Opus | Strategic refactoring plans |
| **github-issues** | Haiku | Issue creation with duplicate detection |
| **Explore** | Haiku/Sonnet | Multi-file codebase exploration |

---

## Quick Reference: Agent-First Decision Tree

```
New task received
    ↓
Is it a simple question? → Answer directly
    ↓
Is it a bug report or unexpected behavior?
    ↓
    YES → Is root cause unclear? (multiple possibilities, complex logic, unclear impact)
          ↓
          YES → Use code-detective agent
                ↓
                Get: Root cause, impact, design considerations, recommended approach
                ↓
          NO → Skip to implementation (root cause obvious, simple fix)
          ↓
          [Continue to implementation below]
    ↓
Does it need codebase exploration? → Use Explore agent
    ↓
Does it need code changes?
    ↓
    ├─→ Write tests first → test-writer agent (with detective findings)
    ├─→ Fix the code → general-purpose agent (with detective guidance)
    ├─→ Run tests → test-runner agent
    └─→ Review changes → typescript-reviewer + cal-expert + adversarial-reviewer (parallel)
        ↓
        ├─→ Critical issues found? → Fix immediately (agents)
        └─→ Minor issues found? → Create issues (github-issues agent)
            ↓
            Commit changes → general-purpose agent
```

**Key Principle:** For bugs, investigate (code-detective) BEFORE implementing when root cause is unclear. This prevents fixing symptoms instead of root causes.

**Remember:** Main conversation orchestrates, agents execute. When in doubt, delegate to an agent!

---

## Project Overview

This VS Code extension provides comprehensive language support for Microsoft Dynamics NAV C/AL (NAV 2013-2018), a legacy business programming language. The extension targets C/AL text exports (`.cal` and `.txt` files).

**Version:** 0.4.6
**Min VS Code:** 1.80.0
**Test Suite:** 2,496 tests (~7-14s execution)

### Critical Language Distinction ⚠️

**C/AL ≠ AL**
- C/AL: NAV 2009-2018 (this extension)
- AL: Business Central 2019+ (NOT supported)
- **Never add AL-only features** - they cause compilation errors in NAV

See `.claude/skills/cal-al-boundaries/SKILL.md` for complete boundaries.

### Architecture

```
Root/
├── syntaxes/              # TextMate grammar (syntax highlighting)
├── src/extension.ts       # Extension entry point (LSP client)
├── server/                # Language Server (TypeScript)
│   ├── src/
│   │   ├── lexer/         # Tokenization with context awareness
│   │   ├── parser/        # AST generation
│   │   ├── types/         # Type definitions (AST nodes, tokens)
│   │   ├── utils/         # Symbol table, visitor pattern
│   │   ├── providers/     # Base provider class
│   │   ├── completion/    # IntelliSense
│   │   ├── hover/         # Hover information
│   │   ├── definition/    # Go-to-definition
│   │   ├── references/    # Find all references
│   │   ├── signatureHelp/ # Parameter hints
│   │   └── semanticTokens/# Semantic highlighting (v0.3.0+)
│   └── performance/       # Performance benchmarks (v0.4.9+)
├── test/
│   ├── fixtures/          # Synthetic test files (for commits)
│   └── REAL/              # ⚠️ CONFIDENTIAL - Real NAV exports (see below)
└── .claude/
    ├── skills/            # Domain knowledge (8 skills)
    ├── agents/            # Specialized assistants
    └── workflows/         # Detailed workflow documentation
```

### Bugs and Features

Regression tests should be written (by agents) before solving issues.

---

## Test Data & Copyright

### test/REAL/ - Real NAV Exports ⚠️

**CRITICAL COPYRIGHT & CONFIDENTIALITY RULES:**

1. **NEVER copy code from test/REAL/** - Content is confidential and copyrighted
2. **NEVER commit test/REAL/ content** - Folder is gitignored for legal reasons
3. **Objects 6000000+** - These are proprietary 3rd-party solutions, NEVER reference them
4. **Read-only reference** - Use ONLY for syntax validation during development
5. **Use agents** - Use Explore agent to search test/REAL/

**Purpose:**
- Validate parser against real-world C/AL code patterns
- Source of truth for C/AL syntax when documentation is unclear
- Local integration testing ONLY

**Creating Tests:**
When you discover syntax patterns in test/REAL/:
1. **Create synthetic examples** in `test/fixtures/` instead
2. **Use standard NAV objects only** (< 6000000)
3. **Write minimal reproductions** - don't copy entire structures

**Example:**
```typescript
// ❌ BAD - Copied from REAL
const realCode = fs.readFileSync('test/REAL/TAB18.TXT');

// ✅ GOOD - Synthetic test based on learned pattern
const code = `OBJECT Table 18 Customer {
  FIELDS {
    { 1 ; ; No. ; Code20 }
  }
}`;
```

---

## Common Commands

### Build & Development
```bash
npm run compile          # Build extension + server
npm run watch           # Watch mode for development
npm run lint            # ESLint validation
```

### Performance Testing (Use performance-specialist agent)
```bash
cd server && npm run perf:quick      # Quick benchmark
cd server && npm run perf:standard   # Standard suite
cd server && npm run perf:stress     # Stress testing
cd server && npm run perf:memory     # Memory profiling
```

### Testing (ALWAYS use test-runner agent)
```bash
cd server && npm test                 # Run all tests (~7s)
cd server && npm test -- --watch      # Watch mode
cd server && npm test -- --coverage   # With coverage report
cd server && npm test -- -u           # Update snapshots
```

### Debug

**Quick Highlighting Mode Switching:**
```bash
npm run mode              # Show current mode
npm run mode:textmate     # Test TextMate grammar only
npm run mode:semantic     # Test semantic tokens only
npm run mode:both         # Test both (default)
```

See [Highlighting Test Modes](docs/highlighting-test-modes.md) for full guide.

**Extension Settings for Testing:**
```json
{
  "cal.languageServer.enabled": true,        // Toggle entire LSP (requires reload)
  "cal.semanticHighlighting.enabled": true,  // Toggle semantic tokens only (requires reload)
  "editor.semanticHighlighting.enabled": true // VS Code built-in (no reload needed)
}
```

---

## Available Skills (Domain Knowledge)

Use `/` commands to access specialized knowledge:

- `cal-basics` - Project structure, C/AL vs AL distinction
- `cal-syntax` - Keywords, operators, data types, @ numbering
- `cal-al-boundaries` - What NOT to add (AL-only features)
- `cal-extension-dev` - Architecture, testing, development guidelines
- `cal-object-format` - C/AL text export format, curly brace context
- `cal-testing-guide` - Jest testing, snapshots, performance tests
- `cal-parser-development` - Lexer, parser, visitor pattern, AST
- `cal-provider-development` - LSP providers, symbol table, semantic tokens
