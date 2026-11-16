// Het slot op de ene regel (I-67, docs/visie/Ontwerp een regel voor uitzonderingen.md, hoofdstuk 0 en 4): elke losse
// toets op ziek, een periode, de afbouw of kracht uit buiten engine/dayRules.ts faalt hier. Een nieuwe stap leest
// dayRules (`may`, `mayPropose`, `pauseRules`, `keptDay`), nooit zelf `isIllnessDay` of `isAwayFor`.
//
// De bronbestanden zelf mogen hun eigen functies gebruiken. Wat nog over is staat hieronder met het aantal aanroepen en
// de reden; die lijst wordt alleen korter. Komt er in zo'n bestand een aanroep bij, dan faalt de test ook.

import { describe, expect, it } from 'vitest';

// Over heel src/, zoals src/engine/weekTelling.test.ts. Sleutel: het pad vanaf src/.
const RAW = import.meta.glob<string>(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx'], { query: '?raw', import: 'default', eager: true });
const OLD = ['activeIllness', 'recoveryRamp', 'isIllnessDay', 'isAwayFor', 'isPauseDay', 'isAwayDay', 'isLeaveBlockedDay', 'isTaperDay', 'afterRaceGuard', 'needsGymOn', 'noGymPeriodFor', 'strengthAllows',
  // De dagen van een periode zelf: wie die leest, toetst ook zelf (Warden, 16 november).
  'leaveDays', 'lightDays', 'leaveLabelOn'] as const;

// De regel zelf en de bronnen van de feiten.
const SOURCES = new Set(['engine/dayRules.ts', 'engine/leave.ts', 'engine/illness.ts', 'engine/raceWindow.ts', 'engine/noGymGuard.ts', 'engine/strengthTraining.ts']);

// Wat de scan niet ziet: een toets die niet via een van deze namen gaat maar de periode of melding zelf leest, zoals
// engine/fixedSports.ts#leaveBlocks en de ziekte in engine/influence.ts. De scan ziet namen, geen bedoeling; Warden
// leest bij een nieuwe stap mee.
// Wat nog zelf toetst, per bestand het aantal aanroepen per functie, met de reden.
const LEFT: Record<string, { calls: Partial<Record<typeof OLD[number], number>>; why: string }> = {
  // Tonen de melding of de opbouw zelf; geen toets of een training mag.
  'components/IllnessCard.tsx': { calls: { activeIllness: 2, recoveryRamp: 1 }, why: 'de kaart Ziek toont de melding en de opbouw' },
  'components/useIllnessSign.ts': { calls: { activeIllness: 1 }, why: 'het teken dat je ziek gemeld bent' },
  'components/vandaag/yourDayRows.ts': { calls: { activeIllness: 1 }, why: 'geen weegherinnering terwijl je ziek bent' },
  'engine/widgetSummary.ts': { calls: { activeIllness: 1, leaveLabelOn: 2 }, why: 'de widget zegt dat je ziek bent' },
  'pages/Today.tsx': { calls: { activeIllness: 1, recoveryRamp: 1, leaveLabelOn: 1 }, why: 'de missie volgt de melding (de toets zelf is dayRules, stap doen); de kaart Opbouw' },
  'engine/missedTraining.ts': { calls: { activeIllness: 1, isTaperDay: 1 }, why: 'geen vragen tot je beter bent; de afbouw apart omdat een horlogelog nog gekoppeld mag worden' },
  'engine/eveningBefore.ts': { calls: { activeIllness: 1, isIllnessDay: 1, leaveDays: 1 }, why: 'de avond ervoor: rust uit, er valt niets klaar te leggen' },
  // De ronde en wat de planning kent (stap 5 van het ontwerp: alleen als stap 0 tot 4 stil bleven).
  'engine/sports.ts': { calls: { strengthAllows: 1 }, why: 'ronde: met kracht uit kent de planning geen kracht' },
  'storage/weeklyPrescriptionStep.ts': { calls: { strengthAllows: 1 }, why: 'ronde: met kracht uit geen kracht in het voorschrift' },
  // De dagkeuze binnen een voorstel; de poort ervoor is al mayPropose. Nog om te zetten naar de stap verplaatsen.
  'engine/adviceCompute.ts': { calls: { isIllnessDay: 2, isTaperDay: 1, leaveDays: 1, lightDays: 1 }, why: 'dagkeuze van een voorstel' },
  'engine/adviceLoad.ts': { calls: { isIllnessDay: 1, isTaperDay: 1 }, why: 'belasting telt geen zieke dagen en de afbouw' },
  'engine/adviceShared.ts': { calls: { afterRaceGuard: 1, isAwayFor: 1, isPauseDay: 1 }, why: 'raceWeekGuard en de inhaaldag, het ene venster rond een race' },
  'engine/adviceTestRun.ts': { calls: { isIllnessDay: 4, isTaperDay: 1 }, why: 'dagkeuze van de testloop' },
  'engine/adviceWeek.ts': { calls: { isAwayFor: 2, isIllnessDay: 3, isPauseDay: 3, isTaperDay: 1 }, why: 'inhalen en de week: dagkeuze en vandaag in een pauze' },
  'engine/descentClock.ts': { calls: { isIllnessDay: 1, leaveDays: 2, lightDays: 1 }, why: 'dagkeuze van de afdaalklok' },
  'engine/directionStrength.ts': { calls: { activeIllness: 1, isIllnessDay: 1, leaveDays: 1, lightDays: 1 }, why: 'dagkeuze van kracht bij een richting' },
  'engine/restDayBack.ts': { calls: { isIllnessDay: 2, isTaperDay: 1, leaveDays: 1 }, why: 'dagkeuze van de rustdag terug' },
  'engine/reentry.ts': { calls: { isAwayDay: 1 }, why: 'geen rustige instap op een dag dat je weg bent' },
  'engine/repeatWeek.ts': { calls: { isAwayDay: 1, leaveDays: 1 }, why: 'een week waarin je weg was viel niet tegen' },
  'components/WeekdayPatternLine.tsx': { calls: { isIllnessDay: 1, isTaperDay: 1, leaveDays: 1 }, why: 'het weekdagpatroon telt zieke dagen en de afbouw niet' },
  // Leest de dagen van een periode zelf (leaveDays, lightDays, leaveLabelOn).
  'components/WeekPlanner.tsx': { calls: { leaveLabelOn: 1 }, why: 'Week toont de band van de periode' },
  'engine/calibration.ts': { calls: { leaveDays: 1 }, why: 'de ijkset: een tocht in dezelfde week of de drie dagen erna (eigen regel naast dayRules)' },
  'engine/fullWeek.ts': { calls: { leaveDays: 1 }, why: 'de volle week leest de periode voor zijn eigen telling van vrije dagen' },
  'engine/leaveAround.ts': { calls: { leaveDays: 1 }, why: 'ronde: de indeling rond een vakantie' },
  'engine/leaveBlock.ts': { calls: { leaveDays: 1 }, why: 'ronde: een lange wandeling op vrije dagen' },
  'engine/leaveProposal.ts': { calls: { leaveDays: 1, leaveLabelOn: 2 }, why: 'het voorstel bij een periode zelf' },
  'engine/leaveWeek.ts': { calls: { leaveDays: 1 }, why: 'de periode in de week, voor de band' },
  'engine/nearbyTerrain.ts': { calls: { leaveDays: 1 }, why: 'de plek van een tochtdag' },
  'engine/proposalPreview.ts': { calls: { leaveLabelOn: 1 }, why: 'het voorbeeld van een voorstel noemt de periode' },
  'engine/restDayThisWeek.ts': { calls: { leaveDays: 1, leaveLabelOn: 1 }, why: 'dagkeuze van de rustdag deze week' },
  'engine/routeTarget.ts': { calls: { leaveDays: 1 }, why: 'de route van een tochtdag' },
  'engine/weatherSwap.ts': { calls: { leaveLabelOn: 1 }, why: 'dagkeuze van het weer-voorstel' },
  'engine/weekValidator.ts': { calls: { leaveDays: 1, lightDays: 1 }, why: 'ronde: LEAVE-OFF en LEAVE-LIGHT (stap 5)' },
};

function calls(text: string): Partial<Record<typeof OLD[number], number>> {
  // Commentaar telt niet: een verwijzing als engine/leave.ts#isAwayFor is geen aanroep.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const out: Partial<Record<typeof OLD[number], number>> = {};
  for (const fn of OLD) {
    const n = (code.match(new RegExp(`(?<![\\w#])${fn}\\(`, 'g')) ?? []).length;
    // De declaratie in een bronbestand is geen aanroep.
    const own = (code.match(new RegExp(`function ${fn}\\(`, 'g')) ?? []).length;
    if (n - own > 0) out[fn] = n - own;
  }
  return out;
}

describe('de ene regel: geen losse toetsen buiten engine/dayRules.ts', () => {
  const found = new Map(Object.entries(RAW).map(([path, text]) => [path.replace(/^\.\//, 'engine/').replace(/^\.\.\//, ''), calls(text)]));

  it('geen nieuwe losse toets', () => {
    const wrong: string[] = [];
    for (const [file, c] of found) {
      if (SOURCES.has(file) || Object.keys(c).length === 0) continue;
      const allowed = LEFT[file]?.calls ?? {};
      for (const [fn, n] of Object.entries(c)) {
        if (n > (allowed[fn as typeof OLD[number]] ?? 0)) wrong.push(`${file}: ${fn} ${n} keer (toegestaan ${allowed[fn as typeof OLD[number]] ?? 0}). Lees engine/dayRules.ts.`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('de lijst wordt alleen korter: wat weg is, gaat ook uit de lijst', () => {
    const stale: string[] = [];
    for (const [file, { calls: allowed }] of Object.entries(LEFT)) {
      const c = found.get(file) ?? {};
      for (const [fn, n] of Object.entries(allowed)) if ((c[fn as typeof OLD[number]] ?? 0) < (n ?? 0)) stale.push(`${file}: ${fn} nog ${c[fn as typeof OLD[number]] ?? 0} keer, de lijst zegt ${n}`);
    }
    expect(stale).toEqual([]);
  });

  it('geen oude toets onder een andere naam (import of export met as)', () => {
    const alias = new RegExp(`\\b(${OLD.join('|')})\\s+as\\s+\\w+`);
    const wrong = Object.entries(RAW).filter(([, text]) => alias.test(text)).map(([path]) => path);
    expect(wrong).toEqual([]);
  });

  it('de scan leest heel src/', () => {
    expect(found.size).toBeGreaterThan(300);
    expect(found.get('engine/dayRules.ts')).toBeDefined();
  });

  it('de scan vindt een losse toets', () => {
    expect(calls("const x = isAwayFor(d, t, leave); // isIllnessDay(d)")).toEqual({ isAwayFor: 1 });
    expect(calls("import { isAwayFor } from './leave';")).toEqual({});
    expect(calls('const y = leave.isPauseDay(d, p);')).toEqual({ isPauseDay: 1 });
  });
});
