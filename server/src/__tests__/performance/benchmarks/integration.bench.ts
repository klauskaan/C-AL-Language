/**
 * Integration Performance Benchmarks
 *
 * Tests the complete pipeline: Lex → Parse → Symbol Table building.
 * Includes document cache simulation and stress tests.
 */

import { Bench } from 'tinybench';
import { Lexer } from '../../../lexer/lexer';
import { Parser } from '../../../parser/parser';
import { SymbolTable } from '../../../symbols/symbolTable';
import { loadFixture, FIXTURES } from '../utils/fixtures';
import { ConsoleReporter } from '../utils/reporter';
import { takeMemorySnapshot, formatMemorySize } from '../utils/memory';

interface BenchmarkResult {
  name: string;
  meanMs: number;
  stdDevMs: number;
  minMs: number;
  maxMs: number;
  ops: number;
  samples: number;
  memoryMB?: number;
}

/**
 * Complete pipeline: lex → parse → build symbol table
 */
function fullPipeline(content: string): void {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);
}

/**
 * Document cache simulation: parse and reparse same document
 */
function simulateDocumentCache(content: string, operationCount: number): void {
  for (let i = 0; i < operationCount; i++) {
    fullPipeline(content);
  }
}

/**
 * Benchmark integration scenarios
 */
async function benchmarkIntegration(): Promise<BenchmarkResult[]> {
  console.log('\n🔗 Integration Performance Benchmarks\n');

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
  const xxlargeContent = loadFixture(FIXTURES.XXLARGE);
  const hugeContent = loadFixture(FIXTURES.HUGE);
  const enormousContent = loadFixture(FIXTURES.ENORMOUS);

  // Benchmark: Full pipeline - tiny file
  bench.add('Integration: Lex → Parse → Symbols (tiny.cal)', () => {
    fullPipeline(tinyContent);
  });

  // Benchmark: Full pipeline - small file
  bench.add('Integration: Lex → Parse → Symbols (small.cal)', () => {
    fullPipeline(smallContent);
  });

  // Benchmark: Full pipeline - medium file
  bench.add('Integration: Lex → Parse → Symbols (medium.cal)', () => {
    fullPipeline(mediumContent);
  });

  // Benchmark: Full pipeline - large file
  bench.add('Integration: Lex → Parse → Symbols (large.cal)', () => {
    fullPipeline(largeContent);
  });

  // Benchmark: Full pipeline - xlarge file
  bench.add('Integration: Lex → Parse → Symbols (xlarge.cal)', () => {
    fullPipeline(xlargeContent);
  });

  // Benchmark: Full pipeline - xxlarge file
  bench.add('Integration: Lex → Parse → Symbols (xxlarge.cal)', () => {
    fullPipeline(xxlargeContent);
  });

  // Benchmark: Document cache simulation (10 operations on medium file)
  bench.add('Integration: Document cache (10 ops, medium.cal)', () => {
    simulateDocumentCache(mediumContent, 10);
  });

  // Benchmark: STRESS TEST - huge file (5,000+ lines)
  bench.add('Integration: STRESS TEST (huge.cal - 5K lines)', () => {
    fullPipeline(hugeContent);
  });

  // Benchmark: EXTREME STRESS TEST - enormous file (10,000+ lines)
  bench.add('Integration: EXTREME STRESS TEST (enormous.cal - 10K lines)', () => {
    fullPipeline(enormousContent);
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
    suiteName: 'Integration Benchmarks',
    benchmarks: results,
    totalDurationMs: bench.tasks.reduce((sum, t) => sum + ((t.result?.mean || 0) * 1000), 0)
  });

  // Memory usage summary
  const memSnapshot = takeMemorySnapshot();
  console.log(`\n💾 Memory Usage: ${formatMemorySize(memSnapshot.heapUsedMB)}`);

  // Performance insights
  console.log('\n📈 Performance Insights:');
  const tinyResult = results[0];
  const enormousResult = results[results.length - 1];
  const scalingFactor = enormousResult.meanMs / tinyResult.meanMs;
  const lineCountRatio = 10000 / 100; // enormous vs tiny
  console.log(`   Scaling factor (100 lines → 10K lines): ${scalingFactor.toFixed(1)}x`);
  console.log(`   Expected linear scaling: ${lineCountRatio}x`);
  console.log(`   Actual vs Linear: ${(scalingFactor / lineCountRatio).toFixed(2)}x`);

  if (scalingFactor / lineCountRatio > 1.5) {
    console.log(`   ⚠️  Scaling is super-linear (complexity issue detected)`);
  } else if (scalingFactor / lineCountRatio < 0.8) {
    console.log(`   ✨ Scaling is sub-linear (excellent caching/optimization)`);
  } else {
    console.log(`   ✅ Scaling is near-linear (good performance)`);
  }

  return results;
}

// Run if executed directly
if (require.main === module) {
  benchmarkIntegration().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export { benchmarkIntegration };
