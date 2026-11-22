import { beforeEach, describe, expect, it, vi } from 'vitest';

// De vaste map in de browser, met een nagemaakte map. Dezelfde regel als in de Android-map
// (integrations/backupFolder.ts): een fout bij kijken of lezen verklaart nooit een naam vrij en zegt
// nooit dat een bestand kapot is.
const dir = vi.hoisted(() => ({
  files: new Map<string, number>(),
  lookError: undefined as string | undefined,
  readError: false,
  closed: 0,
  aborted: 0,
}));

vi.mock('./database', async (original) => ({
  ...(await original<typeof import('./database')>()),
  MetaRepo: {
    get: async () => ({
      name: 'map',
      getFileHandle: async (name: string, opts?: { create?: boolean }) => {
        if (dir.lookError) throw new DOMException('kijken lukte niet', dir.lookError);
        if (!dir.files.has(name)) {
          if (!opts?.create) throw new DOMException('niet gevonden', 'NotFoundError');
          dir.files.set(name, 0);
        }
        return {
          // Zoals de browser: wat je schrijft komt pas bij close in het bestand; abort gooit het weg.
          createWritable: async () => {
            let size = 0;
            return {
              write: async (data: Blob) => {
                size += data.size;
              },
              close: async () => {
                dir.closed++;
                dir.files.set(name, size);
              },
              abort: async () => {
                dir.aborted++;
              },
            };
          },
          getFile: async () => {
            if (dir.readError) throw new DOMException('lezen lukte niet', 'NotReadableError');
            return { size: dir.files.get(name)! };
          },
        };
      },
    }),
    set: async () => undefined,
  },
}));

import { webFolderTarget } from './backupFileAdapter';
import { AutoBackupError } from '../engine/autoBackup';

const NAME = 'ascend-2026-11-02.ascend-backup.json';

beforeEach(() => {
  dir.files.clear();
  dir.lookError = undefined;
  dir.readError = false;
  dir.closed = 0;
  dir.aborted = 0;
});

describe('de vaste map in de browser', () => {
  it('alleen "niet gevonden" is een vrije naam; elke andere fout bij het kijken telt als bezet', async () => {
    expect(await webFolderTarget.exists(NAME)).toBe(false);
    dir.files.set(NAME, 10);
    expect(await webFolderTarget.exists(NAME)).toBe(true);
    dir.lookError = 'NotAllowedError';
    expect(await webFolderTarget.exists(NAME)).toBe(true);
    dir.files.clear();
    expect(await webFolderTarget.exists(NAME)).toBe(true);
  });

  it('nakijken: de grootte klopt is goed, klopt niet is kapot', async () => {
    dir.files.set(NAME, 10);
    expect(await webFolderTarget.verify(NAME, 10)).toBe('ok');
    expect(await webFolderTarget.verify(NAME, 11)).toBe('broken');
  });

  it('nakijken: een fout bij kijken of lezen is onbekend, nooit kapot', async () => {
    dir.files.set(NAME, 10);
    dir.readError = true;
    expect(await webFolderTarget.verify(NAME, 10)).toBe('unknown');
    dir.readError = false;
    dir.lookError = 'NotAllowedError';
    expect(await webFolderTarget.verify(NAME, 10)).toBe('unknown');
  });

  it('een poging die niet meer telt breekt af voor close: de nieuwere back-up blijft zoals hij was (I-69)', async () => {
    dir.files.set(NAME, 10);
    const err = await webFolderTarget.write(NAME, 'een oudere tekst', 'p1', { stillWanted: () => false }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AutoBackupError);
    expect(dir.aborted).toBe(1);
    expect(dir.closed).toBe(0);
    expect(dir.files.get(NAME)).toBe(10);
  });

  it('een poging die nog telt schrijft gewoon', async () => {
    await webFolderTarget.write(NAME, 'nieuw', 'p1', { stillWanted: () => true });
    expect(dir.closed).toBe(1);
    expect(dir.aborted).toBe(0);
    expect(dir.files.get(NAME)).toBe(5);
  });
});
