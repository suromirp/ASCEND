// ASCEND: de stang van opzij met de schijven van één kant, voor het invoerpaneel
// van Forge. De zwaarste schijf zit binnen. Een schijf die erbij komt schuift
// aan, een schijf die eraf gaat schuift weg; de rest schuift zacht op. Kleuren en
// hoogtes komen uit engine/forgeInput.ts (tokens, geen losse kleuren).

import { useEffect, useMemo, useRef, useState } from 'react';
import { plateHeight, plateTone } from '../../engine/forgeInput';

interface Item {
  id: string;
  kg: number;
  index: number;
}

const WIDTH = 150;
const HEIGHT = 56;
const PLATE_W = 8;
const PLATE_GAP = 1.5;
const FIRST_X = 30;

// Een schijf krijgt een naam van zijn gewicht en hoeveelste hij daarvan is, zodat
// "2 x 5" bij een wijziging dezelfde schijven blijven en alleen de nieuwe aanschuift.
function toItems(perSide: number[]): Item[] {
  const seen = new Map<number, number>();
  return perSide.map((kg, index) => {
    const n = (seen.get(kg) ?? 0) + 1;
    seen.set(kg, n);
    return { id: `${kg}#${n}`, kg, index };
  });
}

export function PlateBar({ perSide }: { perSide: number[] }) {
  const key = perSide.join('|');
  const items = useMemo(() => toItems(key === '' ? [] : key.split('|').map(Number)), [key]);
  const previous = useRef<Item[]>(items);
  const [ghosts, setGhosts] = useState<Item[]>([]);
  // De schijven die er bij het openen al zijn schuiven niet aan; een nieuwe wel.
  const [initial] = useState(() => new Set(items.map((i) => i.id)));

  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    const gone = previous.current.filter((i) => !ids.has(i.id));
    previous.current = items;
    for (const g of gone) initial.delete(g.id);
    if (gone.length === 0) return;
    setGhosts(gone);
    const t = window.setTimeout(() => setGhosts([]), 200);
    return () => window.clearTimeout(t);
  }, [items, initial]);

  const x = (index: number) => FIRST_X + index * (PLATE_W + PLATE_GAP);
  const plate = (item: Item, leaving: boolean) => {
    const h = Math.round(HEIGHT * plateHeight(item.kg));
    return (
      <g key={`${leaving ? 'out-' : ''}${item.id}`} className="forge-plate-slot" style={{ transform: `translateX(${x(item.index)}px)` }}>
        <rect
          className={leaving ? 'forge-plate-out' : initial.has(item.id) ? undefined : 'forge-plate-in'}
          x={0}
          y={(HEIGHT - h) / 2}
          width={PLATE_W}
          height={h}
          rx={2}
          fill={plateTone(item.kg)}
        />
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img" aria-label={perSide.length > 0 ? `Stang met ${perSide.length} schijven per kant` : 'Stang zonder schijven'} className="block shrink-0">
      <rect x={0} y={HEIGHT / 2 - 2} width={WIDTH} height={4} rx={2} fill="var(--color-stone)" opacity={0.55} />
      <rect x={FIRST_X - 8} y={HEIGHT / 2 - 9} width={5} height={18} rx={1.5} fill="var(--color-ink-dim)" />
      {ghosts.map((g) => plate(g, true))}
      {items.map((i) => plate(i, false))}
    </svg>
  );
}
