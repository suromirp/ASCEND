import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveOverviews, type OverviewSettings } from '../../../engine/overviewSettings';
import { resolveNavigation } from '../../../engine/navigationSettings';
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
