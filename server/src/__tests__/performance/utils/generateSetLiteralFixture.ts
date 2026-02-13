/**
 * Deterministic Generator for Set Literal Performance Test Fixture
 *
 * Generates a synthetic C/AL codeunit (~5K lines, 450 set expressions)
 * to benchmark semantic token performance for set literal highlighting.
 *
 * MUST be deterministic (no Math.random()) - uses procedure-number-based variation.
 * CLI runnable with ts-node.
 */

import * as fs from 'fs';
import * as path from 'path';

interface GeneratorOptions {
  outputPath: string;
  targetProcedures?: number; // 150 procedures to reach ~5K lines
  setsPerProcedure?: number; // 3 set expressions per procedure = 450 total
}

/**
 * Generate a set literal based on deterministic pattern from procedure number
 */
function generateSetLiteral(procNum: number, setIndex: number): string {
  const pattern = (procNum + setIndex) % 10;

  // 40% discrete values (patterns 0-3)
  if (pattern <= 3) {
    const enums = ['Status::Open', 'Status::Released', 'Status::Pending', 'Status::Closed'];
    const count = 2 + (pattern % 3); // 2-4 values
    const selection = enums.slice(0, count);
    return `[${selection.join(', ')}]`;
  }

  // 30% numeric ranges (patterns 4-6)
  if (pattern <= 6) {
    const start = (procNum * 10) % 100;
    const end = start + 10 + ((setIndex * 7) % 50);
    return `[${start}..${end}]`;
  }

  // 20% mixed (patterns 7-8)
  if (pattern <= 8) {
    const discrete = (procNum + setIndex) % 10;
    const rangeStart = (procNum * 5) % 50;
    const rangeEnd = rangeStart + 10;
    const highValue = 90 + (setIndex % 10);
    return `[${discrete}, ${rangeStart}..${rangeEnd}, ${highValue}]`;
  }

  // 10% character ranges (pattern 9)
  const charPairs = [['A', 'Z'], ['a', 'z'], ['0', '9'], ['A', 'F']];
  const pair = charPairs[procNum % charPairs.length];
  return `['${pair[0]}'..'${pair[1]}']`;
}

/**
 * Generate a procedure with set literal expressions
 */
function generateProcedure(procNum: number, setsPerProcedure: number): string {
  const sets = Array.from({ length: setsPerProcedure }, (_, i) => ({
    literal: generateSetLiteral(procNum, i),
    varName: ['status', 'priority', 'category', 'type', 'level'][i % 5],
    index: i
  }));

  const lines: string[] = [];
  lines.push(`procedure ValidateSetLiterals${procNum}(Input${procNum}: Integer): Boolean`);
  lines.push(`var`);
  lines.push(`    ${sets[0].varName}${procNum}: Option;`);
  if (sets.length > 1) {
    lines.push(`    ${sets[1].varName}${procNum}: Integer;`);
  }
  if (sets.length > 2) {
    lines.push(`    ${sets[2].varName}${procNum}: Code[10];`);
  }
  lines.push(`    result${procNum}: Boolean;`);
  lines.push(`    counter${procNum}: Integer;`);
  lines.push(`begin`);
  lines.push(`    result${procNum} := false;`);
  lines.push(`    counter${procNum} := 0;`);
  lines.push(``);

  // First set literal in IF condition
  lines.push(`    if Input${procNum} in ${sets[0].literal} then begin`);
  lines.push(`        result${procNum} := true;`);
  lines.push(`        counter${procNum} += 1;`);
  lines.push(`    end;`);
  lines.push(``);

  // Second set literal in CASE statement (if available)
  if (sets.length > 1) {
    lines.push(`    case Input${procNum} of`);
    lines.push(`        ${sets[1].literal}:`);
    lines.push(`            begin`);
    lines.push(`                counter${procNum} += 10;`);
    lines.push(`                result${procNum} := true;`);
    lines.push(`            end;`);
    lines.push(`    end;`);
    lines.push(``);
  }

  // Third set literal in WHILE loop (if available)
  if (sets.length > 2) {
    lines.push(`    while (counter${procNum} < 100) and (Input${procNum} in ${sets[2].literal}) do begin`);
    lines.push(`        counter${procNum} += 1;`);
    lines.push(`        if counter${procNum} > 50 then`);
    lines.push(`            result${procNum} := false;`);
    lines.push(`    end;`);
    lines.push(``);
  }

  // Add nested IF with set literals for more complexity
  if (setsPerProcedure > 3) {
    for (let i = 3; i < sets.length; i++) {
      const depth = (i - 3) % 3;
      const indent = '    ' + '    '.repeat(depth);
      if (depth === 0) {
        lines.push(``);
        lines.push(`    if Input${procNum} in ${sets[i].literal} then begin`);
      } else {
        lines.push(`${indent}if counter${procNum} in ${sets[i].literal} then begin`);
      }
      lines.push(`${indent}    counter${procNum} += ${i};`);
      if (depth === 0) {
        lines.push(`    end;`);
      }
    }
    // Close any remaining nested blocks
    for (let d = 1; d < Math.min(3, setsPerProcedure - 3); d++) {
      const indent = '    ' + '    '.repeat(d);
      lines.push(`${indent}end;`);
    }
  }

  lines.push(``);
  lines.push(`    exit(result${procNum});`);
  lines.push(`end;`);
  lines.push(``);

  return lines.join('\n');
}

/**
 * Generate the complete set-literals.cal fixture
 */
function generateSetLiteralFixture(options: GeneratorOptions): void {
  const targetProcedures = options.targetProcedures || 40;
  const setsPerProcedure = options.setsPerProcedure || 3;

  const lines: string[] = [];

  // Object header
  lines.push(`OBJECT Codeunit 50100 "Set Literal Performance Test"`);
  lines.push(`{`);
  lines.push(`  OBJECT-PROPERTIES`);
  lines.push(`  {`);
  lines.push(`    Date=12/02/26;`);
  lines.push(`    Time=12:00:00;`);
  lines.push(`    Modified=Yes;`);
  lines.push(`    Version List=PERF-TEST;`);
  lines.push(`  }`);
  lines.push(`  PROPERTIES`);
  lines.push(`  {`);
  lines.push(`    SingleInstance=No;`);
  lines.push(`  }`);
  lines.push(`  CODE`);
  lines.push(`  {`);
  lines.push(``);

  // Generate procedures
  for (let i = 0; i < targetProcedures; i++) {
    lines.push(generateProcedure(i, setsPerProcedure));
  }

  // Add a master procedure that calls all validators
  lines.push(`procedure RunAllValidators(): Integer`);
  lines.push(`var`);
  lines.push(`    i: Integer;`);
  lines.push(`    passed: Integer;`);
  lines.push(`begin`);
  lines.push(`    passed := 0;`);
  lines.push(`    for i := 1 to 100 do begin`);
  for (let i = 0; i < Math.min(10, targetProcedures); i++) {
    lines.push(`        if ValidateSetLiterals${i}(i) then`);
    lines.push(`            passed += 1;`);
  }
  lines.push(`    end;`);
  lines.push(`    exit(passed);`);
  lines.push(`end;`);
  lines.push(``);

  // Close CODE and object
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``); // Trailing newline

  // Write to file
  const content = lines.join('\n');
  fs.writeFileSync(options.outputPath, content, 'utf-8');

  // Report statistics
  const lineCount = lines.length;
  const setCount = targetProcedures * setsPerProcedure;
  console.log(`✅ Generated set-literals.cal:`);
  console.log(`   Lines: ${lineCount}`);
  console.log(`   Procedures: ${targetProcedures}`);
  console.log(`   Set expressions: ${setCount}`);
  console.log(`   Path: ${options.outputPath}`);
}

// CLI support: ts-node generateSetLiteralFixture.ts
if (require.main === module) {
  const outputPath = path.join(__dirname, '../fixtures/set-literals.cal');
  generateSetLiteralFixture({
    outputPath,
    targetProcedures: 150, // ~150 procedures * ~32 lines/proc ≈ 4800 lines + overhead = ~5K
    setsPerProcedure: 3
  });
}

export { generateSetLiteralFixture, GeneratorOptions };
