// ASCEND: what to wear for an outdoor training. Pure: the weather of one
// training goes in (engine/weather.ts), at most four short lines in plain
// Dutch come out, plus one sentence about the rucksack on a hike.
//
// Source of every number: docs/onderzoek/Kleding bij het weer.md, chapter
// "Voorstel voor engine-regels". There is no validated table from temperature
// to clothing for recreational athletes; the numbers are common practice of
// runners, cyclists and mountaineers, taken as one rule:
//
//   T  = felt temperature + a bonus for what you do (you make heat)
//   Th = felt temperature + half of that bonus, for hands, ears and feet
//
// then separate rules for wind, rain, sun and darkness. All of it is a
// starting point, which is why the user can nudge it (engine/clothingFeedback.ts
// moves the bonus by half a degree per tap, per sport). It is advice, not
// planning: nothing here changes the plan, so no proposal with Akkoord.
//
// Not medical advice. Dangerous weather is judged by weather.ts ("slecht").

import type { SessionLog, SessionTemplate } from '../models/training';
import type { WeatherForecast } from '../models/weather';
import { templateSport } from './sports';
import { weatherForTraining, weatherLine, type SessionWeather } from './weather';

// --- what kind of training ------------------------------------------------------

export type ClothingKind =
  | 'easy_run' | 'long_run' | 'tempo' | 'intervals' | 'race'
  | 'ruck_walk' | 'mountain' | 'rest_walk' | 'bike';

// Degrees Celsius added to the felt temperature (report, "Eigen afleiding").
// Own values a few degrees under the rules of thumb of the sources (Runner's
// World, Wyndo, RunDida); only the direction (harder = warmer) is certain.
export const WARMTH_BONUS_C: Record<ClothingKind, number> = {
  easy_run: 6,
  long_run: 5,
  tempo: 8,
  intervals: 9, // rest between the reps, so a bit under a race
  race: 9,
  ruck_walk: 4,
  mountain: 4, // plus an extra layer in the pack: breaks, descents and summit wind cool fast
  rest_walk: 2,
  bike: 2, // less heat than running; riding wind is not in the felt temperature
};

const KIND_BY_TEMPLATE: Record<string, ClothingKind> = {
  tpl_easy_run: 'easy_run',
  tpl_recovery_run: 'easy_run',
  tpl_strides_run: 'easy_run',
  tpl_long_run: 'long_run',
  tpl_tempo_run: 'tempo',
  tpl_progression_run: 'tempo',
  tpl_test_run: 'tempo',
  tpl_intervals: 'intervals',
  tpl_hill_intervals: 'intervals',
  tpl_hills_descent: 'intervals',
  tpl_fartlek: 'intervals',
  tpl_race: 'race',
  tpl_ruck_walk: 'ruck_walk',
  tpl_bergconditie: 'ruck_walk',
  tpl_hike_day_one: 'ruck_walk',
  tpl_mountain_hike: 'mountain',
  tpl_bike: 'bike',
};

// Which kind a template is, or nothing for strength and rest (no advice).
// Your own template falls back on its sport.
export function clothingKind(template: SessionTemplate): ClothingKind | undefined {
  if (template.type === 'strength' || template.type === 'recovery') return undefined;
  const known = KIND_BY_TEMPLATE[template.id];
  if (known) return known;
  const sport = templateSport(template);
  if (sport === 'running') return 'easy_run';
  if (sport === 'hiking') return 'ruck_walk';
  if (sport === 'cycling') return 'bike';
  return undefined;
}

const isRun = (k: ClothingKind) => k === 'easy_run' || k === 'long_run' || k === 'tempo' || k === 'intervals' || k === 'race';
const isWalk = (k: ClothingKind) => k === 'ruck_walk' || k === 'mountain' || k === 'rest_walk';

// A heat acclimation session (GR5 research, rule B2: 5 to 10 sessions of 60 to
// 90 minutes in the heat or with extra clothes). There is no such template in
// the app yet; this recognises one by its id or name, so it gets no advice to
// dress lighter the day one is added.
export function isHeatSession(template: Pick<SessionTemplate, 'id' | 'name'>): boolean {
  return /heat|hitte|warmtetraining/i.test(`${template.id} ${template.name}`);
}

// --- thresholds -----------------------------------------------------------------

// Degrees Celsius unless said otherwise. Report section in the comment.
export const CLOTHING_RULES = {
  // Romp: T bands. Translated from cycling and running sources (id.nl, 12GoBiking,
  // Brooks, Runner's World reprint). Certainty: low to medium.
  torsoLight: 22,
  torsoShort: 15,
  torsoThinLong: 10,
  torsoThermo: 5,
  torsoSecondLayer: 0,
  // Benen: the switch from short to long lies at 10 to 15 in the sources.
  shortsFrom: 12,
  // Handen en hoofd, on Th. Cycling: Th is the felt temperature minus 2.
  glovesThin: 8,
  glovesWarm: 2,
  headBand: 6,
  headHat: 0,
  bikeHandsPenalty: 2,
  // Cycling overshoes below this felt temperature.
  overshoesFeels: 4,
  // Wind: own derivation (about Beaufort 4). The weather verdict ("harde wind")
  // starts much higher; a thin jacket costs little.
  windKmh: 25,
  gustKmh: 40,
  windJacketBelow: 16,
  windSkipIntervalsAbove: 8,
  // Regen: 1 mm is the weather verdict's own limit; 60 percent chance counts too.
  rainMm: 1,
  rainProbWet: 60,
  rainProbShower: 30,
  rainRunNoJacketFrom: 16,
  rainBikeLongMinutes: 45,
  rainDryKitBelowFeels: 8,
  rainDryKitMinutes: 60,
  showerLongMinutes: 90,
  // Zon: WHO bands (3 and 6 or more); the 45 minutes is own derivation.
  uvSunscreen: 3,
  uvStrong: 6,
  sunMinutes: 45,
  hotT: 22,
  hotFeels: 25,
  // A pleasant day: T from the short sleeve band (15) up to 22 and dry. Lower
  // it clashes with torso(), which still says long sleeves under 15.
  pleasantFrom: 15,
  pleasantTo: 22,
  // The first ten minutes feel cool when T is more than this above the felt
  // temperature (report), and only when it is cool at all (own addition: not at
  // 24 degrees).
  startCoolExtraC: 5,
  startCoolBelowFeels: 14,
  // Warm-up jacket for intervals and race: same idea, own limit of 12.
  warmupJacketBelowFeels: 12,
  // Skin: the existing "koud" limit of the weather verdict.
  skinCoverFeels: -5,
  // Rucksack sentence: walks with a rucksack longer than this, and every mountain hike.
  packMinutes: 90,
  packWarmLayerBelow: 14,
  packDryShirtBelow: 10,
  packHatGlovesBelow: 6,
  // At most this many lines (the rucksack sentence comes on top).
  maxLines: 4,
} as const;

// --- input and output -----------------------------------------------------------

export interface ClothingInput {
  kind: ClothingKind;
  minutes: number;
  feelsC: number;
  windKmh: number;
  gustKmh: number;
  precipMm: number;
  precipProb?: number;
  uvIndex?: number;
  dark: boolean;
  snow?: boolean;
  heatSession?: boolean;
  // Your own nudge in degrees for this sport (clothingFeedback.ts): plus means
  // you run warm, so lighter clothes.
  adjustC?: number;
}

export interface ClothingAdvice {
  // At most four short lines, in the fixed order: trunk and legs, hands and
  // head, outer layer (and feet), sun or dark.
  lines: string[];
  // On a hike: what goes in the rucksack, one sentence.
  packLine?: string;
  // True when one of the lines is the one about darkness (it can be dropped on
  // a crowded day). The weather line leaves the darkness to it then.
  darkShown?: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const sentence = (s: string) => `${cap(s)}.`;

function joinNL(parts: string[]): string {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`;
}

type Slot = 'body' | 'ext' | 'outer' | 'feet' | 'sun' | 'dark';

// --- the advice -----------------------------------------------------------------

export function clothingAdvice(input: ClothingInput): ClothingAdvice {
  const R = CLOTHING_RULES;
  const { kind } = input;
  const minutes = input.minutes > 0 ? input.minutes : 60;
  const adj = input.adjustC ?? 0;
  const bonus = WARMTH_BONUS_C[kind];
  const feels = input.feelsC;
  const T = feels + bonus + adj;
  const Th = kind === 'bike' ? feels - R.bikeHandsPenalty + adj : feels + bonus / 2 + adj;
  const bike = kind === 'bike';
  const run = isRun(kind);
  const walk = isWalk(kind);

  const wet = input.precipMm >= R.rainMm || (input.precipProb ?? 0) >= R.rainProbWet;
  const shower = !wet && (input.precipProb ?? 0) >= R.rainProbShower;
  const windy = input.windKmh >= R.windKmh || input.gustKmh >= R.gustKmh;
  const snow = !!input.snow;

  const lines: { slot: Slot; text: string; head?: string; hands?: string; skin?: string }[] = [];
  const packItemsList = packItems(input, minutes);
  const packLine = packSentence(input, packItemsList);

  // A heat session: dress for the heat on purpose. No advice to go lighter.
  if (input.heatSession) {
    lines.push({ slot: 'body', text: 'Hittetraining: kleed je bewust warm, neem water mee en stop bij duizeligheid of misselijkheid.' });
    if (input.dark) lines.push({ slot: 'dark', text: darkText(kind) });
    return { lines: lines.map((l) => l.text), packLine, darkShown: input.dark };
  }

  // Start sentence.
  const extra = T - feels;
  let startText: string | undefined;
  if (extra > R.startCoolExtraC && feels < R.startCoolBelowFeels && (run || kind === 'ruck_walk' || bike)) {
    startText = 'De eerste tien minuten voel je het koel, dat hoort zo.';
  }
  if ((kind === 'intervals' || kind === 'race') && extra > R.startCoolExtraC && feels < R.warmupJacketBelowFeels) {
    startText = kind === 'race'
      ? 'Warm op met een jack aan en trek dat uit voor de start.'
      : 'Warm op met een jack aan en trek dat uit voor de eerste serie.';
  }

  // Sun and heat.
  const sunParts: string[] = [];
  if ((input.uvIndex ?? 0) >= R.uvSunscreen && minutes >= R.sunMinutes) {
    sunParts.push('zonnebrand');
    if ((input.uvIndex ?? 0) >= R.uvStrong || kind === 'mountain') sunParts.push('zonnebril', 'pet');
  }
  if (snow && kind === 'mountain' && !sunParts.includes('zonnebril')) sunParts.push('zonnebril');
  const hot = T >= R.hotT || feels >= R.hotFeels;
  if (hot) {
    if (!sunParts.includes('pet')) sunParts.push('pet');
    sunParts.push('water mee');
  }

  // A pleasant day: one line and done.
  const outerParts = outerSentences();
  const feetText = feetSentence();
  const pleasant = T >= R.pleasantFrom && T < R.pleasantTo && !wet && !shower && !windy && !input.dark && sunParts.length === 0 && !feetText && !startText;
  if (pleasant) {
    // On a walk the trousers are a given (torso() only names legs from 22), so just the shirt.
    return { lines: [walk ? 'Shirt, meer is niet nodig.' : 'Shirt en korte broek, meer is niet nodig.'], packLine };
  }

  // Romp en benen.
  lines.push({ slot: 'body', text: sentence(joinNL(torso())) + (startText ? ` ${startText}` : '') });

  // Handen en hoofd.
  const hands = Th < R.glovesWarm ? 'warmere handschoenen of wanten' : Th < R.glovesThin ? 'dunne handschoenen' : undefined;
  const head = Th < R.headHat ? 'muts die je oren bedekt' : Th < R.headBand ? 'oorband of dunne muts' : undefined;
  const skin = feels <= R.skinCoverFeels ? 'Bedek blote huid, ook je gezicht en oren.' : undefined;
  if (hands || head || skin) {
    const items = [hands, head].filter((p): p is string => !!p);
    const parts = [...(items.length ? [sentence(joinNL(items))] : []), ...(skin ? [skin] : [])];
    lines.push({ slot: 'ext', text: parts.join(' '), hands, head, skin });
  }

  if (outerParts.length) lines.push({ slot: 'outer', text: outerParts.join(' ') });
  if (feetText) lines.push({ slot: 'feet', text: feetText });
  if (sunParts.length) lines.push({ slot: 'sun', text: sentence(joinNL(sunParts)) });
  if (input.dark) lines.push({ slot: 'dark', text: darkText(kind) });

  // Too many: sun goes first, then the head, then the feet. Never the trunk.
  const drop = (slot: Slot) => {
    const i = lines.findIndex((l) => l.slot === slot);
    if (i >= 0) lines.splice(i, 1);
  };
  if (lines.length > R.maxLines) drop('sun');
  if (lines.length > R.maxLines) {
    const ext = lines.find((l) => l.slot === 'ext');
    if (ext) {
      const rest = [ext.hands].filter((p): p is string => !!p);
      const parts = [...(rest.length ? [sentence(joinNL(rest))] : []), ...(ext.skin ? [ext.skin] : [])];
      if (parts.length === 0) drop('ext');
      else ext.text = parts.join(' ');
    }
  }
  if (lines.length > R.maxLines) drop('feet');

  return { lines: lines.map((l) => l.text), packLine, darkShown: lines.some((l) => l.slot === 'dark') };

  // --- pieces, inside so they share T, Th and the flags -------------------------

  function torso(): string[] {
    const items: string[] =
      T >= R.torsoLight ? ['luchtig shirt of singlet in een lichte kleur']
        : T >= R.torsoShort ? ['shirt met korte mouwen']
          : T >= R.torsoThinLong ? ['dun shirt met lange mouwen']
            : T >= R.torsoThermo ? ['thermoshirt met lange mouwen']
              : T >= R.torsoSecondLayer ? ['thermoshirt', 'dun vest of fleece']
                : ['thermoshirt', 'warme tweede laag', 'winddichte buitenlaag'];
    // Legs. On a walk the trousers are a given, so only the extremes are said.
    if (T >= R.shortsFrom) {
      if (!walk || T >= R.torsoLight) items.push('korte broek');
    } else if (T < R.torsoSecondLayer) {
      items.push(walk ? 'een tweede laag onder je broek' : 'gevoerde tight');
    } else if (!walk) {
      items.push(bike ? 'lange broek' : 'lange tight');
    }
    return items;
  }

  function outerSentences(): string[] {
    const out: string[] = [];
    if (wet) {
      if (run) {
        out.push(T >= R.rainRunNoJacketFrom ? 'Geen jack nodig, wel een pet met klep.' : 'Dun waterafstotend jack aan.');
      } else if (bike) {
        out.push(minutes > R.rainBikeLongMinutes ? 'Regenjas aan, met een regenbroek of overschoenen.' : 'Regenjas aan.');
      } else {
        out.push('Regenjas aan.');
      }
      if (feels < R.rainDryKitBelowFeels && minutes > R.rainDryKitMinutes) out.push('Neem iets droogs mee voor na afloop.');
      return out;
    }
    if (shower) {
      if (kind === 'rest_walk') out.push('Een regenjack mee.');
      else if (walk) {
        if (!packItemsList?.includes('regenjas')) out.push('Regenjas in de rugzak.');
      }
      else if (minutes >= R.showerLongMinutes) out.push('Een licht jack mee, bijvoorbeeld om je heupen.');
    }
    if (windy && T >= R.torsoSecondLayer) {
      const skipForEffort = (kind === 'intervals' || kind === 'race') && T > R.windSkipIntervalsAbove;
      if (!skipForEffort) {
        if (T < R.windJacketBelow) out.push('Dun windjack aan.');
        else if (walk && !packItemsList?.includes('windjack')) out.push('Windjack in de rugzak.');
      }
    }
    return out;
  }

  function feetSentence(): string | undefined {
    if (bike && feels < R.overshoesFeels) return 'Overschoenen of winddichte sokken.';
    if (walk && snow) return 'Sneeuw: waterdichte schoenen en een droog paar sokken mee.';
    return undefined;
  }
}

function darkText(kind: ClothingKind): string {
  if (kind === 'bike') return 'Licht voor en achter aan, het is verplicht.';
  if (kind === 'mountain') return 'Hoofdlamp met reservebatterij.';
  return 'Hoofdlamp of lampje, en iets reflecterends of fel gekleurds op je romp.';
}

// What goes in the rucksack on a hike (report, "Rugzakzin bij een tocht").
function packItems(input: ClothingInput, minutes: number): string[] | undefined {
  const R = CLOTHING_RULES;
  const { kind } = input;
  const mountain = kind === 'mountain';
  if (!(mountain || (kind === 'ruck_walk' && minutes > R.packMinutes))) return undefined;
  const feels = input.feelsC;
  const windy = input.windKmh >= R.windKmh || input.gustKmh >= R.gustKmh;
  const items: string[] = [];
  if (mountain || feels < R.packWarmLayerBelow) items.push('warme laag');
  if (feels < R.packHatGlovesBelow) items.push('muts', 'handschoenen');
  if (feels < R.packDryShirtBelow) items.push('droog shirt');
  if (mountain || windy) items.push('windjack');
  if (mountain) items.push('regenjas', 'zonnebril');
  if (input.snow) items.push('droge sokken', 'gamaschen');
  return items.length === 0 ? undefined : items;
}

// One sentence about the rucksack, for a hike.
function packSentence(input: ClothingInput, items: string[] | undefined): string | undefined {
  if (!items) return undefined;
  const list = joinNL(items);
  return input.kind === 'mountain' ? `Boven is het kouder en waait het harder, dus in de rugzak: ${list}.` : `In de rugzak: ${list}.`;
}

// --- from a training to an advice -----------------------------------------------

// The whole answer for one training in one call, what a screen needs: the
// weather of the usual hours (weather.ts), then the clothes. Nothing when it
// is no outdoor training, when there is no forecast for that day, or when the
// switch is off (the caller checks that).
export function clothingForTraining(input: {
  forecast: WeatherForecast | undefined;
  template: SessionTemplate;
  logs: SessionLog[];
  date: string;
  durationMinutes: number;
  adjustC?: number;
  now?: Date;
}): ClothingAdvice | undefined {
  const kind = clothingKind(input.template);
  if (!kind) return undefined;
  const w = weatherForTraining({ forecast: input.forecast, template: input.template, logs: input.logs, date: input.date, durationMinutes: input.durationMinutes, now: input.now });
  if (!w) return undefined;
  return clothingFromWeather(w, kind, input.durationMinutes, { heatSession: isHeatSession(input.template), adjustC: input.adjustC });
}

function clothingFromWeather(w: SessionWeather, kind: ClothingKind, minutes: number, opts: { heatSession?: boolean; adjustC?: number } = {}): ClothingAdvice {
  return clothingAdvice({
    kind,
    minutes,
    feelsC: w.feelsC,
    windKmh: w.windKmh,
    gustKmh: w.gustKmh,
    precipMm: w.precipMm,
    precipProb: w.precipProb,
    uvIndex: w.uvIndex,
    dark: !!w.daylight?.lampNeeded,
    snow: w.watch.includes('sneeuw') || w.bad.includes('zware sneeuw'),
    heatSession: opts.heatSession,
    adjustC: opts.adjustC,
  });
}

// The weather line of a training, with the darkness left out when the clothing
// advice (switch on) already has a line about it, so it is not said twice.
export function weatherLineForTraining(input: Parameters<typeof clothingForTraining>[0] & { clothingOn: boolean }): string | undefined {
  const w = weatherForTraining({ forecast: input.forecast, template: input.template, logs: input.logs, date: input.date, durationMinutes: input.durationMinutes, now: input.now });
  if (!w) return undefined;
  if (!input.clothingOn) return w.line;
  const advice = clothingForTraining(input);
  return advice?.darkShown ? weatherLine(w, { darkInClothing: true }) : w.line;
}
