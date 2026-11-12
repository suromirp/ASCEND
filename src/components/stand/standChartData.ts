import { FATIGUE_BAND, FATIGUE_THRESHOLDS } from '../../engine/legFatigue';
import { EASY_TARGET, LOAD_JUMP, type FreshnessPoint, type IntensityMix, type WeekLoad } from '../../engine/standing';
import type { ChartPoint } from './StandLineChart';

// De punten en de uitleg achter de i voor de grafieken en kaarten op de schermen van Je stand, los van de
// componenten zodat ze te testen zijn. Alleen weergave: de getallen komen uit engine/standing.ts.

export const FRESHNESS_INFO = [
  'Hoe fris je benen zijn, per dag van vorige week tot over twee weken. Frisser staat boven: na een zware dag zakt de lijn, daarna klimt hij weer.',
  `Het getal is de beenindex. Tot vandaag komt hij uit wat je deed. Wat nog komt is een schatting uit je plan, gestippeld, met een marge van ongeveer ${FATIGUE_BAND} punten.`,
  `De dunne lijn test hoort bij beenindex ${FATIGUE_THRESHOLDS.test.fresh}: zit je lijn erboven, dan ben je fris genoeg voor een testloop. De dunne lijn hard hoort bij ${FATIGUE_THRESHOLDS.hard.fresh}: zit je erboven, dan gaat een harde training goed.`,
  'Onder de lijn is een ruit een test of wedstrijd en een stip een harde loop of een training voor je benen. Schuif met je vinger over de grafiek voor een andere dag.',
];

export function freshnessPoints(points: FreshnessPoint[], todayIdx: number): ChartPoint[] {
  const n = Math.max(1, points.length - 1);
  return points.map((p, i) => {
    const main = p.sessions.find((s) => s.mark === 'test' || s.mark === 'race') ?? p.sessions.find((s) => s.mark === 'hard') ?? p.sessions.find((s) => s.mark === 'legs');
    return {
      x: i / n,
      value: p.index,
      dashed: i > todayIdx,
      mark: main ? (main.mark === 'test' || main.mark === 'race' ? 'diamond' : 'dot') : undefined,
      open: main ? !main.logged : undefined,
    };
  });
}

export const LOAD_INFO = [
  'Belasting is minuten maal zwaarte, de 1 tot 10 die je na een training invult. 45 minuten op zwaarte 6 is 270 punten.',
  'Elke stip is een week en meer staat boven. Vol is gedaan, open is wat nog gepland staat.',
  `Zodra er drie weken met training voor deze week zijn, staat er een dunne lijn gewoonlijk: je gemiddelde van de vier weken voor deze week. Ligt je week meer dan ${Math.round((LOAD_JUMP - 1) * 100)}% hoger, dan zegt ASCEND dat eronder.`,
  'Schuif met je vinger over de grafiek of tik een week voor de telling van die week.',
];

export function loadPoints(weeks: WeekLoad[]): ChartPoint[] {
  const n = Math.max(1, weeks.length - 1);
  const currentIdx = weeks.findIndex((w) => w.isCurrent);
  return weeks.map((w, i) => {
    const after = currentIdx >= 0 && i > currentIdx;
    return {
      x: i / n,
      // Een week die nog moet komen is alleen gepland: een open stip, gestippeld ernaartoe.
      value: after ? w.plannedTotal : w.doneTotal,
      open: after,
      dashed: after,
      ahead: w.isCurrent && w.plannedTotal > 0 ? w.doneTotal + w.plannedTotal : undefined,
    };
  });
}

// One short honest line: what was counted from the heart rate and what by plan.
function sourceLine(mix: IntensityMix): string {
  const trainings = (n: number) => (n === 1 ? '1 training' : `${n} trainingen`);
  if (mix.measuredSessions === 0) return 'Naar het plan, niet naar je hartslag.';
  if (mix.plannedSessions === 0) return 'Uit je hartslag.';
  return `Uit je hartslag, ${trainings(mix.plannedSessions)} naar plan.`;
}

// De uitleg achter de i: wat er geteld is, waarvandaan, en de streep op de balk.
export function intensityInfo(mix: IntensityMix): string[] {
  const perTraining = mix.unit === 'sessions';
  return [
    perTraining
      ? 'Je loop- en wandeltrainingen van de laatste vier weken, per training geteld.'
      : `Je loop- en wandelminuten van de laatste vier weken${mix.measuredSessions > 0 ? ', naar je hartslag' : ''}.`,
    ...(perTraining ? [] : [sourceLine(mix)]),
    `De streep op de balk staat op ${Math.round(EASY_TARGET * 100)}% rustig: zoveel doen goede duursporters ongeveer.`,
  ];
}


// De zin "Vul na een training de zwaarte in" staat er als een flink deel van een week zonder ingevulde zwaarte telde,
// maar niet als de gekozen week al de regel met ± toont: dan zegt het scherm het één keer.
export function effortHintShown(weeks: WeekLoad[], shown: number): boolean {
  const anyWeek = weeks.some((w) => w.estimated > 0 && w.estimated >= w.doneTotal * 0.25);
  const plusMinusLine = weeks[shown]?.items.some((it) => it.estimated) ?? false;
  return anyWeek && !plusMinusLine;
}
