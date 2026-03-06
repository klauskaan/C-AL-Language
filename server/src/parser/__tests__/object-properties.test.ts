/**
 * Parser Tests - OBJECT-PROPERTIES section parsing
 *
 * Tests parsing of the OBJECT-PROPERTIES metadata section that appears
 * at the top of C/AL object declarations, containing Date, Time, Modified,
 * and Version List metadata.
 */

import { parseCode } from './parserTestHelpers';

describe('Parser - OBJECT-PROPERTIES section', () => {
  it('should return undefined objectProperties when section is absent', () => {
    const code = `OBJECT Table 18 Customer
{
  PROPERTIES
  {
  }
}`;
    const { ast } = parseCode(code);

    expect(ast.object).not.toBeNull();
    expect(ast.object?.objectProperties).toBeUndefined();
  });

  it('should parse a complete OBJECT-PROPERTIES section', () => {
    const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=24-03-19;
    Time=12:00:00;
    Modified=Yes;
    Version List=NAVW114.00,NAVDK14.00;
  }
  PROPERTIES
  {
  }
}`;
    const { ast } = parseCode(code);

    expect(ast.object).not.toBeNull();
    const op = ast.object?.objectProperties;
    expect(op).toBeDefined();
    expect(op?.date).toBe('24-03-19');
    expect(op?.time).toBe('12:00:00');
    expect(op?.modified).toBe(true);
    expect(op?.versionList).toBe('NAVW114.00,NAVDK14.00');
  });

  it('should parse partial OBJECT-PROPERTIES section (only Date and Time present)', () => {
    const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Date=24-03-19;
    Time=12:00:00;
  }
  PROPERTIES
  {
  }
}`;
    const { ast } = parseCode(code);

    const op = ast.object?.objectProperties;
    expect(op).toBeDefined();
    expect(op?.date).toBe('24-03-19');
    expect(op?.time).toBe('12:00:00');
    expect(op?.modified).toBeUndefined();
    expect(op?.versionList).toBeUndefined();
  });

  it('should handle Modified=No', () => {
    const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Modified=No;
  }
}`;
    const { ast } = parseCode(code);

    const op = ast.object?.objectProperties;
    expect(op).toBeDefined();
    expect(op?.modified).toBe(false);
  });

  it('should match keys case-insensitively', () => {
    const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    DATE=24-03-19;
    TIME=12:00:00;
    MODIFIED=Yes;
    VERSION LIST=NAVW114.00;
  }
}`;
    const { ast } = parseCode(code);

    const op = ast.object?.objectProperties;
    expect(op).toBeDefined();
    expect(op?.date).toBe('24-03-19');
    expect(op?.time).toBe('12:00:00');
    expect(op?.modified).toBe(true);
    expect(op?.versionList).toBe('NAVW114.00');
  });

  it('should handle Version List with empty value', () => {
    const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    Version List=;
  }
}`;
    const { ast } = parseCode(code);

    const op = ast.object?.objectProperties;
    expect(op).toBeDefined();
    expect(op?.versionList).toBe('');
  });

  it('should ignore unknown keys without breaking parsing', () => {
    const code = `OBJECT Table 18 Customer
{
  OBJECT-PROPERTIES
  {
    UnknownKey=foo;
    Date=24-03-19;
    AnotherUnknown=bar;
    Modified=Yes;
  }
  PROPERTIES
  {
  }
}`;
    const { ast } = parseCode(code);

    const op = ast.object?.objectProperties;
    expect(op).toBeDefined();
    expect(op?.date).toBe('24-03-19');
    expect(op?.modified).toBe(true);
    // No error from unknown keys
    expect(ast.object?.properties).toBeDefined();
  });

  it('should still parse CODE section after OBJECT-PROPERTIES', () => {
    const code = `OBJECT Codeunit 1003 Test
{
  OBJECT-PROPERTIES
  {
    Date=24-03-19;
    Time=12:00:00;
    Modified=Yes;
    Version List=NAVW114.00,NAVDK14.00;
  }
  CODE
  {
    PROCEDURE DoWork@1();
    BEGIN
    END;

    BEGIN
    END.
  }
}`;
    const { ast } = parseCode(code);

    expect(ast.object?.objectProperties?.date).toBe('24-03-19');
    expect(ast.object?.objectProperties?.modified).toBe(true);
    expect(ast.object?.code).not.toBeNull();
    expect(ast.object?.code?.procedures).toHaveLength(1);
    expect(ast.object?.code?.procedures[0].name).toBe('DoWork');
  });
});
