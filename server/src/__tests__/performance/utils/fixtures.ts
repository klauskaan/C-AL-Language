/**
 * Fixture Loading Utilities
 *
 * Handles loading synthetic performance test fixtures and regression fixtures.
 *
 * IMPORTANT: This utility NEVER references files from /test/REAL/ directory
 * as those contain copyrighted material and must not be used in committed code.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Cache for loaded fixtures to avoid repeated file reads
 */
const fixtureCache = new Map<string, string>();

/**
 * Get the base path for performance fixtures
 */
export function getPerformanceFixturesPath(): string {
  return join(__dirname, '../fixtures');
}

/**
 * Get the base path for regression fixtures (committed, safe to use)
 */
export function getRegressionFixturesPath(): string {
  // Use process.cwd() for ts-node compatibility
  return join(process.cwd(), '../test/fixtures/regression');
}

/**
 * Load a synthetic performance fixture
 */
export function loadFixture(name: string): string {
  // Check cache first
  if (fixtureCache.has(name)) {
    return fixtureCache.get(name)!;
  }

  const fixturePath = join(getPerformanceFixturesPath(), name);

  try {
    const content = readFileSync(fixturePath, 'utf-8');
    fixtureCache.set(name, content);
    return content;
  } catch (error) {
    throw new Error(`Failed to load fixture "${name}" from ${fixturePath}: ${error}`);
  }
}

/**
 * Load a regression fixture (safe, committed fixtures)
 */
export function loadRegressionFixture(name: string): string {
  // Check cache first
  const cacheKey = `regression:${name}`;
  if (fixtureCache.has(cacheKey)) {
    return fixtureCache.get(cacheKey)!;
  }

  const fixturePath = join(getRegressionFixturesPath(), name);

  try {
    const content = readFileSync(fixturePath, 'utf-8');
    fixtureCache.set(cacheKey, content);
    return content;
  } catch (error) {
    throw new Error(`Failed to load regression fixture "${name}" from ${fixturePath}: ${error}`);
  }
}

/**
 * Load all regression fixtures
 */
export function loadAllRegressionFixtures(): Map<string, string> {
  const fixtures = new Map<string, string>();
  const fixturesPath = getRegressionFixturesPath();

  try {
    const files = readdirSync(fixturesPath).filter(f => f.endsWith('.cal'));

    for (const file of files) {
      const content = loadRegressionFixture(file);
      fixtures.set(file, content);
    }

    return fixtures;
  } catch (error) {
    console.error(`Failed to load regression fixtures: ${error}`);
    return fixtures;
  }
}

/**
 * List available performance fixtures
 */
export function listPerformanceFixtures(): string[] {
  try {
    const fixturesPath = getPerformanceFixturesPath();
    return readdirSync(fixturesPath).filter(f => f.endsWith('.cal'));
  } catch (error) {
    return [];
  }
}

/**
 * List available regression fixtures
 */
export function listRegressionFixtures(): string[] {
  try {
    const fixturesPath = getRegressionFixturesPath();
    return readdirSync(fixturesPath).filter(f => f.endsWith('.cal'));
  } catch (error) {
    return [];
  }
}

/**
 * Clear the fixture cache
 */
export function clearFixtureCache(): void {
  fixtureCache.clear();
}

/**
 * Get cache statistics
 */
export function getFixtureCacheStats(): { size: number; keys: string[] } {
  return {
    size: fixtureCache.size,
    keys: Array.from(fixtureCache.keys())
  };
}

/**
 * Size-based fixture names (for easy reference in benchmarks)
 */
export const FIXTURES = {
  TINY: 'tiny.cal',
  SMALL: 'small.cal',
  MEDIUM: 'medium.cal',
  LARGE: 'large.cal',
  XLARGE: 'xlarge.cal',
  XXLARGE: 'xxlarge.cal',
  HUGE: 'huge.cal',        // ~5000 lines - Generated programmatically
  ENORMOUS: 'enormous.cal'  // ~10000 lines - Generated programmatically
} as const;

/**
 * Complexity-based fixture names
 */
export const COMPLEXITY_FIXTURES = {
  DEEP_NESTING: 'deep-nesting.cal',
  MANY_PROCEDURES: 'many-procedures.cal',
  LARGE_TABLE: 'large-table.cal',
  COMPLEX_EXPRESSIONS: 'complex-expressions.cal',
  EDGE_CASES: 'edge-cases.cal',
  BAD_PRACTICES: 'bad-practices.cal',
  MULTILINGUAL: 'multilingual.cal',
  REAL_WORLD_BUSINESS_LOGIC: 'real-world-business-logic.cal'
} as const;
