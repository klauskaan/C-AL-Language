/**
 * Tests for Phase 5: Action Completion
 * Tests context-aware completion inside ACTIONS sections
 */

import { CompletionProvider } from '../completionProvider';
import { CompletionItemKind, Position } from 'vscode-languageserver';
import { createDocument } from '../../__tests__/testUtils';
import { Lexer } from '../../lexer/lexer';
import { Parser } from '../../parser/parser';

describe('Phase 5: Action Completion', () => {
  let provider: CompletionProvider;

  beforeEach(() => {
    provider = new CompletionProvider();
  });

  function parseText(text: string) {
    const doc = createDocument(text);
    const lexer = new Lexer(text);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return { doc, ast };
  }

  describe('Action Type Completion', () => {
    it('should offer action types when cursor is inside ACTIONS section', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {

  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor inside ACTIONS section, line 7 (empty line between braces)
      const items = provider.getCompletions(doc, Position.create(7, 4), ast);

      // Should include all action types
      expect(items.some(i => i.label === 'ActionContainer')).toBe(true);
      expect(items.some(i => i.label === 'ActionGroup')).toBe(true);
      expect(items.some(i => i.label === 'Action')).toBe(true);
      expect(items.some(i => i.label === 'Separator')).toBe(true);
    });

    it('should use EnumMember kind for action types', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {

  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      const items = provider.getCompletions(doc, Position.create(7, 4), ast);

      const actionContainer = items.find(i => i.label === 'ActionContainer');
      expect(actionContainer).toBeDefined();
      expect(actionContainer?.kind).toBe(CompletionItemKind.EnumMember);

      const action = items.find(i => i.label === 'Action');
      expect(action).toBeDefined();
      expect(action?.kind).toBe(CompletionItemKind.EnumMember);
    });

    it('should filter action types by prefix', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    Act
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor after "Act" prefix
      const items = provider.getCompletions(doc, Position.create(7, 7), ast);

      // Should include ActionContainer, ActionGroup, Action
      expect(items.some(i => i.label === 'ActionContainer')).toBe(true);
      expect(items.some(i => i.label === 'ActionGroup')).toBe(true);
      expect(items.some(i => i.label === 'Action')).toBe(true);

      // Should NOT include Separator (doesn't start with "Act")
      expect(items.some(i => i.label === 'Separator')).toBe(false);
    });

    it('should offer action types inside nested action structures', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=ActionItems }

  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor on empty line after ActionContainer (line 9)
      const items = provider.getCompletions(doc, Position.create(9, 4), ast);

      expect(items.some(i => i.label === 'ActionGroup')).toBe(true);
      expect(items.some(i => i.label === 'Action')).toBe(true);
    });
  });

  describe('Action Property Completion', () => {
    it('should offer action property names inside ACTIONS section', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;Action    ;

  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor on empty line inside action definition (line 8)
      const items = provider.getCompletions(doc, Position.create(8, 16), ast);

      // Should include common action properties
      expect(items.some(i => i.label === 'CaptionML')).toBe(true);
      expect(items.some(i => i.label === 'Image')).toBe(true);
      expect(items.some(i => i.label === 'Promoted')).toBe(true);
      expect(items.some(i => i.label === 'PromotedCategory')).toBe(true);
      expect(items.some(i => i.label === 'Enabled')).toBe(true);
      expect(items.some(i => i.label === 'Visible')).toBe(true);
    });

    it('should use Property kind for action property names', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;Action    ;

  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      const items = provider.getCompletions(doc, Position.create(8, 16), ast);

      const captionML = items.find(i => i.label === 'CaptionML');
      expect(captionML).toBeDefined();
      expect(captionML?.kind).toBe(CompletionItemKind.Property);

      const image = items.find(i => i.label === 'Image');
      expect(image).toBeDefined();
      expect(image?.kind).toBe(CompletionItemKind.Property);
    });

    it('should filter action properties by prefix', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;Action    ;
                Prom
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor after "Prom" prefix
      const items = provider.getCompletions(doc, Position.create(8, 20), ast);

      // Should include Promoted and PromotedCategory
      expect(items.some(i => i.label === 'Promoted')).toBe(true);
      expect(items.some(i => i.label === 'PromotedCategory')).toBe(true);

      // Should NOT include Image (doesn't start with "Prom")
      expect(items.some(i => i.label === 'Image')).toBe(false);
    });

    it('should offer ActionContainerType for ActionContainer', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;

  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      const items = provider.getCompletions(doc, Position.create(8, 16), ast);

      expect(items.some(i => i.label === 'ActionContainerType')).toBe(true);
    });
  });

  describe('Property Value Completion', () => {
    it('should offer Yes/No for Promoted property', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;Action    ;
                Promoted=
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor after "Promoted=" (line 8, after equals sign)
      const items = provider.getCompletions(doc, Position.create(8, 25), ast);

      expect(items.some(i => i.label === 'Yes')).toBe(true);
      expect(items.some(i => i.label === 'No')).toBe(true);
    });

    it('should use Value kind for property values', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;Action    ;
                Promoted=
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      const items = provider.getCompletions(doc, Position.create(8, 25), ast);

      const yesItem = items.find(i => i.label === 'Yes');
      expect(yesItem).toBeDefined();
      expect(yesItem?.kind).toBe(CompletionItemKind.Value);
    });

    it('should offer ActionContainerType values', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      const items = provider.getCompletions(doc, Position.create(8, 36), ast);

      expect(items.some(i => i.label === 'ActionItems')).toBe(true);
      expect(items.some(i => i.label === 'RelatedInformation')).toBe(true);
      expect(items.some(i => i.label === 'Reports')).toBe(true);
      expect(items.some(i => i.label === 'NewDocumentItems')).toBe(true);
      expect(items.some(i => i.label === 'HomeItems')).toBe(true);
      expect(items.some(i => i.label === 'ActivityButtons')).toBe(true);
    });

    it('should offer PromotedCategory values', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;Action    ;
                PromotedCategory=
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      const items = provider.getCompletions(doc, Position.create(8, 33), ast);

      expect(items.some(i => i.label === 'New')).toBe(true);
      expect(items.some(i => i.label === 'Process')).toBe(true);
      expect(items.some(i => i.label === 'Report')).toBe(true);
      expect(items.some(i => i.label === 'Category4')).toBe(true);
      expect(items.some(i => i.label === 'Category5')).toBe(true);
      expect(items.some(i => i.label === 'Category6')).toBe(true);
      expect(items.some(i => i.label === 'Category7')).toBe(true);
      expect(items.some(i => i.label === 'Category8')).toBe(true);
      expect(items.some(i => i.label === 'Category9')).toBe(true);
      expect(items.some(i => i.label === 'Category10')).toBe(true);
    });

    it('should filter property values by prefix', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;ActionContainer;
                ActionContainerType=Act
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor after "ActionContainerType=Act"
      const items = provider.getCompletions(doc, Position.create(8, 39), ast);

      expect(items.some(i => i.label === 'ActionItems')).toBe(true);
      expect(items.some(i => i.label === 'ActivityButtons')).toBe(true);

      // Should NOT include RelatedInformation (doesn't start with "Act")
      expect(items.some(i => i.label === 'RelatedInformation')).toBe(false);
    });

    it('should offer RunPageMode values', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;Action    ;
                RunPageMode=
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      const items = provider.getCompletions(doc, Position.create(8, 28), ast);

      expect(items.some(i => i.label === 'View')).toBe(true);
      expect(items.some(i => i.label === 'Edit')).toBe(true);
      expect(items.some(i => i.label === 'Create')).toBe(true);
    });
  });

  describe('Context Boundary', () => {
    it('should NOT offer action types outside ACTIONS section', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;    ;Container ;
                ContainerType=ContentArea }
  }
  CODE
  {
    BEGIN

    END.
  }
}`);

      // Cursor inside CODE section (line 13)
      const items = provider.getCompletions(doc, Position.create(13, 6), ast);

      // Should NOT include action types
      expect(items.some(i => i.label === 'ActionContainer')).toBe(false);
      expect(items.some(i => i.label === 'ActionGroup')).toBe(false);
      expect(items.some(i => i.label === 'Action')).toBe(false);
      expect(items.some(i => i.label === 'Separator')).toBe(false);
    });

    it('should NOT offer action property names outside ACTIONS section', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {

  }
  CONTROLS
  {
    { 1   ;    ;Container ;
                ContainerType=ContentArea }
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor inside PROPERTIES section (line 4)
      const items = provider.getCompletions(doc, Position.create(4, 4), ast);

      // Should NOT include action-specific properties
      expect(items.some(i => i.label === 'PromotedCategory')).toBe(false);
      expect(items.some(i => i.label === 'ActionContainerType')).toBe(false);
    });

    it('should offer normal completions when not in ACTIONS context', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
  }
  CODE
  {
    PROCEDURE TestProc();
    BEGIN
      IF

    END;
  }
}`);

      // Cursor on empty line after "IF" keyword in CODE section
      const items = provider.getCompletions(doc, Position.create(13, 6), ast);

      // Should include normal keywords
      expect(items.some(i => i.label === 'THEN')).toBe(true);
      expect(items.some(i => i.label === 'BEGIN')).toBe(true);

      // Should NOT include action types
      expect(items.some(i => i.label === 'ActionContainer')).toBe(false);
    });

    it('should distinguish ACTIONS section from CONTROLS section', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  CONTROLS
  {

  }
  ACTIONS
  {
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor inside CONTROLS section (line 7)
      const controlItems = provider.getCompletions(doc, Position.create(7, 4), ast);

      // In CONTROLS: should NOT have action types
      expect(controlItems.some(i => i.label === 'ActionContainer')).toBe(false);
      expect(controlItems.some(i => i.label === 'Action')).toBe(false);

      // In CONTROLS: should have control types (if implemented)
      // This is a boundary test - we're verifying action completion doesn't leak
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ACTIONS section', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor inside empty ACTIONS section
      const items = provider.getCompletions(doc, Position.create(6, 0), ast);

      // Should still offer action types
      expect(items.some(i => i.label === 'ActionContainer')).toBe(true);
    });

    it('should handle cursor at start of action type keyword', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  ACTIONS
  {
    { 1   ;0   ;A
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor right after "A" (line 7, column 16)
      const items = provider.getCompletions(doc, Position.create(7, 16), ast);

      expect(items.some(i => i.label === 'Action')).toBe(true);
      expect(items.some(i => i.label === 'ActionContainer')).toBe(true);
      expect(items.some(i => i.label === 'ActionGroup')).toBe(true);
    });

    it('should handle ActionList property inline actions', () => {
      const { doc, ast } = parseText(`OBJECT Page 50000 TestPage
{
  PROPERTIES
  {
  }
  CONTROLS
  {
    { 1   ;    ;Container ;
                ContainerType=ContentArea;
                ActionList=ACTIONS
                {
                  { 2 ;  ;Action ;

                }
  }
  CODE
  {
    BEGIN
    END.
  }
}`);

      // Cursor inside inline ActionList (line 12)
      const items = provider.getCompletions(doc, Position.create(12, 26), ast);

      // Should offer action properties inside inline ActionList
      expect(items.some(i => i.label === 'CaptionML')).toBe(true);
      expect(items.some(i => i.label === 'Image')).toBe(true);
    });

    it('should not crash when AST is undefined', () => {
      const doc = createDocument('OBJECT Page 50000 TestPage');

      // Call without AST
      expect(() => {
        provider.getCompletions(doc, Position.create(0, 0));
      }).not.toThrow();
    });

    it('should not crash when document is invalid', () => {
      const { doc, ast } = parseText('invalid C/AL code {{{');

      expect(() => {
        provider.getCompletions(doc, Position.create(0, 0), ast);
      }).not.toThrow();
    });
  });
});
