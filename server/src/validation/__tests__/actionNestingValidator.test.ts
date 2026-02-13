/**
 * Action Nesting Validator Tests
 *
 * Tests for semantic validator that detects invalid action hierarchy in C/AL Page objects.
 *
 * The validator detects:
 * - Action/ActionGroup/Separator at root level (should be ActionContainer)
 * - ActionContainer nested inside another action (should be at root only)
 * - Action/Separator with child actions (should be leaf nodes)
 *
 * Valid C/AL Page action hierarchy:
 * - Root level: Only ActionContainer allowed
 * - ActionContainer children: Action, ActionGroup, Separator
 * - ActionGroup children: ActionGroup (nesting allowed), Action, Separator
 * - Action/Separator: Leaf nodes (no children)
 *
 * Diagnostic codes:
 * - 'action-nesting-root': Invalid action type at root level
 * - 'action-nesting-container': ActionContainer nested inside another action
 * - 'action-nesting-leaf': Leaf action (Action/Separator) has children
 *
 * Severity: Warning
 * Source: 'cal'
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { ActionNestingValidator } from '../actionNestingValidator';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../../semantic/builtinRegistry';
import { ValidationContext } from '../../semantic/types';

/**
 * Helper to parse C/AL code and run action nesting validation
 */
function validateActionNesting(
  code: string,
  warnActionNesting?: boolean
): Diagnostic[] {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const symbolTable = new SymbolTable();
  const builtins = new BuiltinRegistry();

  const context: ValidationContext = {
    ast,
    symbolTable,
    builtins,
    documentUri: 'file:///test.cal',
    settings: warnActionNesting !== undefined ? {
      diagnostics: {
        warnDeprecated: true,
        warnUnknownAttributes: true,
        warnActionNesting
      },
      workspaceIndexing: {
        includeTxtFiles: true
      }
    } : undefined
  };

  const validator = new ActionNestingValidator();
  return validator.validate(context);
}

describe('ActionNestingValidator - Valid Structures', () => {
  it('should not flag ActionContainer at root with Action children', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer;
                Name=ActionItems;
                ActionContainerType=ActionItems }
    { 1   ;1   ;Action  ;
                Name=NewAction;
                CaptionML=ENU=New }
    { 2   ;1   ;Action  ;
                Name=PostAction;
                CaptionML=ENU=Post }
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag ActionContainer at root with Separator children', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer }
    { 1   ;1   ;Separator }
    { 2   ;1   ;Action  ;
                Name=TestAction }
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag ActionContainer at root with ActionGroup children', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer }
    { 1   ;1   ;ActionGroup;
                Name=ProcessingGroup }
    { 2   ;2   ;Action  ;
                Name=ProcessAction }
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag ActionGroup with nested ActionGroup', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer }
    { 1   ;1   ;ActionGroup;
                Name=OuterGroup }
    { 2   ;2   ;ActionGroup;
                Name=InnerGroup }
    { 3   ;3   ;Action  ;
                Name=NestedAction }
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag ActionGroup with Action children', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer }
    { 1   ;1   ;ActionGroup;
                Name=MyGroup }
    { 2   ;2   ;Action  ;
                Name=Action1 }
    { 3   ;2   ;Action  ;
                Name=Action2 }
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag multiple ActionContainers at root', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer;
                Name=Container1 }
    { 1   ;1   ;Action  ;
                Name=Action1 }
    { 2   ;0   ;ActionContainer;
                Name=Container2 }
    { 3   ;1   ;Action  ;
                Name=Action2 }
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag empty ACTIONS section', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag non-page object (no ACTIONS section)', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DoSomething();
    BEGIN
    END;
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });
});

describe('ActionNestingValidator - Invalid: Root Violations', () => {
  it('should flag Action at root level', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;Action  ;
                Name=RootAction;
                CaptionML=ENU=Invalid }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe('Action cannot be a root action; expected ActionContainer');
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.code).toBe('action-nesting-root');
    expect(diag.source).toBe('cal');
  });

  it('should flag ActionGroup at root level', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionGroup;
                Name=RootGroup }
    { 1   ;1   ;Action  ;
                Name=ChildAction }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe('ActionGroup cannot be a root action; expected ActionContainer');
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.code).toBe('action-nesting-root');
    expect(diag.source).toBe('cal');
  });

  it('should flag Separator at root level', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;Separator }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe('Separator cannot be a root action; expected ActionContainer');
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.code).toBe('action-nesting-root');
    expect(diag.source).toBe('cal');
  });

  it('should flag only invalid root actions when mixed with valid ones', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer;
                Name=ValidContainer }
    { 1   ;1   ;Action  ;
                Name=ValidChild }
    { 2   ;0   ;Action  ;
                Name=InvalidRoot }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics.find(d => d.message.includes('InvalidRoot') || d.message.includes('root action'));
    expect(diag).toBeDefined();
    expect(diag!.code).toBe('action-nesting-root');
  });
});

describe('ActionNestingValidator - Invalid: Nested ActionContainer', () => {
  it('should flag ActionContainer inside ActionContainer', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer;
                Name=OuterContainer }
    { 1   ;1   ;ActionContainer;
                Name=NestedContainer }
    { 2   ;2   ;Action  ;
                Name=DeepAction }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe('ActionContainer must be at root level, not nested inside another action');
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.code).toBe('action-nesting-container');
    expect(diag.source).toBe('cal');
  });

  it('should flag ActionContainer inside ActionGroup', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer }
    { 1   ;1   ;ActionGroup;
                Name=MyGroup }
    { 2   ;2   ;ActionContainer;
                Name=InvalidNested }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe('ActionContainer must be at root level, not nested inside another action');
    expect(diag.code).toBe('action-nesting-container');
  });
});

describe('ActionNestingValidator - Invalid: Leaves with Children', () => {
  it('should flag Action with 1 child', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer }
    { 1   ;1   ;Action  ;
                Name=ParentAction }
    { 2   ;2   ;Action  ;
                Name=ChildAction }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe('Action cannot have child actions (has 1)');
    expect(diag.severity).toBe(DiagnosticSeverity.Warning);
    expect(diag.code).toBe('action-nesting-leaf');
    expect(diag.source).toBe('cal');
  });

  it('should flag Action with 3 children', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer }
    { 1   ;1   ;Action  ;
                Name=ParentAction }
    { 2   ;2   ;Action  ;
                Name=Child1 }
    { 3   ;2   ;Action  ;
                Name=Child2 }
    { 4   ;2   ;Action  ;
                Name=Child3 }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe('Action cannot have child actions (has 3)');
    expect(diag.code).toBe('action-nesting-leaf');
  });

  it('should flag Separator with children', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer }
    { 1   ;1   ;Separator }
    { 2   ;2   ;Action  ;
                Name=InvalidChild }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.message).toBe('Separator cannot have child actions (has 1)');
    expect(diag.code).toBe('action-nesting-leaf');
  });
});

describe('ActionNestingValidator - Configuration (warnActionNesting setting)', () => {
  it('should suppress warnings when warnActionNesting is false', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;Action  ;
                Name=InvalidRoot }
  }
}`;

    const diagnostics = validateActionNesting(code, false);

    // When warnActionNesting is false, no diagnostics should be returned
    expect(diagnostics).toHaveLength(0);
  });

  it('should show warnings when warnActionNesting is true', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionGroup;
                Name=InvalidRoot }
  }
}`;

    const diagnostics = validateActionNesting(code, true);

    // When warnActionNesting is true, diagnostics should be returned
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('ActionGroup cannot be a root action; expected ActionContainer');
  });

  it('should show warnings when settings is undefined (default behavior)', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;Separator }
  }
}`;

    // Pass undefined for settings to test default behavior
    const diagnostics = validateActionNesting(code, undefined);

    // When settings is undefined, default to showing warnings
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Separator cannot be a root action; expected ActionContainer');
  });

  it('should suppress all violations when disabled', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;Action  ;
                Name=RootViolation }
    { 1   ;1   ;ActionContainer;
                Name=NestedViolation }
    { 2   ;2   ;Action  ;
                Name=LeafWithChild }
    { 3   ;3   ;Action  ;
                Name=GrandChild }
  }
}`;

    const diagnostics = validateActionNesting(code, false);

    // All warnings should be suppressed
    expect(diagnostics).toHaveLength(0);
  });
});

describe('ActionNestingValidator - Recovery (rawActionType set)', () => {
  it('should skip Action with rawActionType set at root', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;UnknownType }
  }
}`;

    const diagnostics = validateActionNesting(code);

    // Parser sets rawActionType for unknown types - validator should skip
    expect(diagnostics).toHaveLength(0);
  });
});

describe('ActionNestingValidator - Multiple Violations', () => {
  it('should report all violations in complex hierarchy', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer;
                Name=ValidRoot }
    { 1   ;1   ;Action  ;
                Name=LeafWithChild }
    { 2   ;2   ;Action  ;
                Name=Child }
    { 3   ;0   ;Action  ;
                Name=InvalidRoot }
  }
}`;

    const diagnostics = validateActionNesting(code);

    // Should report: leaf with children + invalid root
    expect(diagnostics.length).toBeGreaterThanOrEqual(2);

    const leafError = diagnostics.find(d => d.code === 'action-nesting-leaf');
    expect(leafError).toBeDefined();

    const rootError = diagnostics.find(d => d.code === 'action-nesting-root');
    expect(rootError).toBeDefined();
  });
});

describe('ActionNestingValidator - Diagnostic Range Accuracy', () => {
  it('should position diagnostic on the action definition', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;Action  ;
                Name=InvalidRoot }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);

    // Range should be defined and span the action
    const range = diagnostics[0].range;
    expect(range).toBeDefined();
    expect(range.start.line).toBeLessThanOrEqual(range.end.line);
    expect(range.start.character).toBeLessThan(range.end.character);
  });
});

describe('ActionNestingValidator - Edge Cases', () => {
  it('should handle code with no ACTIONS section gracefully', () => {
    const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should handle empty Page object', () => {
    const code = `OBJECT Page 50000 Test
{
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should handle parse errors gracefully', () => {
    const code = `OBJECT InvalidType 1 Test
{
  ACTIONS
  {
    { 0   ;0   ;Action
  }
}`;

    // Should not throw even if there are parse errors
    expect(() => validateActionNesting(code)).not.toThrow();
  });
});

describe('ActionNestingValidator - Real-World Patterns', () => {
  it('should validate typical list page action structure', () => {
    const code = `OBJECT Page 22 "Customer List"
{
  ACTIONS
  {
    { 0   ;0   ;ActionContainer;
                Name=ActionItems;
                ActionContainerType=ActionItems }
    { 1   ;1   ;ActionGroup;
                Name=New;
                CaptionML=ENU=New }
    { 2   ;2   ;Action  ;
                Name=NewCustomer;
                CaptionML=ENU=Customer }
    { 3   ;2   ;Action  ;
                Name=NewContact;
                CaptionML=ENU=Contact }
    { 4   ;1   ;Separator }
    { 5   ;1   ;ActionGroup;
                Name=Process;
                CaptionML=ENU=Process }
    { 6   ;2   ;Action  ;
                Name=Statistics;
                CaptionML=ENU=Statistics }
  }
}`;

    const diagnostics = validateActionNesting(code);
    expect(diagnostics).toHaveLength(0);
  });

  it('should catch migrated AL structure with root ActionGroup', () => {
    const code = `OBJECT Page 50000 TestPage
{
  ACTIONS
  {
    { 0   ;0   ;ActionGroup;
                Name=Creation;
                CaptionML=ENU=New }
    { 1   ;1   ;Action  ;
                Name=NewDocument;
                CaptionML=ENU=New Document }
  }
}`;

    const diagnostics = validateActionNesting(code);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('ActionGroup cannot be a root action; expected ActionContainer');
  });
});
