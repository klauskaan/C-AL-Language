/**
 * Memory Profiling Benchmarks
 *
 * Measures memory footprint of lexer, parser, and symbol table operations.
 * Requires NODE_OPTIONS='--expose-gc' to enable garbage collection control.
 */

import { Lexer } from '../../../lexer/lexer';
import { Parser } from '../../../parser/parser';
import { SymbolTable } from '../../../symbols/symbolTable';
import { loadFixture, FIXTURES } from '../utils/fixtures';
import {
  benchmarkMemory,
  warnIfGCUnavailable,
  getMemoryUsageSummary,
  formatMemorySize,
  takeMemorySnapshot
} from '../utils/memory';

interface MemoryBenchmarkResult {
  name: string;
  meanMB: number;
  stdDevMB: number;
  minMB: number;
  maxMB: number;
  samples: number;
}

/**
 * Run memory profiling benchmarks
 */
async function runMemoryBenchmarks(): Promise<void> {
  console.log('\n💾 Memory Profiling Benchmarks\n');

  // Check if GC is available
  warnIfGCUnavailable();

  // Load fixtures
  const largeContent = loadFixture(FIXTURES.LARGE);
  const xlargeContent = loadFixture(FIXTURES.XLARGE);
  const hugeContent = loadFixture(FIXTURES.HUGE);
  const enormousContent = loadFixture(FIXTURES.ENORMOUS);

  const results: MemoryBenchmarkResult[] = [];

  console.log('Initial memory usage:', getMemoryUsageSummary());
  console.log('\n' + '='.repeat(80));

  // Benchmark: Lexer memory footprint (large file)
  console.log('\n📊 Benchmarking: Lexer memory (large file, ~2000 lines)...');
  const lexerResult = await benchmarkMemory('Lexer: Memory footprint (large file)', () => {
    const lexer = new Lexer(largeContent);
    lexer.tokenize();
  }, 50);
  results.push(lexerResult);
  console.log(`   Mean: ${formatMemorySize(lexerResult.meanMB)}, StdDev: ${formatMemorySize(lexerResult.stdDevMB)}`);

  // Benchmark: Parser memory footprint (large file)
  console.log('\n📊 Benchmarking: Parser memory (large file, ~2000 lines)...');
  const lexer = new Lexer(largeContent);
  const tokens = lexer.tokenize();
  const parserResult = await benchmarkMemory('Parser: Memory footprint (large file)', () => {
    const parser = new Parser(tokens);
    parser.parse();
  }, 50);
  results.push(parserResult);
  console.log(`   Mean: ${formatMemorySize(parserResult.meanMB)}, StdDev: ${formatMemorySize(parserResult.stdDevMB)}`);

  // Benchmark: Symbol table memory (500 symbols)
  console.log('\n📊 Benchmarking: Symbol Table memory (500 symbols)...');
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const symbolTableResult = await benchmarkMemory('SymbolTable: Memory (500 symbols)', () => {
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);
  }, 50);
  results.push(symbolTableResult);
  console.log(`   Mean: ${formatMemorySize(symbolTableResult.meanMB)}, StdDev: ${formatMemorySize(symbolTableResult.stdDevMB)}`);

  // Benchmark: Full pipeline memory (xlarge file)
  console.log('\n📊 Benchmarking: Full pipeline memory (xlarge file, ~700 lines)...');
  const pipelineXlargeResult = await benchmarkMemory('Full Pipeline: Memory (xlarge file)', () => {
    const lexer = new Lexer(xlargeContent);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);
  }, 30);
  results.push(pipelineXlargeResult);
  console.log(`   Mean: ${formatMemorySize(pipelineXlargeResult.meanMB)}, StdDev: ${formatMemorySize(pipelineXlargeResult.stdDevMB)}`);

  // Benchmark: Full pipeline memory (huge file - stress test)
  console.log('\n📊 Benchmarking: Full pipeline memory (huge file, ~5000 lines)...');
  const pipelineHugeResult = await benchmarkMemory('Full Pipeline: Memory (huge file)', () => {
    const lexer = new Lexer(hugeContent);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);
  }, 20);
  results.push(pipelineHugeResult);
  console.log(`   Mean: ${formatMemorySize(pipelineHugeResult.meanMB)}, StdDev: ${formatMemorySize(pipelineHugeResult.stdDevMB)}`);

  // Benchmark: Full pipeline memory (enormous file - extreme stress test)
  console.log('\n📊 Benchmarking: Full pipeline memory (enormous file, ~10000 lines)...');
  const pipelineEnormousResult = await benchmarkMemory('Full Pipeline: Memory (enormous file)', () => {
    const lexer = new Lexer(enormousContent);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);
  }, 10);
  results.push(pipelineEnormousResult);
  console.log(`   Mean: ${formatMemorySize(pipelineEnormousResult.meanMB)}, StdDev: ${formatMemorySize(pipelineEnormousResult.stdDevMB)}`);

  // Report summary table
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Memory Benchmark Summary\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║ Benchmark                              │ Mean      │ StdDev    │ Samples ║');
  console.log('╟────────────────────────────────────────┼───────────┼───────────┼─────────╢');

  for (const result of results) {
    const name = result.name.padEnd(38);
    const mean = formatMemorySize(result.meanMB).padEnd(9);
    const stdDev = formatMemorySize(result.stdDevMB).padEnd(9);
    const samples = result.samples.toString().padStart(7);
    console.log(`║ ${name} │ ${mean} │ ${stdDev} │ ${samples} ║`);
  }

  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  // Final memory usage
  console.log('\nFinal memory usage:', getMemoryUsageSummary());

  // Memory efficiency analysis
  console.log('\n📈 Memory Efficiency Analysis:');
  console.log(`   Lexer efficiency: ${formatMemorySize(lexerResult.meanMB)} per operation`);
  console.log(`   Parser efficiency: ${formatMemorySize(parserResult.meanMB)} per operation`);
  console.log(`   SymbolTable efficiency: ${formatMemorySize(symbolTableResult.meanMB)} per operation`);
  console.log(`   Pipeline overhead (xlarge): ${formatMemorySize(pipelineXlargeResult.meanMB - (lexerResult.meanMB + parserResult.meanMB + symbolTableResult.meanMB))}`);
  console.log(`   Pipeline overhead (huge): ${formatMemorySize(pipelineHugeResult.meanMB - (lexerResult.meanMB + parserResult.meanMB + symbolTableResult.meanMB))}`);
  console.log(`   Pipeline overhead (enormous): ${formatMemorySize(pipelineEnormousResult.meanMB - (lexerResult.meanMB + parserResult.meanMB + symbolTableResult.meanMB))}`);

  const totalSnapshot = takeMemorySnapshot();
  if (totalSnapshot.heapUsedMB > 500) {
    console.log(`\n⚠️  High memory usage detected: ${formatMemorySize(totalSnapshot.heapUsedMB)}`);
    console.log(`   Consider investigating memory leaks or optimization opportunities.`);
  } else {
    console.log(`\n✅ Memory usage is within acceptable range: ${formatMemorySize(totalSnapshot.heapUsedMB)}`);
  }
}

// Run if executed directly
if (require.main === module) {
  runMemoryBenchmarks().catch(error => {
    console.error('Memory benchmark failed:', error);
    process.exit(1);
  });
}

export { runMemoryBenchmarks };
