/**
 * REGRESSION TESTS: Keywords as Variable Names
 *
 * Tests support for using C/AL keywords as variable names in VAR sections.
 * This is a valid pattern in C/AL where keywords are contextually recognized.
 *
 * Common examples from real NAV code:
 * - Object@1 : Record 2000000001 (System Object table)
 * - Table@1 : Record 2000000026 (Table Information table)
 * - Record@1 : Record 18 (Customer table)
 * - Code@1 : Text[50]
 * - Page@1 : Integer
 *
 * Context: In C/AL, many keywords can be reused as identifiers in specific contexts.
 * The parser must handle these contextually - recognizing them as keywords in some
 * positions (e.g., "OBJECT Table 18") but as identifiers in others (e.g., "Table@1 : Record").
 *
 * This test file ensures the parser correctly handles keyword tokens as variable names
 * with @-numbering in various VAR contexts:
 * - Global VAR sections
 * - Procedure parameter lists
 * - Procedure local VAR sections
 * - Trigger inline VAR sections
 *
 * Note: The @-number suffix (auto-numbering) is consumed by the parser's skipAutoNumberSuffix()
 * method and is not stored in the AST. Tests verify variable names only, not the number values.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';

describe('Parser - Keywords as Variable Names', () => {
  describe('Object variable name', () => {
    it.skip('should parse Object variable in trigger VAR with @-numbering', () => {
      // TODO: Inline VAR in triggers not yet fully supported
      // Pattern: Variable named "Object" with Record 2000000001 (System Object table)
      const code = `OBJECT Report 50000 Test
{
  CODE
  {
    OnPostReport=VAR
                   Object@1161020001 : Record 2000000001;
                   txtDate@1161020000 : Text[8];
                 BEGIN
                   Object.SETRANGE(Type, Object.Type::Report);
                 END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).not.toBeNull();
      expect(ast.object?.code).not.toBeNull();

      const triggers = ast.object?.code?.triggers || [];
      expect(triggers).toHaveLength(1);

      const trigger = triggers[0];
      expect(trigger.name).toBe('OnPostReport');
      expect(trigger.variables).toHaveLength(2);

      // First variable: Object
      const objectVar = trigger.variables[0];
      expect(objectVar.name).toBe('Object');
      expect(objectVar.dataType.typeName).toBe('Record 2000000001');

      // Second variable: txtDate
      const txtDateVar = trigger.variables[1];
      expect(txtDateVar.name).toBe('txtDate');
      expect(txtDateVar.dataType.typeName).toBe('Text[8]');
    });

    it('should parse Object variable in procedure VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Object@1000 : Record 2000000001;
    BEGIN
      Object.FINDFIRST;
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
      expect(proc.name).toBe('TestProc');
      expect(proc.variables).toHaveLength(1);

      const variable = proc.variables[0];
      expect(variable.name).toBe('Object');
      expect(variable.dataType.typeName).toBe('Record 2000000001');
    });

    it('should parse Object variable in global VAR section', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Object@1000 : Record 2000000001;
      Customer@1001 : Record 18;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).not.toBeNull();
      expect(ast.object?.code?.variables).toHaveLength(2);

      const objectVar = ast.object!.code!.variables[0];
      expect(objectVar.name).toBe('Object');
      expect(objectVar.dataType.typeName).toBe('Record 2000000001');

      const customerVar = ast.object!.code!.variables[1];
      expect(customerVar.name).toBe('Customer');
    });
  });

  describe('Table variable name', () => {
    it('should parse Table variable in procedure VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE GetTableInfo@1();
    VAR
      Table@1002 : Record 2000000026;
    BEGIN
      Table.SETRANGE(Type, Table.Type::Table);
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const procedures = ast.object?.code?.procedures || [];
      const proc = procedures[0];
      expect(proc.variables).toHaveLength(1);

      const variable = proc.variables[0];
      expect(variable.name).toBe('Table');
      expect(variable.dataType.typeName).toBe('Record 2000000026');
    });

    it.skip('should parse Table variable in trigger VAR', () => {
      // TODO: Inline VAR in triggers not yet fully supported
      const code = `OBJECT Table 18 Customer
{
  CODE
  {
    OnInsert=VAR
               Table@1000 : Record 2000000026;
             BEGIN
               Table.GET(18);
             END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const triggers = ast.object?.code?.triggers || [];
      const trigger = triggers[0];
      expect(trigger.variables).toHaveLength(1);
      expect(trigger.variables[0].name).toBe('Table');
    });
  });

  describe('Record variable name', () => {
    it('should parse Record variable with Integer type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Record@1000 : Integer;
    BEGIN
      Record := 18;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);

      const procedures = ast.object?.code?.procedures || [];
      const proc = procedures[0];
      expect(proc.variables).toHaveLength(1);

      const variable = proc.variables[0];
      expect(variable.name).toBe('Record');
      expect(variable.dataType.typeName).toBe('Integer');
    });

    it('should parse Record variable with Record type', () => {
      // Yes, you can have: Record@1 : Record 18;
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Record@1000 : Record 18;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Record');
      expect(variable.dataType.typeName).toBe('Record 18');
    });
  });

  describe('Code variable name', () => {
    it('should parse Code variable with Text type', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Code@1000 : Text[50];
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Code');
      expect(variable.dataType.typeName).toBe('Text[50]');
    });

    it('should parse Code variable with Code type', () => {
      // Variable named "Code" with Code[20] type
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Code@1000 : Code20;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Code');
      expect(variable.dataType.typeName).toBe('Code20');
    });
  });

  describe('Page and Report variable names', () => {
    it('should parse Page variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Page@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Page');
      expect(variable.dataType.typeName).toBe('Integer');
    });

    it('should parse Report variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Report@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Report');
      expect(variable.dataType.typeName).toBe('Integer');
    });

    it('should parse Codeunit variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Codeunit@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Codeunit');
    });
  });

  describe('Multiple keyword variables', () => {
    it('should parse multiple keyword variables in same VAR block', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Object@1000 : Record 2000000001;
      Table@1002 : Record 2000000026;
      Record@1003 : Integer;
      Code@1004 : Text[50];
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
      const proc = procedures[0];
      expect(proc.variables).toHaveLength(4);

      expect(proc.variables[0].name).toBe('Object');
      expect(proc.variables[1].name).toBe('Table');
      expect(proc.variables[2].name).toBe('Record');
      expect(proc.variables[3].name).toBe('Code');
    });

    it('should parse mixed keyword and regular variable names', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Customer@1000 : Record 18;
      Table@1001 : Record 2000000026;
      Amount@1002 : Decimal;
      Object@1003 : Record 2000000001;
      Description@1004 : Text[100];
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(5);

      expect(ast.object!.code!.variables[0].name).toBe('Customer');
      expect(ast.object!.code!.variables[1].name).toBe('Table');
      expect(ast.object!.code!.variables[2].name).toBe('Amount');
      expect(ast.object!.code!.variables[3].name).toBe('Object');
      expect(ast.object!.code!.variables[4].name).toBe('Description');
    });
  });

  describe('Keyword variables with modifiers', () => {
    it('should parse TEMPORARY Object variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Object@1000 : TEMPORARY Record 2000000001;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Object');
      expect(variable.isTemporary).toBe(true);
      expect(variable.dataType.typeName).toBe('Record 2000000001');
    });

    it('should parse Table variable with SECURITYFILTERING', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Table@1000 : Record 2000000026 SECURITYFILTERING(Filtered);
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Table');
      expect(variable.securityFiltering).toBe('Filtered');
    });

    it('should parse TEMPORARY Table with SECURITYFILTERING', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Table@1000 : TEMPORARY Record 2000000026 SECURITYFILTERING(Filtered);
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Table');
      expect(variable.isTemporary).toBe(true);
      expect(variable.securityFiltering).toBe('Filtered');
    });
  });

  describe('Other common keyword variable names', () => {
    it('should parse Text variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Text@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Text');
    });

    it('should parse Integer variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Integer@1000 : Text[50];
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Integer');
      expect(variable.dataType.typeName).toBe('Text[50]');
    });

    it('should parse Decimal variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Decimal@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Decimal');
    });

    it('should parse Date variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Date@1000 : Text[10];
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Date');
    });

    it('should parse Time variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Time@1000 : Text[8];
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Time');
    });
  });

  describe('Case insensitivity', () => {
    it('should parse keyword variable names case-insensitively', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      object@1000 : Record 2000000001;
      TABLE@1001 : Record 2000000026;
      rEcOrD@1002 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(3);

      // Variable names preserve original casing from source
      expect(ast.object!.code!.variables[0].name).toBe('object');
      expect(ast.object!.code!.variables[1].name).toBe('TABLE');
      expect(ast.object!.code!.variables[2].name).toBe('rEcOrD');
    });
  });

  describe('Usage in code statements', () => {
    it('should parse Object variable used in member access', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Object@1000 : Record 2000000001;
    BEGIN
      Object.SETRANGE(Type, Object.Type::Report);
      Object.FINDFIRST;
      IF Object.ID > 0 THEN
        MESSAGE('%1', Object.Name);
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Parser should handle variable declarations and parse the statements
      // (full statement validation is not the focus, just that parser doesn't crash)
      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).not.toBeNull();

      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('Object');
    });

    it('should parse Table variable with method calls', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Table@1000 : Record 2000000026;
    BEGIN
      Table.SETRANGE(Type, Table.Type::Table);
      IF Table.FINDFIRST THEN
        Table.MODIFY;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures[0].variables[0].name).toBe('Table');
    });
  });

  describe('Real-world complex patterns', () => {
    it.skip('should parse complete real-world pattern with Object variable', () => {
      // TODO: Inline VAR in triggers not yet fully supported
      // Simulates actual NAV code pattern with Object variable
      const code = `OBJECT Report 50000 "Object List"
{
  CODE
  {
    OnPreReport=VAR
                  Object@1000 : Record 2000000001;
                  TotalCount@1001 : Integer;
                BEGIN
                  Object.SETRANGE(Type, Object.Type::Table);
                  TotalCount := Object.COUNT;
                END;

    PROCEDURE GetObjectName@1(ObjectType@1000 : Integer;ObjectID@1001 : Integer) : Text[250];
    VAR
      Object@1002 : Record 2000000001;
    BEGIN
      Object.SETRANGE(Type, ObjectType);
      Object.SETRANGE(ID, ObjectID);
      IF Object.FINDFIRST THEN
        EXIT(Object.Name);
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).not.toBeNull();
      expect(ast.object?.objectKind).toBe('Report');

      // Verify trigger variables
      const triggers = ast.object?.code?.triggers || [];
      expect(triggers).toHaveLength(1);
      expect(triggers[0].variables).toHaveLength(2);
      expect(triggers[0].variables[0].name).toBe('Object');

      // Verify procedure variables
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('Object');
    });
  });
});
