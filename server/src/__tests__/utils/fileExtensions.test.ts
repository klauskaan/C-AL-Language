import { hasTxtExtension, hasCalExtension } from '../../utils/fileExtensions';

describe('fileExtensions utilities', () => {
  describe('hasTxtExtension', () => {
    describe('case variations', () => {
      it('should match lowercase .txt extension', () => {
        expect(hasTxtExtension('file.txt')).toBe(true);
      });

      it('should match uppercase .TXT extension', () => {
        expect(hasTxtExtension('file.TXT')).toBe(true);
      });

      it('should match mixed case .Txt extension', () => {
        expect(hasTxtExtension('file.Txt')).toBe(true);
      });

      it('should match mixed case .TxT extension', () => {
        expect(hasTxtExtension('file.TxT')).toBe(true);
      });

      it('should match mixed case .tXt extension', () => {
        expect(hasTxtExtension('file.tXt')).toBe(true);
      });
    });

    describe('normal cases', () => {
      it('should match simple filename with .txt', () => {
        expect(hasTxtExtension('document.txt')).toBe(true);
      });

      it('should match C/AL object filename COD1000.TXT', () => {
        expect(hasTxtExtension('COD1000.TXT')).toBe(true);
      });

      it('should match path with .txt file', () => {
        expect(hasTxtExtension('/path/to/file.txt')).toBe(true);
      });

      it('should match Windows path with .TXT file', () => {
        expect(hasTxtExtension('C:\\NAV\\Objects\\COD1.TXT')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(hasTxtExtension('')).toBe(false);
      });

      it('should match extension-only file .txt', () => {
        expect(hasTxtExtension('.txt')).toBe(true);
      });

      it('should match extension-only file .TXT', () => {
        expect(hasTxtExtension('.TXT')).toBe(true);
      });

      it('should not match file with no extension', () => {
        expect(hasTxtExtension('filename')).toBe(false);
      });

      it('should not match file with different extension', () => {
        expect(hasTxtExtension('file.cal')).toBe(false);
      });

      it('should match file with multiple extensions ending in .txt', () => {
        expect(hasTxtExtension('file.backup.txt')).toBe(true);
      });

      it('should not match file with .txt in middle', () => {
        expect(hasTxtExtension('file.txt.bak')).toBe(false);
      });

      it('should not match TXT without dot', () => {
        expect(hasTxtExtension('TXT')).toBe(false);
      });

      it('should not match filename containing _txt', () => {
        expect(hasTxtExtension('filename_txt')).toBe(false);
      });

      it('should not match filename ending with txt but no dot', () => {
        expect(hasTxtExtension('filetxt')).toBe(false);
      });

      it('should handle filename with only extension and path', () => {
        expect(hasTxtExtension('/path/to/.txt')).toBe(true);
      });
    });

    describe('non-string input handling', () => {
      it('should return false for null input', () => {
        expect(hasTxtExtension(null as unknown as string)).toBe(false);
      });

      it('should return false for undefined input', () => {
        expect(hasTxtExtension(undefined as unknown as string)).toBe(false);
      });

      it('should return false for numeric input', () => {
        expect(hasTxtExtension(123 as unknown as string)).toBe(false);
      });

      it('should return false for object input', () => {
        expect(hasTxtExtension({} as unknown as string)).toBe(false);
      });

      it('should return false for array input', () => {
        expect(hasTxtExtension([] as unknown as string)).toBe(false);
      });
    });
  });

  describe('hasCalExtension', () => {
    describe('case variations', () => {
      it('should match lowercase .cal extension', () => {
        expect(hasCalExtension('file.cal')).toBe(true);
      });

      it('should match uppercase .CAL extension', () => {
        expect(hasCalExtension('file.CAL')).toBe(true);
      });

      it('should match mixed case .Cal extension', () => {
        expect(hasCalExtension('file.Cal')).toBe(true);
      });

      it('should match mixed case .CaL extension', () => {
        expect(hasCalExtension('file.CaL')).toBe(true);
      });

      it('should match mixed case .cAl extension', () => {
        expect(hasCalExtension('file.cAl')).toBe(true);
      });
    });

    describe('normal cases', () => {
      it('should match simple filename with .cal', () => {
        expect(hasCalExtension('document.cal')).toBe(true);
      });

      it('should match C/AL object filename test.cal', () => {
        expect(hasCalExtension('test.cal')).toBe(true);
      });

      it('should match path with .cal file', () => {
        expect(hasCalExtension('/path/to/file.cal')).toBe(true);
      });

      it('should match Windows path with .CAL file', () => {
        expect(hasCalExtension('C:\\NAV\\Objects\\Table1.CAL')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(hasCalExtension('')).toBe(false);
      });

      it('should match extension-only file .cal', () => {
        expect(hasCalExtension('.cal')).toBe(true);
      });

      it('should match extension-only file .CAL', () => {
        expect(hasCalExtension('.CAL')).toBe(true);
      });

      it('should not match file with no extension', () => {
        expect(hasCalExtension('filename')).toBe(false);
      });

      it('should not match file with different extension', () => {
        expect(hasCalExtension('file.txt')).toBe(false);
      });

      it('should match file with multiple extensions ending in .cal', () => {
        expect(hasCalExtension('file.backup.cal')).toBe(true);
      });

      it('should not match file with .cal in middle', () => {
        expect(hasCalExtension('file.cal.bak')).toBe(false);
      });

      it('should not match CAL without dot', () => {
        expect(hasCalExtension('CAL')).toBe(false);
      });

      it('should not match filename containing _cal', () => {
        expect(hasCalExtension('filename_cal')).toBe(false);
      });

      it('should not match filename ending with cal but no dot', () => {
        expect(hasCalExtension('filecal')).toBe(false);
      });

      it('should handle filename with only extension and path', () => {
        expect(hasCalExtension('/path/to/.cal')).toBe(true);
      });
    });

    describe('non-string input handling', () => {
      it('should return false for null input', () => {
        expect(hasCalExtension(null as unknown as string)).toBe(false);
      });

      it('should return false for undefined input', () => {
        expect(hasCalExtension(undefined as unknown as string)).toBe(false);
      });

      it('should return false for numeric input', () => {
        expect(hasCalExtension(123 as unknown as string)).toBe(false);
      });

      it('should return false for object input', () => {
        expect(hasCalExtension({} as unknown as string)).toBe(false);
      });

      it('should return false for array input', () => {
        expect(hasCalExtension([] as unknown as string)).toBe(false);
      });
    });
  });
});
