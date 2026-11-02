import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeCapacitorPlugin, settlesWithin } from '../test/capacitorProxy';

const calls = vi.hoisted(() => ({ vibrate: 0, keepAwake: 0, position: 0, schedule: 0 }));

vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
}));
vi.mock('@capacitor/haptics', async () => {
  const { fakeCapacitorPlugin } = await import('../test/capacitorProxy');
  return { Haptics: fakeCapacitorPlugin({ vibrate: () => void calls.vibrate++ }) };
});
vi.mock('@capacitor-community/keep-awake', async () => {
  const { fakeCapacitorPlugin } = await import('../test/capacitorProxy');
  return { KeepAwake: fakeCapacitorPlugin({ keepAwake: () => void calls.keepAwake++ }) };
});
vi.mock('@capacitor/app', async () => {
  const { fakeCapacitorPlugin } = await import('../test/capacitorProxy');
  return { App: fakeCapacitorPlugin({ addListener: () => ({ remove: () => undefined }), getLaunchUrl: () => ({}) }) };
});
vi.mock('@capacitor/splash-screen', async () => {
  const { fakeCapacitorPlugin } = await import('../test/capacitorProxy');
  return { SplashScreen: fakeCapacitorPlugin() };
});
vi.mock('@capacitor/status-bar', async () => {
  const { fakeCapacitorPlugin } = await import('../test/capacitorProxy');
  return { StatusBar: fakeCapacitorPlugin(), Style: { Dark: 'DARK', Light: 'LIGHT' } };
});
vi.mock('@capacitor/geolocation', async () => {
  const { fakeCapacitorPlugin } = await import('../test/capacitorProxy');
  return {
    Geolocation: fakeCapacitorPlugin({
      getCurrentPosition: () => {
        calls.position++;
        return { coords: {}, timestamp: 1 };
      },
      checkPermissions: () => ({ location: 'granted', coarseLocation: 'granted' }),
    }),
  };
});
vi.mock('@capacitor/local-notifications', async () => {
  const { fakeCapacitorPlugin } = await import('../test/capacitorProxy');
  return {
    LocalNotifications: fakeCapacitorPlugin({
      checkPermissions: () => ({ display: 'granted' }),
      checkExactNotificationSetting: () => ({ exact_alarm: 'granted' }),
      schedule: () => void calls.schedule++,
    }),
  };
});
vi.mock('@capawesome/capacitor-live-update', async () => {
  const { fakeCapacitorPlugin } = await import('../test/capacitorProxy');
  return { LiveUpdate: fakeCapacitorPlugin({ ready: () => ({ rolledBack: false }) }) };
});

beforeEach(() => {
  for (const k of Object.keys(calls) as (keyof typeof calls)[]) calls[k] = 0;
});
afterEach(() => vi.unstubAllGlobals());

describe('de nabootsing van een plugin', () => {
  it('laat een belofte die ermee vervuld wordt hangen, zoals op een toestel', async () => {
    const plugin = fakeCapacitorPlugin();
    expect(await settlesWithin(Promise.resolve(plugin))).toBe('hangt');
    expect(await settlesWithin(plugin.getVersionName())).toEqual({});
  });
});

describe('plugins op een toestel hangen niet', () => {
  it('liveUpdate: ready rondt af', async () => {
    vi.stubGlobal('__UPDATE_URL__', 'https://voorbeeld.github.io/ascend/');
    vi.stubGlobal('__RELEASES_URL__', 'https://voorbeeld.github.io/ascend/releases');
    vi.stubGlobal('__BUILD_TIME__', '2026-11-01T00:00:00Z');
    const { liveUpdatePort, setLiveUpdatePort } = await import('./liveUpdate');
    setLiveUpdatePort(undefined);
    const port = liveUpdatePort();
    expect(port.available).toBe(true);
    // Hangt de laadstap, dan komt er pas na de grens van 8 seconden een uitkomst.
    expect(await settlesWithin(port.ready())).not.toBe('hangt');
    setLiveUpdatePort(undefined);
  });

  it('deviceShell: trillen en wakker houden bereiken de plugin', async () => {
    const { deviceShell, setDeviceShell } = await import('./deviceShell');
    setDeviceShell(undefined);
    const shell = deviceShell();
    vi.stubGlobal('window', globalThis);
    shell.vibrate(50);
    const release = shell.holdScreen();
    await vi.waitFor(
      () => {
        expect(calls.vibrate).toBe(1);
        expect(calls.keepAwake).toBe(1);
      },
      { timeout: 100 },
    );
    release();
    setDeviceShell(undefined);
  });

  it('deviceShell: terugknop, afsluiten en start lopen door', async () => {
    const { deviceShell, setDeviceShell } = await import('./deviceShell');
    setDeviceShell(undefined);
    const shell = deviceShell();
    const stop = shell.onBackButton?.(() => undefined);
    shell.exitApp?.();
    shell.start?.();
    stop?.();
    setDeviceShell(undefined);
  });

  it('geolocation: de plek en de toestemming komen terug', async () => {
    const { appGeolocationOrUndefined, appLocationPermission } = await import('./geolocation');
    const g = appGeolocationOrUndefined()!;
    const got = await settlesWithin(new Promise((resolve) => g.getCurrentPosition(resolve, () => resolve('fout'))));
    expect(got).not.toBe('hangt');
    expect(calls.position).toBe(1);
    expect(await settlesWithin(appLocationPermission())).toBe('granted');
  });

  it('notifications: toestemming en plannen ronden af', async () => {
    const { notificationPort, setNotificationPort } = await import('./notifications');
    setNotificationPort(undefined);
    const port = notificationPort();
    expect(await settlesWithin(port.permissions())).not.toBe('hangt');
    await settlesWithin(port.schedule([{ id: 1, at: Date.now() + 1000, title: 't', body: 'b', channel: 'ascend-meldingen' }]));
    expect(calls.schedule).toBe(1);
    setNotificationPort(undefined);
  });
});
