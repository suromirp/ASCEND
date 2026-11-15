import { beforeEach, describe, expect, it, vi } from 'vitest';

// De vaste map in de browser, met een nagemaakte map. Dezelfde regel als in de Android-map
// (integrations/backupFolder.ts): een fout bij kijken of lezen verklaart nooit een naam vrij en zegt
// nooit dat een bestand kapot is.
const dir = vi.hoisted(() => ({
  files: new Map<string, number>(),
  lookError: undefined as string | undefined,
  readError: false,
}));

vi.mock('./database', async (original) => ({
  ...(await original<typeof import('./database')>()),
  MetaRepo: {
    get: async () => ({
      name: 'map',
      getFileHandle: async (name: string) => {
        if (dir.lookError) throw new DOMException('kijken lukte niet', dir.lookError);
        if (!dir.files.has(name)) throw new DOMException('niet gevonden', 'NotFoundError');
        return {
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

const NAME = 'ascend-2026-11-02.ascend-backup.json';

beforeEach(() => {
  dir.files.clear();
  dir.lookError = undefined;
  dir.readError = false;
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
});
