import { useId } from 'react';
import type { DayLoad } from '../engine/weekProfile';
import { ridgeSentence } from '../engine/weekProfile';
import { weekdayLongNL } from '../utils/dates';
import { Card, Eyebrow } from './ui';

// "Belasting per dag": de week als bergkam. De hoogte is minuten maal
// inspanning (engine/weekProfile.ts, dezelfde maat als op Stand). Wat gedaan of
// voorbij is staat als doorgetrokken lijn, wat nog komt als stippellijn.
// Beendagen hebben een bronzen driehoekje als top, een rustdag is een dal tot
// de grond, vandaag een gouden stip met ring. Vorige week ligt als grijze
// schaduwkam erachter, zodat je zonder getal ziet of deze week zwaarder of
// lichter is. De dagletters staan in HTML onder de tekening, zodat ze nooit
// kleiner worden dan 12 px als de tekening smaller wordt.

const W = 326;
const H = 96;
const TOP = 20;
const BASE = 88;

export function WeekRidge({ days, previous, today }: { days: DayLoad[]; previous: DayLoad[]; today: string }) {
  const gradientId = useId();
  const max = Math.max(1, ...days.map((d) => d.load), ...previous.map((d) => d.load));
  const x = (i: number) => ((i + 0.5) / 7) * W;
  const y = (load: number) => BASE - (load / max) * (BASE - TOP);
  const pts = days.map((d, i) => ({ x: x(i), y: y(d.load), d }));
  const prev = previous.map((d, i) => ({ x: x(i), y: y(d.load) }));
  const line = (p: { x: number; y: number }[]) => p.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ');
  const area = (p: { x: number; y: number }[]) => `M${p[0].x.toFixed(1)} ${BASE} ${p.map((q) => `L${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ')} L${p[p.length - 1].x.toFixed(1)} ${BASE} Z`;
  // Doorgetrokken tot en met vandaag, daarna stippellijn.
  const lastSolid = pts.reduce((last, p, i) => (p.d.date <= today ? i : last), -1);
  const solid = lastSolid >= 1 ? pts.slice(0, lastSolid + 1) : [];
  const dashed = pts.slice(Math.max(0, lastSolid));
  const hasPrevious = previous.some((d) => d.load > 0);

  return (
    <Card className="flex flex-col gap-2" texture>
      <div className="flex flex-col gap-1">
        <Eyebrow>Belasting per dag</Eyebrow>
        <p className="flex items-center gap-4 whitespace-nowrap text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[7px] w-[7px] rotate-45" style={{ background: 'var(--color-bronze)' }} aria-hidden="true" />
            benen
          </span>
          {hasPrevious && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 border-t" style={{ borderColor: 'var(--color-stone)' }} aria-hidden="true" />
              vorige week
            </span>
          )}
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Belasting per dag, van maandag tot en met zondag">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-bronze)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--color-bronze)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M0 ${(TOP + BASE) / 2}H${W}`} stroke="var(--color-card-border)" strokeDasharray="2 4" />
        {hasPrevious && (
          <>
            <path d={area(prev)} fill="var(--color-stone)" fillOpacity=".07" />
            <path d={line(prev)} stroke="var(--color-stone)" strokeOpacity=".5" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
          </>
        )}
        <path d={area(pts)} fill={`url(#${gradientId})`} />
        {solid.length > 1 && <path d={line(solid)} stroke="var(--color-gold)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
        {dashed.length > 1 && <path d={line(dashed)} stroke="var(--color-gold)" strokeWidth="2" strokeDasharray="4 4" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
        <path d={`M0 ${BASE}H${W}`} stroke="var(--color-card-border)" />
        {pts.map(({ x: px, y: py, d }) => {
          const isToday = d.date === today;
          const done = d.date <= today;
          return (
            <g key={d.date}>
              {d.legTemplate && d.load > 0 && <path d={`M${px - 5.5} ${py - 5} L${px} ${py - 13.5} L${px + 5.5} ${py - 5}Z`} fill="var(--color-bronze)" stroke="var(--color-card)" strokeWidth="1" />}
              {isToday && <circle cx={px} cy={py} r="8" fill="var(--color-gold)" fillOpacity=".18" />}
              {isToday ? (
                <circle cx={px} cy={py} r="4.2" fill="var(--color-gold)" />
              ) : d.load === 0 ? (
                <circle cx={px} cy={py} r="2.6" fill="var(--color-bg)" stroke="var(--color-stone)" strokeWidth="1.4" />
              ) : done ? (
                <circle cx={px} cy={py} r="3.2" fill="var(--color-gold)" stroke="var(--color-gold)" strokeWidth="1.4" />
              ) : (
                <circle cx={px} cy={py} r="3.2" fill="var(--color-card)" stroke="var(--color-gold)" strokeWidth="1.4" />
              )}
            </g>
          );
        })}
      </svg>

      <div className="grid grid-cols-7 text-center text-xs tabular-nums" aria-hidden="true">
        {days.map((d) => (
          <span key={d.date} className={d.date === today ? 'font-bold' : 'font-medium'} style={{ color: d.date === today ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>
            {weekdayLongNL(d.date).charAt(0).toUpperCase()}
          </span>
        ))}
      </div>

      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{ridgeSentence(days, today)}</p>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>De hoogte is minuten maal hoe zwaar het was.</p>
    </Card>
  );
}
