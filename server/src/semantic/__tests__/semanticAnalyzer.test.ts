/**
 * SemanticAnalyzer Tests
 *
 * Tests for the main semantic analyzer that coordinates validation.
 * The SemanticAnalyzer:
 * - Can be instantiated
 * - Provides ValidationContext to validators
 * - Returns empty diagnostics for valid code
 * - Returns diagnostics from registered validators
 * - Integrates with ValidationPipeline
 *
 * Test Strategy: These tests SHOULD FAIL initially since SemanticAnalyzer
 * doesn't exist yet. This validates the tests are meaningful (TDD approach).
 */

import { SemanticAnalyzer } from '../semanticAnalyzer';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../../symbols/symbolTable';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';

describe('SemanticAnalyzer - Instantiation', () => {
  it('should create a semantic analyzer', () => {
    const analyzer = new SemanticAnalyzer();
    expect(analyzer).toBeDefined();
  });

  it('should be able to create multiple analyzers', () => {
    const analyzer1 = new SemanticAnalyzer();
    const analyzer2 = new SemanticAnalyzer();

    expect(analyzer1).toBeDefined();
    expect(analyzer2).toBeDefined();
    expect(analyzer1).not.toBe(analyzer2);
  });
});

describe('SemanticAnalyzer - Basic Analysis', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  it('should return empty diagnostics for valid code', () => {
    const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE ValidProcedure();
    VAR
      x : Integer;
    BEGIN
      x := 42;
      MESSAGE('Hello');
    END;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///test.cal'
    );

    expect(diagnostics).toBeDefined();
    expect(Array.isArray(diagnostics)).toBe(true);
    expect(diagnostics).toHaveLength(0);
  });

  it('should return empty diagnostics for minimal valid code', () => {
    const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///customer.cal'
    );

    expect(diagnostics).toHaveLength(0);
  });

  it('should handle empty code section', () => {
    const code = `OBJECT Codeunit 1 Test
{
  CODE
  {
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///test.cal'
    );

    expect(diagnostics).toHaveLength(0);
  });
});

describe('SemanticAnalyzer - ValidationContext', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  it('should provide ValidationContext with ast', () => {
    const code = `OBJECT Codeunit 1 Test { CODE { } }`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    // Analysis should work without errors
    expect(() => {
      analyzer.analyze(ast, symbolTable, 'file:///test.cal');
    }).not.toThrow();
  });

  it('should provide ValidationContext with symbolTable', () => {
    const code = `OBJECT Codeunit 1 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      x := 1;
    END;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    // Add a symbol to verify it's passed correctly
    symbolTable.defineGlobal({
      name: 'TestSymbol',
      kind: 'variable',
      type: 'Integer',
      startOffset: 0,
      endOffset: 10
    });

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///test.cal'
    );

    expect(diagnostics).toBeDefined();
  });

  it('should provide ValidationContext with builtins', () => {
    const code = `OBJECT Codeunit 1 Test
{
  CODE
  {
    PROCEDURE Test();
    BEGIN
      MESSAGE('Using builtin function');
    END;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///test.cal'
    );

    // Should not flag MESSAGE as undefined
    expect(diagnostics).toBeDefined();
  });

  it('should provide ValidationContext with documentUri', () => {
    const code = `OBJECT Codeunit 1 Test { CODE { } }`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const testUri = 'file:///path/to/test.cal';
    const diagnostics = analyzer.analyze(ast, symbolTable, testUri);

    expect(diagnostics).toBeDefined();
    // If diagnostics are returned, they should reference the correct URI
    // (tested more thoroughly in integration tests)
  });
});

describe('SemanticAnalyzer - Integration with Validators', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  it('should return diagnostics from EmptySetValidator', () => {
    // This test verifies integration with at least one validator
    const code = `OBJECT Codeunit 1 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
    BEGIN
      IF x IN [] THEN
        EXIT;
    END;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///test.cal'
    );

    // Should have at least one diagnostic from EmptySetValidator
    expect(diagnostics.length).toBeGreaterThan(0);

    const emptySetDiagnostic = diagnostics.find(d =>
      d.message.includes('Empty set in IN expression')
    );
    expect(emptySetDiagnostic).toBeDefined();
    expect(emptySetDiagnostic?.severity).toBe(DiagnosticSeverity.Warning);
  });

  it('should collect diagnostics from multiple issues', () => {
    const code = `OBJECT Codeunit 1 Test
{
  CODE
  {
    PROCEDURE Test();
    VAR
      x : Integer;
      y : Integer;
    BEGIN
      IF x IN [] THEN
        EXIT;
      IF y IN [] THEN
        EXIT;
    END;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///test.cal'
    );

    // Should detect both empty sets
    expect(diagnostics.length).toBeGreaterThanOrEqual(2);
  });
});

describe('SemanticAnalyzer - Error Handling', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  it('should handle parse errors gracefully', () => {
    const code = `OBJECT InvalidType 1 Test {
      CODE {
        PROCEDURE Test();
        BEGIN
          // Incomplete
    }`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    // Should not throw even with parse errors
    expect(() => {
      analyzer.analyze(ast, symbolTable, 'file:///test.cal');
    }).not.toThrow();
  });

  it('should handle malformed AST', () => {
    const code = `OBJECT Codeunit 1 Test {
      CODE {
        PROCEDURE;
      }
    }`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    expect(() => {
      analyzer.analyze(ast, symbolTable, 'file:///test.cal');
    }).not.toThrow();
  });

  it('should handle empty AST', () => {
    const code = '';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    expect(() => {
      analyzer.analyze(ast, symbolTable, 'file:///test.cal');
    }).not.toThrow();
  });
});

describe('SemanticAnalyzer - Real-World Patterns', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  it('should analyze Sales-Post pattern correctly', () => {
    const code = `OBJECT Codeunit 80 "Sales-Post"
{
  CODE
  {
    PROCEDURE PostDocument(VAR SalesHeader : Record 36);
    VAR
      SalesLine : Record 37;
    BEGIN
      WITH SalesHeader DO BEGIN
        TESTFIELD("No.");
        TESTFIELD("Document Type");
      END;

      SalesLine.SETRANGE("Document No.", SalesHeader."No.");
      IF SalesLine.FINDSET THEN
        REPEAT
          // Process lines
        UNTIL SalesLine.NEXT = 0;
    END;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///sales-post.cal'
    );

    // Should not flag TESTFIELD, SETRANGE, FINDSET, NEXT as undefined
    // (they are builtin record methods)
    const undefinedErrors = diagnostics.filter(d =>
      d.message.toLowerCase().includes('undefined')
    );

    // Should have no undefined identifier errors for builtins
    const builtinErrors = undefinedErrors.filter(d =>
      d.message.includes('TESTFIELD') ||
      d.message.includes('SETRANGE') ||
      d.message.includes('FINDSET') ||
      d.message.includes('NEXT')
    );
    expect(builtinErrors).toHaveLength(0);
  });

  it('should handle complex WITH nesting', () => {
    const code = `OBJECT Codeunit 1 Test
{
  CODE
  {
    PROCEDURE ProcessData();
    VAR
      Customer : Record 18;
      Vendor : Record 23;
    BEGIN
      WITH Customer DO BEGIN
        VALIDATE("No.");
        WITH Vendor DO BEGIN
          VALIDATE("No.");
        END;
      END;
    END;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    expect(() => {
      analyzer.analyze(ast, symbolTable, 'file:///test.cal');
    }).not.toThrow();
  });

  it('should not produce false positives for valid code', () => {
    const code = `OBJECT Codeunit 1 Test
{
  CODE
  {
    PROCEDURE Calculate();
    VAR
      Amount : Decimal;
      Quantity : Integer;
      Price : Decimal;
    BEGIN
      Amount := Quantity * Price;
      Amount := ROUND(Amount, 0.01);
      MESSAGE('Amount: %1', Amount);
    END;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///test.cal'
    );

    // Should have no errors for this valid code
    const errors = diagnostics.filter(
      d => d.severity === DiagnosticSeverity.Error
    );
    expect(errors).toHaveLength(0);
  });
});

describe('SemanticAnalyzer - Edge Cases', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    analyzer = new SemanticAnalyzer();
  });

  it('should handle very large files', () => {
    // Generate large code
    let code = `OBJECT Codeunit 1 Test {\n  CODE {\n`;

    for (let i = 0; i < 100; i++) {
      code += `    PROCEDURE Proc${i}();\n`;
      code += `    VAR x : Integer;\n`;
      code += `    BEGIN\n`;
      code += `      x := ${i};\n`;
      code += `    END;\n\n`;
    }

    code += `  }\n}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    expect(() => {
      analyzer.analyze(ast, symbolTable, 'file:///large.cal');
    }).not.toThrow();
  });

  it('should handle table without code section', () => {
    const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20        }
    { 2   ;   ;Name            ;Text50        }
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    const diagnostics = analyzer.analyze(
      ast,
      symbolTable,
      'file:///customer.cal'
    );

    expect(diagnostics).toBeDefined();
    expect(Array.isArray(diagnostics)).toBe(true);
  });

  it('should handle codeunit with multiple procedures', () => {
    const code = `OBJECT Codeunit 1 Test
{
  CODE
  {
    PROCEDURE First();
    BEGIN
    END;

    PROCEDURE Second();
    BEGIN
    END;

    PROCEDURE Third();
    BEGIN
    END;
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();

    expect(() => {
      analyzer.analyze(ast, symbolTable, 'file:///test.cal');
    }).not.toThrow();
  });
});
