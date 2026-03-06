/**
 * Object Explorer Filter Engine Tests
 *
 * Tests for the C/SIDE-compatible filter expression engine used in the
 * Object Explorer WebView. The engine evaluates a filter expression
 * (as typed by the user in a filter row cell) against a field value.
 *
 * The module is a client-side WebView file tested via Node.js.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const filterEngine = require('../../../src/objectExplorer/webview/filterEngine') as {
  matchesFilter: (fieldValue: string | number | boolean, expression: string) => boolean;
};
const { matchesFilter } = filterEngine;

describe('Object Explorer Filter Engine', () => {

  describe('Empty expression', () => {
    it('should match any numeric value when expression is empty', () => {
      expect(matchesFilter(50000, '')).toBe(true);
    });

    it('should match any string value when expression is empty', () => {
      expect(matchesFilter('Customer', '')).toBe(true);
    });

    it('should match any boolean value when expression is empty', () => {
      expect(matchesFilter(true, '')).toBe(true);
    });
  });

  describe('Null/undefined expression (defensive guard)', () => {
    it('should match any string value when expression is null', () => {
      expect(matchesFilter('Customer', null as unknown as string)).toBe(true);
    });

    it('should match any numeric value when expression is undefined', () => {
      expect(matchesFilter(50000, undefined as unknown as string)).toBe(true);
    });

    it('should match any boolean value when expression is null', () => {
      expect(matchesFilter(true, null as unknown as string)).toBe(true);
    });
  });

  describe('Exact match', () => {
    describe('Numeric', () => {
      it('should match when number equals expression', () => {
        expect(matchesFilter(50000, '50000')).toBe(true);
      });

      it('should not match when number does not equal expression', () => {
        expect(matchesFilter(50001, '50000')).toBe(false);
      });
    });

    describe('String', () => {
      it('should match when string equals expression', () => {
        expect(matchesFilter('Customer', 'Customer')).toBe(true);
      });

      it('should not match when string does not equal expression', () => {
        expect(matchesFilter('Vendor', 'Customer')).toBe(false);
      });
    });

    describe('Boolean Yes/No', () => {
      it('should match true when expression is Yes', () => {
        expect(matchesFilter(true, 'Yes')).toBe(true);
      });

      it('should not match false when expression is Yes', () => {
        expect(matchesFilter(false, 'Yes')).toBe(false);
      });

      it('should match false when expression is No', () => {
        expect(matchesFilter(false, 'No')).toBe(true);
      });

      it('should not match true when expression is No', () => {
        expect(matchesFilter(true, 'No')).toBe(false);
      });
    });
  });

  describe('Range (inclusive)', () => {
    it('should match value at left bound of range', () => {
      expect(matchesFilter(50000, '50000..59999')).toBe(true);
    });

    it('should match value at right bound of range', () => {
      expect(matchesFilter(59999, '50000..59999')).toBe(true);
    });

    it('should match value in the middle of range', () => {
      expect(matchesFilter(55000, '50000..59999')).toBe(true);
    });

    it('should not match value just below left bound', () => {
      expect(matchesFilter(49999, '50000..59999')).toBe(false);
    });

    it('should not match value just above right bound', () => {
      expect(matchesFilter(60000, '50000..59999')).toBe(false);
    });
  });

  describe('Open-ended ranges', () => {
    it('should match value at the upper bound of ..N range', () => {
      expect(matchesFilter(49999, '..49999')).toBe(true);
    });

    it('should not match value above upper bound of ..N range', () => {
      expect(matchesFilter(50000, '..49999')).toBe(false);
    });

    it('should match value at the lower bound of N.. range', () => {
      expect(matchesFilter(50000, '50000..')).toBe(true);
    });

    it('should not match value below lower bound of N.. range', () => {
      expect(matchesFilter(49999, '50000..')).toBe(false);
    });

    it('should match any numeric value when range is ..', () => {
      expect(matchesFilter(1, '..')).toBe(true);
    });

    it('should match any string value when range is ..', () => {
      expect(matchesFilter('Z', '..')).toBe(true);
    });
  });

  describe('String ranges (lexicographic)', () => {
    it('should match string that falls within a lexicographic range', () => {
      expect(matchesFilter('Customer', 'A..M')).toBe(true);
    });

    it('should not match string that falls outside a lexicographic range', () => {
      expect(matchesFilter('Vendor', 'A..M')).toBe(false);
    });
  });

  describe('Comparison operators', () => {
    describe('<> (not equal)', () => {
      it('should match when value is not equal', () => {
        expect(matchesFilter(50001, '<>50000')).toBe(true);
      });

      it('should not match when value is equal', () => {
        expect(matchesFilter(50000, '<>50000')).toBe(false);
      });
    });

    describe('> (greater than)', () => {
      it('should match when value is strictly greater', () => {
        expect(matchesFilter(50001, '>50000')).toBe(true);
      });

      it('should not match when value equals the threshold', () => {
        expect(matchesFilter(50000, '>50000')).toBe(false);
      });
    });

    describe('< (less than)', () => {
      it('should match when value is strictly less', () => {
        expect(matchesFilter(49999, '<50000')).toBe(true);
      });

      it('should not match when value equals the threshold', () => {
        expect(matchesFilter(50000, '<50000')).toBe(false);
      });
    });

    describe('>= (greater than or equal)', () => {
      it('should match when value equals the threshold', () => {
        expect(matchesFilter(50000, '>=50000')).toBe(true);
      });

      it('should not match when value is below the threshold', () => {
        expect(matchesFilter(49999, '>=50000')).toBe(false);
      });
    });

    describe('<= (less than or equal)', () => {
      it('should match when value equals the threshold', () => {
        expect(matchesFilter(50000, '<=50000')).toBe(true);
      });

      it('should not match when value is above the threshold', () => {
        expect(matchesFilter(50001, '<=50000')).toBe(false);
      });
    });
  });

  describe('<> with wildcard', () => {
    it('should not match when value contains the wildcard pattern', () => {
      expect(matchesFilter('NAVW114.00', '<>*NAVW*')).toBe(false);
    });

    it('should match when value does not contain the wildcard pattern', () => {
      expect(matchesFilter('NAVDK14.00', '<>*NAVW*')).toBe(true);
    });
  });

  describe('OR expressions', () => {
    it('should match the first alternative in an OR expression', () => {
      expect(matchesFilter(1, '1|6|99')).toBe(true);
    });

    it('should match a middle alternative in an OR expression', () => {
      expect(matchesFilter(6, '1|6|99')).toBe(true);
    });

    it('should match the last alternative in an OR expression', () => {
      expect(matchesFilter(99, '1|6|99')).toBe(true);
    });

    it('should not match a value that is in none of the OR alternatives', () => {
      expect(matchesFilter(2, '1|6|99')).toBe(false);
    });
  });

  describe('AND expressions', () => {
    it('should match when value satisfies all AND conditions', () => {
      expect(matchesFilter(75, '>50&<100')).toBe(true);
    });

    it('should not match when value fails the first AND condition', () => {
      expect(matchesFilter(50, '>50&<100')).toBe(false);
    });

    it('should not match when value fails the second AND condition', () => {
      expect(matchesFilter(100, '>50&<100')).toBe(false);
    });
  });

  describe('OR + range combined', () => {
    it('should match the exact value in the OR part', () => {
      expect(matchesFilter(5999, '5999|8100..8490')).toBe(true);
    });

    it('should match value at the left bound of the range part', () => {
      expect(matchesFilter(8100, '5999|8100..8490')).toBe(true);
    });

    it('should match value at the right bound of the range part', () => {
      expect(matchesFilter(8490, '5999|8100..8490')).toBe(true);
    });

    it('should match value in the middle of the range part', () => {
      expect(matchesFilter(8245, '5999|8100..8490')).toBe(true);
    });

    it('should not match value outside both the OR value and range', () => {
      expect(matchesFilter(8000, '5999|8100..8490')).toBe(false);
    });
  });

  describe('OR + AND precedence (OR binds looser than AND)', () => {
    it('should match when value satisfies the AND branch of an OR+AND expression', () => {
      expect(matchesFilter(75, '>50&<100|200')).toBe(true);
    });

    it('should match when value matches the plain OR branch of an OR+AND expression', () => {
      expect(matchesFilter(200, '>50&<100|200')).toBe(true);
    });

    it('should not match when value satisfies neither branch', () => {
      expect(matchesFilter(150, '>50&<100|200')).toBe(false);
    });
  });

  describe('Wildcard * (case-sensitive)', () => {
    it('should match when string starts with the pattern prefix', () => {
      expect(matchesFilter('Customer', 'Cu*')).toBe(true);
    });

    it('should match when string ends with the pattern suffix', () => {
      expect(matchesFilter('Customer', '*er')).toBe(true);
    });

    it('should match when string contains the middle pattern', () => {
      expect(matchesFilter('Customer', '*sto*')).toBe(true);
    });

    it('should not match when string does not start with pattern prefix', () => {
      expect(matchesFilter('Vendor', 'Cu*')).toBe(false);
    });

    it('should not match when case does not match (case-sensitive)', () => {
      expect(matchesFilter('Customer', '*CO*')).toBe(false);
    });
  });

  describe('Wildcard ? (exactly one character)', () => {
    it('should match when ? substitutes exactly one character', () => {
      expect(matchesFilter('Hansen', 'Hans?n')).toBe(true);
    });

    it('should match a different single character in the same position', () => {
      expect(matchesFilter('Hanson', 'Hans?n')).toBe(true);
    });

    it('should not match when there is no character to substitute', () => {
      expect(matchesFilter('Hansn', 'Hans?n')).toBe(false);
    });

    it('should not match when there is more than one character in the substituted position', () => {
      expect(matchesFilter('Hanseen', 'Hans?n')).toBe(false);
    });
  });

  describe('@ case-insensitive prefix', () => {
    it('should match uppercase value against lowercase pattern with @', () => {
      expect(matchesFilter('CUSTOMER', '@*customer*')).toBe(true);
    });

    it('should match lowercase value against uppercase pattern with @', () => {
      expect(matchesFilter('customer', '@*CUSTOMER*')).toBe(true);
    });

    it('should match mixed-case value against lowercase prefix with @', () => {
      expect(matchesFilter('Customer', '@cu*')).toBe(true);
    });

    it('should match mixed-case value against uppercase suffix with @', () => {
      expect(matchesFilter('Customer', '@*MER')).toBe(true);
    });

    it('should not match when value does not match even case-insensitively', () => {
      expect(matchesFilter('Customer', '@vendor')).toBe(false);
    });
  });

  describe('@ case-insensitive exact match', () => {
    it('should match when @ makes comparison case-insensitive and cases differ', () => {
      expect(matchesFilter('Customer', '@customer')).toBe(true);
    });

    it('should match when @ makes comparison case-insensitive and value is uppercase', () => {
      expect(matchesFilter('Customer', '@CUSTOMER')).toBe(true);
    });

    it('should not match when no @ and cases differ', () => {
      expect(matchesFilter('Customer', 'customer')).toBe(false);
    });
  });

  describe('Regex special characters in filter values (must be treated as literals)', () => {
    it('should treat dot in exact match expression as a literal character', () => {
      expect(matchesFilter('NAVW114.00', 'NAVW114.00')).toBe(true);
    });

    it('should not match when dot would match any char if treated as regex', () => {
      expect(matchesFilter('NAVW11400', 'NAVW114.00')).toBe(false);
    });

    it('should treat parentheses in exact match expression as literals', () => {
      expect(matchesFilter('Item (Special)', 'Item (Special)')).toBe(true);
    });

    it('should not match different string when parentheses are in expression', () => {
      expect(matchesFilter('Other', 'Item (Special)')).toBe(false);
    });
  });

  describe('Regex special characters in wildcard patterns', () => {
    it('should treat dot in wildcard expression as a literal character', () => {
      expect(matchesFilter('NAVW114.00', '*114.00')).toBe(true);
    });

    it('should not treat dot as any-character when used in wildcard expression', () => {
      expect(matchesFilter('NAVW11400', '*114.00')).toBe(false);
    });
  });

});
