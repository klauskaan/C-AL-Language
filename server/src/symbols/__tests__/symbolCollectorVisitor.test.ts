/**
 * Integration Tests for SymbolCollectorVisitor
 *
 * Tests the visitor pattern implementation used by SymbolTable.buildFromAST()
 * to ensure proper scope hierarchy and symbol collection.
 */

import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';
import { SymbolTable } from '../symbolTable';

describe('SymbolCollectorVisitor Integration', () => {
  describe('Scope Hierarchy Creation', () => {
    it('should create correct scope hierarchy with procedure scopes', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      globalVar : Integer;

    PROCEDURE MyProcedure@1(param1 : Text);
    VAR
      localVar : Integer;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);

      // Verify root scope contains global variable and procedure name
      expect(symbolTable.hasSymbol('globalVar')).toBe(true);
      expect(symbolTable.hasSymbol('MyProcedure')).toBe(true);
      expect(symbolTable.getSymbol('globalVar')?.kind).toBe('variable');
      expect(symbolTable.getSymbol('MyProcedure')?.kind).toBe('procedure');

      // Verify local variable is in procedure scope, not root
      // It should only be accessible within the procedure's offset range
      const procScope = symbolTable.getScopeAtOffset(ast.object!.code!.procedures[0].startToken.startOffset + 10);
      expect(procScope).toBeDefined();
      expect(procScope.hasSymbol('localVar')).toBe(true);
      expect(procScope.hasSymbol('param1')).toBe(true);

      // Verify global variable is accessible from procedure scope (parent chain)
      expect(procScope.hasSymbol('globalVar')).toBe(true);
    });

    it('should create separate scopes for multiple procedures', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE Proc1@1();
    VAR
      localA : Integer;
    BEGIN
    END;

    PROCEDURE Proc2@2();
    VAR
      localB : Text;
    BEGIN
    END;

    PROCEDURE Proc3@3();
    VAR
      localC : Decimal;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);

      // All procedure names should be in root scope
      expect(symbolTable.hasSymbol('Proc1')).toBe(true);
      expect(symbolTable.hasSymbol('Proc2')).toBe(true);
      expect(symbolTable.hasSymbol('Proc3')).toBe(true);

      // Get scopes for each procedure
      const proc1Offset = ast.object!.code!.procedures[0].startToken.startOffset + 10;
      const proc2Offset = ast.object!.code!.procedures[1].startToken.startOffset + 10;
      const proc3Offset = ast.object!.code!.procedures[2].startToken.startOffset + 10;

      const proc1Scope = symbolTable.getScopeAtOffset(proc1Offset);
      const proc2Scope = symbolTable.getScopeAtOffset(proc2Offset);
      const proc3Scope = symbolTable.getScopeAtOffset(proc3Offset);

      // Each procedure should have only its own local variables
      expect(proc1Scope.hasSymbol('localA')).toBe(true);
      expect(proc1Scope.hasSymbol('localB')).toBe(false);
      expect(proc1Scope.hasSymbol('localC')).toBe(false);

      expect(proc2Scope.hasSymbol('localA')).toBe(false);
      expect(proc2Scope.hasSymbol('localB')).toBe(true);
      expect(proc2Scope.hasSymbol('localC')).toBe(false);

      expect(proc3Scope.hasSymbol('localA')).toBe(false);
      expect(proc3Scope.hasSymbol('localB')).toBe(false);
      expect(proc3Scope.hasSymbol('localC')).toBe(true);
    });
  });

  describe('Field Trigger Scope Handling', () => {
    it('should create trigger scope for field OnValidate trigger', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20 ;
                             OnValidate=VAR
                                          tempVar : Integer;
                                        BEGIN
                                          tempVar := 0;
                                        END; }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);

      // Field should be in root scope
      expect(symbolTable.hasSymbol('No.')).toBe(true);
      expect(symbolTable.getSymbol('No.')?.kind).toBe('field');

      // Trigger variable should be in trigger scope, not root
      expect(symbolTable.hasSymbol('tempVar')).toBe(false);

      // Get trigger scope
      const trigger = ast.object!.fields!.fields[0].triggers![0];
      const triggerScope = symbolTable.getScopeAtOffset(trigger.startToken.startOffset + 10);

      // Trigger variable should be in trigger scope
      expect(triggerScope.hasSymbol('tempVar')).toBe(true);
      expect(triggerScope.getSymbol('tempVar')?.kind).toBe('variable');

      // Field should be accessible from trigger scope (parent chain)
      expect(triggerScope.hasSymbol('No.')).toBe(true);
    });

    it('should handle multiple field triggers independently', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20 ;
                             OnValidate=VAR
                                          validateVar : Integer;
                                        BEGIN
                                        END; }
    { 2   ;   ;Name            ;Text50 ;
                             OnLookup=VAR
                                        lookupVar : Text;
                                      BEGIN
                                      END; }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);

      // Both fields should be in root scope
      expect(symbolTable.hasSymbol('No.')).toBe(true);
      expect(symbolTable.hasSymbol('Name')).toBe(true);

      // Get trigger scopes
      const trigger1 = ast.object!.fields!.fields[0].triggers![0];
      const trigger2 = ast.object!.fields!.fields[1].triggers![0];
      const trigger1Scope = symbolTable.getScopeAtOffset(trigger1.startToken.startOffset + 10);
      const trigger2Scope = symbolTable.getScopeAtOffset(trigger2.startToken.startOffset + 10);

      // Each trigger should have only its own variables
      expect(trigger1Scope.hasSymbol('validateVar')).toBe(true);
      expect(trigger1Scope.hasSymbol('lookupVar')).toBe(false);

      expect(trigger2Scope.hasSymbol('validateVar')).toBe(false);
      expect(trigger2Scope.hasSymbol('lookupVar')).toBe(true);
    });
  });

  describe('Scope Offset Boundaries', () => {
    it('should set correct startOffset and endOffset for procedure scope', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    PROCEDURE MyProcedure@1();
    VAR
      localVar : Integer;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);

      // Get procedure node
      const procedure = ast.object!.code!.procedures[0];

      // Get scope at an offset inside the procedure
      const procScope = symbolTable.getScopeAtOffset(procedure.startToken.startOffset + 10);

      // Verify scope boundaries match procedure boundaries
      expect(procScope.startOffset).toBe(procedure.startToken.startOffset);
      expect(procScope.endOffset).toBe(procedure.endToken.endOffset);
    });

    it('should set correct startOffset and endOffset for trigger scope', () => {
      const code = `OBJECT Table 18 Customer
{
  FIELDS
  {
    { 1   ;   ;"No."           ;Code20 ;
                             OnValidate=VAR
                                          tempVar : Integer;
                                        BEGIN
                                        END; }
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);

      // Get trigger node
      const trigger = ast.object!.fields!.fields[0].triggers![0];

      // Get scope at an offset inside the trigger
      const triggerScope = symbolTable.getScopeAtOffset(trigger.startToken.startOffset + 10);

      // Verify scope boundaries match trigger boundaries
      expect(triggerScope.startOffset).toBe(trigger.startToken.startOffset);
      expect(triggerScope.endOffset).toBe(trigger.endToken.endOffset);
    });
  });

  describe('Symbol Metadata Correctness', () => {
    it('should add symbols with correct kind, type, and token information', () => {
      const code = `OBJECT Codeunit 50000 Test
{
  CODE
  {
    VAR
      myVar : Integer;

    PROCEDURE MyProc@1(param : Text);
    VAR
      localVar : Decimal;
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const symbolTable = new SymbolTable();
      symbolTable.buildFromAST(ast);

      // Verify global variable
      const myVar = symbolTable.getSymbol('myVar');
      expect(myVar?.kind).toBe('variable');
      expect(myVar?.type).toBe('Integer');
      expect(myVar?.token).toBeDefined();

      // Verify procedure
      const myProc = symbolTable.getSymbol('MyProc');
      expect(myProc?.kind).toBe('procedure');
      expect(myProc?.token).toBeDefined();

      // Verify parameter in procedure scope
      const procOffset = ast.object!.code!.procedures[0].startToken.startOffset + 10;
      const procScope = symbolTable.getScopeAtOffset(procOffset);
      const param = procScope.getSymbol('param');
      expect(param?.kind).toBe('parameter');
      expect(param?.type).toBe('Text');
      expect(param?.token).toBeDefined();

      // Verify local variable in procedure scope
      const localVar = procScope.getSymbol('localVar');
      expect(localVar?.kind).toBe('variable');
      expect(localVar?.type).toBe('Decimal');
      expect(localVar?.token).toBeDefined();
    });
  });
});

describe('Property Trigger Scopes', () => {
  it('should not expose Codeunit OnRun trigger variable in root scope', () => {
    const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=VAR
            myVar@1000 : Integer;
          BEGIN
            myVar := 5;
          END;
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    // myVar belongs to the OnRun property trigger — NOT to root scope
    expect(symbolTable.hasSymbol('myVar')).toBe(false);

    // myVar IS visible when looked up at an offset inside the trigger body
    const property = ast.object!.properties!.properties[0];
    const triggerOffset = property.startToken.startOffset + 10;
    const myVarAtOffset = symbolTable.getSymbolAtOffset('myVar', triggerOffset);
    expect(myVarAtOffset).toBeDefined();
    expect(myVarAtOffset!.kind).toBe('variable');
  });

  it('should isolate property trigger variables from CODE section procedure scope', () => {
    const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=VAR
            localVar@1000 : Integer;
          BEGIN
            localVar := 1;
          END;
  }
  CODE
  {
    PROCEDURE Helper@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    // localVar should be visible inside the OnRun property trigger
    const property = ast.object!.properties!.properties[0];
    const triggerOffset = property.startToken.startOffset + 10;
    const localVarInTrigger = symbolTable.getSymbolAtOffset('localVar', triggerOffset);
    expect(localVarInTrigger).toBeDefined();

    // localVar must NOT be visible inside the CODE section procedure
    const proc = ast.object!.code!.procedures[0];
    const procOffset = proc.startToken.startOffset + 10;
    const localVarInProc = symbolTable.getSymbolAtOffset('localVar', procOffset);
    expect(localVarInProc).toBeUndefined();
  });

  it('should create a scope covering the property trigger start and end offsets', () => {
    // Location assertions depend on fixture structure - do not reformat
    const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=VAR
            myVar@1000 : Integer;
          BEGIN
            myVar := 5;
          END;
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    const property = ast.object!.properties!.properties[0];
    const triggerOffset = property.startToken.startOffset + 10;
    const scope = symbolTable.getScopeAtOffset(triggerOffset);

    expect(scope.startOffset).toBe(property.startToken.startOffset);
    expect(scope.endOffset).toBe(property.endToken.endOffset);
  });

  it('should create a property trigger scope even when no variables are declared', () => {
    const code = `OBJECT Codeunit 1 Test
{
  PROPERTIES
  {
    OnRun=BEGIN
          END;
  }
  CODE
  {
    BEGIN
    END.
  }
}`;

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const symbolTable = new SymbolTable();
    symbolTable.buildFromAST(ast);

    // Root scope should have no trigger variables leaked into it
    const rootScope = symbolTable.getRootScope();
    expect(rootScope.getOwnSymbols().length).toBe(0);

    // A child scope should exist for the trigger (lookup at property offset returns non-root scope)
    const property = ast.object!.properties!.properties[0];
    const triggerOffset = property.startToken.startOffset + 10;
    const scope = symbolTable.getScopeAtOffset(triggerOffset);

    // The scope found must be a child scope, not the root
    expect(scope).not.toBe(rootScope);
  });
});
