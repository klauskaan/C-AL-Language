/**
 * Types Tests
 *
 * Tests for the semantic type system interfaces and type guard functions.
 * Covers type creation, discriminator-based type narrowing, and type guard
 * correctness for all C/AL type kinds.
 */

import {
  Type,
  TypeKind,
  PrimitiveType,
  PrimitiveName,
  RecordType,
  ArrayType,
  OptionType,
  TextType,
  CodeunitType,
  UnknownType,
  isPrimitiveType,
  isRecordType,
  isArrayType,
  isOptionType,
  isTextType,
  isCodeunitType,
  isUnknownType
} from '../types';

describe('Type System', () => {
  describe('PrimitiveType', () => {
    describe('interface creation', () => {
      it('should create a PrimitiveType with Integer name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.Integer);
      });

      it('should create a PrimitiveType with Decimal name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Decimal
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.Decimal);
      });

      it('should create a PrimitiveType with Boolean name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Boolean
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.Boolean);
      });

      it('should create a PrimitiveType with Date name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Date
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.Date);
      });

      it('should create a PrimitiveType with Time name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Time
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.Time);
      });

      it('should create a PrimitiveType with DateTime name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.DateTime
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.DateTime);
      });

      it('should create a PrimitiveType with Char name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Char
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.Char);
      });

      it('should create a PrimitiveType with Byte name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Byte
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.Byte);
      });

      it('should create a PrimitiveType with GUID name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.GUID
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.GUID);
      });

      it('should create a PrimitiveType with Duration name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Duration
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.Duration);
      });

      it('should create a PrimitiveType with BigInteger name', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.BigInteger
        };

        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(PrimitiveName.BigInteger);
      });
    });
  });

  describe('RecordType', () => {
    describe('interface creation', () => {
      it('should create a RecordType with tableId and tableName', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        expect(type.kind).toBe('record');
        expect(type.tableId).toBe(18);
        expect(type.tableName).toBe('Customer');
        expect(type.isTemporary).toBe(false);
      });

      it('should create a temporary RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 37,
          tableName: 'Sales Line',
          isTemporary: true
        };

        expect(type.kind).toBe('record');
        expect(type.tableId).toBe(37);
        expect(type.tableName).toBe('Sales Line');
        expect(type.isTemporary).toBe(true);
      });

      it('should create a RecordType with only tableId (name unknown)', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 99999,
          tableName: '',
          isTemporary: false
        };

        expect(type.kind).toBe('record');
        expect(type.tableId).toBe(99999);
        expect(type.tableName).toBe('');
        expect(type.isTemporary).toBe(false);
      });

      it('should create a RecordType with only tableName (ID unknown)', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 0,
          tableName: 'MyCustomTable',
          isTemporary: false
        };

        expect(type.kind).toBe('record');
        expect(type.tableId).toBe(0);
        expect(type.tableName).toBe('MyCustomTable');
        expect(type.isTemporary).toBe(false);
      });
    });
  });

  describe('ArrayType', () => {
    describe('interface creation', () => {
      it('should create a single-dimensional ArrayType', () => {
        const elementType: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [10]
        };

        expect(type.kind).toBe('array');
        expect(type.elementType).toBe(elementType);
        expect(type.dimensions).toEqual([10]);
      });

      it('should create a multi-dimensional ArrayType', () => {
        const elementType: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Decimal
        };

        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [3, 3]
        };

        expect(type.kind).toBe('array');
        expect(type.elementType).toBe(elementType);
        expect(type.dimensions).toEqual([3, 3]);
      });

      it('should create an ArrayType with three dimensions', () => {
        const elementType: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Boolean
        };

        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [2, 3, 4]
        };

        expect(type.kind).toBe('array');
        expect(type.dimensions).toEqual([2, 3, 4]);
        expect(type.dimensions.length).toBe(3);
      });

      it('should create a nested ArrayType (array of arrays)', () => {
        const intType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
        const innerArray: ArrayType = {
          kind: 'array',
          elementType: intType,
          dimensions: [5]
        };

        const outerArray: ArrayType = {
          kind: 'array',
          elementType: innerArray,
          dimensions: [10]
        };

        expect(outerArray.kind).toBe('array');
        expect(outerArray.dimensions).toEqual([10]);
        expect((outerArray.elementType as ArrayType).kind).toBe('array');
        expect((outerArray.elementType as ArrayType).dimensions).toEqual([5]);
      });

      it('should create an ArrayType with RecordType elements', () => {
        const elementType: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [100]
        };

        expect(type.kind).toBe('array');
        expect((type.elementType as RecordType).tableId).toBe(18);
      });
    });
  });

  describe('OptionType', () => {
    describe('interface creation', () => {
      it('should create an OptionType with multiple values', () => {
        const type: OptionType = {
          kind: 'option',
          values: ['Open', 'Released', 'Closed']
        };

        expect(type.kind).toBe('option');
        expect(type.values).toEqual(['Open', 'Released', 'Closed']);
        expect(type.values.length).toBe(3);
      });

      it('should create an OptionType with two values', () => {
        const type: OptionType = {
          kind: 'option',
          values: ['No', 'Yes']
        };

        expect(type.kind).toBe('option');
        expect(type.values).toEqual(['No', 'Yes']);
      });

      it('should create an OptionType with empty values', () => {
        const type: OptionType = {
          kind: 'option',
          values: []
        };

        expect(type.kind).toBe('option');
        expect(type.values).toEqual([]);
        expect(type.values.length).toBe(0);
      });

      it('should create an OptionType with single value', () => {
        const type: OptionType = {
          kind: 'option',
          values: ['Only']
        };

        expect(type.kind).toBe('option');
        expect(type.values).toEqual(['Only']);
      });

      it('should create an OptionType with document type values', () => {
        const type: OptionType = {
          kind: 'option',
          values: ['Quote', 'Order', 'Invoice', 'Credit Memo', 'Blanket Order', 'Return Order']
        };

        expect(type.kind).toBe('option');
        expect(type.values.length).toBe(6);
        expect(type.values[0]).toBe('Quote');
        expect(type.values[2]).toBe('Invoice');
      });
    });
  });

  describe('TextType', () => {
    describe('interface creation', () => {
      it('should create a TextType with maxLength', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 100,
          isCode: false
        };

        expect(type.kind).toBe('text');
        expect(type.maxLength).toBe(100);
        expect(type.isCode).toBe(false);
      });

      it('should create a CodeType with maxLength', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 20,
          isCode: true
        };

        expect(type.kind).toBe('text');
        expect(type.maxLength).toBe(20);
        expect(type.isCode).toBe(true);
      });

      it('should create an unlimited TextType', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: undefined,
          isCode: false
        };

        expect(type.kind).toBe('text');
        expect(type.maxLength).toBeUndefined();
        expect(type.isCode).toBe(false);
      });

      it('should create an unlimited CodeType', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: undefined,
          isCode: true
        };

        expect(type.kind).toBe('text');
        expect(type.maxLength).toBeUndefined();
        expect(type.isCode).toBe(true);
      });

      it('should create a TextType with large maxLength', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 2048,
          isCode: false
        };

        expect(type.kind).toBe('text');
        expect(type.maxLength).toBe(2048);
      });
    });
  });

  describe('CodeunitType', () => {
    describe('interface creation', () => {
      it('should create a CodeunitType with id and name', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 80,
          codeunitName: 'Sales-Post'
        };

        expect(type.kind).toBe('codeunit');
        expect(type.codeunitId).toBe(80);
        expect(type.codeunitName).toBe('Sales-Post');
      });

      it('should create a CodeunitType with only id (name unknown)', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 1,
          codeunitName: ''
        };

        expect(type.kind).toBe('codeunit');
        expect(type.codeunitId).toBe(1);
        expect(type.codeunitName).toBe('');
      });

      it('should create a CodeunitType with only name (ID unknown)', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 0,
          codeunitName: 'Application Management'
        };

        expect(type.kind).toBe('codeunit');
        expect(type.codeunitId).toBe(0);
        expect(type.codeunitName).toBe('Application Management');
      });

      it('should create a CodeunitType for posting routines', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 90,
          codeunitName: 'Purch.-Post'
        };

        expect(type.kind).toBe('codeunit');
        expect(type.codeunitId).toBe(90);
        expect(type.codeunitName).toBe('Purch.-Post');
      });
    });
  });

  describe('UnknownType', () => {
    describe('interface creation', () => {
      it('should create an UnknownType without reason', () => {
        const type: UnknownType = {
          kind: 'unknown'
        };

        expect(type.kind).toBe('unknown');
        expect(type.reason).toBeUndefined();
      });

      it('should create an UnknownType with reason', () => {
        const type: UnknownType = {
          kind: 'unknown',
          reason: 'Unrecognized type: MyCustomType'
        };

        expect(type.kind).toBe('unknown');
        expect(type.reason).toBe('Unrecognized type: MyCustomType');
      });

      it('should create an UnknownType for table not found', () => {
        const type: UnknownType = {
          kind: 'unknown',
          reason: 'Table 99999 not found in workspace'
        };

        expect(type.kind).toBe('unknown');
        expect(type.reason).toBe('Table 99999 not found in workspace');
      });

      it('should create an UnknownType for parse error', () => {
        const type: UnknownType = {
          kind: 'unknown',
          reason: 'Invalid type syntax'
        };

        expect(type.kind).toBe('unknown');
        expect(type.reason).toBe('Invalid type syntax');
      });
    });
  });

  describe('Type Guards', () => {
    describe('isPrimitiveType', () => {
      it('should return true for PrimitiveType', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        expect(isPrimitiveType(type)).toBe(true);
      });

      it('should return false for RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        expect(isPrimitiveType(type)).toBe(false);
      });

      it('should return false for ArrayType', () => {
        const elementType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [10]
        };

        expect(isPrimitiveType(type)).toBe(false);
      });

      it('should return false for OptionType', () => {
        const type: OptionType = {
          kind: 'option',
          values: ['Open', 'Closed']
        };

        expect(isPrimitiveType(type)).toBe(false);
      });

      it('should return false for TextType', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 100,
          isCode: false
        };

        expect(isPrimitiveType(type)).toBe(false);
      });

      it('should return false for CodeunitType', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 80,
          codeunitName: 'Sales-Post'
        };

        expect(isPrimitiveType(type)).toBe(false);
      });

      it('should return false for UnknownType', () => {
        const type: UnknownType = {
          kind: 'unknown'
        };

        expect(isPrimitiveType(type)).toBe(false);
      });

      it('should enable TypeScript type narrowing', () => {
        const type: Type = {
          kind: 'primitive',
          name: PrimitiveName.Decimal
        } as PrimitiveType;

        if (isPrimitiveType(type)) {
          // TypeScript should know type is PrimitiveType here
          expect(type.name).toBe(PrimitiveName.Decimal);
        }
      });
    });

    describe('isRecordType', () => {
      it('should return true for RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        expect(isRecordType(type)).toBe(true);
      });

      it('should return true for temporary RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 37,
          tableName: 'Sales Line',
          isTemporary: true
        };

        expect(isRecordType(type)).toBe(true);
      });

      it('should return false for PrimitiveType', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        expect(isRecordType(type)).toBe(false);
      });

      it('should return false for ArrayType', () => {
        const elementType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [10]
        };

        expect(isRecordType(type)).toBe(false);
      });

      it('should return false for UnknownType', () => {
        const type: UnknownType = {
          kind: 'unknown'
        };

        expect(isRecordType(type)).toBe(false);
      });

      it('should enable TypeScript type narrowing', () => {
        const type: Type = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        } as RecordType;

        if (isRecordType(type)) {
          // TypeScript should know type is RecordType here
          expect(type.tableId).toBe(18);
          expect(type.tableName).toBe('Customer');
          expect(type.isTemporary).toBe(false);
        }
      });
    });

    describe('isArrayType', () => {
      it('should return true for ArrayType', () => {
        const elementType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [10]
        };

        expect(isArrayType(type)).toBe(true);
      });

      it('should return true for multi-dimensional ArrayType', () => {
        const elementType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Decimal };
        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [3, 3]
        };

        expect(isArrayType(type)).toBe(true);
      });

      it('should return false for PrimitiveType', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        expect(isArrayType(type)).toBe(false);
      });

      it('should return false for RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        expect(isArrayType(type)).toBe(false);
      });

      it('should return false for UnknownType', () => {
        const type: UnknownType = {
          kind: 'unknown'
        };

        expect(isArrayType(type)).toBe(false);
      });

      it('should enable TypeScript type narrowing', () => {
        const elementType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
        const type: Type = {
          kind: 'array',
          elementType,
          dimensions: [10, 20]
        } as ArrayType;

        if (isArrayType(type)) {
          // TypeScript should know type is ArrayType here
          expect(type.dimensions).toEqual([10, 20]);
          expect(type.elementType.kind).toBe('primitive');
        }
      });
    });

    describe('isOptionType', () => {
      it('should return true for OptionType', () => {
        const type: OptionType = {
          kind: 'option',
          values: ['Open', 'Released', 'Closed']
        };

        expect(isOptionType(type)).toBe(true);
      });

      it('should return true for OptionType with empty values', () => {
        const type: OptionType = {
          kind: 'option',
          values: []
        };

        expect(isOptionType(type)).toBe(true);
      });

      it('should return false for PrimitiveType', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        expect(isOptionType(type)).toBe(false);
      });

      it('should return false for RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        expect(isOptionType(type)).toBe(false);
      });

      it('should return false for UnknownType', () => {
        const type: UnknownType = {
          kind: 'unknown'
        };

        expect(isOptionType(type)).toBe(false);
      });

      it('should enable TypeScript type narrowing', () => {
        const type: Type = {
          kind: 'option',
          values: ['A', 'B', 'C']
        } as OptionType;

        if (isOptionType(type)) {
          // TypeScript should know type is OptionType here
          expect(type.values).toEqual(['A', 'B', 'C']);
          expect(type.values.length).toBe(3);
        }
      });
    });

    describe('isTextType', () => {
      it('should return true for TextType', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 100,
          isCode: false
        };

        expect(isTextType(type)).toBe(true);
      });

      it('should return true for CodeType (isCode: true)', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 20,
          isCode: true
        };

        expect(isTextType(type)).toBe(true);
      });

      it('should return true for unlimited TextType', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: undefined,
          isCode: false
        };

        expect(isTextType(type)).toBe(true);
      });

      it('should return false for PrimitiveType', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        expect(isTextType(type)).toBe(false);
      });

      it('should return false for RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        expect(isTextType(type)).toBe(false);
      });

      it('should return false for UnknownType', () => {
        const type: UnknownType = {
          kind: 'unknown'
        };

        expect(isTextType(type)).toBe(false);
      });

      it('should enable TypeScript type narrowing', () => {
        const type: Type = {
          kind: 'text',
          maxLength: 50,
          isCode: true
        } as TextType;

        if (isTextType(type)) {
          // TypeScript should know type is TextType here
          expect(type.maxLength).toBe(50);
          expect(type.isCode).toBe(true);
        }
      });
    });

    describe('isCodeunitType', () => {
      it('should return true for CodeunitType', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 80,
          codeunitName: 'Sales-Post'
        };

        expect(isCodeunitType(type)).toBe(true);
      });

      it('should return true for CodeunitType with only id', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 1,
          codeunitName: ''
        };

        expect(isCodeunitType(type)).toBe(true);
      });

      it('should return false for PrimitiveType', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        expect(isCodeunitType(type)).toBe(false);
      });

      it('should return false for RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        expect(isCodeunitType(type)).toBe(false);
      });

      it('should return false for UnknownType', () => {
        const type: UnknownType = {
          kind: 'unknown'
        };

        expect(isCodeunitType(type)).toBe(false);
      });

      it('should enable TypeScript type narrowing', () => {
        const type: Type = {
          kind: 'codeunit',
          codeunitId: 90,
          codeunitName: 'Purch.-Post'
        } as CodeunitType;

        if (isCodeunitType(type)) {
          // TypeScript should know type is CodeunitType here
          expect(type.codeunitId).toBe(90);
          expect(type.codeunitName).toBe('Purch.-Post');
        }
      });
    });

    describe('isUnknownType', () => {
      it('should return true for UnknownType', () => {
        const type: UnknownType = {
          kind: 'unknown'
        };

        expect(isUnknownType(type)).toBe(true);
      });

      it('should return true for UnknownType with reason', () => {
        const type: UnknownType = {
          kind: 'unknown',
          reason: 'Some error occurred'
        };

        expect(isUnknownType(type)).toBe(true);
      });

      it('should return false for PrimitiveType', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        expect(isUnknownType(type)).toBe(false);
      });

      it('should return false for RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        expect(isUnknownType(type)).toBe(false);
      });

      it('should return false for ArrayType', () => {
        const elementType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [10]
        };

        expect(isUnknownType(type)).toBe(false);
      });

      it('should return false for OptionType', () => {
        const type: OptionType = {
          kind: 'option',
          values: ['Open', 'Closed']
        };

        expect(isUnknownType(type)).toBe(false);
      });

      it('should return false for TextType', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 100,
          isCode: false
        };

        expect(isUnknownType(type)).toBe(false);
      });

      it('should return false for CodeunitType', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 80,
          codeunitName: 'Sales-Post'
        };

        expect(isUnknownType(type)).toBe(false);
      });

      it('should enable TypeScript type narrowing', () => {
        const type: Type = {
          kind: 'unknown',
          reason: 'Type not found'
        } as UnknownType;

        if (isUnknownType(type)) {
          // TypeScript should know type is UnknownType here
          expect(type.reason).toBe('Type not found');
        }
      });
    });

    describe('Type guard mutual exclusivity', () => {
      it('should have exactly one guard return true for PrimitiveType', () => {
        const type: PrimitiveType = {
          kind: 'primitive',
          name: PrimitiveName.Integer
        };

        const guards = [
          isPrimitiveType(type),
          isRecordType(type),
          isArrayType(type),
          isOptionType(type),
          isTextType(type),
          isCodeunitType(type),
          isUnknownType(type)
        ];

        expect(guards.filter(Boolean).length).toBe(1);
        expect(isPrimitiveType(type)).toBe(true);
      });

      it('should have exactly one guard return true for RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        const guards = [
          isPrimitiveType(type),
          isRecordType(type),
          isArrayType(type),
          isOptionType(type),
          isTextType(type),
          isCodeunitType(type),
          isUnknownType(type)
        ];

        expect(guards.filter(Boolean).length).toBe(1);
        expect(isRecordType(type)).toBe(true);
      });

      it('should have exactly one guard return true for ArrayType', () => {
        const elementType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: [10]
        };

        const guards = [
          isPrimitiveType(type),
          isRecordType(type),
          isArrayType(type),
          isOptionType(type),
          isTextType(type),
          isCodeunitType(type),
          isUnknownType(type)
        ];

        expect(guards.filter(Boolean).length).toBe(1);
        expect(isArrayType(type)).toBe(true);
      });

      it('should have exactly one guard return true for OptionType', () => {
        const type: OptionType = {
          kind: 'option',
          values: ['Open', 'Closed']
        };

        const guards = [
          isPrimitiveType(type),
          isRecordType(type),
          isArrayType(type),
          isOptionType(type),
          isTextType(type),
          isCodeunitType(type),
          isUnknownType(type)
        ];

        expect(guards.filter(Boolean).length).toBe(1);
        expect(isOptionType(type)).toBe(true);
      });

      it('should have exactly one guard return true for TextType', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 100,
          isCode: false
        };

        const guards = [
          isPrimitiveType(type),
          isRecordType(type),
          isArrayType(type),
          isOptionType(type),
          isTextType(type),
          isCodeunitType(type),
          isUnknownType(type)
        ];

        expect(guards.filter(Boolean).length).toBe(1);
        expect(isTextType(type)).toBe(true);
      });

      it('should have exactly one guard return true for CodeunitType', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 80,
          codeunitName: 'Sales-Post'
        };

        const guards = [
          isPrimitiveType(type),
          isRecordType(type),
          isArrayType(type),
          isOptionType(type),
          isTextType(type),
          isCodeunitType(type),
          isUnknownType(type)
        ];

        expect(guards.filter(Boolean).length).toBe(1);
        expect(isCodeunitType(type)).toBe(true);
      });

      it('should have exactly one guard return true for UnknownType', () => {
        const type: UnknownType = {
          kind: 'unknown'
        };

        const guards = [
          isPrimitiveType(type),
          isRecordType(type),
          isArrayType(type),
          isOptionType(type),
          isTextType(type),
          isCodeunitType(type),
          isUnknownType(type)
        ];

        expect(guards.filter(Boolean).length).toBe(1);
        expect(isUnknownType(type)).toBe(true);
      });
    });
  });

  describe('TypeKind', () => {
    it('should include all expected type kinds', () => {
      const kinds: TypeKind[] = [
        'primitive',
        'record',
        'array',
        'option',
        'codeunit',
        'text',
        'unknown'
      ];

      kinds.forEach(kind => {
        const type: Type = { kind };
        expect(type.kind).toBe(kind);
      });
    });
  });

  describe('PrimitiveName Enum', () => {
    it('should have Integer value', () => {
      expect(PrimitiveName.Integer).toBe('Integer');
    });

    it('should have Decimal value', () => {
      expect(PrimitiveName.Decimal).toBe('Decimal');
    });

    it('should have Boolean value', () => {
      expect(PrimitiveName.Boolean).toBe('Boolean');
    });

    it('should have Date value', () => {
      expect(PrimitiveName.Date).toBe('Date');
    });

    it('should have Time value', () => {
      expect(PrimitiveName.Time).toBe('Time');
    });

    it('should have DateTime value', () => {
      expect(PrimitiveName.DateTime).toBe('DateTime');
    });

    it('should have Char value', () => {
      expect(PrimitiveName.Char).toBe('Char');
    });

    it('should have Byte value', () => {
      expect(PrimitiveName.Byte).toBe('Byte');
    });

    it('should have GUID value', () => {
      expect(PrimitiveName.GUID).toBe('GUID');
    });

    it('should have Duration value', () => {
      expect(PrimitiveName.Duration).toBe('Duration');
    });

    it('should have BigInteger value', () => {
      expect(PrimitiveName.BigInteger).toBe('BigInteger');
    });
  });

  describe('Edge Cases', () => {
    describe('Complex nested types', () => {
      it('should support deeply nested array types', () => {
        // Array[5] of Array[10] of Array[20] of Integer
        const intType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
        const level3: ArrayType = {
          kind: 'array',
          elementType: intType,
          dimensions: [20]
        };

        const level2: ArrayType = {
          kind: 'array',
          elementType: level3,
          dimensions: [10]
        };

        const level1: ArrayType = {
          kind: 'array',
          elementType: level2,
          dimensions: [5]
        };

        expect(isArrayType(level1)).toBe(true);
        expect(isArrayType(level1.elementType)).toBe(true);
        expect(isArrayType((level1.elementType as ArrayType).elementType)).toBe(true);
      });

      it('should support array of records', () => {
        const recordType: RecordType = {
          kind: 'record',
          tableId: 18,
          tableName: 'Customer',
          isTemporary: false
        };

        const arrayType: ArrayType = {
          kind: 'array',
          elementType: recordType,
          dimensions: [100]
        };

        expect(isArrayType(arrayType)).toBe(true);
        expect(isRecordType(arrayType.elementType)).toBe(true);
      });

      it('should support array of text types', () => {
        const textType: TextType = {
          kind: 'text',
          maxLength: 100,
          isCode: false
        };

        const arrayType: ArrayType = {
          kind: 'array',
          elementType: textType,
          dimensions: [50]
        };

        expect(isArrayType(arrayType)).toBe(true);
        expect(isTextType(arrayType.elementType)).toBe(true);
      });
    });

    describe('Boundary values', () => {
      it('should handle zero tableId in RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 0,
          tableName: '',
          isTemporary: false
        };

        expect(isRecordType(type)).toBe(true);
        expect(type.tableId).toBe(0);
      });

      it('should handle zero codeunitId in CodeunitType', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 0,
          codeunitName: ''
        };

        expect(isCodeunitType(type)).toBe(true);
        expect(type.codeunitId).toBe(0);
      });

      it('should handle empty dimensions in ArrayType', () => {
        const elementType: PrimitiveType = { kind: 'primitive', name: PrimitiveName.Integer };
        const type: ArrayType = {
          kind: 'array',
          elementType,
          dimensions: []
        };

        expect(isArrayType(type)).toBe(true);
        expect(type.dimensions.length).toBe(0);
      });

      it('should handle zero maxLength in TextType', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 0,
          isCode: false
        };

        expect(isTextType(type)).toBe(true);
        expect(type.maxLength).toBe(0);
      });

      it('should handle large tableId in RecordType', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 99999999,
          tableName: 'Very Large Table ID',
          isTemporary: false
        };

        expect(isRecordType(type)).toBe(true);
        expect(type.tableId).toBe(99999999);
      });

      it('should handle large maxLength in TextType', () => {
        const type: TextType = {
          kind: 'text',
          maxLength: 1000000,
          isCode: false
        };

        expect(isTextType(type)).toBe(true);
        expect(type.maxLength).toBe(1000000);
      });
    });

    describe('Special characters in names', () => {
      it('should handle special characters in tableName', () => {
        const type: RecordType = {
          kind: 'record',
          tableId: 21,
          tableName: 'Cust. Ledger Entry',
          isTemporary: false
        };

        expect(isRecordType(type)).toBe(true);
        expect(type.tableName).toBe('Cust. Ledger Entry');
      });

      it('should handle special characters in codeunitName', () => {
        const type: CodeunitType = {
          kind: 'codeunit',
          codeunitId: 80,
          codeunitName: 'Sales-Post'
        };

        expect(isCodeunitType(type)).toBe(true);
        expect(type.codeunitName).toBe('Sales-Post');
      });

      it('should handle special characters in option values', () => {
        const type: OptionType = {
          kind: 'option',
          values: ['< 30 Days', '30-60 Days', '> 60 Days']
        };

        expect(isOptionType(type)).toBe(true);
        expect(type.values[0]).toBe('< 30 Days');
        expect(type.values[2]).toBe('> 60 Days');
      });

      it('should handle special characters in unknown reason', () => {
        const type: UnknownType = {
          kind: 'unknown',
          reason: 'Table "Customer Ledger Entry" (ID: 21) not found'
        };

        expect(isUnknownType(type)).toBe(true);
        expect(type.reason).toContain('Customer Ledger Entry');
      });
    });
  });
});
