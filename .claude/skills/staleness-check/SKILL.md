---
name: staleness-check
description: How to evaluate whether a deferred or workflow-spawned issue is still valid
---

## Evaluating Staleness of Deferred Issues

Issues created during work on another issue may go stale if the referenced code changes after filing. This skill gives you a concrete procedure.

## When This Applies

- Issue body says "Discovered during #N" or "Deferred from #N"
- Issue was not created by you in this session
- Any issue that references specific code you haven't verified exists

## How to Count Relevant Commits

Find the issue creation date from GitHub. Find the relevant files from the issue body — what files does the issue describe as affected?

```bash
git log --oneline --after="YYYY-MM-DD" -- path/to/relevant/files | wc -l
```

Use the issue creation date. Substitute actual paths from the issue body.

If the issue mentions multiple files:
```bash
git log --oneline --after="YYYY-MM-DD" -- file1 file2 file3 | wc -l
```

## Interpreting Results

| Commit count | Interpretation | Action |
|-------------|----------------|--------|
| 0 commits | Original observation still holds | Proceed normally |
| 1–3 commits | Probably fine, worth a quick look | Skim the diffs, confirm the issue area is unchanged |
| 4+ commits | Area has changed significantly | Investigate — treat like a fresh issue |
| File deleted or renamed | Issue may be invalid | Check if the problem still exists elsewhere |

To skim the changes when count is 1-3:
```bash
git log --oneline --after="YYYY-MM-DD" -- path/to/files
```

Then for any suspicious commit: `git show <hash>` to see what changed.

## When Staleness Invalidates Entirely

- The code was refactored away and the issue's described problem no longer exists
- The bug was fixed as a side effect of work on a different issue
- The function or type described in the issue no longer exists with that name

In these cases: close the issue with a comment explaining what changed, or verify the problem still exists and update the issue body.

## When Staleness Requires Re-Investigation But Does Not Invalidate

- The area changed but the underlying issue pattern likely persists
- The specific code described in the issue was refactored, but the root cause could apply to the new code too
- New behavior was added to the same area, and it's unclear whether the issue covers the new behavior

In these cases: investigate. The issue may still be valid, but the original observation needs to be verified against the current code.

## Relationship to Trust Nothing Blindly

This procedure is the actionable version of "Trust Nothing Blindly" for the specific case of workflow-spawned issues. The general principle is: trust the code over any description of the code. The staleness-check makes that concrete: count commits, read the diffs, verify the observation still holds.
