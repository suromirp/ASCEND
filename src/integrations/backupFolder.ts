// ASCEND: de map van de automatische back-up in de Android-app
// (docs/beslissingen/2026-11-02-automatische-backup.md, naast docs/beslissingen/2026-11-01-android-app.md).
//
// In de app schrijft ASCEND het back-upbestand zelf, met de officiële plugin Filesystem van Capacitor,
// in de openbare map Documents op de telefoon, onder ASCEND. Die map zie je in elke bestandsbeheerder
// en een app die mappen naar de cloud kopieert kan hem meenemen. De laag vraagt nooit zelf om
// toestemming: dat gebeurt alleen na een tik op "Toegang geven" bij Vaste map (Android 10 en ouder;
// vanaf Android 11 is er geen toestemming nodig voor bestanden die ASCEND zelf maakt). Er gaat niets
// naar buiten: alleen het bestand in die map. In de browser is er geen app-map (`appBackupFolder`
// geeft null) en gebruikt storage/autoBackup.ts de vaste map van de browser.

import { Capacitor } from '@capacitor/core';
import { AutoBackupError, NameTakenError, type BackupWhere, type BackupWriteStep } from '../engine/autoBackup';

const APP_BACKUP_DIR = 'ASCEND';
// Zoals de bestandsbeheerder het toont (Samsung: Mijn bestanden, Interne opslag, Documents, ASCEND).
export const APP_BACKUP_LABEL = 'Interne opslag > Documents > ASCEND';

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
  // Schrijft het bestand; de naam is vrij of van de automatische back-up zelf. `attemptId` is uniek per
  // poging, zodat tijdelijke bestanden van een afgebroken poging een nieuwe nooit raken. Gooit een
  // AutoBackupError, of een NameTakenError als de naam toch bezet blijkt.
  // Met `neverReplace` wordt een bestaande naam nooit vervangen (NameTakenError).
  write(name: string, text: string, attemptId: string, opts?: { neverReplace?: boolean }): Promise<void>;
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

// Het deel van de map dat schrijven nodig heeft, los te testen (backupFolder.test.ts).
export interface TempFs {
  exists(name: string): Promise<boolean>;
  writeFile(name: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  remove(name: string): Promise<void>;
  // Staat onder deze naam precies deze tekst? Voor een rename die een fout meldt terwijl het bestand er
  // wel staat (de plugin kopieert als hernoemen niet lukt en meldt een fout als daarna het opruimen mislukt).
  holds?(name: string, text: string): Promise<boolean>;
  // Wachten voor de tweede poging om te hernoemen; in tests nul.
  pauseMs?: number;
}

function asBackupError(err: unknown, step: BackupWriteStep): AutoBackupError {
  if (err instanceof AutoBackupError) return err;
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  // De echte melding van de telefoon, voor wie meekijkt; nooit op het scherm.
  console.warn(`Back-up: stap ${step} mislukte`, err);
  return message.includes('permission') || message.includes('denied') ? new AutoBackupError('permission') : new AutoBackupError('write', step);
}

const RENAME_PAUSE_MS = 250;
const pause = (ms: number) => (ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve());

// Hoe vaak en hoe lang nakijken wacht op een bestand dat er net staat.
const VERIFY_TRIES = 3;
const VERIFY_PAUSE_MS = 300;

// Nakijken dat niet te vroeg opgeeft: een bestand dat net zijn naam kreeg is op de telefoon soms een
// tel later pas te lezen. Hoogstens drie keer, met een korte pauze; daarna is het echt mislukt.
export async function verifySettled(
  target: Pick<AutoBackupTarget, 'verify'>,
  name: string,
  bytes: number,
  { tries = VERIFY_TRIES, pauseMs = VERIFY_PAUSE_MS }: { tries?: number; pauseMs?: number } = {},
): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    if (i > 0) await pause(pauseMs);
    if (await target.verify(name, bytes).catch(() => false)) return true;
  }
  return false;
}

// Eerst een tijdelijk bestand met de id van de poging, dan hernoemen: een half bestand krijgt nooit de
// echte naam. Staat er al een eigen bestand met die naam (de opslag kijkt na dat het van ASCEND is), dan
// gaat dat eerst opzij naar `.old` en pas na een gelukte rename weg; mislukt de rename, dan komt het terug.
// Meldt de rename een fout, dan kijkt de laag eerst of het bestand er toch staat (`holds`): dan is het
// gelukt en wordt alleen opgeruimd. Staat het er niet, dan nog één keer na een korte pauze. Pas als de naam
// dan nog niet lukt en hij vrij leek, is hij bezet door een bestand dat de app niet ziet (NameTakenError).
// Met `neverReplace` (Back-up maken met de hand) gaat een bestaand bestand nooit opzij: een bestaande naam
// geeft meteen een NameTakenError en er wordt niets geschreven.
export async function writeThroughTemp(fs: TempFs, name: string, text: string, attemptId: string, opts: { neverReplace?: boolean } = {}): Promise<void> {
  if (opts.neverReplace && (await fs.exists(name).catch(() => false))) throw new NameTakenError(name);
  const tmp = `${name}.${attemptId}.tmp`;
  const old = `${name}.${attemptId}.old`;
  try {
    await fs.writeFile(tmp, text);
  } catch (err) {
    await fs.remove(tmp).catch(() => undefined);
    throw asBackupError(err, 'temp');
  }
  let moved = false;
  if (await fs.exists(name).catch(() => false)) {
    try {
      await fs.rename(name, old);
      moved = true;
    } catch (err) {
      await fs.remove(tmp).catch(() => undefined);
      throw asBackupError(err, 'rename');
    }
  }
  const landed = () => (fs.holds ? fs.holds(name, text).catch(() => false) : Promise.resolve(false));
  let failure: unknown;
  let done = false;
  for (let attempt = 0; attempt < 2 && !done; attempt++) {
    if (attempt > 0) await pause(fs.pauseMs ?? RENAME_PAUSE_MS);
    try {
      await fs.rename(tmp, name);
      done = true;
    } catch (err) {
      failure = err;
      // De fout kwam na het werk: het bestand staat er heel. Of het tijdelijke bestand is weg, dan valt er
      // niets meer te hernoemen.
      if (await landed()) done = true;
      else if (!(await fs.exists(tmp).catch(() => true))) break;
    }
  }
  await fs.remove(tmp).catch(() => undefined);
  if (!done) {
    if (moved) {
      await fs.rename(old, name).catch(() => undefined);
      throw asBackupError(failure, 'rename');
    }
    // De naam was vrij en nu staat er iets dat niet de back-up is: een halve kopie van deze poging zelf.
    // Die gaat weg; de naam is dan niet bezet, het schrijven is mislukt.
    if (await fs.exists(name).catch(() => false)) {
      await fs.remove(name).catch(() => undefined);
      throw asBackupError(failure, 'rename');
    }
    console.warn('Back-up: de naam lukte niet, het volgende volgnummer', failure);
    throw new NameTakenError(name);
  }
  if (moved) await fs.remove(old).catch(() => undefined);
}

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
    async write(name, text, attemptId, opts) {
      const fs = await load().catch(() => {
        throw new AutoBackupError('folder');
      });
      const dir = fs.Directory.Documents;
      await writeThroughTemp({
        exists,
        writeFile: async (n, data) => {
          await fs.Filesystem.writeFile({ path: path(n), data, directory: dir, encoding: fs.Encoding.UTF8, recursive: true });
        },
        rename: async (from, to) => {
          await fs.Filesystem.rename({ from: path(from), to: path(to), directory: dir, toDirectory: dir });
        },
        remove: async (n) => {
          await fs.Filesystem.deleteFile({ path: path(n), directory: dir });
        },
        holds: async (n, expected) => {
          const read = await fs.Filesystem.readFile({ path: path(n), directory: dir, encoding: fs.Encoding.UTF8 });
          return (typeof read.data === 'string' ? read.data : await read.data.text()) === expected;
        },
      }, name, text, attemptId, opts);
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
