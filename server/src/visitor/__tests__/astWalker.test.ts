/**
 * ASTWalker Tests
 *
 * Comprehensive tests for the ASTWalker class which provides depth-first
 * traversal of C/AL AST nodes using the Visitor pattern.
 */

import { ASTWalker } from '../astWalker';
import { ASTVisitor } from '../astVisitor';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import {
  CALDocument,
  ObjectDeclaration,
  FieldSection,
  FieldDeclaration,
  CodeSection,
  VariableDeclaration,
  ProcedureDeclaration,
  Identifier,
  Literal,
  AssignmentStatement,
  BinaryExpression,
  CallExpression,
  IfStatement,
  ForStatement,
  WhileStatement,
  RepeatStatement,
  CaseStatement,
  ExitStatement,
  DataType,
  ASTNode
} from '../../parser/ast';

/**
 * Helper to lex and parse C/AL code into an AST
 */
function parseCode(code: string): CALDocument {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('ASTWalker', () => {
  let walker: ASTWalker;

  beforeEach(() => {
    walker = new ASTWalker();
  });

  describe('Basic Traversal', () => {
    it('should handle null nodes gracefully', () => {
      const visitor: Partial<ASTVisitor> = {
        visitCALDocument: jest.fn()
      };

      // Should not throw
      walker.walk(null, visitor);
      walker.walk(undefined, visitor);

      expect(visitor.visitCALDocument).not.toHaveBeenCalled();
    });

    it('should handle empty visitor gracefully', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Name            ;Text50        }
  }
}`;
      const ast = parseCode(code);

      // Should not throw with empty visitor
      expect(() => walker.walk(ast, {})).not.toThrow();
    });

    it('should visit the root CALDocument node', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Name            ;Text50        }
  }
}`;
      const ast = parseCode(code);
      const visitedDocuments: CALDocument[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitCALDocument: (node: CALDocument) => {
          visitedDocuments.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedDocuments.length).toBe(1);
      expect(visitedDocuments[0].type).toBe('CALDocument');
    });

    it('should visit ObjectDeclaration nodes', () => {
      const code = `OBJECT Table 50000 TestTable
{
  FIELDS
  {
    { 1   ;   ;No              ;Code20        }
  }
}`;
      const ast = parseCode(code);
      const visitedObjects: ObjectDeclaration[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitObjectDeclaration: (node: ObjectDeclaration) => {
          visitedObjects.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedObjects.length).toBe(1);
      expect(visitedObjects[0].objectName).toBe('TestTable');
    });
  });

  describe('visitNode Generic Callback', () => {
    it('should call visitNode for every node visited', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Name            ;Text50        }
  }
}`;
      const ast = parseCode(code);
      const visitedNodes: ASTNode[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitNode: (node: ASTNode) => {
          visitedNodes.push(node);
        }
      };

      walker.walk(ast, visitor);

      // Should visit: CALDocument, ObjectDeclaration, FieldSection, FieldDeclaration, DataType
      expect(visitedNodes.length).toBeGreaterThanOrEqual(5);
      expect(visitedNodes.some(n => n.type === 'CALDocument')).toBe(true);
      expect(visitedNodes.some(n => n.type === 'ObjectDeclaration')).toBe(true);
      expect(visitedNodes.some(n => n.type === 'FieldSection')).toBe(true);
      expect(visitedNodes.some(n => n.type === 'FieldDeclaration')).toBe(true);
      expect(visitedNodes.some(n => n.type === 'DataType')).toBe(true);
    });

    it('should skip type-specific visitor and children when visitNode returns false', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Name            ;Text50        }
  }
}`;
      const ast = parseCode(code);
      const visitedNodes: string[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitNode: (node: ASTNode) => {
          visitedNodes.push(node.type);
          // Skip ObjectDeclaration and all its children
          if (node.type === 'ObjectDeclaration') {
            return false;
          }
        },
        visitFieldDeclaration: jest.fn()
      };

      walker.walk(ast, visitor);

      // Should visit CALDocument and ObjectDeclaration only
      expect(visitedNodes).toContain('CALDocument');
      expect(visitedNodes).toContain('ObjectDeclaration');
      expect(visitedNodes).not.toContain('FieldSection');
      expect(visitedNodes).not.toContain('FieldDeclaration');
      // Type-specific visitor should not be called since we returned false
      expect(visitor.visitFieldDeclaration).not.toHaveBeenCalled();
    });
  });

  describe('Skip Children', () => {
    it('should skip children when visitor returns false', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Name            ;Text50        }
    { 2   ;   ;Code            ;Code20        }
  }
}`;
      const ast = parseCode(code);
      const visitedFields: FieldDeclaration[] = [];
      const visitedDataTypes: DataType[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitFieldSection: (_node: FieldSection) => {
          return false; // Skip all children (field declarations)
        },
        visitFieldDeclaration: (node: FieldDeclaration) => {
          visitedFields.push(node);
        },
        visitDataType: (node: DataType) => {
          visitedDataTypes.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedFields.length).toBe(0);
      expect(visitedDataTypes.length).toBe(0);
    });

    it('should continue traversal when visitor returns void', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Name            ;Text50        }
    { 2   ;   ;Code            ;Code20        }
  }
}`;
      const ast = parseCode(code);
      const visitedFields: FieldDeclaration[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitFieldSection: (_node: FieldSection) => {
          // Return void (implicit) - should continue to children
        },
        visitFieldDeclaration: (node: FieldDeclaration) => {
          visitedFields.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedFields.length).toBe(2);
    });
  });

  describe('Field Section Traversal', () => {
    it('should visit all fields in a table', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;No              ;Code20        }
    { 2   ;   ;Name            ;Text100       }
    { 3   ;   ;Balance         ;Decimal       }
  }
}`;
      const ast = parseCode(code);
      const visitedFields: FieldDeclaration[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitFieldDeclaration: (node: FieldDeclaration) => {
          visitedFields.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedFields.length).toBe(3);
      expect(visitedFields[0].fieldName).toBe('No');
      expect(visitedFields[1].fieldName).toBe('Name');
      expect(visitedFields[2].fieldName).toBe('Balance');
    });

    it('should visit field data types', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;IntField        ;Integer       }
    { 2   ;   ;TextField       ;Text50        }
  }
}`;
      const ast = parseCode(code);
      const visitedDataTypes: DataType[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitDataType: (node: DataType) => {
          visitedDataTypes.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedDataTypes.length).toBe(2);
      expect(visitedDataTypes[0].typeName).toBe('Integer');
      expect(visitedDataTypes[1].typeName).toBe('Text50');
    });
  });

  describe('Code Section Traversal', () => {
    it('should visit global variables', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            GlobalVar1 : Integer;
            GlobalVar2 : Text;

          PROCEDURE TestProc();
          BEGIN
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedVars: VariableDeclaration[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitVariableDeclaration: (node: VariableDeclaration) => {
          visitedVars.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedVars.length).toBeGreaterThanOrEqual(2);
      expect(visitedVars.some(v => v.name === 'GlobalVar1')).toBe(true);
      expect(visitedVars.some(v => v.name === 'GlobalVar2')).toBe(true);
    });

    it('should visit procedures', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          PROCEDURE FirstProc();
          BEGIN
          END;

          PROCEDURE SecondProc();
          BEGIN
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedProcs: ProcedureDeclaration[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitProcedureDeclaration: (node: ProcedureDeclaration) => {
          visitedProcs.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedProcs.length).toBe(2);
      expect(visitedProcs[0].name).toBe('FirstProc');
      expect(visitedProcs[1].name).toBe('SecondProc');
    });

    it('should visit local variables inside procedures', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          PROCEDURE TestProc();
          VAR
            LocalVar : Integer;
          BEGIN
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedVars: VariableDeclaration[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitVariableDeclaration: (node: VariableDeclaration) => {
          visitedVars.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedVars.length).toBe(1);
      expect(visitedVars[0].name).toBe('LocalVar');
    });
  });

  describe('Statement Traversal', () => {
    it('should visit assignment statements', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            x : Integer;

          PROCEDURE TestProc();
          BEGIN
            x := 1;
            x := 2;
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedAssignments: AssignmentStatement[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitAssignmentStatement: (node: AssignmentStatement) => {
          visitedAssignments.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedAssignments.length).toBe(2);
    });

    it('should visit if statements and both branches', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            x : Integer;
            y : Integer;

          PROCEDURE TestProc();
          BEGIN
            IF x > 0 THEN
              y := 1
            ELSE
              y := 2;
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedIfs: IfStatement[] = [];
      const visitedAssignments: AssignmentStatement[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitIfStatement: (node: IfStatement) => {
          visitedIfs.push(node);
        },
        visitAssignmentStatement: (node: AssignmentStatement) => {
          visitedAssignments.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedIfs.length).toBe(1);
      expect(visitedAssignments.length).toBe(2); // Both then and else branches
    });

    it('should visit while loop condition and body', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            i : Integer;

          PROCEDURE TestProc();
          BEGIN
            WHILE i < 10 DO
              i := i + 1;
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedWhiles: WhileStatement[] = [];
      const visitedBinaryExprs: BinaryExpression[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitWhileStatement: (node: WhileStatement) => {
          visitedWhiles.push(node);
        },
        visitBinaryExpression: (node: BinaryExpression) => {
          visitedBinaryExprs.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedWhiles.length).toBe(1);
      // Should find binary expressions in condition (i < 10) and body (i + 1)
      expect(visitedBinaryExprs.length).toBeGreaterThanOrEqual(2);
    });

    it('should visit repeat-until loop body and condition', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            counter : Integer;

          PROCEDURE TestProc();
          BEGIN
            REPEAT
              counter := counter + 1;
            UNTIL counter >= 10;
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedRepeats: RepeatStatement[] = [];
      const visitedAssignments: AssignmentStatement[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitRepeatStatement: (node: RepeatStatement) => {
          visitedRepeats.push(node);
        },
        visitAssignmentStatement: (node: AssignmentStatement) => {
          visitedAssignments.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedRepeats.length).toBe(1);
      expect(visitedAssignments.length).toBe(1);
    });

    it('should visit for loop variable, bounds, and body', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            i : Integer;
            sum : Integer;

          PROCEDURE TestProc();
          BEGIN
            FOR i := 1 TO 10 DO
              sum := sum + i;
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedFors: ForStatement[] = [];
      const visitedIdentifiers: Identifier[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitForStatement: (node: ForStatement) => {
          visitedFors.push(node);
        },
        visitIdentifier: (node: Identifier) => {
          visitedIdentifiers.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedFors.length).toBe(1);
      // Should find the loop variable 'i' and variables in body
      expect(visitedIdentifiers.some(id => id.name === 'i')).toBe(true);
    });

    it('should visit case statement branches', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            x : Integer;
            result : Text;

          PROCEDURE TestProc();
          BEGIN
            CASE x OF
              1: result := 'One';
              2: result := 'Two';
              ELSE result := 'Other';
            END;
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedCases: CaseStatement[] = [];
      const visitedAssignments: AssignmentStatement[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitCaseStatement: (node: CaseStatement) => {
          visitedCases.push(node);
        },
        visitAssignmentStatement: (node: AssignmentStatement) => {
          visitedAssignments.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedCases.length).toBe(1);
      // Assignments in case branches + else branch
      expect(visitedAssignments.length).toBe(3);
    });

    it('should visit exit statements', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          PROCEDURE TestProc() : Integer;
          BEGIN
            EXIT(42);
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedExits: ExitStatement[] = [];
      const visitedLiterals: Literal[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitExitStatement: (node: ExitStatement) => {
          visitedExits.push(node);
        },
        visitLiteral: (node: Literal) => {
          visitedLiterals.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedExits.length).toBe(1);
      expect(visitedLiterals.length).toBeGreaterThanOrEqual(1);
      expect(visitedLiterals.some(l => l.value === 42)).toBe(true);
    });
  });

  describe('Expression Traversal', () => {
    it('should visit identifier expressions', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            myVar : Integer;

          PROCEDURE TestProc();
          BEGIN
            myVar := myVar + 1;
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedIdentifiers: Identifier[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitIdentifier: (node: Identifier) => {
          visitedIdentifiers.push(node);
        }
      };

      walker.walk(ast, visitor);

      // 'myVar' appears multiple times
      expect(visitedIdentifiers.filter(id => id.name === 'myVar').length).toBeGreaterThanOrEqual(2);
    });

    it('should visit literal expressions', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            x : Integer;
            s : Text;

          PROCEDURE TestProc();
          BEGIN
            x := 42;
            s := 'hello';
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedLiterals: Literal[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitLiteral: (node: Literal) => {
          visitedLiterals.push(node);
        }
      };

      walker.walk(ast, visitor);

      expect(visitedLiterals.length).toBe(2);
      expect(visitedLiterals.some(l => l.value === 42)).toBe(true);
      expect(visitedLiterals.some(l => l.value === 'hello')).toBe(true);
    });

    it('should visit binary expressions', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            a : Integer;
            b : Integer;
            c : Integer;

          PROCEDURE TestProc();
          BEGIN
            c := a + b * 2;
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedBinaryExprs: BinaryExpression[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitBinaryExpression: (node: BinaryExpression) => {
          visitedBinaryExprs.push(node);
        }
      };

      walker.walk(ast, visitor);

      // a + (b * 2) has two binary expressions
      expect(visitedBinaryExprs.length).toBe(2);
    });

    it('should visit call expressions and their arguments', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            x : Integer;

          PROCEDURE Helper(p : Integer) : Integer;
          BEGIN
            EXIT(p * 2);
          END;

          PROCEDURE TestProc();
          BEGIN
            x := Helper(10);
          END;
        }
      }`;
      const ast = parseCode(code);
      const visitedCalls: CallExpression[] = [];
      const visitedLiterals: Literal[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitCallExpression: (node: CallExpression) => {
          visitedCalls.push(node);
        },
        visitLiteral: (node: Literal) => {
          visitedLiterals.push(node);
        }
      };

      walker.walk(ast, visitor);

      // Helper(10) call
      expect(visitedCalls.length).toBeGreaterThanOrEqual(1);
      // Should visit the argument literal 10
      expect(visitedLiterals.some(l => l.value === 10)).toBe(true);
    });
  });

  describe('Depth-First Traversal Order', () => {
    it('should visit nodes in depth-first order', () => {
      const code = `OBJECT Table 50000 Test
{
  FIELDS
  {
    { 1   ;   ;Field1          ;Integer       }
  }
}`;
      const ast = parseCode(code);
      const visitOrder: string[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitNode: (node: ASTNode) => {
          visitOrder.push(node.type);
        }
      };

      walker.walk(ast, visitor);

      // Should visit in order: CALDocument -> ObjectDeclaration -> FieldSection -> FieldDeclaration -> DataType
      const calDocIndex = visitOrder.indexOf('CALDocument');
      const objDeclIndex = visitOrder.indexOf('ObjectDeclaration');
      const fieldSectionIndex = visitOrder.indexOf('FieldSection');
      const fieldDeclIndex = visitOrder.indexOf('FieldDeclaration');
      const dataTypeIndex = visitOrder.indexOf('DataType');

      expect(calDocIndex).toBeLessThan(objDeclIndex);
      expect(objDeclIndex).toBeLessThan(fieldSectionIndex);
      expect(fieldSectionIndex).toBeLessThan(fieldDeclIndex);
      expect(fieldDeclIndex).toBeLessThan(dataTypeIndex);
    });
  });

  describe('Reusability', () => {
    it('should be reusable for multiple traversals', () => {
      const code1 = `OBJECT Table 50000 Test1
{
  FIELDS
  {
    { 1   ;   ;Field1          ;Integer       }
  }
}`;
      const code2 = `OBJECT Table 50001 Test2
{
  FIELDS
  {
    { 1   ;   ;Field2          ;Text50        }
  }
}`;
      const ast1 = parseCode(code1);
      const ast2 = parseCode(code2);

      const visitedFields1: string[] = [];
      const visitedFields2: string[] = [];

      // First traversal
      walker.walk(ast1, {
        visitFieldDeclaration: (node: FieldDeclaration) => {
          visitedFields1.push(node.fieldName);
        }
      });

      // Second traversal with same walker instance
      walker.walk(ast2, {
        visitFieldDeclaration: (node: FieldDeclaration) => {
          visitedFields2.push(node.fieldName);
        }
      });

      expect(visitedFields1).toEqual(['Field1']);
      expect(visitedFields2).toEqual(['Field2']);
    });
  });

  describe('Collecting Identifiers Use Case', () => {
    it('should enable collecting all identifiers in code', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            Customer : Record 18;
            Amount : Decimal;

          PROCEDURE Calculate();
          BEGIN
            Amount := Customer.Balance + Customer.Credit;
          END;
        }
      }`;
      const ast = parseCode(code);
      const identifiers: string[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitIdentifier: (node: Identifier) => {
          identifiers.push(node.name);
        }
      };

      walker.walk(ast, visitor);

      expect(identifiers).toContain('Amount');
      expect(identifiers).toContain('Customer');
      expect(identifiers).toContain('Balance');
      expect(identifiers).toContain('Credit');
    });
  });

  describe('Procedure Analysis Use Case', () => {
    it('should enable analyzing procedure complexity', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          PROCEDURE ComplexProc();
          VAR
            i : Integer;
            j : Integer;
          BEGIN
            IF i > 0 THEN
              j := 1
            ELSE
              j := 2;

            WHILE j < 10 DO
              j := j + 1;

            FOR i := 1 TO 5 DO
              j := j + i;
          END;
        }
      }`;
      const ast = parseCode(code);

      let procedureCount = 0;
      let ifCount = 0;
      let loopCount = 0;

      const visitor: Partial<ASTVisitor> = {
        visitProcedureDeclaration: () => {
          procedureCount++;
        },
        visitIfStatement: () => {
          ifCount++;
        },
        visitWhileStatement: () => {
          loopCount++;
        },
        visitForStatement: () => {
          loopCount++;
        },
        visitRepeatStatement: () => {
          loopCount++;
        }
      };

      walker.walk(ast, visitor);

      expect(procedureCount).toBe(1);
      expect(ifCount).toBe(1);
      expect(loopCount).toBe(2); // while + for
    });
  });

  describe('Variable Declaration Collection Use Case', () => {
    it('should collect all variable declarations', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            GlobalVar : Integer;

          PROCEDURE Proc1();
          VAR
            LocalVar1 : Text;
          BEGIN
          END;

          PROCEDURE Proc2();
          VAR
            LocalVar2 : Decimal;
            LocalVar3 : Boolean;
          BEGIN
          END;
        }
      }`;
      const ast = parseCode(code);
      const variables: { name: string; type: string }[] = [];

      const visitor: Partial<ASTVisitor> = {
        visitVariableDeclaration: (node: VariableDeclaration) => {
          variables.push({
            name: node.name,
            type: node.dataType.typeName
          });
        }
      };

      walker.walk(ast, visitor);

      expect(variables.length).toBe(4);
      expect(variables.some(v => v.name === 'GlobalVar' && v.type === 'Integer')).toBe(true);
      expect(variables.some(v => v.name === 'LocalVar1' && v.type === 'Text')).toBe(true);
      expect(variables.some(v => v.name === 'LocalVar2' && v.type === 'Decimal')).toBe(true);
      expect(variables.some(v => v.name === 'LocalVar3' && v.type === 'Boolean')).toBe(true);
    });
  });

  describe('Scope-Aware Traversal Use Case', () => {
    it('should enable scope tracking during traversal', () => {
      const code = `OBJECT Codeunit 50000 Test {
        CODE {
          VAR
            GlobalCounter : Integer;

          PROCEDURE FirstProc();
          VAR
            LocalInFirst : Integer;
          BEGIN
          END;

          PROCEDURE SecondProc();
          VAR
            LocalInSecond : Integer;
          BEGIN
          END;
        }
      }`;
      const ast = parseCode(code);

      const scopeMap: Map<string, string[]> = new Map();
      let currentScope = 'global';

      const visitor: Partial<ASTVisitor> = {
        visitCodeSection: () => {
          currentScope = 'global';
          scopeMap.set('global', []);
        },
        visitProcedureDeclaration: (node: ProcedureDeclaration) => {
          currentScope = node.name;
          scopeMap.set(node.name, []);
        },
        visitVariableDeclaration: (node: VariableDeclaration) => {
          const vars = scopeMap.get(currentScope) || [];
          vars.push(node.name);
          scopeMap.set(currentScope, vars);
        }
      };

      walker.walk(ast, visitor);

      expect(scopeMap.get('global')).toContain('GlobalCounter');
      expect(scopeMap.get('FirstProc')).toContain('LocalInFirst');
      expect(scopeMap.get('SecondProc')).toContain('LocalInSecond');
    });
  });
});
