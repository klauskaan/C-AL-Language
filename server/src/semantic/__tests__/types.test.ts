/**
 * Semantic Types Tests
 *
 * Tests for the core semantic analysis type definitions.
 * These types define the interfaces for:
 * - Validator: Interface for semantic validators
 * - ValidationContext: Context passed to validators during analysis
 */

import { Validator, ValidationContext } from '../types';
import { CALDocument } from '../../parser/ast';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../builtinRegistry';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { TokenType } from '../../lexer/tokens';

describe('Semantic Types - Validator Interface', () => {
  it('should allow implementing Validator interface', () => {
    // A class implementing the Validator interface
    class TestValidator implements Validator {
      readonly name = 'TestValidator';
      validate(context: ValidationContext): Diagnostic[] {
        return [];
      }
    }

    const validator = new TestValidator();
    expect(validator).toBeDefined();
    expect(typeof validator.validate).toBe('function');
  });

  it('should accept ValidationContext parameter', () => {
    class TestValidator implements Validator {
      readonly name = 'TestValidator';
      validate(context: ValidationContext): Diagnostic[] {
        // Should be able to access context properties
        expect(context.ast).toBeDefined();
        expect(context.symbolTable).toBeDefined();
        expect(context.builtins).toBeDefined();
        expect(context.documentUri).toBeDefined();
        return [];
      }
    }

    const validator = new TestValidator();
    const context: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    validator.validate(context);
  });

  it('should return array of diagnostics', () => {
    class TestValidator implements Validator {
      readonly name = 'TestValidator';
      validate(_context: ValidationContext): Diagnostic[] {
        return [
          {
            message: 'Test diagnostic',
            severity: DiagnosticSeverity.Warning,
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 }
            },
            source: 'cal'
          }
        ];
      }
    }

    const validator = new TestValidator();
    const context: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    const diagnostics = validator.validate(context);
    expect(Array.isArray(diagnostics)).toBe(true);
    expect(diagnostics).toHaveLength(1);
  });
});

describe('Semantic Types - ValidationContext', () => {
  it('should create ValidationContext with all required fields', () => {
    const context: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    expect(context.ast).toBeDefined();
    expect(context.symbolTable).toBeDefined();
    expect(context.builtins).toBeDefined();
    expect(context.documentUri).toBe('file:///test.cal');
  });

  it('should allow passing real AST to context', () => {
    const mockAst: CALDocument = {
      type: 'CALDocument',
      object: null,
      startToken: { type: TokenType.EOF, value: '', line: 1, column: 1, startOffset: 0, endOffset: 0 },
      endToken: { type: TokenType.EOF, value: '', line: 1, column: 1, startOffset: 0, endOffset: 0 }
    };

    const context: ValidationContext = {
      ast: mockAst,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    expect(context.ast.type).toBe('CALDocument');
  });

  it('should allow passing SymbolTable to context', () => {
    const symbolTable = new SymbolTable();
    symbolTable.defineGlobal({
      name: 'TestSymbol',
      kind: 'variable',
      type: 'Integer',
      startOffset: 0,
      endOffset: 10
    });

    const context: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: symbolTable,
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    expect(context.symbolTable).toBe(symbolTable);
  });

  it('should allow passing BuiltinRegistry to context', () => {
    const builtins = new BuiltinRegistry();

    const context: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: builtins,
      documentUri: 'file:///test.cal'
    };

    expect(context.builtins).toBe(builtins);
  });

  it('should allow different documentUri values', () => {
    const uris = [
      'file:///test.cal',
      'file:///path/to/file.cal',
      'file:///C:/Windows/path.cal',
      'untitled:Untitled-1'
    ];

    uris.forEach(uri => {
      const context: ValidationContext = {
        ast: {} as CALDocument,
        symbolTable: new SymbolTable(),
        builtins: new BuiltinRegistry(),
        documentUri: uri
      };

      expect(context.documentUri).toBe(uri);
    });
  });
});

describe('Semantic Types - Validator Implementation Examples', () => {
  it('should allow simple validator implementation', () => {
    class SimpleValidator implements Validator {
      readonly name = 'SimpleValidator';
      validate(_context: ValidationContext): Diagnostic[] {
        return [];
      }
    }

    const validator: Validator = new SimpleValidator();
    expect(validator).toBeDefined();
  });

  it('should allow stateful validator implementation', () => {
    class StatefulValidator implements Validator {
      readonly name = 'StatefulValidator';
      private diagnosticCount = 0;

      validate(_context: ValidationContext): Diagnostic[] {
        this.diagnosticCount++;
        return [];
      }

      getDiagnosticCount(): number {
        return this.diagnosticCount;
      }
    }

    const validator = new StatefulValidator();
    const context: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    validator.validate(context);
    validator.validate(context);

    expect(validator.getDiagnosticCount()).toBe(2);
  });

  it('should allow validator using context data', () => {
    class ContextUsingValidator implements Validator {
      readonly name = 'ContextUsingValidator';
      validate(context: ValidationContext): Diagnostic[] {
        // Use AST
        if (context.ast.object) {
          // Process object
        }

        // Use SymbolTable
        const symbol = context.symbolTable.getSymbol('test');

        // Use BuiltinRegistry
        const isBuiltin = context.builtins.isGlobalFunction('MESSAGE');

        // Use documentUri
        const uri = context.documentUri;

        return [];
      }
    }

    const validator = new ContextUsingValidator();
    const context: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    expect(() => validator.validate(context)).not.toThrow();
  });

  it('should allow validator returning multiple diagnostics', () => {
    class MultiDiagnosticValidator implements Validator {
      readonly name = 'MultiDiagnosticValidator';
      validate(_context: ValidationContext): Diagnostic[] {
        return [
          {
            message: 'First issue',
            severity: DiagnosticSeverity.Warning,
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 5 }
            },
            source: 'cal'
          },
          {
            message: 'Second issue',
            severity: DiagnosticSeverity.Error,
            range: {
              start: { line: 1, character: 0 },
              end: { line: 1, character: 5 }
            },
            source: 'cal'
          }
        ];
      }
    }

    const validator = new MultiDiagnosticValidator();
    const context: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    const diagnostics = validator.validate(context);
    expect(diagnostics).toHaveLength(2);
  });
});
