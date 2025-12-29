import * as path from 'path';
import { workspace, ExtensionContext, Uri, Position, Location, Range } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
  console.log('C/AL Extension activating...');

  // Check if language server is enabled
  const config = workspace.getConfiguration('cal');
  const lsEnabled = config.get<boolean>('languageServer.enabled', true);
  const semanticEnabled = config.get<boolean>('semanticHighlighting.enabled', true);

  console.log(`C/AL Settings: languageServer.enabled=${lsEnabled}, semanticHighlighting.enabled=${semanticEnabled}`);

  if (!lsEnabled) {
    console.log('C/AL Language Server is disabled by user settings');
    return;
  }

  // Stop any existing client first (handles extension reload case)
  if (client) {
    try {
      await client.stop();
    } catch (err) {
      console.error('Error stopping existing language client:', err);
    }
    client = undefined;
  }

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join('out', 'server', 'server.js')
  );

  // The debug options for the server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  // Check if semantic highlighting is enabled
  const semanticHighlightingEnabled = config.get<boolean>('semanticHighlighting.enabled', true);

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for C/AL documents
    documentSelector: [{ scheme: 'file', language: 'cal' }],
    synchronize: {
      // Notify the server about file changes to '.cal' files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/*.cal')
    },
    // Disable semantic tokens if user setting is false
    initializationOptions: {
      semanticHighlighting: semanticHighlightingEnabled
    },
    middleware: {
      // Convert CodeLens command arguments from LSP types to VS Code API types
      // This is necessary because VS Code's editor.action.showReferences command
      // expects vscode.Uri, vscode.Position, and vscode.Location[] objects,
      // but the language server sends plain string URIs and plain objects.
      provideCodeLenses: (document, token, next) => {
        return Promise.resolve(next(document, token)).then((codeLenses) => {
          if (!codeLenses) return codeLenses;

          // Convert command arguments from LSP types to VS Code types
          return codeLenses.map(lens => {
            if (lens.command?.command === 'editor.action.showReferences' && lens.command.arguments) {
              const [uri, position, locations] = lens.command.arguments;

              return {
                ...lens,
                command: {
                  ...lens.command,
                  arguments: [
                    Uri.parse(uri as string),  // Convert string URI to vscode.Uri
                    new Position(
                      (position as { line: number; character: number }).line,
                      (position as { line: number; character: number }).character
                    ),  // Convert to vscode.Position
                    (locations as Array<{ uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }>).map(loc =>
                      new Location(  // Convert to vscode.Location
                        Uri.parse(loc.uri),
                        new Range(
                          new Position(loc.range.start.line, loc.range.start.character),
                          new Position(loc.range.end.line, loc.range.end.character)
                        )
                      )
                    )
                  ]
                }
              };
            }
            return lens;
          });
        });
      }
    }
  };

  // Create the language client
  client = new LanguageClient(
    'calLanguageServer',
    'C/AL Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client with error handling
  try {
    await client.start();
    console.log('C/AL Language Server started successfully!');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Failed to start C/AL Language Server: ${msg}`);
    client = undefined;
    throw new Error(`Failed to start C/AL Language Server: ${msg}`);
  }

  // Register client for disposal on extension deactivation
  context.subscriptions.push({
    dispose: () => {
      if (client) {
        client.stop();
      }
    }
  });
}

export async function deactivate(): Promise<void> {
  if (!client) {
    return;
  }
  try {
    await client.stop();
  } catch (error) {
    console.error('Error during C/AL Language Server deactivation:', error);
  } finally {
    client = undefined;
  }
}
