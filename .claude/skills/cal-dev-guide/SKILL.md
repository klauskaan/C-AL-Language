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
