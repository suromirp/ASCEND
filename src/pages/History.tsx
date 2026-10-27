import { WeekReviewList } from '../components/WeekReview';
import { formatNumberNL } from '../utils/number';
import { logKindLabel, logSport } from '../engine/sports';
import { logLineParts } from '../engine/logLine';
import { useCallback, useMemo, useState } from 'react';
import type { PlannedSession, SessionLog } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { formatDateNL, formatHoursMinutesNL, formatShortDayNL, formatMonthNL, monthBounds, shiftMonthAnchor, todayISO } from '../utils/dates';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { isIllnessDay } from '../engine/illness';
import { getModality } from '../data/modalities';
import { LogDetailSheet } from '../components/LogDetailSheet';
import { Card, Eyebrow, LightCard, Stat, StatusPill } from '../components/ui';
import { MonthCalendar } from '../components/MonthCalendar';
import { DisclosureRow } from '../components/DisclosureRow';
import { SPORT_LOOK, sportKeyOfLog, type SportKey } from '../components/logbook/sportLook';
import { usePageState } from '../components/usePageState';
import { validMonthAnchor } from '../utils/pageMemory';
import { Icon } from '../components/icons';
import { Pictogram } from '../components/pictograms';
import { SkyBand, SkyPanel } from '../components/SkyBand';
import { HeartSign } from '../components/influence/HeartSign';
import { InfluenceSheet } from '../components/influence/InfluenceSheet';
import { useDeviations } from '../components/influence/useInfluence';
import { entryForLog, isNoted, signState } from '../engine/influence';

const NO_LOGS: SessionLog[] = [];


function computeMonthSummary(logs: SessionLog[]) {
  const strengthCount = logs.filter((l) => l.type === 'strength').length;
  const runningKm = logs.reduce((sum, l) => sum + (logSport(l) === 'cycling' ? 0 : (l.cardioData?.distanceKm ?? 0)), 0);
  const cyclingKm = logs.reduce((sum, l) => sum + (logSport(l) === 'cycling' ? (l.cardioData?.distanceKm ?? l.outdoorData?.distanceKm ?? 0) : 0), 0);
  const hikingKm = logs.reduce((sum, l) => sum + (logSport(l) === 'cycling' ? 0 : (l.outdoorData?.distanceKm ?? 0)), 0);
  const elevation = logs.reduce((sum, l) => sum + (l.outdoorData?.elevationGainM ?? l.cardioData?.elevationGainM ?? 0), 0);
  const elevationLoss = logs.reduce((sum, l) => sum + (l.outdoorData?.elevationLossM ?? 0), 0);
  const machineVertical = logs.reduce((sum, l) => sum + (l.outdoorData?.machineVerticalM ?? 0), 0);
  const totalMinutes = logs.reduce((sum, l) => sum + l.durationMinutes, 0);

  const cadenceValues = logs.map((l) => l.outdoorData?.cadence ?? l.cardioData?.cadence).filter((v): v is number => v !== undefined);
  const avgCadence = cadenceValues.length > 0 ? Math.round(cadenceValues.reduce((sum, v) => sum + v, 0) / cadenceValues.length) : undefined;

  const powerValues = logs.map((l) => l.outdoorData?.power ?? l.cardioData?.power).filter((v): v is number => v !== undefined);
  const avgPower = powerValues.length > 0 ? Math.round(powerValues.reduce((sum, v) => sum + v, 0) / powerValues.length) : undefined;

  return { strengthCount, runningKm, hikingKm, cyclingKm, elevation, elevationLoss, machineVertical, totalMinutes, avgCadence, avgPower };
}

// Only sessions that really were missed: in the past, not logged, not
// skipped on purpose (a move, an illness, the coach), not a rest day and
// not a day you were ill.
function countMissed(plannedSessions: PlannedSession[], sessionLogs: SessionLog[], start: string, end: string, isRest: (p: PlannedSession) => boolean, wasIll: (date: string) => boolean) {
  const today = todayISO();
  return plannedSessions.filter((p) => {
    if (p.scheduledDate < start || p.scheduledDate > end || p.scheduledDate >= today) return false;
    if (isRest(p) || wasIll(p.scheduledDate)) return false;
    return deriveSessionStatus(p, sessionLogs).status === 'missed';
  }).length;
}

// Per sport wat er deze maand gedaan is, voor de lijst onder de kalender.
interface SportRow { key: SportKey; count: number; minutes: number; km: number; elevation: number }
function groupBySport(logs: SessionLog[]): SportRow[] {
  const rows = new Map<SportKey, SportRow>();
  for (const l of logs) {
    if (l.type === 'recovery') continue;
    const key = sportKeyOfLog(l);
    const row = rows.get(key) ?? { key, count: 0, minutes: 0, km: 0, elevation: 0 };
    row.count += 1;
    row.minutes += l.durationMinutes;
    row.km += l.outdoorData?.distanceKm ?? l.cardioData?.distanceKm ?? 0;
    row.elevation += l.outdoorData?.elevationGainM ?? l.cardioData?.elevationGainM ?? 0;
    rows.set(key, row);
  }
  const order: SportKey[] = ['run', 'strength', 'walk', 'mountain', 'bike', 'other'];
  return order.flatMap((k) => (rows.has(k) ? [rows.get(k)!] : []));
}

const kmText = (km: number) => formatNumberNL(km, km >= 10 ? 0 : 1);

// De regel en het grote getal van een sportrij.
function sportLine(r: SportRow): { line: string; value: string; unit: string } {
  const times = `${r.count} keer`;
  if (r.key === 'run') return { line: times, value: kmText(r.km), unit: 'km' };
  if (r.key === 'strength') return { line: formatHoursMinutesNL(r.minutes), value: `${r.count}`, unit: r.count === 1 ? 'sessie' : 'sessies' };
  if (r.key === 'walk' || r.key === 'mountain') return { line: `${r.count} ${r.count === 1 ? 'tocht' : 'tochten'}${r.elevation > 0 ? ` · ${formatNumberNL(r.elevation, 0)} m stijgen` : ''}`, value: kmText(r.km), unit: 'km' };
  if (r.key === 'bike') return { line: times, value: kmText(r.km), unit: 'km' };
  return { line: times, value: formatHoursMinutesNL(r.minutes), unit: '' };
}

// 21:15 voor 1275 minuten.
function clock(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

// Het verschil met vorige maand als korte pil; stil als vorige maand leeg was of er niets verschilt.
function deltaPill(diff: number, text: string) {
  if (diff === 0) return undefined;
  return (
    <div className="flex flex-col gap-1">
      <StatusPill tone={diff > 0 ? 'progress' : 'neutral'}>{diff > 0 ? '+' : '−'}{text}</StatusPill>
      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>tegen vorige maand</span>
    </div>
  );
}

// Positive means "more than last month" — good for training-volume stats,
// bad for Gemist (invert). Silent when both months are zero, so a stat that
// simply doesn't apply this program (e.g. no Afdaling yet) doesn't clutter
// the card with a "±0" delta forever.
// Also silent when last month had nothing: "+15,5 km" then only repeats the value.
function formatDelta(current: number, previous: number, opts?: { unit?: string; decimals?: number; invert?: boolean; format?: (n: number) => string }): { text: string; color: string } | undefined {
  if (previous === 0) return undefined;
  const diff = current - previous;
  const decimals = opts?.decimals ?? 0;
  const unit = opts?.unit ?? '';
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const amount = opts?.format ? opts.format(Math.abs(diff)) : `${formatNumberNL(Math.abs(diff), decimals)}${unit}`;
  const text = `${sign}${amount} t.o.v. vorige maand`;
  const goodDirection = opts?.invert ? diff <= 0 : diff >= 0;
  const color = diff === 0 ? 'var(--color-ink-dim)' : goodDirection ? 'var(--color-success-text)' : 'var(--color-danger-text)';
  return { text, color };
}

export function HistoryPage() {
  const { sessionLogs, plannedSessions, templateById, settings, program } = useAppData();
  const isRest = useCallback((p: PlannedSession) => templateById.get(p.templateId)?.type === 'recovery', [templateById]);
  // Days before week 1 (leftovers of an earlier schedule) never count.
  const wasIll = useCallback((date: string) => (program ? date < program.startDate : false) || isIllnessDay(date, settings.illnessEpisodes, todayISO()), [settings.illnessEpisodes, program]);
  const [anchor, setAnchor] = usePageState('anchor', todayISO(), (v) => validMonthAnchor(v, todayISO()));
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

  const missedCount = useMemo(() => countMissed(plannedSessions, sessionLogs, start, end, isRest, wasIll), [plannedSessions, sessionLogs, start, end, isRest, wasIll]);
  const prevMissedCount = useMemo(() => countMissed(plannedSessions, sessionLogs, prevStart, prevEnd, isRest, wasIll), [plannedSessions, sessionLogs, prevStart, prevEnd, isRest, wasIll]);

  const summary = useMemo(() => computeMonthSummary(monthLogs), [monthLogs]);
  const prevSummary = useMemo(() => computeMonthSummary(prevMonthLogs), [prevMonthLogs]);

  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);

  const [logsOpen, setLogsOpen] = usePageState('logsOpen', false);
  const [moreOpen, setMoreOpen] = usePageState('moreOpen', false);

  // "Wat speelde er": the sign by a run with a heart rate that stands out (only worked out while the list is open),
  // and a day of the calendar, opened with a tap.
  const deviations = useDeviations(logsOpen ? monthLogs : NO_LOGS);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const notedDates = useMemo(() => new Set((settings.influences ?? []).filter((e) => !e.logId && isNoted(e)).map((e) => e.date)), [settings.influences]);

  function shiftMonth(delta: number) {
    setAnchor(shiftMonthAnchor(anchor, delta));
  }

  const trainingLogs = monthLogs.filter((l) => l.type !== 'recovery');
  const prevTrainingCount = prevMonthLogs.filter((l) => l.type !== 'recovery').length;
  // "van": wat er die maand gepland stond, alleen als dat er is en niet minder dan wat je deed.
  const plannedCount = plannedSessions.filter((p) => p.scheduledDate >= start && p.scheduledDate <= end && p.status !== 'skipped' && !isRest(p) && !wasIll(p.scheduledDate)).length;
  const sportRows = useMemo(() => groupBySport(monthLogs), [monthLogs]);

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10">
      {/* Vorige en volgende maand staan zoals de weekpijltjes op Week: onder het
          tandwiel, rechts op dezelfde lijn, 44 px, zonder cirkel. */}
      <SkyBand>
        {/* De pijltjes staan onder het tandwiel, rechts op dezelfde lijn. */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <Eyebrow>{formatMonthNL(anchor)}</Eyebrow>
            <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>Logboek</h1>
          </div>
          <div className="-mr-2.5 flex shrink-0 items-center">
            <button onClick={() => shiftMonth(-1)} className="flex h-11 w-11 items-center justify-center" aria-label="Vorige maand" style={{ color: 'var(--color-on-light)' }}><Icon name="terug" size={24} /></button>
            <button onClick={() => shiftMonth(1)} className="flex h-11 w-11 items-center justify-center" aria-label="Volgende maand" style={{ color: 'var(--color-on-light)' }}><Icon name="verder" size={24} /></button>
          </div>
        </div>
        <LightCard className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Stat label="Getraind" value={clock(summary.totalMinutes)} unit="uur" size="l" />
            {prevSummary.totalMinutes > 0 && deltaPill(Math.round(summary.totalMinutes) - Math.round(prevSummary.totalMinutes), formatHoursMinutesNL(Math.abs(Math.round(summary.totalMinutes) - Math.round(prevSummary.totalMinutes))))}
          </div>
          <div className="flex flex-col gap-2 border-l pl-4" style={{ borderColor: 'var(--color-card-border)' }}>
            <Stat label="Trainingen" value={trainingLogs.length} unit={plannedCount >= trainingLogs.length && plannedCount > 0 ? `van ${plannedCount}` : undefined} size="l" />
            {prevTrainingCount > 0 && deltaPill(trainingLogs.length - prevTrainingCount, `${Math.abs(trainingLogs.length - prevTrainingCount)}`)}
          </div>
        </LightCard>
      </SkyBand>

      <Card>
        <MonthCalendar anchor={anchor} plannedSessions={plannedSessions} sessionLogs={sessionLogs} isRest={isRest} onPickDay={setDayOpen} notedDates={notedDates} />
      </Card>

      {sportRows.length > 0 && (
        <SkyPanel className="flex flex-col" label="Per sport">
          {sportRows.map((r, i) => {
            const look = SPORT_LOOK[r.key];
            const t = sportLine(r);
            return (
              <div key={r.key} className={`flex min-h-[68px] items-center gap-3 py-2 ${i === 0 ? '' : 'border-t'}`} style={{ borderColor: 'var(--color-card-border)' }}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${look.color} 18%, transparent)`, color: look.color }}>
                  <Pictogram name={look.icon} size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium" style={{ color: 'var(--color-ink)' }}>{look.label}</p>
                  <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{t.line}</p>
                </div>
                <Stat value={t.value} unit={t.unit || undefined} className="shrink-0 items-end" />
              </div>
            );
          })}
        </SkyPanel>
      )}

      <WeekReviewList />

      <Card className="flex flex-col py-1">
        <DisclosureRow title="Alle trainingen van deze maand" value={monthLogs.length} open={logsOpen} onToggle={() => setLogsOpen(!logsOpen)}>
          <div className="mx-stagger flex flex-col gap-2 pb-2">
            {monthLogs.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Nog geen trainingen deze maand.</p>
            )}
            {monthLogs.map((log) => {
              const template = templateById.get(log.templateId);
              const modalityKey = log.outdoorData?.modality ?? log.cardioData?.modality;
              const modalityLabel = modalityKey ? getModality(log.templateId, modalityKey)?.label : undefined;
              const environment = log.outdoorData?.environment ?? log.cardioData?.environment;
              const garminType = log.outdoorData?.garminSuggestedType ?? log.cardioData?.garminSuggestedType;
              const look = SPORT_LOOK[sportKeyOfLog(log)];
              return (
                <button key={log.id} onClick={() => setSelectedLog(log)} className="min-h-[52px] text-left">
                  <div className="flex items-center gap-3 rounded-xl border px-3 py-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: look.color }} aria-hidden />
                    <span className="w-[56px] shrink-0 whitespace-nowrap text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{formatDateNL(log.completedDate)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 break-words text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                        <span className="min-w-0 break-words">{template?.name ?? log.templateId}</span>
                        {(() => {
                          const sign = signState(deviations.get(log.id), entryForLog(settings.influences, log.id), settings.influenceSign);
                          return sign ? <HeartSign state={sign} /> : null;
                        })()}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                        {logLineParts({
                          kind: logKindLabel(log),
                          minutes: log.durationMinutes,
                          modalityLabel,
                          environment,
                          garminType,
                          feel: log.subjectiveFeel,
                          elevationGainM: log.outdoorData?.elevationGainM ?? log.cardioData?.elevationGainM,
                          elevationEstimated: log.outdoorData?.elevationGainM ? log.outdoorData.estimatedElevation : log.cardioData?.estimatedElevation,
                          distanceKm: log.outdoorData?.distanceKm ?? log.cardioData?.distanceKm,
                          steps: log.outdoorData?.steps,
                        }).join(' · ')}
                      </p>
                    </div>
                    <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={16} /></span>
                  </div>
                </button>
              );
            })}
          </div>
        </DisclosureRow>
      </Card>

      <Card className="flex flex-col py-1">
        <DisclosureRow title="Meer cijfers" open={moreOpen} onToggle={() => setMoreOpen(!moreOpen)}>
          <div className="grid grid-cols-2 gap-4 pb-3 pt-1">
            <MiniStat label="Hoogtemeters" value={`${formatNumberNL(summary.elevation, 0)} m D+`} delta={formatDelta(Math.round(summary.elevation), Math.round(prevSummary.elevation), { unit: ' m D+' })} />
            <MiniStat label="Gemist" value={`${missedCount}`} delta={formatDelta(missedCount, prevMissedCount, { invert: true })} />
            {summary.elevationLoss > 0 && <MiniStat label="Afdaling" value={`${formatNumberNL(summary.elevationLoss, 0)} m D−`} />}
            {summary.machineVertical > 0 && <MiniStat label="Hoogtemeters op toestel" value={`${Math.round(summary.machineVertical)} m`} />}
            {summary.avgCadence !== undefined && <MiniStat label="Gem. cadans" value={`${summary.avgCadence}`} />}
            {summary.avgPower !== undefined && <MiniStat label="Gem. vermogen" value={`${summary.avgPower} W`} />}
          </div>
        </DisclosureRow>
      </Card>

      {dayOpen && (
        <InfluenceSheet
          eyebrow="Logboek"
          title={`Wat speelde er op ${formatShortDayNL(dayOpen)}?`}
          target={{ date: dayOpen }}
          onClose={() => setDayOpen(null)}
        />
      )}

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

function MiniStat({ label, value, delta }: { label: string; value: string; delta?: { text: string; color: string } }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</p>
      <p className="mt-0.5 break-words font-sans text-xl font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>{value}</p>
      {delta && <p className="mt-0.5 text-xs leading-tight" style={{ color: delta.color }}>{delta.text}</p>}
    </div>
  );
}
