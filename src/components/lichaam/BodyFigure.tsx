import { useId } from 'react';
import { FIGURE_HEIGHT, FIGURE_SCALE, FIGURE_WIDTH, HEAD, SILHOUETTE, figureLines } from '../../data/bodyFigure';
import { hitBoxes, spotsForView, type BodySpot, type BodyView } from '../../engine/bodyMap';
import type { Figure } from '../../engine/figureSettings';

// Het figuur van Lichaam in de lijnstijl van de iconen: een rustig silhouet met dunne
// spierlijnen, in de kleur van de inkt. Alle vormen komen uit data/bodyFigure.ts, de
// plekken uit engine/bodyMap.ts; hier wordt alleen getekend. Lijnen zijn 1,6 px dik
// en blijven dat ook als het figuur groter of kleiner wordt (non-scaling-stroke).

const LINE = { fill: 'none', stroke: 'var(--color-ink-dim)', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

// Silhouet en spierlijnen, zonder plekken. Gedeeld door het hele figuur en het kleine plaatje.
function Body({ view, figure }: { view: BodyView; figure: Figure }) {
  const half = SILHOUETTE[figure];
  const lines = figureLines(view, figure);
  const mirror = `translate(${FIGURE_WIDTH} 0) scale(-1 1)`;
  const nonScaling = { vectorEffect: 'non-scaling-stroke' } as const;
  const detail = (transform?: string) => (
    <g transform={transform}>
      {lines.half.map((d) => <path key={d} d={d} {...nonScaling} />)}
      {lines.chest && <path d={lines.chest} {...nonScaling} />}
      {lines.kneeCap && <ellipse {...lines.kneeCap} {...nonScaling} />}
    </g>
  );
  return (
    <>
      <g style={{ fill: 'var(--color-surface)', stroke: 'none' }}>
        <path d={`${half} L100,47 Z`} />
        <path d={`${half} L100,47 Z`} transform={mirror} />
        <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />
      </g>
      <g {...LINE} strokeWidth={1.6}>
        <path d={half} {...nonScaling} />
        <path d={half} transform={mirror} {...nonScaling} />
        <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} {...nonScaling} />
      </g>
      <g {...LINE} strokeWidth={1} strokeOpacity={0.5}>
        {detail()}
        {detail(mirror)}
        {lines.center.map((d) => <path key={d} d={d} {...nonScaling} />)}
        {lines.navel && <circle {...lines.navel} {...nonScaling} />}
      </g>
    </>
  );
}

// De plek zelf: een zachte stippellijn, of mint als hij gekozen is.
function Mark({ spot, on }: { spot: BodySpot; on: boolean }) {
  return <ellipse className="mx-body-mark" data-on={on} cx={spot.cx} cy={spot.cy} rx={spot.rx} ry={spot.ry} />;
}

// De kleine amber stip van een plek met een open klacht (de kleur van "let op").
function Flag({ spot }: { spot: BodySpot }) {
  return <circle cx={spot.cx + spot.rx * 0.72} cy={spot.cy - spot.ry * 0.72} r={4.2} style={{ fill: 'var(--color-warning)', stroke: 'var(--color-bg)', strokeWidth: 1 }} />;
}

// De plekken met het grootste vlak eerst, zodat een kleine plek bij het tekenen bovenop komt.
function byAreaDescending(a: BodySpot, b: BodySpot): number {
  return b.rx * b.ry - a.rx * a.ry;
}

export function BodyFigure({
  view,
  figure,
  selectedId,
  flagged,
  onPick,
  scale = FIGURE_SCALE,
}: {
  view: BodyView;
  figure: Figure;
  selectedId?: string;
  // Id's van plekken met een open klacht.
  flagged: ReadonlySet<string>;
  onPick: (spot: BodySpot) => void;
  scale?: number;
}) {
  const spots = spotsForView(view).slice().sort(byAreaDescending);
  const boxes = hitBoxes(view, scale);
  const title = useId();
  const width = FIGURE_WIDTH * scale;
  const height = FIGURE_HEIGHT * scale;
  return (
    <div className="relative mx-auto" style={{ width, height }}>
      <svg viewBox={`0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT}`} width={width} height={height} role="img" aria-labelledby={title} className="absolute inset-0">
        <title id={title}>{`Lichaam met spieren, ${view === 'front' ? 'voorkant' : 'achterkant'}`}</title>
        <Body view={view} figure={figure} />
        {spots.map((s) => <Mark key={s.id} spot={s} on={s.id === selectedId} />)}
        {spots.filter((s) => flagged.has(s.id)).map((s) => <Flag key={s.id} spot={s} />)}
      </svg>
      {boxes.map((b) => {
        const s = spots.find((x) => x.id === b.id)!;
        return (
          <button
            key={s.id}
            type="button"
            aria-label={flagged.has(s.id) ? `${s.name}, open klacht` : s.name}
            aria-pressed={s.id === selectedId}
            data-spot={s.id}
            onClick={() => onPick(s)}
            className="absolute rounded-xl focus-visible:outline focus-visible:outline-2"
            style={{ left: b.left, top: b.top, width: b.width, height: b.height, outlineColor: 'var(--color-action)' }}
          />
        );
      })}
    </div>
  );
}

// Een kleine uitsnede van het figuur met één plek erop, naast de titel van het detail.
// Het staat op de lucht, dus de tokens zijn daar donker op licht; de rand houdt het
// plaatje bij elkaar.
export function SpotThumb({ spot, figure }: { spot: BodySpot; figure: Figure }) {
  const w = 72;
  const h = 80;
  const vw = 96;
  const vh = (vw * h) / w;
  // Binnen het vlak houden, zodat de uitsnede niet buiten het lichaam valt.
  const x = Math.min(Math.max(spot.cx - vw / 2, 0), FIGURE_WIDTH - vw);
  const y = Math.min(Math.max(spot.cy - vh / 2, 0), FIGURE_HEIGHT - vh);
  return (
    <svg
      viewBox={`${x} ${y} ${vw} ${vh}`}
      width={w}
      height={h}
      aria-hidden="true"
      className="shrink-0 rounded-xl border"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
    >
      <Body view={spot.view} figure={figure} />
      <Mark spot={spot} on />
    </svg>
  );
}
