import { useState } from 'react';
import { FATIGUE_BAND, FATIGUE_THRESHOLDS, fatigueWord } from '../../engine/legFatigue';
import type { DayMark, FreshnessPoint } from '../../engine/standing';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow } from '../ui';
import { dayMonth, dayShort } from './chartParts';

// Je stand → freshness: the leg fatigue index day by day, from last week to
// two weeks ahead. Lower is fresher. Ahead it is an estimate from the plan,
// so it is drawn dashed with its band of uncertainty around it. Tap a day.

const W = 320;
const H = 176;
const TOP = 10;
const BOTTOM = 40;
const LEFT = 4;
const RIGHT = 36;

const MARK_LABEL: Record<DayMark, string> = { test: 'test', race: 'wedstrijd', hard: 'hard', legs: 'benen', easy: 'rustig' };
const MARK_COLOR: Record<DayMark, string> = {
  test: 'var(--color-action)',
  race: 'var(--color-action)',
  hard: 'var(--color-progress)',
  legs: 'var(--color-chart-strength)',
  easy: 'var(--color-ink-dim)',
};

export function FreshnessChart({ points, today }: { points: FreshnessPoint[]; today: string }) {
  const keyDay = points.findIndex((p) => p.date >= today && p.sessions.some((s) => !s.logged && (s.mark === 'test' || s.mark === 'race')));
  const todayIdx = points.findIndex((p) => p.date === today);
  const [selected, setSelected] = useState(keyDay >= 0 ? keyDay : todayIdx);
  const max = Math.max(20, ...points.map((p) => p.index + FATIGUE_BAND));
  const plotW = W - LEFT - RIGHT;
  const plotH = H - TOP - BOTTOM;
  const step = plotW / Math.max(1, points.length - 1);
  const x = (i: number) => LEFT + i * step;
  const y = (v: number) => TOP + plotH - (Math.min(v, max) / max) * plotH;
  const past = points.slice(0, todayIdx + 1);
  const ahead = points.slice(todayIdx);
  const line = (list: FreshnessPoint[], offset: number) => list.map((p, i) => `${i ? 'L' : 'M'}${x(i + offset)},${y(p.index)}`).join(' ');
  const band = ahead.length > 1
    ? `M${ahead.map((p, i) => `${x(i + todayIdx)},${y(p.index + FATIGUE_BAND)}`).join(' L')} L${[...ahead].reverse().map((p, i) => `${x(todayIdx + ahead.length - 1 - i)},${y(Math.max(0, p.index - FATIGUE_BAND))}`).join(' L')} Z`
    : '';
  const point = points[selected];

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Eyebrow>Frisheid</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Je beenvermoeidheid per dag. Lager is frisser. Vooruit is het een schatting uit je planning, met de marge eromheen.
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Frisheid van je benen per dag, van vorige week tot over twee weken">
        {[FATIGUE_THRESHOLDS.test.fresh, FATIGUE_THRESHOLDS.hard.fresh].map((t) => (
          <g key={t} aria-hidden>
            <line x1={LEFT} x2={LEFT + plotW} y1={y(t)} y2={y(t)} stroke="var(--color-ink-dim)" strokeDasharray="2 4" strokeWidth={1} opacity={0.5} />
            <text x={W - 2} y={y(t) + 3} textAnchor="end" fontSize={12} fill="var(--color-ink-dim)">{t === FATIGUE_THRESHOLDS.test.fresh ? 'test' : 'hard'}</text>
          </g>
        ))}
        <line x1={LEFT} x2={LEFT + plotW} y1={TOP + plotH} y2={TOP + plotH} stroke="var(--color-card-border)" strokeWidth={1} />
        {band && <path d={band} fill="var(--color-progress)" opacity={0.12} />}
        <line x1={x(todayIdx)} x2={x(todayIdx)} y1={TOP} y2={TOP + plotH} stroke="var(--color-card-border)" strokeWidth={1} />
        <text x={x(todayIdx)} y={TOP + plotH + 30} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-ink)">vandaag</text>
        <path d={line(past, 0)} fill="none" stroke="var(--color-progress)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={line(ahead, todayIdx)} fill="none" stroke="var(--color-progress)" strokeWidth={2} strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => {
          const main = p.sessions.find((s) => s.mark === 'test' || s.mark === 'race') ?? p.sessions.find((s) => s.mark === 'hard') ?? p.sessions.find((s) => s.mark === 'legs') ?? p.sessions[0];
          const cx = x(i);
          const cy = TOP + plotH + 9;
          return (
            <g key={p.date} onClick={() => setSelected(i)} style={{ cursor: 'pointer' }}>
              <rect x={cx - step / 2} y={0} width={step} height={H} fill="transparent" />
              {i === selected && <circle cx={cx} cy={y(p.index)} r={4.5} fill="var(--color-card)" stroke="var(--color-action)" strokeWidth={2} />}
              {main && (main.mark === 'test' || main.mark === 'race'
                ? <rect x={cx - 4} y={cy - 4} width={8} height={8} transform={`rotate(45 ${cx} ${cy})`} fill={MARK_COLOR[main.mark]} opacity={main.logged ? 1 : 0.85} />
                : <circle cx={cx} cy={cy} r={main.mark === 'easy' ? 2 : 3} fill={MARK_COLOR[main.mark]} opacity={main.logged ? 1 : 0.6} />)}
              {(i % 7 === 0 || i === points.length - 1) && Math.abs(i - todayIdx) > 2
                ? <text x={cx} y={TOP + plotH + 30} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize={12} fill="var(--color-ink-dim)">{dayMonth(p.date)}</text>
                : null}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rotate-45" style={{ background: MARK_COLOR.test }} aria-hidden />test of wedstrijd</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: MARK_COLOR.hard }} aria-hidden />harde loop</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: MARK_COLOR.legs }} aria-hidden />benen</span>
      </div>

      {point && (
        <div className="rounded-xl px-3 py-2 text-xs leading-relaxed" style={{ background: 'var(--color-charcoal)', color: 'var(--color-ink)' }} aria-live="polite">
          <p>
            <span className="font-medium">{point.date === today ? 'Vandaag' : dayShort(point.date)}: </span>
            <span className="tabular-nums">{formatNumberNL(point.index, 1)}</span>, {fatigueWord(point.index).word.toLowerCase()}
            {point.date > today && <span style={{ color: 'var(--color-ink-dim)' }}> (ongeveer {formatNumberNL(Math.max(0, point.index - FATIGUE_BAND), 0)} tot {formatNumberNL(point.index + FATIGUE_BAND, 0)})</span>}
          </p>
          {point.sessions.length > 0 && (
            <p style={{ color: 'var(--color-ink-dim)' }}>
              {point.sessions.map((s) => `${s.name} (${MARK_LABEL[s.mark]}${s.logged ? ', gedaan' : ''})`).join(' · ')}
            </p>
          )}
          <p className="mt-1" style={{ color: 'var(--color-ink-dim)' }}>{dayAdvice(point)}</p>
        </div>
      )}
    </Card>
  );
}

// What the number means for what is on that day.
function dayAdvice(p: FreshnessPoint): string {
  const marks = new Set(p.sessions.filter((s) => !s.logged).map((s) => s.mark));
  const near = (t: number) => Math.abs(p.index - t) <= FATIGUE_BAND;
  if (marks.has('race')) {
    if (p.index <= FATIGUE_THRESHOLDS.race.fresh) return 'Fris genoeg voor je wedstrijd.';
    return 'Voor een wedstrijd wil je bijna helemaal fris zijn. Houd de dagen ervoor licht.';
  }
  if (marks.has('test')) {
    if (near(FATIGUE_THRESHOLDS.test.fresh)) return 'Op de grens voor een test. Beslis bij het inlopen: voelen je benen zwaarder dan normaal, dan een dag later.';
    if (p.index <= FATIGUE_THRESHOLDS.test.fresh) return 'Fris genoeg voor je test: die meet dan echt wat je kunt.';
    return 'Te moe voor een eerlijke test. Iets lichter de dagen ervoor, of de test een dag later.';
  }
  if (marks.has('hard')) {
    if (p.index <= FATIGUE_THRESHOLDS.hard.fresh) return 'Fris genoeg voor een harde training.';
    return 'Je benen zijn nog moe voor een harde training. Rustiger beginnen, of een dag later.';
  }
  if (p.index <= FATIGUE_THRESHOLDS.test.fresh) return 'Je benen zijn fris.';
  if (p.index <= FATIGUE_THRESHOLDS.hard.fresh) return 'Wat vermoeid. Rustig werk gaat prima.';
  return 'Vermoeid. Een rustige dag kan het snelst helpen.';
}
