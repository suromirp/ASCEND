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
  // Gooit een AutoBackupError met de reden.
  write(name: string, text: string): Promise<void>;
  remove(name: string): Promise<void>;
}

export interface AppBackupFolder extends AutoBackupTarget {
  platform: 'app';
  // Alleen na een tik van de gebruiker.
  requestAccess(): Promise<boolean>;
}

type FilesystemModule = typeof import('@capacitor/filesystem');

function androidFolder(): AppBackupFolder {
  let plugin: Promise<FilesystemModule> | undefined;
  const load = () => (plugin ??= import('@capacitor/filesystem'));
  const path = (name: string) => `${APP_BACKUP_DIR}/${name}`;
  const granted = (s: { publicStorage?: string }) => s.publicStorage === 'granted';

  return {
    platform: 'app',
    async access() {
      try {
        const { Filesystem } = await load();
        return granted(await Filesystem.checkPermissions()) ? 'ready' : 'denied';
      } catch {
        return 'denied';
      }
    },
    async where() {
      return { kind: 'folder', label: APP_BACKUP_LABEL };
    },
    async write(name, text) {
      const fs = await load().catch(() => {
        throw new AutoBackupError('folder');
      });
      try {
        await fs.Filesystem.writeFile({ path: path(name), data: text, directory: fs.Directory.Documents, encoding: fs.Encoding.UTF8, recursive: true });
      } catch (err) {
        const message = err instanceof Error ? err.message.toLowerCase() : '';
        throw new AutoBackupError(message.includes('permission') || message.includes('denied') ? 'permission' : 'write');
      }
    },
    async remove(name) {
      const fs = await load();
      await fs.Filesystem.deleteFile({ path: path(name), directory: fs.Directory.Documents });
    },
    async requestAccess() {
      try {
        const { Filesystem } = await load();
        return granted(await Filesystem.requestPermissions());
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
