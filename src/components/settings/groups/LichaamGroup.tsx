import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { SettingsSection } from '../SettingsList';
import { FigureSheet, HeartRateSheet, WeightSheet } from './LichaamSheets';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';

// Lichaam: je gewicht (komt zoveel mogelijk vanzelf uit MacroFactor), je hartslag, je blessures
// (die staan op het scherm Lichaam) en of het figuur daar een man of een vrouw is.
export function LichaamGroup({ facts, sheet, setSheet }: GroupProps) {
  const navigate = useNavigate();
  const { updateSettings } = useAppData();
  const close = () => setSheet(null);
  return (
    <>
      <SettingsSection>
        <SummaryRow id="lichaamsgewicht" title="Lichaamsgewicht" facts={facts} onClick={() => setSheet('lichaamsgewicht')} />
        <SummaryRow id="vetpercentage" title="Vetpercentage tonen" facts={facts} info="vetpercentage" onChange={(on) => void updateSettings({ showBodyFat: on })} />
        <SummaryRow id="hartslag" title="Hartslag" facts={facts} onClick={() => setSheet('hartslag')} />
        <SummaryRow id="blessures" title="Blessures" facts={facts} onClick={() => navigate('/lichaam')} />
        <SummaryRow id="figuur" title="Figuur" facts={facts} info="figuur" onClick={() => setSheet('figuur')} />
      </SettingsSection>
      {sheet === 'lichaamsgewicht' && <WeightSheet onClose={close} />}
      {sheet === 'hartslag' && <HeartRateSheet onClose={close} />}
      {sheet === 'figuur' && <FigureSheet onClose={close} />}
    </>
  );
}
