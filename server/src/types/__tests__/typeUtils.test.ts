/**
 * TypeUtils Tests
 *
 * Tests for the type utility functions including typeToString formatting,
 * areTypesEqual comparison, and type factory functions. Covers all type kinds
 * in the C/AL type system (primitive, record, array, option, text, codeunit, unknown).
 */

import {
  typeToString,
  areTypesEqual,
  createPrimitiveType,
  createRecordType,
  createArrayType,
  createOptionType,
  createTextType,
  createCodeunitType,
  createUnknownType,
  isAssignmentCompatible,
  inferLiteralType
} from '../typeUtils';

import {
  Type,
  PrimitiveName
} from '../types';

describe('typeToString', () => {
  describe('PrimitiveType formatting', () => {
    it('should format Integer primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.Integer);
      expect(typeToString(type)).toBe('Integer');
    });

    it('should format Decimal primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.Decimal);
      expect(typeToString(type)).toBe('Decimal');
    });

    it('should format Boolean primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.Boolean);
      expect(typeToString(type)).toBe('Boolean');
    });

    it('should format Date primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.Date);
      expect(typeToString(type)).toBe('Date');
    });

    it('should format Time primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.Time);
      expect(typeToString(type)).toBe('Time');
    });

    it('should format DateTime primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.DateTime);
      expect(typeToString(type)).toBe('DateTime');
    });

    it('should format Char primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.Char);
      expect(typeToString(type)).toBe('Char');
    });

    it('should format Byte primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.Byte);
      expect(typeToString(type)).toBe('Byte');
    });

    it('should format GUID primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.GUID);
      expect(typeToString(type)).toBe('GUID');
    });

    it('should format Duration primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.Duration);
      expect(typeToString(type)).toBe('Duration');
    });

    it('should format BigInteger primitive type', () => {
      const type = createPrimitiveType(PrimitiveName.BigInteger);
      expect(typeToString(type)).toBe('BigInteger');
    });
  });

  describe('RecordType formatting', () => {
    it('should format record type with table name', () => {
      const type = createRecordType(18, 'Customer');
      expect(typeToString(type)).toBe('Record Customer');
    });

    it('should format record type with only table ID', () => {
      const type = createRecordType(18, '');
      expect(typeToString(type)).toBe('Record 18');
    });

    it('should format record type with neither name nor ID', () => {
      const type = createRecordType(0, '');
      expect(typeToString(type)).toBe('Record');
    });

    it('should format temporary record type with name', () => {
      const type = createRecordType(18, 'Customer', true);
      expect(typeToString(type)).toBe('Record Customer (temporary)');
    });

    it('should format temporary record type with only ID', () => {
      const type = createRecordType(18, '', true);
      expect(typeToString(type)).toBe('Record 18 (temporary)');
    });

    it('should prefer table name over table ID when both are present', () => {
      const type = createRecordType(18, 'Customer');
      expect(typeToString(type)).toBe('Record Customer');
    });

    it('should format record type with multi-word table name', () => {
      const type = createRecordType(36, 'Sales Header');
      expect(typeToString(type)).toBe('Record Sales Header');
    });

    it('should format record type with special characters in name', () => {
      const type = createRecordType(21, 'Cust. Ledger Entry');
      expect(typeToString(type)).toBe('Record Cust. Ledger Entry');
    });
  });

  describe('ArrayType formatting', () => {
    it('should format single-dimensional array of integers', () => {
      const type = createArrayType(
        createPrimitiveType(PrimitiveName.Integer),
        [10]
      );
      expect(typeToString(type)).toBe('Array[10] of Integer');
    });

    it('should format multi-dimensional array', () => {
      const type = createArrayType(
        createPrimitiveType(PrimitiveName.Decimal),
        [3, 3]
      );
      expect(typeToString(type)).toBe('Array[3, 3] of Decimal');
    });

    it('should format three-dimensional array', () => {
      const type = createArrayType(
        createPrimitiveType(PrimitiveName.Boolean),
        [2, 3, 4]
      );
      expect(typeToString(type)).toBe('Array[2, 3, 4] of Boolean');
    });

    it('should format array with empty dimensions', () => {
      const type = createArrayType(
        createPrimitiveType(PrimitiveName.Integer),
        []
      );
      expect(typeToString(type)).toBe('Array[] of Integer');
    });

    it('should format array of records', () => {
      const type = createArrayType(
        createRecordType(18, 'Customer'),
        [100]
      );
      expect(typeToString(type)).toBe('Array[100] of Record Customer');
    });

    it('should format array of text types', () => {
      const type = createArrayType(
        createTextType(50),
        [5]
      );
      expect(typeToString(type)).toBe('Array[5] of Text[50]');
    });

    it('should format nested arrays (array of arrays)', () => {
      const innerArray = createArrayType(
        createPrimitiveType(PrimitiveName.Integer),
        [5]
      );
      const outerArray = createArrayType(innerArray, [10]);
      expect(typeToString(outerArray)).toBe('Array[10] of Array[5] of Integer');
    });

    it('should format array of options', () => {
      const type = createArrayType(
        createOptionType(['Open', 'Closed']),
        [10]
      );
      expect(typeToString(type)).toBe('Array[10] of Option');
    });
  });

  describe('OptionType formatting', () => {
    it('should format option type (non-verbose)', () => {
      const type = createOptionType(['Open', 'Released', 'Closed']);
      expect(typeToString(type)).toBe('Option');
    });

    it('should format option type with verbose mode showing values', () => {
      const type = createOptionType(['Open', 'Released', 'Closed']);
      expect(typeToString(type, { verbose: true })).toBe('Option (Open, Released, Closed)');
    });

    it('should truncate verbose option values when exceeding max', () => {
      const type = createOptionType(['A', 'B', 'C', 'D', 'E']);
      expect(typeToString(type, { verbose: true })).toBe('Option (A, B, C, ...)');
    });

    it('should respect custom maxOptionValues setting', () => {
      const type = createOptionType(['A', 'B', 'C', 'D', 'E']);
      expect(typeToString(type, { verbose: true, maxOptionValues: 2 })).toBe('Option (A, B, ...)');
    });

    it('should format empty option type in verbose mode', () => {
      const type = createOptionType([]);
      expect(typeToString(type, { verbose: true })).toBe('Option ()');
    });

    it('should not truncate when values exactly match max', () => {
      const type = createOptionType(['A', 'B', 'C']);
      expect(typeToString(type, { verbose: true, maxOptionValues: 3 })).toBe('Option (A, B, C)');
    });

    it('should format single option value in verbose mode', () => {
      const type = createOptionType(['OnlyOne']);
      expect(typeToString(type, { verbose: true })).toBe('Option (OnlyOne)');
    });
  });

  describe('TextType formatting', () => {
    it('should format Text type with length', () => {
      const type = createTextType(100);
      expect(typeToString(type)).toBe('Text[100]');
    });

    it('should format Text type without length (unlimited)', () => {
      const type = createTextType();
      expect(typeToString(type)).toBe('Text');
    });

    it('should format Code type with length', () => {
      const type = createTextType(20, true);
      expect(typeToString(type)).toBe('Code[20]');
    });

    it('should format Code type without length (unlimited)', () => {
      const type = createTextType(undefined, true);
      expect(typeToString(type)).toBe('Code');
    });

    it('should format Text with small length', () => {
      const type = createTextType(1);
      expect(typeToString(type)).toBe('Text[1]');
    });

    it('should format Text with large length', () => {
      const type = createTextType(2048);
      expect(typeToString(type)).toBe('Text[2048]');
    });
  });

  describe('CodeunitType formatting', () => {
    it('should format codeunit type with name', () => {
      const type = createCodeunitType(80, 'Sales-Post');
      expect(typeToString(type)).toBe('Codeunit Sales-Post');
    });

    it('should format codeunit type with only ID', () => {
      const type = createCodeunitType(80, '');
      expect(typeToString(type)).toBe('Codeunit 80');
    });

    it('should format codeunit type with neither name nor ID', () => {
      const type = createCodeunitType(0, '');
      expect(typeToString(type)).toBe('Codeunit');
    });

    it('should prefer codeunit name over ID when both are present', () => {
      const type = createCodeunitType(80, 'Sales-Post');
      expect(typeToString(type)).toBe('Codeunit Sales-Post');
    });

    it('should format codeunit with multi-word name', () => {
      const type = createCodeunitType(1, 'Application Management');
      expect(typeToString(type)).toBe('Codeunit Application Management');
    });
  });

  describe('UnknownType formatting', () => {
    it('should format unknown type (non-verbose)', () => {
      const type = createUnknownType('Some reason');
      expect(typeToString(type)).toBe('Unknown');
    });

    it('should format unknown type with verbose mode showing reason', () => {
      const type = createUnknownType('Table not found');
      expect(typeToString(type, { verbose: true })).toBe('Unknown: Table not found');
    });

    it('should format unknown type without reason in verbose mode', () => {
      const type = createUnknownType();
      expect(typeToString(type, { verbose: true })).toBe('Unknown');
    });

    it('should format unknown type with empty reason', () => {
      const type = createUnknownType('');
      expect(typeToString(type, { verbose: true })).toBe('Unknown');
    });
  });
});

describe('areTypesEqual', () => {
  describe('PrimitiveType comparison', () => {
    it('should return true for equal primitive types', () => {
      const typeA = createPrimitiveType(PrimitiveName.Integer);
      const typeB = createPrimitiveType(PrimitiveName.Integer);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return false for different primitive types', () => {
      const typeA = createPrimitiveType(PrimitiveName.Integer);
      const typeB = createPrimitiveType(PrimitiveName.Decimal);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should compare all primitive type names correctly', () => {
      const primitiveNames = Object.values(PrimitiveName);
      for (const name of primitiveNames) {
        const typeA = createPrimitiveType(name);
        const typeB = createPrimitiveType(name);
        expect(areTypesEqual(typeA, typeB)).toBe(true);
      }
    });
  });

  describe('RecordType comparison', () => {
    it('should return true for equal record types', () => {
      const typeA = createRecordType(18, 'Customer', false);
      const typeB = createRecordType(18, 'Customer', false);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return false for different table IDs', () => {
      const typeA = createRecordType(18, 'Customer', false);
      const typeB = createRecordType(27, 'Customer', false);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return false for different table names', () => {
      const typeA = createRecordType(18, 'Customer', false);
      const typeB = createRecordType(18, 'Vendor', false);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return false for different isTemporary flags', () => {
      const typeA = createRecordType(18, 'Customer', false);
      const typeB = createRecordType(18, 'Customer', true);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return true for equal temporary record types', () => {
      const typeA = createRecordType(18, 'Customer', true);
      const typeB = createRecordType(18, 'Customer', true);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });
  });

  describe('ArrayType comparison', () => {
    it('should return true for equal single-dimensional arrays', () => {
      const typeA = createArrayType(createPrimitiveType(PrimitiveName.Integer), [10]);
      const typeB = createArrayType(createPrimitiveType(PrimitiveName.Integer), [10]);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return false for arrays with different dimensions', () => {
      const typeA = createArrayType(createPrimitiveType(PrimitiveName.Integer), [10]);
      const typeB = createArrayType(createPrimitiveType(PrimitiveName.Integer), [20]);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return false for arrays with different number of dimensions', () => {
      const typeA = createArrayType(createPrimitiveType(PrimitiveName.Integer), [10]);
      const typeB = createArrayType(createPrimitiveType(PrimitiveName.Integer), [10, 5]);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return false for arrays with different element types', () => {
      const typeA = createArrayType(createPrimitiveType(PrimitiveName.Integer), [10]);
      const typeB = createArrayType(createPrimitiveType(PrimitiveName.Decimal), [10]);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return true for equal multi-dimensional arrays', () => {
      const typeA = createArrayType(createPrimitiveType(PrimitiveName.Integer), [3, 3]);
      const typeB = createArrayType(createPrimitiveType(PrimitiveName.Integer), [3, 3]);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should recursively compare nested array element types', () => {
      const innerA = createArrayType(createPrimitiveType(PrimitiveName.Integer), [5]);
      const outerA = createArrayType(innerA, [10]);

      const innerB = createArrayType(createPrimitiveType(PrimitiveName.Integer), [5]);
      const outerB = createArrayType(innerB, [10]);

      expect(areTypesEqual(outerA, outerB)).toBe(true);
    });

    it('should return false for nested arrays with different inner dimensions', () => {
      const innerA = createArrayType(createPrimitiveType(PrimitiveName.Integer), [5]);
      const outerA = createArrayType(innerA, [10]);

      const innerB = createArrayType(createPrimitiveType(PrimitiveName.Integer), [6]);
      const outerB = createArrayType(innerB, [10]);

      expect(areTypesEqual(outerA, outerB)).toBe(false);
    });
  });

  describe('OptionType comparison', () => {
    it('should return true for equal option types', () => {
      const typeA = createOptionType(['Open', 'Released', 'Closed']);
      const typeB = createOptionType(['Open', 'Released', 'Closed']);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return false for option types with different values', () => {
      const typeA = createOptionType(['Open', 'Released', 'Closed']);
      const typeB = createOptionType(['Open', 'Released', 'Pending']);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return false for option types with different order', () => {
      const typeA = createOptionType(['Open', 'Released', 'Closed']);
      const typeB = createOptionType(['Open', 'Closed', 'Released']);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return false for option types with different lengths', () => {
      const typeA = createOptionType(['Open', 'Released', 'Closed']);
      const typeB = createOptionType(['Open', 'Released']);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return true for empty option types', () => {
      const typeA = createOptionType([]);
      const typeB = createOptionType([]);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should be case-sensitive when comparing option values', () => {
      const typeA = createOptionType(['Open']);
      const typeB = createOptionType(['OPEN']);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });
  });

  describe('TextType comparison', () => {
    it('should return true for equal Text types', () => {
      const typeA = createTextType(100, false);
      const typeB = createTextType(100, false);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return true for equal Code types', () => {
      const typeA = createTextType(20, true);
      const typeB = createTextType(20, true);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return false for Text vs Code types', () => {
      const typeA = createTextType(100, false);
      const typeB = createTextType(100, true);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return false for different maxLength', () => {
      const typeA = createTextType(100, false);
      const typeB = createTextType(50, false);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return true for both unlimited Text types', () => {
      const typeA = createTextType(undefined, false);
      const typeB = createTextType(undefined, false);
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return false for unlimited vs limited Text types', () => {
      const typeA = createTextType(undefined, false);
      const typeB = createTextType(100, false);
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });
  });

  describe('CodeunitType comparison', () => {
    it('should return true for equal codeunit types', () => {
      const typeA = createCodeunitType(80, 'Sales-Post');
      const typeB = createCodeunitType(80, 'Sales-Post');
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return false for different codeunit IDs', () => {
      const typeA = createCodeunitType(80, 'Sales-Post');
      const typeB = createCodeunitType(81, 'Sales-Post');
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return false for different codeunit names', () => {
      const typeA = createCodeunitType(80, 'Sales-Post');
      const typeB = createCodeunitType(80, 'Purch.-Post');
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return true for codeunits with only matching IDs', () => {
      const typeA = createCodeunitType(80, '');
      const typeB = createCodeunitType(80, '');
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });
  });

  describe('UnknownType comparison', () => {
    it('should return true for unknown types with same reason', () => {
      const typeA = createUnknownType('Table not found');
      const typeB = createUnknownType('Table not found');
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return false for unknown types with different reasons', () => {
      const typeA = createUnknownType('Table not found');
      const typeB = createUnknownType('Invalid syntax');
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });

    it('should return true for unknown types with no reason', () => {
      const typeA = createUnknownType();
      const typeB = createUnknownType();
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should return false for unknown type with reason vs without', () => {
      const typeA = createUnknownType('Some reason');
      const typeB = createUnknownType();
      expect(areTypesEqual(typeA, typeB)).toBe(false);
    });
  });

  describe('Cross-type comparison', () => {
    it('should return false for different type kinds', () => {
      const primitiveType = createPrimitiveType(PrimitiveName.Integer);
      const textType = createTextType(100);
      expect(areTypesEqual(primitiveType, textType)).toBe(false);
    });

    it('should return false for record vs primitive', () => {
      const recordType = createRecordType(18, 'Customer');
      const primitiveType = createPrimitiveType(PrimitiveName.Integer);
      expect(areTypesEqual(recordType, primitiveType)).toBe(false);
    });

    it('should return false for array vs primitive', () => {
      const arrayType = createArrayType(createPrimitiveType(PrimitiveName.Integer), [10]);
      const primitiveType = createPrimitiveType(PrimitiveName.Integer);
      expect(areTypesEqual(arrayType, primitiveType)).toBe(false);
    });

    it('should return false for option vs text', () => {
      const optionType = createOptionType(['A', 'B']);
      const textType = createTextType(100);
      expect(areTypesEqual(optionType, textType)).toBe(false);
    });

    it('should return false for codeunit vs unknown', () => {
      const codeunitType = createCodeunitType(80, 'Sales-Post');
      const unknownType = createUnknownType();
      expect(areTypesEqual(codeunitType, unknownType)).toBe(false);
    });
  });
});

describe('Factory Functions', () => {
  describe('createPrimitiveType', () => {
    it('should create primitive type with correct kind', () => {
      const type = createPrimitiveType(PrimitiveName.Integer);
      expect(type.kind).toBe('primitive');
    });

    it('should create primitive type with correct name', () => {
      const type = createPrimitiveType(PrimitiveName.Decimal);
      expect(type.name).toBe(PrimitiveName.Decimal);
    });

    it('should create all primitive types correctly', () => {
      for (const name of Object.values(PrimitiveName)) {
        const type = createPrimitiveType(name);
        expect(type.kind).toBe('primitive');
        expect(type.name).toBe(name);
      }
    });
  });

  describe('createRecordType', () => {
    it('should create record type with correct kind', () => {
      const type = createRecordType(18, 'Customer');
      expect(type.kind).toBe('record');
    });

    it('should create record type with correct tableId and tableName', () => {
      const type = createRecordType(18, 'Customer');
      expect(type.tableId).toBe(18);
      expect(type.tableName).toBe('Customer');
    });

    it('should default isTemporary to false', () => {
      const type = createRecordType(18, 'Customer');
      expect(type.isTemporary).toBe(false);
    });

    it('should set isTemporary when specified', () => {
      const type = createRecordType(18, 'Customer', true);
      expect(type.isTemporary).toBe(true);
    });

    it('should handle empty table name', () => {
      const type = createRecordType(18, '');
      expect(type.tableName).toBe('');
    });

    it('should handle zero table ID', () => {
      const type = createRecordType(0, 'SomeTable');
      expect(type.tableId).toBe(0);
    });
  });

  describe('createArrayType', () => {
    it('should create array type with correct kind', () => {
      const type = createArrayType(createPrimitiveType(PrimitiveName.Integer), [10]);
      expect(type.kind).toBe('array');
    });

    it('should create array type with correct element type', () => {
      const elementType = createPrimitiveType(PrimitiveName.Integer);
      const type = createArrayType(elementType, [10]);
      expect(type.elementType).toBe(elementType);
    });

    it('should create array type with correct dimensions', () => {
      const type = createArrayType(createPrimitiveType(PrimitiveName.Integer), [10, 20, 30]);
      expect(type.dimensions).toEqual([10, 20, 30]);
    });

    it('should handle empty dimensions', () => {
      const type = createArrayType(createPrimitiveType(PrimitiveName.Integer), []);
      expect(type.dimensions).toEqual([]);
    });

    it('should support nested array as element type', () => {
      const innerArray = createArrayType(createPrimitiveType(PrimitiveName.Integer), [5]);
      const outerArray = createArrayType(innerArray, [10]);
      expect(outerArray.elementType).toBe(innerArray);
    });
  });

  describe('createOptionType', () => {
    it('should create option type with correct kind', () => {
      const type = createOptionType(['A', 'B', 'C']);
      expect(type.kind).toBe('option');
    });

    it('should create option type with correct values', () => {
      const type = createOptionType(['Open', 'Released', 'Closed']);
      expect(type.values).toEqual(['Open', 'Released', 'Closed']);
    });

    it('should handle empty values array', () => {
      const type = createOptionType([]);
      expect(type.values).toEqual([]);
    });

    it('should handle single value', () => {
      const type = createOptionType(['OnlyOne']);
      expect(type.values).toEqual(['OnlyOne']);
    });

    it('should preserve value order', () => {
      const values = ['C', 'A', 'B'];
      const type = createOptionType(values);
      expect(type.values).toEqual(['C', 'A', 'B']);
    });
  });

  describe('createTextType', () => {
    it('should create text type with correct kind', () => {
      const type = createTextType(100);
      expect(type.kind).toBe('text');
    });

    it('should create Text type by default (isCode false)', () => {
      const type = createTextType(100);
      expect(type.isCode).toBe(false);
    });

    it('should create Code type when isCode is true', () => {
      const type = createTextType(20, true);
      expect(type.isCode).toBe(true);
    });

    it('should set maxLength correctly', () => {
      const type = createTextType(250);
      expect(type.maxLength).toBe(250);
    });

    it('should handle undefined maxLength (unlimited)', () => {
      const type = createTextType();
      expect(type.maxLength).toBeUndefined();
    });

    it('should handle explicit undefined maxLength with isCode', () => {
      const type = createTextType(undefined, true);
      expect(type.maxLength).toBeUndefined();
      expect(type.isCode).toBe(true);
    });
  });

  describe('createCodeunitType', () => {
    it('should create codeunit type with correct kind', () => {
      const type = createCodeunitType(80, 'Sales-Post');
      expect(type.kind).toBe('codeunit');
    });

    it('should set codeunitId correctly', () => {
      const type = createCodeunitType(80, 'Sales-Post');
      expect(type.codeunitId).toBe(80);
    });

    it('should set codeunitName correctly', () => {
      const type = createCodeunitType(80, 'Sales-Post');
      expect(type.codeunitName).toBe('Sales-Post');
    });

    it('should handle empty codeunit name', () => {
      const type = createCodeunitType(80, '');
      expect(type.codeunitName).toBe('');
    });

    it('should handle zero codeunit ID', () => {
      const type = createCodeunitType(0, 'SomeCodeunit');
      expect(type.codeunitId).toBe(0);
    });
  });

  describe('createUnknownType', () => {
    it('should create unknown type with correct kind', () => {
      const type = createUnknownType();
      expect(type.kind).toBe('unknown');
    });

    it('should set reason when provided', () => {
      const type = createUnknownType('Table not found');
      expect(type.reason).toBe('Table not found');
    });

    it('should have undefined reason when not provided', () => {
      const type = createUnknownType();
      expect(type.reason).toBeUndefined();
    });

    it('should handle empty string reason', () => {
      const type = createUnknownType('');
      expect(type.reason).toBe('');
    });
  });
});

describe('Edge Cases', () => {
  describe('typeToString edge cases', () => {
    it('should handle array with large dimension', () => {
      const type = createArrayType(
        createPrimitiveType(PrimitiveName.Integer),
        [1000000]
      );
      expect(typeToString(type)).toBe('Array[1000000] of Integer');
    });

    it('should handle deeply nested arrays', () => {
      let type: Type = createPrimitiveType(PrimitiveName.Integer);
      for (let i = 0; i < 5; i++) {
        type = createArrayType(type, [2]);
      }
      expect(typeToString(type)).toBe('Array[2] of Array[2] of Array[2] of Array[2] of Array[2] of Integer');
    });

    it('should handle option with special characters in values', () => {
      const type = createOptionType(['Item-1', 'Item 2', 'Item/3']);
      expect(typeToString(type, { verbose: true })).toBe('Option (Item-1, Item 2, Item/3)');
    });

    it('should handle array of temporary records', () => {
      const type = createArrayType(
        createRecordType(18, 'Customer', true),
        [10]
      );
      expect(typeToString(type)).toBe('Array[10] of Record Customer (temporary)');
    });
  });

  describe('areTypesEqual edge cases', () => {
    it('should handle complex nested structures', () => {
      const complexA = createArrayType(
        createArrayType(
          createRecordType(18, 'Customer', true),
          [5]
        ),
        [10]
      );

      const complexB = createArrayType(
        createArrayType(
          createRecordType(18, 'Customer', true),
          [5]
        ),
        [10]
      );

      expect(areTypesEqual(complexA, complexB)).toBe(true);
    });

    it('should detect difference in deeply nested element types', () => {
      const complexA = createArrayType(
        createArrayType(
          createRecordType(18, 'Customer', true),
          [5]
        ),
        [10]
      );

      const complexB = createArrayType(
        createArrayType(
          createRecordType(18, 'Customer', false), // Different isTemporary
          [5]
        ),
        [10]
      );

      expect(areTypesEqual(complexA, complexB)).toBe(false);
    });

    it('should handle array of arrays with different inner element types', () => {
      const arrA = createArrayType(
        createArrayType(createPrimitiveType(PrimitiveName.Integer), [5]),
        [10]
      );

      const arrB = createArrayType(
        createArrayType(createPrimitiveType(PrimitiveName.Decimal), [5]),
        [10]
      );

      expect(areTypesEqual(arrA, arrB)).toBe(false);
    });
  });

  describe('Format options', () => {
    it('should use default options when not specified', () => {
      const type = createOptionType(['A', 'B', 'C', 'D']);
      // Default verbose is false
      expect(typeToString(type)).toBe('Option');
    });

    it('should merge partial options with defaults', () => {
      const type = createOptionType(['A', 'B', 'C', 'D', 'E']);
      // Only specifying verbose, maxOptionValues should use default of 3
      expect(typeToString(type, { verbose: true })).toBe('Option (A, B, C, ...)');
    });

    it('should allow custom maxOptionValues to show more values', () => {
      const type = createOptionType(['A', 'B', 'C', 'D', 'E']);
      expect(typeToString(type, { verbose: true, maxOptionValues: 5 })).toBe('Option (A, B, C, D, E)');
    });

    it('should handle maxOptionValues of 1', () => {
      const type = createOptionType(['A', 'B', 'C']);
      expect(typeToString(type, { verbose: true, maxOptionValues: 1 })).toBe('Option (A, ...)');
    });
  });
});

describe('Integration Tests', () => {
  describe('Type round-trip verification', () => {
    it('should format and compare consistently for primitive types', () => {
      const typeA = createPrimitiveType(PrimitiveName.Integer);
      const typeB = createPrimitiveType(PrimitiveName.Integer);

      expect(typeToString(typeA)).toBe(typeToString(typeB));
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should format and compare consistently for record types', () => {
      const typeA = createRecordType(18, 'Customer', true);
      const typeB = createRecordType(18, 'Customer', true);

      expect(typeToString(typeA)).toBe(typeToString(typeB));
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should format and compare consistently for array types', () => {
      const typeA = createArrayType(createPrimitiveType(PrimitiveName.Decimal), [10, 20]);
      const typeB = createArrayType(createPrimitiveType(PrimitiveName.Decimal), [10, 20]);

      expect(typeToString(typeA)).toBe(typeToString(typeB));
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should format and compare consistently for text types', () => {
      const typeA = createTextType(100, true);
      const typeB = createTextType(100, true);

      expect(typeToString(typeA)).toBe(typeToString(typeB));
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should format and compare consistently for option types', () => {
      const typeA = createOptionType(['Open', 'Closed']);
      const typeB = createOptionType(['Open', 'Closed']);

      expect(typeToString(typeA)).toBe(typeToString(typeB));
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should format and compare consistently for codeunit types', () => {
      const typeA = createCodeunitType(80, 'Sales-Post');
      const typeB = createCodeunitType(80, 'Sales-Post');

      expect(typeToString(typeA)).toBe(typeToString(typeB));
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });

    it('should format and compare consistently for unknown types', () => {
      const typeA = createUnknownType('Error message');
      const typeB = createUnknownType('Error message');

      expect(typeToString(typeA)).toBe(typeToString(typeB));
      expect(areTypesEqual(typeA, typeB)).toBe(true);
    });
  });

  describe('Real-world C/AL type scenarios', () => {
    it('should handle Customer record type', () => {
      const customerRec = createRecordType(18, 'Customer');
      expect(typeToString(customerRec)).toBe('Record Customer');
    });

    it('should handle Sales Header record type', () => {
      const salesHeader = createRecordType(36, 'Sales Header');
      expect(typeToString(salesHeader)).toBe('Record Sales Header');
    });

    it('should handle temporary Item Ledger Entry', () => {
      const tempEntry = createRecordType(32, 'Item Ledger Entry', true);
      expect(typeToString(tempEntry)).toBe('Record Item Ledger Entry (temporary)');
    });

    it('should handle Document Type option', () => {
      const docType = createOptionType([
        'Quote',
        'Order',
        'Invoice',
        'Credit Memo',
        'Blanket Order',
        'Return Order'
      ]);
      expect(typeToString(docType)).toBe('Option');
      expect(typeToString(docType, { verbose: true })).toBe('Option (Quote, Order, Invoice, ...)');
    });

    it('should handle Code20 field type', () => {
      const code20 = createTextType(20, true);
      expect(typeToString(code20)).toBe('Code[20]');
    });

    it('should handle Text100 field type', () => {
      const text100 = createTextType(100, false);
      expect(typeToString(text100)).toBe('Text[100]');
    });

    it('should handle Sales-Post codeunit reference', () => {
      const salesPost = createCodeunitType(80, 'Sales-Post');
      expect(typeToString(salesPost)).toBe('Codeunit Sales-Post');
    });

    it('should handle array of Customer records', () => {
      const customerArray = createArrayType(
        createRecordType(18, 'Customer'),
        [100]
      );
      expect(typeToString(customerArray)).toBe('Array[100] of Record Customer');
    });
  });
});

describe('isAssignmentCompatible', () => {
  describe('Same-type assignments', () => {
    it('should allow Integer to Integer', () => {
      const source = createPrimitiveType(PrimitiveName.Integer);
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Text[50] to Text[50]', () => {
      const source = createTextType(50, false);
      const target = createTextType(50, false);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Boolean to Boolean', () => {
      const source = createPrimitiveType(PrimitiveName.Boolean);
      const target = createPrimitiveType(PrimitiveName.Boolean);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Record 18 to Record 18', () => {
      const source = createRecordType(18, 'Customer');
      const target = createRecordType(18, 'Customer');
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Option to Option (same values)', () => {
      const source = createOptionType(['Open', 'Closed']);
      const target = createOptionType(['Open', 'Closed']);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });
  });

  describe('Numeric widening (compatible)', () => {
    it('should allow Integer to Decimal', () => {
      const source = createPrimitiveType(PrimitiveName.Integer);
      const target = createPrimitiveType(PrimitiveName.Decimal);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Char to Integer', () => {
      const source = createPrimitiveType(PrimitiveName.Char);
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Byte to Integer', () => {
      const source = createPrimitiveType(PrimitiveName.Byte);
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Integer to BigInteger', () => {
      const source = createPrimitiveType(PrimitiveName.Integer);
      const target = createPrimitiveType(PrimitiveName.BigInteger);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow BigInteger to Decimal', () => {
      const source = createPrimitiveType(PrimitiveName.BigInteger);
      const target = createPrimitiveType(PrimitiveName.Decimal);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });
  });

  describe('Numeric narrowing (incompatible)', () => {
    it('should reject Decimal to Integer', () => {
      const source = createPrimitiveType(PrimitiveName.Decimal);
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });
  });

  describe('Integer implicit narrowing conversions (C/AL allowed)', () => {
    it('should allow Integer to Char', () => {
      const source = createPrimitiveType(PrimitiveName.Integer);
      const target = createPrimitiveType(PrimitiveName.Char);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Integer to Byte', () => {
      const source = createPrimitiveType(PrimitiveName.Integer);
      const target = createPrimitiveType(PrimitiveName.Byte);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Integer to Duration', () => {
      const source = createPrimitiveType(PrimitiveName.Integer);
      const target = createPrimitiveType(PrimitiveName.Duration);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should reject Decimal to Char (only Integer narrows to Char)', () => {
      const source = createPrimitiveType(PrimitiveName.Decimal);
      const target = createPrimitiveType(PrimitiveName.Char);
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });

    it('should reject Decimal to Byte (only Integer narrows to Byte)', () => {
      const source = createPrimitiveType(PrimitiveName.Decimal);
      const target = createPrimitiveType(PrimitiveName.Byte);
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });
  });

  describe('Text/Code interoperability', () => {
    it('should allow Text to Code', () => {
      const source = createTextType(50, false);
      const target = createTextType(50, true);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Code to Text', () => {
      const source = createTextType(20, true);
      const target = createTextType(20, false);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Text[50] to Text[100] (widening)', () => {
      const source = createTextType(50, false);
      const target = createTextType(100, false);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Code[20] to Code[10] (runtime truncates)', () => {
      const source = createTextType(20, true);
      const target = createTextType(10, true);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });
  });

  describe('Char to string conversion', () => {
    it('should allow Char to Text', () => {
      const source = createPrimitiveType(PrimitiveName.Char);
      const target = createTextType();
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Char to Code', () => {
      const source = createPrimitiveType(PrimitiveName.Char);
      const target = createTextType(undefined, true);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });
  });

  describe('Option interoperability', () => {
    it('should allow Integer to Option', () => {
      const source = createPrimitiveType(PrimitiveName.Integer);
      const target = createOptionType(['Open', 'Closed']);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Option to Integer', () => {
      const source = createOptionType(['Open', 'Closed']);
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });
  });

  describe('Record compatibility', () => {
    it('should allow Record 18 to Record 18 (same table)', () => {
      const source = createRecordType(18, 'Customer');
      const target = createRecordType(18, 'Customer');
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should reject Record 18 to Record 27 (different tables)', () => {
      const source = createRecordType(18, 'Customer');
      const target = createRecordType(27, 'Item');
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });

    it('should allow Record 18 (temp) to Record 18 (isTemporary ignored)', () => {
      const source = createRecordType(18, 'Customer', true);
      const target = createRecordType(18, 'Customer', false);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });
  });

  describe('Incompatible type assignments', () => {
    it('should reject Date to Integer', () => {
      const source = createPrimitiveType(PrimitiveName.Date);
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });

    it('should reject Boolean to Integer', () => {
      const source = createPrimitiveType(PrimitiveName.Boolean);
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });

    it('should reject Text to Integer', () => {
      const source = createTextType(50);
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });

    it('should reject Integer to Text', () => {
      const source = createPrimitiveType(PrimitiveName.Integer);
      const target = createTextType(50);
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });

    it('should reject Record to Integer', () => {
      const source = createRecordType(18, 'Customer');
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });

    it('should reject Boolean to Text', () => {
      const source = createPrimitiveType(PrimitiveName.Boolean);
      const target = createTextType(50);
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });
  });

  describe('Unknown type passthrough', () => {
    it('should allow Unknown to Integer (bail out)', () => {
      const source = createUnknownType('Unresolved');
      const target = createPrimitiveType(PrimitiveName.Integer);
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Integer to Unknown (bail out)', () => {
      const source = createPrimitiveType(PrimitiveName.Integer);
      const target = createUnknownType('Unresolved');
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should allow Unknown to Unknown (bail out)', () => {
      const source = createUnknownType('Unresolved 1');
      const target = createUnknownType('Unresolved 2');
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should allow Codeunit 80 to Codeunit 80 (same ID)', () => {
      const source = createCodeunitType(80, 'Sales-Post');
      const target = createCodeunitType(80, 'Sales-Post');
      expect(isAssignmentCompatible(source, target)).toBe(true);
    });

    it('should reject Codeunit 80 to Codeunit 81 (different IDs)', () => {
      const source = createCodeunitType(80, 'Sales-Post');
      const target = createCodeunitType(81, 'Purch.-Post');
      expect(isAssignmentCompatible(source, target)).toBe(false);
    });
  });
});

describe('inferLiteralType', () => {
  it('should infer Integer from integer literal', () => {
    const type = inferLiteralType('integer');
    expect(type.kind).toBe('primitive');
    expect((type as any).name).toBe(PrimitiveName.Integer);
  });

  it('should infer Decimal from decimal literal', () => {
    const type = inferLiteralType('decimal');
    expect(type.kind).toBe('primitive');
    expect((type as any).name).toBe(PrimitiveName.Decimal);
  });

  it('should infer Boolean from boolean literal', () => {
    const type = inferLiteralType('boolean');
    expect(type.kind).toBe('primitive');
    expect((type as any).name).toBe(PrimitiveName.Boolean);
  });

  it('should infer unlimited Text from string literal', () => {
    const type = inferLiteralType('string');
    expect(type.kind).toBe('text');
    expect((type as any).isCode).toBe(false);
    expect((type as any).maxLength).toBeUndefined();
  });

  it('should infer Date from date literal', () => {
    const type = inferLiteralType('date');
    expect(type.kind).toBe('primitive');
    expect((type as any).name).toBe(PrimitiveName.Date);
  });

  it('should infer Time from time literal', () => {
    const type = inferLiteralType('time');
    expect(type.kind).toBe('primitive');
    expect((type as any).name).toBe(PrimitiveName.Time);
  });

  it('should infer DateTime from datetime literal', () => {
    const type = inferLiteralType('datetime');
    expect(type.kind).toBe('primitive');
    expect((type as any).name).toBe(PrimitiveName.DateTime);
  });

  it('should return Unknown for unrecognized literal type', () => {
    const type = inferLiteralType('unknown-literal');
    expect(type.kind).toBe('unknown');
  });

  it('should return Unknown for empty string', () => {
    const type = inferLiteralType('');
    expect(type.kind).toBe('unknown');
  });
});
