// ASCEND — web BackupFileAdapter implementation
//
// Two real, permanent platform paths (v0.3.2 §BackupFileAdapter), not a
// temporary shim: Chromium (desktop + Android) supports the File System
// Access API, so back-ups can be written straight into a folder the user
// picks once and are read back the same way. Firefox and iOS Safari have
// no such API at all — there the only options are the existing
// blob-download/`<a download>` trick and a plain `<input type=file>` picker.
// Core/application code (storage/backup.ts) never branches on browser here;
// it only ever calls the BackupFileAdapter interface from backupTypes.ts.

import { MetaRepo } from './database';
import type { BackupFileAdapter, PickedBackupFile, SaveResult } from './backupTypes';

const DIRECTORY_HANDLE_KEY = 'backupDirectoryHandle';

// Minimal local shape for the parts of the File System Access API this file
// actually uses — kept separate from any global lib.dom.d.ts declarations
// (whose availability varies by TS version) so this compiles regardless of
// whether those globals exist.
interface FSFileHandleLike {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
  getFile(): Promise<File>;
}

interface FSDirectoryHandleLike {
  queryPermission?(opts: { mode: 'readwrite' }): Promise<string>;
  requestPermission?(opts: { mode: 'readwrite' }): Promise<string>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FSFileHandleLike>;
}

type FSWindow = Window & {
  showSaveFilePicker(opts: unknown): Promise<FSFileHandleLike>;
  showOpenFilePicker(opts: unknown): Promise<FSFileHandleLike[]>;
  showDirectoryPicker(opts: unknown): Promise<FSDirectoryHandleLike>;
};

function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showDirectoryPicker' in window;
}

function fsWindow(): FSWindow {
  return window as unknown as FSWindow;
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

async function getStoredDirectoryHandle(): Promise<FSDirectoryHandleLike | undefined> {
  return MetaRepo.get<FSDirectoryHandleLike>(DIRECTORY_HANDLE_KEY);
}

async function ensureReadWritePermission(handle: FSDirectoryHandleLike): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const opts = { mode: 'readwrite' as const };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

async function saveViaFileSystemAccess(data: Blob, suggestedName: string): Promise<SaveResult> {
  const dirHandle = await getStoredDirectoryHandle();
  if (dirHandle && (await ensureReadWritePermission(dirHandle))) {
    try {
      const fileHandle = await dirHandle.getFileHandle(suggestedName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      return { success: true, savedTo: suggestedName };
    } catch {
      // Remembered directory may have been moved/deleted/revoked since it
      // was chosen — fall through to a one-off save-file picker instead of
      // failing the whole export.
    }
  }

  try {
    const handle = await fsWindow().showSaveFilePicker({
      suggestedName,
      types: [{ description: 'ASCEND back-up', accept: { 'application/json': ['.json'] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
    return { success: true, savedTo: suggestedName };
  } catch (err) {
    if (isAbort(err)) return { success: false };
    throw err;
  }
}

function saveViaDownload(data: Blob, suggestedName: string): SaveResult {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { success: true };
}

function pickViaInput(): Promise<PickedBackupFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.className = 'hidden';
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      resolve(file ? { name: file.name, readText: () => file.text() } : null);
    };
    document.body.appendChild(input);
    input.click();
  });
}

export const webBackupFileAdapter: BackupFileAdapter = {
  async saveBackup(data, suggestedName) {
    if (hasFileSystemAccess()) return saveViaFileSystemAccess(data, suggestedName);
    return saveViaDownload(data, suggestedName);
  },

  async pickBackupFile() {
    if (hasFileSystemAccess()) {
      try {
        const [handle] = await fsWindow().showOpenFilePicker({
          types: [{ description: 'ASCEND back-up', accept: { 'application/json': ['.json'] } }],
        });
        if (!handle) return null;
        const file = await handle.getFile();
        return { name: file.name, readText: () => file.text() };
      } catch (err) {
        if (isAbort(err)) return null;
        throw err;
      }
    }
    return pickViaInput();
  },

  supportsPreferredDirectory() {
    return hasFileSystemAccess();
  },

  async choosePreferredDirectory() {
    if (!hasFileSystemAccess()) return;
    try {
      const handle = await fsWindow().showDirectoryPicker({ mode: 'readwrite' });
      await MetaRepo.set(DIRECTORY_HANDLE_KEY, handle);
    } catch (err) {
      if (!isAbort(err)) throw err;
    }
  },

  async hasPreferredDirectory() {
    return (await getStoredDirectoryHandle()) !== undefined;
  },
};
