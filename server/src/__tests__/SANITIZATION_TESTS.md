# Sanitization Test Organization

This document describes the purpose and organization of sanitization-related test files. Use this guide to understand where to add new tests.

## Overview

The sanitization system prevents proprietary C/AL code from leaking into error messages, diagnostics, and test output. Tests are organized by layer and purpose:

*Paths are relative to `server/src/`.*

| File | Strategy | Purpose |
|------|----------|---------|
| [`utils/__tests__/sanitize.test.ts`](../utils/__tests__/sanitize.test.ts) | Unit | Core sanitization functions |
| [`parser/__tests__/parser-sanitization.test.ts`](../parser/__tests__/parser-sanitization.test.ts) | Unit | Parser error locations |
| [`parser/__tests__/parse-error-integration.test.ts`](../parser/__tests__/parse-error-integration.test.ts) | Integration | End-to-end error output validation |
| [`__tests__/lexer-error-sanitization.test.ts`](lexer-error-sanitization.test.ts) | Security validation | Lexer Unknown token coverage |
| [`parser/__tests__/parse-error-token-isolation.test.ts`](../parser/__tests__/parse-error-token-isolation.test.ts) | Design documentation | Security boundary verification |
| [`__tests__/parse-error-factory.test.ts`](parse-error-factory.test.ts) | CI guard | Factory pattern enforcement |

## Test Files

### [`utils/__tests__/sanitize.test.ts`](../utils/__tests__/sanitize.test.ts)

**Purpose:** Unit tests for the sanitization utility functions.

**What it validates:**
- `sanitizeContent()` - Main content redaction producing `[content sanitized, N chars]`
- `sanitizeComparison()` - Token comparison producing `[expected: N chars, actual: M chars]`
- `sanitizeChar()` - Single character redaction with Unicode point metadata
- `stripPaths()` - File path redaction replacing paths with `<REDACTED>`

**Key test categories:**
- Zero content leakage (proprietary values never appear in output)
- Format stability (consistent output patterns)
- Edge cases (Unicode, control characters, empty input, very long content)
- C/AL-specific scenarios (table names, field names, procedure names)

**When to add tests here:**
- New sanitization function variants
- New content types requiring redaction
- Edge cases discovered in production
- Path format variations (new path patterns)

---

### [`parser/__tests__/parser-sanitization.test.ts`](../parser/__tests__/parser-sanitization.test.ts)

**Purpose:** Unit tests verifying each parser error location uses sanitization.

**What it validates:**
- All 13 parser locations that expose `token.value` in error messages
- AL-only feature detection (keywords, modifiers, preprocessors)
- Edge case handling (empty tokens, short values, special characters)

**Locations covered:**
1. `parseInteger()` - Object IDs, field numbers, array sizes
2. `parseVariableDeclarations()` - Reserved keywords as variable names
3. `parseParameters()` - Unexpected tokens in parameter lists
4. `parseEventQualifiedName()` - Invalid event name tokens
5-7. `parseStatementOrExpr()` - AL access modifiers, preprocessors, keywords
8. `parsePrimaryExpr()` - AL preprocessor in expressions
9. `parseMemberExpression()` - Expected identifier after `::`
10. `consume()` - General unexpected token (critical path)
11-13. `checkAndReportALOnlyToken()` - AL keyword/modifier/preprocessor detection

**When to add tests here:**
- New parser error locations that expose token values
- New AL-only feature validations
- Format changes to sanitization output

---

### [`parser/__tests__/parse-error-integration.test.ts`](../parser/__tests__/parse-error-integration.test.ts)

**Purpose:** End-to-end tests verifying actual ParseError output contains no sensitive content.

**What it validates:**
- Path sanitization (Unix/Windows paths, case variations)
- Object ID sanitization (proprietary 6xxxxxx patterns)
- Token value sanitization in real parsing scenarios
- Error recovery sanitization (skipped tokens, recovery contexts)
- `tokenTypeToObjectKind` sanitization (issue #150)

**Test approach:**
- Parse real C/AL code with intentional errors
- Assert error messages contain no sensitive patterns
- Validate sanitized format appears where expected

**When to add tests here:**
- New error code paths that might expose sensitive content
- New error recovery scenarios
- Integration regressions discovered in LSP diagnostics

---

### [`__tests__/lexer-error-sanitization.test.ts`](lexer-error-sanitization.test.ts)

**Purpose:** Security validation for lexer error sanitization with regression protection.

**What it validates:**
Six Unknown token sources:
1. Unmatched closing brace `}`
2. Unclosed quoted identifier `"...`
3. Unclosed string literal `'...`
4. Unknown character (invalid operators like `~`)
5. Unclosed brace comment `{...`
6. Unclosed C-style comment `/*...`

**Test approach:**
- Tests PASS immediately (sanitization already implemented)
- Serve as regression protection if sanitization is accidentally removed
- Use canary values to detect leakage

**Security boundary documented:**
- `error.token.value` = raw content (server-internal only)
- `error.message` = sanitized (sent to LSP clients)

**When to add tests here:**
- New Unknown token sources discovered
- Regression concerns about sanitization removal
- New security boundaries to document

---

### [`parser/__tests__/parse-error-token-isolation.test.ts`](../parser/__tests__/parse-error-token-isolation.test.ts)

**Purpose:** Design documentation and verification of the ParseError.token security boundary.

**What it validates:**
- Token isolation property (raw value stored but never exposed)
- LSP diagnostic field isolation (only safe fields extracted)
- Error message vs token value separation
- Serialization safety (JSON.stringify risks)
- Position calculation using only `token.value.length`

**Security boundary:**
```
ParseError (server-side only)
├─ .message → SANITIZED (exposed to LSP)
└─ .token → RAW CONTENT (server-internal)
    ├─ .value → Used for .length calculation ONLY
    ├─ .line → Safe numeric metadata
    └─ .column → Safe numeric metadata
           ↓
    LSP Diagnostic (sent to client)
    ├─ .message (from .message - SANITIZED)
    └─ .range (from metadata - NUMERIC)
```

**When to add tests here:**
- ParseError structure changes
- New diagnostic creation patterns
- Serialization/deserialization concerns
- Security boundary reviews

---

### [`__tests__/parse-error-factory.test.ts`](parse-error-factory.test.ts)

**Purpose:** CI guard enforcing ParseError factory method pattern.

**What it validates:**
- Exactly ONE `new ParseError(` in parser.ts
- That instance is inside `createParseError` factory
- Factory calls sanitization functions

**Why this exists:**
- Direct construction makes uniform sanitization difficult
- Factory pattern enables centralized error handling
- Prevents accidental bypass of sanitization

**When to add tests here:**
- Factory pattern requirements change
- New sanitization methods added
- Bypasses discovered

## Decision Guide

Use this flowchart to determine where to add new tests:

```
Adding sanitization tests?
│
├─ Testing a sanitization FUNCTION?
│   └─ → sanitize.test.ts
│
├─ Testing a PARSER error location?
│   └─ → parser-sanitization.test.ts
│
├─ Testing LEXER Unknown tokens?
│   └─ → lexer-error-sanitization.test.ts
│
├─ Testing END-TO-END error output?
│   └─ → parse-error-integration.test.ts
│
├─ Documenting SECURITY BOUNDARIES?
│   └─ → parse-error-token-isolation.test.ts
│
└─ Enforcing ARCHITECTURAL PATTERNS?
    └─ → parse-error-factory.test.ts
```

## Not Covered Here

This documentation focuses on **core sanitization logic** (lexer/parser error handling). The following sanitization-related tests exist in separate layers and are NOT documented here:

**LSP Diagnostic Conversion** (`server.ts` and related LSP files)
- Wire format tests verifying diagnostics are created from ParseError
- Conversion from internal ParseError to LSP Diagnostic protocol
- These tests validate the LSP layer, not the sanitization layer

**JSON Serialization** (LSP transport layer)
- Tests that verify serialized diagnostics contain no sensitive content
- Wire format compliance (LSP specification conformance)
- These validate protocol serialization, not error message generation

**End-to-End Integration Tests** (client/server interaction)
- Full LSP client integration tests
- VSCode extension activation tests
- These validate the complete system, not individual sanitization components

**Why They're Separate:**

The tests documented here focus on the **sanitization boundary** - ensuring raw token values never escape into error messages. LSP-layer tests focus on **protocol compliance** - ensuring sanitized messages are correctly formatted for transmission. These are distinct concerns at different architectural layers.

**Design Principle:**

Sanitization happens at the **point of error creation** (lexer/parser). LSP tests assume errors are already sanitized and focus on correct diagnostic transformation. This separation of concerns enables independent testing of each layer.

## Related Issues

- [#166](https://github.com/klauskaan/C-AL-Language/issues/166) - Added clickable file links and scope documentation
- [#147](https://github.com/klauskaan/C-AL-Language/issues/147) - Lexer error sanitization coverage
- [#140](https://github.com/klauskaan/C-AL-Language/issues/140) - Parser error sanitization integration tests
- [#150](https://github.com/klauskaan/C-AL-Language/issues/150) - tokenTypeToObjectKind sanitization
- [#112](https://github.com/klauskaan/C-AL-Language/issues/112) - Token value sanitization in parser
- [#101](https://github.com/klauskaan/C-AL-Language/issues/101) - Original sanitization utilities
