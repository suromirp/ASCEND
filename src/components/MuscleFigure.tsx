import type { CSSProperties } from 'react';
import { FIGURE_WIDTH } from '../data/bodyFigure';
import { cropFor, mainSide, regionPath, type MuscleMark } from '../engine/muscleMap';
import type { MuscleSide } from '../data/muscleRegions';
import type { Figure } from '../engine/figureSettings';
import { Body } from './lichaam/BodyFigure';

// Het spierkaartje: het figuur van Lichaam met de werkende spieren in lila, de kleur van kracht
// (alleen voor spiergegevens). Hoofdspier vol, wie meehelpt op 40 procent. Alle vormen komen uit
// data/muscleRegions.ts en het rekenwerk uit engine/muscleMap.ts; hier wordt alleen getekend.

const MIRROR = `translate(${FIGURE_WIDTH} 0) scale(-1 1)`;
const OPACITY = { primary: 0.92, secondary: 0.4 } as const;
// Eerst de hoofdspier, 200 ms later wie meehelpt (.ea-licht in index.css).
const DELAY = { primary: 360, secondary: 560 } as const;

function Muscles({ marks, side }: { marks: MuscleMark[]; side: MuscleSide }) {
  // Wie meehelpt eerst, zodat de hoofdspier bovenop komt.
  const here = marks.filter((m) => m.side === side).sort((a, b) => (a.level === 'secondary' ? -1 : 1) - (b.level === 'secondary' ? -1 : 1));
  return (
    <g style={{ fill: 'var(--color-sport-strength)' }}>
      {here.map((m) => {
        const d = regionPath(m.group, side);
        if (!d) return null;
        return (
          <g key={m.group} className="ea-m" style={{ '--o': OPACITY[m.level], '--d': `${DELAY[m.level]}ms` } as CSSProperties}>
            <path d={d} />
            <path d={d} transform={MIRROR} />
          </g>
        );
      })}
    </g>
  );
}

// Eén kant van het lichaam, bijgesneden op `crop` ([x, y, breedte, hoogte]) en getekend op width bij height px.
export function MuscleFigure({ marks, side, crop, width, height, figure }: { marks: MuscleMark[]; side: MuscleSide; crop: [number, number, number, number]; width: number; height: number; figure: Figure }) {
  return (
    <svg viewBox={crop.map((v) => Math.round(v * 10) / 10).join(' ')} width={width} height={height} aria-hidden="true">
      <Body view={side} figure={figure} />
      <Muscles marks={marks} side={side} />
    </svg>
  );
}

// Het kleine kaartje, vierkant: de kant waar de hoofdspieren zitten, bijgesneden op wat werkt.
export function MuscleThumb({ marks, size, figure }: { marks: MuscleMark[]; size: number; figure: Figure }) {
  const side = mainSide(marks);
  const here = marks.filter((m) => m.side === side);
  const focus = here.filter((m) => m.level === 'primary');
  const crop = cropFor(focus.length > 0 ? focus : here, { square: true, minW: 100, minH: 100, margin: 10 });
  return (
    <span className="ea-mini">
      <MuscleFigure marks={here} side={side} crop={crop} width={size} height={size} figure={figure} />
    </span>
  );
}
