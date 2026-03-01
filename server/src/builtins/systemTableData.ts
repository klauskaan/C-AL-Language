/**
 * System Table Data
 *
 * Hardcoded definitions for NAV virtual/system tables (ID >= 2,000,000,000).
 * These tables are runtime-only and never exported as workspace files, so they
 * cannot be discovered by the workspace indexer. Pre-seeding WorkspaceIndex with
 * these definitions prevents ~942 false-positive undefined-identifier warnings for
 * pages and codeunits whose source table is a system table.
 *
 * Data covers BC14 superset of known system table fields.
 */

import { FieldInfo } from '../workspaceSymbol/workspaceIndex';

/**
 * Maps system table IDs to their display names.
 * Includes both field-defined tables and name-only tables.
 */
export const SYSTEM_TABLE_NAMES: ReadonlyMap<number, string> = new Map([
  [2000000001, 'Object'],
  [2000000002, 'SID - Account Name'],
  [2000000003, 'Access Control'],
  [2000000004, 'Permission Set'],
  [2000000005, 'Permission'],
  [2000000006, 'Company'],
  [2000000007, 'Date'],
  [2000000008, 'Time'],
  [2000000009, 'Session'],
  [2000000010, 'Drive'],
  [2000000020, 'Field Map'],
  [2000000021, 'Field Mapping'],
  [2000000022, 'Page Table Relation'],
  [2000000026, 'Integer'],
  [2000000028, 'Virtual Table'],
  [2000000038, 'AllObj'],
  [2000000041, 'Field'],
  [2000000043, 'License Information'],
  [2000000044, 'License Permission'],
  [2000000045, 'Windows Language'],
  [2000000053, 'Style Sheet'],
  [2000000058, 'AllObjWithCaption'],
  [2000000063, 'Key'],
  [2000000071, 'Code Coverage'],
  [2000000072, 'Signal'],
  [2000000102, 'Active Directory Group Member'],
  [2000000111, 'Profile'],
  [2000000112, 'Profile Metadata'],
  [2000000115, 'Tenant Permission'],
  [2000000116, 'Tenant Permission Set'],
  [2000000119, 'NAV App'],
  [2000000120, 'User'],
  [2000000136, 'Table Metadata'],
  [2000000138, 'Page Metadata'],
  [2000000150, 'Report Layout'],
  [2000000151, 'Object Metadata'],
  [2000000160, 'Media'],
  [2000000161, 'Media Set'],
  [2000000162, 'Tenant Media'],
  [2000000163, 'Tenant Media Set'],
  [2000000165, 'Tenant Permission Set Rel.'],
  [2000000167, 'Membership Entitlement'],
  [2000000168, 'NAV App Object Metadata'],
]);

/**
 * Maps system table IDs to their field definitions.
 * Inner map keys are UPPERCASE field names (matching WorkspaceIndex convention).
 * Only tables with known field definitions are included here.
 * Name-only tables are registered in SYSTEM_TABLE_NAMES but not here,
 * preserving the `if (tableFields)` guard behavior in symbolTable.ts.
 */
export const SYSTEM_TABLE_FIELDS: ReadonlyMap<number, ReadonlyMap<string, FieldInfo>> = new Map([
  [2000000026, new Map<string, FieldInfo>([
    ['NUMBER', { originalName: 'Number', typeName: 'Integer' }],
  ])],

  [2000000007, new Map<string, FieldInfo>([
    ['PERIOD TYPE', { originalName: 'Period Type', typeName: 'Option' }],
    ['PERIOD START', { originalName: 'Period Start', typeName: 'Date' }],
    ['PERIOD END', { originalName: 'Period End', typeName: 'Date' }],
    ['PERIOD NO.', { originalName: 'Period No.', typeName: 'Integer' }],
    ['PERIOD NAME', { originalName: 'Period Name', typeName: 'Text30' }],
  ])],

  [2000000041, new Map<string, FieldInfo>([
    ['TABLENO', { originalName: 'TableNo', typeName: 'Integer' }],
    ['NO.', { originalName: 'No.', typeName: 'Integer' }],
    ['TABLENAME', { originalName: 'TableName', typeName: 'Text30' }],
    ['FIELDNAME', { originalName: 'FieldName', typeName: 'Text30' }],
    ['TYPE', { originalName: 'Type', typeName: 'Option' }],
    ['LEN', { originalName: 'Len', typeName: 'Integer' }],
    ['CLASS', { originalName: 'Class', typeName: 'Option' }],
    ['ENABLED', { originalName: 'Enabled', typeName: 'Boolean' }],
    ['TYPENAME', { originalName: 'TypeName', typeName: 'Text30' }],
    ['OBSOLETESTATE', { originalName: 'ObsoleteState', typeName: 'Option' }],
    ['OBSOLETEREASON', { originalName: 'ObsoleteReason', typeName: 'Text250' }],
    ['RELATIONTABLENO', { originalName: 'RelationTableNo', typeName: 'Integer' }],
    ['RELATIONFIELDNO', { originalName: 'RelationFieldNo', typeName: 'Integer' }],
    ['SQLDATATYPE', { originalName: 'SQLDataType', typeName: 'Option' }],
    ['OPTIONSTRING', { originalName: 'OptionString', typeName: 'Text250' }],
    ['DATACLASSIFICATION', { originalName: 'DataClassification', typeName: 'Option' }],
    ['FIELD CAPTION', { originalName: 'Field Caption', typeName: 'Text80' }],
  ])],

  [2000000058, new Map<string, FieldInfo>([
    ['OBJECT TYPE', { originalName: 'Object Type', typeName: 'Option' }],
    ['OBJECT ID', { originalName: 'Object ID', typeName: 'Integer' }],
    ['OBJECT NAME', { originalName: 'Object Name', typeName: 'Text30' }],
    ['OBJECT CAPTION', { originalName: 'Object Caption', typeName: 'Text250' }],
    ['OBJECT SUBTYPE', { originalName: 'Object Subtype', typeName: 'Text30' }],
    ['APP PACKAGE ID', { originalName: 'App Package ID', typeName: 'GUID' }],
  ])],

  [2000000120, new Map<string, FieldInfo>([
    ['USER SECURITY ID', { originalName: 'User Security ID', typeName: 'GUID' }],
    ['USER NAME', { originalName: 'User Name', typeName: 'Code50' }],
    ['FULL NAME', { originalName: 'Full Name', typeName: 'Text80' }],
    ['STATE', { originalName: 'State', typeName: 'Option' }],
    ['EXPIRY DATE', { originalName: 'Expiry Date', typeName: 'Date' }],
    ['WINDOWS SECURITY ID', { originalName: 'Windows Security ID', typeName: 'Text119' }],
    ['CHANGE PASSWORD', { originalName: 'Change Password', typeName: 'Boolean' }],
    ['LICENSE TYPE', { originalName: 'License Type', typeName: 'Option' }],
    ['AUTHENTICATION EMAIL', { originalName: 'Authentication Email', typeName: 'Text250' }],
    ['CONTACT EMAIL', { originalName: 'Contact Email', typeName: 'Text250' }],
    ['APPLICATION ID', { originalName: 'Application ID', typeName: 'GUID' }],
    ['EXCHANGE IDENTIFIER', { originalName: 'Exchange Identifier', typeName: 'Text250' }],
  ])],

  [2000000038, new Map<string, FieldInfo>([
    ['OBJECT TYPE', { originalName: 'Object Type', typeName: 'Option' }],
    ['OBJECT ID', { originalName: 'Object ID', typeName: 'Integer' }],
    ['OBJECT NAME', { originalName: 'Object Name', typeName: 'Text30' }],
    ['APP PACKAGE ID', { originalName: 'App Package ID', typeName: 'GUID' }],
  ])],

  [2000000063, new Map<string, FieldInfo>([
    ['TABLENO', { originalName: 'TableNo', typeName: 'Integer' }],
    ['NO.', { originalName: 'No.', typeName: 'Integer' }],
    ['TABLENAME', { originalName: 'TableName', typeName: 'Text30' }],
    ['KEY', { originalName: 'Key', typeName: 'Text250' }],
    ['SUMINDEXFIELDS', { originalName: 'SumIndexFields', typeName: 'Text250' }],
    ['SQLINDEX', { originalName: 'SQLIndex', typeName: 'Text250' }],
    ['ENABLED', { originalName: 'Enabled', typeName: 'Boolean' }],
    ['MAINTAINSQLINDEX', { originalName: 'MaintainSQLIndex', typeName: 'Boolean' }],
    ['MAINTAINSIFTINDEX', { originalName: 'MaintainSIFTIndex', typeName: 'Boolean' }],
    ['CLUSTERED', { originalName: 'Clustered', typeName: 'Boolean' }],
    ['UNIQUE', { originalName: 'Unique', typeName: 'Boolean' }],
  ])],

  [2000000001, new Map<string, FieldInfo>([
    ['TYPE', { originalName: 'Type', typeName: 'Option' }],
    ['COMPANY NAME', { originalName: 'Company Name', typeName: 'Text30' }],
    ['ID', { originalName: 'ID', typeName: 'Integer' }],
    ['NAME', { originalName: 'Name', typeName: 'Text30' }],
    ['MODIFIED', { originalName: 'Modified', typeName: 'Boolean' }],
    ['COMPILED', { originalName: 'Compiled', typeName: 'Boolean' }],
    ['DATE', { originalName: 'Date', typeName: 'Date' }],
    ['TIME', { originalName: 'Time', typeName: 'Time' }],
    ['VERSION LIST', { originalName: 'Version List', typeName: 'Text80' }],
    ['LOCKED', { originalName: 'Locked', typeName: 'Boolean' }],
    ['LOCKED BY', { originalName: 'Locked By', typeName: 'Text119' }],
    ['BLOB REFERENCE', { originalName: 'BLOB Reference', typeName: 'BigInteger' }],
    ['BLOB SIZE', { originalName: 'BLOB Size', typeName: 'Integer' }],
    ['CAPTION', { originalName: 'Caption', typeName: 'Text250' }],
  ])],

  [2000000006, new Map<string, FieldInfo>([
    ['NAME', { originalName: 'Name', typeName: 'Text30' }],
    ['EVALUATION COMPANY', { originalName: 'Evaluation Company', typeName: 'Boolean' }],
    ['DISPLAY NAME', { originalName: 'Display Name', typeName: 'Text250' }],
    ['BUSINESS PROFILE ID', { originalName: 'Business Profile Id', typeName: 'Text250' }],
    ['ID', { originalName: 'Id', typeName: 'GUID' }],
  ])],

  [2000000009, new Map<string, FieldInfo>([
    ['CONNECTION ID', { originalName: 'Connection ID', typeName: 'Integer' }],
    ['SERVER COMPUTER NAME', { originalName: 'Server Computer Name', typeName: 'Text250' }],
    ['SERVER INSTANCE NAME', { originalName: 'Server Instance Name', typeName: 'Text250' }],
    ['DATABASE NAME', { originalName: 'Database Name', typeName: 'Text250' }],
    ['USER ID', { originalName: 'User ID', typeName: 'Code132' }],
    ['LOGIN TYPE', { originalName: 'Login Type', typeName: 'Option' }],
    ['LOGIN DATETIME', { originalName: 'Login Datetime', typeName: 'DateTime' }],
    ['MY SESSION', { originalName: 'My Session', typeName: 'Boolean' }],
    ['CLIENT TYPE', { originalName: 'Client Type', typeName: 'Option' }],
    ['CLIENT COMPUTER NAME', { originalName: 'Client Computer Name', typeName: 'Text250' }],
  ])],

  [2000000005, new Map<string, FieldInfo>([
    ['ROLE ID', { originalName: 'Role ID', typeName: 'Code20' }],
    ['OBJECT TYPE', { originalName: 'Object Type', typeName: 'Option' }],
    ['OBJECT ID', { originalName: 'Object ID', typeName: 'Integer' }],
    ['READ PERMISSION', { originalName: 'Read Permission', typeName: 'Option' }],
    ['INSERT PERMISSION', { originalName: 'Insert Permission', typeName: 'Option' }],
    ['MODIFY PERMISSION', { originalName: 'Modify Permission', typeName: 'Option' }],
    ['DELETE PERMISSION', { originalName: 'Delete Permission', typeName: 'Option' }],
    ['EXECUTE PERMISSION', { originalName: 'Execute Permission', typeName: 'Option' }],
    ['SECURITY FILTER', { originalName: 'Security Filter', typeName: 'TableFilter' }],
    ['ROLE NAME', { originalName: 'Role Name', typeName: 'Text30' }],
    ['OBJECT NAME', { originalName: 'Object Name', typeName: 'Text249' }],
  ])],

  [2000000136, new Map<string, FieldInfo>([
    ['ID', { originalName: 'ID', typeName: 'Integer' }],
    ['NAME', { originalName: 'Name', typeName: 'Text30' }],
    ['CAPTION', { originalName: 'Caption', typeName: 'Text250' }],
    ['DATAPERCOMPANY', { originalName: 'DataPerCompany', typeName: 'Boolean' }],
    ['LOOKUPPAGEID', { originalName: 'LookupPageID', typeName: 'Integer' }],
    ['DRILLDOWNPAGEID', { originalName: 'DrillDownPageID', typeName: 'Integer' }],
    ['DATACAPTIONFIELDS', { originalName: 'DataCaptionFields', typeName: 'Text80' }],
    ['OBSOLETESTATE', { originalName: 'ObsoleteState', typeName: 'Option' }],
    ['OBSOLETEREASON', { originalName: 'ObsoleteReason', typeName: 'Text250' }],
    ['EXTERNALNAME', { originalName: 'ExternalName', typeName: 'Text128' }],
    ['TABLETYPE', { originalName: 'TableType', typeName: 'Option' }],
    ['DATAISEXTERNAL', { originalName: 'DataIsExternal', typeName: 'Boolean' }],
  ])],

  [2000000138, new Map<string, FieldInfo>([
    ['ID', { originalName: 'ID', typeName: 'Integer' }],
    ['NAME', { originalName: 'Name', typeName: 'Text30' }],
    ['CAPTION', { originalName: 'Caption', typeName: 'Text250' }],
    ['ENTITYNAME', { originalName: 'EntityName', typeName: 'Text250' }],
    ['CARDPAGEID', { originalName: 'CardPageID', typeName: 'Integer' }],
    ['SOURCETABLE', { originalName: 'SourceTable', typeName: 'Integer' }],
    ['SOURCETABLETEMPORARY', { originalName: 'SourceTableTemporary', typeName: 'Boolean' }],
  ])],
]);
