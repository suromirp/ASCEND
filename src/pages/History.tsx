import { useMemo, useState } from 'react';
import type { PlannedSession, SessionLog } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { formatDateNL, formatMonthNL, monthBounds, shiftMonthAnchor, todayISO } from '../utils/dates';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { getModality } from '../data/modalities';
import { LogDetailSheet } from '../components/LogDetailSheet';
import { Card, Eyebrow } from '../components/ui';

const TYPE_LABEL: Record<string, string> = { strength: 'Kracht', cardio: 'Cardio', hiking: 'Avontuur', recovery: 'Herstel', adventure: 'Avontuur' };

function computeMonthSummary(logs: SessionLog[]) {
  const strengthCount = logs.filter((l) => l.type === 'strength').length;
  const runningKm = logs.reduce((sum, l) => sum + (l.cardioData?.distanceKm ?? 0), 0);
  const hikingKm = logs.reduce((sum, l) => sum + (l.outdoorData?.distanceKm ?? 0), 0);
  const elevation = logs.reduce((sum, l) => sum + (l.outdoorData?.elevationGainM ?? l.cardioData?.elevationGainM ?? 0), 0);
  const elevationLoss = logs.reduce((sum, l) => sum + (l.outdoorData?.elevationLossM ?? 0), 0);
  const machineVertical = logs.reduce((sum, l) => sum + (l.outdoorData?.machineVerticalM ?? 0), 0);
  const totalMinutes = logs.reduce((sum, l) => sum + l.durationMinutes, 0);

  const cadenceValues = logs.map((l) => l.outdoorData?.cadence ?? l.cardioData?.cadence).filter((v): v is number => v !== undefined);
  const avgCadence = cadenceValues.length > 0 ? Math.round(cadenceValues.reduce((sum, v) => sum + v, 0) / cadenceValues.length) : undefined;

  const powerValues = logs.map((l) => l.outdoorData?.power ?? l.cardioData?.power).filter((v): v is number => v !== undefined);
  const avgPower = powerValues.length > 0 ? Math.round(powerValues.reduce((sum, v) => sum + v, 0) / powerValues.length) : undefined;

  return { strengthCount, runningKm, hikingKm, elevation, elevationLoss, machineVertical, totalMinutes, avgCadence, avgPower };
}

function countMissed(plannedSessions: PlannedSession[], sessionLogs: SessionLog[], start: string, end: string) {
  return plannedSessions.filter((p) => {
    if (p.scheduledDate < start || p.scheduledDate > end) return false;
    const { status } = deriveSessionStatus(p, sessionLogs);
    return status === 'skipped' || status === 'missed';
  }).length;
}

// Positive means "more than last month" — good for training-volume stats,
// bad for Gemist (invert). Silent when both months are zero, so a stat that
// simply doesn't apply this program (e.g. no Afdaling yet) doesn't clutter
// the card with a "±0" delta forever.
function formatDelta(current: number, previous: number, opts?: { unit?: string; decimals?: number; invert?: boolean }): { text: string; color: string } | undefined {
  if (current === 0 && previous === 0) return undefined;
  const diff = current - previous;
  const decimals = opts?.decimals ?? 0;
  const unit = opts?.unit ?? '';
  const sign = diff > 0 ? '+' : '';
  const text = `${sign}${diff.toFixed(decimals)}${unit} t.o.v. vorige maand`;
  const goodDirection = opts?.invert ? diff <= 0 : diff >= 0;
  const color = diff === 0 ? 'var(--color-ink-dim)' : goodDirection ? 'var(--color-success)' : 'var(--color-danger)';
  return { text, color };
}

export function HistoryPage() {
  const { sessionLogs, plannedSessions, templateById } = useAppData();
  const [anchor, setAnchor] = useState(todayISO());
  const { start, end } = monthBounds(anchor);
  const { start: prevStart, end: prevEnd } = monthBounds(shiftMonthAnchor(anchor, -1));

  const monthLogs = useMemo(
    () => sessionLogs.filter((l) => l.completedDate >= start && l.completedDate <= end).sort((a, b) => (a.completedDate < b.completedDate ? 1 : -1)),
    [sessionLogs, start, end],
  );

  const prevMonthLogs = useMemo(
    () => sessionLogs.filter((l) => l.completedDate >= prevStart && l.completedDate <= prevEnd),
    [sessionLogs, prevStart, prevEnd],
  );

  const missedCount = useMemo(() => countMissed(plannedSessions, sessionLogs, start, end), [plannedSessions, sessionLogs, start, end]);
  const prevMissedCount = useMemo(() => countMissed(plannedSessions, sessionLogs, prevStart, prevEnd), [plannedSessions, sessionLogs, prevStart, prevEnd]);

  const summary = useMemo(() => computeMonthSummary(monthLogs), [monthLogs]);
  const prevSummary = useMemo(() => computeMonthSummary(prevMonthLogs), [prevMonthLogs]);

  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);

  function shiftMonth(delta: number) {
    setAnchor(shiftMonthAnchor(anchor, delta));
  }

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>‹</button>
        <Eyebrow>{formatMonthNL(anchor).toUpperCase()}</Eyebrow>
        <button onClick={() => shiftMonth(1)} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>›</button>
      </div>

      <Card className="grid grid-cols-2 gap-4">
        <Stat label="Krachtsessies" value={`${summary.strengthCount}`} delta={formatDelta(summary.strengthCount, prevSummary.strengthCount)} />
        <Stat label="Hardlopen" value={`${summary.runningKm.toFixed(1)} km`} delta={formatDelta(summary.runningKm, prevSummary.runningKm, { unit: ' km', decimals: 1 })} />
        <Stat label="Hoogtemeters" value={`${Math.round(summary.elevation)} D+`} delta={formatDelta(Math.round(summary.elevation), Math.round(prevSummary.elevation), { unit: ' D+' })} />
        <Stat label="Wandelen" value={`${summary.hikingKm.toFixed(1)} km`} delta={formatDelta(summary.hikingKm, prevSummary.hikingKm, { unit: ' km', decimals: 1 })} />
        <Stat label="Trainingstijd" value={`${Math.floor(summary.totalMinutes / 60)}u ${summary.totalMinutes % 60}m`} delta={formatDelta(summary.totalMinutes, prevSummary.totalMinutes, { unit: ' min' })} />
        <Stat label="Gemist" value={`${missedCount}`} delta={formatDelta(missedCount, prevMissedCount, { invert: true })} />
        {summary.elevationLoss > 0 && <Stat label="Afdaling" value={`${Math.round(summary.elevationLoss)} D-`} />}
        {summary.machineVertical > 0 && <Stat label="Machine-vertical" value={`${Math.round(summary.machineVertical)} m`} />}
        {summary.avgCadence !== undefined && <Stat label="Gem. cadans" value={`${summary.avgCadence}`} />}
        {summary.avgPower !== undefined && <Stat label="Gem. vermogen" value={`${summary.avgPower} W`} />}
      </Card>

      <div className="flex flex-col gap-2">
        {monthLogs.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Nog geen voltooide sessies deze maand.</p>
        )}
        {monthLogs.map((log, i) => {
          const template = templateById.get(log.templateId);
          const modalityKey = log.outdoorData?.modality ?? log.cardioData?.modality;
          const modalityLabel = modalityKey ? getModality(log.templateId, modalityKey)?.label : undefined;
          const environment = log.outdoorData?.environment ?? log.cardioData?.environment;
          const garminType = log.outdoorData?.garminSuggestedType ?? log.cardioData?.garminSuggestedType;
          return (
            <button
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="animate-rise-in text-left"
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
            >
              <div className="flex items-center gap-3 rounded-xl border px-3 py-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
                <span className="text-xs" style={{ color: 'var(--color-ink-dim)', width: '48px' }}>{formatDateNL(log.completedDate)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{template?.name ?? log.templateId}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                    {TYPE_LABEL[log.type]} • {log.durationMinutes} min
                    {modalityLabel ? ` • ${modalityLabel}` : environment === 'treadmill' ? ' • Treadmill' : environment === 'outdoor' ? ' • Buiten' : ''}
                    {garminType ? ` • Garmin: ${garminType}` : ''}
                    {log.subjectiveFeel === 'better' ? ' • voelde beter' : ''}
                    {log.subjectiveFeel === 'worse' ? ' • voelde slechter' : ''}
                    {log.outdoorData?.elevationGainM
                      ? ` • ${log.outdoorData.elevationGainM} D+${log.outdoorData.estimatedElevation ? ' (geschat)' : ''}`
                      : ''}
                    {log.cardioData?.elevationGainM
                      ? ` • ${log.cardioData.elevationGainM} D+${log.cardioData.estimatedElevation ? ' (geschat)' : ''}`
                      : ''}
                    {log.outdoorData?.distanceKm ? ` • ${log.outdoorData.distanceKm} km` : ''}
                    {log.cardioData?.distanceKm ? ` • ${log.cardioData.distanceKm} km` : ''}
                    {log.outdoorData?.steps ? ` • ${log.outdoorData.steps} verdiepingen` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-sm" style={{ color: 'var(--color-gold)' }}>›</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedLog && (
        <LogDetailSheet
          log={selectedLog}
          templateName={templateById.get(selectedLog.templateId)?.name ?? selectedLog.templateId}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: { text: string; color: string } }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</p>
      <p className="mt-0.5 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{value}</p>
      {delta && <p className="mt-0.5 text-[10px] leading-tight" style={{ color: delta.color }}>{delta.text}</p>}
    </div>
  );
}
