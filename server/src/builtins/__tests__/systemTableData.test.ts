/**
 * Tests for systemTableData module
 *
 * Validates the NAV system/virtual table definitions pre-seeded into WorkspaceIndex
 * to eliminate false-positive undefined-identifier warnings on system table references.
 *
 * These tests FAIL before implementation because the module does not exist yet.
 */

import { SYSTEM_TABLE_FIELDS, SYSTEM_TABLE_NAMES } from '../systemTableData';

describe('systemTableData - SYSTEM_TABLE_NAMES', () => {
  it('should export SYSTEM_TABLE_NAMES as a Map', () => {
    expect(SYSTEM_TABLE_NAMES).toBeInstanceOf(Map);
  });

  it('should have all table IDs >= 2,000,000,000', () => {
    for (const id of SYSTEM_TABLE_NAMES.keys()) {
      expect(id).toBeGreaterThanOrEqual(2_000_000_000);
    }
  });

  it('should have no duplicate table IDs in SYSTEM_TABLE_NAMES', () => {
    const ids = Array.from(SYSTEM_TABLE_NAMES.keys());
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should contain Integer table (2000000026)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000026)).toBe(true);
  });

  it('should contain Date table (2000000007)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000007)).toBe(true);
  });

  it('should contain Field table (2000000041)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000041)).toBe(true);
  });

  it('should contain AllObjWithCaption table (2000000058)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000058)).toBe(true);
  });

  it('should contain User table (2000000120)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000120)).toBe(true);
  });

  it('should contain AllObj table (2000000038)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000038)).toBe(true);
  });

  it('should contain all IDs that are present in SYSTEM_TABLE_FIELDS', () => {
    for (const id of SYSTEM_TABLE_FIELDS.keys()) {
      expect(SYSTEM_TABLE_NAMES.has(id)).toBe(true);
    }
  });
});

describe('systemTableData - SYSTEM_TABLE_FIELDS', () => {
  it('should export SYSTEM_TABLE_FIELDS as a Map', () => {
    expect(SYSTEM_TABLE_FIELDS).toBeInstanceOf(Map);
  });

  it('should have all table IDs >= 2,000,000,000', () => {
    for (const id of SYSTEM_TABLE_FIELDS.keys()) {
      expect(id).toBeGreaterThanOrEqual(2_000_000_000);
    }
  });

  it('should have no duplicate table IDs in SYSTEM_TABLE_FIELDS', () => {
    const ids = Array.from(SYSTEM_TABLE_FIELDS.keys());
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have inner Maps with uppercase field keys (matching workspaceIndex convention)', () => {
    for (const [, fields] of SYSTEM_TABLE_FIELDS) {
      for (const key of fields.keys()) {
        expect(key).toBe(key.toUpperCase());
      }
    }
  });

  it('should have FieldInfo values with non-empty originalName and typeName strings', () => {
    for (const [, fields] of SYSTEM_TABLE_FIELDS) {
      for (const [, fieldInfo] of fields) {
        expect(typeof fieldInfo.originalName).toBe('string');
        expect(typeof fieldInfo.typeName).toBe('string');
        expect(fieldInfo.originalName.length).toBeGreaterThan(0);
        expect(fieldInfo.typeName.length).toBeGreaterThan(0);
      }
    }
  });

  describe('Integer table (2000000026)', () => {
    it('should be present in SYSTEM_TABLE_FIELDS', () => {
      expect(SYSTEM_TABLE_FIELDS.has(2000000026)).toBe(true);
    });

    it('should have a Number field with uppercase key', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000026);
      expect(fields).toBeDefined();
      expect(fields!.has('NUMBER')).toBe(true);
    });

    it('should have Number field with correct originalName', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000026);
      const numberField = fields!.get('NUMBER');
      expect(numberField).toBeDefined();
      expect(numberField!.originalName).toBe('Number');
    });
  });

  describe('Date table (2000000007)', () => {
    it('should be present in SYSTEM_TABLE_FIELDS', () => {
      expect(SYSTEM_TABLE_FIELDS.has(2000000007)).toBe(true);
    });

    it('should have a Period Start field with uppercase key', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000007);
      expect(fields).toBeDefined();
      expect(fields!.has('PERIOD START')).toBe(true);
    });

    it('should have a Period End field with uppercase key', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000007);
      expect(fields).toBeDefined();
      expect(fields!.has('PERIOD END')).toBe(true);
    });

    it('should have Period Start with correct originalName', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000007);
      const periodStart = fields!.get('PERIOD START');
      expect(periodStart).toBeDefined();
      expect(periodStart!.originalName).toBe('Period Start');
    });

    it('should have Period End with correct originalName', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000007);
      const periodEnd = fields!.get('PERIOD END');
      expect(periodEnd).toBeDefined();
      expect(periodEnd!.originalName).toBe('Period End');
    });
  });

  describe('Field table (2000000041) - missing fields', () => {
    it('should have Field Caption field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000041);
      expect(fields).toBeDefined();
      expect(fields!.get('FIELD CAPTION')).toEqual({ originalName: 'Field Caption', typeName: 'Text80' });
    });
  });

  describe('User table (2000000120) - missing fields', () => {
    it('should have Contact Email field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000120);
      expect(fields).toBeDefined();
      expect(fields!.get('CONTACT EMAIL')).toEqual({ originalName: 'Contact Email', typeName: 'Text250' });
    });

    it('should have Application ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000120);
      expect(fields).toBeDefined();
      expect(fields!.get('APPLICATION ID')).toEqual({ originalName: 'Application ID', typeName: 'GUID' });
    });
  });

  describe('Table Metadata table (2000000136) - missing fields', () => {
    it('should have TableType field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000136);
      expect(fields).toBeDefined();
      expect(fields!.get('TABLETYPE')).toEqual({ originalName: 'TableType', typeName: 'Option' });
    });

    it('should have DataIsExternal field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000136);
      expect(fields).toBeDefined();
      expect(fields!.get('DATAISEXTERNAL')).toEqual({ originalName: 'DataIsExternal', typeName: 'Boolean' });
    });
  });

  describe('Permission table (2000000005) - missing fields', () => {
    it('should have Role Name field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000005);
      expect(fields).toBeDefined();
      expect(fields!.get('ROLE NAME')).toEqual({ originalName: 'Role Name', typeName: 'Text30' });
    });

    it('should have Object Name field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000005);
      expect(fields).toBeDefined();
      expect(fields!.get('OBJECT NAME')).toEqual({ originalName: 'Object Name', typeName: 'Text249' });
    });
  });

  describe('AllObj table (2000000038) - missing fields', () => {
    it('should have App Package ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000038);
      expect(fields).toBeDefined();
      expect(fields!.get('APP PACKAGE ID')).toEqual({ originalName: 'App Package ID', typeName: 'GUID' });
    });
  });

  describe('Page Metadata table (2000000138) - missing fields', () => {
    it('should have CardPageID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000138);
      expect(fields).toBeDefined();
      expect(fields!.get('CARDPAGEID')).toEqual({ originalName: 'CardPageID', typeName: 'Integer' });
    });

    it('should have SourceTable field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000138);
      expect(fields).toBeDefined();
      expect(fields!.get('SOURCETABLE')).toEqual({ originalName: 'SourceTable', typeName: 'Integer' });
    });

    it('should have SourceTableTemporary field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000138);
      expect(fields).toBeDefined();
      expect(fields!.get('SOURCETABLETEMPORARY')).toEqual({ originalName: 'SourceTableTemporary', typeName: 'Boolean' });
    });
  });

  describe('Company table (2000000006) - missing fields', () => {
    it('should have Business Profile Id field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000006);
      expect(fields).toBeDefined();
      expect(fields!.get('BUSINESS PROFILE ID')).toEqual({ originalName: 'Business Profile Id', typeName: 'Text250' });
    });

    it('should have Id field with GUID type', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000006);
      expect(fields).toBeDefined();
      expect(fields!.get('ID')).toEqual({ originalName: 'Id', typeName: 'GUID' });
    });
  });

  describe('Object table (2000000001) - missing fields', () => {
    it('should have Caption field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000001);
      expect(fields).toBeDefined();
      expect(fields!.get('CAPTION')).toEqual({ originalName: 'Caption', typeName: 'Text250' });
    });
  });

  describe('AllObjWithCaption table (2000000058) - missing fields', () => {
    it('should have App Package ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000058);
      expect(fields).toBeDefined();
      expect(fields!.get('APP PACKAGE ID')).toEqual({ originalName: 'App Package ID', typeName: 'GUID' });
    });
  });

  describe('User table (2000000120) - missing fields', () => {
    it('should have Exchange Identifier field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000120);
      expect(fields).toBeDefined();
      expect(fields!.get('EXCHANGE IDENTIFIER')).toEqual({ originalName: 'Exchange Identifier', typeName: 'Text250' });
    });
  });
});
