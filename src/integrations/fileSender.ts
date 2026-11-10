// ASCEND: een bestand aanbieden aan een andere app, zonder sleutel, account of netwerk. De gebruiker
// kiest zelf de app in het venster van zijn telefoon (bijvoorbeeld de app van zijn horloge).
//
// - In de Android-app: het bestand komt in de cachemap van de app (map `delen`, alleen dit ene bestand)
//   en een klein eigen deel van de app (FileOpenPlugin.java) toont de keuzelijst van Android met de apps
//   die het kunnen openen of aannemen. De webweergave van Android kent delen vanuit de browser niet.
//   Een oudere app zonder dat deel heeft deze weg niet (`fileSender` geeft null).
// - In de browser: het deelvenster van de browser, alleen als die dit bestand wil delen (`canShare`).
// - Anders null: de aanroeper valt terug op opslaan of downloaden.
//
// Gooit bij een fout; het venster wegtikken is geen fout ('cancelled').

import { Capacitor, registerPlugin } from '@capacitor/core';
import { writeThroughTemp, type TempFs } from './backupFolder';

// 'offered': het venster stond open, wat de gebruiker koos weet ASCEND niet. 'shared': de browser meldt
// dat er gedeeld is. 'cancelled': het venster is weggetikt.
export type SendResult = 'offered' | 'shared' | 'cancelled';

export interface FileSender {
  platform: 'app' | 'browser';
  // `signal`: de grens van de aanroeper. Is die voorbij, dan gaat er geen venster meer open.
  send(name: string, text: string, mimeType: string, title: string, signal?: AbortSignal): Promise<SendResult>;
}

const SHARE_DIR = 'delen';

// Wat de weg in de app nodig heeft, los te testen (fileSender.test.ts).
// De aanroeper wacht niet meer (grens in tijd): er is niets aangeboden.
export class SendStoppedError extends Error {
  constructor() {
    super('Aanbieden gestopt');
    this.name = 'SendStoppedError';
  }
}

export interface CacheShare {
  fs: TempFs;
  // Haalt eerdere bestanden uit de map weg; er staat er nooit meer dan één.
  clear(): Promise<void>;
  open(name: string, mimeType: string, title: string): Promise<void>;
}

// Eerst een tijdelijk bestand, dan hernoemen (writeThroughTemp): een half bestand krijgt nooit de echte
// naam en wordt nooit aangeboden. Mislukt het schrijven, dan gaat het venster niet open.
export function cacheSender(share: CacheShare): FileSender {
  return {
    platform: 'app',
    async send(name, text, mimeType, title, signal) {
      await share.clear().catch(() => undefined);
      const attemptId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await writeThroughTemp(share.fs, name, text, attemptId);
      // Een grens in tijd stopt ook het werk erachter: na de grens opent de keuzelijst niet meer.
      if (signal?.aborted) throw new SendStoppedError();
      await share.open(name, mimeType, title);
      return 'offered';
    },
  };
}

interface FileOpenPlugin {
  open(options: { path: string; mimeType: string; title: string }): Promise<void>;
}

// Eén keer registreren voor de hele app; een tweede keer geeft een waarschuwing van Capacitor.
let opener: FileOpenPlugin | undefined;

function androidSender(): FileSender {
  const load = () => import('@capacitor/filesystem');
  const path = (name: string) => `${SHARE_DIR}/${name}`;
  return cacheSender({
    fs: {
      async exists(name) {
        const fs = await load();
        try {
          await fs.Filesystem.stat({ path: path(name), directory: fs.Directory.Cache });
          return true;
        } catch {
          return false;
        }
      },
      async writeFile(name, data) {
        const fs = await load();
        await fs.Filesystem.writeFile({ path: path(name), data, directory: fs.Directory.Cache, encoding: fs.Encoding.UTF8, recursive: true });
      },
      async rename(from, to) {
        const fs = await load();
        await fs.Filesystem.rename({ from: path(from), to: path(to), directory: fs.Directory.Cache, toDirectory: fs.Directory.Cache });
      },
      async remove(name) {
        const fs = await load();
        await fs.Filesystem.deleteFile({ path: path(name), directory: fs.Directory.Cache });
      },
    },
    async clear() {
      const fs = await load();
      await fs.Filesystem.rmdir({ path: SHARE_DIR, directory: fs.Directory.Cache, recursive: true });
    },
    async open(name, mimeType, title) {
      opener ??= registerPlugin<FileOpenPlugin>('FileOpen');
      await opener.open({ path: path(name), mimeType, title });
    },
  });
}

type ShareNavigator = { share?: (data: { files: File[]; title?: string }) => Promise<void>; canShare?: (data: { files: File[] }) => boolean };

// Het deelvenster van de browser, alleen als die dit bestand echt wil delen. Chrome weigert een type
// dat het niet kent; dan is er geen weg en blijft de download.
export function browserSender(nav: ShareNavigator | undefined, probe: { name: string; mimeType: string }): FileSender | null {
  if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function' || typeof File === 'undefined') return null;
  try {
    if (!nav.canShare({ files: [new File(['x'], probe.name, { type: probe.mimeType })] })) return null;
  } catch {
    return null;
  }
  const share = nav.share.bind(nav);
  return {
    platform: 'browser',
    async send(name, text, mimeType, title) {
      try {
        await share({ files: [new File([text], name, { type: mimeType })], title });
        return 'shared';
      } catch (err) {
        // Het deelvenster wegtikken is geen fout.
        if (typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError') return 'cancelled';
        throw err;
      }
    },
  };
}

// De weg voor dit soort bestand op dit toestel, of null als er geen is.
export function fileSender(probe: { name: string; mimeType: string }): FileSender | null {
  if (Capacitor.isNativePlatform()) return Capacitor.isPluginAvailable('FileOpen') ? androidSender() : null;
  return browserSender(typeof navigator === 'undefined' ? undefined : (navigator as ShareNavigator), probe);
}
