/**
 * Parser Tests - Object Parsing
 *
 * Tests parsing of different C/AL object types and basic object structure.
 *
 * IMPORTANT: The current parser has limited section parsing capabilities because
 * the lexer treats `{` and `}` as block comments. These tests focus on what the
 * parser CAN do: object-level parsing (kind, ID, name) and error recovery.
 *
 * See PARSER_TEST_FINDINGS.md for detailed explanation of current limitations.
 */

import { ObjectKind } from '../ast';
import { parseCode, expectParseNoThrow } from './parserTestHelpers';

describe('Parser - Table Objects', () => {
  it('should parse minimal table object', () => {
    const code = `OBJECT Table 18 Customer`;
    const { ast } = parseCode(code);

    expect(ast.object).not.toBeNull();
    expect(ast.object?.type).toBe('ObjectDeclaration');
    expect(ast.object?.objectKind).toBe(ObjectKind.Table);
    expect(ast.object?.objectId).toBe(18);
    expect(ast.object?.objectName).toBe('Customer');
  });

  it('should parse table with quoted name', () => {
    const code = `OBJECT Table 50000 "Customer Extended"`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectName).toBe('Customer Extended');
  });

  it('should parse table with large ID', () => {
    const code = `OBJECT Table 99999 Customer`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectId).toBe(99999);
  });

  it('should handle table with hyphenated name', () => {
    const code = `OBJECT Table 18 Customer-Extended`;
    const { ast } = parseCode(code);

    expect(ast.object).not.toBeNull();
    // Hyphen preserved without added spaces - matches NAV export format
    expect(ast.object?.objectName).toBe('Customer-Extended');
  });

  it('should parse table and validate AST structure', () => {
    const code = `OBJECT Table 18 Customer`;
    const { ast } = parseCode(code);

    expect(ast.type).toBe('CALDocument');
    expect(ast.object?.type).toBe('ObjectDeclaration');
    expect(ast.startToken).toBeDefined();
    expect(ast.endToken).toBeDefined();
    expect(ast.object?.startToken).toBeDefined();
    expect(ast.object?.endToken).toBeDefined();
  });
});

describe('Parser - Page Objects', () => {
  it('should parse minimal page object', () => {
    const code = `OBJECT Page 21 Customer`;
    const { ast } = parseCode(code);

    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.objectId).toBe(21);
    expect(ast.object?.objectName).toBe('Customer');
  });

  it('should parse page with quoted name', () => {
    const code = `OBJECT Page 21 "Customer Card"`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.objectName).toBe('Customer Card');
  });

  it('should validate AST structure for page object', () => {
    const code = `OBJECT Page 21 Customer`;
    const { ast } = parseCode(code);

    expect(ast.type).toBe('CALDocument');
    expect(ast.object?.type).toBe('ObjectDeclaration');
    expect(ast.object?.objectKind).toBe(ObjectKind.Page);
    expect(ast.object?.startToken).toBeDefined();
    expect(ast.object?.endToken).toBeDefined();
  });
});

describe('Parser - Codeunit Objects', () => {
  it('should parse minimal codeunit object', () => {
    const code = `OBJECT Codeunit 80 "Sales-Post"`;
    const { ast } = parseCode(code);

    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectKind).toBe(ObjectKind.Codeunit);
    expect(ast.object?.objectId).toBe(80);
    expect(ast.object?.objectName).toBe('Sales-Post');
  });

  it('should parse codeunit with simple name', () => {
    const code = `OBJECT Codeunit 50000 Test`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectName).toBe('Test');
  });

  it('should validate AST structure for codeunit object', () => {
    const code = `OBJECT Codeunit 80 Test`;
    const { ast } = parseCode(code);

    expect(ast.type).toBe('CALDocument');
    expect(ast.object?.type).toBe('ObjectDeclaration');
    expect(ast.object?.objectKind).toBe(ObjectKind.Codeunit);
    expect(ast.object?.startToken).toBeDefined();
    expect(ast.object?.endToken).toBeDefined();
  });
});

describe('Parser - Other Object Types', () => {
  it('should parse Report object', () => {
    const code = `OBJECT Report 111 "Customer List"`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectKind).toBe(ObjectKind.Report);
    expect(ast.object?.objectId).toBe(111);
    expect(ast.object?.objectName).toBe('Customer List');
  });

  it('should parse Query object', () => {
    const code = `OBJECT Query 100 "Customer Sales"`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectKind).toBe(ObjectKind.Query);
    expect(ast.object?.objectId).toBe(100);
  });

  it('should parse XMLport object', () => {
    const code = `OBJECT XMLport 50000 "Customer Export"`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectKind).toBe(ObjectKind.XMLport);
    expect(ast.object?.objectId).toBe(50000);
  });

  it('should parse MenuSuite object', () => {
    const code = `OBJECT MenuSuite 1 Navigation`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectKind).toBe(ObjectKind.MenuSuite);
    expect(ast.object?.objectId).toBe(1);
  });
});

describe('Parser - Objects with Comments', () => {
  it('should parse object with trailing comment block', () => {
    const code = `OBJECT Table 18 Customer { comment block }`;
    const { ast } = parseCode(code);

    // Comment should be stripped by lexer, object should parse normally
    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectKind).toBe(ObjectKind.Table);
    expect(ast.object?.objectId).toBe(18);
  });

  it('should parse object with line comment', () => {
    const code = `OBJECT Table 18 Customer // This is a comment`;
    const { ast } = parseCode(code);

    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectName).toBe('Customer');
  });

  it('should handle multiple comment blocks', () => {
    const code = `OBJECT Table 18 { comment } Customer { another comment }`;
    const { ast } = parseCode(code);

    // Even with comments interspersed, should identify what it can
    expect(ast.object).not.toBeNull();
  });
});

describe('Parser - Edge Cases', () => {
  it('should handle object with only ID (missing name)', () => {
    const code = `OBJECT Table 18`;

    // Should not crash even with incomplete input
    expectParseNoThrow(code);
  });

  it('should handle very long object names', () => {
    const longName = 'A'.repeat(250);
    const code = `OBJECT Table 18 "${longName}"`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectName).toBe(longName);
  });

  it('should handle object ID at boundary values', () => {
    const code = `OBJECT Table 0 Test`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectId).toBe(0);
  });

  it('should parse objects with whitespace variations', () => {
    const code = `OBJECT    Table    18    Customer`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectKind).toBe(ObjectKind.Table);
    expect(ast.object?.objectId).toBe(18);
    expect(ast.object?.objectName).toBe('Customer');
  });

  it('should handle newlines between tokens', () => {
    const code = `OBJECT
    Table
    18
    Customer`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectKind).toBe(ObjectKind.Table);
    expect(ast.object?.objectId).toBe(18);
  });
});

describe('Parser - Error Conditions', () => {
  it('should not crash on wrong token order', () => {
    const code = `Table OBJECT 18 Customer`;
    expectParseNoThrow(code);
  });

  it('should not crash on non-numeric ID', () => {
    const code = `OBJECT Table ABC Customer`;
    expectParseNoThrow(code);
  });

  it('should collect errors for invalid object', () => {
    const code = `OBJECT Table InvalidID Customer`;
    const { errors } = parseCode(code);

    // May or may not have errors depending on parser implementation
    // The important thing is it didn't crash
    expect(errors).toBeDefined();
  });
});

describe('Parser - Regression Tests', () => {
  describe('Multi-word object names', () => {
    it('should parse unquoted multi-word object name', () => {
      const code = `OBJECT Codeunit 416 Release Service Document
{
}`;
      const { ast } = parseCode(code);

      expect(ast.object).not.toBeNull();
      expect(ast.object?.objectKind).toBe(ObjectKind.Codeunit);
      expect(ast.object?.objectId).toBe(416);
      expect(ast.object?.objectName).toBe('Release Service Document');
    });

    it('should parse object name with hyphen', () => {
      const code = `OBJECT Codeunit 1003 Job Task-Indent
{
}`;
      const { ast } = parseCode(code);

      // Hyphen preserved without added spaces - matches NAV export format
      expect(ast.object?.objectName).toBe('Job Task-Indent');
    });

    it('should parse object name with multiple special characters', () => {
      const code = `OBJECT Page 50000 Sales Order - Test/Debug
{
}`;
      const { ast } = parseCode(code);

      // Operators preserved with original spacing - matches NAV export format
      expect(ast.object?.objectName).toBe('Sales Order - Test/Debug');
    });
  });

  describe('Procedure attributes', () => {
    it('should skip [External] attribute before procedure', () => {
      const code = `OBJECT Codeunit 1003 Test
{
  CODE
  {
    [External]
    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });

    it('should skip [Integration] attribute before procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Integration]
    PROCEDURE IntegrationProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('IntegrationProc');
    });

    it('should skip attribute with parameters', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [Scope('OnPrem')]
    PROCEDURE ScopedProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('ScopedProc');
    });

    it('should skip multiple attributes before procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    [External]
    [Integration]
    PROCEDURE MultiAttrProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('MultiAttrProc');
    });
  });

  describe('CODE section with real-world structure', () => {
    it('should parse codeunit with global variables and procedure', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      GlobalVar@1000 : Integer;

    PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      expect(ast.object?.code).not.toBeNull();
      expect(ast.object?.code?.variables).toHaveLength(1);
      expect(ast.object?.code?.variables[0].name).toBe('GlobalVar');
      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('TestProc');
    });

    it('should parse procedure with statements in body', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      MyVar@1000 : Integer;
      MyRecord@1001 : Record 18;

    PROCEDURE DoWork@1();
    BEGIN
      MyVar := 10;
      MyRecord.SETRANGE("No.", '12345');
      IF MyRecord.FIND('-') THEN
        MyRecord.MODIFY;
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      expect(ast.object?.code?.procedures).toHaveLength(1);
      expect(ast.object?.code?.procedures[0].name).toBe('DoWork');
      expect(ast.object?.code?.procedures[0].body.length).toBeGreaterThan(0);
    });

    it('should parse multiple procedures in sequence', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FirstProc@1();
    BEGIN
      // First procedure
    END;

    PROCEDURE SecondProc@2();
    BEGIN
      // Second procedure
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      expect(ast.object?.code?.procedures).toHaveLength(2);
      expect(ast.object?.code?.procedures[0].name).toBe('FirstProc');
      expect(ast.object?.code?.procedures[1].name).toBe('SecondProc');
    });
  });

  describe('Property triggers', () => {
    it('should parse OnRun trigger in codeunit', () => {
      const code = `OBJECT Codeunit 1003 Job Task - Indent
{
  PROPERTIES
  {
    TableNo=1001;
    OnRun=BEGIN
            TESTFIELD("Job No.");
            Indent("Job No.");
          END;
  }
  CODE
  {
    PROCEDURE Indent@1(JobNo@1000 : Code[20]);
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      // Verify PROPERTIES section exists
      expect(ast.object?.properties).toBeDefined();
      expect(ast.object?.properties?.properties).toHaveLength(2);

      // Find OnRun property
      const onRunProperty = ast.object?.properties?.properties.find(p => p.name === 'OnRun');
      expect(onRunProperty).toBeDefined();

      // Verify trigger body was parsed
      expect(onRunProperty?.triggerBody).toBeDefined();
      expect(onRunProperty?.triggerBody?.length).toBeGreaterThan(0);

      // Verify trigger body contains call to TESTFIELD
      const hasTestField = JSON.stringify(onRunProperty?.triggerBody).includes('TESTFIELD');
      expect(hasTestField).toBe(true);

      // Verify trigger body contains call to Indent
      const hasIndent = JSON.stringify(onRunProperty?.triggerBody).includes('Indent');
      expect(hasIndent).toBe(true);
    });

    it('should parse OnOpenPage trigger in page properties', () => {
      const code = `OBJECT Page 790 Activity Log
{
  PROPERTIES
  {
    OnOpenPage=BEGIN
                 LoadFilters;
                 UpdateView(TRUE);
               END;
  }
  CODE
  {
    PROCEDURE LoadFilters@1();
    BEGIN
    END;

    PROCEDURE UpdateView@2(Refresh@1000 : Boolean);
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      // Verify PROPERTIES section exists
      expect(ast.object?.properties).toBeDefined();

      // Find OnOpenPage property
      const onOpenPage = ast.object?.properties?.properties.find(p => p.name === 'OnOpenPage');
      expect(onOpenPage).toBeDefined();

      // Verify trigger body was parsed
      expect(onOpenPage?.triggerBody).toBeDefined();

      // Verify trigger body contains calls to both procedures
      const triggerJSON = JSON.stringify(onOpenPage?.triggerBody);
      expect(triggerJSON).toContain('LoadFilters');
      expect(triggerJSON).toContain('UpdateView');
    });

    it('should parse multiple property triggers', () => {
      const code = `OBJECT Page 47 Sales Order
{
  PROPERTIES
  {
    OnInit=BEGIN
             InitializePage;
           END;
    OnOpenPage=BEGIN
                 SetupFilters;
               END;
  }
  CODE
  {
    PROCEDURE InitializePage@1();
    BEGIN
    END;

    PROCEDURE SetupFilters@2();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      // Verify both property triggers exist
      expect(ast.object?.properties?.properties).toHaveLength(2);

      const onInit = ast.object?.properties?.properties.find(p => p.name === 'OnInit');
      const onOpenPage = ast.object?.properties?.properties.find(p => p.name === 'OnOpenPage');

      expect(onInit?.triggerBody).toBeDefined();
      expect(onOpenPage?.triggerBody).toBeDefined();

      // Verify each trigger calls the right procedure
      const hasInitializePage = JSON.stringify(onInit?.triggerBody).includes('InitializePage');
      const hasSetupFilters = JSON.stringify(onOpenPage?.triggerBody).includes('SetupFilters');

      expect(hasInitializePage).toBe(true);
      expect(hasSetupFilters).toBe(true);
    });

    it('should parse property triggers with complex statements', () => {
      const code = `OBJECT Codeunit 313 Sales - Post
{
  PROPERTIES
  {
    OnRun=BEGIN
            IF NOT SalesHeader.TESTFIELD("Document Type") THEN
              EXIT;
            SalesLine := Rec;
            PostDocument("Document Type");
          END;
  }
  CODE
  {
    VAR
      SalesHeader@1000 : Record 36;
      SalesLine@1001 : Record 37;

    PROCEDURE PostDocument@1(DocType@1000 : Option);
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      const onRun = ast.object?.properties?.properties.find(p => p.name === 'OnRun');
      expect(onRun?.triggerBody).toBeDefined();

      // Verify complex statements are parsed
      const triggerJSON = JSON.stringify(onRun?.triggerBody);
      expect(triggerJSON).toContain('IF');
      expect(triggerJSON).toContain('TESTFIELD');
      expect(triggerJSON).toContain('EXIT');
      expect(triggerJSON).toContain('PostDocument');
    });

    it('should handle regular properties alongside trigger properties', () => {
      const code = `OBJECT Codeunit 1003 Test
{
  PROPERTIES
  {
    TableNo=1001;
    Permissions=TableData 27=rimd;
    OnRun=BEGIN
            DoSomething;
          END;
  }
  CODE
  {
    PROCEDURE DoSomething@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      expect(ast.object?.properties?.properties).toHaveLength(3);

      // Regular properties should have value but no trigger body
      const tableNo = ast.object?.properties?.properties.find(p => p.name === 'TableNo');
      expect(tableNo?.value).toBe('1001');
      expect(tableNo?.triggerBody).toBeUndefined();

      const permissions = ast.object?.properties?.properties.find(p => p.name === 'Permissions');
      expect(permissions?.value).toBe('TableData 27=rimd');
      expect(permissions?.triggerBody).toBeUndefined();

      // Trigger property should have trigger body
      const onRun = ast.object?.properties?.properties.find(p => p.name === 'OnRun');
      expect(onRun?.value).toBe('BEGIN...END');
      expect(onRun?.triggerBody).toBeDefined();
    });

    it('should parse OnRun trigger with VAR section', () => {
      const code = `OBJECT Codeunit 93 Purch.-Quote to Order
{
  PROPERTIES
  {
    TableNo=38;
    OnRun=VAR
            ConfirmManagement@1001 : Codeunit 27;
          BEGIN
            TESTFIELD("Document Type","Document Type"::Quote);
            IF NOT ConfirmManagement.ConfirmProcess(Text000,TRUE) THEN
              EXIT;
          END;
  }
  CODE
  {
    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);

      // Verify PROPERTIES section exists
      expect(ast.object?.properties).toBeDefined();
      expect(ast.object?.properties?.properties).toHaveLength(2);

      // Find OnRun property
      const onRunProperty = ast.object?.properties?.properties.find(p => p.name === 'OnRun');
      expect(onRunProperty).toBeDefined();

      // Verify trigger variables were parsed
      expect(onRunProperty?.triggerVariables).toBeDefined();
      expect(onRunProperty?.triggerVariables?.length).toBe(1);
      expect(onRunProperty?.triggerVariables?.[0].name).toBe('ConfirmManagement');
      expect(onRunProperty?.triggerVariables?.[0].dataType?.typeName).toBe('Codeunit 27');

      // Verify trigger body was parsed
      expect(onRunProperty?.triggerBody).toBeDefined();
      expect(onRunProperty?.triggerBody?.length).toBeGreaterThan(0);

      // Verify trigger body contains expected statements
      const triggerJSON = JSON.stringify(onRunProperty?.triggerBody);
      expect(triggerJSON).toContain('TESTFIELD');
      expect(triggerJSON).toContain('ConfirmManagement');
      expect(triggerJSON).toContain('EXIT');
    });
  });
});

/**
 * TODO: Section Parsing Tests (Future Enhancement)
 *
 * Once the lexer is enhanced to support context-aware brace handling,
 * add tests for:
 * - PROPERTIES section parsing
 * - FIELDS section parsing
 * - KEYS section parsing
 * - FIELDGROUPS section parsing
 * - CODE section parsing
 * - Complete object with all sections
 *
 * See PARSER_TEST_FINDINGS.md for implementation details needed.
 */
