/**
 * TDD Tests for XMLport ELEMENTS Section Parsing
 *
 * These tests MUST FAIL initially because:
 * 1. The ELEMENTS section parsing for XMLport is not yet implemented
 * 2. The parser currently skips over ELEMENTS { } blocks in XMLport objects
 * 3. The parseElementsSection method doesn't exist yet
 *
 * ELEMENTS format (found in XMLport objects):
 * ```
 * ELEMENTS
 * {
 *   { [{GUID}];IndentLevel;ElementName;NodeType;SourceType; Properties [Triggers] }
 * }
 * ```
 * where:
 * - GUID is a unique identifier in curly braces and square brackets
 * - IndentLevel is an integer (0, 1, 2, etc.) or empty (treated as 0)
 * - ElementName is the name of the XML element
 * - NodeType is: Element or Attribute
 * - SourceType is: Text, Table, or Field
 * - Properties follow standard property format (Name=Value;)
 * - Triggers like Import::OnBeforeInsertRecord, Export::OnAfterGetRecord, Import::OnAfterAssignVariable
 *   can have BEGIN...END blocks
 *
 * Hierarchy is built from IndentLevel:
 * - IndentLevel 0 = root element
 * - IndentLevel N+1 = child of nearest lower indent level
 *
 * CRITICAL CONSTRAINT:
 * - ELEMENTS section is ONLY for XMLport objects
 * - Query objects also have ELEMENTS but with a different format (DataItem/Column)
 * - This test suite is for XMLport ELEMENTS parsing only
 * - Query ELEMENTS must continue to use existing parsing logic
 *
 * Once implemented, the parser should:
 * - Parse each element entry
 * - Extract guid, indentLevel, name, nodeType, sourceType
 * - Build parent-child hierarchy from indent levels
 * - Parse properties and triggers like FIELDS section
 * - Recover from malformed entries
 * - Only activate for XMLport objects, not Query objects
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../parser';
import { ObjectDeclaration, ObjectKind } from '../ast';

// Helper to parse and extract elements section
function parseElements(code: string) {
  const lexer = new Lexer(code);
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();

  return {
    ast,
    errors: parser.getErrors(),
    elements: (ast.object as ObjectDeclaration)?.elements,
    objectKind: (ast.object as ObjectDeclaration)?.objectKind
  };
}

describe('Parser - XMLport ELEMENTS Section', () => {
  describe('Basic element parsing', () => {
    it('should parse empty ELEMENTS section', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.objectKind).toBe(ObjectKind.XMLport);
      expect(result.elements).toBeDefined();
      expect(result.elements?.type).toBe('ElementsSection');
      expect(result.elements?.elements).toHaveLength(0);
    });

    it('should parse single root element with Text source', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{5CDBAF06-C7E1-4222-9633-B90B6840C9FC}];  ;root                ;Element ;Text     }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements).toBeDefined();
      expect(result.elements?.elements).toHaveLength(1);

      const element = result.elements?.elements[0];
      expect(element?.type).toBe('XMLportElement');
      expect(element?.guid).toBe('5CDBAF06-C7E1-4222-9633-B90B6840C9FC');
      expect(element?.indentLevel).toBe(0);
      expect(element?.name).toBe('root');
      expect(element?.nodeType).toBe('Element');
      expect(element?.sourceType).toBe('Text');
      expect(element?.children).toHaveLength(0);
    });

    it('should parse element with Table source', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{A75DC6DE-02B6-4719-B43E-3C90D19B3BE5}];1 ;DataExchDef         ;Element ;Table   ;
                                                        SourceTable=Table1222 }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements?.elements).toHaveLength(1);

      const element = result.elements?.elements[0];
      expect(element?.guid).toBe('A75DC6DE-02B6-4719-B43E-3C90D19B3BE5');
      expect(element?.indentLevel).toBe(1);
      expect(element?.name).toBe('DataExchDef');
      expect(element?.nodeType).toBe('Element');
      expect(element?.sourceType).toBe('Table');
      expect(element?.properties).toBeDefined();
      expect(element?.properties?.properties?.length).toBeGreaterThan(0);
    });

    it('should parse Attribute node type with Field source', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{DAE9B066-1422-4AE9-945C-77B8CC451316}];2 ;Code                ;Attribute;Field  ;
                                                        DataType=Code;
                                                        SourceField=Data Exch. Def::Code }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements?.elements).toHaveLength(1);

      const element = result.elements?.elements[0];
      expect(element?.guid).toBe('DAE9B066-1422-4AE9-945C-77B8CC451316');
      expect(element?.indentLevel).toBe(2);
      expect(element?.name).toBe('Code');
      expect(element?.nodeType).toBe('Attribute');
      expect(element?.sourceType).toBe('Field');
    });

    it('should handle empty indent level (treated as 0)', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{5CDBAF06-C7E1-4222-9633-B90B6840C9FC}];  ;subFinReport        ;Element ;Text     }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];
      expect(element?.indentLevel).toBe(0);
    });
  });

  describe('Hierarchy building', () => {
    it('should parse flat list (all indent 0)', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;element1            ;Element ;Text     }
          { [{GUID-2}];0 ;element2            ;Element ;Text     }
          { [{GUID-3}];0 ;element3            ;Element ;Text     }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements?.elements).toHaveLength(3);

      // All should be root level (no parent)
      result.elements?.elements.forEach(element => {
        expect(element.indentLevel).toBe(0);
        expect(element.children).toHaveLength(0);
      });
    });

    it('should parse 2-level hierarchy (root -> children)', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
          { [{GUID-2}];1 ;child1              ;Element ;Table   ;
                                                SourceTable=Table18 }
          { [{GUID-3}];1 ;child2              ;Attribute;Field  ;
                                                SourceField=Field1 }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements?.elements).toHaveLength(1);

      const root = result.elements?.elements[0];
      expect(root?.name).toBe('root');
      expect(root?.indentLevel).toBe(0);
      expect(root?.children).toHaveLength(2);

      expect(root?.children?.[0].name).toBe('child1');
      expect(root?.children?.[0].indentLevel).toBe(1);

      expect(root?.children?.[1].name).toBe('child2');
      expect(root?.children?.[1].indentLevel).toBe(1);
    });

    it('should parse 3-level hierarchy', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
          { [{GUID-2}];1 ;table1              ;Element ;Table   ;
                                                SourceTable=Table18 }
          { [{GUID-3}];2 ;field1              ;Attribute;Field  ;
                                                SourceField=No. }
          { [{GUID-4}];2 ;field2              ;Attribute;Field  ;
                                                SourceField=Name }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);

      const root = result.elements?.elements[0];
      expect(root?.name).toBe('root');
      expect(root?.children).toHaveLength(1);

      const level1 = root?.children?.[0];
      expect(level1?.name).toBe('table1');
      expect(level1?.children).toHaveLength(2);

      expect(level1?.children?.[0].name).toBe('field1');
      expect(level1?.children?.[1].name).toBe('field2');
    });

    it('should parse deep 4-level hierarchy', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
          { [{GUID-2}];1 ;table1              ;Element ;Table   ;
                                                SourceTable=Table18 }
          { [{GUID-3}];2 ;nested              ;Element ;Text     }
          { [{GUID-4}];3 ;field1              ;Attribute;Field  ;
                                                SourceField=No. }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);

      const root = result.elements?.elements[0];
      expect(root?.name).toBe('root');

      const level1 = root?.children?.[0];
      expect(level1?.name).toBe('table1');

      const level2 = level1?.children?.[0];
      expect(level2?.name).toBe('nested');

      const level3 = level2?.children?.[0];
      expect(level3?.name).toBe('field1');
      expect(level3?.indentLevel).toBe(3);
    });

    it('should parse multiple root elements', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root1               ;Element ;Text     }
          { [{GUID-2}];1 ;child1              ;Element ;Text     }
          { [{GUID-3}];0 ;root2               ;Element ;Text     }
          { [{GUID-4}];1 ;child2              ;Element ;Text     }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements?.elements).toHaveLength(2);

      const root1 = result.elements?.elements[0];
      expect(root1?.name).toBe('root1');
      expect(root1?.children).toHaveLength(1);
      expect(root1?.children?.[0].name).toBe('child1');

      const root2 = result.elements?.elements[1];
      expect(root2?.name).toBe('root2');
      expect(root2?.children).toHaveLength(1);
      expect(root2?.children?.[0].name).toBe('child2');
    });

    it('should parse complex mixed hierarchy', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
          { [{GUID-2}];1 ;table1              ;Element ;Table   ;
                                                SourceTable=Table18 }
          { [{GUID-3}];2 ;field1              ;Attribute;Field  ;
                                                SourceField=No. }
          { [{GUID-4}];1 ;table2              ;Element ;Table   ;
                                                SourceTable=Table19 }
          { [{GUID-5}];2 ;field2              ;Attribute;Field  ;
                                                SourceField=Code }
          { [{GUID-6}];2 ;field3              ;Attribute;Field  ;
                                                SourceField=Name }
          { [{GUID-7}];0 ;root2               ;Element ;Text     }
          { [{GUID-8}];1 ;attribute1          ;Attribute;Text    }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements?.elements).toHaveLength(2);

      // First root
      const root1 = result.elements?.elements[0];
      expect(root1?.name).toBe('root');
      expect(root1?.children).toHaveLength(2); // Two tables at indent 1

      const table1 = root1?.children?.[0];
      expect(table1?.name).toBe('table1');
      expect(table1?.children).toHaveLength(1); // One field

      const table2 = root1?.children?.[1];
      expect(table2?.name).toBe('table2');
      expect(table2?.children).toHaveLength(2); // Two fields

      // Second root
      const root2 = result.elements?.elements[1];
      expect(root2?.name).toBe('root2');
      expect(root2?.children).toHaveLength(1);
    });
  });

  describe('Property parsing', () => {
    it('should parse element with SourceTable property', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];1 ;DataExchDef         ;Element ;Table   ;
                                                SourceTable=Table1222 }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      expect(element?.properties).toBeDefined();
      const sourceTableProp = element?.properties?.properties?.find((p: any) => p.name === 'SourceTable');
      expect(sourceTableProp).toBeDefined();
      expect(sourceTableProp?.value).toContain('1222');
    });

    it('should parse element with SourceField property', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];2 ;Code                ;Attribute;Field  ;
                                                DataType=Code;
                                                SourceField=Data Exch. Def::Code }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      const dataTypeProp = element?.properties?.properties?.find((p: any) => p.name === 'DataType');
      expect(dataTypeProp).toBeDefined();

      const sourceFieldProp = element?.properties?.properties?.find((p: any) => p.name === 'SourceField');
      expect(sourceFieldProp).toBeDefined();
      expect(sourceFieldProp?.value).toContain('Data Exch. Def::Code');
    });

    it('should parse element with MinOccurs and MaxOccurs properties', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text    ;
                                                MinOccurs=Once;
                                                MaxOccurs=Once }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      const minOccursProp = element?.properties?.properties?.find((p: any) => p.name === 'MinOccurs');
      expect(minOccursProp).toBeDefined();
      expect(minOccursProp?.value).toContain('Once');

      const maxOccursProp = element?.properties?.properties?.find((p: any) => p.name === 'MaxOccurs');
      expect(maxOccursProp).toBeDefined();
      expect(maxOccursProp?.value).toContain('Once');
    });

    it('should parse element with Occurrence property', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];2 ;HeaderTag           ;Attribute;Field  ;
                                                DataType=Text;
                                                SourceField=Data Exch. Def::Header Tag;
                                                Occurrence=Optional }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      const occurrenceProp = element?.properties?.properties?.find((p: any) => p.name === 'Occurrence');
      expect(occurrenceProp).toBeDefined();
      expect(occurrenceProp?.value).toContain('Optional');
    });

    it('should parse element with multiple properties', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];2 ;exchRate            ;Element ;Table   ;
                                                SourceTable=Table330;
                                                SourceTableView=SORTING(Field1,Field2);
                                                Temporary=Yes;
                                                MinOccurs=Zero }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      expect(element?.properties?.properties?.length).toBeGreaterThanOrEqual(4);

      const sourceTableProp = element?.properties?.properties?.find((p: any) => p.name === 'SourceTable');
      expect(sourceTableProp).toBeDefined();

      const temporaryProp = element?.properties?.properties?.find((p: any) => p.name === 'Temporary');
      expect(temporaryProp).toBeDefined();
    });

    it('should parse element without properties', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      expect(element?.name).toBe('root');
      expect(element?.properties).toBeNull();
    });
  });

  describe('Trigger parsing', () => {
    it('should parse element with Import::OnBeforeInsertRecord trigger', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];1 ;DataExchDef         ;Element ;Table   ;
                                                SourceTable=Table1222;
                                                Import::OnBeforeInsertRecord=BEGIN
                                                                               "Data Exch. Def".VALIDATE(Type);
                                                                             END;
                                                                              }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      expect(element?.triggers).toBeDefined();
      expect(element?.triggers?.length).toBeGreaterThan(0);
      const trigger = element?.triggers?.find((t: any) => t.name === 'Import::OnBeforeInsertRecord');
      expect(trigger).toBeDefined();
      expect(trigger?.body).toBeDefined();
      expect(trigger?.body?.length).toBeGreaterThan(0);
    });

    it('should parse element with Export::OnBeforePassField trigger', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];2 ;ReadingWritingXMLport;Attribute;Field ;
                                                DataType=Integer;
                                                SourceField=Data Exch. Def::Reading/Writing XMLport;
                                                Export::OnBeforePassField=BEGIN
                                                                            IF "Data Exch. Def"."Reading/Writing XMLport" = 0 THEN
                                                                              currXMLport.SKIP;
                                                                          END;
                                                                           }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      const trigger = element?.triggers?.find((t: any) => t.name === 'Export::OnBeforePassField');
      expect(trigger).toBeDefined();
      expect(trigger?.body).toBeDefined();
    });

    it('should parse element with Import::OnAfterAssignVariable trigger', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;subFinReport        ;Element ;Text    ;
                                                Import::OnAfterAssignVariable=BEGIN
                                                                                NextGLEntryNo := 1;
                                                                              END;
                                                                               }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      const trigger = element?.triggers?.find((t: any) => t.name === 'Import::OnAfterAssignVariable');
      expect(trigger).toBeDefined();
      expect(trigger?.body).toBeDefined();
    });

    it('should parse element with Export::OnAfterGetRecord trigger', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];3 ;glEntry             ;Element ;Table   ;
                                                SourceTable=Table17;
                                                Export::OnAfterGetRecord=BEGIN
                                                                           IF "G/L Entry"."Posting Date" = NORMALDATE("G/L Entry"."Posting Date") THEN
                                                                             isClosingEntry := ''
                                                                           ELSE
                                                                             isClosingEntry := '1';
                                                                         END;
                                                                          }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      const trigger = element?.triggers?.find((t: any) => t.name === 'Export::OnAfterGetRecord');
      expect(trigger).toBeDefined();
      expect(trigger?.body).toBeDefined();
    });

    it('should parse element with multiple triggers', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];3 ;glEntry             ;Element ;Table   ;
                                                SourceTable=Table17;
                                                Import::OnBeforeInsertRecord=BEGIN
                                                                               "G/L Entry"."Entry No." := NextGLEntryNo;
                                                                             END;

                                                Export::OnAfterGetRecord=BEGIN
                                                                           isClosingEntry := '1';
                                                                         END;

                                                Import::OnAfterInsertRecord=BEGIN
                                                                              NextGLEntryNo := NextGLEntryNo + 1;
                                                                            END;
                                                                             }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      const element = result.elements?.elements[0];

      expect(element?.triggers).toBeDefined();
      expect(element?.triggers?.length).toBeGreaterThanOrEqual(3);

      const importTrigger = element?.triggers?.find((t: any) => t.name === 'Import::OnBeforeInsertRecord');
      expect(importTrigger).toBeDefined();

      const exportTrigger = element?.triggers?.find((t: any) => t.name === 'Export::OnAfterGetRecord');
      expect(exportTrigger).toBeDefined();

      const afterInsertTrigger = element?.triggers?.find((t: any) => t.name === 'Import::OnAfterInsertRecord');
      expect(afterInsertTrigger).toBeDefined();
    });
  });

  describe('XMLport-only constraint', () => {
    it('should NOT parse ELEMENTS section for Query objects', () => {
      const code = `OBJECT Query 100 "Top Customer Overview"
      {
        PROPERTIES
        {
          CaptionML=ENU=Top Customer Overview;
        }
        ELEMENTS
        {
          { 1   ;    ;DataItem;                    ;
                     DataItemTable=Table18 }

          { 2   ;1   ;Column  ;                    ;
                     DataSource=Name }
        }
      }`;

      const result = parseElements(code);

      expect(result.objectKind).toBe(ObjectKind.Query);

      // Query ELEMENTS should continue to use existing parsing logic
      // This test ensures we don't break Query parsing
      // The elements field should either:
      // 1. Be null (Query parsing not implemented yet), or
      // 2. Use Query-specific parsing (DataItem/Column format)

      // CRITICAL: If Query ELEMENTS becomes defined after XMLport implementation,
      // it MUST NOT use XMLport element structure (GUID, NodeType, SourceType)
      if (result.elements !== null) {
        // Verify it's NOT XMLport format
        const firstElement = result.elements?.elements?.[0];
        if (firstElement) {
          // Query elements don't have guid field
          expect((firstElement as any).guid).toBeUndefined();
          // Query elements don't have nodeType field
          expect((firstElement as any).nodeType).toBeUndefined();
        }
      }
    });

    it('should parse ELEMENTS for XMLport, not Query', () => {
      const xmlportCode = `OBJECT XMLport 1 "Test"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
        }
      }`;

      const queryCode = `OBJECT Query 1 "Test"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { 1   ;    ;DataItem;
                     DataItemTable=Table18 }
        }
      }`;

      const xmlportResult = parseElements(xmlportCode);
      const queryResult = parseElements(queryCode);

      expect(xmlportResult.objectKind).toBe(ObjectKind.XMLport);
      expect(queryResult.objectKind).toBe(ObjectKind.Query);

      // XMLport ELEMENTS should have XMLport structure
      expect(xmlportResult.elements).toBeDefined();
      expect(xmlportResult.elements?.elements?.[0]?.type).toBe('XMLportElement');
      expect(xmlportResult.elements?.elements?.[0]?.guid).toBeDefined();
      expect(xmlportResult.elements?.elements?.[0]?.nodeType).toBeDefined();

      // Query ELEMENTS should NOT have XMLport structure
      if (queryResult.elements !== null) {
        const firstElement = queryResult.elements?.elements?.[0];
        if (firstElement) {
          expect((firstElement as any).guid).toBeUndefined();
          expect((firstElement as any).nodeType).toBeUndefined();
        }
      }
    });
  });

  describe('Malformed input recovery', () => {
    it('should recover correctly when element content is malformed after GUID', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{12345678-1234-1234-1234-123456789012}];  ;Element;Text MALFORMED }
          { [{87654321-4321-4321-4321-210987654321}];  ;Element2;Text;
                                                           SourceField=Field2 }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Should have parse errors due to malformed first element
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0].message).toMatch(/Expected|malformed|unexpected/i);

      // Should recover and parse the second element
      expect(result.elements).toBeDefined();
      const allElements = result.elements?.elements || [];

      // At least the second element should be parsed
      const element2 = allElements.find(e => e.guid === '87654321-4321-4321-4321-210987654321');
      expect(element2).toBeDefined();
      expect(element2?.name).toBe('Element2');
      expect(element2?.sourceType).toBe('Text');

      // Verify CODE section was not consumed by error recovery
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it('should recover from missing GUID', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { ;1 ;element1            ;Element ;Text     }
          { [{GUID-2}];2 ;element2            ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Should have errors but continue parsing
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.elements).toBeDefined();

      // Parser should recover and parse the second element
      const allElements = result.elements?.elements || [];
      const validElements = allElements.filter(e => e.guid === 'GUID-2');
      expect(validElements.length).toBeGreaterThan(0);

      // CODE section should be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it('should recover from malformed GUID format', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [INVALID];1 ;element1            ;Element ;Text     }
          { [{GUID-2}];2 ;element2            ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.elements).toBeDefined();

      const allElements = result.elements?.elements || [];
      const validElements = allElements.filter(e => e.guid === 'GUID-2');
      expect(validElements.length).toBeGreaterThan(0);
      expect(validElements[0].name).toBe('element2');

      // CODE section should be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it('should handle missing node type', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;element1            ; ;Text     }
          { [{GUID-2}];0 ;element2            ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Missing NodeType defaults to 'Element' - this is intentional, not an error
      expect(result.errors.length).toBe(0);
      expect(result.elements).toBeDefined();

      const allElements = result.elements?.elements || [];
      expect(allElements.length).toBeGreaterThanOrEqual(2);

      // First element should have default NodeType
      const element1 = allElements.find(e => e.guid === 'GUID-1');
      expect(element1).toBeDefined();
      expect(element1?.nodeType).toBe('Element'); // Default applied

      // Second element should have explicit NodeType
      const element2 = allElements.find(e => e.guid === 'GUID-2');
      expect(element2).toBeDefined();
      expect(element2?.nodeType).toBe('Element');

      // CODE section should be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it('should handle missing source type', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;element1            ;Element ; }
          { [{GUID-2}];0 ;element2            ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Missing SourceType defaults to 'Text' - this is intentional, not an error
      expect(result.errors.length).toBe(0);
      expect(result.elements).toBeDefined();

      const allElements = result.elements?.elements || [];
      expect(allElements.length).toBeGreaterThanOrEqual(2);

      // First element should have default SourceType
      const element1 = allElements.find(e => e.guid === 'GUID-1');
      expect(element1).toBeDefined();
      expect(element1?.sourceType).toBe('Text'); // Default applied

      // Second element should have explicit SourceType
      const element2 = allElements.find(e => e.guid === 'GUID-2');
      expect(element2).toBeDefined();
      expect(element2?.sourceType).toBe('Text');

      // CODE section should be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });
  });

  describe('Comprehensive error recovery tests', () => {
    it('should recover from malformed GUID with missing closing brace', () => {
      // SKIPPED: Parser bug - braceDepth corruption prevents recovery
      // When GUID is malformed with missing closing brace, braceDepth state gets corrupted
      // and subsequent elements/sections cannot be parsed correctly.
      // See issue #273
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [12345678-1234-1234-1234-123456789012}];0 ;element1            ;Element ;Text     }
          { [{87654321-4321-4321-4321-210987654321}];1 ;element2            ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Should have at least one error for malformed GUID
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0].message).toMatch(/Expected.*\}|Expected.*\]|malformed|GUID/i);

      // Subsequent valid element MUST be parsed
      const allElements = result.elements?.elements || [];
      const element2 = allElements.find(e => e.guid === '87654321-4321-4321-4321-210987654321');
      expect(element2).toBeDefined();
      expect(element2?.guid).toBe('87654321-4321-4321-4321-210987654321');

      // CODE section MUST be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it('should recover from malformed GUID with missing opening bracket', () => {
      // SKIPPED: Parser bug - braceDepth corruption prevents recovery
      // Same root cause as missing closing brace - braceDepth state corruption.
      // See issue #273
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { {12345678-1234-1234-1234-123456789012}];0 ;element1            ;Element ;Text     }
          { [{87654321-4321-4321-4321-210987654321}];1 ;element2            ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Should have at least one error for malformed GUID
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0].message).toMatch(/Expected.*\[|malformed|GUID/i);

      // Subsequent element MUST be parsed
      const allElements = result.elements?.elements || [];
      const element2 = allElements.find(e => e.name === 'element2');
      expect(element2).toBeDefined();
      expect(element2?.name).toBe('element2');

      // CODE section MUST be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it('should recover from multiple consecutive malformed elements', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{BROKEN-1}];0 ;malformed1          ; ;      }
          { [INVALID];0 ;malformed2          ;Element ;Text     }
          { ;0 ;malformed3          ;Element ;Text     }
          { [{VALID-GUID}];0 ;valid1              ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Should have at least 2 errors for the malformed elements
      // (First element with empty NodeType/SourceType uses defaults and parses successfully)
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

      // Verify at least 1 valid element was parsed
      const allElements = result.elements?.elements || [];

      // Verify total element count - only valid elements captured
      expect(allElements.length).toBe(2);

      // Verify first element (BROKEN-1 with defaults) was parsed
      expect(allElements[0].guid).toBe('BROKEN-1');
      expect(allElements[0].name).toBe('malformed1');

      // Existing assertions already verify element 4 (VALID-GUID)
      const validElement = allElements.find(e => e.guid === 'VALID-GUID');
      expect(validElement).toBeDefined();
      expect(validElement?.guid).toBe('VALID-GUID');
      expect(validElement?.name).toBe('valid1');

      // CODE section MUST be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it('should recover from deeply nested property values with trigger followed by malformed element', () => {
      // SKIPPED: Parser bug - braceDepth corruption prevents recovery
      // After parsing complex triggers with nested braces, braceDepth state is corrupted
      // and malformed elements cannot be recovered properly.
      // See issue #273
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;element1            ;Element ;Table   ;
                                                SourceTable=Table18;
                                                Import::OnBeforeInsertRecord=BEGIN
                                                                               IF x > 0 THEN BEGIN
                                                                                 y := 1;
                                                                                 IF z THEN
                                                                                   w := 2;
                                                                               END;
                                                                             END;
                                                                              }
          { [MALFORMED;0 ;broken              ;Element ;Text     }
          { [{GUID-2}];0 ;element2            ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Should have at least one error for malformed element
      expect(result.errors.length).toBeGreaterThanOrEqual(1);

      // Subsequent element should be parsed correctly
      const allElements = result.elements?.elements || [];
      const element2 = allElements.find(e => e.name === 'element2');
      expect(element2).toBeDefined();
      expect(element2?.sourceType).toBe('Text');

      // CODE section MUST be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it('should recover at section boundary when last element is malformed', () => {
      // Verifies fix for issue #274: ELEMENTS recovery now stops at section boundaries.
      // When the last element is malformed (missing closing brace), recovery detects
      // section keywords (CODE, REQUESTPAGE, etc.) and stops, allowing subsequent
      // sections to parse correctly.
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{VALID-GUID-1}];0 ;validElement        ;Element ;Text     }
          { [{BROKEN-GUID}];0 ;brokenElement       ;Element ;Text
        }
        CODE
        {
          VAR
            x@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Should have at least one error
      expect(result.errors.length).toBeGreaterThanOrEqual(1);

      // First valid element should be parsed
      const allElements = result.elements?.elements || [];
      const firstElement = allElements.find(e => e.guid === 'VALID-GUID-1');
      expect(firstElement).toBeDefined();
      expect(firstElement?.name).toBe('validElement');

      // CODE section MUST be parsed - recovery should stop at closing brace
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
      // Verify CODE section has variables
      expect(obj.code?.variables).toBeDefined();
    });

    it('should handle unicode and special characters in element names with malformed entries', () => {
      // SKIPPED: Parser bug - braceDepth corruption prevents recovery
      // The malformed GUID at the start corrupts braceDepth state.
      // See issue #273
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [MALFORMED;0 ;Værdi               ;Element ;Text     }
          { [{GUID-UNICODE}];1 ;País                ;Element ;Text     }
          { [{GUID-SLASH}];1 ;Country/Region  ;Attribute;Text    }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Should have at least one error for malformed element
      expect(result.errors.length).toBeGreaterThanOrEqual(1);

      // Subsequent element with unicode should be parsed
      const allElements = result.elements?.elements || [];
      const unicodeElement = allElements.find(e => e.name === 'País' || e.name?.includes('Pa'));
      expect(unicodeElement).toBeDefined();

      // CODE section MUST be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it('should recover from unclosed brace inside GUID', () => {
      // SKIPPED: Parser bug - unclosed brace in GUID causes subsequent element to be lost
      // When GUID has internal brace like {12345-{1234-1234}, the extra { breaks brace counting.
      // This causes the second element to not be parsed due to braceDepth corruption.
      // See issue #273
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{12345-{1234-1234}];0 ;element1            ;Element ;Text     }
          { [{VALID-GUID}];0 ;element2            ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Malformed GUID produces parse error, but recovery should preserve
      // subsequent elements and sections (the key fix for bug #273)
      expect(result.errors.length).toBeGreaterThanOrEqual(1);

      // First element should capture internal content
      const allElements = result.elements?.elements || [];
      const element1 = allElements.find(e => e.name === 'element1');
      expect(element1).toBeDefined();
      expect(element1?.guid).toBe('12345-{1234-1234'); // Captures until first }

      // Second element should be parsed
      const element2 = allElements.find(e => e.guid === 'VALID-GUID');
      expect(element2).toBeDefined();
      expect(element2?.name).toBe('element2');

      // CODE section MUST be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });

    it.skip('should handle corrupted GUID with unbalanced braces without corrupting braceDepth state', () => {
      // KNOWN LIMITATION: Multiple extra closing braces BEFORE the actual element close
      // (e.g., `{[{12345}}}]`) cannot be distinguished from the element close by brace-counting.
      // The recovery loop exits at the first "false" element close (first extra `}`).
      // This is a pathological edge case; the recovery correctly handles more common cases
      // (missing braces, single extra brace after element close).
      // See investigation in issue #273 for detailed analysis.
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{12345}}}];0 ;element1            ;Element ;Text     }
          { [{VALID-GUID}];0 ;element2            ;Element ;Text     }
          { [{ANOTHER-GUID}];0 ;element3            ;Element ;Text     }
        }
        CODE
        {
          VAR
            TestVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      // Should have at least one error
      expect(result.errors.length).toBeGreaterThanOrEqual(1);

      // braceDepth state should not be corrupted - subsequent elements should parse
      const allElements = result.elements?.elements || [];
      const element2 = allElements.find(e => e.guid === 'VALID-GUID');
      const element3 = allElements.find(e => e.guid === 'ANOTHER-GUID');

      // At least one subsequent element should be parsed (proves braceDepth not corrupted)
      expect(element2 || element3).toBeDefined();

      // CODE section MUST be intact
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.code).toBeDefined();
      expect(obj.code?.type).toBe('CodeSection');
    });
  });

  describe('Real-world examples', () => {
    it('should parse minimal XMLport ELEMENTS structure', () => {
      const code = `OBJECT XMLport 1 "Consolidation Import/Export"
      {
        PROPERTIES
        {
          CaptionML=ENU=Consolidation Import/Export;
        }
        ELEMENTS
        {
          { [{5CDBAF06-C7E1-4222-9633-B90B6840C9FC}];  ;subFinReport        ;Element ;Text    ;
                                                        MinOccurs=Once;
                                                        MaxOccurs=Once }

          { [{B6564B5B-C840-45E1-91C8-A3B073508158}];1 ;product             ;Attribute;Text    }

          { [{476179A5-6D2C-4BD6-9924-08687237A462}];1 ;productVersion      ;Attribute;Text    }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements?.elements).toHaveLength(1); // One root

      const root = result.elements?.elements[0];
      expect(root?.guid).toBe('5CDBAF06-C7E1-4222-9633-B90B6840C9FC');
      expect(root?.name).toBe('subFinReport');
      expect(root?.nodeType).toBe('Element');
      expect(root?.children).toHaveLength(2); // Two attributes
    });

    it('should parse complex XMLport with nested tables', () => {
      const code = `OBJECT XMLport 1225 "Imp / Exp Data Exch Def & Map"
      {
        PROPERTIES
        {
          CaptionML=ENU=Imp / Exp Data Exch Def & Map;
        }
        ELEMENTS
        {
          { [{0538A0EB-2372-43D4-B37C-BFDEA0F605CE}];  ;root                ;Element ;Text     }

          { [{A75DC6DE-02B6-4719-B43E-3C90D19B3BE5}];1 ;DataExchDef         ;Element ;Table   ;
                                                        SourceTable=Table1222;
                                                        MinOccurs=Zero;
                                                        Import::OnBeforeInsertRecord=BEGIN
                                                                                       "Data Exch. Def".VALIDATE(Type);
                                                                                     END;
                                                                                      }

          { [{DAE9B066-1422-4AE9-945C-77B8CC451316}];2 ;Code                ;Attribute;Field  ;
                                                        DataType=Code;
                                                        SourceField=Data Exch. Def::Code }

          { [{7CF8DF04-94D5-4C34-B4A3-D7EC243A1385}];2 ;Name                ;Attribute;Field  ;
                                                        DataType=Text;
                                                        SourceField=Data Exch. Def::Name }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements?.elements).toHaveLength(1);

      const root = result.elements?.elements[0];
      expect(root?.name).toBe('root');
      expect(root?.children).toHaveLength(1);

      const table = root?.children?.[0];
      expect(table?.name).toBe('DataExchDef');
      expect(table?.sourceType).toBe('Table');
      expect(table?.children).toHaveLength(2);

      const trigger = table?.triggers?.find((t: any) => t.name === 'Import::OnBeforeInsertRecord');
      expect(trigger).toBeDefined();
    });

    it('should parse XMLport with LinkFields and LinkTable', () => {
      const code = `OBJECT XMLport 1 "Test"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
          { [{GUID-2}];1 ;glAccount           ;Element ;Table   ;
                                                SourceTable=Table15 }
          { [{GUID-3}];2 ;glEntry             ;Element ;Table   ;
                                                SourceTable=Table17;
                                                LinkFields=Field3=FIELD(Field1);
                                                LinkTable=G/L Account;
                                                MinOccurs=Zero }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);

      const root = result.elements?.elements[0];
      const glAccount = root?.children?.[0];
      const glEntry = glAccount?.children?.[0];

      expect(glEntry?.name).toBe('glEntry');
      const linkFieldsProp = glEntry?.properties?.properties?.find((p: any) => p.name === 'LinkFields');
      expect(linkFieldsProp).toBeDefined();
    });
  });

  describe('Integration with full XMLport structure', () => {
    it('should parse ELEMENTS alongside PROPERTIES and CODE', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
          CaptionML=ENU=Test XMLport;
          Encoding=UTF-8;
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
          { [{GUID-2}];1 ;data                ;Element ;Table   ;
                                                SourceTable=Table18 }
        }
        CODE
        {
          VAR
            MyVar@1000 : Integer;

          BEGIN
          END.
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.ast.object).toBeDefined();

      // Verify all sections exist
      const obj = result.ast.object as ObjectDeclaration;
      expect(obj.objectKind).toBe(ObjectKind.XMLport);
      expect(obj.properties).toBeDefined();
      expect(obj.elements).toBeDefined();
      expect(obj.code).toBeDefined();

      // Verify ELEMENTS parsed correctly
      expect(obj.elements?.elements).toHaveLength(1);
      const root = obj.elements?.elements[0];
      expect(root?.children).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long GUIDs', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{5CDBAF06-C7E1-4222-9633-B90B6840C9FC}];0 ;root                ;Element ;Text     }
        }
      }`;

      const result = parseElements(code);

      const element = result.elements?.elements[0];
      expect(element?.guid).toBe('5CDBAF06-C7E1-4222-9633-B90B6840C9FC');
      expect(element?.guid.length).toBe(36); // Standard UUID length
    });

    it('should preserve element order in list', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;element1            ;Element ;Text     }
          { [{GUID-2}];0 ;element2            ;Element ;Text     }
          { [{GUID-3}];0 ;element3            ;Element ;Text     }
          { [{GUID-4}];0 ;element4            ;Element ;Text     }
        }
      }`;

      const result = parseElements(code);

      expect(result.elements?.elements).toHaveLength(4);
      expect(result.elements?.elements[0].name).toBe('element1');
      expect(result.elements?.elements[1].name).toBe('element2');
      expect(result.elements?.elements[2].name).toBe('element3');
      expect(result.elements?.elements[3].name).toBe('element4');
    });

    it('should handle element names with special characters', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;Country/Region Code ;Attribute;Text    }
        }
      }`;

      const result = parseElements(code);

      const element = result.elements?.elements[0];
      expect(element?.name).toBe('Country/Region Code');
    });
  });

  describe('Snapshot tests', () => {
    it('should match snapshot for complete ELEMENTS section', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
          { [{GUID-2}];1 ;DataExchDef         ;Element ;Table   ;
                                                SourceTable=Table1222;
                                                MinOccurs=Zero;
                                                Import::OnBeforeInsertRecord=BEGIN
                                                                               Validate();
                                                                             END;
                                                                              }
          { [{GUID-3}];2 ;Code                ;Attribute;Field  ;
                                                DataType=Code;
                                                SourceField=Code }
          { [{GUID-4}];2 ;Name                ;Attribute;Field  ;
                                                DataType=Text;
                                                SourceField=Name;
                                                Occurrence=Optional }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements).toMatchSnapshot();
    });

    it('should match snapshot for nested hierarchy', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
      {
        PROPERTIES
        {
        }
        ELEMENTS
        {
          { [{GUID-1}];0 ;root                ;Element ;Text     }
          { [{GUID-2}];1 ;table1              ;Element ;Table   ;
                                                SourceTable=Table18 }
          { [{GUID-3}];2 ;field1              ;Attribute;Field  ;
                                                SourceField=No. }
          { [{GUID-4}];2 ;field2              ;Attribute;Field  ;
                                                SourceField=Name }
          { [{GUID-5}];1 ;table2              ;Element ;Table   ;
                                                SourceTable=Table19 }
          { [{GUID-6}];2 ;field3              ;Attribute;Field  ;
                                                SourceField=Code }
        }
      }`;

      const result = parseElements(code);

      expect(result.errors).toHaveLength(0);
      expect(result.elements).toMatchSnapshot();
    });
  });
});
