import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { buildWeekReview, type WeekReview } from '../engine/weekReview';
import { intentionForWeek } from '../engine/weeklyQuestion';
import { addDays, formatDateNL, formatHoursMinutesNL, todayISO } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { SettingsLinkRow } from './settings/SettingsLink';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { IconDisc } from './SportDisc';
import { Card, Chip, Eyebrow, InfoButton, Ring, SecondaryButton, Segmented, Stat } from './ui';
import type { TroubleSeverity, WeeklyHealthCheck, WeeklyTrouble } from '../models/checkIn';
import { PAIN_AREA_OPTIONS } from '../data/bodyAreas';
import { Icon } from './icons';
import { DisclosureRow } from './DisclosureRow';
import { usePageState } from './usePageState';

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
      <Eyebrow>Weekterugblik</Eyebrow>
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
  const [open, setOpen] = usePageState('reviewsOpen', false);
  const today = todayISO();
  const thisMonday = addDays(today, -((new Date(today).getDay() + 6) % 7));
  const reviews = Array.from({ length: weeks }, (_, i) => addDays(thisMonday, -7 * (i + 1)))
    .map((w) => buildWeekReview({ weekStart: w, plannedSessions, logs: sessionLogs, templates, program, planChangeLog, asOf: today, illnessEpisodes: settings.illnessEpisodes, weeklyChecks: settings.weeklyHealthChecks }))
    .filter((r): r is WeekReview => !!r && r.planned > 0);
  if (reviews.length === 0) return null;
  return (
    <Card className="flex flex-col py-1">
      <DisclosureRow title="Weekterugblikken" value={reviews.length} open={open} onToggle={() => setOpen(!open)}>
        <div className="flex flex-col">
          {reviews.map((r) => (
            <button key={r.weekStart} onClick={() => setOpenReview(r)} className="flex min-h-[52px] items-center justify-between gap-3 border-t py-2 text-left" style={{ borderColor: 'var(--color-card-border)' }}>
              <span>
                <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>Week van {formatDateNL(r.weekStart)}</span>
                <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{r.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{r.done} van {r.planned}<Icon name="verder" size={16} /></span>
            </button>
          ))}
        </div>
      </DisclosureRow>
      {openReview && <WeekReviewSheet review={openReview} onClose={() => setOpenReview(null)} />}
    </Card>
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
  return { value: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`, unit: 'uur' };
}

// "Week 1 van 26, opbouw" + "Wennen" wordt "opbouw, week 1 · wennen".
function nextLabel(next: NonNullable<WeekReview['next']>): string {
  const m = next.title.match(/^Week (\d+) van \d+, (.+)$/);
  const base = m ? `${m[2]}, week ${m[1]}` : next.title;
  return `${base}${next.note ? ` · ${next.note.toLowerCase()}` : ''}`;
}

export function WeekReviewSheet({ review, onClose }: { review: WeekReview; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  const { settings } = useAppData();
  const intention = intentionForWeek(settings.weeklyIntentions, review.weekStart);
  const time = clock(review.minutes);
  const nextTime = review.next ? clock(review.next.minutes) : null;
  const unit = (n: number) => (n === 1 ? 'training' : 'trainingen');
  const felt = [review.heavier > 0 ? `${review.heavier} ${unit(review.heavier)} zwaarder dan gepland` : '', review.lighter > 0 ? `${review.lighter} ${unit(review.lighter)} lichter dan gepland` : ''].filter(Boolean).join(', ');
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2">
              <SheetHeader eyebrow={`Week van ${formatDateNL(review.weekStart)}`} title="Je week" facts={review.title.replace(', ', ' · ')} onClose={requestClose} />
            </div>

            <div className="mt-4 flex items-center gap-5">
              <Ring value={review.planned > 0 ? review.done / review.planned : 0} label={`${review.done} van ${review.planned} trainingen gedaan`} size={88} stroke={8}>
                <span className="font-sans text-xl font-semibold leading-none tabular-nums" style={{ color: 'var(--color-ink)' }}>{review.done}/{review.planned}</span>
                <span className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>gedaan</span>
              </Ring>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Stat label="Tijd" value={time.value} unit={time.unit} size="l" />
                {review.perSport.length > 0 && (
                  <p className="font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{review.perSport.map((p) => p.replace(': ', ' ')).join(' · ')}</p>
                )}
                {review.avgRpe !== undefined && (
                  <p className="font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>gem. zwaarte {String(review.avgRpe).replace('.', ',')}</p>
                )}
              </div>
            </div>
            {(felt || review.pain.length > 0) && (
              <div className="mt-3 flex flex-col gap-1">
                {felt && <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{felt.charAt(0).toUpperCase() + felt.slice(1)}.</p>}
                {review.pain.length > 0 && <p className="text-sm" style={{ color: 'var(--color-warning)' }}>Pijn: {review.pain.join(', ')}.</p>}
              </div>
            )}

            {review.advice.length > 0 && (
              <Section title="De coach">
                <div className="flex flex-col gap-2">
                  {review.advice.map((a) => (
                    <p key={a} className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{a}</p>
                  ))}
                </div>
              </Section>
            )}

            <WeeklyHealthQuestion weekStart={review.weekStart} />

            {review.missed.length > 0 && (
              <Section title="Niet gedaan">
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{review.missed.join(', ')}</p>
              </Section>
            )}

            {review.changes.length > 0 && (
              <Section title="Wat ASCEND aanpaste">
                <ul className="flex flex-col gap-1">
                  {review.changes.map((c) => <li key={c} className="text-sm" style={{ color: 'var(--color-ink)' }}>{c}</li>)}
                </ul>
              </Section>
            )}

            {intention?.answer && (
              <Section title="Je antwoord deze week">
                {intention.question && <p className="mb-2 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{intention.question}</p>}
                <blockquote className="border-l-2 pl-3 text-sm italic leading-relaxed" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}>{intention.answer}</blockquote>
              </Section>
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

            <SettingsLinkRow page="vandaag" row="weekterugblik" />
          </Card>
        </div>
      </div>
    </Portal>
  );
}

// [waarde, kort label, regel bij "Klachten:", volledige zin]
const TROUBLE: [WeeklyTrouble, string, string, string][] = [
  ['geen', 'Nee', 'nee', 'Nee, ik kon alles doen'],
  ['wel_gewoon', 'Ja, kon trainen', 'ja, kon trainen', 'Ja, maar ik kon gewoon trainen'],
  ['minder', 'Ja, minder getraind', 'ja, minder getraind', 'Ja, ik moest minder of anders trainen'],
  ['niet_kunnen', 'Ja, kon niet', 'ja, kon niet trainen', 'Ja, ik kon niet trainen'],
];
const SEVERITY: [TroubleSeverity, string][] = [['mild', 'Mild'], ['matig', 'Matig'], ['ernstig', 'Ernstig']];

// One question a week (OSTRC-O2 in short): did leg, foot or back trouble from
// training get in the way? Only with a yes: where, and how bad. Answered: one
// line with "Wijzigen". The answer is saved exactly as before.
function WeeklyHealthQuestion({ weekStart }: { weekStart: string }) {
  const { settings, updateSettings } = useAppData();
  const saved = settings.weeklyHealthChecks?.find((c) => c.weekStart === weekStart);
  const [draft, setDraft] = useState<WeeklyHealthCheck | undefined>(saved);
  const [asking, setAsking] = useState(!saved);
  const [why, setWhy] = useState(false);
  const save = (next: WeeklyHealthCheck) => {
    setDraft(next);
    const others = (settings.weeklyHealthChecks ?? []).filter((c) => c.weekStart !== weekStart);
    void updateSettings({ weeklyHealthChecks: [...others, next].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-26) });
  };
  const currentRow = TROUBLE.find(([k]) => k === draft?.trouble);
  if (!asking && draft && currentRow) {
    const detail = draft.trouble !== 'geen' ? [draft.area?.toLowerCase(), draft.severity].filter(Boolean).join(', ') : '';
    return (
      <div className="mt-5 flex min-h-[44px] items-center justify-between gap-3">
        <p className="min-w-0 text-sm" style={{ color: 'var(--color-ink)' }}>Klachten: {currentRow[2]}{detail ? ` (${detail})` : ''}</p>
        <button type="button" onClick={() => setAsking(true)} className="flex min-h-[44px] shrink-0 items-center px-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Wijzigen</button>
      </div>
    );
  }
  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm" style={{ color: 'var(--color-ink)' }}>Had je deze week klachten aan je benen, voeten of rug door het trainen?</p>
        <InfoButton onClick={() => setWhy((v) => !v)} label="Waarom vraagt ASCEND dit?" />
      </div>
      {why && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Zo ziet ASCEND vroeg of je wat rustiger aan moet doen, voordat een klacht een blessure wordt.</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Klachten deze week">
        {TROUBLE.map(([k, short, , full]) => (
          <Chip key={k} label={full} selected={draft?.trouble === k} onClick={() => save({ weekStart, trouble: k, area: k === 'geen' ? undefined : draft?.area, severity: k === 'geen' ? undefined : draft?.severity })}>{short}</Chip>
        ))}
      </div>
      {currentRow && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{currentRow[3]}</p>}
      {draft && draft.trouble !== 'geen' && (
        <>
          <div className="flex flex-wrap gap-2">
            {[...PAIN_AREA_OPTIONS].map((a) => (
              <Chip key={a} selected={draft.area === a} onClick={() => save({ ...draft, area: draft.area === a ? undefined : a })}>{a}</Chip>
            ))}
          </div>
          <Segmented label="Hoe erg" value={draft.severity} onChange={(k) => save({ ...draft, severity: draft.severity === k ? undefined : k })} options={SEVERITY.map(([value, label]) => ({ value, label }))} tall />
        </>
      )}
      {draft && <SecondaryButton onClick={() => setAsking(false)}>Klaar</SecondaryButton>}
    </div>
  );
}
