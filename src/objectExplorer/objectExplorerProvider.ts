import * as fs from 'fs';
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

// NOTE: ObjectMetadata is duplicated from server/src/workspaceSymbol/workspaceIndex.ts
// (separate TypeScript compilation units cannot share imports across the LSP boundary).
// If you modify this interface, you MUST update both copies and the sync test:
// server/src/workspaceSymbol/__tests__/objectMetadataShape.test.ts
interface ObjectMetadata {
  type: string;
  id: number;
  name: string;
  uri: string;
  line: number;
  date?: string;
  time?: string;
  modified?: boolean;
  versionList?: string;
}

interface ObjectExplorerState {
  typeFilter?: string | null;
  sortColumn?: string | null;
  sortDir?: 'asc' | 'desc';
  columnWidths?: Record<string, number>;
}

export class ObjectExplorerProvider {
  public static readonly viewType = 'calObjectExplorer';

  private static currentPanel: ObjectExplorerProvider | undefined;

  private static readonly STATE_KEY = 'calObjectExplorer.state';
  private readonly _globalState: vscode.Memento;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _client: LanguageClient | undefined;
  private _disposables: vscode.Disposable[] = [];
  private _disposed = false;

  public static createOrShow(
    context: vscode.ExtensionContext,
    client: LanguageClient | undefined
  ): void {
    if (ObjectExplorerProvider.currentPanel) {
      ObjectExplorerProvider.currentPanel._panel.reveal(vscode.ViewColumn.Active);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ObjectExplorerProvider.viewType,
      'Object Explorer',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'src', 'objectExplorer', 'webview')
        ]
      }
    );

    ObjectExplorerProvider.currentPanel = new ObjectExplorerProvider(panel, context.extensionUri, client, context.globalState);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, client: LanguageClient | undefined, globalState: vscode.Memento) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._client = client;
    this._globalState = globalState;

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    this._panel.webview.onDidReceiveMessage(
      (message: { type: string; uri?: string; line?: number; typeFilter?: string; sortColumn?: string | null; sortDir?: string; columnWidths?: Record<string, number> }) => {
        this._handleMessage(message);
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(
      () => this.dispose(),
      null,
      this._disposables
    );
  }

  public dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    ObjectExplorerProvider.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  public static refresh(): void {
    ObjectExplorerProvider.currentPanel?._loadObjectList();
  }

  private _handleMessage(message: { type: string; uri?: string; line?: number; typeFilter?: string; sortColumn?: string | null; sortDir?: string; columnWidths?: Record<string, number> }): void {
    switch (message.type) {
      case 'ready': {
        const saved = this._globalState.get<ObjectExplorerState>(ObjectExplorerProvider.STATE_KEY);
        const rowHeightSetting = vscode.workspace.getConfiguration('cal.objectExplorer').get<string>('rowHeight', 'comfortable');
        const rowHeightMap: Record<string, number> = { comfortable: 40, compact: 28, dense: 20 };
        const rowHeight = rowHeightMap[rowHeightSetting] ?? 40;
        this._panel.webview.postMessage({
          type: 'restoreState',
          rowHeight,
          typeFilter: saved?.typeFilter,
          sortColumn: saved?.sortColumn,
          sortDir: saved?.sortDir,
          columnWidths: saved?.columnWidths
        });
        this._loadObjectList();
        break;
      }
      case 'navigate':
        if (message.uri !== undefined && message.line !== undefined) {
          this._navigate(message.uri, message.line);
        }
        break;
      case 'refresh':
        this._loadObjectList();
        break;
      case 'saveState': {
        const state: ObjectExplorerState = {
          typeFilter: message.typeFilter ?? null,
          sortColumn: message.sortColumn ?? null,
          sortDir: message.sortDir === 'desc' ? 'desc' : 'asc',
          columnWidths: message.columnWidths
        };
        this._globalState.update(ObjectExplorerProvider.STATE_KEY, state);
        break;
      }
      case 'resetLayout': {
        const current = this._globalState.get<ObjectExplorerState>(ObjectExplorerProvider.STATE_KEY);
        this._globalState.update(ObjectExplorerProvider.STATE_KEY, {
          typeFilter: current?.typeFilter ?? null
        });
        break;
      }
    }
  }

  private _loadObjectList(): void {
    if (!this._client) {
      return;
    }
    this._panel.webview.postMessage({ type: 'loading', loading: true });
    this._client.sendRequest<ObjectMetadata[]>('cal/getObjectList').then(
      (objects) => {
        if (this._disposed) return;
        this._panel.webview.postMessage({ type: 'data', objects });
        this._panel.webview.postMessage({ type: 'loading', loading: false });
      },
      () => {
        if (this._disposed) return;
        this._panel.webview.postMessage({ type: 'loading', loading: false });
      }
    );
  }

  private _navigate(uri: string, line: number): void {
    const fileUri = vscode.Uri.parse(uri);
    const pos = new vscode.Position(line, 0);
    vscode.window.showTextDocument(fileUri, {
      selection: new vscode.Range(pos, pos),
      viewColumn: vscode.ViewColumn.Beside
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const webviewUri = vscode.Uri.joinPath(
      this._extensionUri, 'src', 'objectExplorer', 'webview'
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUri, 'main.js')
    );
    const filterEngineUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUri, 'filterEngine.js')
    );
    const stateManagerUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUri, 'stateManager.js')
    );
    const selectionModelUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUri, 'selectionModel.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUri, 'style.css')
    );

    const nonce = getNonce();

    const templatePath = vscode.Uri.joinPath(webviewUri, 'index.html').fsPath;
    const template = fs.readFileSync(templatePath, 'utf8');

    return template
      .replace(/\{\{NONCE\}\}/g, nonce)
      .replace(/\{\{STYLE_URI\}\}/g, styleUri.toString())
      .replace(/\{\{STYLE_URI_CSP\}\}/g, webview.cspSource)
      .replace(/\{\{FILTER_ENGINE_URI\}\}/g, filterEngineUri.toString())
      .replace(/\{\{STATE_MANAGER_URI\}\}/g, stateManagerUri.toString())
      .replace(/\{\{SELECTION_MODEL_URI\}\}/g, selectionModelUri.toString())
      .replace(/\{\{SCRIPT_URI\}\}/g, scriptUri.toString());
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
