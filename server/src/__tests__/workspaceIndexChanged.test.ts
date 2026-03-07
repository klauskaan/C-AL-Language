/**
 * Workspace Index Changed Notification Tests (#736)
 *
 * Tests that the server sends a 'cal/workspaceIndexChanged' notification to the
 * client after the workspace index is mutated by onDidChangeWatchedFiles.
 *
 * The server.ts module cannot be imported directly in tests (it crashes without
 * a live IPC connection). These tests use a handler simulator that mirrors the
 * actual onDidChangeWatchedFiles logic in server.ts.
 *
 * Behaviors verified:
 *   1. Deletion of a tracked .cal file → sendNotification called once (batch)
 *   2. Deletion of an untracked file (has() returns false) → sendNotification NOT called
 *   3. File created/changed where updateIfNotFresher returns true → sendNotification called
 *   4. File created/changed where updateIfNotFresher returns false → sendNotification NOT called
 *   5. Non-.cal/.txt file skipped → sendNotification NOT called
 *   6. .txt file skipped when includeTxtFiles is false → sendNotification NOT called
 *   7. Batch changes → ONE sendNotification per batch (not per file)
 */

import { fileURLToPath } from 'url';
import { hasCalExtension, hasTxtExtension } from '../utils/fileExtensions';

// FileChangeType constants (mirrors vscode-languageserver FileChangeType values)
const FileChangeType = {
  Created: 1,
  Changed: 2,
  Deleted: 3
} as const;

/**
 * Minimal mock types that mirror server.ts dependencies
 */
interface MockConnection {
  sendNotification: jest.Mock;
  console: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
}

interface MockWorkspaceIndex {
  has: jest.Mock;
  remove: jest.Mock;
  updateIfNotFresher: jest.Mock;
}

interface Settings {
  workspaceIndexing: {
    includeTxtFiles: boolean;
  };
}

/**
 * Mirrors the onDidChangeWatchedFiles handler logic from server.ts.
 *
 * Simplified for testability (server.ts cannot be imported directly — it
 * crashes without a live IPC connection). Omissions vs real handler:
 *   - No isCalContent() heuristic check for .txt files (separate concern)
 *   - Simplified error message format in the catch block
 */
async function simulateOnDidChangeWatchedFiles(
  params: { changes: Array<{ uri: string; type: number }> },
  connection: MockConnection,
  workspaceIndex: MockWorkspaceIndex,
  settings: Settings
): Promise<void> {
  let indexChanged = false;
  for (const change of params.changes) {
    try {
      const filePath = fileURLToPath(change.uri);

      const isCalFile = hasCalExtension(filePath);
      const isTxtFile = hasTxtExtension(filePath);

      if (!isCalFile && !isTxtFile) {
        continue;
      }

      if (isTxtFile && !settings.workspaceIndexing.includeTxtFiles) {
        continue;
      }

      if (change.type === FileChangeType.Deleted) {
        const wasTracked = workspaceIndex.has(filePath);
        workspaceIndex.remove(filePath);
        if (wasTracked) {
          indexChanged = true;
        }
      } else {
        const timestamp = Date.now();
        const wasUpdated = await workspaceIndex.updateIfNotFresher(filePath, timestamp);
        if (wasUpdated) {
          indexChanged = true;
        }
      }
    } catch (error) {
      connection.console.warn(`Failed to handle file change for ${change.uri}`);
    }
  }
  if (indexChanged) {
    connection.sendNotification('cal/workspaceIndexChanged');
  }
}

/**
 * Factory for mock connection
 */
function makeConnection(): MockConnection {
  return {
    sendNotification: jest.fn(),
    console: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  };
}

/**
 * Factory for mock workspace index
 */
function makeWorkspaceIndex(updateIfNotFresherResult: boolean = true): MockWorkspaceIndex {
  return {
    has: jest.fn().mockReturnValue(true),
    remove: jest.fn(),
    updateIfNotFresher: jest.fn().mockResolvedValue(updateIfNotFresherResult)
  };
}

const defaultSettings: Settings = {
  workspaceIndexing: { includeTxtFiles: false }
};

// ============================================================================
// Deletion cases — notification expected
// ============================================================================

describe('onDidChangeWatchedFiles — deletion', () => {
  it('should send cal/workspaceIndexChanged when a .cal file is deleted', async () => {
    const connection = makeConnection();
    const workspaceIndex = makeWorkspaceIndex();

    await simulateOnDidChangeWatchedFiles(
      { changes: [{ uri: 'file:///workspace/Table18.cal', type: FileChangeType.Deleted }] },
      connection,
      workspaceIndex,
      defaultSettings
    );

    expect(workspaceIndex.remove).toHaveBeenCalledTimes(1);
    expect(connection.sendNotification).toHaveBeenCalledWith('cal/workspaceIndexChanged');
    expect(connection.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('should send cal/workspaceIndexChanged when a .txt file is deleted and includeTxtFiles is enabled', async () => {
    const connection = makeConnection();
    const workspaceIndex = makeWorkspaceIndex();
    const settings: Settings = { workspaceIndexing: { includeTxtFiles: true } };

    await simulateOnDidChangeWatchedFiles(
      { changes: [{ uri: 'file:///workspace/Export.txt', type: FileChangeType.Deleted }] },
      connection,
      workspaceIndex,
      settings
    );

    expect(workspaceIndex.remove).toHaveBeenCalledTimes(1);
    expect(connection.sendNotification).toHaveBeenCalledWith('cal/workspaceIndexChanged');
    expect(connection.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('should NOT send cal/workspaceIndexChanged when deleting an untracked file', async () => {
    const connection = makeConnection();
    const workspaceIndex = makeWorkspaceIndex();
    workspaceIndex.has.mockReturnValue(false); // File was not in the index

    await simulateOnDidChangeWatchedFiles(
      { changes: [{ uri: 'file:///workspace/Table18.cal', type: FileChangeType.Deleted }] },
      connection,
      workspaceIndex,
      defaultSettings
    );

    expect(workspaceIndex.has).toHaveBeenCalledTimes(1);
    expect(workspaceIndex.remove).toHaveBeenCalledTimes(1);
    expect(connection.sendNotification).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Update cases — wasUpdated = true → notification expected
// ============================================================================

describe('onDidChangeWatchedFiles — update succeeds (wasUpdated = true)', () => {
  it('should send cal/workspaceIndexChanged when a created .cal file is indexed', async () => {
    const connection = makeConnection();
    const workspaceIndex = makeWorkspaceIndex(true);

    await simulateOnDidChangeWatchedFiles(
      { changes: [{ uri: 'file:///workspace/Table18.cal', type: FileChangeType.Created }] },
      connection,
      workspaceIndex,
      defaultSettings
    );

    expect(workspaceIndex.updateIfNotFresher).toHaveBeenCalledTimes(1);
    expect(connection.sendNotification).toHaveBeenCalledWith('cal/workspaceIndexChanged');
    expect(connection.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('should send cal/workspaceIndexChanged when a changed .cal file is re-indexed', async () => {
    const connection = makeConnection();
    const workspaceIndex = makeWorkspaceIndex(true);

    await simulateOnDidChangeWatchedFiles(
      { changes: [{ uri: 'file:///workspace/Codeunit50000.cal', type: FileChangeType.Changed }] },
      connection,
      workspaceIndex,
      defaultSettings
    );

    expect(workspaceIndex.updateIfNotFresher).toHaveBeenCalledTimes(1);
    expect(connection.sendNotification).toHaveBeenCalledWith('cal/workspaceIndexChanged');
    expect(connection.sendNotification).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Update cases — wasUpdated = false → notification NOT expected
// ============================================================================

describe('onDidChangeWatchedFiles — update rejected (wasUpdated = false)', () => {
  it('should NOT send cal/workspaceIndexChanged when updateIfNotFresher returns false', async () => {
    const connection = makeConnection();
    const workspaceIndex = makeWorkspaceIndex(false);

    await simulateOnDidChangeWatchedFiles(
      { changes: [{ uri: 'file:///workspace/Table18.cal', type: FileChangeType.Changed }] },
      connection,
      workspaceIndex,
      defaultSettings
    );

    expect(workspaceIndex.updateIfNotFresher).toHaveBeenCalledTimes(1);
    expect(connection.sendNotification).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Skip cases — file type filtering → no mutation, no notification
// ============================================================================

describe('onDidChangeWatchedFiles — skipped files (no index mutation)', () => {
  it('should NOT send cal/workspaceIndexChanged for a non-.cal non-.txt file', async () => {
    const connection = makeConnection();
    const workspaceIndex = makeWorkspaceIndex();

    await simulateOnDidChangeWatchedFiles(
      { changes: [{ uri: 'file:///workspace/script.js', type: FileChangeType.Changed }] },
      connection,
      workspaceIndex,
      defaultSettings
    );

    expect(workspaceIndex.remove).not.toHaveBeenCalled();
    expect(workspaceIndex.updateIfNotFresher).not.toHaveBeenCalled();
    expect(connection.sendNotification).not.toHaveBeenCalled();
  });

  it('should NOT send cal/workspaceIndexChanged for a .txt file when includeTxtFiles is false', async () => {
    const connection = makeConnection();
    const workspaceIndex = makeWorkspaceIndex();
    const settings: Settings = { workspaceIndexing: { includeTxtFiles: false } };

    await simulateOnDidChangeWatchedFiles(
      { changes: [{ uri: 'file:///workspace/Export.txt', type: FileChangeType.Changed }] },
      connection,
      workspaceIndex,
      settings
    );

    expect(workspaceIndex.remove).not.toHaveBeenCalled();
    expect(workspaceIndex.updateIfNotFresher).not.toHaveBeenCalled();
    expect(connection.sendNotification).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Batch cases — multiple changes in a single notification event
// ============================================================================

describe('onDidChangeWatchedFiles — batch changes', () => {
  it('should send cal/workspaceIndexChanged once for a batch with multiple mutations', async () => {
    const connection = makeConnection();
    const workspaceIndex: MockWorkspaceIndex = {
      has: jest.fn().mockReturnValue(true),
      remove: jest.fn(),
      updateIfNotFresher: jest.fn()
        .mockResolvedValueOnce(true)   // Table18.cal created — wasUpdated = true
        .mockResolvedValueOnce(false)  // Codeunit50000.cal — stale, wasUpdated = false
    };

    await simulateOnDidChangeWatchedFiles(
      {
        changes: [
          { uri: 'file:///workspace/Table18.cal', type: FileChangeType.Created },         // wasUpdated = true → indexChanged
          { uri: 'file:///workspace/settings.json', type: FileChangeType.Changed },       // skipped — not .cal/.txt
          { uri: 'file:///workspace/Codeunit50000.cal', type: FileChangeType.Changed },   // wasUpdated = false → no change
          { uri: 'file:///workspace/Page21.cal', type: FileChangeType.Deleted }            // deleted tracked file → indexChanged
        ]
      },
      connection,
      workspaceIndex,
      defaultSettings
    );

    // Batch: one notification after the loop regardless of how many mutations occurred
    expect(connection.sendNotification).toHaveBeenCalledTimes(1);
    expect(connection.sendNotification).toHaveBeenCalledWith('cal/workspaceIndexChanged');
  });

  it('should send cal/workspaceIndexChanged once for a batch of deletions', async () => {
    const connection = makeConnection();
    const workspaceIndex = makeWorkspaceIndex();

    await simulateOnDidChangeWatchedFiles(
      {
        changes: [
          { uri: 'file:///workspace/Table18.cal', type: FileChangeType.Deleted },
          { uri: 'file:///workspace/Page21.cal', type: FileChangeType.Deleted }
        ]
      },
      connection,
      workspaceIndex,
      defaultSettings
    );

    expect(workspaceIndex.remove).toHaveBeenCalledTimes(2);
    // Batch: one notification after the loop even though two files were deleted
    expect(connection.sendNotification).toHaveBeenCalledTimes(1);
    expect(connection.sendNotification).toHaveBeenCalledWith('cal/workspaceIndexChanged');
  });
});

// ============================================================================
// Error handling — exceptions in handler do not propagate notification
// ============================================================================

describe('onDidChangeWatchedFiles — error handling', () => {
  it('should NOT send cal/workspaceIndexChanged when remove() throws before notification', async () => {
    const connection = makeConnection();
    const workspaceIndex: MockWorkspaceIndex = {
      has: jest.fn().mockReturnValue(true),
      remove: jest.fn().mockImplementation(() => { throw new Error('Disk error'); }),
      updateIfNotFresher: jest.fn()
    };

    await simulateOnDidChangeWatchedFiles(
      { changes: [{ uri: 'file:///workspace/Table18.cal', type: FileChangeType.Deleted }] },
      connection,
      workspaceIndex,
      defaultSettings
    );

    expect(connection.sendNotification).not.toHaveBeenCalled();
    expect(connection.console.warn).toHaveBeenCalled();
  });

  it('should continue processing subsequent changes after an error on one file', async () => {
    const connection = makeConnection();
    const workspaceIndex: MockWorkspaceIndex = {
      has: jest.fn().mockReturnValue(true),
      remove: jest.fn()
        .mockImplementationOnce(() => { throw new Error('Disk error'); })  // first delete throws
        .mockImplementationOnce(() => { /* success */ }),                   // second delete succeeds
      updateIfNotFresher: jest.fn()
    };

    await simulateOnDidChangeWatchedFiles(
      {
        changes: [
          { uri: 'file:///workspace/Table18.cal', type: FileChangeType.Deleted }, // throws — no notification
          { uri: 'file:///workspace/Page21.cal', type: FileChangeType.Deleted }   // succeeds — notification sent
        ]
      },
      connection,
      workspaceIndex,
      defaultSettings
    );

    // Only the second deletion succeeds and sends a notification
    expect(connection.sendNotification).toHaveBeenCalledTimes(1);
    expect(connection.sendNotification).toHaveBeenCalledWith('cal/workspaceIndexChanged');
  });
});
