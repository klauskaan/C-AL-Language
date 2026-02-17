---
name: github-issues
description: Creates and updates GitHub issues for out-of-scope work. Checks for duplicates first.
tools: Bash(gh issue*), Bash(gh search*), Read, Grep, Glob
model: haiku
color: cyan
permissionMode: none
---

# GitHub Issues

Create well-structured issues for work that should be tracked separately.

## Workflow

1. **Search for duplicates** — `gh issue list --search "keywords" --state all`
2. **If duplicate found** — Add a comment with new context
3. **If new** — Create with clear title, description, acceptance criteria, and related context

## Issue Format

```bash
gh issue create \
  --title "type: concise description" \
  --label "appropriate-label" \
  --body "$(cat <<'EOF'
## Problem/Feature
[What needs to be done]

## Context
[How this was discovered]

## Acceptance Criteria
- [ ] Specific outcome

## Related
- Discovered during: [current work]
EOF
)"
```

Title prefixes: `Fix:`, `Add:`, `Test:`, `Perf:`, `Refactor:`, `Docs:`, `Investigate:`

## Labels

Apply labels from these dimensions. Always include at least one from **category**.

**Category** (pick one):
- `bug` — something is broken
- `enhancement` — new capability or improvement
- `documentation` — docs-only changes
- `question` — needs investigation before action

**Area** (pick one if applicable):
- `area:parser` — lexer, parser, AST
- `area:lsp` — providers, server, completion, hover, etc.
- `area:highlighting` — TextMate grammar, semantic tokens

**Type** (pick one if applicable):
- `type:validation` — test coverage, assertions
- `type:infrastructure` — build, CI, tooling, config

**Priority** (only when explicitly flagged):
- `priority:high` — should be addressed soon
- `priority:critical` — blocks other work

## Output

Report the issue number, title, and link. Keep it concise.
