import { useMemo, useState } from 'react';
import type { GoalDetails, GoalPriority, TrainingGoal } from '../../models/goals';
import { GOAL_PRIORITIES } from '../../models/goals';
import { PRIORITY_NAME } from '../../engine/goalLabels';
import { labelLine, weeksWord } from '../../engine/goalList';
import {
  ADD_TILES, applyGoalEdit, buildGoalDraft, defaultDetails, detailsFromGoal, draftProblems, kindOfTile, limitText, paceText, questionsFor, RACE_KM, suggestPriority, tileOfGoal, type AddTileId,
} from '../../engine/goalDraft';
import { daysBetween, todayISO, weekdayLongNL } from '../../utils/dates';
import { makeId } from '../../utils/id';
import { Pictogram } from '../pictograms';
import { Chip, Eyebrow, PrimaryButton } from '../ui';
import { NumberField } from '../NumberField';
import { TextButton } from '../TextButton';
import { Sheet } from '../settings/Sheet';
import { LabelBars } from './GoalLabel';

// Het blad om een doel toe te voegen (drie stappen: de soort, een paar vragen, en dan het voorstel
// met Akkoord) en om een doel aan te passen (alleen de vragen, met wat er al staat ingevuld). Beide
// stellen de vragen van de doelsoort uit data/goalKinds.ts: geen losse eisen met een sport per
// regel. Het doel wordt hier alleen opgebouwd, nooit opgeslagen; de pagina maakt er een voorstel
// van. Eén gevulde mint knop (Volgende), Annuleren als tekstknop.
const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' };

export function GoalFormSheet({
  existing, mainGoalId, goal, initialTile, initialDetails, onSubmit, onClose,
}: {
  // Alle doelen, voor het voorgestelde label en de volgorde van een nieuw doel.
  existing: TrainingGoal[];
  // Het doel met de mijlpalen (altijd Top), voor het voorgestelde label.
  mainGoalId?: string;
  // Een doel dat wordt aangepast; zonder is het een nieuw doel.
  goal?: TrainingGoal;
  initialTile?: AddTileId;
  initialDetails?: GoalDetails;
  // Sluit het blad en opent het voorstel voor dit doel.
  onSubmit: (result: TrainingGoal, close: () => void) => void;
  onClose: () => void;
}) {
  const today = todayISO();
  const editing = !!goal;
  // Een doel dat nog geen soort heeft (de opstartstap zet hem bij het volgende openen) krijgt de gegeven soort.
  const startTile = goal ? (tileOfGoal(goal) ?? initialTile) : initialTile;
  const [tileId, setTileId] = useState<AddTileId | undefined>(startTile);
  const [step, setStep] = useState<1 | 2>(startTile ? 2 : 1);
  const [details, setDetails] = useState<GoalDetails>(() => (goal ? { ...(startTile ? defaultDetails(startTile) : {}), ...detailsFromGoal(goal) } : { ...(initialTile ? defaultDetails(initialTile) : {}), ...(initialDetails ?? {}) }));
  const [date, setDate] = useState(goal?.targetDate ?? '');
  const [name, setName] = useState(goal?.name ?? '');
  const [picked, setPicked] = useState<GoalPriority | undefined>(undefined);
  const live = existing.filter((g) => g.status !== 'archived');
  const tile = ADD_TILES.find((t) => t.id === tileId);
  const dateValue = date || undefined;
  const priority = picked ?? suggestPriority(live, dateValue, mainGoalId);
  const problems = tileId ? draftProblems(tileId, details, dateValue, today, goal?.targetDate, goal && tileId === startTile ? detailsFromGoal(goal) : undefined) : [];
  const nextOrder = live.reduce((m, g, i) => Math.max(m, (g.order ?? i) + 1), 0);
  const questions = useMemo(() => (tileId ? questionsFor(tileId).filter((q) => !q.showIf || q.showIf(details)) : []), [tileId, details]);

  const set = (key: keyof GoalDetails, value: unknown) => setDetails((d) => ({ ...d, [key]: value }));
  const needsDate = tileId ? tileId !== 'fit' && tileId !== 'stronger' : true;
  const km = details.variant && RACE_KM[details.variant] !== undefined ? RACE_KM[details.variant] : details.distanceKm;

  if (step === 1 || !tile || !tileId) {
    return (
      <Sheet eyebrow={editing ? 'Doel aanpassen' : 'Doel toevoegen · stap 1 van 3'} title="Wat wil je bereiken?" line="Kies een soort. Dan volgen er een paar vragen." onClose={onClose}>
        {(close) => (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Soort doel">
              {ADD_TILES.map((t) => {
                const on = t.id === tileId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => { setTileId(t.id); setDetails((d) => ({ ...defaultDetails(t.id), ...d })); }}
                    className="flex min-h-[108px] flex-col items-start gap-1.5 rounded-2xl border p-3 text-left"
                    style={{ borderColor: on ? 'var(--color-action)' : 'var(--color-card-border)', background: on ? 'var(--color-action-muted)' : 'var(--color-card)' }}
                  >
                    <Pictogram name={t.picto} size={28} />
                    <span className="text-base font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{t.label}</span>
                    <span className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{t.summary}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col items-stretch gap-1">
              <PrimaryButton onClick={() => setStep(2)} disabled={!tileId}>Volgende</PrimaryButton>
              <TextButton tone="dim" onClick={close} className="self-center">Annuleren</TextButton>
            </div>
          </div>
        )}
      </Sheet>
    );
  }

  const weeks = date ? Math.ceil(daysBetween(today, date) / 7) : undefined;
  const nameDefault = tileId ? buildGoalDraft({ id: 'concept', now: today, tile: tileId, details, date: dateValue, name: '', priority, order: 0 }).name : '';
  const concept = tileId ? buildGoalDraft({ id: 'concept', now: today, tile: tileId, details, date: dateValue, name: '', priority, order: 0 }) : undefined;
  const count = questions.length;
  const submit = (close: () => void) => {
    const now = new Date().toISOString();
    if (goal) onSubmit(applyGoalEdit(goal, { tile: tileId, details, date: dateValue, name, now }), close);
    else onSubmit(buildGoalDraft({ id: makeId('goal'), now, tile: tileId, details, date: dateValue, name, priority, order: nextOrder }), close);
  };

  return (
    <Sheet
      eyebrow={editing ? 'Doel aanpassen' : 'Doel toevoegen · stap 2 van 3'}
      title={tile.label}
      line={editing ? 'Eerst een voorstel, pas daarna verandert er iets.' : `${count === 0 ? 'Een paar keuzes' : count === 1 ? 'Eén vraag' : `${count} vragen`}, en alles kun je later nog aanpassen.`}
      onClose={onClose}
    >
      {(close) => (
        <div className="flex flex-col gap-5">
          {questions.map((q) => (
            <div key={q.key} className="flex flex-col gap-2">
              {q.choices ? (
                <>
                  <span className="text-base" style={{ color: 'var(--color-ink)' }}>{q.label}{!q.required && <span style={{ color: 'var(--color-ink-dim)' }}> (mag leeg)</span>}</span>
                  <div className="st-chips">
                    {q.choices.map((c) => (
                      <Chip key={c.value} selected={details[q.key] === c.value} onClick={() => set(q.key, details[q.key] === c.value && !q.required ? undefined : c.value)}>{c.label}</Chip>
                    ))}
                  </div>
                </>
              ) : (
                <NumberField
                  label={`${q.label}${q.required ? '' : ' (mag leeg)'}`}
                  unit={q.unit === 'keuze' ? undefined : q.unit}
                  decimals={q.unit === 'km' || q.unit === 'kg' ? 1 : 0}
                  value={typeof details[q.key] === 'number' ? (details[q.key] as number) : undefined}
                  onChange={(v) => set(q.key, v)}
                  helper={q.key === 'targetMinutes' ? paceText(km, details.targetMinutes) : q.key === 'timeLimitMinutes' || q.key === 'cutoffMinutes' ? limitText(details[q.key]) : undefined}
                  tall
                />
              )}
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <label htmlFor="goal-date" className="text-base" style={{ color: 'var(--color-ink)' }}>{needsDate ? 'Wanneer is het?' : <>Datum<span style={{ color: 'var(--color-ink-dim)' }}> (mag leeg)</span></>}</label>
            <input id="goal-date" type="date" value={date} min={goal?.targetDate && goal.targetDate < today ? undefined : today} onChange={(e) => setDate(e.target.value)} className="min-h-[48px] w-full rounded-xl border px-3 text-base" style={fieldStyle} />
            {date && weeks !== undefined && weeks > 0 && <p className="text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{weekdayLongNL(date)}, over {weeksWord(weeks)}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="goal-name" className="text-base" style={{ color: 'var(--color-ink)' }}>Hoe noem je dit doel?</label>
            <input id="goal-name" type="text" value={name} placeholder={goal ? goal.name : nameDefault} onChange={(e) => setName(e.target.value)} className="min-h-[48px] w-full rounded-xl border px-3 text-base" style={fieldStyle} />
          </div>

          {!editing && (
            <div className="flex flex-col gap-2">
              <Eyebrow>Hoe belangrijk is dit doel voor jou?</Eyebrow>
              <div className="st-list" role="radiogroup" aria-label="Label van dit doel">
                {GOAL_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={priority === p}
                    onClick={() => setPicked(p)}
                    className="flex min-h-[64px] w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0"
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: priority === p ? 'var(--color-action)' : 'var(--color-control-border)' }} aria-hidden="true">
                      {priority === p && <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-action)' }} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--color-ink)' }}><LabelBars priority={p} />{PRIORITY_NAME[p]}</span>
                      <span className="mt-0.5 block text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{concept ? labelLine({ ...concept, kind: kindOfTile(tileId, details) }, p) : ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {problems.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-sm" style={{ color: 'var(--color-ink-dim)' }} aria-live="polite">
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          <div className="flex flex-col items-stretch gap-1">
            <PrimaryButton disabled={problems.length > 0} onClick={() => submit(close)}>Volgende</PrimaryButton>
            <TextButton tone="dim" onClick={() => (!editing && !initialTile ? setStep(1) : close())} className="self-center">{!editing && !initialTile ? 'Terug' : 'Annuleren'}</TextButton>
          </div>
        </div>
      )}
    </Sheet>
  );
}
