// ASCEND — log a session that wasn't planned (Fase 4): a ride, an extra
// run or hike. Always available, whatever sports ASCEND is allowed to plan
// (Settings → Training → Sporten only limits planning, never logging).

import type { SessionTemplate } from '../models/training';
import { adHocGroups } from '../engine/adHocGroups';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { Card, SecondaryButton, SheetGrip } from './ui';
import { useSheetClose } from '../utils/useSheetClose';

// Kopjes per sport in een vaste volgorde, Wandelen bovenaan (engine/adHocGroups.ts).
export function AdHocLogSheet({ templates, onPick, onClose }: { templates: SessionTemplate[]; onPick: (template: SessionTemplate) => void; onClose: () => void }) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const groups = adHocGroups(templates);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <SheetHeader eyebrow="Loggen" title="Losse training" onClose={requestClose} />
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Iets gedaan dat niet op de planning stond? Kies wat het was.</p>
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label} className="flex flex-col gap-2">
                <h3 className="text-xs font-medium" style={{ color: 'var(--color-ink-dim)' }}>{group.label}</h3>
                {group.templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onPick(t)}
                    className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]"
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{t.name}</span>
                  </button>
                ))}
              </section>
            ))}
            <SecondaryButton onClick={requestClose}>Annuleren</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
