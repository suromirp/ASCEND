import { playRestSound } from '../../../utils/sound';
import { haptics } from '../../../utils/haptics';
import { restAlertChannels, restVibrationPattern } from '../../../engine/restVibration';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveStrengthSettings, type StrengthSettings } from '../../../engine/strengthSettings';
import { SettingsEmpty, SettingsRow, SettingsSection } from '../SettingsList';
import { BarsSheet, CheckFromSheet, DurationSheet, PlatesSheet, ProgramSheet, RackSheet, StackSheet } from './ForgeSheets';
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
  // Tapping a sound lets you hear it and, when vibrating is on, feel its rhythm: as the
  // signal at the end of the rest will do it (nothing of what is switched off).
  const tryRestSound = (sound: Parameters<typeof playRestSound>[0]) => {
    const channels = restAlertChannels(s.restAlert);
    if (channels.sound) playRestSound(sound);
    if (channels.vibrate) haptics.pattern(restVibrationPattern(sound));
  };

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
          <SummaryRow id="forge-pauze" title="Na een pauze lichter beginnen" facts={facts} info="forgePauze" onChange={(on) => save({ lighterAfterBreak: on })} />
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
        <SummaryRow id="forge-bijsturen" title="Bijsturen in de training" facts={facts} info="forgeBijsturen" onChange={(on) => save({ adjustLive: on })} />
        <SummaryRow id="forge-rir-vooraf" title="RIR vooraf invullen" facts={facts} info="forgeRirVooraf" onClick={() => setSheet('forge-rir-vooraf')} />
        <SummaryRow id="forge-doorgeven" title="Gewicht doorgeven aan volgende sets" facts={facts} info="forgeDoorgeven" onChange={(on) => save({ carryWeights: on })} />
        <SummaryRow id="forge-schijven" title="Schijven bij de set tonen" facts={facts} info="forgeSchijven" onChange={(on) => save({ showPlates: on })} />
        <SummaryRow id="forge-1rm" title="Geschatte 1RM tonen" facts={facts} info="forge1rm" onChange={(on) => save({ showOneRm: on })} />
        <SummaryRow id="forge-weergave" title="Forge toont" facts={facts} info="forgeWeergave" onClick={() => setSheet('forge-weergave')} />
        <SummaryRow id="forge-1rm-macrofactor" title="MacroFactor-1RM erbij" facts={facts} info="forge1rmMacrofactor" onChange={(on) => save({ showMacroFactorOneRm: on })} />
        <SummaryRow id="forge-vergelijken" title="Vergelijken met" facts={facts} info="forgeVergelijken" onClick={() => setSheet('forge-vergelijken')} />
        <SummaryRow id="forge-extras" title="Wat er verder veranderde" facts={facts} info="forgeExtras" onChange={(on) => save({ showExtras: on })} />
        <SummaryRow id="forge-lijntjes" title="Lijntjes in de lijst" facts={facts} info="forgeLijntjes" onChange={(on) => save({ showTrendLines: on })} />
        <SummaryRow id="forge-leren" title="Gewichten van toestellen" facts={facts} info="forgeLeren" onClick={() => setSheet('forge-leren')} />
        <SummaryRow id="forge-naast" title="ASCEND naast MacroFactor" facts={facts} info="forgeNaast" onChange={(on) => save({ showComparison: on })} />
        <SummaryRow id="forge-sinds" title="Stil meten sinds" facts={facts} info="forgeSinds" onClick={() => setSheet('forge-sinds')} />
        <SummaryRow id="forge-volgorde-lijst" title="Volgorde van de oefeningen" facts={facts} onClick={() => setSheet('forge-volgorde-lijst')} />
        <SummaryRow id="forge-programma" title="Programma uit MacroFactor" facts={facts} onClick={() => setSheet('forge-programma')} />
      </SettingsSection>

      <SettingsSection title="Je sportschool">
        <SummaryRow id="stangen" title="Stangen" facts={facts} onClick={() => setSheet('stangen')} />
        <SummaryRow id="schijven" title="Schijven" facts={facts} onClick={() => setSheet('schijven')} />
        <SummaryRow id="dumbbells" title="Dumbbells" facts={facts} onClick={() => setSheet('dumbbells')} />
        <SummaryRow id="forge-dumbbells" title="Dumbbells in je log" facts={facts} info="forgeDumbbells" onClick={() => setSheet('forge-dumbbells')} />
        <SummaryRow id="kabels" title="Kabels en toestellen" facts={facts} onClick={() => setSheet('kabels')} />
      </SettingsSection>

      {sheet === 'kracht' && (
        <ChoiceFromDef def={CHOICES.kracht} value={facts.strengthExternal ? 'macrofactor' : 'ascend'} onPick={(v) => void setStrengthExternal(v === 'macrofactor')} onClose={close} />
      )}
      {sheet === 'trainingsduur' && <DurationSheet onClose={close} />}
      {sheet === 'forge-weergave' && <ChoiceFromDef def={CHOICES.forgeWeergave} value={s.oneRmView} onPick={(v) => save({ oneRmView: v })} onClose={close} />}
      {sheet === 'forge-vergelijken' && <ChoiceFromDef def={CHOICES.forgeVergelijken} value={s.compareWeeks} onPick={(v) => save({ compareWeeks: v })} onClose={close} />}
      {sheet === 'forge-volgorde-lijst' && <ChoiceFromDef def={CHOICES.forgeVolgorde} value={s.listSort} onPick={(v) => save({ listSort: v })} onClose={close} />}
      {sheet === 'forge-volgorde' && <ChoiceFromDef def={CHOICES.volgorde} value={s.progression} onPick={(v) => save({ progression: v })} onClose={close} />}
      {sheet === 'forge-sets' && <ChoiceFromDef def={CHOICES.werksets} value={s.workSets} onPick={(v) => save({ workSets: v })} onClose={close} />}
      {sheet === 'forge-rir-vooraf' && <ChoiceFromDef def={CHOICES.rirVooraf} value={s.rirPrefill} onPick={(v) => save({ rirPrefill: v })} onClose={close} />}
      {sheet === 'forge-opwarmen' && <ChoiceFromDef def={CHOICES.opwarmen} value={s.warmup} onPick={(v) => save({ warmup: v })} onClose={close} />}
      {sheet === 'forge-opwarmbereik' && <ChoiceFromDef def={CHOICES.opwarmbereik} value={s.warmupScope} onPick={(v) => save({ warmupScope: v })} onClose={close} />}
      {sheet === 'forge-schatting' && <ChoiceFromDef def={CHOICES.schatting} value={s.estimateUpTo as 12 | 15 | 20} onPick={(v) => save({ estimateUpTo: v })} onClose={close} />}
      {sheet === 'forge-geluid' && (
        <ChoiceFromDef def={CHOICES.rustgeluid} value={s.restSound} onPick={(v) => { tryRestSound(v); save({ restSound: v }); }} onClose={close} />
      )}
      {sheet === 'forge-signaal' && <ChoiceFromDef def={CHOICES.restsignaal} value={s.restAlert} onPick={(v) => save({ restAlert: v })} onClose={close} />}
      {sheet === 'forge-leren' && <ChoiceFromDef def={CHOICES.forgeLeren} value={s.stackWeights} onPick={(v) => save({ stackWeights: v })} onClose={close} />}
      {sheet === 'forge-dumbbells' && <ChoiceFromDef def={CHOICES.dumbbellLog} value={s.dumbbellLog} onPick={(v) => save({ dumbbellLog: v })} onClose={close} />}
      {sheet === 'forge-sinds' && <CheckFromSheet onClose={close} />}
      {sheet === 'forge-programma' && <ProgramSheet onClose={close} />}
      {sheet === 'stangen' && <BarsSheet onClose={close} />}
      {sheet === 'schijven' && <PlatesSheet onClose={close} />}
      {sheet === 'dumbbells' && <RackSheet onClose={close} />}
      {sheet === 'kabels' && <StackSheet onClose={close} />}
    </>
  );
}
