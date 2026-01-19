/**
 * Lexer Health Report Script
 *
 * Validates lexer health across all files in test/REAL:
 * - Token position validation
 * - Clean exit validation
 * - Performance metrics
 * - Outlier detection
 *
 * Exit codes: See CI_EXIT_CODES constant for values and meanings.
 */

import { performance } from 'perf_hooks';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Lexer, CleanExitResult } from '../src/lexer/lexer';
import { validateTokenPositions, ValidationResult } from '../src/validation/positionValidator';
import { readFileWithEncoding } from '../src/utils/encoding';
import { hasTxtExtension } from '../src/utils/fileExtensions';
import { escapeMarkdown } from '../src/utils/escapeMarkdown';

/**
 * Exit codes for CI/CLI operations.
 * Used by process.exit() to communicate status to calling process.
 */
export const CI_EXIT_CODES = {
  /** All validations passed or check was skipped */
  PASS: 0,
  /** Regression detected (failures exceeded baseline) */
  REGRESSION: 1,
  /** Configuration error (missing files, invalid baseline, etc.) */
  CONFIG_ERROR: 2
} as const;

// Exported for testing only
export interface FileResult {
  file: string;
  lines: number;
  tokenCount: number;
  tokenizeTime: number;
  positionValidation: ValidationResult;
  cleanExit: CleanExitResult;
}

/**
 * Result of comparing actual failures to baseline threshold.
 *
 * The comparison follows a "ratchet pattern" - failures can only decrease over time,
 * never increase. This ensures the lexer health improves or stays constant.
 */
export interface ComparisonResult {
  /** Whether the check passed (failures <= baseline) */
  passed: boolean;
  /** Actual number of failures detected */
  actualFailures: number;
  /** Baseline maximum allowed failures */
  baselineMax: number;
  /** Improvement from baseline (positive = fewer failures, negative = regression) */
  improvement: number;
  /** Whether baseline file should be updated (improvement detected) */
  requiresBaselineUpdate: boolean;
  /** Human-readable message describing the result */
  message: string;
}

/**
 * Result of running CI check.
 */
export interface CIResult {
  /** Exit code for process.exit() - see CI_EXIT_CODES */
  exitCode: number;
  /** Whether the check was skipped (e.g., test/REAL not found) */
  skipped: boolean;
  /** Reason for skip (if skipped=true) */
  skipReason?: string;
  /** Comparison result (if not skipped) */
  comparison: ComparisonResult | null;
}

/**
 * Result of validating a directory for report generation.
 *
 * This is a discriminated union - check `status` field to determine
 * which optional fields are present:
 * - status === 'valid' → files array is defined
 * - status === 'read_error' → errorDetails object is defined
 * - status === 'not_found' | 'empty' → only status field is defined
 *
 * Returns structured result instead of calling process.exit(),
 * enabling testability. Used by validateDirectoryForReport().
 */
export interface DirectoryValidationResult {
  /** Status of directory validation */
  status: 'valid' | 'not_found' | 'read_error' | 'empty';
  /** List of .TXT files found (only present when status === 'valid') */
  files?: string[];
  /** Error details (only present when status === 'read_error') */
  errorDetails?: {
    /** Human-readable error message */
    message: string;
    /** Error code if available (e.g., 'EACCES', 'ENOENT') */
    code?: string;
  };
}

/**
 * Calculate percentile value from array of numbers using R-7 linear interpolation.
 * This implementation matches Excel's PERCENTILE.INC and NumPy's default percentile method.
 * Guards against empty arrays and filters non-finite values (NaN, Infinity, -Infinity).
 *
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate (0-100)
 * @returns Percentile value, or 0 if array is empty after filtering
 * @throws Error if percentile is outside the range [0, 100]
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (percentile < 0 || percentile > 100) {
    throw new Error(`Percentile must be between 0 and 100, got ${percentile}`);
  }

  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return 0;

  const sorted = [...finiteValues].sort((a, b) => a - b);
  const position = (percentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const fraction = position - lowerIndex;
  return sorted[lowerIndex] + fraction * (sorted[upperIndex] - sorted[lowerIndex]);
}

/**
 * Detect if filename represents a Report object.
 * Used to enable RDLDATA underflow allowance in clean exit validation.
 *
 * @param filename - Filename to check (e.g., "REP50000.TXT")
 * @returns true if filename starts with "REP" (case-insensitive)
 */
export function isReportFile(filename: string): boolean {
  const upper = filename.toUpperCase();
  return upper.startsWith('REP') && !upper.startsWith('REPORT');
}

/**
 * Format duration in seconds to human-readable string.
 * Handles hours, minutes, seconds with appropriate precision.
 *
 * @param seconds - Duration in seconds (may be fractional)
 * @returns Formatted string like "1h 5m", "2m 15s", "45s", or "--" for invalid input
 */
export function formatDuration(seconds: number): string {
  // Guard against invalid input
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '--';
  }

  const totalSeconds = Math.round(seconds);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    // Show hours and minutes only (seconds too noisy at this scale)
    return `${hours}h ${minutes}m`;
  }

  // Show minutes and seconds
  return `${minutes}m ${secs}s`;
}

/**
 * Validate directory for report generation.
 *
 * Checks that the directory exists, is readable, and contains .TXT files.
 * Returns structured result instead of calling process.exit(), enabling testability.
 *
 * This function is used by:
 * - runCICheck() for CI mode validation
 * - validateAllFiles() for standard mode validation
 * - Main block for report generation
 *
 * @param dirPath - Absolute path to directory to validate
 * @returns Validation result with status and file list or error details
 */
export function validateDirectoryForReport(dirPath: string): DirectoryValidationResult {
  // Check if directory exists
  if (!existsSync(dirPath)) {
    return {
      status: 'not_found'
    };
  }

  // Try to read directory
  let allFiles: string[];
  try {
    allFiles = readdirSync(dirPath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof Error && 'code' in error
      ? (error as NodeJS.ErrnoException).code
      : undefined;

    return {
      status: 'read_error',
      errorDetails: {
        message: errorMessage,
        code: errorCode
      }
    };
  }

  // Filter for .TXT files
  const txtFiles = allFiles.filter(hasTxtExtension).sort();

  // Check if any .TXT files found
  if (txtFiles.length === 0) {
    return {
      status: 'empty'
    };
  }

  // Success - return file list
  return {
    status: 'valid',
    files: txtFiles
  };
}

/**
 * Calculate estimated time remaining based on current progress.
 * Returns null when ETA cannot be reliably calculated.
 *
 * @param processedCount - Number of items processed so far
 * @param totalCount - Total number of items to process
 * @param elapsedMs - Elapsed time in milliseconds
 * @returns Estimated remaining time in seconds, or null if unreliable
 */
export function calculateETA(
  processedCount: number,
  totalCount: number,
  elapsedMs: number
): number | null {
  // Guard: Cannot calculate with zero or negative values
  if (processedCount <= 0 || totalCount <= 0 || elapsedMs <= 0) {
    return null;
  }

  // Guard: Reject non-finite inputs (Infinity, NaN)
  if (!Number.isFinite(processedCount) || !Number.isFinite(totalCount) || !Number.isFinite(elapsedMs)) {
    return null;
  }

  // Guard: Don't show ETA until we have stable sample (100+ files)
  // Early files include JIT warmup and filesystem cache effects
  if (processedCount < 100) {
    return null;
  }

  // Guard: Already complete
  if (processedCount >= totalCount) {
    return 0;
  }

  const remainingCount = totalCount - processedCount;
  const msPerItem = elapsedMs / processedCount;
  const remainingMs = remainingCount * msPerItem;

  // Guard: Check for overflow/Infinity before converting to seconds
  if (!Number.isFinite(remainingMs)) {
    return null;
  }

  // Convert to seconds and round to integer
  const remainingSeconds = Math.round(remainingMs / 1000);

  // Guard: Result should be finite and reasonable
  // Also reject unreasonably large ETAs (> 1 year = 31536000 seconds)
  // These indicate edge case math rather than realistic estimates
  if (!Number.isFinite(remainingSeconds) || remainingSeconds < 0 || remainingSeconds > 31536000) {
    return null;
  }

  return remainingSeconds;
}

/**
 * Compare actual failure count to baseline threshold.
 *
 * Implements "ratchet pattern" - failures can equal or be below baseline (pass),
 * but any increase is a regression (fail).
 *
 * @param actualFailures - Number of files that failed validation
 * @param baselineMax - Maximum allowed failures from baseline
 * @returns Comparison result with pass/fail status and metadata
 */
export function compareToBaseline(actualFailures: number, baselineMax: number): ComparisonResult {
  const improvement = baselineMax - actualFailures;
  const passed = actualFailures <= baselineMax;
  const requiresBaselineUpdate = improvement > 0;

  let message: string;

  if (actualFailures === baselineMax) {
    const failureWord = actualFailures === 1 ? 'failure' : 'failures';
    message = `Lexer health matches baseline (${actualFailures} ${failureWord})`;
  } else if (improvement > 0) {
    const improvementWord = improvement === 1 ? 'failure' : 'failures';
    message = `Lexer health improvement detected: ${improvement} fewer ${improvementWord} (actual: ${actualFailures}, baseline: ${baselineMax})`;
  } else {
    const regressionCount = Math.abs(improvement);
    const regressionWord = regressionCount === 1 ? 'failure' : 'failures';
    message = `Lexer health regression: ${regressionCount} additional ${regressionWord} (actual: ${actualFailures}, baseline: ${baselineMax})`;
  }

  return {
    passed,
    actualFailures,
    baselineMax,
    improvement,
    requiresBaselineUpdate,
    message
  };
}

/**
 * Run CI check mode: validate files and compare to baseline.
 *
 * Exit codes: Uses CI_EXIT_CODES (PASS=0, REGRESSION=1, CONFIG_ERROR=2).
 *
 * @returns CI result with exit code and comparison details
 */
export function runCICheck(): CIResult {
  const realDir = join(__dirname, '../../test/REAL');

  // Validate directory using shared validation function
  const dirValidation = validateDirectoryForReport(realDir);

  // Handle validation result
  if (dirValidation.status === 'not_found') {
    return {
      exitCode: CI_EXIT_CODES.PASS,
      skipped: true,
      skipReason: 'test/REAL directory not found - skipping lexer health check',
      comparison: null
    };
  }

  if (dirValidation.status === 'read_error') {
    return {
      exitCode: CI_EXIT_CODES.CONFIG_ERROR,
      skipped: false,
      skipReason: undefined,
      comparison: {
        passed: false,
        actualFailures: 0,
        baselineMax: 0,
        improvement: 0,
        requiresBaselineUpdate: false,
        message: `Configuration error: cannot read test/REAL directory - ${dirValidation.errorDetails?.message ?? 'unknown error'}`
      }
    };
  }

  if (dirValidation.status === 'empty') {
    return {
      exitCode: CI_EXIT_CODES.CONFIG_ERROR,
      skipped: false,
      skipReason: undefined,
      comparison: {
        passed: false,
        actualFailures: 0,
        baselineMax: 0,
        improvement: 0,
        requiresBaselineUpdate: false,
        message: 'Configuration error: test/REAL directory exists but contains no .TXT files'
      }
    };
  }

  // dirValidation.status === 'valid', files will be validated in validateAllFiles()

  // Load baseline
  const baselinePath = join(__dirname, 'lexer-health-baseline.json');

  let baselineMax: number;
  try {
    if (!existsSync(baselinePath)) {
      return {
        exitCode: CI_EXIT_CODES.CONFIG_ERROR,
        skipped: false,
        skipReason: undefined,
        comparison: {
          passed: false,
          actualFailures: 0,
          baselineMax: 0,
          improvement: 0,
          requiresBaselineUpdate: false,
          message: 'Configuration error: baseline file not found at ' + baselinePath
        }
      };
    }

    const baselineContent = readFileSync(baselinePath, 'utf-8');
    const baseline = JSON.parse(baselineContent);

    if (typeof baseline.maxFailures !== 'number') {
      return {
        exitCode: CI_EXIT_CODES.CONFIG_ERROR,
        skipped: false,
        skipReason: undefined,
        comparison: {
          passed: false,
          actualFailures: 0,
          baselineMax: 0,
          improvement: 0,
          requiresBaselineUpdate: false,
          message: 'Configuration error: baseline file missing valid maxFailures property (must be a number)'
        }
      };
    }

    baselineMax = baseline.maxFailures;
  } catch (error) {
    return {
      exitCode: CI_EXIT_CODES.CONFIG_ERROR,
      skipped: false,
      skipReason: undefined,
      comparison: {
        passed: false,
        actualFailures: 0,
        baselineMax: 0,
        improvement: 0,
        requiresBaselineUpdate: false,
        message: `Configuration error: failed to parse baseline file - ${error instanceof Error ? error.message : String(error)}`
      }
    };
  }

  // Run validation
  // Use exports.validateAllFiles to allow test mocking via jest.spyOn
  const results = exports.validateAllFiles();

  // Count failures
  const actualFailures = results.filter((r: FileResult) =>
    !r.positionValidation.isValid || !r.cleanExit.passed
  ).length;

  // Compare to baseline
  const comparison = compareToBaseline(actualFailures, baselineMax);

  return {
    exitCode: comparison.passed ? CI_EXIT_CODES.PASS : CI_EXIT_CODES.REGRESSION,
    skipped: false,
    skipReason: undefined,
    comparison
  };
}

export function validateAllFiles(): FileResult[] {
  const realDir = join(__dirname, '../../test/REAL');

  // Validate directory
  const dirValidation = validateDirectoryForReport(realDir);

  // Handle validation errors - preserve existing behavior of calling process.exit()
  if (dirValidation.status === 'not_found') {
    console.error('Error: test/REAL directory does not exist');
    console.error('This script requires proprietary NAV object files.');
    console.error('See README for more information.');
    process.exit(CI_EXIT_CODES.CONFIG_ERROR);
  }

  if (dirValidation.status === 'read_error') {
    console.error(`Error: cannot read test/REAL directory - ${dirValidation.errorDetails?.message ?? 'unknown error'}`);
    process.exit(CI_EXIT_CODES.CONFIG_ERROR);
  }

  if (dirValidation.status === 'empty') {
    console.warn('No .TXT files found in test/REAL');
    return [];  // Let caller handle the empty result
  }

  // Get files from validation result
  const files = dirValidation.files;
  if (!files) {
    throw new Error('Internal error: valid status but no files array');
  }

  console.log(`Found ${files.length} files to validate\n`);
  const results: FileResult[] = [];
  const scanStartTime = performance.now();

  for (const file of files) {
    const filePath = join(realDir, file);

    try {
      const { content } = readFileWithEncoding(filePath);
      const lineCount = content.split('\n').length;

      // Time tokenization with high-precision timer
      const startTime = performance.now();
      const lexer = new Lexer(content);
      const tokens = lexer.tokenize();
      const tokenizeTime = performance.now() - startTime;

      // Validate token positions
      const positionValidation = validateTokenPositions(content, tokens);

      // Validate clean exit with RDLDATA allowance for Report files
      const cleanExit = lexer.isCleanExit({
        allowRdldataUnderflow: isReportFile(file)
      });

      results.push({
        file,
        lines: lineCount,
        tokenCount: tokens.length,
        tokenizeTime,
        positionValidation,
        cleanExit
      });
    } catch (error) {
      // Record file read failure as an error result
      results.push({
        file,
        lines: 0,
        tokenCount: 0,
        tokenizeTime: 0,
        positionValidation: {
          isValid: false,
          errors: [`Failed to read file: ${error instanceof Error ? error.message : String(error)}`],
          warnings: []
        },
        cleanExit: {
          passed: false,
          violations: [],
          categories: new Set()
        }
      });
      // Continue processing other files
      continue;
    }

    // Progress indicator every 100 files
    if (results.length > 0 && results.length % 100 === 0) {
      const failedCount = results.filter(r =>
        !r.positionValidation.isValid || !r.cleanExit.passed
      ).length;

      const elapsedMs = performance.now() - scanStartTime;
      const elapsedStr = formatDuration(elapsedMs / 1000);

      const eta = calculateETA(results.length, files.length, elapsedMs);
      const etaStr = eta !== null ? formatDuration(eta) : 'Calculating...';

      console.log(
        `Processed ${results.length}/${files.length} files ` +
        `(${failedCount} with failures) - ` +
        `Elapsed: ${elapsedStr}, ETA: ${etaStr}`
      );
    }
  }

  return results;
}

export function generateMarkdownReport(results: FileResult[]): string {
  const filesWithPositionErrors = results.filter(r => !r.positionValidation.isValid);
  const filesWithExitErrors = results.filter(r => !r.cleanExit.passed);
  const filesWithAnyError = results.filter(r =>
    !r.positionValidation.isValid || !r.cleanExit.passed
  );

  const totalLines = results.reduce((sum, r) => sum + r.lines, 0);
  const totalTokens = results.reduce((sum, r) => sum + r.tokenCount, 0);

  // Guard against division by zero
  const successRate = results.length > 0
    ? ((1 - filesWithAnyError.length / results.length) * 100).toFixed(2)
    : '0.00';

  // Performance metrics
  const tokenizeTimes = results.map(r => r.tokenizeTime);
  const p50 = calculatePercentile(tokenizeTimes, 50);
  const p95 = calculatePercentile(tokenizeTimes, 95);
  const p99 = calculatePercentile(tokenizeTimes, 99);

  // Outliers: files >2x p95 (strict greater-than)
  const outlierThreshold = p95 * 2;
  const outliers = results.filter(r => r.tokenizeTime > outlierThreshold);

  let md = '# Lexer Health Report\n\n';
  md += `> **WARNING:** This report is generated from proprietary NAV objects in test/REAL/.\n`;
  md += `> Do not copy file names, object IDs 6000000+, or code fragments to public repositories.\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Handle empty results - don't show misleading "all passed" message
  if (results.length === 0) {
    md += '⚠️ **No files to validate**\n';
    return md;
  }

  // Summary section
  md += '## Summary\n\n';
  md += `- **Total files:** ${results.length.toLocaleString()}\n`;
  md += `- **Total lines:** ${totalLines.toLocaleString()}\n`;
  md += `- **Total tokens:** ${totalTokens.toLocaleString()}\n`;
  md += `- **Files with position errors:** ${filesWithPositionErrors.length.toLocaleString()}\n`;
  md += `- **Files with clean exit errors:** ${filesWithExitErrors.length.toLocaleString()}\n`;
  md += `- **Success rate:** ${successRate}%\n\n`;

  // Performance section
  md += '## Performance Metrics\n\n';
  md += `- **p50 (median):** ${p50.toFixed(2)}ms\n`;
  md += `- **p95:** ${p95.toFixed(2)}ms\n`;
  md += `- **p99:** ${p99.toFixed(2)}ms\n\n`;

  if (outliers.length > 0) {
    md += `### Performance Outliers (>${outlierThreshold.toFixed(2)}ms)\n\n`;
    md += `Found ${outliers.length} file(s) with tokenization time >2x p95:\n\n`;
    md += '| File | Lines | Time (ms) | Tokens |\n';
    md += '|------|-------|-----------|--------|\n';
    outliers
      .sort((a, b) => b.tokenizeTime - a.tokenizeTime)
      .forEach(r => {
        md += `| ${escapeMarkdown(r.file)} | ${r.lines.toLocaleString()} | ${r.tokenizeTime.toFixed(2)} | ${r.tokenCount.toLocaleString()} |\n`;
      });
    md += '\n';
  }

  if (filesWithAnyError.length === 0) {
    md += '## Status\n\n';
    md += '✅ **All files passed validation!**\n';
    return md;
  }

  // Failures section
  md += '## Failures\n\n';
  md += `Total files with failures: ${filesWithAnyError.length}\n\n`;

  if (filesWithPositionErrors.length > 0) {
    md += `### Position Validation Failures (${filesWithPositionErrors.length})\n\n`;
    filesWithPositionErrors.forEach(r => {
      md += `#### ${escapeMarkdown(r.file)}\n\n`;
      md += `**Lines:** ${r.lines.toLocaleString()} | **Tokens:** ${r.tokenCount.toLocaleString()} | **Time:** ${r.tokenizeTime.toFixed(2)}ms\n\n`;

      if (r.positionValidation.errors.length > 0) {
        md += '**Errors:**\n';
        r.positionValidation.errors.forEach(err => {
          md += `- ${escapeMarkdown(err)}\n`;
        });
        md += '\n';
      }

      if (r.positionValidation.warnings.length > 0) {
        md += '**Warnings:**\n';
        r.positionValidation.warnings.forEach(warn => {
          md += `- ${escapeMarkdown(warn)}\n`;
        });
        md += '\n';
      }
    });
  }

  if (filesWithExitErrors.length > 0) {
    md += `### Clean Exit Failures (${filesWithExitErrors.length})\n\n`;
    filesWithExitErrors.forEach(r => {
      md += `#### ${escapeMarkdown(r.file)}\n\n`;
      md += `**Lines:** ${r.lines.toLocaleString()} | **Tokens:** ${r.tokenCount.toLocaleString()} | **Time:** ${r.tokenizeTime.toFixed(2)}ms\n\n`;

      md += '**Violations:**\n';
      r.cleanExit.violations.forEach(v => {
        md += `- **${escapeMarkdown(v.category)}:** ${escapeMarkdown(v.message)}\n`;
        md += `  - Expected: ${escapeMarkdown(JSON.stringify(v.expected))}\n`;
        md += `  - Actual: ${escapeMarkdown(JSON.stringify(v.actual))}\n`;
      });
      md += '\n';
    });
  }

  return md;
}

// Main execution (only when run directly, not imported or in tests)
if (require.main === module && !process.env.JEST_WORKER_ID) {
  const args = process.argv.slice(2);
  const ciMode = args.includes('--ci');

  if (ciMode) {
    // CI mode: compare to baseline, emit GitHub Actions annotations
    console.log('Lexer Health Check - CI Mode\n');

    const result = runCICheck();

    if (result.skipped) {
      // Emit warning annotation for visibility in GitHub Actions
      console.log('::warning::' + result.skipReason);
      console.log('\n' + result.skipReason);
      process.exit(result.exitCode);
    }

    if (!result.comparison) {
      console.error('Internal error: comparison is null but not skipped');
      process.exit(CI_EXIT_CODES.CONFIG_ERROR);
    }

    // Display result
    console.log(result.comparison.message);

    if (result.comparison.requiresBaselineUpdate) {
      console.log('\n⚠️  Baseline update recommended:');
      console.log(`   Update maxFailures from ${result.comparison.baselineMax} to ${result.comparison.actualFailures}`);
      console.log('   in server/scripts/lexer-health-baseline.json');
    }

    if (!result.comparison.passed) {
      // Emit error annotation for visibility in GitHub Actions
      console.log('::error::Lexer health regression detected');
    }

    process.exit(result.exitCode);
  }

  // Standard report mode
  console.log('Lexer Health Report Tool\n');
  console.log('Scanning test/REAL directory...\n');

  // Validate directory before processing
  const realDir = join(__dirname, '../../test/REAL');
  const dirValidation = validateDirectoryForReport(realDir);

  if (dirValidation.status !== 'valid') {
    // Map status to appropriate error message
    let errorMsg: string;
    if (dirValidation.status === 'not_found') {
      errorMsg = 'test/REAL directory does not exist';
    } else if (dirValidation.status === 'read_error') {
      errorMsg = `cannot read test/REAL directory - ${dirValidation.errorDetails?.message ?? 'unknown error'}`;
    } else {  // empty
      errorMsg = 'No .TXT files found in test/REAL directory';
    }

    console.error(`Error: ${errorMsg}`);
    process.exit(CI_EXIT_CODES.CONFIG_ERROR);
  }

  const startTime = performance.now();
  const results = validateAllFiles();
  const totalTime = performance.now() - startTime;

  console.log(`\nValidation complete in ${(totalTime / 1000).toFixed(2)}s`);
  console.log('Generating report...');

  const report = generateMarkdownReport(results);
  const reportDir = join(__dirname, '../../.lexer-health');
  const reportPath = join(reportDir, 'lexer-health-report.md');

  // Create report directory if needed
  // Can throw EACCES if parent directory is not writable
  try {
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to create report directory: ${message}`);
    process.exit(CI_EXIT_CODES.CONFIG_ERROR);
  }

  // Write report file
  // Can throw EACCES, ENOSPC (disk full), EROFS (read-only filesystem)
  try {
    writeFileSync(reportPath, report, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to write report: ${message}`);
    process.exit(CI_EXIT_CODES.CONFIG_ERROR);
  }

  const filesWithErrors = results.filter(r =>
    !r.positionValidation.isValid || !r.cleanExit.passed
  ).length;

  console.log(`\nReport saved to: .lexer-health/lexer-health-report.md`);
  console.log(`Files with failures: ${filesWithErrors}/${results.length}`);

  // Exit with appropriate code
  process.exit(filesWithErrors > 0 ? CI_EXIT_CODES.REGRESSION : CI_EXIT_CODES.PASS);
}
