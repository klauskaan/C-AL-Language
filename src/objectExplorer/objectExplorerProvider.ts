import * as fs from 'fs';
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

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

export class ObjectExplorerProvider {
  public static readonly viewType = 'calObjectExplorer';

  private static currentPanel: ObjectExplorerProvider | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _client: LanguageClient | undefined;
  private _disposables: vscode.Disposable[] = [];

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

    ObjectExplorerProvider.currentPanel = new ObjectExplorerProvider(panel, context.extensionUri, client);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, client: LanguageClient | undefined) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._client = client;

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    this._panel.webview.onDidReceiveMessage(
      (message: { type: string; uri?: string; line?: number }) => {
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
    ObjectExplorerProvider.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _handleMessage(message: { type: string; uri?: string; line?: number }): void {
    switch (message.type) {
      case 'ready':
        this._loadObjectList();
        break;
      case 'navigate':
        if (message.uri !== undefined && message.line !== undefined) {
          this._navigate(message.uri, message.line);
        }
        break;
    }
  }

  private _loadObjectList(): void {
    if (!this._client) {
      return;
    }
    this._panel.webview.postMessage({ type: 'loading', loading: true });
    this._client.sendRequest<ObjectMetadata[]>('cal/getObjectList').then(
      (objects) => {
        this._panel.webview.postMessage({ type: 'data', objects });
        this._panel.webview.postMessage({ type: 'loading', loading: false });
      },
      () => {
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
