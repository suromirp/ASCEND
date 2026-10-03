// ASCEND — body weight, about every two weeks (engine/bodyWeight.ts).
// WeightReminder sits on Today only when an entry is due; WeightSettingsCard
// lives in Settings for entering it any time.

import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { addWeightEntry, latestWeight, weightDue, WEIGHT_REMINDER_DAYS } from '../engine/bodyWeight';
import { activeIllness } from '../engine/illness';
import { formatDateNL, todayISO } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { NumberField } from './NumberField';
import { Card, Eyebrow, PrimaryButton } from './ui';

function useSaveWeight() {
  const { settings, updateSettings } = useAppData();
  return async (kg: number) => {
    await updateSettings({ weightEntries: addWeightEntry(settings.weightEntries, { date: todayISO(), kg, source: 'manual' }) });
  };
}

export function WeightReminder() {
  const { settings, updateSettings } = useAppData();
  const save = useSaveWeight();
  const [kg, setKg] = useState<number | undefined>(latestWeight(settings.weightEntries)?.kg);
  const today = todayISO();
  if (activeIllness(settings.illnessEpisodes) || !weightDue(settings.weightEntries, settings.weightReminderSnoozedAt, today, settings.weightReminderDays ?? WEIGHT_REMINDER_DAYS)) return null;
  const last = latestWeight(settings.weightEntries);
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>GEWICHT BIJWERKEN</Eyebrow>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        {last
          ? `Je laatste gewicht is van ${formatDateNL(last.date)}. Vul je trendgewicht uit MacroFactor in; een globaal getal is genoeg.`
          : 'Vul je trendgewicht in, bijvoorbeeld uit MacroFactor. ASCEND gebruikt het alleen voor rugzakgewicht en eiwit per kilo; een globaal getal is genoeg.'}
      </p>
      <NumberField label="Trendgewicht" unit="kg" decimals={1} compact value={kg} onChange={setKg} />
      <div className="flex items-center gap-4">
        <PrimaryButton fullWidth={false} disabled={!kg} onClick={() => kg && void save(kg)}>OPSLAAN</PrimaryButton>
        <button onClick={() => void updateSettings({ weightReminderSnoozedAt: today })} className="text-xs underline" style={{ color: 'var(--color-ink-dim)' }}>
          later
        </button>
      </div>
    </Card>
  );
}

const REMINDER_OPTIONS = [
  { days: 7, label: 'elke week' },
  { days: 14, label: 'elke 2 weken' },
  { days: 28, label: 'elke 4 weken' },
  { days: 0, label: 'nooit' },
];

export function WeightSettingsCard() {
  const { settings, updateSettings } = useAppData();
  const save = useSaveWeight();
  const last = latestWeight(settings.weightEntries);
  const [kg, setKg] = useState<number | undefined>(last?.kg);
  const [saved, setSaved] = useState(false);
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>LICHAAMSGEWICHT</Eyebrow>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Je trendgewicht, bijvoorbeeld uit MacroFactor, ongeveer elke twee weken. ASCEND gebruikt het voor rugzakgewicht als deel van je lichaamsgewicht en eiwit per kilo.
        {last ? ` Laatst ingevuld: ${formatNumberNL(last.kg, 1)} kg op ${formatDateNL(last.date)}.` : ''}
      </p>
      <NumberField label="Trendgewicht" unit="kg" decimals={1} compact value={kg} onChange={(v) => { setKg(v); setSaved(false); }} />
      <PrimaryButton disabled={!kg} onClick={async () => { if (kg) { await save(kg); setSaved(true); } }}>OPSLAAN</PrimaryButton>
      {saved && <p className="text-xs" style={{ color: 'var(--color-success)' }}>Opgeslagen.</p>}
      <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Herinnering op Vandaag</p>
      <div className="flex flex-wrap gap-1.5">
        {REMINDER_OPTIONS.map((o) => {
          const active = (settings.weightReminderDays ?? WEIGHT_REMINDER_DAYS) === o.days;
          return (
            <button
              key={o.days}
              onClick={() => void updateSettings({ weightReminderDays: o.days })}
              className="rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: active ? 'var(--color-gold)' : 'var(--color-card-border)', color: active ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
