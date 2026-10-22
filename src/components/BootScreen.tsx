// ASCEND: the screen while the app opens. Never a black screen that stays:
// on a later open of the day the logo shows after one second, after 6 s it
// says what it is doing, after 20 s it offers a way out (try
// again, or make a backup first) and names the step that does not finish
// (engine/bootWatch.ts).

import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { bootStepLine, bootStepName, bootWatchStage } from '../engine/bootWatch';
import { withTimeout } from '../utils/withTimeout';
import { AscendSplashLogo } from './AscendSplashLogo';
import { PrimaryButton, SecondaryButton } from './ui';

export function BootScreen({ splash }: { splash: boolean }) {
  const { bootStep, exportData } = useAppData();
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [backup, setBackup] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const stage = bootWatchStage(now - started);

  // Later opens of the day: an empty frame only for the first second, the
  // moment IndexedDB usually needs; then the small logo.
  if (!splash && now - started < 1_000) return <div className="flex-1" style={{ background: 'var(--color-bg)' }} />;

  async function makeBackup() {
    setBackup('busy');
    try {
      const result = await withTimeout(exportData(), 15_000, 'Back-up');
      setBackup(result ? 'done' : 'failed');
    } catch {
      setBackup('failed');
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-10 text-center">
      <AscendSplashLogo size={stage === 'stuck' || !splash ? 120 : 200} />
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }} role="status">
        {stage === 'quiet' ? 'De klim wordt voorbereid…' : bootStepLine(bootStep)}
      </p>
      {stage === 'stuck' && (
        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
            Dit duurt te lang. Het openen blijft hangen bij de stap: {bootStepName(bootStep)}. Geef die naam door als het blijft gebeuren.
          </p>
          <PrimaryButton onClick={() => window.location.reload()}>Opnieuw proberen</PrimaryButton>
          <SecondaryButton onClick={() => void makeBackup()} disabled={backup === 'busy'}>
            {backup === 'busy' ? 'Back-up wordt gemaakt…' : 'Back-up maken'}
          </SecondaryButton>
          {backup === 'done' && <p className="text-xs" role="status" style={{ color: 'var(--color-success-text)' }}>De back-up is gemaakt. Je gegevens staan veilig.</p>}
          {backup === 'failed' && <p className="text-xs" role="status" style={{ color: 'var(--color-warning)' }}>De back-up lukte nu niet. Probeer het opnieuw na Opnieuw proberen.</p>}
        </div>
      )}
    </div>
  );
}
