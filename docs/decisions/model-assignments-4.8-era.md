# Model-Tier Assignments — Opus 4.8 Era

**Status:** Approved by Klaus (issue #796); applied to live config in the same change.
**Date:** 2026-05-30
**Supersedes:** the model-assignment rationale in `draft2-reasoning.md` and the "Agents" section of CLAUDE.md (capability-tiering framing, Feb 2026).

---

## Why this document exists

The instruction-system v2 (Feb 2026) assigned each agent a model using a **capability-tiering** rationale: "Opus is creative and finds non-obvious problems; Sonnet follows directions precisely; Haiku is for speed." The two-reviewer split was justified the same way — "Sonnet finds what is visibly wrong, Opus reasons about what could go wrong" — which assumed Sonnet ≈ Opus-minus-a-little.

That assumption has expired. As of this writing:

- The **orchestrator** runs on **Opus 4.8**.
- **Sonnet** is still **4.6** (not updated since early 2026).
- **Haiku** is **4.5** (older still).

The orchestrator memory carried a standing trigger — *"Revisit model assignments when 4.7+ arrives."* It has fired. Klaus's own read (2026-05-30): Sonnet 4.6 has fallen far enough behind that Opus 4.8 is now the better orchestrator, and Haiku has slipped enough that its blast-radius-sensitive roles are no longer safe on it.

The problem with the old rationale is not that its *conclusions* were wrong — most assignments still hold — but that its *reasoning* ("which model is smarter") goes stale every time a model ships. This document re-derives the assignments from principles that survive model updates.

---

## Three durable principles

Assign models by these, in order, instead of by raw capability ranking:

### 1. Match the model to the task's *shape*, not its prestige

- **Open-ended judgment** — root-cause investigation, design/planning, design review, complex merge resolution. The space of right answers is wide and the failure mode is "plausible but wrong." → **Opus**.
- **Bounded / checkable** — factual verification against the code, domain linting (TypeScript, C/AL), faithful execution of an already-detailed plan, git mechanics. There is a checkable right answer. → **Sonnet** is sufficient.
- **Templated / trivial** — filing an issue from a template. Cosmetic if imperfect. → **Haiku** is sufficient.

### 2. Seek independence at the verification gates — when it's available and cheap

This is a *weighted preference*, not a law. The workflow ran fine before the verifier existed, and a same-model gate is not broken on its face — so independence is something to seek when a genuine, low-cost second perspective is on the table, not a constraint the architecture must always satisfy. It happens to add a lot of value right now; that is a fact about the current lineup, not a permanent rule.

Why it pays off *now* specifically: with Opus orchestrating **and** planning (architect) **and** design-reviewing (adversarial-reviewer), a large fraction of the workflow's judgment flows through one model reasoning in one style. A *different* model checking that chain's factual claims catches errors a same-style reviewer would wave through. This is not hypothetical: in the #791 session, the Opus orchestrator's plan asserted a factual claim ("referenceProvider.ts:264 is the sole caller of resolveOriginIdentity") that the Sonnet verifier refuted by finding 14 additional callers in the test suite. An all-Opus pipeline that shared the orchestrator's framing was more likely to wave that through.

Note what this does *not* rest on. The two-reviewer architecture earns its place primarily through **separation of concerns** — facts (verifier) vs design quality (reviewer) — which holds even if both ran on the same model. Model diversity is an *amplifier* on top of that separation: valuable while the conditions favor it, not the foundation.

**Current call (not a rule):** while the orchestrator is Opus, run the factual-verification gate on a different model (Sonnet today). Re-decide it if the lineup changes — for instance, if some future single model is dominant enough that a weaker second perspective adds little, a same-model gate could be the right trade. The principle is "weigh independence," not "always two models."

### 3. Weight capability by blast radius

The cost of a role's failure determines how much capability it warrants:

- A bad **merge** or a wrong **"tests pass"** verdict can corrupt main → high blast radius → never the weakest available model.
- A malformed **GitHub issue** is cosmetic and trivially fixed → low blast radius → the weakest model is fine.

This is what separates the two roles that were both "Haiku" under the old scheme.

---

## The assignments

| Agent | Old | New | Rationale |
|-------|-----|-----|-----------|
| **orchestrator** | Sonnet 4.6 | **Opus 4.8** | Sonnet has not kept pace; Opus 4.8 is now the stronger orchestrator (P1 judgment role). No file sets this — documentation only. |
| **test-runner** | Haiku | **Sonnet** | Its verdict gates the merge (P3 high blast radius). Haiku 4.5's documented CWD/triage flakiness is no longer acceptable at that cost. |
| **github-issues** | Haiku | **Haiku** | Templated, bounded, cosmetic if wrong (P1 templated, P3 low blast radius). The one role Haiku still fits — and the first to move if Haiku degrades further. |
| **adversarial-verifier** | Sonnet | **Sonnet** | A *different* model from the Opus chain — currently a valuable independent check (P2), not a weaker microscope. Its primary justification is separation of concerns (facts vs design); model diversity amplifies it. |
| **cal-expert** | Sonnet | **Sonnet** | Bounded domain check (C/AL correctness, AL prevention) + a second model at the review gate (P1, P2). |
| **typescript-reviewer** | Sonnet | **Sonnet** | Bounded domain check (type safety, lint) + independence (P1, P2). |
| **senior-developer** | Sonnet | **Sonnet** | Faithful execution of an Opus-authored plan is Sonnet's sweet spot, and it preserves model diversity in the pipeline (P1). **Watch-trigger:** revisit → Opus if implementation quality slips on ambiguous/under-specified plans. This is the role most exposed to Sonnet 4.6's drift; it is the next promotion candidate after test-runner. |
| **test-writer** | Sonnet | **Sonnet** | Bounded (write tests that fail-first against a stated diagnosis), executes a defined intent (P1). |
| **file-ops** | Sonnet | **Sonnet** | Git mechanics — bounded and checkable (P1). Standing safeguard: the orchestrator independently verifies commit SHAs / clean-tree / remote-match, because git agents can mis-report (a file-ops agent hallucinated a commit SHA in the #791 session; the orchestrator caught it by reading `git log` directly). |
| **merge-agent** | Sonnet | **Sonnet** | First-attempt trivial/textual merges — bounded, with an explicit escalation path (P1, P3). |
| **architect** | Opus | **Opus** | Design and planning — open-ended judgment (P1). |
| **code-detective** | Opus | **Opus** | Root-cause investigation — open-ended judgment (P1). |
| **adversarial-reviewer** | Opus | **Opus** | Design-quality review — open-ended judgment, the "what could go wrong" gate (P1). |
| **senior-merge-engineer** | Opus | **Opus** | Structural/semantic merge resolution — high-judgment and high blast radius (P1, P3). |

### Net live changes

Only **two** assignments actually change, plus a rewritten rationale:

1. **orchestrator → Opus 4.8** — documentation only (no file pins the orchestrator model; it is whatever model the session runs).
2. **test-runner → Sonnet** — one frontmatter line (`.claude/agents/test-runner.md`) and one cell in the CLAUDE.md table.

Everything else keeps its current model but is now justified by task-shape / independence / blast-radius rather than by capability tiering.

---

## What deliberately did NOT change, and why

- **The two-reviewer architecture stays.** Verifier-first (facts), then reviewer (design). Both gates, both phases. The split is justified first by *separation of concerns* (facts vs design quality), which holds on any model; model diversity (P2) currently amplifies it. Both are sturdier reasons than the old "microscope vs telescope" capability framing.
- **No collapse to an all-Opus pipeline (under the current lineup).** Even though Opus is strongest, running every review on it too would, *while the orchestrator is also Opus*, reduce the workflow's ability to catch the orchestrator's own errors (P2). That is a reason to keep diversity now — a circumstantial call, not a permanent prohibition.
- **The workflow steps, review gates, worktree discipline, and escalation paths are untouched.** This document is only about *which model* runs each role, not *what the roles do*.

---

## When to revisit (the new standing triggers)

- **A new Sonnet ships (4.7+):** re-evaluate senior-developer, test-writer, and the watch-triggered senior-developer promotion; a stronger Sonnet may also reopen the orchestrator question.
- **A new Haiku ships:** re-evaluate whether test-runner can return to Haiku, and whether other bounded Sonnet roles (file-ops, merge-agent) could drop a tier.
- **A new Opus ships:** the orchestrator follows it; re-check that the verifier remains a *different* model from the orchestrator (P2).
- **If senior-developer output quality degrades** on ambiguous plans: promote it to Opus (the pre-registered watch-trigger).
- **If github-issues output degrades:** it is the first Haiku role to promote to Sonnet.

There is no invariant here — not even the independence of the gates. Running the factual-verification gate on a different model from the orchestrator is a high-value default *given the current model lineup*; keep it while that holds, and re-decide it, like every other assignment in this document, when the lineup changes.
