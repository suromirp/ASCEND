import { useAppData } from '../../../state/AppDataContext';
import { DIRECTIONS, GUIDELINE_MINUTES, GUIDELINE_STRENGTH, MINUTES_CEILING } from '../../../data/directions';
import { belowGuideline, budgetFor, settingBudget, type WeekBudgetChoice } from '../../../engine/weekBudget';
import { Stepper } from '../../ui';
import { TextButton } from '../../TextButton';
import { SettingsList, SettingsRow } from '../SettingsList';
import { Sheet } from '../Sheet';
import type { AppSettings } from '../../../storage/database';

const MINUTE_STEP = 15;
const MIN_MINUTES = 30;
const MAX_STRENGTH = 4;

// Het weekbudget: minuten per week, keren kracht en of pittige minuten dubbel tellen. Wat je
// kiest wordt bewaard in AppSettings.weekBudget; wat gelijk is aan het advies wordt weggelaten,
// zodat "aangepast" alleen klopt voor wat je echt anders koos. Het leest alleen wat je deed:
// de planning verandert er niet van.
export function WeekBudgetSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const { id, chosen, budget, choice } = settingBudget(settings);
  const advice = budgetFor(id);
  const label = DIRECTIONS[id].label;

  function save(next: WeekBudgetChoice) {
    const stored: NonNullable<AppSettings['weekBudget']> = {
      ...(next.minutes !== undefined && next.minutes !== advice.minutes ? { minutes: next.minutes } : {}),
      ...(next.strength !== undefined && next.strength !== advice.strength ? { strength: next.strength } : {}),
      ...(next.doubleHard ? {} : { doubleHard: false }),
    };
    void updateSettings({ weekBudget: Object.keys(stored).length > 0 ? stored : undefined });
  }
  const changed = choice.minutes !== undefined || choice.strength !== undefined || !choice.doubleHard;

  return (
    <Sheet eyebrow="Doel en tochten" title="Weekbudget" line="Hoeveel een week vraagt als je geen doel hebt." onClose={onClose}>
      <div className="flex flex-col gap-4">
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
        <Stepper
          label="Keer kracht per week"
          display={<span className="font-sans tabular-nums">{budget.strength} keer</span>}
          decLabel="Minder keer kracht"
          incLabel="Meer keer kracht"
          decDisabled={budget.strength <= 1}
          incDisabled={budget.strength >= MAX_STRENGTH}
          onDec={() => save({ ...choice, minutes: budget.minutes, strength: budget.strength - 1 })}
          onInc={() => save({ ...choice, minutes: budget.minutes, strength: budget.strength + 1 })}
        />
        <SettingsList>
          <SettingsRow id="weekbudget-dubbel" title="Pittige minuten tellen dubbel" kind="toggle" checked={choice.doubleHard} onChange={(on) => save({ ...choice, doubleHard: on, minutes: budget.minutes, strength: budget.strength })} />
        </SettingsList>
      </div>
      <p className="st-hint" style={{ marginLeft: 0 }}>
        {chosen ? `Advies bij ${label}: ${advice.minutes} min, ${advice.strength} keer kracht.` : `Advies: ${advice.minutes} min, ${advice.strength} keer kracht. De richtlijn is ${GUIDELINE_MINUTES} minuten en ${GUIDELINE_STRENGTH} keer kracht.`}
      </p>
      {belowGuideline(budget) && (
        <p className="st-hint" style={{ marginLeft: 0 }}>Dit is onder de richtlijn van {GUIDELINE_MINUTES} minuten en {GUIDELINE_STRENGTH} keer kracht. Dat mag een keuze zijn.</p>
      )}
      <p className="st-hint" style={{ marginLeft: 0 }}>Het budget leest alleen wat je deed. Je planning verandert er niet van.</p>
      {changed && <TextButton onClick={() => void updateSettings({ weekBudget: undefined })}>Terug naar het advies</TextButton>}
    </Sheet>
  );
}
