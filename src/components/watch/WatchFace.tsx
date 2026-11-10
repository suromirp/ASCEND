// ASCEND: één datapagina op een rond horloge, getekend als SVG van 288 bij 288 eenheden. Geen foto, geen logo,
// geen merkbeeld; alle kleuren zijn tokens. De tekst komt uit engine/watchFields.ts (cellDrawing), dit bestand
// tekent alleen. Bovenop elke plek ligt een echte knop (toetsenbord, schermlezer, tikdoel van minstens 44 px).

import { WATCH_FACE, type WatchModel } from '../../data/watchModels';
import { WATCH_LABEL_SIZE, cellAriaLabel, cellDrawing, fieldLabel, fieldOf } from '../../engine/watchFields';

const { size: SIZE, radius: RADIUS } = WATCH_FACE;
const MID = SIZE / 2;

// Het horloge wordt niet kleiner dan 256 CSS-px (schaal 0,89): dan blijft de tekst van 14 eenheden op 12 px.
export const WATCH_MIN_WIDTH = 256;

export function WatchFace({
  model,
  fields,
  page,
  selected,
  onPick,
}: {
  model: WatchModel;
  fields: readonly string[];
  page: number;
  // De plek waar het blad Veld kiezen voor open staat.
  selected?: number;
  onPick: (cell: number) => void;
}) {
  const layout = model.layouts[fields.length];
  if (!layout) return null;
  // Haarlijnen tussen de plekken: loodrecht tussen twee plekken naast elkaar, anders waterpas tussen twee rijen.
  const rules = layout.cells.slice(1).map((c, i) => {
    const before = layout.cells[i];
    return { key: i, side: Math.abs(c.y - before.y) < 1, cell: c, edge: before.x + before.w };
  });
  return (
    <div className="relative mx-auto" style={{ width: `min(${SIZE}px, 100%)`, minWidth: WATCH_MIN_WIDTH, aspectRatio: '1 / 1' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" role="img" aria-label={`Datapagina ${page + 1} met ${fields.length} ${fields.length === 1 ? 'veld' : 'velden'}`}>
        <circle cx={MID} cy={MID} r={RADIUS + 6} fill="var(--color-bg)" stroke="var(--color-control-border)" strokeWidth={4} />
        <circle cx={MID} cy={MID} r={RADIUS} fill="var(--color-charcoal)" />
        {rules.map((r) =>
          r.side ? (
            <line key={r.key} x1={r.edge} x2={r.edge} y1={r.cell.y + 8} y2={r.cell.y + r.cell.h - 8} stroke="var(--color-card-border)" strokeWidth={1} />
          ) : (
            <line key={r.key} x1={r.cell.x + 8} x2={r.cell.x + r.cell.w - 8} y1={r.cell.y} y2={r.cell.y} stroke="var(--color-card-border)" strokeWidth={1} />
          ),
        )}
        {layout.cells.map((cell, i) => {
          const id = fields[i];
          const d = cellDrawing(cell, fieldOf(model, id), id);
          return (
            <g key={i} fontFamily="var(--font-sans)">
              {d.labelLines.map((line, l) => (
                <text
                  key={l}
                  x={d.cx}
                  y={d.labelY[l]}
                  textAnchor="middle"
                  fontSize={WATCH_LABEL_SIZE}
                  fill="var(--color-ink-dim)"
                  textLength={d.labelFit[l]}
                  lengthAdjust="spacingAndGlyphs"
                >
                  {line}
                </text>
              ))}
              {d.value !== undefined && (
                <text x={d.cx} y={d.valueY} textAnchor="middle" fill="var(--color-ink)" fontWeight={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <tspan fontSize={d.valueSize}>{d.value}</tspan>
                  {d.unit && <tspan fontSize={WATCH_LABEL_SIZE} fill="var(--color-ink-dim)" fontWeight={400} dx={4}>{d.unit}</tspan>}
                </text>
              )}
              {d.bars?.map((b, k) => (
                <rect key={k} x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill="var(--color-ink-dim)" />
              ))}
              {selected === i && <rect x={cell.x + 2} y={cell.y + 2} width={cell.w - 4} height={cell.h - 4} rx={12} fill="none" stroke="var(--color-action)" strokeWidth={2} />}
            </g>
          );
        })}
      </svg>
      {layout.cells.map((cell, i) => (
        <button
          key={i}
          type="button"
          aria-label={cellAriaLabel(page, i, fieldLabel(model, fields[i]))}
          onClick={() => onPick(i)}
          className="absolute rounded-xl"
          style={{
            left: `${(cell.x / SIZE) * 100}%`,
            top: `${(cell.y / SIZE) * 100}%`,
            width: `${(cell.w / SIZE) * 100}%`,
            height: `${(cell.h / SIZE) * 100}%`,
            minWidth: 44,
            minHeight: 44,
            background: 'transparent',
          }}
        />
      ))}
    </div>
  );
}
