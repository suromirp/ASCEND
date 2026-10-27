import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateNL, formatMonthNL } from '../../utils/dates';
import type { SeasonStrip } from '../../engine/goalList';
import { placeSeasonNames } from '../../engine/seasonLayout';
import { Card, Eyebrow } from '../ui';

// De seizoensstrook op de lucht: van nu tot het laatste doel, een vlag per doel, de weken ertussen
// en de afbouw als donkerder stuk voor een vlag. Een Top heeft een gevulde vlag, de andere een
// omlijnde. Alle kleuren komen uit de tokens (op de lucht vanzelf de donkere variant).
const POLE = [30, 48, 66];

export function SeasonStripCard({ strip }: { strip: SeasonStrip }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(296);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth || 296);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Waar de namen staan, rekent engine/seasonLayout.ts uit: geen overlap en geen stok door een naam.
  // Een naam die niet past gaat een rij hoger of wordt korter getoond.
  const fractionsKey = strip.flags.map((f) => f.fraction).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const places = useMemo(() => placeSeasonNames(strip.flags.map((f) => f.fraction * w), w), [fractionsKey, w]);
  const topRow = places.reduce((m, p) => Math.max(m, p.row), 0);
  const TRACK_Y = POLE[topRow] + 22;
  const months = strip.months.filter((_, i) => !(i === 0 && strip.months[1] && strip.months[1].fraction * w < 20));
  const hasTaper = (f: SeasonStrip['flags'][number]) => f.taperFraction !== undefined && f.taperFraction < f.fraction;

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Je seizoen</Eyebrow>
        <span className="text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{formatDateNL(strip.start)} tot {formatMonthNL(strip.end)}</span>
      </div>
      <div ref={ref} className="relative mx-1" style={{ height: TRACK_Y + 30 }} role="img" aria-label={`Je seizoen: ${strip.flags.map((f) => `${f.name} op ${formatDateNL(f.date)}`).join(', ')}`}>
        <span className="absolute h-[4px] rounded-full" style={{ left: 0, right: 0, top: TRACK_Y, background: 'var(--color-track)' }} />
        {strip.flags.filter(hasTaper).map((f) => (
          <span key={`t-${f.id}`} className="absolute h-[4px] rounded-full" style={{ left: (f.taperFraction ?? 0) * w, width: (f.fraction - (f.taperFraction ?? 0)) * w, top: TRACK_Y, background: 'color-mix(in srgb, var(--color-page) 55%, var(--color-track))' }} />
        ))}
        {strip.flags.map((f, i) => {
          const x = f.fraction * w;
          const place = places[i];
          const pole = POLE[place.row];
          const align = x - place.left < place.width * 0.25 ? 'left' : x - place.left > place.width * 0.75 ? 'right' : 'center';
          return (
            <div key={f.id}>
              <span
                className="absolute truncate text-xs font-semibold"
                style={{ left: place.left, width: place.width, textAlign: align, top: TRACK_Y - pole - 18, color: 'var(--color-ink)' }}
              >
                {f.name}
              </span>
              <span className="absolute w-[2px] rounded-full" style={{ left: x - 1, top: TRACK_Y - pole, height: pole + 2, background: 'var(--color-page)' }} />
              <svg className="absolute" width="12" height="10" viewBox="0 0 12 10" style={{ left: x + 1, top: TRACK_Y - pole }} aria-hidden="true">
                <path d="M0.8 0.8 L11 4 L0.8 8 Z" fill={f.priority === 'top' ? 'var(--color-page)' : 'none'} stroke="var(--color-page)" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </div>
          );
        })}
        {strip.gaps.map((g) => {
          const room = (g.to - g.from) * w;
          const text = `${g.weeks} ${g.weeks === 1 ? 'week' : 'weken'}`;
          if (room < text.length * 7 + 16) return null;
          return (
            <span key={`${g.from}`} className="absolute text-center text-xs tabular-nums" style={{ left: g.from * w + 6, width: room - 12, top: TRACK_Y - 20, color: 'var(--color-ink-dim)' }}>{text}</span>
          );
        })}
        <span className="absolute h-3 w-3 rounded-full" style={{ left: -2, top: TRACK_Y - 4, background: 'var(--color-status)' }} aria-hidden="true" />
        {months.map((m, i) => (
          <span key={`${m.letter}-${i}`} className="absolute -translate-x-1/2 text-xs tabular-nums" style={{ left: m.fraction * w, top: TRACK_Y + 12, color: 'var(--color-ink-dim)' }}>{m.letter}</span>
        ))}
      </div>
    </Card>
  );
}
