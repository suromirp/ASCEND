import { afterEach, describe, expect, it, vi } from 'vitest';

// Eén trage bron (de telling van de reeksen, de lijst met kopieën, een plugin) mag geen andere
// rij tegenhouden. De bronnen zijn hier nagebootst; streams, snapshots, storageUse en device hangen.

vi.mock('../../storage/database', async (orig) => ({ ...(await orig<object>()), ActivityStreamsRepo: { totalBytes: () => new Promise<never>(() => undefined) } }));
vi.mock('../../storage/externalActivities', () => ({
  getConnection: async () => ({}),
  getWatchState: async () => ({ use: {}, fetchedAt: '2026-11-01T08:00:00Z' }),
  onWatchChange: () => () => undefined,
}));
vi.mock('../../storage/watchWorkouts', () => ({ getWatchWorkoutState: async () => ({ enabled: true }) }));
vi.mock('../../storage/macrofactor', () => ({ getMacroFactorState: async () => ({ leads: true }), onMacroFactorChange: () => () => undefined }));
vi.mock('../../storage/persistence', () => ({ getPersistenceStatus: async () => 'protected' }));
vi.mock('../../storage/storageEstimate', () => ({ estimateStorage: () => new Promise<never>(() => undefined) }));
vi.mock('../../storage/backup', () => ({ listSnapshots: () => new Promise<never>(() => undefined) }));
vi.mock('../../storage/backupFileAdapter', () => ({
  webBackupFileAdapter: { supportsPreferredDirectory: () => false },
  webFolderTarget: { where: async () => ({ kind: 'folder', label: 'x' }) },
}));
vi.mock('../../storage/autoBackup', () => ({
  autoBackupTarget: () => ({ platform: 'browser' }),
  readAutoBackupState: async () => ({ files: [] }),
  subscribeAutoBackup: () => () => undefined,
}));
vi.mock('../../storage/healthConnect', () => ({
  getHealthConnectState: async () => ({ enabled: false }),
  onHealthConnectChange: () => () => undefined,
}));
vi.mock('../../integrations/healthConnect', () => ({ healthConnectPort: () => ({ inApp: false }) }));
vi.mock('../../integrations/notifications', () => ({ notificationPort: () => ({ permissions: () => new Promise<never>(() => undefined) }) }));
vi.mock('../../utils/morningNotice', () => ({ readNoticeEnvironment: () => new Promise<never>(() => undefined) }));

import { settingsParts } from './settingsFactsParts';
import { loadParts } from '../../utils/loadParts';

afterEach(() => vi.useRealTimers());

describe('instellingen laden per rij', () => {
  it('traag of hangend houdt de andere rijen niet tegen en elke bron eindigt binnen zijn grens', async () => {
    vi.useFakeTimers();
    const arrivedAt: Record<string, number> = {};
    const t0 = Date.now();
    const done = loadParts(settingsParts(), (key) => (arrivedAt[key] = Date.now() - t0));
    await vi.advanceTimersByTimeAsync(50);
    // De snelle bronnen zijn er meteen, terwijl streams, kopieën, ruimte en telefoon nog wachten.
    expect(Object.keys(arrivedAt).sort()).toEqual(['autoBackup', 'healthConnect', 'macroFactor', 'storage', 'watch']);
    await vi.advanceTimersByTimeAsync(10_000);
    await done;
    expect(Object.keys(arrivedAt)).toHaveLength(9);
    // Niets wacht langer dan een paar seconden.
    expect(Math.max(...Object.values(arrivedAt))).toBeLessThanOrEqual(4000);
  });
});
