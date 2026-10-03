import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { Card, Eyebrow, SecondaryButton } from './ui';
import { getPersistenceStatus, requestPersistentStorage, type PersistenceStatus } from '../storage/persistence';
import { listSnapshots, restoreSnapshot, backupFileName } from '../storage/backup';
import { webBackupFileAdapter } from '../storage/backupFileAdapter';
import type { PreImportSnapshot } from '../storage/backupTypes';
import { daysBetween, formatDateNL, todayISO } from '../utils/dates';

// Settings → Gegevens: whether the browser may clear the data, when the
// last backup was, and the copies taken right before each import (the
// way to undo one).

function ago(iso: string): string {
  const days = daysBetween(iso.slice(0, 10), todayISO());
  if (days <= 0) return 'vandaag';
  if (days === 1) return 'gisteren';
  return `${days} dagen geleden`;
}

export function BackupStatusLine() {
  const { settings, sessionLogs } = useAppData();
  const last = settings.lastExportedAt;
  const since = last ? sessionLogs.filter((l) => l.completedAt > last).length : sessionLogs.length;
  return (
    <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
      {last
        ? `Laatste back-up: ${ago(last)}${since > 0 ? `, daarna ${since} ${since === 1 ? 'training' : 'trainingen'} gelogd` : ''}.`
        : 'Je hebt nog geen back-up gemaakt.'}
    </p>
  );
}

export function StorageProtectionCard() {
  const [status, setStatus] = useState<PersistenceStatus | null>(null);
  useEffect(() => {
    void getPersistenceStatus().then(setStatus);
  }, []);
  if (status === null || status === 'unsupported') return null;

  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>OPSLAG</Eyebrow>
      {status === 'protected' ? (
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
          Beschermd. Je browser ruimt je gegevens niet zomaar op.
        </p>
      ) : (
        <>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
            Niet beschermd. Je browser mag je gegevens opruimen als er ruimte nodig is, en Safari doet dat na een week
            niet openen.
          </p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Zet ASCEND op je beginscherm (in Safari: Deel, Zet op beginscherm) en maak regelmatig een back-up.
          </p>
          <SecondaryButton onClick={() => void requestPersistentStorage().then(setStatus)}>OPNIEUW VRAGEN</SecondaryButton>
        </>
      )}
    </Card>
  );
}

export function SnapshotsCard() {
  const { refresh } = useAppData();
  const [snapshots, setSnapshots] = useState<PreImportSnapshot[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void listSnapshots().then(setSnapshots);
  }, []);

  if (snapshots.length === 0) return null;

  async function restore(id: string) {
    setBusy(true);
    try {
      await restoreSnapshot(id);
      await refresh();
      setMessage('Teruggezet. Trainingen die je sindsdien hebt gelogd, zijn bewaard.');
      setSnapshots(await listSnapshots());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Terugzetten is mislukt.');
    } finally {
      setBusy(false);
      setConfirmId(null);
    }
  }

  async function download(snapshot: PreImportSnapshot) {
    const blob = new Blob([JSON.stringify(snapshot.envelope, null, 2)], { type: 'application/json' });
    await webBackupFileAdapter.saveBackup(blob, backupFileName(snapshot.createdAt));
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>KOPIEËN VAN VÓÓR EEN IMPORT</Eyebrow>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        Vlak voor elke import bewaart ASCEND je gegevens zoals ze waren. Zet er een terug om een import ongedaan te maken.
        De laatste vijf blijven bewaard.
      </p>
      {snapshots.map((s) => {
        const logs = 'sessionLogs' in s.envelope.payload ? s.envelope.payload.sessionLogs.length : 0;
        return (
          <div key={s.id} className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                {formatDateNL(s.createdAt.slice(0, 10))}, {s.createdAt.slice(11, 16)}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{logs} trainingen</span>
            </div>
            {confirmId === s.id ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
                  Je planning, doelen en instellingen gaan terug naar dit moment. Trainingen blijven bewaard.
                </p>
                <div className="flex gap-3">
                  <SecondaryButton onClick={() => setConfirmId(null)} disabled={busy}>ANNULEREN</SecondaryButton>
                  <SecondaryButton onClick={() => void restore(s.id)} disabled={busy}>{busy ? 'BEZIG…' : 'JA, TERUGZETTEN'}</SecondaryButton>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <SecondaryButton onClick={() => setConfirmId(s.id)}>TERUGZETTEN</SecondaryButton>
                <SecondaryButton onClick={() => void download(s)}>DOWNLOADEN</SecondaryButton>
              </div>
            )}
          </div>
        );
      })}
      {message && <p className="text-xs" style={{ color: 'var(--color-gold)' }}>{message}</p>}
    </Card>
  );
}
