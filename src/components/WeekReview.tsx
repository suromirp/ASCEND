import { resolveIntensityCounting } from '../engine/intensitySettings';
import { useKeyFocus } from './useKeyFocus';
import { useState } from 'react';
import { plannedByIdOf } from '../engine/logDay';
import { useAppData } from '../state/AppDataContext';
import { buildWeekReview, type WeekReview } from '../engine/weekReview';
import { weekReviewCardShown } from '../engine/overviewSettings';
import { weekHighlights } from '../engine/weekHighlights';
import { attentionLines, nextWeekLine, sportLines, weekCountLine } from '../engine/weekGlance';
import { looseLogsOfWeek, weekLogsOf } from '../engine/weekLogs';
import { intentionForWeek } from '../engine/weeklyQuestion';
import { addDays, formatDateNL, formatHoursMinutesNL, formatShortDayNL, todayISO } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { SettingsLinkRow } from './settings/SettingsLink';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, Eyebrow, InfoButton, PrimaryButton, SecondaryButton, SheetGrip } from './ui';
import { TextButton } from './TextButton';
import { SheetRow, SheetRows } from './SheetRows';
import { useMountainMuscleProposal } from './useMountainMuscleProposal';
import { reviewShowsMuscleProposal } from '../engine/mountainMuscles';
import { useBackToClose } from '../utils/useBackToClose';
import { WeekStrip } from './vandaag/WeekStrip';
import { LogDetailSheet } from './LogDetailSheet';
import type { SessionLog } from '../models/training';

// De weekterugblik (docs/visie/Ontwerp Je week tot nu.md, besluit docs/beslissingen/2026-11-12-je-week-tot-nu.md):
// drie blokken (de week, waar je op let, volgende week) en daaronder één lijst. Een voorstel is de eerste rij en
// opent een eigen weergave in hetzelfde blad, met Akkoord als enige mint knop. Elk feit staat één keer.

function useWeekReviewFor(weekStart: string): WeekReview | null {
  const { plannedSessions, sessionLogs, templates, program, planChangeLog, settings } = useAppData();
  const keyFocus = useKeyFocus();
  return buildWeekReview({ weekStart, plannedById: plannedByIdOf(plannedSessions), plannedSessions, logs: sessionLogs, templates, program, planChangeLog, asOf: todayISO(), illnessEpisodes: settings.illnessEpisodes, weeklyChecks: settings.weeklyHealthChecks, heartRate: settings.heartRate, intensityCounting: resolveIntensityCounting(settings), keyFocus });
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

type View = 'main' | 'trainings' | 'answer' | 'proposal';

// Een regel in de vorm van het blok Stand en morgen (StandSummaryCard): links het vaste woord gedempt, rechts de
// waarde in gewone inkt, en let op alleen als amber stip voor het vaste woord. Geen knop: alleen lezen.
function GlanceLine({ label, value, sub, warn = false }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <li className="flex min-h-[44px] items-start gap-3 border-t px-4 py-2.5 first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }} aria-label={`${label}: ${value}${warn ? ', let op' : ''}`}>
      <span className="flex min-w-[92px] shrink-0 items-center gap-2 whitespace-nowrap text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        {warn && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-warning)' }} />}
        {label}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug tabular-nums" style={{ color: 'var(--color-ink)' }}>{value}</span>
        {sub && <span className="mt-0.5 block text-xs leading-snug tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{sub}</span>}
      </span>
    </li>
  );
}

function GlanceList({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ul aria-label={label} className="mt-5 overflow-hidden rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}>
      {children}
    </ul>
  );
}

const VIEW_TITLE: Record<Exclude<View, 'main'>, string> = { trainings: 'Je trainingen', answer: 'Je antwoord deze week', proposal: 'Voorstel' };

export function WeekReviewSheet({ review, onClose }: { review: WeekReview; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const { settings, plannedSessions, sessionLogs, templates, templateById, program } = useAppData();
  const [view, setView] = useState<View>('main');
  // De terugknop van het toestel gaat eerst terug naar de hoofdweergave, daarna pas dicht.
  useBackToClose(view !== 'main', () => setView('main'));
  const [picked, setPicked] = useState<SessionLog | null>(null);
  const [proposalInfo, setProposalInfo] = useState(false);
  const today = todayISO();
  // Dezelfde week en dezelfde functie als Forge (engine/mountainMuscles.ts#muscleProposalWeek).
  const muscle = useMountainMuscleProposal({ active: reviewShowsMuscleProposal(review.weekStart, today) });
  const intention = intentionForWeek(settings.weeklyIntentions, review.weekStart);
  const attention = attentionLines(review);
  const next = review.next ? nextWeekLine(review.next) : null;
  const weekEnd = addDays(review.weekStart, 6);
  const weekSessions = plannedSessions.filter((s) => s.scheduledDate >= review.weekStart && s.scheduledDate <= weekEnd);
  const weekLogs = weekLogsOf(sessionLogs, new Map(templates.map((t) => [t.id, t])), review.weekStart, plannedByIdOf(plannedSessions))
    .sort((a, b) => a.completedDate.localeCompare(b.completedDate));
  const sports = sportLines(review);
  const title = review.running ? 'Je week tot nu' : 'Je week';
  const header = view === 'main'
    ? <SheetHeader eyebrow={`Week van ${formatDateNL(review.weekStart)}`} title={title} facts={review.label} onClose={requestClose} />
    : <SheetHeader
        eyebrow={`Week van ${formatDateNL(review.weekStart)}`}
        title={view === 'proposal' && muscle.state === 'done' ? 'Toegevoegd' : VIEW_TITLE[view]}
        info={view === 'proposal' && muscle.text ? <InfoButton onClick={() => setProposalInfo((v) => !v)} label="Meer over dit voorstel" /> : undefined}
        onBack={() => setView('main')}
        onClose={requestClose}
      />;
  const hasRows = !!muscle.proposal || weekLogs.length > 0 || !!intention?.answer;

  function decline() {
    muscle.decline();
    setView('main');
  }

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
                  <p className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{weekCountLine(review)}</p>
                </div>

                {attention.length > 0 && (
                  <GlanceList label="Let op">
                    {attention.map((a) => <GlanceLine key={a.key} label={a.label} value={a.value} warn={a.warn} />)}
                  </GlanceList>
                )}

                {next && (
                  <GlanceList label="Volgende week">
                    <GlanceLine label="Volgende week" value={next.value} sub={next.sub} />
                  </GlanceList>
                )}

                {hasRows && (
                  <div className="mt-5">
                    <SheetRows>
                      {muscle.proposal && muscle.text && <SheetRow title={muscle.state === 'done' ? 'Toegevoegd' : 'Voorstel'} sub={muscle.text.name} onClick={() => setView('proposal')} sheetFrom />}
                      {weekLogs.length > 0 && <SheetRow title="Je trainingen" sub={`${weekLogs.length} ${weekLogs.length === 1 ? 'training' : 'trainingen'}`} onClick={() => setView('trainings')} sheetFrom />}
                      {intention?.answer && <SheetRow title="Je antwoord deze week" onClick={() => setView('answer')} sheetFrom />}
                    </SheetRows>
                  </div>
                )}

                <SettingsLinkRow page="vandaag" row="weekterugblik" />
              </>
            )}

            {view === 'proposal' && (
              muscle.proposal && muscle.text ? (
                <div className="mt-4 flex flex-col gap-3" role="group" aria-label="Kracht voor de berg">
                  <div>
                    <p className="font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{muscle.text.name}</p>
                    <p className="mt-0.5 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{muscle.text.where}</p>
                    {muscle.text.forgeName && muscle.state !== 'done' && <p className="mt-0.5 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{muscle.text.forgeName}</p>}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{muscle.text.how}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{muscle.text.why}</p>
                  {muscle.text.unknown && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{muscle.text.unknown}</p>}
                  {proposalInfo && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{muscle.text.info}</p>}
                  {muscle.state === 'done' ? (
                    <p role="status" className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{muscle.text.done}</p>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{muscle.text.after}</p>
                      {muscle.state === 'failed' && <p role="status" className="text-xs" style={{ color: 'var(--color-warning)' }}>Opslaan lukte niet op tijd. Probeer het nog eens; hij komt er hoogstens één keer in.</p>}
                      <div className="mt-1 flex gap-3">
                        <SecondaryButton disabled={muscle.state === 'busy'} onClick={decline} className="min-h-[52px]">Liever niet</SecondaryButton>
                        <PrimaryButton disabled={muscle.state === 'busy'} onClick={() => void muscle.accept()} fullWidth={false}>Akkoord</PrimaryButton>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Er staat geen voorstel meer open.</p>
              )
            )}

            {view === 'trainings' && (
              <div className="mt-4">
                {sports.length > 0 && <p className="mb-3 font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{sports.join(' · ')}</p>}
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
