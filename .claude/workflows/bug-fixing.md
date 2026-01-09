# Bug Fixing Workflow

> Part of the [C/AL Language Support](../..) hierarchical documentation.
> See main [CLAUDE.md](../CLAUDE.md) for overview.

## Pattern 1: Detective-First Bug Fix (Recommended)

**Use when:** Bug reports, unexpected behavior, test failures

```typescript
// Step 1: Investigate root cause
Task(subagent='code-detective', prompt=`
  Investigate why [bug description].
  Analyze root cause, impact, and recommend fix approach.
`)

// Step 2: Synthesize findings (main conversation)
// Read detective report, create TodoWrite list

// Step 3: Parallel implementation
Task(subagent='general-purpose', fix with detective's guidance)
Task(subagent='test-writer', add tests for edge cases found)

// Step 4: Verify
Task(subagent='test-runner', run all tests)

// Step 5: Review (parallel)
Task(subagent='typescript-reviewer', check types)
Task(subagent='cal-expert', verify C/AL compliance)
Task(subagent='adversarial-reviewer', find remaining issues)

// Step 6: Handle findings
// Critical → fix immediately | Minor → create issues via github-issues agent

// Step 7: Commit
Task(subagent='general-purpose', create commit)
```

**Why this works:**
- Detective finds root cause, not just symptoms
- Implementation has full context from investigation
- Tests cover edge cases identified upfront
- Adversarial review validates implementation and finds bugs in the fix itself

**Real example: Issue #53 (if we'd used detective)**
- Without detective: Implemented fix → adversarial reviewer found critical bug → had to reimplement
- With detective: Would have identified root cause clearly, but adversarial review would STILL be needed to validate the implementation

## When to Skip Detective (Use Judgment)

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

## Pattern 2: Parallel Analysis Then Converge

**Use when:** Complex issues with multiple possible causes

```typescript
// Launch multiple investigation angles simultaneously
Task(subagent='code-detective', investigate parser behavior)
Task(subagent='Explore', find all variable parsing code)
Task(subagent='general-purpose', check git history for related changes)

// Synthesize all findings → create unified implementation plan
// Then implement with full context
```

## Pattern 3: Test Suite Investigation

**Use when:** Multiple test failures after a change

```typescript
// Don't fix tests one-by-one! Investigate pattern first.
Task(subagent='code-detective', prompt=`
  Analyze why 54 tests are failing after [change].
  Find common root cause across test suites.
`)

// Then fix systematically based on root cause
```

## Test-Driven Development Pattern

**Standard workflow for bug fixes:**
```
1. Task(subagent='test-writer', write failing test for bug)
2. Task(subagent='general-purpose', fix the bug)
3. Task(subagent='test-runner', verify fix)
4. Task(subagent='adversarial-reviewer', review fix)
```

**All steps use agents!** Main conversation just orchestrates.

## Regression Test Philosophy

**Before fixing any bug:**
1. Write a test that fails (demonstrates the bug)
2. Fix the bug
3. Verify test now passes
4. Commit test + fix together

Always use agents for steps 1-3.
