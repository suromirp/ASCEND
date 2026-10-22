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
import { Card, Eyebrow, PrimaryButton, SecondaryButton, Toggle } from '../components/ui';
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
import {
  getWatchWorkoutState,
  pauseWatchWorkouts,
  removeWatchWorkouts,
  sendNextWatchWorkout,
  setWatchWorkoutsEnabled,
  syncWatchWorkouts,
  type WatchWorkoutState,
} from '../storage/watchWorkouts';
import type { WatchUseKey } from '../engine/watchUse';
import { intervalsErrorMessage, normalizeConnection, type IntervalsConnection } from '../integrations/intervalsIcu';
import { formatDateNL } from '../utils/dates';

const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

type Notice = { tone: 'ok' | 'error'; text: string };

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
  const { templates } = useAppData();
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
          title="Details van loopjes en tochten"
          text="ASCEND vraagt per loop of tocht de reeks van hartslag, tempo, hoogte en loopvorm op en bewaart er alleen een korte samenvatting van. Daarmee vergelijkt hij je loopjes eerlijk. Uit betekent: niet ophalen, niet tonen en niet meetellen."
          checked={watch?.use.details !== false && watch?.use.activities !== false}
          onChange={(on) => void changeUse('details', on)}
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
            text="Zet de trainingen van de komende 7 dagen in je intervals.icu-agenda. Standaard uit."
            checked={!!workouts.state?.enabled}
            onChange={(on) => void workouts.toggle(on)}
            note={workouts.busy ? 'Bezig…' : undefined}
          />
        )}
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
      await reload();
      setBusy(false);
    }
  }

  return { state, busy, setBusy, notice, setNotice, reload, toggle };
}

function WatchWorkoutsCard({ controls }: { controls: WatchWorkoutControls }) {
  const { state, busy, setBusy, notice, setNotice, reload } = controls;
  const sent = state ? Object.keys(state.items).length : 0;

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
      await reload();
      setBusy(false);
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
      await reload();
      setBusy(false);
    }
  }

  async function takeAway() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await removeWatchWorkouts();
      setNotice(result.status === 'ok' ? { tone: 'ok', text: 'De trainingen die ASCEND had gestuurd zijn uit je intervals.icu-agenda gehaald.' } : { tone: 'error', text: result.status === 'error' ? result.message : 'Er is geen koppeling met intervals.icu.' });
    } finally {
      await reload();
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>NAAR JE HORLOGE</Eyebrow>
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Met de schakelaar hierboven zet ASCEND de trainingen van de komende 7 dagen in je intervals.icu-agenda, met je tempo's uit de testloop of je hartslagzones als doel. Verplaats of sla je er een over, dan volgt de agenda. Alleen wat ASCEND zelf heeft gestuurd wordt aangeraakt; je eigen trainingen in intervals.icu blijven met rust.
      </p>
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Kracht gaat niet mee: die staat in MacroFactor. Zet in intervals.icu bij je Garmin-koppeling aan dat geplande trainingen naar Garmin Connect gaan. Wil je tempodoelen op je horloge, vul dan in intervals.icu bij de instellingen voor hardlopen je drempeltempo in; zonder dat ziet je horloge de tempo's niet. Hartslagdoelen werken altijd.
      </p>
      {state?.enabled && (
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {state.syncedAt ? `Laatst gestuurd op ${formatDateNL(state.syncedAt.slice(0, 10))} om ${new Date(state.syncedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}.` : 'Nog niet gestuurd.'} ASCEND werkt het hooguit eens per 15 minuten bij, bij het openen van de app.
        </p>
      )}
      {state?.lastError && !notice && <NoticeLine notice={{ tone: 'error', text: state.lastError }} />}
      {notice && <NoticeLine notice={notice} />}
      <div className="flex flex-wrap gap-3">
        <SecondaryButton onClick={() => void testOne()} disabled={busy}>{busy ? 'Bezig…' : 'Eén training testen'}</SecondaryButton>
        {state?.enabled && <SecondaryButton onClick={() => void updateNow()} disabled={busy}>Nu bijwerken</SecondaryButton>}
        {!state?.enabled && sent > 0 && <SecondaryButton onClick={() => void takeAway()} disabled={busy}>Weghalen uit intervals.icu</SecondaryButton>}
      </div>
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        De test stuurt alleen de eerstvolgende training, ook als de schakelaar uit staat. Kijk daarna in je intervals.icu-agenda of de stappen kloppen.
      </p>
    </Card>
  );
}
