/**
 * WorkspaceSymbol Provider Performance Test
 *
 * Validates search performance across multiple documents with varying symbol densities.
 *
 * Why absolute timing instead of A/B comparison:
 * - No optimization branches to compare (unlike RenameProvider's tokenization optimization)
 * - Tests fundamental search operation performance
 * - Validates performance remains acceptable as codebase scales
 * - Provides regression detection baseline for future changes
 *
 * Test Design:
 * - 15 documents with 296 total symbols (varied density: rich tables, heavy codeunits, simple objects)
 * - 4 query scenarios testing different selectivity patterns
 * - 50ms threshold provides 10x headroom over expected ~5ms performance
 * - 2/3 majority vote handles transient system load spikes
 *
 * Query Selectivity Strategy:
 * - Empty query: Returns ALL symbols (LSP spec requirement)
 * - Common query ("field"): High selectivity (matches ~50% of symbols)
 * - Rare query ("oninsert"): Low selectivity (matches <2% of symbols)
 * - Specific query ("validatecustomer"): Single match (precision search)
 *
 * Related: Issue #207 - WorkspaceSymbolProvider performance benchmark
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Parser } from '../../parser/parser';
import { Lexer } from '../../lexer/lexer';
import { WorkspaceSymbolProvider } from '../workspaceSymbolProvider';
import { DocumentSymbolProvider } from '../../documentSymbol/documentSymbolProvider';
import { CALDocument } from '../../parser/ast';

describe('WorkspaceSymbol Provider performance', () => {
  // Set Jest timeout to 30 seconds for performance tests
  jest.setTimeout(30000);

  // Named constants for test configuration
  const WARMUP_ITERATIONS = 50;
  const SAMPLES_PER_MEASUREMENT = 15;
  const ITERATIONS_PER_SAMPLE = 50;
  const THRESHOLD_MS = 50;
  const MAX_RETRY_ATTEMPTS = 3;
  const REQUIRED_PASSES = 2;

  // Expected symbol counts
  const EXPECTED_TOTAL_SYMBOLS = 296;
  const EXPECTED_FIELD_MATCHES = 146; // 130 fields + 16 keys
  const EXPECTED_ONINSERT_MATCHES = 5; // One per rich table
  const EXPECTED_SPECIFIC_MATCHES = 1; // Single procedure

  /**
   * Query scenario configuration
   */
  interface ScenarioConfig {
    query: string;
    label: string;
    expectedCount: number;
  }

  /**
   * Scenario measurement result
   */
  interface ScenarioMeasurement {
    label: string;
    meanMs: number;
    stdDevMs: number;
    cvPercent: number;
    resultCount: number;
    passed: boolean;
  }

  /**
   * Attempt result structure (all scenarios)
   */
  interface AttemptResult {
    scenarios: ScenarioMeasurement[];
    passed: boolean; // True if ALL scenarios passed
  }

  /**
   * Retry result structure
   */
  interface RetryResult {
    passed: boolean;
    attempts: AttemptResult[];
  }

  /**
   * Generates a rich C/AL table with fields, keys, triggers, procedures, and variables
   * @param id - Table ID
   * @param fieldCount - Number of fields to generate
   * @param withCodeSection - Whether to include CODE section with triggers/procedures
   * @returns C/AL table string
   */
  function generateTable(id: number, fieldCount: number, withCodeSection: boolean): string {
    const lines: string[] = [];

    lines.push(`OBJECT Table ${50000 + id} "Test Table ${id}"`);
    lines.push('{');
    lines.push('  OBJECT-PROPERTIES');
    lines.push('  {');
    lines.push('    Date=01/01/20;');
    lines.push('    Time=12:00:00;');
    lines.push('  }');
    lines.push('  PROPERTIES');
    lines.push('  {');
    lines.push('  }');
    lines.push('  FIELDS');
    lines.push('  {');

    // Generate fields with varied names (all contain "Field")
    const fieldNames = [
      'NameField', 'AddressField', 'AmountField', 'QuantityField', 'CodeField',
      'DateField', 'BoolField', 'IntField', 'TextField', 'OptionField',
      'DecimalField', 'TimeField', 'DurationField', 'RecordField', 'FilterField',
      'LookupField', 'StatusField', 'PriorityField', 'CategoryField', 'DescriptionField'
    ];

    for (let i = 0; i < fieldCount; i++) {
      const fieldName = fieldNames[i % fieldNames.length];
      const fieldNum = (i + 1) * 10;
      lines.push(`    { ${fieldNum};   ;${fieldName}${i > 0 ? i : ''}@${1000 + i} : Text[50]; }`);
    }

    lines.push('  }');
    lines.push('  KEYS');
    lines.push('  {');

    // Generate keys (composed from field names, all contain "Field")
    const key1Fields = fieldNames.slice(0, Math.min(2, fieldCount)).map((n, i) => `${n}${i > 0 ? i : ''}`).join(',');
    const key2Fields = fieldNames.slice(0, Math.min(3, fieldCount)).map((n, i) => `${n}${i > 0 ? i : ''}`).join(',');

    lines.push(`    {    ;${key1Fields}@${2000 + id}                        ;Clustered=Yes }`);
    if (fieldCount >= 3) {
      lines.push(`    {    ;${key2Fields}@${2001 + id}                             }`);
    }

    lines.push('  }');

    if (withCodeSection) {
      lines.push('  CODE');
      lines.push('  {');
      lines.push('    VAR');
      lines.push('      GlobalCounter@3000 : Integer;');
      lines.push('      GlobalText@3001 : Text[100];');
      lines.push('      GlobalDecimal@3002 : Decimal;');
      lines.push('');

      // Generate triggers (OnInsert, OnModify, OnDelete)
      lines.push(`    PROCEDURE OnInsert@${4000 + id}();`);
      lines.push('    BEGIN');
      lines.push('      GlobalCounter := GlobalCounter + 1;');
      lines.push('    END;');
      lines.push('');

      lines.push(`    PROCEDURE OnModify@${4001 + id}();`);
      lines.push('    BEGIN');
      lines.push('      GlobalCounter := GlobalCounter + 1;');
      lines.push('    END;');
      lines.push('');

      lines.push(`    PROCEDURE OnDelete@${4002 + id}();`);
      lines.push('    BEGIN');
      lines.push('      GlobalCounter := 0;');
      lines.push('    END;');
      lines.push('');

      // Generate 5 additional procedures (no "field" or "oninsert" in names)
      // Table 1 gets ValidateCustomerData, others get ValidateTable{N}
      const procNames = ['ProcessEntry', 'CalculateTotal', 'UpdateStatus', 'CheckStatus'];

      // First procedure is unique per table
      if (id === 1) {
        lines.push(`    PROCEDURE ValidateCustomerData@${4100 + id}(CustomerNo@1000 : Code[20]) : Boolean;`);
        lines.push('    BEGIN');
        lines.push('      EXIT(CustomerNo <> \'\');');
        lines.push('    END;');
        lines.push('');
      } else {
        lines.push(`    PROCEDURE ValidateTable${id}@${4100 + id}() : Boolean;`);
        lines.push('    BEGIN');
        lines.push('      EXIT(TRUE);');
        lines.push('    END;');
        lines.push('');
      }

      // Then add the 4 common procedures
      for (let i = 0; i < procNames.length; i++) {
        lines.push(`    PROCEDURE ${procNames[i]}${id}@${5000 + id * 10 + i}() : Boolean;`);
        lines.push('    BEGIN');
        lines.push('      GlobalCounter := GlobalCounter + 1;');
        lines.push('      EXIT(TRUE);');
        lines.push('    END;');
        lines.push('');
      }

      lines.push('  END.');
    }

    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generates a C/AL codeunit with procedures and variables
   * @param id - Codeunit ID
   * @param procCount - Number of procedures to generate
   * @param isHeavy - Whether to include many variables (heavy) or few (light)
   * @returns C/AL codeunit string
   */
  function generateCodeunit(id: number, procCount: number, isHeavy: boolean): string {
    const lines: string[] = [];

    lines.push(`OBJECT Codeunit ${60000 + id} "Test Codeunit ${id}"`);
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

    // Global variables (no "field" or "oninsert" in names)
    if (isHeavy) {
      lines.push('    VAR');
      lines.push('      GlobalCounter@6000 : Integer;');
      lines.push('      GlobalText@6001 : Text[100];');
      lines.push('      GlobalDecimal@6002 : Decimal;');
      lines.push('');
    }

    // Generate procedures (no "field" or "oninsert" in names)
    const procNames = [
      'ProcessBatch', 'CalculateSum', 'FormatOutput', 'ValidateInput',
      'ExportData', 'ImportData', 'TransformData', 'FilterRecords',
      'SortResults', 'MergeData', 'SplitData', 'AggregateValues',
      'ParseText', 'BuildQuery', 'ExecuteAction'
    ];

    for (let i = 0; i < procCount; i++) {
      const procName = procNames[i % procNames.length];
      lines.push(`    PROCEDURE ${procName}${id}_${i}@${7000 + id * 100 + i}(Param@1000 : Integer) : Boolean;`);
      lines.push('    BEGIN');
      if (isHeavy) {
        lines.push('      GlobalCounter := GlobalCounter + Param;');
      }
      lines.push('      EXIT(Param > 0);');
      lines.push('    END;');
      lines.push('');
    }

    lines.push('  END.');
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generates workspace with 15 documents and 296 symbols
   * Returns provider and parsed documents
   */
  function generateWorkspace(): {
    provider: WorkspaceSymbolProvider;
    parsedDocs: Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>;
  } {
    const parsedDocs: Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }> = [];

    // Docs 1-5: Rich tables (20 fields, 2 keys, 3 triggers, 5 procedures, 3 global vars each)
    // = 20 + 2 + 3 + 5 + 3 = 33 symbols per rich table × 5 = 165 symbols
    // Note: Each table has unique procedure (table 1: ValidateCustomerData, others: ValidateTable{N})
    for (let i = 1; i <= 5; i++) {
      const code = generateTable(i, 20, true);
      const uri = `file:///workspace/table${i}.cal`;
      const textDocument = TextDocument.create(uri, 'cal', 1, code);
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      parsedDocs.push({ uri, textDocument, ast });
    }

    // Docs 6-10: Heavy codeunits (15 procedures, 3 global vars each)
    // = 15 + 3 = 18 symbols per heavy codeunit × 5 = 90 symbols
    for (let i = 6; i <= 10; i++) {
      const code = generateCodeunit(i, 15, true);
      const uri = `file:///workspace/codeunit${i}.cal`;
      const textDocument = TextDocument.create(uri, 'cal', 1, code);
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      parsedDocs.push({ uri, textDocument, ast });
    }

    // Docs 11-13: Simple tables (10 fields, 2 keys, no CODE section)
    // = 10 + 2 = 12 symbols per simple table × 3 = 36 symbols
    for (let i = 11; i <= 13; i++) {
      const code = generateTable(i, 10, false);
      const uri = `file:///workspace/table${i}.cal`;
      const textDocument = TextDocument.create(uri, 'cal', 1, code);
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      parsedDocs.push({ uri, textDocument, ast });
    }

    // Docs 14-15: Light codeunits (2-3 procedures, 0 global vars)
    // = 2 symbols (codeunit 14) + 3 symbols (codeunit 15) = 5 symbols
    // Note: Using isHeavy=false means no global vars
    for (let i = 14; i <= 15; i++) {
      const procCount = i === 15 ? 3 : 2; // Codeunit 15 has 3 procs, 14 has 2
      const code = generateCodeunit(i, procCount, false);
      const uri = `file:///workspace/codeunit${i}.cal`;
      const textDocument = TextDocument.create(uri, 'cal', 1, code);
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      parsedDocs.push({ uri, textDocument, ast });
    }

    // Total: 165 + 90 + 36 + 5 = 296 symbols

    const documentSymbolProvider = new DocumentSymbolProvider();
    const provider = new WorkspaceSymbolProvider(documentSymbolProvider);

    return { provider, parsedDocs };
  }

  /**
   * Measures search performance for a single scenario
   */
  function measureScenario(
    provider: WorkspaceSymbolProvider,
    docs: Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>,
    scenario: ScenarioConfig
  ): ScenarioMeasurement {
    // Warmup
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      provider.search(scenario.query, docs);
    }

    // Collect samples
    const samples: number[] = [];

    for (let sample = 0; sample < SAMPLES_PER_MEASUREMENT; sample++) {
      const start = performance.now();

      for (let i = 0; i < ITERATIONS_PER_SAMPLE; i++) {
        provider.search(scenario.query, docs);
      }

      const elapsed = performance.now() - start;
      samples.push(elapsed);
    }

    // Calculate statistics
    const meanMs = samples.reduce((a, b) => a + b, 0) / SAMPLES_PER_MEASUREMENT;
    const variance = samples.reduce((sum, t) => sum + Math.pow(t - meanMs, 2), 0) / (SAMPLES_PER_MEASUREMENT - 1);
    const stdDevMs = Math.sqrt(variance);
    const cvPercent = (stdDevMs / meanMs) * 100;

    // Verify result count
    const results = provider.search(scenario.query, docs);
    const resultCount = results.length;

    // Scenario passes if mean time is under threshold AND result count matches expected
    const passed = meanMs < THRESHOLD_MS && resultCount === scenario.expectedCount;

    return {
      label: scenario.label,
      meanMs,
      stdDevMs,
      cvPercent,
      resultCount,
      passed
    };
  }

  /**
   * Runs one complete attempt (all 4 scenarios)
   * Attempt passes only if ALL scenarios pass
   */
  function runAttempt(
    provider: WorkspaceSymbolProvider,
    docs: Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>,
    scenarios: ScenarioConfig[]
  ): AttemptResult {
    const measurements: ScenarioMeasurement[] = [];

    for (const scenario of scenarios) {
      measurements.push(measureScenario(provider, docs, scenario));
    }

    // Attempt passes only if ALL scenarios passed
    const passed = measurements.every(m => m.passed);

    return {
      scenarios: measurements,
      passed
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
    provider: WorkspaceSymbolProvider,
    docs: Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>,
    scenarios: ScenarioConfig[],
    attemptFn: (
      provider: WorkspaceSymbolProvider,
      docs: Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>,
      scenarios: ScenarioConfig[]
    ) => AttemptResult = runAttempt
  ): RetryResult {
    const attempts: AttemptResult[] = [];
    let passCount = 0;

    for (let attemptNum = 1; attemptNum <= MAX_RETRY_ATTEMPTS; attemptNum++) {
      const result = attemptFn(provider, docs, scenarios);
      attempts.push(result);

      if (result.passed) {
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
   * Main performance test
   */
  it('should search 15 documents within 50ms for all query patterns', () => {
    // Generate workspace
    const { provider, parsedDocs } = generateWorkspace();

    // Verify workspace setup
    expect(parsedDocs.length).toBe(15);

    // Sanity check: empty query should return all symbols
    const allSymbols = provider.search('', parsedDocs);
    expect(allSymbols.length).toBe(EXPECTED_TOTAL_SYMBOLS);

    // Define query scenarios
    const scenarios: ScenarioConfig[] = [
      { query: '', label: 'Empty ("")', expectedCount: EXPECTED_TOTAL_SYMBOLS },
      { query: 'field', label: 'Common ("field")', expectedCount: EXPECTED_FIELD_MATCHES },
      { query: 'oninsert', label: 'Rare ("oninsert")', expectedCount: EXPECTED_ONINSERT_MATCHES },
      { query: 'validatecustomer', label: 'Specific ("validatecustomer")', expectedCount: EXPECTED_SPECIFIC_MATCHES }
    ];

    // Run with retry logic
    const result = runWithRetry(provider, parsedDocs, scenarios);

    // Log results
    console.log(`WorkspaceSymbol search performance (${REQUIRED_PASSES}/${MAX_RETRY_ATTEMPTS} majority, threshold: ${THRESHOLD_MS}ms)`);
    console.log('='.repeat(70));
    console.log('NOTE: Absolute timing test (no A/B comparison). See comment in source.');
    console.log('');
    console.log(`Workspace: ${parsedDocs.length} documents, ${EXPECTED_TOTAL_SYMBOLS} symbols`);
    console.log('');

    result.attempts.forEach((attempt, index) => {
      const attemptNum = index + 1;
      const attemptStatus = attempt.passed ? 'PASS' : 'FAIL';

      console.log(`Attempt ${attemptNum}/${MAX_RETRY_ATTEMPTS}:`);

      attempt.scenarios.forEach(scenario => {
        const status = scenario.passed ? 'PASS' : 'FAIL';
        const padding = ' '.repeat(Math.max(0, 30 - scenario.label.length));
        console.log(`  ${scenario.label}${padding}: ${scenario.meanMs.toFixed(1)}ms mean (sigma=${scenario.stdDevMs.toFixed(1)}ms, CV=${scenario.cvPercent.toFixed(1)}%) [${status}] ${scenario.resultCount} results`);
      });

      console.log(`  => Attempt: ${attemptStatus} (${attempt.passed ? 'all scenarios under ' + THRESHOLD_MS + 'ms' : 'one or more scenarios failed'})`);
      console.log('');
    });

    console.log('-'.repeat(70));
    const passCount = result.attempts.filter(a => a.passed).length;
    const finalStatus = result.passed ? 'PASS' : 'FAIL';
    console.log(`Result: ${finalStatus} (${passCount}/${result.attempts.length} attempts needed, ${REQUIRED_PASSES}/${MAX_RETRY_ATTEMPTS} majority ${result.passed ? 'achieved' : 'not achieved'})`);

    if (result.passed) {
      // Find peak mean across all scenarios in all attempts
      let peakMean = 0;
      let peakLabel = '';

      result.attempts.forEach(attempt => {
        attempt.scenarios.forEach(scenario => {
          if (scenario.meanMs > peakMean) {
            peakMean = scenario.meanMs;
            peakLabel = scenario.label;
          }
        });
      });

      const headroom = ((THRESHOLD_MS - peakMean) / THRESHOLD_MS) * 100;
      console.log(`Peak mean: ${peakMean.toFixed(1)}ms (${peakLabel}) -- headroom: ${headroom.toFixed(1)}% under ${THRESHOLD_MS}ms threshold`);
    }

    console.log('-'.repeat(70));

    // Assert overall pass
    expect(result.passed).toBe(true);
  });

  describe('runWithRetry unit tests', () => {
    /**
     * Helper to create mock attempt result
     */
    function mockAttempt(passed: boolean): AttemptResult {
      return {
        scenarios: [
          {
            label: 'Empty',
            meanMs: passed ? 30 : 60,
            stdDevMs: 3,
            cvPercent: 10,
            resultCount: 100,
            passed
          },
          {
            label: 'Test',
            meanMs: passed ? 25 : 55,
            stdDevMs: 2.5,
            cvPercent: 10,
            resultCount: 50,
            passed
          }
        ],
        passed
      };
    }

    it('should exit early after 2 passes [PASS, PASS]', () => {
      const mockProvider = {} as WorkspaceSymbolProvider;
      const mockDocs = [] as Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>;
      const scenarios = [] as ScenarioConfig[];

      const mockAttemptFn = jest.fn<AttemptResult, [WorkspaceSymbolProvider, Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>, ScenarioConfig[]]>()
        .mockReturnValueOnce(mockAttempt(true))
        .mockReturnValueOnce(mockAttempt(true));

      const result = runWithRetry(mockProvider, mockDocs, scenarios, mockAttemptFn);

      expect(result.passed).toBe(true);
      expect(result.attempts.length).toBe(2); // Early exit after 2 passes
      expect(mockAttemptFn).toHaveBeenCalledTimes(2);
    });

    it('should pass with 2/3 majority [PASS, FAIL, PASS]', () => {
      const mockProvider = {} as WorkspaceSymbolProvider;
      const mockDocs = [] as Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>;
      const scenarios = [] as ScenarioConfig[];

      const mockAttemptFn = jest.fn<AttemptResult, [WorkspaceSymbolProvider, Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>, ScenarioConfig[]]>()
        .mockReturnValueOnce(mockAttempt(true))
        .mockReturnValueOnce(mockAttempt(false))
        .mockReturnValueOnce(mockAttempt(true));

      const result = runWithRetry(mockProvider, mockDocs, scenarios, mockAttemptFn);

      expect(result.passed).toBe(true);
      expect(result.attempts.length).toBe(3);
      expect(mockAttemptFn).toHaveBeenCalledTimes(3);
    });

    it('should exit early when success impossible [FAIL, FAIL]', () => {
      const mockProvider = {} as WorkspaceSymbolProvider;
      const mockDocs = [] as Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>;
      const scenarios = [] as ScenarioConfig[];

      const mockAttemptFn = jest.fn<AttemptResult, [WorkspaceSymbolProvider, Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>, ScenarioConfig[]]>()
        .mockReturnValueOnce(mockAttempt(false))
        .mockReturnValueOnce(mockAttempt(false));

      const result = runWithRetry(mockProvider, mockDocs, scenarios, mockAttemptFn);

      expect(result.passed).toBe(false);
      expect(result.attempts.length).toBe(2); // Early exit after 2 failures
      expect(mockAttemptFn).toHaveBeenCalledTimes(2);
    });

    it('should pass with 2/3 majority [FAIL, PASS, PASS]', () => {
      const mockProvider = {} as WorkspaceSymbolProvider;
      const mockDocs = [] as Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>;
      const scenarios = [] as ScenarioConfig[];

      const mockAttemptFn = jest.fn<AttemptResult, [WorkspaceSymbolProvider, Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>, ScenarioConfig[]]>()
        .mockReturnValueOnce(mockAttempt(false))
        .mockReturnValueOnce(mockAttempt(true))
        .mockReturnValueOnce(mockAttempt(true));

      const result = runWithRetry(mockProvider, mockDocs, scenarios, mockAttemptFn);

      expect(result.passed).toBe(true);
      expect(result.attempts.length).toBe(3);
      expect(mockAttemptFn).toHaveBeenCalledTimes(3);
    });

    it('should fail when majority not achieved [PASS, FAIL, FAIL]', () => {
      const mockProvider = {} as WorkspaceSymbolProvider;
      const mockDocs = [] as Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>;
      const scenarios = [] as ScenarioConfig[];

      const mockAttemptFn = jest.fn<AttemptResult, [WorkspaceSymbolProvider, Array<{ uri: string; textDocument: TextDocument; ast: CALDocument }>, ScenarioConfig[]]>()
        .mockReturnValueOnce(mockAttempt(true))
        .mockReturnValueOnce(mockAttempt(false))
        .mockReturnValueOnce(mockAttempt(false));

      const result = runWithRetry(mockProvider, mockDocs, scenarios, mockAttemptFn);

      expect(result.passed).toBe(false);
      expect(result.attempts.length).toBe(3);
      expect(mockAttemptFn).toHaveBeenCalledTimes(3);
    });
  });
});
