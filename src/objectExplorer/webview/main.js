// @ts-check

// eslint-disable-next-line no-undef
const vscode = acquireVsCodeApi();

window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.type) {
    case 'data':
      // Will render object list in future issues
      break;
    case 'loading':
      // Will show/hide loading indicator in future issues
      break;
    case 'restoreState':
      // Will restore persisted state in future issues
      break;
  }
});

vscode.postMessage({ type: 'ready' });
