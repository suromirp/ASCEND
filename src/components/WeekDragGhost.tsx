import type { ReactNode } from 'react';
import { Portal } from './Portal';

// De rij die je vasthoudt: een zwevende kopie die je vinger volgt (docs/visie/Slepen in Week.md).
// Vast aan het scherm, in een Portal, zodat de kaart van de week hem niet afknipt; dezelfde breedte
// en dezelfde linkerkant als de rij, alleen verticaal bewegend, 1 op 1 met de vinger in elke
// bewegingsstand. Dezelfde rand en schaduw als een opgepakt doel op Ascend.
// De rand neemt de kleur van de dag eronder over (mint past, amber vraagt iets, gedempt kan niet), omdat
// de rij op een smal scherm het doelvak bijna helemaal bedekt.
export function WeekDragGhost({ left, width, top, tone, children }: { left: number; width: number; top: number; tone?: 'ok' | 'warn' | 'none'; children: ReactNode }) {
  const border = tone === 'warn' ? 'var(--color-warning)' : tone === 'none' ? 'var(--color-control-border)' : 'var(--color-action)';
  return (
    <Portal>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[60] overflow-hidden rounded-2xl border"
        style={{
          left,
          width,
          top: 0,
          transform: `translateY(${top}px)`,
          background: 'var(--color-raised)',
          borderColor: border,
          borderWidth: 2,
          boxShadow: '0 8px 24px color-mix(in srgb, var(--color-shadow) 55%, transparent)',
        }}
      >
        {children}
      </div>
    </Portal>
  );
}
