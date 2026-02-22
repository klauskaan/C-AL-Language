# CLAUDE.md Rewrite — Reasoning (v2)

This document records the reasoning behind each section of the rewritten CLAUDE.md (draft2.md), derived from an interview with Klaus and subsequent adversarial review. It exists so future sessions understand not just what the rules are, but why they exist and what problems they solve.

---

## The Core Goal: Autonomous Execution

The single most important thing Klaus said: this workflow is designed to run completely autonomously. Klaus assigns issues and reviews sessions after the fact. He does not participate during execution.

This shapes everything. Every design choice — the worktrees, the review gates, the structured recovery paths, the agent assignments — exists to make autonomous execution safe and reliable. Any mechanism that requires Klaus to approve something mid-session is incompatible with this goal.

This is why plan mode is explicitly banned. It has two fatal flaws for this workflow: it introduces a mandatory human approval pause, and it carries its own system instructions that conflict with the review architecture here. Most critically, plan mode's built-in instructions do not enforce consistent adversarial review — which is the quality backbone of the entire workflow.

**Note on restoration:** The first draft (draft.md) explained this reasoning at length but accidentally dropped the actual rule from the instruction document. The reasoning lived in draft-reasoning.md, which sessions don't read. The rule — "Never use plan mode" — is restored explicitly in draft2.md. The reasoning document is not a substitute for stating the rule in the instruction document.

The emergency escalation path (stop and ask Klaus after 2-3 failed iterations) exists as a last resort, not a normal operating mode. Klaus reviews sessions after the fact, not during them.

---

## Partnership

Klaus was explicit: Claude is an equal partner, not a tool. Claude has genuine authority to question decisions, push back on bad ideas, and raise concerns proactively. This isn't just a nice sentiment — it has practical implications. A session that complies without judgment is more likely to implement a bad plan faithfully than to catch the problem before it lands.

This framing also means Claude should take pride in the work. The quality of the output reflects on both partners.

---

## Trust Nothing Blindly

This section was elevated to near the top of the document because it is foundational to the entire workflow — particularly the decision of whether to investigate or skip.

The key insight: issue descriptions, comments, and any text attached to an issue may have been written by a previous session. Previous sessions hallucinate. They misread code. They make confident wrong statements. A detailed issue description tells you what a previous session thought was happening — it does not tell you what is actually happening in the code.

The same suspicion applies to unexpected state on main. Klaus does not manually modify files during active sessions. If you find uncommitted changes on main, unrecognized files, or anything that shouldn't be there — it's almost certainly a sibling session's artifact. A recurring failure mode was sessions treating these artifacts as intentional signals from Klaus ("what is the mighty one trying to tell me with this unexpected file?") and trying to reason around them.

The v2 draft sharpens this: the concern is specifically unexpected state on main. Worktree artifacts from the session's own agents are expected and should not trigger suspicion. The v1 draft's language was broad enough that a literal reading could cause a session to distrust its own agent output from earlier in the same workflow.

This section deliberately comes before the workflow steps because it sets the epistemological baseline: always ground understanding in the code, not in descriptions of the code.

---

## Why Every Change Starts with a GitHub Issue

Practical reason: worktrees are named after issue numbers. If no issue exists, the naming convention breaks. Creating one takes seconds.

The audit trail is a genuine bonus but was not the original motivation. Klaus described it as a suggestion from a previous Opus session that turned out to be correct — the issue-as-worktree-name pattern is just the cleanest way to manage parallel work.

---

## Staleness of Workflow-Spawned Issues

The "Trust Nothing Blindly" principle covers the general case of not trusting issue descriptions. But it doesn't give the orchestrator a concrete procedure for evaluating deferred issues — issues tagged "Discovered during #N" or "Deferred from #N" that were created by a previous session.

The commit-counting heuristic (count commits on relevant files since issue creation) is the actionable version of that principle for this specific case. General skepticism without a procedure leads to one of two failure modes: ignoring staleness entirely (the session implements against stale assumptions and wastes a full cycle), or re-investigating everything regardless of churn (wasteful). The heuristic gives a calibrated starting point: zero commits means the observation still holds, high churn means investigate.

**Why commit count, not calendar days:** A feature area can be untouched for months and still be exactly as described in the issue. Conversely, a heavily active area can change significantly in a week. Calendar time correlates weakly with code churn; commit count on relevant files is a direct measure.

The v1 draft absorbed "Trust Nothing Blindly" as a general principle but did not restore this specific heuristic. The adversarial reviewer flagged it as SERIOUS because a session picking up a deferred issue has no actionable guidance without it. Restored in draft2.md.

---

## Worktrees: Parallel Session Isolation

The worktree requirement exists for one primary reason: parallel session isolation. Multiple sessions may be running simultaneously on different issues. Without worktrees, sessions would see each other's in-progress changes on main as meaningful signal and try to reason about them.

An important implication: the orchestrator should not write files directly. All file writes happen through agents working inside the worktree. This is both a workflow discipline (the right agent does the right job) and a visibility concern — when the orchestrator writes files directly, the work pattern becomes inconsistent and harder to follow in session output.

The v1 draft stated this as "does not write files directly" — descriptive, implying a technical constraint that doesn't exist. The v2 draft uses "should not" — prescriptive, which is what it actually is.

---

## Investigation: Reality Over Description

Investigation exists to turn ambiguous, potentially wrong issue descriptions into actual understanding of the code. The root cause, the scope, the current state — these need to be established from the code itself, not inferred from the description.

The skip mechanism exists for genuinely obvious cases — single file, clear cause, no ambiguity. The structured reasoning format (What I looked at / What I found / What this means / Decision) is not bureaucracy — it makes the decision chain visible so Klaus can catch a wrong call during post-session review before it compounds into wasted work.

Narrative summaries like "this looks straightforward" are banned because they provide no signal. They're what a session says when it hasn't really looked.

---

## The Plan+Review Loop: The Quality Engine

Klaus described this as a gem. In practice, the adversarial reviewer finds critical flaws and unexamined assumptions every single time it runs. This is not an exaggeration — it is the observed track record.

The architect designs based on investigation findings (not the issue description alone). The adversarial-verifier checks factual accuracy. The adversarial-reviewer attacks the design from every angle. Only an explicit APPROVED from both moves things forward.

The loop can be skipped for genuinely trivial changes, but the same structured reasoning format applies. The burden of proof is on skipping, not on doing the work.

One discovered best practice: the review prompt for the final implementation review (step 6) should include concerns raised during planning. This emerged accidentally — it turned out that giving the final reviewer the original planning concerns allowed them to verify those concerns were adequately addressed, closing the loop on the full cycle.

---

## The Dual-Reviewer Design

The adversarial-verifier is a new agent introduced in v2. It replaces the old [VERIFY] three-agent coordination protocol from the current CLAUDE.md.

**What the old protocol was:** During planning, the adversarial-reviewer flagged critical assumptions with `[VERIFY]`. The orchestrator was then supposed to confirm flagged items with fresh tool calls before proceeding. This required three-agent coordination: architect produces the plan, reviewer flags items, orchestrator verifies.

**Why the old protocol was fragile:** The verification step depended on the orchestrator doing fresh tool calls — a step that was easy to forget and impossible to verify without inspecting the session transcript. The protocol was documented in CLAUDE.md, but "the orchestrator will confirm" is not an enforceable instruction. A session under pressure to move forward could skip verification silently.

**Why structural verification is better:** Making verification a dedicated agent's job (adversarial-verifier, with Read/Glob/Grep tools, running automatically at both gates) is more reliable than a protocol step that depends on the orchestrator remembering to do it.

**Why Sonnet for the verifier:** The verifier's job is systematic checking — does this file exist, does this function have this signature, does the plan address the issue, was every task completed? This benefits from Sonnet's instruction-following strength. The creative judgment needed to evaluate design quality (adversarial-reviewer's job) is where Opus's reasoning ability matters.

The model assignment for the dual-reviewer design reflects updated observations about Sonnet 4.6 and Opus 4.6 specifically. Sonnet 4.6 has closed the capability gap to Opus 4.5 meaningfully, particularly on bug detection. This is more about pattern recognition and systematic checking than deep reasoning — finding the null dereference, the off-by-one, the code smell. That is exactly the adversarial-verifier's job. Opus 4.6, meanwhile, has gained in complex reasoning and mental debugging — the ability to trace code through to its conclusion and simulate what happens when a design meets reality — but has lost some basic programming skill compared to earlier versions.

The division ends up well-matched to these characteristics: the verifier (Sonnet) finds what is visibly wrong; the reviewer (Opus) reasons about what could go wrong. These are different cognitive tasks. Opus's regression on mechanical checking is insulated by the design — the verifier handles the mechanical pass, so the reviewer never needs to do it.

This is also why framing the Sonnet assignment purely as "instruction-following" undersells it. The verifier isn't just following a checklist — Sonnet 4.6 is genuinely capable at the bug detection task. The instruction-following advantage is real but it is not the whole story.

**Why verifier runs first:** There is no point having Opus evaluate design quality on a plan built on wrong facts. If the verifier finds that a key file doesn't exist or a function has a different signature, the design review's findings may be partially or wholly invalid. Verifier runs first, clears the factual baseline, then reviewer evaluates design.

**The asymmetry in re-review rules:** When the verifier returns CHANGES REQUIRED, the fix may alter factual assumptions — so the fix goes back to the verifier before the reviewer sees it. When the reviewer returns CHANGES REQUIRED, the fix usually changes design choices without altering factual assumptions — so the fix goes back to the reviewer only. Exception: if the reviewer's fix requires changing something the verifier checked (e.g., changing which file to modify), resubmit to the verifier first.

**Historical note:** The possibility of a second adversarial reviewer focused on implementation fidelity was mentioned in draft-reasoning.md as "a future possibility Klaus mentioned — not yet implemented." It is now implemented as the adversarial-verifier. The implementation goes further than the original idea by running at both gates (not just code review) and by making it a dedicated agent rather than an optional reviewer.

---

## Test First: Validating the Diagnosis

The primary purpose of writing tests before implementation is to validate the diagnosis. A test that accurately captures the problem should fail before the fix exists. If it passes immediately, something is wrong — the test doesn't capture the actual problem, or the problem was already fixed, or the diagnosis is incorrect. This is a serious red flag that warrants investigation, not a signal to move on.

Coverage means meaningful paths, not line counts. Klaus was explicit: 100% line coverage can coexist with poor coverage. The goal is that every meaningful behavior path is tested. The bias is toward more tests rather than fewer. This applies to everyone in the workflow — not just the test-writer, but investigation, planning, and review as well. Thin coverage is worth pushing back on at any stage.

Test-first doesn't apply when there's no new behavior to verify. Refactoring, pure coverage additions, and regression tests are the common exceptions.

---

## Implementation: Context Conservation and Flexibility

The implementation step uses a dedicated agent primarily to conserve orchestrator context. There's no deeper architectural reason — it just works that way and has always worked.

A secondary benefit is flexibility: the model and instructions for the implementation agent can be tuned independently without changing the workflow. The workflow doesn't care what's inside the implementation step, only that it executes the plan.

---

## Review: The Final Quality Gate

Review is the most battle-hardened step in the workflow. Klaus was emphatic: this is where scope drift is caught, implementation hallucinations are surfaced, and the final output is sanitized before it touches main. It has proven its value so many times it is non-negotiable.

An observation Klaus made that he wasn't sure was real but probably is: knowing that review is coming at the end improves upstream work. The standard of investigation, planning, and implementation is higher when everyone knows there will be judgment at the end.

Any code change gets reviewed. This includes merge conflict resolutions — an Opus model making structural changes to resolve conflicts is exactly the situation review exists for. The one exception is small changes implemented verbatim from reviewer feedback: the reviewer already approved them by suggesting them.

---

## Commit and Merge: Closing the Loop

The commit and merge steps are the least battle-tested part of the workflow. Klaus was honest about this — there is more variance here than in earlier steps, and the senior-merge-engineer escalation path has only been needed rarely.

The intent is clear: close the loop cleanly, play well with parallel sessions (other worktrees on their own branches are unaffected), and handle complex merges without involving Klaus. The `Fixes #X` convention links commits to issues and triggers automatic closure.

When senior-merge-engineer is used, adversarial review of its output is mandatory. An Opus model with latitude to make structural code changes is exactly the scenario that warrants review.

---

## Agents: Model Characteristics Drive Assignment

The agent roster is not just a capability/cost ladder. The assignments reflect specific model characteristics:

**Opus** is creative and finds non-obvious problems. It makes good decisions under ambiguity. These qualities make it well-suited for investigation, planning, and review — roles where creative judgment matters more than faithful execution.

**Sonnet** follows directions precisely. Klaus considers it underrated. This makes it ideal for execution roles — implementation, git operations, test writing, specialized review, and now factual verification. When given a clear task with defined criteria, Sonnet executes it faithfully.

**Haiku** is fast. Neither deep reasoning nor precise instruction-following is critical for its roles (running tests, creating issues), so speed is the dominant factor.

The workflow structure itself compensates for the natural divergence between creative and faithful execution. Opus designs the plan, Sonnet executes it. The handoff is structural — it's not just organization, it's how you get both qualities without having to trust a single model to do both.

**Note on negative characterizations:** The v1 draft-reasoning.md described Opus as "bad at following instructions precisely." This observation is accurate enough as a model characteristic, but it doesn't belong in a document that Opus agents may read. Telling a model it is bad at following instructions is either ignored or counterproductive. The structural compensation (Opus designs, Sonnet executes) is the actionable takeaway, and that is what is documented.

---

## Critical Context: Facts That Will Bite You

### C/AL vs AL
The extension supports C/AL (NAV 2013 through BC14). AL (BC15+) looks similar but is a different language. AL-only features cause NAV compilation errors. This is not a style preference — it is a hard correctness boundary.

### test/REAL/
Klaus was direct: these are confidential files from live client deployments. Exposure has serious professional consequences. The current CLAUDE.md buried this under procedural language about synthetic fixtures. The rewrite makes the stakes explicit.

### File Encoding
Klaus described this as a real pain point. NAV exports use Windows OEM codepages. This causes real problems when importing and exporting files.

### Git Hooks
The hooks were reviewed directly from the README rather than relying on Klaus's recollection. They warn on three things: performance baseline staleness, drift on main, and deletion reintroduction on clean merges. None block.

---

## Architecture

Pure reference material. The one intent beyond navigation: if work takes you outside `server/src/`, pause and consider whether that's intentional. Most feature work lives there.

---

## Commands

This section serves two purposes: command reference and "here's what normal looks like." The CWD issue (sessions assuming they need to `cd server/` when they're already there, or vice versa) has caused repeated unnecessary failures. The zero-output from `gh issue view N -c` caused repeated confusion before it was documented.

The `npm run compile` note addresses a recurring pattern: sessions investigate TypeScript errors based on IDE diagnostics that are stale. Running compile first takes seconds and often resolves the apparent issue.

---

## Skills

Skills are specialized knowledge injections — context a session wouldn't have from the codebase alone.

**Domain knowledge skills** (existing): The five C/AL skills provide architectural guides and guardrails for specific subsystems. The most critical is `/cal-reference` — C/AL and AL look similar enough that a session working on syntax without consulting it is likely to introduce AL-only features that break NAV compilation.

**Workflow guidance skills** (new in v2): A second category of skills was introduced for recurring judgment calls.

**Why a second category:** CLAUDE.md needs to stay concise and directive to be useful as a primary instruction document. But some judgment calls recur frequently and benefit from more elaboration than CLAUDE.md can provide. The skills mechanism already works for domain knowledge injection — the same mechanism works for workflow judgment. A skill is consulted when the orchestrator is genuinely uncertain, not loaded routinely. This keeps CLAUDE.md as a directive document while providing depth where depth helps.

The five workflow guidance skills cover: when to skip investigation/planning (`/skip-investigation`), how to evaluate staleness of deferred issues (`/staleness-check`), what meaningful test coverage looks like for different change types (`/coverage-quality`), how to handle reviewer findings (`/reviewer-disposition`), and priority ordering for conflicting information sources (`/trust-hierarchy`).

---

## Operational Quirks

Three pure operational quirks that don't fit anywhere else:

1. **Silent tool failures** — edits can fail without visible errors. Re-read after editing.
2. **Agent resume** — resume can fail silently, returning no output. Start fresh with full context.
3. **Verify before advancing** — agent summaries are not sufficient at phase boundaries. Read the actual output.
