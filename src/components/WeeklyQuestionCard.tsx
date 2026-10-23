import { useId, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { programAnchorDate } from '../engine/programLayout';
import { raceBlocks } from '../engine/raceBlock';
import {
  MAX_ANSWER_LENGTH,
  answerIntention,
  intentionForWeek,
  mainGoalDate,
  pickWeekQuestion,
  postponeIntention,
  shouldShowWeeklyQuestion,
  weekQuestionContext,
} from '../engine/weeklyQuestion';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';
import { Eyebrow, PrimaryButton } from './ui';
import { DayRow } from './vandaag/DayRow';
import { TodaySheet } from './vandaag/TodaySheet';

// The question of the week on Today (engine/weeklyQuestion.ts), as one line in
// "Je dag": one "Als ..., wat doe je dan?" with a short Stoic source, and one
// line for your plan. The line opens the question in a sheet.
// Visible from Monday until you answered; "Later" hides it for the rest of
// the day. Never red, never "overdue": when the week is over it simply goes.
export function WeeklyQuestionCard() {
  const { program, trainingGoals, goalMilestones, settings, updateSettings } = useAppData();
  const today = todayISO();
  const weekStart = mondayOfWeek(today);
  const [draft, setDraft] = useState('');
  const [savedAnswer, setSavedAnswer] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const inputId = useId();

  const anchor = programAnchorDate(trainingGoals, goalMilestones, today);
  const ladder = new Set(goalMilestones.map((m) => m.goalId));
  const mainGoalId = trainingGoals.find((g) => g.status === 'active' && ladder.has(g.id))?.id;
  const question = pickWeekQuestion(weekQuestionContext({
    weekStart,
    program,
    // From last week on, so the week after a race still knows about it.
    races: raceBlocks(trainingGoals, mainGoalId, anchor, addDays(weekStart, -7)),
    goalDate: mainGoalDate(trainingGoals, goalMilestones),
  }));

  // Right after saving, the line says so for as long as you stay on the screen.
  if (savedAnswer !== null) {
    return (
      <>
        <DayRow label="Vraag" state="done" onClick={() => setOpen(true)}>Je plan staat erin: {savedAnswer}</DayRow>
        {open && (
          <TodaySheet eyebrow="VRAAG VAN DE WEEK" title={question.vraag} onClose={() => setOpen(false)}>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>Je plan staat erin: {savedAnswer}</p>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Je ziet het terug in je weekterugblik.</p>
          </TodaySheet>
        )}
      </>
    );
  }

  if (!shouldShowWeeklyQuestion(settings.weeklyIntentions, weekStart, today)) return null;

  const save = () => {
    const next = answerIntention(settings.weeklyIntentions, question, weekStart, draft, new Date().toISOString());
    if (next === settings.weeklyIntentions) return;
    void updateSettings({ weeklyIntentions: next });
    setSavedAnswer(intentionForWeek(next, weekStart)?.answer ?? draft.trim());
    setOpen(false);
  };

  return (
    <>
      <DayRow label="Vraag" onClick={() => setOpen(true)}>{question.vraag}</DayRow>
      {open && (
        <TodaySheet eyebrow="VRAAG VAN DE WEEK" title={question.vraag} onClose={() => setOpen(false)}>
          {(close) => (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>“{question.bron.tekst}”</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-bronze)' }}>
                  {question.bron.auteur}, {question.bron.werk}
                  {question.bron.noot ? <span style={{ color: 'var(--color-ink-dim)' }}>. {question.bron.noot}</span> : null}
                </p>
              </div>
              <div>
                <label htmlFor={inputId} className="text-xs font-medium" style={{ color: 'var(--color-ink-dim)' }}>Jouw plan</label>
                <input
                  id={inputId}
                  type="text"
                  value={draft}
                  maxLength={MAX_ANSWER_LENGTH}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) save(); }}
                  enterKeyHint="done"
                  autoComplete="off"
                  placeholder="Dan …"
                  className="mt-1.5 min-h-[44px] w-full rounded-xl border bg-transparent px-3 text-sm"
                  style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)', background: 'var(--color-charcoal)' }}
                />
              </div>
              <div className="flex items-center gap-4">
                <PrimaryButton fullWidth={false} disabled={!draft.trim()} onClick={save}>Opslaan</PrimaryButton>
                <button
                  onClick={() => { void updateSettings({ weeklyIntentions: postponeIntention(settings.weeklyIntentions, question, weekStart, today) }); close(); }}
                  className="min-h-[44px] px-1 text-sm underline"
                  style={{ color: 'var(--color-ink-dim)' }}
                >
                  Niet nu
                </button>
              </div>
            </div>
          )}
        </TodaySheet>
      )}
    </>
  );
}

// In the week review: the question of that week and what you answered, when
// you did. Nothing at all when you did not, and no remark about it.
export function WeeklyPlanSection({ weekStart }: { weekStart: string }) {
  const { settings } = useAppData();
  const entry = intentionForWeek(settings.weeklyIntentions, weekStart);
  if (!entry?.answer) return null;
  return (
    <div className="mt-5">
      <Eyebrow>Je plan van deze week</Eyebrow>
      <div className="mt-2 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{entry.question}</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{entry.answer}</p>
      </div>
    </div>
  );
}
