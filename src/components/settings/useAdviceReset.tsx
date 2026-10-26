import type { ReactNode } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { resetPatch } from '../../engine/settingsDiff';
import { usePlanSettingChange } from './usePlanSettingChange';

// Instellingen terugzetten naar het advies (engine/settingsDiff.ts). Wat de planning niet
// raakt gaat meteen; wat haar wel raakt (ambitie, de lange zondag, rust na een bergtocht, ...)
// gaat samen in één voorstel met Akkoord, nooit stil (usePlanSettingChange).
export function useAdviceReset(): {
  reset: (ids: string[], label: string) => Promise<void>;
  impact: ReactNode;
  note: string | null;
  // Een voorstel wordt berekend of staat open: nog niet nog een starten.
  busy: boolean;
} {
  const { settings, updateSettings } = useAppData();
  const plan = usePlanSettingChange();

  async function reset(ids: string[], label: string) {
    if (plan.busy) return;
    const { now, plan: planPatch, planTitles } = resetPatch(settings, ids);
    if (Object.keys(now).length > 0) await updateSettings(now);
    if (planTitles.length > 0) await plan.changeSetting(label, planPatch, 'Je zet dit terug naar het advies.');
  }

  return { reset, impact: plan.impact, note: plan.note, busy: plan.busy };
}
