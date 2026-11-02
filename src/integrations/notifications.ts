// ASCEND: meldingen op het toestel (docs/beslissingen/2026-11-01-android-app.md).
//
// De enige plek die weet of ASCEND als Android-app draait. In de app plant hij meldingen met de
// plugin Local Notifications van Capacitor op een exact moment, ook met het scherm uit; in de
// browser doet hij niets en meldt hij alleen wat de browser zelf over meldingen zegt (de
// ochtendmelding van de PWA blijft lopen zoals in utils/morningNotice.ts). De rest van de app
// vraagt alleen `timed` en de toestemmingen, nooit het platform.
//
// Wat er gepland wordt en wanneer, staat in engine/deviceNotices.ts. Tests vervangen de laag met
// `setNotificationPort`.

import { Capacitor } from '@capacitor/core';
import { MORNING_NOTICE_IDS, NOTICE_CHANNELS, WEEK_NOTICE_ID, type DevicePermissions, type PermissionState, type ScheduledNotice } from '../engine/deviceNotices';
import { withTimeout } from '../utils/withTimeout';

export interface NotificationPort {
  // Meldingen op een vast moment, ook met het scherm uit en de app op de achtergrond.
  readonly timed: boolean;
  permissions(): Promise<DevicePermissions>;
  // Vraagt toestemming voor meldingen; geeft terug hoe het nu staat.
  requestNotifications(): Promise<PermissionState>;
  // Opent het scherm "Alarmen en herinneringen" van Android; geeft terug hoe het daarna staat.
  requestExactAlarm(): Promise<PermissionState>;
  // Plant of vervangt (zelfde id); slaat stil over zolang meldingen niet mogen.
  schedule(list: ScheduledNotice[]): Promise<void>;
  cancel(ids: number[]): Promise<void>;
  // Een tik op een melding: het adres in de app waar hij heen wijst.
  onTap(handler: (link: string) => void): () => void;
}

// Hoe lang een vraag aan de telefoon mag duren voor ASCEND het opgeeft (een knop die wacht heeft
// een grens). Een scherm van Android openen duurt zo lang als jij erin blijft, dus ruimer.
const ASK_MS = 4000;
const SETTINGS_MS = 120_000;

// ---- de browser --------------------------------------------------------------------------

function browserPermission(): PermissionState {
  if (typeof Notification === 'undefined') return 'unavailable';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

export const browserPort: NotificationPort = {
  timed: false,
  async permissions() {
    return { timed: false, notifications: browserPermission(), exactAlarm: 'unavailable', healthConnect: 'unavailable' };
  },
  async requestNotifications() {
    if (typeof Notification === 'undefined') return 'unavailable';
    const answer = await withTimeout(Notification.requestPermission(), SETTINGS_MS).catch(() => Notification.permission);
    return answer === 'default' ? 'prompt' : answer;
  },
  async requestExactAlarm() {
    return 'unavailable';
  },
  async schedule() {},
  async cancel() {},
  onTap() {
    return () => undefined;
  },
};

// ---- de Android-app ----------------------------------------------------------------------

type NotificationsModule = typeof import('@capacitor/local-notifications');
type Plugin = NotificationsModule['LocalNotifications'];

function toState(state: string | undefined): PermissionState {
  if (state === 'granted' || state === 'denied') return state;
  return state === undefined ? 'unavailable' : 'prompt';
}

function androidPort(): NotificationPort {
  // De plugin pas laden als hij nodig is: de webbuild hoeft hem nooit te openen.
  // De module in een belofte, nooit de plugin zelf: een plugin is een Proxy met een methode `then`.
  let mod: Promise<NotificationsModule> | undefined;
  const load = () => (mod ??= import('@capacitor/local-notifications'));
  let channels: Promise<void> | undefined;
  const ensureChannels = () =>
    (channels ??= load().then(async (m) => {
      const p = m.LocalNotifications;
      for (const c of NOTICE_CHANNELS) {
        await p.createChannel({ id: c.id, name: c.name, description: c.description, importance: c.importance, vibration: c.vibration, visibility: 1, ...(c.sound ? { sound: c.sound } : {}) });
      }
    }).catch(() => {
      channels = undefined;
    }));

  async function exactState(p: Plugin): Promise<PermissionState> {
    try {
      return toState((await withTimeout(p.checkExactNotificationSetting(), ASK_MS)).exact_alarm);
    } catch {
      return 'unavailable';
    }
  }
  async function displayState(p: Plugin): Promise<PermissionState> {
    try {
      return toState((await withTimeout(p.checkPermissions(), ASK_MS)).display);
    } catch {
      return 'unavailable';
    }
  }

  return {
    timed: true,
    async permissions() {
      const p = (await load()).LocalNotifications;
      const [notifications, exactAlarm] = await Promise.all([displayState(p), exactState(p)]);
      return { timed: true, notifications, exactAlarm, healthConnect: 'soon' };
    },
    async requestNotifications() {
      const p = (await load()).LocalNotifications;
      try {
        return toState((await withTimeout(p.requestPermissions(), SETTINGS_MS)).display);
      } catch {
        return displayState(p);
      }
    },
    async requestExactAlarm() {
      const p = (await load()).LocalNotifications;
      try {
        return toState((await withTimeout(p.changeExactNotificationSetting(), SETTINGS_MS)).exact_alarm);
      } catch {
        return exactState(p);
      }
    },
    async schedule(list) {
      if (list.length === 0) return;
      const p = (await load()).LocalNotifications;
      // Nooit zelf om toestemming vragen of een scherm openen midden in een training: zonder
      // toestemming slaat ASCEND het over, zonder exacte wekker plant hij "ongeveer op tijd".
      if ((await displayState(p)) !== 'granted') return;
      const exact = (await exactState(p)) === 'granted';
      await ensureChannels();
      await withTimeout(
        p.schedule({
          notifications: list.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            ...(n.largeBody ? { largeBody: n.largeBody } : {}),
            channelId: n.channel,
            autoCancel: true,
            isExactNotification: exact,
            schedule: { at: new Date(n.at), allowWhileIdle: true },
            extra: n.link ? { link: n.link } : undefined,
          })),
        }),
        ASK_MS,
      ).catch(() => undefined);
    },
    async cancel(ids) {
      if (ids.length === 0) return;
      const p = (await load()).LocalNotifications;
      await withTimeout(p.cancel({ notifications: ids.map((id) => ({ id })) }), ASK_MS).catch(() => undefined);
    },
    onTap(handler) {
      let remove: (() => void) | undefined;
      let gone = false;
      void load().then((m) =>
        m.LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          const link = (action.notification.extra as { link?: unknown } | undefined)?.link;
          if (typeof link === 'string') handler(link);
        }).then((h) => {
          if (gone) void h.remove();
          else remove = () => void h.remove();
        }),
      );
      return () => {
        gone = true;
        remove?.();
      };
    },
  };
}

// ---- de vaste meldingen bijwerken ---------------------------------------------------------

// De ochtendvraag en de weekmelding opnieuw zetten: eerst wat er niet meer hoort weg, dan de
// nieuwe lijst (een zelfde id vervangt de oude). Op een toestel zonder meldingen op tijd niets.
export async function syncTimedNotices(port: NotificationPort, planned: ScheduledNotice[]): Promise<void> {
  if (!port.timed) return;
  const keep = new Set(planned.map((n) => n.id));
  await port.cancel([...MORNING_NOTICE_IDS, WEEK_NOTICE_ID].filter((id) => !keep.has(id)));
  await port.schedule(planned);
}

// ---- welke --------------------------------------------------------------------------------

let current: NotificationPort | undefined;

export function notificationPort(): NotificationPort {
  current ??= Capacitor.getPlatform() === 'android' ? androidPort() : browserPort;
  return current;
}

// Voor tests: een nagemaakte laag, of terug naar de echte met undefined.
export function setNotificationPort(port: NotificationPort | undefined): void {
  current = port;
}
