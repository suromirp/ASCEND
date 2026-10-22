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
import { Card, Eyebrow, PrimaryButton } from './ui';

// The question of the week on Today (engine/weeklyQuestion.ts): one "Als ...,
// wat doe je dan?" with a short Stoic source, and one line for your plan.
// Visible from Monday until you answered; "Later" hides it for the rest of
// the day. Never red, never "overdue": when the week is over it simply goes.
export function WeeklyQuestionCard() {
  const { program, trainingGoals, goalMilestones, settings, updateSettings } = useAppData();
  const today = todayISO();
  const weekStart = mondayOfWeek(today);
  const [draft, setDraft] = useState('');
  const [savedAnswer, setSavedAnswer] = useState<string | null>(null);
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

  // Right after saving, the card says so for as long as you stay on the screen.
  if (savedAnswer !== null) {
    return (
      <Card className="flex flex-col gap-1.5">
        <Eyebrow>VRAAG VAN DE WEEK</Eyebrow>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>Je plan staat erin: {savedAnswer}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Je ziet het terug in je weekterugblik.</p>
      </Card>
    );
  }

  if (!shouldShowWeeklyQuestion(settings.weeklyIntentions, weekStart, today)) return null;

  const save = () => {
    const next = answerIntention(settings.weeklyIntentions, question, weekStart, draft, new Date().toISOString());
    if (next === settings.weeklyIntentions) return;
    void updateSettings({ weeklyIntentions: next });
    setSavedAnswer(intentionForWeek(next, weekStart)?.answer ?? draft.trim());
  };

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>VRAAG VAN DE WEEK</Eyebrow>
      <p className="font-display text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{question.vraag}</p>
      <div>
        <p className="text-xs italic leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>“{question.bron.tekst}”</p>
        <p className="mt-1 text-[11px] tracking-wide" style={{ color: 'var(--color-bronze)' }}>
          {question.bron.auteur}, {question.bron.werk}
          {question.bron.noot ? <span style={{ color: 'var(--color-ink-dim)' }}>. {question.bron.noot}</span> : null}
        </p>
      </div>
      <div>
        <label htmlFor={inputId} className="text-[11px] font-medium tracking-[0.16em]" style={{ color: 'var(--color-ink-dim)' }}>JOUW PLAN</label>
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
        <PrimaryButton fullWidth={false} disabled={!draft.trim()} onClick={save}>OPSLAAN</PrimaryButton>
        <button
          onClick={() => void updateSettings({ weeklyIntentions: postponeIntention(settings.weeklyIntentions, question, weekStart, today) })}
          className="min-h-[44px] px-1 text-xs underline"
          style={{ color: 'var(--color-ink-dim)' }}
        >
          Later
        </button>
      </div>
    </Card>
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
      <p className="text-[11px] font-semibold tracking-[0.18em]" style={{ color: 'var(--color-ink-dim)' }}>JE PLAN VAN DEZE WEEK</p>
      <div className="mt-2 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{entry.question}</p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{entry.answer}</p>
      </div>
    </div>
  );
}
