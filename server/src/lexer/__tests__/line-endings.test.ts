import { Lexer } from '../lexer';
import { TokenType } from '../tokens';

describe('Lexer - Line Endings Edge Cases', () => {
  describe('Category 1: Line Endings in Block Comments', () => {
    it('should handle LF-only line endings in block comments', () => {
      const code = 'BEGIN { This is a\nblock comment\nwith LF endings } END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
      expect(tokens[2].type).toBe(TokenType.EOF);
    });

    it('should handle CRLF line endings in block comments', () => {
      const code = 'BEGIN { This is a\r\nblock comment\r\nwith CRLF endings } END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
      expect(tokens[2].type).toBe(TokenType.EOF);
    });

    it('should handle mixed LF and CRLF within same block comment', () => {
      const code = 'BEGIN { Line 1\nLine 2\r\nLine 3\nLine 4\r\n} END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
    });

    it('should handle CR-only (legacy Mac format) in block comments', () => {
      const code = 'BEGIN { Line 1\rLine 2\rLine 3 } END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
    });

    it('should handle multiple consecutive blank lines with different endings', () => {
      const code = 'BEGIN { Start\n\n\r\n\r\n\nEnd } END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
    });

    it('should handle block comment spanning many lines with mixed endings', () => {
      const code = 'BEGIN { Comment line 1\nComment line 2\r\nComment line 3\rComment line 4\n} END "NextToken"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(4); // BEGIN, END, QuotedIdentifier, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('NextToken');
    });
  });

  describe('Category 2: Line Endings in Line Comments', () => {
    it('should handle // comment followed by LF', () => {
      const code = '// This is a comment\n"Field1"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // QuotedIdentifier, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[0].line).toBe(2); // Should be on line 2
    });

    it('should handle // comment followed by CRLF', () => {
      const code = '// This is a comment\r\n"Field1"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // QuotedIdentifier, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[0].line).toBe(2); // Should be on line 2
    });

    it('should handle // comment followed by CR only', () => {
      const code = '// This is a comment\r"Field1"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // QuotedIdentifier, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field1');
    });

    it('should handle // comment at end of file (no line ending)', () => {
      const code = '// This is a comment';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(1); // EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle multiple consecutive // comments with different endings', () => {
      const code = '// Comment 1\n// Comment 2\r\n// Comment 3\r// Comment 4\n"Field"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2); // QuotedIdentifier, EOF (all comments are skipped)
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field');
      expect(tokens[0].line).toBe(5); // After 4 comment lines
    });
  });

  describe('Category 3: Line Endings in String Literals', () => {
    it('should handle quoted identifier across CRLF boundary', () => {
      const code = '"Field1"\r\n"Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Field2');
      expect(tokens[1].line).toBe(2);
    });

    it('should handle quoted identifier across LF boundary', () => {
      const code = '"Field1"\n"Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Field2');
      expect(tokens[1].line).toBe(2);
    });

    it('should handle quoted identifier across CR boundary', () => {
      const code = '"Field1"\r"Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].value).toBe('Field2');
    });

    it('should handle multiple quoted identifiers with mixed line endings', () => {
      const code = '"ID1"\n"ID2"\r\n"ID3"\r"ID4"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(5); // 4 identifiers + EOF
      expect(tokens[0].value).toBe('ID1');
      expect(tokens[1].value).toBe('ID2');
      expect(tokens[2].value).toBe('ID3');
      expect(tokens[3].value).toBe('ID4');
    });

    it('should handle quoted identifiers with whitespace and various endings', () => {
      const code = '"Field 1"  \n  "Field 2"  \r\n  "Field 3"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(4);
      expect(tokens[0].value).toBe('Field 1');
      expect(tokens[1].value).toBe('Field 2');
      expect(tokens[2].value).toBe('Field 3');
    });
  });

  describe('Category 4: Mixed Line Endings in Single File', () => {
    it('should handle file with both CRLF and LF line endings mixed', () => {
      const code = '"Field1"\r\n"Field2"\n"Field3"\r\n"Field4"\n';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(5); // 4 identifiers + EOF
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].value).toBe('Field2');
      expect(tokens[2].value).toBe('Field3');
      expect(tokens[3].value).toBe('Field4');
      expect(tokens[4].type).toBe(TokenType.EOF);
    });

    it('should handle alternating CRLF/LF pattern', () => {
      const code = 'table 50000 "Test"\r\n{\nDataClassification = CustomerContent;\r\n}';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Table);
      expect(tokens[1].type).toBe(TokenType.Integer);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[3].type).toBe(TokenType.LeftBrace);
      expect(tokens[4].type).toBe(TokenType.Identifier);
    });

    it('should handle sections with different line ending styles', () => {
      const code = 'BEGIN { Comment section\r\nwith CRLF } END\n\n"Field1"\n"Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[2].value).toBe('Field1');
      expect(tokens[3].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[3].value).toBe('Field2');
    });

    it('should handle complex code structure with mixed endings', () => {
      const code = [
        'table 50000 "Customer"',
        '{',
        '    fields\r',
        '    {\r\n',
        '        field(1; "No."; Code[20])\n',
        '        { }\r\n',
        '    }\n',
        '}'
      ].join('\n');
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Table);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
      const braceTokens = tokens.filter(t => t.type === TokenType.LeftBrace || t.type === TokenType.RightBrace);
      expect(braceTokens.length).toBeGreaterThan(0);
    });
  });

  describe('Category 5: Position Tracking Accuracy', () => {
    it('should correctly track positions with CRLF (2 chars per line break)', () => {
      const code = '"A"\r\n"B"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(3); // "A" is 3 chars
      expect(tokens[0].line).toBe(1);
      expect(tokens[0].column).toBe(1);

      expect(tokens[1].startOffset).toBe(5); // After "A"\r\n (3 + 2)
      expect(tokens[1].endOffset).toBe(8); // "B" ends at position 8
      expect(tokens[1].line).toBe(2);
      expect(tokens[1].column).toBe(1);
    });

    it('should correctly track positions with LF (1 char per line break)', () => {
      const code = '"A"\n"B"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].startOffset).toBe(0);
      expect(tokens[0].endOffset).toBe(3);
      expect(tokens[0].line).toBe(1);

      expect(tokens[1].startOffset).toBe(4); // After "A"\n (3 + 1)
      expect(tokens[1].endOffset).toBe(7);
      expect(tokens[1].line).toBe(2);
    });

    it('should correctly track positions with mixed endings', () => {
      const code = '"A"\r\n"B"\n"C"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].line).toBe(1);
      expect(tokens[1].line).toBe(2);
      expect(tokens[1].startOffset).toBe(5); // "A"\r\n = 5 chars
      expect(tokens[2].line).toBe(3);
      expect(tokens[2].startOffset).toBe(9); // "A"\r\n"B"\n = 9 chars
    });

    it('should increment line numbers correctly for all ending types', () => {
      const code = '"L1"\n"L2"\r\n"L3"\r"L4"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].line).toBe(1);
      expect(tokens[1].line).toBe(2);
      expect(tokens[2].line).toBe(3);
      expect(tokens[3].line).toBe(4);
    });

    it('should reset columns correctly after each line ending type', () => {
      const code = '"Field1"  \n  "Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].column).toBe(1); // "Field1" starts at column 1
      expect(tokens[1].column).toBe(3); // "Field2" starts at column 3 (after 2 spaces)
    });
  });

  describe('Category 6: Edge Cases', () => {
    it('should handle file starting with line ending (empty first line)', () => {
      const code = '\n"Field1"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[0].line).toBe(2); // Should be on line 2
    });

    it('should handle file ending with multiple line endings', () => {
      const code = '"Field1"\n\n\n';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.QuotedIdentifier);
      expect(tokens[1].type).toBe(TokenType.EOF);
    });

    it('should handle lone CR without LF (old Mac format)', () => {
      const code = '"Field1"\r"Field2"\r"Field3"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(4);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].value).toBe('Field2');
      expect(tokens[2].value).toBe('Field3');
    });

    it('should handle lone LF without CR (Unix format)', () => {
      const code = '"Field1"\n"Field2"\n"Field3"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(4);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].value).toBe('Field2');
      expect(tokens[2].value).toBe('Field3');
    });

    it('should handle consecutive CRLFs (blank lines)', () => {
      const code = '"Field1"\r\n\r\n\r\n"Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].value).toBe('Field2');
      expect(tokens[1].line).toBe(4); // Line 1 + 3 blank lines
    });

    it('should handle unusual sequences: \\r\\r\\n', () => {
      const code = '"Field1"\r\r\n"Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].value).toBe('Field2');
      expect(tokens[1].line).toBe(3); // \r creates line 2, \r\n creates line 3
    });

    it('should handle unusual sequences: \\n\\r', () => {
      const code = '"Field1"\n\r"Field2"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe('Field1');
      expect(tokens[1].value).toBe('Field2');
      expect(tokens[1].line).toBe(3); // \n creates line 2, \r creates line 3
    });

    it('should handle unusual sequences: \\r\\n\\r\\n (consecutive blank)', () => {
      const code = '"A"\r\n\r\n"B"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe('A');
      expect(tokens[1].value).toBe('B');
      expect(tokens[1].line).toBe(3);
    });

    it('should handle very long lines (>1000 chars) with different endings', () => {
      const longId = 'A'.repeat(1000);
      const code = `"${longId}"\r\n"B"`;
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe(longId);
      expect(tokens[1].value).toBe('B');
      expect(tokens[1].line).toBe(2);
    });

    it('should handle line ending immediately after operator/keyword', () => {
      const code = 'table\r\n50000\n"Test"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.Table);
      expect(tokens[1].type).toBe(TokenType.Integer);
      expect(tokens[2].type).toBe(TokenType.QuotedIdentifier);
    });
  });

  describe('Category 7: Unicode in Comments and Strings with Line Endings', () => {
    it('should handle block comment with Unicode characters and CRLF', () => {
      const code = 'BEGIN { Ñoño says: こんにちは\r\nSecond line: Привет\r\n} END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
    });

    it('should handle block comment with emojis and mixed line endings', () => {
      const code = 'BEGIN { 🌍 World\n🔵 Blue\r\n👋 Wave } END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
    });

    it('should handle quoted identifier with Unicode across line boundaries', () => {
      const code = '"Ñoño"\r\n"こんにちは"\n"Привет"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(4);
      expect(tokens[0].value).toBe('Ñoño');
      expect(tokens[1].value).toBe('こんにちは');
      expect(tokens[2].value).toBe('Привет');
      expect(tokens[0].line).toBe(1);
      expect(tokens[1].line).toBe(2);
      expect(tokens[2].line).toBe(3);
    });

    it('should handle right-to-left text with CRLF', () => {
      const code = 'BEGIN { مرحبا\r\nשלום\r\n} END';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(3); // BEGIN, END, EOF (comment is skipped)
      expect(tokens[0].type).toBe(TokenType.Begin);
      expect(tokens[1].type).toBe(TokenType.End);
    });

    it('should handle combining characters across line boundaries', () => {
      const code = '"Café"\r\n"naïve"\n"Łódź"';
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      expect(tokens).toHaveLength(4);
      expect(tokens[0].value).toBe('Café');
      expect(tokens[1].value).toBe('naïve');
      expect(tokens[2].value).toBe('Łódź');
      expect(tokens[2].line).toBe(3);
    });
  });
});
