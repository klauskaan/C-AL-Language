# Implementation Plan: Lazy Trivia Computation & Lexer Validation System

**Status:** In Progress - Revision 7 (Tasks 1, 2, 3, 4, 5 & 8 complete)
**Created:** 2026-01-14
**Last Updated:** 2026-01-14
**Authors:** Architect Agent, Adversarial Reviewer

---

## Revision Log

### Revision 7 (2026-01-14)
Task 4 completed - Position-based validation implemented with comprehensive edge case handling.

| Update | Details |
|--------|---------|
| Task 4 complete | Position validator with 33 tests, special handling for String/QuotedIdentifier/Unknown tokens (commit 0dfb841) |
| Bug fixed | Empty unclosed string/identifier edge case (critical bug found in adversarial review) |
| DRY compliance | Imported `looksLikeCode` from triviaComputer instead of duplicating |

### Revision 6 (2026-01-14)
Task 8 completed - Lexer snapshot tests with comprehensive coverage.

| Update | Details |
|--------|---------|
| Task 8 complete | 50 snapshot tests covering core structures, context-dependent tokenization, nested blocks, and edge cases (commit 810c1d3) |

### Revision 5 (2026-01-14)
Task 3 completed - Trivia computer utility implemented.

| Update | Details |
|--------|---------|
| Task 3 complete | TriviaComputer class with leading/trailing trivia support (commit cb29bad) |

### Revision 4 (2026-01-14)
Task 5 completed - Dead whitespace-handling code removed from parser.

| Update | Details |
|--------|---------|
| Task 5 complete | Simplified `peekNextMeaningfulToken()` and removed dead whitespace loop (commit 16f7c3e) |

### Revision 3 (2026-01-14)
Final fix for Unknown token handling.

| Issue | Severity | Resolution |
|-------|----------|------------|
| Unknown token validation assumes document slice equals token value | CRITICAL | Fixed: Task 4 now handles unclosed strings/quoted identifiers where positions include delimiters but values exclude them |

### Revision 2 (2026-01-14)
Addresses adversarial reviewer feedback from initial review.

| Issue | Severity | Resolution |
|-------|----------|------------|
| String escaped quotes validation will fail on `'don''t'` | CRITICAL | Fixed: Task 4 now includes complete escaped quote handling with algorithm |
| peekNextMeaningfulToken is NOT dead code (used at lines 1691, 1742) | CRITICAL | Fixed: Task 5 completely rewritten - method is preserved, only lines 1070-1073 removed |
| Brace comment context assumption may mask lexer bugs | CRITICAL | Fixed: Task 3 and Task 4 now include safeguards and validation rules |
| Clean exit criteria might enshrine bugs | SERIOUS | Addressed: Task 2 now includes explicit handling for variance discovery |
| Constructor signature change is breaking | SERIOUS | Fixed: Task 7 uses options object pattern for backward compatibility |
| Trailing trivia API gap | SERIOUS | Addressed: Task 3 adds `computeTrailingTrivia()` function |
| Performance thresholds arbitrary (10ms) | SERIOUS | Addressed: Task 6 now uses percentile-based outlier detection |
| Unknown token handling unclear | SERIOUS | Addressed: Task 4 explicitly handles Unknown tokens with document slice |
| .gitignore not explicit task | SERIOUS | Fixed: Added as prerequisite step in Task 6 |
| Dependency graph confusion | SERIOUS | Fixed: Corrected and simplified dependency graph |

---

## Summary

This plan implements two related features: (1) a lazy trivia computation utility that allows on-demand extraction of whitespace and comments from document positions without modifying the lexer or token interface, and (2) a comprehensive lexer validation system with automated health reports and on-demand debug tracing. The features are sequenced to build upon each other, with trivia computation being a prerequisite for accurate round-trip validation.

---

## Task Index & Implementation Order

Quick reference for GitHub issues and recommended implementation sequence:

### Phase 1: Foundation (Parallelizable)

| Task | Issue | Title | Status | Priority | Dependencies |
|------|-------|-------|--------|----------|--------------|
| **Task 1** | [#87](https://github.com/your-repo/issues/87) | Add Lexer State Accessor Methods | ✅ Complete | High | None |
| **Task 3** | [#88](https://github.com/your-repo/issues/88) | Implement Lazy Trivia Computer Utility | ✅ Complete | High | None |
| **Task 5** | [#89](https://github.com/your-repo/issues/89) | Refactor Parser Dead Code | ✅ Complete | Medium | None |
| **Task 8** | [#90](https://github.com/your-repo/issues/90) | Create Lexer Snapshot Tests | ✅ Complete | Medium | None |

### Phase 2: Specifications

| Task | Issue | Title | Status | Priority | Dependencies |
|------|-------|-------|--------|----------|--------------|
| **Task 2** | [#91](https://github.com/your-repo/issues/91) | Establish Clean Exit Criteria Definition | ✅ Complete | High | Task 1 |
| **Task 4** | [#92](https://github.com/your-repo/issues/92) | Implement Position-Based Validation | ✅ Complete | High | Task 3 |

### Phase 3: Health Report

| Task | Issue | Title | Status | Priority | Dependencies |
|------|-------|-------|--------|----------|--------------|
| **Task 6** | [#93](https://github.com/your-repo/issues/93) | Implement Lexer Health Report Script | ⏳ Pending | High | Tasks 1, 2, 4 |

### Phase 4: Debugging & Documentation

| Task | Issue | Title | Status | Priority | Dependencies |
|------|-------|-------|--------|----------|--------------|
| **Task 7** | [#94](https://github.com/your-repo/issues/94) | Implement Debug Trace Infrastructure | ⏳ Pending | Medium | Task 1 |
| **Task 9** | [#95](https://github.com/your-repo/issues/95) | Document Comment Handling Policy | ⏳ Pending | Low | Task 3 |

### Phase 5: CI Integration (Optional)

| Task | Issue | Title | Status | Priority | Dependencies |
|------|-------|-------|--------|----------|--------------|
| **Task 10** | [#96](https://github.com/your-repo/issues/96) | Integrate Lexer Health into CI | ⏳ Pending | Low | Task 6 |

**Legend:**
- ✅ Complete - Implemented and committed
- ⏳ Pending - Not yet started
- 🚧 In Progress - Currently being worked on
- ⚠️ Blocked - Waiting on dependencies

---

## Quick Reference: Task Dependencies

For efficient context loading, this table shows which tasks to load together:

| To work on... | Load these tasks first | Reason |
|---------------|------------------------|--------|
| Task 1 | Just Task 1 | Foundation - no dependencies |
| Task 2 | Tasks 1, 2 | Depends on Task 1's `LexerContextState` |
| Task 3 | Just Task 3 | Foundation - no dependencies |
| Task 4 | Tasks 3, 4 | Depends on Task 3's trivia functions |
| Task 5 | Just Task 5 | Independent refactoring |
| Task 6 | Tasks 1, 2, 4, 6 | Full validation chain |
| Task 7 | Tasks 1, 7 | Depends on Task 1's state accessor |
| Task 8 | Just Task 8 | Independent testing |
| Task 9 | Tasks 3, 9 | Documents Task 3 decisions |
| Task 10 | Tasks 6, 10 | Builds on Task 6 |

---

## Task 1: Add Lexer State Accessor Methods

**Status:** ✅ COMPLETE (2026-01-14)
**Priority:** High
**Effort:** Small (1-2 hours)
**Dependencies:** None (foundation task)
**GitHub Issue:** #87
**Commit:** 80bf1e9

### Context

The lexer validation system requires access to internal lexer state (context stack, tracking flags) to verify correct behavior at EOF. Currently, the `LexerContext` enum and context stack are private, making it impossible to implement context health checks without modifying the Lexer class. The adversarial reviewer identified this as a compile-time blocker (Issue #2).

### Goal

Add minimal public accessor methods to the Lexer class that expose state information needed for validation and debugging, without compromising encapsulation.

### Acceptance Criteria

- [x] New `getContextState()` method returns current context stack information
- [x] Context state is returned as strings (not raw enum values) for stable API
- [x] Method returns all tracking flags: `braceDepth`, `bracketDepth`, `inPropertyValue`, `fieldDefColumn`, `currentSectionType`
- [x] Method returns `contextUnderflowDetected` flag for state corruption detection
- [x] All existing tests continue to pass
- [x] TypeScript compilation succeeds

### Implementation Summary

**Files Modified:**
- `server/src/lexer/lexer.ts` (+98 lines)
  - Exported `SectionType` union type (line 46)
  - Exported `LexerContextState` interface (lines 61-76)
  - Added `contextToString()` helper method (lines 1403-1413)
  - Added `fieldDefColumnToString()` helper method (lines 1421-1432)
  - Added `getContextState()` public method (lines 1450-1460)
  - Fixed context underflow detection for unmatched END keywords
  - Added context cleanup for re-tokenization support

- `server/src/lexer/__tests__/lexer.test.ts` (+260 lines)
  - Added 14 comprehensive test cases covering all acceptance criteria
  - Tests include edge cases: empty input, malformed input, re-tokenization, underflow detection

**Key Implementation Details:**
- Used explicit switch/case for enum-to-string conversion (not reverse mapping) to catch corruption early
- Preserved `SectionType` union type for type safety (not widened to string)
- Returned fresh snapshot objects (not mutable references to internal state)
- Implemented flat interface structure (simplified from nested structure in initial plan)

**Test Results:**
- All 2937 existing tests pass (no regressions)
- All 14 new tests pass
- TypeScript compilation succeeds

### Implementation Notes

**ACTUAL IMPLEMENTATION (differs from initial plan):**

The implementation used a simplified flat interface structure instead of the nested structure originally planned. This was approved by adversarial reviewer as an improvement.

**Interface structure:**
```typescript
export interface LexerContextState {
  contextStack: string[];  // Replaces: stack, depth, current
  braceDepth: number;
  bracketDepth: number;
  inPropertyValue: boolean;
  fieldDefColumn: string;
  currentSectionType: SectionType | null;  // Preserved union type, not widened to string
  contextUnderflowDetected: boolean;
}
```

**Helper methods for safe enum-to-string conversion:**
```typescript
private contextToString(context: LexerContext): string {
  switch (context) {
    case LexerContext.NORMAL: return 'NORMAL';
    case LexerContext.OBJECT_LEVEL: return 'OBJECT_LEVEL';
    case LexerContext.SECTION_LEVEL: return 'SECTION_LEVEL';
    case LexerContext.CODE_BLOCK: return 'CODE_BLOCK';
    case LexerContext.CASE_BLOCK: return 'CASE_BLOCK';
    default: throw new Error(`Unknown LexerContext value: ${context}`);
  }
}
```

**Key design decisions:**
- Used explicit switch/case instead of `LexerContext[c]` reverse mapping (safer - throws on unknown values)
- Flat interface structure (simpler than nested `flags` object)
- Removed redundant `depth` and `current` fields (computable from `contextStack`)
- Exported `SectionType` union for type safety
- All enums converted to strings for API stability

### Testing Requirements

- ✅ Unit test: `getContextState()` returns correct state after tokenizing simple object
- ✅ Unit test: `getContextState()` returns correct state after tokenizing object with code blocks
- ✅ Unit test: `contextUnderflowDetected` is true when context stack underflows
- ✅ Unit test: All flag values are correctly reflected
- ✅ Unit test: Empty input handling
- ✅ Unit test: Re-tokenization on same instance
- ✅ Unit test: Context values are strings (not enum numbers)
- ✅ Unit test: fieldDefColumn is string

---

## Task 2: Establish Clean Exit Criteria Definition

**Status:** ✅ COMPLETED (Commit a72439e)
**Priority:** High
**Effort:** Small (2-3 hours)
**Dependencies:** Task 1
**GitHub Issue:** #91 (closed)
**Required Interfaces:**
- `LexerContextState` - Task 1
- `getContextState()` - Task 1

**Completion Summary:**
Implemented `isCleanExit()` method on Lexer class with comprehensive validation of 6 exit criteria. Returns ALL violations for easier debugging. Includes lenient mode for RDLDATA underflow in Report objects. Implementation differs from plan (method vs standalone function) but provides better encapsulation. See commit a72439e for details.

**Related Issues:**
- #98 - Future: Expose object type in LexerContextState
- #99 - Docs: Update plan (this document) ✅ DONE
- #100 - Verify package exports

### Context

**✅ COMPLETED:** Empirical analysis of 7,677 real NAV files confirmed that well-formed files exit with `contextStack = ['NORMAL']`. The initial concern about `OBJECT_LEVEL` remaining was incorrect because the lexer's `tokenize()` method includes cleanup logic (lines 233-238 of lexer.ts) that pops structural contexts at EOF.

### Goal

Empirically determine and document the correct "clean exit" criteria by analyzing successful tokenizations of real NAV files, then define this as a testable specification.

### Acceptance Criteria

- [x] Analysis script runs against 100+ successfully-parsing files from test/REAL (7,677 files analyzed)
- [x] Document the ACTUAL exit state observed (context stack, braceDepth, all flags)
- [x] Identify any variation patterns (99.92% consistent, 6 truncated files, 149 RDLDATA underflow)
- [x] Define explicit clean exit criteria based on empirical findings (ExitCategory enum, CleanExitResult interface)
- [x] Write tests that verify correct files pass the clean exit check (19 comprehensive tests)
- [x] Write tests that verify known-corrupt states fail the clean exit check (all failure categories tested)
- [x] Variance documented (RDLDATA underflow is expected for Reports, lenient mode provided)

### Implementation Notes

**Create analysis script:** `/home/klaus/Source/C-AL-Language/server/scripts/analyze-lexer-endstate.ts`

```typescript
// Analyze lexer end states across all real files
// Output: Distribution of end states to determine "normal" exit criteria

import { readdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Lexer } from '../src/lexer/lexer';
import { readFileWithEncoding } from '../src/utils/encoding';

interface EndStateStats {
  stackSignature: string;  // e.g., "NORMAL,OBJECT_LEVEL"
  count: number;
  examples: string[];  // First 3 file names
  flagSummary: {
    braceDepth: number[];  // All observed values
    bracketDepth: number[];
    inPropertyValue: boolean[];
    contextUnderflowDetected: boolean[];
  };
}

const results = new Map<string, EndStateStats>();

// ... implementation to collect statistics ...

// KEY OUTPUT: If any file exits with contextUnderflowDetected=true,
// that's a lexer BUG to be investigated, not a valid "variant"
```

**Expected findings (to verify):**
- Most files end with `contextStack = ['NORMAL', 'OBJECT_LEVEL']`
- `braceDepth` should be 0 (all braces matched)
- `bracketDepth` should be 0 (all brackets matched)
- `inPropertyValue` should be false
- `contextUnderflowDetected` should be false

**Variance handling policy:**
- If >5% of files have different exit states, investigate root cause before defining criteria
- Files with `contextUnderflowDetected=true` are BUGS, not valid variants
- Document any legitimate variants (e.g., multi-object files) separately

**Create specification file:** `/home/klaus/Source/C-AL-Language/server/src/lexer/cleanExitCriteria.ts`

```typescript
export interface CleanExitCriteria {
  // Populated based on empirical analysis
  expectedStackPatterns: string[][];  // e.g., [['NORMAL', 'OBJECT_LEVEL']]
  braceDepth: 0;
  bracketDepth: 0;
  inPropertyValue: false;
  contextUnderflowDetected: false;
}

// Note: Implemented as a method on Lexer class, not standalone function
// lexer.isCleanExit(options?: CleanExitOptions): CleanExitResult

export enum ExitCategory {
  STACK_MISMATCH = 'stack-mismatch',
  UNBALANCED_BRACES = 'unbalanced-braces',
  UNBALANCED_BRACKETS = 'unbalanced-brackets',
  INCOMPLETE_PROPERTY = 'incomplete-property',
  INCOMPLETE_FIELD = 'incomplete-field',
  CONTEXT_UNDERFLOW = 'context-underflow'
}

export interface ExitViolation {
  category: ExitCategory;
  message: string;
  expected: any;
  actual: any;
}

export interface CleanExitResult {
  passed: boolean;
  violations: ExitViolation[];
  categories: Set<ExitCategory>;
}

export interface CleanExitOptions {
  allowRdldataUnderflow?: boolean; // For Report objects with RDLDATA sections
}
```

### Testing Requirements

- Test that `isCleanExit()` returns true for correctly tokenized minimal object
- Test that `isCleanExit()` returns true for correctly tokenized complex object with CODE section
- Test that `isCleanExit()` returns false when `braceDepth !== 0`
- Test that `isCleanExit()` returns false when `contextUnderflowDetected === true`
- Test that `isCleanExit()` returns false when stack is in unexpected state

---

## Task 3: Implement Lazy Trivia Computer Utility

**Priority:** High
**Effort:** Medium (3-4 hours)
**Dependencies:** None (can parallel with Task 1-2)
**GitHub Issue:** #88

### Context

The whitespace tokenization discussion concluded that lazy trivia computation is the right approach: extract whitespace and comments on-demand from document positions without modifying the lexer or token interface. This enables round-trip validation without the complexity of full trivia tokenization.

The API must use token array + index pattern (not individual tokens) to prevent version mismatch between document and tokens.

### Goal

Create a new utility module that computes trivia (whitespace, newlines, comments) between adjacent tokens by extracting the text from the source document using token position information.

### Acceptance Criteria

- [x] New file `server/src/trivia/triviaComputer.ts` created
- [x] `TriviaSpan` interface defined with `startOffset`, `endOffset`, `text`, `type`
- [x] `computeTriviaBetween(document, tokens, index)` function implemented
- [x] `computeTrailingTrivia(document, tokens)` function implemented (trivia after last non-EOF token)
- [x] Handles edge case: trivia before first token (index = 0, prevToken = null)
- [x] Handles edge case: trivia before EOF token
- [x] Handles multi-line whitespace correctly
- [x] Handles Windows (CRLF) and Unix (LF) line endings
- [x] Comments within trivia are identified (not just whitespace)
- [x] All trivia types are classified: 'whitespace', 'newline', 'line-comment', 'block-comment'
- [x] Brace-style comments validated with `looksLikeCode()` heuristic (emits warnings)

### Completion Summary

**Status:** ✅ Complete (2026-01-14)
**Commit:** `cb29bad` - feat(trivia): implement trivia computer for whitespace and comment tokens (fixes #88)
**Test Results:** 47 tests passed, 14 skipped (brace comments in CODE_BLOCK require parser context)

**What Was Implemented:**

1. **TriviaComputer Module** (`server/src/trivia/triviaComputer.ts`, 395 lines)
   - `TriviaSpan` interface with `startOffset`, `endOffset`, `text`, `type`
   - `TriviaResult` interface with `spans` and `warnings` arrays
   - `TriviaType` = 'whitespace' | 'newline' | 'line-comment' | 'block-comment'

2. **Core Functions:**
   - `computeTriviaBetween(document, tokens, index)` - Extracts trivia before specified token
   - `computeTrailingTrivia(document, tokens)` - Extracts trivia after last meaningful token
   - `getTriviaText(document, tokens, index)` - Convenience function for simple text extraction

3. **Trivia Classification:**
   - Whitespace: spaces, tabs (consolidated into single spans)
   - Newlines: CRLF (`\r\n`), LF (`\n`), CR (`\r`) handled separately
   - Line comments: `//` to end of line
   - Block comments: C-style `/* */` and brace-style `{ }`

4. **Safety Features:**
   - `looksLikeCode()` heuristic warns if brace comment content resembles code
   - Detects patterns like `BEGIN`, `IF THEN`, assignment operators, semicolon endings
   - Handles unclosed comments gracefully (consumes to end of trivia region)
   - Emits warnings for unexpected characters in trivia

5. **Comprehensive Testing** (`server/src/trivia/__tests__/triviaComputer.test.ts`, 792 lines)
   - 47 tests covering all trivia types and edge cases
   - Position accuracy validation
   - Complex scenarios with mixed trivia
   - Warning system verification
   - 14 tests skipped (brace comments in CODE_BLOCK context need parser integration)

**Implementation Notes:**

The trivia computer works by analyzing gaps between adjacent tokens using document positions. It does NOT require lexer modifications or trivia tokens - instead, it extracts and classifies content from the source document on-demand. This lazy approach provides the foundation for round-trip validation while keeping the lexer simple.

The `looksLikeCode()` heuristic is a safeguard against lexer bugs where braces might be incorrectly treated as comments instead of tokens. While the lexer's context system should prevent this, the heuristic provides an additional validation layer.

### Implementation Notes

**Create file:** `/home/klaus/Source/C-AL-Language/server/src/trivia/triviaComputer.ts`

```typescript
import { Token, TokenType } from '../lexer/tokens';

/**
 * Trivia span types
 */
export type TriviaType = 'whitespace' | 'newline' | 'line-comment' | 'block-comment';

/**
 * A span of trivia (non-token content) in the source
 */
export interface TriviaSpan {
  startOffset: number;
  endOffset: number;
  text: string;
  type: TriviaType;
}

/**
 * Result of trivia parsing with optional warnings
 */
export interface TriviaResult {
  spans: TriviaSpan[];
  /** Warnings about unexpected content (may indicate lexer bugs) */
  warnings: string[];
}

/**
 * Compute trivia spans between adjacent tokens.
 *
 * @param document - The source document text
 * @param tokens - The token array from lexer.tokenize()
 * @param index - The index of the "current" token (trivia is BEFORE this token)
 * @returns TriviaResult with spans and any warnings
 *
 * @example
 * // Get trivia before first token (index 0)
 * const leadingTrivia = computeTriviaBetween(source, tokens, 0);
 *
 * // Get trivia between token 5 and token 6
 * const trivia = computeTriviaBetween(source, tokens, 6);
 */
export function computeTriviaBetween(
  document: string,
  tokens: Token[],
  index: number
): TriviaResult {
  if (index < 0 || index >= tokens.length) {
    return { spans: [], warnings: [] };
  }

  const currentToken = tokens[index];
  const prevToken = index > 0 ? tokens[index - 1] : null;

  const startOffset = prevToken ? prevToken.endOffset : 0;
  const endOffset = currentToken.startOffset;

  if (startOffset >= endOffset) {
    return { spans: [], warnings: [] }; // No gap between tokens
  }

  const triviaText = document.substring(startOffset, endOffset);
  return parseTriviaSpans(triviaText, startOffset);
}

/**
 * Compute trailing trivia after the last meaningful token.
 * This is trivia between the last non-EOF token and EOF.
 *
 * @param document - The source document text
 * @param tokens - The token array from lexer.tokenize()
 * @returns TriviaResult with spans and any warnings
 */
export function computeTrailingTrivia(
  document: string,
  tokens: Token[]
): TriviaResult {
  if (tokens.length === 0) {
    return { spans: [], warnings: [] };
  }

  // Find EOF token
  const eofIndex = tokens.findIndex(t => t.type === TokenType.EOF);
  if (eofIndex === -1 || eofIndex === 0) {
    return { spans: [], warnings: [] };
  }

  // Trivia is between last non-EOF token and EOF
  return computeTriviaBetween(document, tokens, eofIndex);
}

/**
 * Parse trivia text into classified spans.
 * Handles whitespace, newlines, line comments (//), and block comments ({...}, /*...*\/).
 *
 * IMPORTANT: Brace-style comments ({ }) are context-dependent in C/AL:
 * - In CODE_BLOCK context: { } are tokens (BEGIN/END), NOT comments
 * - In trivia gaps: { } are assumed to be comments
 *
 * This function only processes gaps BETWEEN tokens, so by the time we see
 * a brace here, the lexer has already decided it's not a token. However,
 * if the lexer has bugs, we might misclassify code as comments.
 *
 * SAFEGUARD: We emit a warning if brace content looks like code (contains
 * keywords, semicolons outside strings, etc.)
 */
function parseTriviaSpans(text: string, baseOffset: number): TriviaResult {
  const spans: TriviaSpan[] = [];
  const warnings: string[] = [];
  let pos = 0;

  while (pos < text.length) {
    const remaining = text.substring(pos);
    const startOffset = baseOffset + pos;

    // Check for line comment
    if (remaining.startsWith('//')) {
      const endOfLine = remaining.indexOf('\n');
      const length = endOfLine === -1 ? remaining.length : endOfLine;
      spans.push({
        startOffset,
        endOffset: startOffset + length,
        text: remaining.substring(0, length),
        type: 'line-comment'
      });
      pos += length;
      continue;
    }

    // Check for C-style block comment
    if (remaining.startsWith('/*')) {
      const endIdx = remaining.indexOf('*/');
      const length = endIdx === -1 ? remaining.length : endIdx + 2;
      spans.push({
        startOffset,
        endOffset: startOffset + length,
        text: remaining.substring(0, length),
        type: 'block-comment'
      });
      pos += length;
      continue;
    }

    // Check for brace-style block comment
    // SAFEGUARD: Validate content doesn't look like code
    if (remaining.startsWith('{')) {
      const endIdx = remaining.indexOf('}');
      const length = endIdx === -1 ? remaining.length : endIdx + 1;
      const content = remaining.substring(1, endIdx === -1 ? length : endIdx);

      // Check for code-like content (heuristic)
      if (looksLikeCode(content)) {
        warnings.push(
          `Brace content at offset ${startOffset} looks like code, not comment: ` +
          `"${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`
        );
      }

      spans.push({
        startOffset,
        endOffset: startOffset + length,
        text: remaining.substring(0, length),
        type: 'block-comment'
      });
      pos += length;
      continue;
    }

    // Check for newline
    if (remaining.startsWith('\r\n')) {
      spans.push({
        startOffset,
        endOffset: startOffset + 2,
        text: '\r\n',
        type: 'newline'
      });
      pos += 2;
      continue;
    }

    if (remaining[0] === '\n' || remaining[0] === '\r') {
      spans.push({
        startOffset,
        endOffset: startOffset + 1,
        text: remaining[0],
        type: 'newline'
      });
      pos += 1;
      continue;
    }

    // Whitespace (space, tab)
    if (remaining[0] === ' ' || remaining[0] === '\t') {
      let length = 1;
      while (pos + length < text.length &&
             (text[pos + length] === ' ' || text[pos + length] === '\t')) {
        length++;
      }
      spans.push({
        startOffset,
        endOffset: startOffset + length,
        text: remaining.substring(0, length),
        type: 'whitespace'
      });
      pos += length;
      continue;
    }

    // Unexpected character in trivia - emit warning and skip
    warnings.push(
      `Unexpected character in trivia at offset ${startOffset}: ` +
      `'${remaining[0]}' (code ${remaining.charCodeAt(0)})`
    );
    pos++;
  }

  return { spans, warnings };
}

/**
 * Heuristic to detect if brace content looks like code rather than a comment.
 * Used to warn about potential lexer bugs.
 */
function looksLikeCode(content: string): boolean {
  const trimmed = content.trim().toUpperCase();

  // Empty or very short content is probably a comment
  if (trimmed.length < 3) return false;

  // Check for code indicators (outside of strings)
  // Note: This is a heuristic - not 100% accurate
  const codePatterns = [
    /\bBEGIN\b/i,
    /\bEND\b/i,
    /\bIF\b.*\bTHEN\b/i,
    /\bFOR\b.*\bTO\b/i,
    /\bWHILE\b.*\bDO\b/i,
    /:=\s*\w/,  // Assignment
    /;\s*$/m,   // Statement ending with semicolon
  ];

  for (const pattern of codePatterns) {
    if (pattern.test(content)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all trivia as a single concatenated string.
 * Convenience function for round-trip validation.
 */
export function getTriviaText(
  document: string,
  tokens: Token[],
  index: number
): string {
  const prevToken = index > 0 ? tokens[index - 1] : null;
  const currentToken = tokens[index];

  if (!currentToken) return '';

  const startOffset = prevToken ? prevToken.endOffset : 0;
  const endOffset = currentToken.startOffset;

  return document.substring(startOffset, endOffset);
}
```

**Key considerations:**
- Brace-style comments `{...}` only appear in trivia when in SECTION_LEVEL or NORMAL context; otherwise braces are tokens. The trivia computer doesn't need context awareness because it only processes gaps BETWEEN tokens - the lexer has already determined what's a token vs trivia.
- **SAFEGUARD:** The `looksLikeCode()` heuristic warns if brace content appears to contain code, which may indicate a lexer bug.
- Handle unclosed comments gracefully (consume to end of trivia region)
- The `getTriviaText()` convenience function is useful for simple round-trip validation
- **NEW:** `computeTrailingTrivia()` handles trivia after the last meaningful token

### Testing Requirements

- Test trivia before first token (leading whitespace/comments)
- Test trivia between two adjacent tokens
- Test trivia before EOF token (trailing whitespace)
- Test `computeTrailingTrivia()` returns correct result
- Test multi-line whitespace preservation
- Test CRLF vs LF newline handling
- Test line comment extraction (`//`)
- Test C-style block comment extraction (`/* */`)
- Test brace-style block comment extraction (`{ }`)
- Test empty trivia (tokens with no gap)
- Test mixed trivia (whitespace + comment + whitespace)
- **NEW:** Test warning is emitted when brace content looks like code
- **NEW:** Test no warning for legitimate brace comments

---

## Task 4: Implement Position-Based Validation

**Status:** ✅ COMPLETE (2026-01-14)
**Priority:** High
**Effort:** Medium (3-4 hours)
**Dependencies:** Task 3 (uses trivia computer)
**GitHub Issue:** #92 (closed)
**Commit:** 0dfb841

### Completion Summary

**Commit:** `0dfb841` - feat(lexer): add position-based validation for tokenization (fixes #92)

**Test Results:** 33 tests passed, all comprehensive coverage, no regressions (3,086 total server tests pass)

**What Was Implemented:**

1. **Position Validator Module** (`server/src/validation/positionValidator.ts`, 348 lines)
   - `validateTokenPositions(document, tokens)` main validation function
   - `ValidationResult` interface with detailed error reporting
   - Helper functions for String, QuotedIdentifier, and Unknown token validation
   - Trivia validation using imported `looksLikeCode` from triviaComputer

2. **Special Token Handling:**
   - String tokens: positions include `'...'`, value excludes quotes and processes `''` → `'`
   - QuotedIdentifier tokens: positions include `"..."`, value excludes quotes (no escape processing)
   - Unknown tokens from 7 sources with appropriate position/value relationships:
     - Unclosed strings (positions include opening `'`, value excludes it and is unescaped)
     - Unclosed quoted identifiers (positions include opening `"`, value excludes it)
     - Unmatched closing braces
     - Unrecognized characters (`@`, backtick, etc.)
     - Unclosed brace comments `{`
     - Unclosed C-style comments `/*`

3. **Edge Case Handling:**
   - Empty documents (zero tokens)
   - Only EOF token
   - Multi-line strings (LF, CRLF, with escaped quotes)
   - Empty unclosed strings/identifiers (just `'` or `"`)
   - Document boundaries validation

4. **Comprehensive Testing** (`server/src/validation/__tests__/positionValidator.test.ts`, 499 lines)
   - 33 tests covering all acceptance criteria
   - Edge cases: empty documents, EOF tokens, all Unknown token sources
   - Multi-line string validation (LF, CRLF, with escapes)
   - Trivia validation with warning collection

5. **DRY Compliance:**
   - Imported `looksLikeCode` from `trivia/triviaComputer.ts` (no duplication)
   - Exported `looksLikeCode` from triviaComputer for reuse

**Implementation Process:**

- Followed TDD: 31 tests written first (all failed), implementation made them pass
- Adversarial review cycle #1: Plan approved after addressing Unknown token sources
- Implementation completed: All tests passing
- Adversarial review cycle #2: Found CRITICAL bug in empty unclosed string edge case
- Bug fixed: Added length check for single-character delimiters
- Added 2 more tests for empty unclosed delimiters (total 33 tests)
- TypeScript review: Cleaned up unused variables
- Boy Scout fixes: Added JSDoc documentation, fixed capitalization, removed stale comments
- Re-review: APPROVED

**Key Insights:**

- **Bug Found:** Empty unclosed strings/identifiers (just `'` or `"`) failed validation because they both start AND end with the delimiter character. Fixed with explicit length check.
- **Robustness:** Validator returns error strings instead of throwing exceptions, making it robust against malformed lexer output
- **Documentation:** Added JSDoc explaining half-open interval semantics for token offsets

### Context

The original round-trip proposal (`tokens.map(t => t.value).join('')`) cannot work because whitespace and comments are not tokenized. The architect's review recommended position-based validation instead: verify that every token's `value` matches the document slice at `[startOffset, endOffset)` and that gaps between tokens contain only trivia.

This is the CORE correctness check for lexer validation.

**CRITICAL:** The lexer has a discrepancy between token values and positions for String and QuotedIdentifier tokens:
- `token.value` excludes delimiters (quotes) AND processes escape sequences
- `token.startOffset` to `token.endOffset` includes delimiters
- For strings: `''` in source becomes `'` in token.value
- This requires special handling in validation

**CRITICAL (Revision 3):** Unknown tokens from unclosed strings/quoted identifiers also have this discrepancy:
- Unclosed string `'hello` (no closing quote): position includes `'`, value excludes it
- Unclosed quoted identifier `"test` (no closing quote): position includes `"`, value excludes it
- The lexer's `scanString()` and `scanQuotedIdentifier()` methods advance past the opening delimiter before building the value

### Goal

Implement position-based validation that verifies tokenization correctness by checking that token positions align with document content and all characters are accounted for.

### Acceptance Criteria

- [x] `validateTokenPositions(document, tokens)` function implemented
- [x] Verifies each token's value matches `document.slice(startOffset, endOffset)` (with special handling)
- [x] Verifies gaps between tokens contain only valid trivia (whitespace/comments)
- [x] Returns detailed validation result with pass/fail per token
- [x] Identifies exact position of first mismatch
- [x] Handles edge case: no tokens (empty document)
- [x] Handles edge case: only EOF token
- [x] Documents that `endOffset` is exclusive (half-open interval)
- [x] **CRITICAL:** Special handling for String tokens with escaped quotes (`''` -> `'`)
- [x] **CRITICAL:** Special handling for QuotedIdentifier tokens (positions include quotes, value excludes them)
- [x] **CRITICAL (Revision 3):** Special handling for Unknown tokens from unclosed strings/quoted identifiers

### Implementation Notes

**Create file:** `/home/klaus/Source/C-AL-Language/server/src/validation/positionValidator.ts`

```typescript
import { Token, TokenType } from '../lexer/tokens';

export interface PositionValidationResult {
  passed: boolean;
  totalTokens: number;
  checkedTokens: number;
  firstError?: {
    type: 'value-mismatch' | 'invalid-trivia' | 'gap' | 'overlap' | 'delimiter-mismatch' | 'escape-mismatch';
    tokenIndex: number;
    expected: string;
    actual: string;
    position: {
      startOffset: number;
      endOffset: number;
      line: number;
      column: number;
    };
  };
  /** Warnings from trivia parsing (may indicate lexer bugs) */
  triviaWarnings: string[];
}

/**
 * Validate that token positions correctly correspond to document content.
 *
 * Checks:
 * 1. Each token's value matches document.slice(startOffset, endOffset)
 *    - Special handling for String/QuotedIdentifier (positions include delimiters)
 *    - Special handling for String escaped quotes ('' in source = ' in value)
 *    - Special handling for Unknown tokens from unclosed strings/quoted identifiers
 * 2. Gaps between tokens contain only valid trivia
 * 3. No overlapping tokens
 * 4. All characters are accounted for (no gaps with non-trivia content)
 *
 * @param document - Source document text
 * @param tokens - Token array from lexer.tokenize()
 * @returns Validation result with details of first error (if any)
 */
export function validateTokenPositions(
  document: string,
  tokens: Token[]
): PositionValidationResult {
  const triviaWarnings: string[] = [];

  if (tokens.length === 0) {
    return { passed: true, totalTokens: 0, checkedTokens: 0, triviaWarnings };
  }

  let lastEndOffset = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check for overlap with previous token
    if (token.startOffset < lastEndOffset) {
      return {
        passed: false,
        totalTokens: tokens.length,
        checkedTokens: i,
        triviaWarnings,
        firstError: {
          type: 'overlap',
          tokenIndex: i,
          expected: `startOffset >= ${lastEndOffset}`,
          actual: `startOffset = ${token.startOffset}`,
          position: {
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            line: token.line,
            column: token.column
          }
        }
      };
    }

    // Check gap before this token contains only valid trivia
    if (token.startOffset > lastEndOffset) {
      const gap = document.slice(lastEndOffset, token.startOffset);
      const triviaResult = parseTriviaForValidation(gap);
      triviaWarnings.push(...triviaResult.warnings);

      if (!triviaResult.valid) {
        return {
          passed: false,
          totalTokens: tokens.length,
          checkedTokens: i,
          triviaWarnings,
          firstError: {
            type: 'invalid-trivia',
            tokenIndex: i,
            expected: 'whitespace, newlines, or comments only',
            actual: gap.substring(0, 50) + (gap.length > 50 ? '...' : ''),
            position: {
              startOffset: lastEndOffset,
              endOffset: token.startOffset,
              line: token.line,
              column: token.column
            }
          }
        };
      }
    }

    // Skip value check for EOF token (value is empty string)
    if (token.type === TokenType.EOF) {
      lastEndOffset = token.startOffset;
      continue;
    }

    // Special handling for String tokens
    // Positions INCLUDE delimiters ('...'), value EXCLUDES them
    // ALSO: Escaped quotes '' in source become ' in value
    if (token.type === TokenType.String) {
      const documentSlice = document.slice(token.startOffset, token.endOffset);

      // Verify delimiters are present
      if (!documentSlice.startsWith("'") || !documentSlice.endsWith("'")) {
        return {
          passed: false,
          totalTokens: tokens.length,
          checkedTokens: i,
          triviaWarnings,
          firstError: {
            type: 'delimiter-mismatch',
            tokenIndex: i,
            expected: "'...'",
            actual: documentSlice.substring(0, 50) + (documentSlice.length > 50 ? '...' : ''),
            position: {
              startOffset: token.startOffset,
              endOffset: token.endOffset,
              line: token.line,
              column: token.column
            }
          }
        };
      }

      // Extract content (without delimiters) and unescape
      const rawContent = documentSlice.slice(1, -1);
      const unescapedContent = unescapeStringContent(rawContent);

      if (unescapedContent !== token.value) {
        return {
          passed: false,
          totalTokens: tokens.length,
          checkedTokens: i,
          triviaWarnings,
          firstError: {
            type: 'escape-mismatch',
            tokenIndex: i,
            expected: token.value,
            actual: unescapedContent,
            position: {
              startOffset: token.startOffset,
              endOffset: token.endOffset,
              line: token.line,
              column: token.column
            }
          }
        };
      }

      lastEndOffset = token.endOffset;
      continue;
    }

    // Special handling for QuotedIdentifier tokens
    // Positions INCLUDE delimiters ("..."), value EXCLUDES them
    if (token.type === TokenType.QuotedIdentifier) {
      const documentSlice = document.slice(token.startOffset, token.endOffset);

      // Verify delimiters are present
      if (!documentSlice.startsWith('"') || !documentSlice.endsWith('"')) {
        return {
          passed: false,
          totalTokens: tokens.length,
          checkedTokens: i,
          triviaWarnings,
          firstError: {
            type: 'delimiter-mismatch',
            tokenIndex: i,
            expected: '"..."',
            actual: documentSlice.substring(0, 50) + (documentSlice.length > 50 ? '...' : ''),
            position: {
              startOffset: token.startOffset,
              endOffset: token.endOffset,
              line: token.line,
              column: token.column
            }
          }
        };
      }

      // Extract content (without delimiters) and compare
      const content = documentSlice.slice(1, -1);
      if (content !== token.value) {
        return {
          passed: false,
          totalTokens: tokens.length,
          checkedTokens: i,
          triviaWarnings,
          firstError: {
            type: 'value-mismatch',
            tokenIndex: i,
            expected: token.value,
            actual: content,
            position: {
              startOffset: token.startOffset,
              endOffset: token.endOffset,
              line: token.line,
              column: token.column
            }
          }
        };
      }

      lastEndOffset = token.endOffset;
      continue;
    }

    // Special handling for Unknown tokens
    // Unknown tokens can come from various sources with different position/value relationships:
    // 1. Unclosed strings: position includes opening ', value excludes it
    // 2. Unclosed quoted identifiers: position includes opening ", value excludes it
    // 3. Unrecognized characters: position = value (single char)
    // 4. Unclosed block comments: position includes opening {, value is just {
    //
    // REVISION 3 FIX: Check for delimiter patterns to determine validation strategy
    if (token.type === TokenType.Unknown) {
      const documentSlice = document.slice(token.startOffset, token.endOffset);

      // Check if this is an unclosed string (starts with ' but doesn't end with ')
      if (documentSlice.startsWith("'") && !documentSlice.endsWith("'")) {
        // Unclosed string: position includes opening quote, value excludes it
        const content = documentSlice.slice(1); // Remove opening quote
        // For unclosed strings, the lexer captures content character-by-character
        // including any escaped quotes that were processed before hitting the error
        const unescapedContent = unescapeStringContent(content);
        if (unescapedContent !== token.value) {
          return {
            passed: false,
            totalTokens: tokens.length,
            checkedTokens: i,
            triviaWarnings,
            firstError: {
              type: 'value-mismatch',
              tokenIndex: i,
              expected: token.value,
              actual: unescapedContent,
              position: {
                startOffset: token.startOffset,
                endOffset: token.endOffset,
                line: token.line,
                column: token.column
              }
            }
          };
        }
        lastEndOffset = token.endOffset;
        continue;
      }

      // Check if this is an unclosed quoted identifier (starts with " but doesn't end with ")
      if (documentSlice.startsWith('"') && !documentSlice.endsWith('"')) {
        // Unclosed quoted identifier: position includes opening quote, value excludes it
        const content = documentSlice.slice(1); // Remove opening quote
        if (content !== token.value) {
          return {
            passed: false,
            totalTokens: tokens.length,
            checkedTokens: i,
            triviaWarnings,
            firstError: {
              type: 'value-mismatch',
              tokenIndex: i,
              expected: token.value,
              actual: content,
              position: {
                startOffset: token.startOffset,
                endOffset: token.endOffset,
                line: token.line,
                column: token.column
              }
            }
          };
        }
        lastEndOffset = token.endOffset;
        continue;
      }

      // For other Unknown tokens (unrecognized chars, unclosed comments, etc.),
      // the value should match the document slice directly
      if (documentSlice !== token.value) {
        return {
          passed: false,
          totalTokens: tokens.length,
          checkedTokens: i,
          triviaWarnings,
          firstError: {
            type: 'value-mismatch',
            tokenIndex: i,
            expected: token.value,
            actual: documentSlice,
            position: {
              startOffset: token.startOffset,
              endOffset: token.endOffset,
              line: token.line,
              column: token.column
            }
          }
        };
      }

      lastEndOffset = token.endOffset;
      continue;
    }

    // Regular token value check
    const documentSlice = document.slice(token.startOffset, token.endOffset);
    if (documentSlice !== token.value) {
      return {
        passed: false,
        totalTokens: tokens.length,
        checkedTokens: i,
        triviaWarnings,
        firstError: {
          type: 'value-mismatch',
          tokenIndex: i,
          expected: token.value,
          actual: documentSlice,
          position: {
            startOffset: token.startOffset,
            endOffset: token.endOffset,
            line: token.line,
            column: token.column
          }
        }
      };
    }

    lastEndOffset = token.endOffset;
  }

  return {
    passed: true,
    totalTokens: tokens.length,
    checkedTokens: tokens.length,
    triviaWarnings
  };
}

/**
 * Unescape string content by converting '' to '.
 * This reverses the lexer's escape processing.
 */
function unescapeStringContent(content: string): string {
  // In C/AL strings, '' (two single quotes) represents a literal '
  return content.replace(/''/g, "'");
}

/**
 * Validate trivia content (whitespace, comments only).
 * Returns validity and any warnings.
 */
function parseTriviaForValidation(text: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (text.length === 0) return { valid: true, warnings };

  let pos = 0;
  while (pos < text.length) {
    const ch = text[pos];
    const remaining = text.substring(pos);

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      pos++;
      continue;
    }

    // Line comment
    if (remaining.startsWith('//')) {
      const newlineIdx = remaining.indexOf('\n');
      pos += newlineIdx === -1 ? remaining.length : newlineIdx;
      continue;
    }

    // C-style block comment
    if (remaining.startsWith('/*')) {
      const endIdx = remaining.indexOf('*/');
      pos += endIdx === -1 ? remaining.length : endIdx + 2;
      continue;
    }

    // Brace-style block comment
    if (ch === '{') {
      const endIdx = remaining.indexOf('}');
      const commentContent = remaining.substring(1, endIdx === -1 ? remaining.length : endIdx);

      // SAFEGUARD: Warn if content looks like code
      if (looksLikeCode(commentContent)) {
        warnings.push(
          `Brace content looks like code, not comment: "${commentContent.substring(0, 30)}..."`
        );
      }

      pos += endIdx === -1 ? remaining.length : endIdx + 1;
      continue;
    }

    // Invalid character in trivia
    return { valid: false, warnings };
  }

  return { valid: true, warnings };
}

/**
 * Heuristic to detect if brace content looks like code rather than a comment.
 */
function looksLikeCode(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 3) return false;

  const codePatterns = [
    /\bBEGIN\b/i,
    /\bEND\b/i,
    /\bIF\b.*\bTHEN\b/i,
    /\bFOR\b.*\bTO\b/i,
    /\bWHILE\b.*\bDO\b/i,
    /:=\s*\w/,
    /;\s*$/m,
  ];

  return codePatterns.some(p => p.test(content));
}
```

**Key considerations:**
- String/QuotedIdentifier positions include delimiters, values exclude them
- **CRITICAL:** Escaped quotes in strings: `''` in source becomes `'` in token value
- The `unescapeStringContent()` function reverses escape processing for validation
- **CRITICAL (Revision 3):** Unknown tokens from unclosed strings/quoted identifiers have position/value mismatch:
  - Unclosed `'hello` has positions 0-6 (includes opening quote) but value `hello` (excludes it)
  - Unclosed `"test` has positions 0-5 (includes opening quote) but value `test` (excludes it)
  - Detection: Check if documentSlice starts with delimiter but doesn't end with it
- Trivia warnings are collected but don't fail validation (they're informational)

### Testing Requirements

- Test validation passes for correctly tokenized file
- Test validation catches token value mismatch
- Test validation catches overlap
- Test validation catches invalid content in gap
- Test validation handles EOF token correctly
- Test validation handles empty document
- Test validation handles String tokens (value excludes quotes, positions include them)
- Test validation handles QuotedIdentifier tokens
- **CRITICAL:** Test validation handles escaped quotes in strings (`'don''t'` -> `don't`)
- **CRITICAL:** Test validation handles multiple escaped quotes (`'it''s a ''test'''` -> `it's a 'test'`)
- **CRITICAL (Revision 3):** Test validation handles unclosed strings (`'hello` without closing quote)
- **CRITICAL (Revision 3):** Test validation handles unclosed quoted identifiers (`"test` without closing quote)
- **CRITICAL (Revision 3):** Test validation handles unclosed strings with escaped quotes (`'don''t` without closing quote)
- Test validation handles Unknown tokens gracefully
- Test trivia warnings are collected for suspicious brace content

---

## Task 5: Refactor Parser Dead Code

**Priority:** Medium
**Effort:** Small (1-2 hours)
**Dependencies:** None (can parallel with other tasks)
**GitHub Issue:** #89
**Source Code Context:**
- `server/src/parser/parser.ts` lines 1070-1073 (dead whitespace loop)
- `server/src/parser/parser.ts` lines 1691, 1742 (peekNextMeaningfulToken usage)
- `server/src/parser/parser.ts` lines 3127-3141 (peekNextMeaningfulToken definition)

### Context

The whitespace tokenization discussion identified dead code in the parser that checks for `TokenType.Whitespace` and `TokenType.NewLine`. Since the lexer never produces these token types (whitespace is skipped), this code never executes.

**CRITICAL CORRECTION from adversarial review:** The `peekNextMeaningfulToken()` method is NOT dead code. It is actively used at:
- Line 1691: AL keyword detection for access modifiers
- Line 1742: AL keyword detection for ENUM/INTERFACE constructs

Only the explicit whitespace-skipping loop at lines 1070-1073 is actually dead.

### Goal

Remove the dead whitespace-skipping loop while PRESERVING the `peekNextMeaningfulToken()` method which serves a different purpose (lookahead for AL keyword detection).

### Acceptance Criteria

- [x] Dead whitespace/newline skipping loop at lines 1070-1073 removed
- [x] `peekNextMeaningfulToken()` method simplified (loop removed, direct index lookup)
- [x] All existing tests continue to pass (confirming removed code was truly dead)
- [x] No functional changes to parser behavior
- [x] Documentation updated with cross-references and clear explanations

### Completion Summary

**Status:** ✅ Complete (2026-01-14)
**Commit:** `16f7c3e` - fix(parser): remove dead whitespace-skipping code (fixes #89)
**Test Results:** All 2984 tests pass, 16 skipped, 69 test suites pass

**What Was Implemented:**

1. **Simplified `peekNextMeaningfulToken()` method** (lines 3121-3135)
   - Changed from loop-based whitespace filtering to direct index lookup
   - Reduced from 21 lines to 14 lines
   - Added clear documentation explaining the lexer never emits these token types
   - Method semantically equivalent since whitespace tokens never exist

2. **Removed dead whitespace loop** (lines 1070-1073)
   - Deleted 4 lines in `parseCodeSection()` that attempted to skip Whitespace/NewLine tokens
   - Code was unreachable since lexer never produces these token types

3. **Added documentation cross-references** (lines 3502-3504)
   - Updated comment in `isSectionKeyword()` to reference `peekNextMeaningfulToken()`
   - Improves discoverability of the whitespace invariant

**Implementation Differences from Plan:**

The original plan proposed only preserving `peekNextMeaningfulToken()` with added documentation. During adversarial review, it was identified that the method itself contained unnecessary complexity (looping through tokens checking for types that never exist). The final implementation simplified the method to direct index lookup, which is more efficient and clearer.

**Review Findings:**

Adversarial review identified additional similar dead code patterns in the semantic module (test files filtering for whitespace tokens, unused comment token case). These were acknowledged but left out of scope for this issue.

### Implementation Notes

**File to modify:** `/home/klaus/Source/C-AL-Language/server/src/parser/parser.ts`

**Remove lines 1070-1073:**
```typescript
// REMOVE THIS BLOCK:
// Skip whitespace and newlines
while (this.check(TokenType.Whitespace) || this.check(TokenType.NewLine)) {
  this.advance();
}
```

**PRESERVE `peekNextMeaningfulToken()` at lines 3127-3141:**
This method IS used for AL keyword detection (see lines 1691, 1742). Add clarifying comment:

```typescript
/**
 * Peek ahead N meaningful tokens, skipping whitespace and newline tokens.
 * Used for pattern detection in lookahead checks.
 *
 * NOTE: The lexer currently does not produce Whitespace/NewLine tokens,
 * but this check is retained for:
 * 1. Defensive coding - works correctly if lexer behavior changes
 * 2. AL keyword detection patterns at lines 1691, 1742
 *
 * @param skipCount How many meaningful tokens to skip
 * @returns The Nth meaningful token, or undefined if not found
 */
private peekNextMeaningfulToken(skipCount: number): Token | undefined {
  // ... existing implementation unchanged ...
}
```

### Testing Requirements

- Run full test suite before and after changes
- Confirm all tests pass (proving removed code was dead)
- Verify no runtime errors in parser
- Verify AL keyword detection still works (tests for line 1691, 1742 scenarios)

---

## Task 6: Implement Lexer Health Report Script

**Priority:** High
**Effort:** Medium (4-5 hours)
**Dependencies:** Tasks 1, 2, 4 (needs state accessor, clean exit criteria, position validator)
**GitHub Issue:** #93
**Required Interfaces:**
- `LexerContextState` - Task 1
- `isCleanExit()` - Task 2
- `validateTokenPositions()`, `PositionValidationResult` - Task 4

### Context

The proposal's core deliverable is an automated health report that runs against all 7,677 real NAV files and reports:
1. Position validation results (from Task 4)
2. Context health at EOF (from Tasks 1-2)
3. Basic performance metrics

This mirrors the successful `validate-real.ts` pattern for parser validation.

**CRITICAL CONFIDENTIALITY REQUIREMENT:** The health report MUST NOT include file content, only positions and error types. All outputs must be written to gitignored locations.

### Prerequisite: Update .gitignore

**EXPLICIT STEP:** Before implementing the health report, add to `.gitignore`:

```gitignore
# Lexer health outputs (may contain file references to proprietary content)
.lexer-health/
*-trace.txt
lexer-health-report.md
```

### Goal

Create a script that generates a comprehensive lexer health report in markdown format, identifying files with tokenization issues WITHOUT leaking proprietary content.

### Acceptance Criteria

- [ ] `.gitignore` updated with lexer health exclusions (prerequisite)
- [ ] Script runs against all files in test/REAL/
- [ ] Reports position validation pass/fail for each file
- [ ] Reports context health pass/fail for each file (uses `isCleanExit()`)
- [ ] Reports tokenization time per file
- [ ] **REVISED:** Identifies performance outliers using percentile-based detection (p95, p99)
- [ ] Generates markdown report with summary and detailed listings
- [ ] Report shows file name, error type, and position but NOT file content
- [ ] Output written to gitignored directory (`.lexer-health/`)
- [ ] Exit code is non-zero if any files fail (for CI integration)
- [ ] NPM script added: `npm run lexer:health`
- [ ] Warning banner added to output files about confidentiality

### Implementation Notes

**Create file:** `/home/klaus/Source/C-AL-Language/server/scripts/lexer-health.ts`

```typescript
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Lexer, CleanExitResult } from '../src/lexer/lexer';
import { validateTokenPositions } from '../src/validation/positionValidator';
import { readFileWithEncoding } from '../src/utils/encoding';

interface LexerHealthResult {
  file: string;
  lines: number;
  tokenCount: number;
  tokenizationTime: number;
  positionValidation: {
    passed: boolean;
    errorType?: string;
    errorPosition?: { line: number; column: number };
    triviaWarnings: string[];
  };
  contextHealth: {
    passed: boolean;
    exitState?: string;
    reason?: string;
  };
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function validateLexerHealth(): LexerHealthResult[] {
  const realDir = join(__dirname, '../../test/REAL');

  if (!existsSync(realDir)) {
    console.warn('test/REAL directory not found - skipping validation');
    return [];
  }

  const files = readdirSync(realDir)
    .filter(f => f.endsWith('.TXT'))
    .sort();

  console.log(`Validating lexer health for ${files.length} files...\n`);
  const results: LexerHealthResult[] = [];

  for (const file of files) {
    const filePath = join(realDir, file);
    const { content } = readFileWithEncoding(filePath);
    const lineCount = content.split('\n').length;

    const startTime = performance.now();
    const lexer = new Lexer(content);
    const tokens = lexer.tokenize();
    const tokenizationTime = performance.now() - startTime;

    // Position validation
    const positionResult = validateTokenPositions(content, tokens);

    // Context health
    const contextResult = lexer.isCleanExit();

    results.push({
      file,
      lines: lineCount,
      tokenCount: tokens.length,
      tokenizationTime,
      positionValidation: {
        passed: positionResult.passed,
        errorType: positionResult.firstError?.type,
        errorPosition: positionResult.firstError?.position
          ? { line: positionResult.firstError.position.line,
              column: positionResult.firstError.position.column }
          : undefined,
        triviaWarnings: positionResult.triviaWarnings
      },
      contextHealth: {
        passed: contextResult.passed,
        exitState: contextState.current,
        reason: contextResult.reason
      }
    });

    // Progress
    if (results.length % 500 === 0) {
      console.log(`Processed ${results.length}/${files.length}...`);
    }
  }

  return results;
}

function generateMarkdownReport(results: LexerHealthResult[]): string {
  const failed = results.filter(r => !r.positionValidation.passed || !r.contextHealth.passed);
  const passRate = ((results.length - failed.length) / results.length * 100).toFixed(2);

  // Calculate performance percentiles
  const times = results.map(r => r.tokenizationTime);
  const p50 = calculatePercentile(times, 50);
  const p95 = calculatePercentile(times, 95);
  const p99 = calculatePercentile(times, 99);

  // Outliers are files significantly above p95
  const outlierThreshold = p95 * 2;
  const outliers = results.filter(r => r.tokenizationTime > outlierThreshold);

  let md = `<!-- WARNING: This file references NAV object files.\n`;
  md += `     While it does not contain code content, file names may be confidential.\n`;
  md += `     DO NOT commit to public repositories. -->\n\n`;
  md += `# Lexer Health Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Total files:** ${results.length}\n`;
  md += `- **Passed:** ${results.length - failed.length} (${passRate}%)\n`;
  md += `- **Failed:** ${failed.length}\n\n`;

  md += `## Performance\n\n`;
  md += `| Percentile | Time (ms) |\n`;
  md += `|------------|----------|\n`;
  md += `| p50 (median) | ${p50.toFixed(2)} |\n`;
  md += `| p95 | ${p95.toFixed(2)} |\n`;
  md += `| p99 | ${p99.toFixed(2)} |\n\n`;

  if (outliers.length > 0) {
    md += `### Performance Outliers (>${outlierThreshold.toFixed(2)}ms)\n\n`;
    md += `| File | Lines | Tokens | Time (ms) |\n`;
    md += `|------|-------|--------|----------|\n`;
    for (const result of outliers.slice(0, 20)) {
      md += `| ${result.file} | ${result.lines} | ${result.tokenCount} | ${result.tokenizationTime.toFixed(2)} |\n`;
    }
    if (outliers.length > 20) {
      md += `\n*... and ${outliers.length - 20} more outliers*\n`;
    }
    md += '\n';
  }

  if (failed.length > 0) {
    md += `## Files with Issues\n\n`;
    md += `| File | Position Validation | Context Health | Location |\n`;
    md += `|------|---------------------|----------------|----------|\n`;

    for (const result of failed) {
      const posStatus = result.positionValidation.passed
        ? 'PASS'
        : `FAIL: ${result.positionValidation.errorType}`;
      const ctxStatus = result.contextHealth.passed
        ? 'PASS'
        : `FAIL: ${result.contextHealth.reason}`;
      const location = result.positionValidation.errorPosition
        ? `${result.positionValidation.errorPosition.line}:${result.positionValidation.errorPosition.column}`
        : '-';
      md += `| ${result.file} | ${posStatus} | ${ctxStatus} | ${location} |\n`;
    }
    md += '\n';
  }

  // Trivia warnings summary (may indicate lexer bugs)
  const filesWithTriviaWarnings = results.filter(r => r.positionValidation.triviaWarnings.length > 0);
  if (filesWithTriviaWarnings.length > 0) {
    md += `## Trivia Warnings\n\n`;
    md += `These files have suspicious brace content that may indicate lexer bugs:\n\n`;
    for (const result of filesWithTriviaWarnings.slice(0, 10)) {
      md += `- **${result.file}**: ${result.positionValidation.triviaWarnings.length} warnings\n`;
    }
    if (filesWithTriviaWarnings.length > 10) {
      md += `\n*... and ${filesWithTriviaWarnings.length - 10} more files with warnings*\n`;
    }
    md += '\n';
  }

  return md;
}

// Main execution
const results = validateLexerHealth();

// Create output directory
const outputDir = join(__dirname, '../../.lexer-health');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const report = generateMarkdownReport(results);
const reportPath = join(outputDir, 'lexer-health-report.md');
writeFileSync(reportPath, report, 'utf-8');

const failed = results.filter(r => !r.positionValidation.passed || !r.contextHealth.passed);
console.log(`\nReport written to: ${reportPath}`);
console.log(`Files with issues: ${failed.length}/${results.length}`);
process.exit(failed.length > 0 ? 1 : 0);
```

**Add to package.json scripts:**
```json
"lexer:health": "ts-node scripts/lexer-health.ts"
```

### Testing Requirements

- Test script runs without errors on empty test/REAL directory
- Test script produces valid markdown output
- Test exit code is 0 when all files pass (mock scenario)
- Test exit code is 1 when any file fails
- Test output is written to .lexer-health/ directory
- Verify .gitignore entry prevents accidental commit
- Test percentile calculations are correct

---

## Task 7: Implement Debug Trace Infrastructure

**Priority:** Medium
**Effort:** Large (5-6 hours)
**Dependencies:** Task 1 (uses context state), Task 6 (triggered by health report findings)
**GitHub Issue:** #94
**Required Interfaces:**
- `LexerContextState` - Task 1
- `getContextState()` - Task 1

### Context

The debug trace system enables precise diagnosis of lexer issues by showing every tokenization decision. When health report identifies a problematic file, the trace shows exactly what the lexer did, enabling prediction-based debugging.

**CRITICAL DESIGN DECISION:** The constructor signature must remain backward compatible. Use an options object pattern instead of positional parameters.

**CONFIDENTIALITY REQUIREMENT:** Trace outputs contain actual source content and MUST be written to gitignored locations with sanitization options.

### Goal

Implement an opt-in tracing system that generates detailed logs of lexer decisions, context transitions, and state changes WITHOUT performance impact on production lexer.

### Acceptance Criteria

- [ ] Tracing mechanism added using options object (backward compatible)
- [ ] Trace includes token emissions with position, type (values optionally sanitized)
- [ ] Trace includes context transitions with old/new state
- [ ] Trace includes flag changes (braceDepth, inPropertyValue, etc.)
- [ ] Trace output is streamed to gitignored file
- [ ] Trace format is both human-readable and grep-able
- [ ] NPM script added: `npm run lexer:trace <file>`
- [ ] Base Lexer has ZERO performance overhead
- [ ] Trace files include confidentiality warning banner
- [ ] **NEW:** EOF token creation is traced (special code path)

### Implementation Notes

**Backward-Compatible Constructor:**

```typescript
// In lexer.ts

export interface LexerOptions {
  /** Optional trace callback for debugging */
  trace?: TraceCallback;
}

export type TraceCallback = (event: TraceEvent) => void;

export interface TraceEvent {
  type: 'token' | 'context-push' | 'context-pop' | 'flag-change' | 'skip';
  position: { line: number; column: number; offset: number };
  data: Record<string, unknown>;
}

export class Lexer {
  private traceCallback?: TraceCallback;

  // BACKWARD COMPATIBLE: options is optional, existing callers unaffected
  constructor(input: string, options?: LexerOptions) {
    this.input = input;
    this.traceCallback = options?.trace;
    // ... rest of initialization ...
  }

  private emitTraceEvent(event: TraceEvent): void {
    // ZERO COST when tracing disabled
    if (this.traceCallback) {
      this.traceCallback(event);
    }
  }

  // In tokenize(), trace EOF token specially:
  public tokenize(): Token[] {
    // ... existing tokenization loop ...

    // Trace EOF token creation (special code path)
    this.emitTraceEvent({
      type: 'token',
      position: { line: this.line, column: this.column, offset: this.position },
      data: { tokenType: 'EOF', value: '' }
    });

    this.tokens.push(this.createToken(TokenType.EOF, '', this.position, this.position));
    return this.tokens;
  }
}
```

**Create trace script:** `/home/klaus/Source/C-AL-Language/server/scripts/lexer-trace.ts`

```typescript
import { Lexer, TraceCallback, TraceEvent, LexerOptions } from '../src/lexer/lexer';
import { readFileWithEncoding } from '../src/utils/encoding';
import { createWriteStream, WriteStream, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const filePath = process.argv[2];
const sanitize = process.argv.includes('--sanitize');

if (!filePath) {
  console.error('Usage: npm run lexer:trace <file> [--sanitize]');
  console.error('  --sanitize: Truncate token values to hide content');
  process.exit(1);
}

// Ensure output directory exists
const outputDir = join(__dirname, '../../.lexer-health');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const outputPath = join(outputDir, basename(filePath).replace(/\.[^.]+$/, '-trace.txt'));
const stream: WriteStream = createWriteStream(outputPath);

stream.write('<!-- WARNING: This file contains content from proprietary NAV objects.\n');
stream.write('     DO NOT commit to version control. -->\n\n');

function sanitizeValue(value: string): string {
  if (!sanitize || value.length <= 6) return value;
  return value.substring(0, 3) + '...' + value.substring(value.length - 3);
}

function formatTraceEvent(event: TraceEvent): string {
  const pos = `[${event.position.line}:${event.position.column}]`;

  switch (event.type) {
    case 'token':
      const value = sanitizeValue(String(event.data.value || ''));
      return `${pos} TOKEN ${event.data.tokenType}: ${JSON.stringify(value)}`;

    case 'context-push':
      return `${pos} CONTEXT PUSH: ${event.data.from} -> ${event.data.to}`;

    case 'context-pop':
      return `${pos} CONTEXT POP: ${event.data.from} -> ${event.data.to}`;

    case 'flag-change':
      return `${pos} FLAG ${event.data.flag}: ${event.data.from} -> ${event.data.to}`;

    case 'skip':
      return `${pos} SKIP: ${event.data.reason}`;

    default:
      return `${pos} ${event.type}: ${JSON.stringify(event.data)}`;
  }
}

const traceCallback: TraceCallback = (event: TraceEvent) => {
  stream.write(formatTraceEvent(event) + '\n');
};

const { content } = readFileWithEncoding(filePath);
const options: LexerOptions = { trace: traceCallback };
const lexer = new Lexer(content, options);
lexer.tokenize();

stream.end();
console.log(`Trace written to: ${outputPath}`);
```

**Add to package.json scripts:**
```json
"lexer:trace": "ts-node scripts/lexer-trace.ts"
```

**Trace format example:**
```
[1:1] TOKEN Keyword: "OBJECT"
[1:1] CONTEXT PUSH: NORMAL -> OBJECT_LEVEL
[1:7] SKIP: whitespace
[1:8] TOKEN Keyword: "Table"
...
[EOF] TOKEN EOF: ""
```

### Testing Requirements

- Test trace is generated for simple input
- Test trace includes all token emissions including EOF
- Test trace includes context transitions
- Test trace file is created in .lexer-health/
- Test base Lexer performance is unchanged (benchmark)
- Test backward compatibility: `new Lexer(source)` still works
- Test sanitize option truncates values
- Verify .gitignore prevents commit of trace files

---

## Task 8: Create Lexer Snapshot Tests

**Status:** ✅ COMPLETE (2026-01-14)
**Priority:** Medium
**Effort:** Medium (3-4 hours)
**Dependencies:** None (can parallel with other tasks)
**GitHub Issue:** #90
**Commit:** 810c1d3

### Context

Snapshot testing provides regression protection for the lexer during refactoring. Unlike full traces, snapshots capture just the token sequence, making them maintainable and easy to update when intentional changes are made.

### Goal

Create Jest snapshot tests that capture expected token sequences for representative C/AL code patterns.

### Acceptance Criteria

- [x] New test file `server/src/lexer/__tests__/tokenization.snapshot.test.ts` (co-located with other lexer tests)
- [x] Snapshots for minimal object (OBJECT Table 18 { ... })
- [x] Snapshots for object with PROPERTIES section
- [x] Snapshots for object with FIELDS section
- [x] Snapshots for object with CODE section and triggers
- [x] Snapshots for object with nested BEGIN/END blocks
- [x] Snapshots for edge cases (comments, strings, dates)
- [x] Snapshots for escaped quotes in strings (`'don''t'`)
- [x] Snapshot format shows token type and value (not positions)
- [x] Instructions for updating snapshots included in test file

### Completion Summary

**Status:** ✅ Complete (2026-01-14)
**Commit:** `810c1d3` - test(lexer): add comprehensive snapshot tests for tokenization (fixes #90)
**Test Results:** 50 tests passed, comprehensive coverage across all categories

**What Was Implemented:**

1. **Test File** (`server/src/lexer/__tests__/tokenization.snapshot.test.ts`, 557 lines)
   - Comprehensive JSDoc header with update instructions (`npm test -- -u`)
   - Helper function `toSnapshot()` converts tokens to compact Type:value format
   - 50 snapshot tests across 4 categories
   - Co-located with existing lexer tests (not in separate `__tests__` directory)

2. **Test Categories:**
   - **Core Object Structures (6 tests):** Minimal objects, OBJECT-PROPERTIES, PROPERTIES, FIELDS, CODE sections, complete tables
   - **Context-Dependent Tokenization (7 tests):** Keywords as identifiers, braces as structural tokens vs comments, BEGIN/END context handling
   - **Nested Blocks & Control Flow (9 tests):** Multiple nesting levels, IF/THEN/ELSE, CASE, WHILE, REPEAT, FOR
   - **Edge Cases (28 tests):** Comments, escaped strings, date/time/datetime literals, quoted identifiers, operators, AL-only keywords

3. **Snapshot Format:**
   - Compact single-string format: `Type:"value"` per line
   - Position information excluded for stability across refactoring
   - JSON.stringify for values to show escaping clearly
   - Generated snapshot file: `__snapshots__/tokenization.snapshot.test.ts.snap`

4. **Test Name Corrections:**
   - Fixed misleading test names for brace handling after adversarial review
   - "braces as structural tokens in PROPERTIES values" (not comments)
   - "braces as comments in CODE context (swallowed from token stream)" with clarifying comment

**Implementation Notes:**

The test file location was changed from the original acceptance criteria (`server/src/__tests__/lexer/`) to match project conventions (`server/src/lexer/__tests__/`), co-locating with the other 19 existing lexer test files.

Adversarial review identified two SERIOUS issues with misleading test names around brace comment handling, which were fixed before commit. The names now accurately reflect that braces are context-dependent: structural tokens in PROPERTIES, comments (swallowed) in CODE.

**Additional Work:**

Created issue #97 to track additional edge case tests (empty input, malformed literals) identified during review but deferred as out of scope.

### Implementation Notes

**Create file:** `/home/klaus/Source/C-AL-Language/server/src/__tests__/lexer/tokenization.snapshot.test.ts`

```typescript
import { Lexer } from '../../lexer/lexer';
import { Token } from '../../lexer/tokens';

/**
 * Snapshot tests for lexer tokenization.
 * These tests catch unintended changes to token output.
 *
 * To update snapshots after intentional changes:
 *   npm test -- -u
 *
 * Review snapshot changes carefully before committing!
 */
describe('Lexer Tokenization Snapshots', () => {
  /**
   * Convert tokens to snapshot-friendly format.
   * Excludes positions (which may change with formatting)
   * to focus on semantic correctness.
   */
  function toSnapshot(tokens: Token[]): string[] {
    return tokens.map(t => `${t.type}: ${JSON.stringify(t.value)}`);
  }

  it('should tokenize minimal table object', () => {
    const source = `OBJECT Table 50000 Test
{
  PROPERTIES
  {
  }
}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    expect(toSnapshot(tokens)).toMatchSnapshot();
  });

  it('should tokenize fields section', () => {
    const source = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1; ;Name ;Text30 }
    { 2; ;Amount ;Decimal }
  }
}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    expect(toSnapshot(tokens)).toMatchSnapshot();
  });

  it('should tokenize escaped quotes in strings', () => {
    // CRITICAL: Verifies '' -> ' escaping is correct
    const source = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    BEGIN
      Message := 'It''s a ''test''';
    END;
  }
}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    expect(toSnapshot(tokens)).toMatchSnapshot();
  });

  it('should tokenize code with comments', () => {
    const source = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    // Line comment
    { Block comment }
    /* C-style comment */
    PROCEDURE Test@1();
    BEGIN
    END;
  }
}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    expect(toSnapshot(tokens)).toMatchSnapshot();
  });

  // ... more test cases ...
});
```

**Key considerations:**
- Exclude position information from snapshots (changes with whitespace)
- Include token type and value (the semantic content)
- Use JSON.stringify for values to show escaping clearly
- Group related test cases (minimal object, fields, code, etc.)

### Testing Requirements

- Initial run generates snapshots
- Re-run confirms snapshots match
- Intentional lexer change should fail until snapshot updated
- Update command (`npm test -- -u`) works correctly

---

## Task 9: Document Comment Handling Policy

**Priority:** Low
**Effort:** Small (1 hour)
**Dependencies:** Task 3 (trivia computer implementation)
**GitHub Issue:** #95
**Related Tasks:**
- Task 3 (documents the trivia design)

### Context

The whitespace discussion raised an open question: Does "trivia" include comments or only whitespace? The implementation in Task 3 includes comments as trivia. This decision needs to be documented clearly so future developers understand the design.

### Goal

Add documentation clarifying that trivia includes both whitespace and comments, and explain the rationale.

### Acceptance Criteria

- [ ] JSDoc comment on `TriviaSpan` interface explains what trivia includes
- [ ] JSDoc on `TriviaType` lists all trivia categories with examples
- [ ] README section in `server/src/trivia/` explains the design
- [ ] Cross-reference from CLAUDE.md architecture section

### Implementation Notes

**Update:** `/home/klaus/Source/C-AL-Language/server/src/trivia/triviaComputer.ts`

Add comprehensive JSDoc:
```typescript
/**
 * Trivia represents non-token content in C/AL source code.
 *
 * In this implementation, "trivia" includes:
 * - Whitespace (spaces, tabs)
 * - Newlines (LF, CRLF)
 * - Comments (line comments //, block comments {}, /* */)
 *
 * This follows the Roslyn/TypeScript convention where all non-semantic
 * content is considered trivia. The lexer does not produce tokens for
 * trivia; instead, trivia is computed on-demand from token positions.
 *
 * Why include comments as trivia?
 * - Round-trip preservation: Comments must be preserved when reconstructing source
 * - Consistent model: All non-token content handled the same way
 * - Flexibility: Consumers can filter by TriviaType if needed
 */
```

**Create:** `/home/klaus/Source/C-AL-Language/server/src/trivia/README.md`

---

## Task 10: Integrate Lexer Health into CI (Optional)

**Priority:** Low
**Effort:** Small (1-2 hours)
**Dependencies:** Task 6 (lexer health script)
**GitHub Issue:** #96
**Required:**
- Task 6 health report script must be stable

### Context

CI integration prevents lexer regressions. This is a future enhancement once the health report is stable and baseline is established.

### Goal

Add GitHub Actions workflow step that runs lexer health check and fails PR if regressions detected.

### Acceptance Criteria

- [ ] Workflow step added to existing CI configuration
- [ ] Step runs `npm run lexer:health` (exits non-zero on failure)
- [ ] Baseline threshold defined (e.g., must match current pass rate)
- [ ] Clear error message when regression detected
- [ ] Documentation for handling CI failures

### Implementation Notes

**Prerequisite:** Establish baseline by running health report and confirming acceptable success rate on current codebase. If current success rate is low, fix lexer bugs first before enabling CI gate.

**Add to workflow (when ready):**
```yaml
- name: Check Lexer Health
  run: |
    cd server
    npm run lexer:health
  # Script exits 1 if any files fail
```

### Testing Requirements

- Test workflow runs successfully when all files pass
- Test workflow fails appropriately when regression introduced

---

## Dependencies Graph

```
Task 1 (State Accessor) ────┬────> Task 2 (Clean Exit) ───┐
                            │                             │
                            └────> Task 7 (Debug Trace)   │
                                                          │
Task 3 (Trivia Computer) ───────> Task 4 (Position Val) ──┼──> Task 6 (Health Report)
           │                                              │
           └────> Task 9 (Documentation)                  │
                                                          │
Task 5 (Refactor Dead Code) ──────────────────────────────┘    (parallel, no deps)
                                                          │
Task 8 (Snapshot Tests) ──────────────────────────────────┘    (parallel, no deps)
                                                          │
Task 10 (CI Integration) ─────────────────────────────────> Task 6
```

**Simplified view:**
- Foundation: Tasks 1, 3 (can be parallel)
- Depends on Task 1: Tasks 2, 7
- Depends on Task 3: Tasks 4, 9
- Depends on Tasks 1, 2, 4: Task 6
- Independent: Tasks 5, 8
- Depends on Task 6: Task 10

## Implementation Sequence

**Phase 1: Foundation (Tasks 1, 3, 5, 8 - can be parallelized)**
- Task 1: Add lexer state accessor methods
- Task 3: Implement trivia computer (no dependencies)
- Task 5: Refactor parser dead code (no dependencies)
- Task 8: Create lexer snapshot tests (no dependencies)

**Phase 2: Specifications (Tasks 2, 4)**
- Task 2: Establish clean exit criteria (depends on Task 1)
- Task 4: Implement position-based validator (depends on Task 3)

**Phase 3: Health Report (Task 6)**
- Task 6: Implement health report script (depends on Tasks 1, 2, 4)

**Phase 4: Debugging & Documentation (Tasks 7, 9)**
- Task 7: Implement debug trace infrastructure (depends on Task 1)
- Task 9: Document comment handling policy (depends on Task 3)

**Phase 5: CI Integration (Task 10)**
- Task 10: CI integration (depends on Task 6, optional)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Position validator catches false positives due to String/QuotedIdentifier value encoding | ~~High~~ Low | Critical | **FIXED:** Task 4 includes complete escaped quote handling with `unescapeStringContent()` |
| Position validator catches false positives on Unknown tokens from unclosed strings | ~~Medium~~ Low | Critical | **FIXED (Rev 3):** Task 4 now detects unclosed string/quoted identifier patterns and handles delimiter exclusion |
| Clean exit criteria reveals multiple valid end states | Medium | High | Run empirical analysis FIRST; support pattern list; document variance handling policy |
| Debug trace misses EOF or special token paths | ~~Medium~~ Low | High | **FIXED:** Task 7 explicitly traces EOF token creation |
| Constructor change breaks existing callers | ~~Medium~~ None | High | **FIXED:** Task 7 uses options object pattern for backward compatibility |
| Real file confidentiality leak in reports/traces | Medium | Critical | Enforce gitignored output locations; add warning banners; explicit .gitignore step |
| Base lexer performance regression | Low | Medium | Benchmark before/after; zero-cost abstraction principle |
| Brace comment assumption masks lexer bugs | Medium | Medium | **MITIGATED:** Task 3 and 4 include `looksLikeCode()` heuristic with warnings |

## Verification Strategy

- [ ] Task 1-2: Unit tests for state accessor and clean exit criteria
- [ ] Task 3-4: Unit tests for trivia computer and position validator
- [ ] Task 4: **CRITICAL:** Test escaped quotes (`'don''t'` -> `don't`)
- [ ] Task 4: **CRITICAL:** Test multiple escaped quotes in same string
- [ ] Task 4: **CRITICAL (Rev 3):** Test unclosed strings (`'hello` without closing quote)
- [ ] Task 4: **CRITICAL (Rev 3):** Test unclosed quoted identifiers (`"test` without closing quote)
- [ ] Task 4: **CRITICAL (Rev 3):** Test unclosed strings with escaped quotes (`'don''t` without closing quote)
- [ ] Task 5: Full test suite still passes (confirms dead code)
- [ ] Task 5: AL keyword detection still works (tests for lines 1691, 1742)
- [ ] Task 6: Health report runs on 100+ files without crash
- [ ] Task 7: Trace output matches expected format; covers ALL token paths including EOF
- [ ] Task 7: Backward compatibility test: `new Lexer(source)` works
- [ ] Task 8: Snapshot tests pass; intentional change triggers update
- [ ] Integration: Health report + trace correctly diagnoses known issues
