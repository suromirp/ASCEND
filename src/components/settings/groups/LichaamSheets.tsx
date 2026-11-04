import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { INTENSITY, type Intensity } from '../../../data/workoutStructure';
import { addWeightEntry, freshLinkedWeight, hasHealthConnectWeight, latestWeight, weightsInUse, WEIGHT_REMINDER_DAYS } from '../../../engine/bodyWeight';
import type { HealthConnectFacts } from '../../../engine/settingsSummary';
import { askHealthConnectWeight, openHealthConnectSettings, syncHealthConnect } from '../../../storage/healthConnect';
import { TextButton } from '../../TextButton';
import { bodyFatLines, bodyFatTrend } from '../../../engine/bodyFat';
import { zoneBpm } from '../../../engine/heartRateZones';
import { heartRateProblem, type HeartRateField } from '../../../engine/inputLimits';
import { formatDayMonthNL } from '../../../utils/dates';
import { resolveFigureSetting } from '../../../engine/figureSettings';
import { formatNumberNL } from '../../../utils/number';
import { todayISO } from '../../../utils/dates';
import { syncWatchWorkouts } from '../../../storage/watchWorkouts';
import { NumberField } from '../../NumberField';
import { AutoTag, InfoButton } from '../../ui';
import { SettingsFieldRow, SettingsList, SettingsRow } from '../SettingsList';
import { InfoSheet, Sheet } from '../Sheet';
import { ChoiceFromDef } from './ChoiceFromDef';

// Lichaamsgewicht: het getal groot, waar het vandaan komt, de schakelaars voor MacroFactor en
// Health Connect en de herinnering. Een eigen gewicht invullen kan, maar is de uitzondering.
// Health Connect staat er alleen als het aan staat of er al wegingen uit kwamen
// (docs/beslissingen/2026-11-04-gewicht-uit-health-connect.md).
export function WeightSheet({ onClose, health, reload }: { onClose: () => void; health?: HealthConnectFacts; reload?: () => void }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useAppData();
  const [reminder, setReminder] = useState(false);
  const [self, setSelf] = useState(false);
  const [help, setHelp] = useState(false);
  const [fatHelp, setFatHelp] = useState(false);
  const [kgDraft, setKgDraft] = useState<number | undefined>();
  const today = todayISO();
  const entries = weightsInUse(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect);
  const last = latestWeight(entries);
  const fresh = freshLinkedWeight(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect, today);
  const fromMf = last?.source === 'macrofactor';
  const fromHc = last?.source === 'health-connect';
  const hcOn = settings.weightFromHealthConnect !== false;
  const showHc = health?.enabled === true || hasHealthConnectWeight(settings.weightEntries);
  // Health Connect staat aan, maar je gewicht mag ASCEND nog niet lezen (bijvoorbeeld omdat je het
  // aanzette voordat ASCEND ook gewicht las): dan kun je het hier alsnog toestaan.
  const askWeight = health?.enabled === true && hcOn && health.weightGranted !== true;
  const [hcNote, setHcNote] = useState<{ text: string; open?: boolean } | null>(null);
  const hcBusy = useRef(false);

  async function changeHc(on: boolean) {
    await updateSettings({ weightFromHealthConnect: on });
    if (on && health?.enabled) {
      await syncHealthConnect({ force: true });
      reload?.();
    }
  }

  async function allowWeight() {
    if (hcBusy.current) return;
    hcBusy.current = true;
    setHcNote({ text: 'Even kijken bij Health Connect…' });
    try {
      const r = await askHealthConnectWeight();
      if (r.status === 'ok') setHcNote(null);
      else if (r.status === 'denied') setHcNote({ text: 'Je gewicht mag ASCEND nog niet lezen. Vraagt Android het niet meer, sta het dan toe in Health Connect zelf.', open: true });
      else if (r.status === 'error') setHcNote({ text: r.message });
      else setHcNote({ text: 'Health Connect werkt alleen in de Android-app van ASCEND.' });
    } finally {
      hcBusy.current = false;
      reload?.();
    }
  }
  const days = settings.weightReminderDays ?? WEIGHT_REMINDER_DAYS;
  // Het vetpercentage uit de weegschaal, als trend en alleen als je het wilt zien.
  const fat = settings.showBodyFat === false ? undefined : bodyFatTrend(entries);
  const fatText = fat ? bodyFatLines(fat) : undefined;

  async function save() {
    if (!kgDraft) return;
    await updateSettings({ weightEntries: addWeightEntry(settings.weightEntries, { date: today, kg: kgDraft, source: 'manual' }) });
    setSelf(false);
  }

  const basis = fresh?.basis ?? last?.basis;
  return (
    <>
      <Sheet eyebrow="Lichaam" title="Lichaamsgewicht" onClose={onClose}>
        {(close) => (
          <>
            {last ? (
              <>
                <div className="st-hero"><span className="n">{formatNumberNL(last.kg, 1)}</span><span className="u">kg</span></div>
                <div className="st-src">
                  {(fromMf || fromHc) && <AutoTag />}
                  <span className="st-num">
                    {fromMf
                      ? `${basis === 'scale' ? 'Gewicht' : 'Trendgewicht'} uit MacroFactor, ${formatDayMonthNL(last.date)}`
                      : fromHc
                        ? `Uit Health Connect, ${formatDayMonthNL(last.date)}`
                        : `Zelf ingevuld, ${formatDayMonthNL(last.date)}`}
                  </span>
                  <InfoButton compact label="Uitleg: lichaamsgewicht" onClick={() => setHelp(true)} />
                </div>
              </>
            ) : (
              <>
                <div className="st-hero"><span className="n dim">--,-</span><span className="u">kg</span></div>
                <div className="st-src">Nog geen gewicht ingevuld.</div>
              </>
            )}

            {fat && fatText && (
              <div className="st-fat">
                <div className="st-fat-line">
                  <span className="st-num">{fatText.fat}</span>
                  <InfoButton compact label="Uitleg: vetpercentage" onClick={() => setFatHelp(true)} />
                </div>
                {fatText.lean && <div className="st-fat-line dim"><span className="st-num">{fatText.lean}</span></div>}
                <p className="st-fat-note st-num">Gemiddelde van je laatste {fat.readings === 1 ? 'meting' : `${fat.readings} metingen`}, tot {formatDayMonthNL(fat.asOf)}</p>
              </div>
            )}

            <SettingsList className="mt-4">
              <SettingsRow
                id="gewicht-macrofactor"
                title="Uit MacroFactor"
                kind="toggle"
                checked={settings.weightFromMacroFactor !== false}
                onChange={(on) => void updateSettings({ weightFromMacroFactor: on })}
              />
              {showHc && (
                <SettingsRow
                  id="health-connect-gewicht"
                  title="Uit Health Connect"
                  kind="toggle"
                  info="healthConnectGewicht"
                  checked={hcOn}
                  onChange={(on) => void changeHc(on)}
                />
              )}
              <SettingsRow id="gewicht-herinnering" title="Herinnering" value={CHOICES.herinnering.options.find((o) => o.value === days)?.label ?? 'Nooit'} onClick={() => setReminder(true)} />
            </SettingsList>

            {askWeight && (
              <div role="status">
                <p className="st-hint" style={{ marginLeft: 0, marginRight: 0 }}>{hcNote?.text ?? 'Health Connect staat aan, maar ASCEND mag je gewicht nog niet lezen.'}</p>
                <div className="st-hint" style={{ marginTop: 0, marginLeft: 0 }}>
                  {hcNote?.open ? (
                    <TextButton onClick={() => void openHealthConnectSettings().then((ok) => !ok && setHcNote({ text: 'Health Connect ging niet open. Je vindt het in de instellingen van je telefoon.' }))}>Health Connect openen</TextButton>
                  ) : (
                    <TextButton onClick={() => void allowWeight()}>Gewicht toestaan</TextButton>
                  )}
                </div>
              </div>
            )}

            <div className="st-btns">
              <button type="button" className="st-btn" onClick={() => { close(); navigate('/koppelen/macrofactor'); }}>Export inlezen</button>
              <button type="button" className="st-btn" onClick={() => setSelf((s) => !s)}>Zelf invullen</button>
            </div>

            {self && (
              <>
                <SettingsList className="mt-4">
                  <SettingsFieldRow id="gewicht-zelf" title="Trendgewicht">
                    <span style={{ width: 120 }}>
                      <NumberField tall unit="kg" decimals={1} value={kgDraft} placeholder={last ? formatNumberNL(last.kg, 1) : '85,6'} onChange={setKgDraft} />
                    </span>
                  </SettingsFieldRow>
                </SettingsList>
                <div className="st-btns">
                  <button type="button" className="st-btn" disabled={!kgDraft} onClick={() => void save()}>Opslaan</button>
                </div>
              </>
            )}
          </>
        )}
      </Sheet>
      {reminder && (
        <ChoiceFromDef
          def={CHOICES.herinnering}
          value={days as 0 | 7 | 14 | 28}
          onPick={(v) => void updateSettings({ weightReminderDays: v })}
          onClose={() => setReminder(false)}
        />
      )}
      {help && <InfoSheet helpKey="gewicht" onClose={() => setHelp(false)} />}
      {fatHelp && <InfoSheet helpKey="vetpercentage" onClose={() => setFatHelp(false)} />}
    </>
  );
}

// Hartslag: je drempel en je maximum, en de zones in slagen per minuut. De hartslag in rust
// staat niet meer op het scherm (nergens in ASCEND gebruikt); een opgeslagen waarde blijft staan.
const ZONES: { level: Intensity; color: string }[] = [
  { level: 1, color: 'var(--color-status)' },
  { level: 2, color: 'var(--color-sage)' },
  { level: 3, color: 'var(--color-action)' },
  { level: 4, color: 'var(--color-danger-text)' },
];

export function HeartRateSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const hr = settings.heartRate ?? {};
  const [problem, setProblem] = useState<string | null>(null);
  // A typo like 1700 is not saved: the zones would be nonsense (engine/inputLimits.ts).
  const set = (field: HeartRateField, value: number | undefined) => {
    const why = heartRateProblem(field, value, hr);
    setProblem(why ?? null);
    if (why) return;
    pending.current = updateSettings({ heartRate: { ...hr, [field]: value } });
  };
  // De slagen op je horloge volgen de drempel: staat het sturen aan, dan draait er één ronde zodra
  // het blad sluit, niet bij elk getal dat je typt. Een opslag die nog loopt wacht de ronde af.
  const pending = useRef<Promise<unknown> | null>(null);
  useEffect(() => () => {
    pending.current?.then(() => syncWatchWorkouts({ force: true })).catch(() => {
      // Een achtergrondronde: een fout staat in de status van het horloge.
    });
  }, []);
  const zones = ZONES.map((z) => ({ ...z, bpm: zoneBpm(z.level, hr) })).filter((z) => z.bpm);
  return (
    <Sheet eyebrow="Lichaam" title="Hartslag" line="Uit Garmin Connect, bij je hartslagzones." onClose={onClose}>
      <SettingsList>
        <SettingsFieldRow id="hartslag-drempel" title="Drempel" info="drempel">
          <span style={{ width: 120 }}><NumberField tall unit="bpm" value={hr.lthr} placeholder="--" onChange={(v) => set('lthr', v)} /></span>
        </SettingsFieldRow>
        <SettingsFieldRow id="hartslag-max" title="Maximaal">
          <span style={{ width: 120 }}><NumberField tall unit="bpm" value={hr.maxHr} placeholder="--" onChange={(v) => set('maxHr', v)} /></span>
        </SettingsFieldRow>
      </SettingsList>
      {problem && <p className="st-hint" role="alert" style={{ color: 'var(--color-warning)' }}>{problem}</p>}
      {zones.length > 0 ? (
        <>
          <p className="st-lab" style={{ marginTop: 24 }}>Je zones</p>
          <div className="st-zones">
            {zones.map((z) => (
              <div key={z.level} className="st-zone">
                <i style={{ background: z.color }} />
                <span>{INTENSITY[z.level].label} <span style={{ color: 'var(--color-ink-dim)' }}>{INTENSITY[z.level].zone.replace('zone 4-5', 'zone 4 en 5')}</span></span>
                <span className="r">{z.bpm![0]} tot {z.bpm![1]} <small>bpm</small></span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="st-hint">Vul je drempel in, dan staan de zones in slagen per minuut.</p>
      )}
    </Sheet>
  );
}

// Figuur: man, vrouw of Automatisch (van de koppeling, anders een man). Het blad sluit na een keuze.
export function FigureSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  return (
    <ChoiceFromDef
      def={CHOICES.figuur}
      value={resolveFigureSetting(settings)}
      onPick={(v) => void updateSettings({ figure: v })}
      onClose={onClose}
    />
  );
}
