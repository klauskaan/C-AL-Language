# Performance Testing Guide

## Overview

The C-AL Language Server includes a comprehensive performance regression test suite to:
- **Prevent regressions** in CI/CD (tests fail if performance degrades >20%)
- **Monitor trends** over time with historical data tracking
- **Identify bottlenecks** through detailed benchmarking of all critical components

## Quick Start

```bash
# Run quick suite (~30s) for local development
cd server
npm run perf:quick

# Run standard suite (~2min) for comprehensive testing
npm run perf:benchmark

# Run stress tests (~10+min) for deep analysis
npm run perf:stress

# Compare results to baseline
npm run perf:compare

# Update baseline (after intentional changes)
npm run perf:update-baseline
```

## Architecture

### Directory Structure

```
server/src/__tests__/performance/
├── benchmarks/           # Individual benchmark suites
│   ├── lexer.bench.ts              # Tokenization performance
│   ├── parser.bench.ts             # Parsing performance
│   ├── symbolTable.bench.ts        # Symbol table operations
│   ├── integration.bench.ts        # Full pipeline tests
│   └── memory.bench.ts             # Memory profiling
├── suites/               # Test configurations
│   ├── quick.suite.ts              # ~30s - local development
│   ├── standard.suite.ts           # ~2min - CI/CD
│   └── stress.suite.ts             # ~10min - deep analysis
├── utils/                # Utilities
│   ├── baseline.ts                 # Baseline management
│   ├── memory.ts                   # Memory profiling
│   ├── reporter.ts                 # Result formatting
│   ├── fixtures.ts                 # Fixture loading
│   ├── compare.ts                  # Comparison script
│   ├── updateBaseline.ts           # Baseline update
│   ├── generateLargeFile.ts        # Programmatic fixture generator
│   └── testGeneratedFile.ts        # Test generated fixtures
├── fixtures/             # Synthetic test files
│   ├── tiny.cal                    # ~100 lines
│   ├── small.cal                   # ~500 lines
│   ├── medium.cal                  # ~1000 lines
│   ├── large.cal                   # ~2000 lines
│   ├── xlarge.cal                  # ~700 lines
│   ├── xxlarge.cal                 # ~700 lines
│   ├── huge.cal                    # ~5000 lines (programmatically generated)
│   ├── enormous.cal                # ~10000 lines (programmatically generated)
│   └── [complexity fixtures]       # Specialized patterns
├── baselines/            # Version-controlled baselines
│   ├── baselines.json              # Current performance targets
│   └── schema.json                 # JSON schema
└── results/              # Test output (gitignored)
```

## Test Suites

### Quick Suite (~30 seconds)
**Purpose:** Fast feedback for local development

```bash
npm run perf:quick
```

**Includes:**
- Core lexer/parser/symbolTable benchmarks
- Small and medium file tests only
- Integration tests with smaller fixtures

**When to use:**
- During active development
- Before committing changes
- Quick sanity checks

### Standard Suite (~2 minutes)
**Purpose:** Comprehensive benchmarks for CI/CD

```bash
npm run perf:benchmark
```

**Includes:**
- All lexer benchmarks (tiny → xlarge)
- All parser benchmarks
- All symbol table benchmarks
- Integration tests (excluding stress)
- Memory profiling

**When to use:**
- CI/CD pipelines
- Before pull requests
- Release validation

### Stress Suite (~10+ minutes)
**Purpose:** Deep analysis and stress testing

```bash
npm run perf:stress
```

**Includes:**
- All standard suite benchmarks
- HUGE file tests (5K lines)
- ENORMOUS file tests (10K lines)
- All 8 complexity fixtures
- Extensive memory profiling
- Throughput analysis

**When to use:**
- Performance investigation
- Optimization validation
- Release preparation

## Synthetic Fixtures

**⚠️ IMPORTANT: COPYRIGHT PROTECTION**

All performance test fixtures are **100% synthetic and original**. The `/test/REAL/` directory contains copyrighted material and is **NEVER** referenced in performance test code.

### Size-Based Fixtures

| Fixture | Lines | Purpose |
|---------|-------|---------|
| `tiny.cal` | ~100 | Minimal parsing overhead baseline |
| `small.cal` | ~500 | Typical helper object |
| `medium.cal` | ~1000 | Standard business entity |
| `large.cal` | ~2000 | Complex page/dashboard |
| `xlarge.cal` | ~700 | Medium-sized module |
| `xxlarge.cal` | ~700 | Medium-sized module |
| `huge.cal` | ~5000 | Large business logic module (generated) |
| `enormous.cal` | ~10000 | Worst-case legacy code stress test (generated) |

### Complexity-Based Fixtures

| Fixture | Pattern | Purpose |
|---------|---------|---------|
| `deep-nesting.cal` | 5-7 level nesting | Parser stack depth |
| `many-procedures.cal` | 100+ procedures | Symbol table stress |
| `large-table.cal` | 500+ fields | Field declaration handling |
| `complex-expressions.cal` | Long expressions | Expression parsing |
| `edge-cases.cal` | Syntax edge cases | Lexer robustness |
| `bad-practices.cal` | Anti-patterns | Error recovery |
| `multilingual.cal` | 100+ TextConst | Unicode handling |
| `real-world-business-logic.cal` | Mixed patterns | Comprehensive baseline |

### Generating Large Fixtures

For very large files (5000+ lines), manual creation or AI generation hits practical limits. Instead, use the **programmatic generator**:

```bash
# Generate a 5000-line file (medium complexity)
cd server
npx ts-node src/__tests__/performance/utils/generateLargeFile.ts 5000 src/__tests__/performance/fixtures/huge.cal medium

# Generate a 10000-line file (complex)
npx ts-node src/__tests__/performance/utils/generateLargeFile.ts 10000 src/__tests__/performance/fixtures/enormous.cal complex

# Parameters: <targetLines> <outputPath> <complexity>
# Complexity: simple | medium | complex
```

**Why programmatic generation?**
- ✅ Avoids AI token limits
- ✅ Generates arbitrarily large files quickly
- ✅ Consistent, reproducible output
- ✅ Uses realistic CAL patterns (procedures, tables, pages)
- ✅ Scales to 50,000+ lines if needed

See [GENERATING_LARGE_FILES.md](../../server/src/__tests__/performance/GENERATING_LARGE_FILES.md) for details.

**After generating new fixtures:**
1. Run benchmarks: `npm run perf:benchmark` or `npm run perf:stress`
2. The new tests will show "No baseline found" warnings (expected)
3. Update baselines: `npm run perf:update-baseline`
4. Commit the updated baselines with a descriptive message

### Fixture Guidelines

**All fixtures use fictitious identifiers:**
- ✅ ACME LLC
- ✅ FooBar Corp
- ✅ TestCo
- ✅ Generic business terms

**Never use:**
- ❌ Real company names
- ❌ Specific file references (COD*, TAB*)
- ❌ Identifiable markers
- ❌ Copyrighted material from `/test/REAL/`

## Baseline Management

### Understanding Baselines

Performance baselines are stored in `baselines/baselines.json` with:
- **Version:** Language server version (e.g., "0.4.6")
- **Timestamp:** When baseline was created
- **Environment:** Node version, platform, CPU architecture
- **Benchmarks:** Mean, stddev, min, max, ops/sec for each test

### Thresholds

- ✅ **PASS:** Within 10% of baseline (green)
- ⚠️ **WARN:** 10-20% slower than baseline (yellow)
- ❌ **FAIL:** >20% slower than baseline (red, CI fails)

### Updating Baselines

**When to update:**
- After intentional performance improvements
- After architectural changes affecting performance
- When changing test infrastructure

**How Baselines Are Updated:**

The baseline update process reads from the most recent benchmark run:

1. **Generate Results:** Run any benchmark suite
   ```bash
   npm run perf:benchmark
   ```
   This creates `results/all-benchmarks.json` with all benchmark data

2. **Review Results:** Examine the benchmark output carefully

3. **Update Baseline:** If changes are intentional
   ```bash
   npm run perf:update-baseline
   ```
   This reads `results/all-benchmarks.json` and updates `baselines/baselines.json`

4. **Commit:** Save the updated baseline
   ```bash
   git add server/src/__tests__/performance/baselines/baselines.json
   git commit -m "perf: update baselines after parser optimization"
   ```

**Technical Details:**
- Benchmarks return results arrays from `benchmarkLexer()`, `benchmarkParser()`, etc.
- Standard suite collects and saves all results to `results/all-benchmarks.json`
- `updateBaseline.ts` loads this file and converts to baseline format
- Baseline contains 32+ benchmarks covering all test scenarios

**⚠️ Never update baselines to mask regressions!**

## CI Integration

### GitHub Actions Workflow

The `.github/workflows/performance.yml` workflow:

**Triggers:**
- Pull requests to `main`
- Pushes to `main`
- Manual dispatch with suite selection

**Steps:**
1. Run standard performance suite
2. Compare to baseline
3. Upload results as artifacts (30-day retention)
4. Comment on PR with results
5. **Fail CI** if regressions detected (>20% slower)

**PR Comment Example:**
```markdown
## 📊 Performance Benchmark Results

**Suite**: standard
**Duration**: 125.3s
**Node**: v20.19.2
**Platform**: linux

**Benchmarks Run**: lexer, parser, symbolTable, integration, memory

| Benchmark | Current | Baseline | Change | Status |
|-----------|---------|----------|--------|--------|
| Lexer: Tokenize tiny file | 0.52ms | 0.50ms | +4.0% | ✅ PASS |
| Parser: Parse medium file | 11.2ms | 10.0ms | +12.0% | ⚠️ WARN |
| Integration: Full pipeline | 45.8ms | 35.1ms | +30.5% | ❌ FAIL |
```

### Artifact Storage

Benchmark results are uploaded as artifacts:
- **Retention:** 30 days
- **Format:** JSON
- **Access:** GitHub Actions interface
- **Use:** Trend analysis, debugging

## Memory Profiling

### Running Memory Tests

```bash
# Requires --expose-gc flag (already in npm scripts)
npm run perf:memory
```

### Memory Metrics

- **Heap Used:** Active memory consumption
- **Heap Total:** Total heap size
- **External:** C++ objects bound to JavaScript
- **Array Buffers:** ArrayBuffer and SharedArrayBuffer

### Memory Benchmarks

| Component | Test | Expected |
|-----------|------|----------|
| Lexer | Large file (2K lines) | ~1.5 MB |
| Parser | Large file (2K lines) | ~200 KB |
| Symbol Table | 500 symbols | ~2 KB |
| Full Pipeline | XLarge file (5K lines) | ~3 MB |

### GC Control

Memory tests use `global.gc()` when available:
```bash
NODE_OPTIONS='--expose-gc' npm run perf:memory
```

## Troubleshooting

### High Variance (⚠️ Warning)

**Symptom:** Standard deviation >20% of mean

**Causes:**
- JIT warmup not complete
- System load
- Background processes

**Solutions:**
- Run on dedicated CI environment
- Increase warmup time
- Close other applications

### Missing Baseline

**Symptom:** "No baseline found"

**Solution:**
```bash
npm run perf:update-baseline
```

### CI Failures

**Symptom:** CI fails with regression error

**Investigation:**
1. Check PR comment for details
2. Download artifacts from GitHub Actions
3. Compare JSON results
4. Run locally: `npm run perf:benchmark && npm run perf:compare`

**Resolution:**
- If regression is real: Fix performance issue
- If baseline is outdated: Update baseline (with justification)
- If false positive: Investigate environment differences

### Memory Warnings

**Symptom:** "High memory usage detected"

**Thresholds:**
- Warning: >500 MB heap used
- Critical: Continuous growth

**Investigation:**
1. Run memory profiler: `npm run perf:memory`
2. Check for memory leaks
3. Profile with `--inspect` flag
4. Review object retention

## Best Practices

### Local Development

1. **Run quick suite** before commits
2. **Monitor trends** over time
3. **Profile changes** that might affect performance
4. **Update baseline** only for intentional changes

### CI/CD

1. **Run standard suite** on all PRs
2. **Block merges** on regressions
3. **Store artifacts** for trend analysis
4. **Review warnings** even if not failing

### Performance Optimization

1. **Baseline first:** Run suite before changes
2. **Measure impact:** Compare before/after
3. **Iterate:** Make small, measurable improvements
4. **Validate:** Ensure no regressions in other areas
5. **Update baseline:** After verified improvements

### Adding New Benchmarks

1. **Create benchmark file** in `benchmarks/`
2. **Use tinybench** for consistency
3. **Include in suite** (quick/standard/stress)
4. **Document purpose** in file header
5. **Update baseline** after adding

## Performance Insights

### Current Performance

- **Scaling:** Sub-linear (3.4x for 100x file size)
- **Lexer:** ~0.5ms per 100 lines
- **Parser:** ~2.5ms per 500 lines
- **Symbol Table:** 30ms for 1000 lookups
- **Memory:** 3MB for 5K line files

### Optimization Opportunities

1. **Caching:** Implement aggressive caching for repeated parses
2. **Incremental:** Parse only changed sections
3. **Parallel:** Leverage multi-core for large files
4. **Streaming:** Process files in chunks

## Technical Details

### Benchmark Framework

**tinybench v2.9.0**
- Statistical rigor (warmup, outlier detection)
- Async/await support
- TypeScript-first
- Lightweight (<50KB)

**Configuration:**
```typescript
const bench = new Bench({
  warmupTime: 500,        // 500ms warmup
  warmupIterations: 10,   // 10 warmup runs
  time: 1000              // 1000ms benchmark time
});
```

### Statistical Metrics

- **Mean:** Average execution time
- **Std Dev:** Standard deviation
- **Min/Max:** Fastest/slowest execution
- **Ops/sec:** Operations per second
- **Samples:** Number of iterations

### Baseline Schema

```json
{
  "version": "0.4.6",
  "timestamp": "2025-12-27T12:00:00.000Z",
  "environment": {
    "node": "v20.19.2",
    "platform": "linux",
    "cpu": "x64"
  },
  "benchmarks": {
    "Lexer: Tokenize tiny file": {
      "meanMs": 0.5,
      "stdDevMs": 0.1,
      "minMs": 0.4,
      "maxMs": 0.7,
      "ops": 2000,
      "samples": 100
    }
  }
}
```

## References

- **GitHub Issue:** [#14 - Add performance regression test suite](https://github.com/klaus-liebler/C-AL-Language/issues/14)
- **tinybench:** https://github.com/tinylibs/tinybench
- **Baseline Schema:** `server/src/__tests__/performance/baselines/schema.json`
- **Test Fixtures:** `server/src/__tests__/performance/fixtures/`

## Support

For questions or issues with performance testing:
1. Check this documentation
2. Review existing benchmarks for examples
3. Open an issue with `performance` label
4. Include benchmark results and environment details

---

**⚠️ REMEMBER:** All test fixtures are 100% synthetic. NEVER reference files from `/test/REAL/` as they contain copyrighted material.
