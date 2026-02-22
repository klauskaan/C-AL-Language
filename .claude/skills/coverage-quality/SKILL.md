---
name: coverage-quality
description: What meaningful test coverage looks like for different change types in this codebase
---

## Meaningful Test Coverage

Coverage means meaningful paths, not line counts. 100% line coverage can coexist with poor coverage if all paths through the code converge on the same behavior. The goal is that every meaningful behavior — including failure modes — is exercised.

## Coverage by Change Type

**Bug fix**

At minimum:
- The failing case that demonstrates the bug (this is the test-writer's primary job in TDD)
- Edge cases identified in the investigation report
- A regression guard for the specific input that triggered the bug report

If the investigation report identified additional affected cases, each one should have a test. A bug fix with a single test that covers only the reported input is thin coverage.

**New feature**

- Happy path (the documented usage)
- Error and invalid input paths (what happens when the feature is misused?)
- Boundary conditions (limits of valid input)
- Interaction with existing features that touch the same code

A new feature with only a happy-path test is missing at least half the important cases. Error paths are often where bugs live.

**Refactoring**

Existing tests must keep passing. No new tests required unless coverage gaps are discovered during the refactor. If you discover that a refactored path had no test, add one — but this is a coverage gap finding, not a refactoring requirement.

**Parser changes**

- Use realistic C/AL syntax, not toy examples. A test that uses `OBJECT Table 1 T { FIELDS { } }` is less useful than one using actual field definitions with properties.
- Test error recovery: what happens with malformed input? The parser should not crash; it should produce errors and continue parsing.
- Test the boundaries of what the parser accepts and rejects. If you're adding support for a new construct, test that the parser correctly rejects near-misses (missing keywords, wrong order, etc.).
- Refer to the error location tier system in `/cal-dev-guide` when writing error-detection tests — the tier determines whether to assert on location.

## When to Push Back on Thin Coverage

Everyone in the workflow can flag thin coverage, not just the test-writer:
- **Investigation:** the detective can note that the identified root cause has broader impact than the specific reported case
- **Planning:** the architect can note that the implementation plan doesn't include tests for error paths
- **Review:** both reviewers can flag missing coverage as a finding
- **Implementation:** the developer can note that the plan's test coverage is thin and ask for guidance

## The "Err on the Side of More Tests" Principle in Practice

An extra test that turns out redundant costs minutes to write and runs in milliseconds. A missing test that would have caught a regression can cost hours of investigation to diagnose.

When in doubt, write the test. The cost asymmetry strongly favors more tests. The only exception is tests that are genuinely redundant — not "probably covered" but demonstrably covered by an existing test that exercises the same path.
