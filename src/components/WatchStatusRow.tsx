// ASCEND: one short line on the training screen that says where this training
// stands on the watch: sent (and when), waiting, failed (and why), or the offer
// to link. A strength training, a rest day and anything done or past show
// nothing. The buttons "Nu versturen" and "Opnieuw" run the same send as the
// automatic round, without its 15-minute brake.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './icons';
import { SecondaryButton } from './ui';
import { useWatchStatuses } from './useWatchStatus';
import { useAppData } from '../state/AppDataContext';
import { syncWatchWorkouts, type WorkoutSyncResult } from '../storage/watchWorkouts';
import { watchStatusLine } from '../engine/watchStatus';
import { todayISO } from '../utils/dates';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import type { PlannedSession, SessionTemplate } from '../models/training';

// A send never hangs on "Bezig…": after this long the button comes back and
// the row says it took too long (the run itself carries on in the background
// and the row follows its outcome).
const SEND_TIMEOUT_MS = 30_000;

function noteForResult(result: WorkoutSyncResult): string | null {
  if (result.status === 'off') return 'De schakelaar staat uit.';
  if (result.status === 'not-connected') return 'Er is geen koppeling met intervals.icu.';
  return null;
}

const COLOR = {
  sent: 'var(--color-success-text)',
  failed: 'var(--color-warning)',
  other: 'var(--color-ink-dim)',
} as const;

export function WatchStatusRow({
  session,
  template,
  onLeave,
  offer = true,
  className = '',
}: {
  session: PlannedSession;
  template: SessionTemplate;
  // Called before the row opens the Garmin page, so a sheet can close first.
  onLeave?: () => void;
  // False on Vandaag: there the row only reports on a training that is linked,
  // and does not ask to link (the training screen does).
  offer?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const { settings } = useAppData();
  const { statusOf, reload } = useWatchStatuses();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (settings.showWatchStatus === false) return null;
  const status = statusOf(session, template);
  const line = watchStatusLine(status, todayISO());
  if (!line || (!offer && status.kind === 'unlinked')) return null;

  async function send() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      setNote(noteForResult(await withTimeout(syncWatchWorkouts({ force: true }), SEND_TIMEOUT_MS)));
    } catch (err) {
      setNote(err instanceof TimeoutError ? 'Dat duurde te lang. Probeer het zo nog eens.' : 'Versturen is niet gelukt. Probeer het zo nog eens.');
    } finally {
      setBusy(false);
      await reload();
    }
  }

  function toGarmin() {
    onLeave?.();
    navigate('/koppelen/garmin');
  }

  const color = status.kind === 'sent' ? COLOR.sent : status.kind === 'failed' ? COLOR.failed : COLOR.other;
  const body = (
    <>
      <span className="shrink-0" style={{ color }}><Icon name="horloge" size={20} /></span>
      <span className="min-w-0 flex-1 text-balance text-sm leading-snug" style={{ color: status.kind === 'sent' || status.kind === 'failed' ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>{line.text}</span>
    </>
  );
  const box = 'flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-3 py-1.5 text-left';
  const boxStyle = { borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' };

  return (
    <div className={className} aria-live="polite">
      {line.action === 'link' ? (
        <button type="button" onClick={toGarmin} className={box} style={boxStyle}>
          {body}
          <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>
        </button>
      ) : (
        <div className={box} style={boxStyle}>
          {body}
          {line.action && (
            <SecondaryButton onClick={() => void send()} disabled={busy} className="flex-none px-3">
              {busy ? 'Bezig…' : line.actionLabel}
            </SecondaryButton>
          )}
        </div>
      )}
      {note && <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--color-warning)' }}>{note}</p>}
    </div>
  );
}
