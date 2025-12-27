/**
 * Baseline Update Script
 *
 * Updates the performance baseline with current benchmark results.
 * Should only be run after verifying performance changes are intentional.
 */

import { createBaselineFromResults, saveBaseline, getDefaultBaselinePath } from './baseline';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
 * Load benchmark results from the most recent test run
 */
function loadLatestResults(resultsDir: string): BenchmarkResult[] {
  const resultsFilePath = join(resultsDir, 'all-benchmarks.json');

  if (!existsSync(resultsFilePath)) {
    console.warn(`\n⚠️  Results file not found: ${resultsFilePath}`);
    console.warn('   Run "npm run perf:benchmark" first to generate results.\n');
    return [];
  }

  try {
    const content = readFileSync(resultsFilePath, 'utf-8');
    const results = JSON.parse(content);

    if (!Array.isArray(results)) {
      console.warn(`\n⚠️  Results file is not in expected format (expected array)\n`);
      return [];
    }

    return results;
  } catch (error) {
    console.error(`\n❌ Failed to load results: ${error}\n`);
    return [];
  }
}

async function updateBaseline(): Promise<void> {
  console.log('\n📝 Updating Performance Baseline\n');

  const baselinePath = getDefaultBaselinePath();
  const resultsDir = join(__dirname, '../results');

  // Load latest benchmark results
  const results = loadLatestResults(resultsDir);

  if (results.length === 0) {
    console.error('❌ No benchmark results found.');
    console.error('   Run "npm run perf:benchmark" to generate results first.\n');
    process.exit(1);
  }

  const baseline = createBaselineFromResults(results, '0.4.6');

  saveBaseline(baselinePath, baseline);

  console.log('✅ Baseline updated successfully');
  console.log(`   Path: ${baselinePath}`);
  console.log(`   Version: ${baseline.version}`);
  console.log(`   Timestamp: ${baseline.timestamp}`);
  console.log(`   Benchmarks: ${Object.keys(baseline.benchmarks).length}\n`);
}

// Run update
updateBaseline().catch(error => {
  console.error('Baseline update failed:', error);
  process.exit(1);
});
