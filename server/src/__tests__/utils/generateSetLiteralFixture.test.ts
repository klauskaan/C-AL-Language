import { generateProcedure } from '../performance/utils/generateSetLiteralFixture';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';

describe('generateSetLiteralFixture', () => {
  describe('generateProcedure nesting logic', () => {
    describe('begin/end balance', () => {
      it('should have balanced begin/end tokens for setsPerProcedure=3', () => {
        const code = generateProcedure(0, 3);

        const beginCount = (code.match(/\bbegin\b/gi) || []).length;
        const caseCount = (code.match(/\bcase\b/gi) || []).length;
        const endCount = (code.match(/\bend;/gi) || []).length + (code.match(/\bend\b(?!;)/gi) || []).length;

        expect(beginCount + caseCount).toBe(endCount);
      });

      it('should have balanced begin/end tokens for setsPerProcedure=4', () => {
        const code = generateProcedure(0, 4);

        const beginCount = (code.match(/\bbegin\b/gi) || []).length;
        const caseCount = (code.match(/\bcase\b/gi) || []).length;
        const endCount = (code.match(/\bend;/gi) || []).length + (code.match(/\bend\b(?!;)/gi) || []).length;

        expect(beginCount + caseCount).toBe(endCount);
      });

      it('should have balanced begin/end tokens for setsPerProcedure=5', () => {
        const code = generateProcedure(0, 5);

        const beginCount = (code.match(/\bbegin\b/gi) || []).length;
        const caseCount = (code.match(/\bcase\b/gi) || []).length;
        const endCount = (code.match(/\bend;/gi) || []).length + (code.match(/\bend\b(?!;)/gi) || []).length;

        expect(beginCount + caseCount).toBe(endCount);
      });

      it('should have balanced begin/end tokens for setsPerProcedure=6', () => {
        const code = generateProcedure(0, 6);

        const beginCount = (code.match(/\bbegin\b/gi) || []).length;
        const caseCount = (code.match(/\bcase\b/gi) || []).length;
        const endCount = (code.match(/\bend;/gi) || []).length + (code.match(/\bend\b(?!;)/gi) || []).length;

        expect(beginCount + caseCount).toBe(endCount);
      });

      it('should have balanced begin/end tokens for setsPerProcedure=7', () => {
        const code = generateProcedure(0, 7);

        const beginCount = (code.match(/\bbegin\b/gi) || []).length;
        const caseCount = (code.match(/\bcase\b/gi) || []).length;
        const endCount = (code.match(/\bend;/gi) || []).length + (code.match(/\bend\b(?!;)/gi) || []).length;

        expect(beginCount + caseCount).toBe(endCount);
      });

      it('should have balanced begin/end tokens for setsPerProcedure=9', () => {
        const code = generateProcedure(0, 9);

        const beginCount = (code.match(/\bbegin\b/gi) || []).length;
        const caseCount = (code.match(/\bcase\b/gi) || []).length;
        const endCount = (code.match(/\bend;/gi) || []).length + (code.match(/\bend\b(?!;)/gi) || []).length;

        expect(beginCount + caseCount).toBe(endCount);
      });
    });

    describe('parser validation', () => {
      function wrapProcedureInCodeunit(procedureCode: string): string {
        return `OBJECT Codeunit 50100 "Test"
{
  OBJECT-PROPERTIES
  {
    Date=12/02/26;
    Time=12:00:00;
  }
  CODE
  {
${procedureCode}
  }
}`;
      }

      it('should parse without errors for setsPerProcedure=3', () => {
        const procedureCode = generateProcedure(0, 3);
        const codeunitCode = wrapProcedureInCodeunit(procedureCode);

        const lexer = new Lexer(codeunitCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors).toHaveLength(0);
      });

      it('should parse without errors for setsPerProcedure=6', () => {
        const procedureCode = generateProcedure(0, 6);
        const codeunitCode = wrapProcedureInCodeunit(procedureCode);

        const lexer = new Lexer(codeunitCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors).toHaveLength(0);
      });

      it('should parse without errors for setsPerProcedure=9', () => {
        const procedureCode = generateProcedure(0, 9);
        const codeunitCode = wrapProcedureInCodeunit(procedureCode);

        const lexer = new Lexer(codeunitCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);

        parser.parse();
        const errors = parser.getErrors();

        expect(errors).toHaveLength(0);
      });
    });
  });
});
