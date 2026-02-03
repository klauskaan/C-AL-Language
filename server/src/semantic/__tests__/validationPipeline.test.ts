/**
 * ValidationPipeline Tests
 *
 * Tests for the pipeline that runs multiple validators and collects diagnostics.
 * The pipeline should:
 * - Run registered validators in sequence
 * - Collect and merge diagnostics from all validators
 * - Handle validator errors gracefully (catch, log, continue)
 * - Pass correct ValidationContext to each validator
 * - Return empty diagnostics for empty pipeline
 *
 * Test Strategy: These tests SHOULD FAIL initially since ValidationPipeline
 * doesn't exist yet. This validates the tests are meaningful (TDD approach).
 */

import { ValidationPipeline } from '../validationPipeline';
import { Validator, ValidationContext } from '../types';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { CALDocument } from '../../parser/ast';
import { SymbolTable } from '../../symbols/symbolTable';
import { BuiltinRegistry } from '../builtinRegistry';

describe('ValidationPipeline - Basic Functionality', () => {
  it('should create an empty pipeline', () => {
    const pipeline = new ValidationPipeline();
    expect(pipeline).toBeDefined();
  });

  it('should return empty diagnostics for empty pipeline', () => {
    const pipeline = new ValidationPipeline();
    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    const diagnostics = pipeline.validate(mockContext);
    expect(diagnostics).toEqual([]);
  });
});

describe('ValidationPipeline - Validator Registration', () => {
  it('should register a single validator', () => {
    const pipeline = new ValidationPipeline();
    const mockValidator: Validator = {
      name: 'MockValidator',
      validate: jest.fn().mockReturnValue([])
    };

    pipeline.addValidator(mockValidator);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    pipeline.validate(mockContext);
    expect(mockValidator.validate).toHaveBeenCalledTimes(1);
  });

  it('should register multiple validators', () => {
    const pipeline = new ValidationPipeline();
    const validator1: Validator = {
      name: 'Validator1',
      validate: jest.fn().mockReturnValue([])
    };
    const validator2: Validator = {
      name: 'Validator2',
      validate: jest.fn().mockReturnValue([])
    };
    const validator3: Validator = {
      name: 'Validator3',
      validate: jest.fn().mockReturnValue([])
    };

    pipeline.addValidator(validator1);
    pipeline.addValidator(validator2);
    pipeline.addValidator(validator3);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    pipeline.validate(mockContext);
    expect(validator1.validate).toHaveBeenCalledTimes(1);
    expect(validator2.validate).toHaveBeenCalledTimes(1);
    expect(validator3.validate).toHaveBeenCalledTimes(1);
  });

  it('should run validators in registration order', () => {
    const pipeline = new ValidationPipeline();
    const executionOrder: number[] = [];

    const validator1: Validator = {
      name: 'Validator1',
      validate: jest.fn(() => {
        executionOrder.push(1);
        return [];
      })
    };
    const validator2: Validator = {
      name: 'Validator2',
      validate: jest.fn(() => {
        executionOrder.push(2);
        return [];
      })
    };
    const validator3: Validator = {
      name: 'Validator3',
      validate: jest.fn(() => {
        executionOrder.push(3);
        return [];
      })
    };

    pipeline.addValidator(validator1);
    pipeline.addValidator(validator2);
    pipeline.addValidator(validator3);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    pipeline.validate(mockContext);
    expect(executionOrder).toEqual([1, 2, 3]);
  });
});

describe('ValidationPipeline - Diagnostic Collection', () => {
  it('should collect diagnostics from single validator', () => {
    const pipeline = new ValidationPipeline();
    const diagnostic: Diagnostic = {
      message: 'Test warning',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 }
      },
      source: 'cal'
    };

    const validator: Validator = {
      name: 'Validator',
      validate: jest.fn().mockReturnValue([diagnostic])
    };

    pipeline.addValidator(validator);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    const diagnostics = pipeline.validate(mockContext);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toEqual(diagnostic);
  });

  it('should merge diagnostics from multiple validators', () => {
    const pipeline = new ValidationPipeline();

    const diagnostic1: Diagnostic = {
      message: 'Warning 1',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 }
      },
      source: 'cal'
    };

    const diagnostic2: Diagnostic = {
      message: 'Error 2',
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 5 }
      },
      source: 'cal'
    };

    const diagnostic3: Diagnostic = {
      message: 'Info 3',
      severity: DiagnosticSeverity.Information,
      range: {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 3 }
      },
      source: 'cal'
    };

    const validator1: Validator = {
      name: 'Validator1',
      validate: jest.fn().mockReturnValue([diagnostic1])
    };
    const validator2: Validator = {
      name: 'Validator2',
      validate: jest.fn().mockReturnValue([diagnostic2, diagnostic3])
    };

    pipeline.addValidator(validator1);
    pipeline.addValidator(validator2);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    const diagnostics = pipeline.validate(mockContext);
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics).toContainEqual(diagnostic1);
    expect(diagnostics).toContainEqual(diagnostic2);
    expect(diagnostics).toContainEqual(diagnostic3);
  });

  it('should handle validators that return empty arrays', () => {
    const pipeline = new ValidationPipeline();

    const diagnostic: Diagnostic = {
      message: 'Warning',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 }
      },
      source: 'cal'
    };

    const validator1: Validator = {
      name: 'Validator1',
      validate: jest.fn().mockReturnValue([])
    };
    const validator2: Validator = {
      name: 'Validator2',
      validate: jest.fn().mockReturnValue([diagnostic])
    };
    const validator3: Validator = {
      name: 'Validator3',
      validate: jest.fn().mockReturnValue([])
    };

    pipeline.addValidator(validator1);
    pipeline.addValidator(validator2);
    pipeline.addValidator(validator3);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    const diagnostics = pipeline.validate(mockContext);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toEqual(diagnostic);
  });
});

describe('ValidationPipeline - Context Passing', () => {
  it('should pass correct ValidationContext to validators', () => {
    const pipeline = new ValidationPipeline();

    const mockAst = { type: 'CALDocument' } as CALDocument;
    const mockSymbolTable = new SymbolTable();
    const mockBuiltins = new BuiltinRegistry();
    const mockUri = 'file:///test.cal';

    const validator: Validator = {
      name: 'Validator',
      validate: jest.fn().mockReturnValue([])
    };

    pipeline.addValidator(validator);

    const context: ValidationContext = {
      ast: mockAst,
      symbolTable: mockSymbolTable,
      builtins: mockBuiltins,
      documentUri: mockUri
    };

    pipeline.validate(context);

    expect(validator.validate).toHaveBeenCalledWith(context);
    expect(validator.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        ast: mockAst,
        symbolTable: mockSymbolTable,
        builtins: mockBuiltins,
        documentUri: mockUri
      })
    );
  });

  it('should pass same context to all validators', () => {
    const pipeline = new ValidationPipeline();

    const context: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    const validator1: Validator = {
      name: 'Validator1',
      validate: jest.fn().mockReturnValue([])
    };
    const validator2: Validator = {
      name: 'Validator2',
      validate: jest.fn().mockReturnValue([])
    };

    pipeline.addValidator(validator1);
    pipeline.addValidator(validator2);

    pipeline.validate(context);

    expect(validator1.validate).toHaveBeenCalledWith(context);
    expect(validator2.validate).toHaveBeenCalledWith(context);
  });
});

describe('ValidationPipeline - Error Handling', () => {
  it('should catch validator errors and continue with other validators', () => {
    const pipeline = new ValidationPipeline();

    const diagnostic: Diagnostic = {
      message: 'Valid diagnostic',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 }
      },
      source: 'cal'
    };

    const errorValidator: Validator = {
      name: 'ErrorValidator',
      validate: jest.fn(() => {
        throw new Error('Validator crashed');
      })
    };

    const goodValidator: Validator = {
      name: 'GoodValidator',
      validate: jest.fn().mockReturnValue([diagnostic])
    };

    pipeline.addValidator(errorValidator);
    pipeline.addValidator(goodValidator);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    // Should not throw
    expect(() => pipeline.validate(mockContext)).not.toThrow();

    // Should still get diagnostics from good validator
    const diagnostics = pipeline.validate(mockContext);
    expect(diagnostics).toContainEqual(diagnostic);
  });

  it('should log validator errors', () => {
    const pipeline = new ValidationPipeline();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const errorValidator: Validator = {
      name: 'ErrorValidator',
      validate: jest.fn(() => {
        throw new Error('Validator crashed');
      })
    };

    pipeline.addValidator(errorValidator);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    pipeline.validate(mockContext);

    // Should have logged the error
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should continue after multiple validator errors', () => {
    const pipeline = new ValidationPipeline();

    const diagnostic: Diagnostic = {
      message: 'Valid diagnostic',
      severity: DiagnosticSeverity.Warning,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 }
      },
      source: 'cal'
    };

    const errorValidator1: Validator = {
      name: 'ErrorValidator1',
      validate: jest.fn(() => {
        throw new Error('Error 1');
      })
    };

    const errorValidator2: Validator = {
      name: 'ErrorValidator2',
      validate: jest.fn(() => {
        throw new Error('Error 2');
      })
    };

    const goodValidator: Validator = {
      name: 'GoodValidator',
      validate: jest.fn().mockReturnValue([diagnostic])
    };

    pipeline.addValidator(errorValidator1);
    pipeline.addValidator(errorValidator2);
    pipeline.addValidator(goodValidator);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    // Should not throw and should collect diagnostics from good validator
    const diagnostics = pipeline.validate(mockContext);
    expect(diagnostics).toContainEqual(diagnostic);
  });
});

describe('ValidationPipeline - Edge Cases', () => {
  it('should handle validator returning null or undefined', () => {
    const pipeline = new ValidationPipeline();

    // Validators that might return null/undefined due to bugs
    const nullValidator: any = {
      validate: jest.fn().mockReturnValue(null)
    };
    const undefinedValidator: any = {
      validate: jest.fn().mockReturnValue(undefined)
    };

    pipeline.addValidator(nullValidator);
    pipeline.addValidator(undefinedValidator);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    // Should handle gracefully
    expect(() => pipeline.validate(mockContext)).not.toThrow();
    const diagnostics = pipeline.validate(mockContext);
    expect(diagnostics).toBeDefined();
    expect(Array.isArray(diagnostics)).toBe(true);
  });

  it('should handle large number of validators', () => {
    const pipeline = new ValidationPipeline();
    const validatorCount = 100;

    for (let i = 0; i < validatorCount; i++) {
      const validator: Validator = {
        name: 'Validator',
        validate: jest.fn().mockReturnValue([])
      };
      pipeline.addValidator(validator);
    }

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    expect(() => pipeline.validate(mockContext)).not.toThrow();
  });

  it('should handle validators producing many diagnostics', () => {
    const pipeline = new ValidationPipeline();

    // Create 1000 diagnostics
    const manyDiagnostics: Diagnostic[] = Array.from({ length: 1000 }, (_, i) => ({
      message: `Diagnostic ${i}`,
      severity: DiagnosticSeverity.Warning,
      range: {
        start: { line: i, character: 0 },
        end: { line: i, character: 10 }
      },
      source: 'cal'
    }));

    const busyValidator: Validator = {
      name: 'BusyValidator',
      validate: jest.fn().mockReturnValue(manyDiagnostics)
    };

    pipeline.addValidator(busyValidator);

    const mockContext: ValidationContext = {
      ast: {} as CALDocument,
      symbolTable: new SymbolTable(),
      builtins: new BuiltinRegistry(),
      documentUri: 'file:///test.cal'
    };

    const diagnostics = pipeline.validate(mockContext);
    expect(diagnostics).toHaveLength(1000);
  });
});
