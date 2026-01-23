/**
 * Stress Test Suite
 *
 * Deep analysis and stress testing (~10+ minutes).
 * Runs all benchmarks including complexity fixtures and stress tests.
 */

import { Bench } from 'tinybench';
import { Lexer } from '../../../lexer/lexer';
import { Parser } from '../../../parser/parser';
import { SymbolTable } from '../../../symbols/symbolTable';
import { loadFixture, FIXTURES, COMPLEXITY_FIXTURES } from '../utils/fixtures';
import { benchmarkMemory, formatMemorySize, getMemoryUsageSummary } from '../utils/memory';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface StressTestResult {
  fixture: string;
  lines: number;
  meanMs: number;
  memoryMB: number;
  tokensPerSecond: number;
}

/**
 * Run stress tests on all complexity fixtures
 */
async function runComplexityStressTests(): Promise<StressTestResult[]> {
  console.log('\n🔥 Complexity Fixture Stress Tests\n');

  const results: StressTestResult[] = [];
  const fixtures = [
    COMPLEXITY_FIXTURES.DEEP_NESTING,
    COMPLEXITY_FIXTURES.MANY_PROCEDURES,
    COMPLEXITY_FIXTURES.LARGE_TABLE,
    COMPLEXITY_FIXTURES.COMPLEX_EXPRESSIONS,
    COMPLEXITY_FIXTURES.EDGE_CASES,
    COMPLEXITY_FIXTURES.BAD_PRACTICES,
    COMPLEXITY_FIXTURES.MULTILINGUAL,
    COMPLEXITY_FIXTURES.REAL_WORLD_BUSINESS_LOGIC
  ];

  for (const fixtureName of fixtures) {
    console.log(`\n📊 Stress testing: ${fixtureName}...`);
    const content = loadFixture(fixtureName);
    const lines = content.split('\n').length;

    const bench = new Bench({ time: 2000, warmupTime: 1000 });

    bench.add(fixtureName, () => {
      const lexer = new Lexer(content);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);
    });

    await bench.run();

    const task = bench.tasks[0];
    const meanMs = (task.result?.mean || 0) * 1000;

    // Memory test
    const memResult = await benchmarkMemory(`Memory: ${fixtureName}`, () => {
      const lexer = new Lexer(content);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);
    }, 10);

    const tokensPerSecond = lines / (meanMs / 1000);

    results.push({
      fixture: fixtureName,
      lines,
      meanMs,
      memoryMB: memResult.meanMB,
      tokensPerSecond
    });

    console.log(`   Mean: ${meanMs.toFixed(2)}ms, Memory: ${formatMemorySize(memResult.meanMB)}, Throughput: ${tokensPerSecond.toFixed(0)} lines/sec`);
  }

  return results;
}

/**
 * Run maximum file size stress tests
 */
async function runMaxSizeStressTests(): Promise<void> {
  console.log('\n🚀 Maximum File Size Stress Tests\n');

  // Test HUGE file (5000+ lines - meets requirement from issue #14)
  const hugeContent = loadFixture(FIXTURES.HUGE);
  const hugeLines = hugeContent.split('\n').length;

  console.log(`Testing huge.cal (${hugeLines} lines, ${(hugeContent.length / 1024).toFixed(0)}KB)...`);

  const hugeBench = new Bench({ time: 3000, warmupTime: 1000 });

  hugeBench.add('Huge: Full Pipeline', () => {
    const lexer = new Lexer(hugeContent);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);
  });

  await hugeBench.run();

  const hugeTask = hugeBench.tasks[0];
  const hugeMeanMs = (hugeTask.result?.mean || 0) * 1000;
  const hugeOps = hugeTask.result?.hz || 0;

  console.log(`\n   Mean: ${hugeMeanMs.toFixed(2)}ms`);
  console.log(`   Ops/sec: ${hugeOps.toFixed(0)}`);
  console.log(`   Throughput: ${(hugeLines / (hugeMeanMs / 1000)).toFixed(0)} lines/sec`);

  // Memory profiling
  console.log('\n   Running memory profile...');
  const hugeMemResult = await benchmarkMemory('Huge Memory', () => {
    const lexer = new Lexer(hugeContent);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);
  }, 5);

  console.log(`   Memory footprint: ${formatMemorySize(hugeMemResult.meanMB)} ± ${formatMemorySize(hugeMemResult.stdDevMB)}`);

  // Test ENORMOUS file (10000+ lines - extreme stress test)
  console.log(`\nTesting enormous.cal (extreme stress test)...`);
  const enormousContent = loadFixture(FIXTURES.ENORMOUS);
  const enormousLines = enormousContent.split('\n').length;

  console.log(`   File size: ${enormousLines} lines, ${(enormousContent.length / 1024).toFixed(0)}KB`);

  const enormousBench = new Bench({ time: 3000, warmupTime: 1000 });

  enormousBench.add('Enormous: Full Pipeline', () => {
    const lexer = new Lexer(enormousContent);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);
  });

  await enormousBench.run();

  const enormousTask = enormousBench.tasks[0];
  const enormousMeanMs = (enormousTask.result?.mean || 0) * 1000;
  const enormousOps = enormousTask.result?.hz || 0;

  console.log(`\n   Mean: ${enormousMeanMs.toFixed(2)}ms`);
  console.log(`   Ops/sec: ${enormousOps.toFixed(0)}`);
  console.log(`   Throughput: ${(enormousLines / (enormousMeanMs / 1000)).toFixed(0)} lines/sec`);

  // Memory profiling
  console.log('\n   Running memory profile...');
  const enormousMemResult = await benchmarkMemory('Enormous Memory', () => {
    const lexer = new Lexer(enormousContent);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);
  }, 5);

  console.log(`   Memory footprint: ${formatMemorySize(enormousMemResult.meanMB)} ± ${formatMemorySize(enormousMemResult.stdDevMB)}`);
}

/**
 * Main stress suite runner
 */
async function runStressSuite(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                    Stress Test Suite                               ║');
  console.log('║                                                                    ║');
  console.log('║  Purpose: Deep analysis and stress testing                         ║');
  console.log('║  Duration: ~10+ minutes                                            ║');
  console.log('║  Scope: All fixtures including complexity patterns                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  console.log('\nInitial memory:', getMemoryUsageSummary());

  const startTime = Date.now();

  try {
    // Run complexity stress tests
    const complexityResults = await runComplexityStressTests();

    // Run maximum size stress tests
    await runMaxSizeStressTests();

    const duration = (Date.now() - startTime) / 1000;

    // Generate stress test report
    const report = {
      timestamp: new Date().toISOString(),
      version: '0.4.6',
      duration,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      complexityTests: complexityResults,
      summary: {
        totalFixtures: complexityResults.length + 1,
        avgMemoryMB: complexityResults.reduce((sum, r) => sum + r.memoryMB, 0) / complexityResults.length,
        avgThroughput: complexityResults.reduce((sum, r) => sum + r.tokensPerSecond, 0) / complexityResults.length
      }
    };

    const reportPath = join(__dirname, '../results/stress-suite-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '═'.repeat(80));
    console.log(`✅ Stress Suite Complete - Total Duration: ${duration.toFixed(1)}s`);
    console.log(`📄 Report written to: ${reportPath}`);
    console.log('\nFinal memory:', getMemoryUsageSummary());
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ Stress Suite Failed:', error);
    process.exit(1);
  }
}

// Run suite
runStressSuite().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
