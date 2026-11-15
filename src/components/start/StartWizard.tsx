import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { useHorizonChange } from '../useHorizonChange';
import { ChoiceList, Sheet, SheetButtons } from '../settings/Sheet';
import { TextButton } from '../TextButton';
import { SHELTER_ADVICE, SHELTER_OPTIONS, type TrekShelter } from '../../engine/trekShelter';
import { buildFirstPlan, defaultAnswers, isDirectionKind, kindOfExistingGoals, GOAL_OPTIONS, RACE_OPTIONS, STRONGER_ADVICE, STRONGER_SESSIONS, TARGET_OPTIONS, startDateProblem, startSteps, stepCounter, tapTooSoon, WEEKDAY_NAMES, WEEKDAY_SHORT, type StartAnswers, type StartRace, type StartStep } from '../../engine/firstPlan';
import { adviceDays, maxDaysWithoutStrength, MAX_DAYS, MIN_DAYS, type StartGoalKind } from '../../engine/weekShape';
import { addDays, todayISO } from '../../utils/dates';
import { haptics } from '../../utils/haptics';

// Nieuw beginnen: een paar vragen, één per scherm, met het advies als standaard.
// Pas aan het eind maakt ASCEND het plan, met dezelfde planningsronde als altijd,
// en laat het zien als voorstel met Akkoord (storage/horizonPlan.ts). Liever niet
// laat de app leeg met het welkom
// (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).

const EXPLANATION = 'Je doel of richting, je dagen en je keuze voor krachttraining bepalen je weken. Eerst een voorstel, pas na Akkoord verandert er iets.';

const DAY_LABELS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

export function StartWizard({ answers, onAnswers, onClose }: { answers: StartAnswers; onAnswers: (next: StartAnswers) => void; onClose: () => void }) {
  const { templates, planHorizonChange, trainingGoals, goalMilestones, sessionLogs, settings: stored } = useAppData();
  const hasGoal = trainingGoals.some((g) => g.status !== 'archived');
  const existing = useMemo(() => (hasGoal ? { kind: kindOfExistingGoals(trainingGoals, goalMilestones) } : undefined), [hasGoal, trainingGoals, goalMilestones]);
  const horizon = useHorizonChange();
  // De beginnersvraag alleen als er nog geen geschiedenis is die het beantwoordt.
  const steps = useMemo(() => startSteps(answers.goal, hasGoal, sessionLogs.length > 0), [answers.goal, hasGoal, sessionLogs.length]);
  const [step, setStep] = useState<StartStep>(steps[0]);
  const index = steps.indexOf(step);
  const today = todayISO();
  const set = (patch: Partial<StartAnswers>) => onAnswers({ ...answers, ...patch });
  // Een dubbele tik op Volgende slaat geen vraag over: de tweede tik raakt de nieuwe vraag te vroeg (punt J).
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = performance.now();
  }, [step]);
  const tooSoon = () => tapTooSoon(shownAt.current, performance.now());
  const go = (delta: number) => {
    if (tooSoon()) return;
    setStep(steps[Math.max(0, Math.min(steps.length - 1, index + delta))]);
  };
  const advice = adviceDays(existing?.kind ?? answers.goal);

  async function makePlan(close: () => void, withAnswers: StartAnswers = answers) {
    const setup = buildFirstPlan(withAnswers, templates, today, undefined, existing, { logs: sessionLogs, beginnerStart: stored.beginnerStart });
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
      { eyebrow: 'Je eerste week', notesTitle: 'Wat je koos', ask: 'always', alwaysAsk: true, declined: 'Er is niets ingepland.', onStored: close, onDeclined: close },
    );
  }

  const last = index === steps.length - 1;
  const stronger = answers.goal === 'stronger';
  const title: Record<StartStep, string> = {
    goal: 'Wat wil je?',
    target: 'Een tocht of een wedstrijd?',
    shelter: 'Waar slaap je onderweg?',
    beginner: 'Ben je de laatste tijd weinig aan het sporten geweest?',
    race: 'Welke afstand?',
    date: answers.goal === 'trek' ? 'Wanneer begint je tocht?' : 'Wanneer is je wedstrijd?',
    days: 'Hoeveel dagen per week wil je trainen?',
    which: 'Op welke dagen kun je?',
    strength: stronger ? 'Hoeveel keer kracht?' : 'Wil je ook krachttraining?',
  };
  const line: Record<StartStep, string> = {
    goal: 'Kies wat het best past. Je kunt het later nog veranderen.',
    target: 'Met een datum reken ik terug vanaf die dag.',
    shelter: 'Je rugzak, de paklijst en de taken in de Reisplanner volgen je keuze.',
    beginner: 'Dan begin je rustig: de eerste weken alleen makkelijk.',
    race: 'Je kiest er één. Een andere afstand kun je later bij je doelen zetten.',
    date: 'Met een datum bouwt je plan naar die dag toe. Zonder datum loopt het rustig door.',
    days: advice.reason,
    which: 'Tik de dagen aan waarop je kunt. Staan ze allemaal aan, dan worden de beste vanzelf gekozen.',
    strength: stronger ? 'Kracht staat voorop. Tussen zware beendagen houd ik 48 uur rust.' : 'Bovenlichaam en benen, ingepland tussen je andere trainingen.',
  };

  const dateProblem = startDateProblem(answers, today);
  const needDays = Math.min(answers.daysPerWeek, MAX_DAYS);
  const tooFewDays = answers.allowedDays.length < needDays;

  return (
    <>
      <Sheet eyebrow={stepCounter(steps, index)} title={title[step]} line={line[step]} onClose={onClose}>
        {(close) => (
          // Elke tik in de vraag (Volgende, De rest overslaan, Nog geen datum, een keuze) telt niet in de eerste
          // 400 ms na een nieuwe vraag: een dubbele tik op Volgende landt anders op wat daar nu staat (punt J).
          <div style={{ display: 'contents' }} onClickCapture={(e) => { if (tooSoon()) { e.preventDefault(); e.stopPropagation(); } }}>
            {step === 'goal' && (
              <>
                <ChoiceList<StartGoalKind>
                  label={title.goal}
                  options={GOAL_OPTIONS.map((o) => ({ value: o.id, label: o.label, note: o.note }))}
                  // Een wedstrijd hoort bij de tegel "Een tocht of wedstrijd".
                  value={answers.goal === 'race' ? 'trek' : answers.goal}
                  onPick={(goal) => {
                    const keep = goal === 'trek' && answers.goal === 'race' ? 'race' : goal;
                    onAnswers({ ...defaultAnswers(keep), race: answers.race, goalDate: isDirectionKind(keep) ? undefined : answers.goalDate });
                  }}
                />
                <SheetButtons>
                  <button type="button" className="st-btn gold" onClick={() => go(1)}>Volgende</button>
                </SheetButtons>
              </>
            )}

            {step === 'target' && (
              <>
                <ChoiceList<'trek' | 'race'>
                  label={title.target}
                  options={TARGET_OPTIONS.map((o) => ({ value: o.id, label: o.label, note: o.note }))}
                  value={answers.goal === 'race' ? 'race' : 'trek'}
                  onPick={(goal) => onAnswers({ ...defaultAnswers(goal), race: answers.race, goalDate: answers.goalDate })}
                />
                <SheetButtons>
                  <button type="button" className="st-btn" onClick={() => go(-1)}>Terug</button>
                  <button type="button" className="st-btn gold" onClick={() => go(1)}>Volgende</button>
                </SheetButtons>
              </>
            )}

            {step === 'shelter' && (
              <>
                <ChoiceList<TrekShelter>
                  label={title.shelter}
                  options={SHELTER_OPTIONS.map((o) => ({ value: o.id, label: o.label, note: o.note }))}
                  value={answers.shelter ?? SHELTER_ADVICE}
                  advice={SHELTER_ADVICE}
                  onPick={(shelter) => set({ shelter })}
                />
                <SheetButtons>
                  <button type="button" className="st-btn" onClick={() => go(-1)}>Terug</button>
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
                    : `${answers.allowedDays.length} van 7 dagen. ${answers.allowedDays.length === 7 ? 'De beste dagen worden vanzelf gekozen.' : `Op ${answers.allowedDays.map((d) => WEEKDAY_NAMES[d - 1]).join(', ')}.`}`}
                </p>
                <SheetButtons>
                  {index > 0 && <button type="button" className="st-btn" onClick={() => go(-1)}>Terug</button>}
                  <button type="button" className="st-btn gold" disabled={tooFewDays} onClick={() => go(1)}>Volgende</button>
                </SheetButtons>
              </>
            )}

            {step === 'strength' && (
              <>
                {stronger ? (
                  <ChoiceList<number>
                    label={title.strength}
                    options={STRONGER_SESSIONS.map((n) => ({ value: n, label: `${n} keer per week` }))}
                    value={answers.strengthSessions ?? STRONGER_ADVICE}
                    advice={STRONGER_ADVICE}
                    onPick={(n) => set({ strength: true, strengthSessions: n })}
                  />
                ) : (
                <ChoiceList<'ja' | 'nee'>
                  label={title.strength}
                  options={[
                    { value: 'ja', label: 'Ja, met krachttraining' },
                    { value: 'nee', label: 'Nee, zonder', note: `Dan hoogstens ${maxDaysWithoutStrength()} trainingen per week: lopen en wandelen.` },
                  ]}
                  value={answers.strength ? 'ja' : 'nee'}
                  advice="ja"
                  onPick={(v) => set({ strength: v === 'ja' })}
                />
                )}
                {last && horizon.note && <p className="st-hint warn" role="status" style={{ marginLeft: 0, marginRight: 0 }}>{horizon.note}</p>}
                <SheetButtons>
                  {index > 0 && <button type="button" className="st-btn" disabled={horizon.busy} onClick={() => go(-1)}>Terug</button>}
                  {last ? (
                    <button type="button" className="st-btn gold" disabled={horizon.busy} onClick={() => { if (!tooSoon()) void makePlan(close); }}>
                      {horizon.busy ? 'Even rekenen…' : 'Bekijk je plan'}
                    </button>
                  ) : (
                    <button type="button" className="st-btn gold" onClick={() => go(1)}>Volgende</button>
                  )}
                </SheetButtons>
              </>
            )}

            {step === 'beginner' && (
              <>
                <ChoiceList<'ja' | 'nee'>
                  label={title.beginner}
                  options={[
                    { value: 'ja', label: 'Ja, ik begin weer', note: 'De eerste weken alleen makkelijk, en hoogstens vier dagen per week' },
                    { value: 'nee', label: 'Nee, ik sport geregeld', note: 'Meteen het gewone ritme van je richting' },
                  ]}
                  value={answers.beginner === undefined ? ('none' as 'ja') : answers.beginner ? 'ja' : 'nee'}
                  onPick={(v) => set({ beginner: v === 'ja' })}
                />
                {horizon.note && <p className="st-hint warn" role="status" style={{ marginLeft: 0, marginRight: 0 }}>{horizon.note}</p>}
                <SheetButtons>
                  <button type="button" className="st-btn" disabled={horizon.busy} onClick={() => go(-1)}>Terug</button>
                  <button type="button" className="st-btn gold" disabled={horizon.busy || answers.beginner === undefined} onClick={() => { if (!tooSoon()) void makePlan(close); }}>
                    {horizon.busy ? 'Even rekenen…' : 'Bekijk je plan'}
                  </button>
                </SheetButtons>
              </>
            )}
          </div>
        )}
      </Sheet>
      {horizon.sheet}
    </>
  );
}
