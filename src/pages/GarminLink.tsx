// ASCEND — Meer, Garmin koppelen via intervals.icu.
//
// Garmin sends every activity to intervals.icu; ASCEND reads the last days
// from there with the user's own key and offers them on Today. The key stays
// on this phone and is not part of any export.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BackButton } from '../components/BackButton';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../components/ui';
import { clearConnection, getConnection, getWatchState, maskKey, saveConnection, syncWatchActivities, type SyncResult, type WatchActivityState } from '../storage/externalActivities';
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

  function describeResult(result: SyncResult): Notice {
    if (result.status === 'error') return { tone: 'error', text: result.message };
    if (result.status === 'ok') {
      return { tone: 'ok', text: `Verbinding werkt. In de laatste 7 dagen vond ASCEND ${result.count} ${result.count === 1 ? 'activiteit' : 'activiteiten'}.` };
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
      await clearConnection();
      setConfirmingUnlink(false);
      setNotice({ tone: 'ok', text: 'Ontkoppeld. Je API-sleutel en de opgehaalde activiteiten zijn van deze telefoon gewist.' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const connected = !!connection;

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
          ASCEND leest alleen. De sleutel blijft op deze telefoon en gaat niet mee in een back-up. Elke nieuwe training krijg je als voorstel op Vandaag; er wordt nooit iets stil opgeslagen.
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
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Je sleutel en de opgehaalde activiteiten worden van deze telefoon gewist. Wat je al hebt opgeslagen in je logboek blijft.</p>
              <div className="flex gap-3">
                <SecondaryButton onClick={() => setConfirmingUnlink(false)} disabled={busy}>ANNULEREN</SecondaryButton>
                <PrimaryButton fullWidth={false} onClick={() => void unlink()} disabled={busy}>ONTKOPPELEN</PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <SecondaryButton onClick={() => void testStored()} disabled={busy}>{busy ? 'BEZIG…' : 'Verbinding testen'}</SecondaryButton>
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
            {busy ? 'BEZIG…' : 'Verbinding testen'}
          </PrimaryButton>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Werkt de verbinding, dan wordt ze bewaard. Zo niet, dan blijft er niets staan.</p>
        </Card>
      )}
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
