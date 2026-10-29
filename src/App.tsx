import { resolveMorningNotice } from './engine/morningNotice';
import { syncMorningNotice } from './utils/morningNotice';
import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BOOT_LOCK_BUSY_TEXT, BOOT_STEAL_FLAG } from './engine/bootWatch';
import { AppDataProvider, useAppData } from './state/AppDataContext';
import { BootScreen } from './components/BootScreen';
import { CompletionMoment } from './components/CompletionMoment';
import { UpdatePrompt, UpdatedNotice } from './components/UpdatePrompt';
import { SHOW_SPLASH } from './utils/updateFlag';
import { ChangeNotice } from './components/ChangeNotice';
import { DebriefSheet } from './components/DebriefSheet';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Icon, type IconName } from './components/icons';
import { useOverlayA11y } from './components/useOverlayA11y';
import { useScrollRestoration } from './components/useScrollRestoration';
import { useHapticsSetting, useMotionAttribute } from './components/motion';
import { useExerciseArtPrefetch } from './components/useExerciseArtPrefetch';
import { useSkyAttribute } from './components/sky';
import { resolveNavigation } from './engine/navigationSettings';
import { localStorageOrNull, planLaunch, readLastRoute, writeLastRoute } from './utils/launchRoute';
import { SCROLLER_ID, scrollMainToTop } from './utils/scrollMain';
import { planTabNavigation, type TabState } from './utils/tabNav';
import { playIntroDrumsOnFirstInteraction } from './utils/sound';
import { tapFollowsOverlayClose } from './utils/overlayGuard';
import { TodayPage } from './pages/Today';
import { WeekPage } from './pages/Week';
import { AscendPage } from './pages/Ascend';
import { HistoryPage } from './pages/History';
import { SettingsOverview } from './pages/settings/SettingsOverview';
import { SettingsGroupPage } from './pages/settings/SettingsGroupPage';
import { KnowledgePage, KnowledgeTopicPage } from './pages/Knowledge';
import { StretchAreaRedirect } from './pages/StretchAreaRedirect';
import { SessionPill } from './components/forge/SessionPill';
import { useOpenRequest, useSessionPill } from './components/forge/useForgeSession';
// Pages you open now and then load on demand, so the first start only
// downloads what Today needs. The service worker precaches every chunk, so
// they still work offline.
const BodyPage = lazy(() => import('./pages/Body').then((m) => ({ default: m.BodyPage })));
const BodySpotPage = lazy(() => import('./pages/BodySpot').then((m) => ({ default: m.BodySpotPage })));
const GarminLinkPage = lazy(() => import('./pages/GarminLink').then((m) => ({ default: m.GarminLinkPage })));
const MacroFactorImportPage = lazy(() => import('./pages/MacroFactorImport').then((m) => ({ default: m.MacroFactorImportPage })));
const SourcesPage = lazy(() => import('./pages/Sources').then((m) => ({ default: m.SourcesPage })));
const WeatherPage = lazy(() => import('./pages/Weather').then((m) => ({ default: m.WeatherPage })));
const ForgeSessionHost = lazy(() => import('./components/forge/ForgeSessionHost'));
const ForgePage = lazy(() => import('./pages/Forge').then((m) => ({ default: m.ForgePage })));
const TrainingSpotsPage = lazy(() => import('./pages/TrainingSpots').then((m) => ({ default: m.TrainingSpotsPage })));
const StandingPage = lazy(() => import('./pages/Standing').then((m) => ({ default: m.StandingPage })));
const JourneyPage = lazy(() => import('./pages/Journey').then((m) => ({ default: m.JourneyPage })));
const PackListPage = lazy(() => import('./pages/PackList').then((m) => ({ default: m.PackListPage })));
const EtappesPage = lazy(() => import('./pages/Etappes').then((m) => ({ default: m.EtappesPage })));
const AlleenOnderwegPage = lazy(() => import('./pages/AlleenOnderweg').then((m) => ({ default: m.AlleenOnderwegPage })));

// De vijf tabs. Meer is geen tab meer maar het tandwiel rechtsboven
// (SettingsGear); de route /more blijft bestaan, ook voor oude links.
// Elke tab heeft een eigen kleur voor de actieve tab, het streepje erboven en
// het kopje op de pagina (--color-tab-* in index.css).
const TABS: { to: string; icon: IconName; label: string; key: TabKey }[] = [
  { to: '/', icon: 'vandaag', label: 'Vandaag', key: 'vandaag' },
  { to: '/week', icon: 'week', label: 'Week', key: 'week' },
  { to: '/stand', icon: 'stand', label: 'Stand', key: 'stand' },
  { to: '/ascend', icon: 'ascend', label: 'Ascend', key: 'ascend' },
  { to: '/history', icon: 'logboek', label: 'Logboek', key: 'logboek' },
];
type TabKey = 'vandaag' | 'week' | 'stand' | 'ascend' | 'logboek';
const TAB_ROUTES = TABS.map((t) => t.to);

// Bij welke tab een adres hoort, voor de kleur van de pagina (data-tab). Een
// subpagina van Ascend (/ascend/doelen) hoort bij Ascend; de rest valt buiten de
// tabs en houdt mint.
function tabKeyFor(pathname: string): TabKey | undefined {
  return TABS.find((t) => (t.to === '/' ? pathname === '/' : pathname === t.to || pathname.startsWith(`${t.to}/`)))?.key;
}

// Wat er bij het starten van de pagina al vaststaat: hoe de app is geopend
// (nieuw, herladen of terug) en waar je de vorige keer was. Eenmalig gelezen,
// voordat de eerste tekening het laatste adres overschrijft (utils/launchRoute.ts).
function navigationTypeAtLaunch(): string {
  try {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return entry?.type ?? 'navigate';
  } catch {
    return 'navigate';
  }
}
const LAUNCH_NAVIGATION_TYPE = navigationTypeAtLaunch();
const LAST_ROUTE_AT_LAUNCH = readLastRoute(localStorageOrNull());
const routerIdx = () => (window.history.state as { idx?: number } | null)?.idx ?? 0;

// `fixed` rather than `sticky` — sticky is only pinned relative to its own
// scroll container, so on mobile (address bar show/hide, momentum scroll,
// on-screen keyboard) it could visibly slide up/down with the content
// instead of staying put. Fixed anchors it to the viewport itself.
function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useAppData();
  const { tabBack } = resolveNavigation(settings);

  // Een tik op een tab is een echte stap in de geschiedenis, of vervangt de
  // vorige tab (utils/tabNav.ts, instelling "Terugknop op een tab").
  function onTab(e: ReactMouseEvent<HTMLAnchorElement>, to: string) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const plan = planTabNavigation({
      mode: tabBack,
      currentPath: location.pathname,
      currentState: location.state as TabState | null,
      target: to,
      historyIdx: routerIdx(),
      tabs: TAB_ROUTES,
      home: '/',
    });
    if (plan.kind === 'top') scrollMainToTop();
    else if (plan.kind === 'back') navigate(-1);
    else if (plan.kind === 'push') navigate(to, { state: plan.state });
    else navigate(to, { replace: true, state: plan.state });
  }

  return (
    <nav
      aria-label="Hoofdmenu"
      // Een tweede tik op de knop van een blad dat net sluit, valt anders
      // door op de tab eronder (utils/overlayGuard.ts).
      onClickCapture={(e) => {
        if (!tapFollowsOverlayClose()) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      className="fixed inset-x-0 bottom-0 z-40 border-t"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}
    >
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            onClick={(e) => onTab(e, tab.to)}
            className="relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-xs font-medium"
            style={({ isActive }) => ({ color: isActive ? `var(--color-tab-${tab.key})` : 'var(--color-ink-dim)' })}
          >
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden="true" className="absolute -top-1.5 h-[3px] w-8 rounded-b-[3px]" style={{ background: `var(--color-tab-${tab.key})` }} />}
                <span style={{ color: isActive ? undefined : `color-mix(in srgb, var(--color-tab-${tab.key}) 72%, var(--color-ink-dim))` }}>
                  <Icon name={tab.icon} />
                </span>
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function AppShell() {
  const { loading, bootError, settings, celebration, dismissCelebration, storageNotice, dismissStorageNotice, reportStorageError } = useAppData();

  // Any write that fails without its own handling (storage full, storage
  // blocked mid-session) still reaches the user instead of only the console.
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const name = e.reason instanceof DOMException || e.reason instanceof Error ? e.reason.name : '';
      if (['QuotaExceededError', 'InvalidStateError', 'TransactionInactiveError', 'AbortError', 'UnknownError', 'DataError'].includes(name)) {
        reportStorageError(e.reason);
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, [reportStorageError]);
  const location = useLocation();
  const navigate = useNavigate();
  useOverlayA11y();
  useMotionAttribute(!loading);
  useHapticsSetting();
  useExerciseArtPrefetch();
  useSkyAttribute();

  // Terug brengt je op dezelfde hoogte, ook na een herlaad (components/useScrollRestoration.ts).
  const mainRef = useRef<HTMLElement>(null);
  const mainReady = !loading && !bootError;
  useScrollRestoration(mainRef, mainReady);

  // Na een herstart terug naar waar je was (instelling "Na een herstart"), en
  // Vandaag onder een tab die als eerste opent. Eén keer, zodra de instellingen
  // er zijn (utils/launchRoute.ts).
  const launchHandled = useRef(false);
  useEffect(() => {
    if (!mainReady || launchHandled.current) return;
    launchHandled.current = true;
    const nav = resolveNavigation(settings);
    const target = planLaunch({
      pathname: location.pathname,
      search: location.search,
      historyIdx: routerIdx(),
      navigationType: LAUNCH_NAVIGATION_TYPE,
      now: Date.now(),
      last: LAST_ROUTE_AT_LAUNCH,
      resumeMinutes: nav.resumeMinutes,
      mode: nav.tabBack,
      tabs: TAB_ROUTES,
      home: '/',
    });
    if (!target) return;
    if (location.pathname !== '/') navigate('/', { replace: true });
    navigate(target, { state: { fromToday: true } satisfies TabState });
    // Only at the first moment the app is ready, never again.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [mainReady]);

  // Waar je was, voor de volgende start: bij elke pagina, en nog eens als de
  // app naar de achtergrond gaat (zodat de tijd klopt met je laatste gebruik).
  useEffect(() => {
    if (!mainReady) return;
    const storage = localStorageOrNull();
    writeLastRoute(storage, location.pathname, Date.now());
    const onHide = () => {
      if (document.visibilityState === 'hidden') writeLastRoute(storage, location.pathname, Date.now());
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [mainReady, location.pathname]);

  // De ochtendmelding: bij het openen de periodieke sync (opnieuw) aanmelden als hij aan
  // staat en de toestemming er is, of afmelden als hij uit staat (utils/morningNotice.ts).
  const noticeOn = resolveMorningNotice(settings.morningNotice).enabled;
  useEffect(() => {
    if (!mainReady) return;
    void syncMorningNotice(noticeOn).catch(() => undefined);
  }, [mainReady, noticeOn]);

  // Links to the outside world (sources, maps, videos) offline used to open
  // a bare browser error page. Now they stay put and say why.
  const [offlineNotice, setOfflineNotice] = useState(false);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navigator.onLine) return;
      const link = (e.target as Element | null)?.closest?.('a[href^="http"]');
      if (!link) return;
      e.preventDefault();
      setOfflineNotice(true);
    };
    const onOnline = () => setOfflineNotice(false);
    document.addEventListener('click', onClick, true);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Armed once per app open, not per settings change — re-arming on every
  // toggle would let a later interaction retrigger it after the user just
  // turned it off mid-session, which reads as broken rather than muted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => playIntroDrumsOnFirstInteraction(settings.introSoundEnabled), []);

  // Without the splash (later opens today, after an update, reduced
  // motion): a quiet empty frame for the few ms IndexedDB needs.
  // De lopende training van Forge: de pil boven de tabbalk en het scherm dat hij opent.
  const pill = useSessionPill();
  const openSession = useOpenRequest();

  if (bootError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Opslag niet beschikbaar</p>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{bootError}</p>
        <button
          onClick={() => window.location.reload()}
          className="min-h-[44px] rounded-xl border px-5 py-2.5 text-xs font-semibold"
          style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
        >
          Opnieuw proberen
        </button>
        {bootError === BOOT_LOCK_BUSY_TEXT && (
          <button
            onClick={() => {
              try {
                sessionStorage.setItem(BOOT_STEAL_FLAG, '1');
              } catch {
                // Without session storage the next load simply waits again.
              }
              window.location.reload();
            }}
            className="min-h-[44px] rounded-xl border px-5 py-2.5 text-xs font-semibold"
            style={{ borderColor: 'var(--color-action)', color: 'var(--color-ink)' }}
          >
            Toch openen
          </button>
        )}
        <UpdatePrompt />
      </div>
    );
  }

  // With or without the splash, the watch takes over when opening takes long.
  if (loading) return <BootScreen splash={SHOW_SPLASH} />;

  return (
    <>
      {storageNotice && (
        <div role="alert" className="fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-md items-start gap-3 border-b px-4 py-3" style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-danger)', paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
          <p className="flex-1 text-xs" style={{ color: 'var(--color-ink)' }}>{storageNotice}</p>
          <button onClick={dismissStorageNotice} aria-label="Melding sluiten" className="min-h-[44px] min-w-[44px] text-sm" style={{ color: 'var(--color-ink-dim)' }}><Icon name="sluiten" size={20} /></button>
        </div>
      )}
      <main
        id={SCROLLER_ID}
        ref={mainRef}
        className="mx-auto w-full max-w-md min-h-0 flex-1 overflow-y-auto"
        style={{ paddingBottom: pill ? 'calc(8.25rem + max(env(safe-area-inset-bottom), 8px))' : 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px))' }}
      >
        {/* De kop (merkteken en tandwiel) staat op elke tab in SkyBand, bovenaan
            de pagina zelf. data-tab geeft de pagina haar eigen kleur. */}
        <div className="relative" data-tab={tabKeyFor(location.pathname)}>
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/stand" element={<StandingPage />} />
            <Route path="/week" element={<WeekPage />} />
            <Route path="/ascend" element={<AscendPage />} />
            <Route path="/ascend/doelen" element={<Navigate to="/ascend" replace />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/more" element={<SettingsOverview />} />
            <Route path="/more/:groep" element={<SettingsGroupPage />} />
            <Route path="/lichaam" element={<BodyPage />} />
            <Route path="/lichaam/:plek" element={<BodySpotPage />} />
            {/* De lijst met rekoefeningen en de pagina Blessures zijn opgegaan in Lichaam. */}
            <Route path="/stretches" element={<Navigate to="/lichaam" replace />} />
            <Route path="/stretches/:areaId" element={<StretchAreaRedirect />} />
            <Route path="/kennis" element={<KnowledgePage />} />
            <Route path="/kennis/:topicId" element={<KnowledgeTopicPage />} />
            {/* Oude links: de trainingsgids is het blad "Hoe je het doet" bij elke
                training, de Garmin-gids staat onderaan de koppeling met Garmin. */}
            <Route path="/gids" element={<Navigate to="/week" replace />} />
            <Route path="/garmin" element={<Navigate to="/koppelen/garmin" replace />} />
            <Route path="/koppelen/garmin" element={<GarminLinkPage />} />
            <Route path="/koppelen/macrofactor" element={<MacroFactorImportPage />} />
            <Route path="/bronnen" element={<SourcesPage />} />
            <Route path="/plekken" element={<TrainingSpotsPage />} />
            <Route path="/weer" element={<WeatherPage />} />
            <Route path="/forge" element={<ForgePage />} />
            <Route path="/kracht" element={<Navigate to="/forge" replace />} />
            <Route path="/blessures" element={<Navigate to="/lichaam" replace />} />
            <Route path="/reis" element={<JourneyPage />} />
            <Route path="/reis/paklijst" element={<PackListPage />} />
            <Route path="/etappes" element={<EtappesPage />} />
            <Route path="/onderweg" element={<AlleenOnderwegPage />} />
            {/* Een adres dat niet bestaat (meer) opent Vandaag, niet een leeg scherm. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
        </div>
      </main>
      {offlineNotice && (
        <div role="status" className="fixed inset-x-0 z-50 mx-auto flex max-w-md items-center gap-3 border-t px-4 py-3" style={{ bottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px))', background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)' }}>
          <p className="flex-1 text-xs" style={{ color: 'var(--color-ink)' }}>Je bent offline. Deze link opent zodra je weer verbinding hebt. De rest van ASCEND werkt gewoon.</p>
          <button onClick={() => setOfflineNotice(false)} aria-label="Melding sluiten" className="min-h-[44px] min-w-[44px] text-sm" style={{ color: 'var(--color-ink-dim)' }}><Icon name="sluiten" size={20} /></button>
        </div>
      )}
      {pill && <SessionPill session={pill} />}
      <BottomNav />
      {openSession && (
        <Suspense fallback={null}>
          <ForgeSessionHost />
        </Suspense>
      )}
      <ChangeNotice />
      <DebriefSheet />
      <UpdatePrompt />
      <UpdatedNotice />
      <CompletionMoment event={celebration} onDismiss={dismissCelebration} />
    </>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </AppDataProvider>
  );
}
