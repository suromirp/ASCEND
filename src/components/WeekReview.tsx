import { resolveIntensityCounting } from '../engine/intensitySettings';
import { useState } from 'react';
import { plannedByIdOf } from '../engine/logDay';
import { useAppData } from '../state/AppDataContext';
import { buildWeekReview, type WeekReview } from '../engine/weekReview';
import { effortLine } from '../engine/weekEffort';
import { weekReviewCardShown } from '../engine/overviewSettings';
import { weekHighlights, weekSummaryLine } from '../engine/weekHighlights';
import { looseLogsOfWeek, weekLogsOf } from '../engine/weekLogs';
import { intentionForWeek } from '../engine/weeklyQuestion';
import { addDays, formatDateNL, formatHoursMinutesNL, formatShortDayNL, todayISO } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { SettingsLinkRow } from './settings/SettingsLink';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { IconDisc } from './SportDisc';
import { Card, Eyebrow, SheetGrip } from './ui';
import { TextButton } from './TextButton';
import { weeklyCheckLine } from '../engine/bodyCheck';
import { Icon } from './icons';
import { SheetRow, SheetRows } from './SheetRows';
import { hoursMinutes } from '../utils/hoursMinutes';
import { MountainMuscleNotice } from './MountainMuscleNotice';
import { WeekStrip } from './vandaag/WeekStrip';
import { LogDetailSheet } from './LogDetailSheet';
import type { SessionLog } from '../models/training';

// De weekterugblik in drie lagen (docs/beslissingen/2026-11-02-gegevens-herinrichting.md): de week als zeven
// dagen, hoogstens drie regels die ertoe doen, en de rest als rijen die een eigen weergave openen.

function useWeekReviewFor(weekStart: string): WeekReview | null {
  const { plannedSessions, sessionLogs, templates, program, planChangeLog, settings } = useAppData();
  return buildWeekReview({ weekStart, plannedById: plannedByIdOf(plannedSessions), plannedSessions, logs: sessionLogs, templates, program, planChangeLog, asOf: todayISO(), illnessEpisodes: settings.illnessEpisodes, weeklyChecks: settings.weeklyHealthChecks, heartRate: settings.heartRate, intensityCounting: resolveIntensityCounting(settings) });
}

// On Today, Sunday and Monday: the short version, with the coach's first
// line and the full review one tap away. Op zondag wacht hij tot wat vandaag
// gepland staat gedaan is: een week "tot nu" met nog werk voor vandaag is geen terugblik.
export function WeekReviewCard({ weekStart }: { weekStart: string }) {
  const review = useWeekReviewFor(weekStart);
  const { settings } = useAppData();
  const [open, setOpen] = useState(false);
  if (!review || review.planned === 0) return null;
  if (!weekReviewCardShown(review, settings.overviews)) return null;
  const first = weekHighlights(review)[0]?.text ?? review.advice[0];
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>Weekterugblik</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
        {review.running ? `${review.done} gedaan` : `${review.done} van ${review.planned} trainingen`} · {formatHoursMinutesNL(review.minutes)}
      </p>
      {first && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{first}</p>}
      <div className="-mb-2"><TextButton onClick={() => setOpen(true)} icon="verder">{review.running ? 'Bekijk je week tot nu' : 'Bekijk je week'}</TextButton></div>
      {open && <WeekReviewSheet review={review} onClose={() => setOpen(false)} />}
    </Card>
  );
}

// In het Logboek: de kop van een week in de lijst met trainingen. Een week zonder geplande trainingen
// heeft geen terugblik, dus geen knop.
export function WeekHeaderRow({ weekStart }: { weekStart: string }) {
  const review = useWeekReviewFor(weekStart);
  const [open, setOpen] = useState(false);
  const canReview = !!review && review.planned > 0 && weekStart <= todayISO();
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3">
      <Eyebrow>Week van {formatDateNL(weekStart)}</Eyebrow>
      {canReview && <TextButton onClick={() => setOpen(true)} icon="verder" data-sheet-from>Bekijk je week</TextButton>}
      {open && review && <WeekReviewSheet review={review} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// 141 minuten wordt "2:21 uur", 45 minuten "45 min".
function clock(minutes: number): { value: string; unit: string } {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return { value: String(m), unit: 'min' };
  return { value: hoursMinutes(m), unit: 'uur' };
}

// "Week 1 van 26, opbouw" + "Wennen" wordt "opbouw, week 1 · wennen".
function nextLabel(next: NonNullable<WeekReview['next']>): string {
  const m = next.title.match(/^Week (\d+) van \d+, (.+)$/);
  const base = m ? `${m[2]}, week ${m[1]}` : next.title;
  return `${base}${next.note ? ` · ${next.note.toLowerCase()}` : ''}`;
}

type View = 'main' | 'trainings' | 'changes' | 'answer';

export function WeekReviewSheet({ review, onClose }: { review: WeekReview; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const { settings, plannedSessions, sessionLogs, templates, templateById, program } = useAppData();
  const [view, setView] = useState<View>('main');
  const [picked, setPicked] = useState<SessionLog | null>(null);
  const today = todayISO();
  const intention = intentionForWeek(settings.weeklyIntentions, review.weekStart);
  const nextTime = review.next ? clock(review.next.minutes) : null;
  const highlights = weekHighlights(review);
  const effort = effortLine(review.effort);
  const weekEnd = addDays(review.weekStart, 6);
  const weekSessions = plannedSessions.filter((s) => s.scheduledDate >= review.weekStart && s.scheduledDate <= weekEnd);
  const weekLogs = weekLogsOf(sessionLogs, new Map(templates.map((t) => [t.id, t])), review.weekStart, plannedByIdOf(plannedSessions))
    .sort((a, b) => a.completedDate.localeCompare(b.completedDate));
  const title = review.running ? 'Je week tot nu' : 'Je week';
  const back = view === 'main' ? undefined : () => setView('main');
  const header = view === 'main'
    ? <SheetHeader eyebrow={`Week van ${formatDateNL(review.weekStart)}`} title={title} facts={review.title.replace(', ', ' · ')} onClose={requestClose} />
    : <SheetHeader eyebrow={`Week van ${formatDateNL(review.weekStart)}`} title={view === 'trainings' ? 'Je trainingen' : view === 'changes' ? 'Wat ASCEND aanpaste' : 'Je antwoord deze week'} onBack={back} onClose={requestClose} />;
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2">{header}</div>

            {view === 'main' && (
              <>
                <div className="mt-4 flex flex-col gap-3">
                  <WeekStrip plain loose={looseLogsOfWeek(sessionLogs, plannedSessions, review.weekStart)} weekStart={review.weekStart} sessions={weekSessions} logs={sessionLogs} templateById={templateById} program={program} today={today} />
                  <p className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{weekSummaryLine(review)}</p>
                  {effort && <p className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{effort}</p>}
                </div>

                {highlights.length > 0 && (
                  <Section title="Wat telt">
                    <ul className="flex flex-col gap-3">
                      {highlights.map((h) => (
                        <li key={h.text} className="flex items-start gap-3">
                          <span className="mt-0.5 shrink-0" style={{ color: h.tone === 'warning' ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}><Icon name={h.icon} size={18} /></span>
                          <p className="text-sm leading-relaxed" style={{ color: h.tone === 'warning' ? 'var(--color-warning)' : 'var(--color-ink)' }}>{h.text}</p>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                <MountainMuscleNotice weekStart={review.weekStart} />

                {review.weeklyCheck && !review.weeklyCheck.laterOn && (
                  <p className="mt-5 text-sm" style={{ color: 'var(--color-ink)' }}>{weeklyCheckLine(review.weeklyCheck)}</p>
                )}

                {review.next && nextTime && (
                  <div className="mt-5 flex items-center gap-3 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
                    <IconDisc icon="week" size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Volgende week: {nextLabel(review.next)}</p>
                      <p className="mt-0.5 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                        {nextTime.value} {nextTime.unit} gepland{review.next.key ? ` · ${review.next.key.charAt(0).toLowerCase()}${review.next.key.slice(1).replace(': ', ' ')}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {(weekLogs.length > 0 || review.changes.length > 0 || intention?.answer) && (
                  <div className="mt-5">
                    <SheetRows>
                      {weekLogs.length > 0 && <SheetRow title="Je trainingen" sub={`${weekLogs.length} ${weekLogs.length === 1 ? 'training' : 'trainingen'}`} onClick={() => setView('trainings')} sheetFrom />}
                      {review.changes.length > 0 && <SheetRow title="Wat ASCEND aanpaste" sub={`${review.changes.length}`} onClick={() => setView('changes')} sheetFrom />}
                      {intention?.answer && <SheetRow title="Je antwoord deze week" onClick={() => setView('answer')} sheetFrom />}
                    </SheetRows>
                  </div>
                )}

                <SettingsLinkRow page="vandaag" row="weekterugblik" />
              </>
            )}

            {view === 'trainings' && (
              <div className="mt-4">
                <SheetRows label="Je trainingen">
                  {weekLogs.map((l) => (
                    <SheetRow
                      key={l.id}
                      title={templateById.get(l.templateId)?.name ?? l.templateId}
                      sub={`${formatShortDayNL(l.completedDate)} · ${formatHoursMinutesNL(l.durationMinutes)}${l.rpe !== undefined ? ` · zwaarte ${l.rpe} van 10` : ''}`}
                      onClick={() => setPicked(l)} sheetFrom
                    />
                  ))}
                </SheetRows>
              </div>
            )}

            {view === 'changes' && (
              <ul className="mt-4 flex flex-col gap-2">
                {review.changes.map((c) => <li key={c} className="text-sm" style={{ color: 'var(--color-ink)' }}>{c}</li>)}
              </ul>
            )}

            {view === 'answer' && intention?.answer && (
              <div className="mt-4">
                {intention.question && <p className="mb-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{intention.question}</p>}
                <blockquote className="border-l-2 pl-3 text-sm italic leading-relaxed" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}>{intention.answer}</blockquote>
              </div>
            )}
          </Card>
        </div>
      </div>
      {picked && <LogDetailSheet log={picked} templateName={templateById.get(picked.templateId)?.name ?? picked.templateId} onClose={() => setPicked(null)} />}
    </Portal>
  );
}
