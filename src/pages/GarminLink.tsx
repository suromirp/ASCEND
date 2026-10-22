// ASCEND — Meer, Garmin koppelen via intervals.icu.
//
// Garmin sends every activity to intervals.icu; ASCEND reads the last days
// from there with the user's own key and offers them on Today (or ticks off
// the unmistakable ones by itself, switch "Vanzelf afvinken"). The same link
// brings last night's sleep, resting heart rate and HRV to the morning
// check-in, once wellness synchronisation is switched on in intervals.icu. The
// key stays on this phone and is not part of any export. The other way round,
// ASCEND can put the planned trainings of the coming week in the intervals.icu
// agenda (switch, default off), which intervals.icu sends on to the watch.
// The card "Wat ASCEND van je horloge gebruikt" holds every switch in one
// place: which kinds of data ASCEND uses (trainings, sleep, resting heart
// rate, HRV) and the two behaviours (tick off by itself, send to the watch).
// Body weight is not among them: it never comes from the watch.
// "Garmin is leidend": a training typed in by hand takes over the numbers the
// watch measured, first as a proposal ("N trainingen gelijktrekken") and later by
// itself for the last 7 days (switch in the same card), always to be put back
// (components/WatchAlignCard.tsx).

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BackButton } from '../components/BackButton';
import { SettingsPageLink } from '../components/settings/SettingsLink';
import { Card, Eyebrow, InfoButton, PrimaryButton, SecondaryButton, Toggle } from '../components/ui';
import {
  clearConnection,
  forgetDeclinedAlignments,
  getConnection,
  getWatchState,
  maskKey,
  saveConnection,
  setAutoTick,
  setGarminLeads,
  setWatchUse,
  syncWatchActivities,
  syncWatchHistory,
  type SyncResult,
  type WatchActivityState,
} from '../storage/externalActivities';
import { useAppData } from '../state/AppDataContext';
import { AlignProposalCard, AlignedSheet } from '../components/WatchAlignCard';
import { useAlignActions, useWatchAlign } from '../components/useWatchAlign';
import { HISTORY_MAX_DAYS } from '../engine/watchAlign';
import { watchOverview, watchOverviewText } from '../engine/watchStatus';
import { DEFAULT_WATCH_NAME_PREFIX, type WatchNamePrefix } from '../engine/watchWorkout';
import {
  getWatchWorkoutState,
  cleanUpWatchWorkouts,
  pauseWatchWorkouts,
  resendWatchWorkouts,
  sendNextWatchWorkout,
  setWatchWorkoutsEnabled,
  syncWatchWorkouts,
  type WatchWorkoutState,
} from '../storage/watchWorkouts';
import type { WatchUseKey } from '../engine/watchUse';
import { intervalsErrorMessage, normalizeConnection, type IntervalsConnection } from '../integrations/intervalsIcu';
import { formatDateNL, todayISO } from '../utils/dates';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

type Notice = { tone: 'ok' | 'error'; text: string };

const PREFIX_CHOICES: [WatchNamePrefix, string][] = [['short', 'Kort (ASC)'], ['long', 'Lang (ASCEND ·)'], ['none', 'Geen']];

// No button waits on intervals.icu for longer than this.
const WORK_TIMEOUT_MS = 60_000;

export function GarminLinkPage() {
  const [connection, setConnection] = useState<IntervalsConnection | null | undefined>(undefined);
  const [watch, setWatch] = useState<WatchActivityState | null>(null);
  const [athleteId, setAthleteId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);

  const load = useCallback(async () => {
    try {
      setConnection(await getConnection());
      setWatch(await getWatchState());
    } catch {
      setConnection(null);
    }
  }, []);
  useEffect(() => {
    void Promise.all([getConnection(), getWatchState()])
      .then(([c, w]) => {
        setConnection(c);
        setWatch(w);
      })
      .catch(() => setConnection(null));
  }, []);

  async function changeLeads(on: boolean) {
    setWatch((w) => (w ? { ...w, garminLeads: on } : w));
    try {
      await setGarminLeads(on);
    } catch {
      await load();
    }
  }

  async function refetchHistory() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await syncWatchHistory({ force: true });
      if (result.status === 'ok') setNotice({ tone: 'ok', text: `ASCEND haalde ${result.count} ${result.count === 1 ? 'activiteit' : 'activiteiten'} op vanaf ${formatDateNL(result.from)}.` });
      else if (result.status === 'nothing') setNotice({ tone: 'ok', text: 'Je hebt geen trainingen met de hand ingevuld, dus er valt niets gelijk te trekken.' });
      else if (result.status === 'error') setNotice({ tone: 'error', text: result.message });
      else setNotice({ tone: 'error', text: 'Er is geen koppeling met intervals.icu, of je trainingen staan uit.' });
    } finally {
      await load();
      setBusy(false);
    }
  }

  async function changeAutoTick(on: boolean) {
    setWatch((w) => (w ? { ...w, autoTick: on } : w));
    try {
      await setAutoTick(on);
    } catch {
      await load();
    }
  }

  // A switch of the card "Wat ASCEND van je horloge gebruikt". Off: gone from
  // the phone at once. On: fetched right away, when there is a connection.
  async function changeUse(key: WatchUseKey, on: boolean) {
    setWatch((w) => (w ? { ...w, use: { ...w.use, [key]: on } } : w));
    try {
      await setWatchUse({ [key]: on });
      if (on && (await getConnection())) await syncWatchActivities({ force: true });
    } catch {
      // The switch shows what was stored once the state is read again.
    } finally {
      await load();
    }
  }

  function describeResult(result: SyncResult): Notice {
    if (result.status === 'error') return { tone: 'error', text: result.message };
    if (result.status === 'ok') {
      const activities = watch && !watch.use.activities
        ? 'Verbinding werkt. Je trainingen staan uit, dus die haalt ASCEND niet op.'
        : `Verbinding werkt. In de laatste 7 dagen vond ASCEND ${result.count} ${result.count === 1 ? 'activiteit' : 'activiteiten'}.`;
      if (!result.wellness) return { tone: 'ok', text: activities };
      return {
        tone: 'ok',
        text: result.wellness.days > 0
          ? `${activities} Ook gevonden: slaap en hartslag van ${result.wellness.days} ${result.wellness.days === 1 ? 'dag' : 'dagen'}${result.wellness.today ? ', ook van vandaag' : ''}.`
          : `${activities} Slaap, rusthartslag en HRV vond ASCEND niet. Zet in intervals.icu de wellness-synchronisatie met Garmin aan (zie hieronder).`,
      };
    }
    return { tone: 'ok', text: 'Verbinding werkt.' };
  }

  // Test what was typed; only a connection that works is kept.
  async function connect() {
    setBusy(true);
    setNotice(null);
    try {
      const typed = normalizeConnection({ athleteId, apiKey });
      const result = await syncWatchActivities({ connection: typed, force: true });
      if (result.status === 'ok') {
        await saveConnection(typed);
        setApiKey('');
        setNotice(describeResult(result));
        await load();
      } else {
        setNotice(describeResult(result));
      }
    } catch (err) {
      setNotice({ tone: 'error', text: intervalsErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function testStored() {
    setBusy(true);
    setNotice(null);
    try {
      setNotice(describeResult(await syncWatchActivities({ force: true })));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await pauseWatchWorkouts();
      await clearConnection();
      setConfirmingUnlink(false);
      setNotice({ tone: 'ok', text: 'Ontkoppeld. Je API-sleutel, de opgehaalde activiteiten en je slaap- en hartslaggegevens zijn van deze telefoon gewist.' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const connected = !!connection;
  const workouts = useWatchWorkoutControls();
  const { templates, settings, updateSettings } = useAppData();
  const align = useWatchAlign();
  const alignActions = useAlignActions(align.items);
  const [showAligned, setShowAligned] = useState(false);

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>GARMIN KOPPELEN</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>via intervals.icu, zonder overtypen</p>
        </div>
      </div>
      <SettingsPageLink page="koppelingen" row="garmin" label="Instellingen van je horloge" />

      <Card className="flex flex-col gap-3">
        <Eyebrow>DRIE STAPPEN</Eyebrow>
        <Step n={1}>Maak een gratis account op <span style={{ color: 'var(--color-gold)' }}>intervals.icu</span>.</Step>
        <Step n={2}>Koppel daar je Garmin. Vanaf dan komt elke training na het synchroniseren vanzelf op intervals.icu te staan.</Step>
        <Step n={3}>Open de instellingen van intervals.icu, onder Developer Settings. Kopieer je athlete-id en je API-sleutel en plak ze hieronder.</Step>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Standaard leest ASCEND alleen. De sleutel blijft op deze telefoon en gaat niet mee in een back-up. Elke nieuwe training krijg je als voorstel op Vandaag. Alleen een training die onmiskenbaar bij je planning past, vinkt ASCEND zelf af (zie Vanzelf afvinken hieronder), en dan vraagt hij hoe het ging.
        </p>
      </Card>

      {connection === undefined ? null : connected ? (
        <Card className="flex flex-col gap-3">
          <Eyebrow>VERBONDEN</Eyebrow>
          <div className="flex flex-col gap-1 text-sm" style={{ color: 'var(--color-ink)' }}>
            <p>Athlete-id: {connection.athleteId}</p>
            <p>API-sleutel: {maskKey(connection.apiKey)}</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              {watch?.fetchedAt ? `Laatst opgehaald op ${formatDateNL(watch.fetchedAt.slice(0, 10))} om ${new Date(watch.fetchedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}.` : 'Nog niet opgehaald.'}
            </p>
          </div>
          {watch?.lastError && !notice && <NoticeLine notice={{ tone: 'error', text: watch.lastError }} />}
          {notice && <NoticeLine notice={notice} />}
          {confirmingUnlink ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Je sleutel, de opgehaalde activiteiten en je slaap- en hartslaggegevens worden van deze telefoon gewist. Wat je al hebt opgeslagen in je logboek blijft.</p>
              <div className="flex gap-3">
                <SecondaryButton onClick={() => setConfirmingUnlink(false)} disabled={busy}>Annuleren</SecondaryButton>
                <PrimaryButton fullWidth={false} onClick={() => void unlink()} disabled={busy}>Ontkoppelen</PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <SecondaryButton onClick={() => void testStored()} disabled={busy}>{busy ? 'Bezig…' : 'Verbinding testen'}</SecondaryButton>
              <SecondaryButton onClick={() => setConfirmingUnlink(true)} disabled={busy}>Ontkoppelen</SecondaryButton>
            </div>
          )}
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <Eyebrow>JOUW GEGEVENS</Eyebrow>
          <div>
            <label htmlFor="intervals-athlete" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Athlete-id (bijvoorbeeld i12345)</label>
            <input
              id="intervals-athlete"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="intervals-key" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>API-sleutel</label>
            <input
              id="intervals-key"
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm"
              style={fieldStyle}
            />
          </div>
          {notice && <NoticeLine notice={notice} />}
          <PrimaryButton onClick={() => void connect()} disabled={busy || !athleteId.trim() || !apiKey.trim()}>
            {busy ? 'Bezig…' : 'Verbinding testen'}
          </PrimaryButton>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Werkt de verbinding, dan wordt ze bewaard. Zo niet, dan blijft er niets staan.</p>
        </Card>
      )}

      <Card className="flex flex-col gap-4">
        <Eyebrow>Wat ASCEND van je horloge gebruikt</Eyebrow>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Tik aan wat je wilt. Wat uit staat haalt ASCEND niet op, laat hij niet zien en gebruikt hij niet in de ochtendcheck of in een berekening. Dit blijft op deze telefoon en gaat niet mee in een back-up.
        </p>
        <UseRow
          title="Trainingen"
          text="De kaart Van je horloge op Vandaag, met een voorstel voor elke nieuwe training."
          checked={watch?.use.activities !== false}
          onChange={(on) => void changeUse('activities', on)}
        />
        <UseRow
          title="Vanzelf afvinken"
          text="Vinkt een training van je horloge zelf af. Alleen als het niet anders kan: dezelfde dag, één geplande training van dezelfde soort en ongeveer even lang. Daarna vraagt ASCEND hoe het ging, en met Klopt niet haal je de afvinking weer weg. Bij twijfel krijg je gewoon een voorstel. Een testloop en een wedstrijd vink je altijd zelf af."
          checked={watch?.autoTick !== false && watch?.use.activities !== false}
          onChange={(on) => void changeAutoTick(on)}
          note={watch?.use.activities === false ? 'Werkt alleen als Trainingen aan staat.' : undefined}
        />
        <UseRow
          title="Garmin is leidend"
          text="Vul je een training zelf in en komt hij ook van je horloge binnen, dan neemt ASCEND de gemeten cijfers van je horloge over: duur, afstand, hartslag en hoogtemeters. Wat je zelf invulde, zoals gevoel, inspanning, pijn en het gewicht van je rugzak, blijft staan. Je eigen cijfers worden bewaard en je kunt ze terugzetten. Vanzelf gebeurt dit voor trainingen van de laatste 7 dagen, nadat je Akkoord gaf op het eerste voorstel."
          checked={watch?.garminLeads !== false && watch?.use.activities !== false}
          onChange={(on) => void changeLeads(on)}
          note={watch?.use.activities === false ? 'Werkt alleen als Trainingen aan staat.' : undefined}
        />
        <UseRow
          title="Slaap"
          text="Hoe lang de nacht was, in de ochtendcheck."
          checked={watch?.use.sleep !== false}
          onChange={(on) => void changeUse('sleep', on)}
        />
        <UseRow
          title="Rusthartslag"
          text="In de ochtendcheck, naast jouw gemiddelde van de laatste 4 weken."
          checked={watch?.use.restingHeartRate !== false}
          onChange={(on) => void changeUse('restingHeartRate', on)}
        />
        <UseRow
          title="HRV"
          text="De variatie tussen je hartslagen in rust, in de ochtendcheck."
          checked={watch?.use.hrv !== false}
          onChange={(on) => void changeUse('hrv', on)}
        />
        {connected && (
          <UseRow
            title="Trainingen naar je horloge sturen"
            text="Staat hij aan, dan gaat het vanzelf: de trainingen van de komende 7 dagen gaan naar je intervals.icu-agenda en van daar naar je horloge. Standaard uit."
            checked={!!workouts.state?.enabled}
            onChange={(on) => void workouts.toggle(on)}
            note={workouts.busy ? 'Bezig…' : workouts.state?.enabled ? watchOverviewText(watchOverview(workouts.state.items, workouts.state.syncedAt, todayISO()), todayISO()) : undefined}
          />
        )}
        {connected && (
          <div className="flex flex-col gap-2">
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Voorvoegsel voor de naam</p>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Zo herken je de trainingen van ASCEND tussen je eigen trainingen. Kort past het beste op een horlogescherm.
            </p>
            <div className="flex gap-2" role="radiogroup" aria-label="Voorvoegsel voor de naam">
              {PREFIX_CHOICES.map(([key, label]) => {
                const on = (settings.watchNamePrefix ?? DEFAULT_WATCH_NAME_PREFIX) === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={workouts.busy}
                    onClick={() => void workouts.changePrefix(key, updateSettings)}
                    className="min-h-[44px] flex-1 rounded-xl border px-2 text-xs font-medium disabled:opacity-40"
                    style={{ borderColor: on ? 'var(--color-bronze)' : 'var(--color-control-border)', color: on ? 'var(--color-ink)' : 'var(--color-ink-dim)', background: on ? 'var(--color-surface)' : 'transparent' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {connected && (
          <UseRow
            title="Gedane trainingen weghalen"
            text="Een training die je hebt gedaan of voorbij liet gaan haalt ASCEND weer uit je intervals.icu-agenda. Je activiteit zelf blijft staan."
            checked={settings.watchRemoveDone !== false}
            onChange={(on) => void updateSettings({ watchRemoveDone: on })}
          />
        )}
        <UseRow
          title="Status van het versturen"
          text="Op het trainingsscherm één regel die zegt of de training naar je horloge is gestuurd, en een knop als dat niet lukte."
          checked={settings.showWatchStatus !== false}
          onChange={(on) => void updateSettings({ showWatchStatus: on })}
        />
        <UseRow
          title="Markering op Week"
          text="Een klein horloge achter een training in de weeklijst, alleen als hij is verstuurd of het niet lukte."
          checked={settings.showWatchStatusOnWeek !== false}
          onChange={(on) => void updateSettings({ showWatchStatusOnWeek: on })}
        />
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Gewicht komt nooit uit Garmin. Dat leest ASCEND uit MacroFactor.
        </p>
      </Card>

      {connected && watch?.use.activities !== false && align.items.length > 0 && (
        <AlignProposalCard
          items={align.items}
          templates={templates}
          busy={alignActions.busy}
          onApprove={() => void alignActions.approve()}
          onDecline={() => void alignActions.decline()}
        />
      )}

      {connected && watch?.use.activities !== false && (
        <Card className="flex flex-col gap-3">
          <Eyebrow>Gelijkgetrokken met je horloge</Eyebrow>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            {align.aligned.length === 0
              ? 'Er is nog geen training gelijkgetrokken met je horloge.'
              : `${align.aligned.length === 1 ? '1 training heeft' : `${align.aligned.length} trainingen hebben`} de cijfers van je horloge overgenomen.`}
          </p>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            {watch?.historyFetchedAt && watch.historyFrom
              ? `Voor het gelijktrekken haalde ASCEND eenmalig ook de oudere trainingen op, vanaf ${formatDateNL(watch.historyFrom)}. Dat is hooguit ${HISTORY_MAX_DAYS} dagen terug; nieuwe voorstellen komen uit de laatste 7 dagen.`
              : `Voor het gelijktrekken haalt ASCEND eenmalig ook de oudere trainingen op, vanaf je oudste training met de hand en hooguit ${HISTORY_MAX_DAYS} dagen terug.`}
          </p>
          <div className="flex flex-wrap gap-3">
            {align.aligned.length > 0 && <SecondaryButton onClick={() => setShowAligned(true)} disabled={busy}>Bekijken en terugzetten</SecondaryButton>}
            <SecondaryButton onClick={() => void refetchHistory()} disabled={busy}>{busy ? 'Bezig…' : 'Oudere trainingen opnieuw ophalen'}</SecondaryButton>
            {(watch?.alignDeclined.length ?? 0) > 0 && (
              <SecondaryButton onClick={() => void forgetDeclinedAlignments().then(load)} disabled={busy}>Geweigerde voorstellen weer tonen</SecondaryButton>
            )}
          </div>
        </Card>
      )}
      {showAligned && <AlignedSheet aligned={align.aligned} templates={templates} onClose={() => setShowAligned(false)} />}

      {connected && <WatchWorkoutsCard controls={workouts} />}

      <Card className="flex flex-col gap-3">
        <Eyebrow>Slaap en rusthartslag</Eyebrow>
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
          Wil je dat de ochtendcheck je slaap, rusthartslag en HRV alvast laat zien? Zet dan in intervals.icu de wellness-synchronisatie met Garmin aan.
        </p>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Open in intervals.icu de instellingen, kies de koppeling met Garmin Connect en zet het ophalen van wellnessgegevens aan. De namen kunnen daar iets afwijken. Zonder die schakelaar komt er van je horloge alleen training binnen, en werkt de ochtendcheck zoals altijd.
        </p>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          ASCEND vergelijkt rusthartslag en HRV met je eigen gemiddelde van de laatste 4 weken, niet met een norm. Je horloge schat deze waarden: het is een hint en geen oordeel.
        </p>
      </Card>
    </div>
  );
}

function UseRow({ title, text, checked, onChange, note }: { title: string; text: string; checked: boolean; onChange: (on: boolean) => void; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{title}</p>
        <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{text}</p>
        {note && <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs" style={{ borderColor: 'var(--color-bronze)', color: 'var(--color-gold)' }}>{n}</span>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{children}</p>
    </div>
  );
}

function NoticeLine({ notice }: { notice: Notice }) {
  return (
    <p role={notice.tone === 'error' ? 'alert' : 'status'} className="text-sm" style={{ color: notice.tone === 'error' ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>
      {notice.text}
    </p>
  );
}

interface WatchWorkoutControls {
  state: WatchWorkoutState | null;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  notice: Notice | null;
  setNotice: (notice: Notice | null) => void;
  reload: () => Promise<void>;
  toggle: (on: boolean) => Promise<void>;
  changePrefix: (choice: WatchNamePrefix, save: (patch: { watchNamePrefix: WatchNamePrefix }) => Promise<unknown>) => Promise<void>;
}

// The state and the switch of "Trainingen naar je horloge sturen", shared by
// the switch in the card "Wat ASCEND van je horloge gebruikt" and the buttons
// in the card "Naar je horloge".
function useWatchWorkoutControls(): WatchWorkoutControls {
  const [state, setState] = useState<WatchWorkoutState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const reload = useCallback(async () => {
    try {
      setState(await getWatchWorkoutState());
    } catch {
      setState(null);
    }
  }, []);
  useEffect(() => {
    void getWatchWorkoutState()
      .then(setState)
      .catch(() => setState(null));
  }, []);

  async function toggle(on: boolean) {
    setBusy(true);
    setNotice(null);
    try {
      const switched = await setWatchWorkoutsEnabled(on);
      if (switched.status === 'error') {
        setNotice({ tone: 'error', text: switched.message });
      } else if (on) {
        const result = await syncWatchWorkouts({ force: true });
        setNotice(
          result.status === 'error'
            ? { tone: 'error', text: result.message }
            : { tone: 'ok', text: 'Aan. De trainingen van de komende 7 dagen worden naar intervals.icu gestuurd en daarna naar je horloge.' },
        );
      } else {
        setNotice({ tone: 'ok', text: switched.removed > 0 ? 'Uit. De komende trainingen zijn weer uit je intervals.icu-agenda gehaald.' : 'Uit. ASCEND stuurt geen trainingen meer.' });
      }
    } finally {
      setBusy(false);
      await reload();
    }
  }

  // The name of what is already sent changes at the next round; with the
  // switch on that round runs right away.
  async function changePrefix(choice: WatchNamePrefix, save: (patch: { watchNamePrefix: WatchNamePrefix }) => Promise<unknown>) {
    setBusy(true);
    setNotice(null);
    try {
      await save({ watchNamePrefix: choice });
      if ((await getWatchWorkoutState()).enabled) {
        const result = await withTimeout(syncWatchWorkouts({ force: true }), WORK_TIMEOUT_MS);
        setNotice(result.status === 'error' ? { tone: 'error', text: result.message } : { tone: 'ok', text: 'De namen zijn bijgewerkt.' });
      }
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof TimeoutError ? 'Dat duurde te lang. De namen worden bij de volgende ronde bijgewerkt.' : 'Het opslaan is niet gelukt.' });
    } finally {
      setBusy(false);
      await reload();
    }
  }

  return { state, busy, setBusy, notice, setNotice, reload, toggle, changePrefix };
}

function WatchWorkoutsCard({ controls }: { controls: WatchWorkoutControls }) {
  const { state, busy, setBusy, notice, setNotice, reload } = controls;

  async function testOne() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await sendNextWatchWorkout();
      if (result.status === 'ok') {
        setNotice({
          tone: 'ok',
          text: `Gelukt. "${result.name}" van ${formatDateNL(result.date)} staat nu in je intervals.icu-agenda. Synchroniseer je horloge met Garmin Connect; dan staat hij ook op je horloge.`,
        });
      } else if (result.status === 'nothing') {
        setNotice({ tone: 'error', text: 'Er staat de komende 7 dagen geen training die naar je horloge kan. Kracht en rustdagen gaan niet mee.' });
      } else if (result.status === 'not-connected') {
        setNotice({ tone: 'error', text: 'Er is geen koppeling met intervals.icu.' });
      } else {
        setNotice({ tone: 'error', text: `Het is niet gelukt. ${result.message}` });
      }
    } finally {
      setBusy(false);
      await reload();
    }
  }

  async function updateNow() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await syncWatchWorkouts({ force: true });
      if (result.status === 'error') setNotice({ tone: 'error', text: result.message });
      else if (result.status === 'ok') setNotice({ tone: 'ok', text: `Bijgewerkt: ${result.created} nieuw, ${result.updated} aangepast, ${result.removed} weggehaald.` });
    } finally {
      setBusy(false);
      await reload();
    }
  }

  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  async function takeAway() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await withTimeout(cleanUpWatchWorkouts(), WORK_TIMEOUT_MS);
      if (result.status === 'ok') {
        const n = result.removed;
        const what = n === 0 ? 'Er stond niets van ASCEND in je intervals.icu-agenda.' : `${n} ${n === 1 ? 'training' : 'trainingen'} weggehaald uit je intervals.icu-agenda${result.strays > 0 ? `, waarvan ${result.strays} oude die ASCEND niet meer bijhield` : ''}.`;
        setNotice({ tone: 'ok', text: state?.enabled ? `${what} De schakelaar staat aan: bij de volgende ronde komen de komende 7 dagen er weer in.` : what });
      } else {
        setNotice({ tone: 'error', text: result.status === 'error' ? result.message : 'Er is geen koppeling met intervals.icu.' });
      }
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof TimeoutError ? 'Dat duurde te lang. Er is niets stuk: probeer het zo nog eens.' : 'Weghalen is niet gelukt.' });
    } finally {
      setConfirmingRemove(false);
      setBusy(false);
      await reload();
    }
  }

  async function resend() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await withTimeout(resendWatchWorkouts(), WORK_TIMEOUT_MS);
      if (result.status === 'ok') {
        const n = result.sent;
        setNotice({ tone: 'ok', text: `${n} ${n === 1 ? 'training' : 'trainingen'} opnieuw verstuurd${result.removed > n ? `. ${result.removed - n} oude haalde ASCEND weg` : ''}.` });
      } else if (result.status === 'error') {
        setNotice({ tone: 'error', text: result.message });
      } else {
        setNotice({ tone: 'error', text: result.status === 'off' ? 'De schakelaar staat uit.' : 'Er is geen koppeling met intervals.icu.' });
      }
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof TimeoutError ? 'Dat duurde te lang. Er is niets stuk: probeer het zo nog eens.' : 'Opnieuw versturen is niet gelukt.' });
    } finally {
      setBusy(false);
      await reload();
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>NAAR JE HORLOGE</Eyebrow>
        <InfoButton onClick={() => setShowInfo((v) => !v)} label="Hoe werkt dit, en hoe ruim ik op?" />
      </div>
      {showInfo && <WatchInfo />}
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Met de schakelaar hierboven zet ASCEND de trainingen van de komende 7 dagen in je intervals.icu-agenda, met je tempo's uit de testloop of je hartslagzones als doel. Verplaats of sla je er een over, dan volgt de agenda. Alleen wat ASCEND zelf heeft gestuurd wordt aangeraakt; je eigen trainingen in intervals.icu blijven met rust.
      </p>
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Kracht gaat niet mee: die staat in MacroFactor. Zet in intervals.icu bij je Garmin-koppeling aan dat geplande trainingen naar Garmin Connect gaan. Wil je tempodoelen op je horloge, vul dan in intervals.icu bij de instellingen voor hardlopen je drempeltempo in; zonder dat ziet je horloge de tempo's niet. Hartslagdoelen werken altijd.
      </p>
      {state?.enabled && (
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          ASCEND werkt het hooguit eens per 15 minuten bij, bij het openen van de app en na elke wijziging in je planning. Op het trainingsscherm zie je per training of het gelukt is.
        </p>
      )}
      {state?.lastError && !notice && <NoticeLine notice={{ tone: 'error', text: state.lastError }} />}
      {notice && <NoticeLine notice={notice} />}
      {confirmingRemove ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            Alle komende trainingen die ASCEND stuurde gaan uit je intervals.icu-agenda, ook oude van een test of een eerdere installatie. Je eigen trainingen blijven staan.
          </p>
          <div className="flex gap-3">
            <SecondaryButton onClick={() => setConfirmingRemove(false)} disabled={busy}>Annuleren</SecondaryButton>
            <PrimaryButton fullWidth={false} onClick={() => void takeAway()} disabled={busy}>{busy ? 'Bezig…' : 'Weghalen'}</PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {state?.enabled && <SecondaryButton onClick={() => void resend()} disabled={busy}>{busy ? 'Bezig…' : 'Opnieuw versturen'}</SecondaryButton>}
          <SecondaryButton onClick={() => void testOne()} disabled={busy}>Eén training testen</SecondaryButton>
          {state?.enabled && <SecondaryButton onClick={() => void updateNow()} disabled={busy}>Nu bijwerken</SecondaryButton>}
          <SecondaryButton onClick={() => setConfirmingRemove(true)} disabled={busy}>Weghalen uit intervals.icu</SecondaryButton>
        </div>
      )}
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        De test stuurt alleen de eerstvolgende training, ook als de schakelaar uit staat. Kijk daarna in je intervals.icu-agenda of de stappen kloppen.
      </p>
    </Card>
  );
}

// In plain words: what runs by itself, how to recognise it and how to clean up.
// Only what is known is written as fact; what is not known says so.
function WatchInfo() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
      <InfoPoint title="Wat vanzelf gaat">
        Staat de schakelaar aan, dan zet ASCEND de trainingen van de komende 7 dagen in je intervals.icu-agenda en werkt ze bij na elke wijziging in je planning. Wat je overslaat haalt hij er altijd uit, en wat je hebt gedaan ook als Gedane trainingen weghalen aan staat. Daarna stuurt intervals.icu ze door naar Garmin Connect.
      </InfoPoint>
      <InfoPoint title="Zo herken je ze">
        De naam begint met ASC (of ASCEND ·, of niets: dat kies je hierboven). In de beschrijving staat bovenaan voor welke dag ASCEND hem plande.
      </InfoPoint>
      <InfoPoint title="Opruimen">
        Opnieuw versturen haalt alle komende ASCEND-trainingen weg en stuurt de komende 7 dagen opnieuw. Weghalen doet alleen het eerste. Beide zoeken ook oude trainingen van ASCEND in je agenda, bijvoorbeeld van een test. Alleen wat ASCEND stuurde gaat weg; je eigen trainingen en je activiteiten blijven staan.
      </InfoPoint>
      <InfoPoint title="En in Garmin Connect zelf">
        ASCEND ziet de lijst Workouts in Garmin Connect niet en kan er niets uit wissen. Staat daar na het weghalen en synchroniseren nog iets van ASCEND, verwijder het dan in Garmin Connect. Of intervals.icu een weggehaalde training ook zelf uit Garmin Connect haalt, is niet zeker: op het forum van intervals.icu staat alleen dat het geplande trainingen die meer dan een dag oud zijn zelf opruimt. Kijk na het weghalen en synchroniseren even in Garmin Connect.
      </InfoPoint>
    </div>
  );
}

function InfoPoint({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{title}</p>
      <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{children}</p>
    </div>
  );
}
