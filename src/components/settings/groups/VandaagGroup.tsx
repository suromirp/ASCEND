import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveOverviews, type OverviewSettings } from '../../../engine/overviewSettings';
import { resolveNavigation } from '../../../engine/navigationSettings';
import { resolveMotion } from '../../../engine/motionSettings';
import { resolveSky } from '../../../engine/skySettings';
import { type InsightTopicSwitch, type RunInsightSettings } from '../../../engine/runInsightSettings';
import { SettingsSection } from '../SettingsList';
import { ChoiceFromDef } from './ChoiceFromDef';
import { SummaryRow } from './SummaryRow';
import { resolveMorningNotice } from '../../../engine/morningNotice';
import { disableMorningNotice, enableMorningNotice } from '../../../utils/morningNotice';
import { ClothingSheet, NoticeInfoSheet, PlaceSheet } from './VandaagSheets';
import type { GroupProps } from './types';

// Vandaag en meldingen: wat ASCEND je op Vandaag laat zien en vraagt, het weer, en wat er na een
// training komt. Alles mag uit (docs/beslissingen/2026-10-22-alles-instelbaar.md).
export function VandaagGroup({ facts, reload, sheet, setSheet }: GroupProps) {
  const { settings, updateSettings } = useAppData();
  const o = resolveOverviews(settings.overviews);
  // Alleen de gewijzigde sleutel erbij; wat je niet aanraakte blijft ontbreken en betekent dus de standaard.
  const set = (patch: Partial<OverviewSettings>) => void updateSettings({ overviews: { ...settings.overviews, ...patch } });
  const nav = resolveNavigation(settings);
  const sky = resolveSky(settings);
  // Alleen de gewijzigde sleutel erbij; wat je niet aanraakte betekent de standaard.
  const setInsight = (patch: Partial<RunInsightSettings>) => void updateSettings({ runInsight: { ...settings.runInsight, ...patch } });
  const setTopic = (topic: InsightTopicSwitch, on: boolean) => setInsight({ topics: { ...settings.runInsight?.topics, [topic]: on } });
  const close = () => setSheet(null);
  const notice = resolveMorningNotice(settings.morningNotice);
  // Waarom aanzetten net mislukte, voor het blad (Chrome kan de achtergrond weigeren).
  const [noticeFailure, setNoticeFailure] = useState<'denied' | 'no_background' | 'sync_refused' | undefined>();

  // Aanzetten is een tik van jou: eerst vraagt de telefoon om toestemming, dan meldt ASCEND
  // zich aan voor de periodieke sync. Lukt een van de twee niet, dan blijft de schakelaar uit
  // en zegt het blad waarom. Uitzetten meldt de sync weer af.
  async function setNotice(on: boolean) {
    if (!on) {
      await updateSettings({ morningNotice: { ...settings.morningNotice, enabled: false } });
      await disableMorningNotice();
      reload();
      return;
    }
    const result = await enableMorningNotice();
    if (result === 'ok') await updateSettings({ morningNotice: { ...settings.morningNotice, enabled: true, time: notice.time } });
    else {
      setNoticeFailure(result);
      setSheet('ochtendmelding-info');
    }
    reload();
  }

  return (
    <>
      <SettingsSection title="Op Vandaag">
        <SummaryRow id="ochtendcheck" title="Ochtendcheck" facts={facts} info="ochtendcheck" onChange={(on) => set({ morningCheckIn: on })} />
        <SummaryRow id="ochtendkaart" title="Ochtendkaart" facts={facts} info="ochtendkaart" onChange={(on) => set({ morningCard: on })} />
        <SummaryRow id="ochtend-vanaf" title="Ochtend begint om" facts={facts} onClick={() => setSheet('ochtend-vanaf')} />
        <SummaryRow id="weekterugblik" title="Weekterugblik" facts={facts} onChange={(on) => set({ weekReview: on })} />
        <SummaryRow id="weekterugblik-dag" title="Dag van de terugblik" facts={facts} onClick={() => setSheet('weekterugblik-dag')} />
        <SummaryRow id="weekvraag" title="Vraag van de week" facts={facts} onChange={(on) => set({ weeklyQuestion: on })} />
      </SettingsSection>

      <SettingsSection title="Meldingen">
        <SummaryRow id="ochtendmelding" title="Ochtendmelding" facts={facts} info="ochtendmelding" onChange={(on) => void setNotice(on)} onClick={() => setSheet('ochtendmelding-info')} />
        <SummaryRow id="ochtendmelding-tijd" title="Tijd van de melding" facts={facts} onClick={() => setSheet('ochtendmelding-tijd')} />
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

      <SettingsSection title="Uiterlijk">
        <SummaryRow id="lucht" title="Lucht bovenaan" facts={facts} info="lucht" onClick={() => setSheet('lucht')} />
        <SummaryRow id="lucht-vanaf" title="Donker vanaf" facts={facts} onClick={() => setSheet('lucht-vanaf')} />
        <SummaryRow id="beweging" title="Beweging" facts={facts} info="beweging" onClick={() => setSheet('beweging')} />
      </SettingsSection>

      <SettingsSection title="Terugknop">
        <SummaryRow id="terugknop" title="Terugknop op een tab" facts={facts} onClick={() => setSheet('terugknop')} />
        <SummaryRow id="hervatten" title="Na een herstart" facts={facts} onClick={() => setSheet('hervatten')} />
      </SettingsSection>

      {sheet === 'lucht' && <ChoiceFromDef def={CHOICES.lucht} value={sky.sky} onPick={(v) => void updateSettings({ sky: v })} onClose={close} />}
      {sheet === 'lucht-vanaf' && <ChoiceFromDef def={CHOICES.luchtVanaf} value={sky.nightFrom} onPick={(v) => void updateSettings({ skyNightFrom: v })} onClose={close} />}
      {sheet === 'beweging' && <ChoiceFromDef def={CHOICES.beweging} value={resolveMotion(settings)} onPick={(v) => void updateSettings({ motion: v })} onClose={close} />}
      {sheet === 'terugknop' && <ChoiceFromDef def={CHOICES.terugknop} value={nav.tabBack} onPick={(v) => void updateSettings({ tabBack: v })} onClose={close} />}
      {sheet === 'hervatten' && <ChoiceFromDef def={CHOICES.hervatten} value={nav.resumeMinutes as 0 | 60 | 120 | 240 | 480} onPick={(v) => void updateSettings({ resumeMinutes: v })} onClose={close} />}
      {sheet === 'ochtend-vanaf' && <ChoiceFromDef def={CHOICES.ochtendVanaf} value={o.morningCardFrom} onPick={(v) => set({ morningCardFrom: v })} onClose={close} />}
      {sheet === 'weekterugblik-dag' && <ChoiceFromDef def={CHOICES.terugblikDag} value={o.weekReviewDay} onPick={(v) => set({ weekReviewDay: v })} onClose={close} />}
      {sheet === 'ochtendmelding-tijd' && <ChoiceFromDef def={CHOICES.ochtendTijd} value={notice.time as typeof CHOICES.ochtendTijd.advice} onPick={(v) => void updateSettings({ morningNotice: { ...settings.morningNotice, time: v } })} onClose={close} />}
      {sheet === 'ochtendmelding-info' && <NoticeInfoSheet support={facts.notice?.support} failure={noticeFailure} onClose={() => { setNoticeFailure(undefined); close(); }} />}
      {sheet === 'weerplaats' && <PlaceSheet onClose={close} />}
      {sheet === 'kleding-voorkeur' && <ClothingSheet onClose={close} />}
    </>
  );
}
