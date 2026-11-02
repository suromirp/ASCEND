import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import type { SettingsFacts } from '../../../engine/settingsSummary';
import { resolveSportCounting } from '../../../engine/sportRole';
import { CHOICES, choiceShort } from '../../../data/settingsChoices';
import type { usePlanSettingChange } from '../usePlanSettingChange';
import { BundleSheet } from './BundleSheet';
import { ChoiceFromDef } from './ChoiceFromDef';
import { SummaryRow } from './SummaryRow';

// Hoe sporten meetellen (docs/visie/Sporten die meetellen.md, 4): een blad met de keuzes, in Planning en
// onderaan het scherm Sporten. Vragen of niet verandert je planning niet en wordt meteen bewaard. De rust na
// een zware sport bepaalt wat de weekcheck ziet; die gaat langs het voorstel (usePlanSettingChange).
export function SportCountingSheet({ facts, plan, onClose }: { facts: SettingsFacts; plan: ReturnType<typeof usePlanSettingChange>; onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const [rest, setRest] = useState(false);
  const current = resolveSportCounting(settings.sportCounting).rest;
  return (
    <>
      <BundleSheet eyebrow="Planning" title="Hoe sporten meetellen" line="Zwemmen, padel en voetbal: wat ASCEND je vraagt." onClose={onClose}>
        <SummaryRow id="sport-vragen" title="Vragen bij een nieuwe sport" facts={facts} onChange={(on) => void updateSettings({ sportCounting: { ...settings.sportCounting, askNew: on } })} />
        <SummaryRow id="sport-zwaarte" title="Vragen hoe zwaar het was" facts={facts} onChange={(on) => void updateSettings({ sportCounting: { ...settings.sportCounting, askFelt: on } })} />
        <SummaryRow id="sport-rust" title="Rust na een zware sport" facts={facts} onClick={() => setRest(true)} />
      </BundleSheet>
      {rest && (
        <ChoiceFromDef
          def={CHOICES.sportRust}
          value={current}
          onPick={(v) => {
            if (v === current) return;
            void plan.changeSetting(`Rust na een zware sport: ${choiceShort('sportRust', v)}`, { sportCounting: { ...settings.sportCounting, rest: v } }, 'Volgt je keuze voor rust na een zware sport.');
          }}
          onClose={() => setRest(false)}
        />
      )}
    </>
  );
}
