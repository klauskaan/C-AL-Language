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
  [2000000053, 'Access Control'],
  [2000000058, 'AllObjWithCaption'],
  [2000000063, 'Key'],
  [2000000071, 'Code Coverage'],
  [2000000072, 'Signal'],
  [2000000073, 'User Personalization'],
  [2000000075, 'User Metadata'],
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
  [2000000153, 'NAV App Installed App'],
  [2000000160, 'NAV App'],
  [2000000161, 'Media Set'],
  [2000000162, 'Tenant Media'],
  [2000000163, 'Tenant Media Set'],
  [2000000165, 'Tenant Permission Set Rel.'],
  [2000000166, 'Tenant Permission'],
  [2000000167, 'Membership Entitlement'],
  [2000000168, 'Tenant Web Service'],
  [2000000178, 'All Profile'],
  [2000000196, 'Object Options'],
  [2000000200, 'NAV App Tenant Operation'],
  [2000000204, 'Page Info And Fields'],
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

  [2000000045, new Map<string, FieldInfo>([
    ['LANGUAGE ID', { originalName: 'Language ID', typeName: 'Integer' }],
    ['NAME', { originalName: 'Name', typeName: 'Text80' }],
    ['GLOBALLY ENABLED', { originalName: 'Globally Enabled', typeName: 'Boolean' }],
    ['LOCALIZATION EXIST', { originalName: 'Localization Exist', typeName: 'Boolean' }],
    ['ABBREVIATED NAME', { originalName: 'Abbreviated Name', typeName: 'Text3' }],
  ])],

  [2000000053, new Map<string, FieldInfo>([
    ['USER SECURITY ID', { originalName: 'User Security ID', typeName: 'GUID' }],
    ['ROLE ID', { originalName: 'Role ID', typeName: 'Code20' }],
    ['ROLE NAME', { originalName: 'Role Name', typeName: 'Text30' }],
    ['COMPANY NAME', { originalName: 'Company Name', typeName: 'Text30' }],
    ['SCOPE', { originalName: 'Scope', typeName: 'Option' }],
    ['APP ID', { originalName: 'App ID', typeName: 'GUID' }],
    ['APP NAME', { originalName: 'App Name', typeName: 'Text250' }],
  ])],

  [2000000073, new Map<string, FieldInfo>([
    ['USER SID', { originalName: 'User SID', typeName: 'GUID' }],
    ['USER ID', { originalName: 'User ID', typeName: 'Code50' }],
    ['PROFILE ID', { originalName: 'Profile ID', typeName: 'Code30' }],
    ['LANGUAGE ID', { originalName: 'Language ID', typeName: 'Integer' }],
    ['LOCALE ID', { originalName: 'Locale ID', typeName: 'Integer' }],
    ['TIME ZONE', { originalName: 'Time Zone', typeName: 'Text250' }],
    ['COMPANY', { originalName: 'Company', typeName: 'Text30' }],
    ['SCOPE', { originalName: 'Scope', typeName: 'Option' }],
    ['APP ID', { originalName: 'App ID', typeName: 'GUID' }],
    ['LICENSE TYPE', { originalName: 'License Type', typeName: 'Option' }],
    ['DEBUGGER BREAK ON ERROR', { originalName: 'Debugger Break On Error', typeName: 'Boolean' }],
    ['DEBUGGER BREAK ON REC CHANGES', { originalName: 'Debugger Break On Rec Changes', typeName: 'Boolean' }],
    ['DEBUGGER SKIP SYSTEM TRIGGERS', { originalName: 'Debugger Skip System Triggers', typeName: 'Boolean' }],
  ])],

  [2000000075, new Map<string, FieldInfo>([
    ['USER SID', { originalName: 'User SID', typeName: 'GUID' }],
    ['PAGE ID', { originalName: 'Page ID', typeName: 'Integer' }],
    ['PERSONALIZATION ID', { originalName: 'Personalization ID', typeName: 'Code40' }],
    ['DATE', { originalName: 'Date', typeName: 'Date' }],
    ['TIME', { originalName: 'Time', typeName: 'Time' }],
    ['USER ID', { originalName: 'User ID', typeName: 'Code50' }],
  ])],

  [2000000150, new Map<string, FieldInfo>([
    ['APP PACKAGE ID', { originalName: 'App Package ID', typeName: 'GUID' }],
    ['OBJECT TYPE', { originalName: 'Object Type', typeName: 'Option' }],
    ['OBJECT ID', { originalName: 'Object ID', typeName: 'Integer' }],
    ['OBJECT SUBTYPE', { originalName: 'Object Subtype', typeName: 'Text30' }],
    ['USER AL CODE', { originalName: 'User AL Code', typeName: 'BLOB' }],
  ])],

  [2000000153, new Map<string, FieldInfo>([
    ['PACKAGE ID', { originalName: 'Package ID', typeName: 'GUID' }],
    ['NAME', { originalName: 'Name', typeName: 'Text250' }],
    ['PUBLISHER', { originalName: 'Publisher', typeName: 'Text250' }],
    ['VERSION MAJOR', { originalName: 'Version Major', typeName: 'Integer' }],
    ['VERSION MINOR', { originalName: 'Version Minor', typeName: 'Integer' }],
    ['VERSION BUILD', { originalName: 'Version Build', typeName: 'Integer' }],
  ])],

  [2000000160, new Map<string, FieldInfo>([
    ['PACKAGE ID', { originalName: 'Package ID', typeName: 'GUID' }],
    ['ID', { originalName: 'ID', typeName: 'GUID' }],
    ['NAME', { originalName: 'Name', typeName: 'Text250' }],
    ['PUBLISHER', { originalName: 'Publisher', typeName: 'Text250' }],
    ['VERSION MAJOR', { originalName: 'Version Major', typeName: 'Integer' }],
    ['VERSION MINOR', { originalName: 'Version Minor', typeName: 'Integer' }],
    ['VERSION BUILD', { originalName: 'Version Build', typeName: 'Integer' }],
    ['VERSION REVISION', { originalName: 'Version Revision', typeName: 'Integer' }],
    ['DESCRIPTION', { originalName: 'Description', typeName: 'BLOB' }],
    ['URL', { originalName: 'URL', typeName: 'Text250' }],
    ['HELP', { originalName: 'Help', typeName: 'Text250' }],
    ['PRIVACY STATEMENT', { originalName: 'Privacy Statement', typeName: 'Text250' }],
    ['EULA', { originalName: 'EULA', typeName: 'Text250' }],
    ['LOGO', { originalName: 'Logo', typeName: 'Media' }],
    ['SCOPE', { originalName: 'Scope', typeName: 'Option' }],
    ['PERTENANT OR INSTALLED', { originalName: 'PerTenant Or Installed', typeName: 'Boolean' }],
    ['TENANT VISIBLE', { originalName: 'Tenant Visible', typeName: 'Boolean' }],
    ['PACKAGE TYPE', { originalName: 'Package Type', typeName: 'Option' }],
    ['SHOW MY CODE', { originalName: 'Show My Code', typeName: 'Boolean' }],
    ['TENANT ID', { originalName: 'Tenant ID', typeName: 'Text128' }],
  ])],

  [2000000165, new Map<string, FieldInfo>([
    ['APP ID', { originalName: 'App ID', typeName: 'GUID' }],
    ['ROLE ID', { originalName: 'Role ID', typeName: 'Code20' }],
    ['NAME', { originalName: 'Name', typeName: 'Text30' }],
  ])],

  [2000000166, new Map<string, FieldInfo>([
    ['APP ID', { originalName: 'App ID', typeName: 'GUID' }],
    ['ROLE ID', { originalName: 'Role ID', typeName: 'Code20' }],
    ['OBJECT TYPE', { originalName: 'Object Type', typeName: 'Option' }],
    ['OBJECT ID', { originalName: 'Object ID', typeName: 'Integer' }],
    ['OBJECT NAME', { originalName: 'Object Name', typeName: 'Text249' }],
    ['READ PERMISSION', { originalName: 'Read Permission', typeName: 'Option' }],
    ['INSERT PERMISSION', { originalName: 'Insert Permission', typeName: 'Option' }],
    ['MODIFY PERMISSION', { originalName: 'Modify Permission', typeName: 'Option' }],
    ['DELETE PERMISSION', { originalName: 'Delete Permission', typeName: 'Option' }],
    ['EXECUTE PERMISSION', { originalName: 'Execute Permission', typeName: 'Option' }],
    ['SECURITY FILTER', { originalName: 'Security Filter', typeName: 'TableFilter' }],
  ])],

  [2000000167, new Map<string, FieldInfo>([
    ['ROLE ID', { originalName: 'Role ID', typeName: 'Code20' }],
    ['NAME', { originalName: 'Name', typeName: 'Text30' }],
    ['APP NAME', { originalName: 'App Name', typeName: 'Text250' }],
    ['APP ID', { originalName: 'App ID', typeName: 'GUID' }],
    ['SCOPE', { originalName: 'Scope', typeName: 'Option' }],
  ])],

  [2000000168, new Map<string, FieldInfo>([
    ['OBJECT TYPE', { originalName: 'Object Type', typeName: 'Option' }],
    ['OBJECT ID', { originalName: 'Object ID', typeName: 'Integer' }],
    ['SERVICE NAME', { originalName: 'Service Name', typeName: 'Text240' }],
    ['PUBLISHED', { originalName: 'Published', typeName: 'Boolean' }],
  ])],

  [2000000178, new Map<string, FieldInfo>([
    ['PROFILE ID', { originalName: 'Profile ID', typeName: 'Code30' }],
    ['DESCRIPTION', { originalName: 'Description', typeName: 'Text250' }],
    ['ROLE CENTER ID', { originalName: 'Role Center ID', typeName: 'Integer' }],
    ['DEFAULT ROLE CENTER', { originalName: 'Default Role Center', typeName: 'Boolean' }],
    ['DISABLE PERSONALIZATION', { originalName: 'Disable Personalization', typeName: 'Boolean' }],
    ['SCOPE', { originalName: 'Scope', typeName: 'Option' }],
    ['APP ID', { originalName: 'App ID', typeName: 'GUID' }],
    ['APP NAME', { originalName: 'App Name', typeName: 'Text250' }],
    ['USE RECORD NOTES', { originalName: 'Use Record Notes', typeName: 'Boolean' }],
    ['RECORD NOTEBOOK', { originalName: 'Record Notebook', typeName: 'Text250' }],
    ['USE PAGE NOTES', { originalName: 'Use Page Notes', typeName: 'Boolean' }],
    ['PAGE NOTEBOOK', { originalName: 'Page Notebook', typeName: 'Text250' }],
  ])],

  [2000000196, new Map<string, FieldInfo>([
    ['PARAMETER NAME', { originalName: 'Parameter Name', typeName: 'Text250' }],
    ['OBJECT TYPE', { originalName: 'Object Type', typeName: 'Option' }],
    ['OBJECT ID', { originalName: 'Object ID', typeName: 'Integer' }],
    ['USER NAME', { originalName: 'User Name', typeName: 'Code50' }],
    ['CREATED BY', { originalName: 'Created By', typeName: 'Code50' }],
    ['PUBLIC VISIBLE', { originalName: 'Public Visible', typeName: 'Boolean' }],
    ['COMPANY NAME', { originalName: 'Company Name', typeName: 'Text30' }],
    ['OPTION DATA', { originalName: 'Option Data', typeName: 'BLOB' }],
  ])],

  [2000000200, new Map<string, FieldInfo>([
    ['OPERATION ID', { originalName: 'Operation ID', typeName: 'GUID' }],
    ['OPERATION TYPE', { originalName: 'Operation Type', typeName: 'Integer' }],
    ['STATUS', { originalName: 'Status', typeName: 'Option' }],
    ['STARTED ON', { originalName: 'Started On', typeName: 'DateTime' }],
    ['DESCRIPTION', { originalName: 'Description', typeName: 'Text250' }],
    ['DETAILS', { originalName: 'Details', typeName: 'BLOB' }],
  ])],

  [2000000204, new Map<string, FieldInfo>([
    ['PAGE ID', { originalName: 'Page ID', typeName: 'Integer' }],
    ['PAGE NAME', { originalName: 'Page Name', typeName: 'Text250' }],
    ['PAGE TYPE', { originalName: 'Page Type', typeName: 'Text30' }],
    ['SOURCE TABLE NO.', { originalName: 'Source Table No.', typeName: 'Integer' }],
    ['SOURCE TABLE NAME', { originalName: 'Source Table Name', typeName: 'Text250' }],
    ['SOURCE DATA TYPE', { originalName: 'Source Data Type', typeName: 'Text30' }],
    ['CURRENT FORM ID', { originalName: 'Current Form ID', typeName: 'Text80' }],
    ['FIELD INFO', { originalName: 'Field Info', typeName: 'Text250' }],
    ['FIELD VALUE', { originalName: 'Field Value', typeName: 'Text250' }],
    ['EXTENSIONSOURCE', { originalName: 'ExtensionSource', typeName: 'Text250' }],
    ['FIELD FILTER EXPRESSION', { originalName: 'Field Filter Expression', typeName: 'Text250' }],
    ['FIELD FILTER TYPE', { originalName: 'Field Filter Type', typeName: 'Text80' }],
  ])],
]);
