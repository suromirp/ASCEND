import { ActivityStreamsRepo } from '../../storage/database';
import type { IntervalsHrBasis } from '../../engine/watchHeartRate';
import type { HealthConnectFacts, SettingsFacts } from '../../engine/settingsSummary';
import type { SettingsSource } from '../../engine/settingsPending';
import { getHealthConnectState } from '../../storage/healthConnect';
import { healthConnectPort } from '../../integrations/healthConnect';
import { getConnection, getWatchState, type WatchActivityState } from '../../storage/externalActivities';
import { getWatchWorkoutState } from '../../storage/watchWorkouts';
import { getMacroFactorState, type MacroFactorState } from '../../storage/macrofactor';
import { getPersistenceStatus, type PersistenceStatus } from '../../storage/persistence';
import { estimateStorage } from '../../storage/storageEstimate';
import type { StorageEstimate } from '../../engine/storageUse';
import { listSnapshots } from '../../storage/backup';
import { webBackupFileAdapter, webFolderTarget } from '../../storage/backupFileAdapter';
import { autoBackupTarget, readAutoBackupState } from '../../storage/autoBackup';
import { noticeSupport } from '../../engine/morningNotice';
import { readNoticeEnvironment } from '../../utils/morningNotice';
import { nativeNoticeSupport, type DevicePermissions } from '../../engine/deviceNotices';
import { notificationPort } from '../../integrations/notifications';
import { withTimeout } from '../../utils/withTimeout';
import type { Part } from '../../utils/loadParts';

// Alles wat de instellingen over je weten, als de feiten die engine/settingsSummary.ts
// leest. De opslag die niet in de app-staat zit (horloge, MacroFactor, back-up) wordt
// hier ingelezen en volgt wijzigingen. Tot het binnen is, staat er niets "verbonden".
export interface Loaded {
  linked: boolean;
  watch: WatchActivityState | null;
  sendEnabled: boolean;
  hrBasis?: IntervalsHrBasis;
  macroFactor: MacroFactorState | null;
  storage: PersistenceStatus | undefined;
  snapshots: number;
  folderChosen: boolean;
  streamsBytes?: number;
  storageUse?: StorageEstimate;
  notice: SettingsFacts['notice'];
  device?: DevicePermissions | 'unknown';
  // Het lezen van de koppelstatus mislukte.
  watchUnreadable?: boolean;
  autoBackup?: SettingsFacts['autoBackup'];
  healthConnect?: HealthConnectFacts;
}

// Health Connect: of dit de app is, of het aan staat en wat de laatste ronde zei.
async function readHealthConnectFacts(): Promise<HealthConnectFacts> {
  const inApp = healthConnectPort().inApp;
  const state = await getHealthConnectState();
  return { inApp, enabled: inApp && state.enabled, ...(state.fetchedAt ? { fetchedAt: state.fetchedAt } : {}), ...(state.lastError ? { errorKind: state.lastError.kind } : {}) };
}

// De automatische back-up: in de app altijd de map van de app, in de browser alleen de vaste map.
async function readAutoBackupFacts(folderChosen: boolean): Promise<SettingsFacts['autoBackup']> {
  const target = autoBackupTarget();
  const state = await readAutoBackupState();
  const folderWhere = target.platform === 'app' ? await target.where() : folderChosen ? await webFolderTarget.where() : undefined;
  return {
    platform: target.platform,
    ...(state.where ? { where: state.where } : {}),
    ...(folderWhere?.kind === 'folder' ? { folder: folderWhere.label } : {}),
    ...(state.failure ? { failure: state.failure.reason } : {}),
    ...(target.platform === 'app' ? { access: await target.access().catch(() => 'denied' as const) } : {}),
    ...(state.autoAt ? { lastAutoAt: state.autoAt } : {}),
  };
}

export const EMPTY: Loaded = { linked: false, watch: null, sendEnabled: false, macroFactor: null, storage: undefined, snapshots: 0, folderChosen: false, notice: undefined };

// Elke bron laadt los en heeft een eigen grens (utils/loadParts.ts): een trage of hangende bron
// houdt de andere rijen nooit tegen. Wat de grens haalt, krijgt een terugval met een zichtbare waarde.
export const ALL_SOURCES: readonly SettingsSource[] = ['watch', 'macroFactor', 'storage', 'snapshots', 'autoBackup', 'streams', 'storageUse', 'device', 'healthConnect'];

export function settingsParts(): Part<SettingsSource, Loaded>[] {
  return [
    {
      key: 'watch',
      ms: 3000,
      load: async () => {
        let unreadable = false;
        const unread = () => {
          unreadable = true;
          return null;
        };
        const [connection, watch, workouts] = await Promise.all([getConnection().catch(unread), getWatchState().catch(unread), getWatchWorkoutState().catch(() => null)]);
        return { linked: !!connection, watch, sendEnabled: !!workouts?.enabled, hrBasis: workouts?.hrBasis, watchUnreadable: unreadable };
      },
    },
    { key: 'macroFactor', ms: 3000, load: async () => ({ macroFactor: await getMacroFactorState() }) },
    { key: 'storage', ms: 3000, load: async () => ({ storage: await getPersistenceStatus() }) },
    { key: 'snapshots', ms: 4000, load: async () => ({ snapshots: (await listSnapshots()).length }) },
    {
      key: 'autoBackup',
      ms: 3000,
      load: async () => {
        const folder = webBackupFileAdapter.supportsPreferredDirectory() ? await (webBackupFileAdapter.hasPreferredDirectory?.() ?? Promise.resolve(false)) : false;
        return { folderChosen: !!folder, autoBackup: await readAutoBackupFacts(!!folder) };
      },
    },
    // Telt elke reeks een voor een; bij veel loopjes en tochten kan dat op een telefoon lang duren.
    { key: 'streams', ms: 4000, load: async () => ({ streamsBytes: (await ActivityStreamsRepo.totalBytes()).bytes }) },
    // Met een eigen tijdsgrens (storage/storageEstimate.ts).
    { key: 'storageUse', ms: 4000, load: async () => ({ storageUse: await estimateStorage() }) },
    {
      key: 'device',
      ms: 3000,
      load: async () => {
        // Wat de telefoon toestaat; hoogstens twee seconden, daarna "Onbekend".
        const [noticeEnv, device] = await Promise.all([withTimeout(readNoticeEnvironment(), 2000).catch(() => undefined), withTimeout(notificationPort().permissions(), 2000).catch(() => 'unknown' as const)]);
        return {
          device,
          // In de app komt de ochtendvraag als melding op tijd; dan telt alleen of meldingen mogen.
          notice: device !== 'unknown' && device.timed
            ? { support: nativeNoticeSupport(device.notifications), granted: device.notifications === 'granted' }
            : noticeEnv ? { support: noticeSupport(noticeEnv), granted: noticeEnv.permission === 'granted' } : undefined,
        };
      },
    },
    { key: 'healthConnect', ms: 3000, load: async () => ({ healthConnect: await readHealthConnectFacts() }) },
  ];
}

