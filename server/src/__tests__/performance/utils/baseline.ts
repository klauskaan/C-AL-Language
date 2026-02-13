/**
 * Baseline Management Utilities
 *
 * Handles loading, saving, and comparing performance baselines.
 * Baselines are stored in JSON format and version-controlled.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { BenchmarkResult as BenchResult } from './reporter';

export interface BaselineEntry {
  meanMs: number;
  stdDevMs: number;
  minMs: number;
  maxMs: number;
  ops: number;
  samples: number;
  memoryMB?: number;
}

export interface BaselineData {
  version: string;
  timestamp: string;
  environment: {
    node: string;
    platform: string;
    cpu: string;
  };
  benchmarks: Record<string, BaselineEntry>;
}

export interface ThresholdConfig {
  warnThreshold: number;   // Warn if X% slower (default: 1.10 = 10% slower)
  failThreshold: number;   // Fail if X% slower (default: 1.20 = 20% slower)
  minSamples: number;      // Minimum samples for statistical significance
}

export interface ComparisonResult {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  currentMs: number;
  baselineMs: number;
  ratio: number;
  percentChange: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  warnThreshold: 1.10,  // 10% slower
  failThreshold: 1.20,  // 20% slower
  minSamples: 50
};

/**
 * Load baseline data from JSON file
 */
export function loadBaseline(baselinePath: string): BaselineData | null {
  if (!existsSync(baselinePath)) {
    return null;
  }

  try {
    const content = readFileSync(baselinePath, 'utf-8');
    return JSON.parse(content) as BaselineData;
  } catch (error) {
    console.error(`Failed to load baseline from ${baselinePath}:`, error);
    return null;
  }
}

/**
 * Save baseline data to JSON file
 */
export function saveBaseline(baselinePath: string, data: BaselineData): void {
  try {
    const content = JSON.stringify(data, null, 2);
    writeFileSync(baselinePath, content, 'utf-8');
  } catch (error) {
    console.error(`Failed to save baseline to ${baselinePath}:`, error);
    throw error;
  }
}

/**
 * Compare current benchmark result against baseline
 */
export function compareToBaseline(
  current: BenchResult,
  baseline: BaselineEntry,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): ComparisonResult {
  const ratio = current.meanMs / baseline.meanMs;
  const percentChange = (ratio - 1) * 100;

  // Check if we have enough samples for statistical significance
  if (current.samples < thresholds.minSamples) {
    return {
      name: current.name,
      status: 'WARN',
      message: `Insufficient samples (${current.samples} < ${thresholds.minSamples})`,
      currentMs: current.meanMs,
      baselineMs: baseline.meanMs,
      ratio,
      percentChange
    };
  }

  // Check against failure threshold
  if (ratio >= thresholds.failThreshold) {
    return {
      name: current.name,
      status: 'FAIL',
      message: `${percentChange.toFixed(1)}% slower (threshold: ${((thresholds.failThreshold - 1) * 100).toFixed(0)}%)`,
      currentMs: current.meanMs,
      baselineMs: baseline.meanMs,
      ratio,
      percentChange
    };
  }

  // Check against warning threshold
  if (ratio >= thresholds.warnThreshold) {
    return {
      name: current.name,
      status: 'WARN',
      message: `${percentChange.toFixed(1)}% slower (warning threshold: ${((thresholds.warnThreshold - 1) * 100).toFixed(0)}%)`,
      currentMs: current.meanMs,
      baselineMs: baseline.meanMs,
      ratio,
      percentChange
    };
  }

  // Performance is acceptable
  return {
    name: current.name,
    status: 'PASS',
    message: `Performance within acceptable range (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%)`,
    currentMs: current.meanMs,
    baselineMs: baseline.meanMs,
    ratio,
    percentChange
  };
}

/**
 * Compare all current results against baseline
 */
export function compareAllToBaseline(
  currentResults: BenchResult[],
  baseline: BaselineData,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): ComparisonResult[] {
  const comparisons: ComparisonResult[] = [];

  for (const result of currentResults) {
    const baselineEntry = baseline.benchmarks[result.name];

    if (!baselineEntry) {
      comparisons.push({
        name: result.name,
        status: 'WARN',
        message: 'No baseline found (new benchmark)',
        currentMs: result.meanMs,
        baselineMs: 0,
        ratio: 0,
        percentChange: 0
      });
      continue;
    }

    comparisons.push(compareToBaseline(result, baselineEntry, thresholds));
  }

  return comparisons;
}

/**
 * Create baseline data from benchmark results
 */
export function createBaselineFromResults(
  results: BenchResult[],
  version: string
): BaselineData {
  const benchmarks: Record<string, BaselineEntry> = {};

  for (const result of results) {
    benchmarks[result.name] = {
      meanMs: result.meanMs,
      stdDevMs: result.stdDevMs,
      minMs: result.minMs,
      maxMs: result.maxMs,
      ops: result.ops,
      samples: result.samples,
      memoryMB: result.memoryMB
    };
  }

  return {
    version,
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      cpu: process.arch
    },
    benchmarks
  };
}

/**
 * Get default baseline path
 */
export function getDefaultBaselinePath(): string {
  return join(__dirname, '../baselines/baselines.json');
}
