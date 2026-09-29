// ASCEND — log a session that wasn't planned (Fase 4): a ride, an extra
// run or hike. Always available, whatever sports ASCEND is allowed to plan
// (Settings → Training → Sporten only limits planning, never logging).

import type { SessionTemplate } from '../models/training';
import { templateSport, SPORT_LABEL } from '../engine/sports';
import { Portal } from './Portal';
import { Card, Eyebrow, SecondaryButton } from './ui';
import { useSheetClose } from '../utils/useSheetClose';

const TYPE_ORDER: Record<string, number> = { cardio: 1, hiking: 2, strength: 3, adventure: 4, recovery: 5 };

export function AdHocLogSheet({ templates, onPick, onClose }: { templates: SessionTemplate[]; onPick: (template: SessionTemplate) => void; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  const sorted = [...templates].sort((a, b) => {
    const ca = templateSport(a) === 'cycling' ? 0 : TYPE_ORDER[a.type] ?? 9;
    const cb = templateSport(b) === 'cycling' ? 0 : TYPE_ORDER[b.type] ?? 9;
    return ca - cb || a.name.localeCompare(b.name);
  });
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <Eyebrow>LOSSE TRAINING LOGGEN</Eyebrow>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Iets gedaan dat niet op de planning stond? Kies wat het was.</p>
            <div className="flex flex-col gap-2">
              {sorted.map((t) => {
                const sport = templateSport(t);
                return (
                  <button
                    key={t.id}
                    onClick={() => onPick(t)}
                    className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]"
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{t.name}</span>
                    {sport && <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{SPORT_LABEL[sport]}</span>}
                  </button>
                );
              })}
            </div>
            <SecondaryButton onClick={requestClose}>ANNULEREN</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
