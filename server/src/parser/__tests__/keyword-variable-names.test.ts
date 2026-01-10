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

  // NOTE: Removed skipped test 'should parse complete real-world pattern with Object variable'
  // that used invalid C/AL syntax (property triggers in CODE section instead of PROPERTIES).
  // See objects.test.ts:808-836 for correct property trigger tests.

  /**
   * New Data Type Keywords as Variable Names
   *
   * Tests support for 7 additional data type keywords used as variable names.
   * These keywords are frequently used in real NAV code (occurrence counts verified
   * via analysis of test/REAL/ directory, Jan 2026):
   * - FieldRef: 211 occurrences
   * - RecordRef: 99 occurrences
   * - RecordID: 17 occurrences
   * - Duration: 5 occurrences
   * - BigInteger: 3 occurrences
   * - Fields: 2 occurrences
   * - Byte: 1 occurrence
   * - Object: already tested above
   *
   * See: Issue #54 - Add support for data type keywords as variable names
   */

  describe('FieldRef variable name', () => {
    it('should parse FieldRef variable in procedure VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      FieldRef@1000 : FieldRef;
    BEGIN
      FieldRef.VALUE := 'Test';
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('FieldRef');
      expect(procedures[0].variables[0].dataType.typeName).toBe('FieldRef');
    });

    it('should parse FieldRef as parameter name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(FieldRef@1000 : FieldRef);
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
      expect(procedures[0].parameters).toHaveLength(1);
      expect(procedures[0].parameters[0].name).toBe('FieldRef');
      expect(procedures[0].parameters[0].dataType.typeName).toBe('FieldRef');
    });
  });

  describe('RecordRef variable name', () => {
    it('should parse RecordRef variable in procedure VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordRef@1000 : RecordRef;
    BEGIN
      RecordRef.OPEN(18);
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('RecordRef');
      expect(procedures[0].variables[0].dataType.typeName).toBe('RecordRef');
    });

    it('should parse RecordRef as parameter name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(RecordRef@1000 : RecordRef);
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
      expect(procedures[0].parameters).toHaveLength(1);
      expect(procedures[0].parameters[0].name).toBe('RecordRef');
      expect(procedures[0].parameters[0].dataType.typeName).toBe('RecordRef');
    });
  });

  describe('RecordID variable name', () => {
    it('should parse RecordID variable in procedure VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordID@1000 : RecordID;
    BEGIN
      RecordID := Customer.RECORDID;
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('RecordID');
      expect(procedures[0].variables[0].dataType.typeName).toBe('RecordID');
    });

    it('should parse RecordID as parameter name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(RecordID@1000 : RecordID);
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
      expect(procedures[0].parameters).toHaveLength(1);
      expect(procedures[0].parameters[0].name).toBe('RecordID');
      expect(procedures[0].parameters[0].dataType.typeName).toBe('RecordID');
    });
  });

  describe('Duration variable name', () => {
    it('should parse Duration variable in procedure VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Duration@1000 : Duration;
    BEGIN
      Duration := CURRENTDATETIME - StartTime;
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('Duration');
      expect(procedures[0].variables[0].dataType.typeName).toBe('Duration');
    });

    it('should parse Duration as parameter name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(Duration@1000 : Duration);
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
      expect(procedures[0].parameters).toHaveLength(1);
      expect(procedures[0].parameters[0].name).toBe('Duration');
      expect(procedures[0].parameters[0].dataType.typeName).toBe('Duration');
    });
  });

  describe('BigInteger variable name', () => {
    it('should parse BigInteger variable in procedure VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      BigInteger@1000 : BigInteger;
    BEGIN
      BigInteger := 9223372036854775807;
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('BigInteger');
      expect(procedures[0].variables[0].dataType.typeName).toBe('BigInteger');
    });

    it('should parse BigInteger as parameter name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(BigInteger@1000 : BigInteger);
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
      expect(procedures[0].parameters).toHaveLength(1);
      expect(procedures[0].parameters[0].name).toBe('BigInteger');
      expect(procedures[0].parameters[0].dataType.typeName).toBe('BigInteger');
    });
  });

  describe('Fields variable name', () => {
    it('should parse Fields variable in procedure VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Fields@1000 : Integer;
    BEGIN
      Fields := Customer.COUNT;
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('Fields');
      expect(procedures[0].variables[0].dataType.typeName).toBe('Integer');
    });

    it('should parse Fields as parameter name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(Fields@1000 : Integer);
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
      expect(procedures[0].parameters).toHaveLength(1);
      expect(procedures[0].parameters[0].name).toBe('Fields');
      expect(procedures[0].parameters[0].dataType.typeName).toBe('Integer');
    });
  });

  describe('Byte variable name', () => {
    it('should parse Byte variable in procedure VAR', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Byte@1000 : Byte;
    BEGIN
      Byte := 255;
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('Byte');
      expect(procedures[0].variables[0].dataType.typeName).toBe('Byte');
    });

    it('should parse Byte as parameter name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(Byte@1000 : Byte);
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
      expect(procedures[0].parameters).toHaveLength(1);
      expect(procedures[0].parameters[0].name).toBe('Byte');
      expect(procedures[0].parameters[0].dataType.typeName).toBe('Byte');
    });
  });

  describe('Multiple new data type keyword variables', () => {
    it('should parse all 7 new data type keywords together in same VAR block', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      FieldRef@1000 : FieldRef;
      RecordRef@1001 : RecordRef;
      RecordID@1002 : RecordID;
      Duration@1003 : Duration;
      BigInteger@1004 : BigInteger;
      Fields@1005 : Integer;
      Byte@1006 : Byte;
    BEGIN
      RecordRef.OPEN(18);
      FieldRef := RecordRef.FIELD(1);
      RecordID := RecordRef.RECORDID;
      Duration := CURRENTDATETIME - StartTime;
      BigInteger := 9223372036854775807;
      Fields := RecordRef.FIELDCOUNT;
      Byte := 255;
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

      const proc = procedures[0];
      expect(proc.variables).toHaveLength(7);

      expect(proc.variables[0].name).toBe('FieldRef');
      expect(proc.variables[0].dataType.typeName).toBe('FieldRef');

      expect(proc.variables[1].name).toBe('RecordRef');
      expect(proc.variables[1].dataType.typeName).toBe('RecordRef');

      expect(proc.variables[2].name).toBe('RecordID');
      expect(proc.variables[2].dataType.typeName).toBe('RecordID');

      expect(proc.variables[3].name).toBe('Duration');
      expect(proc.variables[3].dataType.typeName).toBe('Duration');

      expect(proc.variables[4].name).toBe('BigInteger');
      expect(proc.variables[4].dataType.typeName).toBe('BigInteger');

      expect(proc.variables[5].name).toBe('Fields');
      expect(proc.variables[5].dataType.typeName).toBe('Integer');

      expect(proc.variables[6].name).toBe('Byte');
      expect(proc.variables[6].dataType.typeName).toBe('Byte');
    });
  });

  /**
   * New Keyword Variable Names with C/AL Modifiers
   *
   * Tests support for the 7 new data type keywords combined with C/AL modifiers:
   * - VAR modifier: Pass-by-reference parameters
   * - TEMPORARY modifier: Temporary Record variables
   * - SECURITYFILTERING modifier: Security filtering on Record variables
   *
   * These tests validate adversarial reviewer findings about untested modifier
   * combinations with the new keywords (FieldRef, RecordRef, RecordID, Duration,
   * BigInteger, Fields, Byte).
   *
   * See: Adversarial review findings for Issue #54
   */

  describe('New keyword variable names with VAR modifier', () => {
    it('should parse FieldRef with VAR modifier in parameter', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(VAR FieldRef@1000 : FieldRef);
    BEGIN
      FieldRef.VALUE := 'Modified';
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
      expect(procedures[0].parameters).toHaveLength(1);

      const param = procedures[0].parameters[0];
      expect(param.name).toBe('FieldRef');
      expect(param.isVar).toBe(true);
      expect(param.dataType.typeName).toBe('FieldRef');
    });

    it('should parse RecordRef with VAR modifier in parameter', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(VAR RecordRef@1000 : RecordRef);
    BEGIN
      RecordRef.OPEN(18);
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
      expect(procedures[0].parameters).toHaveLength(1);

      const param = procedures[0].parameters[0];
      expect(param.name).toBe('RecordRef');
      expect(param.isVar).toBe(true);
      expect(param.dataType.typeName).toBe('RecordRef');
    });

    it('should parse RecordID with VAR modifier in parameter', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(VAR RecordID@1000 : RecordID);
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
      expect(procedures[0].parameters).toHaveLength(1);

      const param = procedures[0].parameters[0];
      expect(param.name).toBe('RecordID');
      expect(param.isVar).toBe(true);
      expect(param.dataType.typeName).toBe('RecordID');
    });

    it('should parse Duration with VAR modifier in parameter', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(VAR Duration@1000 : Duration);
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
      expect(procedures[0].parameters).toHaveLength(1);

      const param = procedures[0].parameters[0];
      expect(param.name).toBe('Duration');
      expect(param.isVar).toBe(true);
      expect(param.dataType.typeName).toBe('Duration');
    });

    it('should parse BigInteger with VAR modifier in parameter', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(VAR BigInteger@1000 : BigInteger);
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
      expect(procedures[0].parameters).toHaveLength(1);

      const param = procedures[0].parameters[0];
      expect(param.name).toBe('BigInteger');
      expect(param.isVar).toBe(true);
      expect(param.dataType.typeName).toBe('BigInteger');
    });

    it('should parse multiple new keywords with VAR modifier together', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(VAR FieldRef@1000 : FieldRef;VAR RecordRef@1001 : RecordRef;VAR Duration@1002 : Duration;VAR Byte@1003 : Byte);
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
      expect(procedures[0].parameters).toHaveLength(4);

      // Check all parameters have VAR modifier and correct names
      expect(procedures[0].parameters[0].name).toBe('FieldRef');
      expect(procedures[0].parameters[0].isVar).toBe(true);

      expect(procedures[0].parameters[1].name).toBe('RecordRef');
      expect(procedures[0].parameters[1].isVar).toBe(true);

      expect(procedures[0].parameters[2].name).toBe('Duration');
      expect(procedures[0].parameters[2].isVar).toBe(true);

      expect(procedures[0].parameters[3].name).toBe('Byte');
      expect(procedures[0].parameters[3].isVar).toBe(true);
    });
  });

  describe('New keyword variable names with TEMPORARY modifier', () => {
    it('should parse FieldRef with TEMPORARY modifier', () => {
      // Note: TEMPORARY FieldRef is not semantically valid in C/AL
      // (TEMPORARY only applies to Record types), but we test parser
      // handling if such syntax appears
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      FieldRef@1000 : TEMPORARY FieldRef;
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Parser should handle it (semantic validation is separate concern)
      expect(parser.getErrors()).toHaveLength(0);
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].variables).toHaveLength(1);

      const variable = procedures[0].variables[0];
      expect(variable.name).toBe('FieldRef');
      expect(variable.isTemporary).toBe(true);
    });

    it('should parse RecordRef with TEMPORARY modifier', () => {
      // Note: TEMPORARY RecordRef is not semantically valid in C/AL
      // Testing parser robustness
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordRef@1000 : TEMPORARY RecordRef;
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
      expect(procedures[0].variables).toHaveLength(1);

      const variable = procedures[0].variables[0];
      expect(variable.name).toBe('RecordRef');
      expect(variable.isTemporary).toBe(true);
    });

    it('should parse RecordID with TEMPORARY Record type', () => {
      // Valid scenario: Variable named RecordID with TEMPORARY Record type
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordID@1000 : TEMPORARY Record 18;
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
      expect(procedures[0].variables).toHaveLength(1);

      const variable = procedures[0].variables[0];
      expect(variable.name).toBe('RecordID');
      expect(variable.isTemporary).toBe(true);
      expect(variable.dataType.typeName).toBe('Record 18');
    });

    it('should parse Fields with TEMPORARY Record type', () => {
      // Valid scenario: Variable named Fields with TEMPORARY Record type
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Fields@1000 : TEMPORARY Record 2000000041;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Fields');
      expect(variable.isTemporary).toBe(true);
      expect(variable.dataType.typeName).toBe('Record 2000000041');
    });
  });

  describe('New keyword variable names with SECURITYFILTERING modifier', () => {
    it('should parse RecordID with SECURITYFILTERING modifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordID@1000 : Record 18 SECURITYFILTERING(Filtered);
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
      expect(procedures[0].variables).toHaveLength(1);

      const variable = procedures[0].variables[0];
      expect(variable.name).toBe('RecordID');
      expect(variable.securityFiltering).toBe('Filtered');
      expect(variable.dataType.typeName).toBe('Record 18');
    });

    it('should parse Fields with SECURITYFILTERING modifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Fields@1000 : Record 2000000041 SECURITYFILTERING(Filtered);
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Fields');
      expect(variable.securityFiltering).toBe('Filtered');
      expect(variable.dataType.typeName).toBe('Record 2000000041');
    });

    it('should parse RecordRef with SECURITYFILTERING modifier', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordRef@1000 : Record 2000000026 SECURITYFILTERING(Disallowed);
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
      expect(procedures[0].variables).toHaveLength(1);

      const variable = procedures[0].variables[0];
      expect(variable.name).toBe('RecordRef');
      expect(variable.securityFiltering).toBe('Disallowed');
    });
  });

  describe('New keyword variable names with combined modifiers', () => {
    it('should parse RecordID with TEMPORARY and SECURITYFILTERING modifiers', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordID@1000 : TEMPORARY Record 18 SECURITYFILTERING(Filtered);
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
      expect(procedures[0].variables).toHaveLength(1);

      const variable = procedures[0].variables[0];
      expect(variable.name).toBe('RecordID');
      expect(variable.isTemporary).toBe(true);
      expect(variable.securityFiltering).toBe('Filtered');
      expect(variable.dataType.typeName).toBe('Record 18');
    });

    it('should parse Fields with TEMPORARY and SECURITYFILTERING modifiers', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Fields@1000 : TEMPORARY Record 2000000041 SECURITYFILTERING(Validated);
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Fields');
      expect(variable.isTemporary).toBe(true);
      expect(variable.securityFiltering).toBe('Validated');
      expect(variable.dataType.typeName).toBe('Record 2000000041');
    });

    it('should parse VAR parameter with RecordRef name and Record type with SECURITYFILTERING', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(VAR RecordRef@1000 : Record 18 SECURITYFILTERING(Filtered));
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
      expect(procedures[0].parameters).toHaveLength(1);

      const param = procedures[0].parameters[0];
      expect(param.name).toBe('RecordRef');
      expect(param.isVar).toBe(true);
      expect(param.securityFiltering).toBe('Filtered');
      expect(param.dataType.typeName).toBe('Record 18');
    });
  });

  /**
   * AL-Only Keywords as Variable Names (TDD - EXPECTED TO FAIL)
   *
   * Tests support for using AL-only keywords (ENUM, INTERFACE, EXTENDS, IMPLEMENTS)
   * as variable names in VAR sections. These are AL-only language keywords, not
   * supported as language constructs in C/AL, but they CAN be used as identifiers
   * in variable/parameter contexts.
   *
   * Context: In C/AL, keywords that are AL-only language constructs (like ENUM
   * for defining enumerations) should be rejected as language features, but can
   * be reused as variable/parameter names just like other C/AL keywords.
   *
   * Examples from potential NAV code:
   * - Enum@1 : Integer (variable to store an enum-like value)
   * - Interface@1 : Text (variable to store interface name)
   * - Extends@1 : Boolean (variable indicating extension status)
   * - Implements@1 : Record 18 (variable holding implementation data)
   *
   * IMPORTANT: These tests are EXPECTED TO FAIL initially (TDD workflow).
   * They demonstrate the bug where AL-only keywords are rejected even in
   * identifier contexts where they should be allowed.
   */
  describe('AL-Only Keywords as Variable Names (TDD - EXPECTED TO FAIL)', () => {
    describe('ENUM as variable name', () => {
      it('should parse ENUM variable in procedure VAR', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Enum@1000 : Integer;
    BEGIN
      Enum := 1;
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
        expect(variable.name).toBe('Enum');
        expect(variable.dataType.typeName).toBe('Integer');
      });

      it('should parse ENUM variable in global VAR section', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Enum@1000 : Integer;
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

        const enumVar = ast.object!.code!.variables[0];
        expect(enumVar.name).toBe('Enum');
        expect(enumVar.dataType.typeName).toBe('Integer');
      });

      it('should parse ENUM with compound assignment (+=)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Enum@1000 : Integer;
    BEGIN
      Enum += 1;
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
        expect(proc.body).toBeDefined();
      });

      it('should parse ENUM with other compound assignments (-=, *=, /=)', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Enum@1000 : Integer;
    BEGIN
      Enum -= 1;
      Enum *= 2;
      Enum /= 3;
    END;
  }
}`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(parser.getErrors()).toHaveLength(0);
        expect(ast.object).not.toBeNull();
      });

      it('should parse ENUM with array access', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Enum@1000 : ARRAY [10] OF Integer;
    BEGIN
      Enum[1] := 5;
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
        expect(proc.variables[0].name).toBe('Enum');
      });
    });

    describe('INTERFACE as variable name', () => {
      it('should parse INTERFACE variable in procedure VAR', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Interface@1000 : Text;
    BEGIN
      Interface := 'ICustomer';
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
        expect(variable.name).toBe('Interface');
        expect(variable.dataType.typeName).toBe('Text');
      });

      it('should parse INTERFACE variable in global VAR section', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Interface@1000 : Text[50];
  }
}`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(parser.getErrors()).toHaveLength(0);
        expect(ast.object!.code!.variables).toHaveLength(1);

        const variable = ast.object!.code!.variables[0];
        expect(variable.name).toBe('Interface');
        expect(variable.dataType.typeName).toBe('Text[50]');
      });
    });

    describe('EXTENDS as variable name', () => {
      it('should parse EXTENDS variable in procedure VAR', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Extends@1000 : Boolean;
    BEGIN
      Extends := TRUE;
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
        expect(variable.name).toBe('Extends');
        expect(variable.dataType.typeName).toBe('Boolean');
      });
    });

    describe('IMPLEMENTS as variable name', () => {
      it('should parse IMPLEMENTS variable in procedure VAR', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Implements@1000 : Record 18;
    BEGIN
      Implements.FINDFIRST;
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
        expect(variable.name).toBe('Implements');
        expect(variable.dataType.typeName).toBe('Record 18');
      });
    });

    describe('AL-only access modifiers as variable names', () => {
      it('should parse INTERNAL as variable name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Internal@1000 : Integer;
  }
}`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(parser.getErrors()).toHaveLength(0);
        expect(ast.object!.code!.variables).toHaveLength(1);

        const variable = ast.object!.code!.variables[0];
        expect(variable.name).toBe('Internal');
        expect(variable.dataType.typeName).toBe('Integer');
      });

      it('should parse PROTECTED as variable name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Protected@1000 : Text;
  }
}`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(parser.getErrors()).toHaveLength(0);
        expect(ast.object!.code!.variables).toHaveLength(1);

        const variable = ast.object!.code!.variables[0];
        expect(variable.name).toBe('Protected');
        expect(variable.dataType.typeName).toBe('Text');
      });

      it('should parse PUBLIC as variable name', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Public@1000 : Boolean;
  }
}`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(parser.getErrors()).toHaveLength(0);
        expect(ast.object!.code!.variables).toHaveLength(1);

        const variable = ast.object!.code!.variables[0];
        expect(variable.name).toBe('Public');
        expect(variable.dataType.typeName).toBe('Boolean');
      });

      it('should parse Public with member access in statement position', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Public@1000 : Record 18;
    BEGIN
      Public.FINDFIRST;
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
        expect(proc.variables[0].name).toBe('Public');
      });

      it('should parse Protected with compound assignment in statement position', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Protected@1000 : Integer;
    BEGIN
      Protected += 10;
    END;
  }
}`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(parser.getErrors()).toHaveLength(0);
        expect(ast.object).not.toBeNull();
      });

      it('should parse Internal with array access in statement position', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Internal@1000 : ARRAY [5] OF Integer;
    BEGIN
      Internal[1] := 100;
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
        expect(proc.variables).toHaveLength(1);
        expect(proc.variables[0].name).toBe('Internal');
      });
    });

    describe('Multiple AL-only keywords as variables', () => {
      it('should parse all AL-only keywords together in same VAR block', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Enum@1000 : Integer;
      Interface@1001 : Text;
      Extends@1002 : Boolean;
      Implements@1003 : Record 18;
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

        expect(proc.variables[0].name).toBe('Enum');
        expect(proc.variables[1].name).toBe('Interface');
        expect(proc.variables[2].name).toBe('Extends');
        expect(proc.variables[3].name).toBe('Implements');
      });

      it('should parse AL-only access modifiers together in same VAR block', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Internal@1000 : Integer;
      Protected@1001 : Text;
      Public@1002 : Boolean;
  }
}`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(parser.getErrors()).toHaveLength(0);
        expect(ast.object!.code!.variables).toHaveLength(3);

        expect(ast.object!.code!.variables[0].name).toBe('Internal');
        expect(ast.object!.code!.variables[1].name).toBe('Protected');
        expect(ast.object!.code!.variables[2].name).toBe('Public');
      });
    });

    describe('AL-only keywords with C/AL modifiers', () => {
      it('should parse ENUM with TEMPORARY modifier', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Enum@1000 : TEMPORARY Record 18;
  }
}`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(parser.getErrors()).toHaveLength(0);
        const variable = ast.object!.code!.variables[0];
        expect(variable.name).toBe('Enum');
        expect(variable.isTemporary).toBe(true);
        expect(variable.dataType.typeName).toBe('Record 18');
      });

      it('should parse INTERFACE with VAR modifier as parameter', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(VAR Interface@1000 : Text);
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
        expect(procedures[0].parameters).toHaveLength(1);

        const param = procedures[0].parameters[0];
        expect(param.name).toBe('Interface');
        expect(param.isVar).toBe(true);
        expect(param.dataType.typeName).toBe('Text');
      });
    });

    describe('Case insensitivity for AL-only keywords as variables', () => {
      it('should parse AL-only keyword variable names case-insensitively', () => {
        const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      enum@1000 : Integer;
      INTERFACE@1001 : Text;
      eXtEnDs@1002 : Boolean;
  }
}`;

        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        expect(parser.getErrors()).toHaveLength(0);
        expect(ast.object!.code!.variables).toHaveLength(3);

        // Variable names preserve original casing from source
        expect(ast.object!.code!.variables[0].name).toBe('enum');
        expect(ast.object!.code!.variables[1].name).toBe('INTERFACE');
        expect(ast.object!.code!.variables[2].name).toBe('eXtEnDs');
      });
    });
  });

  /**
   * Regression Tests: AL-Only Language Constructs Still Rejected
   *
   * These tests verify that AL-only language constructs (ENUM declarations,
   * INTERFACE declarations, etc.) are STILL properly rejected as syntax errors.
   * Only the use of these keywords as variable/parameter NAMES should be allowed.
   */
  describe('Regression: AL-Only Language Constructs Still Rejected', () => {
    it('should reject ENUM declaration syntax', () => {
      const code = `ENUM 50000 MyEnum { }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("AL-only keyword 'ENUM'");
      expect(errors[0].message).toContain('not supported in C/AL');
    });

    it('should reject INTERFACE declaration syntax', () => {
      const code = `INTERFACE IMyInterface { }`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("AL-only keyword 'INTERFACE'");
      expect(errors[0].message).toContain('not supported in C/AL');
    });

    it('should reject INTERNAL access modifier on procedures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    INTERNAL PROCEDURE TestProc@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const internalError = errors.find(e => e.message.includes("'INTERNAL'"));
      expect(internalError).toBeDefined();
      expect(internalError!.message).toContain('AL-only access modifier');
      expect(internalError!.message).toContain('not supported in C/AL');
    });
  });

  /**
   * Bug Fix Validation (Issues #52, #53)
   *
   * Issue #52: Fixed _TYPE suffix check - Date_Type and Time_Type now recognized via suffix
   * Issue #53: Fixed error recovery - parser now respects VAR section boundaries
   *
   * These tests validate that the fixes work correctly:
   * - Date and Time can be used as variable names (_TYPE suffix works)
   * - Integer, Decimal, Boolean can be used as variable names (_TYPE suffix works)
   * - Invalid identifiers produce proper errors with correct locations
   */
  describe('Bug Fix Validation (Issues #52, #53)', () => {
    it('should parse Date as variable name (Issue #52: _TYPE suffix check)', () => {
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
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Date');
      expect(variable.dataType.typeName).toBe('Text[10]');
    });

    it('should parse Time as variable name (Issue #52: _TYPE suffix check)', () => {
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
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Time');
      expect(variable.dataType.typeName).toBe('Text[8]');
    });

    it('should parse Integer as variable name (Issue #52: _TYPE suffix check)', () => {
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
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Integer');
      expect(variable.dataType.typeName).toBe('Text[50]');
    });

    it('should parse Decimal as variable name (Issue #52: _TYPE suffix check)', () => {
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
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Decimal');
      expect(variable.dataType.typeName).toBe('Integer');
    });

    it('should parse Boolean as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Boolean@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(1);

      const variable = ast.object!.code!.variables[0];
      expect(variable.name).toBe('Boolean');
      expect(variable.dataType.typeName).toBe('Integer');
    });

    it('should parse all _TYPE suffix keywords as variable names together', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Date@1000 : Text[10];
      Time@1001 : Text[8];
      Integer@1002 : Text[20];
      Decimal@1003 : Text[20];
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(4);

      expect(ast.object!.code!.variables[0].name).toBe('Date');
      expect(ast.object!.code!.variables[1].name).toBe('Time');
      expect(ast.object!.code!.variables[2].name).toBe('Integer');
      expect(ast.object!.code!.variables[3].name).toBe('Decimal');
    });
  });

  /**
   * Keywords That Cannot Be Variables
   *
   * Tests that reserved keywords (control flow, blocks, declarations) are properly
   * rejected when used as variable names. These keywords are fundamental to C/AL
   * syntax and cannot be contextually reused as identifiers.
   *
   * Expected behavior: Parser should produce errors when these keywords appear
   * as variable names with @-numbering.
   */
  describe('Keywords That Cannot Be Variables', () => {
    // Control flow keywords
    it('should reject IF as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      IF@1000 : Integer;
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
      // Error should indicate reserved keyword cannot be used
      const errorMessages = errors.map(e => e.message.toLowerCase()).join(' ');
      expect(errorMessages).toMatch(/cannot use reserved keyword|expected|unexpected|invalid/);
    });

    it('should reject THEN as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      THEN@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject ELSE as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      ELSE@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject FOR as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      FOR@1000 : Integer;
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

    it('should reject WHILE as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      WHILE@1000 : Integer;
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

    it('should reject REPEAT as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      REPEAT@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject UNTIL as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      UNTIL@1000 : Integer;
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

    // Block keywords
    it('should reject BEGIN as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      BEGIN@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject END as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      END@1000 : Integer;
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

    // Declaration keywords
    it('should reject VAR as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      VAR@1000 : Integer;
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

    // Note: PROCEDURE, FUNCTION, LOCAL are treated as VAR section boundaries by the parser
    // When encountered with @number syntax, the parser exits the VAR section rather than
    // generating an error. This is intentional behavior from Issue #53 (error recovery).
    // These keywords can still be used as parameter names in procedure definitions.

    // Section keywords (AL-only reserved)
    it('should reject CONTROLS as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      CONTROLS@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject KEYS as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      KEYS@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject CASE as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      CASE@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject OF as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      OF@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject DO as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      DO@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject TO as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      TO@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject DOWNTO as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      DOWNTO@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject EXIT as variable name', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      EXIT@1000 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject multiple reserved keywords together', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      IF@1000 : Integer;
      THEN@1001 : Text[50];
      WHILE@1002 : Decimal;
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      parser.parse();
      const errors = parser.getErrors();

      // Should have errors for IF, THEN, and WHILE (all control flow keywords)
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  /**
   * Edge Cases for New Keywords
   *
   * Tests edge cases for the 7 new data type keywords (FieldRef, RecordRef, RecordID,
   * Duration, BigInteger, Fields, Byte) that were added in Issue #54.
   *
   * Coverage includes:
   * - Usage with assignment operators (:=)
   * - Usage with member access (.)
   * - Usage with function calls (())
   * - Usage in Report objects
   * - Usage with array types
   */
  describe('Edge Cases for New Keywords', () => {
    it('should parse VAR section followed by procedure with [External] attribute', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      FieldRef@1000 : FieldRef;

    [External]
    PROCEDURE TestProc@1();
    BEGIN
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object).not.toBeNull();

      // Verify VAR section parsed correctly
      const variables = ast.object!.code!.variables;
      expect(variables).toHaveLength(1);
      expect(variables[0].name).toBe('FieldRef');

      // Verify procedure parsed correctly
      const procedures = ast.object!.code!.procedures;
      expect(procedures).toHaveLength(1);
      expect(procedures[0].name).toBe('TestProc');
    });

    it('should parse FieldRef with assignment operator', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      FieldRef@1000 : FieldRef;
      AnotherFieldRef@1001 : FieldRef;
    BEGIN
      FieldRef := AnotherFieldRef;
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
      expect(procedures[0].variables).toHaveLength(2);
      expect(procedures[0].variables[0].name).toBe('FieldRef');
      expect(procedures[0].variables[1].name).toBe('AnotherFieldRef');
    });

    it('should parse RecordRef with member access', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordRef@1000 : RecordRef;
    BEGIN
      RecordRef.OPEN(18);
      RecordRef.CLOSE;
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('RecordRef');
    });

    it('should parse Duration with function call', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE CalculateDuration@1() : Duration;
    VAR
      Duration@1000 : Duration;
    BEGIN
      Duration := GetCurrentDuration;
      EXIT(Duration);
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('Duration');
    });

    it('should parse new keywords in Report object', () => {
      const code = `OBJECT Report 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordRef@1000 : RecordRef;
      FieldRef@1001 : FieldRef;
      RecordID@1002 : RecordID;
    BEGIN
      RecordRef.OPEN(18);
      FieldRef := RecordRef.FIELD(1);
      RecordID := RecordRef.RECORDID;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object?.objectKind).toBe('Report');
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].variables).toHaveLength(3);
      expect(procedures[0].variables[0].name).toBe('RecordRef');
      expect(procedures[0].variables[1].name).toBe('FieldRef');
      expect(procedures[0].variables[2].name).toBe('RecordID');
    });

    it('should parse new keywords with array types', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      FieldRef@1000 : ARRAY [10] OF FieldRef;
      Byte@1001 : ARRAY [256] OF Byte;
      Duration@1002 : ARRAY [5] OF Duration;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(3);

      expect(ast.object!.code!.variables[0].name).toBe('FieldRef');
      expect(ast.object!.code!.variables[0].dataType.dimensions).toBeDefined();
      expect(ast.object!.code!.variables[0].dataType.dimensions!.length).toBeGreaterThan(0);

      expect(ast.object!.code!.variables[1].name).toBe('Byte');
      expect(ast.object!.code!.variables[1].dataType.dimensions).toBeDefined();
      expect(ast.object!.code!.variables[1].dataType.dimensions!.length).toBeGreaterThan(0);

      expect(ast.object!.code!.variables[2].name).toBe('Duration');
      expect(ast.object!.code!.variables[2].dataType.dimensions).toBeDefined();
      expect(ast.object!.code!.variables[2].dataType.dimensions!.length).toBeGreaterThan(0);
    });

    it('should parse BigInteger with numeric operations', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      BigInteger@1000 : BigInteger;
    BEGIN
      BigInteger := 9223372036854775807;
      BigInteger := BigInteger + 1;
      BigInteger := BigInteger * 2;
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('BigInteger');
    });

    it('should parse Fields with conditional logic', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      Fields@1000 : Integer;
    BEGIN
      Fields := Customer.COUNT;
      IF Fields > 0 THEN
        MESSAGE('%1 fields found', Fields);
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
      expect(procedures[0].variables).toHaveLength(1);
      expect(procedures[0].variables[0].name).toBe('Fields');
    });

    it('should parse RecordID with multiple operations', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      RecordID@1000 : RecordID;
      Customer@1001 : Record 18;
    BEGIN
      RecordID := Customer.RECORDID;
      IF RecordID.TABLENO = 18 THEN
        MESSAGE('Customer record');
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
      expect(procedures[0].variables).toHaveLength(2);
      expect(procedures[0].variables[0].name).toBe('RecordID');
      expect(procedures[0].variables[1].name).toBe('Customer');
    });
  });

  /**
   * Additional Edge Cases
   *
   * Tests for keyword variables in additional contexts:
   * - XMLport objects
   * - Complex data types (arrays, temporary records)
   * - Mixed scenarios
   */
  describe('Additional Edge Cases', () => {
    it('should parse keyword variables in XMLport objects', () => {
      const code = `OBJECT XMLport 50000 Test
{
  CODE
  {
    PROCEDURE OnPreXMLport@1();
    VAR
      RecordRef@1000 : RecordRef;
      Table@1001 : Record 2000000026;
      Fields@1002 : Integer;
    BEGIN
      RecordRef.OPEN(18);
      Table.FINDFIRST;
      Fields := RecordRef.FIELDCOUNT;
    END;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object?.objectKind).toBe('XMLport');
      const procedures = ast.object?.code?.procedures || [];
      expect(procedures).toHaveLength(1);
      expect(procedures[0].variables).toHaveLength(3);
      expect(procedures[0].variables[0].name).toBe('RecordRef');
      expect(procedures[0].variables[1].name).toBe('Table');
      expect(procedures[0].variables[2].name).toBe('Fields');
    });

    it('should parse keyword variables with TEMPORARY Record arrays', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Record@1000 : ARRAY [10] OF TEMPORARY Record 18;
      Table@1001 : ARRAY [5] OF TEMPORARY Record 2000000026;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(2);

      const recordVar = ast.object!.code!.variables[0];
      expect(recordVar.name).toBe('Record');
      expect(recordVar.dataType.dimensions).toBeDefined();
      expect(recordVar.dataType.dimensions!.length).toBeGreaterThan(0);
      expect(recordVar.isTemporary).toBe(true);

      const tableVar = ast.object!.code!.variables[1];
      expect(tableVar.name).toBe('Table');
      expect(tableVar.dataType.dimensions).toBeDefined();
      expect(tableVar.dataType.dimensions!.length).toBeGreaterThan(0);
      expect(tableVar.isTemporary).toBe(true);
    });

    it('should parse new keywords with complex data types', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1();
    VAR
      FieldRef@1000 : ARRAY [100] OF FieldRef;
      RecordRef@1001 : RecordRef;
      RecordID@1002 : ARRAY [50] OF RecordID;
      Duration@1003 : Duration;
      BigInteger@1004 : ARRAY [10] OF BigInteger;
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
      expect(procedures[0].variables).toHaveLength(5);

      expect(procedures[0].variables[0].name).toBe('FieldRef');
      expect(procedures[0].variables[0].dataType.dimensions).toBeDefined();
      expect(procedures[0].variables[0].dataType.dimensions!.length).toBeGreaterThan(0);

      expect(procedures[0].variables[1].name).toBe('RecordRef');
      expect(procedures[0].variables[1].dataType.dimensions).toBeUndefined();

      expect(procedures[0].variables[2].name).toBe('RecordID');
      expect(procedures[0].variables[2].dataType.dimensions).toBeDefined();
      expect(procedures[0].variables[2].dataType.dimensions!.length).toBeGreaterThan(0);

      expect(procedures[0].variables[3].name).toBe('Duration');

      expect(procedures[0].variables[4].name).toBe('BigInteger');
      expect(procedures[0].variables[4].dataType.dimensions).toBeDefined();
      expect(procedures[0].variables[4].dataType.dimensions!.length).toBeGreaterThan(0);
    });

    it('should parse mixed old and new keyword variables together', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      Object@1000 : Record 2000000001;
      FieldRef@1001 : FieldRef;
      Table@1002 : Record 2000000026;
      RecordRef@1003 : RecordRef;
      Code@1004 : Text[50];
      RecordID@1005 : RecordID;
      Date@1006 : Text[10];
      Duration@1007 : Duration;
      Integer@1008 : Text[20];
      BigInteger@1009 : BigInteger;
      Byte@1010 : Byte;
      Fields@1011 : Integer;
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object!.code!.variables).toHaveLength(12);

      // Verify all variable names are parsed correctly
      expect(ast.object!.code!.variables[0].name).toBe('Object');
      expect(ast.object!.code!.variables[1].name).toBe('FieldRef');
      expect(ast.object!.code!.variables[2].name).toBe('Table');
      expect(ast.object!.code!.variables[3].name).toBe('RecordRef');
      expect(ast.object!.code!.variables[4].name).toBe('Code');
      expect(ast.object!.code!.variables[5].name).toBe('RecordID');
      expect(ast.object!.code!.variables[6].name).toBe('Date');
      expect(ast.object!.code!.variables[7].name).toBe('Duration');
      expect(ast.object!.code!.variables[8].name).toBe('Integer');
      expect(ast.object!.code!.variables[9].name).toBe('BigInteger');
      expect(ast.object!.code!.variables[10].name).toBe('Byte');
      expect(ast.object!.code!.variables[11].name).toBe('Fields');
    });

    it('should parse keyword variables as both parameter and local variable', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(FieldRef@1000 : FieldRef;VAR RecordRef@1001 : RecordRef);
    VAR
      RecordID@1002 : RecordID;
      Duration@1003 : Duration;
      Fields@1004 : Integer;
    BEGIN
      RecordID := RecordRef.RECORDID;
      Fields := RecordRef.FIELDCOUNT;
      Duration := CURRENTDATETIME - StartTime;
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

      // Check parameters
      expect(procedures[0].parameters).toHaveLength(2);
      expect(procedures[0].parameters[0].name).toBe('FieldRef');
      expect(procedures[0].parameters[0].isVar).toBe(false);
      expect(procedures[0].parameters[1].name).toBe('RecordRef');
      expect(procedures[0].parameters[1].isVar).toBe(true);

      // Check local variables
      expect(procedures[0].variables).toHaveLength(3);
      expect(procedures[0].variables[0].name).toBe('RecordID');
      expect(procedures[0].variables[1].name).toBe('Duration');
      expect(procedures[0].variables[2].name).toBe('Fields');
    });

    it('should parse all 7 new keywords with all modifiers combined', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE TestProc@1(
      VAR FieldRef@1000 : FieldRef;
      VAR RecordRef@1001 : RecordRef;
      VAR RecordID@1002 : TEMPORARY Record 18;
      VAR Duration@1003 : Duration;
      VAR BigInteger@1004 : BigInteger;
      VAR Fields@1005 : ARRAY [10] OF Integer;
      VAR Byte@1006 : Byte
    );
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
      expect(procedures[0].parameters).toHaveLength(7);

      // All parameters should have VAR modifier
      procedures[0].parameters.forEach(param => {
        expect(param.isVar).toBe(true);
      });

      // Verify names
      expect(procedures[0].parameters[0].name).toBe('FieldRef');
      expect(procedures[0].parameters[1].name).toBe('RecordRef');
      expect(procedures[0].parameters[2].name).toBe('RecordID');
      expect(procedures[0].parameters[2].isTemporary).toBe(true);
      expect(procedures[0].parameters[3].name).toBe('Duration');
      expect(procedures[0].parameters[4].name).toBe('BigInteger');
      expect(procedures[0].parameters[5].name).toBe('Fields');
      expect(procedures[0].parameters[5].dataType.dimensions).toBeDefined();
      expect(procedures[0].parameters[5].dataType.dimensions!.length).toBeGreaterThan(0);
      expect(procedures[0].parameters[6].name).toBe('Byte');
    });
  });
});
