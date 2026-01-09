/**
 * TESTS: Multi-Dimensional Array Support
 *
 * Tests for parsing and validating multi-dimensional arrays in C/AL.
 *
 * Multi-dimensional array syntax patterns:
 * - Single dimension: ARRAY [10] OF Integer
 * - Two dimensions: ARRAY [9,2] OF Decimal
 * - Three dimensions: ARRAY [10,4,4] OF Decimal
 * - With TEMPORARY: ARRAY [5,5] OF TEMPORARY Record 18
 * - With element type length: ARRAY [2,12] OF Text50
 *
 * Validation requirements:
 * - typeName is correctly formatted (e.g., "ARRAY[9,2] OF Decimal")
 * - dimensions array contains all dimension values
 * - length field equals first dimension (backwards compatibility)
 * - TEMPORARY flag is properly set for ARRAY OF TEMPORARY patterns
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ArrayAccessExpression, AssignmentStatement } from '../ast';

describe('Parser - Multi-Dimensional Arrays', () => {
  describe('Single-dimension arrays (baseline)', () => {
    it('should parse single-dimension array of Integer', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyArray@1 : ARRAY [10] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.name).toBe('MyArray');
      expect(variable?.dataType.typeName).toBe('ARRAY[10] OF Integer');
      expect(variable?.dataType.length).toBe(10);
      expect(variable?.dataType.dimensions).toEqual([10]);
    });

    it('should parse single-dimension array of Text50', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            NameArray@1 : ARRAY [20] OF Text50;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[20] OF Text50');
      expect(variable?.dataType.length).toBe(20);
      expect(variable?.dataType.dimensions).toEqual([20]);
    });

    it('should parse single-dimension array of Record', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            CustomerArray@1 : ARRAY [100] OF Record 18;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[100] OF Record 18');
      expect(variable?.dataType.length).toBe(100);
      expect(variable?.dataType.dimensions).toEqual([100]);
    });
  });

  describe('Two-dimensional arrays', () => {
    it('should parse two-dimensional array of Decimal', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Matrix@1 : ARRAY [9,2] OF Decimal;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.name).toBe('Matrix');
      expect(variable?.dataType.typeName).toBe('ARRAY[9,2] OF Decimal');
      // Backwards compatibility: length should be first dimension
      expect(variable?.dataType.length).toBe(9);
      // All dimensions should be stored
      expect(variable?.dataType.dimensions).toEqual([9, 2]);
    });

    it('should parse two-dimensional array of Integer', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Grid@1 : ARRAY [5,5] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[5,5] OF Integer');
      expect(variable?.dataType.length).toBe(5);
      expect(variable?.dataType.dimensions).toEqual([5, 5]);
    });

    it('should parse two-dimensional array of Text with element type length', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            TextMatrix@1 : ARRAY [2,12] OF Text50;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[2,12] OF Text50');
      expect(variable?.dataType.length).toBe(2);
      expect(variable?.dataType.dimensions).toEqual([2, 12]);
    });

    it('should parse two-dimensional array of Record', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            RecordMatrix@1 : ARRAY [3,4] OF Record 18;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[3,4] OF Record 18');
      expect(variable?.dataType.length).toBe(3);
      expect(variable?.dataType.dimensions).toEqual([3, 4]);
    });
  });

  describe('Three-dimensional arrays', () => {
    it('should parse three-dimensional array of Decimal', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Tensor@1 : ARRAY [10,4,4] OF Decimal;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.name).toBe('Tensor');
      expect(variable?.dataType.typeName).toBe('ARRAY[10,4,4] OF Decimal');
      // Backwards compatibility: length should be first dimension
      expect(variable?.dataType.length).toBe(10);
      // All dimensions should be stored
      expect(variable?.dataType.dimensions).toEqual([10, 4, 4]);
    });

    it('should parse three-dimensional array of Integer', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Cube@1 : ARRAY [2,3,4] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[2,3,4] OF Integer');
      expect(variable?.dataType.length).toBe(2);
      expect(variable?.dataType.dimensions).toEqual([2, 3, 4]);
    });

    it('should parse three-dimensional array of Code20', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            CodeCube@1 : ARRAY [5,5,5] OF Code20;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[5,5,5] OF Code20');
      expect(variable?.dataType.length).toBe(5);
      expect(variable?.dataType.dimensions).toEqual([5, 5, 5]);
    });
  });

  describe('Multi-dimensional arrays with TEMPORARY', () => {
    it('should parse two-dimensional TEMPORARY Record array', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            TempRecordMatrix@1 : ARRAY [5,5] OF TEMPORARY Record 18;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.name).toBe('TempRecordMatrix');
      expect(variable?.dataType.typeName).toBe('ARRAY[5,5] OF Record 18');
      expect(variable?.dataType.isTemporary).toBe(true);
      expect(variable?.dataType.length).toBe(5);
      expect(variable?.dataType.dimensions).toEqual([5, 5]);
    });

    it('should parse three-dimensional TEMPORARY Record array', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            TempCube@1 : ARRAY [3,3,3] OF TEMPORARY Record 48;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[3,3,3] OF Record 48');
      expect(variable?.dataType.isTemporary).toBe(true);
      expect(variable?.dataType.length).toBe(3);
      expect(variable?.dataType.dimensions).toEqual([3, 3, 3]);
    });

    it('should parse TEMPORARY with 2D array in procedure parameter', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessMatrix@1(VAR TempMatrix@1000 : ARRAY [4,4] OF TEMPORARY Record 48);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object?.code?.procedures[0];
      expect(procedure?.parameters).toHaveLength(1);
      const param = procedure?.parameters[0];
      expect(param?.name).toBe('TempMatrix');
      expect(param?.dataType.typeName).toBe('ARRAY[4,4] OF Record 48');
      expect(param?.dataType.isTemporary).toBe(true);
      expect(param?.dataType.dimensions).toEqual([4, 4]);
    });
  });

  describe('Multi-dimensional arrays in procedure parameters', () => {
    it('should parse two-dimensional array parameter', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessMatrix@1(Matrix@1000 : ARRAY [9,2] OF Decimal);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object?.code?.procedures[0];
      const param = procedure?.parameters[0];
      expect(param?.name).toBe('Matrix');
      expect(param?.dataType.typeName).toBe('ARRAY[9,2] OF Decimal');
      expect(param?.dataType.dimensions).toEqual([9, 2]);
    });

    it('should parse three-dimensional array parameter with VAR', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessTensor@1(VAR Tensor@1000 : ARRAY [10,4,4] OF Decimal);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object?.code?.procedures[0];
      const param = procedure?.parameters[0];
      expect(param?.name).toBe('Tensor');
      expect(param?.isVar).toBe(true);
      expect(param?.dataType.typeName).toBe('ARRAY[10,4,4] OF Decimal');
      expect(param?.dataType.dimensions).toEqual([10, 4, 4]);
    });

    it('should parse multiple multi-dimensional array parameters', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessArrays@1(Matrix@1000 : ARRAY [5,5] OF Integer; Grid@1001 : ARRAY [3,3] OF Decimal);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object?.code?.procedures[0];
      expect(procedure?.parameters).toHaveLength(2);

      const param1 = procedure?.parameters[0];
      expect(param1?.dataType.typeName).toBe('ARRAY[5,5] OF Integer');
      expect(param1?.dataType.dimensions).toEqual([5, 5]);

      const param2 = procedure?.parameters[1];
      expect(param2?.dataType.typeName).toBe('ARRAY[3,3] OF Decimal');
      expect(param2?.dataType.dimensions).toEqual([3, 3]);
    });
  });

  describe('Multi-dimensional arrays in field declarations', () => {
    it('should parse two-dimensional array field', () => {
      const code = `OBJECT Table 1 TestTable {
        FIELDS {
          { 1 ; ; Matrix ; ARRAY [5,5] OF Decimal }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldName).toBe('Matrix');
      expect(field?.dataType.typeName).toBe('ARRAY[5,5] OF Decimal');
      expect(field?.dataType.dimensions).toEqual([5, 5]);
    });

    it('should parse three-dimensional array field', () => {
      const code = `OBJECT Table 1 TestTable {
        FIELDS {
          { 1 ; ; Cube ; ARRAY [4,4,4] OF Code20 }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const field = ast.object?.fields?.fields[0];
      expect(field?.fieldName).toBe('Cube');
      expect(field?.dataType.typeName).toBe('ARRAY[4,4,4] OF Code20');
      expect(field?.dataType.dimensions).toEqual([4, 4, 4]);
    });
  });

  describe('Edge cases and large dimensions', () => {
    it('should parse array with large dimensions', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            LargeArray@1 : ARRAY [100,50,25] OF Decimal;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.dimensions).toEqual([100, 50, 25]);
      expect(variable?.dataType.length).toBe(100);
    });

    it('should parse array with many dimensions (5D)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            HyperCube@1 : ARRAY [2,3,4,5,6] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.dimensions).toEqual([2, 3, 4, 5, 6]);
      expect(variable?.dataType.length).toBe(2);
    });

    it('should parse array with single-digit and double-digit dimensions mixed', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MixedArray@1 : ARRAY [1,20,333,4444] OF Text100;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.dimensions).toEqual([1, 20, 333, 4444]);
      expect(variable?.dataType.typeName).toBe('ARRAY[1,20,333,4444] OF Text100');
    });
  });

  describe('Backwards compatibility', () => {
    it('should maintain length field as first dimension for single-dimension arrays', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyArray@1 : ARRAY [42] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.length).toBe(42);
      expect(variable?.dataType.dimensions).toEqual([42]);
    });

    it('should maintain length field as first dimension for multi-dimensional arrays', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Matrix@1 : ARRAY [9,2] OF Decimal;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.length).toBe(9);
      expect(variable?.dataType.dimensions).toEqual([9, 2]);
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should parse multiple multi-dimensional arrays in same procedure', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Matrix1@1 : ARRAY [9,2] OF Decimal;
            Matrix2@2 : ARRAY [5,5] OF Integer;
            Tensor@3 : ARRAY [10,4,4] OF Text50;

          PROCEDURE ProcessData();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object?.code?.variables).toHaveLength(3);

      const var1 = ast.object?.code?.variables[0];
      expect(var1?.dataType.dimensions).toEqual([9, 2]);

      const var2 = ast.object?.code?.variables[1];
      expect(var2?.dataType.dimensions).toEqual([5, 5]);

      const var3 = ast.object?.code?.variables[2];
      expect(var3?.dataType.dimensions).toEqual([10, 4, 4]);
    });

    it('should parse mix of single and multi-dimensional arrays', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            SimpleArray@1 : ARRAY [10] OF Integer;
            Matrix@2 : ARRAY [5,5] OF Decimal;
            SimpleAgain@3 : ARRAY [20] OF Text50;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      expect(ast.object?.code?.variables).toHaveLength(3);

      const var1 = ast.object?.code?.variables[0];
      expect(var1?.dataType.dimensions).toEqual([10]);

      const var2 = ast.object?.code?.variables[1];
      expect(var2?.dataType.dimensions).toEqual([5, 5]);

      const var3 = ast.object?.code?.variables[2];
      expect(var3?.dataType.dimensions).toEqual([20]);
    });

    it('should parse procedure with multi-dimensional array and normal parameters', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessMatrix@1(
            CustomerNo@1000 : Code20;
            VAR Matrix@1001 : ARRAY [9,2] OF Decimal;
            Status@1002 : Integer);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const procedure = ast.object?.code?.procedures[0];
      expect(procedure?.parameters).toHaveLength(3);

      const param1 = procedure?.parameters[0];
      expect(param1?.name).toBe('CustomerNo');
      expect(param1?.dataType.typeName).toBe('Code20');

      const param2 = procedure?.parameters[1];
      expect(param2?.name).toBe('Matrix');
      expect(param2?.dataType.dimensions).toEqual([9, 2]);

      const param3 = procedure?.parameters[2];
      expect(param3?.name).toBe('Status');
      expect(param3?.dataType.typeName).toBe('Integer');
    });
  });

  describe('Text bracket notation (Text[30] syntax)', () => {
    it('should parse two-dimensional array with Text[30] bracket notation', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            TextMatrix@1 : ARRAY [5,4] OF Text[30];

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[5,4] OF Text[30]');
      expect(variable?.dataType.dimensions).toEqual([5, 4]);
    });

    it('should parse three-dimensional array with Code[20] bracket notation', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            CodeCube@1 : ARRAY [3,3,3] OF Code[20];

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.typeName).toBe('ARRAY[3,3,3] OF Code[20]');
      expect(variable?.dataType.dimensions).toEqual([3, 3, 3]);
    });

    it('should parse procedure parameter with Text[50] bracket notation', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          PROCEDURE ProcessData@1(VAR Values@1000 : ARRAY [2,12] OF Text[50]);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const param = ast.object?.code?.procedures[0]?.parameters[0];
      expect(param?.dataType.typeName).toBe('ARRAY[2,12] OF Text[50]');
      expect(param?.dataType.dimensions).toEqual([2, 12]);
    });
  });

  describe('Error handling for malformed arrays', () => {
    it('should handle missing dimension after comma gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            BadArray@1 : ARRAY [5,] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      parser.parse();

      // Should record an error but not crash
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle non-integer dimension gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            BadArray@1 : ARRAY [5,abc] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      parser.parse();

      // Should record an error but not crash
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle missing closing bracket gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            BadArray@1 : ARRAY [5,5 OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      parser.parse();

      // Should record an error but not crash
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle missing first dimension gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            BadArray@1 : ARRAY [,5] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      parser.parse();

      // Should record an error but not crash
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should handle empty brackets gracefully', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            BadArray@1 : ARRAY [] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      parser.parse();

      // Should record an error but not crash
      expect(parser.getErrors().length).toBeGreaterThan(0);
    });

    it('should report error when array has more than 10 dimensions', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            TooManyDims@1 : ARRAY [1,2,3,4,5,6,7,8,9,10,11] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      parser.parse();

      // Should record an error about too many dimensions
      const errors = parser.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('more than 10 dimensions'))).toBe(true);
    });

    it('should allow array with exactly 10 dimensions', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MaxDims@1 : ARRAY [1,2,3,4,5,6,7,8,9,10] OF Integer;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Should not report any dimension-related errors
      expect(parser.getErrors()).toHaveLength(0);
      const variable = ast.object?.code?.variables[0];
      expect(variable?.dataType.dimensions).toHaveLength(10);
    });
  });

  describe('Multi-dimensional array ACCESS expressions', () => {
    it('should parse single-dimension array access', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            MyArray@1 : ARRAY [10] OF Integer;

          PROCEDURE TestProc();
          BEGIN
            MyArray[1] := 5;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object?.code?.procedures[0];
      expect(proc).toBeDefined();
      const stmt = proc?.body?.[0];
      expect(stmt).toBeDefined();
      expect(stmt!.type).toBe('AssignmentStatement');
      const assignStmt = stmt as AssignmentStatement;
      expect(assignStmt.target.type).toBe('ArrayAccessExpression');
      const arrayAccess = assignStmt.target as ArrayAccessExpression;
      expect(arrayAccess.indices).toHaveLength(1);
    });

    it('should parse two-dimensional array access', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Matrix@1 : ARRAY [9,2] OF Decimal;

          PROCEDURE TestProc();
          BEGIN
            Matrix[1,2] := 3.14;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object?.code?.procedures[0];
      expect(proc).toBeDefined();
      const stmt = proc?.body?.[0];
      expect(stmt).toBeDefined();
      expect(stmt!.type).toBe('AssignmentStatement');
      const assignStmt = stmt as AssignmentStatement;
      expect(assignStmt.target.type).toBe('ArrayAccessExpression');
      const arrayAccess = assignStmt.target as ArrayAccessExpression;
      expect(arrayAccess.indices).toHaveLength(2);
    });

    it('should parse three-dimensional array access (like COD1008)', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            JobLedgAmounts@1 : ARRAY [10,4,4] OF Decimal;

          PROCEDURE TestProc();
          BEGIN
            JobLedgAmounts[1,2,3] := 100.0;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object?.code?.procedures[0];
      expect(proc).toBeDefined();
      const stmt = proc?.body?.[0];
      expect(stmt).toBeDefined();
      expect(stmt!.type).toBe('AssignmentStatement');
      const assignStmt = stmt as AssignmentStatement;
      expect(assignStmt.target.type).toBe('ArrayAccessExpression');
      const arrayAccess = assignStmt.target as ArrayAccessExpression;
      expect(arrayAccess.indices).toHaveLength(3);
    });

    it('should parse array access with complex expressions in indices', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            JobLedgAmounts@1 : ARRAY [10,4,4] OF Decimal;
            EntryTypeParm@2 : Integer;
            TypeParm@3 : Integer;

          PROCEDURE TestProc();
          BEGIN
            JobLedgAmounts[1 + EntryTypeParm, 1 + TypeParm, 1] := 100.0;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object?.code?.procedures[0];
      expect(proc).toBeDefined();
      const stmt = proc?.body?.[0];
      expect(stmt).toBeDefined();
      expect(stmt!.type).toBe('AssignmentStatement');
      const assignStmt = stmt as AssignmentStatement;
      expect(assignStmt.target.type).toBe('ArrayAccessExpression');
      const arrayAccess = assignStmt.target as ArrayAccessExpression;
      expect(arrayAccess.indices).toHaveLength(3);
      // First index should be a binary expression (1 + EntryTypeParm)
      expect(arrayAccess.indices[0].type).toBe('BinaryExpression');
    });

    it('should parse array access with option member in index', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Values@1 : ARRAY [10,4,4] OF Decimal;

          PROCEDURE TestProc();
          BEGIN
            Values[1, 2, AmountType::TotalCost] := 50.0;
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object?.code?.procedures[0];
      expect(proc).toBeDefined();
      const stmt = proc?.body?.[0];
      expect(stmt).toBeDefined();
      expect(stmt!.type).toBe('AssignmentStatement');
      const assignStmt = stmt as AssignmentStatement;
      expect(assignStmt.target.type).toBe('ArrayAccessExpression');
      const arrayAccess = assignStmt.target as ArrayAccessExpression;
      expect(arrayAccess.indices).toHaveLength(3);
      // Third index should be a member expression (AmountType::TotalCost)
      expect(arrayAccess.indices[2].type).toBe('MemberExpression');
    });

    it('should parse array access on right-hand side of assignment', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Matrix@1 : ARRAY [3,3] OF Integer;
            Value@2 : Integer;

          PROCEDURE TestProc();
          BEGIN
            Value := Matrix[1,2];
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
      const proc = ast.object?.code?.procedures[0];
      expect(proc).toBeDefined();
      const stmt = proc?.body?.[0];
      expect(stmt).toBeDefined();
      expect(stmt!.type).toBe('AssignmentStatement');
      const assignStmt = stmt as AssignmentStatement;
      expect(assignStmt.value.type).toBe('ArrayAccessExpression');
      const arrayAccess = assignStmt.value as ArrayAccessExpression;
      expect(arrayAccess.indices).toHaveLength(2);
    });

    it('should parse nested array access in function call arguments', () => {
      const code = `OBJECT Codeunit 1 Test {
        CODE {
          VAR
            Data@1 : ARRAY [5,5] OF Decimal;

          PROCEDURE TestProc();
          BEGIN
            ProcessValue(Data[1,2]);
          END;

          PROCEDURE ProcessValue(Val : Decimal);
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      parser.parse();

      expect(parser.getErrors()).toHaveLength(0);
    });
  });
});
