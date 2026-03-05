/**
 * Tests for systemTableData module
 *
 * Validates the NAV system/virtual table definitions pre-seeded into WorkspaceIndex
 * to eliminate false-positive undefined-identifier warnings on system table references.
 *
 */

import { SYSTEM_TABLE_FIELDS, SYSTEM_TABLE_NAMES } from '../systemTableData';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('systemTableData - SYSTEM_TABLE_NAMES', () => {
  it('should export SYSTEM_TABLE_NAMES as a Map', () => {
    expect(SYSTEM_TABLE_NAMES).toBeInstanceOf(Map);
  });

  it('should have all table IDs >= 2,000,000,000', () => {
    for (const id of SYSTEM_TABLE_NAMES.keys()) {
      expect(id).toBeGreaterThanOrEqual(2_000_000_000);
    }
  });

  it('should have no duplicate table IDs in SYSTEM_TABLE_NAMES (source-level check)', () => {
    // Map construction silently deduplicates — check the raw source before construction
    const src = readFileSync(join(__dirname, '../systemTableData.ts'), 'utf8');
    const ids = [...src.matchAll(/^\s+\[(\d+),\s*'[^']+'/gm)].map(m => Number(m[1]));
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
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

  it('should name table 2000000119 as NAV App (intentional duplicate — both are correct BC14 names)', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000119)).toBe('NAV App');
  });

  it('should name table 2000000160 as NAV App (primary extension metadata table, confirmed by field analysis)', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000160)).toBe('NAV App');
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

  it('should have no duplicate table IDs in SYSTEM_TABLE_FIELDS (source-level check)', () => {
    // Map construction silently deduplicates — check the raw source before construction
    const src = readFileSync(join(__dirname, '../systemTableData.ts'), 'utf8');
    const ids = [...src.matchAll(/^\s+\[(\d+),\s*new Map/gm)].map(m => Number(m[1]));
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
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
      expect(fields!.size).toBe(1);
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
      expect(fields!.size).toBe(5);
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
      expect(fields!.size).toBe(17);
      expect(fields!.get('FIELD CAPTION')).toEqual({ originalName: 'Field Caption', typeName: 'Text80' });
    });
  });

  describe('User table (2000000120) - missing fields', () => {
    it('should have Contact Email field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000120);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(12);
      expect(fields!.get('CONTACT EMAIL')).toEqual({ originalName: 'Contact Email', typeName: 'Text250' });
    });

    it('should have Application ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000120);
      expect(fields).toBeDefined();
      expect(fields!.get('APPLICATION ID')).toEqual({ originalName: 'Application ID', typeName: 'GUID' });
    });

    it('should have Exchange Identifier field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000120);
      expect(fields).toBeDefined();
      expect(fields!.get('EXCHANGE IDENTIFIER')).toEqual({ originalName: 'Exchange Identifier', typeName: 'Text250' });
    });
  });

  describe('Table Metadata table (2000000136) - missing fields', () => {
    it('should have TableType field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000136);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(12);
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
      expect(fields!.size).toBe(11);
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
      expect(fields!.size).toBe(4);
      expect(fields!.get('APP PACKAGE ID')).toEqual({ originalName: 'App Package ID', typeName: 'GUID' });
    });
  });

  describe('Page Metadata table (2000000138) - missing fields', () => {
    it('should have CardPageID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000138);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(7);
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
      expect(fields!.size).toBe(5);
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
      expect(fields!.size).toBe(14);
      expect(fields!.get('CAPTION')).toEqual({ originalName: 'Caption', typeName: 'Text250' });
    });
  });

  describe('AllObjWithCaption table (2000000058) - missing fields', () => {
    it('should have App Package ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000058);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(6);
      expect(fields!.get('APP PACKAGE ID')).toEqual({ originalName: 'App Package ID', typeName: 'GUID' });
    });
  });

  describe('SYSTEM_TABLE_NAMES name corrections', () => {
    it('should have Access Control (not Style Sheet) for table 2000000053', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000053)).toBe('Access Control');
    });
    it('should have Tenant Web Service (not NAV App Object Metadata) for table 2000000168', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000168)).toBe('Tenant Web Service');
    });
    it('should have Profile (not Signal) for table 2000000072', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000072)).toBe('Profile');
    });
    it('should have NAV App Tenant App (not Object Metadata) for table 2000000151', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000151)).toBe('NAV App Tenant App');
    });
    it('should have Tenant Permission Set (not Tenant Permission Set Rel.) for table 2000000165', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000165)).toBe('Tenant Permission Set');
    });
    it('should have Aggregate Permission Set (not Membership Entitlement) for table 2000000167', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000167)).toBe('Aggregate Permission Set');
    });
  });

  describe('SYSTEM_TABLE_NAMES new entries', () => {
    it('should have User Personalization for table 2000000073', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000073)).toBe('User Personalization');
    });
    it('should have Code Coverage for table 2000000049', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000049)).toBe('Code Coverage');
    });
    it('should have Object Metadata for table 2000000071', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000071)).toBe('Object Metadata');
    });
    it('should have Profile Metadata for table 2000000074', () => {
      expect(SYSTEM_TABLE_NAMES.get(2000000074)).toBe('Profile Metadata');
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
      expect(fields!.size).toBe(5);
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
      expect(fields!.size).toBe(7);
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
      expect(fields!.size).toBe(13);
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
      expect(fields!.size).toBe(6);
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
      expect(fields!.size).toBe(5);
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
      expect(fields!.size).toBe(6);
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
      expect(fields!.size).toBe(20);
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

  describe('Tenant Permission Set table (2000000165) - new fields', () => {
    it('should have App ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000165);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(3);
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
      expect(fields!.size).toBe(11);
      expect(fields!.get('APP ID')).toEqual({ originalName: 'App ID', typeName: 'GUID' });
    });
    it('should have Security Filter field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000166);
      expect(fields!.get('SECURITY FILTER')).toEqual({ originalName: 'Security Filter', typeName: 'TableFilter' });
    });
  });

  describe('Aggregate Permission Set table (2000000167) - new fields', () => {
    it('should have Role ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000167);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(5);
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
      expect(fields!.size).toBe(4);
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
      expect(fields!.size).toBe(12);
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
      expect(fields!.size).toBe(8);
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
      expect(fields!.size).toBe(6);
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
      expect(fields!.size).toBe(12);
      expect(fields!.get('PAGE ID')).toEqual({ originalName: 'Page ID', typeName: 'Integer' });
    });
    it('should have Field Filter Type field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000204);
      expect(fields!.get('FIELD FILTER TYPE')).toEqual({ originalName: 'Field Filter Type', typeName: 'Text80' });
    });
  });

  describe('Key table (2000000063)', () => {
    it('should have correct field count', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000063);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(11);
    });
  });

  describe('Session table (2000000009)', () => {
    it('should have correct field count', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000009);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(10);
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

  describe('Tenant Permission Set table (2000000165) - missing fields from #673', () => {
    it('should have Name field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000165);
      expect(fields).toBeDefined();
      expect(fields!.get('NAME')).toEqual({ originalName: 'Name', typeName: 'Text30' });
    });
  });

  describe('Permission Set table (2000000004) - new fields', () => {
    it('should have correct field count', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000004);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(3);
    });
    it('should have Role ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000004);
      expect(fields!.get('ROLE ID')).toEqual({ originalName: 'Role ID', typeName: 'Code20' });
    });
    it('should have Name field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000004);
      expect(fields!.get('NAME')).toEqual({ originalName: 'Name', typeName: 'Text30' });
    });
    it('should have Hash field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000004);
      expect(fields!.get('HASH')).toEqual({ originalName: 'Hash', typeName: 'Text250' });
    });
  });

  describe('Code Coverage table (2000000049) - new fields', () => {
    it('should have correct field count', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000049);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(6);
    });
    it('should have Line Type field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000049);
      expect(fields!.get('LINE TYPE')).toEqual({ originalName: 'Line Type', typeName: 'Option' });
    });
    it('should have Line field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000049);
      expect(fields!.get('LINE')).toEqual({ originalName: 'Line', typeName: 'Text1024' });
    });
  });

  describe('Profile table (2000000072) - new fields', () => {
    it('should have correct field count', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000072);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(4);
    });
    it('should have Profile ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000072);
      expect(fields!.get('PROFILE ID')).toEqual({ originalName: 'Profile ID', typeName: 'Code30' });
    });
    it('should have Default Role Center field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000072);
      expect(fields!.get('DEFAULT ROLE CENTER')).toEqual({ originalName: 'Default Role Center', typeName: 'Boolean' });
    });
  });

  describe('Profile Metadata table (2000000074) - new fields', () => {
    it('should have correct field count', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000074);
      expect(fields).toBeDefined();
      expect(fields!.size).toBe(7);
    });
    it('should have Profile ID field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000074);
      expect(fields!.get('PROFILE ID')).toEqual({ originalName: 'Profile ID', typeName: 'Code30' });
    });
    it('should have Page Metadata Delta field', () => {
      const fields = SYSTEM_TABLE_FIELDS.get(2000000074);
      expect(fields!.get('PAGE METADATA DELTA')).toEqual({ originalName: 'Page Metadata Delta', typeName: 'BLOB' });
    });
  });
});

describe('SYSTEM_TABLE_NAMES new entries from #680', () => {
  it('should have Intelligent Cloud for table 2000000146', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000146)).toBe('Intelligent Cloud');
  });

  it('should have Membership Entitlement for table 2000000195', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000195)).toBe('Membership Entitlement');
  });
});

describe('Intelligent Cloud table (2000000146) - new fields from #680', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000146)).toBe(true);
  });

  it('should have Enabled field with Boolean type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000146);
    expect(fields).toBeDefined();
    expect(fields!.get('ENABLED')).toEqual({ originalName: 'Enabled', typeName: 'Boolean' });
  });

  it('should have correct field count of 1', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000146);
    expect(fields).toBeDefined();
    expect(fields!.size).toBe(1);
  });
});

describe('Membership Entitlement table (2000000195) - new fields from #681', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000195)).toBe(true);
  });

  it('should have Type field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000195);
    expect(fields).toBeDefined();
    expect(fields!.get('TYPE')).toEqual({ originalName: 'Type', typeName: 'Option' });
  });

  it('should have ID field with Text250 type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000195);
    expect(fields).toBeDefined();
    expect(fields!.get('ID')).toEqual({ originalName: 'ID', typeName: 'Text250' });
  });

  it('should have correct field count of 2', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000195);
    expect(fields).toBeDefined();
    expect(fields!.size).toBe(2);
  });
});

// ─── Tests for 18 missing system tables (issue #684) ─────────────────────────

describe('SYSTEM_TABLE_NAMES new entries from #684', () => {
  it('should contain AllObj variant table (2000000039)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000039)).toBe(true);
  });

  it('should name table 2000000039 as AllObj', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000039)).toBe('AllObj');
  });

  it('should contain Send-To Program table (2000000065)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000065)).toBe(true);
  });

  it('should name table 2000000065 as Send-To Program', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000065)).toBe('Send-To Program');
  });

  it('should contain Style Sheet table (2000000066)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000066)).toBe(true);
  });

  it('should name table 2000000066 as Style Sheet', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000066)).toBe('Style Sheet');
  });

  it('should contain Control Add-in table (2000000069)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000069)).toBe(true);
  });

  it('should name table 2000000069 as Control Add-in', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000069)).toBe('Control Add-in');
  });

  it('should contain Chart table (2000000078)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000078)).toBe(true);
  });

  it('should name table 2000000078 as Chart', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000078)).toBe('Chart');
  });

  it('should contain Debugger Breakpoint table (2000000100)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000100)).toBe(true);
  });

  it('should name table 2000000100 as Debugger Breakpoint', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000100)).toBe('Debugger Breakpoint');
  });

  it('should contain Debugger Call Stack table (2000000101)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000101)).toBe(true);
  });

  it('should name table 2000000101 as Debugger Call Stack', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000101)).toBe('Debugger Call Stack');
  });

  it('should contain Active Session table (2000000110)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000110)).toBe(true);
  });

  it('should name table 2000000110 as Active Session', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000110)).toBe('Active Session');
  });

  it('should contain Server Instance table (2000000114)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000114)).toBe(true);
  });

  it('should name table 2000000114 as Server Instance', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000114)).toBe('Server Instance');
  });

  it('should contain Object Metadata table (2000000137)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000137)).toBe(true);
  });

  it('should name table 2000000137 as Object Metadata', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000137)).toBe('Object Metadata');
  });

  it('should contain Event Subscription table (2000000140)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000140)).toBe(true);
  });

  it('should name table 2000000140 as Event Subscription', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000140)).toBe('Event Subscription');
  });

  it('should contain Data Sensitivity table (2000000159)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000159)).toBe(true);
  });

  it('should name table 2000000159 as Data Sensitivity', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000159)).toBe('Data Sensitivity');
  });

  it('should contain Application Language table (2000000170)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000170)).toBe(true);
  });

  it('should name table 2000000170 as Application Language', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000170)).toBe('Application Language');
  });

  it('should contain Designer Page Action table (2000000171)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000171)).toBe(true);
  });

  it('should name table 2000000171 as Designer Page Action', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000171)).toBe('Designer Page Action');
  });

  it('should contain Designer Field Group table (2000000172)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000172)).toBe(true);
  });

  it('should name table 2000000172 as Designer Field Group', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000172)).toBe('Designer Field Group');
  });

  it('should contain OData Edm Type table (2000000179)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000179)).toBe(true);
  });

  it('should name table 2000000179 as OData Edm Type', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000179)).toBe('OData Edm Type');
  });

  it('should contain API Webhook Notification table (2000000194)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000194)).toBe(true);
  });

  it('should name table 2000000194 as API Webhook Notification', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000194)).toBe('API Webhook Notification');
  });

  it('should contain Extension Deployment Status table (2000000201)', () => {
    expect(SYSTEM_TABLE_NAMES.has(2000000201)).toBe(true);
  });

  it('should name table 2000000201 as Extension Deployment Status', () => {
    expect(SYSTEM_TABLE_NAMES.get(2000000201)).toBe('Extension Deployment Status');
  });
});

describe('AllObj variant table (2000000039) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000039)).toBe(true);
  });

  it('should have ID field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000039);
    expect(fields).toBeDefined();
    expect(fields!.get('ID')).toEqual({ originalName: 'ID', typeName: 'Text250' });
  });

  it('should have correct field count of 1', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000039);
    expect(fields).toBeDefined();
    expect(fields!.size).toBe(1);
  });
});

describe('Send-To Program table (2000000065) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000065)).toBe(true);
  });

  it('should have Program ID field with GUID type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000065);
    expect(fields).toBeDefined();
    expect(fields!.get('PROGRAM ID')).toEqual({ originalName: 'Program ID', typeName: 'GUID' });
  });

  it('should have Executable field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000065);
    expect(fields).toBeDefined();
    expect(fields!.get('EXECUTABLE')).toEqual({ originalName: 'Executable', typeName: 'Text250' });
  });

  it('should have Name field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000065);
    expect(fields).toBeDefined();
    expect(fields!.get('NAME')).toEqual({ originalName: 'Name', typeName: 'Text250' });
  });

  it('should have Parameter field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000065);
    expect(fields).toBeDefined();
    expect(fields!.get('PARAMETER')).toEqual({ originalName: 'Parameter', typeName: 'Text250' });
  });

  it('should have correct field count of 4', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000065);
    expect(fields).toBeDefined();
    expect(fields!.size).toBe(4);
  });
});

describe('Style Sheet table (2000000066) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000066)).toBe(true);
  });

  it('should have Object Type field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000066);
    expect(fields).toBeDefined();
    expect(fields!.get('OBJECT TYPE')).toEqual({ originalName: 'Object Type', typeName: 'Option' });
  });

  it('should have Object ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000066);
    expect(fields).toBeDefined();
    expect(fields!.get('OBJECT ID')).toEqual({ originalName: 'Object ID', typeName: 'Integer' });
  });

  it('should have Program ID field with GUID type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000066);
    expect(fields).toBeDefined();
    expect(fields!.get('PROGRAM ID')).toEqual({ originalName: 'Program ID', typeName: 'GUID' });
  });

  it('should have Name field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000066);
    expect(fields).toBeDefined();
    expect(fields!.get('NAME')).toEqual({ originalName: 'Name', typeName: 'Text250' });
  });

  it('should have Style Sheet field with BLOB type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000066);
    expect(fields).toBeDefined();
    expect(fields!.get('STYLE SHEET')).toEqual({ originalName: 'Style Sheet', typeName: 'BLOB' });
  });

  it('should have Date field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000066);
    expect(fields).toBeDefined();
    expect(fields!.get('DATE')).toEqual({ originalName: 'Date', typeName: 'Date' });
  });

  it('should have correct field count of 6', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000066);
    expect(fields).toBeDefined();
    expect(fields!.size).toBe(6);
  });
});

describe('Control Add-in table (2000000069) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000069)).toBe(true);
  });

  it('should have Add-in Name field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000069);
    expect(fields).toBeDefined();
    expect(fields!.get('ADD-IN NAME')).toBeDefined();
    expect(fields!.get('ADD-IN NAME')!.originalName).toBe('Add-in Name');
  });

  it('should have Public Key Token field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000069);
    expect(fields).toBeDefined();
    expect(fields!.get('PUBLIC KEY TOKEN')).toBeDefined();
    expect(fields!.get('PUBLIC KEY TOKEN')!.originalName).toBe('Public Key Token');
  });

  it('should have Version field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000069);
    expect(fields).toBeDefined();
    expect(fields!.get('VERSION')).toBeDefined();
    expect(fields!.get('VERSION')!.originalName).toBe('Version');
  });

  it('should have Category field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000069);
    expect(fields).toBeDefined();
    expect(fields!.get('CATEGORY')).toEqual({ originalName: 'Category', typeName: 'Option' });
  });

  it('should have Description field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000069);
    expect(fields).toBeDefined();
    expect(fields!.get('DESCRIPTION')).toEqual({ originalName: 'Description', typeName: 'Text250' });
  });

  it('should have Resource field with BLOB type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000069);
    expect(fields).toBeDefined();
    expect(fields!.get('RESOURCE')).toEqual({ originalName: 'Resource', typeName: 'BLOB' });
  });

  it('should have correct field count of 6', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000069);
    expect(fields).toBeDefined();
    expect(fields!.size).toBe(6);
  });
});

describe('Chart table (2000000078) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000078)).toBe(true);
  });

  it('should have ID field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000078);
    expect(fields).toBeDefined();
    expect(fields!.get('ID')).toEqual({ originalName: 'ID', typeName: 'Code20' });
  });

  it('should have Name field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000078);
    expect(fields).toBeDefined();
    expect(fields!.get('NAME')).toEqual({ originalName: 'Name', typeName: 'Text30' });
  });

  it('should have BLOB field with BLOB type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000078);
    expect(fields).toBeDefined();
    expect(fields!.get('BLOB')).toEqual({ originalName: 'BLOB', typeName: 'BLOB' });
  });

  it('should have at least 3 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000078);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(3);
  });
});

describe('Debugger Breakpoint table (2000000100) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000100)).toBe(true);
  });

  it('should have Object Type field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000100);
    expect(fields).toBeDefined();
    expect(fields!.get('OBJECT TYPE')).toEqual({ originalName: 'Object Type', typeName: 'Option' });
  });

  it('should have Object ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000100);
    expect(fields).toBeDefined();
    expect(fields!.get('OBJECT ID')).toEqual({ originalName: 'Object ID', typeName: 'Integer' });
  });

  it('should have Line No. field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000100);
    expect(fields).toBeDefined();
    expect(fields!.get('LINE NO.')).toEqual({ originalName: 'Line No.', typeName: 'Integer' });
  });

  it('should have Condition field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000100);
    expect(fields).toBeDefined();
    expect(fields!.get('CONDITION')).toEqual({ originalName: 'Condition', typeName: 'Text250' });
  });

  it('should have Enabled field with Boolean type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000100);
    expect(fields).toBeDefined();
    expect(fields!.get('ENABLED')).toEqual({ originalName: 'Enabled', typeName: 'Boolean' });
  });

  it('should have at least 5 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000100);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(5);
  });
});

describe('Debugger Call Stack table (2000000101) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000101)).toBe(true);
  });

  it('should have ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000101);
    expect(fields).toBeDefined();
    expect(fields!.get('ID')).toEqual({ originalName: 'ID', typeName: 'Integer' });
  });

  it('should have Object Type field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000101);
    expect(fields).toBeDefined();
    expect(fields!.get('OBJECT TYPE')).toEqual({ originalName: 'Object Type', typeName: 'Option' });
  });

  it('should have Object ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000101);
    expect(fields).toBeDefined();
    expect(fields!.get('OBJECT ID')).toEqual({ originalName: 'Object ID', typeName: 'Integer' });
  });

  it('should have Function Name field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000101);
    expect(fields).toBeDefined();
    expect(fields!.get('FUNCTION NAME')).toBeDefined();
    expect(fields!.get('FUNCTION NAME')!.originalName).toBe('Function Name');
  });

  it('should have Line No. field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000101);
    expect(fields).toBeDefined();
    expect(fields!.get('LINE NO.')).toEqual({ originalName: 'Line No.', typeName: 'Integer' });
  });

  it('should have at least 5 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000101);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(5);
  });
});

describe('Active Session table (2000000110) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000110)).toBe(true);
  });

  it('should have Session ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000110);
    expect(fields).toBeDefined();
    expect(fields!.get('SESSION ID')).toEqual({ originalName: 'Session ID', typeName: 'Integer' });
  });

  it('should have User ID field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000110);
    expect(fields).toBeDefined();
    expect(fields!.get('USER ID')).toBeDefined();
    expect(fields!.get('USER ID')!.originalName).toBe('User ID');
  });

  it('should have Client Type field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000110);
    expect(fields).toBeDefined();
    expect(fields!.get('CLIENT TYPE')).toEqual({ originalName: 'Client Type', typeName: 'Option' });
  });

  it('should have Server Instance ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000110);
    expect(fields).toBeDefined();
    expect(fields!.get('SERVER INSTANCE ID')).toEqual({ originalName: 'Server Instance ID', typeName: 'Integer' });
  });

  it('should have Login Datetime field with DateTime type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000110);
    expect(fields).toBeDefined();
    expect(fields!.get('LOGIN DATETIME')).toEqual({ originalName: 'Login Datetime', typeName: 'DateTime' });
  });

  it('should have at least 5 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000110);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(5);
  });
});

describe('Server Instance table (2000000114) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000114)).toBe(true);
  });

  it('should have Service ID field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000114);
    expect(fields).toBeDefined();
    expect(fields!.get('SERVICE ID')).toBeDefined();
    expect(fields!.get('SERVICE ID')!.originalName).toBe('Service ID');
  });

  it('should have Description field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000114);
    expect(fields).toBeDefined();
    expect(fields!.get('DESCRIPTION')).toEqual({ originalName: 'Description', typeName: 'Text250' });
  });

  it('should have Location field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000114);
    expect(fields).toBeDefined();
    expect(fields!.get('LOCATION')).toEqual({ originalName: 'Location', typeName: 'Text250' });
  });

  it('should have Folder field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000114);
    expect(fields).toBeDefined();
    expect(fields!.get('FOLDER')).toEqual({ originalName: 'Folder', typeName: 'Text250' });
  });

  it('should have at least 4 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000114);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(4);
  });
});

describe('Object Metadata table (2000000137) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000137)).toBe(true);
  });

  it('should have Name field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000137);
    expect(fields).toBeDefined();
    expect(fields!.get('NAME')).toEqual({ originalName: 'Name', typeName: 'Text30' });
  });

  it('should have ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000137);
    expect(fields).toBeDefined();
    expect(fields!.get('ID')).toEqual({ originalName: 'ID', typeName: 'Integer' });
  });

  it('should have User AL Code field with BLOB type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000137);
    expect(fields).toBeDefined();
    expect(fields!.get('USER AL CODE')).toEqual({ originalName: 'User AL Code', typeName: 'BLOB' });
  });

  it('should have at least 3 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000137);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(3);
  });
});

describe('Event Subscription table (2000000140) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000140)).toBe(true);
  });

  it('should have Subscriber Codeunit ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000140);
    expect(fields).toBeDefined();
    expect(fields!.get('SUBSCRIBER CODEUNIT ID')).toEqual({ originalName: 'Subscriber Codeunit ID', typeName: 'Integer' });
  });

  it('should have Subscriber Function field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000140);
    expect(fields).toBeDefined();
    expect(fields!.get('SUBSCRIBER FUNCTION')).toBeDefined();
    expect(fields!.get('SUBSCRIBER FUNCTION')!.originalName).toBe('Subscriber Function');
  });

  it('should have Event Type field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000140);
    expect(fields).toBeDefined();
    expect(fields!.get('EVENT TYPE')).toEqual({ originalName: 'Event Type', typeName: 'Option' });
  });

  it('should have Publisher Object Type field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000140);
    expect(fields).toBeDefined();
    expect(fields!.get('PUBLISHER OBJECT TYPE')).toEqual({ originalName: 'Publisher Object Type', typeName: 'Option' });
  });

  it('should have Publisher Object ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000140);
    expect(fields).toBeDefined();
    expect(fields!.get('PUBLISHER OBJECT ID')).toEqual({ originalName: 'Publisher Object ID', typeName: 'Integer' });
  });

  it('should have Published Function field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000140);
    expect(fields).toBeDefined();
    expect(fields!.get('PUBLISHED FUNCTION')).toBeDefined();
    expect(fields!.get('PUBLISHED FUNCTION')!.originalName).toBe('Published Function');
  });

  it('should have Active field with Boolean type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000140);
    expect(fields).toBeDefined();
    expect(fields!.get('ACTIVE')).toEqual({ originalName: 'Active', typeName: 'Boolean' });
  });

  it('should have Number of Calls field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000140);
    expect(fields).toBeDefined();
    expect(fields!.get('NUMBER OF CALLS')).toEqual({ originalName: 'Number of Calls', typeName: 'Integer' });
  });

  it('should have at least 8 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000140);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(8);
  });
});

describe('Data Sensitivity table (2000000159) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000159)).toBe(true);
  });

  it('should have Table No field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000159);
    expect(fields).toBeDefined();
    expect(fields!.get('TABLE NO')).toEqual({ originalName: 'Table No', typeName: 'Integer' });
  });

  it('should have Field No field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000159);
    expect(fields).toBeDefined();
    expect(fields!.get('FIELD NO')).toEqual({ originalName: 'Field No', typeName: 'Integer' });
  });

  it('should have Field Caption field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000159);
    expect(fields).toBeDefined();
    expect(fields!.get('FIELD CAPTION')).toEqual({ originalName: 'Field Caption', typeName: 'Text250' });
  });

  it('should have Data Sensitivity field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000159);
    expect(fields).toBeDefined();
    expect(fields!.get('DATA SENSITIVITY')).toEqual({ originalName: 'Data Sensitivity', typeName: 'Option' });
  });

  it('should have Company Name field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000159);
    expect(fields).toBeDefined();
    expect(fields!.get('COMPANY NAME')).toEqual({ originalName: 'Company Name', typeName: 'Text30' });
  });

  it('should have at least 5 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000159);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(5);
  });
});

describe('Application Language table (2000000170) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000170)).toBe(true);
  });

  it('should have Language ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000170);
    expect(fields).toBeDefined();
    expect(fields!.get('LANGUAGE ID')).toEqual({ originalName: 'Language ID', typeName: 'Integer' });
  });

  it('should have at least 1 field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000170);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(1);
  });
});

describe('Designer Page Action table (2000000171) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000171)).toBe(true);
  });

  it('should have Page ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000171);
    expect(fields).toBeDefined();
    expect(fields!.get('PAGE ID')).toEqual({ originalName: 'Page ID', typeName: 'Integer' });
  });

  it('should have Field ID field with Integer type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000171);
    expect(fields).toBeDefined();
    expect(fields!.get('FIELD ID')).toEqual({ originalName: 'Field ID', typeName: 'Integer' });
  });

  it('should have Type field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000171);
    expect(fields).toBeDefined();
    expect(fields!.get('TYPE')).toEqual({ originalName: 'Type', typeName: 'Option' });
  });

  it('should have Caption field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000171);
    expect(fields).toBeDefined();
    expect(fields!.get('CAPTION')).toEqual({ originalName: 'Caption', typeName: 'Text250' });
  });

  it('should have Status field with Option type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000171);
    expect(fields).toBeDefined();
    expect(fields!.get('STATUS')).toEqual({ originalName: 'Status', typeName: 'Option' });
  });

  it('should have at least 5 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000171);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(5);
  });
});

describe('Designer Field Group table (2000000172) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000172)).toBe(true);
  });

  it('should have Display Name field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000172);
    expect(fields).toBeDefined();
    expect(fields!.get('DISPLAY NAME')).toEqual({ originalName: 'Display Name', typeName: 'Text250' });
  });

  it('should have Description field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000172);
    expect(fields).toBeDefined();
    expect(fields!.get('DESCRIPTION')).toEqual({ originalName: 'Description', typeName: 'Text250' });
  });

  it('should have at least 2 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000172);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(2);
  });
});

describe('OData Edm Type table (2000000179) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000179)).toBe(true);
  });

  it('should have Key field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000179);
    expect(fields).toBeDefined();
    expect(fields!.get('KEY')).toBeDefined();
    expect(fields!.get('KEY')!.originalName).toBe('Key');
  });

  it('should have Description field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000179);
    expect(fields).toBeDefined();
    expect(fields!.get('DESCRIPTION')).toEqual({ originalName: 'Description', typeName: 'Text250' });
  });

  it('should have Edm Xml field with BLOB type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000179);
    expect(fields).toBeDefined();
    expect(fields!.get('EDM XML')).toEqual({ originalName: 'Edm Xml', typeName: 'BLOB' });
  });

  it('should have correct field count of 3', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000179);
    expect(fields).toBeDefined();
    expect(fields!.size).toBe(3);
  });
});

describe('API Webhook Notification table (2000000194) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000194)).toBe(true);
  });

  it('should have Subscription ID field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000194);
    expect(fields).toBeDefined();
    expect(fields!.get('SUBSCRIPTION ID')).toEqual({ originalName: 'Subscription ID', typeName: 'Text150' });
  });

  it('should have Change Type field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000194);
    expect(fields).toBeDefined();
    expect(fields!.get('CHANGE TYPE')).toEqual({ originalName: 'Change Type', typeName: 'Text50' });
  });

  it('should have Resource ID field', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000194);
    expect(fields).toBeDefined();
    expect(fields!.get('RESOURCE ID')).toEqual({ originalName: 'Resource ID', typeName: 'Text250' });
  });

  it('should have Notification field with BLOB type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000194);
    expect(fields).toBeDefined();
    expect(fields!.get('NOTIFICATION')).toEqual({ originalName: 'Notification', typeName: 'BLOB' });
  });

  it('should have at least 4 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000194);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(4);
  });
});

describe('Extension Deployment Status table (2000000201) - new fields from #684', () => {
  it('should be present in SYSTEM_TABLE_FIELDS', () => {
    expect(SYSTEM_TABLE_FIELDS.has(2000000201)).toBe(true);
  });

  it('should have App ID field with GUID type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000201);
    expect(fields).toBeDefined();
    expect(fields!.get('APP ID')).toEqual({ originalName: 'App ID', typeName: 'GUID' });
  });

  it('should have Allow HttpClient Requests field with Boolean type', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000201);
    expect(fields).toBeDefined();
    expect(fields!.get('ALLOW HTTPCLIENT REQUESTS')).toEqual({ originalName: 'Allow HttpClient Requests', typeName: 'Boolean' });
  });

  it('should have at least 2 fields', () => {
    const fields = SYSTEM_TABLE_FIELDS.get(2000000201);
    expect(fields).toBeDefined();
    expect(fields!.size).toBeGreaterThanOrEqual(2);
  });
});
