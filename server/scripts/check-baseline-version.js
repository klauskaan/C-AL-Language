#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Check baseline version freshness (compare baseline version with package.json)
 *
 * @param {string} repoRoot - Repository root directory
 * @param {string} format - Output format: 'stderr' or 'github-actions'
 * @returns {{ output: string, stream: string } | null} - Output object or null if versions match
 */
function checkBaselineVersion(repoRoot, format = 'stderr') {
  try {
    // Resolve paths from repo root
    const baselinePath = path.join(repoRoot, 'server/src/__tests__/performance/baselines/baselines.json');
    const packagePath = path.join(repoRoot, 'package.json');

    // Check if baseline file exists (exit silently if not)
    if (!fs.existsSync(baselinePath)) {
      return null;
    }

    // Read and parse files
    let packageVersion, baselineVersion;

    try {
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      packageVersion = packageData.version;
    } catch (e) {
      return null; // Exit silently on read/parse errors
    }

    try {
      const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      baselineVersion = baselineData.version;
    } catch (e) {
      return null; // Exit silently on read/parse errors
    }

    // Validate versions are non-empty strings
    if (!packageVersion || typeof packageVersion !== 'string' ||
        !baselineVersion || typeof baselineVersion !== 'string') {
      return null;
    }

    // Compare versions
    if (packageVersion === baselineVersion) {
      return null; // Versions match, no output
    }

    // Versions mismatch - format output
    if (format === 'github-actions') {
      return {
        output: formatGithubActions(packageVersion, baselineVersion),
        stream: 'stdout'
      };
    } else {
      return {
        output: formatStderr(packageVersion, baselineVersion),
        stream: 'stderr'
      };
    }
  } catch (error) {
    // Catch-all: exit silently on any unexpected error
    return null;
  }
}

/**
 * Format mismatch warning for stderr (pre-commit hook format)
 */
function formatStderr(packageVersion, baselineVersion) {
  return `WARNING: Performance baseline version mismatch

  package.json version: ${packageVersion}
  baseline version:     ${baselineVersion}

The baseline may be stale. To update:
  cd server
  npm run perf:benchmark && npm run perf:update-baseline
`;
}

/**
 * Format mismatch warning for GitHub Actions
 */
function formatGithubActions(packageVersion, baselineVersion) {
  return `::warning::Performance baseline version mismatch: package.json=${packageVersion}, baseline=${baselineVersion}. Baseline may be stale.`;
}

// CLI entry point
if (require.main === module) {
  try {
    // Parse --format= from argv
    let format = 'stderr';
    for (const arg of process.argv.slice(2)) {
      if (arg.startsWith('--format=')) {
        format = arg.split('=')[1];
      }
    }

    const result = checkBaselineVersion(process.cwd(), format);

    if (result) {
      if (result.stream === 'stderr') {
        process.stderr.write(result.output);
      } else {
        process.stdout.write(result.output);
      }
    }

    // Always exit 0 (non-blocking)
    process.exit(0);
  } catch (error) {
    // Exit silently on any error
    process.exit(0);
  }
}

module.exports = { checkBaselineVersion, formatStderr, formatGithubActions };
