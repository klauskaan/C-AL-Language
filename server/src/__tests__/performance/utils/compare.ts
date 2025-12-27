/**
 * Baseline Comparison Script
 *
 * Compares current benchmark results against baseline.
 * Exits with code 1 if any benchmark exceeds failure threshold (20% slower).
 */

import {
  loadBaseline,
  getDefaultBaselinePath,
  compareAllToBaseline,
  DEFAULT_THRESHOLDS,
  BenchResult
} from './baseline';
import { ConsoleReporter, MarkdownReporter } from './reporter';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Load benchmark results from a benchmark output file
 */
function loadBenchmarkResults(resultsDir: string): BenchResult[] {
  const results: BenchResult[] = [];

  // Check for individual benchmark result files
  const benchmarkFiles = [
    'lexer-results.json',
    'parser-results.json',
    'symbolTable-results.json',
    'integration-results.json',
    'memory-results.json'
  ];

  for (const file of benchmarkFiles) {
    const filePath = join(resultsDir, file);
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        if (data.benchmarks && Array.isArray(data.benchmarks)) {
          results.push(...data.benchmarks);
        }
      } catch (error) {
        console.warn(`Warning: Failed to parse ${file}:`, error);
      }
    }
  }

  return results;
}

async function compareToBaseline(): Promise<void> {
  console.log('\n📊 Comparing Performance to Baseline\n');

  const baselinePath = getDefaultBaselinePath();

  // Check if baseline exists
  if (!existsSync(baselinePath)) {
    console.log('⚠️  No baseline found at:', baselinePath);
    console.log('   Run `npm run perf:update-baseline` to create initial baseline');
    console.log('   Skipping comparison (no failure)');
    process.exit(0);
  }

  // Load baseline
  const baseline = loadBaseline(baselinePath);
  if (!baseline) {
    console.error('❌ Failed to load baseline');
    process.exit(1);
  }

  console.log(`📋 Baseline Information:`);
  console.log(`   Version: ${baseline.version}`);
  console.log(`   Date: ${new Date(baseline.timestamp).toLocaleString()}`);
  console.log(`   Environment: ${baseline.environment.node} on ${baseline.environment.platform}`);
  console.log(`   Benchmarks: ${Object.keys(baseline.benchmarks).length}\n`);

  // Load current results
  const resultsDir = join(__dirname, '../results');
  const currentResults = loadBenchmarkResults(resultsDir);

  if (currentResults.length === 0) {
    console.log('⚠️  No current benchmark results found.');
    console.log('   Run `npm run perf:benchmark` first.');
    console.log('   Skipping comparison (no failure)');
    process.exit(0);
  }

  console.log(`📊 Current Results: ${currentResults.length} benchmarks\n`);

  // Compare results
  const comparisons = compareAllToBaseline(currentResults, baseline, DEFAULT_THRESHOLDS);

  // Report results
  const consoleReporter = new ConsoleReporter();
  consoleReporter.reportComparison(comparisons);

  // Generate markdown report for CI
  const markdownReporter = new MarkdownReporter();
  const markdown = markdownReporter.generateComparisonMarkdown(comparisons);
  const markdownPath = join(resultsDir, 'comparison.md');
  writeFileSync(markdownPath, markdown, 'utf-8');
  console.log(`\n📄 Markdown report written to: ${markdownPath}`);

  // Exit with appropriate code
  const failed = comparisons.filter(c => c.status === 'FAIL').length;
  if (failed > 0) {
    console.log(`\n❌ Exiting with code 1 due to ${failed} regression(s)`);
    process.exit(1);
  } else {
    console.log('\n✅ No regressions detected');
    process.exit(0);
  }
}

// Run comparison
compareToBaseline().catch(error => {
  console.error('Comparison failed:', error);
  process.exit(1);
});
