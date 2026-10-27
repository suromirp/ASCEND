import { useState } from 'react';
import { LOAD_SPORTS, LOAD_JUMP, loadVersusBefore, type LoadSport, type WeekLoad } from '../../engine/standing';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow } from '../ui';
import { dayMonth, dayShort as dayShortNL, roundedTop } from './chartParts';

// Je stand → weekly load: minutes × effort per week, per sport. Solid is
// done, faded is still planned. Tap a week for its numbers.

const SPORT_COLOR: Record<LoadSport, string> = {
  lopen: 'var(--color-chart-run)',
  kracht: 'var(--color-chart-strength)',
  wandelen: 'var(--color-chart-walk)',
  overig: 'var(--color-chart-other)',
};
const SPORT_LABEL: Record<LoadSport, string> = { lopen: 'Lopen', kracht: 'Kracht', wandelen: 'Wandelen', overig: 'Fietsen en overig' };

const W = 320;
const H = 158;
const TOP = 14;
const BOTTOM = 38;
const GAP = 2;

export function WeeklyLoadChart({ weeks }: { weeks: WeekLoad[] }) {
  const currentIdx = weeks.findIndex((w) => w.isCurrent);
  const [selected, setSelected] = useState(currentIdx);
  const jump = loadVersusBefore(weeks);
  const max = Math.max(1, ...weeks.map((w) => w.doneTotal + w.plannedTotal), jump?.before ?? 0);
  const plotH = H - TOP - BOTTOM;
  const slot = W / weeks.length;
  const barW = Math.min(26, slot * 0.6);
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const present = LOAD_SPORTS.filter((s) => weeks.some((w) => w.done[s] + w.planned[s] > 0));
  const week = weeks[selected];
  const estimatedWeeks = weeks.filter((w) => w.estimated > 0 && w.estimated >= w.doneTotal * 0.25).length;

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Eyebrow>Belasting per week</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Elke training telt als minuten maal zwaarte (de 1 tot 10 die je invult). 45 minuten op zwaarte 6 is 270 punten. Een balk is de som van een week: vol is gedaan, licht is nog gepland. Tik op een week om de telling te zien.
        </p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Weekbelasting van ${weeks.length} weken; deze week ${formatNumberNL(weeks[currentIdx]?.doneTotal ?? 0, 0)} gedaan`}>
        {jump && (
          <g aria-hidden>
            <line x1={0} x2={W} y1={y(jump.before)} y2={y(jump.before)} stroke="var(--color-ink-dim)" strokeDasharray="3 4" strokeWidth={1} opacity={0.6} />
          </g>
        )}
        {weeks.map((w, i) => {
          const x = i * slot + (slot - barW) / 2;
          // Stack from the baseline: done first, then planned, sport by sport.
          const parts: { v: number; sport: LoadSport; planned: boolean }[] = [
            ...LOAD_SPORTS.map((s) => ({ v: w.done[s], sport: s, planned: false })),
            ...LOAD_SPORTS.map((s) => ({ v: w.planned[s], sport: s, planned: true })),
          ].filter((p) => p.v > 0);
          const total = w.doneTotal + w.plannedTotal;
          let acc = 0;
          const clipId = `wl-clip-${i}`;
          return (
            <g key={w.weekStart} onClick={() => setSelected(i)} style={{ cursor: 'pointer' }}>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              <clipPath id={clipId}><path d={roundedTop(x, y(total), barW, (total / max) * plotH, 4)} /></clipPath>
              <g clipPath={`url(#${clipId})`}>
                {parts.map((p, j) => {
                  const y0 = y(acc + p.v);
                  const h = (p.v / max) * plotH;
                  acc += p.v;
                  return <rect key={j} x={x} y={y0} width={barW} height={Math.max(0, h - (j < parts.length - 1 ? GAP : 0))} fill={SPORT_COLOR[p.sport]} opacity={p.planned ? 0.35 : 1} />;
                })}
              </g>
              {total === 0 && <rect x={x} y={TOP + plotH - 1} width={barW} height={1} fill="var(--color-card-border)" />}
              {i === selected && <rect x={x - 3} y={TOP + plotH + 3} width={barW + 6} height={2} rx={1} fill="var(--color-action)" />}
              {(slot >= 44 || (weeks.length - 1 - i) % 2 === 0) && (
                <text x={i * slot + slot / 2} y={H - 18} textAnchor="middle" fontSize={12} fill={w.isCurrent ? 'var(--color-ink)' : 'var(--color-ink-dim)'} fontWeight={w.isCurrent ? 600 : 400}>
                  {w.isCurrent ? 'nu' : dayMonth(w.weekStart)}
                </text>
              )}
              {w.isRestWeek && <text x={i * slot + slot / 2} y={H - 4} textAnchor="middle" fontSize={12} fill="var(--color-ink-dim)">rust</text>}
            </g>
          );
        })}
        <line x1={0} x2={W} y1={TOP + plotH} y2={TOP + plotH} stroke="var(--color-card-border)" strokeWidth={1} />
      </svg>

      {(present.length > 1 || jump) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {present.length > 1 && present.map((s) => (
            <span key={s} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: SPORT_COLOR[s] }} aria-hidden />{SPORT_LABEL[s]}</span>
          ))}
          {jump && <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed" style={{ borderColor: 'var(--color-ink-dim)' }} aria-hidden />gemiddelde vier weken ervoor</span>}
        </div>
      )}

      {week && <WeekTally week={week} average={week.isCurrent ? jump?.before : undefined} />}

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{verdict(weeks[currentIdx], jump)}</p>
      {estimatedWeeks > 0 && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Vul na een training de zwaarte in, dan klopt de balk beter.
        </p>
      )}
    </Card>
  );
}

// The selected week, calm: the total big with one meter against your
// average, then each training as a row with its points as a thin bar.
function WeekTally({ week, average }: { week: WeekLoad; average?: number }) {
  const total = week.doneTotal + week.plannedTotal;
  const scale = Math.max(1, total, average ?? 0);
  const maxItem = Math.max(1, ...week.items.map((it) => it.load));
  const pct = (v: number) => `${(v / scale) * 100}%`;
  return (
    <div className="flex flex-col gap-3 rounded-xl px-3.5 py-3" style={{ background: 'var(--color-charcoal)' }} aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{week.isCurrent ? 'Deze week' : `Week van ${dayMonth(week.weekStart)}`}{week.isRestWeek ? ' · rustweek' : ''}</p>
        <p className="tabular-nums">
          <span className="font-sans tabular-nums text-xl" style={{ color: 'var(--color-ink)' }}>{formatNumberNL(week.doneTotal, 0)}</span>
          {week.plannedTotal > 0 && <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}> + {formatNumberNL(week.plannedTotal, 0)} gepland</span>}
        </p>
      </div>

      {total > 0 && (
        <div>
          <div className="relative h-2 rounded-full" style={{ background: 'var(--color-card)' }} role="img" aria-label={`${formatNumberNL(week.doneTotal, 0)} gedaan, ${formatNumberNL(week.plannedTotal, 0)} gepland${average ? `, gemiddeld ${formatNumberNL(average, 0)}` : ''}`}>
            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(total), background: 'var(--color-progress)', opacity: 0.35 }} />
            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: pct(week.doneTotal), background: 'var(--color-progress)' }} />
            {average !== undefined && <span className="absolute -inset-y-1 w-0.5 rounded" style={{ left: pct(average), background: 'var(--color-ink)' }} />}
          </div>
          {average !== undefined && (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Streepje: je gemiddelde van de vier weken ervoor, {formatNumberNL(average, 0)}.</p>
          )}
        </div>
      )}

      {week.items.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Geen trainingen in deze week.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {week.items.map((it, i) => (
            <li key={i} className="flex items-center gap-3" style={{ opacity: it.planned ? 0.6 : 1 }}>
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs" style={{ color: 'var(--color-ink)' }}>{it.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  {dayShortNL(it.date)} · {it.minutes} min · zwaarte {it.estimated ? '±' : ''}{formatNumberNL(it.effort, 0)}
                </p>
              </div>
              <div className="flex w-24 shrink-0 items-center gap-2">
                <span className="h-1.5 flex-1 rounded-full" style={{ background: 'var(--color-card)' }}>
                  <span className="block h-full rounded-full" style={{ width: `${(it.load / maxItem) * 100}%`, background: SPORT_COLOR[it.sport] }} />
                </span>
                <span className="w-8 text-right text-xs tabular-nums" style={{ color: 'var(--color-ink)' }}>{formatNumberNL(it.load, 0)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Punten per training: minuten maal zwaarte.
        {week.items.some((it) => it.planned) ? ' Lichter: nog gepland.' : ''}
        {week.items.some((it) => it.estimated) ? ' ±: geen zwaarte ingevuld, geteld met de geplande.' : ''}
      </p>
    </div>
  );
}

function verdict(week: WeekLoad | undefined, jump: ReturnType<typeof loadVersusBefore>): string {
  if (!week) return '';
  if (week.isRestWeek) return 'Rustweek: de balk hoort lager te zijn. Zo komt de training van de weken ervoor binnen.';
  if (!jump) return 'Na een paar weken zie je hier of je week in lijn is met de weken ervoor.';
  const pct = Math.round((jump.ratio - 1) * 100);
  if (jump.doneRatio > LOAD_JUMP) return `Deze week ligt al ${Math.round((jump.doneRatio - 1) * 100)}% boven je gemiddelde van de vier weken ervoor. Een flinke sprong gaat vaker samen met blessures. Let extra op je benen en je ochtendgevoel.`;
  if (jump.ratio > LOAD_JUMP) return `Met wat er nog gepland staat komt deze week ${pct}% boven je gemiddelde van de vier weken ervoor. Mis je een training, haal hem dan niet in bovenop de rest. Doe je alles, let dan extra op je benen en je ochtendgevoel.`;
  if (jump.ratio < 0.7) return 'Deze week is lichter dan je gemiddelde. Prima als dat zo bedoeld is; anders weet je waar je staat.';
  return 'Deze week is in lijn met de vier weken ervoor. Rustig opbouwen, zo hoort het.';
}
