---
name: cal-al-boundaries
description: Critical reference for what NOT to add to C/AL extension - lists all AL-only features (enums, interfaces, extensions, keywords, syntax) that would cause compilation errors in NAV. Use when considering AL feature requests, new syntax support, or feature additions.
---

# C/AL vs AL Boundaries

What NOT to include in this C/AL extension. These features are AL-only (Business Central 15+) and would cause compilation errors in NAV.

## AL-Only Object Types (DO NOT ADD)

| Object Type | Description | BC Version |
|-------------|-------------|------------|
| `ENUM` | Enumeration types | BC 15+ |
| `ENUMEXTENSION` | Extends enumerations | BC 15+ |
| `INTERFACE` | Interface definitions | BC 15+ |
| `PAGEEXTENSION` | Extends pages | BC 15+ |
| `PAGECUSTOMIZATION` | Page customizations | BC 15+ |
| `TABLEEXTENSION` | Extends tables | BC 15+ |
| `REPORTEXTENSION` | Extends reports | BC 15+ |
| `PROFILE` | User profiles | BC 15+ |
| `CONTROLADDIN` | Custom JS controls | BC 15+ |
| `PERMISSIONSET` | Permission definitions | BC 15+ |
| `PERMISSIONSETEXTENSION` | Extends permissions | BC 15+ |
| `ENTITLEMENT` | Licensing entitlements | BC 15+ |

## AL-Only Keywords (DO NOT ADD)

### Access Modifiers
- `INTERNAL` - Internal access (BC 19+)
- `PROTECTED` - Protected access (BC 19+)
- `PUBLIC` - Explicit public (BC 15+)

### Extension Syntax
- `EXTENDS` - Specifies object being extended
- `MODIFY` - Modifies existing elements
- `ADD`, `ADDFIRST`, `ADDLAST`, `ADDAFTER`, `ADDBEFORE` - Add elements
- `MOVEAFTER`, `MOVEBEFORE`, `MOVEFIRST`, `MOVELAST` - Reorder elements

### OOP Features
- `INTERFACE` - Interface declaration
- `IMPLEMENTS` - Interface implementation

### Other
- `NAMESPACE`, `USING` - Namespace system (BC 2023+)
- `RUNONCLIENT`, `SUPPRESSDISPOSE` - AL-specific modifiers

## AL-Only Syntax Features (DO NOT ADD)

| Feature | Description | BC Version |
|---------|-------------|------------|
| Ternary operator `? :` | Conditional expression | BC 2024 Wave 2+ |
| Verbatim strings `@'...'` | Raw string literals | BC 15+ |
| `///` XML comments | Documentation comments | BC 15+ |
| `#region` / `#endregion` | As preprocessor directives | BC 15+ |
| `#if`, `#else`, `#endif` | Conditional compilation | BC 15+ |
| `#define`, `#pragma` | Preprocessor directives | BC 15+ |
| `[IntegrationEvent]` | Modern attribute syntax | BC 15+ |
| `[BusinessEvent]` | Modern attribute syntax | BC 15+ |
| `[EventSubscriber]` | Modern attribute syntax | BC 15+ |

**Note**: This extension supports `#region`/`#endregion` as comment-based folding markers for user convenience, but they are not true preprocessor directives in C/AL.

## AL-Only Data Types (DO NOT ADD)

| Type | Description | BC Version |
|------|-------------|------------|
| `SecretText` | Encrypted text | BC 2023 Wave 2+ |
| `ErrorInfo` | Rich error information | BC 2021 Wave 2+ |
| `ErrorType` | Error type enumeration | BC 2021+ |
| `ExecutionContext` | Execution context | BC 2020+ |
| `ExecutionMode` | Execution mode | BC 2020+ |
| `JsonToken/Object/Array/Value` | Native JSON (use .NET in C/AL) | BC 2019+ |
| `HttpClient/Content/Headers` | Native HTTP (use .NET in C/AL) | BC 2019+ |

## Syntax Differences

### Event Declaration

**C/AL (correct for this extension)**:
```cal
PROCEDURE MyEvent@1000();
INTERNALEVENT
BEGIN
END;
```

**AL (DO NOT support)**:
```al
[IntegrationEvent(false, false)]
procedure MyEvent()
begin
end;
```

### Case Convention

**C/AL**: UPPERCASE keywords (convention)
```cal
BEGIN
  IF Customer.FIND('-') THEN
    MESSAGE('Found');
END;
```

**AL**: lowercase keywords
```al
begin
  if Customer.Find('-') then
    Message('Found');
end;
```

## Features That ARE Valid in C/AL

Sometimes confused as AL-only but actually work in C/AL:

| Feature | Status | Notes |
|---------|--------|-------|
| Compound operators `+=`, `-=`, `*=`, `/=` | C/AL (all versions) | Found in NAV 2018 standard code |
| `FOREACH` loop | C/AL (NAV 2016+) | .NET collection iteration |
| `EVENT`, `WITHEVENTS` | C/AL (NAV 2016+) | .NET event subscriptions |
| `DotNet` type | C/AL (NAV 2009+) | .NET interop |
| `[External]` attribute | C/AL | Public API marker |

## Version Feature Matrix

| Feature | NAV 2013 | NAV 2016 | NAV 2018 | BC 15+ |
|---------|----------|----------|----------|--------|
| Basic C/AL | Yes | Yes | Yes | No |
| `/* */` comments | Yes | Yes | Yes | Yes |
| Compound operators | Yes | Yes | Yes | Yes |
| FOREACH loop | No | Yes | Yes | Yes |
| .NET events | No | Yes | Yes | Yes |
| ENUM type | No | No | No | AL only |
| Extensions | No | No | No | AL only |
| Ternary `? :` | No | No | No | AL only |

## Why This Matters

Adding AL-only features to C/AL syntax highlighting would:
- Mislead developers about C/AL capabilities
- Create false positives in syntax highlighting
- Cause compilation errors when code is imported to C/SIDE
- Make the extension less trustworthy

**Remember**: Use Microsoft's official AL extension for Business Central 15+ development.

## Verification Methods

| Method | Purpose |
|--------|---------|
| [NAV 2018 docs](https://learn.microsoft.com/en-us/previous-versions/dynamicsnav-2018-developer/) | Official reference |
| [cal-open-library](https://github.com/microsoft/cal-open-library) | Real NAV standard code |
| Test in C/SIDE | Ultimate verification |
