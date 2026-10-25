import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { DEFAULT_WATCH_NAME_PREFIX } from '../../../engine/watchWorkout';
import type { WatchUseKey } from '../../../engine/watchUse';
import { getConnection, setAutoTick, setGarminLeads, setTakeCorrections, setWatchUse, syncWatchActivities } from '../../../storage/externalActivities';
import { setMacroFactorLeads } from '../../../storage/macrofactor';
import { setWatchWorkoutsEnabled, syncWatchWorkouts } from '../../../storage/watchWorkouts';
import { SettingsRow, SettingsSection } from '../SettingsList';
import { ChoiceFromDef } from './ChoiceFromDef';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';

// Koppelingen: Garmin via intervals.icu, MacroFactor en (later) Health Connect. De schakelaars van wat
// ASCEND van je horloge gebruikt staan hier; koppelen en inlezen blijven hun eigen pagina. Wat hier
// aan of uit gaat is een apparaatvoorkeur en gaat niet mee in een back-up.
export function KoppelingenGroup({ facts, reload, sheet, setSheet }: GroupProps) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppData();
  const [note, setNote] = useState<string | null>(null);

  // Uit: weg van de telefoon. Aan: meteen ophalen, als er een koppeling is.
  async function changeUse(key: WatchUseKey, on: boolean) {
    try {
      await setWatchUse({ [key]: on });
      if (on && (await getConnection())) await syncWatchActivities({ force: true });
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

  return (
    <>
      {note && <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-warning)' }} role="status">{note}</p>}

      <SettingsSection title="Garmin">
        <SummaryRow id="garmin" title="Via intervals.icu" facts={facts} onClick={() => navigate('/koppelen/garmin')} />
        {/* Zonder koppeling hoort een rij er niet (hidden in engine/settingsSummary.ts). */}
        <>
            <SummaryRow id="garmin-trainingen" title="Trainingen" facts={facts} onChange={(on) => void changeUse('activities', on)} />
            <SummaryRow id="vanzelf-afvinken" title="Vanzelf afvinken" facts={facts} info="vanzelfAfvinken" onChange={(on) => void setAutoTick(on).finally(reload)} />
            <SummaryRow id="garmin-leidend" title="Garmin is leidend" facts={facts} info="garminLeidend" onChange={(on) => void setGarminLeads(on).finally(reload)} />
            <SummaryRow id="correcties-overnemen" title="Correcties uit intervals.icu overnemen" facts={facts} info="correctiesOvernemen" onChange={(on) => void setTakeCorrections(on).finally(reload)} />
            <SummaryRow id="horloge-details" title="Details van loopjes" facts={facts} onChange={(on) => void changeUse('details', on)} />
            <SummaryRow id="slaap" title="Slaap" facts={facts} onChange={(on) => void changeUse('sleep', on)} />
            <SummaryRow id="rusthartslag" title="Rusthartslag" facts={facts} onChange={(on) => void changeUse('restingHeartRate', on)} />
            <SummaryRow id="hrv" title="HRV" facts={facts} onChange={(on) => void changeUse('hrv', on)} />
            <SummaryRow id="naar-horloge" title="Trainingen naar je horloge" facts={facts} onChange={(on) => void changeSend(on)} />
            <SummaryRow id="horloge-voorvoegsel" title="Voorvoegsel voor de naam" facts={facts} onClick={() => setSheet('horloge-voorvoegsel')} />
            <SummaryRow id="horloge-hartslag" title="Hartslag op je horloge" facts={facts} info="hartslagHorloge" onClick={() => setSheet('horloge-hartslag')} />
            <SummaryRow id="horloge-rustige-loop" title="Rustige loop: ruime grens" facts={facts} onChange={(on) => void changeCalm(on)} />
            <SummaryRow id="horloge-gedaan-weghalen" title="Gedane trainingen weghalen" facts={facts} onChange={(on) => void updateSettings({ watchRemoveDone: on })} />
            <SummaryRow id="horloge-status" title="Status van het versturen" facts={facts} onChange={(on) => void updateSettings({ showWatchStatus: on })} />
            <SummaryRow id="horloge-status-week" title="Markering op Week" facts={facts} onChange={(on) => void updateSettings({ showWatchStatusOnWeek: on })} />
        </>
      </SettingsSection>

      <SettingsSection title="MacroFactor">
        <SummaryRow id="macrofactor" title="Laatste export" facts={facts} onClick={() => navigate('/koppelen/macrofactor')} />
        <>
            <SummaryRow id="macrofactor-leidend" title="Leidend voor kracht" facts={facts} info="macrofactorLeidend" onChange={(on) => void setMacroFactorLeads(on).finally(reload)} />
            <SummaryRow id="macrofactor-gewicht" title="Gewicht gebruiken" facts={facts} onChange={(on) => void updateSettings({ weightFromMacroFactor: on })} />
        </>
      </SettingsSection>

      <SettingsSection title="Strava">
        <SummaryRow id="strava-tekst" title="Tekst voor Strava" facts={facts} info="stravaTekst" onChange={(on) => void updateSettings({ stravaText: on })} />
      </SettingsSection>

      {sheet === 'horloge-voorvoegsel' && (
        <ChoiceFromDef def={CHOICES.voorvoegsel} value={settings.watchNamePrefix ?? DEFAULT_WATCH_NAME_PREFIX} onPick={(v) => void changePrefix(v)} onClose={() => setSheet(null)} />
      )}

      {sheet === 'horloge-hartslag' && (
        <ChoiceFromDef def={CHOICES.hartslagHorloge} value={settings.watchHeartRate ?? 'ascend'} onPick={(v) => void changeHr({ watchHeartRate: v })} onClose={() => setSheet(null)} />
      )}

      <SettingsSection>
        <SettingsRow id="health-connect" title="Health Connect" kind="static" value="Komt later" dim off />
      </SettingsSection>
    </>
  );
}
