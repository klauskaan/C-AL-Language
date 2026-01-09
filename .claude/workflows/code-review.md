# Code Review Process

> Part of the [C/AL Language Support](../..) hierarchical documentation.
> See main [CLAUDE.md](../CLAUDE.md) for overview.

## Three-Agent Review Pattern (Standard for Non-Trivial Changes)

**ALWAYS use all three agents for code changes affecting:**
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

**Each agent provides different perspective:**
- **TypeScript Reviewer:** "Is this well-typed, maintainable, following conventions?"
- **C/AL Expert:** "Is this correct for NAV 2013-2018? Any AL contamination?"
- **Adversarial Reviewer:** "How can I break this? What edge cases were missed?"

## Review Findings → Issue Creation Pattern

**Standard workflow:**
```
1. Launch 3 review agents
2. Collect all findings
3. Categorize:
   - CRITICAL → Fix immediately
   - MINOR → Create issues via github-issues agent
   - OPTIONAL → Create issues with "enhancement" label
4. Fix critical issues
5. Move forward (minor issues tracked for later)
```

**Example:**
```typescript
// Adversarial reviewer finds:
// - CRITICAL: Error recovery can consume procedures
// - MINOR: Test doesn't verify error message content

// Your response:
1. Fix critical bug immediately (launch agent)
2. Task(subagent='github-issues', create issue for minor test improvement)
3. Continue with main workflow
```

## Pattern: Multi-Aspect Review

**Use when:** Non-trivial code changes (parser, LSP providers, core features)

```typescript
// Always launch all three in parallel (single message)
Task(subagent='typescript-reviewer', check type safety)
Task(subagent='cal-expert', verify NAV 2013-2018 compliance)
Task(subagent='adversarial-reviewer', find edge cases and bugs)

// Triage findings:
// - Critical → Fix immediately
// - Minor → Create issues (github-issues agent)
```

## Pattern: Feature Design Assessment

**Use when:** Implementing new features with design uncertainty

```typescript
// Before implementation, assess design space
Task(subagent='code-detective', prompt=`
  Assess design considerations for [feature].
  Identify: edge cases, risks, alternative approaches.
  Recommend implementation strategy.
`)

// Implement with full awareness of trade-offs
```

## Proactive Issue Creation During Reviews

**CRITICAL:** Create issues for ALL findings, even minor ones discovered during code reviews.

**When to create issues:**
- ✅ Bugs found during implementation
- ✅ Minor improvements identified by reviewers
- ✅ Test coverage gaps noticed
- ✅ Performance optimization opportunities
- ✅ Refactoring suggestions that are out of scope
- ✅ Documentation improvements needed

**Rule:** If an agent (especially adversarial-reviewer) mentions "minor issue", "could be improved", "consider adding" → **immediately create an issue**.

## Don't Block on Issues

If something's out of scope:
1. Use github-issues agent to create/update issue
2. Get issue link back
3. Continue with current work
4. Address issue in future iteration

This keeps momentum while ensuring nothing gets lost.
