import { WeekHeaderRow } from '../components/WeekReview';
import { formatNumberNL } from '../utils/number';
import { logKindLabel } from '../engine/sports';
import { logsInRange, plannedByIdOf } from '../engine/logDay';
import { logLineParts } from '../engine/logLine';
import { useCallback, useMemo, useState } from 'react';
import type { PlannedSession, SessionLog } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { formatDateNL, formatHoursMinutesNL, formatShortDayNL, formatMonthNL, monthBounds, shiftMonthAnchor, todayISO } from '../utils/dates';
import { emptyMonthTitle, monthCompare } from '../engine/logbookMonth';
import { logbookWeeks, weighingsInRange, weightCardOn, weightSourceLabel } from '../engine/weightCard';
import { weightsInUse } from '../engine/bodyWeight';
import { DaySheet } from '../components/logbook/DaySheet';
import { getModality } from '../data/modalities';
import { LogDetailSheet } from '../components/LogDetailSheet';
import { Card, Eyebrow, LightCard, Num, Stat, StatusPill } from '../components/ui';
import { MonthCalendar } from '../components/MonthCalendar';
import { SPORT_LOOK, lookOfLog, sportKeyOfLog, type SportKey } from '../components/logbook/sportLook';
import { usePageState } from '../components/usePageState';
import { validMonthAnchor } from '../utils/pageMemory';
import { Icon } from '../components/icons';
import { Pictogram } from '../components/pictograms';
import { SkyBand } from '../components/SkyBand';
import { HeartSign } from '../components/influence/HeartSign';
import { InfluenceSheet } from '../components/influence/InfluenceSheet';
import { useDeviations } from '../components/influence/useInfluence';
import { entryForLog, isNoted, signState } from '../engine/influence';
import { hoursMinutes } from '../utils/hoursMinutes';



function computeMonthSummary(logs: SessionLog[]) {
  const elevation = logs.reduce((sum, l) => sum + (l.outdoorData?.elevationGainM ?? l.cardioData?.elevationGainM ?? 0), 0);
  const elevationLoss = logs.reduce((sum, l) => sum + (l.outdoorData?.elevationLossM ?? 0), 0);
  const totalMinutes = logs.reduce((sum, l) => sum + l.durationMinutes, 0);
  return { elevation, elevationLoss, totalMinutes };
}

// Per sport wat er deze maand gedaan is, voor de lijst onder de kalender.
interface SportRow { key: SportKey; count: number; minutes: number; km: number; elevation: number; machine: number }
function groupBySport(logs: SessionLog[]): SportRow[] {
  const rows = new Map<SportKey, SportRow>();
  for (const l of logs) {
    if (l.type === 'recovery') continue;
    const key = sportKeyOfLog(l);
    const row = rows.get(key) ?? { key, count: 0, minutes: 0, km: 0, elevation: 0, machine: 0 };
    row.count += 1;
    row.minutes += l.durationMinutes;
    row.km += l.outdoorData?.distanceKm ?? l.cardioData?.distanceKm ?? 0;
    row.elevation += l.outdoorData?.elevationGainM ?? l.cardioData?.elevationGainM ?? 0;
    row.machine += l.outdoorData?.machineVerticalM ?? 0;
    rows.set(key, row);
  }
  const order: SportKey[] = ['run', 'strength', 'walk', 'mountain', 'bike', 'other'];
  return order.flatMap((k) => (rows.has(k) ? [rows.get(k)!] : []));
}

const kmText = (km: number) => formatNumberNL(km, km >= 10 ? 0 : 1);

// De regel en het grote getal van een sportrij. Hoogtemeters staan in de regel van lopen, wandelen en bergtocht.
function sportLine(r: SportRow): { line: string; value: string; unit: string } {
  const up = r.elevation > 0 ? ` · ${formatNumberNL(r.elevation, 0)} m omhoog` : '';
  const machine = r.machine > 0 ? ` · ${Math.round(r.machine)} m op het toestel` : '';
  if (r.key === 'run') return { line: `${r.count} keer${up}${machine}`, value: kmText(r.km), unit: 'km' };
  if (r.key === 'strength') return { line: formatHoursMinutesNL(r.minutes), value: `${r.count}`, unit: r.count === 1 ? 'sessie' : 'sessies' };
  if (r.key === 'walk' || r.key === 'mountain') return { line: `${r.count} ${r.count === 1 ? 'tocht' : 'tochten'}${up}${machine}`, value: kmText(r.km), unit: 'km' };
  if (r.key === 'bike') return { line: `${r.count} keer${up}`, value: kmText(r.km), unit: 'km' };
  return { line: `${r.count} keer`, value: formatHoursMinutesNL(r.minutes), unit: '' };
}

export function HistoryPage() {
  const { sessionLogs, plannedSessions, templateById, settings } = useAppData();
  const isRest = useCallback((p: PlannedSession) => templateById.get(p.templateId)?.type === 'recovery', [templateById]);
  const today = todayISO();
  const [anchor, setAnchor] = usePageState('anchor', today, (v) => validMonthAnchor(v, today));
  const { start, end } = monthBounds(anchor);

  const monthLogs = useMemo(
    () => sessionLogs.filter((l) => l.completedDate >= start && l.completedDate <= end).sort((a, b) => (a.completedDate < b.completedDate ? 1 : -1)),
    [sessionLogs, start, end],
  );

  // De totalen en de tellingen per sport gaan op de dag van een training zoals de kalender hem toont
  // (engine/logDay.ts); de lijst hieronder blijft op de datum van het bestand
  // (docs/beslissingen/2026-10-29-dag-van-een-training.md).
  const plannedById = useMemo(() => plannedByIdOf(plannedSessions), [plannedSessions]);
  const totalsLogs = useMemo(() => logsInRange(sessionLogs, plannedById, start, end), [sessionLogs, plannedById, start, end]);
  const summary = useMemo(() => computeMonthSummary(totalsLogs), [totalsLogs]);
  // Wat je deed, tegen dezelfde dagen van vorige maand (engine/logbookMonth.ts). Geen noemer en geen "Gemist".
  const compare = useMemo(() => monthCompare({ anchor, today, logs: sessionLogs, plannedById }), [anchor, today, sessionLogs, plannedById]);
  const sportRows = useMemo(() => groupBySport(totalsLogs), [totalsLogs]);
  // Een weging is een eigen regel tussen de trainingen (engine/weightCard.ts), met de schakelaar
  // "Gewicht op Je stand".
  const weighings = useMemo(() => {
    const inUse = weightsInUse(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect);
    return weightCardOn(settings.weightCard, inUse) ? weighingsInRange(inUse, start, end) : [];
  }, [settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect, settings.weightCard, start, end]);
  const weeks = useMemo(() => logbookWeeks(monthLogs, weighings), [monthLogs, weighings]);

  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);
  // "Wat speelde er": het teken bij een run met een opvallende hartslag, en een dag van de kalender.
  const deviations = useDeviations(monthLogs);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [influenceDay, setInfluenceDay] = useState<string | null>(null);
  const notedDates = useMemo(() => new Set((settings.influences ?? []).filter((e) => !e.logId && isNoted(e)).map((e) => e.date)), [settings.influences]);
  const dayLogs = useMemo(() => (dayOpen ? logsInRange(sessionLogs, plannedById, dayOpen, dayOpen).filter((l) => l.type !== 'recovery') : []), [dayOpen, sessionLogs, plannedById]);

  // Voor je eerste training: de pijl terug is gedimd en de maand zegt dat je er nog niet begon.
  const firstDate = useMemo(() => sessionLogs.reduce<string | undefined>((min, l) => (min === undefined || l.completedDate < min ? l.completedDate : min), undefined), [sessionLogs]);
  const beforeFirst = firstDate !== undefined && end < firstDate.slice(0, 7) + '-01';
  const atFirstMonth = firstDate === undefined || monthBounds(shiftMonthAnchor(anchor, -1)).end < firstDate.slice(0, 7) + '-01';

  function shiftMonth(delta: number) {
    setAnchor(shiftMonthAnchor(anchor, delta));
  }

  const trainingCount = totalsLogs.filter((l) => l.type !== 'recovery').length;
  const monthName = formatMonthNL(anchor).split(' ')[0];
  // Vandaag nog gepland en niet gedaan, voor de zin op de eerste dagen van een maand.
  const todayPlanned = plannedSessions.find((p) => p.scheduledDate === today && p.status !== 'skipped' && !isRest(p) && !sessionLogs.some((l) => l.plannedSessionId === p.id));
  const todayName = todayPlanned ? templateById.get(todayPlanned.templateId)?.name : undefined;
  const vs = compare.vs;
  const vsText = vs ? (vs.whole ? `dan in ${formatMonthNL(vs.from).split(' ')[0]}` : `dan ${Number(vs.from.slice(8, 10))} tot ${formatDateNL(vs.to)}`) : '';
  const hm = (m: number) => formatHoursMinutesNL(Math.abs(m));
  const totalUp = Math.round(summary.elevation);
  const totalDown = Math.round(summary.elevationLoss);

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
            <button onClick={() => shiftMonth(-1)} className="flex h-11 w-11 items-center justify-center" aria-label="Vorige maand" disabled={atFirstMonth} style={{ color: 'var(--color-on-light)', opacity: atFirstMonth ? 0.4 : 1 }}><Icon name="terug" size={24} /></button>
            <button onClick={() => shiftMonth(1)} className="flex h-11 w-11 items-center justify-center" aria-label="Volgende maand" style={{ color: 'var(--color-on-light)' }}><Icon name="verder" size={24} /></button>
          </div>
        </div>
        {compare.nothingYet ? (
          <LightCard className="flex flex-col gap-1">
            <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>Nog niets in {monthName}.</p>
            {todayName && <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Vandaag staat je {todayName.charAt(0).toLowerCase()}{todayName.slice(1)}.</p>}
          </LightCard>
        ) : trainingCount === 0 ? (
          <LightCard>
            <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{emptyMonthTitle({ beforeFirst, weighings: weighings.length })}</p>
          </LightCard>
        ) : (
          <LightCard className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Stat label="Getraind" value={hoursMinutes(summary.totalMinutes)} unit="uur" size="l" />
              {vs && vs.diffMinutes !== 0 && (
                <div className="flex flex-col gap-1">
                  <StatusPill tone={vs.diffMinutes > 0 ? 'progress' : 'neutral'}>{hm(vs.diffMinutes)} {vs.diffMinutes > 0 ? 'meer' : 'minder'}</StatusPill>
                  <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{vsText}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 border-l pl-4" style={{ borderColor: 'var(--color-card-border)' }}>
              <Stat label="Trainingen" value={trainingCount} size="l" />
              {vs && vs.diffCount !== 0 && (
                <div className="flex flex-col gap-1">
                  <StatusPill tone={vs.diffCount > 0 ? 'progress' : 'neutral'}>{Math.abs(vs.diffCount)} {vs.diffCount > 0 ? 'meer' : 'minder'}</StatusPill>
                  <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{vsText}</span>
                </div>
              )}
            </div>
          </LightCard>
        )}
      </SkyBand>

      <Card>
        <MonthCalendar anchor={anchor} plannedSessions={plannedSessions} sessionLogs={sessionLogs} isRest={isRest} onPickDay={setDayOpen} notedDates={notedDates} />
      </Card>

      {sportRows.length > 0 && (
        <Card className="flex flex-col" aria-label="Per sport">
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
          {totalUp > 0 && (
            <p className="border-t pt-3 text-sm" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>
              Samen <Num>{formatNumberNL(totalUp, 0)}</Num> meter omhoog{totalDown > 0 ? <> en <Num>{formatNumberNL(totalDown, 0)}</Num> meter omlaag</> : ''}.
            </p>
          )}
        </Card>
      )}

      {/* De trainingen van de maand, per week, zonder uitklap: de kop van elke week opent de weekterugblik. */}
      {weeks.map((w) => (
        <section key={w.weekStart} className="flex flex-col gap-2" aria-label={`Week van ${formatDateNL(w.weekStart)}`}>
          <WeekHeaderRow weekStart={w.weekStart} />
          <div className="flex flex-col gap-2">
            {w.items.map((item) => {
              if (item.kind === 'weight') {
                const [, day, month] = formatShortDayNL(item.entry.date).split(' ');
                return (
                  <div key={`weight-${item.entry.date}-${item.entry.source}`} className="flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-card-border)' }}>
                    <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: 'var(--color-card-border)' }} aria-hidden />
                    <span className="flex w-10 shrink-0 flex-col items-center leading-tight tabular-nums" style={{ color: 'var(--color-ink-dim)' }} aria-label={formatDateNL(item.entry.date)}>
                      <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{day}</span>
                      <span className="text-xs">{month}</span>
                    </span>
                    <p className="min-w-0 flex-1 break-words text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                      <span style={{ color: 'var(--color-ink)' }}>Gewicht</span> · <Num>{formatNumberNL(item.entry.kg, 1)}</Num> kg · {weightSourceLabel(item.entry.source)}
                    </p>
                  </div>
                );
              }
              const log = item.log;
              const template = templateById.get(log.templateId);
              const modalityKey = log.outdoorData?.modality ?? log.cardioData?.modality;
              const modalityLabel = modalityKey ? getModality(log.templateId, modalityKey)?.label : undefined;
              const environment = log.outdoorData?.environment ?? log.cardioData?.environment;
              const garminType = log.outdoorData?.garminSuggestedType ?? log.cardioData?.garminSuggestedType;
              const look = lookOfLog(log);
              return (
                <button key={log.id} onClick={() => setSelectedLog(log)} data-sheet-from className="min-h-[52px] text-left">
                  <div className="flex items-center gap-3 rounded-xl border px-3 py-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: look.color }} aria-hidden />
                    {(() => {
                      // Dag boven, korte maand eronder: past ook bij grotere letters ("3 november" liep over de naam).
                      const [, day, month] = formatShortDayNL(log.completedDate).split(' ');
                      return (
                        <span className="flex w-10 shrink-0 flex-col items-center leading-tight tabular-nums" style={{ color: 'var(--color-ink-dim)' }} aria-label={formatDateNL(log.completedDate)}>
                          <span className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{day}</span>
                          <span className="text-xs">{month}</span>
                        </span>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 break-words text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                        <span className="min-w-0 break-words">{template?.name ?? log.templateId}</span>
                        {(() => {
                          const sign = signState(deviations.get(log.id), entryForLog(settings.influences, log.id), settings.influenceSign);
                          return sign ? <HeartSign state={sign} /> : null;
                        })()}
                      </p>
                      <p className="break-words text-xs" style={{ color: 'var(--color-ink-dim)' }}>
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
        </section>
      ))}

      {dayOpen && !influenceDay && (
        <DaySheet
          date={dayOpen}
          logs={dayLogs}
          nameOf={(l) => templateById.get(l.templateId)?.name ?? l.templateId}
          onPickLog={(l) => setSelectedLog(l)}
          onInfluence={() => setInfluenceDay(dayOpen)}
          onClose={() => setDayOpen(null)}
        />
      )}

      {influenceDay && (
        <InfluenceSheet
          eyebrow="Logboek"
          title={`Wat speelde er op ${formatShortDayNL(influenceDay)}?`}
          target={{ date: influenceDay }}
          onClose={() => { setInfluenceDay(null); setDayOpen(null); }}
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
