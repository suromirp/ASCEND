// ASCEND: De avond ervoor op Vandaag (docs/beslissingen/2026-11-11-avond-ervoor.md). Vanaf de gekozen
// tijd een rustige kaart onder de missie: de training van morgen en hoogstens vier regels om klaar te
// leggen. Alleen tekst, geen knop en geen accent: de missie van vandaag blijft het eerste wat je ziet
// en houdt de ene mint. Geen eigen beweging, dus in Rustig en Uit staat hij er gewoon.

import { Card, Eyebrow } from './ui';
import { EVENING_TEXT } from '../engine/eveningBefore';
import { useEveningBefore } from './useEveningBefore';

export function EveningBeforeCard() {
  const view = useEveningBefore();
  if (!view) return null;
  return (
    <Card className="flex flex-col gap-2" aria-label={EVENING_TEXT.eyebrow} data-evening-before="">
      <Eyebrow>{EVENING_TEXT.eyebrow}</Eyebrow>
      <p className="text-[15px] font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{view.title}</p>
      <ul className="flex flex-col gap-1">
        {view.lines.map((line) => (
          <li key={line} className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{line}</li>
        ))}
      </ul>
    </Card>
  );
}
