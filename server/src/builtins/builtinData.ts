/**
 * C/AL Built-in Functions for code completion
 * Contains common functions used in NAV 2013-2018 development
 */

export interface BuiltinFunction {
  name: string;
  signature: string;
  documentation: string;
  category: 'dialog' | 'record' | 'string' | 'math' | 'date' | 'system' | 'file' | 'report';
  /**
   * Deprecation reason, shown to users.
   * Style guide:
   * - Complete sentences with trailing periods
   * - Two-part structure when applicable: explanation + recommendation
   * - Capital first letter
   * - UPPERCASE function names
   * - Concise (1-2 sentences max)
   */
  deprecated?: string;
}

/**
 * Dialog and message functions
 */
const DIALOG_FUNCTIONS: BuiltinFunction[] = [
  {
    name: 'MESSAGE',
    signature: '(String [, Value1, ...])',
    documentation: 'Displays a message to the user. Supports substitution parameters (%1, %2, etc.).',
    category: 'dialog'
  },
  {
    name: 'ERROR',
    signature: '(String [, Value1, ...])',
    documentation: 'Displays an error message and ends execution of the current function.',
    category: 'dialog'
  },
  {
    name: 'CONFIRM',
    signature: '(String [, Default] [, Value1, ...]): Boolean',
    documentation: 'Displays a Yes/No dialog. Returns TRUE if user clicks Yes.',
    category: 'dialog'
  },
  {
    name: 'STRMENU',
    signature: '(OptionString [, Default]): Integer',
    documentation: 'Displays a menu with comma-separated options. Returns selected option number (1-based) or 0 if cancelled.',
    category: 'dialog'
  },
  {
    name: 'DIALOG',
    signature: '',
    documentation: 'Dialog variable type for showing progress windows.',
    category: 'dialog'
  }
];

/**
 * String manipulation functions
 */
const STRING_FUNCTIONS: BuiltinFunction[] = [
  {
    name: 'STRSUBSTNO',
    signature: '(String, Value1 [, Value2, ...]): Text',
    documentation: 'Substitutes %1, %2, etc. placeholders in a string with provided values.',
    category: 'string'
  },
  {
    name: 'STRLEN',
    signature: '(String): Integer',
    documentation: 'Returns the length of a string.',
    category: 'string'
  },
  {
    name: 'STRPOS',
    signature: '(String, SubString): Integer',
    documentation: 'Returns position of substring (1-based) or 0 if not found.',
    category: 'string'
  },
  {
    name: 'COPYSTR',
    signature: '(String, Position [, Length]): Text',
    documentation: 'Returns a substring starting at Position.',
    category: 'string'
  },
  {
    name: 'DELSTR',
    signature: '(String, Position [, Length]): Text',
    documentation: 'Deletes characters from a string.',
    category: 'string'
  },
  {
    name: 'INSSTR',
    signature: '(String, SubString, Position): Text',
    documentation: 'Inserts a substring at the specified position.',
    category: 'string'
  },
  {
    name: 'LOWERCASE',
    signature: '(String): Text',
    documentation: 'Converts string to lowercase.',
    category: 'string'
  },
  {
    name: 'UPPERCASE',
    signature: '(String): Text',
    documentation: 'Converts string to uppercase.',
    category: 'string'
  },
  {
    name: 'FORMAT',
    signature: '(Value [, Length] [, FormatNumber/FormatString]): Text',
    documentation: 'Converts a value to a formatted string.',
    category: 'string'
  },
  {
    name: 'PADSTR',
    signature: '(String, Length [, PadCharacter]): Text',
    documentation: 'Pads or truncates a string to a specified length.',
    category: 'string'
  },
  {
    name: 'DELCHR',
    signature: '(String [, Where] [, Characters]): Text',
    documentation: 'Deletes specified characters from string. Where: < (left), > (right), = (all).',
    category: 'string'
  },
  {
    name: 'CONVERTSTR',
    signature: '(String, FromChars, ToChars): Text',
    documentation: 'Converts characters in a string from one set to another.',
    category: 'string'
  },
  {
    name: 'INCSTR',
    signature: '(String): Text',
    documentation: 'Increments the numeric part at the end of a string.',
    category: 'string'
  },
  {
    name: 'SELECTSTR',
    signature: '(Number, CommaString): Text',
    documentation: 'Returns the Nth comma-separated value from a string.',
    category: 'string'
  },
  {
    name: 'MAXSTRLEN',
    signature: '(String): Integer',
    documentation: 'Returns the maximum length that can be stored in a Text or Code variable.',
    category: 'string'
  }
];

/**
 * Mathematical functions
 */
const MATH_FUNCTIONS: BuiltinFunction[] = [
  {
    name: 'ABS',
    signature: '(Number): Decimal',
    documentation: 'Returns the absolute value of a number.',
    category: 'math'
  },
  {
    name: 'ROUND',
    signature: '(Number [, Precision] [, Direction]): Decimal',
    documentation: 'Rounds a decimal value. Direction: = (nearest), > (up), < (down).',
    category: 'math'
  },
  {
    name: 'POWER',
    signature: '(Number, Power): Decimal',
    documentation: 'Returns Number raised to Power.',
    category: 'math'
  },
  {
    name: 'RANDOM',
    signature: '(MaxValue): Integer',
    documentation: 'Returns a random integer between 1 and MaxValue.',
    category: 'math'
  },
  {
    name: 'RANDOMIZE',
    signature: '([Seed])',
    documentation: 'Initializes the random number generator.',
    category: 'math'
  }
];

/**
 * Date and time functions
 */
const DATE_FUNCTIONS: BuiltinFunction[] = [
  {
    name: 'TODAY',
    signature: '(): Date',
    documentation: 'Returns the current system date.',
    category: 'date'
  },
  {
    name: 'TIME',
    signature: '(): Time',
    documentation: 'Returns the current system time.',
    category: 'date'
  },
  {
    name: 'WORKDATE',
    signature: '([NewDate]): Date',
    documentation: 'Gets or sets the work date.',
    category: 'date'
  },
  {
    name: 'DMY2DATE',
    signature: '(Day, Month, Year): Date',
    documentation: 'Creates a Date from day, month, year components.',
    category: 'date'
  },
  {
    name: 'DATE2DMY',
    signature: '(Date, Part): Integer',
    documentation: 'Gets part of date. Part: 1=Day, 2=Month, 3=Year.',
    category: 'date'
  },
  {
    name: 'DATE2DWY',
    signature: '(Date, Part): Integer',
    documentation: 'Gets week-based part. Part: 1=Day of week (1-7), 2=Week number, 3=Year.',
    category: 'date'
  },
  {
    name: 'DWY2DATE',
    signature: '(WeekDay, Week, Year): Date',
    documentation: 'Creates a Date from week-based components.',
    category: 'date'
  },
  {
    name: 'CALCDATE',
    signature: '(DateExpression [, Date]): Date',
    documentation: 'Calculates a date using a date formula (e.g., "+1M", "-1W", "CM").',
    category: 'date'
  },
  {
    name: 'CLOSINGDATE',
    signature: '(Date): Date',
    documentation: 'Returns the closing date for the given date (used for fiscal year closing).',
    category: 'date'
  },
  {
    name: 'NORMALDATE',
    signature: '(Date): Date',
    documentation: 'Returns the normal date from a closing date.',
    category: 'date'
  },
  {
    name: 'CREATEDATETIME',
    signature: '(Date, Time): DateTime',
    documentation: 'Combines a Date and Time into a DateTime.',
    category: 'date'
  },
  {
    name: 'DT2DATE',
    signature: '(DateTime): Date',
    documentation: 'Extracts the Date from a DateTime.',
    category: 'date'
  },
  {
    name: 'DT2TIME',
    signature: '(DateTime): Time',
    documentation: 'Extracts the Time from a DateTime.',
    category: 'date'
  },
  {
    name: 'CURRENTDATETIME',
    signature: '(): DateTime',
    documentation: 'Returns the current DateTime.',
    category: 'date'
  }
];

/**
 * System and utility functions
 */
const SYSTEM_FUNCTIONS: BuiltinFunction[] = [
  {
    name: 'USERID',
    signature: '(): Code',
    documentation: 'Returns the current user ID.',
    category: 'system'
  },
  {
    name: 'COMPANYNAME',
    signature: '(): Text',
    documentation: 'Returns the current company name.',
    category: 'system'
  },
  {
    name: 'SERIALNUMBER',
    signature: '(): Text',
    documentation: 'Returns the serial number of the NAV license.',
    category: 'system'
  },
  {
    name: 'EVALUATE',
    signature: '(Variable, String [, FormatNumber]): Boolean',
    documentation: 'Converts a string to another data type. Returns TRUE if successful.',
    category: 'system'
  },
  {
    name: 'CLEAR',
    signature: '(Variable)',
    documentation: 'Clears a variable, setting it to its default value.',
    category: 'system'
  },
  {
    name: 'CLEARALL',
    signature: '()',
    documentation: 'Clears all variables except global Record variables.',
    category: 'system'
  },
  {
    name: 'COPYARRAY',
    signature: '(NewArray, Array, Position [, Length])',
    documentation: 'Copies elements from one array to another.',
    category: 'system'
  },
  {
    name: 'ARRAYLEN',
    signature: '(Array [, Dimension]): Integer',
    documentation: 'Returns the number of elements in an array or array dimension.',
    category: 'system'
  },
  {
    name: 'COMPRESSARRAY',
    signature: '(Array): Integer',
    documentation: 'Removes empty strings from a text array. Returns new length.',
    category: 'system'
  },
  {
    name: 'GUIALLOWED',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if a graphical user interface is available.',
    category: 'system'
  },
  {
    name: 'SLEEP',
    signature: '(Duration)',
    documentation: 'Pauses execution for the specified number of milliseconds.',
    category: 'system'
  },
  {
    name: 'COMMIT',
    signature: '()',
    documentation: 'Commits the current database transaction.',
    category: 'system'
  },
  {
    name: 'GLOBALLANGUAGE',
    signature: '([LanguageID]): Integer',
    documentation: 'Gets or sets the global language ID.',
    category: 'system'
  },
  {
    name: 'WINDOWSLANGUAGE',
    signature: '(): Integer',
    documentation: 'Returns the Windows regional language ID.',
    category: 'system'
  },
  {
    name: 'CREATEGUID',
    signature: '(): GUID',
    documentation: 'Creates a new GUID.',
    category: 'system'
  },
  {
    name: 'ISNULLGUID',
    signature: '(GUID): Boolean',
    documentation: 'Returns TRUE if the GUID is null (all zeros).',
    category: 'system'
  },
  {
    name: 'SETDEFAULTTABLECONNECTION',
    signature: '(ConnectionType: TableConnectionType, ConnectionName: Text)',
    documentation: 'Sets the default table connection for the specified connection type. Introduced in NAV 2016.',
    category: 'system'
  },
  {
    name: 'GETDEFAULTTABLECONNECTION',
    signature: '(ConnectionType: TableConnectionType): Text',
    documentation: 'Returns the current default table connection value for the specified connection type. Introduced in NAV 2016.',
    category: 'system'
  },
  {
    name: 'REGISTERTABLECONNECTION',
    signature: '(ConnectionType: TableConnectionType, ConnectionName: Text, ConnectionString: Text)',
    documentation: 'Registers a table connection for the specified connection type. Introduced in NAV 2016.',
    category: 'system'
  },
  {
    name: 'UNREGISTERTABLECONNECTION',
    signature: '(ConnectionType: TableConnectionType, ConnectionName: Text)',
    documentation: 'Removes a registered table connection for the specified connection type. Introduced in NAV 2016.',
    category: 'system'
  },
  {
    name: 'HASTABLECONNECTION',
    signature: '(ConnectionType: TableConnectionType, ConnectionName: Text): Boolean',
    documentation: 'Returns TRUE if a table connection of the specified type and value is registered. Introduced in NAV 2016.',
    category: 'system'
  },
  {
    name: 'SYSTEM',
    signature: '',
    documentation: 'Built-in system object providing access to system-level properties and methods (e.g. SYSTEM.VARIANT, SYSTEM.ISNULL). Used as a member expression receiver.',
    category: 'system'
  }
];

/**
 * File functions
 */
const FILE_FUNCTIONS: BuiltinFunction[] = [
  {
    name: 'EXISTS',
    signature: '(FileName): Boolean',
    documentation: 'Returns TRUE if the specified file exists.',
    category: 'file'
  },
  {
    name: 'ERASE',
    signature: '(FileName)',
    documentation: 'Deletes a file.',
    category: 'file'
  },
  {
    name: 'RENAME',
    signature: '(OldName, NewName)',
    documentation: 'Renames a file.',
    category: 'file'
  },
  {
    name: 'COPY',
    signature: '(FromName, ToName)',
    documentation: 'Copies a file.',
    category: 'file'
  },
  {
    name: 'DOWNLOAD',
    signature: '(FromFile, DialogTitle, ToFilter, ToFile, ToFile): Boolean',
    documentation: 'Downloads a file from server to client.',
    category: 'file'
  },
  {
    name: 'UPLOAD',
    signature: '(DialogTitle, FromFilter, FromFile, ToFile): Boolean',
    documentation: 'Uploads a file from client to server.',
    category: 'file'
  },
  {
    name: 'DOWNLOADFROMSTREAM',
    signature: '(InStream, DialogTitle, ToFilter, DefaultFileName, ToFile): Boolean',
    documentation: 'Downloads from an InStream to a client file.',
    category: 'file'
  },
  {
    name: 'UPLOADINTOSTREAM',
    signature: '(DialogTitle, FromFilter, DefaultFileName, FromFile, OutStream): Boolean',
    documentation: 'Uploads from client into an OutStream.',
    category: 'file'
  },
  {
    name: 'TEMPORARYPATH',
    signature: '(): Text',
    documentation: 'Returns the path to the temporary files directory.',
    category: 'file'
  }
];

/**
 * Report functions
 */
const REPORT_FUNCTIONS: BuiltinFunction[] = [
  {
    name: 'RUN',
    signature: '(ObjectID [, RequestWindow] [, SystemPrinter] [, Record])',
    documentation: 'Runs a report or codeunit.',
    category: 'report'
  },
  {
    name: 'RUNMODAL',
    signature: '(ObjectID [, Record])',
    documentation: 'Runs a report, page, or codeunit modally.',
    category: 'report'
  },
  {
    name: 'REPORT',
    signature: '',
    documentation: 'Report data type.',
    category: 'report'
  },
  {
    name: 'SAVEASXML',
    signature: '(ReportID, FileName [, Record]): Boolean',
    documentation: 'Saves report output as XML.',
    category: 'report'
  },
  {
    name: 'SAVEASPDF',
    signature: '(ReportID, FileName [, Record]): Boolean',
    documentation: 'Saves report output as PDF.',
    category: 'report'
  },
  {
    name: 'PRINT',
    signature: '()',
    documentation: 'Prints the current report.',
    category: 'report'
  },
  {
    name: 'PREVIEW',
    signature: '()',
    documentation: 'Previews the current report.',
    category: 'report'
  }
];

/**
 * Record methods - shown after dot on Record variables
 */
export const RECORD_METHODS: BuiltinFunction[] = [
  // Finding records
  {
    name: 'GET',
    signature: '([Value1, Value2, ...]): Boolean',
    documentation: 'Gets a record by primary key values. Returns TRUE if found.',
    category: 'record'
  },
  {
    name: 'FIND',
    signature: '([Which]): Boolean',
    documentation: 'Finds a record. Which: -, +, =, >, <, =<, =>. Returns TRUE if found.',
    category: 'record'
  },
  {
    name: 'FINDSET',
    signature: '([ForUpdate] [, UpdateKey]): Boolean',
    documentation: 'Finds records for iteration. More efficient than FIND for loops.',
    category: 'record'
  },
  {
    name: 'FINDFIRST',
    signature: '(): Boolean',
    documentation: 'Finds the first record in the current filter. Returns TRUE if found.',
    category: 'record'
  },
  {
    name: 'FINDLAST',
    signature: '(): Boolean',
    documentation: 'Finds the last record in the current filter. Returns TRUE if found.',
    category: 'record'
  },
  {
    name: 'NEXT',
    signature: '([Steps]): Integer',
    documentation: 'Moves to the next record. Returns number of records moved.',
    category: 'record'
  },

  // Modifying records
  {
    name: 'INSERT',
    signature: '([RunTrigger]): Boolean',
    documentation: 'Inserts a new record. RunTrigger defaults to FALSE.',
    category: 'record'
  },
  {
    name: 'MODIFY',
    signature: '([RunTrigger]): Boolean',
    documentation: 'Modifies an existing record. RunTrigger defaults to FALSE.',
    category: 'record'
  },
  {
    name: 'DELETE',
    signature: '([RunTrigger]): Boolean',
    documentation: 'Deletes the current record. RunTrigger defaults to FALSE.',
    category: 'record'
  },
  {
    name: 'DELETEALL',
    signature: '([RunTrigger])',
    documentation: 'Deletes all records matching the current filter.',
    category: 'record'
  },
  {
    name: 'RENAME',
    signature: '(Value1 [, Value2, ...])',
    documentation: 'Renames the record by changing the primary key values.',
    category: 'record'
  },
  {
    name: 'MODIFYALL',
    signature: '(FieldNo, NewValue [, RunTrigger])',
    documentation: 'Modifies a field in all records matching the current filter.',
    category: 'record'
  },

  // Filtering
  {
    name: 'SETRANGE',
    signature: '(Field [, FromValue] [, ToValue])',
    documentation: 'Sets a filter range on a field. No parameters removes the filter.',
    category: 'record'
  },
  {
    name: 'SETFILTER',
    signature: '(Field, String [, Value1, ...])',
    documentation: 'Sets a filter using a filter expression. Supports %1, %2 substitution.',
    category: 'record'
  },
  {
    name: 'GETRANGEMIN',
    signature: '(Field): Value',
    documentation: 'Gets the minimum value of a filter range.',
    category: 'record'
  },
  {
    name: 'GETRANGEMAX',
    signature: '(Field): Value',
    documentation: 'Gets the maximum value of a filter range.',
    category: 'record'
  },
  {
    name: 'GETFILTER',
    signature: '(Field): Text',
    documentation: 'Returns the filter expression for a field.',
    category: 'record'
  },
  {
    name: 'GETFILTERS',
    signature: '(): Text',
    documentation: 'Returns all filters as a readable string.',
    category: 'record'
  },
  {
    name: 'COPYFILTERS',
    signature: '(FromRecord)',
    documentation: 'Copies filters from another record variable.',
    category: 'record'
  },
  {
    name: 'HASFILTER',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if any filters are set.',
    category: 'record'
  },
  {
    name: 'FILTERGROUP',
    signature: '([NewGroup]): Integer',
    documentation: 'Gets or sets the filter group. Groups: 0-6.',
    category: 'record'
  },
  {
    name: 'MARKEDONLY',
    signature: '([NewValue]): Boolean',
    documentation: 'Gets or sets whether only marked records are included.',
    category: 'record'
  },
  {
    name: 'MARK',
    signature: '([NewValue]): Boolean',
    documentation: 'Gets or sets the mark flag on the current record.',
    category: 'record'
  },
  {
    name: 'CLEARMARKS',
    signature: '()',
    documentation: 'Clears all marks on the record variable.',
    category: 'record'
  },

  // Key and sorting
  {
    name: 'SETCURRENTKEY',
    signature: '(Field1 [, Field2, ...]): Boolean',
    documentation: 'Sets the current key for sorting and filtering.',
    category: 'record'
  },
  {
    name: 'ASCENDING',
    signature: '([NewValue]): Boolean',
    documentation: 'Gets or sets ascending sort order.',
    category: 'record'
  },

  // Record state
  {
    name: 'RESET',
    signature: '()',
    documentation: 'Removes all filters and sets the key to primary key.',
    category: 'record'
  },
  {
    name: 'INIT',
    signature: '()',
    documentation: 'Initializes a record with default values.',
    category: 'record'
  },
  {
    name: 'COPY',
    signature: '(FromRecord [, ShareTable])',
    documentation: 'Copies field values from another record.',
    category: 'record'
  },
  {
    name: 'TRANSFERFIELDS',
    signature: '(FromRecord [, InitPrimaryKey])',
    documentation: 'Transfers matching fields from another record.',
    category: 'record'
  },
  {
    name: 'VALIDATE',
    signature: '(Field [, NewValue])',
    documentation: 'Validates a field, running the OnValidate trigger.',
    category: 'record'
  },
  {
    name: 'TESTFIELD',
    signature: '(Field [, Value])',
    documentation: 'Tests that a field has a value (not blank/zero).',
    category: 'record'
  },
  {
    name: 'FIELDERROR',
    signature: '(Field [, ErrorString])',
    documentation: 'Generates a field error message.',
    category: 'record'
  },
  {
    name: 'FIELDNO',
    signature: '(Field): Integer',
    documentation: 'Returns the field number.',
    category: 'record'
  },
  {
    name: 'FIELDNAME',
    signature: '(FieldNo): Text',
    documentation: 'Returns the field name.',
    category: 'record'
  },
  {
    name: 'FIELDCAPTION',
    signature: '(Field): Text',
    documentation: 'Returns the field caption.',
    category: 'record'
  },
  {
    name: 'FIELDACTIVE',
    signature: '(Field): Boolean',
    documentation: 'Returns TRUE if the specified field is enabled in the table definition.',
    category: 'record'
  },

  // Counting
  {
    name: 'COUNT',
    signature: '(): Integer',
    documentation: 'Returns the number of records matching the current filter.',
    category: 'record'
  },
  {
    name: 'COUNTAPPROX',
    signature: '(): Integer',
    documentation: 'Returns an approximate count (faster than COUNT for large tables).',
    category: 'record'
  },
  {
    name: 'ISEMPTY',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if no records match the current filter.',
    category: 'record'
  },

  // Locking
  {
    name: 'LOCKTABLE',
    signature: '([Wait] [, VersionCheck])',
    documentation: 'Locks the table for modification.',
    category: 'record'
  },
  {
    name: 'RECORDLEVELLOCKING',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if record-level locking is enabled.',
    category: 'record',
    deprecated: 'Always returns TRUE in SQL Server-based versions. Can be safely removed.'
  },

  // Table information
  {
    name: 'TABLENAME',
    signature: '(): Text',
    documentation: 'Returns the table name.',
    category: 'record'
  },
  {
    name: 'TABLECAPTION',
    signature: '(): Text',
    documentation: 'Returns the table caption.',
    category: 'record'
  },
  {
    name: 'CURRENTKEY',
    signature: '(): Text',
    documentation: 'Returns the current key as a comma-separated string.',
    category: 'record'
  },
  {
    name: 'CURRENTCOMPANY',
    signature: '(): Text',
    documentation: 'Returns the current company for this record.',
    category: 'record'
  },
  {
    name: 'CHANGECOMPANY',
    signature: '(CompanyName)',
    documentation: 'Changes the company for this record variable.',
    category: 'record'
  },
  {
    name: 'RECORDID',
    signature: '(): RecordID',
    documentation: 'Returns the RecordID of the current record.',
    category: 'record'
  },
  {
    name: 'GETPOSITION',
    signature: '([UseNames]): Text',
    documentation: 'Returns the position as a string.',
    category: 'record'
  },
  {
    name: 'SETPOSITION',
    signature: '(String)',
    documentation: 'Sets the record position from a string.',
    category: 'record'
  },
  {
    name: 'GETRECORDID',
    signature: '(): RecordID',
    documentation: 'Returns the RecordID of the current record.',
    category: 'record',
    deprecated: 'Use RECORDID instead.'
  },

  // BLOB handling
  {
    name: 'CALCFIELDS',
    signature: '(Field1 [, Field2, ...])',
    documentation: 'Calculates FlowFields and loads BLOB fields.',
    category: 'record'
  },
  {
    name: 'CALCSUMS',
    signature: '(Field1 [, Field2, ...]): Boolean',
    documentation: 'Calculates the sum of SumIndexFields.',
    category: 'record'
  },

  // Consistency
  {
    name: 'CONSISTENT',
    signature: '(Value)',
    documentation: 'Marks the record as consistent (TRUE) or inconsistent (FALSE).',
    category: 'record',
    deprecated: 'Transaction consistency is managed automatically.'
  },
  {
    name: 'SETRECFILTER',
    signature: '()',
    documentation: 'Sets the filter to the current record\'s primary key values.',
    category: 'record'
  }
];

/**
 * System type keywords used with `::` notation to reference object IDs or enum
 * values at runtime (e.g. `DATABASE::"Sales Header"`, `ACTION::OK`).
 * Not callable functions — these are identifier prefixes that the C/AL runtime
 * resolves to numeric IDs or enum members.
 *
 * Stored uppercase; the registry performs case-insensitive lookup via
 * `.toUpperCase()`.
 */
export const SYSTEM_TYPE_KEYWORDS: Set<string> = new Set([
  'DATABASE',            // Table ID references: DATABASE::"Sales Header"
  'PAGE',                // Page ID references
  'CODEUNIT',            // Codeunit ID references
  'REPORT',              // Report ID references
  'XMLPORT',             // XMLport ID references
  'QUERY',               // Query ID references
  'ACTION',              // Page action results: ACTION::OK, ACTION::LookupOK, ACTION::Cancel
  'TABLECONNECTIONTYPE', // Enum for SETDEFAULTTABLECONNECTION
  'DATACLASSIFICATION',  // BC14 (NAV 2018+) enum: DataClassification::CustomerContent
  'OBSOLETESTATE',       // BC14 enum: ObsoleteState::Pending, ObsoleteState::Removed
]);

/**
 * All built-in functions combined
 */
export const BUILTIN_FUNCTIONS: BuiltinFunction[] = [
  ...DIALOG_FUNCTIONS,
  ...STRING_FUNCTIONS,
  ...MATH_FUNCTIONS,
  ...DATE_FUNCTIONS,
  ...SYSTEM_FUNCTIONS,
  ...FILE_FUNCTIONS,
  ...REPORT_FUNCTIONS
];
