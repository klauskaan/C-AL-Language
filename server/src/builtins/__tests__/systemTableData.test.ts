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

  describe('SYSTEM_TABLE_NAMES name corrections', () => {
    it('should have Access Control (not Style Sheet) for table 2000000053', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000053)).toBe('Access Control');
    });
    it('should have Tenant Web Service (not NAV App Object Metadata) for table 2000000168', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000168)).toBe('Tenant Web Service');
    });
  });

  describe('SYSTEM_TABLE_NAMES new entries', () => {
    it('should have User Personalization for table 2000000073', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000073)).toBe('User Personalization');
    });
    it('should have User Metadata for table 2000000075', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000075)).toBe('User Metadata');
    });
    it('should have NAV App Installed App for table 2000000153', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000153)).toBe('NAV App Installed App');
    });
    it('should have Tenant Permission for table 2000000166', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000166)).toBe('Tenant Permission');
    });
    it('should have All Profile for table 2000000178', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000178)).toBe('All Profile');
    });
    it('should have Object Options for table 2000000196', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000196)).toBe('Object Options');
    });
    it('should have NAV App Tenant Operation for table 2000000200', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000200)).toBe('NAV App Tenant Operation');
    });
    it('should have Page Info And Fields for table 2000000204', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000204)).toBe('Page Info And Fields');
    });
  });

  describe('Windows Language table (2000000045) - new fields', () => {
    it('should have Language ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000045);
      expect(fields).toBeDefined();
      expect(fields!.get('LANGUAGE ID')).toEqual({ originalName: 'Language ID', typeName: 'Integer' });
    });
    it('should have Localization Exist field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000045);
      expect(fields!.get('LOCALIZATION EXIST')).toEqual({ originalName: 'Localization Exist', typeName: 'Boolean' });
    });
  });

  describe('Access Control table (2000000053) - new fields', () => {
    it('should have User Security ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000053);
      expect(fields).toBeDefined();
      expect(fields!.get('USER SECURITY ID')).toEqual({ originalName: 'User Security ID', typeName: 'GUID' });
    });
    it('should have App Name field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000053);
      expect(fields!.get('APP NAME')).toEqual({ originalName: 'App Name', typeName: 'Text250' });
    });
  });

  describe('User Personalization table (2000000073) - new fields', () => {
    it('should have User SID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000073);
      expect(fields).toBeDefined();
      expect(fields!.get('USER SID')).toEqual({ originalName: 'User SID', typeName: 'GUID' });
    });
    it('should have License Type field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000073);
      expect(fields!.get('LICENSE TYPE')).toEqual({ originalName: 'License Type', typeName: 'Option' });
    });
  });

  describe('User Metadata table (2000000075) - new fields', () => {
    it('should have User SID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000075);
      expect(fields).toBeDefined();
      expect(fields!.get('USER SID')).toEqual({ originalName: 'User SID', typeName: 'GUID' });
    });
    it('should have User ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000075);
      expect(fields!.get('USER ID')).toEqual({ originalName: 'User ID', typeName: 'Code50' });
    });
  });

  describe('Report Layout table (2000000150) - new fields', () => {
    it('should have App Package ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000150);
      expect(fields).toBeDefined();
      expect(fields!.get('APP PACKAGE ID')).toEqual({ originalName: 'App Package ID', typeName: 'GUID' });
    });
    it('should have Object Subtype field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000150);
      expect(fields!.get('OBJECT SUBTYPE')).toEqual({ originalName: 'Object Subtype', typeName: 'Text30' });
    });
  });

  describe('NAV App Installed App table (2000000153) - new fields', () => {
    it('should have Package ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000153);
      expect(fields).toBeDefined();
      expect(fields!.get('PACKAGE ID')).toEqual({ originalName: 'Package ID', typeName: 'GUID' });
    });
    it('should have Version Build field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000153);
      expect(fields!.get('VERSION BUILD')).toEqual({ originalName: 'Version Build', typeName: 'Integer' });
    });
  });

  describe('NAV App table (2000000160) - new fields', () => {
    it('should have Package ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000160);
      expect(fields).toBeDefined();
      expect(fields!.get('PACKAGE ID')).toEqual({ originalName: 'Package ID', typeName: 'GUID' });
    });
    it('should have Tenant ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000160);
      expect(fields!.get('TENANT ID')).toEqual({ originalName: 'Tenant ID', typeName: 'Text128' });
    });
    it('should have Scope field as Option', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000160);
      expect(fields!.get('SCOPE')).toEqual({ originalName: 'Scope', typeName: 'Option' });
    });
  });

  describe('Tenant Permission Set Rel. table (2000000165) - new fields', () => {
    it('should have App ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000165);
      expect(fields).toBeDefined();
      expect(fields!.get('APP ID')).toEqual({ originalName: 'App ID', typeName: 'GUID' });
    });
    it('should have Role ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000165);
      expect(fields!.get('ROLE ID')).toEqual({ originalName: 'Role ID', typeName: 'Code20' });
    });
  });

  describe('Tenant Permission table (2000000166) - new fields', () => {
    it('should have App ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000166);
      expect(fields).toBeDefined();
      expect(fields!.get('APP ID')).toEqual({ originalName: 'App ID', typeName: 'GUID' });
    });
    it('should have Security Filter field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000166);
      expect(fields!.get('SECURITY FILTER')).toEqual({ originalName: 'Security Filter', typeName: 'TableFilter' });
    });
  });

  describe('Membership Entitlement table (2000000167) - new fields', () => {
    it('should have Role ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000167);
      expect(fields).toBeDefined();
      expect(fields!.get('ROLE ID')).toEqual({ originalName: 'Role ID', typeName: 'Code20' });
    });
    it('should have Scope field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000167);
      expect(fields!.get('SCOPE')).toEqual({ originalName: 'Scope', typeName: 'Option' });
    });
  });

  describe('Tenant Web Service table (2000000168) - new fields', () => {
    it('should have Object Type field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000168);
      expect(fields).toBeDefined();
      expect(fields!.get('OBJECT TYPE')).toEqual({ originalName: 'Object Type', typeName: 'Option' });
    });
    it('should have Published field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000168);
      expect(fields!.get('PUBLISHED')).toEqual({ originalName: 'Published', typeName: 'Boolean' });
    });
  });

  describe('All Profile table (2000000178) - new fields', () => {
    it('should have Profile ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000178);
      expect(fields).toBeDefined();
      expect(fields!.get('PROFILE ID')).toEqual({ originalName: 'Profile ID', typeName: 'Code30' });
    });
    it('should have Page Notebook field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000178);
      expect(fields!.get('PAGE NOTEBOOK')).toEqual({ originalName: 'Page Notebook', typeName: 'Text250' });
    });
  });

  describe('Object Options table (2000000196) - new fields', () => {
    it('should have Parameter Name field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000196);
      expect(fields).toBeDefined();
      expect(fields!.get('PARAMETER NAME')).toEqual({ originalName: 'Parameter Name', typeName: 'Text250' });
    });
    it('should have Option Data field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000196);
      expect(fields!.get('OPTION DATA')).toEqual({ originalName: 'Option Data', typeName: 'BLOB' });
    });
  });

  describe('NAV App Tenant Operation table (2000000200) - new fields', () => {
    it('should have Operation ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000200);
      expect(fields).toBeDefined();
      expect(fields!.get('OPERATION ID')).toEqual({ originalName: 'Operation ID', typeName: 'GUID' });
    });
    it('should have Details field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000200);
      expect(fields!.get('DETAILS')).toEqual({ originalName: 'Details', typeName: 'BLOB' });
    });
  });

  describe('Page Info And Fields table (2000000204) - new fields', () => {
    it('should have Page ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000204);
      expect(fields).toBeDefined();
      expect(fields!.get('PAGE ID')).toEqual({ originalName: 'Page ID', typeName: 'Integer' });
    });
    it('should have Field Filter Type field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000204);
      expect(fields!.get('FIELD FILTER TYPE')).toEqual({ originalName: 'Field Filter Type', typeName: 'Text80' });
    });
  });

  describe('Windows Language table (2000000045) - missing fields from #673', () => {
    it('should have Abbreviated Name field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000045);
      expect(fields).toBeDefined();
      expect(fields!.get('ABBREVIATED NAME')).toEqual({ originalName: 'Abbreviated Name', typeName: 'Text3' });
    });
  });

  describe('User Personalization table (2000000073) - missing fields from #673', () => {
    it('should have Debugger Break On Error field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000073);
      expect(fields).toBeDefined();
      expect(fields!.get('DEBUGGER BREAK ON ERROR')).toEqual({ originalName: 'Debugger Break On Error', typeName: 'Boolean' });
    });
    it('should have Debugger Break On Rec Changes field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000073);
      expect(fields).toBeDefined();
      expect(fields!.get('DEBUGGER BREAK ON REC CHANGES')).toEqual({ originalName: 'Debugger Break On Rec Changes', typeName: 'Boolean' });
    });
    it('should have Debugger Skip System Triggers field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000073);
      expect(fields).toBeDefined();
      expect(fields!.get('DEBUGGER SKIP SYSTEM TRIGGERS')).toEqual({ originalName: 'Debugger Skip System Triggers', typeName: 'Boolean' });
    });
  });

  describe('Report Layout table (2000000150) - missing fields from #673', () => {
    it('should have User AL Code field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000150);
      expect(fields).toBeDefined();
      expect(fields!.get('USER AL CODE')).toEqual({ originalName: 'User AL Code', typeName: 'BLOB' });
    });
  });

  describe('Tenant Permission Set Rel. table (2000000165) - missing fields from #673', () => {
    it('should have Name field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000165);
      expect(fields).toBeDefined();
      expect(fields!.get('NAME')).toEqual({ originalName: 'Name', typeName: 'Text30' });
    });
  });
});
