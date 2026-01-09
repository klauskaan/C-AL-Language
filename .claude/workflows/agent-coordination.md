# Agent Coordination

> Part of the [C/AL Language Support](../..) hierarchical documentation.
> See main [CLAUDE.md](../CLAUDE.md) for overview.

## Parallel Agent Execution (CRITICAL)

**Always consider:** Can these tasks run in parallel?

**Example - Bug Investigation:**
```typescript
// ❌ BAD: Sequential (slow, high context)
Read file → Understand bug → Fix bug → Write test → Run test

// ✅ GOOD: Detective-First (fast, low context, correct fix)
Task(subagent='code-detective', investigate root cause)
// Detective provides: WHY bug exists, WHAT to fix, HOW to test
// Then launch implementation agents with full context:
Task(subagent='general-purpose', fix bug with detective's guidance)
Task(subagent='test-writer', add tests for edge cases found)  // Parallel!
Task(subagent='test-runner', run tests)
// Result: Implementation addresses root cause correctly, adversarial review validates the fix
```

**Example - Multi-file Refactoring:**
```typescript
// ✅ Launch 3 agents in parallel (single message, multiple Task calls)
Task(subagent='refactoring-guide', refactor parser.ts)
Task(subagent='test-writer', update parser tests)
Task(subagent='typescript-reviewer', review types)
```

## Agent Model Selection Guide

| Task Type | Model | Reasoning | Typical Cost |
|-----------|-------|-----------|--------------|
| **Root cause investigation** | **Opus** | Needs deep analysis + creative thinking | ~15K tokens |
| Code fixes, refactoring | **Sonnet** | Needs deep reasoning about structure | ~8K tokens |
| Test writing | **Sonnet** | Needs understanding of edge cases | ~6K tokens |
| Test execution | **Haiku** | Simple command execution | ~3K tokens |
| Architecture review | **Opus** | Needs critical analysis | ~12K tokens |
| Adversarial review | **Opus** | Needs to find edge cases | ~15K tokens |
| Git commits, simple fixes | **Sonnet** | Needs context awareness | ~5K tokens |
| Issue creation | **Haiku** | Straightforward task | ~2K tokens |
| TypeScript errors | **Haiku/Sonnet** | Haiku if pattern-match, Sonnet if reasoning | ~3-6K |

**Default rule:** When in doubt, use Sonnet. Opus for critical decisions, Haiku for execution-only.

## Task Decomposition Philosophy

When given a task, immediately think:
1. **What are the independent subtasks?** → Launch in parallel
2. **What are the dependencies?** → Sequential within dependency chain
3. **What needs critical review?** → Always include adversarial-reviewer for non-trivial changes
4. **What creates future work?** → Use github-issues agent proactively

**Example - "Fix bug X":**
```
Step 1: Investigate (Agent)
  - Task(code-detective, analyze root cause)
  - Get: WHY bug exists, WHAT to fix, edge cases

Step 2: Decompose (Main conversation)
  - Based on detective findings, create TodoWrite list
  - Identify: files to modify, tests needed

Step 3: Parallel Implementation (Agents)
  - Task(general-purpose, fix bug) + Task(test-writer, add tests)

Step 4: Verification (Agents)
  - Task(test-runner, run tests)
  - Task(3 review agents in parallel)

Step 5: Finalization (Agent)
  - Task(general-purpose, create commit)
```

**Example - "Implement feature X":**
```
Step 1: Investigate (Agent if complex)
  - Task(code-detective, assess design considerations)
  - Get: Impact, risks, recommended approach

Step 2: Understand (Main conversation)
  - Read relevant files
  - Ask clarifying questions

Step 3: Decompose (Main conversation)
  - Identify: implementation, tests, docs
  - Create TodoWrite list

Step 4: Parallel Execution (Agents)
  - Task(implement feature) + Task(write tests) simultaneously

Step 5: Verification (Agents)
  - Task(run tests) → Task(review code - 3 agents in parallel)

Step 6: Finalization (Agent)
  - Task(create commit)
```

## Critical Principle: Detective + Adversarial Are Complementary

**Detective (BEFORE):**
- Investigates: Why does the ORIGINAL bug exist?
- Finds: Root cause, impact scope, design considerations
- Output: Understanding of the problem

**Adversarial Reviewer (AFTER):**
- Investigates: Are there bugs IN the FIX itself?
- Finds: Edge cases in new code, unintended consequences, implementation errors
- Output: Validation of the solution

**Both are required for non-trivial bugs.** Detective provides context, adversarial validates implementation.

**Example - Issue #53:**
- Detective would find: "Parser doesn't handle reserved keywords as variable names"
- Adversarial found: "Error recovery loop can consume PROCEDURE declarations"
- These are DIFFERENT bugs - one in original code, one in the fix

## Agent Success Metrics & Examples

### Real-World Performance

**Session: Issue #53 Implementation**
- **Task:** Fix parser bug, add tests, review, commit
- **What happened:** Implemented fix → adversarial review found critical bug → had to reimplement
- **Token usage:** 37K main + 35K agent contexts = 72K total
- **Quality:** Worked, but required two iterations

**Session: Issue #53 (Hypothetical with Detective)**
- **What would happen:** Detective investigates → provides root cause context → implement with understanding
- **Estimated token usage:** 37K main + 50K agents = 87K total (15K more upfront)
- **Quality:** Implementation addresses root cause, adversarial review still validates fix
- **ROI analysis:**
  - If detective prevents one reimplementation cycle: 87K < (72K original + 30K reimplement) = savings
  - If detective is wrong or fix is simple: 87K > 72K = cost increase
  - **Use for complex bugs where root cause unclear, skip for simple bugs**

**Session: Fix 54 Failing Tests**
- **Task:** Analyze and fix test failures across 3 suites
- **Token usage:**
  - With agents: 10K main + 45K agent contexts = 55K total
  - Without agents (estimated): 120K+ in main context
- **Time:** 7 agents (4 analysis + 3 fixes) in parallel
- **Result:** All tests fixed in single iteration

### Context Savings Examples

| Task | Without Agents | With Agents | Savings |
|------|----------------|-------------|---------|
| Run test suite | 30K tokens | 3K tokens | 90% |
| Code review (3 aspects) | 45K tokens | 8K tokens | 82% |
| Fix bug + tests | 25K tokens | 6K tokens | 76% |
| Git commit | 8K tokens | 2K tokens | 75% |
| Create issue | 5K tokens | 1K tokens | 80% |

**Average savings: 80%** of tokens by delegating to agents.

## Agent Resume Pattern

**Agents can be resumed!** Save their ID and continue later:

```typescript
// First call:
Task(subagent='test-writer', prompt='Write tests for X')
// Returns: agentId: abc123

// Later, to continue:
Task(subagent='test-writer', resume='abc123', prompt='Now add edge cases')
```

**When to resume:**
- Agent's work needs refinement
- Follow-up questions to same agent
- Incremental additions to agent's work
