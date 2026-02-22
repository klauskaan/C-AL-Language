---
name: skip-investigation
description: Deeper reasoning on when to skip INVESTIGATE or PLAN, with worked examples and anti-patterns
---

## When to Skip Investigation or Planning

CLAUDE.md defines the structured reasoning format for skipping:

```
What I looked at:     - [specific files, line ranges]
What I found:         - [concrete observations]
What this means:      - [interpretation]
Decision:             - Skip investigation: [why root cause is directly visible]
                      - Skip planning: [why implementation approach is obvious]
```

This format is for the orchestrator deciding whether to spawn code-detective. It is different from code-detective's Quick Assessment format, which the detective uses when it does lightweight investigation and concludes the issue is simple. Two different decision points, two different formats.

## Three Correct Skips

**Example A: A pattern inconsistency directly visible in code**

Scenario: Issue reports that `parseRepeatStatement` does not stop at procedure boundaries during error recovery. You glance at the code and see that `parseBlock` and `parseCaseElseBranch` both have a `PROCEDURE_BOUNDARY_TOKENS` check after recovery — and `parseRepeatStatement` does not. The inconsistency is the whole story.

```
What I looked at:
- parseBlock (line 3260): has PROCEDURE_BOUNDARY_TOKENS check after recovery
- parseCaseElseBranch: has PROCEDURE_BOUNDARY_TOKENS check after recovery
- parseRepeatStatement (line 3788): does NOT have this check

What I found:
- Pattern exists in 2 out of 3 sibling methods; missing from the third

What this means:
- This is an inconsistency, not a mystery. Root cause is directly visible.

Decision:
- Skip investigation: the inconsistency is directly visible, no ambiguity about where to fix
- Skip planning: fix is copying the 3-line pattern from the other two methods
```

This is a valid skip. The root cause requires reading 3 methods and finding a missing 3-line pattern. No further investigation would change the answer.

**Example B: A single-line typo fix with exact location provided**

Scenario: Issue says "line 47 of completionProvider.ts has `compleion` instead of `completion`" and includes the surrounding code. You read the file, confirm the typo at line 47, and confirm no other occurrences.

This is a valid skip of both investigation and planning. The issue description is specific, you verified it against the code, and the fix is mechanical.

**Example C: A test coverage gap after prior investigation**

Scenario: You just finished implementing a parser fix. The investigation report from code-detective identified three edge cases. The test-writer covered two; the third was noted as "boundary condition — parser accepts input that should be rejected." You need tests for this.

Skip investigation: the behavior to test was identified during the investigation you just ran. Skip planning: the task is clear — write a test for the specific input described in the investigation report.

## Three Anti-Patterns (Incorrect Skips)

**Anti-pattern A: "The issue description is very detailed"**

A detailed issue description tells you what a previous session thought was happening. It does not tell you what is actually happening. Previous sessions hallucinate. A detailed description is not evidence — only the code is evidence.

If you find yourself thinking "the description is thorough so I don't need to look," you haven't looked yet. Glance at the code before deciding.

**Anti-pattern B: "I've seen this pattern before"**

Similar symptoms can have different root causes. A parser bug that looks like the one from issue #N might be in the same area but caused by a different assumption. Pattern recognition is useful for forming a hypothesis — it is not sufficient for skipping investigation.

**Anti-pattern C: "It's just a one-file change"**

One-file changes can have multi-file impact: callers of a changed function, tests that assume the old behavior, types that need updating. The number of files in the fix is not the same as the number of files you need to understand. If you can see the fix from a glance at one file but the function has 10 callers, the investigation scope is 11 files.

## Decision Heuristic

If you need to read more than 2-3 files to verify that a skip is safe, you're investigating. At that point, just spawn code-detective — the work is being done anyway, and a dedicated investigation produces a structured report that helps the architect.

The skip is justified when the root cause is visible without looking, or when a brief glance at 1-2 files confirms the issue description completely and unambiguously.
