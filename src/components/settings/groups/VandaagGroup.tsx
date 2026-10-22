import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveOverviews, type OverviewSettings } from '../../../engine/overviewSettings';
import { resolveNavigation } from '../../../engine/navigationSettings';
import { type InsightTopicSwitch, type RunInsightSettings } from '../../../engine/runInsightSettings';
import { SettingsSection } from '../SettingsList';
import { ChoiceFromDef } from './ChoiceFromDef';
import { SummaryRow } from './SummaryRow';
import { ClothingSheet, PlaceSheet } from './VandaagSheets';
import type { GroupProps } from './types';

// Vandaag en meldingen: wat ASCEND je op Vandaag laat zien en vraagt, het weer, en wat er na een
// training komt. Alles mag uit (docs/beslissingen/2026-10-22-alles-instelbaar.md).
export function VandaagGroup({ facts, sheet, setSheet }: GroupProps) {
  const { settings, updateSettings } = useAppData();
  const o = resolveOverviews(settings.overviews);
  // Alleen de gewijzigde sleutel erbij; wat je niet aanraakte blijft ontbreken en betekent dus de standaard.
  const set = (patch: Partial<OverviewSettings>) => void updateSettings({ overviews: { ...settings.overviews, ...patch } });
  const nav = resolveNavigation(settings);
  // Alleen de gewijzigde sleutel erbij; wat je niet aanraakte betekent de standaard.
  const setInsight = (patch: Partial<RunInsightSettings>) => void updateSettings({ runInsight: { ...settings.runInsight, ...patch } });
  const setTopic = (topic: InsightTopicSwitch, on: boolean) => setInsight({ topics: { ...settings.runInsight?.topics, [topic]: on } });
  const close = () => setSheet(null);

  return (
    <>
      <SettingsSection title="Op Vandaag">
        <SummaryRow id="ochtendcheck" title="Ochtendcheck" facts={facts} info="ochtendcheck" onChange={(on) => set({ morningCheckIn: on })} />
        <SummaryRow id="weekterugblik" title="Weekterugblik" facts={facts} onChange={(on) => set({ weekReview: on })} />
        <SummaryRow id="weekterugblik-dag" title="Dag van de terugblik" facts={facts} onClick={() => setSheet('weekterugblik-dag')} />
        <SummaryRow id="weekvraag" title="Vraag van de week" facts={facts} onChange={(on) => set({ weeklyQuestion: on })} />
      </SettingsSection>

      <SettingsSection title="Weer">
        <SummaryRow id="weerplaats" title="Plaats" facts={facts} info="plaats" onClick={() => setSheet('weerplaats')} />
        <SummaryRow id="weerregel" title="Weer bij je training" facts={facts} onChange={(on) => set({ weatherLine: on })} />
        <SummaryRow id="weerruil" title="Ruilen bij slecht weer" facts={facts} onChange={(on) => set({ weatherSwap: on })} />
        <SummaryRow id="kledingadvies" title="Kledingadvies" facts={facts} onChange={(on) => set({ clothingAdvice: on })} />
        <SummaryRow id="kleding-voorkeur" title="Je kleding" facts={facts} onClick={() => setSheet('kleding-voorkeur')} />
      </SettingsSection>

      <SettingsSection title="Na een training">
        <SummaryRow id="citaten" title="Citaat" facts={facts} onChange={(on) => set({ completionMoment: on })} />
        <SummaryRow id="geluid" title="Geluid" facts={facts} onChange={(on) => void updateSettings({ introSoundEnabled: on })} />
      </SettingsSection>

      <SettingsSection
        title="Loopinzicht"
        advancedIds={['loop-efficientie', 'loop-langedagen', 'loop-berg', 'loop-vorm', 'loopweer', 'borstband']}
        storageKey="vandaag-loopinzicht"
        advanced={
          <>
            <SummaryRow id="loop-efficientie" title="Efficiëntie" facts={facts} onChange={(on) => setTopic('efficiency', on)} />
            <SummaryRow id="loop-langedagen" title="Lange dagen" facts={facts} onChange={(on) => setTopic('longDays', on)} />
            <SummaryRow id="loop-berg" title="Bergop en bergaf" facts={facts} onChange={(on) => setTopic('climbing', on)} />
            <SummaryRow id="loop-vorm" title="Pas en vorm" facts={facts} onChange={(on) => setTopic('form', on)} />
            <SummaryRow id="loopweer" title="Weer erbij zoeken" facts={facts} info="loopweer" onChange={(on) => setInsight({ weather: on })} />
            <SummaryRow id="borstband" title="Hartslag van de borstband" facts={facts} info="borstband" onChange={(on) => setInsight({ chestStrap: on })} />
          </>
        }
      >
        <SummaryRow id="loopinzicht" title="Inzicht na een training" facts={facts} info="loopinzicht" onChange={(on) => setInsight({ enabled: on })} />
      </SettingsSection>

      <SettingsSection title="Terugknop">
        <SummaryRow id="terugknop" title="Terugknop op een tab" facts={facts} onClick={() => setSheet('terugknop')} />
        <SummaryRow id="hervatten" title="Na een herstart" facts={facts} onClick={() => setSheet('hervatten')} />
      </SettingsSection>

      {sheet === 'terugknop' && <ChoiceFromDef def={CHOICES.terugknop} value={nav.tabBack} onPick={(v) => void updateSettings({ tabBack: v })} onClose={close} />}
      {sheet === 'hervatten' && <ChoiceFromDef def={CHOICES.hervatten} value={nav.resumeMinutes as 0 | 60 | 120 | 240 | 480} onPick={(v) => void updateSettings({ resumeMinutes: v })} onClose={close} />}
      {sheet === 'weekterugblik-dag' && <ChoiceFromDef def={CHOICES.terugblikDag} value={o.weekReviewDay} onPick={(v) => set({ weekReviewDay: v })} onClose={close} />}
      {sheet === 'weerplaats' && <PlaceSheet onClose={close} />}
      {sheet === 'kleding-voorkeur' && <ClothingSheet onClose={close} />}
    </>
  );
}
