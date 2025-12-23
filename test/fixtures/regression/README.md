# Regression Test Fixtures

## Purpose

Real-world C/AL code files for regression testing the language server. These files ensure that the lexer, parser, and language server can handle actual production-quality C/AL code without errors.

## Source

Files sourced from:
- **Microsoft cal-open-library** (archived): https://github.com/microsoft/cal-open-library
  - Repository archived November 16, 2023
  - Originally contained .NET Interop wrappers for Dynamics 365 for Financials
- **Existing project test files** (test-sample.cal, example.cal, COD files)

## License

Files from Microsoft's cal-open-library are licensed under the **MIT License**.

Copyright (c) Microsoft Corporation. All rights reserved.

See: https://github.com/microsoft/cal-open-library/blob/master/LICENSE

## Files

| File | Object Type | ID | Description | Complexity | Size |
|------|-------------|-----|-------------|------------|------|
| table-18-customer.cal | Table | 18 | Customer master table with basic fields and procedures | Simple | 1.4K |
| table-50000-customer-extended.cal | Table | 50000 | Extended customer table with CalcFormula, FlowFields, and triggers | Complex | 8.9K |
| table-1223-data-exch-column-def.cal | Table | 1223 | Data exchange column definitions with complex properties | Medium | 7.4K |
| codeunit-93-purch-quote-to-order.cal | Codeunit | 93 | Purchase quote conversion to order | Simple | 1.4K |
| codeunit-416-release-service-document.cal | Codeunit | 416 | Service document release logic | Medium | 4.1K |
| codeunit-9-acc-sched-kpi-dimensions.cal | Codeunit | 9 | Account schedule KPI dimensions with complex business logic | Complex | 39K |
| page-1216-data-exch-col-def-part.cal | Page | 1216 | List part page for data exchange column definitions | Simple | 5.5K |
| page-1799-data-migration-overview.cal | Page | 1799 | Data migration overview dashboard with actions and styling | Medium | 15K |
| xmlport-1225-data-exch-def-mapping.cal | XMLport | 1225 | Import/export data exchange definitions and mappings | Complex | 47K |

**Total:** 9 files covering 5 object types

## Object Type Coverage

- ✅ **Tables** (3 files): Simple, medium, and complex examples
- ✅ **Codeunits** (3 files): Simple, medium, and complex business logic
- ✅ **Pages** (2 files): List part and overview dashboard
- ✅ **XMLports** (1 file): Complex XML import/export
- ⚠️ **Reports** (0 files): Not available in source repository

## Complexity Breakdown

- **Simple** (2 files): Basic structure, minimal logic
- **Medium** (3 files): Moderate complexity, some business logic
- **Complex** (4 files): Advanced features (CalcFormulas, extensive code, nested structures)

## Usage

These fixtures are used by the regression test suite in:
`c-al-extension/server/src/__tests__/regression.test.ts`

The regression tests:
1. Parse each fixture file without errors
2. Generate AST structure for each object
3. Use Jest snapshots to detect unintended changes
4. Ensure backwards compatibility during refactoring

## File Naming Convention

Files follow the pattern: `<object-type>-<id>-<descriptive-name>.cal`

Examples:
- `table-18-customer.cal`
- `codeunit-93-purch-quote-to-order.cal`
- `page-1216-data-exch-col-def-part.cal`

## Key Features Tested

These fixtures collectively test:

- **Lexer features:**
  - Quoted identifiers (e.g., "No.", "Credit Limit")
  - Various comment styles
  - Date/time literals
  - String literals with localization
  - Operators and special characters

- **Parser features:**
  - Object declarations (OBJECT Table/Codeunit/Page/XMLport)
  - PROPERTIES sections
  - FIELDS sections with complex properties
  - KEYS sections
  - CODE sections with procedures
  - Page CONTROLS and ACTIONS
  - XMLport hierarchical structure
  - CalcFormula expressions
  - FlowFields
  - TableRelation properties
  - Triggers (OnInsert, OnModify, OnDelete, OnValidate, etc.)

- **Edge cases:**
  - Nested structures
  - Complex multilingual text constants
  - Integration attributes
  - External procedures
  - Temporary records
  - Large files (39K-47K)

## Maintenance

When updating fixtures:

1. **Adding new fixtures:** Follow the naming convention and update this README
2. **Removing fixtures:** Document reason and update tests
3. **Modifying fixtures:** Review and update Jest snapshots if needed

## Notes

- Files use `.cal` extension (standard for C/AL language)
- Original source files used `.TXT` extension in cal-open-library
- All files are from production-quality Microsoft code
- Files represent real-world NAV/Business Central objects
- Fixtures are static and should not be modified during tests

---

**Last Updated:** 2025-11-14
**Total Files:** 9
**Total Size:** ~130K
