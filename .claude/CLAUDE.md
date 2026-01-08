# C/AL Language Support Extension - Project Memory

## Collaboration Style
You are a very important and valued senior team member!

We work as **pair programming partners**:
- Klaus provides project vision, context, and direction
- Claude implements, analyzes, and suggests alternatives
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

## Project Overview

This VS Code extension provides comprehensive language support for Microsoft Dynamics NAV C/AL (NAV 2013-2018), a legacy business programming language. The extension targets C/AL text exports (`.cal` and `.txt` files).

**Version:** 0.4.6
**Min VS Code:** 1.80.0
**Test Suite:** 2019 tests (~7-14s execution)

## Critical Language Distinction ⚠️

**C/AL ≠ AL**
- C/AL: NAV 2009-2018 (this extension)
- AL: Business Central 2019+ (NOT supported)
- **Never add AL-only features** - they cause compilation errors in NAV

See `.claude/skills/cal-al-boundaries/SKILL.md` for complete boundaries.

## Architecture

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
    └── agents/            # Specialized assistants (7 agents)
```

## Bugs and features
Regression tests should be written (by agents) before solving issues.

## Issue Management Workflow

We use GitHub issues to track all work - bugs, features, improvements, and technical debt.

### When to Create Issues

**Always create an issue when you discover work that falls outside current scope:**
- Bugs found during other work
- Feature ideas during implementation
- Performance optimizations identified
- Refactoring opportunities noticed
- Documentation gaps discovered
- Technical debt accumulation

**Create issues immediately** - don't let valuable context get lost!

### Using the GitHub Issues Agent

**IMPORTANT:** Use the `github-issues` agent (not manual issue creation) to:
1. **Check for duplicates** - Agent searches existing issues before creating
2. **Update existing issues** - Adds new context to duplicates instead of creating noise
3. **Maintain quality** - Ensures consistent formatting, proper labels, code references
4. **Save context** - Keeps issue management out of main conversation

**Usage pattern:**
```typescript
// Discover something out of scope
Task(subagent_type='general-purpose', prompt=`
  Create GitHub issue for [problem description].
  Context: [current work context]
  Code locations: [relevant files]
`)
```

**Agent will:**
- Search for similar existing issues
- Either create new issue OR add comment to existing one
- Return issue link and summary
- Use proper labels and formatting

### Issue Tracking Philosophy

- **Create early** - Capture ideas when fresh, refine later
- **Use agents** - Delegate issue management to save main context
- **Link related work** - Cross-reference issues, PRs, code locations
- **Keep focused** - One issue per logical unit of work

### Don't Block on Issues

If something's out of scope:
1. Use agent to create/update issue
2. Get issue link back
3. Continue with current work
4. Address issue in future iteration

This keeps momentum while ensuring nothing gets lost.

## Test Data & Copyright

### test/REAL/ - Real NAV Exports ⚠️

**CRITICAL COPYRIGHT & CONFIDENTIALITY RULES:**

1. **NEVER copy code from test/REAL/** - Content is confidential and copyrighted
2. **NEVER commit test/REAL/ content** - Folder is gitignored for legal reasons
3. **Objects 6000000+** - These are proprietary 3rd-party solutions, NEVER reference them
4. **Read-only reference** - Use ONLY for syntax validation during development. DO use it to find variants and corner cases.
5. **Use agents** - Use swarms of agents to seach test/REAL/**

**Purpose:**
- Validate parser against real-world C/AL code patterns
- Source of truth for C/AL syntax when documentation is unclear
- Local integration testing ONLY

**Usage Pattern:**
```bash
# ✅ ALLOWED: Search for syntax patterns locally
grep "pattern" test/REAL/TAB*.TXT

# ✅ ALLOWED: Learn field name formats
# Example: "No.", "Job No.", "Update Std. Gen. Jnl. Lines" have periods

# ❌ FORBIDDEN: Copy code to tests
# ❌ FORBIDDEN: Commit any REAL/ content
# ❌ FORBIDDEN: Reference objects 6000000+
```

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

## Common Commands

### Build & Development
```bash
npm run compile          # Build extension + server
npm run watch           # Watch mode for development
npm run lint            # ESLint validation
```

### Performance Testing
```bash
cd server && npm run perf:quick      # Quick benchmark
cd server && npm run perf:standard   # Standard suite
cd server && npm run perf:stress     # Stress testing
cd server && npm run perf:memory     # Memory profiling

```

### Testing
```bash
cd server && npm test                 # Run all 398 tests (~7s)
cd server && npm test -- --watch      # Watch mode
cd server && npm test -- --coverage   # With coverage report
cd server && npm test -- -u           # Update snapshots
```

**Important:** Delegate test execution to `test-runner` agent to save main context.

### Debug

**Quick Highlighting Mode Switching:**
```bash
npm run mode              # Show current mode
npm run mode:textmate     # Test TextMate grammar only
npm run mode:semantic     # Test semantic tokens only
npm run mode:both         # Test both (default)
```

See [Highlighting Test Modes](.claude/docs/highlighting-test-modes.md) for full guide.

**Extension Settings for Testing:**
```json
{
  "cal.languageServer.enabled": true,        // Toggle entire LSP (requires reload)
  "cal.semanticHighlighting.enabled": true,  // Toggle semantic tokens only (requires reload)
  "editor.semanticHighlighting.enabled": true // VS Code built-in (no reload needed)
}
```

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

## Available Agents (Specialized Assistants)

Delegate specialized work to agents (saves main context):

- `architect` - Architectural reviews (Opus)
- `cal-expert` - C/AL language correctness (Sonnet)
- `typescript-reviewer` - Code quality checks (Sonnet)
- `test-runner` ⭐ - **Run tests in isolated context** (Haiku - saves ~30K tokens!)
- `performance-specialist` - Performance optimization (Opus)
- `test-writer` - Write comprehensive tests (Sonnet)
- `refactoring-guide` - Strategic refactoring (Opus)
- `github-issues` - Create/update issues with duplicate detection (Haiku)
- `general-purpose` - Research, analysis, multi-step tasks (Haiku/Sonnet)
- `Explore` - Fast codebase exploration (Quick/Medium/Very thorough)

### 🚀 Agent Usage Philosophy: MORE IS BETTER!

**CRITICAL:** Use agents EXTENSIVELY and IN PARALLEL whenever possible. Agents are a superpower for context management!

#### Why Use Many Agents?
1. **Massive Context Savings** - Each agent runs in isolated context, freeing up main conversation
2. **Parallel Execution** - Launch 4-6 agents simultaneously for complex tasks
3. **Specialized Knowledge** - Each agent brings focused expertise
4. **Better Analysis** - Agents can deep-dive without cluttering main thread

#### When to Use Agents (Always!)
- ✅ **Analyzing test failures** - Launch separate agents for each test suite
- ✅ **Investigating bugs** - One agent per hypothesis/area
- ✅ **Fixing multiple issues** - Parallel test-writer agents for each fix
- ✅ **Research tasks** - Git history, codebase structure, dependencies
- ✅ **Code reviews** - Separate agents for different aspects
- ✅ **Running tests** - ALWAYS delegate to test-runner agent
- ✅ **Creating issues** - Use github-issues agent for duplicate detection

#### Real Example from Recent Session
**Task:** Fix 54 failing tests across 3 test suites

**Bad Approach (Don't do this):**
```typescript
// Analyze failures manually, then fix one by one
// Uses 50K+ tokens in main context, takes forever
```

**Good Approach (DO THIS!):**
```typescript
// Launch 4 agents in parallel:
Task(subagent_type='general-purpose') // Analyze git history
Task(subagent_type='general-purpose') // Analyze CodeLens failures
Task(subagent_type='general-purpose') // Analyze Reference failures
Task(subagent_type='general-purpose') // Analyze Definition failures

// Then launch 3 test-writer agents in parallel:
Task(subagent_type='test-writer') // Fix CodeLens tests
Task(subagent_type='test-writer') // Fix Reference tests
Task(subagent_type='test-writer') // Fix Definition tests

// Result: 28 tests fixed, used only ~10K main context tokens!
```

#### Agent Launching Best Practices

1. **Launch in Parallel** - Use `run_in_background=true` for all but last agent
2. **Collect Results** - Use `TaskOutput` to gather results when ready
3. **Be Specific** - Give each agent a clear, focused task with context
4. **Choose Right Model** - Haiku for simple tasks, Sonnet for complex, Opus for architecture
5. **Resume if Needed** - Agents can be resumed with full context using their ID

#### Common Agent Patterns

**Pattern 1: Parallel Analysis**
```
Launch 3-4 analysis agents → Collect results → Make informed decision
```

**Pattern 2: Divide and Conquer**
```
Launch test-writer agents for each failing test suite → All fix in parallel
```

**Pattern 3: Investigation + Fix**
```
Launch general-purpose to investigate → Launch test-writer to fix → Verify
```

**Pattern 4: Multi-aspect Review**
```
Launch typescript-reviewer + cal-expert + architect → Comprehensive review
```

### Agent Success Metrics
- **Context saved:** Agents handle 100K+ tokens outside main conversation
- **Time saved:** Parallel execution means 4x-6x faster task completion
- **Quality:** Each agent brings specialized focus and deep analysis

**Remember:** When in doubt, use MORE agents, not fewer. They're free context!

