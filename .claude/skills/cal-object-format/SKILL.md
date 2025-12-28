---
name: cal-object-format
description: Structure and format of C/AL text exports from C/SIDE, including critical context-dependent curly brace handling, object types, field definitions, and the Documentation Trigger
---

# C/AL Object Text Format

Structure and format of C/AL text exports from C/SIDE.

## Object Declaration

```cal
OBJECT <ObjectType> <ObjectID> <ObjectName>
{
  OBJECT-PROPERTIES { ... }
  PROPERTIES { ... }
  <TYPE-SPECIFIC-SECTIONS> { ... }
  CODE { ... }
}
```

## Object Types

| Object | Sections | Notes |
|--------|----------|-------|
| Table | FIELDS, KEYS, FIELDGROUPS, CODE | Primary data structure |
| Page | CONTROLS, CODE | UI definition with indent levels |
| Codeunit | CODE (with Permissions) | Business logic |
| Report | DATASET, REQUESTPAGE, LABELS, CODE | Data output |
| XMLport | ELEMENTS, REQUESTPAGE, CODE | Data import/export |
| Query | ELEMENTS, CODE | SQL-like queries (NAV 2013+) |
| Form | CONTROLS, CODE | Legacy (pre-NAV 2013) |
| Dataport | DATAITEM, FIELDS | Legacy (pre-NAV 2013) |
| MenuSuite | - | Menu definitions |

## Context-Dependent Curly Braces

**Most important C/AL concept**: `{ }` serve DIFFERENT purposes depending on context.

### 1. Structural Delimiters (NOT Comments)

In FIELDS, KEYS, CONTROLS, FIELDGROUPS - `{ }` define structure:

**FIELDS Section** (column-based):
```cal
FIELDS
{
  { 1   ;   ;No.                 ;Code20        ;CaptionML=ENU=No. }
  { 2   ;   ;Name                ;Text50        ;CaptionML=ENU=Name }
  { 3   ;   ;Balance             ;Decimal       ;FieldClass=FlowField;
                                                  CalcFormula=Sum(...) }
}
```
Format: `{ FieldNo ; (reserved) ; FieldName ; DataType ; Properties }`

Note: The second column is always empty in NAV text exports. FlowField/FlowFilter designation appears in the Properties section as `FieldClass=FlowField` or `FieldClass=FlowFilter`.

**KEYS Section**:
```cal
KEYS
{
  {    ;No.                                     ;Clustered=Yes }
  {    ;Name,City                                }
}
```
Format: `{ ; FieldList ; Properties }`

**CONTROLS Section** (Pages):
```cal
CONTROLS
{
  { 1   ;0           ;Container   ;ContainerType=ContentArea }
  { 2   ;1           ;Group       ;CaptionML=ENU=General }
  { 3   ;2           ;Field       ;SourceExpr="No." }
}
```
Format: `{ ID ; IndentLevel ; ControlType ; Properties }`

### 2. Comments (Only in CODE blocks)

`{ }` can be comments ONLY inside `BEGIN...END` blocks:

```cal
PROCEDURE MyProc@1();
BEGIN
  { This is a valid comment }
  MESSAGE('Test');

  IF condition THEN BEGIN
    { Also valid - inside nested BEGIN/END }
  END;
END;
```

**NOT allowed as comments**:
- After OBJECT declaration
- After section keywords (PROPERTIES, FIELDS, etc.)
- Inside FIELDS/KEYS/CONTROLS/FIELDGROUPS definitions

### How to Distinguish

| Context | Purpose | Example |
|---------|---------|---------|
| Inside FIELDS/KEYS/CONTROLS | Structure | `{ 1 ; ; No. ;Code20 }` |
| Pattern `{ Number ;` | Field definition | NOT a comment |
| Inside CODE, between statements | Comment | `{ This is a comment }` |

## Documentation Trigger

The final `BEGIN...END.` block (note the period) is the Documentation Trigger:

```cal
CODE
{
  // ... procedures ...

  BEGIN
    {
      CHANGELOG
      ---------
      2024-01-15 JD: FEATURE-123 Added credit limit validation
      2023-12-01 AB: BUG-456 Fixed posting date calculation
    }
  END.
}
```

**Key points**:
- Period `.` after `END` is mandatory
- In C/SIDE: Appears FIRST in trigger list, content shown without braces
- In raw .txt: Appears LAST in CODE section, content wrapped in braces
- Used for changelog and object documentation
- Identifier codes (e.g., `FEATURE-123`) link to code comments

## CalcFormula Property Keywords

Used in calculated fields:

**Filter Keywords**: `FIELD`, `FILTER`, `CONST`, `WHERE`, `TABLEDATA`
**Aggregation**: `SUM`, `AVERAGE`, `COUNT`, `MIN`, `MAX`, `LOOKUP`, `EXIST`
**Ordering**: `ASCENDING`, `DESCENDING`, `ORDER`, `SORTING`, `UPPERLIMIT`

Example:
```cal
CalcFormula=Sum("Cust. Ledger Entry".Amount WHERE ("Customer No."=FIELD(No.)))
```

## Complete Table Example

```cal
OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=26-11-15;
    Time=07:00:00;
    Version List=NAVW19.00.00.43402;
  }
  PROPERTIES
  {
    DataCaptionFields=No.,Name;
    OnInsert=BEGIN
               CheckCreditLimit;
             END;
  }
  FIELDS
  {
    { 1   ;   ;No.                 ;Code20        ;CaptionML=ENU=No. }
    { 2   ;   ;Name                ;Text50        ;CaptionML=ENU=Name }
    { 3   ;   ;Balance             ;Decimal       ;FieldClass=FlowField;
                                                    CalcFormula=Sum("Cust. Ledger Entry".Amount WHERE ("Customer No."=FIELD(No.))) }
  }
  KEYS
  {
    {    ;No.                                     ;Clustered=Yes }
    {    ;Name                                     }
  }
  CODE
  {
    VAR
      Text001@1000 : TextConst 'ENU=Customer %1 not found.';

    PROCEDURE CheckCreditLimit@1();
    BEGIN
      CALCFIELDS(Balance);
      IF Balance > "Credit Limit (LCY)" THEN
        ERROR('Credit limit exceeded');
    END;

    BEGIN
    END.
  }
}
```
