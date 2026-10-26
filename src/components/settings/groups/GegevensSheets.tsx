import { useEffect, useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { backupAge } from '../../../engine/settingsAttention';
import { longDate } from '../../../engine/settingsSummary';
import { getPersistenceStatus, requestPersistentStorage, type PersistenceStatus } from '../../../storage/persistence';
import { backupFileName, listSnapshots, restoreSnapshot } from '../../../storage/backup';
import { webBackupFileAdapter } from '../../../storage/backupFileAdapter';
import type { PreImportSnapshot } from '../../../storage/backupTypes';
import { checkForUpdate } from '../../../utils/appUpdate';
import { buildLabel } from '../../../utils/buildLabel';
import { formatDateNL, localDateOf, localTimeOf, todayISO } from '../../../utils/dates';
import { BaselineEvidenceCard } from '../../BaselineEvidenceCard';
import { SettingsList } from '../SettingsList';
import { Sheet } from '../Sheet';

// Back-up: maken en terugzetten. "Back-up maken" is de ene gouden knop van het blad.
export function BackupSheet({ onClose, onImport }: { onClose: () => void; onImport: () => void }) {
  const { exportData, settings, sessionLogs } = useAppData();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const age = backupAge(settings.lastExportedAt, todayISO());
  const last = settings.lastExportedAt;
  const since = last ? sessionLogs.filter((l) => l.completedAt > last).length : sessionLogs.length;
  const line = age.days === null
    ? 'Nog nooit gemaakt. Alles staat alleen op deze telefoon.'
    : `Laatste op ${longDate(localDateOf(settings.lastExportedAt!))}, ${age.days === 0 ? 'vandaag' : age.days === 1 ? 'gisteren' : `${age.days} dagen geleden`}.`;

  async function make() {
    setBusy(true);
    try {
      const result = await exportData();
      setStatus(result === 'saved'
        ? 'Back-up opgeslagen.'
        : result === 'downloaded'
          ? 'Back-up gedownload. Controleer of het bestand in je Downloads staat en bewaar het op een veilige plek.'
          : null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet eyebrow="Gegevens en back-up" title="Back-up" line={line} onClose={onClose}>
      {() => (
        <>
          <div className="st-btns col first">
            <button type="button" className="st-btn gold" disabled={busy} onClick={() => void make()}>Back-up maken</button>
            <button type="button" className="st-btn" onClick={() => onImport()}>Back-up terugzetten</button>
          </div>
          {status && <p className="st-hint" style={{ marginLeft: 0 }} role="status">{status}</p>}
          {!status && since > 0 && (
            <p className="st-hint" style={{ marginLeft: 0 }}>{`Sinds de laatste back-up ${since === 1 ? 'is 1 training' : `zijn ${since} trainingen`} gelogd.`}</p>
          )}
        </>
      )}
    </Sheet>
  );
}

// Vaste map: waar "Back-up maken" automatisch naartoe schrijft, zonder opslaanvenster.
export function FolderSheet({ chosen, onChanged, onClose }: { chosen: boolean; onChanged: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet eyebrow="Gegevens en back-up" title="Vaste map" line="Hier schrijft Back-up maken naartoe, zonder opslaanvenster." onClose={onClose}>
      <div className="st-btns first">
        <button
          type="button"
          className="st-btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await webBackupFileAdapter.choosePreferredDirectory?.();
              onChanged();
            } finally {
              setBusy(false);
            }
          }}
        >
          {chosen ? 'Map wijzigen' : 'Map kiezen'}
        </button>
      </div>
    </Sheet>
  );
}

// Opslag beschermen: vraagt de telefoon om je gegevens niet zomaar op te ruimen.
export function StorageSheet({ onChanged, onClose }: { onChanged: () => void; onClose: () => void }) {
  const [status, setStatus] = useState<PersistenceStatus | null>(null);
  useEffect(() => {
    void getPersistenceStatus().then(setStatus);
  }, []);
  return (
    <Sheet
      eyebrow="Gegevens en back-up"
      title="Opslag beschermd"
      line={status === 'protected' ? 'Je browser ruimt je gegevens niet zomaar op.' : 'Je browser mag je gegevens opruimen als er ruimte nodig is.'}
      onClose={onClose}
    >
      {status === 'not_protected' && (
        <>
          <p className="st-hint" style={{ marginLeft: 0 }}>Zet ASCEND op je beginscherm (in Safari: Deel, Zet op beginscherm) en maak regelmatig een back-up.</p>
          <div className="st-btns">
            <button type="button" className="st-btn" onClick={() => void requestPersistentStorage().then((s) => { setStatus(s); onChanged(); })}>Opnieuw vragen</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

// Kopieën van voor een import: de manier om een import ongedaan te maken. De laatste vijf blijven bewaard.
export function SnapshotsSheet({ onChanged, onClose }: { onChanged: () => void; onClose: () => void }) {
  const { refresh } = useAppData();
  const [snapshots, setSnapshots] = useState<PreImportSnapshot[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void listSnapshots().then(setSnapshots);
  }, []);

  async function restore(id: string) {
    setBusy(true);
    try {
      await restoreSnapshot(id);
      await refresh();
      setMessage('Teruggezet. Trainingen die je sindsdien hebt gelogd, zijn bewaard.');
      setSnapshots(await listSnapshots());
      onChanged();
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
    <Sheet eyebrow="Gegevens en back-up" title="Kopieën van voor een import" line="Zet er een terug om een import ongedaan te maken." onClose={onClose}>
      {snapshots && snapshots.length === 0 && <p className="st-hint" style={{ marginLeft: 0 }}>Nog geen kopieën. Vlak voor elke import bewaart ASCEND je gegevens.</p>}
      {snapshots && snapshots.length > 0 && (
        <SettingsList>
          {snapshots.map((s) => {
            const logs = 'sessionLogs' in s.envelope.payload ? s.envelope.payload.sessionLogs.length : 0;
            return (
              <div key={s.id} style={{ padding: '12px 16px', borderTop: '1px solid var(--color-card-border)' }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="st-num" style={{ color: 'var(--color-ink)' }}>{formatDateNL(localDateOf(s.createdAt))}, {localTimeOf(s.createdAt)}</span>
                  <span className="st-num" style={{ color: 'var(--color-ink-dim)', fontSize: 13 }}>{logs} trainingen</span>
                </div>
                {confirmId === s.id ? (
                  <>
                    <p className="st-hint" style={{ marginLeft: 0, color: 'var(--color-warning)' }}>Je planning, doelen en instellingen gaan terug naar dit moment. Trainingen blijven bewaard.</p>
                    <div className="st-btns">
                      <button type="button" className="st-btn" disabled={busy} onClick={() => setConfirmId(null)}>Annuleren</button>
                      <button type="button" className="st-btn" disabled={busy} onClick={() => void restore(s.id)}>Ja, terugzetten</button>
                    </div>
                  </>
                ) : (
                  <div className="st-btns">
                    <button type="button" className="st-btn" onClick={() => setConfirmId(s.id)}>Terugzetten</button>
                    <button type="button" className="st-btn" onClick={() => void download(s)}>Downloaden</button>
                  </div>
                )}
              </div>
            );
          })}
        </SettingsList>
      )}
      {message && <p className="st-hint" style={{ marginLeft: 0 }} role="status">{message}</p>}
    </Sheet>
  );
}

// Versie: wanneer deze versie gebouwd is, en zoeken naar een nieuwere.
export function VersionSheet({ onClose }: { onClose: () => void }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  async function check() {
    setChecking(true);
    const r = await checkForUpdate();
    setChecking(false);
    setResult(r === 'update'
      ? 'Er is een nieuwe versie. Zodra die binnen is verschijnt onderin Bijwerken.'
      : r === 'offline'
        ? 'Je bent offline. Zoeken kan zodra je verbinding hebt.'
        : r === 'latest'
          ? 'Je hebt de nieuwste versie.'
          : 'Controleren lukt hier niet. Herlaad de pagina om de nieuwste versie te krijgen.');
  }
  return (
    <Sheet eyebrow="Gegevens en back-up" title="Versie" line={`Gebouwd op ${buildLabel().replace(',', ' om')}.`} onClose={onClose}>
      <div className="st-btns first">
        <button type="button" className="st-btn" disabled={checking} onClick={() => void check()}>{checking ? 'Zoeken' : 'Zoeken naar update'}</button>
      </div>
      {result && <p className="st-hint" style={{ marginLeft: 0 }} role="status">{result}</p>}
    </Sheet>
  );
}

// Startniveau zelf invullen: meestal niet nodig, ASCEND vraagt zelf wat nog ontbreekt.
export function BaselineSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet eyebrow="Gegevens en back-up" title="Startniveau" line="Meestal niet nodig. ASCEND vraagt het zelf." onClose={onClose}>
      <BaselineEvidenceCard />
    </Sheet>
  );
}

// Adviezen opnieuw berekenen: ASCEND kijkt nu meteen opnieuw. Er wordt niets verwijderd.
export function RebuildSheet({ onClose }: { onClose: () => void }) {
  const { rebuildRecommendations } = useAppData();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Sheet eyebrow="Gegevens en back-up" title="Adviezen opnieuw" line="Gebeurt vanzelf bij openen. Er wordt niets verwijderd." onClose={onClose}>
      <div className="st-btns first">
        <button
          type="button"
          className="st-btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await rebuildRecommendations();
            setBusy(false);
            setDone(true);
          }}
        >
          {busy ? 'Bezig' : 'Nu berekenen'}
        </button>
      </div>
      {done && <p className="st-hint" style={{ marginLeft: 0 }} role="status">ASCEND heeft opnieuw gekeken. Nieuwe aanbevelingen verschijnen zodra er iets is.</p>}
    </Sheet>
  );
}

// Alles verwijderen: biedt eerst een back-up aan en vraagt dan nog één keer. Dit kan niet terug.
export function ResetSheet({ onClose, onBackup }: { onClose: () => void; onBackup: () => void }) {
  const { resetDemoData } = useAppData();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet eyebrow="Gegevens en back-up" title="Alles verwijderen" line="Wist alles op deze telefoon. Dit kan niet terug." onClose={onClose}>
      {(close) => (
        <>
          <div className="st-btns col first">
            <button type="button" className="st-btn" onClick={() => onBackup()}>Eerst een back-up</button>
          </div>
          {confirming && <p className="st-hint" style={{ marginLeft: 0, color: 'var(--color-danger-text)' }} role="alert">Weet je het zeker? Al je gegevens gaan definitief verloren.</p>}
          <div className="st-btns">
            <button type="button" className="st-btn" disabled={busy} onClick={close}>Annuleren</button>
            {confirming ? (
              <button
                type="button"
                className="st-btn red"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await resetDemoData();
                  setBusy(false);
                  close();
                }}
              >
                {busy ? 'Bezig' : 'Ja, alles verwijderen'}
              </button>
            ) : (
              <button type="button" className="st-btn red" onClick={() => setConfirming(true)}>Verwijderen</button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}
