import type { ReactNode } from 'react';
import { Portal } from './Portal';

// De rij die je vasthoudt: een zwevende kopie die je vinger volgt (docs/visie/Slepen in Week.md).
// Vast aan het scherm, in een Portal, zodat de kaart van de week hem niet afknipt; dezelfde breedte
// en dezelfde linkerkant als de rij, alleen verticaal bewegend, 1 op 1 met de vinger in elke
// bewegingsstand. Dezelfde rand en schaduw als een opgepakt doel op Ascend.
export function WeekDragGhost({ left, width, top, children }: { left: number; width: number; top: number; children: ReactNode }) {
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
          borderColor: 'var(--color-action)',
          boxShadow: '0 8px 24px color-mix(in srgb, var(--color-shadow) 55%, transparent)',
        }}
      >
        {children}
      </div>
    </Portal>
  );
}
