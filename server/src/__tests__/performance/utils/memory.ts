/**
 * Memory Profiling Utilities
 *
 * Provides utilities for measuring memory usage during benchmark operations.
 * Uses Node.js process.memoryUsage() and optional v8-profiler-next for heap dumps.
 */

export interface MemorySnapshot {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  arrayBuffersMB: number;
  timestamp: number;
}

export interface MemoryDelta {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  arrayBuffersMB: number;
}

/**
 * Result of a memory benchmark operation
 *
 * This is the canonical definition. Do not duplicate this interface in other files.
 * Import it from this module instead: import { MemoryBenchmarkResult } from '../utils/memory'
 */
export interface MemoryBenchmarkResult {
  name: string;
  meanMB: number;
  stdDevMB: number;
  minMB: number;
  maxMB: number;
  samples: number;
}

/**
 * Take a memory snapshot
 */
export function takeMemorySnapshot(): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    heapUsedMB: usage.heapUsed / 1024 / 1024,
    heapTotalMB: usage.heapTotal / 1024 / 1024,
    externalMB: usage.external / 1024 / 1024,
    arrayBuffersMB: usage.arrayBuffers / 1024 / 1024,
    timestamp: Date.now()
  };
}

/**
 * Calculate delta between two memory snapshots
 */
export function calculateMemoryDelta(
  before: MemorySnapshot,
  after: MemorySnapshot
): MemoryDelta {
  return {
    heapUsedMB: after.heapUsedMB - before.heapUsedMB,
    heapTotalMB: after.heapTotalMB - before.heapTotalMB,
    externalMB: after.externalMB - before.externalMB,
    arrayBuffersMB: after.arrayBuffersMB - before.arrayBuffersMB
  };
}

/**
 * Measure memory usage of a function execution
 */
export function measureMemory<T>(fn: () => T): { result: T; memoryDelta: MemoryDelta } {
  // Force garbage collection if available (requires --expose-gc flag)
  if (global.gc) {
    global.gc();
  }

  const before = takeMemorySnapshot();
  const result = fn();
  const after = takeMemorySnapshot();

  return {
    result,
    memoryDelta: calculateMemoryDelta(before, after)
  };
}

/**
 * Run a memory benchmark with multiple iterations
 */
export async function benchmarkMemory(
  name: string,
  fn: () => void,
  iterations: number = 100
): Promise<MemoryBenchmarkResult> {
  const samples: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Force garbage collection before each measurement
    if (global.gc) {
      global.gc();
    }

    // Small delay to let GC settle
    await new Promise(resolve => setTimeout(resolve, 10));

    const before = process.memoryUsage().heapUsed;
    fn();
    const after = process.memoryUsage().heapUsed;

    const deltaMB = (after - before) / 1024 / 1024;
    samples.push(deltaMB);
  }

  // Calculate statistics
  const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
  const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...samples);
  const max = Math.max(...samples);

  return {
    name,
    meanMB: mean,
    stdDevMB: stdDev,
    minMB: min,
    maxMB: max,
    samples: samples.length
  };
}

/**
 * Format memory size in human-readable format
 */
export function formatMemorySize(mb: number): string {
  if (mb < 1) {
    return `${(mb * 1024).toFixed(2)} KB`;
  } else if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  } else {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
}

/**
 * Check if garbage collection is available
 */
export function isGCAvailable(): boolean {
  return typeof global.gc === 'function';
}

/**
 * Print warning if GC is not available
 */
export function warnIfGCUnavailable(): void {
  if (!isGCAvailable()) {
    console.warn(
      'Warning: Garbage collection is not available. ' +
      'Memory measurements may be inaccurate. ' +
      'Run with NODE_OPTIONS="--expose-gc" for more accurate results.'
    );
  }
}

/**
 * Get current memory usage summary
 */
export function getMemoryUsageSummary(): string {
  const snapshot = takeMemorySnapshot();
  return [
    `Heap Used: ${formatMemorySize(snapshot.heapUsedMB)}`,
    `Heap Total: ${formatMemorySize(snapshot.heapTotalMB)}`,
    `External: ${formatMemorySize(snapshot.externalMB)}`,
    `Array Buffers: ${formatMemorySize(snapshot.arrayBuffersMB)}`
  ].join(' | ');
}
