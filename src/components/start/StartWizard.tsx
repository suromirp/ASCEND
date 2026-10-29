import { useMemo, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { useHorizonChange } from '../useHorizonChange';
import { ChoiceList, Sheet, SheetButtons } from '../settings/Sheet';
import { TextButton } from '../TextButton';
import { buildFirstPlan, defaultAnswers, kindOfExistingGoals, GOAL_OPTIONS, RACE_OPTIONS, startDateProblem, startSteps, WEEKDAY_NAMES, WEEKDAY_SHORT, type StartAnswers, type StartRace, type StartStep } from '../../engine/firstPlan';
import { adviceDays, maxDaysWithoutStrength, MAX_DAYS, MIN_DAYS, type StartGoalKind } from '../../engine/weekShape';
import { addDays, todayISO } from '../../utils/dates';
import { haptics } from '../../utils/haptics';

// Nieuw beginnen: een paar vragen, één per scherm, met het advies als standaard.
// Pas aan het eind maakt ASCEND het plan, met dezelfde planningsronde als altijd,
// en laat het zien als voorstel met Akkoord (storage/horizonPlan.ts). Liever niet
// laat de app leeg met het welkom
// (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).

const EXPLANATION = 'Je doel, je dagen en je keuze voor krachttraining bepalen je weken. Je ziet eerst wat er komt; pas na jouw Akkoord gebeurt er iets.';

const DAY_LABELS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

export function StartWizard({ answers, onAnswers, onClose }: { answers: StartAnswers; onAnswers: (next: StartAnswers) => void; onClose: () => void }) {
  const { templates, planHorizonChange, trainingGoals, goalMilestones } = useAppData();
  const hasGoal = trainingGoals.some((g) => g.status !== 'archived');
  const existing = useMemo(() => (hasGoal ? { kind: kindOfExistingGoals(trainingGoals, goalMilestones) } : undefined), [hasGoal, trainingGoals, goalMilestones]);
  const horizon = useHorizonChange();
  const steps = useMemo(() => startSteps(answers.goal, hasGoal), [answers.goal, hasGoal]);
  const [step, setStep] = useState<StartStep>(steps[0]);
  const index = steps.indexOf(step);
  const today = todayISO();
  const set = (patch: Partial<StartAnswers>) => onAnswers({ ...answers, ...patch });
  const go = (delta: number) => setStep(steps[Math.max(0, Math.min(steps.length - 1, index + delta))]);
  const advice = adviceDays(existing?.kind ?? answers.goal);

  async function makePlan(close: () => void, withAnswers: StartAnswers = answers) {
    const setup = buildFirstPlan(withAnswers, templates, today, undefined, existing);
    const { marathonRaceType, marathonTargetDate, ...settings } = setup.settings;
    await horizon.propose(
      () => planHorizonChange({
        title: setup.title,
        why: 'Volgt je antwoorden.',
        explanation: EXPLANATION,
        trigger: 'goal_created',
        notes: setup.lines,
        program: setup.program,
        goals: setup.goals,
        settings: { ...settings, ...(marathonRaceType ? { marathonRaceType, marathonTargetDate } : {}) },
        firstPlan: { milestones: setup.milestones, strategy: setup.strategy, allowedDays: setup.allowedDays, restDay: setup.settings.restDay },
      }),
      { eyebrow: 'Je eerste week', notesTitle: 'Wat je koos', ask: 'always', alwaysAsk: true, declined: 'Prima, er is niets ingepland.', onStored: close, onDeclined: close },
    );
  }

  const title: Record<StartStep, string> = {
    goal: 'Waar werk je naartoe?',
    race: 'Welke afstand?',
    date: answers.goal === 'trek' ? 'Wanneer begint je tocht?' : 'Wanneer is je wedstrijd?',
    days: 'Hoeveel dagen per week wil je trainen?',
    which: 'Op welke dagen kun je?',
    strength: 'Wil je ook krachttraining?',
  };
  const line: Record<StartStep, string> = {
    goal: 'Kies wat het best past. Je kunt het later nog veranderen.',
    race: 'Je kiest er één. Een andere afstand kun je later bij je doelen zetten.',
    date: 'Met een datum bouwt ASCEND naar die dag toe. Zonder datum plant ASCEND rustig door.',
    days: advice.reason,
    which: 'Tik de dagen aan waarop je kunt. Staan ze allemaal aan, dan kiest ASCEND zelf de beste.',
    strength: 'Bovenlichaam en benen, ingepland tussen je andere trainingen.',
  };

  const dateProblem = startDateProblem(answers, today);
  const needDays = Math.min(answers.daysPerWeek, MAX_DAYS);
  const tooFewDays = answers.allowedDays.length < needDays;

  return (
    <>
      <Sheet eyebrow={`Vraag ${index + 1} van ${steps.length}`} title={title[step]} line={line[step]} onClose={onClose}>
        {(close) => (
          <>
            {step === 'goal' && (
              <>
                <ChoiceList<StartGoalKind>
                  label={title.goal}
                  options={GOAL_OPTIONS.map((o) => ({ value: o.id, label: o.label, note: o.note }))}
                  value={answers.goal}
                  onPick={(goal) => onAnswers({ ...defaultAnswers(goal), race: answers.race, goalDate: goal === 'fit' ? undefined : answers.goalDate })}
                />
                <SheetButtons>
                  <button type="button" className="st-btn gold" onClick={() => go(1)}>Volgende</button>
                </SheetButtons>
              </>
            )}

            {step === 'race' && (
              <>
                <ChoiceList<StartRace>
                  label={title.race}
                  options={RACE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                  value={answers.race}
                  onPick={(race) => set({ race })}
                />
                <SheetButtons>
                  {index > 0 && <button type="button" className="st-btn" onClick={() => go(-1)}>Terug</button>}
                  <button type="button" className="st-btn gold" onClick={() => go(1)}>Volgende</button>
                </SheetButtons>
              </>
            )}

            {step === 'date' && (
              <>
                <label className="flex flex-col gap-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                  Datum
                  <input
                    type="date" lang="nl"
                    value={answers.goalDate ?? ''}
                    min={addDays(today, 1)}
                    onChange={(e) => set({ goalDate: e.target.value || undefined })}
                    className="min-h-[48px] w-full rounded-xl border px-3 text-base"
                    style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
                  />
                </label>
                {dateProblem && <p className="st-hint warn" role="alert" style={{ marginLeft: 0, marginRight: 0 }}>{dateProblem}</p>}
                <SheetButtons>
                  {index > 0 && <button type="button" className="st-btn" onClick={() => go(-1)}>Terug</button>}
                  <button type="button" className="st-btn gold" disabled={!answers.goalDate || !!dateProblem} onClick={() => go(1)}>Volgende</button>
                </SheetButtons>
                <div className="mt-1 flex justify-center">
                  <TextButton tone="dim" onClick={() => { set({ goalDate: undefined }); go(1); }}>Nog geen datum</TextButton>
                </div>
              </>
            )}

            {step === 'days' && (
              <>
                <ChoiceList<number>
                  label={title.days}
                  options={Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }, (_, i) => MIN_DAYS + i).map((n) => ({ value: n, label: `${n} dagen` }))}
                  value={answers.daysPerWeek}
                  advice={advice.days}
                  onPick={(daysPerWeek) => set({ daysPerWeek })}
                />
                <SheetButtons>
                  {index > 0 && <button type="button" className="st-btn" onClick={() => go(-1)}>Terug</button>}
                  <button type="button" className="st-btn gold" onClick={() => go(1)}>Volgende</button>
                </SheetButtons>
                <div className="mt-1 flex justify-center">
                  <TextButton tone="dim" disabled={horizon.busy} onClick={() => { const next = { ...defaultAnswers(existing?.kind ?? answers.goal), race: answers.race, goalDate: answers.goalDate, daysPerWeek: answers.daysPerWeek }; onAnswers(next); void makePlan(close, next); }}>
                    {horizon.busy ? 'Even rekenen…' : 'De rest overslaan, het advies gebruiken'}
                  </TextButton>
                </div>
              </>
            )}

            {step === 'which' && (
              <>
                <div role="group" aria-label="Dagen waarop je kunt trainen" className="grid grid-cols-7 gap-0.5">
                  {DAY_LABELS.map((name, i) => {
                    const day = i + 1;
                    const on = answers.allowedDays.includes(day);
                    return (
                      <button
                        key={name}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-label={name}
                        onClick={() => {
                          haptics.tap();
                          set({ allowedDays: on ? answers.allowedDays.filter((d) => d !== day) : [...answers.allowedDays, day].sort((a, b) => a - b) });
                        }}
                        className="flex min-h-[48px] min-w-[44px] items-center justify-center rounded-xl border text-sm font-medium"
                        style={{
                          borderColor: on ? 'var(--color-action)' : 'var(--color-control-border)',
                          background: on ? 'var(--color-action-muted)' : 'transparent',
                          color: on ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                        }}
                      >
                        {WEEKDAY_SHORT[i]}
                      </button>
                    );
                  })}
                </div>
                <p className={`st-hint${tooFewDays ? ' warn' : ''}`} style={{ marginLeft: 0, marginRight: 0 }} role={tooFewDays ? 'alert' : undefined}>
                  {tooFewDays
                    ? `Je wilt ${answers.daysPerWeek} dagen trainen. Kies minstens ${needDays} dagen, of ga terug en kies minder.`
                    : `${answers.allowedDays.length} van 7 dagen. ${answers.allowedDays.length === 7 ? 'ASCEND kiest de beste dagen.' : `Op ${answers.allowedDays.map((d) => WEEKDAY_NAMES[d - 1]).join(', ')}.`}`}
                </p>
                <SheetButtons>
                  {index > 0 && <button type="button" className="st-btn" onClick={() => go(-1)}>Terug</button>}
                  <button type="button" className="st-btn gold" disabled={tooFewDays} onClick={() => go(1)}>Volgende</button>
                </SheetButtons>
              </>
            )}

            {step === 'strength' && (
              <>
                <ChoiceList<'ja' | 'nee'>
                  label={title.strength}
                  options={[
                    { value: 'ja', label: 'Ja, met krachttraining' },
                    { value: 'nee', label: 'Nee, zonder', note: `Dan plant ASCEND hoogstens ${maxDaysWithoutStrength()} trainingen per week: lopen en wandelen.` },
                  ]}
                  value={answers.strength ? 'ja' : 'nee'}
                  advice="ja"
                  onPick={(v) => set({ strength: v === 'ja' })}
                />
                {horizon.note && <p className="st-hint warn" role="status" style={{ marginLeft: 0, marginRight: 0 }}>{horizon.note}</p>}
                <SheetButtons>
                  {index > 0 && <button type="button" className="st-btn" disabled={horizon.busy} onClick={() => go(-1)}>Terug</button>}
                  <button type="button" className="st-btn gold" disabled={horizon.busy} onClick={() => void makePlan(close)}>
                    {horizon.busy ? 'Even rekenen…' : 'Bekijk je plan'}
                  </button>
                </SheetButtons>
              </>
            )}
          </>
        )}
      </Sheet>
      {horizon.sheet}
    </>
  );
}
