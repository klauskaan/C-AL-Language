/**
 * Lexer Health Script - CI Mode Tests
 *
 * Tests the CI integration functions for lexer health checks.
 * These tests cover baseline comparison and CI workflow integration.
 *
 * Test Coverage:
 * - compareToBaseline(): Baseline comparison logic
 * - runCICheck(): CI mode execution flow
 *
 * TDD Note: These tests are expected to FAIL initially as the functions
 * don't exist yet. Implementation will follow after test validation.
 */

import { compareToBaseline, runCICheck, CI_EXIT_CODES } from '../../../scripts/lexer-health';
import { existsSync } from 'fs';

// Mock filesystem functions
jest.mock('fs');

describe('Lexer Health Script - compareToBaseline()', () => {
  describe('equality and improvement scenarios', () => {
    it('should pass when failures equal baseline (boundary case)', () => {
      const result = compareToBaseline(10, 10);

      expect(result.passed).toBe(true);
      expect(result.actualFailures).toBe(10);
      expect(result.baselineMax).toBe(10);
      expect(result.improvement).toBe(0);
      expect(result.requiresBaselineUpdate).toBe(false);
      expect(result.message).toContain('matches baseline');
    });

    it('should pass when failures are below baseline (improvement)', () => {
      const result = compareToBaseline(5, 10);

      expect(result.passed).toBe(true);
      expect(result.actualFailures).toBe(5);
      expect(result.baselineMax).toBe(10);
      expect(result.improvement).toBe(5); // 5 fewer failures
      expect(result.requiresBaselineUpdate).toBe(true);
      expect(result.message).toContain('improvement');
      expect(result.message).toContain('5');
    });

    it('should detect improvement of 1 failure', () => {
      const result = compareToBaseline(9, 10);

      expect(result.passed).toBe(true);
      expect(result.improvement).toBe(1);
      expect(result.requiresBaselineUpdate).toBe(true);
      expect(result.message).toContain('1');
    });

    it('should detect large improvement from 100 to 0 failures', () => {
      const result = compareToBaseline(0, 100);

      expect(result.passed).toBe(true);
      expect(result.improvement).toBe(100);
      expect(result.requiresBaselineUpdate).toBe(true);
      expect(result.message).toContain('100');
    });
  });

  describe('regression scenarios', () => {
    it('should fail when failures are above baseline (regression)', () => {
      const result = compareToBaseline(15, 10);

      expect(result.passed).toBe(false);
      expect(result.actualFailures).toBe(15);
      expect(result.baselineMax).toBe(10);
      expect(result.improvement).toBe(-5); // 5 more failures
      expect(result.requiresBaselineUpdate).toBe(false);
      expect(result.message).toContain('regression');
      expect(result.message).toContain('5');
    });

    it('should fail for minimal regression (1 additional failure)', () => {
      const result = compareToBaseline(11, 10);

      expect(result.passed).toBe(false);
      expect(result.improvement).toBe(-1);
      expect(result.requiresBaselineUpdate).toBe(false);
      expect(result.message).toContain('regression');
      expect(result.message).toContain('1');
    });

    it('should fail for severe regression (10x increase)', () => {
      const result = compareToBaseline(100, 10);

      expect(result.passed).toBe(false);
      expect(result.improvement).toBe(-90);
      expect(result.requiresBaselineUpdate).toBe(false);
      expect(result.message).toContain('regression');
    });
  });

  describe('edge cases', () => {
    it('should handle zero baseline (all-passing baseline)', () => {
      const result = compareToBaseline(0, 0);

      expect(result.passed).toBe(true);
      expect(result.actualFailures).toBe(0);
      expect(result.baselineMax).toBe(0);
      expect(result.improvement).toBe(0);
      expect(result.requiresBaselineUpdate).toBe(false);
      expect(result.message).toContain('matches baseline');
    });

    it('should detect regression from zero baseline', () => {
      const result = compareToBaseline(5, 0);

      expect(result.passed).toBe(false);
      expect(result.actualFailures).toBe(5);
      expect(result.baselineMax).toBe(0);
      expect(result.improvement).toBe(-5);
      expect(result.requiresBaselineUpdate).toBe(false);
      expect(result.message).toContain('regression');
    });

    it('should handle negative failure counts gracefully', () => {
      // This should not happen in practice, but test defensive programming
      const result = compareToBaseline(-1, 10);

      // Expecting it to treat negative as improvement (better than baseline)
      expect(result.passed).toBe(true);
      expect(result.improvement).toBeGreaterThan(0);
    });

    it('should handle negative baseline gracefully', () => {
      // This should not happen in practice, but test defensive programming
      const result = compareToBaseline(5, -1);

      // Expecting it to treat as regression (worse than baseline)
      expect(result.passed).toBe(false);
    });

    it('should handle very large numbers (>1000 failures)', () => {
      const result = compareToBaseline(1500, 2000);

      expect(result.passed).toBe(true);
      expect(result.improvement).toBe(500);
      expect(result.requiresBaselineUpdate).toBe(true);
    });
  });

  describe('message formatting', () => {
    it('should include actual and baseline counts in message', () => {
      const result = compareToBaseline(8, 10);

      expect(result.message).toMatch(/8/);
      expect(result.message).toMatch(/10/);
    });

    it('should use "failure" singular for 1 failure', () => {
      const result = compareToBaseline(1, 1);

      // Expecting singular form "1 failure" not "1 failures"
      expect(result.message).toMatch(/1 failure/);
    });

    it('should use "failures" plural for multiple failures', () => {
      const result = compareToBaseline(5, 10);

      expect(result.message).toMatch(/failures/);
    });
  });
});

describe('Lexer Health Script - runCICheck()', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for readdirSync - returns non-empty array of .TXT files
    // Tests that specifically need empty directory behavior will override this
    const mockReaddirSync = jest.requireMock('fs').readdirSync;
    mockReaddirSync.mockReturnValue(['FILE1.TXT', 'FILE2.TXT']);
  });

  describe('test/REAL directory handling', () => {
    it('should return skipped result when test/REAL directory is missing', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = runCICheck();

      expect(result.exitCode).toBe(CI_EXIT_CODES.PASS);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toContain('test/REAL');
      expect(result.skipReason).toContain('not found');
      expect(result.comparison).toBeNull();
    });

    it('should not skip when test/REAL directory exists', () => {
      // Mock test/REAL exists, baseline exists, and has valid content
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      // Mock readFileSync for baseline
      const mockReadFileSync = jest.requireMock('fs').readFileSync;
      mockReadFileSync.mockReturnValue(JSON.stringify({ maxFailures: 10 }));

      // Mock validateAllFiles to return results
      jest.spyOn(require('../../../scripts/lexer-health'), 'validateAllFiles')
        .mockReturnValue([
          { positionValidation: { isValid: true }, cleanExit: { passed: true } },
          { positionValidation: { isValid: true }, cleanExit: { passed: true } }
        ]);

      const result = runCICheck();

      expect(result.skipped).toBe(false);
      expect(result.comparison).not.toBeNull();
    });
  });

  describe('baseline file handling', () => {
    it('should handle missing baseline file gracefully', () => {
      // test/REAL exists, but baseline.json doesn't
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return false;
        return false;
      });

      const result = runCICheck();

      // Missing baseline file is a configuration error
      expect(result.exitCode).toBe(CI_EXIT_CODES.CONFIG_ERROR);
      expect(result.skipped).toBe(false);
      expect(result.comparison).not.toBeNull();
      // Should indicate baseline is missing in some way
      if (result.comparison) {
        expect(result.comparison.message).toContain('baseline');
      }
    });

    it('should handle malformed baseline JSON gracefully', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      // Mock readFileSync to return invalid JSON
      const mockReadFileSync = jest.requireMock('fs').readFileSync;
      mockReadFileSync.mockReturnValue('{ invalid json }');

      const result = runCICheck();

      // Malformed JSON is a configuration error
      expect(result.exitCode).toBe(CI_EXIT_CODES.CONFIG_ERROR);
      expect(result.skipped).toBe(false);
      expect(result.comparison).not.toBeNull();
      if (result.comparison) {
        expect(result.comparison.passed).toBe(false);
        expect(result.comparison.message).toMatch(/baseline|malformed|invalid|parse/i);
      }
    });

    it('should handle baseline file with missing maxFailures property', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      const mockReadFileSync = jest.requireMock('fs').readFileSync;
      mockReadFileSync.mockReturnValue(JSON.stringify({ someOtherProperty: 'value' }));

      const result = runCICheck();

      // Missing maxFailures property is a configuration error
      expect(result.exitCode).toBe(CI_EXIT_CODES.CONFIG_ERROR);
      expect(result.comparison).not.toBeNull();
      if (result.comparison) {
        expect(result.comparison.passed).toBe(false);
      }
    });

    it('should handle baseline file with non-numeric maxFailures', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      const mockReadFileSync = jest.requireMock('fs').readFileSync;
      mockReadFileSync.mockReturnValue(JSON.stringify({ maxFailures: 'not a number' }));

      const result = runCICheck();

      // Non-numeric maxFailures is a configuration error
      expect(result.exitCode).toBe(CI_EXIT_CODES.CONFIG_ERROR);
      expect(result.comparison).not.toBeNull();
      if (result.comparison) {
        expect(result.comparison.passed).toBe(false);
      }
    });
  });

  describe('exit code mapping', () => {
    it('should return exit code 0 when skipped', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = runCICheck();

      expect(result.exitCode).toBe(CI_EXIT_CODES.PASS);
      expect(result.skipped).toBe(true);
    });

    it('should return exit code 0 when comparison passes', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      const mockReadFileSync = jest.requireMock('fs').readFileSync;
      mockReadFileSync.mockReturnValue(JSON.stringify({ maxFailures: 10 }));

      // Mock validateAllFiles to return 10 failures (matches baseline)
      jest.spyOn(require('../../../scripts/lexer-health'), 'validateAllFiles')
        .mockReturnValue(
          Array.from({ length: 10 }, () => ({
            positionValidation: { isValid: false },
            cleanExit: { passed: true }
          }))
        );

      const result = runCICheck();

      expect(result.exitCode).toBe(CI_EXIT_CODES.PASS);
      expect(result.comparison?.passed).toBe(true);
    });

    it('should return exit code 1 when comparison fails (regression)', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      const mockReadFileSync = jest.requireMock('fs').readFileSync;
      mockReadFileSync.mockReturnValue(JSON.stringify({ maxFailures: 5 }));

      // Mock validateAllFiles to return 10 failures (regression)
      jest.spyOn(require('../../../scripts/lexer-health'), 'validateAllFiles')
        .mockReturnValue(
          Array.from({ length: 10 }, () => ({
            positionValidation: { isValid: false },
            cleanExit: { passed: true }
          }))
        );

      const result = runCICheck();

      expect(result.exitCode).toBe(CI_EXIT_CODES.REGRESSION);
      expect(result.comparison?.passed).toBe(false);
    });

    it('should return CONFIG_ERROR when baseline file handling fails', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return false;
        return false;
      });

      const result = runCICheck();

      // Missing baseline file is a configuration error
      expect(result.exitCode).toBe(CI_EXIT_CODES.CONFIG_ERROR);
    });
  });

  describe('empty directory handling', () => {
    it('should return exitCode 2 when test/REAL exists but contains no .TXT files', () => {
      // Mock test/REAL exists, baseline exists
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      // Mock readdirSync to return empty array (no files)
      const mockReaddirSync = jest.requireMock('fs').readdirSync;
      mockReaddirSync.mockReturnValue([]);

      const result = runCICheck();

      expect(result.exitCode).toBe(CI_EXIT_CODES.CONFIG_ERROR);
      expect(result.skipped).toBe(false);
      expect(result.comparison).not.toBeNull();
      if (result.comparison) {
        expect(result.comparison.message).toMatch(/empty|no.*files/i);
      }
    });

    it('should return exitCode 2 when directory has only non-.TXT files', () => {
      // Mock test/REAL exists, baseline exists
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      // Mock readdirSync to return only non-.TXT files
      const mockReaddirSync = jest.requireMock('fs').readdirSync;
      mockReaddirSync.mockReturnValue(['README.md', 'config.json', 'image.png']);

      const result = runCICheck();

      expect(result.exitCode).toBe(CI_EXIT_CODES.CONFIG_ERROR);
      expect(result.skipped).toBe(false);
      expect(result.comparison).not.toBeNull();
      if (result.comparison) {
        expect(result.comparison.message).toMatch(/empty|no.*files/i);
      }
    });
  });

  describe('readdirSync error handling', () => {
    it('should handle EACCES error (permission denied) gracefully', () => {
      // Mock test/REAL exists, baseline exists
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      // Mock readdirSync to throw EACCES error (permission denied)
      const mockReaddirSync = jest.requireMock('fs').readdirSync;
      const permissionError: any = new Error('EACCES: permission denied, scandir \'test/REAL\'');
      permissionError.code = 'EACCES';
      permissionError.errno = -13;
      permissionError.syscall = 'scandir';
      permissionError.path = 'test/REAL';
      mockReaddirSync.mockImplementation(() => {
        throw permissionError;
      });

      const result = runCICheck();

      expect(mockReaddirSync).toHaveBeenCalled();
      expect(result.exitCode).toBe(CI_EXIT_CODES.CONFIG_ERROR);
      expect(result.skipped).toBe(false);
      expect(result.comparison).not.toBeNull();
      if (result.comparison) {
        expect(result.comparison.passed).toBe(false);
        expect(result.comparison.message).toContain('Configuration error: cannot read test/REAL directory');
        expect(result.comparison.message).toContain('EACCES');
      }
    });

    it('should handle generic readdirSync errors gracefully', () => {
      // Mock test/REAL exists, baseline exists
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      // Mock readdirSync to throw generic error
      const mockReaddirSync = jest.requireMock('fs').readdirSync;
      const genericError = new Error('Too many open files');
      mockReaddirSync.mockImplementation(() => {
        throw genericError;
      });

      const result = runCICheck();

      expect(mockReaddirSync).toHaveBeenCalled();
      expect(result.exitCode).toBe(CI_EXIT_CODES.CONFIG_ERROR);
      expect(result.skipped).toBe(false);
      expect(result.comparison).not.toBeNull();
      if (result.comparison) {
        expect(result.comparison.passed).toBe(false);
        expect(result.comparison.message).toContain('Configuration error: cannot read test/REAL directory');
        expect(result.comparison.message).toContain('Too many open files');
      }
    });
  });

  describe('comparison result integration', () => {
    it('should populate comparison result with correct values on success', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      const mockReadFileSync = jest.requireMock('fs').readFileSync;
      mockReadFileSync.mockReturnValue(JSON.stringify({ maxFailures: 15 }));

      // Mock validateAllFiles to return 10 failures (improvement)
      jest.spyOn(require('../../../scripts/lexer-health'), 'validateAllFiles')
        .mockReturnValue(
          Array.from({ length: 10 }, () => ({
            positionValidation: { isValid: false },
            cleanExit: { passed: true }
          }))
        );

      const result = runCICheck();

      expect(result.comparison).not.toBeNull();
      if (result.comparison) {
        expect(result.comparison.passed).toBe(true);
        expect(result.comparison.actualFailures).toBe(10);
        expect(result.comparison.baselineMax).toBe(15);
        expect(result.comparison.improvement).toBe(5);
        expect(result.comparison.requiresBaselineUpdate).toBe(true);
      }
    });

    it('should populate comparison result with correct values on failure', () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('test/REAL')) return true;
        if (path.includes('baseline.json')) return true;
        return false;
      });

      const mockReadFileSync = jest.requireMock('fs').readFileSync;
      mockReadFileSync.mockReturnValue(JSON.stringify({ maxFailures: 5 }));

      // Mock validateAllFiles to return 8 failures (regression)
      jest.spyOn(require('../../../scripts/lexer-health'), 'validateAllFiles')
        .mockReturnValue(
          Array.from({ length: 8 }, () => ({
            positionValidation: { isValid: false },
            cleanExit: { passed: true }
          }))
        );

      const result = runCICheck();

      expect(result.comparison).not.toBeNull();
      if (result.comparison) {
        expect(result.comparison.passed).toBe(false);
        expect(result.comparison.actualFailures).toBe(8);
        expect(result.comparison.baselineMax).toBe(5);
        expect(result.comparison.improvement).toBe(-3);
        expect(result.comparison.requiresBaselineUpdate).toBe(false);
      }
    });
  });

  describe('optimization - avoiding redundant directory validation (issue #153)', () => {
    it('should pass pre-validated files to validateAllFiles to avoid double validation', () => {
      jest.resetModules();

      const mockExistsSync = jest.requireMock('fs').existsSync;
      const mockReaddirSync = jest.requireMock('fs').readdirSync;
      const mockReadFileSync = jest.requireMock('fs').readFileSync;

      // Setup: directory exists with one file
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['TAB18.TXT']);

      // Mock readFileSync for baseline and file content
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('baseline.json')) {
          return JSON.stringify({ maxFailures: 10 });
        }
        // Return valid C/AL content for the test file
        return Buffer.from('OBJECT Table 18 Customer\r\n{\r\n}\r\n');
      });

      // Import fresh module to avoid spy issues
      const lexerHealth = require('../../../scripts/lexer-health');
      const validateAllFilesSpy = jest.spyOn(lexerHealth, 'validateAllFiles');

      lexerHealth.runCICheck();

      // The key assertion: validateAllFiles should be called WITH the files array
      // (not called without arguments, which would trigger redundant validation)
      expect(validateAllFilesSpy).toHaveBeenCalledTimes(1);
      expect(validateAllFilesSpy).toHaveBeenCalledWith(['TAB18.TXT']);

      validateAllFilesSpy.mockRestore();
    });

    it('should call readdirSync exactly once during successful CI run', () => {
      jest.resetModules();

      const mockExistsSync = jest.requireMock('fs').existsSync;
      const mockReaddirSync = jest.requireMock('fs').readdirSync;
      const mockReadFileSync = jest.requireMock('fs').readFileSync;

      // Setup: directory exists with one file
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['TAB18.TXT']);

      // Mock readFileSync for baseline and file content
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('baseline.json')) {
          return JSON.stringify({ maxFailures: 10 });
        }
        return Buffer.from('OBJECT Table 18 Customer\r\n{\r\n}\r\n');
      });

      const { runCICheck } = require('../../../scripts/lexer-health');
      runCICheck();

      // Before the fix (issue #153), readdirSync was called twice:
      // 1. In runCICheck's validateDirectoryForReport() call
      // 2. In validateAllFiles()'s internal validateDirectoryForReport() call
      // After the fix, it should be called exactly once
      expect(mockReaddirSync).toHaveBeenCalledTimes(1);
    });
  });
});
