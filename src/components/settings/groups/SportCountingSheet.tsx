import { useAppData } from '../../../state/AppDataContext';
import type { SettingsFacts } from '../../../engine/settingsSummary';
import { BundleSheet } from './BundleSheet';
import { SummaryRow } from './SummaryRow';

// Hoe sporten meetellen (docs/visie/Sporten die meetellen.md, 4): een blad met de keuzes, in Planning en
// onderaan het scherm Sporten. Deze keuzes veranderen je planning niet zelf, dus ze worden meteen bewaard.
export function SportCountingSheet({ facts, onClose, onRest }: { facts: SettingsFacts; onClose: () => void; onRest?: () => void }) {
  const { settings, updateSettings } = useAppData();
  return (
    <BundleSheet eyebrow="Planning" title="Hoe sporten meetellen" line="Zwemmen, padel en voetbal: wat ASCEND je vraagt." onClose={onClose}>
      <SummaryRow id="sport-vragen" title="Vragen bij een nieuwe sport" facts={facts} onChange={(on) => void updateSettings({ sportCounting: { ...settings.sportCounting, askNew: on } })} />
      <SummaryRow id="sport-zwaarte" title="Vragen hoe zwaar het was" facts={facts} onChange={(on) => void updateSettings({ sportCounting: { ...settings.sportCounting, askFelt: on } })} />
      {onRest && <SummaryRow id="sport-rust" title="Rust na een zware sport" facts={facts} onClick={onRest} />}
    </BundleSheet>
  );
}
