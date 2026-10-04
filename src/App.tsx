import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AppDataProvider, useAppData } from './state/AppDataContext';
import { AscendSplashLogo } from './components/AscendSplashLogo';
import { CompletionMoment } from './components/CompletionMoment';
import { UpdatePrompt, UpdatedNotice } from './components/UpdatePrompt';
import { SHOW_SPLASH } from './utils/updateFlag';
import { ChangeNotice } from './components/ChangeNotice';
import { DebriefSheet } from './components/DebriefSheet';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useOverlayA11y } from './components/useOverlayA11y';
import { playIntroDrumsOnFirstInteraction } from './utils/sound';
import { TodayPage } from './pages/Today';
import { WeekPage } from './pages/Week';
import { AscendPage, GoalsPage } from './pages/Ascend';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';
// Pages you open now and then load on demand, so the first start only
// downloads what Today needs. The service worker precaches every chunk, so
// they still work offline.
const StretchesPage = lazy(() => import('./pages/Stretches').then((m) => ({ default: m.StretchesPage })));
const StretchAreaPage = lazy(() => import('./pages/StretchArea').then((m) => ({ default: m.StretchAreaPage })));
const TrainingGuidePage = lazy(() => import('./pages/TrainingGuide').then((m) => ({ default: m.TrainingGuidePage })));
const GarminGuidePage = lazy(() => import('./pages/GarminGuide').then((m) => ({ default: m.GarminGuidePage })));
const SourcesPage = lazy(() => import('./pages/Sources').then((m) => ({ default: m.SourcesPage })));
const TrainingSpotsPage = lazy(() => import('./pages/TrainingSpots').then((m) => ({ default: m.TrainingSpotsPage })));
const InjuriesPage = lazy(() => import('./pages/Injuries').then((m) => ({ default: m.InjuriesPage })));

function NavIcon({ id }: { id: string }) {
  const icons: Record<string, string> = {
    today: 'M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3z',
    week: 'M4 5h16M4 12h16M4 19h10',
    ascend: 'M3 18l6-11 4 7 3-5 5 9H3z',
    history: 'M12 7v5l3 3M4 12a8 8 0 1 1 3 6.3',
    more: 'M4 7h16M4 12h16M4 17h16',
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[id]} />
    </svg>
  );
}

const TABS = [
  { to: '/', id: 'today', label: 'TODAY' },
  { to: '/week', id: 'week', label: 'WEEK' },
  { to: '/ascend', id: 'ascend', label: 'ASCEND' },
  { to: '/history', id: 'history', label: 'HISTORY' },
  { to: '/more', id: 'more', label: 'MORE' },
];

// `fixed` rather than `sticky` — sticky is only pinned relative to its own
// scroll container, so on mobile (address bar show/hide, momentum scroll,
// on-screen keyboard) it could visibly slide up/down with the content
// instead of staying put. Fixed anchors it to the viewport itself.
function BottomNav() {
  return (
    <nav
      aria-label="Hoofdmenu"
      className="fixed inset-x-0 bottom-0 z-40 border-t"
      style={{ background: 'rgba(13,13,15,0.92)', borderColor: 'var(--color-card-border)', backdropFilter: 'blur(12px)' }}
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.to}
            end={tab.to === '/'}
            className="flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-medium tracking-wide"
            style={({ isActive }) => ({ color: isActive ? 'var(--color-gold)' : 'var(--color-ink-dim)' })}
          >
            <NavIcon id={tab.id} />
            {tab.label}
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
  const navigate = useNavigate();
  const location = useLocation();
  useOverlayA11y();

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
  if (bootError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Opslag niet beschikbaar</p>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{bootError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border px-5 py-2.5 text-xs font-semibold tracking-wide"
          style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
        >
          OPNIEUW PROBEREN
        </button>
      </div>
    );
  }

  if (loading && !SHOW_SPLASH) return <div className="flex-1" style={{ background: 'var(--color-bg)' }} />;

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-10">
        <AscendSplashLogo size={200} />
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>De klim wordt voorbereid…</p>
      </div>
    );
  }

  return (
    <>
      {storageNotice && (
        <div role="alert" className="fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-md items-start gap-3 border-b px-4 py-3" style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-danger)', paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
          <p className="flex-1 text-xs" style={{ color: 'var(--color-ink)' }}>{storageNotice}</p>
          <button onClick={dismissStorageNotice} aria-label="Melding sluiten" className="min-h-[44px] min-w-[44px] text-sm" style={{ color: 'var(--color-ink-dim)' }}>✕</button>
        </div>
      )}
      <main
        className="mx-auto w-full max-w-md min-h-0 flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px))' }}
      >
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<TodayPage onOpenLadder={() => navigate('/ascend')} />} />
            <Route path="/week" element={<WeekPage />} />
            <Route path="/ascend" element={<AscendPage />} />
            <Route path="/ascend/doelen" element={<GoalsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/more" element={<SettingsPage />} />
            <Route path="/stretches" element={<StretchesPage />} />
            <Route path="/stretches/:areaId" element={<StretchAreaPage />} />
            <Route path="/gids" element={<TrainingGuidePage />} />
            <Route path="/garmin" element={<GarminGuidePage />} />
            <Route path="/bronnen" element={<SourcesPage />} />
            <Route path="/plekken" element={<TrainingSpotsPage />} />
            <Route path="/blessures" element={<InjuriesPage />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {offlineNotice && (
        <div role="status" className="fixed inset-x-0 z-50 mx-auto flex max-w-md items-center gap-3 border-t px-4 py-3" style={{ bottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px))', background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)' }}>
          <p className="flex-1 text-xs" style={{ color: 'var(--color-ink)' }}>Je bent offline. Deze link opent zodra je weer verbinding hebt. De rest van ASCEND werkt gewoon.</p>
          <button onClick={() => setOfflineNotice(false)} aria-label="Melding sluiten" className="min-h-[44px] min-w-[44px] text-sm" style={{ color: 'var(--color-ink-dim)' }}>✕</button>
        </div>
      )}
      <BottomNav />
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
