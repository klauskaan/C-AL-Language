# Generating Large Test Files

## Problem

Creating large test files (5000+ lines) for performance testing presented a challenge when using AI-generated content, as generating such large files in a single prompt would exceed token limits.

## Solution

We implemented a **programmatic generator** approach that creates large CAL files using templates and loops, avoiding AI token limits entirely.

## How to Generate Files

### Using the CLI

```bash
# Generate a 5000-line file (medium complexity)
npx ts-node src/__tests__/performance/utils/generateLargeFile.ts 5000 src/__tests__/performance/fixtures/huge.cal medium

# Generate a 10000-line file (complex)
npx ts-node src/__tests__/performance/utils/generateLargeFile.ts 10000 src/__tests__/performance/fixtures/enormous.cal complex

# Parameters: <targetLines> <outputPath> <complexity>
# Complexity options: simple | medium | complex
```

### Programmatic Usage

```typescript
import { generateLargeFile } from './utils/generateLargeFile';

generateLargeFile({
  targetLines: 5000,
  outputPath: './fixtures/custom.cal',
  complexity: 'medium'
});
```

## What Gets Generated

The generator creates realistic CAL code including:

- **Procedures**: Business logic with varying complexity
  - Simple: Basic calculations
  - Medium: Order processing, customer lookups
  - Complex: GL entries, dimension validation, multi-step workflows

- **Tables**: Data structures with fields and keys

- **Pages**: List pages linked to tables

- **Helper Functions**: Supporting procedures for main logic

## Generated Files

- **huge.cal**: ~5,000 lines (111KB) - Meets the 5000+ line requirement from issue #14
- **enormous.cal**: ~10,000 lines (267KB) - Extreme stress testing

## Performance

Both generated files parse successfully:

- **huge.cal**: 19,310 tokens in ~22ms total
- **enormous.cal**: 36,261 tokens in ~40ms total

## Why This Approach Works

1. **No Token Limits**: Programmatic generation doesn't count against AI context windows
2. **Deterministic**: Same input always produces same output
3. **Scalable**: Can generate arbitrarily large files
4. **Realistic**: Uses actual CAL patterns and structures
5. **Fast**: Generates 10,000 lines in under a second

## Regenerating Files

If you need to regenerate the files with different patterns:

1. Edit the templates in [generateLargeFile.ts](./utils/generateLargeFile.ts)
2. Run the generator with desired parameters
3. Test with: `npx ts-node src/__tests__/performance/utils/testGeneratedFile.ts`

## Integration with Test Suites

The generated files are integrated into:

- **fixtures.ts**: Added as `FIXTURES.HUGE` and `FIXTURES.ENORMOUS`
- **stress.suite.ts**: Tests both files in the maximum size stress tests

This ensures the 5000+ line requirement from issue #14 is met without AI token limitations.
