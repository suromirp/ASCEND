// ASCEND — body weight, about every two weeks (engine/bodyWeight.ts).
// WeightReminder is one line in Today's "Je dag" only when an entry is due; WeightSettingsCard
// lives in Settings for entering it any time.
//
// With weight from a MacroFactor export (pages/MacroFactorImport.tsx) of the
// last two weeks there is nothing to ask: the line on Today stays away and
// the card in Settings says where the number comes from.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { addWeightEntry, freshMacroFactorWeight, latestWeight, weightDue, weightsInUse, WEIGHT_REMINDER_DAYS } from '../engine/bodyWeight';
import { activeIllness } from '../engine/illness';
import { formatDateNL, todayISO } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { NumberField } from './NumberField';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';
import { DayRow } from './vandaag/DayRow';
import { TodaySheet } from './vandaag/TodaySheet';

function useSaveWeight() {
  const { settings, updateSettings } = useAppData();
  return async (kg: number) => {
    await updateSettings({ weightEntries: addWeightEntry(settings.weightEntries, { date: todayISO(), kg, source: 'manual' }) });
  };
}

export function WeightReminder() {
  const { settings, updateSettings } = useAppData();
  const save = useSaveWeight();
  const navigate = useNavigate();
  const entries = weightsInUse(settings.weightEntries, settings.weightFromMacroFactor);
  const [kg, setKg] = useState<number | undefined>(latestWeight(entries)?.kg);
  const [open, setOpen] = useState(false);
  const today = todayISO();
  if (activeIllness(settings.illnessEpisodes) || !weightDue(entries, settings.weightReminderSnoozedAt, today, settings.weightReminderDays ?? WEIGHT_REMINDER_DAYS)) return null;
  // The weight comes from MacroFactor and is recent: nothing to ask.
  if (freshMacroFactorWeight(settings.weightEntries, settings.weightFromMacroFactor, today)) return null;
  const last = latestWeight(entries);
  return (
    <>
      <DayRow label="Gewicht" onClick={() => setOpen(true)}>Trendgewicht bijwerken</DayRow>
      {open && (
        <TodaySheet eyebrow="GEWICHT BIJWERKEN" onClose={() => setOpen(false)}>
          {(close) => (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                {last?.source === 'macrofactor'
                  ? `Je laatste gewicht uit MacroFactor is van ${formatDateNL(last.date)}. Lees een nieuwe export in, of vul je trendgewicht zelf in; een globaal getal is genoeg.`
                  : last
                  ? `Je laatste gewicht is van ${formatDateNL(last.date)}. Vul je trendgewicht uit MacroFactor in; een globaal getal is genoeg.`
                  : 'Vul je trendgewicht in, bijvoorbeeld uit MacroFactor. ASCEND gebruikt het alleen voor rugzakgewicht en eiwit per kilo; een globaal getal is genoeg.'}
              </p>
              <NumberField label="Trendgewicht" unit="kg" decimals={1} compact value={kg} onChange={setKg} />
              {last?.source === 'macrofactor' && (
                <SecondaryButton onClick={() => { close(); navigate('/koppelen/macrofactor'); }}>Export van MacroFactor inlezen</SecondaryButton>
              )}
              <div className="flex items-center gap-4">
                <PrimaryButton fullWidth={false} disabled={!kg} onClick={() => { if (kg) { void save(kg); close(); } }}>Opslaan</PrimaryButton>
                <button onClick={() => { void updateSettings({ weightReminderSnoozedAt: today }); close(); }} className="inline-flex min-h-[44px] items-center text-sm underline" style={{ color: 'var(--color-ink-dim)' }}>
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

const REMINDER_OPTIONS = [
  { days: 7, label: 'elke week' },
  { days: 14, label: 'elke 2 weken' },
  { days: 28, label: 'elke 4 weken' },
  { days: 0, label: 'nooit' },
];

export function WeightSettingsCard() {
  const { settings, updateSettings } = useAppData();
  const save = useSaveWeight();
  const navigate = useNavigate();
  const entries = weightsInUse(settings.weightEntries, settings.weightFromMacroFactor);
  const last = latestWeight(entries);
  const fresh = freshMacroFactorWeight(settings.weightEntries, settings.weightFromMacroFactor, todayISO());
  const [kg, setKg] = useState<number | undefined>(last?.kg);
  const [saved, setSaved] = useState(false);
  const [byHand, setByHand] = useState(false);
  const fromMacroFactor = !!fresh && !byHand;
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>LICHAAMSGEWICHT</Eyebrow>
      {fromMacroFactor && fresh ? (
        <>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            Gewicht komt uit MacroFactor (bijgewerkt op {formatDateNL(fresh.date)}).
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            {fresh.basis === 'trend' ? `Je trendgewicht is ${formatNumberNL(fresh.kg, 1)} kg` : `Je gewicht is ${formatNumberNL(fresh.kg, 1)} kg`}
            {fresh.basis === 'trend' && fresh.scaleKg !== undefined ? `, de weegschaal gaf ${formatNumberNL(fresh.scaleKg, 1)} kg` : ''}.
            {fresh.basis === 'trend' ? ' ASCEND rekent met het trendgewicht, omdat dat rustiger is dan één weging.' : ' In de export stond geen trendgewicht, dus ASCEND rekent met de weging zelf.'}
            {' '}Het telt voor rugzakgewicht als deel van je lichaamsgewicht en voor de beenindex.
          </p>
          <SecondaryButton onClick={() => navigate('/koppelen/macrofactor')}>Nieuwe export inlezen</SecondaryButton>
          <button onClick={() => setByHand(true)} className="inline-flex min-h-[44px] items-center self-start text-sm underline" style={{ color: 'var(--color-ink-dim)' }}>
            Zelf invullen
          </button>
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            Je trendgewicht, bijvoorbeeld uit MacroFactor, ongeveer elke twee weken. ASCEND gebruikt het voor rugzakgewicht als deel van je lichaamsgewicht en eiwit per kilo.
            {last ? ` Laatst ingevuld: ${formatNumberNL(last.kg, 1)} kg op ${formatDateNL(last.date)}.` : ''}
          </p>
          <NumberField label="Trendgewicht" unit="kg" decimals={1} compact value={kg} onChange={(v) => { setKg(v); setSaved(false); }} />
          <PrimaryButton disabled={!kg} onClick={async () => { if (kg) { await save(kg); setSaved(true); } }}>Opslaan</PrimaryButton>
          {saved && <p className="text-xs" style={{ color: 'var(--color-success-text)' }}>Opgeslagen.</p>}
        </>
      )}
      <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Herinnering op Vandaag</p>
      <div className="flex flex-wrap gap-1.5">
        {REMINDER_OPTIONS.map((o) => {
          const active = (settings.weightReminderDays ?? WEIGHT_REMINDER_DAYS) === o.days;
          return (
            <button
              key={o.days}
              onClick={() => void updateSettings({ weightReminderDays: o.days })}
              className="min-h-[44px] rounded-full border px-3 py-1 text-xs"
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
