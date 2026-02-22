---
name: trust-hierarchy
description: Priority ordering for conflicting information sources, and verify-before-advancing at phase boundaries
---

## Priority Ordering for Information Sources

When two sources conflict, trust the higher-ranked one. When the conflict involves code versus anything else, trust the code.

| Rank | Source | Notes |
|------|--------|-------|
| 1 | **Code on disk** | The actual files in the repository. Ground truth. |
| 2 | **Test output** | What actually happened when tests ran. But verify you read actual output, not an agent summary. |
| 3 | **Compiler output** | `npm run compile` results. IDE diagnostics can be stale — run compile to confirm. |
| 4 | **Investigation findings** | Code-detective's report, grounded in code reading. May reference code that has since changed. |
| 5 | **Agent summaries** | What agents report they did. Agents can hallucinate, especially about verification steps. |
| 6 | **Issue descriptions** | What the issue says the problem is. May have been written by a previous session that misread code. |
| 7 | **Comments from prior sessions** | Clarifications and context. Subject to all the failure modes of the session that wrote them. |

## Specific Sources Being Wrong

**Agent summary wrong:** An agent says "I verified the file exists" — use Glob to check. An agent says "tests pass" — read the actual test output. Agent summaries are narratives; tool output is evidence.

**Issue description wrong:** "The parser crashes on line 50" — the actual problem is in a different function that line 50 calls. "Function X is missing Y behavior" — function X was renamed last week and the description refers to the old code. Always verify the description against the code before accepting it.

**Investigation findings stale:** Code-detective identified a function by name during investigation. Between investigation and implementation, another issue renamed that function. The finding is no longer accurate. Check the code when the investigation is more than a few commits old in an active area.

**IDE diagnostics stale:** The IDE shows TypeScript errors that don't exist in the compiled output. Run `npm run compile` to get current compiler output. The IDE caches type information and can be wrong about what will actually compile.

## Verify-Before-Advancing at Phase Boundaries

At each phase boundary, verify the actual state before proceeding.

**Before IMPLEMENT:**
- Verify test failures are real: read the actual test output from test-runner, not the agent's summary of it
- Verify plan assumptions hold: read the files the plan references, confirm they exist with the described content

**Before REVIEW:**
- Verify implementation is complete: read the modified files, check that the planned changes are actually there
- Verify tests pass: read actual test output, not a summary

**Before COMMIT:**
- Verify review approval is genuine: read the review output, confirm it ends with APPROVED not something that sounds like approval
- Verify no uncommitted changes were missed: `git status`

## Re-investigate vs. Trust-and-Proceed

If there is a discrepancy between code and any other source, trust the code. If there is a discrepancy between two non-code sources (e.g., agent summary contradicts investigation findings), run a tool call to check the code and resolve it that way.

Do not reason about which non-code source is more reliable without checking the code. The code is always available and always authoritative.
