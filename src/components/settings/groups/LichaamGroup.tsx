import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BundleSheet } from './BundleSheet';
import { useAppData } from '../../../state/AppDataContext';
import { SettingsSection } from '../SettingsList';
import { FigureSheet, HeartRateSheet, WeightSheet } from './LichaamSheets';
import { OorzaakSheet, VastgelegdSheet } from './WatSpeeldeErSheets';
import { ChoiceFromDef } from './ChoiceFromDef';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveIntensityCounting } from '../../../engine/intensitySettings';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';

// Lichaam: je gewicht (komt zoveel mogelijk vanzelf uit MacroFactor), je hartslag, je blessures
// (die staan op het scherm Lichaam) en of het figuur daar een man of een vrouw is.
export function LichaamGroup({ facts, sheet, setSheet }: GroupProps) {
  const navigate = useNavigate();
  const { updateSettings, settings } = useAppData();
  const close = () => setSheet(null);
  // Een keuze in het blad Wat speelde er opent haar onderblad bovenop dat blad.
  const [inner, setInner] = useState<string | null>(null);
  const closeInner = () => setInner(null);
  return (
    <>
      <SettingsSection>
        <SummaryRow id="lichaamsgewicht" title="Lichaamsgewicht" facts={facts} onClick={() => setSheet('lichaamsgewicht')} />
        <SummaryRow id="vetpercentage" title="Vetpercentage tonen" facts={facts} info="vetpercentage" onChange={(on) => void updateSettings({ showBodyFat: on })} />
        <SummaryRow id="hartslag" title="Hartslag" facts={facts} onClick={() => setSheet('hartslag')} />
        <SummaryRow id="blessures" title="Blessures" facts={facts} onClick={() => navigate('/lichaam')} />
        <SummaryRow id="figuur" title="Figuur" facts={facts} info="figuur" onClick={() => setSheet('figuur')} />
      </SettingsSection>
      <SettingsSection>
        <SummaryRow id="bundel-wat" title="Wat speelde er" facts={facts} onClick={() => setSheet('bundel-wat')} />
      </SettingsSection>
      <SettingsSection title="Je stand">
        <SummaryRow id="intensiteit" title="Intensiteit tellen" facts={facts} info="intensiteit" onClick={() => setSheet('intensiteit')} />
      </SettingsSection>
      {sheet === 'lichaamsgewicht' && <WeightSheet onClose={close} />}
      {sheet === 'hartslag' && <HeartRateSheet onClose={close} />}
      {sheet === 'intensiteit' && <ChoiceFromDef def={CHOICES.intensiteit} value={resolveIntensityCounting(settings)} onPick={(v) => void updateSettings({ intensityCounting: v })} onClose={close} />}
      {sheet === 'figuur' && <FigureSheet onClose={close} />}
      {sheet === 'bundel-wat' && (
        <BundleSheet eyebrow="Lichaam" title="Wat speelde er" line="Je eigen aantekeningen bij een training of een dag." onClose={close}>
          <SummaryRow id="wat-teken" title="Training wijkt af" facts={facts} info="wat-teken" onChange={(on) => void updateSettings({ influenceSign: on })} />
          <SummaryRow id="wat-oorzaak" title="Mogelijke oorzaak" facts={facts} info="wat-oorzaak" onClick={() => setInner('wat-oorzaak')} />
          <SummaryRow id="wat-overzicht" title="Op Je stand" facts={facts} info="wat-overzicht" onChange={(on) => void updateSettings({ influenceOverview: on })} />
          <SummaryRow id="wat-test" title="Test verschuiven" facts={facts} info="wat-test" onChange={(on) => void updateSettings({ influenceTestMove: on })} />
          <SummaryRow id="wat-namen" title="Voorbeelden bij naam noemen" facts={facts} info="wat-namen" onChange={(on) => void updateSettings({ influenceNames: on })} />
          <SummaryRow id="wat-vastgelegd" title="Vastgelegd" facts={facts} onClick={() => setInner('wat-vastgelegd')} />
        </BundleSheet>
      )}
      {inner === 'wat-oorzaak' && <OorzaakSheet onClose={closeInner} />}
      {inner === 'wat-vastgelegd' && <VastgelegdSheet onClose={closeInner} />}
    </>
  );
}
