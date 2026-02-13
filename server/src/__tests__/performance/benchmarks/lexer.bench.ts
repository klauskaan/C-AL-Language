/**
 * Lexer Performance Benchmarks
 *
 * Tests tokenization performance across different file sizes.
 * Targets: tiny <1ms, small <5ms, medium <20ms, large <50ms, xlarge <30ms, huge <250ms, enormous <500ms
 */

import { Bench } from 'tinybench';
import { Lexer } from '../../../lexer/lexer';
import { loadFixture, FIXTURES } from '../utils/fixtures';
import { ConsoleReporter, BenchmarkResult } from '../utils/reporter';
import { takeMemorySnapshot, formatMemorySize } from '../utils/memory';

/**
 * Benchmark lexer tokenization
 */
async function benchmarkLexer(): Promise<BenchmarkResult[]> {
  console.log('\n🔍 Lexer Performance Benchmarks\n');

  const bench = new Bench({
    warmupTime: 500,
    warmupIterations: 10,
    time: 1000
  });

  // Load fixtures
  const tinyContent = loadFixture(FIXTURES.TINY);
  const smallContent = loadFixture(FIXTURES.SMALL);
  const mediumContent = loadFixture(FIXTURES.MEDIUM);
  const largeContent = loadFixture(FIXTURES.LARGE);
  const xlargeContent = loadFixture(FIXTURES.XLARGE);
  const hugeContent = loadFixture(FIXTURES.HUGE);
  const enormousContent = loadFixture(FIXTURES.ENORMOUS);

  // Benchmark: Tokenize tiny file (~100 lines)
  bench.add('Lexer: Tokenize tiny file (~100 lines)', () => {
    const lexer = new Lexer(tinyContent);
    lexer.tokenize();
  });

  // Benchmark: Tokenize small file (~500 lines)
  bench.add('Lexer: Tokenize small file (~500 lines)', () => {
    const lexer = new Lexer(smallContent);
    lexer.tokenize();
  });

  // Benchmark: Tokenize medium file (~1000 lines)
  bench.add('Lexer: Tokenize medium file (~1000 lines)', () => {
    const lexer = new Lexer(mediumContent);
    lexer.tokenize();
  });

  // Benchmark: Tokenize large file (~2000 lines)
  bench.add('Lexer: Tokenize large file (~2000 lines)', () => {
    const lexer = new Lexer(largeContent);
    lexer.tokenize();
  });

  // Benchmark: Tokenize xlarge file (~700 lines)
  bench.add('Lexer: Tokenize xlarge file (~700 lines)', () => {
    const lexer = new Lexer(xlargeContent);
    lexer.tokenize();
  });

  // Benchmark: Tokenize huge file (~5000 lines - stress test)
  bench.add('Lexer: Tokenize huge file (~5000 lines)', () => {
    const lexer = new Lexer(hugeContent);
    lexer.tokenize();
  });

  // Benchmark: Tokenize enormous file (~10000 lines - extreme stress test)
  bench.add('Lexer: Tokenize enormous file (~10000 lines)', () => {
    const lexer = new Lexer(enormousContent);
    lexer.tokenize();
  });

  // Run benchmarks
  await bench.run();

  // Collect results
  const results: BenchmarkResult[] = bench.tasks.map(task => ({
    name: task.name || 'unnamed',
    meanMs: task.result?.mean || 0,
    stdDevMs: task.result?.sd || 0,
    minMs: task.result?.min || 0,
    maxMs: task.result?.max || 0,
    ops: task.result?.hz || 0,
    samples: task.result?.samples?.length || 0
  }));

  // Report results
  const reporter = new ConsoleReporter();
  reporter.reportBenchmark({
    suiteName: 'Lexer Benchmarks',
    benchmarks: results,
    totalDurationMs: bench.tasks.reduce((sum, t) => sum + (t.result?.mean || 0), 0)
  });

  // Memory usage summary
  const memSnapshot = takeMemorySnapshot();
  console.log(`\n💾 Memory Usage: ${formatMemorySize(memSnapshot.heapUsedMB)}`);

  return results;
}

// Run if executed directly
if (require.main === module) {
  benchmarkLexer().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export { benchmarkLexer };
