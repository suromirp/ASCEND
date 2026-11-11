// ASCEND: onder de keuze Startpunt van je lus: het eigen punt van dit toestel. Gebruik waar ik nu ben
// vraagt één keer je plek (met een grens in tijd en een zichtbare uitkomst) en bewaart die alleen op
// dit toestel; Wis startpunt haalt hem weg. Het punt zelf staat nooit op het scherm.

import { useEffect, useRef, useState } from 'react';
import { startFailureReason, type RouteStartMode } from '../../../engine/routeStart';
import { clearRouteStartPoint, getRouteStartPoint, locateStartHere } from '../../../storage/routeStart';

export function RouteStartFooter({ mode }: { mode: RouteStartMode }) {
  const [saved, setSaved] = useState<boolean | undefined>();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
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
      setNote(mode === 'exact' ? 'Je startpunt staat op dit toestel.' : 'Je startpunt staat op dit toestel. Kies Vast punt om het te gebruiken.');
    } else {
      setNote(startFailureReason(found.reason));
    }
  }

  async function wipe() {
    const gone = await clearRouteStartPoint();
    setSaved(!gone);
    setNote(gone ? 'Je startpunt is gewist.' : 'Wissen lukte niet. Probeer het nog eens.');
  }

  return (
    <>
      <p className="st-hint" style={{ marginLeft: 0 }}>
        {saved ? 'Er staat een startpunt op dit toestel. Het gaat niet mee in een back-up.' : 'Er staat nog geen startpunt op dit toestel.'}
      </p>
      <div className="st-btns">
        <button type="button" className="st-btn" disabled={busy} onClick={() => void startHere()}>Gebruik waar ik nu ben</button>
        <button type="button" className="st-btn" disabled={busy || !saved} onClick={() => void wipe()}>Wis startpunt</button>
      </div>
      <p className="st-hint" role="status" style={{ marginLeft: 0 }}>{note}</p>
    </>
  );
}
