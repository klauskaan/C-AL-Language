---
name: agent-workflows
description: Complete guide to agent-first development workflows including bug investigation, implementation patterns, code review, and issue management. Invoke when starting any non-trivial task.
---

# Agent-First Development Workflows

This skill covers how to effectively use agents for all development work.

## Core Principle: Delegate Everything

```
Main conversation = Orchestration only
Agents = All execution
```

**Token savings: ~80% by delegating to agents.**

---

## 1. Bug Investigation (Detective-First)

### When to Use Detective

**Use detective when:**
- Root cause is unclear or has multiple possibilities
- Fix might affect multiple areas (impact assessment needed)
- Bug is in complex logic (parser, error recovery, state management)
- Similar bugs exist elsewhere (pattern analysis needed)

**Skip detective when:**
- Bug is a typo (< 5 line fix)
- Stack trace shows exact line and obvious cause
- User already explained root cause clearly
- Test failure with clear assertion message

**Rule of thumb:** If you can describe the fix in < 100 tokens with confidence, skip detective.

### Detective-First Pattern

```typescript
// Step 1: Investigate root cause
Task(subagent='code-detective', prompt=`
  Investigate why [bug description].
  Analyze root cause, impact, and recommend fix approach.
`)

// Step 2: Synthesize (main conversation)
// Read detective report, create TodoWrite list

// Step 3: Parallel implementation
Task(subagent='general-purpose', fix with detective's guidance)
Task(subagent='test-writer', add tests for edge cases found)

// Step 4: Verify
Task(subagent='test-runner', run all tests)

// Step 5: Review (see Code Review section)

// Step 6: Commit
Task(subagent='general-purpose', create commit)
```

### Multiple Test Failures Pattern

Don't fix tests one-by-one. Investigate the pattern first:

```typescript
Task(subagent='code-detective', prompt=`
  Analyze why N tests are failing after [change].
  Find common root cause across test suites.
`)
// Then fix systematically based on root cause
```

---

## 2. Implementation Patterns

### Parallel Agent Execution

**Always ask:** Can these tasks run in parallel?

```typescript
// Launch multiple agents in a SINGLE message:
Task(subagent='general-purpose', fix bug)
Task(subagent='test-writer', add tests)  // Parallel!
```

### Task Decomposition

When given a task:
1. **Independent subtasks?** → Launch in parallel
2. **Dependencies?** → Sequential within dependency chain
3. **Needs critical review?** → Include adversarial-reviewer
4. **Creates future work?** → Use github-issues agent

### Model Selection Guide

| Task Type | Model | Reasoning |
|-----------|-------|-----------|
| Root cause investigation | **Opus** | Needs deep analysis |
| Code fixes, refactoring | **Sonnet** | Needs structure reasoning |
| Test writing | **Sonnet** | Needs edge case understanding |
| Test execution | **Haiku** | Simple command execution |
| Architecture review | **Opus** | Needs critical analysis |
| Adversarial review | **Opus** | Needs to find edge cases |
| Git commits | **Sonnet** | Needs context awareness |
| Issue creation | **Haiku** | Straightforward task |

**Default:** Sonnet. Use Opus for critical decisions, Haiku for execution-only.

### Test-Driven Development

```
1. Task(test-writer, write failing test for bug)
2. Task(general-purpose, fix the bug)
3. Task(test-runner, verify fix)
4. Task(adversarial-reviewer, review fix)
```

---

## 3. Code Review (Three-Agent Pattern)

### Standard Review (Non-Trivial Changes)

**ALWAYS use all three agents for:**
- Parser logic
- LSP providers
- Core language features
- Error handling

```typescript
// Launch all three in parallel (single message):
Task(subagent='typescript-reviewer')    // Type safety, best practices
Task(subagent='cal-expert')             // C/AL language correctness
Task(subagent='adversarial-reviewer')   // Critical edge cases, bugs
```

**Each agent's perspective:**
- **TypeScript Reviewer:** "Is this well-typed, maintainable?"
- **C/AL Expert:** "Is this correct for NAV 2013-2018? Any AL contamination?"
- **Adversarial Reviewer:** "How can I break this? What edge cases were missed?"

### Detective + Adversarial Are Complementary

**Detective (BEFORE implementation):**
- Investigates: Why does the ORIGINAL bug exist?
- Finds: Root cause, impact scope, design considerations

**Adversarial Reviewer (AFTER implementation):**
- Investigates: Are there bugs IN the FIX itself?
- Finds: Edge cases in new code, unintended consequences

**Both are required for non-trivial bugs.**

---

## 4. Issue Management

### Proactive Issue Creation

**Create issues for ALL findings:**
- Bugs found during implementation
- Minor improvements identified by reviewers
- Test coverage gaps
- Performance optimization opportunities
- Refactoring suggestions out of scope
- Technical debt

**Rule:** If any agent mentions "minor issue", "could be improved" → **immediately create an issue**.

### Using github-issues Agent

```typescript
Task(subagent_type='github-issues', prompt=`
  Create issue for: [specific problem]
  Context: [current work]
  Severity: [low/medium/high]
  Code reference: [file:line]
`)
```

**Agent benefits:**
- Checks for duplicates automatically
- Updates existing issues instead of creating noise
- Uses consistent formatting and labels

### Review Findings Categorization

```
1. Launch review agents
2. Collect all findings
3. Categorize:
   - CRITICAL → Fix immediately
   - MINOR → Create issues via github-issues agent
   - OPTIONAL → Create issues with "enhancement" label
4. Fix critical issues
5. Move forward (minor issues tracked for later)
```

### Don't Block on Issues

1. Use agent to create/update issue
2. Get issue link back
3. Continue with current work
4. Address issue in future iteration

---

## 5. Agent Resume Pattern

Agents can be resumed with their ID:

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
- Incremental additions

---

## Quick Reference: Complete Workflow

```
New task received
    ↓
Simple question? → Answer directly
    ↓
Bug report with unclear root cause?
    YES → code-detective agent → get findings
    NO → skip to implementation
    ↓
Needs codebase exploration? → Explore agent
    ↓
Implementation:
    ├─→ test-writer agent (write tests first)
    ├─→ general-purpose agent (implement fix)
    └─→ test-runner agent (verify)
    ↓
Review (parallel):
    ├─→ typescript-reviewer
    ├─→ cal-expert
    └─→ adversarial-reviewer
    ↓
Handle findings:
    ├─→ CRITICAL → fix immediately
    └─→ MINOR → github-issues agent
    ↓
Commit → general-purpose agent
```
