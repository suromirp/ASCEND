import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { keyStep, nearestIndex, scrubIntent, yFraction } from '../../engine/standChart';
import { haptics } from '../../utils/haptics';

// Eén grafiekonderdeel voor de schermen van Je stand, in de stijl van de kaart Tempo bij zone 2
// (Zone2WeekChart; docs/visie/Ontwerp Stand minimaal.md, 4 en 6): één lijn van 2 px in --color-progress, wat nog
// gepland is als gestippeld vervolg, vol is gedaan en open is gepland, het label bij zijn stip, hoogstens twee
// haarlijnen met een label in de strook rechts, onderaan de begindatum en het eind. Geen legenda, geen animatie
// van de lijn: hij staat meteen op zijn eindstand.
//
// Het label loopt mee: schuif je vinger opzij over de grafiek en het label verhuist naar de stip eronder, met een
// korte tik per stip (de instelling Trillen); laat je los, dan staat het weer bij de vaste stip (vandaag of deze
// week). Een korte tik kiest een stip en houdt hem vast; nog een tik op dezelfde stip zet hem terug. Op en neer
// blijft scrollen. Met het toetsenbord lopen de pijltjes langs de stippen, Escape gaat terug. Wat de gekozen stip
// was staat in de regels eronder (`children`), voorgelezen. Het label schuift in 150 ms; in Rustig en Uit staat
// het er meteen (index.css, .stand-chart-label).

export interface ChartPoint {
  // Plek op de breedte, 0 tot 1.
  x: number;
  value: number;
  // Open stip: telt nog niet, gepland.
  open?: boolean;
  // Het stuk lijn naar deze stip is gestippeld (gepland).
  dashed?: boolean;
  // Een open stip op dezelfde plek erboven, met een gestippeld stuk ernaartoe (wat deze week nog gepland staat).
  ahead?: number;
  // Een teken onder de lijn: een ruit voor een test of wedstrijd, een stip voor een harde dag of je benen.
  mark?: 'diamond' | 'dot';
}

const W = 300;
const H = 120;
const TOP = 10;
const BOTTOM = 10;
const LEFT = 8;
// Rechts een strook voor het label bij de laatste stip en de labels van de haarlijnen.
const RIGHT = 48;
const plotW = W - LEFT - RIGHT;
const plotH = H - TOP - BOTTOM;
const px = (f: number) => LEFT + f * plotW;
const pct = (v: number, total: number) => `${(v / total) * 100}%`;

export function StandLineChart({
  points, min, max, top, rest, lines = [], axis, scale, label, ariaLabel, valueText, dots = true, children,
}: {
  points: ChartPoint[];
  min: number;
  max: number;
  top: 'low' | 'high';
  // De vaste stip: waar het label staat zolang niemand schuift (vandaag, deze week).
  rest: number;
  lines?: { value: number; label: string }[];
  axis: { at: number; label: string; strong?: boolean }[];
  // De woorden links naast de grafiek: wat boven en wat onder is ("fris", "moe").
  scale?: [string, string];
  label: (i: number) => string;
  ariaLabel: string;
  valueText: (i: number) => string;
  dots?: boolean;
  children?: (shown: number) => ReactNode;
}) {
  const [scrub, setScrub] = useState<number | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const gesture = useRef<{ id: number; x: number; y: number; mode?: 'scrub' | 'scroll' } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  if (points.length === 0) return null;
  const restAt = Math.max(0, Math.min(points.length - 1, rest));
  const shown = Math.min(points.length - 1, scrub ?? held ?? restAt);
  const y = (v: number) => TOP + yFraction(v, min, max, top) * plotH;
  const xs = points.map((p) => p.x);

  const at = (clientX: number): number => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return shown;
    const f = (((clientX - rect.left) / rect.width) * W - LEFT) / plotW;
    return nearestIndex(xs, f);
  };
  const follow = (i: number) => {
    if (i !== scrub) haptics.tap();
    // Schuiven laat een vastgehouden stip los: na loslaten staat het label weer bij de vaste stip.
    setHeld(null);
    setScrub(i);
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    if (!g.mode) {
      g.mode = scrubIntent(e.clientX - g.x, e.clientY - g.y);
      if (g.mode === 'scrub') e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (g.mode === 'scrub') follow(at(e.clientX));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.id !== e.pointerId) return;
    if (g.mode === 'scrub') { setScrub(null); return; }
    if (g.mode) return;
    // Een korte tik: die stip blijft gekozen, nog een tik zet hem terug.
    const i = at(e.clientX);
    setHeld((h) => (h === i || i === restAt ? null : i));
  };
  const cancel = () => { gesture.current = null; setScrub(null); };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = keyStep(shown, restAt, points.length, e.key);
    if (next === undefined) return;
    e.preventDefault();
    setHeld(next === restAt ? null : next);
  };

  // De lijn in stukken: vol waar gedaan, gestippeld waar gepland.
  const segments: { d: string; dashed: boolean }[] = [];
  points.forEach((p, i) => {
    if (i === 0) return;
    const prev = points[i - 1];
    const d = `M${px(prev.x)},${y(prev.value)} L${px(p.x)},${y(p.value)}`;
    const last = segments.at(-1);
    if (last && last.dashed === !!p.dashed) last.d += ` ${d}`;
    else segments.push({ d, dashed: !!p.dashed });
  });
  const s = points[shown];
  const labelY = s.ahead !== undefined ? s.ahead : s.value;
  // Bij de laatste stip staat het label rechts ervan, in de strook. Bij een andere stip erboven (of eronder als de
  // stip bovenin staat), zodat het nooit over de lijn valt; aan de randen niet gecentreerd maar binnen de grafiek.
  const labelFrac = yFraction(labelY, min, max, top);
  const labelClass = shown === points.length - 1
    ? '-translate-y-1/2 pl-2.5'
    : `${labelFrac < 0.3 ? 'translate-y-2.5' : '-translate-y-[calc(100%+10px)]'} ${s.x < 0.1 ? '-translate-x-1' : s.x > 0.9 ? '-translate-x-full' : '-translate-x-1/2'}`;
  const marks = points.some((p) => p.mark);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {scale && (
          <div className="flex shrink-0 flex-col justify-between text-xs" style={{ height: H, color: 'var(--color-ink-dim)' }} aria-hidden>
            <span>{scale[0]}</span>
            <span>{scale[1]}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div
            ref={boxRef}
            className="relative select-none rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ink)]"
            style={{ height: H, touchAction: 'pan-y' }}
            role="slider"
            tabIndex={0}
            aria-label={ariaLabel}
            aria-valuemin={0}
            aria-valuemax={points.length - 1}
            aria-valuenow={shown}
            aria-valuetext={valueText(shown)}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={cancel}
            onKeyDown={key}
            data-stand-chart
          >
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
              {lines.map((l) => (
                <line key={l.label} x1={LEFT} x2={LEFT + plotW} y1={y(l.value)} y2={y(l.value)} stroke="var(--color-card-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              <line x1={px(s.x)} x2={px(s.x)} y1={TOP - 6} y2={H - BOTTOM} stroke="var(--color-card-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              {segments.map((seg, i) => (
                <path key={i} d={seg.d} fill="none" stroke="var(--color-progress)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" {...(seg.dashed ? { strokeDasharray: '4 4' } : {})} />
              ))}
              {points.map((p, i) => p.ahead !== undefined && (
                <line key={`a${i}`} x1={px(p.x)} x2={px(p.x)} y1={y(p.value)} y2={y(p.ahead)} stroke="var(--color-progress)" strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
            {lines.map((l) => (
              <span key={l.label} className="pointer-events-none absolute right-0 -translate-y-1/2 text-xs" style={{ top: pct(y(l.value), H), color: 'var(--color-ink-dim)' }} aria-hidden>{l.label}</span>
            ))}
            {/* De stippen als HTML, zodat ze rond blijven als de grafiek breder is dan zijn viewBox. */}
            {points.map((p, i) => (dots || i === shown) && (
              <span key={i} aria-hidden>
                <Dot left={pct(px(p.x), W)} top={pct(y(p.value), H)} open={!!p.open} chosen={i === shown} />
                {p.ahead !== undefined && <Dot left={pct(px(p.x), W)} top={pct(y(p.ahead), H)} open chosen={false} />}
              </span>
            ))}
            <span
              className={`stand-chart-label pointer-events-none absolute whitespace-nowrap text-xs font-medium tabular-nums ${labelClass}`}
              style={{ left: pct(px(s.x), W), top: pct(y(labelY), H), color: 'var(--color-ink)' }}
              aria-hidden
              data-end-label
            >
              {label(shown)}
            </span>
          </div>
          {marks && (
            <div className="relative h-3" aria-hidden>
              {points.map((p, i) => p.mark && (
                <span
                  key={i}
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${p.mark === 'diamond' ? 'h-2 w-2 rotate-45' : 'h-1.5 w-1.5 rounded-full'}`}
                  style={{ left: pct(px(p.x), W), background: 'var(--color-ink-dim)', opacity: p.open ? 0.6 : 1 }}
                />
              ))}
            </div>
          )}
          <div className="relative mt-1 h-4 text-xs" style={{ color: 'var(--color-ink-dim)' }} aria-hidden>
            {axis.map((a) => (
              <span
                key={a.label}
                className={`absolute whitespace-nowrap ${a.at <= 0 ? '' : a.at >= 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
                style={{ left: a.at <= 0 ? 0 : pct(px(Math.min(1, a.at)), W), color: a.strong ? 'var(--color-ink)' : undefined }}
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      {children?.(shown)}
    </div>
  );
}

function Dot({ left, top, open, chosen }: { left: string; top: string; open: boolean; chosen: boolean }) {
  return (
    <span
      className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
      style={{
        left, top,
        background: open ? 'var(--color-card)' : 'var(--color-progress)',
        borderColor: open ? 'var(--color-ink-dim)' : 'var(--color-card)',
        // De gekozen stip: een rand in gewone inkt, geen tweede accent.
        outline: chosen ? '2px solid var(--color-ink)' : undefined,
        outlineOffset: 1,
      }}
    />
  );
}
