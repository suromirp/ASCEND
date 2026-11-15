import { useState, type ReactNode } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { RESET_NOW_NOTE, resetDeclinedNote, resetPatch } from '../../engine/settingsDiff';
import { usePlanSettingChange } from './usePlanSettingChange';

// Instellingen terugzetten naar het advies (engine/settingsDiff.ts). Wat de planning niet
// raakt gaat meteen, met een regel als uitkomst; wat haar wel raakt (ambitie, de lange zondag,
// de beginnersstart, ...) gaat samen in één voorstel met Akkoord of Liever niet, altijd, ook als
// je bij Wijzigingen kleine wijzigingen automatisch laat doorvoeren: terugzetten is geen keuze
// per instelling, dus je ziet eerst wat er verandert (backlog Q, 15 november; alwaysAsk).
export function useAdviceReset(): {
  reset: (ids: string[], label: string) => Promise<void>;
  impact: ReactNode;
  note: string | null;
  // Een voorstel wordt berekend of staat open: nog niet nog een starten.
  busy: boolean;
} {
  const { settings, updateSettings } = useAppData();
  const plan = usePlanSettingChange();
  const [note, setNote] = useState<string | null>(null);

  async function reset(ids: string[], label: string) {
    if (plan.busy) return;
    setNote(null);
    const { now, plan: planPatch, planTitles } = resetPatch(settings, ids);
    const nowCount = Object.keys(now).length;
    if (nowCount > 0) await updateSettings(now);
    if (planTitles.length === 0) {
      if (nowCount > 0) setNote(RESET_NOW_NOTE);
      return;
    }
    // Krachttraining weer aan: de krachttrainingen komen in hetzelfde Akkoord terug (engine/strengthTraining.ts).
    const strengthBack = 'strengthTraining' in planPatch ? plan.strengthItems(true) : [];
    await plan.changeSetting(label, planPatch, 'Je zet dit terug naar het advies.', {
      alwaysAsk: true,
      ...(strengthBack.length > 0 ? { startItems: strengthBack } : {}),
      notes: planTitles,
      notesTitle: 'Gaat terug naar het advies',
      declined: resetDeclinedNote(nowCount > 0),
    });
  }

  return { reset, impact: plan.impact, note: plan.note ?? note, busy: plan.busy };
}
