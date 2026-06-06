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
  },
  {
    name: 'STRCHECKSUM',
    signature: '(String [, WeightString] [, Modulus]): Integer',
    documentation: 'Calculates a checksum for a numeric string using optional weight factors and modulus. NAV 2013+.',
    category: 'string'
  },
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
  },
  {
    name: 'ROUNDDATETIME',
    signature: '(DateTime [, Precision] [, Direction]): DateTime',
    documentation: 'Rounds a DateTime value to the nearest unit of precision.',
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
    name: 'USERSECURITYID',
    signature: '(): GUID',
    documentation: 'Returns the security ID (SID) of the current user.',
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
    name: 'GETLASTERRORTEXT',
    signature: '(): Text',
    documentation: 'Returns the text of the last error that occurred.',
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
    name: 'HYPERLINK',
    signature: '(URL: Text)',
    documentation: 'Opens the specified URL in the default browser.',
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
    name: 'BINDSUBSCRIPTION',
    signature: '(Codeunit): Boolean',
    documentation: 'Binds an event subscriber codeunit instance to the current session. Returns TRUE if successful. Introduced in NAV 2016.',
    category: 'system'
  },
  {
    name: 'UNBINDSUBSCRIPTION',
    signature: '(Codeunit): Boolean',
    documentation: 'Unbinds a previously bound event subscriber codeunit instance from the current session. Returns TRUE if successful. Introduced in NAV 2016.',
    category: 'system'
  },
  {
    name: 'SELECTLATESTVERSION',
    signature: '()',
    documentation: 'Forces the next database read to use the latest committed version of the data. Used after COMMIT to ensure subsequent reads see committed changes.',
    category: 'system'
  },
  {
    name: 'SYSTEM',
    signature: '',
    documentation: 'Built-in system object providing access to system-level properties and methods (e.g. SYSTEM.VARIANT, SYSTEM.ISNULL). Used as a member expression receiver.',
    category: 'system'
  },
  {
    name: 'SENDTRACETAG',
    signature: '(Tag: Text, Category: Text, Verbosity: Verbosity, Message: Text [, DataClassification: DataClassification])',
    documentation: 'Sends a trace tag to the telemetry system for diagnostics. Introduced in BC14.',
    category: 'system'
  },
  {
    name: 'ISNULL',
    signature: '(DotNetObject): Boolean',
    documentation: 'Returns TRUE if the DotNet variable has been set to null.',
    category: 'system'
  },

  // ── Missing from #613 ────────────────────────────────────────────────────

  {
    name: 'PRODUCTNAME',
    signature: '(): Text',
    documentation: 'Returns the full product name of the application (e.g. "Microsoft Dynamics 365 Business Central").',
    category: 'system'
  },
  {
    name: 'GETURL',
    signature: '(ClientType [, CompanyName] [, ObjectType] [, ObjectID] [, ObjectRecord] [, IsExternalNavApp]): Text',
    documentation: 'Returns a URL for the specified object or page. Introduced in NAV 2017.',
    category: 'system'
  },
  {
    name: 'CLEARLASTERROR',
    signature: '()',
    documentation: 'Clears the last error message, allowing subsequent GETLASTERRORTEXT calls to return an empty string.',
    category: 'system'
  },
  {
    name: 'SESSIONID',
    signature: '(): Integer',
    documentation: 'Returns the ID of the current session.',
    category: 'system'
  },
  {
    name: 'ISSERVICETIER',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if the current code is executing on the server (service tier), FALSE on the client.',
    category: 'system'
  },
  {
    name: 'CURRENTCLIENTTYPE',
    signature: '(): ClientType',
    documentation: 'Returns the client type for the current session (e.g. CLIENTTYPE::Windows, CLIENTTYPE::Web). Introduced in NAV 2013.',
    category: 'system'
  },
  {
    name: 'DEFAULTCLIENTTYPE',
    signature: '(): ClientType',
    documentation: 'Returns the default client type configured for the server. Introduced in NAV 2013.',
    category: 'system'
  },
  {
    name: 'GETLASTERRORCODE',
    signature: '(): Text',
    documentation: 'Returns the error code of the last error that occurred. Introduced in NAV 2015.',
    category: 'system'
  },
  {
    name: 'GETLASTERROROBJECT',
    signature: '(): DotNet',
    documentation: 'Returns the .NET exception object for the last error. Introduced in NAV 2015.',
    category: 'system'
  },
  {
    name: 'GETLASTERRORCALLSTACK',
    signature: '(): Text',
    documentation: 'Returns the call stack of the last error as a text string. Introduced in NAV 2016.',
    category: 'system'
  },
  {
    name: 'ENCRYPT',
    signature: '(PlainText: Text): Text',
    documentation: 'Encrypts a string using the server encryption key. Introduced in NAV 2015.',
    category: 'system'
  },
  {
    name: 'DECRYPT',
    signature: '(CipherText: Text): Text',
    documentation: 'Decrypts an encrypted string using the server encryption key. Introduced in NAV 2015.',
    category: 'system'
  },
  {
    name: 'ENCRYPTIONKEYEXISTS',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if a server encryption key exists. Introduced in NAV 2015.',
    category: 'system'
  },
  {
    name: 'IMPORTENCRYPTIONKEY',
    signature: '(FileName: Text, Password: Text)',
    documentation: 'Imports an encryption key file. Introduced in NAV 2015.',
    category: 'system'
  },
  {
    name: 'EXPORTENCRYPTIONKEY',
    signature: '(FileName: Text, Password: Text)',
    documentation: 'Exports the current encryption key to a file. Introduced in NAV 2015.',
    category: 'system'
  },

  // ── Missing from #623 ────────────────────────────────────────────────────

  {
    name: 'GETDOTNETTYPE',
    signature: '(DotNetVariable): DotNet "System.Type"',
    documentation: 'Returns the .NET System.Type object for a DotNet variable. Used for reflection and CreateInstance calls. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'CREATE',
    signature: '(Automation [, RunOnClient] [, WithEvents])',
    documentation: 'Creates an Automation (COM) object instance. Must be called before using an Automation variable. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'ISCLEAR',
    signature: '(Variable): Boolean',
    documentation: 'Returns TRUE if an Automation or DotNet variable has not yet been instantiated. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'CANLOADTYPE',
    signature: '(DotNetVariable): Boolean',
    documentation: 'Returns TRUE if the .NET type of the DotNet variable can be loaded on the server. NAV 2015+.',
    category: 'system'
  },
  {
    name: 'ENCRYPTIONENABLED',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if data encryption is enabled on the server. NAV 2015+.',
    category: 'system'
  },
  {
    name: 'CREATEENCRYPTIONKEY',
    signature: '()',
    documentation: 'Creates a new server encryption key. Throws an error if a key already exists. NAV 2015+.',
    category: 'system'
  },
  {
    name: 'DELETEENCRYPTIONKEY',
    signature: '()',
    documentation: 'Deletes the server encryption key. NAV 2015+.',
    category: 'system'
  },
  {
    name: 'APPLICATIONPATH',
    signature: '(): Text',
    documentation: 'Returns the path to the client application folder (used for add-ins and client-side resources). NAV 2013+.',
    category: 'system'
  },
  {
    name: 'SERVICEINSTANCEID',
    signature: '(): Integer',
    documentation: 'Returns the ID of the current NST (NAV Service Tier) service instance. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'ENVIRON',
    signature: '(Name: Text): Text',
    documentation: 'Returns the value of the specified OS environment variable. Returns an empty string if the variable does not exist. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'TENANTID',
    signature: '(): Text',
    documentation: 'Returns the tenant ID for the current session. Used in multitenant deployments. NAV 2015+.',
    category: 'system'
  },
  {
    name: 'STARTSESSION',
    signature: '(var SessionID: Integer, CodeunitID: Integer [, CompanyName] [, Record]): Boolean',
    documentation: 'Starts a new server-side session running the specified codeunit. Returns the session ID via the var parameter. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'ISSESSIONACTIVE',
    signature: '(SessionID: Integer): Boolean',
    documentation: 'Returns TRUE if the specified session ID is still active. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'SID',
    signature: '(UserName: Text): Text',
    documentation: 'Returns the Windows Security Identifier (SID) for the specified user name. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'APPLICATIONIDENTIFIER',
    signature: '(): Text',
    documentation: 'Returns the application identifier string (version info). NAV 2015+.',
    category: 'system'
  },
  {
    name: 'CODECOVERAGELOG',
    signature: '(Enable: Boolean [, MultiSession: Boolean])',
    documentation: 'Starts or stops code coverage logging. Pass TRUE to start, FALSE to stop. NAV 2015+.',
    category: 'system'
  },
  {
    name: 'CODECOVERAGEREFRESH',
    signature: '()',
    documentation: 'Refreshes the code coverage data from the server. NAV 2015+.',
    category: 'system'
  },
  {
    name: 'CODECOVERAGELOAD',
    signature: '()',
    documentation: 'Loads the stored code coverage data. NAV 2015+.',
    category: 'system'
  },
  {
    name: 'CODECOVERAGEINCLUDE',
    signature: '(Object: Record)',
    documentation: 'Specifies which objects to include in code coverage tracking. NAV 2015+.',
    category: 'system'
  },
  {
    name: 'CAPTIONCLASSTRANSLATE',
    signature: '(CaptionClassExpression: Text): Text',
    documentation: 'Translates a caption class expression into the display string for the current language. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'CHANGEUSERPASSWORD',
    signature: '(OldPassword: Text, NewPassword: Text)',
    documentation: 'Changes the password for the current NAV user. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'SETUSERPASSWORD',
    signature: '(UserSecurityID: GUID, Password: Text)',
    documentation: 'Sets the password for the specified user (identified by security ID). NAV 2013+.',
    category: 'system'
  },
  {
    name: 'IMPORTDATA',
    signature: '(ShowDialog: Boolean, var FileName: Text [, IncludeApplicationData] [, IncludeGlobalData] [, CompanyName]): Boolean',
    documentation: 'Imports database data from a NAV data file. Returns TRUE if successful. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'EXPORTDATA',
    signature: '(ShowDialog: Boolean, var FileName: Text [, IncludeApplicationData] [, IncludeGlobalData] [, CompanyName]): Boolean',
    documentation: 'Exports database data to a NAV data file. Returns TRUE if successful. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'DATAFILEINFORMATION',
    signature: '(ShowDialog: Boolean, var FileName: Text, var Description: Text, var HasApplication: Boolean, var HasApplicationData: Boolean, var HasGlobalData: Boolean, var TenantName: Text): Boolean',
    documentation: 'Reads metadata from a NAV data file without importing it. Returns TRUE if the file was read successfully. NAV 2013+.',
    category: 'system'
  },
  {
    name: 'VARIANT2DATE',
    signature: '(Variant): Date',
    documentation: 'Converts a Variant value to a Date. NAV 2013+.',
    category: 'system'
  },

  // ── System object namespaces (used as OBJECT.METHOD() receivers) ──────────

  {
    name: 'TASKSCHEDULER',
    signature: '',
    documentation: 'Built-in system object for task scheduling. Used as a receiver: TASKSCHEDULER.CREATETASK(), TASKSCHEDULER.CANCELTASK(), TASKSCHEDULER.TASKEXISTS().',
    category: 'system'
  },
  {
    name: 'DEBUGGER',
    signature: '',
    documentation: 'Built-in system object for debugger control. Used as a receiver: DEBUGGER.ACTIVATE(), DEBUGGER.DEACTIVATE(), DEBUGGER.ISACTIVE().',
    category: 'system'
  },
  {
    name: 'FILE',
    signature: '',
    documentation: 'Built-in system object for static file operations. Used as a receiver: FILE.COPY(), FILE.EXISTS(), FILE.ERASE(). Also a variable type for file handles.',
    category: 'system'
  },
  {
    name: 'ISOLATEDSTORAGE',
    signature: '',
    documentation: 'Built-in system object for isolated key-value storage. Used as a receiver: ISOLATEDSTORAGE.SET(), ISOLATEDSTORAGE.GET(), ISOLATEDSTORAGE.CONTAINS(). Introduced in BC13.',
    category: 'system'
  },
  {
    name: 'NAVAPP',
    signature: '',
    documentation: 'Built-in system object for NAV/BC app metadata. Used as a receiver: NAVAPP.GETARCHIVERECORD(), NAVAPP.ISINSTALLED(), NAVAPP.GETID(). Introduced in NAV 2016.',
    category: 'system'
  },
  {
    name: 'COMPANYPROPERTY',
    signature: '',
    documentation: 'Built-in system object for company properties. Used as a receiver: COMPANYPROPERTY.DISPLAYNAME(). Introduced in BC14.',
    category: 'system'
  },

  // ── Missing from #653 ────────────────────────────────────────────────────

  {
    name: 'APPLICATIONAREA',
    signature: '([Value: Text]): Text',
    documentation: 'Gets or sets the application area filter for the current session. When called with no argument, returns the current application area. NAV 2017+.',
    category: 'system'
  },
  {
    name: 'IMPORTSTREAMWITHURLACCESS',
    signature: '(InStream: InStream, FileName: Text): GUID',
    documentation: 'Imports a stream into tenant media storage with public URL access. Returns the GUID of the created media object. NAV 2017+.',
    category: 'system'
  },
  {
    name: 'GETDOCUMENTURL',
    signature: '(MediaID: GUID): Text',
    documentation: 'Returns the URL for a media document stored via IMPORTSTREAMWITHURLACCESS. NAV 2017+.',
    category: 'system'
  },
  {
    name: 'CURRENTEXECUTIONMODE',
    signature: '(): Option',
    documentation: 'Returns the current execution mode of the session (Normal or Debug). NAV 2013+.',
    category: 'system'
  },
  {
    name: 'CONTEXTURL',
    signature: '(): Text',
    documentation: 'Returns the URL of the current NAV client context. NAV 2013+.',
    category: 'system'
  },
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
  },
  {
    name: 'COPYSTREAM',
    signature: '(InStream, OutStream)',
    documentation: 'Copies the content of an InStream to an OutStream.',
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
    signature: '(Value1 [, Value2, ...]): Boolean',
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
    name: 'COPYFILTER',
    signature: '(FromField, ToField)',
    documentation: 'Copies the filter for a single field from another record variable.',
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
  {
    name: 'SETVIEW',
    signature: '(String)',
    documentation: 'Sets the current sort order, key, and filters from a string representation.',
    category: 'record'
  },
  {
    name: 'GETVIEW',
    signature: '([UseNames]): Text',
    documentation: 'Returns the current sort order, key, and filters as a string. UseNames controls whether field names or numbers are used.',
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
  {
    name: 'SETASCENDING',
    signature: '(Field, Value)',
    documentation: 'Sets ascending (TRUE) or descending (FALSE) sort order for a specific field.',
    category: 'record'
  },
  {
    name: 'GETASCENDING',
    signature: '(Field): Boolean',
    documentation: 'Returns TRUE if the specified field is sorted in ascending order.',
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
  {
    name: 'ISTEMPORARY',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if the record variable is temporary (in-memory only).',
    category: 'record'
  },
  {
    name: 'SETAUTOCALCFIELDS',
    signature: '(Field1 [, Field2, ...])',
    documentation: 'Sets FlowFields to automatically calculate when the record is retrieved.',
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
    signature: '(CompanyName): Boolean',
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
  {
    name: 'READPERMISSION',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if the user has read permission on the table.',
    category: 'record'
  },
  {
    name: 'WRITEPERMISSION',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if the user has write permission on the table.',
    category: 'record'
  },
  {
    name: 'SETPERMISSIONFILTER',
    signature: '()',
    documentation: 'Applies the user\'s security filter to the record.',
    category: 'record'
  },
  {
    name: 'SECURITYFILTERING',
    signature: '([SecurityFilter]): SecurityFilter',
    documentation: 'Gets or sets the security filtering mode for the record variable. Values: SECURITYFILTER::Filtered, Ignored, Validated, Disallowed.',
    category: 'record'
  },

  // BLOB handling
  {
    name: 'CALCFIELDS',
    signature: '(Field1 [, Field2, ...]): Boolean',
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
  },

  // Links
  {
    name: 'HASLINKS',
    signature: '(): Boolean',
    documentation: 'Returns TRUE if the record has any links attached.',
    category: 'record'
  },
  {
    name: 'ADDLINK',
    signature: '(URL [, Description]): Integer',
    documentation: 'Adds a link (URL or path) to the record.',
    category: 'record'
  },
  {
    name: 'DELETELINKS',
    signature: '()',
    documentation: 'Deletes all links from the current record.',
    category: 'record'
  },
  {
    name: 'DELETELINK',
    signature: '(ID)',
    documentation: 'Deletes a specific link by its ID.',
    category: 'record'
  },
  {
    name: 'COPYLINKS',
    signature: '(FromRecord)',
    documentation: 'Copies all links from another record to this record.',
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
  'VERBOSITY',           // Enum for SENDTRACETAG: Verbosity::Normal, Verbosity::Warning, etc. (BC14)
  'CLIENTTYPE',          // Enum for CURRENTCLIENTTYPE: CLIENTTYPE::Windows, CLIENTTYPE::Web, etc.
  'TEXTENCODING',        // Enum for file I/O encoding: TEXTENCODING::MSDos, TEXTENCODING::UTF8, etc.

  // ── Missing from #613 ────────────────────────────────────────────────────

  'NOTIFICATIONSCOPE',   // Enum for notification scope: NOTIFICATIONSCOPE::LocalScope, NOTIFICATIONSCOPE::Global
  'OBJECTTYPE',          // Enum for object types: OBJECTTYPE::Table, OBJECTTYPE::Page, OBJECTTYPE::Codeunit, etc.
  'SECURITYFILTER',      // Enum for security filtering: SECURITYFILTER::Filtered, SECURITYFILTER::Validated, etc.
  'REPORTFORMAT',        // Enum for report output format: REPORTFORMAT::Rdlc, REPORTFORMAT::Word, REPORTFORMAT::Excel
  'TRANSACTIONTYPE',     // Enum for transaction types: TRANSACTIONTYPE::Browse, TRANSACTIONTYPE::UpdateNoLocks, etc.

  // ── Missing from #623 ────────────────────────────────────────────────────

  'DATASCOPE',       // Enum for ISOLATEDSTORAGE scope: DATASCOPE::Company, DATASCOPE::CompanyAndUser, DATASCOPE::User (BC13+)
  'DEFAULTLAYOUT',   // Enum for report default layout: DEFAULTLAYOUT::None, DEFAULTLAYOUT::RDLC, DEFAULTLAYOUT::Word (NAV 2016+)

  // ── Missing from #653 / corrected in #687 ─────────────────────────────────

  'EXECUTIONMODE',   // Enum for CURRENTEXECUTIONMODE: EXECUTIONMODE::Debug, EXECUTIONMODE::Normal (BC14)
]);

/**
 * Builtins reachable via the SYSTEM.<name> qualified form (C/AL: SYSTEM.EVALUATE, etc.).
 * Derived from Microsoft's documented "System data type" STATIC METHODS
 * (learn.microsoft.com/.../methods-auto/system/system-data-type) ∩ BUILTIN_FUNCTIONS.
 * Used to offer a SYSTEM.<name> completion when a user symbol shadows a global builtin (#809).
 * NOTE: `category` is NOT a valid selector — COPYSTREAM/TEMPORARYPATH are category:'file' yet
 * ARE System static methods; FORMAT is category:'string' yet qualifiable. Use this explicit set.
 * ISSERVICETIER is intentionally EXCLUDED (deprecated at introduction), so this is 62, not 63.
 */
export const SYSTEM_QUALIFIABLE: ReadonlySet<string> = new Set([
  'ABS', 'APPLICATIONPATH', 'ARRAYLEN', 'CALCDATE', 'CANLOADTYPE', 'CAPTIONCLASSTRANSLATE',
  'CLEAR', 'CLEARALL', 'CLEARLASTERROR', 'CLOSINGDATE', 'CODECOVERAGEINCLUDE', 'CODECOVERAGELOAD',
  'CODECOVERAGELOG', 'CODECOVERAGEREFRESH', 'COMPRESSARRAY', 'COPYARRAY', 'COPYSTREAM',
  'CREATEDATETIME', 'CREATEENCRYPTIONKEY', 'CREATEGUID', 'CURRENTDATETIME', 'DATE2DMY', 'DATE2DWY',
  'DECRYPT', 'DELETEENCRYPTIONKEY', 'DMY2DATE', 'DT2DATE', 'DT2TIME', 'DWY2DATE', 'ENCRYPT',
  'ENCRYPTIONENABLED', 'ENCRYPTIONKEYEXISTS', 'EVALUATE', 'EXPORTENCRYPTIONKEY', 'FORMAT',
  'GETDOCUMENTURL', 'GETDOTNETTYPE', 'GETLASTERRORCALLSTACK', 'GETLASTERRORCODE',
  'GETLASTERROROBJECT', 'GETLASTERRORTEXT', 'GETURL', 'GLOBALLANGUAGE', 'GUIALLOWED', 'HYPERLINK',
  'IMPORTENCRYPTIONKEY', 'IMPORTSTREAMWITHURLACCESS', 'ISNULL', 'ISNULLGUID', 'NORMALDATE',
  'POWER', 'RANDOM', 'RANDOMIZE', 'ROUND', 'ROUNDDATETIME', 'SLEEP', 'TEMPORARYPATH', 'TIME',
  'TODAY', 'VARIANT2DATE', 'WINDOWSLANGUAGE', 'WORKDATE'
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
