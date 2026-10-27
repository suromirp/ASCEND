// ASCEND: the screen while the app opens. Never a black screen that stays:
// on a later open of the day the logo shows after one second, after 6 s it
// says what it is doing, after 20 s it offers a way out (try
// again, or make a backup first) and names the step that does not finish
// (engine/bootWatch.ts). Then it also checks, with one short read, whether the
// storage answers at all; when it does not, it says what to do in plain words
// (docs/beslissingen/2026-10-22-opslag-vrij-bij-wegleggen.md).

import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { backupFailedLines, bootStepLine, bootStuckLines, bootWatchStage, type StorageProbe } from '../engine/bootWatch';
import { probeStorage } from '../storage/storageProbe';
import { withTimeout } from '../utils/withTimeout';
import { AscendSplashLogo } from './AscendSplashLogo';
import { PrimaryButton, SecondaryButton } from './ui';

const BACKUP_LIMIT_MS = 12_000;

export function BootScreen({ splash }: { splash: boolean }) {
  const { bootStep, bootMigration, exportData } = useAppData();
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [backup, setBackup] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const [backupProbe, setBackupProbe] = useState<StorageProbe | null>(null);
  const [probe, setProbe] = useState<StorageProbe | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const stage = bootWatchStage(now - started);

  // Once stuck: does the storage answer? Asked again every 15 s, so the screen
  // follows when the other ASCEND lets go (or not).
  const stuck = stage === 'stuck';
  useEffect(() => {
    if (!stuck) return;
    let alive = true;
    const ask = () => void probeStorage().then((result) => alive && setProbe(result));
    ask();
    const timer = setInterval(ask, 15_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [stuck]);

  // Later opens of the day: an empty frame only for the first second, the
  // moment IndexedDB usually needs; then the small logo.
  if (!splash && now - started < 1_000) return <div className="flex-1" style={{ background: 'var(--color-bg)' }} />;

  async function makeBackup() {
    setBackup('busy');
    setBackupProbe(null);
    // First the short test: when the storage does not answer, a backup can not
    // be made either, and the user hears that within seconds.
    const before = await probeStorage();
    if (before === 'silent') {
      setProbe('silent');
      setBackupProbe('silent');
      setBackup('failed');
      return;
    }
    try {
      const result = await withTimeout(exportData(), BACKUP_LIMIT_MS, 'Back-up');
      setBackup(result ? 'done' : 'failed');
    } catch {
      setBackupProbe(await probeStorage());
      setBackup('failed');
    }
  }

  const stuckLines = bootStuckLines(bootStep, bootMigration, probe);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-10 text-center">
      <AscendSplashLogo size={stage === 'stuck' || !splash ? 120 : 200} />
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }} role="status">
        {stage === 'quiet' ? 'De klim wordt voorbereid…' : bootStepLine(bootStep)}
      </p>
      {stage === 'stuck' && (
        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          {stuckLines.map((line) => (
            <p key={line} className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
              {line}
            </p>
          ))}
          <PrimaryButton onClick={() => window.location.reload()}>Opnieuw proberen</PrimaryButton>
          <SecondaryButton onClick={() => void makeBackup()} disabled={backup === 'busy'}>
            {backup === 'busy' ? 'Back-up wordt gemaakt…' : 'Back-up maken'}
          </SecondaryButton>
          {backup === 'done' && <p className="text-xs" role="status" style={{ color: 'var(--color-success-text)' }}>De back-up is gemaakt. Bewaar het bestand op een veilige plek.</p>}
          {backup === 'failed' && (
            <div role="status" className="flex flex-col gap-1">
              {backupFailedLines(backupProbe, probe === 'silent').map((line) => (
                <p key={line} className="text-xs" style={{ color: 'var(--color-warning)' }}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
