// ASCEND: de gedeelde voorwaarden van de instellingen (docs/visie/Ontwerp instellingen op een plek.md, stap 2).
// Wat bij een andere instelling hoort bestaat niet zolang die uit staat: verbergen, niet uitgrijzen. Een verklaring
// noemt zijn voorwaarden in `showWhen`, in volgorde; de eerste die niet klopt zegt waarom de rij er niet is en welke
// instelling het oplost. Verhuisd uit data/settingsLayout.ts, met dezelfde teksten.

import type { AppSettings } from '../../storage/database';
import { resolveOverviews } from '../overviewSettings';
import { resolveRunInsight } from '../runInsightSettings';
import { resolveSky } from '../skySettings';
import { resolveLegEase } from '../legEaseSettings';
import { resolveStrengthSettings } from '../strengthSettings';
import { resolveWatchHrMode } from '../watchHeartRate';
import type { Blocker, ChoiceDef } from './types';

const strength = (s: AppSettings) => resolveStrengthSettings(s.strengthModel);

export const B = {
  forge: { ok: (s) => strength(s).enabled, reason: 'Zichtbaar zodra Kracht meerekenen aan staat', parent: 'forge' },
  oneRm: { ok: (s) => strength(s).showOneRm, reason: 'Zichtbaar zodra Geschatte 1RM tonen aan staat', parent: 'forge-1rm' },
  inApp: { ok: (_s, c) => c.strengthInApp, reason: 'Zichtbaar zodra je sets in de app bijhoudt', parent: 'kracht' },
  ladderRow: { ok: (s) => strength(s).ladderRow, reason: 'Zichtbaar zodra Stappen bij calisthenics aan staat', parent: 'forge-stappen' },
  mountain: { ok: (s) => strength(s).mountainMuscles, reason: 'Zichtbaar zodra Spieren voor de berg aan staat', parent: 'forge-bergspieren-aan' },
  restAuto: { ok: (s) => strength(s).restAuto, reason: 'Zichtbaar zodra de rusttimer aan staat', parent: 'forge-rust' },
  restAlert: { ok: (s) => strength(s).restAlert !== 'off', reason: 'Zichtbaar zodra de rusttimer een signaal geeft', parent: 'forge-signaal' },
  mf: { ok: (_s, c) => c.macroFactorExport, reason: 'Zichtbaar zodra je een MacroFactor-export hebt ingelezen', parent: 'macrofactor' },
  garmin: { ok: (_s, c) => c.garmin, reason: 'Zichtbaar zodra Garmin is gekoppeld', parent: 'garmin' },
  route: { ok: (s) => s.routeProposal !== false, reason: 'Zichtbaar zodra Route voorstellen aan staat', parent: 'route-voorstel' },
  watchFields: { ok: (s) => s.watchFieldsShown !== false, reason: 'Zichtbaar zodra Datavelden voor je horloge aan staat', parent: 'datavelden' },
  strava: { ok: (s) => s.stravaText !== false, reason: 'Zichtbaar zodra Tekst voor Strava aan staat', parent: 'strava-tekst' },
  hc: { ok: (_s, c) => c.healthConnect, reason: 'Zichtbaar zodra Health Connect aan staat', parent: 'health-connect' },
  // Slaap, rusthartslag, HRV en trainingen komen van Garmin of uit Health Connect: de keuzes gelden voor beide.
  watchData: { ok: (_s, c) => c.garmin || c.healthConnect, reason: 'Zichtbaar zodra Garmin is gekoppeld of Health Connect aan staat', parent: 'garmin' },
  activities: { ok: (_s, c) => c.activities, reason: 'Zichtbaar zodra Trainingen van je horloge aan staat', parent: 'garmin-trainingen' },
  send: { ok: (_s, c) => c.sendToWatch, reason: 'Zichtbaar zodra Trainingen naar je horloge aan staat', parent: 'naar-horloge' },
  ascendHr: { ok: (s) => resolveWatchHrMode({ mode: s.watchHeartRate }) !== 'intervals', reason: 'Zichtbaar zodra de hartslag van ASCEND naar je horloge gaat', parent: 'horloge-hartslag' },
  holidays: { ok: (s) => s.publicHolidayOffers !== false, reason: 'Zichtbaar zodra Feestdagen voorstellen aan staat', parent: 'feestdagen' },
  dragWeek: { ok: (s) => s.dragWeek !== false, reason: 'Zichtbaar zodra Trainingen slepen in Week aan staat', parent: 'slepen-week' },
  missedOn: { ok: (s) => s.missedTraining !== 'off', reason: 'Zichtbaar zodra Training die niet doorging niet op Uit staat', parent: 'niet-doorgegaan' },
  goal: { ok: (_s, c) => c.goal, reason: 'Zichtbaar zodra je een hoofddoel hebt', parent: 'doelen' },
  noGoal: { ok: (_s, c) => c.noGoal, reason: 'Zichtbaar zodra je geen doel hebt', parent: 'doelen' },
  goalOrProgram: { ok: (_s, c) => c.goal || c.program, reason: 'Zichtbaar zodra je een hoofddoel of programma hebt', parent: 'doelen' },
  goalOrTrek: { ok: (_s, c) => c.goal || c.trek, reason: 'Zichtbaar zodra je een hoofddoel of tocht hebt', parent: 'doelen' },
  trekGoal: { ok: (_s, c) => c.trekGoal, reason: 'Zichtbaar zodra je een meerdaagse tocht als doel hebt', parent: 'doelen' },
  longSunday: { ok: (_s, c) => c.longSundayVisible, reason: 'Zichtbaar zodra je hoofddoel geen bergtocht is', parent: 'doelen' },
  pairing: { ok: (_s, c) => c.sameDayAllowed, reason: 'Zichtbaar zodra twee trainingen op een dag mag', parent: 'meerdere' },
  trainings: { ok: (_s, c) => c.strengthTrainings, reason: 'Zichtbaar zodra er krachttrainingen in je planning staan', parent: 'kracht' },
  bodyFat: { ok: (_s, c) => c.bodyFat, reason: 'Zichtbaar zodra je weegmetingen met een vetpercentage hebt', parent: 'lichaamsgewicht' },
  morning: { ok: (s) => resolveOverviews(s.overviews).morningCheckIn, reason: 'Zichtbaar zodra de ochtendcheck aan staat', parent: 'ochtendcheck' },
  review: { ok: (s) => resolveOverviews(s.overviews).weekReview, reason: 'Zichtbaar zodra de weekterugblik aan staat', parent: 'weekterugblik' },
  notice: { ok: (_s, c) => c.noticeAvailable, reason: 'Zichtbaar zodra je telefoon de ochtendmelding kan sturen', parent: 'ochtendmelding' },
  timed: { ok: (_s, c) => c.timed, reason: 'Zichtbaar in de Android-app', parent: 'toestemmingen' },
  weekNotice: { ok: (s) => s.weekNotice !== false, reason: 'Zichtbaar zodra de weekmelding aan staat', parent: 'weekmelding' },
  evening: { ok: (s) => s.eveningBefore !== false, reason: 'Zichtbaar zodra De avond ervoor aan staat', parent: 'avond-ervoor' },
  liveUpdate: { ok: (_s, c) => c.liveUpdate, reason: 'Zichtbaar in de Android-app', parent: 'toestemmingen' },
  clothing: { ok: (s) => resolveOverviews(s.overviews).clothingAdvice, reason: 'Zichtbaar zodra het kledingadvies aan staat', parent: 'kledingadvies' },
  runDetail: { ok: (s) => resolveRunInsight(s.runInsight).detail.show, reason: 'Zichtbaar zodra Run in detail tonen aan staat', parent: 'run-detail' },
  insight: { ok: (s) => resolveRunInsight(s.runInsight).enabled, reason: 'Zichtbaar zodra Inzicht na een training aan staat', parent: 'loopinzicht' },
  legEaseOffers: { ok: (s) => resolveLegEase(s) === 'voorstel', reason: 'Zichtbaar zodra Lichter bij vermoeide benen met een voorstel werkt', parent: 'lichterbenen' },
  skyAuto: { ok: (s) => resolveSky(s).sky === 'auto', reason: 'Zichtbaar zodra Lucht bovenaan op Automatisch staat', parent: 'lucht' },
  folder: { ok: (_s, c) => c.folderSupported, reason: 'Zichtbaar zodra je browser een vaste map kan onthouden of in de Android-app', parent: 'backup' },
} satisfies Record<string, Blocker>;

// Een keuze met haar eigen typen (de waarden van de opties), zodat CHOICES.<sleutel> smal getypeerd blijft.
export function def<T extends string | number>(d: ChoiceDef<T>): ChoiceDef<T> {
  return d;
}
