import { resolveShorterToday } from '../../../engine/shorterToday';
import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveOverviews, type OverviewSettings } from '../../../engine/overviewSettings';
import { resolveNavigation } from '../../../engine/navigationSettings';
import { resolveBodyCheck } from '../../../engine/bodyCheckSettings';
import { resolveLegEase, resolveLegEaseHow } from '../../../engine/legEaseSettings';
import { resolveMotion } from '../../../engine/motionSettings';
import { resolveQuoteLanguage } from '../../../engine/quoteSettings';
import { resolveSky } from '../../../engine/skySettings';
import { resolveAboveMission } from '../../../engine/todayCards';
import { type InsightTopicSwitch, type RunDetailScreenSettings, type RunFormSwitch, type RunInsightSettings } from '../../../engine/runInsightSettings';
import { matchTodayProfile, todayProfilePatch, type TodayProfileChoice } from '../../../engine/settingsProfiles';
import { Eyebrow } from '../../ui';
import { SettingsList, SettingsSection } from '../SettingsList';
import { resolveRouteStyle } from '../../../engine/routeTarget';
import { resolveRouteStart } from '../../../engine/routeStart';
import { resolveMapBase, resolveMapPhoto } from '../../../engine/routeMap';
import { resolveRouteSearch } from '../../../engine/routeSearchSetting';
import { RouteStartFooter } from './RouteStartFooter';
import { BundleSheet } from './BundleSheet';
import { ChoiceFromDef } from './ChoiceFromDef';
import { SummaryRow } from './SummaryRow';
import { rowShown } from './rowShown';
import { resolveMorningNotice } from '../../../engine/morningNotice';
import { disableMorningNotice, enableMorningNotice } from '../../../utils/morningNotice';
import { ClothingSheet, NoticeInfoSheet, PlaceSheet } from './VandaagSheets';
import { PermissionAskButton } from './PermissionSheets';
import { notificationPort } from '../../../integrations/notifications';
import { noticesNeed, resolveDeviceNotices } from '../../../engine/deviceNotices';
import { resolveEveningBefore } from '../../../engine/eveningBefore';
import type { GroupProps } from './types';


// Vandaag en meldingen: wat ASCEND je op Vandaag laat zien en vraagt, het weer, en wat er na een
// training komt. Alles mag uit (docs/beslissingen/2026-10-22-alles-instelbaar.md).
export function VandaagGroup({ facts, reload, sheet, setSheet }: GroupProps) {
  const { settings, updateSettings } = useAppData();
  const o = resolveOverviews(settings.overviews);
  // Alleen de gewijzigde sleutel erbij; wat je niet aanraakte blijft ontbreken en betekent dus de standaard.
  const set = (patch: Partial<OverviewSettings>) => void updateSettings({ overviews: { ...settings.overviews, ...patch } });
  const nav = resolveNavigation(settings);
  const profile = matchTodayProfile(settings);
  const sky = resolveSky(settings);
  // Alleen de gewijzigde sleutel erbij; wat je niet aanraakte betekent de standaard.
  const setInsight = (patch: Partial<RunInsightSettings>) => void updateSettings({ runInsight: { ...settings.runInsight, ...patch } });
  const setDetail = (patch: Partial<RunDetailScreenSettings>) => setInsight({ detail: { ...settings.runInsight?.detail, ...patch } });
  const setForm = (key: RunFormSwitch, on: boolean) => setDetail({ form: { ...settings.runInsight?.detail?.form, [key]: on } });
  const setTopic = (topic: InsightTopicSwitch, on: boolean) => setInsight({ topics: { ...settings.runInsight?.topics, [topic]: on } });
  const close = () => setSheet(null);
  // Een keuze in een blad opent haar onderblad bovenop dat blad.
  const [inner, setInner] = useState<string | null>(null);
  const closeInner = () => setInner(null);
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
    // In de app vraagt de telefoon zelf om meldingen; daarna plant ASCEND de vraag op tijd.
    const port = notificationPort();
    const result = port.timed ? ((await port.requestNotifications()) === 'granted' ? 'ok' : 'denied') : await enableMorningNotice();
    if (result === 'ok') await updateSettings({ morningNotice: { ...settings.morningNotice, enabled: true, time: notice.time } });
    else {
      setNoticeFailure(result);
      setInner('ochtendmelding-info');
    }
    reload();
  }

  return (
    <>
      <SettingsSection title="Op Vandaag">
        <SummaryRow id="kaarten" title="Kaarten" facts={facts} info="kaarten" onClick={() => setSheet('kaarten')} />
        <SummaryRow id="lichterbenen" title="Lichter bij vermoeide benen" facts={facts} info="lichterbenen" onClick={() => setSheet('lichterbenen')} />
        <SummaryRow id="korter-vandaag" title="Minder tijd vandaag" facts={facts} info="korterVandaag" onClick={() => setSheet('korter-vandaag')} />
      </SettingsSection>

      <SettingsSection title="Meldingen">
        <SummaryRow id="bundel-meldingen" title="Meldingen" facts={facts} info="meldingen" onClick={() => setSheet('bundel-meldingen')} />
      </SettingsSection>

      <SettingsSection title="Weer">
        <SummaryRow id="weerplaats" title="Plaats" facts={facts} info="plaats" onClick={() => setSheet('weerplaats')} />
        <SummaryRow id="bundel-weer" title="Weer en kleding" facts={facts} info="bundelWeer" onClick={() => setSheet('bundel-weer')} />
      </SettingsSection>

      <SettingsSection title="Na een training">
        <SummaryRow id="zweet-vragen" title="Zweetverlies vragen" facts={facts} info="zweetVragen" onChange={(on) => void updateSettings({ askSweat: on })} />
        <SummaryRow id="bundel-inzicht" title="Inzicht na een training" facts={facts} info="loopinzicht" onClick={() => setSheet('bundel-inzicht')} />
        <SummaryRow id="bundel-run-detail" title="Run in detail" facts={facts} info="runDetail" onClick={() => setSheet('bundel-run-detail')} />
      </SettingsSection>

      <SettingsSection title="Uiterlijk">
        <SummaryRow id="lucht" title="Lucht bovenaan" facts={facts} info="lucht" onClick={() => setSheet('lucht')} />
        <SummaryRow id="beweging" title="Beweging" facts={facts} info="beweging" onClick={() => setSheet('beweging')} />
        <SummaryRow id="trillen" title="Trillen" facts={facts} info="trillen" onChange={(on) => void updateSettings({ haptics: on })} />
      </SettingsSection>

      <SettingsSection
        advancedTitles="Ochtendkaart, Ochtend begint om, Vragen bij een korte nacht, Dag van de terugblik, Terugknop, Na een herstart"
        advanced={
          <>
            <SummaryRow id="ochtendkaart" title="Ochtendkaart" facts={facts} info="ochtendkaart" onChange={(on) => set({ morningCard: on })} />
            <SummaryRow id="ochtend-vanaf" title="Ochtend begint om" facts={facts} onClick={() => setSheet('ochtend-vanaf')} />
            <SummaryRow id="korte-nacht" title="Vragen bij een korte nacht" facts={facts} info="korteNacht" onChange={(on) => void updateSettings({ askShortNight: on })} />
            <SummaryRow id="weekterugblik-dag" title="Dag van de terugblik" facts={facts} onClick={() => setSheet('weekterugblik-dag')} />
            <SummaryRow id="terugknop" title="Terugknop op een tab" facts={facts} info="terugknop" onClick={() => setSheet('terugknop')} />
            <SummaryRow id="hervatten" title="Na een herstart" facts={facts} info="hervatten" onClick={() => setSheet('hervatten')} />
          </>
        }
      >
        {null}
      </SettingsSection>

      {sheet === 'korter-vandaag' && (
        <ChoiceFromDef def={CHOICES.korterVandaag} value={resolveShorterToday(settings.shorterToday)} onPick={(v) => void updateSettings({ shorterToday: v })} onClose={close} />
      )}
      {sheet === 'kaarten' && (
        <ChoiceFromDef
          def={CHOICES.kaarten}
          value={profile as TodayProfileChoice}
          onPick={(v) => void updateSettings(todayProfilePatch(v, settings))}
          onClose={close}
          footer={
            <div style={{ marginTop: 16 }}>
              <Eyebrow>Of kies zelf</Eyebrow>
              <SettingsList>
                <SummaryRow id="boven-missie" title="Kaarten boven de missie" facts={facts} info="bovenMissie" onClick={() => setInner('boven-missie')} />
                <SummaryRow id="avond-ervoor" title="De avond ervoor" facts={facts} info="avondErvoor" onChange={(on) => void updateSettings({ eveningBefore: on })} />
                <SummaryRow id="avond-ervoor-tijd" title="Avond begint om" facts={facts} onClick={() => setInner('avond-ervoor-tijd')} />
                <SummaryRow id="ochtendcheck" title="Ochtendcheck" facts={facts} info="ochtendcheck" onChange={(on) => set({ morningCheckIn: on })} />
                <SummaryRow id="benen-na-test" title="Benen vragen na een test" facts={facts} info="benenNaTest" onChange={(on) => set({ legsAfterEffort: on })} />
                <SummaryRow id="weekterugblik" title="Weekterugblik" facts={facts} onChange={(on) => set({ weekReview: on })} />
                <SummaryRow id="lijfvraag" title="Hoe voelt je lijf?" facts={facts} info="lijfvraag" onClick={() => setInner('lijfvraag')} />
                <SummaryRow id="weekvraag" title="Vraag van de week" facts={facts} info="weekvraag" onChange={(on) => set({ weeklyQuestion: on })} />
                <SummaryRow id="citaten" title="Citaat na een training" facts={facts} info="citaten" onChange={(on) => set({ completionMoment: on })} />
                <SummaryRow id="dagcitaat" title="Citaat op Vandaag" facts={facts} info="dagcitaat" onClick={() => setInner('dagcitaat')} />
                <SummaryRow id="geluid" title="Geluid" facts={facts} info="geluid" onChange={(on) => void updateSettings({ introSoundEnabled: on })} />
              </SettingsList>
            </div>
          }
        />
      )}
      {sheet === 'bundel-meldingen' && (
        <BundleSheet
          eyebrow="Vandaag en meldingen"
          title="Meldingen"
          line="Welke meldingen ASCEND op je telefoon mag geven, en wanneer."
          onClose={close}
          footer={facts.device && facts.device !== 'unknown' && facts.device.timed ? <PermissionAskButton device={facts.device} need={noticesNeed(settings, facts.device)} onDone={reload} /> : undefined}
        >
          <SummaryRow id="ochtendmelding" title="Ochtendvraag" facts={facts} info="ochtendmelding" onChange={(on) => void setNotice(on)} onClick={() => setInner('ochtendmelding-info')} />
          <SummaryRow id="ochtendmelding-tijd" title="Tijd van de ochtendvraag" facts={facts} onClick={() => setInner('ochtendmelding-tijd')} />
          <SummaryRow id="rust-melding" title="Einde van de rust" facts={facts} info="rustMelding" onChange={(on) => void updateSettings({ restNotice: on })} />
          <SummaryRow id="weekmelding" title="Weekmelding op zondag" facts={facts} info="weekmelding" onChange={(on) => void updateSettings({ weekNotice: on })} />
          <SummaryRow id="weekmelding-tijd" title="Tijd van de weekmelding" facts={facts} onClick={() => setInner('weekmelding-tijd')} />
          <SummaryRow id="avond-melding" title="Melding de avond ervoor" facts={facts} info="avondMelding" onChange={(on) => void updateSettings({ eveningNotice: on })} />
        </BundleSheet>
      )}
      {inner === 'weekmelding-tijd' && <ChoiceFromDef def={CHOICES.weekmeldingTijd} value={resolveDeviceNotices(settings).weekTime} onPick={(v) => void updateSettings({ weekNoticeTime: v })} onClose={closeInner} />}
      {sheet === 'bundel-weer' && (
        <BundleSheet eyebrow="Vandaag en meldingen" title="Weer en kleding" line="Het weer bij je training en wat je aantrekt." onClose={close}>
          <SummaryRow id="weerregel" title="Weer bij je training" facts={facts} onChange={(on) => set({ weatherLine: on })} />
          <SummaryRow id="beste-moment" title="Beste moment tonen" facts={facts} info="besteMoment" onChange={(on) => set({ bestMoment: on })} />
          <SummaryRow id="weeralarm" title="Weerwaarschuwingen" facts={facts} info="weeralarm" onChange={(on) => void updateSettings({ weatherWarnings: on })} />
          <SummaryRow id="lawinegevaar" title="Lawinegevaar" facts={facts} info="lawinegevaar" onChange={(on) => void updateSettings({ avalancheBulletin: on })} />
          <SummaryRow id="regen-uur" title="Regen in het komende uur" facts={facts} onChange={(on) => set({ rainSoon: on })} />
          <SummaryRow id="heuvels-buurt" title="Heuvels en trappen in de buurt" facts={facts} onChange={(on) => set({ hillsNearby: on })} />
          <SummaryRow id="route-voorstel" title="Route voorstellen" facts={facts} info="routeVoorstel" onChange={(on) => void updateSettings({ routeProposal: on })} />
          <SummaryRow id="route-soort" title="Welke lus eerst" facts={facts} onClick={() => setInner('route-soort')} />
          <SummaryRow id="route-start" title="Startpunt van je lus" facts={facts} onClick={() => setInner('route-start')} />
          <SummaryRow id="route-zoeken" title="Lus zoeken" facts={facts} info="routeZoeken" onClick={() => setInner('route-zoeken')} />
          <SummaryRow id="route-kaart" title="Ondergrond van de kaart" facts={facts} info="routeKaart" onClick={() => setInner('route-kaart')} />
          <SummaryRow id="route-luchtfoto" title="Kaart of luchtfoto" facts={facts} info="routeLuchtfoto" onClick={() => setInner('route-luchtfoto')} />
          <SummaryRow id="maanstand" title="Maanstand bij een avondtocht" facts={facts} onChange={(on) => set({ moonLine: on })} />
          <SummaryRow id="weerruil" title="Ruilen bij slecht weer" facts={facts} onChange={(on) => set({ weatherSwap: on })} />
          <SummaryRow id="kledingadvies" title="Kledingadvies" facts={facts} onChange={(on) => set({ clothingAdvice: on })} />
          <SummaryRow id="kleding-voorkeur" title="Je kleding" facts={facts} info="kleding" onClick={() => setInner('kleding-voorkeur')} />
        </BundleSheet>
      )}
      {inner === 'route-soort' && <ChoiceFromDef def={CHOICES.routeSoort} value={resolveRouteStyle(settings.routeStyle)} onPick={(v) => void updateSettings({ routeStyle: v })} onClose={closeInner} />}
      {inner === 'route-zoeken' && <ChoiceFromDef def={CHOICES.routeZoeken} value={resolveRouteSearch(settings.routeSearch)} onPick={(v) => void updateSettings({ routeSearch: v })} onClose={closeInner} />}
      {inner === 'route-kaart' && <ChoiceFromDef def={CHOICES.routeKaart} value={resolveMapBase(settings.routeMapBase)} onPick={(v) => void updateSettings({ routeMapBase: v })} onClose={closeInner} />}
      {inner === 'route-luchtfoto' && <ChoiceFromDef def={CHOICES.routeLuchtfoto} value={resolveMapPhoto(settings.routeMapPhoto)} onPick={(v) => void updateSettings({ routeMapPhoto: v })} onClose={closeInner} />}
      {inner === 'route-start' && <ChoiceFromDef def={CHOICES.routeStart} value={resolveRouteStart(settings.routeStart)} onPick={(v) => void updateSettings({ routeStart: v })} onClose={closeInner} keepOpen footer={<RouteStartFooter mode={resolveRouteStart(settings.routeStart)} />} />}
      {sheet === 'bundel-inzicht' && (
        <BundleSheet eyebrow="Vandaag en meldingen" title="Inzicht na een training" line="Hoogstens twee regels over wat beter ging en waar je op moet letten." onClose={close}>
          <SummaryRow id="loopinzicht" title="Inzicht na een training" facts={facts} info="loopinzicht" onChange={(on) => setInsight({ enabled: on })} />
          <SummaryRow id="loop-efficientie" title="Efficiëntie" facts={facts} onChange={(on) => setTopic('efficiency', on)} />
          <SummaryRow id="loop-langedagen" title="Lange dagen" facts={facts} onChange={(on) => setTopic('longDays', on)} />
          <SummaryRow id="loop-berg" title="Bergop en bergaf" facts={facts} onChange={(on) => setTopic('climbing', on)} />
          <SummaryRow id="loop-vorm" title="Pas en vorm" facts={facts} onChange={(on) => setTopic('form', on)} />
          <SummaryRow id="loopweer" title="Weer erbij zoeken" facts={facts} info="loopweer" onChange={(on) => setInsight({ weather: on })} />
          <SummaryRow id="borstband" title="Hartslag van de borstband" facts={facts} info="borstband" onChange={(on) => setInsight({ chestStrap: on })} />
        </BundleSheet>
      )}
      {sheet === 'bundel-run-detail' && (
        <BundleSheet eyebrow="Vandaag en meldingen" title="Run in detail" line="Je loop kilometer na kilometer, vanuit het logblad." onClose={close}>
          <SummaryRow id="run-detail" title="Run in detail tonen" facts={facts} info="runDetail" onChange={(on) => setDetail({ show: on })} />
          <SummaryRow id="run-detail-patronen" title="Patronen tonen" facts={facts} info="runDetailPatronen" onChange={(on) => setDetail({ patterns: on })} />
          <SummaryRow id="run-detail-advies" title="Advies tonen" facts={facts} info="runDetailAdvies" onChange={(on) => setDetail({ advice: on })} />
          {rowShown('loopvorm-cadans', facts) && (
            <div style={{ marginTop: 16 }}>
              <Eyebrow>Loopvorm tonen</Eyebrow>
              <SettingsList>
                <SummaryRow id="loopvorm-cadans" title="Cadans" facts={facts} onChange={(on) => setForm('cadence', on)} />
                <SummaryRow id="loopvorm-grondcontact" title="Grondcontact" facts={facts} onChange={(on) => setForm('stanceTimeMs', on)} />
                <SummaryRow id="loopvorm-staplengte" title="Staplengte" facts={facts} onChange={(on) => setForm('stepLengthM', on)} />
                <SummaryRow id="loopvorm-oscillatie" title="Op en neer" facts={facts} onChange={(on) => setForm('oscillationMm', on)} />
                <SummaryRow id="loopvorm-balans" title="Balans" facts={facts} info="runDetailLoopvorm" onChange={(on) => setForm('stanceBalanceLeftPct', on)} />
              </SettingsList>
            </div>
          )}
        </BundleSheet>
      )}
      {sheet === 'lucht' && (
        <ChoiceFromDef
          def={CHOICES.lucht}
          value={sky.sky}
          onPick={(v) => void updateSettings({ sky: v })}
          onClose={close}
          footer={
            rowShown('lucht-vanaf', facts) ? (
              <div style={{ marginTop: 16 }}>
                <SettingsList>
                  <SummaryRow id="lucht-vanaf" title="Donker vanaf" facts={facts} onClick={() => setInner('lucht-vanaf')} />
                </SettingsList>
              </div>
            ) : undefined
          }
        />
      )}
      {sheet === 'lichterbenen' && (
        <ChoiceFromDef
          def={CHOICES.lichterbenen}
          value={resolveLegEase(settings)}
          onPick={(v) => void updateSettings({ legEase: v })}
          onClose={close}
          footer={
            rowShown('lichterbenen-hoe', facts) ? (
              <div style={{ marginTop: 16 }}>
                <SettingsList>
                  <SummaryRow id="lichterbenen-hoe" title="Hoe licht" facts={facts} info="lichterbenenHoe" onClick={() => setInner('lichterbenen-hoe')} />
                </SettingsList>
              </div>
            ) : undefined
          }
        />
      )}
      {inner === 'lichterbenen-hoe' && <ChoiceFromDef def={CHOICES.lichterbenenHoe} value={resolveLegEaseHow(settings)} onPick={(v) => void updateSettings({ legEaseHow: v })} onClose={closeInner} />}
      {inner === 'avond-ervoor-tijd' && (
        <ChoiceFromDef def={CHOICES.avondVanaf} value={resolveEveningBefore(settings).time} onPick={(v) => void updateSettings({ eveningBeforeTime: v })} onClose={closeInner} />
      )}
      {inner === 'boven-missie' && <ChoiceFromDef def={CHOICES.bovenMissie} value={resolveAboveMission(settings.cardsAboveMission)} onPick={(v) => void updateSettings({ cardsAboveMission: v })} onClose={closeInner} />}
      {inner === 'lijfvraag' && <ChoiceFromDef def={CHOICES.lijfvraag} value={resolveBodyCheck(settings)} onPick={(v) => void updateSettings({ bodyCheck: v })} onClose={closeInner} />}
      {inner === 'lucht-vanaf' && <ChoiceFromDef def={CHOICES.luchtVanaf} value={sky.nightFrom} onPick={(v) => void updateSettings({ skyNightFrom: v })} onClose={closeInner} />}
      {inner === 'dagcitaat' && <ChoiceFromDef def={CHOICES.dagcitaat} value={resolveQuoteLanguage(settings)} onPick={(v) => void updateSettings({ quoteLanguage: v })} onClose={closeInner} />}
      {sheet === 'beweging' && <ChoiceFromDef def={CHOICES.beweging} value={resolveMotion(settings)} onPick={(v) => void updateSettings({ motion: v })} onClose={close} />}
      {sheet === 'terugknop' && <ChoiceFromDef def={CHOICES.terugknop} value={nav.tabBack} onPick={(v) => void updateSettings({ tabBack: v })} onClose={close} />}
      {sheet === 'hervatten' && <ChoiceFromDef def={CHOICES.hervatten} value={nav.resumeMinutes as 0 | 60 | 120 | 240 | 480} onPick={(v) => void updateSettings({ resumeMinutes: v })} onClose={close} />}
      {sheet === 'ochtend-vanaf' && <ChoiceFromDef def={CHOICES.ochtendVanaf} value={o.morningCardFrom} onPick={(v) => set({ morningCardFrom: v })} onClose={close} />}
      {sheet === 'weekterugblik-dag' && <ChoiceFromDef def={CHOICES.terugblikDag} value={o.weekReviewDay} onPick={(v) => set({ weekReviewDay: v })} onClose={close} />}
      {inner === 'ochtendmelding-tijd' && <ChoiceFromDef def={CHOICES.ochtendTijd} value={notice.time as typeof CHOICES.ochtendTijd.advice} onPick={(v) => void updateSettings({ morningNotice: { ...settings.morningNotice, time: v } })} onClose={closeInner} />}
      {inner === 'ochtendmelding-info' && <NoticeInfoSheet support={facts.notice?.support} failure={noticeFailure} onClose={() => { setNoticeFailure(undefined); closeInner(); }} />}
      {sheet === 'weerplaats' && <PlaceSheet onClose={close} />}
      {inner === 'kleding-voorkeur' && <ClothingSheet onClose={closeInner} />}
    </>
  );
}
