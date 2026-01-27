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
 *
 * TDD EXPECTATION:
 * - Tests 1-2 SHOULD FAIL initially (Break not in ALLOWED_KEYWORDS_AS_IDENTIFIERS)
 * - Tests 3-5 SHOULD PASS (regression guards for existing behavior)
 * - Tests will pass after adding TokenType.Break to ALLOWED_KEYWORDS_AS_IDENTIFIERS
 */

import { Lexer } from '../../lexer/lexer';
import { TokenType } from '../../lexer/tokens';
import { Parser } from '../parser';
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

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // SHOULD PASS: Existing BREAK statement parsing
      expect(parser.getErrors()).toHaveLength(0);
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

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

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

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should pass immediately due to lexer downgrade
      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should pass immediately due to lexer downgrade
      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should pass immediately due to lexer downgrade
      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Should pass immediately due to lexer downgrade
      expect(parser.getErrors()).toHaveLength(0);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

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
      // In code context, should still be Properties token (parser handles downgrade)
      expect(procNameToken.type).toBe(TokenType.Properties);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

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
      expect(procNameToken.type).toBe(TokenType.Actions);
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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

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
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

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

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
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
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        parser.parse();

        const errors = parser.getErrors();
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
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        parser.parse();

        const errors = parser.getErrors();
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });
});
