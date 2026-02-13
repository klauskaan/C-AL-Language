/**
 * Parser Performance Benchmarks
 *
 * Tests parsing performance across different complexity patterns.
 * Includes simple tables, complex tables, codeunits, and nested structures.
 */

import { Bench } from 'tinybench';
import { Lexer } from '../../../lexer/lexer';
import { Parser } from '../../../parser/parser';
import { loadFixture, loadRegressionFixture, FIXTURES, COMPLEXITY_FIXTURES } from '../utils/fixtures';
import { ConsoleReporter, BenchmarkResult } from '../utils/reporter';
import { takeMemorySnapshot, formatMemorySize } from '../utils/memory';

/**
 * Helper: Parse content (lex + parse)
 */
function parseContent(content: string): void {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  parser.parse();
}

/**
 * Benchmark parser performance
 */
async function benchmarkParser(): Promise<BenchmarkResult[]> {
  console.log('\n📝 Parser Performance Benchmarks\n');

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

  // Load regression fixtures (real-world committed files)
  const simpleTableContent = loadRegressionFixture('table-18-customer.cal');
  const complexTableContent = loadRegressionFixture('table-50000-customer-extended.cal');
  const codeunitContent = loadRegressionFixture('codeunit-9-acc-sched-kpi-dimensions.cal');

  // Load complexity fixtures
  const deepNestingContent = loadFixture(COMPLEXITY_FIXTURES.DEEP_NESTING);
  const manyProceduresContent = loadFixture(COMPLEXITY_FIXTURES.MANY_PROCEDURES);

  // Benchmark: Parse tiny file
  bench.add('Parser: Parse tiny file (~100 lines)', () => {
    parseContent(tinyContent);
  });

  // Benchmark: Parse small file
  bench.add('Parser: Parse small file (~500 lines)', () => {
    parseContent(smallContent);
  });

  // Benchmark: Parse medium file
  bench.add('Parser: Parse medium file (~1000 lines)', () => {
    parseContent(mediumContent);
  });

  // Benchmark: Parse large file
  bench.add('Parser: Parse large file (~2000 lines)', () => {
    parseContent(largeContent);
  });

  // Benchmark: Parse simple table (regression fixture)
  bench.add('Parser: Simple table (18 fields)', () => {
    parseContent(simpleTableContent);
  });

  // Benchmark: Parse complex table (regression fixture)
  bench.add('Parser: Complex table (200+ fields, CalcFormulas)', () => {
    parseContent(complexTableContent);
  });

  // Benchmark: Parse codeunit (regression fixture)
  bench.add('Parser: Codeunit (892 lines, 40+ procedures)', () => {
    parseContent(codeunitContent);
  });

  // Benchmark: Parse deep nesting
  bench.add('Parser: Deep nesting (5-7 levels)', () => {
    parseContent(deepNestingContent);
  });

  // Benchmark: Parse many procedures
  bench.add('Parser: Many procedures (100+ procedures)', () => {
    parseContent(manyProceduresContent);
  });

  // Run benchmarks
  await bench.run();

  // Collect results
  const results: BenchmarkResult[] = bench.tasks.map(task => ({
    name: task.name || 'unnamed',
    meanMs: (task.result?.mean || 0) * 1000,
    stdDevMs: (task.result?.sd || 0) * 1000,
    minMs: (task.result?.min || 0) * 1000,
    maxMs: (task.result?.max || 0) * 1000,
    ops: task.result?.hz || 0,
    samples: task.result?.samples?.length || 0
  }));

  // Report results
  const reporter = new ConsoleReporter();
  reporter.reportBenchmark({
    suiteName: 'Parser Benchmarks',
    benchmarks: results,
    totalDurationMs: bench.tasks.reduce((sum, t) => sum + ((t.result?.mean || 0) * 1000), 0)
  });

  // Memory usage summary
  const memSnapshot = takeMemorySnapshot();
  console.log(`\n💾 Memory Usage: ${formatMemorySize(memSnapshot.heapUsedMB)}`);

  return results;
}

// Run if executed directly
if (require.main === module) {
  benchmarkParser().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export { benchmarkParser };
