import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { formatDateNL, formatMonthNL, parseISODate, toISODate, todayISO } from '../utils/dates';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { Card, Eyebrow } from '../components/ui';

function monthBounds(anchor: string) {
  const d = parseISODate(anchor);
  const start = toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start, end };
}

const TYPE_LABEL: Record<string, string> = { strength: 'Kracht', cardio: 'Cardio', hiking: 'Avontuur', recovery: 'Herstel', adventure: 'Avontuur' };

export function HistoryPage() {
  const { sessionLogs, plannedSessions, templateById } = useAppData();
  const [anchor, setAnchor] = useState(todayISO());
  const { start, end } = monthBounds(anchor);

  const monthLogs = useMemo(
    () => sessionLogs.filter((l) => l.completedDate >= start && l.completedDate <= end).sort((a, b) => (a.completedDate < b.completedDate ? 1 : -1)),
    [sessionLogs, start, end],
  );

  const missedCount = useMemo(
    () =>
      plannedSessions.filter((p) => {
        if (p.scheduledDate < start || p.scheduledDate > end) return false;
        const { status } = deriveSessionStatus(p, sessionLogs);
        return status === 'skipped' || status === 'missed';
      }).length,
    [plannedSessions, sessionLogs, start, end],
  );

  const summary = useMemo(() => {
    const strengthCount = monthLogs.filter((l) => l.type === 'strength').length;
    const runningKm = monthLogs.reduce((sum, l) => sum + (l.cardioData?.distanceKm ?? 0), 0);
    const hikingKm = monthLogs.reduce((sum, l) => sum + (l.outdoorData?.distanceKm ?? 0), 0);
    const elevation = monthLogs.reduce((sum, l) => sum + (l.outdoorData?.elevationGainM ?? l.cardioData?.elevationGainM ?? 0), 0);
    const totalMinutes = monthLogs.reduce((sum, l) => sum + l.durationMinutes, 0);
    return { strengthCount, runningKm, hikingKm, elevation, totalMinutes };
  }, [monthLogs]);

  function shiftMonth(delta: number) {
    const d = parseISODate(anchor);
    setAnchor(toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1)));
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>‹</button>
        <Eyebrow>{formatMonthNL(anchor).toUpperCase()}</Eyebrow>
        <button onClick={() => shiftMonth(1)} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>›</button>
      </div>

      <Card className="grid grid-cols-2 gap-4">
        <Stat label="Krachtsessies" value={`${summary.strengthCount}`} />
        <Stat label="Hardlopen" value={`${summary.runningKm.toFixed(1)} km`} />
        <Stat label="Hoogtemeters" value={`${Math.round(summary.elevation)} D+`} />
        <Stat label="Wandelen" value={`${summary.hikingKm.toFixed(1)} km`} />
        <Stat label="Trainingstijd" value={`${Math.floor(summary.totalMinutes / 60)}u ${summary.totalMinutes % 60}m`} />
        <Stat label="Gemist" value={`${missedCount}`} />
      </Card>

      <div className="flex flex-col gap-2">
        {monthLogs.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Nog geen voltooide sessies deze maand.</p>
        )}
        {monthLogs.map((log) => {
          const template = templateById.get(log.templateId);
          return (
            <div key={log.id} className="flex items-center gap-3 rounded-xl border px-3 py-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)', width: '48px' }}>{formatDateNL(log.completedDate)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{template?.name ?? log.templateId}</p>
                <p className="truncate text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  {TYPE_LABEL[log.type]} • {log.durationMinutes} min
                  {log.outdoorData?.elevationGainM ? ` • ${log.outdoorData.elevationGainM} D+` : ''}
                  {log.cardioData?.elevationGainM ? ` • ${log.cardioData.elevationGainM} D+` : ''}
                  {log.outdoorData?.distanceKm ? ` • ${log.outdoorData.distanceKm} km` : ''}
                  {log.cardioData?.distanceKm ? ` • ${log.cardioData.distanceKm} km` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</p>
      <p className="mt-0.5 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{value}</p>
    </div>
  );
}
