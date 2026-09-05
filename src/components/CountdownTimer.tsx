import { useEffect, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { haptics } from '../utils/haptics';
import { playTimerAlarm } from '../utils/sound';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';

const inputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

export function CountdownTimer({
  initialSeconds = 60,
  label,
  onClose,
}: {
  initialSeconds?: number;
  label?: string;
  onClose: () => void;
}) {
  const { settings } = useAppData();
  const { closing, requestClose } = useSheetClose(onClose);

  const [totalSeconds, setTotalSeconds] = useState(Math.max(0, initialSeconds));
  const [remaining, setRemaining] = useState(Math.max(0, initialSeconds));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          setRunning(false);
          setDone(true);
          haptics.alarm();
          if (settings.introSoundEnabled) playTimerAlarm();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, settings.introSoundEnabled]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
  // The mm/ss inputs are only editable at rest — while it's counting down
  // or paused mid-count, changing them would be ambiguous (restart? adjust
  // remaining?). RESET returns here explicitly instead.
  const editable = !running && remaining === totalSeconds;

  function applyDuration(nextMinutes: number, nextSeconds: number) {
    const next = Math.max(0, nextMinutes) * 60 + Math.max(0, Math.min(59, nextSeconds));
    setTotalSeconds(next);
    setRemaining(next);
    setDone(false);
  }

  function reset() {
    setRunning(false);
    setDone(false);
    setRemaining(totalSeconds);
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div className={`w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-5 rounded-b-none border-b-0 pb-6">
            <Eyebrow>{label ?? 'TIMER'}</Eyebrow>

            <div className="flex flex-col items-center gap-3 py-2">
              <p
                className="font-display text-6xl"
                style={{ color: done ? 'var(--color-gold)' : 'var(--color-ink)', fontVariantNumeric: 'tabular-nums' }}
              >
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
              <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--color-charcoal)' }}>
                <div
                  className="h-1.5 rounded-full transition-[width] duration-500"
                  style={{ width: `${progress}%`, background: done ? 'var(--color-gold)' : 'var(--color-bronze)' }}
                />
              </div>
              {done && <p className="text-sm" style={{ color: 'var(--color-gold)' }}>Tijd om.</p>}
            </div>

            {editable && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Minuten</label>
                  <input
                    type="number"
                    min={0}
                    value={Math.floor(totalSeconds / 60)}
                    onChange={(e) => applyDuration(Number(e.target.value) || 0, totalSeconds % 60)}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    style={inputStyle}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Seconden</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={totalSeconds % 60}
                    onChange={(e) => applyDuration(Math.floor(totalSeconds / 60), Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {!editable && <SecondaryButton onClick={reset}>RESET</SecondaryButton>}
              {totalSeconds > 0 && (
                <PrimaryButton onClick={() => setRunning((r) => !r)} disabled={remaining === 0}>
                  {running ? 'PAUZEREN' : remaining === totalSeconds ? 'START' : 'HERVATTEN'}
                </PrimaryButton>
              )}
            </div>

            <button onClick={requestClose} className="text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Sluiten
            </button>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
