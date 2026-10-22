import { useNavigate } from 'react-router-dom';
import { SettingsSection } from '../SettingsList';
import { HeartRateSheet, WeightSheet } from './LichaamSheets';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';

// Lichaam: je gewicht (komt zoveel mogelijk vanzelf uit MacroFactor), je hartslag en je blessures.
export function LichaamGroup({ facts, sheet, setSheet }: GroupProps) {
  const navigate = useNavigate();
  const close = () => setSheet(null);
  return (
    <>
      <SettingsSection>
        <SummaryRow id="lichaamsgewicht" title="Lichaamsgewicht" facts={facts} onClick={() => setSheet('lichaamsgewicht')} />
        <SummaryRow id="hartslag" title="Hartslag" facts={facts} onClick={() => setSheet('hartslag')} />
        <SummaryRow id="blessures" title="Blessures" facts={facts} onClick={() => navigate('/blessures')} />
      </SettingsSection>
      {sheet === 'lichaamsgewicht' && <WeightSheet onClose={close} />}
      {sheet === 'hartslag' && <HeartRateSheet onClose={close} />}
    </>
  );
}
