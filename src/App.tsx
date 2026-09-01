import { useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { AppDataProvider, useAppData } from './state/AppDataContext';
import { AscendSplashLogo } from './components/AscendSplashLogo';
import { playIntroDrumsOnFirstInteraction } from './utils/introDrums';
import { TodayPage } from './pages/Today';
import { WeekPage } from './pages/Week';
import { AscendPage } from './pages/Ascend';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';
import { StretchesPage } from './pages/Stretches';
import { StretchAreaPage } from './pages/StretchArea';
import { TrainingGuidePage } from './pages/TrainingGuide';
import { GarminGuidePage } from './pages/GarminGuide';

function NavIcon({ id }: { id: string }) {
  const icons: Record<string, string> = {
    today: 'M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3z',
    week: 'M4 5h16M4 12h16M4 19h10',
    ascend: 'M3 18l6-11 4 7 3-5 5 9H3z',
    history: 'M12 7v5l3 3M4 12a8 8 0 1 1 3 6.3',
    more: 'M4 7h16M4 12h16M4 17h16',
  };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
  const { loading, settings } = useAppData();
  const navigate = useNavigate();

  // Armed once per app open, not per settings change — re-arming on every
  // toggle would let a later interaction retrigger it after the user just
  // turned it off mid-session, which reads as broken rather than muted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => playIntroDrumsOnFirstInteraction(settings.introSoundEnabled), []);

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
      <div
        className="mx-auto w-full max-w-md min-h-0 flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(4.5rem + max(env(safe-area-inset-bottom), 8px))' }}
      >
        <Routes>
          <Route path="/" element={<TodayPage onOpenLadder={() => navigate('/ascend')} />} />
          <Route path="/week" element={<WeekPage />} />
          <Route path="/ascend" element={<AscendPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/more" element={<SettingsPage />} />
          <Route path="/stretches" element={<StretchesPage />} />
          <Route path="/stretches/:areaId" element={<StretchAreaPage />} />
          <Route path="/gids" element={<TrainingGuidePage />} />
          <Route path="/garmin" element={<GarminGuidePage />} />
        </Routes>
      </div>
      <BottomNav />
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
