---
name: reviewer-disposition
description: When to Fix, Defer, Acknowledge, or Dismiss reviewer findings
---

## The Four Dispositions

Every reviewer finding gets one of four dispositions. You must handle every item — ignoring a finding is not an option.

**Fix it:** The finding is actionable and in scope. Fix before proceeding. At the PLAN gate, the architect revises the plan. At the CODE gate, the senior-developer changes the code.

**Defer it:** The finding is actionable but out of scope for this issue. Create a GitHub issue via the github-issues agent, then move on. The finding is tracked; it won't get lost.

**Acknowledge it:** The finding is a valid observation but prescribes no specific action. Applies only to genuine meta-observations: "this area is growing complex," "the test suite is large." No GitHub issue, no code change — just a note that the observation was heard.

**Dismiss it:** The finding is not applicable to this change. Requires explicit justification. "Not applicable because..." is required. Dismissal asserts that the reviewer is wrong about the finding's relevance — use sparingly.

## Decision Tree

1. Is the finding actionable (prescribes a specific change)? If no → **Acknowledge**
2. Is the fix in scope for this issue? If no → **Defer** (create issue)
3. Is the finding applicable to this change? If no → **Dismiss** (explain why)
4. Otherwise → **Fix it**

## The Issue Creation Bias and Acknowledge

The Issue Creation Bias says: prefer creating tracking issues over acknowledging and moving on. This is correct for findings that describe a specific problem or improvement.

But Acknowledge is not a way to avoid work. It applies only to observations that genuinely don't prescribe any specific change — observations about the state of the world rather than something to do. When in doubt, defer with an issue rather than acknowledge. A created issue can always be closed; an observation that was acknowledged when it should have been deferred is lost.

## Dismiss Requires Justification

Dismissal is the strongest disposition because it asserts the reviewer is wrong. Use it only when you can state specifically why the finding doesn't apply: "Not applicable because this codeunit doesn't handle user input," "Not applicable because this pattern is intentional — see the comment at line 47."

If you find yourself writing "Not applicable because I disagree with the suggestion," that's not a dismissal — that's a disagreement about design quality. Escalate to Klaus rather than dismissing.

## All Dispositions Go to Klaus

Report all four dispositions to Klaus for visibility — including Acknowledge and Dismiss. This is not bureaucracy; it's the audit trail that lets Klaus verify the review loop is functioning correctly.

## Examples

| Finding | Disposition | Rationale |
|---------|-------------|-----------|
| "Missing null check on line 42" | Fix it | Actionable, in scope, applies directly |
| "This function should handle Unicode normalization" | Defer | Valid, out of scope for this issue |
| "The parser error recovery is getting complex" | Acknowledge | True observation, no specific action |
| "Consider using async/await here" | Dismiss | Not applicable — this codebase uses synchronous LSP patterns |

## Dispositions in the Review Comment

All dispositions are documented in the review comment posted to the GitHub issue after CODE review approval. This is the permanent record -- what Klaus sees when reviewing sessions after the fact.

The review comment uses a findings table with columns: Finding, Severity, Disposition, Detail. For each disposition:

- **Fix it** -- Detail column describes what was changed
- **Defer it** -- Detail column contains the created issue number as a link (e.g., `#557`)
- **Acknowledge it** -- Detail column contains the meta-observation text
- **Dismiss it** -- Detail column contains the justification

Deferred items must include the actual issue number, not just a description. Create the issue first (via github-issues), then reference it in the review comment. This creates bidirectional traceability: the issue links back to the parent work, the review comment links forward to the issue.
