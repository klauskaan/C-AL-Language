/**
 * REGRESSION TESTS: Brace Depth Restoration After Backup (Issue #75)
 *
 * Bug: When parseProperty() encounters an unexpected closing brace (}),
 * it backs up with `this.current--` but fails to restore `this.braceDepth++`,
 * leaving it permanently off by 1. This corrupts section boundary detection
 * in skipUnsupportedSection().
 *
 * Location: parser.ts lines 405-410
 * Code:
 *   if (braceDepth < 0) {
 *     this.current--;  // ✅ Backs up token position
 *     braceDepth = 0;  // ❌ BUG: Only fixes LOCAL copy, not this.braceDepth
 *     break;
 *   }
 *
 * Impact: After a malformed property with unexpected }, this.braceDepth is -1
 * instead of 0. When skipUnsupportedSection() is called for CONTROLS or ACTIONS,
 * it compares this.braceDepth (corrupted -1) against sectionDepth (correct 1),
 * causing the comparison to never match and the parser to skip until EOF.
 *
 * These tests MUST FAIL before the fix is applied (TDD validation).
 * If they pass immediately, the bug diagnosis is wrong.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectKind } from '../ast';

describe('Parser - Brace Depth Restoration After Backup (Issue #75)', () => {
  describe('PRIMARY: braceDepth corruption symptom', () => {
    it('should parse CONTROLS section correctly after malformed property with unexpected brace', () => {
      // This is the PRIMARY test that demonstrates the bug
      // Expected: Test FAILS before fix (CONTROLS section is skipped incorrectly)
      // Expected: Test PASSES after fix (CONTROLS section is recognized)
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          ActionList=}
        }
        CONTROLS {
          { 1 ; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // After malformed property, parser should still recognize CONTROLS section
      // Bug symptom: skipUnsupportedSection() fails due to corrupted braceDepth
      // causing the CONTROLS section to be skipped to EOF instead of properly bounded
      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      // The parser should have errors about the malformed property
      // but should NOT have errors about "unexpected EOF" in CONTROLS
      const errors = parser.getErrors();
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );

      // If braceDepth is corrupted, skipUnsupportedSection() will consume
      // everything until EOF, likely causing unexpected EOF errors
      expect(unexpectedEOFErrors.length).toBe(0);
    });

    it('should parse ACTIONS section correctly after malformed property', () => {
      // Similar test but with ACTIONS instead of CONTROLS
      // Expected: Test FAILS before fix
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          CaptionML=}
        }
        ACTIONS {
          { 1 ; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      // Should not have unexpected EOF errors in ACTIONS section
      const errors = parser.getErrors();
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );
      expect(unexpectedEOFErrors.length).toBe(0);
    });
  });

  describe('EDGE CASE: Multiple malformed properties', () => {
    it('should not accumulate braceDepth errors from multiple malformed properties', () => {
      // Each malformed property corrupts braceDepth by -1
      // Expected: Test FAILS before fix (errors accumulate)
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          Prop1=}
          Prop2=}
          Prop3=}
        }
        CONTROLS {
          { 1 ; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // Even with 3 malformed properties, parser should recover
      expect(ast.object).toBeDefined();

      const errors = parser.getErrors();
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );

      // Should not skip CONTROLS to EOF
      expect(unexpectedEOFErrors.length).toBe(0);
    });
  });

  describe('EDGE CASE: Valid nested braces in property value', () => {
    it('should handle valid nested braces in property values correctly', () => {
      // This should work correctly even without the fix
      // because there's no backup scenario (no unexpected })
      // Included for completeness to ensure fix doesn't break valid cases
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          Permissions=TableData 18={rimd};
        }
        CONTROLS {
          { 1 ; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();
      expect(parser.getErrors()).toHaveLength(0);
    });

    it('should handle ACTIONS property with complex nested structure', () => {
      // ACTIONS in property value (not ACTIONS section)
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          ActionList=ACTIONS { { nested } };
        }
        CONTROLS {
          { 1 ; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();
    });
  });

  describe('EDGE CASE: Malformed property followed by CODE section', () => {
    it('should parse CODE section correctly after malformed property', () => {
      // CODE section uses different parsing than CONTROLS/ACTIONS
      // But braceDepth corruption still affects section detection
      // Expected: Test FAILS before fix
      const code = `OBJECT Table 50000 Test {
        PROPERTIES {
          BadProp=}
        }
        FIELDS {
          { 1 ; ; No ; Code20 }
        }
        CODE {
          PROCEDURE Test();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Table);

      // Should recognize CODE section properly
      const errors = parser.getErrors();
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );
      expect(unexpectedEOFErrors.length).toBe(0);
    });
  });

  describe('REGRESSION: Real-world pattern from NAV objects', () => {
    it('should parse page with malformed ActionList followed by CONTROLS', () => {
      // Realistic scenario: ActionList property syntax error
      // Expected: Test FAILS before fix
      const code = `OBJECT Page 50000 "Customer Card" {
        PROPERTIES {
          CaptionML=ENU=Customer Card;
          SourceTable=Table18;
          PageType=Card;
          ActionList=}
        }
        CONTROLS {
          { 1000000000; 0; Container; ContainerType=ContentArea }
          { 1000000001; 1; Group; GroupType=Group }
          { 1000000002; 2; Field; SourceExpr="No." }
        }
        CODE {
          VAR
            Customer@1000 : Record 18;

          PROCEDURE OnOpenPage();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Page);

      // Should parse CONTROLS and CODE sections
      // Bug would cause everything after the malformed property to be skipped
      const errors = parser.getErrors();

      // Note: Error reporting for malformed properties is a separate bug (deferred).
      // This test only verifies that braceDepth corruption doesn't cause section skipping.

      // Should NOT have errors about sections being truncated
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );
      expect(unexpectedEOFErrors.length).toBe(0);
    });

    it('should parse report with malformed property followed by DATAITEMS', () => {
      // DATAITEMS is also skipped via skipUnsupportedSection()
      // Expected: Test FAILS before fix
      const code = `OBJECT Report 50000 "Test Report" {
        PROPERTIES {
          CaptionML=ENU=Test;
          BadProp=}
        }
        DATAITEMS {
          { 1 ; }
        }
        CODE {
          PROCEDURE Test();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.Report);

      const errors = parser.getErrors();
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );
      expect(unexpectedEOFErrors.length).toBe(0);
    });

    it('should parse XMLport with malformed property followed by ELEMENTS', () => {
      // ELEMENTS is also handled by skipUnsupportedSection()
      // Expected: Test FAILS before fix
      const code = `OBJECT XMLport 50000 "Test XML" {
        PROPERTIES {
          Encoding=UTF-8;
          MalformedProp=}
        }
        ELEMENTS {
          { 1 ; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();
      expect(ast.object?.objectKind).toBe(ObjectKind.XMLport);

      const errors = parser.getErrors();
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );
      expect(unexpectedEOFErrors.length).toBe(0);
    });
  });

  describe('EDGE CASE: Malformed property in FIELDS section', () => {
    it('should handle field property with unexpected brace', () => {
      // Field properties also use parseProperty()
      // Same bug can occur in field-level properties
      // Expected: Test FAILS before fix
      const code = `OBJECT Table 50000 Test {
        FIELDS {
          { 1 ; ; TestField ; Code20 ;
            BadProp=}
          }
          { 2 ; ; NextField ; Text50 }
        }
        CODE {
          PROCEDURE Test();
          BEGIN
          END;
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();

      // Should parse both fields and CODE section
      const errors = parser.getErrors();
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );
      expect(unexpectedEOFErrors.length).toBe(0);
    });
  });

  describe('ERROR RECOVERY: Parser should collect errors but not crash', () => {
    it('should return valid AST even with malformed properties', () => {
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          Prop1=}
        }
        CONTROLS {
          { 1 ; }
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());

      // Parser should not throw exceptions
      let ast: any;
      expect(() => { ast = parser.parse(); }).not.toThrow();

      // AST should be valid even with errors
      expect(ast).toBeDefined();
      expect(ast.type).toBe('CALDocument');
      expect(ast.object).not.toBeNull();
    });

    // TODO: Error reporting for malformed properties is tracked separately (deferred issue).
    // Issue #75 is ONLY about braceDepth restoration, not error reporting.
    // Uncomment this test when error reporting is implemented:
    //
    // it('should report errors for malformed properties', () => {
    //   const code = `OBJECT Page 50000 Test {
    //     PROPERTIES {
    //       ActionList=}
    //     }
    //     CONTROLS {
    //       { 1 ; }
    //     }
    //   }`;
    //   const lexer = new Lexer(code);
    //   const parser = new Parser(lexer.tokenize());
    //   parser.parse();
    //
    //   const errors = parser.getErrors();
    //
    //   // Should have at least one error about the malformed property
    //   expect(errors.length).toBeGreaterThan(0);
    // });
  });

  describe('BOUNDARY: Empty property value with unexpected brace', () => {
    it('should handle property with only closing brace as value', () => {
      // Minimal reproduction: property = }
      // Expected: Test FAILS before fix
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          EmptyProp=}
        }
        CONTROLS {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();

      const errors = parser.getErrors();
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );
      expect(unexpectedEOFErrors.length).toBe(0);
    });

    it('should handle property with semicolon then unexpected brace', () => {
      const code = `OBJECT Page 50000 Test {
        PROPERTIES {
          Prop1=Value;
          Prop2=}
        }
        CONTROLS {
        }
      }`;
      const lexer = new Lexer(code);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      expect(ast.object).toBeDefined();

      const errors = parser.getErrors();
      const unexpectedEOFErrors = errors.filter(e =>
        e.message.toLowerCase().includes('unexpected') &&
        e.message.toLowerCase().includes('end')
      );
      expect(unexpectedEOFErrors.length).toBe(0);
    });
  });
});
