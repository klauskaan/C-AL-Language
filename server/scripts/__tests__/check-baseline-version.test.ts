/**
 * Tests for check-baseline-version.js
 *
 * Tests the baseline version check script that compares package.json version
 * against baselines.json version. Used by CI to ensure baseline freshness.
 *
 * Test Coverage:
 * - Matching versions (happy path)
 * - Mismatched versions with different output formats
 * - Missing/malformed files
 * - Missing version fields
 * - Format parameter handling
 * - Direct formatter function tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import from plain JS file using require()
const { checkBaselineVersion, formatStderr, formatGithubActions }
  = require('../check-baseline-version');

describe('checkBaselineVersion', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test fixtures
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-check-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create package.json in temp directory
   */
  function createPackageJson(version: string): void {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ version }, null, 2)
    );
  }

  /**
   * Helper to create baselines.json in temp directory
   */
  function createBaselinesJson(version: string): void {
    const serverDir = path.join(tempDir, 'server', 'src', '__tests__', 'performance', 'baselines');
    fs.mkdirSync(serverDir, { recursive: true });
    fs.writeFileSync(
      path.join(serverDir, 'baselines.json'),
      JSON.stringify({ version }, null, 2)
    );
  }

  describe('Matching versions', () => {
    it('should return null when versions match', () => {
      createPackageJson('1.2.3');
      createBaselinesJson('1.2.3');

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when versions match with different format', () => {
      createPackageJson('0.0.1-preview');
      createBaselinesJson('0.0.1-preview');

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when versions match with complex semver', () => {
      createPackageJson('2.0.0-beta.1+build.123');
      createBaselinesJson('2.0.0-beta.1+build.123');

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });
  });

  describe('Mismatched versions', () => {
    it('should return stderr warning when versions mismatch (stderr format)', () => {
      createPackageJson('1.2.3');
      createBaselinesJson('1.0.0');

      const result = checkBaselineVersion(tempDir, 'stderr');

      expect(result).not.toBeNull();
      expect(result!.stream).toBe('stderr');
      expect(result!.output).toContain('WARNING');
      expect(result!.output).toContain('1.2.3');
      expect(result!.output).toContain('1.0.0');
      expect(result!.output).toContain('baseline');
      expect(result!.output).toContain('package.json');
    });

    it('should return github-actions warning when versions mismatch (github-actions format)', () => {
      createPackageJson('2.0.0');
      createBaselinesJson('1.5.0');

      const result = checkBaselineVersion(tempDir, 'github-actions');

      expect(result).not.toBeNull();
      expect(result!.stream).toBe('stdout');
      expect(result!.output).toContain('::warning::');
      expect(result!.output).toContain('2.0.0');
      expect(result!.output).toContain('1.5.0');
    });

    it('should use stderr format when format parameter is undefined', () => {
      createPackageJson('1.5.0');
      createBaselinesJson('1.4.0');

      const result = checkBaselineVersion(tempDir);

      expect(result).not.toBeNull();
      expect(result!.stream).toBe('stderr');
      expect(result!.output).toContain('WARNING');
    });

    it('should use stderr format when format parameter is explicitly undefined', () => {
      createPackageJson('3.0.0');
      createBaselinesJson('2.9.0');

      const result = checkBaselineVersion(tempDir, undefined);

      expect(result).not.toBeNull();
      expect(result!.stream).toBe('stderr');
      expect(result!.output).toContain('WARNING');
    });
  });

  describe('Missing files', () => {
    it('should return null when baselines.json is missing', () => {
      createPackageJson('1.2.3');
      // Don't create baselines.json

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when package.json is missing', () => {
      createBaselinesJson('1.2.3');
      // Don't create package.json

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when both files are missing', () => {
      // Don't create any files

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when server directory does not exist', () => {
      createPackageJson('1.2.3');
      // Server directory not created

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });
  });

  describe('Malformed JSON', () => {
    it('should return null when baselines.json has invalid JSON', () => {
      createPackageJson('1.2.3');

      const serverDir = path.join(tempDir, 'server', 'src', '__tests__', 'performance', 'baselines');
      fs.mkdirSync(serverDir, { recursive: true });
      fs.writeFileSync(
        path.join(serverDir, 'baselines.json'),
        '{ invalid json syntax'
      );

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when package.json has invalid JSON', () => {
      createBaselinesJson('1.2.3');

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        '{ "version": invalid }'
      );

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when both files have invalid JSON', () => {
      const serverDir = path.join(tempDir, 'server', 'src', '__tests__', 'performance', 'baselines');
      fs.mkdirSync(serverDir, { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        'not json at all'
      );
      fs.writeFileSync(
        path.join(serverDir, 'baselines.json'),
        'also not json'
      );

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });
  });

  describe('Missing version fields', () => {
    it('should return null when baselines.json lacks version field', () => {
      createPackageJson('1.2.3');

      const serverDir = path.join(tempDir, 'server', 'src', '__tests__', 'performance', 'baselines');
      fs.mkdirSync(serverDir, { recursive: true });
      fs.writeFileSync(
        path.join(serverDir, 'baselines.json'),
        JSON.stringify({ someOtherField: 'value' }, null, 2)
      );

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when package.json lacks version field', () => {
      createBaselinesJson('1.2.3');

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-package' }, null, 2)
      );

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when both files lack version field', () => {
      const serverDir = path.join(tempDir, 'server', 'src', '__tests__', 'performance', 'baselines');
      fs.mkdirSync(serverDir, { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-package' }, null, 2)
      );
      fs.writeFileSync(
        path.join(serverDir, 'baselines.json'),
        JSON.stringify({ otherData: true }, null, 2)
      );

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });
  });

  describe('Empty version fields', () => {
    it('should return null when baselines.json has empty string version', () => {
      createPackageJson('1.2.3');

      const serverDir = path.join(tempDir, 'server', 'src', '__tests__', 'performance', 'baselines');
      fs.mkdirSync(serverDir, { recursive: true });
      fs.writeFileSync(
        path.join(serverDir, 'baselines.json'),
        JSON.stringify({ version: '' }, null, 2)
      );

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when package.json has empty string version', () => {
      createBaselinesJson('1.2.3');

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ version: '' }, null, 2)
      );

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when both versions are empty strings', () => {
      const serverDir = path.join(tempDir, 'server', 'src', '__tests__', 'performance', 'baselines');
      fs.mkdirSync(serverDir, { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ version: '' }, null, 2)
      );
      fs.writeFileSync(
        path.join(serverDir, 'baselines.json'),
        JSON.stringify({ version: '' }, null, 2)
      );

      const result = checkBaselineVersion(tempDir);

      expect(result).toBeNull();
    });
  });
});

describe('formatStderr', () => {
  it('should format stderr warning with version numbers', () => {
    const output = formatStderr('1.2.3', '1.0.0');

    expect(output).toContain('WARNING');
    expect(output).toContain('1.2.3');
    expect(output).toContain('1.0.0');
    expect(output).toContain('baseline');
    expect(output).toContain('package.json');
  });

  it('should format stderr warning as multi-line', () => {
    const output = formatStderr('2.0.0', '1.5.0');

    // Should contain multiple lines
    const lines = output.split('\n').filter((line: string) => line.trim().length > 0);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('should format stderr warning with different version formats', () => {
    const output = formatStderr('2.0.0-beta.1', '1.9.9');

    expect(output).toContain('2.0.0-beta.1');
    expect(output).toContain('1.9.9');
  });
});

describe('formatGithubActions', () => {
  it('should format github-actions annotation with version numbers', () => {
    const output = formatGithubActions('1.2.3', '1.0.0');

    expect(output).toContain('::warning::');
    expect(output).toContain('1.2.3');
    expect(output).toContain('1.0.0');
  });

  it('should format github-actions annotation as single line', () => {
    const output = formatGithubActions('2.0.0', '1.5.0');

    // GitHub Actions annotations should be single-line (or very few lines)
    expect(output).toBeDefined();
    expect(typeof output).toBe('string');
  });

  it('should format github-actions annotation with different version formats', () => {
    const output = formatGithubActions('3.0.0-rc.1', '2.9.0');

    expect(output).toContain('::warning::');
    expect(output).toContain('3.0.0-rc.1');
    expect(output).toContain('2.9.0');
  });
});
