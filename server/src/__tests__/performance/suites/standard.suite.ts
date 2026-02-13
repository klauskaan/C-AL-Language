/**
 * Standard Performance Test Suite
 *
 * Comprehensive benchmarks for CI/CD (~2 minutes).
 * Runs all core benchmarks except stress tests.
 */

import { benchmarkLexer } from '../benchmarks/lexer.bench';
import { benchmarkParser } from '../benchmarks/parser.bench';
import { benchmarkSymbolTable } from '../benchmarks/symbolTable.bench';
import { benchmarkIntegration } from '../benchmarks/integration.bench';
import { benchmarkSemanticTokens } from '../benchmarks/semanticTokens.bench';
import { runMemoryBenchmarks } from '../benchmarks/memory.bench';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { version } from '../../../../../package.json';

interface BenchmarkSummary {
  timestamp: string;
  version: string;
  environment: {
    node: string;
    platform: string;
    arch: string;
  };
  duration: number;
  suites: string[];
}

async function runStandardSuite(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║               Standard Performance Test Suite                      ║');
  console.log('║                                                                    ║');
  console.log('║  Purpose: Comprehensive benchmarks for CI/CD                       ║');
  console.log('║  Duration: ~2 minutes                                              ║');
  console.log('║  Scope: All benchmarks (excluding stress tests)                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();
  const suites: string[] = [];

  try {
    // Collect all benchmark results
    const allResults: any[] = [];

    console.log('\n' + '='.repeat(80));
    console.log('Phase 1/6: Lexer Benchmarks');
    console.log('='.repeat(80));
    const lexerResults = await benchmarkLexer();
    allResults.push(...lexerResults);
    suites.push('lexer');

    console.log('\n' + '='.repeat(80));
    console.log('Phase 2/6: Parser Benchmarks');
    console.log('='.repeat(80));
    const parserResults = await benchmarkParser();
    allResults.push(...parserResults);
    suites.push('parser');

    console.log('\n' + '='.repeat(80));
    console.log('Phase 3/6: Symbol Table Benchmarks');
    console.log('='.repeat(80));
    const symbolTableResults = await benchmarkSymbolTable();
    allResults.push(...symbolTableResults);
    suites.push('symbolTable');

    console.log('\n' + '='.repeat(80));
    console.log('Phase 4/6: Integration Benchmarks');
    console.log('='.repeat(80));
    const integrationResults = await benchmarkIntegration();
    allResults.push(...integrationResults);
    suites.push('integration');

    console.log('\n' + '='.repeat(80));
    console.log('Phase 5/6: Semantic Tokens Benchmarks');
    console.log('='.repeat(80));
    const semanticTokensResults = await benchmarkSemanticTokens();
    allResults.push(...semanticTokensResults);
    suites.push('semanticTokens');

    console.log('\n' + '='.repeat(80));
    console.log('Phase 6/6: Memory Benchmarks');
    console.log('='.repeat(80));
    await runMemoryBenchmarks();
    suites.push('memory');

    const duration = (Date.now() - startTime) / 1000;

    // Write summary
    const summary: BenchmarkSummary = {
      timestamp: new Date().toISOString(),
      version,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      duration,
      suites
    };

    const summaryPath = join(__dirname, '../results/standard-suite-summary.json');
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Write all benchmark results for baseline updates
    const resultsPath = join(__dirname, '../results/all-benchmarks.json');
    writeFileSync(resultsPath, JSON.stringify(allResults, null, 2));

    console.log('\n' + '═'.repeat(80));
    console.log(`✅ Standard Suite Complete - Total Duration: ${duration.toFixed(1)}s`);
    console.log(`📄 Summary written to: ${summaryPath}`);
    console.log(`📄 Results written to: ${resultsPath} (${allResults.length} benchmarks)`);
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ Standard Suite Failed:', error);
    process.exit(1);
  }
}

// Run suite
runStandardSuite().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
