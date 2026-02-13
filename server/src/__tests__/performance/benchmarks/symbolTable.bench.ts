/**
 * Symbol Table Performance Benchmarks
 *
 * Tests symbol table building and lookup performance.
 * Includes AST building, symbol registration, and scope traversal.
 */

import { Bench } from 'tinybench';
import { Lexer } from '../../../lexer/lexer';
import { Parser } from '../../../parser/parser';
import { SymbolTable } from '../../../symbols/symbolTable';
import { loadFixture, FIXTURES, COMPLEXITY_FIXTURES } from '../utils/fixtures';
import { ConsoleReporter, BenchmarkResult } from '../utils/reporter';
import { takeMemorySnapshot, formatMemorySize } from '../utils/memory';

/**
 * Helper: Build symbol table from content
 */
function buildSymbolTable(content: string): SymbolTable {
  const lexer = new Lexer(content);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const symbolTable = new SymbolTable();
  symbolTable.buildFromAST(ast);
  return symbolTable;
}

/**
 * Helper: Perform symbol lookups
 */
function performLookups(symbolTable: SymbolTable, lookupCount: number): void {
  // Sample symbol names to lookup (case-insensitive)
  const symbolNames = [
    'Customer',
    'SalesOrder',
    'ValidateOrder',
    'CheckCreditLimit',
    'Amount',
    'Status',
    'PostingDate',
    'CreateLedgerEntry',
    'CalculateAmount',
    'ProcessDocument'
  ];

  for (let i = 0; i < lookupCount; i++) {
    const symbolName = symbolNames[i % symbolNames.length];
    symbolTable.getSymbol(symbolName);
  }
}

/**
 * Benchmark symbol table performance
 */
async function benchmarkSymbolTable(): Promise<BenchmarkResult[]> {
  console.log('\n🔖 Symbol Table Performance Benchmarks\n');

  const bench = new Bench({
    warmupTime: 500,
    warmupIterations: 10,
    time: 1000
  });

  // Load fixtures
  const tinyContent = loadFixture(FIXTURES.TINY);
  const smallContent = loadFixture(FIXTURES.SMALL);
  const mediumContent = loadFixture(FIXTURES.MEDIUM);
  const manyProceduresContent = loadFixture(COMPLEXITY_FIXTURES.MANY_PROCEDURES);

  // Pre-build symbol tables for lookup tests
  const smallSymbolTable = buildSymbolTable(smallContent);
  const mediumSymbolTable = buildSymbolTable(mediumContent);

  // Benchmark: Build symbol table from tiny AST (~50 symbols)
  bench.add('SymbolTable: Build from tiny AST (~50 symbols)', () => {
    buildSymbolTable(tinyContent);
  });

  // Benchmark: Build symbol table from small AST (~100 symbols)
  bench.add('SymbolTable: Build from small AST (~100 symbols)', () => {
    buildSymbolTable(smallContent);
  });

  // Benchmark: Build symbol table from medium AST (~200 symbols)
  bench.add('SymbolTable: Build from medium AST (~200 symbols)', () => {
    buildSymbolTable(mediumContent);
  });

  // Benchmark: Build symbol table from many procedures (~500+ symbols)
  bench.add('SymbolTable: Build from many procedures (~500+ symbols)', () => {
    buildSymbolTable(manyProceduresContent);
  });

  // Benchmark: Case-insensitive lookup (100 lookups)
  bench.add('SymbolTable: Case-insensitive lookup (100 lookups)', () => {
    performLookups(smallSymbolTable, 100);
  });

  // Benchmark: Case-insensitive lookup (1000 lookups)
  bench.add('SymbolTable: Case-insensitive lookup (1000 lookups)', () => {
    performLookups(mediumSymbolTable, 1000);
  });

  // Benchmark: Scope traversal with nested scopes
  bench.add('SymbolTable: Scope traversal (deep nesting)', () => {
    const lexer = new Lexer(mediumContent);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    // Get all symbols (traverses all scopes)
    symbolTable.getAllSymbols();
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
    suiteName: 'Symbol Table Benchmarks',
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
  benchmarkSymbolTable().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

export { benchmarkSymbolTable };
