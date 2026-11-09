// ASCEND — web BackupFileAdapter implementation
//
// Two real, permanent platform paths (v0.3.2 §BackupFileAdapter), not a
// temporary shim: Chromium (desktop + Android) supports the File System
// Access API, so back-ups can be written straight into a folder the user
// picks once and are read back the same way. Firefox and iOS Safari have
// no such API at all — there the only options are the existing
// blob-download/`<a download>` trick and a plain `<input type=file>` picker.
// Core/application code (storage/backupNormalize.ts) never branches on browser here;
// it only ever calls the BackupFileAdapter interface from backupTypes.ts.

import { MetaRepo } from './database';
import type { BackupFileAdapter, PickedBackupFile, SaveResult } from './backupTypes';
import { AutoBackupError } from '../engine/autoBackup';
import { APP_BACKUP_LABEL, appBackupFolder, type AutoBackupTarget } from '../integrations/backupFolder';
import { saveManualBackup } from './manualBackup';

const DIRECTORY_HANDLE_KEY = 'backupDirectoryHandle';
const INSTALL_ID_KEY = 'autoBackupInstallId';

// Minimal local shape for the parts of the File System Access API this file
// actually uses — kept separate from any global lib.dom.d.ts declarations
// (whose availability varies by TS version) so this compiles regardless of
// whether those globals exist.
interface FSFileHandleLike {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
  getFile(): Promise<File>;
}

interface FSDirectoryHandleLike {
  name?: string;
  removeEntry?(name: string): Promise<void>;
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
      return { success: true, savedTo: suggestedName, folder: dirHandle.name ?? 'je vaste map' };
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
  return { success: true, viaDownload: true };
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
    // De Android-app: een download met een link doet in de webview niets, dus het bestand gaat zelf naar
    // Documenten/ASCEND (storage/manualBackup.ts). Een mislukking wordt gegooid, nooit stil geslikt.
    const folder = appBackupFolder();
    if (folder) {
      const { name } = await saveManualBackup(folder, await data.text());
      return { success: true, savedTo: name, folder: APP_BACKUP_LABEL };
    }
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
    if (!hasFileSystemAccess()) return false;
    try {
      const handle = await fsWindow().showDirectoryPicker({ mode: 'readwrite' });
      await MetaRepo.set(DIRECTORY_HANDLE_KEY, handle);
      return true;
    } catch (err) {
      if (!isAbort(err)) throw err;
      return false;
    }
  },

  async hasPreferredDirectory() {
    return (await getStoredDirectoryHandle()) !== undefined;
  },
};

// ---- de automatische back-up in de browser ----------------------------------------------
// (docs/beslissingen/2026-11-02-automatische-backup.md) Een browser mag niet zelf een bestand
// opslaan zonder tik. Alleen als de vaste map gekozen is en de browser hem nog zonder vragen vrijgeeft
// (queryPermission 'granted'), schrijft ASCEND er stil naartoe. Er wordt nooit om toestemming gevraagd:
// dat kan alleen na een tik, en dan doet de knop "Back-up maken" op de kaart van Vandaag het.

function domReason(err: unknown): 'folder' | 'permission' | 'write' {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotFoundError' || name === 'InvalidStateError') return 'folder';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission';
  return 'write';
}

export const webFolderTarget: AutoBackupTarget = {
  platform: 'browser',
  async access() {
    if (!hasFileSystemAccess()) return 'needs-tap';
    const handle = await getStoredDirectoryHandle().catch(() => undefined);
    if (!handle) return 'needs-tap';
    if (!handle.queryPermission) return 'ready';
    try {
      const state = await handle.queryPermission({ mode: 'readwrite' });
      return state === 'granted' ? 'ready' : state === 'denied' ? 'denied' : 'needs-tap';
    } catch {
      return 'needs-tap';
    }
  },
  async where() {
    const handle = await getStoredDirectoryHandle().catch(() => undefined);
    return { kind: 'folder', label: handle?.name ?? 'je vaste map' };
  },
  async write(name, text) {
    const handle = await getStoredDirectoryHandle().catch(() => undefined);
    if (!handle) throw new AutoBackupError('folder');
    try {
      const file = await handle.getFileHandle(name, { create: true });
      const writable = await file.createWritable();
      await writable.write(new Blob([text], { type: 'application/json' }));
      await writable.close();
    } catch (err) {
      throw new AutoBackupError(domReason(err));
    }
  },
  async exists(name) {
    const handle = await getStoredDirectoryHandle().catch(() => undefined);
    if (!handle) return false;
    try {
      await handle.getFileHandle(name);
      return true;
    } catch {
      return false;
    }
  },
  async verify(name, bytes) {
    const handle = await getStoredDirectoryHandle().catch(() => undefined);
    if (!handle) return false;
    try {
      return (await (await handle.getFileHandle(name)).getFile()).size === bytes;
    } catch {
      return false;
    }
  },
  async remove(name) {
    const handle = await getStoredDirectoryHandle();
    await handle?.removeEntry?.(name);
  },
  // In de browser reist de opslag niet mee met een back-up van Android; een id per opslag is genoeg.
  async installId() {
    const known = await MetaRepo.get<string>(INSTALL_ID_KEY).catch(() => undefined);
    if (typeof known === 'string' && known) return known;
    const id = crypto.randomUUID();
    await MetaRepo.set(INSTALL_ID_KEY, id);
    return id;
  },
};
