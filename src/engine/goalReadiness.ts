// ASCEND, "Klaar voor je doel": één percentage per doel, met de zin waaruit het bestaat.
//
// Dit generaliseert engine/gr5Readiness.ts (decision 2026-10-26-kracht-en-berg-voor-iedereen.md).
// De regel is dezelfde gebleven:
//
//   percentage = het gemiddelde van de meters van de doelsoort, elk begrensd op 100%
//
// De meters, hun streefwaarden, vensters en bewijslabels staan als gegevens in
// data/goalKinds.ts. Hier staat alleen het rekenwerk. Er zijn vier typen meters:
//   beste dag        je beste dag van de laatste weken naast wat het doel vraagt
//   reeks            dagen achter elkaar, begrensd op wat je thuis oefent
//   volume of trend  een gemiddelde of een piekweek over de laatste weken
//   versheid         hoe lang geleden je laatste afdaling was (de bescherming vervalt)
//
// Eerlijkheidsregels (de oude, plus de nieuwe):
// - elke meter is begrensd op 100%;
// - 100% staat er alleen als alle meters die meetellen vol zijn; anders blijft het 99;
// - een meter zonder eis in het doel telt niet mee en wordt niet genoemd (zoals voor de GR5);
// - een meter die nog niet meetbaar is (zwemmen, een testloop die er niet is, de krachttrend
//   die de aanroeper niet aanlevert) telt niet mee in het percentage, maar wordt wel genoemd
//   als ontbrekend (de keuze van de eigenaar op 26 oktober);
// - bij een doel van één lange dag is 100% een aandeel van de doeldag (dagShare), gemarkeerd
//   als afgeleid; bij een meerdaagse tocht blijft het 1,0, zodat de bestaande GR5 gelijk blijft;
// - een combinatiedoel toont het LAAGSTE onderdeel, met de naam erbij.
//
// Puur: geen React, geen opslag. Voor een meerdaagse tocht geeft dit exact dezelfde
// uitkomst als de oude gr5Readiness (de test bewaakt dat met bevroren uitkomsten).

import type { GoalDetails, GoalKindId, GoalRequirement, TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';
import { GOAL_KINDS, variantOf, type EvidenceLabel, type GoalKindDefinition, type MeterSpec, type MeterType, type NeedRule } from '../data/goalKinds';
import { SPORT_IDS } from '../data/sports';
import { addDays, formatHoursMinutesNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { typicalDayValue } from './goalRoute';
import { logSport } from './sports';
import { descentOf, routeDayRows, type RouteDayRow } from './standing';

// Het getal vergelijkt met het getal van zoveel dagen terug ("+6 in 4 weken").
export const VERGELIJK_DAGEN = 28;

export type PartUnit = 'kg' | 'min' | 'm' | 'dagen' | 'km';

// Eén vergelijking binnen een meter: jouw beste naast wat het doel vraagt.
export interface MeterPart {
  name: string;
  unit: PartUnit;
  best: number;
  need: number;
  bestDate?: string;
  share: number; // 0 tot 1, begrensd
  text: string; // "9 van 14 kg"
}

export interface GoalMeter {
  key: string;
  label: string;
  parts: MeterPart[];
  share: number; // gemiddelde van de delen, 0 tot 1
  text: string;
  why: string; // één zin waarom deze meter meetelt
  type: MeterType;
  evidence: EvidenceLabel; // hoe zeker de streefwaarde is
}

export interface MissingMeter {
  key: string;
  label: string;
  reason: string;
}

export interface GoalReadiness {
  percent: number | undefined; // 0 tot 100; undefined als er nog niets te meten is
  meters: GoalMeter[];
  missing: MissingMeter[];
  weakest?: GoalMeter;
  sentence: string;
  weakestSentence?: string;
  missingSentence?: string; // "Hier is nog niets van gemeten: je langste zwemmen."
  derivedNote?: string; // bij een dagdoel: 100% is een aandeel van de doeldag
  change?: number;
}

// Wat de aanroeper zelf aanlevert voor meters die niet uit logs komen (volhouden, een
// testloop, de krachttrend uit Forge). Het aandeel is al 0 tot 1.
export interface ExternalValue {
  share: number;
  text: string;
}

export interface ReadinessOptions {
  // Hoe het doel in de zinnen heet. De GR5 geeft { the: 'de GR5', your: 'je GR5' }.
  naming?: { the: string; your: string };
  external?: (meterId: string, today: string) => ExternalValue | undefined;
  // Overschrijft de grens op dagen achter elkaar (GoalDetails.homeDaysInRow en de soort).
  homeDays?: number;
  // Wegingen per meter (sleutel van de meter naar gewicht). Zonder: elke meter even zwaar. Een
  // meter die niet in de lijst staat weegt 0,2. Het percentage blijft één getal; alleen de
  // verdeling verschuift (engine/raceReadiness.ts: bij een doeltijd weegt snelheid het zwaarst).
  weights?: Record<string, number>;
  // De dag waarop het doel is gemaakt (ISO). Is dat minder dan vier weken geleden, dan is er niets om
  // mee te vergelijken en blijft de verandering weg. Ook een waarde van 0 vier weken terug telt dan
  // niet als beginpunt: geen sprong van 0 bij een nieuw doel.
  since?: string;
}

// Het gewicht van een meter die niet in `weights` staat.
export const DEFAULT_METER_WEIGHT = 0.2;

export interface GoalReadinessInput {
  kind: GoalKindId;
  details?: GoalDetails;
  // Bestaande doelen (de GR5) hebben eisen; die gaan voor. Zonder eisen worden ze uit de
  // ingevulde gegevens opgebouwd.
  requirements?: GoalRequirement[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function fmt(n: number): string {
  return formatNumberNL(n, Number.isInteger(n) ? 0 : 1);
}

function valueText(unit: PartUnit, n: number): string {
  if (unit === 'min') return formatHoursMinutesNL(n);
  if (unit === 'kg') return `${fmt(n)} kg`;
  if (unit === 'km') return `${fmt(n)} km`;
  if (unit === 'dagen') return `${fmt(n)} ${n === 1 ? 'dag' : 'dagen'}`;
  return `${fmt(n)} m`;
}

// Het getal zoals het op het scherm staat: minuten en meters heel, kilo's, kilometers en
// dagen op één decimaal (een gemiddelde van 1,5 krachtdag is geen 2). Het aandeel wordt op deze getoonde waarden berekend, anders
// staat er "5 uur 30 min van 5 uur 30 min" bij 99%.
function shown(unit: PartUnit, n: number): number {
  return unit === 'kg' || unit === 'km' || unit === 'dagen' ? Math.round(n * 10) / 10 : Math.round(n);
}

function buildPart(name: string, unit: PartUnit, best0: number, need0: number, bestDate?: string, shareOverride?: number, textOverride?: string): MeterPart {
  const best = shown(unit, best0);
  const need = shown(unit, need0);
  const share = shareOverride ?? (need > 0 ? clamp01(best / need) : 0);
  // "9 van 14 kg": de eenheid één keer, achteraan.
  const of = unit === 'min'
    ? `${formatHoursMinutesNL(best)} van ${formatHoursMinutesNL(need)}`
    : unit === 'dagen'
      ? `${fmt(best)} van ${fmt(need)}`
      : `${fmt(best)} van ${valueText(unit, need)}`;
  return { name, unit, best, need, bestDate, share, text: textOverride ?? of };
}

// --- het aandeel van de doeldag ---------------------------------------------------------------

// Bij een doel van één lange dag is 100% een aandeel van de doeldag: 1,0 tot 3 uur, lineair
// omlaag naar 0,6 bij 8 uur, en naar 0,5 bij 12 uur of meer. AFGELEID, niet getoetst
// (docs/onderzoek/Doelsoorten berg en buiten.md, 2.2).
export function dayShareOf(dayMinutes: number): number {
  const hours = dayMinutes / 60;
  if (hours <= 3) return 1;
  if (hours <= 8) return 1 - (0.4 * (hours - 3)) / 5;
  if (hours < 12) return 0.6 - (0.1 * (hours - 8)) / 4;
  return 0.5;
}

export const DAY_SHARE_NOTE = '100% is hier een aandeel van de doeldag: 1,0 tot 3 uur, 0,6 bij 8 uur en 0,5 vanaf 12 uur. Dat is een afgeleide keuze, niet getoetst.';

// --- eisen uit de ingevulde gegevens -----------------------------------------------------------

let reqCounter = 0;
function req(kind: GoalRequirement['kind'], scope: GoalRequirement['scope'], amount: number, unit: string): GoalRequirement {
  return { id: `det-${kind}-${reqCounter++}`, kind, scope, target: { amount, unit } as GoalRequirement['target'] };
}

// De eisen die een doel zonder eigen eisen uit zijn gegevens krijgt, in de vorm die
// engine/standing.ts#routeDayRows al leest.
export function requirementsFromDetails(kind: GoalKindId, details: GoalDetails | undefined): GoalRequirement[] {
  const d = details ?? {};
  const out: GoalRequirement[] = [];
  const def = GOAL_KINDS[kind];
  const multi = kind === 'trek_hut' || kind === 'trek_tent';
  // Een tocht: totalen en het aantal dagen. De zware dag van mountaineering: per dag.
  const scope: GoalRequirement['scope'] = multi ? 'TOTAL_EVENT' : kind === 'mountaineering' ? 'PER_DAY' : 'SINGLE_EVENT';
  if (d.distanceKm !== undefined && d.distanceKm > 0) out.push(req('distance', scope, d.distanceKm, 'km'));
  if (d.gainM !== undefined && d.gainM > 0) out.push(req('elevationGain', scope, d.gainM, 'm'));
  if (d.lossM !== undefined && d.lossM > 0) out.push(req('elevationLoss', scope, d.lossM, 'm'));
  if (multi && d.days !== undefined && d.days > 0) out.push(req('eventDays', 'TOTAL_EVENT', d.days, 'days'));
  if (d.packKg !== undefined && d.packKg > 0 && (def.dayShare === false || kind === 'mountaineering' || d.packKg >= 5)) out.push(req('packWeight', 'SINGLE_EVENT', d.packKg, 'kg'));
  if ((multi || kind === 'mountaineering') && d.days !== undefined && d.days > 1) out.push(req('consecutiveDays', 'CONSECUTIVE_DAYS', d.days, 'days'));
  return out;
}

// --- logs kiezen -----------------------------------------------------------------------------------

const ENDURANCE_FALLBACK = ['hiking', 'running', 'cycling'];

function matches(log: SessionLog, sports: readonly string[]): boolean {
  if (sports.includes('strength')) return log.type === 'strength';
  if (log.type === 'strength' || log.type === 'recovery') return false;
  const sport = logSport(log);
  const list = sports.length > 0 ? sports : ENDURANCE_FALLBACK;
  if (sport && list.includes(sport)) return true;
  // Zoals de oude tochtmeters: een tocht (avontuur) zonder andere sport telt als wandelen.
  return list.includes('hiking') && (log.type === 'hiking' || log.type === 'adventure') && sport === undefined;
}

function inWindow(logs: SessionLog[], today: string, days: number, sports: readonly string[]): SessionLog[] {
  const since = addDays(today, -days);
  return logs.filter((l) => l.completedDate >= since && l.completedDate <= today && matches(l, sports));
}

const kmOf = (l: SessionLog): number => (l.outdoorData ?? l.cardioData)?.distanceKm ?? 0;
const gainOf = (l: SessionLog): number => {
  const d = l.outdoorData ?? l.cardioData;
  return d && !d.estimatedElevation ? d.elevationGainM ?? 0 : 0;
};

function bestOf(list: SessionLog[], value: (l: SessionLog) => number): { best: number; bestDate?: string } {
  let top: SessionLog | undefined;
  for (const l of list) if (!top || value(l) > value(top)) top = l;
  return top && value(top) > 0 ? { best: value(top), bestDate: top.completedDate } : { best: 0 };
}

function longestRun(dates: string[]): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  sorted.forEach((d, i) => {
    const gap = i > 0 ? Math.round((Date.parse(d) - Date.parse(sorted[i - 1])) / 86_400_000) : 0;
    run = i > 0 && gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

// --- een eis uit de regel ---------------------------------------------------------------------------

function resolveNeed(rule: NeedRule, details: GoalDetails, variant: string | undefined): number | undefined {
  const num = (k: keyof GoalDetails): number | undefined => {
    const x = details[k];
    return typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : undefined;
  };
  switch (rule.from) {
    case 'detail': return num(rule.key);
    case 'fixed': return (variant ? rule.byVariant?.[variant] : undefined) ?? rule.value;
    case 'guideline': return num(rule.key) ?? rule.value;
    case 'fractionOf': {
      const base = num(rule.key);
      if (base === undefined) return rule.fallback;
      const f = (variant ? rule.variants?.[variant] : undefined) ?? { factor: rule.factor, max: rule.max };
      const value = base * f.factor;
      return f.max !== undefined ? Math.min(value, f.max) : value;
    }
    default: return undefined;
  }
}

function applies(spec: MeterSpec, details: GoalDetails, variant: string | undefined): boolean {
  const a = spec.appliesWhen;
  if (!a) return true;
  if ('variant' in a) return variant !== undefined && a.variant.includes(variant);
  const x = details[a.key];
  if (typeof x !== 'number') return false;
  return (a.atLeast === undefined || x >= a.atLeast) && (a.atMost === undefined || x <= a.atMost);
}

// --- de berekening op één datum -------------------------------------------------------------------------

interface Ctx {
  def: GoalKindDefinition;
  details: GoalDetails;
  variant: string | undefined;
  requirements: GoalRequirement[];
  logs: SessionLog[];
  today: string;
  options: ReadinessOptions;
  naming: { the: string; your: string };
  legacyTrek: boolean;
}

type Measured = { meter: GoalMeter } | { missing: MissingMeter } | undefined;

function makeMeter(spec: MeterSpec, parts: MeterPart[], why: string): GoalMeter {
  const share = parts.reduce((n, p) => n + p.share, 0) / parts.length;
  // Stijging en daling samen: "450 en 300 van 1.000 m" als de eis gelijk is.
  let text = parts.map((p) => p.text).join(' en ');
  if (parts.length === 2 && parts[0].need === parts[1].need) text = `${fmt(parts[0].best)} en ${fmt(parts[1].best)} van ${valueText(parts[0].unit, parts[0].need)}`;
  return { key: spec.id, label: spec.label, parts, share, text, why, type: spec.type, evidence: spec.need.evidence };
}

function measureRoute(spec: MeterSpec, ctx: Ctx, rows: RouteDayRow[]): Measured {
  const row = (key: RouteDayRow['key']) => rows.find((r) => r.key === key);
  const rule = spec.need.value;
  const dayShare = rule.from === 'hikingDay' || rule.from === 'detail' ? !!rule.dayShare : false;
  const { details, naming, def } = ctx;
  const time = row('tijd');
  const dayMinutes = details.expectedMinutes && def.dayShare ? details.expectedMinutes : time?.need;
  const share = dayShare && dayMinutes ? dayShareOf(dayMinutes) : 1;
  const up = row('stijgen');
  const down = row('dalen');
  const dist = typicalDayValue(ctx.requirements, 'distance')?.value;

  switch (spec.metric) {
    case 'rugzak': {
      const pack = row('rugzak');
      if (!pack) return undefined;
      const why = ctx.legacyTrek
        ? `Het rugzakdoel van ${naming.your} is ${fmt(pack.need)} kg. Telt je zwaarste rugzak op een wandeling van de laatste acht weken.`
        : spec.why;
      return { meter: makeMeter(spec, [buildPart('rugzak', 'kg', pack.best, pack.need, pack.bestDate)], why) };
    }
    case 'langsteDag': {
      if (!time) return undefined;
      const need = (dayMinutes ?? time.need) * share;
      let why = spec.why;
      if (ctx.legacyTrek) {
        const day = dist ? `Een gewone dag van ${formatNumberNL(dist.amount, 1)} km${up && down ? ` met ${fmt(up.need)} m omhoog en ${fmt(down.need)} m omlaag` : ''}` : 'Een gewone dag op de route';
        why = `${day} kost ongeveer ${formatHoursMinutesNL(time.need)} op pad. Telt je langste wandeling van de laatste acht weken.`;
      }
      return { meter: makeMeter(spec, [buildPart('langste dag', 'min', time.best, need, time.bestDate)], why) };
    }
    case 'stijgenDalen':
    case 'stijgen':
    case 'dalen': {
      const parts: MeterPart[] = [];
      if (spec.metric !== 'dalen' && up) parts.push(buildPart('stijging', 'm', up.best, up.need * share, up.bestDate));
      if (spec.metric !== 'stijgen' && down) parts.push(buildPart('daling', 'm', down.best, down.need * share, down.bestDate));
      if (parts.length === 0) return undefined;
      const why = ctx.legacyTrek
        ? 'Een gewone dag vraagt zoveel omhoog en omlaag. Bergaf kost je benen meer dan bergop, daarom tellen allebei. Telt je grootste dag van de laatste acht weken.'
        : spec.why;
      return { meter: makeMeter(spec, parts, why) };
    }
    case 'dagenOpRij': {
      const days = row('dagen');
      if (!days) return undefined;
      const home = ctx.options.homeDays ?? details.homeDaysInRow ?? spec.homeDays ?? def.homeDaysInRow?.value ?? days.need;
      const cap = Math.min(days.need, home);
      let why = spec.why;
      if (ctx.legacyTrek) {
        const longer = days.need > cap
          ? `De tocht vraagt tot ${fmt(days.need)} dagen achter elkaar. Thuis oefen je er ${fmt(cap)}, een weekend met twee lange wandeldagen; de rest leer je op de tocht zelf.`
          : `Je tocht vraagt ${fmt(days.need)} lange dagen achter elkaar.`;
        why = `${longer} Telt dagen van minstens anderhalf uur wandelen, van de laatste acht weken.`;
      }
      return { meter: makeMeter(spec, [buildPart('dagen achter elkaar', 'dagen', days.best, cap)], why) };
    }
    default: return undefined;
  }
}

const ROUTE_METRICS = new Set(['rugzak', 'langsteDag', 'stijgenDalen', 'stijgen', 'dalen', 'dagenOpRij']);

function sportsOf(spec: MeterSpec): readonly string[] {
  return spec.sports;
}

function measureGeneric(spec: MeterSpec, ctx: Ctx): Measured {
  const { today, logs, details, variant } = ctx;
  const missing = (reason: string): Measured => ({ missing: { key: spec.id, label: spec.label, reason } });

  if (spec.needsSport && !(SPORT_IDS as readonly string[]).includes(spec.needsSport)) return missing('zwemmen telt nog niet mee in ASCEND');

  if (spec.metric === 'extern') {
    const value = ctx.options.external?.(spec.id, today);
    if (!value) return missing('nog niet gemeten');
    const share = clamp01(value.share);
    return { meter: { key: spec.id, label: spec.label, parts: [], share, text: value.text, why: spec.why, type: spec.type, evidence: spec.need.evidence } };
  }

  if (spec.metric === 'afdalenVers') {
    const foot = inWindow(logs, today, spec.windowDays.value, ['hiking', 'running']).filter((l) => descentOf(l) >= (spec.minDescentM ?? 100));
    const last = foot.reduce<string | undefined>((a, l) => (!a || l.completedDate > a ? l.completedDate : a), undefined);
    const needDays = typeof spec.need.value === 'object' && spec.need.value.from === 'fixed' ? spec.need.value.value : 14;
    if (!last) {
      const part = buildPart('laatste afdaling', 'dagen', spec.windowDays.value, needDays, undefined, 0, `geen afdaling in ${Math.round(spec.windowDays.value / 7)} weken`);
      return { meter: makeMeter(spec, [part], spec.why) };
    }
    const ago = Math.max(0, Math.round((Date.parse(today) - Date.parse(last)) / 86_400_000));
    const full = spec.windowDays.value;
    const share = ago <= needDays ? 1 : clamp01(1 - (ago - needDays) / (full - needDays));
    const part = buildPart('laatste afdaling', 'dagen', ago, needDays, last, share, ago === 0 ? 'vandaag' : `${ago} ${ago === 1 ? 'dag' : 'dagen'} geleden`);
    return { meter: makeMeter(spec, [part], spec.why) };
  }

  const rule = spec.need.value;
  let need = resolveNeed(rule, details, variant);
  if (need === undefined) return missing('vul eerst in wat je doel vraagt');
  const list = inWindow(logs, today, spec.windowDays.value, sportsOf(spec));
  const weeks = spec.windowDays.value / 7;
  const name = spec.label.toLowerCase();

  switch (spec.metric) {
    case 'langsteMinuten': {
      const b = bestOf(list, (l) => l.durationMinutes);
      return { meter: makeMeter(spec, [buildPart(name, 'min', b.best, need, b.bestDate)], spec.why) };
    }
    case 'langsteKm': {
      const b = bestOf(list, kmOf);
      return { meter: makeMeter(spec, [buildPart(name, 'km', b.best, need, b.bestDate)], spec.why) };
    }
    case 'weekMinuten': {
      const total = list.reduce((n, l) => n + l.durationMinutes, 0);
      return { meter: makeMeter(spec, [buildPart(name, 'min', total / weeks, need)], spec.why) };
    }
    case 'weekKm': {
      const total = list.reduce((n, l) => n + kmOf(l), 0);
      return { meter: makeMeter(spec, [buildPart(name, 'km', total / weeks, need)], spec.why) };
    }
    case 'weekStijgen': {
      const buckets = Array.from({ length: Math.ceil(weeks) }, () => 0);
      for (const l of list) {
        const ago = Math.round((Date.parse(today) - Date.parse(l.completedDate)) / 86_400_000);
        const i = Math.min(buckets.length - 1, Math.floor(ago / 7));
        buckets[i] += gainOf(l);
      }
      return { meter: makeMeter(spec, [buildPart(name, 'm', Math.max(0, ...buckets), need)], spec.why) };
    }
    case 'krachtdagen': {
      const days = new Set(list.map((l) => l.completedDate)).size;
      return { meter: makeMeter(spec, [buildPart(name, 'dagen', days / weeks, need)], spec.why) };
    }
    case 'reeksDagen': {
      const home = ctx.options.homeDays ?? details.homeDaysInRow ?? spec.homeDays ?? Infinity;
      need = Math.min(need, home);
      const planned = details.distanceKm !== undefined && details.days !== undefined && details.days > 0 ? details.distanceKm / details.days : undefined;
      const counts = spec.dayDistanceShare && planned
        ? (l: SessionLog) => kmOf(l) >= spec.dayDistanceShare!.value * planned
        : (l: SessionLog) => l.durationMinutes >= (spec.minDayMinutes ?? 90);
      const run = longestRun(list.filter(counts).map((l) => l.completedDate));
      return { meter: makeMeter(spec, [buildPart('dagen achter elkaar', 'dagen', run, need)], spec.why) };
    }
    default: return undefined;
  }
}

const COUNT_WORD = ['nul', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht'];

function sentenceOf(meters: GoalMeter[], the: string): string {
  const items = meters.map((m) => `je ${m.label.toLowerCase()} ${m.text}`);
  const list = items.length > 1 ? `${items.slice(0, -1).join(', ')} en ${items.at(-1)}` : items[0];
  if (meters.length === 1) return `Dit telt één ding dat ${the} vraagt: ${list}.`;
  return `Zo sta je ervoor, gemiddeld over ${COUNT_WORD[meters.length] ?? meters.length} dingen die ${the} vraagt: ${list}.`;
}

function compute(input: GoalReadinessInput, logs: SessionLog[], today: string, options: ReadinessOptions): Omit<GoalReadiness, 'change'> {
  const def = GOAL_KINDS[input.kind];
  const details = input.details ?? {};
  const requirements = input.requirements && input.requirements.length > 0 ? input.requirements : requirementsFromDetails(input.kind, details);
  const naming = options.naming ?? { the: 'je doel', your: 'je doel' };
  const variant = variantOf(input.kind, details);
  const ctx: Ctx = {
    def, details, variant, requirements, logs, today, options, naming,
    legacyTrek: input.kind === 'trek_hut' || input.kind === 'trek_tent',
  };
  const rows = routeDayRows(requirements, logs, today).filter((r) => r.need > 0);

  const meters: GoalMeter[] = [];
  const missing: MissingMeter[] = [];
  for (const spec of def.meters) {
    if (!applies(spec, details, variant)) continue;
    const result = ROUTE_METRICS.has(spec.metric) ? measureRoute(spec, ctx, rows) : measureGeneric(spec, ctx);
    if (!result) continue;
    if ('meter' in result) meters.push(result.meter);
    else missing.push(result.missing);
  }

  const missingSentence = missing.length > 0
    ? `Hier is nog niets van gemeten: ${missing.map((m) => `je ${m.label.toLowerCase()}`).join(', ').replace(/, ([^,]*)$/, ' en $1')}.`
    : undefined;

  if (meters.length === 0) {
    return { percent: undefined, meters, missing, sentence: missingSentence ?? 'Nog niets te meten. Dat komt met trainingen die meetellen.', missingSentence };
  }

  const weightOf = (m: GoalMeter) => options.weights ? options.weights[m.key] ?? DEFAULT_METER_WEIGHT : 1;
  const totalWeight = meters.reduce((n, m) => n + weightOf(m), 0);
  const mean = meters.reduce((n, m) => n + m.share * weightOf(m), 0) / totalWeight;
  const full = meters.every((m) => m.share >= 1);
  const percent = full ? 100 : Math.min(99, Math.round(mean * 100));
  const open = meters.filter((m) => m.share < 1);
  const weakest = open.length > 0 ? open.reduce((a, b) => (b.share < a.share ? b : a)) : undefined;
  const usesShare = def.dayShare && meters.some((m) => m.evidence === 'afgeleid');

  return {
    percent,
    meters,
    missing,
    weakest,
    sentence: sentenceOf(meters, naming.the),
    weakestSentence: weakest ? `Hier is nog het meeste te winnen: ${weakest.label.toLowerCase()}, ${weakest.text}.` : undefined,
    missingSentence,
    derivedNote: usesShare ? DAY_SHARE_NOTE : undefined,
  };
}

// De tekst van de knop onder het percentage: het aantal meters dat echt meetelt.
export function metersLinkLabel(count: number): string {
  if (count === 1) return 'Bekijk de meter';
  return `Bekijk de ${COUNT_WORD[count] ?? count} meters`;
}

// Het percentage voor een doel, met het verschil met vier weken terug.
export function computeGoalReadiness(input: GoalReadinessInput, logs: SessionLog[], today: string, options: ReadinessOptions = {}): GoalReadiness {
  const now = compute(input, logs, today, options);
  if (now.percent === undefined) return now;
  const before = compute(input, logs, addDays(today, -VERGELIJK_DAGEN), options);
  // Een verschil zegt pas iets als er vier weken terug of nu iets te meten was. Met `since` (een doel
  // van na het eerste meetpunt) moet er vier weken terug al een waarde zijn geweest.
  const existed = options.since === undefined || (options.since <= addDays(today, -VERGELIJK_DAGEN) && (before.percent ?? 0) > 0);
  // Alleen vergelijken als beide momenten dezelfde meters hebben (met dezelfde weging): een meter die er
  // vier weken terug nog niet was (een testloop erbij) maakt het verschil schijn.
  const sameBasis = now.meters.length === before.meters.length && now.meters.every((m, i) => before.meters[i].key === m.key);
  const change = existed && sameBasis && before.percent !== undefined && (before.percent > 0 || now.percent > 0) ? now.percent - before.percent : undefined;
  return { ...now, change };
}

// "+6 in 4 weken", "-3 in 4 weken", "gelijk aan 4 weken geleden".
export function changeLabel(change: number | undefined): string | undefined {
  if (change === undefined) return undefined;
  const weeks = VERGELIJK_DAGEN / 7;
  if (change === 0) return `gelijk aan ${weeks} weken geleden`;
  return `${change > 0 ? '+' : '-'}${Math.abs(change)} in ${weeks} weken`;
}

// Het doel zoals het is opgeslagen naar de invoer van de berekening. Een doel zonder soort
// (een volgdoel van voor ronde 2a dat de migratie nog niet raakte) heeft geen "Klaar voor"-getal.
export function readinessInputOf(goal: Pick<TrainingGoal, 'kind' | 'details' | 'requirements'>): GoalReadinessInput | undefined {
  return goal.kind ? { kind: goal.kind, details: goal.details, requirements: goal.requirements } : undefined;
}

// --- een combinatiedoel ------------------------------------------------------------------------------

export interface ComboPart {
  name: string; // "Fietsen", "Trekken"
  input: GoalReadinessInput;
  options?: ReadinessOptions;
}

export interface ComboReadiness {
  percent: number | undefined; // dat van het laagste onderdeel
  lowest?: { name: string; readiness: GoalReadiness };
  parts: { name: string; readiness: GoalReadiness }[];
  sentence: string;
}

// Een combinatiedoel (meerdere onderdelen) toont het LAAGSTE onderdeel, met de naam erbij.
// Een onderdeel zonder iets om te meten telt niet mee, maar staat wel in de lijst.
export function computeComboReadiness(parts: ComboPart[], logs: SessionLog[], today: string): ComboReadiness {
  const computed = parts.map((p) => ({ name: p.name, readiness: computeGoalReadiness(p.input, logs, today, p.options) }));
  const measured = computed.filter((p): p is { name: string; readiness: GoalReadiness & { percent: number } } => p.readiness.percent !== undefined);
  if (measured.length === 0) return { percent: undefined, parts: computed, sentence: 'Nog niets te meten. Dat komt met trainingen die meetellen.' };
  const lowest = measured.reduce((a, b) => (b.readiness.percent < a.readiness.percent ? b : a));
  const others = measured.filter((p) => p !== lowest);
  const tail = others.length > 0 ? ` ${others.map((p) => `${p.name} staat op ${p.readiness.percent}%`).join(', ').replace(/, ([^,]*)$/, ' en $1')}.` : '';
  return {
    percent: lowest.readiness.percent,
    lowest,
    parts: computed,
    sentence: `${lowest.name} is je laagste onderdeel, op ${lowest.readiness.percent}%.${tail}`,
  };
}
