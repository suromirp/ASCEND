// ASCEND: wat de Android-app anders doet dan de browser, op één plek
// (docs/beslissingen/2026-11-01-android-app.md): trillen, het scherm aan houden, de terugknop, de
// statusbalk en het openingsscherm. In de browser is er voor alles een webweg of een nette
// stilte; de rest van de app vraagt alleen deze laag, nooit het platform.

import { Capacitor, registerPlugin } from '@capacitor/core';
import { routeFromNativeShortcut } from '../engine/shortcutAction';
import { DUCK_MAX_MS } from '../engine/restSounds';

export interface DeviceShell {
  // Trillen: één duur of een patroon (trillen, pauze, ...).
  vibrate(pattern: number | number[]): void;
  // Houdt het scherm aan tot de teruggegeven functie wordt aangeroepen.
  holdScreen(): () => void;
  // De terugknop van de telefoon; undefined als de browser hem zelf afhandelt.
  onBackButton?(handler: (canGoBack: boolean) => void): () => void;
  exitApp?(): void;
  // Statusbalk in de kleur van de lucht bovenaan en het openingsscherm weg.
  start?(): void;
  // Andere audio (je muziek) even zachter terwijl de rustbel klinkt: audio focus met ducking. Alleen in
  // de Android-app; in de browser kan het niet en ontbreekt hij.
  duckAudio?(ms: number): void;
  // De vergrote kaart mag liggend (besluit 2026-11-11-alleen-staand.md, vervolg in
  // 2026-11-14-route-kaart-vervolg.md): de app draait mee tot de teruggegeven functie, daarna staat hij
  // weer rechtop. Kan het niet (een browser die niet mag vergrendelen), dan gebeurt er niets.
  freeRotation?(): () => void;
}

// Eén plek die telt hoeveel schermen draaien toestaan: pas als de laatste dichtgaat, staat de app weer
// rechtop. Twee keer loslaten telt één keer. Los te testen met nagemaakte `free` en `portrait`.
export function rotationCounter(free: () => void, portrait: () => void): () => () => void {
  let open = 0;
  return () => {
    open++;
    if (open === 1) free();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      open--;
      if (open === 0) portrait();
    };
  };
}

interface OrientationLike {
  lock?: (o: string) => Promise<void>;
  unlock?: () => void;
}
const screenOrientation = (): OrientationLike | undefined => (typeof screen !== 'undefined' ? (screen as Screen & { orientation?: OrientationLike }).orientation : undefined);

// De browser: een geïnstalleerde web-app staat rechtop door het manifest; `lock('any')` laat hem draaien,
// `lock('portrait')` zet hem terug. Een gewoon tabblad weigert dat (het draait toch al mee): stil.
const browserRotation = rotationCounter(
  () => void screenOrientation()?.lock?.('any').catch(() => undefined),
  () => void screenOrientation()?.lock?.('portrait').catch(() => {
    try {
      screenOrientation()?.unlock?.();
    } catch {
      // Niets te doen.
    }
  }),
);

// ---- de browser --------------------------------------------------------------------------

interface WakeLockLike {
  release: () => Promise<void>;
  released?: boolean;
}

// Screen Wake Lock (Chrome): de browser laat hem los als de app naar de achtergrond gaat, dus bij
// terugkomen opnieuw vragen. Zonder de API of bij een weigering gebeurt er niets.
function browserHoldScreen(): () => void {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return () => undefined;
  const api = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }).wakeLock;
  if (!api) return () => undefined;
  let lock: WakeLockLike | undefined;
  let stopped = false;
  let pending = false;
  const request = () => {
    // Nooit twee tegelijk: een lopende aanvraag of een lock die nog geldt is genoeg.
    if (document.visibilityState !== 'visible' || pending || (lock && !lock.released)) return;
    pending = true;
    api.request('screen').then(
      (l) => {
        pending = false;
        if (stopped) void l.release().catch(() => undefined);
        else lock = l;
      },
      () => {
        pending = false;
      },
    );
  };
  request();
  document.addEventListener('visibilitychange', request);
  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', request);
    void lock?.release().catch(() => undefined);
  };
}

function browserVibrate(pattern: number | number[]): void {
  // Android en Chrome kennen het; een iPhone niet: dan stil, nooit een fout.
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

const browserShell: DeviceShell = {
  vibrate: browserVibrate,
  holdScreen: browserHoldScreen,
  freeRotation: browserRotation,
};

// ---- de Android-app ----------------------------------------------------------------------

// Het eigen native deel AudioFocusPlugin.java (registerPlugin in MainActivity): vraagt audio focus met
// ducking en geeft hem na `ms` terug. Een oudere app zonder dit deel: dan gebeurt er niets.
interface AudioFocusPlugin {
  duck(options: { ms: number }): Promise<void>;
}
let audioFocus: AudioFocusPlugin | undefined;

// Het eigen native deel OrientationPlugin.java: `free` laat de app met de telefoon meedraaien, `portrait`
// zet hem weer rechtop (zoals het manifest). Een oudere app zonder dit deel: dan blijft hij staan.
interface OrientationPlugin {
  free(): Promise<void>;
  portrait(): Promise<void>;
}
let orientation: OrientationPlugin | undefined;
const nativeOrientation = (): OrientationPlugin | undefined => {
  if (!Capacitor.isPluginAvailable('Orientation')) return undefined;
  orientation ??= registerPlugin<OrientationPlugin>('Orientation');
  return orientation;
};
const androidRotation = rotationCounter(
  () => void nativeOrientation()?.free().catch(() => undefined),
  () => void nativeOrientation()?.portrait().catch(() => undefined),
);

function androidShell(): DeviceShell {
  // Modules in een belofte, nooit de plugin zelf: een plugin is een Proxy met een methode `then`
  // en een belofte die ermee vervuld wordt, blijft hangen.
  const haptics = import('@capacitor/haptics');
  const keepAwake = import('@capacitor-community/keep-awake');
  const app = import('@capacitor/app');
  let holds = 0;

  return {
    // Trillen via de plugin Haptics; een patroon als losse stoten na elkaar.
    vibrate(pattern) {
      const list = typeof pattern === 'number' ? [pattern] : pattern;
      void haptics.then((m) => {
        const h = m.Haptics;
        let at = 0;
        list.forEach((ms, i) => {
          if (i % 2 === 0 && ms > 0) window.setTimeout(() => void h.vibrate({ duration: ms }).catch(() => undefined), at);
          at += ms;
        });
      }).catch(() => browserVibrate(pattern));
    },
    holdScreen() {
      holds++;
      void keepAwake.then((m) => m.KeepAwake.keepAwake()).catch(() => undefined);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holds--;
        if (holds === 0) void keepAwake.then((m) => m.KeepAwake.allowSleep()).catch(() => undefined);
      };
    },
    onBackButton(handler) {
      let remove: (() => void) | undefined;
      let gone = false;
      void app.then((m) =>
        m.App.addListener('backButton', (e) => handler(e.canGoBack)).then((h) => {
          if (gone) void h.remove();
          else remove = () => void h.remove();
        }),
      );
      return () => {
        gone = true;
        remove?.();
      };
    },
    freeRotation: androidRotation,
    duckAudio(ms) {
      if (!Capacitor.isPluginAvailable('AudioFocus')) return;
      audioFocus ??= registerPlugin<AudioFocusPlugin>('AudioFocus');
      void audioFocus.duck({ ms: Math.max(200, Math.min(DUCK_MAX_MS, Math.round(ms))) }).catch(() => undefined);
    },
    exitApp() {
      void app.then((m) => m.App.exitApp()).catch(() => undefined);
    },
    start() {
      // Snelkoppelingen onder het app-icoon en de tik op de widget: een adres als
      // app.ascend.training://open/week wordt dezelfde hash-route als bij de PWA. De origin van
      // de webview (https://localhost) blijft zoals hij is, alleen de hash verandert.
      const open = (url: string | undefined) => {
        const route = url ? routeFromNativeShortcut(url) : null;
        if (route) window.location.hash = `#${route}`;
      };
      void app.then(async (m) => {
        const a = m.App;
        void a.addListener('appUrlOpen', (e) => open(e.url));
        open((await a.getLaunchUrl())?.url);
      }).catch(() => undefined);
      void import('@capacitor/splash-screen').then((m) => m.SplashScreen.hide()).catch(() => undefined);
      void import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        // De kleur van de lucht bovenaan (het token --color-sky-top), ook als die 's avonds donker wordt.
        const paint = () => {
          const root = document.documentElement;
          const color = getComputedStyle(root).getPropertyValue('--color-sky-top').trim();
          const night = root.dataset.sky === 'night';
          if (/^#[0-9a-f]{6}$/i.test(color)) void StatusBar.setBackgroundColor({ color }).catch(() => undefined);
          void StatusBar.setStyle({ style: night ? Style.Dark : Style.Light }).catch(() => undefined);
        };
        paint();
        new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-sky'] });
      }).catch(() => undefined);
    },
  };
}

let current: DeviceShell | undefined;

export function deviceShell(): DeviceShell {
  current ??= Capacitor.getPlatform() === 'android' ? androidShell() : browserShell;
  return current;
}

// Voor tests: een nagemaakte laag, of terug naar de echte met undefined.
export function setDeviceShell(shell: DeviceShell | undefined): void {
  current = shell;
}
