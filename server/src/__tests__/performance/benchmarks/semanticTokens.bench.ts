/**
 * Semantic Tokens Performance Benchmarks
 *
 * Tests the complete pipeline for semantic token generation:
 * Lex → Parse → SemanticTokensProvider.buildSemanticTokens
 *
 * Includes regression threshold to catch performance degradation.
 */

import { Bench } from 'tinybench';
import { Lexer } from '../../../lexer/lexer';
import { Parser } from '../../../parser/parser';
import { SemanticTokensProvider } from '../../../semantic/semanticTokens';
import { loadFixture, COMPLEXITY_FIXTURES } from '../utils/fixtures';
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
 * Mock semantic tokens builder (simple push() recorder, same as unit tests)
 */
class MockSemanticTokensBuilder {
  private data: number[] = [];

  push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void {
    this.data.push(line, char, length, tokenType, tokenModifiers);
  }

  build(): { data: number[] } {
    return { data: this.data };
  }
}

/**
 * Complete pipeline: Lexer → Parser → SemanticTokensProvider.buildSemanticTokens
 */
function fullSemanticTokenPipeline(content: string): void {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const provider = new SemanticTokensProvider();
  const builder = new MockSemanticTokensBuilder() as any; // Type cast to match VSCode interface
  provider.buildSemanticTokens(tokens, ast, builder);
}

/**
 * Benchmark semantic token generation
 */
async function benchmarkSemanticTokens(): Promise<BenchmarkResult[]> {
  console.log('\n🎨 Semantic Tokens Performance Benchmarks\n');

  const bench = new Bench({
    warmupTime: 500,
    warmupIterations: 10,
    time: 1000
  });

  // Load fixture
  const setLiteralsContent = loadFixture(COMPLEXITY_FIXTURES.SET_LITERALS);

  // Benchmark: Full pipeline for set-literals.cal
  bench.add('SemanticTokens: Full pipeline (set-literals.cal)', () => {
    fullSemanticTokenPipeline(setLiteralsContent);
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
    suiteName: 'Semantic Tokens Benchmarks',
    benchmarks: results,
    totalDurationMs: bench.tasks.reduce((sum, t) => sum + ((t.result?.mean || 0) * 1000), 0)
  });

  // Memory usage summary
  const memSnapshot = takeMemorySnapshot();
  console.log(`\n💾 Memory Usage: ${formatMemorySize(memSnapshot.heapUsedMB)}`);

  // REGRESSION THRESHOLD CHECK
  const meanMs = results[0].meanMs;

  /**
   * Calibration: Run `npm run perf:quick` 3 times and record mean time.
   * Set threshold to 3x that mean to catch significant regressions.
   *
   * Calibration results (2026-02-12):
   * - Run 1: 13063.70 ms
   * - Run 2: 13545.63 ms
   * - Run 3: 14322.37 ms
   * - Average: 13643.90 ms
   * - Threshold (3x): 40931.70 ms (rounded to 41000 ms)
   */
  const REGRESSION_THRESHOLD_MS = 41000; // 3x average of calibration runs

  if (meanMs > REGRESSION_THRESHOLD_MS) {
    const msg = `⚠️  REGRESSION DETECTED: Semantic token mean time ${meanMs.toFixed(2)}ms exceeds threshold ${REGRESSION_THRESHOLD_MS}ms`;
    console.log('\n' + msg);
    throw new Error(msg);
  } else {
    console.log(`\n✅ Performance within threshold: ${meanMs.toFixed(2)}ms / ${REGRESSION_THRESHOLD_MS}ms`);
  }

  return results;
}

// Run if executed directly
if (require.main === module) {
  benchmarkSemanticTokens().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export { benchmarkSemanticTokens };
