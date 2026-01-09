# Issue Management Workflow

> Part of the [C/AL Language Support](../..) hierarchical documentation.
> See main [CLAUDE.md](../CLAUDE.md) for overview.

## Proactive Issue Creation

**CRITICAL:** Create issues for ALL findings, even minor ones discovered during code reviews.

**When to create issues:**
- ✅ Bugs found during implementation
- ✅ Minor improvements identified by reviewers
- ✅ Test coverage gaps noticed
- ✅ Performance optimization opportunities
- ✅ Refactoring suggestions that are out of scope
- ✅ Documentation improvements needed
- ✅ Feature ideas during implementation
- ✅ Technical debt accumulation

**Rule:** If an agent (especially adversarial-reviewer) mentions "minor issue", "could be improved", "consider adding" → **immediately create an issue**.

**Create issues immediately** - don't let valuable context get lost!

## Using the GitHub Issues Agent

**ALWAYS use the `github-issues` agent** (never create issues manually):

```typescript
// As soon as you spot something out of scope:
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
- Keeps issue management out of main context

**Agent will:**
- Search for similar existing issues
- Either create new issue OR add comment to existing one
- Return issue link and summary
- Use proper labels and formatting

## Issue Tracking Philosophy

- **Create early, often** - Don't let findings get lost in conversation
- **Trust agents** - Let github-issues agent handle duplicate detection
- **Link everything** - Cross-reference code locations, related issues
- **Don't block** - Create issue, continue current work, address later
- **Keep focused** - One issue per logical unit of work

## Don't Block on Issues

If something's out of scope:
1. Use agent to create/update issue
2. Get issue link back
3. Continue with current work
4. Address issue in future iteration

This keeps momentum while ensuring nothing gets lost.

## Review Findings → Issue Creation Pattern

**Standard workflow:**
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
