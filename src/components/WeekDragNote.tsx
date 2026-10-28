import { Portal } from './Portal';

// De ene vaste zin tijdens het slepen in Week: wat de dag onder je vinger zegt en wat loslaten doet,
// met het droge feit eerst. In de stijl van een Card met tekst van 14 px, hoogstens twee regels op
// een gewone telefoon. Staat je vinger in het onderste derde van het scherm, dan staat hij boven
// (`position="top"`), zodat je vinger hem nooit bedekt. De schermlezer krijgt dezelfde zin, of de
// uitkomst van het loslaten, door een vaste `aria-live`-regel (`live`).
export function WeekDragNote({ text, tone, position, live }: { text?: string; tone?: 'ok' | 'warn' | 'none'; position?: 'top' | 'bottom'; live: string }) {
  return (
    <>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{live}</p>
      {text && (
        <Portal>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
            style={position === 'top' ? { top: 'calc(env(safe-area-inset-top) + 12px)' } : { bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
          >
            <div
              className="w-full max-w-md rounded-2xl border px-4 py-3 text-sm leading-snug"
              style={{
                background: 'var(--color-card)',
                color: 'var(--color-ink)',
                borderColor: tone === 'warn' ? 'var(--color-warning)' : tone === 'none' ? 'var(--color-control-border)' : 'var(--color-action)',
              }}
            >
              {text}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
