/**
 * LSP Smoke Test
 *
 * Purpose: Verify that the language server components load correctly and work together
 * without errors. This is a basic sanity check, not comprehensive integration testing.
 *
 * What we test:
 * - Server module loads without errors
 * - Semantic token provider works end-to-end
 * - Basic LSP functionality is operational
 *
 * What we DON'T test (by design):
 * - Full LSP protocol handshake with real connections
 * - Client-server communication over IPC
 * - Diagnostics publishing
 * - Document synchronization
 * - Performance characteristics
 */

import { SemanticTokensBuilder } from 'vscode-languageserver';
import { Lexer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { SemanticTokensProvider, getSemanticTokensLegend } from '../semantic/semanticTokens';

describe('LSP Smoke Test', () => {

  describe('Module Loading', () => {
    it('should attempt to load server module (expects connection error in test env)', async () => {
      // The server module tries to create a connection when imported
      // In a test environment without IPC/stdio, this will throw a specific error
      // This is expected behavior - the module itself is valid, just can't connect
      try {
        await import('../server');
        // If it doesn't throw, that's also fine (maybe mocked elsewhere)
      } catch (error: any) {
        // Verify it's the expected connection error, not a syntax/import error
        expect(error.message).toContain('Connection input stream is not set');
      }
    });

    it('should import semantic tokens provider without errors', async () => {
      // Verify semantic tokens provider can be instantiated
      await expect(async () => {
        const { SemanticTokensProvider } = await import('../semantic/semanticTokens');
        new SemanticTokensProvider();
      }).resolves.not.toThrow();
    });

    it('should import lexer and parser modules without errors', async () => {
      // Verify core parsing modules are accessible
      await expect(async () => {
        const { Lexer } = await import('../lexer/lexer');
        const { Parser } = await import('../parser/parser');
        new Lexer('test');
        new Parser([]);
      }).resolves.not.toThrow();
    });
  });

  describe('Semantic Tokens Legend', () => {
    it('should provide semantic tokens legend with correct structure', () => {
      const legend = getSemanticTokensLegend();

      // Verify legend has required properties
      expect(legend).toHaveProperty('tokenTypes');
      expect(legend).toHaveProperty('tokenModifiers');

      // Verify properties are arrays
      expect(Array.isArray(legend.tokenTypes)).toBe(true);
      expect(Array.isArray(legend.tokenModifiers)).toBe(true);

      // Verify arrays are not empty
      expect(legend.tokenTypes.length).toBeGreaterThan(0);
      expect(legend.tokenModifiers.length).toBeGreaterThan(0);
    });

    it('should include essential token types', () => {
      const legend = getSemanticTokensLegend();

      // Verify key token types exist
      expect(legend.tokenTypes).toContain('keyword');
      expect(legend.tokenTypes).toContain('variable');
      expect(legend.tokenTypes).toContain('string');
      expect(legend.tokenTypes).toContain('number');
      expect(legend.tokenTypes).toContain('comment');
    });

    it('should include token modifiers', () => {
      const legend = getSemanticTokensLegend();

      // Verify at least some modifiers exist
      expect(legend.tokenModifiers).toContain('declaration');
      expect(legend.tokenModifiers).toContain('definition');
    });
  });

  describe('End-to-End Semantic Tokens Generation', () => {
    it('should generate semantic tokens for a simple C/AL table', () => {
      // Sample C/AL code with key language features
      const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
    DataCaptionFields="No.",Name;
  }
  FIELDS
  {
    { 1 ; ; "Line No." ; Code20 }
    { 2 ; ; Name ; Text100 }
  }
}`;

      // Lex and parse the code
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Generate semantic tokens
      const provider = new SemanticTokensProvider();
      const builder = new SemanticTokensBuilder();

      // Should not throw
      expect(() => {
        provider.buildSemanticTokens(tokens, ast, builder);
      }).not.toThrow();

      // Build and verify result
      const result = builder.build();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should generate semantic tokens for code with quoted identifiers', () => {
      // This is the key feature - quoted identifiers should be tokenized
      const code = `"Line No." := "Sales Order";`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const provider = new SemanticTokensProvider();
      const builder = new SemanticTokensBuilder();
      provider.buildSemanticTokens(tokens, ast, builder);
      const result = builder.build();

      // Should generate tokens
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should generate semantic tokens for code with comments', () => {
      const code = `
        // Line comment
        BEGIN
          /* Block comment */
          Name := 'Test';
        END;
      `;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const provider = new SemanticTokensProvider();
      const builder = new SemanticTokensBuilder();
      provider.buildSemanticTokens(tokens, ast, builder);
      const result = builder.build();

      // Should generate tokens including comments
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should generate semantic tokens for a complete codeunit', () => {
      const code = `OBJECT Codeunit 50000 "My Codeunit"
{
  OBJECT-PROPERTIES
  {
    Date=01/01/25;
    Time=12:00:00;
  }
  PROPERTIES
  {
    OnRun=BEGIN
            Message('Hello World');
          END;
  }
  CODE
  {
    PROCEDURE TestProc@1(Param@1000 : Integer);
    VAR
      LocalVar@1001 : Text[100];
    BEGIN
      LocalVar := 'Test Value';
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const provider = new SemanticTokensProvider();
      const builder = new SemanticTokensBuilder();
      provider.buildSemanticTokens(tokens, ast, builder);
      const result = builder.build();

      // Should handle complex code structure
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid syntax gracefully without throwing', () => {
      const invalidCode = `OBJECT Table Invalid {{{{{ Broken Syntax`;

      expect(() => {
        const lexer = new Lexer(invalidCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        const provider = new SemanticTokensProvider();
        const builder = new SemanticTokensBuilder();
        provider.buildSemanticTokens(tokens, ast, builder);
        builder.build();
      }).not.toThrow();
    });

    it('should handle empty code gracefully', () => {
      const emptyCode = '';

      expect(() => {
        const lexer = new Lexer(emptyCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        const provider = new SemanticTokensProvider();
        const builder = new SemanticTokensBuilder();
        provider.buildSemanticTokens(tokens, ast, builder);
        const result = builder.build();

        // Should return valid but empty result
        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
      }).not.toThrow();
    });

    it('should handle incomplete object declarations', () => {
      const incompleteCode = `OBJECT Table 18`;

      expect(() => {
        const lexer = new Lexer(incompleteCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        const provider = new SemanticTokensProvider();
        const builder = new SemanticTokensBuilder();
        provider.buildSemanticTokens(tokens, ast, builder);
        builder.build();
      }).not.toThrow();
    });

    it('should handle malformed field definitions', () => {
      const malformedCode = `
        OBJECT Table 18 Customer
        {
          FIELDS
          {
            { broken field definition }
            { 1 ; ; "Line No." }  // Missing type
          }
        }
      `;

      expect(() => {
        const lexer = new Lexer(malformedCode);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        const provider = new SemanticTokensProvider();
        const builder = new SemanticTokensBuilder();
        provider.buildSemanticTokens(tokens, ast, builder);
        builder.build();
      }).not.toThrow();
    });
  });

  describe('Integration Sanity Check', () => {
    it('should complete full parse-to-tokens pipeline in reasonable time', () => {
      // Generate a moderately sized C/AL file (simulating real-world usage)
      const fields = [];
      for (let i = 1; i <= 50; i++) {
        fields.push(`    { ${i} ; ; "Field ${i}" ; Text50 }`);
      }

      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
${fields.join('\n')}
  }
}`;

      const startTime = Date.now();

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const provider = new SemanticTokensProvider();
      const builder = new SemanticTokensBuilder();
      provider.buildSemanticTokens(tokens, ast, builder);
      const result = builder.build();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (under 100ms for 50 fields)
      expect(duration).toBeLessThan(100);

      // Should produce tokens
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should provide consistent results for identical inputs', () => {
      const code = `OBJECT Table 18 Customer { }`;

      // Parse twice
      const lexer1 = new Lexer(code);
      const tokens1 = lexer1.tokenize();
      const parser1 = new Parser(tokens1);
      const ast1 = parser1.parse();
      const provider1 = new SemanticTokensProvider();
      const builder1 = new SemanticTokensBuilder();
      provider1.buildSemanticTokens(tokens1, ast1, builder1);
      const result1 = builder1.build();

      const lexer2 = new Lexer(code);
      const tokens2 = lexer2.tokenize();
      const parser2 = new Parser(tokens2);
      const ast2 = parser2.parse();
      const provider2 = new SemanticTokensProvider();
      const builder2 = new SemanticTokensBuilder();
      provider2.buildSemanticTokens(tokens2, ast2, builder2);
      const result2 = builder2.build();

      // Results should be identical
      expect(result1.data).toEqual(result2.data);
    });
  });
});
