import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { SettingsSection } from '../SettingsList';
import { ChoiceFromDef } from './ChoiceFromDef';
import { ProgramSheet, RestartSheet } from './DoelSheets';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';

// Doel en tochten: waar je naartoe werkt, de tochten onderweg en wat je nog moet regelen.
// Doelen, vrije dagen, de reisplanner en de paklijst blijven hun eigen pagina; hier staat wat je
// instelt en waar je het vindt.
export function DoelGroup({ facts, sheet, setSheet }: GroupProps) {
  const navigate = useNavigate();
  const { settings, updateSettings, refresh } = useAppData();
  const close = () => setSheet(null);

  return (
    <>
      <SettingsSection title="Doel">
        <SummaryRow id="doelen" title="Hoofddoel" facts={facts} onClick={() => navigate('/ascend/doelen')} />
        <SummaryRow id="programma" title="Programma" facts={facts} onClick={() => setSheet('programma')} />
        <SummaryRow id="lange-zondag" title="De lange zondag" facts={facts} onClick={() => setSheet('lange-zondag')} />
        <SummaryRow id="na-hoofddoel" title="Na je hoofddoel" facts={facts} onClick={() => setSheet('na-hoofddoel')} />
      </SettingsSection>

      <SettingsSection title="Tochten">
        <SummaryRow id="volgende-tocht" title="Volgende tocht op Vandaag" facts={facts} onChange={(on) => void updateSettings({ showNextTrek: on })} />
        <SummaryRow id="rust-na-tocht" title="Rust na een bergtocht" facts={facts} info="rustNaTocht" onClick={() => setSheet('rust-na-tocht')} />
        <SummaryRow id="vrije-dagen" title="Vrije dagen en vakanties" facts={facts} onClick={() => navigate('/week')} />
      </SettingsSection>

      <SettingsSection title="Onderweg">
        <SummaryRow id="reisplanner" title="Reisplanner" facts={facts} onClick={() => navigate('/reis')} />
        <SummaryRow id="paklijst" title="Paklijst" facts={facts} onClick={() => navigate('/reis/paklijst')} />
      </SettingsSection>

      {sheet === 'programma' && <ProgramSheet onClose={close} onRestart={() => setSheet('opnieuw')} />}
      {sheet === 'opnieuw' && <RestartSheet onClose={close} />}
      {sheet === 'lange-zondag' && (
        <ChoiceFromDef def={CHOICES.langeZondag} value={settings.longSundaySession ?? 'hike'} onPick={(v) => void updateSettings({ longSundaySession: v }).then(() => refresh())} onClose={close} />
      )}
      {sheet === 'na-hoofddoel' && (
        <ChoiceFromDef def={CHOICES.naHoofddoel} value={settings.afterMainGoal ?? 'stop'} onPick={(v) => void updateSettings({ afterMainGoal: v }).then(() => refresh())} onClose={close} />
      )}
      {sheet === 'rust-na-tocht' && (
        <ChoiceFromDef def={CHOICES.rustNaTocht} value={settings.trekLegRest ?? 'soft'} onPick={(v) => void updateSettings({ trekLegRest: v })} onClose={close} />
      )}
    </>
  );
}
