/**
 * Rename Provider Tokenization Performance Test
 *
 * Validates the tokenization optimization in RenameProvider (Issue #205).
 * The optimization passes pre-tokenized tokens through the method chain to avoid
 * redundant tokenization. Without it, large files would be tokenized multiple times:
 * - Once in getRenameEdits for origin position
 * - Once in filterReferencesByScope
 *
 * This test ensures the optimization prevents performance degradation on large files.
 *
 * Methodology:
 * - Interleaved sampling: Alternates measurement order to eliminate order bias
 * - Statistical testing: Compares optimized vs unoptimized paths
 * - Expected improvement: 50%+ faster with optimization on files with 100+ symbols
 *
 * Related: Issue #417 - Performance benchmark for rename tokenization optimization
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { RenameProvider } from '../renameProvider';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolTable } from '../../symbols/symbolTable';

describe('Rename Provider tokenization performance', () => {
  // Set Jest timeout to 30 seconds for performance tests
  jest.setTimeout(30000);

  // Named constants for test configuration
  const WARMUP_ITERATIONS = 100;
  const SAMPLES_PER_MEASUREMENT = 15;
  const ITERATIONS_PER_SAMPLE = 50;
  const IMPROVEMENT_THRESHOLD_PERCENT = 30; // Optimized should be at least 30% faster
  const MAX_RETRY_ATTEMPTS = 3;
  const REQUIRED_PASSES = 2;

  /**
   * Measurement result structure
   */
  interface MeasurementResult {
    improvementPct: number;
    avgOptimized: number;
    avgUnoptimized: number;
    stdDevOptimized: number;
    stdDevUnoptimized: number;
    cvOptimized: number;
    cvUnoptimized: number;
  }

  /**
   * Attempt result structure
   */
  interface AttemptResult {
    passed: boolean;
    improvementPct: number;
    avgOptimized: number;
    avgUnoptimized: number;
    stdDevOptimized: number;
    stdDevUnoptimized: number;
    cvOptimized: number;
    cvUnoptimized: number;
  }

  /**
   * Retry result structure
   */
  interface RetryResult {
    passed: boolean;
    attempts: AttemptResult[];
  }

  /**
   * Generates a large synthetic C/AL codeunit with many symbols
   * @param numProcedures - Number of procedures to generate
   * @param numVarsPerProc - Number of variables per procedure
   * @returns C/AL code string
   */
  function generateLargeCodeunit(numProcedures: number, numVarsPerProc: number): string {
    const lines: string[] = [];

    lines.push('OBJECT Codeunit 50000 "Large Test Codeunit"');
    lines.push('{');
    lines.push('  OBJECT-PROPERTIES');
    lines.push('  {');
    lines.push('    Date=01/01/20;');
    lines.push('    Time=12:00:00;');
    lines.push('  }');
    lines.push('  PROPERTIES');
    lines.push('  {');
    lines.push('  }');
    lines.push('  CODE');
    lines.push('  {');

    // Generate global variables
    lines.push('    VAR');
    lines.push('      GlobalCounter@1000 : Integer;');
    lines.push('      GlobalText@1001 : Text[100];');
    lines.push('      GlobalDecimal@1002 : Decimal;');
    lines.push('');

    // Generate many procedures with local variables
    for (let i = 0; i < numProcedures; i++) {
      const procName = `ProcessData${i}`;
      lines.push(`    PROCEDURE ${procName}@${1100 + i}(InputParam@1000 : Integer) : Boolean;`);
      lines.push('    VAR');

      // Generate local variables
      for (let v = 0; v < numVarsPerProc; v++) {
        lines.push(`      LocalVar${v}@${2000 + v} : Integer;`);
      }

      lines.push('    BEGIN');

      // Generate code that references the variables
      for (let v = 0; v < numVarsPerProc; v++) {
        lines.push(`      LocalVar${v} := InputParam + ${v};`);
      }

      // Reference global variables
      lines.push('      GlobalCounter := GlobalCounter + 1;');
      lines.push('      GlobalText := FORMAT(GlobalCounter);');
      lines.push('      GlobalDecimal := GlobalCounter * 1.5;');

      // More references to local variables
      lines.push('      IF LocalVar0 > 0 THEN BEGIN');
      for (let v = 1; v < numVarsPerProc; v++) {
        lines.push(`        LocalVar${v} := LocalVar${v} + LocalVar0;`);
      }
      lines.push('      END;');

      lines.push('      EXIT(LocalVar0 > 0);');
      lines.push('    END;');
      lines.push('');
    }

    // Add one more procedure that calls the others
    lines.push('    PROCEDURE RunAllTests@9999() : Boolean;');
    lines.push('    VAR');
    lines.push('      TestResult@1000 : Boolean;');
    lines.push('    BEGIN');
    for (let i = 0; i < Math.min(numProcedures, 10); i++) {
      lines.push(`      TestResult := ProcessData${i}(${i});`);
    }
    lines.push('      EXIT(TestResult);');
    lines.push('    END;');
    lines.push('');

    lines.push('  END.');
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Measures rename performance comparing optimized vs unoptimized paths
   */
  function measureRenamePerformance(code: string): MeasurementResult {
    // Parse once and reuse for all measurements
    const document = TextDocument.create('file:///test.cal', 'cal', 1, code);
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    // Find a position to rename (use GlobalCounter variable)
    const offset = code.indexOf('GlobalCounter');
    const position = document.positionAt(offset + 6); // Middle of the identifier

    const renameProvider = new RenameProvider();

    // Warm-up: stabilize JIT compilation
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      // Unoptimized: don't pass tokens
      renameProvider.getRenameEdits(document, position, 'NewName', ast, symbolTable);

      // Optimized: pass tokens
      renameProvider.getRenameEdits(document, position, 'NewName', ast, symbolTable, tokens);
    }

    // Run multiple samples with interleaved order
    const optimizedTimes: number[] = [];
    const unoptimizedTimes: number[] = [];

    for (let sample = 0; sample < SAMPLES_PER_MEASUREMENT; sample++) {
      // Interleaved sampling: alternate measurement order to eliminate order bias
      if (sample % 2 === 0) {
        // Even samples: measure unoptimized first
        const startUnoptimized = performance.now();
        for (let i = 0; i < ITERATIONS_PER_SAMPLE; i++) {
          renameProvider.getRenameEdits(document, position, 'NewName', ast, symbolTable);
        }
        unoptimizedTimes.push(performance.now() - startUnoptimized);

        const startOptimized = performance.now();
        for (let i = 0; i < ITERATIONS_PER_SAMPLE; i++) {
          renameProvider.getRenameEdits(document, position, 'NewName', ast, symbolTable, tokens);
        }
        optimizedTimes.push(performance.now() - startOptimized);
      } else {
        // Odd samples: measure optimized first
        const startOptimized = performance.now();
        for (let i = 0; i < ITERATIONS_PER_SAMPLE; i++) {
          renameProvider.getRenameEdits(document, position, 'NewName', ast, symbolTable, tokens);
        }
        optimizedTimes.push(performance.now() - startOptimized);

        const startUnoptimized = performance.now();
        for (let i = 0; i < ITERATIONS_PER_SAMPLE; i++) {
          renameProvider.getRenameEdits(document, position, 'NewName', ast, symbolTable);
        }
        unoptimizedTimes.push(performance.now() - startUnoptimized);
      }
    }

    // Calculate means
    const avgOptimized = optimizedTimes.reduce((a, b) => a + b) / SAMPLES_PER_MEASUREMENT;
    const avgUnoptimized = unoptimizedTimes.reduce((a, b) => a + b) / SAMPLES_PER_MEASUREMENT;

    // Calculate standard deviations
    const stdDevOptimized = Math.sqrt(
      optimizedTimes.reduce((sum, t) => sum + Math.pow(t - avgOptimized, 2), 0) / (SAMPLES_PER_MEASUREMENT - 1)
    );
    const stdDevUnoptimized = Math.sqrt(
      unoptimizedTimes.reduce((sum, t) => sum + Math.pow(t - avgUnoptimized, 2), 0) / (SAMPLES_PER_MEASUREMENT - 1)
    );

    // Calculate coefficient of variation (CV = stdDev / mean)
    const cvOptimized = (stdDevOptimized / avgOptimized) * 100;
    const cvUnoptimized = (stdDevUnoptimized / avgUnoptimized) * 100;

    // Calculate improvement percentage
    // Positive value means optimized is faster (which is what we want)
    const improvementPct = ((avgUnoptimized - avgOptimized) / avgUnoptimized) * 100;

    return {
      improvementPct,
      avgOptimized,
      avgUnoptimized,
      stdDevOptimized,
      stdDevUnoptimized,
      cvOptimized,
      cvUnoptimized
    };
  }

  /**
   * Runs measurement with retry logic using 2/3 majority vote
   *
   * Exit conditions:
   * - Early success: 2 passes achieved
   * - Early failure: Mathematically impossible to reach 2 passes
   * - Max attempts: Reached MAX_RETRY_ATTEMPTS
   */
  function runWithRetry(
    code: string,
    measureFn: (code: string) => MeasurementResult = measureRenamePerformance
  ): RetryResult {
    const attempts: AttemptResult[] = [];
    let passCount = 0;

    for (let attemptNum = 1; attemptNum <= MAX_RETRY_ATTEMPTS; attemptNum++) {
      const result = measureFn(code);
      const passed = result.improvementPct >= IMPROVEMENT_THRESHOLD_PERCENT;

      attempts.push({
        passed,
        improvementPct: result.improvementPct,
        avgOptimized: result.avgOptimized,
        avgUnoptimized: result.avgUnoptimized,
        stdDevOptimized: result.stdDevOptimized,
        stdDevUnoptimized: result.stdDevUnoptimized,
        cvOptimized: result.cvOptimized,
        cvUnoptimized: result.cvUnoptimized
      });

      if (passed) {
        passCount++;
      }

      // Early exit: 2 passes achieved
      if (passCount >= REQUIRED_PASSES) {
        break;
      }

      // Early exit: mathematically impossible to reach 2 passes
      const remainingAttempts = MAX_RETRY_ATTEMPTS - attemptNum;
      const maxPossiblePasses = passCount + remainingAttempts;
      if (maxPossiblePasses < REQUIRED_PASSES) {
        break;
      }
    }

    return {
      passed: passCount >= REQUIRED_PASSES,
      attempts
    };
  }

  /**
   * Performance Test: Tokenization optimization effectiveness
   *
   * This test validates that passing pre-tokenized tokens eliminates redundant tokenization.
   * Without the optimization, getRenameEdits would tokenize the document multiple times:
   * - Once to find the token at the origin position
   * - Once per reference when filtering by scope
   *
   * For a file with 100+ symbols and many references, this difference should be substantial.
   *
   * Methodology:
   * - Warm-up: 100 iterations to stabilize JIT compilation
   * - Interleaved sampling: Alternate measurement order (optimized/unoptimized or unoptimized/optimized)
   * - Measurement: Run getRenameEdits 50 times per sample
   * - Assertion: Optimized path should be at least 30% faster than unoptimized
   * - Retry strategy: 2/3 majority vote to handle transient system load spikes
   *
   * All improvement values are logged to enable trend analysis. If values are consistently
   * near the threshold (e.g., 31%, 32%, 33%), that may indicate the optimization is
   * degrading even if the test passes.
   */
  it('should show significant performance improvement with pre-tokenized tokens', () => {
    // Generate large codeunit: 50 procedures × 10 vars each = 500+ local symbols
    // Plus global vars and procedure references = 600+ total symbols
    // Results in ~1500 lines of code
    const code = generateLargeCodeunit(50, 10);

    // Verify the code is large enough
    const lineCount = code.split('\n').length;
    expect(lineCount).toBeGreaterThan(1000);

    // Run measurement with retry logic
    const result = runWithRetry(code);

    // Always log ALL attempt improvement percentages for trend analysis
    console.log(`Rename tokenization performance (${REQUIRED_PASSES}/${MAX_RETRY_ATTEMPTS} majority, threshold: ${IMPROVEMENT_THRESHOLD_PERCENT}%)`);
    console.log(`${'═'.repeat(70)}`);
    console.log('');

    result.attempts.forEach((attempt, index) => {
      const attemptNum = index + 1;
      const status = attempt.passed ? 'PASS' : 'FAIL';
      console.log(`Attempt ${attemptNum}/${MAX_RETRY_ATTEMPTS}: ${attempt.improvementPct.toFixed(1)}% improvement [${status}]`);
      console.log(`  Unoptimized: ${attempt.avgUnoptimized.toFixed(2)}ms (σ=${attempt.stdDevUnoptimized.toFixed(1)}ms, CV=${attempt.cvUnoptimized.toFixed(1)}%)`);
      console.log(`  Optimized:   ${attempt.avgOptimized.toFixed(2)}ms (σ=${attempt.stdDevOptimized.toFixed(1)}ms, CV=${attempt.cvOptimized.toFixed(1)}%)`);
      console.log('');
    });

    console.log(`${'─'.repeat(70)}`);
    const passCount = result.attempts.filter(a => a.passed).length;
    const finalStatus = result.passed ? 'PASS' : 'FAIL';
    console.log(`Result: ${finalStatus} (${passCount}/${result.attempts.length} attempts succeeded)`);

    const improvementValues = result.attempts.map(a => `${a.improvementPct.toFixed(1)}%`).join(', ');
    console.log(`Improvement values: ${improvementValues} (review for concerning trends)`);
    console.log(`${'─'.repeat(70)}`);

    // Final assertion: test passes if 2/3 majority achieved threshold
    expect(result.passed).toBe(true);
  });

  describe('runWithRetry unit tests', () => {
    /**
     * Helper to create mock MeasurementResult objects
     */
    function mockResult(passed: boolean): MeasurementResult {
      return {
        improvementPct: passed ? 50.0 : 20.0,
        avgOptimized: passed ? 100.0 : 120.0,
        avgUnoptimized: 150.0,
        stdDevOptimized: 3.0,
        stdDevUnoptimized: 4.0,
        cvOptimized: 3.0,
        cvUnoptimized: 2.7
      };
    }

    it('should exit early after 2 passes [PASS, PASS]', () => {
      const mockMeasure = jest.fn<MeasurementResult, [string]>()
        .mockReturnValueOnce(mockResult(true))
        .mockReturnValueOnce(mockResult(true));

      const result = runWithRetry('test code', mockMeasure);

      expect(result.passed).toBe(true);
      expect(result.attempts.length).toBe(2);
      expect(mockMeasure).toHaveBeenCalledTimes(2);
    });

    it('should pass with 2/3 majority [PASS, FAIL, PASS]', () => {
      const mockMeasure = jest.fn<MeasurementResult, [string]>()
        .mockReturnValueOnce(mockResult(true))
        .mockReturnValueOnce(mockResult(false))
        .mockReturnValueOnce(mockResult(true));

      const result = runWithRetry('test code', mockMeasure);

      expect(result.passed).toBe(true);
      expect(result.attempts.length).toBe(3);
      expect(mockMeasure).toHaveBeenCalledTimes(3);
    });

    it('should exit early when success impossible [FAIL, FAIL]', () => {
      const mockMeasure = jest.fn<MeasurementResult, [string]>()
        .mockReturnValueOnce(mockResult(false))
        .mockReturnValueOnce(mockResult(false));

      const result = runWithRetry('test code', mockMeasure);

      expect(result.passed).toBe(false);
      expect(result.attempts.length).toBe(2);
      expect(mockMeasure).toHaveBeenCalledTimes(2);
    });

    it('should pass with 2/3 majority [FAIL, PASS, PASS]', () => {
      const mockMeasure = jest.fn<MeasurementResult, [string]>()
        .mockReturnValueOnce(mockResult(false))
        .mockReturnValueOnce(mockResult(true))
        .mockReturnValueOnce(mockResult(true));

      const result = runWithRetry('test code', mockMeasure);

      expect(result.passed).toBe(true);
      expect(result.attempts.length).toBe(3);
      expect(mockMeasure).toHaveBeenCalledTimes(3);
    });

    it('should fail when majority not achieved [PASS, FAIL, FAIL]', () => {
      const mockMeasure = jest.fn<MeasurementResult, [string]>()
        .mockReturnValueOnce(mockResult(true))
        .mockReturnValueOnce(mockResult(false))
        .mockReturnValueOnce(mockResult(false));

      const result = runWithRetry('test code', mockMeasure);

      expect(result.passed).toBe(false);
      expect(result.attempts.length).toBe(3);
      expect(mockMeasure).toHaveBeenCalledTimes(3);
    });

    it('should not exit early after single failure [FAIL, ...]', () => {
      const mockMeasure = jest.fn<MeasurementResult, [string]>()
        .mockReturnValueOnce(mockResult(false))
        .mockReturnValueOnce(mockResult(true))
        .mockReturnValueOnce(mockResult(true));

      const result = runWithRetry('test code', mockMeasure);

      expect(result.passed).toBe(true);
      expect(result.attempts.length).toBe(3);
      expect(mockMeasure).toHaveBeenCalledTimes(3);
    });
  });
});
