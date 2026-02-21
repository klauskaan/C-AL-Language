/**
 * Tests for XMLport EVENTS section handling (Issue #510)
 *
 * XMLport objects have an EVENTS section between ELEMENTS and REQUESTPAGE:
 * ```
 * OBJECT XMLport 50000 "Test XMLport"
 * {
 *   PROPERTIES { ... }
 *   ELEMENTS   { ... }
 *   EVENTS     { ... }     <- not recognized as keyword in tokens.ts
 *   REQUESTPAGE { ... }    <- never reached when EVENTS breaks the parse loop
 *   CODE        { ... }    <- silently dropped, ast.object.code === null
 * }
 * ```
 *
 * Root cause:
 * - `Events` type is not in the TokenType enum or keyword map (tokens.ts)
 * - EVENTS tokenizes as TokenType.Identifier
 * - parseObject main loop hits `else { break; }` for unrecognized tokens
 * - REQUESTPAGE and CODE are silently dropped
 *
 * Fixes required:
 * - Add `Events = 'EVENTS'` to TokenType enum in tokens.ts
 * - Add `['events', TokenType.Events]` to the keyword map in tokens.ts
 * - Add `TokenType.Events` to UNSUPPORTED_SECTIONS in parser.ts
 */

import { TokenType } from '../../lexer/tokens';
import { ObjectDeclaration } from '../ast';
import { parseCode, tokenize } from './parserTestHelpers';

describe('XMLport EVENTS section', () => {
  describe('Lexer - EVENTS keyword tokenization', () => {
    it('should tokenize EVENTS as TokenType.Events, not Identifier', () => {
      const tokens = tokenize('EVENTS');

      expect(tokens[0].type).toBe(TokenType.Events);
      expect(tokens[0].value).toBe('EVENTS');
    });

    it('should tokenize events in lowercase', () => {
      const tokens = tokenize('events');

      expect(tokens[0].type).toBe(TokenType.Events);
      expect(tokens[0].value).toBe('events');
    });

    it('should tokenize Events in mixed case', () => {
      const tokens = tokenize('Events');

      expect(tokens[0].type).toBe(TokenType.Events);
      expect(tokens[0].value).toBe('Events');
    });
  });

  describe('Parser - XMLport with EVENTS section', () => {
    it('should parse CODE section after skipping EVENTS section', () => {
      const code = `OBJECT XMLport 50000 "Test XMLport"
{
  PROPERTIES
  {
  }
  ELEMENTS
  {
  }
  EVENTS
  {
  }
  REQUESTPAGE
  {
    PROPERTIES
    {
    }
    CONTROLS
    {
    }
  }
  CODE
  {
    VAR
      ExportCount@1000 : Integer;

    PROCEDURE DoExport@1();
    BEGIN
      ExportCount := ExportCount + 1;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);
      const obj = ast.object as ObjectDeclaration;

      expect(errors).toHaveLength(0);
      expect(obj.code).not.toBeNull();
      expect(obj.code?.variables).toHaveLength(1);
      expect(obj.code?.variables?.[0].name).toBe('ExportCount');
      expect(obj.code?.procedures).toHaveLength(1);
      expect(obj.code?.procedures?.[0].name).toBe('DoExport');
    });

    it('should parse CODE section after skipping EVENTS section with content', () => {
      const code = `OBJECT XMLport 50001 "Test XMLport With Events"
{
  PROPERTIES
  {
    CaptionML=ENU=Test XMLport With Events;
  }
  ELEMENTS
  {
  }
  EVENTS
  {
    { 1 ;OnBeforeXMLImport ;
                            EventType=XMLport }
  }
  CODE
  {
    VAR
      ImportCount@1000 : Integer;

    BEGIN
    END.
  }
}`;
      const { ast } = parseCode(code);
      const obj = ast.object as ObjectDeclaration;

      expect(obj.code).not.toBeNull();
      expect(obj.code?.variables).toHaveLength(1);
      expect(obj.code?.variables?.[0].name).toBe('ImportCount');
    });

    it('should parse XMLport without EVENTS section (regression guard)', () => {
      const code = `OBJECT XMLport 50002 "Test XMLport No Events"
{
  PROPERTIES
  {
  }
  ELEMENTS
  {
  }
  CODE
  {
    VAR
      RecordCount@1000 : Integer;

    PROCEDURE CountRecords@1();
    BEGIN
      RecordCount := RecordCount + 1;
    END;

    BEGIN
    END.
  }
}`;
      const { ast, errors } = parseCode(code);
      const obj = ast.object as ObjectDeclaration;

      expect(errors).toHaveLength(0);
      expect(obj.code).not.toBeNull();
      expect(obj.code?.variables).toHaveLength(1);
      expect(obj.code?.variables?.[0].name).toBe('RecordCount');
      expect(obj.code?.procedures).toHaveLength(1);
      expect(obj.code?.procedures?.[0].name).toBe('CountRecords');
    });
  });
});
