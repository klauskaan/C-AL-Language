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
  resolveVariableType
} from '../typeResolver';
import {
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

  describe('parser-produced compound type patterns', () => {
    describe('Group A - embedded size patterns', () => {
      it('should resolve Code20 to Code with length 20', () => {
        const dataType = createDataType('Code20', { length: 20 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(true);
        expect((resolved as TextType).maxLength).toBe(20);
      });

      it('should resolve Text50 to Text with length 50', () => {
        const dataType = createDataType('Text50', { length: 50 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(false);
        expect((resolved as TextType).maxLength).toBe(50);
      });

      it('should resolve Text100 to Text with length 100', () => {
        const dataType = createDataType('Text100', { length: 100 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(false);
        expect((resolved as TextType).maxLength).toBe(100);
      });

      it('should resolve Decimal5 to Decimal with length 5', () => {
        const dataType = createDataType('Decimal5', { length: 5 });
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Decimal);
      });

      it('should resolve CODE10 (uppercase) to Code with length 10', () => {
        const dataType = createDataType('CODE10', { length: 10 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(true);
        expect((resolved as TextType).maxLength).toBe(10);
      });

      it('should resolve text30 (lowercase) to Text with length 30', () => {
        const dataType = createDataType('text30', { length: 30 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(false);
        expect((resolved as TextType).maxLength).toBe(30);
      });

      it('should resolve TeXt25 (mixed case) to Text with length 25', () => {
        const dataType = createDataType('TeXt25', { length: 25 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(false);
        expect((resolved as TextType).maxLength).toBe(25);
      });
    });

    describe('Group B - bracket notation', () => {
      it('should resolve Text[30] to Text with length 30', () => {
        const dataType = createDataType('Text[30]', { length: 30 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(false);
        expect((resolved as TextType).maxLength).toBe(30);
      });

      it('should resolve Code[10] to Code with length 10', () => {
        const dataType = createDataType('Code[10]', { length: 10 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(true);
        expect((resolved as TextType).maxLength).toBe(10);
      });

      it('should resolve TEXT[50] (uppercase) to Text with length 50', () => {
        const dataType = createDataType('TEXT[50]', { length: 50 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(false);
        expect((resolved as TextType).maxLength).toBe(50);
      });

      it('should resolve code[20] (lowercase) to Code with length 20', () => {
        const dataType = createDataType('code[20]', { length: 20 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(true);
        expect((resolved as TextType).maxLength).toBe(20);
      });
    });

    describe('Group C - space + object ID', () => {
      it('should resolve "Record 18" to Record with tableId 18', () => {
        const dataType = createDataType('Record 18', { tableId: 18 });
        const resolved = resolveType(dataType);

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).tableId).toBe(18);
      });

      it('should resolve "Record 27" to Record with tableId 27', () => {
        const dataType = createDataType('Record 27', { tableId: 27 });
        const resolved = resolveType(dataType);

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).tableId).toBe(27);
      });

      it('should resolve "Codeunit 80" to Codeunit with codeunitId 80', () => {
        const dataType = createDataType('Codeunit 80', { tableId: 80 });
        const resolved = resolveType(dataType);

        expect(isCodeunitType(resolved)).toBe(true);
        expect((resolved as CodeunitType).codeunitId).toBe(80);
      });

      it('should resolve "Codeunit 1" to Codeunit with codeunitId 1', () => {
        const dataType = createDataType('Codeunit 1', { tableId: 1 });
        const resolved = resolveType(dataType);

        expect(isCodeunitType(resolved)).toBe(true);
        expect((resolved as CodeunitType).codeunitId).toBe(1);
      });

      it('should resolve "RECORD 18" (uppercase) to Record with tableId 18', () => {
        const dataType = createDataType('RECORD 18', { tableId: 18 });
        const resolved = resolveType(dataType);

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).tableId).toBe(18);
      });

      it('should resolve "codeunit 80" (lowercase) to Codeunit with codeunitId 80', () => {
        const dataType = createDataType('codeunit 80', { tableId: 80 });
        const resolved = resolveType(dataType);

        expect(isCodeunitType(resolved)).toBe(true);
        expect((resolved as CodeunitType).codeunitId).toBe(80);
      });

      it('should resolve "ReCord 27" (mixed case) to Record with tableId 27', () => {
        const dataType = createDataType('ReCord 27', { tableId: 27 });
        const resolved = resolveType(dataType);

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).tableId).toBe(27);
      });
    });

    describe('Group D - prefix collision prevention', () => {
      it('should resolve TextConst to unknown type (not Text)', () => {
        const dataType = createDataType('TextConst');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: TextConst');
      });

      it('should resolve RecordRef to unknown type (not Record)', () => {
        const dataType = createDataType('RecordRef');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: RecordRef');
      });

      it('should resolve RecordID to unknown type (not Record)', () => {
        const dataType = createDataType('RecordID');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: RecordID');
      });

      it('should resolve CodeunitRunner to unknown type (not Codeunit)', () => {
        const dataType = createDataType('CodeunitRunner');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: CodeunitRunner');
      });

      it('should resolve TextHandler to unknown type (not Text)', () => {
        const dataType = createDataType('TextHandler');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: TextHandler');
      });

      it('should resolve CodeBuilder to unknown type (not Code)', () => {
        const dataType = createDataType('CodeBuilder');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: CodeBuilder');
      });
    });

    describe('Group E - other unknown types', () => {
      it('should resolve DotNet to unknown type', () => {
        const dataType = createDataType('DotNet');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: DotNet');
      });

      it('should resolve Automation to unknown type', () => {
        const dataType = createDataType('Automation');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: Automation');
      });

      it('should resolve Variant to unknown type', () => {
        const dataType = createDataType('Variant');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: Variant');
      });

      it('should resolve BLOB to unknown type', () => {
        const dataType = createDataType('BLOB');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: BLOB');
      });

      it('should resolve BigText to unknown type', () => {
        const dataType = createDataType('BigText');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: BigText');
      });

      it('should resolve DateFormula to unknown type', () => {
        const dataType = createDataType('DateFormula');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: DateFormula');
      });

      it('should resolve FieldRef to unknown type', () => {
        const dataType = createDataType('FieldRef');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: FieldRef');
      });

      it('should resolve KeyRef to unknown type', () => {
        const dataType = createDataType('KeyRef');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: KeyRef');
      });

      it('should resolve Dialog to unknown type', () => {
        const dataType = createDataType('Dialog');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: Dialog');
      });

      it('should resolve File to unknown type', () => {
        const dataType = createDataType('File');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: File');
      });

      it('should resolve InStream to unknown type', () => {
        const dataType = createDataType('InStream');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: InStream');
      });

      it('should resolve OutStream to unknown type', () => {
        const dataType = createDataType('OutStream');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: OutStream');
      });

      it('should resolve OCX to unknown type', () => {
        const dataType = createDataType('OCX');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: OCX');
      });

      it('should resolve "Page 21" to unknown type', () => {
        const dataType = createDataType('Page 21');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: Page 21');
      });

      it('should resolve "Report 206" to unknown type', () => {
        const dataType = createDataType('Report 206');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
        expect((resolved as UnknownType).reason).toBe('Unrecognized type: Report 206');
      });
    });

    describe('Group F - regression tests (bare types)', () => {
      it('should still resolve bare Code type', () => {
        const dataType = createDataType('Code');
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(true);
        expect((resolved as TextType).maxLength).toBeUndefined();
      });

      it('should still resolve bare Text type', () => {
        const dataType = createDataType('Text');
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).isCode).toBe(false);
        expect((resolved as TextType).maxLength).toBeUndefined();
      });

      it('should still resolve bare Record type', () => {
        const dataType = createDataType('Record');
        const resolved = resolveType(dataType);

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).tableId).toBe(0);
      });

      it('should still resolve bare Codeunit type', () => {
        const dataType = createDataType('Codeunit');
        const resolved = resolveType(dataType);

        expect(isCodeunitType(resolved)).toBe(true);
        expect((resolved as CodeunitType).codeunitId).toBe(0);
      });

      it('should still resolve bare Decimal type', () => {
        const dataType = createDataType('Decimal');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Decimal);
      });

      it('should still resolve bare Integer type', () => {
        const dataType = createDataType('Integer');
        const resolved = resolveType(dataType);

        expect(isPrimitiveType(resolved)).toBe(true);
        expect((resolved as PrimitiveType).name).toBe(PrimitiveName.Integer);
      });
    });

    describe('Group G - edge cases', () => {
      it('should resolve empty typeName to unknown', () => {
        const dataType = createDataType('');
        const resolved = resolveType(dataType);

        expect(isUnknownType(resolved)).toBe(true);
      });

      it('should resolve Option type with inline option string', () => {
        const dataType = createDataType('Option', { optionString: 'Open,Released' });
        const resolved = resolveType(dataType);

        expect(isOptionType(resolved)).toBe(true);
        expect((resolved as OptionType).values).toEqual(['Open', 'Released']);
      });

      it('should resolve Record without tableId to Record with tableId 0', () => {
        const dataType = createDataType('Record');
        const resolved = resolveType(dataType);

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).tableId).toBe(0);
      });

      it('should resolve Codeunit without tableId to Codeunit with codeunitId 0', () => {
        const dataType = createDataType('Codeunit');
        const resolved = resolveType(dataType);

        expect(isCodeunitType(resolved)).toBe(true);
        expect((resolved as CodeunitType).codeunitId).toBe(0);
      });

      it('should resolve "Record" with trailing whitespace to Record', () => {
        const dataType = createDataType('Record ', { tableId: 18 });
        const resolved = resolveType(dataType);

        expect(isRecordType(resolved)).toBe(true);
        expect((resolved as RecordType).tableId).toBe(18);
      });

      it('should resolve compound type with length mismatch (Text50 with length 30)', () => {
        // Parser might provide inconsistent data - should use length parameter
        const dataType = createDataType('Text50', { length: 30 });
        const resolved = resolveType(dataType);

        expect(isTextType(resolved)).toBe(true);
        expect((resolved as TextType).maxLength).toBe(30);
      });
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
