import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
  console.log('C/AL Extension activating...');

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

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for C/AL documents
    documentSelector: [{ scheme: 'file', language: 'cal' }],
    synchronize: {
      // Notify the server about file changes to '.cal' files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/*.cal')
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
