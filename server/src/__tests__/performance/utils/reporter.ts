/**
 * Performance Test Reporters
 *
 * Provides console and JSON output for benchmark results.
 * Includes colored output for human readability and structured data for CI.
 */

import { table } from 'table';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { ComparisonResult } from './baseline';

/**
 * Benchmark result data structure.
 *
 * CANONICAL DEFINITION: All benchmark files must import this from reporter.ts.
 * Do not duplicate this interface — import it instead.
 */
export interface BenchmarkResult {
  name: string;
  meanMs: number;
  stdDevMs: number;
  minMs: number;
  maxMs: number;
  ops: number;
  samples: number;
  memoryMB?: number;
}

export interface BenchmarkSuiteResults {
  suiteName: string;
  benchmarks: BenchmarkResult[];
  totalDurationMs: number;
}

/**
 * Console Reporter for benchmark results
 */
export class ConsoleReporter {
  /**
   * Report benchmark suite results to console
   */
  reportBenchmark(results: BenchmarkSuiteResults): void {
    console.log(chalk.bold(`\n${results.suiteName}`));
    console.log(chalk.gray('='.repeat(100)));

    const data: string[][] = [
      ['Benchmark', 'Mean', 'Std Dev', 'Min', 'Max', 'Ops/sec', 'Samples', 'Status']
    ];

    for (const bench of results.benchmarks) {
      const status = this.getStatusIcon(bench);
      const memory = bench.memoryMB !== undefined ? ` (${bench.memoryMB.toFixed(2)} MB)` : '';

      data.push([
        bench.name,
        `${bench.meanMs.toFixed(2)} ms`,
        `±${bench.stdDevMs.toFixed(2)}`,
        `${bench.minMs.toFixed(2)} ms`,
        `${bench.maxMs.toFixed(2)} ms`,
        bench.ops.toFixed(0),
        bench.samples.toString(),
        status + memory
      ]);
    }

    console.log(table(data, {
      header: {
        alignment: 'center',
        content: results.suiteName
      }
    }));

    console.log(chalk.gray(`Total duration: ${results.totalDurationMs.toFixed(0)}ms`));
  }

  /**
   * Report baseline comparison results
   */
  reportComparison(comparisons: ComparisonResult[]): void {
    console.log(chalk.bold('\n📊 Baseline Comparison'));
    console.log(chalk.gray('='.repeat(100)));

    let failed = 0;
    let warned = 0;
    let passed = 0;

    const data: string[][] = [
      ['Benchmark', 'Current', 'Baseline', 'Change', 'Status']
    ];

    for (const result of comparisons) {
      const icon = this.getComparisonIcon(result);
      const changeText = result.percentChange >= 0
        ? `+${result.percentChange.toFixed(1)}%`
        : `${result.percentChange.toFixed(1)}%`;

      const statusText = result.status === 'FAIL' ? chalk.red(result.status)
                       : result.status === 'WARN' ? chalk.yellow(result.status)
                       : chalk.green(result.status);

      data.push([
        result.name,
        `${result.currentMs.toFixed(2)} ms`,
        result.baselineMs > 0 ? `${result.baselineMs.toFixed(2)} ms` : 'N/A',
        changeText,
        `${icon} ${statusText}`
      ]);

      if (result.status === 'FAIL') failed++;
      else if (result.status === 'WARN') warned++;
      else passed++;
    }

    console.log(table(data));

    console.log(chalk.gray('='.repeat(100)));
    console.log(
      `${chalk.green(passed)} passed, ` +
      `${chalk.yellow(warned)} warnings, ` +
      `${chalk.red(failed)} failed`
    );

    if (failed > 0) {
      console.log(chalk.red('\n❌ Performance regression detected!'));
      process.exitCode = 1;
    } else if (warned > 0) {
      console.log(chalk.yellow('\n⚠️  Performance warnings detected'));
    } else {
      console.log(chalk.green('\n✅ All benchmarks within acceptable range'));
    }
  }

  /**
   * Get status icon based on variance
   */
  private getStatusIcon(bench: BenchmarkResult): string {
    // Check coefficient of variation (CV)
    const cv = (bench.stdDevMs / bench.meanMs) * 100;

    if (cv > 20) return chalk.yellow('⚠');
    return chalk.green('✓');
  }

  /**
   * Get comparison icon
   */
  private getComparisonIcon(result: ComparisonResult): string {
    if (result.status === 'FAIL') return '🔴';
    if (result.status === 'WARN') return '⚠️';
    return '✅';
  }
}

/**
 * JSON Reporter for CI integration
 */
export class JSONReporter {
  /**
   * Write benchmark results to JSON file
   */
  report(results: BenchmarkSuiteResults, outputPath: string): void {
    const report = {
      timestamp: new Date().toISOString(),
      suiteName: results.suiteName,
      totalDurationMs: results.totalDurationMs,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      benchmarks: results.benchmarks.map(b => ({
        name: b.name,
        meanMs: b.meanMs,
        stdDevMs: b.stdDevMs,
        minMs: b.minMs,
        maxMs: b.maxMs,
        ops: b.ops,
        samples: b.samples,
        memoryMB: b.memoryMB
      }))
    };

    writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(chalk.gray(`\nResults written to: ${outputPath}`));
  }

  /**
   * Write comparison results to JSON file
   */
  reportComparison(comparisons: ComparisonResult[], outputPath: string): void {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      summary: {
        total: comparisons.length,
        passed: comparisons.filter(c => c.status === 'PASS').length,
        warned: comparisons.filter(c => c.status === 'WARN').length,
        failed: comparisons.filter(c => c.status === 'FAIL').length
      },
      comparisons: comparisons.map(c => ({
        name: c.name,
        status: c.status,
        message: c.message,
        currentMs: c.currentMs,
        baselineMs: c.baselineMs,
        ratio: c.ratio,
        percentChange: c.percentChange
      }))
    };

    writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(chalk.gray(`\nComparison results written to: ${outputPath}`));
  }
}

/**
 * Markdown Reporter for GitHub PR comments
 */
export class MarkdownReporter {
  /**
   * Generate markdown table for PR comment
   */
  generateComparisonMarkdown(comparisons: ComparisonResult[]): string {
    let markdown = '## Performance Benchmark Results\n\n';
    markdown += '| Benchmark | Current | Baseline | Change | Status |\n';
    markdown += '|-----------|---------|----------|--------|--------|\n';

    for (const result of comparisons) {
      const icon = result.status === 'FAIL' ? '🔴'
                 : result.status === 'WARN' ? '⚠️'
                 : '✅';

      const changeText = result.percentChange >= 0
        ? `+${result.percentChange.toFixed(1)}%`
        : `${result.percentChange.toFixed(1)}%`;

      const baseline = result.baselineMs > 0
        ? `${result.baselineMs.toFixed(2)}ms`
        : 'N/A';

      markdown += `| ${result.name} | ${result.currentMs.toFixed(2)}ms | ${baseline} | ${changeText} | ${icon} ${result.status} |\n`;
    }

    const summary = {
      total: comparisons.length,
      passed: comparisons.filter(c => c.status === 'PASS').length,
      warned: comparisons.filter(c => c.status === 'WARN').length,
      failed: comparisons.filter(c => c.status === 'FAIL').length
    };

    markdown += '\n**Summary:** ';
    markdown += `${summary.passed} passed, `;
    markdown += `${summary.warned} warnings, `;
    markdown += `${summary.failed} failed`;

    return markdown;
  }
}
