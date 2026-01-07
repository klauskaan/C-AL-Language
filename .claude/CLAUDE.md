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
└── .claude/
    ├── skills/            # Domain knowledge (8 skills)
    └── agents/            # Specialized assistants (7 agents)
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

