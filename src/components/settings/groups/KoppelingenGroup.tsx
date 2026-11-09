import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { DEFAULT_WATCH_NAME_PREFIX } from '../../../engine/watchWorkout';
import type { WatchUseKey } from '../../../engine/watchUse';
import { getConnection, setAutoTick, setGarminLeads, setTakeCorrections, setWatchUse, syncWatchActivities } from '../../../storage/externalActivities';
import { setMacroFactorLeads } from '../../../storage/macrofactor';
import { setWatchWorkoutsEnabled, syncWatchWorkouts } from '../../../storage/watchWorkouts';
import { disableHealthConnect, enableHealthConnect, openHealthConnectSettings, syncHealthConnect } from '../../../storage/healthConnect';
import { healthEnableNote, healthOffNote, type HealthNote } from '../../../engine/healthConnectNote';
import { TextButton } from '../../TextButton';
import { SettingsSection } from '../SettingsList';
import { BundleSheet } from './BundleSheet';
import { ChoiceFromDef } from './ChoiceFromDef';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';

// Koppelingen: Garmin via intervals.icu, Health Connect (alleen in de Android-app) en MacroFactor. De
// schakelaars van wat ASCEND van je horloge gebruikt staan hier; koppelen en inlezen blijven hun eigen
// pagina. Wat hier aan of uit gaat is een apparaatvoorkeur en gaat niet mee in een back-up.
export function KoppelingenGroup({ facts, reload, sheet, setSheet }: GroupProps) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppData();
  const [note, setNote] = useState<string | null>(null);
  // Een keuze in het blad Trainingen naar je horloge opent haar onderblad bovenop dat blad.
  const [inner, setInner] = useState<string | null>(null);
  // Health Connect: de zin na aan- of uitzetten, en een slot zodat een tweede tik niet dubbel vraagt.
  const [health, setHealth] = useState<HealthNote | null>(null);
  const healthBusy = useRef(false);

  // Aan: pas nu vraagt Android om toestemming, daarna meteen een ronde. Elke uitkomst staat onder de rij.
  async function changeHealth(on: boolean) {
    if (healthBusy.current) return;
    healthBusy.current = true;
    setHealth(on ? { text: 'Even kijken bij Health Connect…', tone: 'ok' } : null);
    try {
      if (on) setHealth(healthEnableNote(await enableHealthConnect()));
      else {
        await disableHealthConnect();
        setHealth(healthOffNote());
      }
    } catch {
      setHealth({ text: 'Dat lukte niet. Probeer het zo opnieuw.', tone: 'warn' });
    } finally {
      healthBusy.current = false;
      reload();
    }
  }

  // Uit: weg van de telefoon. Aan: meteen ophalen, als er een koppeling is.
  async function changeUse(key: WatchUseKey, on: boolean) {
    try {
      await setWatchUse({ [key]: on });
      if (on && (await getConnection())) await syncWatchActivities({ force: true });
      // Dezelfde keuzes gelden voor Health Connect: wat weer aan gaat, haalt een ronde meteen op.
      if (on && facts.healthConnect?.enabled) await syncHealthConnect({ force: true });
    } finally {
      reload();
    }
  }

  async function changeSend(on: boolean) {
    setNote(null);
    try {
      const switched = await setWatchWorkoutsEnabled(on);
      if (switched.status === 'error') setNote(switched.message);
      else if (on) {
        const result = await syncWatchWorkouts({ force: true });
        if (result.status === 'error') setNote(result.message);
      }
    } finally {
      reload();
    }
  }

  // De naam van wat al is gestuurd verandert bij de volgende ronde; staat het sturen aan, dan draait die meteen.
  async function changePrefix(choice: 'short' | 'long' | 'none') {
    setNote(null);
    try {
      await updateSettings({ watchNamePrefix: choice });
      if (facts.watch?.sendEnabled) {
        const result = await syncWatchWorkouts({ force: true });
        if (result.status === 'error') setNote(result.message);
      }
    } finally {
      reload();
    }
  }

  // De slagen op het horloge veranderen bij de volgende ronde; staat het sturen aan, dan draait die meteen.
  async function changeHr(patch: { watchHeartRate?: 'ascend' | 'intervals'; watchCalmRun?: boolean }) {
    setNote(null);
    try {
      await updateSettings(patch);
      if (facts.watch?.sendEnabled) {
        const result = await syncWatchWorkouts({ force: true });
        if (result.status === 'error') setNote(result.message);
      }
    } finally {
      reload();
    }
  }
  const changeCalm = (on: boolean) => changeHr({ watchCalmRun: on });

  // Met Health Connect aan komt niet alles van het horloge (engine/settingsSummary.ts, bundel-horloge-gebruik).
  const usageTitle = facts.healthConnect?.enabled ? 'Gebruik van je gegevens' : 'Gebruik van je horloge';
  const usageRow = <SummaryRow id="bundel-horloge-gebruik" title={usageTitle} facts={facts} info="bundelHorlogeGebruik" onClick={() => setSheet('bundel-horloge-gebruik')} />;

  return (
    <>
      {note && <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-warning)' }} role="status">{note}</p>}

      <SettingsSection title="Garmin">
        <SummaryRow id="garmin" title="Via intervals.icu" facts={facts} info="garmin" onClick={() => navigate('/koppelen/garmin')} />
        {/* Zonder koppeling hoort een rij er niet (SHOW_WHEN in data/settingsLayout.ts). Zonder Garmin
            maar met Health Connect aan staat Gebruik van je gegevens bij Health Connect. */}
        {facts.watch?.linked === true && usageRow}
        <SummaryRow id="vanzelf-afvinken" title="Vanzelf afvinken" facts={facts} info="vanzelfAfvinken" onChange={(on) => void setAutoTick(on).finally(reload)} />
        <SummaryRow id="garmin-leidend" title="Garmin is leidend" facts={facts} info="garminLeidend" onChange={(on) => void setGarminLeads(on).finally(reload)} />
        <SummaryRow id="correcties-overnemen" title="Correcties uit intervals.icu overnemen" facts={facts} info="correctiesOvernemen" onChange={(on) => void setTakeCorrections(on).finally(reload)} />
        <SummaryRow id="horloge-stil" title="Melden als je horloge stilvalt" facts={facts} info="horlogeStil" onChange={(on) => void updateSettings({ watchSilence: on })} />
        <SummaryRow id="bundel-horloge-sturen" title="Trainingen naar je horloge" facts={facts} info="naarHorloge" onClick={() => setSheet('bundel-horloge-sturen')} />
      </SettingsSection>

      <SettingsSection title="Health Connect">
        {/* In de browser gedimd met uitleg, zonder schakelaar (engine/settingsSummary.ts#healthConnectRow). */}
        <SummaryRow id="health-connect" title="Health Connect" facts={facts} info="healthConnect" kind="static" onChange={(on) => void changeHealth(on)} />
        {facts.watch?.linked !== true && usageRow}
      </SettingsSection>
      {health && (
        <div role="status">
          <p className={`st-hint${health.tone === 'warn' ? ' warn' : ''}`}>{health.text}</p>
          {health.openSettings && (
            <div className="st-hint" style={{ marginTop: 0 }}>
              <TextButton onClick={() => void openHealthConnectSettings().then((ok) => !ok && setHealth({ text: 'Health Connect ging niet open. Je vindt het in de instellingen van je telefoon.', tone: 'warn' }))}>Health Connect openen</TextButton>
            </div>
          )}
        </div>
      )}
      {/* Na elke ronde een regel per soort wat er binnenkwam, ook als de ronde niets nieuws had. */}
      {facts.healthConnect?.enabled && !facts.healthConnect.errorKind && facts.healthConnect.roundLines && (
        <div role="status">
          {facts.healthConnect.roundLines.map((line) => <p key={line} className="st-hint" style={{ marginTop: 0 }}>{line}</p>)}
        </div>
      )}

      <SettingsSection title="MacroFactor">
        <SummaryRow id="macrofactor" title="Laatste export" facts={facts} info="macrofactorExport" onClick={() => navigate('/koppelen/macrofactor')} />
        <SummaryRow id="macrofactor-leidend" title="Leidend voor kracht" facts={facts} info="macrofactorLeidend" onChange={(on) => void setMacroFactorLeads(on).finally(reload)} />
        <SummaryRow id="macrofactor-gewicht" title="Gewicht gebruiken" facts={facts} onChange={(on) => void updateSettings({ weightFromMacroFactor: on })} />
      </SettingsSection>

      <SettingsSection title="Strava">
        <SummaryRow id="strava-tekst" title="Tekst voor Strava" facts={facts} info="stravaTekst" onChange={(on) => void updateSettings({ stravaText: on })} />
      </SettingsSection>

      {sheet === 'bundel-horloge-gebruik' && (
        <BundleSheet eyebrow="Koppelingen" title={usageTitle} line="Uit betekent: ASCEND haalt het niet meer op en bewaart het niet." onClose={() => setSheet(null)}>
          <SummaryRow id="garmin-trainingen" title="Trainingen" facts={facts} onChange={(on) => void changeUse('activities', on)} />
          <SummaryRow id="horloge-details" title="Details van lopen" facts={facts} onChange={(on) => void changeUse('details', on)} />
          <SummaryRow id="slaap" title="Slaap" facts={facts} onChange={(on) => void changeUse('sleep', on)} />
          <SummaryRow id="rusthartslag" title="Rusthartslag" facts={facts} onChange={(on) => void changeUse('restingHeartRate', on)} />
          <SummaryRow id="hrv" title="HRV" facts={facts} onChange={(on) => void changeUse('hrv', on)} />
        </BundleSheet>
      )}

      {sheet === 'bundel-horloge-sturen' && (
        <BundleSheet eyebrow="Koppelingen" title="Trainingen naar je horloge" onClose={() => setSheet(null)}>
          <SummaryRow id="naar-horloge" title="Trainingen naar je horloge" facts={facts} info="naarHorloge" onChange={(on) => void changeSend(on)} />
          <SummaryRow id="horloge-voorvoegsel" title="Voorvoegsel voor de naam" facts={facts} info="horlogeVoorvoegsel" onClick={() => setInner('horloge-voorvoegsel')} />
          <SummaryRow id="horloge-hartslag" title="Hartslag op je horloge" facts={facts} info="hartslagHorloge" onClick={() => setInner('horloge-hartslag')} />
          <SummaryRow id="horloge-rustige-loop" title="Rustige loop: ruime grens" facts={facts} info="horlogeRustigeLoop" onChange={(on) => void changeCalm(on)} />
          <SummaryRow id="horloge-gedaan-weghalen" title="Gedane trainingen weghalen" facts={facts} info="horlogeGedaanWeghalen" onChange={(on) => void updateSettings({ watchRemoveDone: on })} />
          <SummaryRow id="horloge-status" title="Laten zien of het gelukt is" facts={facts} info="horlogeStatus" onChange={(on) => void updateSettings({ showWatchStatus: on, showWatchStatusOnWeek: on })} />
        </BundleSheet>
      )}

      {inner === 'horloge-voorvoegsel' && (
        <ChoiceFromDef def={CHOICES.voorvoegsel} value={settings.watchNamePrefix ?? DEFAULT_WATCH_NAME_PREFIX} onPick={(v) => void changePrefix(v)} onClose={() => setInner(null)} />
      )}

      {inner === 'horloge-hartslag' && (
        <ChoiceFromDef def={CHOICES.hartslagHorloge} value={settings.watchHeartRate ?? 'ascend'} onPick={(v) => void changeHr({ watchHeartRate: v })} onClose={() => setInner(null)} />
      )}
    </>
  );
}
