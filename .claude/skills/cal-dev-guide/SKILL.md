---
name: cal-dev-guide
description: Development and testing guide for the C/AL extension including architecture, commands, Jest testing, snapshots, performance benchmarks, and TDD workflow
---

# C/AL Extension Development & Testing Guide

Consolidated guide for developing and testing the C/AL Language Support extension.

## Architecture

```
c-al-extension/
├── package.json              # Extension manifest
├── syntaxes/
│   └── cal.tmLanguage.json   # TextMate grammar
├── src/
│   └── extension.ts          # Extension entry, starts LSP client
├── server/
│   ├── src/
│   │   ├── server.ts         # Language server entry
│   │   ├── lexer/            # Tokenizer
│   │   ├── parser/           # AST builder
│   │   ├── types/            # Type definitions
│   │   ├── utils/            # Symbol table, visitor
│   │   ├── providers/        # Base provider class
│   │   ├── completion/       # Autocomplete
│   │   ├── hover/            # Hover info
│   │   ├── definition/       # Go-to-definition
│   │   ├── references/       # Find references
│   │   ├── signatureHelp/    # Parameter hints
│   │   └── semanticTokens/   # Semantic highlighting
│   └── performance/          # Performance benchmarks
└── test/
    ├── fixtures/             # Synthetic test files
    └── REAL/                 # Confidential NAV exports
```

## Quick Commands

```bash
# Build
npm run compile              # Build extension + server
npm run watch               # Watch mode

# Test (from server/)
cd server && npm test                 # Run all ~2500 tests
cd server && npm test -- --watch      # Watch mode (TDD)
cd server && npm test -- --coverage   # Coverage report
cd server && npm test -- -u           # Update snapshots

# Specific tests
npm test -- lexer.test.ts             # File pattern
npm test -- --testNamePattern="keyword"  # Name pattern

# Performance (from server/)
npm run perf:quick          # Quick benchmark (~5s)
npm run perf:standard       # Standard suite (~15s)
npm run perf:stress         # Stress testing (~30s)
npm run perf:memory         # Memory profiling

# Debug highlighting
npm run mode                # Show current mode
npm run mode:textmate       # TextMate grammar only
npm run mode:semantic       # Semantic tokens only
npm run mode:both           # Both (default)
```

## Test Suite

- **Total Tests:** ~2500 tests
- **Execution Time:** ~7-14 seconds
- **Framework:** Jest with TypeScript
- **Location:** `server/src/<feature>/__tests__/*.test.ts`

### Test Distribution

| Component | Tests | Focus |
|-----------|-------|-------|
| Lexer | ~150 | Token recognition, keywords |
| Parser | ~100 | AST structure, error recovery |
| Providers | ~100 | Completion, hover, definition |
| Regression | ~66 | Snapshot tests |
| Performance | ~20 | Speed baselines |

## Writing Tests

### Jest Pattern

```typescript
describe('Lexer', () => {
  describe('keyword tokenization', () => {
    it('should tokenize TEMPORARY keyword correctly', () => {
      const lexer = new Lexer('TEMPORARY Customer : Record 18;');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.TEMPORARY);
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    });
  });
});
```

### Test Data

```typescript
// Good: Realistic C/AL syntax
const code = `
OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        }
    { 2   ;   ;Name                ;Text50        }
  }
}
`;

// Bad: Unrealistic
const code = 'OBJECT Table';
```

## Snapshot Testing

### Purpose

Validate AST structure doesn't change unexpectedly.

### Creating Snapshots

```typescript
it('should parse customer table correctly', () => {
  const ast = parseCALFile('fixtures/Table18-Customer.cal');
  expect(ast).toMatchSnapshot();
});
```

### Updating Snapshots

```bash
npm test -- -u                    # Update all
npm test -- -u lexer.test.ts      # Update specific file
```

**Warning:** Review changes carefully before committing!

## TDD Workflow

1. **Write Failing Test**
   ```typescript
   it('should parse TEMPORARY keyword', () => {
     const tokens = tokenize('TEMPORARY Customer');
     expect(tokens[0].type).toBe(TokenType.TEMPORARY);
   });
   // Test FAILS - validates diagnosis
   ```

2. **Implement Feature**
   ```typescript
   // Add to lexer.ts
   if (word === 'TEMPORARY') {
     return TokenType.TEMPORARY;
   }
   ```

3. **Verify Test Passes**
   ```bash
   npm test -- --watch
   # Test PASSES
   ```

4. **Refactor** - Tests ensure behavior unchanged

### TDD Validation

- Test FAILS → Diagnosis correct, proceed
- Test PASSES immediately → **Red flag!** Re-investigate root cause

## Coverage

```bash
npm test -- --coverage

# Targets:
# - Statements: >80%
# - Branches: >75%
# - Functions: >80%
# - Lines: >80%
```

## Key Patterns

### Visitor Pattern

```typescript
// utils/visitor.ts - Base for AST traversal
class MyVisitor extends BaseVisitor {
  visitProcedure(node: ProcedureNode) {
    // Process procedure
    this.visitChildren(node);
  }
}
```

### Provider Base Class

```typescript
// providers/baseProvider.ts - Shared LSP functionality
class MyProvider extends BaseProvider {
  // Inherits: symbol resolution, error handling, document management
}
```

### Semantic Tokens

```typescript
// Token types: namespace, class, function, variable, parameter, property
// Modifiers: declaration, readonly, static, deprecated
```

## Debugging

1. Open project in VS Code
2. Press F5 → Extension Development Host
3. Open `.cal` file
4. Use Debug Console for logs

### Watch Mode

```bash
npm test -- --watch

# Then:
# 'p' - Filter by filename
# 't' - Filter by test name
# 'a' - Run all tests
```

## Common Pitfalls

1. **Don't confuse C/AL with AL** - Different languages
2. **Don't treat all `{ }` as comments** - Context matters
3. **Don't ignore `@` numbering** - Essential for symbols
4. **Don't forget `BEGIN END.`** - Period is mandatory
5. **Don't add AL-only features** - Use /cal-al-boundaries skill
6. **Don't skip version checks** - Some features are NAV 2016+ only

## Test Best Practices

✅ **Do:**
- Test one behavior per test
- Use descriptive names: "should [behavior] when [condition]"
- Cover edge cases and error paths
- Use realistic C/AL syntax
- Run tests before committing

❌ **Don't:**
- Test implementation details
- Create brittle tests
- Share state between tests
- Commit broken tests

## Error Location Assertion Strategy

**Purpose:** Prevent location regressions (like Issue #308) while avoiding excessive test brittleness.

**Tier System:**

| Tier | When to Use | Location Assertions | Fixture Stability |
|------|-------------|---------------------|-------------------|
| **Tier 1** | Location is the bug/feature being tested | Exact line AND column | "do not reformat" comment required |
| **Tier 2** | Location affects user experience | Within logical block | Comment recommended |
| **Tier 3** | Testing error detection only | None | No constraint |

### Tier Selection Flowchart

Use this decision tree when writing new error tests:

```
Start: What is the test's PURPOSE?
  │
  ├─▶ "Error appears on wrong line" (Issue #308)
  │   └─▶ TIER 1: Location IS the bug
  │
  ├─▶ "IDE squiggle in wrong place"
  │   └─▶ TIER 1: Location affects UX
  │
  ├─▶ "GitHub issue mentions line/column"
  │   └─▶ TIER 1: Location is explicit requirement
  │
  ├─▶ "Error should be in general region, exact token unimportant"
  │   │   (e.g., anywhere within 10-line CASE block is OK,
  │   │    but outside the construct would be wrong)
  │   └─▶ TIER 2: Block containment matters
  │
  └─▶ "Parser detects this error at all"
      └─▶ TIER 3: Detection only
```

### Tier 1: Exact Location Assertions

**Use when:** The error's precise location is the subject of a GitHub issue OR affects IDE presentation.

**Requirements:**
- Assert BOTH `line` AND `column` with exact values
- Include `// Location assertions depend on fixture structure - do not reformat` comment
- Fixture formatting is frozen; any change breaks the test intentionally

**Template:**
```typescript
it('should report missing colon on correct line (#308)', () => {
  // Location assertions depend on fixture structure - do not reformat
  const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1 EXIT;
      END;
    END;
  }
}`;
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);

  parser.parse();
  const errors = parser.getErrors();

  const colonError = errors.find(e => e.message.includes('Expected :'));
  expect(colonError).toBeDefined();
  expect(colonError!.token.line).toBe(11);     // Tier 1: exact line
  expect(colonError!.token.column).toBe(9);    // Tier 1: exact column
});
```

**Note:** See `server/src/parser/__tests__/error-messages.test.ts` for import statements (`Lexer`, `Parser`).

### Tier 2: Range/Block Assertions

**Use when:** Error should appear within a logical code region, but exact position is an implementation detail.

**Semantics:** "Within logical block" means:
- Error line is within the start/end lines of the containing construct
- For multi-line constructs: `startLine <= errorLine <= endLine`
- For single-line constructs: exact line match (degrades to Tier 1)

**Template:**
```typescript
it('should report error within CASE block', () => {
  // CASE block spans lines 9-12
  const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    VAR
      x : Integer;
    BEGIN
      CASE x OF
        1: MESSAGE('One');
        2: MESSAGE('Two');
      END;
    END;
  }
}`;
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);

  parser.parse();
  const errors = parser.getErrors();

  // Hypothetical: parser detects an issue somewhere in the CASE block
  const caseError = errors.find(e => e.message.includes('CASE'));
  expect(caseError).toBeDefined();
  // Tier 2: within CASE block (lines 9-12)
  expect(caseError!.token.line).toBeGreaterThanOrEqual(9);
  expect(caseError!.token.line).toBeLessThanOrEqual(12);
});
```

### Tier 3: Detection Only

**Use when:** Testing that the parser detects an error at all; location is not relevant.

**Template:**
```typescript
it('should detect invalid keyword in expression', () => {
  const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      x := BEGIN;  // Invalid - BEGIN cannot appear in expression
    END;
  }
}`;
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);

  parser.parse();
  const errors = parser.getErrors();

  // Tier 3: detection only, no location assertion
  expect(errors.length).toBeGreaterThan(0);
  const keywordError = errors.find(e => e.message.includes('unexpected'));
  expect(keywordError).toBeDefined();
});
```

### Multi-Error Tests

When a test checks multiple errors, each error can have a DIFFERENT tier:

```typescript
it('should detect multiple errors with mixed precision', () => {
  // Location assertions depend on fixture structure - do not reformat
  const code = `OBJECT Table 18 Test
{
  FIELDS
  {
    { abc ; ; No. ; Code20 }     // Error 1: invalid field number (Tier 3)
    { 2 ; ; Name ; Text50 }      // Valid
    { 3  ; Desc ; Text100 }      // Error 2: missing semicolon (Tier 1)
  }
}`;
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);

  parser.parse();
  const errors = parser.getErrors();

  // Error 1: Tier 3 - just detecting invalid field number
  const fieldNumError = errors.find(e => e.message.includes('Expected field number'));
  expect(fieldNumError).toBeDefined();

  // Error 2: Tier 1 - location is the issue being fixed
  const semicolonError = errors.find(e => e.message.includes('Expected ;'));
  expect(semicolonError).toBeDefined();
  expect(semicolonError!.token.line).toBe(7);
  expect(semicolonError!.token.column).toBe(10);
});
```

### Migration Guidance

**Existing tests without location assertions:** No mandatory upgrade.
- Tests written as Tier 3 remain Tier 3 unless a regression proves location matters
- When a location bug is filed (like #308), upgrade the relevant test to Tier 1

**Upgrade triggers:**
- GitHub issue filed reporting incorrect error location → Tier 1
- IDE presentation bug filed → Tier 1
- Reviewer notes location should be stable → Tier 2

**Target coverage:** No percentage target. Coverage is event-driven:
- Each location-specific bug report adds one Tier 1 test
- Systematic upgrade for test coverage is tracked separately in Issue #234 (Error Location Test Coverage Audit)

### Validation Criterion

This strategy is validated if it would catch Issue #308:

| #308 Scenario | Strategy Application |
|---------------|---------------------|
| "Error reported on wrong line" | Bug IS about location → Tier 1 |
| Test written with exact assertion | `expect(error.token.line).toBe(11)` |
| Regression introduced | Test fails immediately |

Without this strategy, a Tier 3 test would not have caught the regression because it only checked "error exists."
