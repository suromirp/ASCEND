import { playRestSound } from '../../../utils/sound';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveStrengthSettings, type StrengthSettings } from '../../../engine/strengthSettings';
import { SettingsEmpty, SettingsRow, SettingsSection } from '../SettingsList';
import { BarsSheet, DurationSheet, PlatesSheet, ProgramSheet, RackSheet, StackSheet } from './ForgeSheets';
import { ChoiceFromDef } from './ChoiceFromDef';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';

// Forge: kracht meerekenen, wat je bijhoudt, de voorstellen en je sportschool. Elke
// keuze heeft het advies als standaard (docs/beslissingen/2026-10-22-alles-instelbaar.md).
export function ForgeGroup({ facts, sheet, setSheet }: GroupProps) {
  const navigate = useNavigate();
  const { settings, updateSettings, setStrengthExternal } = useAppData();
  const s = resolveStrengthSettings(settings.strengthModel);
  const save = (patch: Partial<StrengthSettings>) => void updateSettings({ strengthModel: { ...settings.strengthModel, ...patch } });
  const close = () => setSheet(null);

  return (
    <>
      <SettingsSection>
        <SummaryRow id="forge" title="Kracht meerekenen" facts={facts} info="forge" onChange={(on) => save({ enabled: on })} />
        <SettingsRow id="forge-open" title="Forge openen" onClick={() => navigate('/forge')} />
      </SettingsSection>

      <SettingsSection title="Bijhouden">
        <SummaryRow id="kracht" title="Sets en gewichten" facts={facts} onClick={() => setSheet('kracht')} />
        <SummaryRow id="trainingsduur" title="Trainingsduur" facts={facts} onClick={() => setSheet('trainingsduur')} />
      </SettingsSection>

      {s.enabled ? (
        <SettingsSection
          title="Voorstellen"
          advancedIds={['forge-bereik', 'forge-schatting']}
          storageKey="forge-voorstellen"
          advanced={
            <>
              <SummaryRow id="forge-bereik" title="Bereik verbreden" facts={facts} onChange={(on) => save({ widenRange: on })} />
              <SummaryRow id="forge-schatting" title="Sets die meetellen" facts={facts} onClick={() => setSheet('forge-schatting')} />
            </>
          }
        >
          <SummaryRow id="forge-volgorde" title="Eerst ophogen" facts={facts} onClick={() => setSheet('forge-volgorde')} />
          <SummaryRow id="forge-sets" title="Werksets" facts={facts} onClick={() => setSheet('forge-sets')} />
          <SummaryRow id="forge-opwarmen" title="Opwarmen" facts={facts} info="forgeOpwarmen" onClick={() => setSheet('forge-opwarmen')} />
        <SummaryRow id="forge-opwarmbereik" title="Opwarmen per" facts={facts} onClick={() => setSheet('forge-opwarmbereik')} />
        </SettingsSection>
      ) : (
        <SettingsSection title="Voorstellen">
          <SettingsEmpty text="Uit. Zet Kracht meerekenen aan voor een voorstel per oefening." />
        </SettingsSection>
      )}

      <SettingsSection title="In de sportschool">
        <SummaryRow id="forge-rust" title="Rusttimer vanzelf" facts={facts} onChange={(on) => save({ restAuto: on })} />
        <SummaryRow id="forge-signaal" title="Signaal als de rust om is" facts={facts} onClick={() => setSheet('forge-signaal')} />
        <SummaryRow id="forge-geluid" title="Geluid na de rust" facts={facts} onClick={() => setSheet('forge-geluid')} />
        <SummaryRow id="forge-scherm" title="Scherm aan tijdens je training" facts={facts} onChange={(on) => save({ keepScreenOn: on })} />
        <SummaryRow id="forge-doorgeven" title="Gewicht doorgeven aan volgende sets" facts={facts} info="forgeDoorgeven" onChange={(on) => save({ carryWeights: on })} />
        <SummaryRow id="forge-schijven" title="Schijven bij de set tonen" facts={facts} info="forgeSchijven" onChange={(on) => save({ showPlates: on })} />
        <SummaryRow id="forge-1rm" title="Geschatte 1RM tonen" facts={facts} info="forge1rm" onChange={(on) => save({ showOneRm: on })} />
        <SummaryRow id="forge-programma" title="Programma uit MacroFactor" facts={facts} onClick={() => setSheet('forge-programma')} />
      </SettingsSection>

      <SettingsSection title="Je sportschool">
        <SummaryRow id="stangen" title="Stangen" facts={facts} onClick={() => setSheet('stangen')} />
        <SummaryRow id="schijven" title="Schijven" facts={facts} onClick={() => setSheet('schijven')} />
        <SummaryRow id="dumbbells" title="Dumbbells" facts={facts} onClick={() => setSheet('dumbbells')} />
        <SummaryRow id="kabels" title="Kabels en toestellen" facts={facts} onClick={() => setSheet('kabels')} />
      </SettingsSection>

      {sheet === 'kracht' && (
        <ChoiceFromDef def={CHOICES.kracht} value={facts.strengthExternal ? 'macrofactor' : 'ascend'} onPick={(v) => void setStrengthExternal(v === 'macrofactor')} onClose={close} />
      )}
      {sheet === 'trainingsduur' && <DurationSheet onClose={close} />}
      {sheet === 'forge-volgorde' && <ChoiceFromDef def={CHOICES.volgorde} value={s.progression} onPick={(v) => save({ progression: v })} onClose={close} />}
      {sheet === 'forge-sets' && <ChoiceFromDef def={CHOICES.werksets} value={s.workSets} onPick={(v) => save({ workSets: v })} onClose={close} />}
      {sheet === 'forge-opwarmen' && <ChoiceFromDef def={CHOICES.opwarmen} value={s.warmup} onPick={(v) => save({ warmup: v })} onClose={close} />}
      {sheet === 'forge-opwarmbereik' && <ChoiceFromDef def={CHOICES.opwarmbereik} value={s.warmupScope} onPick={(v) => save({ warmupScope: v })} onClose={close} />}
      {sheet === 'forge-schatting' && <ChoiceFromDef def={CHOICES.schatting} value={s.estimateUpTo as 12 | 15 | 20} onPick={(v) => save({ estimateUpTo: v })} onClose={close} />}
      {sheet === 'forge-geluid' && (
        <ChoiceFromDef def={CHOICES.rustgeluid} value={s.restSound} onPick={(v) => { playRestSound(v); save({ restSound: v }); }} onClose={close} />
      )}
      {sheet === 'forge-signaal' && <ChoiceFromDef def={CHOICES.restsignaal} value={s.restAlert} onPick={(v) => save({ restAlert: v })} onClose={close} />}
      {sheet === 'forge-programma' && <ProgramSheet onClose={close} />}
      {sheet === 'stangen' && <BarsSheet onClose={close} />}
      {sheet === 'schijven' && <PlatesSheet onClose={close} />}
      {sheet === 'dumbbells' && <RackSheet onClose={close} />}
      {sheet === 'kabels' && <StackSheet onClose={close} />}
    </>
  );
}
