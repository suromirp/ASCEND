// ASCEND — body weight, about every two weeks (engine/bodyWeight.ts).
// WeightReminder is one line in Today's "Je dag" only when an entry is due; the weight itself
// can be entered any time in Instellingen, Lichaam (components/settings/groups/LichaamSheets.tsx).
//
// With weight from a MacroFactor export (pages/MacroFactorImport.tsx) of the
// last two weeks there is nothing to ask: the line on Today stays away and
// the sheet in Instellingen says where the number comes from.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { addWeightEntry, freshMacroFactorWeight, latestWeight, weightDue, weightsInUse, WEIGHT_REMINDER_DAYS } from '../engine/bodyWeight';
import { activeIllness } from '../engine/illness';
import { formatDateNL, todayISO } from '../utils/dates';
import { NumberField } from './NumberField';
import { PrimaryButton, SecondaryButton } from './ui';
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
        <TodaySheet eyebrow="Gewicht bijwerken" onClose={() => setOpen(false)}>
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
              <div className="flex gap-3">
                <PrimaryButton fullWidth={false} disabled={!kg} onClick={() => { if (kg) { void save(kg); close(); } }}>Opslaan</PrimaryButton>
                <SecondaryButton onClick={() => { void updateSettings({ weightReminderSnoozedAt: today }); close(); }}>
                  Niet nu
                </SecondaryButton>
              </div>
            </div>
          )}
        </TodaySheet>
      )}
    </>
  );
}
