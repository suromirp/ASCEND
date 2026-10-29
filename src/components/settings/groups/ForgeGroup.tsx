import { useState } from 'react';
import { playRestSound } from '../../../utils/sound';
import { haptics } from '../../../utils/haptics';
import { restAlertChannels, restVibrationPattern } from '../../../engine/restVibration';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveExerciseArt } from '../../../engine/exerciseArtSettings';
import { resolveForgeLayout } from '../../../engine/forgeLayout';
import { resolveBreakAsk } from '../../../engine/forgeSession';
import { resolveStrengthSettings, withProfile, type StrengthSettings } from '../../../engine/strengthSettings';
import { SettingsEmpty, SettingsSection } from '../SettingsList';
import { AddOnSheet, GymProfileSheet, MachineListSheet } from './ToestelSheets';
import { BarsSheet, CheckFromSheet, DurationSheet, PlatesSheet, ProgramSheet, RackSheet, StackSheet } from './ForgeSheets';
import { BundleSheet } from './BundleSheet';
import { ChoiceFromDef } from './ChoiceFromDef';
import { SummaryRow } from './SummaryRow';
import { anyShown, rowShown } from './rowShown';
import type { GroupProps } from './types';

const ADVANCED = ['trainingsduur', 'bundel-rekenmodel', 'bundel-invullen', 'bundel-toets'];

// Forge: kracht meerekenen, wat je bijhoudt, de voorstellen en je sportschool. Elke keuze heeft
// het advies als standaard (docs/beslissingen/2026-10-22-alles-instelbaar.md). Keuzes die bij
// elkaar horen staan achter één rij met een blad (docs/beslissingen/2026-10-26-instellingen-opruimen.md);
// wat bij een andere keuze hoort verschijnt pas als die aan staat (data/settingsLayout.ts).
export function ForgeGroup({ facts, sheet, setSheet }: GroupProps) {
  const { settings, updateSettings, setStrengthExternal } = useAppData();
  const s = resolveStrengthSettings(settings.strengthModel);
  const save = (patch: Partial<StrengthSettings>) => void updateSettings({ strengthModel: { ...settings.strengthModel, ...patch } });
  // Een keuze in een blad opent haar onderblad bovenop dat blad.
  const [inner, setInner] = useState<string | null>(null);
  const close = () => setSheet(null);
  const closeInner = () => setInner(null);
  // Tapping a sound lets you hear it and, when vibrating is on, feel its rhythm: as the
  // signal at the end of the rest will do it (nothing of what is switched off).
  const tryRestSound = (sound: Parameters<typeof playRestSound>[0]) => {
    const channels = restAlertChannels(s.restAlert);
    if (channels.sound) playRestSound(sound);
    if (channels.vibrate) haptics.pattern(restVibrationPattern(sound));
  };
  const advancedTitles = [
    rowShown('bundel-rekenmodel', facts) && 'Rekenmodel',
    rowShown('bundel-invullen', facts) && 'Bij het invullen',
    rowShown('bundel-toets', facts) && 'Toets tegen MacroFactor',
    rowShown('trainingsduur', facts) && 'Trainingsduur',
  ].filter(Boolean).join(', ');

  return (
    <>
      <SettingsSection>
        <SummaryRow id="forge" title="Kracht meerekenen" facts={facts} info="forge" onChange={(on) => save({ enabled: on })} />
      </SettingsSection>

      <SettingsSection title="Bijhouden">
        <SummaryRow id="kracht" title="Sets en gewichten" facts={facts} onClick={() => setSheet('kracht')} />
        <SummaryRow id="forge-programma" title="Programma uit MacroFactor" facts={facts} onClick={() => setSheet('forge-programma')} />
      </SettingsSection>

      {s.enabled ? (
        <SettingsSection title="Voorstellen">
          <SummaryRow id="forge-volgorde" title="Eerst ophogen" facts={facts} onClick={() => setSheet('forge-volgorde')} />
          <SummaryRow id="forge-opwarmen" title="Opwarmen" facts={facts} info="forgeOpwarmen" onClick={() => setSheet('forge-opwarmen')} />
          <SummaryRow id="forge-opwarmbereik" title="Opwarmen per" facts={facts} onClick={() => setSheet('forge-opwarmbereik')} />
          <SummaryRow id="bundel-weergave" title="Weergave op Forge" facts={facts} onClick={() => setSheet('bundel-weergave')} />
        </SettingsSection>
      ) : (
        <SettingsSection title="Voorstellen">
          <SettingsEmpty text="Uit. Zet Kracht meerekenen aan voor een voorstel per oefening." />
        </SettingsSection>
      )}

      <SettingsSection title="In de sportschool">
        <SummaryRow id="bundel-rusttimer" title="Rusttimer" facts={facts} onClick={() => setSheet('bundel-rusttimer')} />
        <SummaryRow id="forge-scherm" title="Scherm aan tijdens je training" facts={facts} onChange={(on) => save({ keepScreenOn: on })} />
        <SummaryRow id="forge-bijsturen" title="Bijsturen in de training" facts={facts} info="forgeBijsturen" onChange={(on) => save({ adjustLive: on })} />
        <SummaryRow id="forge-spotter" title="Zonder spotter" facts={facts} info="forgeSpotter" onChange={(on) => save({ noSpotter: on })} />
        <SummaryRow id="bundel-sportschool" title="Je sportschool" facts={facts} onClick={() => setSheet('bundel-sportschool')} />
      </SettingsSection>

      {anyShown(ADVANCED, facts) && (
        <SettingsSection advancedIds={ADVANCED} advancedTitles={advancedTitles} storageKey="forge-geavanceerd" advanced={
          <>
            <SummaryRow id="trainingsduur" title="Trainingsduur" facts={facts} onClick={() => setSheet('trainingsduur')} />
            <SummaryRow id="bundel-rekenmodel" title="Rekenmodel" facts={facts} info="bundelRekenmodel" onClick={() => setSheet('bundel-rekenmodel')} />
            <SummaryRow id="bundel-invullen" title="Bij het invullen" facts={facts} info="bundelInvullen" onClick={() => setSheet('bundel-invullen')} />
            <SummaryRow id="bundel-toets" title="Toets tegen MacroFactor" facts={facts} info="forgeNaast" onClick={() => setSheet('bundel-toets')} />
          </>
        }>
          {null}
        </SettingsSection>
      )}

      {/* De bladen met meer keuzes. */}
      {sheet === 'bundel-rusttimer' && (
        <BundleSheet eyebrow="Forge" title="Rusttimer" line="Na elke werkset en na je laatste opwarmset." onClose={close}>
          <SummaryRow id="forge-rust" title="Rusttimer vanzelf" facts={facts} onChange={(on) => save({ restAuto: on })} />
          <SummaryRow id="forge-signaal" title="Signaal als de rust om is" facts={facts} onClick={() => setInner('forge-signaal')} />
          <SummaryRow id="forge-geluid" title="Geluid na de rust" facts={facts} onClick={() => setInner('forge-geluid')} />
        </BundleSheet>
      )}
      {sheet === 'bundel-weergave' && (
        <BundleSheet eyebrow="Forge" title="Weergave op Forge" line="Wat de pagina Forge laat zien." onClose={close}>
          <SummaryRow id="forge-1rm" title="Geschatte 1RM tonen" facts={facts} info="forge1rm" onChange={(on) => save({ showOneRm: on })} />
          <SummaryRow id="forge-weergave" title="Forge toont" facts={facts} info="forgeWeergave" onClick={() => setInner('forge-weergave')} />
          <SummaryRow id="forge-1rm-macrofactor" title="MacroFactor-1RM erbij" facts={facts} info="forge1rmMacrofactor" onChange={(on) => save({ showMacroFactorOneRm: on })} />
          <SummaryRow id="forge-vergelijken" title="Vergelijken met" facts={facts} info="forgeVergelijken" onClick={() => setInner('forge-vergelijken')} />
          <SummaryRow id="forge-extras" title="Wat er verder veranderde" facts={facts} info="forgeExtras" onChange={(on) => save({ showExtras: on })} />
          <SummaryRow id="forge-lijntjes" title="Lijntjes in de lijst" facts={facts} info="forgeLijntjes" onChange={(on) => save({ showTrendLines: on })} />
          <SummaryRow id="forge-volgorde-lijst" title="Volgorde van de oefeningen" facts={facts} onClick={() => setInner('forge-volgorde-lijst')} />
          <SummaryRow id="forge-plaatjes" title="Plaatjes bij oefeningen" facts={facts} info="plaatjes" onClick={() => setInner('forge-plaatjes')} />
        </BundleSheet>
      )}
      {sheet === 'bundel-rekenmodel' && (
        <BundleSheet eyebrow="Forge" title="Rekenmodel" line="Hoe Forge rekent. Het advies is meestal goed." onClose={close}>
          <SummaryRow id="forge-sets" title="Werksets" facts={facts} onClick={() => setInner('forge-sets')} />
          <SummaryRow id="forge-vermoeidheid" title="Vermoeidheid per set" facts={facts} info="forgeVermoeidheid" onClick={() => setInner('forge-vermoeidheid')} />
          <SummaryRow id="forge-pauze" title="Na een pauze lichter beginnen" facts={facts} info="forgePauze" onChange={(on) => save({ lighterAfterBreak: on })} />
          <SummaryRow id="forge-bereik" title="Bereik verbreden" facts={facts} onChange={(on) => save({ widenRange: on })} />
          <SummaryRow id="forge-schatting" title="Sets die meetellen" facts={facts} onClick={() => setInner('forge-schatting')} />
          <SummaryRow id="forge-leren" title="Gewichten van toestellen" facts={facts} info="forgeLeren" onClick={() => setInner('forge-leren')} />
        </BundleSheet>
      )}
      {sheet === 'bundel-invullen' && (
        <BundleSheet eyebrow="Forge" title="Bij het invullen" line="Wat het workoutscherm voor je doet." onClose={close}>
          <SummaryRow id="forge-oefeningen" title="Oefeningen in een training" facts={facts} info="forgeOefeningen" onClick={() => setInner('forge-oefeningen')} />
          <SummaryRow id="forge-onderbreking" title="Lange onderbreking vragen na" facts={facts} info="forgeOnderbreking" onClick={() => setInner('forge-onderbreking')} />
          <SummaryRow id="forge-snelknoppen" title="Snelknoppen tonen" facts={facts} info="forgeSnelknoppen" onChange={(on) => void updateSettings({ forgeQuickButtons: on })} />
          <SummaryRow id="forge-rir-vooraf" title="RIR vooraf invullen" facts={facts} info="forgeRirVooraf" onClick={() => setInner('forge-rir-vooraf')} />
          <SummaryRow id="forge-doorvoeren" title="Wijzigingen doorvoeren" facts={facts} info="forgeDoorvoeren" onClick={() => setInner('forge-doorvoeren')} />
          <SummaryRow id="forge-schijven" title="Schijven bij de set tonen" facts={facts} info="forgeSchijven" onChange={(on) => save({ showPlates: on })} />
        </BundleSheet>
      )}
      {sheet === 'bundel-toets' && (
        <BundleSheet eyebrow="Forge" title="Toets tegen MacroFactor" line="ASCEND meet stil mee. Jij beslist wat je ziet." onClose={close}>
          <SummaryRow id="forge-naast" title="ASCEND naast MacroFactor" facts={facts} info="forgeNaast" onChange={(on) => save({ showComparison: on })} />
          <SummaryRow id="forge-sinds" title="Stil meten sinds" facts={facts} info="forgeSinds" onClick={() => setInner('forge-sinds')} />
        </BundleSheet>
      )}
      {sheet === 'bundel-sportschool' && (
        <BundleSheet eyebrow="Forge" title="Je sportschool" line="Wat er in je sportschool ligt. Forge stelt alleen gewichten voor die kunnen." onClose={close}>
          <SummaryRow id="gym-profiel" title="Sportschool" facts={facts} info="gymProfiel" onClick={() => setInner('gym-profiel')} />
          <SummaryRow id="spotterrek" title="Veiligheidsarmen" facts={facts} info="spotterrek" onChange={(on) => void updateSettings({ strengthModel: withProfile(settings.strengthModel, { spotterRack: on ? true : undefined }) })} />
          <SummaryRow id="stangen" title="Stangen" facts={facts} onClick={() => setInner('stangen')} />
          <SummaryRow id="schijven" title="Schijven" facts={facts} onClick={() => setInner('schijven')} />
          <SummaryRow id="dumbbells" title="Dumbbells" facts={facts} onClick={() => setInner('dumbbells')} />
          <SummaryRow id="forge-dumbbells" title="Dumbbells in je log" facts={facts} info="forgeDumbbells" onClick={() => setInner('forge-dumbbells')} />
          <SummaryRow id="kabels" title="Kabels en toestellen" facts={facts} onClick={() => setInner('kabels')} />
          <SummaryRow id="toestelgewichten" title="Gewichten per toestel" facts={facts} info="toestelgewichten" onClick={() => setInner('toestelgewichten')} />
          <SummaryRow id="tussengewichten" title="Tussengewichten" facts={facts} info="tussengewichten" onClick={() => setInner('tussengewichten')} />
        </BundleSheet>
      )}

      {/* Keuzes van een rij op de pagina. */}
      {sheet === 'kracht' && (
        <ChoiceFromDef def={CHOICES.kracht} value={facts.strengthExternal ? 'macrofactor' : 'ascend'} onPick={(v) => void setStrengthExternal(v === 'macrofactor')} onClose={close} />
      )}
      {sheet === 'trainingsduur' && <DurationSheet onClose={close} />}
      {sheet === 'forge-programma' && <ProgramSheet onClose={close} />}
      {sheet === 'forge-volgorde' && <ChoiceFromDef def={CHOICES.volgorde} value={s.progression} onPick={(v) => save({ progression: v })} onClose={close} />}
      {sheet === 'forge-opwarmen' && <ChoiceFromDef def={CHOICES.opwarmen} value={s.warmup} onPick={(v) => save({ warmup: v })} onClose={close} />}
      {sheet === 'forge-opwarmbereik' && <ChoiceFromDef def={CHOICES.opwarmbereik} value={s.warmupScope} onPick={(v) => save({ warmupScope: v })} onClose={close} />}

      {/* Keuzes in een blad: een onderblad bovenop. */}
      {inner === 'forge-oefeningen' && <ChoiceFromDef def={CHOICES.forgeOefeningen} value={resolveForgeLayout(settings)} onPick={(v) => void updateSettings({ forgeLayout: v })} onClose={closeInner} />}
      {inner === 'forge-onderbreking' && <ChoiceFromDef def={CHOICES.forgeOnderbreking} value={resolveBreakAsk(settings)} onPick={(v) => void updateSettings({ forgeLongBreak: v })} onClose={closeInner} />}
      {inner === 'forge-plaatjes' && <ChoiceFromDef def={CHOICES.plaatjes} value={resolveExerciseArt(settings)} onPick={(v) => void updateSettings({ exerciseArt: v })} onClose={closeInner} />}
      {inner === 'forge-weergave' && <ChoiceFromDef def={CHOICES.forgeWeergave} value={s.oneRmView} onPick={(v) => save({ oneRmView: v })} onClose={closeInner} />}
      {inner === 'forge-vergelijken' && <ChoiceFromDef def={CHOICES.forgeVergelijken} value={s.compareWeeks} onPick={(v) => save({ compareWeeks: v })} onClose={closeInner} />}
      {inner === 'forge-volgorde-lijst' && <ChoiceFromDef def={CHOICES.forgeVolgorde} value={s.listSort} onPick={(v) => save({ listSort: v })} onClose={closeInner} />}
      {inner === 'forge-sets' && <ChoiceFromDef def={CHOICES.werksets} value={s.workSets} onPick={(v) => save({ workSets: v })} onClose={closeInner} />}
      {inner === 'forge-rir-vooraf' && <ChoiceFromDef def={CHOICES.rirVooraf} value={s.rirPrefill} onPick={(v) => save({ rirPrefill: v })} onClose={closeInner} />}
      {inner === 'forge-doorvoeren' && <ChoiceFromDef def={CHOICES.doorvoeren} value={s.carryMode} onPick={(v) => save({ carryMode: v })} onClose={closeInner} />}
      {inner === 'forge-vermoeidheid' && <ChoiceFromDef def={CHOICES.vermoeidheid} value={s.fatigue} onPick={(v) => save({ fatigue: v })} onClose={closeInner} />}
      {inner === 'forge-schatting' && <ChoiceFromDef def={CHOICES.schatting} value={s.estimateUpTo as 12 | 15 | 20} onPick={(v) => save({ estimateUpTo: v })} onClose={closeInner} />}
      {inner === 'forge-geluid' && (
        <ChoiceFromDef def={CHOICES.rustgeluid} value={s.restSound} onPick={(v) => { tryRestSound(v); save({ restSound: v }); }} onClose={closeInner} />
      )}
      {inner === 'forge-signaal' && <ChoiceFromDef def={CHOICES.restsignaal} value={s.restAlert} onPick={(v) => save({ restAlert: v })} onClose={closeInner} />}
      {inner === 'forge-leren' && <ChoiceFromDef def={CHOICES.forgeLeren} value={s.stackWeights} onPick={(v) => save({ stackWeights: v })} onClose={closeInner} />}
      {inner === 'forge-dumbbells' && <ChoiceFromDef def={CHOICES.dumbbellLog} value={s.dumbbellLog} onPick={(v) => save({ dumbbellLog: v })} onClose={closeInner} />}
      {inner === 'forge-sinds' && <CheckFromSheet onClose={closeInner} />}
      {inner === 'stangen' && <BarsSheet onClose={closeInner} />}
      {inner === 'schijven' && <PlatesSheet onClose={closeInner} />}
      {inner === 'dumbbells' && <RackSheet onClose={closeInner} />}
      {inner === 'kabels' && <StackSheet onClose={closeInner} />}
      {inner === 'gym-profiel' && <GymProfileSheet onClose={closeInner} />}
      {inner === 'toestelgewichten' && <MachineListSheet onClose={closeInner} />}
      {inner === 'tussengewichten' && <AddOnSheet onClose={closeInner} />}
    </>
  );
}
