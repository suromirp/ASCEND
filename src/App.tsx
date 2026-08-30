import { HashRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { AppDataProvider, useAppData } from './state/AppDataContext';
import { TodayPage } from './pages/Today';
import { WeekPage } from './pages/Week';
import { AscendPage } from './pages/Ascend';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';

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

function BottomNav() {
  return (
    <nav
      className="sticky bottom-0 z-40 flex items-center justify-around border-t px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2"
      style={{ background: 'rgba(13,13,15,0.92)', borderColor: 'var(--color-card-border)', backdropFilter: 'blur(12px)' }}
    >
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
    </nav>
  );
}

function AppShell() {
  const { loading } = useAppData();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="font-display text-2xl tracking-wide" style={{ color: 'var(--color-bronze)' }}>ASCEND</p>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>De klim wordt voorbereid…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<TodayPage onOpenLadder={() => navigate('/ascend')} />} />
          <Route path="/week" element={<WeekPage />} />
          <Route path="/ascend" element={<AscendPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/more" element={<SettingsPage />} />
        </Routes>
      </div>
      <div className="mx-auto w-full max-w-md">
        <BottomNav />
      </div>
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
