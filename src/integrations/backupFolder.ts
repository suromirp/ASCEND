// ASCEND: de map van de automatische back-up in de Android-app
// (docs/beslissingen/2026-11-02-automatische-backup.md, naast docs/beslissingen/2026-11-01-android-app.md).
//
// In de app schrijft ASCEND het back-upbestand zelf, met de officiële plugin Filesystem van Capacitor,
// in de openbare map Documenten op de telefoon, onder ASCEND. Die map zie je in elke bestandsbeheerder
// en een app die mappen naar de cloud kopieert kan hem meenemen. De laag vraagt nooit zelf om
// toestemming: dat gebeurt alleen na een tik op "Toegang geven" bij Vaste map (Android 10 en ouder;
// vanaf Android 11 is er geen toestemming nodig voor bestanden die ASCEND zelf maakt). Er gaat niets
// naar buiten: alleen het bestand in die map. In de browser is er geen app-map (`appBackupFolder`
// geeft null) en gebruikt storage/autoBackup.ts de vaste map van de browser.

import { Capacitor } from '@capacitor/core';
import { AutoBackupError, type BackupWhere } from '../engine/autoBackup';

export const APP_BACKUP_DIR = 'ASCEND';
export const APP_BACKUP_LABEL = 'Documenten/ASCEND';

export type FolderAccess = 'ready' | 'needs-tap' | 'denied';

// Waar een automatische back-up naartoe kan: de map van de app of de vaste map van de browser.
export interface AutoBackupTarget {
  platform: 'app' | 'browser';
  // 'ready': schrijven zonder tik; 'needs-tap': alleen na een tik (de kaart op Vandaag); 'denied': geen toegang.
  access(): Promise<FolderAccess>;
  where(): Promise<BackupWhere>;
  // Staat er al een bestand met deze naam? storage/autoBackup.ts schrijft nooit over een bestand dat
  // niet van de automatische back-up is.
  exists(name: string): Promise<boolean>;
  // Schrijft het bestand; de naam is vrij of van de automatische back-up zelf. Gooit een AutoBackupError.
  write(name: string, text: string): Promise<void>;
  // Staat het bestand er heel (zoveel bytes, en in de app een back-up die te lezen is)?
  verify(name: string, bytes: number): Promise<boolean>;
  remove(name: string): Promise<void>;
  // Een id van deze installatie, dat niet meegaat in de back-up van Android. Opruimen gebeurt alleen
  // als de lijst met eigen bestanden door deze installatie is gemaakt.
  installId(): Promise<string>;
}

export interface AppBackupFolder extends AutoBackupTarget {
  platform: 'app';
  // Alleen na een tik van de gebruiker.
  requestAccess(): Promise<boolean>;
}

type FilesystemModule = typeof import('@capacitor/filesystem');

// In de map van de app zelf (files/), die niet in de back-up van Android zit (res/xml/backup_rules.xml
// en data_extraction_rules.xml nemen alleen app_webview/ mee). Een nieuwe telefoon krijgt dus een nieuw id.
const INSTALL_FILE = 'ascend-installatie.txt';

function androidFolder(): AppBackupFolder {
  let plugin: Promise<FilesystemModule> | undefined;
  const load = () => (plugin ??= import('@capacitor/filesystem'));
  const path = (name: string) => `${APP_BACKUP_DIR}/${name}`;
  const state = (s: { publicStorage?: string }) => s.publicStorage;
  let install: Promise<string> | undefined;

  const exists = async (name: string) => {
    const fs = await load();
    try {
      await fs.Filesystem.stat({ path: path(name), directory: fs.Directory.Documents });
      return true;
    } catch {
      return false;
    }
  };

  return {
    platform: 'app',
    async access() {
      try {
        const { Filesystem } = await load();
        const s = state(await Filesystem.checkPermissions());
        // Android 10 en ouder, nog nooit gevraagd: de kaart op Vandaag met Back-up maken, geen amber regel.
        if (s === 'granted') return 'ready';
        return s === 'prompt' || s === 'prompt-with-rationale' ? 'needs-tap' : 'denied';
      } catch {
        return 'denied';
      }
    },
    async where() {
      return { kind: 'folder', label: APP_BACKUP_LABEL };
    },
    exists,
    async write(name, text) {
      const fs = await load().catch(() => {
        throw new AutoBackupError('folder');
      });
      const dir = fs.Directory.Documents;
      const tmp = path(`${name}.tmp`);
      try {
        // Eerst een tijdelijk bestand, dan hernoemen: een half bestand krijgt nooit de echte naam.
        await fs.Filesystem.writeFile({ path: tmp, data: text, directory: dir, encoding: fs.Encoding.UTF8, recursive: true });
        // De naam is vrij of van de automatische back-up zelf (storage/autoBackup.ts kijkt dat na).
        if (await exists(name)) await fs.Filesystem.deleteFile({ path: path(name), directory: dir });
        await fs.Filesystem.rename({ from: tmp, to: path(name), directory: dir, toDirectory: dir });
      } catch (err) {
        await fs.Filesystem.deleteFile({ path: tmp, directory: dir }).catch(() => undefined);
        const message = err instanceof Error ? err.message.toLowerCase() : '';
        throw new AutoBackupError(message.includes('permission') || message.includes('denied') ? 'permission' : 'write');
      }
    },
    async verify(name, bytes) {
      const fs = await load();
      const dir = fs.Directory.Documents;
      try {
        const info = await fs.Filesystem.stat({ path: path(name), directory: dir });
        if (info.size !== bytes) return false;
        const read = await fs.Filesystem.readFile({ path: path(name), directory: dir, encoding: fs.Encoding.UTF8 });
        const parsed = JSON.parse(typeof read.data === 'string' ? read.data : await read.data.text()) as { backupSchemaVersion?: unknown };
        return typeof parsed.backupSchemaVersion === 'number';
      } catch {
        return false;
      }
    },
    async remove(name) {
      const fs = await load();
      await fs.Filesystem.deleteFile({ path: path(name), directory: fs.Directory.Documents });
    },
    installId() {
      install ??= (async () => {
        const fs = await load();
        try {
          const read = await fs.Filesystem.readFile({ path: INSTALL_FILE, directory: fs.Directory.Data, encoding: fs.Encoding.UTF8 });
          const id = typeof read.data === 'string' ? read.data.trim() : '';
          if (id) return id;
        } catch {
          // Nog geen id: hieronder een nieuw.
        }
        const id = crypto.randomUUID();
        await fs.Filesystem.writeFile({ path: INSTALL_FILE, data: id, directory: fs.Directory.Data, encoding: fs.Encoding.UTF8 });
        return id;
      })();
      install.catch(() => {
        install = undefined;
      });
      return install;
    },
    async requestAccess() {
      try {
        const { Filesystem } = await load();
        return state(await Filesystem.requestPermissions()) === 'granted';
      } catch {
        return false;
      }
    },
  };
}

let current: AppBackupFolder | null | undefined;

// De map van de app, of null in de browser.
export function appBackupFolder(): AppBackupFolder | null {
  if (current === undefined) current = Capacitor.getPlatform() === 'android' ? androidFolder() : null;
  return current;
}
