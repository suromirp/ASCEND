import { afterEach, describe, expect, it, vi } from 'vitest';

// De browser blijft zoals hij was: een download met een link, en de uitkomst "gedownload".
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  Capacitor: { getPlatform: () => 'web', isNativePlatform: () => false },
}));

import { webBackupFileAdapter } from './backupFileAdapter';
import { runManualBackup } from './manualBackup';

afterEach(() => vi.unstubAllGlobals());

describe('Back-up maken in de browser', () => {
  it('gebruikt de download en meldt dat hij gedownload is', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.fn();
    vi.stubGlobal('document', {
      createElement: () => ({ click, remove: () => undefined }),
      body: { appendChild: () => undefined },
    });
    const markMade = vi.fn(async () => undefined);
    const outcome = await runManualBackup({
      prepare: async () => ({ text: '{}', fileName: 'ascend-2026-11-02.ascend-backup.json' }),
      adapter: webBackupFileAdapter,
      markMade,
    });
    expect(click).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ status: 'downloaded' });
    expect(markMade).toHaveBeenCalledWith(expect.any(String), { kind: 'download' });
  });
});
