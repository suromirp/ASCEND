import { useState } from 'react';
import { FATIGUE_BAND, FATIGUE_THRESHOLDS, fatigueWord } from '../../engine/legFatigue';
import type { DayMark, FreshnessPoint } from '../../engine/standing';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow, InfoButton } from '../ui';
import { formatDayMonthNL, formatWeekdayDayMonthNL } from '../../utils/dates';
import { StandLineChart } from './StandLineChart';
import { FRESHNESS_INFO, freshnessPoints } from './standChartData';
import { StandInfoSheet, UnderLine } from './StandParts';

// Benen → Frisheid: de beenindex per dag, van vorige week tot over twee weken, in de stijl van de zone 2-kaart
// (StandLineChart). Frisser staat boven, dus de lijn zakt na een zware dag en klimt daarna weer. Tot vandaag vol,
// wat nog komt gestippeld; de marge staat in de regel van de gekozen dag, niet als band in het beeld. Onder de lijn
// een ruit voor een test of wedstrijd en een stip voor een harde dag of je benen. Alleen tekenen: de index blijft
// de index (engine/standing.ts#freshnessCurve).

const MARK_LABEL: Record<DayMark, string> = { test: 'test', race: 'wedstrijd', hard: 'hard', legs: 'benen', easy: 'rustig' };

export function FreshnessChart({ points, today }: { points: FreshnessPoint[]; today: string }) {
  const [info, setInfo] = useState(false);
  const todayIdx = Math.max(0, points.findIndex((p) => p.date === today));
  if (points.length === 0) return null;
  const max = Math.max(20, ...points.map((p) => p.index));
  const dayName = (p: FreshnessPoint) => (p.date === today ? 'Vandaag' : formatWeekdayDayMonthNL(p.date));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Eyebrow>Frisheid</Eyebrow>
        <InfoButton onClick={() => setInfo(true)} label="Wat Frisheid laat zien" />
      </div>
      <StandLineChart
        points={freshnessPoints(points, todayIdx)}
        min={0}
        max={max}
        top="low"
        rest={todayIdx}
        dots={false}
        scale={['fris', 'moe']}
        lines={[{ value: FATIGUE_THRESHOLDS.test.fresh, label: 'test' }, { value: FATIGUE_THRESHOLDS.hard.fresh, label: 'hard' }]}
        axis={[
          { at: 0, label: formatDayMonthNL(points[0].date) },
          { at: todayIdx / Math.max(1, points.length - 1), label: 'vandaag', strong: true },
          { at: 1, label: formatDayMonthNL(points[points.length - 1].date) },
        ]}
        label={(i) => formatNumberNL(points[i].index, 1)}
        ariaLabel="Frisheid van je benen per dag, van vorige week tot over twee weken. Frisser staat boven."
        valueText={(i) => `${dayName(points[i])}: ${formatNumberNL(points[i].index, 1)}, ${fatigueWord(points[i].index).word.toLowerCase()}`}
      >
        {(i) => {
          const p = points[i];
          // Vandaag zonder training: het getal en het woord staan al in het hart van Benen, dus geen regel.
          const isToday = p.date === today;
          if (isToday && p.sessions.length === 0) return null;
          return (
            <UnderLine>
              {!isToday && <p>
                <span className="font-medium">{dayName(p)}: </span>
                <span className="tabular-nums">{formatNumberNL(p.index, 1)}</span>, {fatigueWord(p.index).word.toLowerCase()}
                {p.date > today && <span style={{ color: 'var(--color-ink-dim)' }}>, een schatting (ongeveer <span className="tabular-nums">{formatNumberNL(Math.max(0, p.index - FATIGUE_BAND), 0)}</span> tot <span className="tabular-nums">{formatNumberNL(p.index + FATIGUE_BAND, 0)}</span>)</span>}
              </p>}
              {p.sessions.length > 0 && (
                <p style={{ color: 'var(--color-ink-dim)' }}>{p.sessions.map((s) => `${s.name} (${MARK_LABEL[s.mark]}${s.logged ? ', gedaan' : ''})`).join(' · ')}</p>
              )}
              <p style={{ color: 'var(--color-ink-dim)' }}>{dayAdvice(p)}</p>
            </UnderLine>
          );
        }}
      </StandLineChart>
      {info && <StandInfoSheet eyebrow="Benen" title="Frisheid" lines={FRESHNESS_INFO} onClose={() => setInfo(false)} />}
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
    if (near(FATIGUE_THRESHOLDS.test.fresh)) return 'Op de grens voor een test. Voelen je benen bij het inlopen zwaarder dan normaal, dan een dag later.';
    if (p.index <= FATIGUE_THRESHOLDS.test.fresh) return 'Fris genoeg voor je test. Die meet dan echt wat je kunt.';
    return 'Te moe voor een eerlijke test. Iets lichter de dagen ervoor, of de test een dag later.';
  }
  if (marks.has('hard')) {
    if (p.index <= FATIGUE_THRESHOLDS.hard.fresh) return 'Fris genoeg voor een harde training.';
    return 'Je benen zijn nog moe voor een harde training. Begin rustiger, of doe het een dag later.';
  }
  if (p.index <= FATIGUE_THRESHOLDS.test.fresh) return 'Je benen zijn fris.';
  if (p.index <= FATIGUE_THRESHOLDS.hard.fresh) return 'Wat vermoeid. Rustig werk gaat prima.';
  return 'Vermoeid. Een rustige dag kan het snelst helpen.';
}
