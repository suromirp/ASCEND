import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { DIRECTIONS, GUIDELINE_MINUTES, GUIDELINE_STRENGTH, MINUTES_CEILING } from '../../../data/directions';
import { belowGuideline, budgetFor, resolveWeekBudget, settingBudget, type WeekBudgetChoice } from '../../../engine/weekBudget';
import { PrimaryButton, Stepper } from '../../ui';
import { belowGuidelineLine, weekBudgetAdviceLine, weekBudgetFollowNote } from '../../../engine/weekBudgetText';
import { strengthTrainingOn } from '../../../engine/strengthTraining';
import { TextButton } from '../../TextButton';
import { SettingsList, SettingsRow } from '../SettingsList';
import { Sheet } from '../Sheet';
import type { AppSettings } from '../../../storage/database';

const MINUTE_STEP = 15;
const MIN_MINUTES = 30;
const MAX_STRENGTH = 4;

// Het weekbudget: minuten per week, keren kracht en of pittige minuten dubbel tellen. Wat je
// kiest wordt bewaard in AppSettings.weekBudget; wat gelijk is aan het advies wordt weggelaten,
// zodat "aangepast" alleen klopt voor wat je echt anders koos.
//
// Volgt je plan een richting (een gekozen richting en een plan), dan verandert het budget de
// lengte van je trainingen (engine/directionPlan.ts). Dan is het eerst een keuze in het blad en
// opent "Bekijk wat er verandert" het voorstel met Akkoord (`onPropose`). Anders telt het alleen
// wat je deed en wordt het meteen bewaard.
export function WeekBudgetSheet({ onClose, onPropose }: { onClose: () => void; onPropose?: (weekBudget: AppSettings['weekBudget']) => void }) {
  const { settings, updateSettings, program } = useAppData();
  const stored = settingBudget(settings);
  const follows = !!onPropose && stored.chosen && !!program;
  const [draft, setDraft] = useState<WeekBudgetChoice>(stored.choice);
  const choice = follows ? draft : stored.choice;
  const { id, chosen } = stored;
  const advice = budgetFor(id);
  const budget = budgetFor(id, { choice });
  const label = DIRECTIONS[id].label;
  // Met krachttraining uit telt het budget geen kracht (engine/strengthTraining.ts): dan verdwijnt de stepper.
  const strengthOn = strengthTrainingOn(settings);

  function toStored(next: WeekBudgetChoice): AppSettings['weekBudget'] {
    const kept: NonNullable<AppSettings['weekBudget']> = {
      ...(next.minutes !== undefined && next.minutes !== advice.minutes ? { minutes: next.minutes } : {}),
      ...(next.strength !== undefined && next.strength !== advice.strength ? { strength: next.strength } : {}),
      ...(next.doubleHard ? {} : { doubleHard: false }),
    };
    return Object.keys(kept).length > 0 ? kept : undefined;
  }
  function save(next: WeekBudgetChoice) {
    if (follows) { setDraft(resolveWeekBudget(toStored(next))); return; }
    void updateSettings({ weekBudget: toStored(next) });
  }
  const changed = choice.minutes !== undefined || choice.strength !== undefined || !choice.doubleHard;
  const differs = JSON.stringify(toStored(draft) ?? null) !== JSON.stringify(toStored(stored.choice) ?? null);

  return (
    <Sheet eyebrow="Doel en tochten" title="Weekbudget" line="Hoeveel een week vraagt als je geen doel hebt." onClose={onClose}>
      {(close) => (
      <>
      <div className="flex flex-col gap-4">
        {id === 'improve' ? (
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Bij Fitter worden beginnen de minuten bij het gemiddelde van je laatste vier weken en groeien ze per golf. Daarom kies je ze hier niet zelf.</p>
        ) : (
        <Stepper
          label="Minuten per week"
          display={<span className="font-sans tabular-nums">{budget.minutes} min</span>}
          decLabel="Minder minuten"
          incLabel="Meer minuten"
          decDisabled={budget.minutes <= MIN_MINUTES}
          incDisabled={budget.minutes >= MINUTES_CEILING}
          onDec={() => save({ ...choice, minutes: Math.max(MIN_MINUTES, budget.minutes - MINUTE_STEP), strength: budget.strength })}
          onInc={() => save({ ...choice, minutes: Math.min(MINUTES_CEILING, budget.minutes + MINUTE_STEP), strength: budget.strength })}
        />
        )}
        {strengthOn ? (
          <Stepper
            label="Keer kracht per week"
            display={<span className="font-sans tabular-nums">{budget.strength} keer</span>}
            decLabel="Minder keer kracht"
            incLabel="Meer keer kracht"
            decDisabled={budget.strength <= (id === 'stronger' ? 2 : 1)}
            incDisabled={budget.strength >= MAX_STRENGTH}
            onDec={() => save({ ...choice, minutes: budget.minutes, strength: budget.strength - 1 })}
            onInc={() => save({ ...choice, minutes: budget.minutes, strength: budget.strength + 1 })}
          />
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Krachttraining staat uit, dus het budget telt geen kracht. Je zet het aan bij Sporten.</p>
        )}
        <SettingsList>
          <SettingsRow id="weekbudget-dubbel" title="Pittige minuten tellen dubbel" kind="toggle" checked={choice.doubleHard} onChange={(on) => save({ ...choice, doubleHard: on, minutes: budget.minutes, strength: budget.strength })} />
        </SettingsList>
      </div>
      <p className="st-hint" style={{ marginLeft: 0 }}>
        {weekBudgetAdviceLine({ chosen, label, minutes: advice.minutes, strength: advice.strength, guidelineMinutes: GUIDELINE_MINUTES, guidelineStrength: GUIDELINE_STRENGTH }, strengthOn)}
      </p>
      {belowGuideline(budget, strengthOn) && (
        <p className="st-hint" style={{ marginLeft: 0 }}>{belowGuidelineLine(strengthOn)}</p>
      )}
      <p className="st-hint" style={{ marginLeft: 0 }}>
        {weekBudgetFollowNote(follows, strengthOn)}
      </p>
      {changed && <TextButton onClick={() => save({ doubleHard: true })}>Terug naar het advies</TextButton>}
      {follows && (
        <div className="mt-3">
          <PrimaryButton disabled={!differs} onClick={() => { const next = toStored(draft); close(); window.setTimeout(() => onPropose?.(next), 280); }}>Bekijk wat er verandert</PrimaryButton>
        </div>
      )}
      </>
      )}
    </Sheet>
  );
}
