---
name: cal-testing-guide
description: Comprehensive guide for writing and running tests including Jest setup, snapshot testing with cal-open-library fixtures, performance benchmarks, and test-driven development workflow
allowed-tools: Read, Grep, Glob, Bash(npm test*), Bash(npm run perf*)
---

# C/AL Testing Guide

Comprehensive testing guide for the C/AL Language Support extension.

## Test Suite Overview

- **Total Tests:** 398 tests
- **Execution Time:** ~7 seconds (baseline)
- **Framework:** Jest with TypeScript
- **Coverage Target:** >80% for new code
- **Test Location:** `server/src/<feature>/__tests__/*.test.ts`

## Directory Structure

```
server/src/
├── lexer/
│   └── __tests__/
│       ├── lexer.test.ts           # ~150 tests
│       └── fixtures/               # Test data
├── parser/
│   └── __tests__/
│       ├── parser.test.ts          # ~100 tests
│       └── ast-snapshots.test.ts   # Snapshot tests
├── completion/
│   └── __tests__/
│       └── completion.test.ts
├── hover/
│   └── __tests__/
│       └── hover.test.ts
├── definition/
│   └── __tests__/
│       └── definition.test.ts
├── references/
│   └── __tests__/
│       └── references.test.ts
└── __tests__/
    ├── fixtures/                   # Shared test fixtures
    └── integration.test.ts         # Integration tests
```

## Running Tests

### Basic Commands

```bash
cd server && npm test                 # Run all 398 tests
cd server && npm test -- --watch      # Watch mode for TDD
cd server && npm test -- --coverage   # Coverage report
cd server && npm test -- -u           # Update snapshots
```

### Running Specific Tests

```bash
# Run tests in specific file
npm test -- lexer.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="TEMPORARY keyword"

# Run only failed tests
npm test -- --onlyFailures
```

### Performance Testing

```bash
npm run perf:quick      # Quick benchmark (~5s)
npm run perf:standard   # Standard suite (~15s)
npm run perf:stress     # Stress testing (~30s)
npm run perf:memory     # Memory profiling with v8-profiler
```

## Writing Unit Tests

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

    it('should handle TEMPORARY in different cases', () => {
      // C/AL is case-insensitive
      expect(tokenize('TEMPORARY')).toMatchTokenType(TokenType.TEMPORARY);
      expect(tokenize('temporary')).toMatchTokenType(TokenType.TEMPORARY);
      expect(tokenize('Temporary')).toMatchTokenType(TokenType.TEMPORARY);
    });
  });
});
```

### Test Organization

- **describe blocks:** Group related tests (feature/component)
- **it blocks:** Single behavior per test
- **Setup/Teardown:** Use `beforeEach`/`afterEach` for common setup
- **Naming:** Descriptive - "should [behavior] when [condition]"

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

// Bad: Unrealistic or incomplete
const code = 'OBJECT Table';
```

## Snapshot Testing

### Purpose

Snapshot tests validate AST structure doesn't change unexpectedly.

### Creating Snapshots

```typescript
import { parseCALFile } from '../testUtils';

describe('AST Snapshots', () => {
  it('should parse customer table correctly', () => {
    const ast = parseCALFile('fixtures/Table18-Customer.cal');
    expect(ast).toMatchSnapshot();
  });
});
```

### Using Real C/AL Files

```typescript
// Fixtures from Microsoft cal-open-library
const fixtures = [
  'fixtures/COD1-ApplicationManagement.txt',
  'fixtures/TAB18-Customer.txt',
  'fixtures/PAG21-CustomerCard.txt',
];

fixtures.forEach(file => {
  it(`should parse ${file}`, () => {
    const content = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(content);
    expect(ast.errors).toHaveLength(0);
    expect(ast).toMatchSnapshot();
  });
});
```

### Updating Snapshots

```bash
npm test -- -u                    # Update all snapshots
npm test -- -u lexer.test.ts      # Update specific file
```

**Warning:** Review snapshot changes carefully before committing!

## Performance Testing

### Baseline Comparisons

```typescript
describe('Performance', () => {
  it('should tokenize large file within baseline', () => {
    const largeFile = generateLargeCAL(1000); // 1000 lines

    const start = performance.now();
    lexer.tokenize(largeFile);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // 100ms baseline
  });
});
```

### Memory Profiling

```bash
# Run with v8-profiler
npm run perf:memory

# Generates heap snapshots for analysis
ls -lh *.heapsnapshot
```

### Regression Detection

```typescript
// Check against stored baselines
const baseline = require('./baselines.json');

expect(parserDuration).toBeLessThan(baseline.parser * 1.2); // Max 20% regression
```

## Test Fixtures

### Location

- **Shared:** `server/src/__tests__/fixtures/`
- **Feature-specific:** `server/src/<feature>/__tests__/fixtures/`

### Sources

1. **Microsoft cal-open-library** - Real NAV standard code
2. **NAV demo database exports** - Official examples
3. **Minimal reproducible examples** - Edge cases

### Fixture Organization

```
fixtures/
├── complete/
│   ├── COD1-ApplicationManagement.txt
│   ├── TAB18-Customer.txt
│   └── PAG21-CustomerCard.txt
├── snippets/
│   ├── temporary-table.cal
│   ├── foreach-loop.cal
│   └── dotnet-event.cal
└── edge-cases/
    ├── empty-sections.cal
    ├── malformed-braces.cal
    └── unicode-chars.cal
```

## Debugging Failed Tests

### Watch Mode

```bash
cd server && npm test -- --watch

# Then:
# Press 'p' to filter by filename
# Press 't' to filter by test name
# Press 'a' to run all tests
```

### Verbose Output

```bash
npm test -- --verbose              # Show individual test results
npm test -- --detectOpenHandles    # Find hanging async operations
npm test -- --no-coverage          # Faster when debugging
```

### Common Issues

| Problem | Solution |
|---------|----------|
| Snapshot mismatch | Review changes, update with `-u` if correct |
| Timeout | Increase timeout: `jest.setTimeout(10000)` |
| Random failures | Check for shared state between tests |
| Memory leak | Use `--detectLeaks` flag |

## Coverage Requirements

### Running Coverage

```bash
npm test -- --coverage

# Generates:
# - coverage/lcov-report/index.html (HTML report)
# - coverage/coverage-final.json    (JSON data)
```

### Coverage Targets

- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

### Excluded Files

```javascript
// jest.config.js
coveragePathIgnorePatterns: [
  '/node_modules/',
  '/__tests__/',
  '/fixtures/',
  '.test.ts'
]
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Tests
  run: |
    cd server
    npm test -- --coverage --ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./server/coverage/coverage-final.json
```

### Pre-commit Hook

```bash
# Run tests before commit
cd server && npm test

# Or use husky
npx husky add .husky/pre-commit "cd server && npm test"
```

## Test-Driven Development Workflow

1. **Write Failing Test**
   ```typescript
   it('should parse TEMPORARY keyword', () => {
     const tokens = tokenize('TEMPORARY Customer');
     expect(tokens[0].type).toBe(TokenType.TEMPORARY);
   });
   // Test fails: TEMPORARY not recognized
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
   # Test now passes
   ```

4. **Refactor if Needed**
   - Clean up implementation
   - Tests ensure behavior unchanged

## Best Practices

✅ **Do:**
- Test one behavior per test
- Use descriptive test names
- Cover edge cases and error paths
- Use realistic C/AL syntax
- Update snapshots carefully
- Run tests before committing
- Aim for >80% coverage

❌ **Don't:**
- Test implementation details
- Create brittle tests (break on refactoring)
- Share state between tests
- Use magic numbers without explanation
- Commit broken tests
- Skip error case testing

## Quick Reference

```bash
# Common Commands
npm test                      # Run all tests
npm test -- --watch          # TDD mode
npm test -- --coverage       # With coverage
npm test -- -u               # Update snapshots
npm test -- <pattern>        # Run specific tests

# Performance
npm run perf:quick           # Quick benchmark
npm run perf:standard        # Standard suite
npm run perf:stress          # Stress testing

# Debugging
npm test -- --verbose        # Detailed output
npm test -- --detectLeaks    # Find memory leaks
npm test -- --no-coverage    # Faster execution
```
