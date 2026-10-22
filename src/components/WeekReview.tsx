import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { buildWeekReview, type WeekReview } from '../engine/weekReview';
import { addDays, formatDateNL, formatHoursMinutesNL, todayISO } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, SecondaryButton } from './ui';
import type { TroubleSeverity, WeeklyHealthCheck, WeeklyTrouble } from '../models/checkIn';
import { PAIN_AREA_OPTIONS } from '../data/bodyAreas';
import { WeeklyPlanSection } from './WeeklyQuestionCard';

function useWeekReview(weekStart: string): WeekReview | null {
  const { plannedSessions, sessionLogs, templates, program, planChangeLog, settings } = useAppData();
  return buildWeekReview({ weekStart, plannedSessions, logs: sessionLogs, templates, program, planChangeLog, asOf: todayISO(), illnessEpisodes: settings.illnessEpisodes, weeklyChecks: settings.weeklyHealthChecks });
}

// On Today, Sunday and Monday: the short version, with the coach's first
// line and the full review one tap away.
export function WeekReviewCard({ weekStart }: { weekStart: string }) {
  const review = useWeekReview(weekStart);
  const [open, setOpen] = useState(false);
  if (!review || review.planned === 0) return null;
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>WEEKTERUGBLIK</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
        {review.done} van {review.planned} trainingen · {formatHoursMinutesNL(review.minutes)}
      </p>
      {review.advice[0] && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{review.advice[0]}</p>}
      <SecondaryButton onClick={() => setOpen(true)} className="mt-1">Bekijk je week</SecondaryButton>
      {open && <WeekReviewSheet review={review} onClose={() => setOpen(false)} />}
    </Card>
  );
}

// In the Logboek: earlier weeks, newest first.
export function WeekReviewList({ weeks = 6 }: { weeks?: number }) {
  const { plannedSessions, sessionLogs, templates, program, planChangeLog, settings } = useAppData();
  const [openReview, setOpenReview] = useState<WeekReview | null>(null);
  const today = todayISO();
  const thisMonday = addDays(today, -((new Date(today).getDay() + 6) % 7));
  const reviews = Array.from({ length: weeks }, (_, i) => addDays(thisMonday, -7 * (i + 1)))
    .map((w) => buildWeekReview({ weekStart: w, plannedSessions, logs: sessionLogs, templates, program, planChangeLog, asOf: today, illnessEpisodes: settings.illnessEpisodes, weeklyChecks: settings.weeklyHealthChecks }))
    .filter((r): r is WeekReview => !!r && r.planned > 0);
  if (reviews.length === 0) return null;
  return (
    <Card className="flex flex-col">
      <Eyebrow>WEEKTERUGBLIKKEN</Eyebrow>
      <div className="mt-2 flex flex-col">
        {reviews.map((r) => (
          <button key={r.weekStart} onClick={() => setOpenReview(r)} className="flex min-h-[48px] items-center justify-between gap-3 border-b py-2 text-left last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
            <span>
              <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>Week van {formatDateNL(r.weekStart)}</span>
              <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{r.title}</span>
            </span>
            <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{r.done} / {r.planned} ›</span>
          </button>
        ))}
      </div>
      {openReview && <WeekReviewSheet review={openReview} onClose={() => setOpenReview(null)} />}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold tracking-[0.18em]" style={{ color: 'var(--color-ink-dim)' }}>{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function WeekReviewSheet({ review, onClose }: { review: WeekReview; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mr-2 -mt-2 flex items-center justify-between">
              <Eyebrow>{`WEEK VAN ${formatDateNL(review.weekStart).toUpperCase()}`}</Eyebrow>
              <button onClick={requestClose} aria-label="Sluiten" className="flex h-11 w-11 items-center justify-center text-lg" style={{ color: 'var(--color-ink-dim)' }}>×</button>
            </div>
            <h2 className="mt-1 font-display text-2xl" style={{ color: 'var(--color-ink)' }}>Je week</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{review.title}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { value: `${review.done}/${review.planned}`, label: 'trainingen' },
                { value: formatHoursMinutesNL(review.minutes), label: 'getraind' },
                { value: review.avgRpe !== undefined ? String(review.avgRpe).replace('.', ',') : 'n.v.t.', label: 'gem. zwaarte' },
              ].map((f) => (
                <div key={f.label} className="rounded-xl border px-2.5 py-2.5" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
                  <p className={`font-sans tabular-nums leading-tight ${f.value.length > 9 ? 'text-sm' : 'text-lg'}`} style={{ color: 'var(--color-ink)' }}>{f.value}</p>
                  <p className="mt-0.5 text-xs leading-tight" style={{ color: 'var(--color-ink-dim)' }}>{f.label}</p>
                </div>
              ))}
            </div>
            {review.perSport.length > 0 && (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{review.perSport.join(' · ')}</p>
            )}

            {review.advice.length > 0 && (
              <Section title="DE COACH">
                <div className="flex flex-col gap-2">
                  {review.advice.map((a) => (
                    <p key={a} className="rounded-xl border p-3 text-sm leading-relaxed" style={{ borderColor: 'var(--color-bronze-dark)', color: 'var(--color-ink)' }}>{a}</p>
                  ))}
                </div>
              </Section>
            )}

            <Section title="KLACHTEN">
              <WeeklyHealthQuestion weekStart={review.weekStart} />
            </Section>

            {review.missed.length > 0 && (
              <Section title="NIET GEDAAN">
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{review.missed.join(', ')}</p>
              </Section>
            )}

            {(review.heavier > 0 || review.lighter > 0 || review.pain.length > 0) && (
              <Section title="HOE HET VOELDE">
                {(review.heavier > 0 || review.lighter > 0) && (
                  <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                    {[review.heavier > 0 ? `${review.heavier} zwaarder dan gepland` : '', review.lighter > 0 ? `${review.lighter} lichter dan gepland` : ''].filter(Boolean).join(', ')}.
                  </p>
                )}
                {review.pain.length > 0 && (
                  <p className="text-sm" style={{ color: 'var(--color-warning)' }}>Pijn: {review.pain.join(', ')}.</p>
                )}
              </Section>
            )}

            <WeeklyPlanSection weekStart={review.weekStart} />

            {review.changes.length > 0 && (
              <Section title="WAT ASCEND AANPASTE">
                <ul className="flex flex-col gap-1">
                  {review.changes.map((c) => <li key={c} className="text-sm" style={{ color: 'var(--color-ink)' }}>{c}</li>)}
                </ul>
              </Section>
            )}

            {review.next && (
              <Section title="VOLGENDE WEEK">
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{review.next.title}{review.next.note ? ` · ${review.next.note.toLowerCase()}` : ''}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{formatHoursMinutesNL(review.next.minutes)} gepland</p>
                {review.next.key && <p className="mt-1 text-xs" style={{ color: 'var(--color-gold)' }}>{review.next.key}</p>}
              </Section>
            )}

            <button onClick={requestClose} className="mt-6 min-h-[44px] w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>Sluiten</button>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

const TROUBLE: [WeeklyTrouble, string][] = [
  ['geen', 'Nee, ik kon alles doen'],
  ['wel_gewoon', 'Ja, maar ik kon gewoon trainen'],
  ['minder', 'Ja, ik moest minder of anders trainen'],
  ['niet_kunnen', 'Ja, ik kon niet trainen'],
];
const SEVERITY: [TroubleSeverity, string][] = [['mild', 'Mild'], ['matig', 'Matig'], ['ernstig', 'Ernstig']];

// One question a week (OSTRC-O2 in short): did leg, foot or back trouble from
// training get in the way? Only with a yes: where, and how bad.
function WeeklyHealthQuestion({ weekStart }: { weekStart: string }) {
  const { settings, updateSettings } = useAppData();
  const saved = settings.weeklyHealthChecks?.find((c) => c.weekStart === weekStart);
  const [draft, setDraft] = useState<WeeklyHealthCheck | undefined>(saved);
  const save = (next: WeeklyHealthCheck) => {
    setDraft(next);
    const others = (settings.weeklyHealthChecks ?? []).filter((c) => c.weekStart !== weekStart);
    void updateSettings({ weeklyHealthChecks: [...others, next].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-26) });
  };
  const chip = (on: boolean) => ({ borderColor: on ? 'var(--color-gold)' : 'var(--color-card-border)', color: on ? 'var(--color-gold)' : 'var(--color-ink)' });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Had je deze week klachten aan je benen, voeten of rug door het trainen?</p>
      <div className="flex flex-col gap-1.5">
        {TROUBLE.map(([k, text]) => (
          <button key={k} onClick={() => save({ weekStart, trouble: k, area: k === 'geen' ? undefined : draft?.area, severity: k === 'geen' ? undefined : draft?.severity })} aria-pressed={draft?.trouble === k} className="min-h-[44px] rounded-xl border px-3 text-left text-xs" style={chip(draft?.trouble === k)}>
            {text}
          </button>
        ))}
      </div>
      {draft && draft.trouble !== 'geen' && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {[...PAIN_AREA_OPTIONS].map((a) => (
              <button key={a} onClick={() => save({ ...draft, area: draft.area === a ? undefined : a })} aria-pressed={draft.area === a} className="min-h-[44px] rounded-lg border px-2.5 text-xs" style={chip(draft.area === a)}>{a}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {SEVERITY.map(([k, text]) => (
              <button key={k} onClick={() => save({ ...draft, severity: draft.severity === k ? undefined : k })} aria-pressed={draft.severity === k} className="min-h-[44px] rounded-lg border text-xs" style={chip(draft.severity === k)}>{text}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
