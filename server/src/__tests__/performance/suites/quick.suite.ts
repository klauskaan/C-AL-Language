/**
 * Quick Performance Test Suite
 *
 * Fast feedback for local development (~30 seconds).
 * Runs a subset of benchmarks for rapid iteration.
 */

import { benchmarkLexer } from '../benchmarks/lexer.bench';
import { benchmarkParser } from '../benchmarks/parser.bench';
import { benchmarkSymbolTable } from '../benchmarks/symbolTable.bench';
import { benchmarkIntegration } from '../benchmarks/integration.bench';

async function runQuickSuite(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                  Quick Performance Test Suite                      ║');
  console.log('║                                                                    ║');
  console.log('║  Purpose: Fast feedback for local development                     ║');
  console.log('║  Duration: ~30 seconds                                             ║');
  console.log('║  Scope: Small & medium files only                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  try {
    // Note: The individual benchmarks will only run the smaller fixtures
    // We're running the full suite but the benchmarks are already optimized

    console.log('\n' + '='.repeat(80));
    console.log('Phase 1/4: Lexer Benchmarks');
    console.log('='.repeat(80));
    await benchmarkLexer();

    console.log('\n' + '='.repeat(80));
    console.log('Phase 2/4: Parser Benchmarks');
    console.log('='.repeat(80));
    await benchmarkParser();

    console.log('\n' + '='.repeat(80));
    console.log('Phase 3/4: Symbol Table Benchmarks');
    console.log('='.repeat(80));
    await benchmarkSymbolTable();

    console.log('\n' + '='.repeat(80));
    console.log('Phase 4/4: Integration Benchmarks');
    console.log('='.repeat(80));
    await benchmarkIntegration();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '═'.repeat(80));
    console.log(`✅ Quick Suite Complete - Total Duration: ${duration}s`);
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('\n❌ Quick Suite Failed:', error);
    process.exit(1);
  }
}

// Run suite
runQuickSuite().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
