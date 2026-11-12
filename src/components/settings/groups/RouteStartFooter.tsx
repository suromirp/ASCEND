// ASCEND: onder de keuze Startpunt van je lus: Thuis, het eigen punt van dit toestel. Gebruik waar ik nu ben
// vraagt één keer je plek (met een grens in tijd en een zichtbare uitkomst) en bewaart die als de plek
// Thuis (storage/places.ts), die meegaat in je back-up; Wis startpunt vraagt eerst (met het aantal routes)
// en haalt hem dan weg. Het punt zelf staat nooit op het scherm.

import { useEffect, useRef, useState } from 'react';
import { startFailureReason, type RouteStartMode } from '../../../engine/routeStart';
import { clearRouteStartPoint, getRouteStartPoint, locateStartHere } from '../../../storage/routeStart';
import { readPlaceStore } from '../../../storage/places';
import { homeOf } from '../../../engine/places';
import { wipeQuestion } from '../../../engine/placesPage';
import { withTimeout } from '../../../utils/withTimeout';

export function RouteStartFooter({ mode }: { mode: RouteStartMode }) {
  const [saved, setSaved] = useState<boolean | undefined>();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  // Wis startpunt is getikt: de vraag staat open.
  const [asking, setAsking] = useState<string | undefined>();
  const stop = useRef(new AbortController());

  useEffect(() => {
    let alive = true;
    void getRouteStartPoint().then((p) => alive && setSaved(p !== undefined));
    const ctl = stop.current;
    return () => {
      alive = false;
      ctl.abort();
    };
  }, []);

  async function startHere() {
    setBusy(true);
    setNote('Je locatie wordt bepaald. Dat duurt hoogstens 15 seconden.');
    const found = await locateStartHere({ signal: stop.current.signal });
    if (stop.current.signal.aborted) return;
    setBusy(false);
    if (found.ok) {
      setSaved(true);
      setNote(mode === 'exact' ? 'Thuis staat op dit toestel.' : 'Thuis staat op dit toestel. Kies Thuis om er standaard te beginnen.');
    } else {
      setNote(startFailureReason(found.reason));
    }
  }

  async function ask() {
    setNote('');
    const read = await withTimeout(readPlaceStore(), 3000).catch(() => undefined);
    const home = read?.ok ? homeOf(read.places) : undefined;
    setAsking(home ? wipeQuestion(home, read?.routes ?? []) : 'Je startpunt wissen? Je trainingen blijven staan.');
  }

  async function wipe() {
    setAsking(undefined);
    setBusy(true);
    const gone = await withTimeout(clearRouteStartPoint(), 4000).catch(() => false);
    setBusy(false);
    setSaved(!gone);
    setNote(gone ? 'Je startpunt is gewist.' : 'Wissen lukte niet of duurt langer dan verwacht. Kijk zo nog eens.');
  }

  return (
    <>
      <p className="st-hint" style={{ marginLeft: 0 }}>
        {saved ? 'Er staat een startpunt op dit toestel. Het gaat mee in je back-up.' : 'Er staat nog geen startpunt op dit toestel.'}
      </p>
      <div className="st-btns">
        <button type="button" className="st-btn" disabled={busy} onClick={() => void startHere()}>Gebruik waar ik nu ben</button>
        {!asking && <button type="button" className="st-btn" disabled={busy || !saved} onClick={() => void ask()}>Wis startpunt</button>}
      </div>
      {asking && (
        <>
          <p className="st-hint" style={{ marginLeft: 0, color: 'var(--color-ink)' }}>{asking}</p>
          <div className="st-btns">
            <button type="button" className="st-btn" disabled={busy} onClick={() => void wipe()}>Wissen</button>
            <button type="button" className="st-btn" disabled={busy} onClick={() => setAsking(undefined)}>Annuleren</button>
          </div>
        </>
      )}
      <p className="st-hint" role="status" style={{ marginLeft: 0 }}>{note}</p>
    </>
  );
}
