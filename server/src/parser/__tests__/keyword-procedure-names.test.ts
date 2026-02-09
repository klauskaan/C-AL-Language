/**
 * REGRESSION TESTS: Keywords as Procedure Names
 *
 * Tests support for using certain C/AL keywords as procedure names.
 * This is a valid pattern in C/AL where keywords are contextually recognized.
 *
 * Issue #258: Parser rejects `PROCEDURE Break@17();` but real NAV code uses it
 * Example from REP6005597.TXT line 835: PROCEDURE Break@17();
 * Example call from REP6005597.TXT lines 354, 371: "Break"; (quoted syntax)
 *
 * Context: C/AL allows some keywords to be reused as procedure names when called
 * using quoted syntax ("Break" instead of Break). The parser must:
 * 1. Allow the keyword in procedure declarations
 * 2. Parse quoted calls correctly as procedure calls
 * 3. Maintain unquoted keyword behavior (e.g., Break = BREAK statement)
 */

import { parseCode, tokenize } from './parserTestHelpers';
import { TokenType } from '../../lexer/tokens';
import {
  BreakStatement,
  CallStatement,
  IfStatement,
  ObjectKind,
  RepeatStatement,
} from '../ast';

describe('Parser - Keywords as Procedure Names', () => {
  describe('Break keyword as procedure name', () => {
    it('should parse PROCEDURE Break@1() declaration', () => {
      // Test that Break can be used as a procedure name
      // Reference: REP6005597.TXT line 835
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Break@1();
    BEGIN
      ERROR('Break procedure called');
    END;
  }
}`;

      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const proc = procedures[0];
      expect(proc.name).toBe('Break');
      // Procedure ID is embedded in the name via nameToken, not a separate field
      expect(proc.type).toBe('ProcedureDeclaration');
    });

    it('should parse quoted "Break" as procedure call', () => {
      // Test that quoted syntax calls the Break procedure
      // Reference: REP6005597.TXT lines 354, 371
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Break@1();
    BEGIN
    END;

    PROCEDURE Test@2();
    BEGIN
      "Break";
    END;
  }
}`;

      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(2);

      // Verify Break procedure declaration
      expect(procedures[0].name).toBe('Break');

      // Verify Test procedure contains call to Break
      expect(procedures[1].name).toBe('Test');
      const testBody = procedures[1].body;
      expect(testBody).toHaveLength(1);

      const callStmt = testBody[0] as CallStatement;
      expect(callStmt.type).toBe('CallStatement');

      // The call expression should be a quoted identifier
      expect(callStmt.expression.type).toBe('Identifier');
      const identifier = callStmt.expression as any;
      expect(identifier.name).toBe('Break');
      expect(identifier.isQuoted).toBe(true);
    });
  });

  describe('Regression guards - existing behavior', () => {
    it('should parse unquoted Break as BREAK statement, not procedure call', () => {
      // Verify that unquoted Break remains a BREAK statement keyword
      // This ensures we don't break existing control flow parsing
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    BEGIN
      REPEAT
        IF TRUE THEN
          Break;
      UNTIL FALSE;
    END;
  }
}`;

      const { ast, errors } = parseCode(code);

      // SHOULD PASS: Existing BREAK statement parsing
      expect(errors).toHaveLength(0);
      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);

      const proc = procedures[0];
      const procBody = proc.body;
      expect(procBody).toHaveLength(1);

      const repeatStmt = procBody[0] as RepeatStatement;
      expect(repeatStmt.type).toBe('RepeatStatement');
      expect(repeatStmt.body).toHaveLength(1);

      const ifStmt = repeatStmt.body[0] as IfStatement;
      expect(ifStmt.type).toBe('IfStatement');

      const breakStmt = ifStmt.thenBranch as BreakStatement;
      expect(breakStmt.type).toBe('BreakStatement');
      // Critical: BREAK statement has NO value field (unlike EXIT)
      expect((breakStmt as any).value).toBeUndefined();
    });

    it('should reject IF as variable name', () => {
      // Control flow keywords should remain disallowed as identifiers
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      If@1000 : Integer;
  }
}`;

      const { errors } = parseCode(code);

      // SHOULD PASS: IF remains reserved
      expect(errors.length).toBeGreaterThan(0);
      // Error should indicate reserved keyword cannot be used
      const errorMessages = errors.map(e => e.message.toLowerCase()).join(' ');
      expect(errorMessages).toMatch(/cannot use reserved keyword|expected|unexpected|invalid/);
    });

    it('should reject WHILE as procedure name', () => {
      // Control flow keywords should remain disallowed as procedure names
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE While@1();
    BEGIN
    END;
  }
}`;

      const { errors } = parseCode(code);

      // SHOULD PASS: WHILE remains reserved
      expect(errors.length).toBeGreaterThan(0);
      // Error should mention procedure name or identifier expected
      const errorMessages = errors.map(e => e.message.toLowerCase()).join(' ');
      expect(errorMessages).toMatch(/expected.*procedure name|expected.*identifier|unexpected/);
    });
  });

  describe('Section keyword as procedure name', () => {
    // TDD: These tests verify that section keywords (MenuSuite, Properties, etc.)
    // can be used as procedure names. They SHOULD FAIL until these keywords are
    // added to ALLOWED_KEYWORDS_AS_IDENTIFIERS in parser.ts

    it('should parse PROCEDURE MenuSuite@1() declaration', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MenuSuite@1();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('MenuSuite');
    });

    it('should parse PROCEDURE Properties@1() declaration', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Properties@1();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Properties');
    });

    it('should parse PROCEDURE FieldGroups@1() declaration', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FieldGroups@1();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('FieldGroups');
    });

    it('should parse PROCEDURE Actions@1() declaration', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Actions@1();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Actions');
    });

    it('should parse PROCEDURE DataItems@1() declaration', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DataItems@1();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('DataItems');
    });

    it('should parse PROCEDURE Elements@1() declaration', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Elements@1();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Elements');
    });
  });

  describe('Section keyword as variable name', () => {
    // TDD: These tests verify that section keywords can be used as variable names
    // They SHOULD FAIL until these keywords are added to ALLOWED_KEYWORDS_AS_IDENTIFIERS

    it('should parse MenuSuite as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      MenuSuite@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('MenuSuite');
    });

    it('should parse Properties as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Properties@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('Properties');
    });

    it('should parse FieldGroups as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      FieldGroups@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('FieldGroups');
    });

    it('should parse Actions as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Actions@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('Actions');
    });

    it('should parse DataItems as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      DataItems@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('DataItems');
    });

    it('should parse Elements as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Elements@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('Elements');
    });
  });

  describe('Labels/Dataset with @ suffix - SHOULD PASS immediately', () => {
    // These keywords are already downgraded to Identifier by the lexer when
    // followed by @ suffix, so they work without parser changes

    it('should parse Labels as variable name (downgraded by lexer)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Labels@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should pass immediately due to lexer downgrade
      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('Labels');
    });

    it('should parse Dataset as variable name (downgraded by lexer)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      Dataset@1000 : Integer;
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should pass immediately due to lexer downgrade
      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      const variables = procedures[0].variables || [];
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('Dataset');
    });

    it('should parse PROCEDURE Labels@1() declaration (downgraded by lexer)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Labels@1();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should pass immediately due to lexer downgrade
      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Labels');
    });

    it('should parse PROCEDURE Dataset@1() declaration (downgraded by lexer)', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Dataset@1();
    BEGIN
    END;
  }
}`;
      const { ast, errors } = parseCode(code);

      // Should pass immediately due to lexer downgrade
      expect(errors).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('Dataset');
    });
  });

  describe('Lexer token type verification', () => {
    // Verify that the lexer correctly emits section keywords as their specific
    // TokenType at SECTION_LEVEL, and downgrades them to Identifier in code context

    it('should emit Properties as TokenType.Properties at SECTION_LEVEL', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  PROPERTIES
  {
    OnRun=BEGIN
            END;
  }
  CODE
  {
    PROCEDURE Properties@1();
    BEGIN
    END;
  }
}`;
      const tokens = tokenize(code);

      // Find the PROPERTIES section keyword (should be after opening brace)
      const sectionPropertiesToken = tokens.find((t, i) =>
        t.value.toUpperCase() === 'PROPERTIES' &&
        i > 0 &&
        tokens[i - 1].type === TokenType.LeftBrace
      );

      expect(sectionPropertiesToken).toBeDefined();
      expect(sectionPropertiesToken?.type).toBe(TokenType.Properties);

      // Find the Properties in procedure name context (after PROCEDURE keyword)
      const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
      const procNameToken = tokens[procIndex + 1];

      expect(procNameToken).toBeDefined();
      expect(procNameToken.value).toBe('Properties');
      // Issue #261: Properties@1 should be downgraded to IDENTIFIER when followed by @
      // This is the uniform @ downgrade behavior for all section/object keywords
      expect(procNameToken.type).toBe(TokenType.Identifier);
    });

    it('should emit Actions as TokenType.Actions at SECTION_LEVEL', () => {
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
  }
  CONTROLS
  {
  }
  ACTIONS
  {
    { 1   ;      ;ActionContainer;
                  Name=TestAction }
  }
  CODE
  {
    PROCEDURE Actions@1();
    BEGIN
    END;
  }
}`;
      const tokens = tokenize(code);

      // Find the ACTIONS section keyword
      const sectionActionsToken = tokens.find((t, i) =>
        t.value.toUpperCase() === 'ACTIONS' &&
        i > 0 &&
        tokens[i - 1].type === TokenType.RightBrace
      );

      expect(sectionActionsToken).toBeDefined();
      expect(sectionActionsToken?.type).toBe(TokenType.Actions);

      // Find the Actions in procedure name context
      const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
      const procNameToken = tokens[procIndex + 1];

      expect(procNameToken).toBeDefined();
      expect(procNameToken.value).toBe('Actions');
      // Issue #261: Actions@1 should be downgraded to IDENTIFIER when followed by @
      // This is the uniform @ downgrade behavior for all section/object keywords
      expect(procNameToken.type).toBe(TokenType.Identifier);
    });

    it('should emit Labels as TokenType.Identifier when followed by @', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Labels@1000 : Integer;
  }
}`;
      const tokens = tokenize(code);

      // Find the Labels token (should be downgraded to Identifier when followed by @)
      const labelsTokenIndex = tokens.findIndex(t => t.value === 'Labels');
      expect(labelsTokenIndex).toBeGreaterThan(-1);

      const labelsToken = tokens[labelsTokenIndex];
      expect(labelsToken.type).toBe(TokenType.Identifier);
    });

    it('should emit Dataset as TokenType.Identifier when followed by @', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Dataset@1();
    BEGIN
    END;
  }
}`;
      const tokens = tokenize(code);

      // Find the Dataset token (after PROCEDURE, downgraded to Identifier when followed by @)
      const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
      const datasetToken = tokens[procIndex + 1];

      expect(datasetToken.value).toBe('Dataset');
      expect(datasetToken.type).toBe(TokenType.Identifier);
    });
  });

  describe('Cross-context regression test', () => {
    // Verify that a Page can have both an ACTIONS section AND a procedure named Actions

    it('should parse Page with ACTIONS section AND procedure named Actions', () => {
      const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;      ;Container ;
                  ContainerType=ContentArea }
  }
  ACTIONS
  {
    { 2   ;      ;ActionContainer;
                  Name=ActionItems }
    { 3   ;1     ;Action    ;
                  Name=TestAction }
  }
  CODE
  {
    PROCEDURE Actions@1();
    BEGIN
      MESSAGE('Actions procedure called');
    END;
  }
}`;

      const { ast, errors } = parseCode(code);

      expect(errors).toHaveLength(0);
      expect(ast.object).not.toBeNull();

      // Verify ACTIONS section exists
      expect(ast.object?.type).toBe('ObjectDeclaration');
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);
      const pageNode = ast.object as any;
      expect(pageNode.actions).toBeDefined();
      expect(pageNode.actions?.type).toBe('ActionSection');
      expect(Array.isArray(pageNode.actions?.actions)).toBe(true);
      expect(pageNode.actions?.actions.length).toBeGreaterThan(0);

      // Verify Actions procedure exists
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures.some(p => p.name === 'Actions')).toBe(true);

      const actionsProc = procedures.find(p => p.name === 'Actions');
      expect(actionsProc).toBeDefined();
      expect(actionsProc?.name).toBe('Actions');
    });
  });

  describe('Reserved keywords remain rejected', () => {
    // Regression guard: control flow keywords should remain disallowed

    const reservedKeywords = ['If', 'While', 'Begin', 'End', 'Div', 'And'];

    reservedKeywords.forEach(keyword => {
      it(`should reject ${keyword} as procedure name`, () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE ${keyword}@1();
    BEGIN
    END;
  }
}`;
        const { errors } = parseCode(code);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    reservedKeywords.forEach(keyword => {
      it(`should reject ${keyword} as variable name`, () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      ${keyword}@1000 : Integer;

    PROCEDURE Test@1();
    BEGIN
    END;
  }
}`;
        const { errors } = parseCode(code);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Section keywords without @ suffix - parser allowlist (Issue #263)', () => {
    /**
     * TDD TEST SUITE FOR ISSUE #263
     *
     * Background: Issue #261 made lexer downgrade section/object keywords to
     * Identifier when followed by @. However, when NOT followed by @ (bare keyword),
     * the lexer emits the keyword's specific TokenType. The parser must explicitly
     * allow these keywords in identifier positions via ALLOWED_KEYWORDS_AS_IDENTIFIERS.
     *
     * Goal: RequestForm, RequestPage, and MenuNodes should be usable as:
     * - Procedure names (without @)
     * - Variable names (without @)
     * - Parameter names (without @)
     *
     * Test Expectations:
     * - All 9 tests MUST FAIL initially (not in ALLOWED_KEYWORDS_AS_IDENTIFIERS)
     * - Tests will pass after adding TokenType.RequestForm, TokenType.RequestPage,
     *   and TokenType.MenuNodes to ALLOWED_KEYWORDS_AS_IDENTIFIERS
     *
     * Note: WITH @ suffix, the lexer downgrades these to Identifier automatically
     * (covered by issue #261 tests). This tests the WITHOUT @ case.
     */

    describe('RequestForm as identifier without @ suffix', () => {
      it('should parse PROCEDURE RequestForm() declaration', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE RequestForm();
    BEGIN
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        expect(errors).toHaveLength(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        expect(procedures[0].name).toBe('RequestForm');
      });

      it('should parse RequestForm as variable name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      RequestForm : Integer;
    BEGIN
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        expect(errors).toHaveLength(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        const variables = procedures[0].variables || [];
        expect(variables).toHaveLength(1);
        expect(variables[0].name).toBe('RequestForm');
      });

      it('should parse RequestForm as parameter name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test(RequestForm : Boolean);
    BEGIN
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        expect(errors).toHaveLength(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        const parameters = procedures[0].parameters || [];
        expect(parameters).toHaveLength(1);
        expect(parameters[0].name).toBe('RequestForm');
      });
    });

    describe('RequestPage as identifier without @ suffix', () => {
      it('should parse PROCEDURE RequestPage() declaration', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE RequestPage();
    BEGIN
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        expect(errors).toHaveLength(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        expect(procedures[0].name).toBe('RequestPage');
      });

      it('should parse RequestPage as variable name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      RequestPage : Integer;
    BEGIN
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        expect(errors).toHaveLength(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        const variables = procedures[0].variables || [];
        expect(variables).toHaveLength(1);
        expect(variables[0].name).toBe('RequestPage');
      });

      it('should parse RequestPage as parameter name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test(RequestPage : Boolean);
    BEGIN
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        expect(errors).toHaveLength(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        const parameters = procedures[0].parameters || [];
        expect(parameters).toHaveLength(1);
        expect(parameters[0].name).toBe('RequestPage');
      });
    });

    describe('MenuNodes as identifier without @ suffix', () => {
      it('should parse PROCEDURE MenuNodes() declaration', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MenuNodes();
    BEGIN
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        expect(errors).toHaveLength(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        expect(procedures[0].name).toBe('MenuNodes');
      });

      it('should parse MenuNodes as variable name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test@1();
    VAR
      MenuNodes : Integer;
    BEGIN
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        expect(errors).toHaveLength(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        const variables = procedures[0].variables || [];
        expect(variables).toHaveLength(1);
        expect(variables[0].name).toBe('MenuNodes');
      });

      it('should parse MenuNodes as parameter name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Test(MenuNodes : Boolean);
    BEGIN
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        expect(errors).toHaveLength(0);
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        const parameters = procedures[0].parameters || [];
        expect(parameters).toHaveLength(1);
        expect(parameters[0].name).toBe('MenuNodes');
      });
    });
  });

  describe('Uniform @ downgrade for all section/object keywords (Issue #261)', () => {
    /**
     * TDD TEST SUITE FOR ISSUE #261
     *
     * Background: Dataset, RequestPage, and Labels already get downgraded to
     * Identifier by the lexer when followed by @. However, 18 other section/object
     * keywords do NOT get downgraded, causing parser errors.
     *
     * Goal: Uniform behavior - ALL section/object keywords should downgrade to
     * Identifier when followed by @ in code context.
     *
     * Test Expectations:
     * - Sub-section A (18 tests): MUST FAIL initially
     * - Sub-section B (3 tests): SHOULD PASS (regression guard)
     * - Sub-section C (1 test): SHOULD PASS (state non-contamination)
     */

    describe('Sub-section A: Individual keyword @ downgrade tests (MUST FAIL initially)', () => {
      // Section keywords (10 tests)

      it('should downgrade Properties to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Properties@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Properties');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade FieldGroups to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE FieldGroups@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('FieldGroups');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Actions to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Actions@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Actions');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade DataItems to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE DataItems@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('DataItems');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Elements to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Elements@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Elements');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade MenuNodes to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MenuNodes@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('MenuNodes');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade RequestForm to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE RequestForm@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('RequestForm');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Fields to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Fields@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Fields');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Keys to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Keys@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Keys');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Controls to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Controls@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Controls');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      // Object type keywords (8 tests)

      it('should downgrade Table to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Table@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Table');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Page to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Page@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Page');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Report to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Report@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Report');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Codeunit to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Codeunit@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Codeunit');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Query to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Query@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Query');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade XMLport to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE XMLport@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('XMLport');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade MenuSuite to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MenuSuite@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('MenuSuite');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Object to Identifier when followed by @', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Object@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Object');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });
    });

    describe('Sub-section B: Regression tests for already-working keywords (SHOULD PASS)', () => {
      // These 3 keywords already get downgraded to Identifier by the lexer

      it('should downgrade Dataset to Identifier when followed by @ (already works)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Dataset@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Dataset');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade RequestPage to Identifier when followed by @ (already works)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE RequestPage@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('RequestPage');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });

      it('should downgrade Labels to Identifier when followed by @ (already works)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Labels@1();
    BEGIN
    END;
  }
}`;
        const tokens = tokenize(code);

        const procIndex = tokens.findIndex(t => t.type === TokenType.Procedure);
        expect(procIndex).toBeGreaterThan(-1);
        const nameToken = tokens[procIndex + 1];
        expect(nameToken.value).toBe('Labels');
        expect(nameToken.type).toBe(TokenType.Identifier);
      });
    });

    describe('Sub-section C: State non-contamination regression test', () => {
      // Verifies that using Properties@1() doesn't contaminate lexer state
      // and cause subsequent Properties sections to fail parsing

      it('should not contaminate state when Properties@ appears in code section', () => {
        const code = `OBJECT Page 50000 Test
{
  PROPERTIES
  {
    CaptionML=ENU=Test Page;
  }
  CONTROLS
  {
    { 1   ;      ;Container ;
                  ContainerType=ContentArea }
  }
  CODE
  {
    PROCEDURE Properties@1();
    BEGIN
      MESSAGE('Properties procedure called');
    END;
  }
}`;
        const { ast, errors } = parseCode(code);

        // Parse should succeed without errors
        expect(errors).toHaveLength(0);
        expect(ast.object).not.toBeNull();

        // Verify PROPERTIES section was parsed
        const pageNode = ast.object as any;
        expect(pageNode.properties).toBeDefined();

        // Verify Properties procedure exists
        const procedures = ast.object?.code?.procedures || [];
        expect(procedures).toHaveLength(1);
        expect(procedures[0].name).toBe('Properties');
      });
    });
  });
});
