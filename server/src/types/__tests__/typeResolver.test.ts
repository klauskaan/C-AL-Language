/**
 * TypeResolver Tests
 *
 * Tests for the type resolver which converts syntactic DataType AST nodes
 * from the parser into semantic Type objects. Covers all type categories:
 * primitives, text/code, records, options, codeunits, arrays, and unknown types.
 */

import { DataType, VariableDeclaration } from '../../parser/ast';
import { Token, TokenType } from '../../lexer/tokens';
import {
  resolveType,
  resolveVariableType,
  TypeResolverOptions
} from '../typeResolver';
import {
  Type,
  PrimitiveType,
  PrimitiveName,
  RecordType,
  TextType,
  OptionType,
  CodeunitType,
  ArrayType,
  UnknownType,
  isPrimitiveType,
  isRecordType,
  isTextType,
  isOptionType,
  isCodeunitType,
  isArrayType,
  isUnknownType
} from '../types';

/**
 * Helper to create a mock Token for AST nodes
 */
function createMockToken(value: string = ''): Token {
  return {
    type: TokenType.Identifier,
    value,
    line: 1,
    column: 1,
    startOffset: 0,
    endOffset: value.length
  };
}

/**
 * Helper to create a DataType AST node
 */
function createDataType(
  typeName: string,
  options: {
    length?: number;
    tableId?: number;
    optionString?: string;
  } = {}
): DataType {
  const token = createMockToken(typeName);
  return {
    type: 'DataType',
    typeName,
    length: options.length,
    tableId: options.tableId,
    optionString: options.optionString,
    startToken: token,
    endToken: token
  };
}

/**
 * Helper to create a VariableDeclaration AST node
 */
function createVariableDeclaration(
  name: string,
  dataType: DataType,
  isTemporary?: boolean
): VariableDeclaration {
  const token = createMockToken(name);
  return {
    type: 'VariableDeclaration',
    name,
    dataType,
    isTemporary,
    startToken: token,
    endToken: token
  };
}

describe('TypeResolver', () => {
  describe('resolveType', () => {
    describe('primitive types', () => {
      it('should resolve Integer type', () => {
        const dataType = createDataType('Integer');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).kind).toBe('primitive');
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Integer);
      });

      it('should resolve Decimal type', () => {
        const dataType = createDataType('Decimal');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Decimal);
      });

      it('should resolve Boolean type', () => {
        const dataType = createDataType('Boolean');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Boolean);
      });

      it('should resolve Date type', () => {
        const dataType = createDataType('Date');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Date);
      });

      it('should resolve Time type', () => {
        const dataType = createDataType('Time');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Time);
      });

      it('should resolve DateTime type', () => {
        const dataType = createDataType('DateTime');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.DateTime);
      });

      it('should resolve Char type', () => {
        const dataType = createDataType('Char');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Char);
      });

      it('should resolve Byte type', () => {
        const dataType = createDataType('Byte');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Byte);
      });

      it('should resolve GUID type', () => {
        const dataType = createDataType('GUID');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.GUID);
      });

      it('should resolve Duration type', () => {
        const dataType = createDataType('Duration');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Duration);
      });

      it('should resolve BigInteger type', () => {
        const dataType = createDataType('BigInteger');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.BigInteger);
      });

      it('should resolve primitive types case-insensitively (lowercase)', () => {
        const dataType = createDataType('integer');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Integer);
      });

      it('should resolve primitive types case-insensitively (uppercase)', () => {
        const dataType = createDataType('INTEGER');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Integer);
      });

      it('should resolve primitive types case-insensitively (mixed case)', () => {
        const dataType = createDataType('InTeGeR');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Integer);
      });
    });

    describe('text types', () => {
      it('should resolve Text type with length', () => {
        const dataType = createDataType('Text', { length: 100 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).kind).toBe('text');
        expect((resolved as TextType).maxLength).toBe(100);
        expect((resolved as TextType).isCode).toBe(false);
      });

      it('should resolve Text type without length (unlimited)', () => {
        const dataType = createDataType('Text');
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).maxLength).toBeUndefined();
        expect((resolved as TextType).isCode).toBe(false);
      });

      it('should resolve Code type with length', () => {
        const dataType = createDataType('Code', { length: 20 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).kind).toBe('text');
        expect((resolved as TextType).maxLength).toBe(20);
        expect((resolved as TextType).isCode).toBe(true);
      });

      it('should resolve Code type without length', () => {
        const dataType = createDataType('Code');
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).maxLength).toBeUndefined();
        expect((resolved as TextType).isCode).toBe(true);
      });

      it('should resolve text types case-insensitively', () => {
        const textLower = createDataType('text', { length: 50 });
        const textUpper = createDataType('TEXT', { length: 50 });
        const codeLower = createDataType('code', { length: 10 });
        const codeUpper = createDataType('CODE', { length: 10 });

        expect(isTextType(resolveType(textLower))).toBe(true);
        expect(isTextType(resolveType(textUpper))).toBe(true);
        expect(isTextType(resolveType(codeLower))).toBe(true);
        expect(isTextType(resolveType(codeUpper))).toBe(true);
      });
    });

    describe('record types', () => {
      it('should resolve Record type with tableId', () => {
        const dataType = createDataType('Record', { tableId: 18 });
        const resolved = resolveType(dataType);

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).kind).toBe('record');
        expect((resolved as RecordType).tableId).toBe(18);
        expect((resolved as RecordType).tableName).toBe('');
        expect((resolved as RecordType).isTemporary).toBe(false);
      });

      it('should resolve Record type without tableId (defaults to 0)', () => {
        const dataType = createDataType('Record');
        const resolved = resolveType(dataType);

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).tableId).toBe(0);
      });

      it('should resolve Record type with isTemporary option', () => {
        const dataType = createDataType('Record', { tableId: 27 });
        const resolved = resolveType(dataType, { isTemporary: true });

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).tableId).toBe(27);
        expect((resolved as RecordType).isTemporary).toBe(true);
      });

      it('should resolve Record type with defaultTemporary option', () => {
        const dataType = createDataType('Record', { tableId: 18 });
        const resolved = resolveType(dataType, { defaultTemporary: true });

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).isTemporary).toBe(true);
      });

      it('should prioritize isTemporary over defaultTemporary', () => {
        const dataType = createDataType('Record', { tableId: 18 });
        const resolved = resolveType(dataType, {
          isTemporary: false,
          defaultTemporary: true
        });

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).isTemporary).toBe(false);
      });

      it('should resolve record types case-insensitively', () => {
        const recordLower = createDataType('record', { tableId: 18 });
        const recordUpper = createDataType('RECORD', { tableId: 18 });

        expect(isRecordType(resolveType(recordLower))).toBe(true);
        expect(isRecordType(resolveType(recordUpper))).toBe(true);
      });
    });

    describe('option types', () => {
      it('should resolve Option type with option string', () => {
        const dataType = createDataType('Option', {
          optionString: 'Open,Released,Closed'
        });
        const resolved = resolveType(dataType);

        expect(isOptionType(resolved)).toBe(true);
        expect((resolved as OptionType).kind).toBe('option');
        expect((resolved as OptionType).values).toEqual(['Open', 'Released', 'Closed']);
      });

      it('should resolve Option type without option string (empty values)', () => {
        const dataType = createDataType('Option');
        const resolved = resolveType(dataType);

        expect(isOptionType(resolved)).toBe(true);
        expect((resolved as OptionType).values).toEqual([]);
      });

      it('should trim whitespace from option values', () => {
        const dataType = createDataType('Option', {
          optionString: '  Open  ,  Released  ,  Closed  '
        });
        const resolved = resolveType(dataType);

        expect(isOptionType(resolved)).toBe(true);
        expect((resolved as OptionType).values).toEqual(['Open', 'Released', 'Closed']);
      });

      it('should filter out empty option values', () => {
        const dataType = createDataType('Option', {
          optionString: 'Open,,Released,,,Closed'
        });
        const resolved = resolveType(dataType);

        expect(isOptionType(resolved)).toBe(true);
        expect((resolved as OptionType).values).toEqual(['Open', 'Released', 'Closed']);
      });

      it('should preserve option values with spaces', () => {
        const dataType = createDataType('Option', {
          optionString: 'Pending Approval,Pending Prepayment,Released'
        });
        const resolved = resolveType(dataType);

        expect(isOptionType(resolved)).toBe(true);
        expect((resolved as OptionType).values).toEqual([
          'Pending Approval',
          'Pending Prepayment',
          'Released'
        ]);
      });

      it('should handle single option value', () => {
        const dataType = createDataType('Option', { optionString: 'SingleOption' });
        const resolved = resolveType(dataType);

        expect(isOptionType(resolved)).toBe(true);
        expect((resolved as OptionType).values).toEqual(['SingleOption']);
      });

      it('should resolve option types case-insensitively', () => {
        const optionLower = createDataType('option', { optionString: 'A,B' });
        const optionUpper = createDataType('OPTION', { optionString: 'A,B' });

        expect(isOptionType(resolveType(optionLower))).toBe(true);
        expect(isOptionType(resolveType(optionUpper))).toBe(true);
      });
    });

    describe('codeunit types', () => {
      it('should resolve Codeunit type with tableId (used as codeunitId)', () => {
        const dataType = createDataType('Codeunit', { tableId: 80 });
        const resolved = resolveType(dataType);

        expect(isCodeunitType(resolved)).toBe(true);
        expect((resolved as CodeunitType).kind).toBe('codeunit');
        expect((resolved as CodeunitType).codeunitId).toBe(80);
        expect((resolved as CodeunitType).codeunitName).toBe('');
      });

      it('should resolve Codeunit type without tableId (defaults to 0)', () => {
        const dataType = createDataType('Codeunit');
        const resolved = resolveType(dataType);

        expect(isCodeunitType(resolved)).toBe(true);
        expect((resolved as CodeunitType).codeunitId).toBe(0);
      });

      it('should resolve codeunit types case-insensitively', () => {
        const codeunitLower = createDataType('codeunit', { tableId: 1 });
        const codeunitUpper = createDataType('CODEUNIT', { tableId: 1 });

        expect(isCodeunitType(resolveType(codeunitLower))).toBe(true);
        expect(isCodeunitType(resolveType(codeunitUpper))).toBe(true);
      });
    });

    describe('array types', () => {
      it('should resolve Array type with placeholder element type', () => {
        const dataType = createDataType('Array');
        const resolved = resolveType(dataType);

        expect(isArrayType(resolved)).toBe(true);
        expect((resolved as ArrayType).kind).toBe('array');
        expect((resolved as ArrayType).dimensions).toEqual([]);
        expect(isUnknownType((resolved as ArrayType).elementType)).toBe(true);
      });

      it('should resolve array types case-insensitively', () => {
        const arrayLower = createDataType('array');
        const arrayUpper = createDataType('ARRAY');
        const arrayMixed = createDataType('ArRaY');

        expect(isArrayType(resolveType(arrayLower))).toBe(true);
        expect(isArrayType(resolveType(arrayUpper))).toBe(true);
        expect(isArrayType(resolveType(arrayMixed))).toBe(true);
      });

      it('should resolve type names starting with "array"', () => {
        // Parser might produce "array[10] of Integer" as typeName
        const dataType = createDataType('array[10]');
        const resolved = resolveType(dataType);

        expect(isArrayType(resolved)).toBe(true);
      });
    });

    describe('unknown types', () => {
      it('should resolve unrecognized type to unknown', () => {
        const dataType = createDataType('MyCustomType');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).kind).toBe('unknown');
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: MyCustomType');
      });

      it('should resolve misspelled type names to unknown', () => {
        const dataType = createDataType('Integr'); // Typo of Integer
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: Integr');
      });

      it('should resolve empty type name to unknown', () => {
        const dataType = createDataType('');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
      });

      it('should preserve original type name in unknown reason', () => {
        const dataType = createDataType('SomeExternalType');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toContain('SomeExternalType');
      });
    });
  });

  describe('resolveVariableType', () => {
    it('should resolve variable type with isTemporary from declaration', () => {
      const dataType = createDataType('Record', { tableId: 18 });
      const varDecl = createVariableDeclaration('TempCustomer', dataType, true);
      const resolved = resolveVariableType(varDecl);

      expect(isRecordType(resolved)).toBe(true);
      expect((resolved as RecordType).tableId).toBe(18);
      expect((resolved as RecordType).isTemporary).toBe(true);
    });

    it('should resolve variable type without isTemporary', () => {
      const dataType = createDataType('Record', { tableId: 18 });
      const varDecl = createVariableDeclaration('Customer', dataType);
      const resolved = resolveVariableType(varDecl);

      expect(isRecordType(resolved)).toBe(true);
      expect((resolved as RecordType).isTemporary).toBe(false);
    });

    it('should resolve variable type with explicit false isTemporary', () => {
      const dataType = createDataType('Record', { tableId: 27 });
      const varDecl = createVariableDeclaration('Item', dataType, false);
      const resolved = resolveVariableType(varDecl);

      expect(isRecordType(resolved)).toBe(true);
      expect((resolved as RecordType).isTemporary).toBe(false);
    });

    it('should resolve non-record variable types correctly', () => {
      const intDataType = createDataType('Integer');
      const varDecl = createVariableDeclaration('Counter', intDataType);
      const resolved = resolveVariableType(varDecl);

      expect(isPrimitiveType(resolved)).toBe(true);
      expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Integer);
    });

    it('should resolve text variable types correctly', () => {
      const textDataType = createDataType('Text', { length: 50 });
      const varDecl = createVariableDeclaration('Description', textDataType);
      const resolved = resolveVariableType(varDecl);

      expect(isTextType(resolved)).toBe(true);
      expect((resolved as TextType).maxLength).toBe(50);
    });

    it('should prioritize variable isTemporary over options isTemporary', () => {
      const dataType = createDataType('Record', { tableId: 18 });
      const varDecl = createVariableDeclaration('TempRec', dataType, true);
      const resolved = resolveVariableType(varDecl, { isTemporary: false });

      expect(isRecordType(resolved)).toBe(true);
      expect((resolved as RecordType).isTemporary).toBe(true);
    });

    it('should use options isTemporary when variable isTemporary is undefined', () => {
      const dataType = createDataType('Record', { tableId: 18 });
      const varDecl = createVariableDeclaration('Rec', dataType); // isTemporary is undefined
      const resolved = resolveVariableType(varDecl, { isTemporary: true });

      expect(isRecordType(resolved)).toBe(true);
      expect((resolved as RecordType).isTemporary).toBe(true);
    });
  });

  describe('TypeResolverOptions', () => {
    it('should use default options when not provided', () => {
      const dataType = createDataType('Record', { tableId: 18 });
      const resolved = resolveType(dataType);

      expect(isRecordType(resolved)).toBe(true);
      expect((resolved as RecordType).isTemporary).toBe(false);
    });

    it('should accept empty options object', () => {
      const dataType = createDataType('Record', { tableId: 18 });
      const resolved = resolveType(dataType, {});

      expect(isRecordType(resolved)).toBe(true);
      expect((resolved as RecordType).isTemporary).toBe(false);
    });

    it('should only affect record types with isTemporary', () => {
      // isTemporary should only affect record types
      const intDataType = createDataType('Integer');
      const resolved = resolveType(intDataType, { isTemporary: true });

      // Integer type should not be affected by isTemporary
      expect(isPrimitiveType(resolved)).toBe(true);
      expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Integer);
    });
  });

  describe('type discrimination', () => {
    it('should produce types with correct kind discriminators', () => {
      const types = [
        { dataType: createDataType('Integer'), expectedKind: 'primitive' },
        { dataType: createDataType('Text'), expectedKind: 'text' },
        { dataType: createDataType('Code'), expectedKind: 'text' },
        { dataType: createDataType('Record'), expectedKind: 'record' },
        { dataType: createDataType('Option'), expectedKind: 'option' },
        { dataType: createDataType('Codeunit'), expectedKind: 'codeunit' },
        { dataType: createDataType('Array'), expectedKind: 'array' },
        { dataType: createDataType('Unknown'), expectedKind: 'unknown' }
      ];

      types.forEach(({ dataType, expectedKind }) => {
        const resolved = resolveType(dataType);
        expect(resolved.kind).toBe(expectedKind);
      });
    });

    it('should allow TypeScript type narrowing through kind checks', () => {
      const resolved = resolveType(createDataType('Integer'));

      // This tests that the type system works correctly for narrowing
      expect(resolved.kind).toBe('primitive');
      expect(isPrimitiveType(resolved)).toBe(true);
      if (isPrimitiveType(resolved)) {
        // TypeScript narrows through type guard function
        expect(resolved.name).toBe(PrimitiveName.Integer);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle all primitive type name variations', () => {
      const primitiveNames = [
        'integer', 'INTEGER', 'Integer',
        'decimal', 'DECIMAL', 'Decimal',
        'boolean', 'BOOLEAN', 'Boolean',
        'date', 'DATE', 'Date',
        'time', 'TIME', 'Time',
        'datetime', 'DATETIME', 'DateTime',
        'char', 'CHAR', 'Char',
        'byte', 'BYTE', 'Byte',
        'guid', 'GUID', 'Guid',
        'duration', 'DURATION', 'Duration',
        'biginteger', 'BIGINTEGER', 'BigInteger'
      ];

      primitiveNames.forEach(typeName => {
        const dataType = createDataType(typeName);
        const resolved = resolveType(dataType);
        expect(isPrimitiveType(resolved)).toBe(true);
      });
    });

    it('should handle numeric values in option strings correctly', () => {
      const dataType = createDataType('Option', {
        optionString: '0,1,2,3'
      });
      const resolved = resolveType(dataType);

      expect(isOptionType(resolved)).toBe(true);
      expect((resolved as OptionType).values).toEqual(['0', '1', '2', '3']);
    });

    it('should handle very long text lengths', () => {
      const dataType = createDataType('Text', { length: 1000000 });
      const resolved = resolveType(dataType);

      expect(isTextType(resolved)).toBe(true);
      expect((resolved as TextType).maxLength).toBe(1000000);
    });

    it('should handle zero length for text types', () => {
      const dataType = createDataType('Text', { length: 0 });
      const resolved = resolveType(dataType);

      expect(isTextType(resolved)).toBe(true);
      expect((resolved as TextType).maxLength).toBe(0);
    });

    it('should handle zero tableId for record types', () => {
      const dataType = createDataType('Record', { tableId: 0 });
      const resolved = resolveType(dataType);

      expect(isRecordType(resolved)).toBe(true);
      expect((resolved as RecordType).tableId).toBe(0);
    });
  });
});
