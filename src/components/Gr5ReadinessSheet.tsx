import type { Gr5Readiness } from '../engine/gr5Readiness';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { dayMonth } from './stand/chartParts';
import { Card, Eyebrow } from './ui';

// De vier meters achter het percentage: jouw beste van de laatste acht weken
// naast wat de GR5 vraagt, elk met één zin waarom. Het percentage is het
// gemiddelde van deze vier (engine/gr5Readiness.ts).

export function Gr5ReadinessSheet({ readiness, onClose }: { readiness: Gr5Readiness; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Klaar voor de GR5">
          <Card className="rounded-b-none border-b-0 pb-8">
            <Eyebrow>Klaar voor de GR5</Eyebrow>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              <span className="font-sans text-xl font-medium tabular-nums">{readiness.percent}%</span>
              <span style={{ color: 'var(--color-ink-dim)' }}> is het gemiddelde van deze {readiness.meters.length === 4 ? 'vier' : readiness.meters.length} meters. Elke meter stopt bij 100%, dus een zware rugzak maakt een korte dag niet goed.</span>
            </p>

            <div className="mt-4 flex flex-col">
              {readiness.meters.map((m, i) => (
                <div key={m.key} className={`flex flex-col gap-1.5 py-4 ${i === 0 ? 'pt-0' : 'border-t'}`} style={{ borderColor: 'var(--color-card-border)' }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{m.label}</span>
                    <span className="text-sm tabular-nums" style={{ color: m.share >= 1 ? 'var(--color-action)' : 'var(--color-ink)' }}>{m.text}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--color-charcoal)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(m.share * 100, m.share > 0 ? 3 : 0)}%`, background: m.share >= 1 ? 'var(--color-action)' : 'var(--color-action)' }} />
                  </div>
                  {m.parts.length > 1 && (
                    <p className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                      {m.parts.map((p) => `${p.name} ${p.text}`).join(', ')}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                    {m.why}
                    {m.parts.length === 1 && m.key !== 'dagen' && m.parts[0].bestDate ? ` Je beste was op ${dayMonth(m.parts[0].bestDate)}.` : ''}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              Je hoeft er nu nog niet te zijn. De lange tochten in het voorjaar en de zomer maken het verschil; de planning bouwt daar naartoe. Het getal telt je beste van de laatste acht weken, dus het zakt als je lange tochten ouder worden.
            </p>

            <button onClick={requestClose} className="mt-4 min-h-[44px] w-full text-center text-sm" style={{ color: 'var(--color-ink-dim)' }}>Sluiten</button>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
