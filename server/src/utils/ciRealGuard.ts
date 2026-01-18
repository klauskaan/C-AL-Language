/**
 * CI Guard for test/REAL/ Content Leak Prevention
 *
 * This utility scans fixtures and snapshots to ensure proprietary NAV object content
 * from test/REAL/ directory is not accidentally committed to the repository.
 *
 * Usage:
 * - Called in CI pipeline to validate commits
 * - Scans test/fixtures/**\/* and **\/__snapshots__/*.snap files
 * - Source code (.ts, .test.ts) files are exempt from scanning
 * - Returns violations as relative paths for easy debugging
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CheckResult {
  passed: boolean;
  violations: string[];
}

/**
 * Check for test/REAL/ path references in fixtures and snapshots
 *
 * @param baseDir Base directory to scan (typically project root or server dir)
 * @returns CheckResult with passed status and list of violations
 */
export function checkForRealPaths(baseDir: string): CheckResult {
  const violations: string[] = [];

  // Scan test/fixtures directory (recursively includes test/fixtures/regression)
  const fixturesPattern = path.join(baseDir, 'test', 'fixtures');
  scanDirectory(fixturesPattern, baseDir, violations);

  // Scan test/regression directory (may contain test files)
  const regressionPattern = path.join(baseDir, 'test', 'regression');
  scanDirectory(regressionPattern, baseDir, violations);

  // Scan ALL snapshot directories recursively under server/src/
  const serverSrcDir = path.join(baseDir, 'server', 'src');
  if (fs.existsSync(serverSrcDir)) {
    findAndScanSnapshotDirectories(serverSrcDir, baseDir, violations);
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

/**
 * Recursively find all __snapshots__ directories and scan them
 */
function findAndScanSnapshotDirectories(dirPath: string, baseDir: string, violations: string[]): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dirPath}:`, error);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '__snapshots__') {
        // Found a snapshots directory - scan it
        scanDirectory(fullPath, baseDir, violations);
      } else if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        // Recurse into subdirectories (skip node_modules and hidden dirs)
        findAndScanSnapshotDirectories(fullPath, baseDir, violations);
      }
    }
  }
}

/**
 * Recursively scan directory for files containing test/REAL/ references
 */
function scanDirectory(dirPath: string, baseDir: string, violations: string[]): void {
  // Handle missing directory gracefully
  if (!fs.existsSync(dirPath)) {
    return;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    // Handle permission errors or other read errors gracefully
    console.warn(`Warning: Could not read directory ${dirPath}:`, error);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      scanDirectory(fullPath, baseDir, violations);
    } else if (entry.isFile()) {
      // Skip TypeScript source files (.ts, .test.ts)
      if (fullPath.endsWith('.ts')) {
        continue;
      }

      // Scan file content
      scanFile(fullPath, baseDir, violations);
    }
  }
}

/**
 * Scan individual file for test/REAL/ references
 */
function scanFile(filePath: string, baseDir: string, violations: string[]): void {
  let content: string;

  try {
    // Try to read as UTF-8 text
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    // Handle binary files or read errors gracefully
    // Binary files will throw encoding errors - skip them
    const relativePath = path.relative(baseDir, filePath);
    console.warn(`Warning: Could not read file ${relativePath}:`, error);
    return;
  }

  // Case-insensitive search for test/REAL/ path (both forward and backslash)
  // Matches: test/REAL/, test\REAL\, TEST/REAL/, test/Real/, etc.
  const realPathPattern = /test[/\\]real[/\\]/i;

  if (realPathPattern.test(content)) {
    // Found violation - add relative path to violations list
    const relativePath = path.relative(baseDir, filePath);
    const normalizedPath = relativePath.replace(/\\/g, '/'); // Normalize to forward slashes

    // Format: "path/to/file.ext: contains test/REAL/ reference"
    violations.push(`${normalizedPath}: contains test/REAL/ reference`);
  }
}

/**
 * CLI entry point
 * Usage: node ciRealGuard.js [baseDir]
 */
export function runCLI(): void {
  const args = process.argv.slice(2);
  const baseDir = args[0] || process.cwd();

  console.log(`Checking for test/REAL/ path references in: ${baseDir}\n`);

  const result = checkForRealPaths(baseDir);

  if (result.passed) {
    console.log('✓ No test/REAL/ references found in fixtures or snapshots');
    process.exit(0);
  } else {
    console.error('✗ Found test/REAL/ references in committed files:\n');
    result.violations.forEach(violation => {
      console.error(`  - ${violation}`);
    });
    console.error('\nError: Proprietary content from test/REAL/ must not be committed.');
    console.error('Please remove these references and use synthetic test data instead.');
    process.exit(1);
  }
}

// Run CLI if invoked directly
if (require.main === module) {
  runCLI();
}
