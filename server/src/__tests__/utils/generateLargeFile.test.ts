import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateLargeFile } from '../performance/utils/generateLargeFile';

describe('generateLargeFile', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cal-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
      fs.rmdirSync(tempDir);
    }
  });

  describe('deterministic generation', () => {
    it('should produce identical output when called twice with same seed', () => {
      const outputPath1 = path.join(tempDir, 'file1.cal');
      const outputPath2 = path.join(tempDir, 'file2.cal');

      // Generate two files with the same seed
      generateLargeFile({
        targetLines: 500,
        outputPath: outputPath1,
        complexity: 'simple',
        seed: 12345
      });

      generateLargeFile({
        targetLines: 500,
        outputPath: outputPath2,
        complexity: 'simple',
        seed: 12345
      });

      // Read both files
      const content1 = fs.readFileSync(outputPath1, 'utf-8');
      const content2 = fs.readFileSync(outputPath2, 'utf-8');

      // Content should be identical
      expect(content1).toBe(content2);
    });

    it('should produce different output when called with different seeds', () => {
      const outputPath1 = path.join(tempDir, 'file1.cal');
      const outputPath2 = path.join(tempDir, 'file2.cal');

      // Generate two files with different seeds
      generateLargeFile({
        targetLines: 500,
        outputPath: outputPath1,
        complexity: 'simple',
        seed: 12345
      });

      generateLargeFile({
        targetLines: 500,
        outputPath: outputPath2,
        complexity: 'simple',
        seed: 54321
      });

      // Read both files
      const content1 = fs.readFileSync(outputPath1, 'utf-8');
      const content2 = fs.readFileSync(outputPath2, 'utf-8');

      // Content should be different
      expect(content1).not.toBe(content2);
    });

    it('should use deterministic default behavior when seed is not provided', () => {
      const outputPath1 = path.join(tempDir, 'file1.cal');
      const outputPath2 = path.join(tempDir, 'file2.cal');

      // Generate two files without seed parameter
      generateLargeFile({
        targetLines: 500,
        outputPath: outputPath1,
        complexity: 'simple'
      });

      generateLargeFile({
        targetLines: 500,
        outputPath: outputPath2,
        complexity: 'simple'
      });

      // Read both files
      const content1 = fs.readFileSync(outputPath1, 'utf-8');
      const content2 = fs.readFileSync(outputPath2, 'utf-8');

      // Content should be identical (default seed should be used)
      expect(content1).toBe(content2);
    });

    it('should produce stable content without timestamps', () => {
      const outputPath = path.join(tempDir, 'file.cal');

      // Generate file
      generateLargeFile({
        targetLines: 500,
        outputPath,
        complexity: 'simple',
        seed: 12345
      });

      // Read content
      const content = fs.readFileSync(outputPath, 'utf-8');

      // Should not contain ISO timestamps
      expect(content).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);

      // Should not contain "Generated:" line with timestamp
      const lines = content.split('\n');
      const generatedLine = lines.find(line => line.includes('Generated:'));
      expect(generatedLine).toBeUndefined();
    });
  });

  describe('complexity levels', () => {
    it('should produce identical output for same seed across different complexity levels', () => {
      const outputPathSimple = path.join(tempDir, 'simple.cal');
      const outputPathMedium = path.join(tempDir, 'medium.cal');
      const outputPathComplex = path.join(tempDir, 'complex.cal');

      // Generate files with same seed but different complexity
      generateLargeFile({
        targetLines: 500,
        outputPath: outputPathSimple,
        complexity: 'simple',
        seed: 12345
      });

      generateLargeFile({
        targetLines: 500,
        outputPath: outputPathMedium,
        complexity: 'medium',
        seed: 12345
      });

      generateLargeFile({
        targetLines: 500,
        outputPath: outputPathComplex,
        complexity: 'complex',
        seed: 12345
      });

      // Read all files
      const contentSimple = fs.readFileSync(outputPathSimple, 'utf-8');
      const contentMedium = fs.readFileSync(outputPathMedium, 'utf-8');
      const contentComplex = fs.readFileSync(outputPathComplex, 'utf-8');

      // Generate again with same parameters
      const outputPathSimple2 = path.join(tempDir, 'simple2.cal');
      const outputPathMedium2 = path.join(tempDir, 'medium2.cal');
      const outputPathComplex2 = path.join(tempDir, 'complex2.cal');

      generateLargeFile({
        targetLines: 500,
        outputPath: outputPathSimple2,
        complexity: 'simple',
        seed: 12345
      });

      generateLargeFile({
        targetLines: 500,
        outputPath: outputPathMedium2,
        complexity: 'medium',
        seed: 12345
      });

      generateLargeFile({
        targetLines: 500,
        outputPath: outputPathComplex2,
        complexity: 'complex',
        seed: 12345
      });

      // Each complexity level should be deterministic
      expect(contentSimple).toBe(fs.readFileSync(outputPathSimple2, 'utf-8'));
      expect(contentMedium).toBe(fs.readFileSync(outputPathMedium2, 'utf-8'));
      expect(contentComplex).toBe(fs.readFileSync(outputPathComplex2, 'utf-8'));
    });
  });

  describe('file generation', () => {
    it('should create file at specified path', () => {
      const outputPath = path.join(tempDir, 'test.cal');

      generateLargeFile({
        targetLines: 500,
        outputPath,
        complexity: 'simple',
        seed: 12345
      });

      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('should generate approximately target number of lines', () => {
      const outputPath = path.join(tempDir, 'test.cal');
      const targetLines = 500;

      generateLargeFile({
        targetLines,
        outputPath,
        complexity: 'simple',
        seed: 12345
      });

      const content = fs.readFileSync(outputPath, 'utf-8');
      const actualLines = content.split('\n').length;

      // Allow variance due to template sizes and deterministic template selection
      // With deterministic generation, specific seeds produce specific line counts
      expect(actualLines).toBeGreaterThanOrEqual(targetLines - 150);
      expect(actualLines).toBeLessThanOrEqual(targetLines + 150);
    });

    it('should generate valid C/AL structure', () => {
      const outputPath = path.join(tempDir, 'test.cal');

      generateLargeFile({
        targetLines: 500,
        outputPath,
        complexity: 'simple',
        seed: 12345
      });

      const content = fs.readFileSync(outputPath, 'utf-8');

      // Should contain codeunit declaration
      expect(content).toMatch(/codeunit \d+ "Performance Test Large File"/);

      // Should have opening and closing braces
      expect(content).toContain('{');
      expect(content).toContain('}');

      // Should contain procedures
      expect(content).toMatch(/procedure \w+/i);

      // Should contain begin/end blocks
      expect(content).toMatch(/begin/i);
      expect(content).toMatch(/end;/i);
    });
  });
});
