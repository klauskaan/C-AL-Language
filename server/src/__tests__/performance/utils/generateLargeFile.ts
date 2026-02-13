/**
 * Programmatic generator for large CAL test files
 * This avoids token limits by generating code programmatically rather than via LLM
 *
 * ## Deterministic Generation
 *
 * The generator uses a seeded PRNG (Mulberry32) to ensure reproducible output:
 * - Same seed + parameters = identical output (byte-for-byte)
 * - Different seeds = different template selection and content
 * - Default seed is 42 when not specified
 *
 * This makes performance benchmarks stable and reproducible across:
 * - Different machines
 * - Different runs
 * - Different developers
 *
 * To regenerate fixtures deterministically:
 * ```bash
 * npx ts-node generateLargeFile.ts 5000 fixtures/huge.cal medium
 * npx ts-node generateLargeFile.ts 10000 fixtures/enormous.cal complex
 * npx ts-node generateLargeFile.ts 5000 fixtures/huge.cal medium 12345
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface GeneratorOptions {
  targetLines: number;
  outputPath: string;
  complexity?: 'simple' | 'medium' | 'complex';
  seed?: number;
  silent?: boolean;
}

/**
 * Mulberry32 - Fast and simple seeded PRNG
 * https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Templates for different CAL code patterns
 */
const templates = {
  procedure: (num: number, complexity: string) => {
    if (complexity === 'simple') {
      return `
procedure CalculateTotal${num}(ItemCode: Code[20]; Quantity: Decimal): Decimal
var
    UnitPrice: Decimal;
    Total: Decimal;
begin
    UnitPrice := GetUnitPrice${num}(ItemCode);
    Total := UnitPrice * Quantity;
    exit(Total);
end;
`;
    } else if (complexity === 'medium') {
      return `
procedure ProcessOrder${num}(OrderNo: Code[20]; CustomerNo: Code[20]): Boolean
var
    OrderHeader: Record "Sales Header";
    OrderLine: Record "Sales Line";
    Customer: Record Customer;
    Total: Decimal;
    Discount: Decimal;
    FinalAmount: Decimal;
begin
    if not OrderHeader.Get(OrderHeader."Document Type"::Order, OrderNo) then
        exit(false);

    if not Customer.Get(CustomerNo) then
        Error('Customer %1 not found', CustomerNo);

    Total := 0;
    OrderLine.SetRange("Document Type", OrderHeader."Document Type");
    OrderLine.SetRange("Document No.", OrderNo);
    if OrderLine.FindSet() then
        repeat
            Total += OrderLine.Amount;
        until OrderLine.Next() = 0;

    Discount := Total * Customer."Discount %" / 100;
    FinalAmount := Total - Discount;

    OrderHeader."Amount Including VAT" := FinalAmount;
    OrderHeader.Modify();

    exit(true);
end;
`;
    } else { // complex
      return `
procedure ComplexBusinessLogic${num}(
    DocumentNo: Code[20];
    PostingDate: Date;
    AccountNo: Code[20];
    Amount: Decimal;
    DimensionSetID: Integer
): Boolean
var
    GenJournalLine: Record "Gen. Journal Line";
    GLEntry: Record "G/L Entry";
    DimensionValue: Record "Dimension Value";
    TempDimSetEntry: Record "Dimension Set Entry" temporary;
    LastEntryNo: Integer;
    VATAmount: Decimal;
    BaseAmount: Decimal;
    TotalAmount: Decimal;
    i: Integer;
begin
    // Initialize variables
    VATAmount := 0;
    BaseAmount := Amount;
    TotalAmount := 0;

    // Validate account
    if AccountNo = '' then
        Error('Account number cannot be empty');

    // Check if document already posted
    GLEntry.SetRange("Document No.", DocumentNo);
    if not GLEntry.IsEmpty() then
        Error('Document %1 already posted', DocumentNo);

    // Calculate VAT
    if PostingDate >= DMY2Date(1, 1, 2024) then
        VATAmount := BaseAmount * 0.25
    else
        VATAmount := BaseAmount * 0.20;

    TotalAmount := BaseAmount + VATAmount;

    // Process dimension set
    if DimensionSetID <> 0 then begin
        TempDimSetEntry.SetRange("Dimension Set ID", DimensionSetID);
        if TempDimSetEntry.FindSet() then
            repeat
                if not DimensionValue.Get(
                    TempDimSetEntry."Dimension Code",
                    TempDimSetEntry."Dimension Value Code"
                ) then
                    Error(
                        'Dimension Value %1 %2 not found',
                        TempDimSetEntry."Dimension Code",
                        TempDimSetEntry."Dimension Value Code"
                    );
            until TempDimSetEntry.Next() = 0;
    end;

    // Create journal line
    GenJournalLine.Init();
    GenJournalLine."Line No." := GetNextLineNo${num}();
    GenJournalLine."Document No." := DocumentNo;
    GenJournalLine."Posting Date" := PostingDate;
    GenJournalLine."Account Type" := GenJournalLine."Account Type"::"G/L Account";
    GenJournalLine."Account No." := AccountNo;
    GenJournalLine.Amount := TotalAmount;
    GenJournalLine."VAT Amount" := VATAmount;
    GenJournalLine."Dimension Set ID" := DimensionSetID;
    GenJournalLine.Insert();

    // Post the entry
    GLEntry.Init();
    if GLEntry.FindLast() then
        LastEntryNo := GLEntry."Entry No."
    else
        LastEntryNo := 0;

    GLEntry."Entry No." := LastEntryNo + 1;
    GLEntry."G/L Account No." := AccountNo;
    GLEntry."Posting Date" := PostingDate;
    GLEntry."Document Type" := GLEntry."Document Type"::Invoice;
    GLEntry."Document No." := DocumentNo;
    GLEntry.Amount := TotalAmount;
    GLEntry."VAT Amount" := VATAmount;
    GLEntry."Dimension Set ID" := DimensionSetID;
    GLEntry.Insert();

    // Perform validation loops
    for i := 1 to 10 do begin
        if GLEntry.Amount <> TotalAmount then
            Error('Amount mismatch in iteration %1', i);
    end;

    exit(true);
end;
`;
    }
  },

  helperFunction: (num: number) => `
procedure GetUnitPrice${num}(ItemCode: Code[20]): Decimal
var
    Item: Record Item;
begin
    if Item.Get(ItemCode) then
        exit(Item."Unit Price")
    else
        exit(0);
end;
`,

  helperFunction2: (num: number) => `
procedure GetNextLineNo${num}(): Integer
var
    GenJnlLine: Record "Gen. Journal Line";
begin
    if GenJnlLine.FindLast() then
        exit(GenJnlLine."Line No." + 10000)
    else
        exit(10000);
end;
`,

  tableDefinition: (num: number) => `
table ${50000 + num} "Custom Table ${num}"
{
    DataClassification = CustomerContent;

    fields
    {
        field(1; "Entry No."; Integer)
        {
            DataClassification = CustomerContent;
            AutoIncrement = true;
        }
        field(2; "Code"; Code[20])
        {
            DataClassification = CustomerContent;
        }
        field(3; "Description"; Text[100])
        {
            DataClassification = CustomerContent;
        }
        field(4; "Amount"; Decimal)
        {
            DataClassification = CustomerContent;
        }
        field(5; "Date"; Date)
        {
            DataClassification = CustomerContent;
        }
    }

    keys
    {
        key(PK; "Entry No.")
        {
            Clustered = true;
        }
    }
}
`,

  pageDefinition: (num: number) => `
page ${50000 + num} "Custom List ${num}"
{
    PageType = List;
    SourceTable = "Custom Table ${num}";
    UsageCategory = Lists;
    ApplicationArea = All;

    layout
    {
        area(Content)
        {
            repeater(Group)
            {
                field("Entry No."; "Entry No.")
                {
                    ApplicationArea = All;
                }
                field("Code"; "Code")
                {
                    ApplicationArea = All;
                }
                field("Description"; "Description")
                {
                    ApplicationArea = All;
                }
                field("Amount"; "Amount")
                {
                    ApplicationArea = All;
                }
            }
        }
    }
}
`
};

/**
 * Generate a large CAL file programmatically
 */
export function generateLargeFile(options: GeneratorOptions): void {
  const { targetLines, outputPath, complexity = 'medium', seed = 42, silent = false } = options;

  // Initialize seeded PRNG
  const random = mulberry32(seed);

  let content = '';
  let currentLines = 0;

  // Add file header
  content += `// Auto-generated CAL file for performance testing\n`;
  content += `// Target: ${targetLines} lines\n`;
  content += `// Complexity: ${complexity}\n`;
  content += `// Seed: ${seed}\n\n`;
  currentLines += 5;

  content += `codeunit 50000 "Performance Test Large File"\n{\n`;
  currentLines += 2;

  let procedureNum = 0;
  let tableNum = 0;
  let pageNum = 0;

  // Generate content until we reach target lines
  while (currentLines < targetLines - 100) { // Leave room for closing
    const choice = random();

    if (choice < 0.5) {
      // Generate main procedure
      const proc = templates.procedure(procedureNum++, complexity);
      content += proc;
      currentLines += proc.split('\n').length;

      // Add helper function for simple/medium complexity
      if (complexity !== 'complex') {
        const helper = templates.helperFunction(procedureNum - 1);
        content += helper;
        currentLines += helper.split('\n').length;
      } else {
        const helper = templates.helperFunction2(procedureNum - 1);
        content += helper;
        currentLines += helper.split('\n').length;
      }
    } else if (choice < 0.75) {
      // Generate table definition
      const table = templates.tableDefinition(tableNum++);
      content += table;
      currentLines += table.split('\n').length;
    } else {
      // Generate page definition
      const page = templates.pageDefinition(pageNum++);
      content += page;
      currentLines += page.split('\n').length;
    }
  }

  // Close codeunit
  content += `}\n`;
  currentLines += 1;

  // Write to file
  const fullPath = path.resolve(outputPath);
  try {
    fs.writeFileSync(fullPath, content, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: Failed to write file: ${errorMessage}`);
    throw error;
  }

  if (!silent) {
    console.log(`Generated ${currentLines} lines in ${fullPath}`);
    console.log(`Procedures: ${procedureNum}`);
    console.log(`Tables: ${tableNum}`);
    console.log(`Pages: ${pageNum}`);
  }
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);

  // Validate target lines
  const targetLines = parseInt(args[0] || '5000', 10);
  if (isNaN(targetLines) || targetLines <= 0) {
    console.error(`Error: Invalid target lines "${args[0]}". Must be a positive number.`);
    process.exit(1);
  }

  const MAX_TARGET_LINES = 100000;
  if (targetLines > MAX_TARGET_LINES) {
    console.error(`Error: Target lines (${targetLines}) exceeds maximum of ${MAX_TARGET_LINES}`);
    process.exit(1);
  }

  // Validate output path
  const outputPath = args[1] || path.join(__dirname, '../fixtures/huge.cal');
  const outputDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outputDir)) {
    console.error(`Error: Output directory does not exist: ${outputDir}`);
    process.exit(1);
  }

  // Validate complexity with type safety
  const complexityArg = args[2] || 'medium';
  const validComplexities = ['simple', 'medium', 'complex'] as const;
  if (!validComplexities.includes(complexityArg as any)) {
    console.error(`Error: Invalid complexity "${complexityArg}". Must be one of: ${validComplexities.join(', ')}`);
    process.exit(1);
  }
  const complexity = complexityArg as 'simple' | 'medium' | 'complex';

  // Validate seed (optional, defaults to 42)
  let seed: number | undefined;
  if (args[3]) {
    seed = parseInt(args[3], 10);
    if (isNaN(seed) || seed <= 0) {
      console.error(`Error: Invalid seed "${args[3]}". Must be a positive number.`);
      process.exit(1);
    }
  }

  generateLargeFile({ targetLines, outputPath, complexity, seed });
}
