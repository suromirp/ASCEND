// ASCEND: de doelsoorten als gegevens (ronde 2a). Een doelsoort zegt wat een doel
// minstens vraagt per soort training, hoe lang de opbouw duurt, hoe lang de afbouw
// per belangrijkheid, hoe lang het herstel erna, en welke meters bij "Klaar voor je
// doel" horen (engine/goalReadiness.ts rekent ze uit).
//
// Elk getal heeft een bewijslabel en een verwijzing naar het onderzoek:
//   sterk     meerdere RCT's of meta-analyses, of een richtlijn met hoge aanbevelingsgraad
//   matig     een goede meta-analyse of trial, of een groot cohort
//   zwak      klein, observationeel, indirect of alleen een samenvatting gelezen
//   expert    coaches, gidsen en aanbieders van plannen, zonder uitkomstdata
//   afgeleid  eigen rekenwerk of redenering uit de bronnen (een startwaarde)
// Trail, fietsen, triathlon en mountaineering zijn dun onderbouwd; hun labels zijn
// daarom vooral expert, zwak of afgeleid. Dat staat hier eerlijk, ook al is het minder mooi.
//
// Dit bestand importeert alleen typen uit models/, zodat iedereen het kan lezen.

import type { GoalDetails, GoalKindId, GoalPriority } from '../models/goals';

export type EvidenceLabel = 'sterk' | 'matig' | 'zwak' | 'expert' | 'afgeleid';

export const BERG = 'docs/onderzoek/Doelsoorten berg en buiten.md';
export const DUUR = 'docs/onderzoek/Doelsoorten duur.md';

export interface Sourced<T> {
  value: T;
  evidence: EvidenceLabel;
  source: string; // bestand en deel
}

// Een getal met per variant (bijvoorbeeld '10k', 'ultra') een eigen waarde.
export interface Varied<T> {
  base: Sourced<T>;
  variants?: Record<string, Sourced<T>>;
}

export const src = (file: string, part: string) => `${file}, ${part}`;
const s = <T>(value: T, evidence: EvidenceLabel, source: string): Sourced<T> => ({ value, evidence, source });
const v = <T>(base: Sourced<T>, variants?: Record<string, Sourced<T>>): Varied<T> => ({ base, variants });

// --- soorten training -------------------------------------------------------

export type SessionMinimumKind =
  | 'strength' | 'easy_endurance' | 'long_day' | 'hard_session' | 'pack_session' | 'descent_stimulus'
  | 'back_to_back' | 'long_run' | 'hill_session' | 'brick' | 'swim' | 'bike_long' | 'weekly_volume' | 'guideline';

export interface SessionMinimum {
  session: SessionMinimumKind;
  label: string;
  amount: { min: number; max?: number };
  per: 'week' | 'maand' | 'laatste 8 weken' | 'laatste 12 weken';
  evidence: EvidenceLabel;
  source: string;
  note?: string;
}

const min = (
  session: SessionMinimumKind, label: string, amount: SessionMinimum['amount'], per: SessionMinimum['per'],
  evidence: EvidenceLabel, source: string, note?: string,
): SessionMinimum => ({ session, label, amount, per, evidence, source, note });

// --- wat de gebruiker invult --------------------------------------------------

export interface GoalInputSpec {
  key: keyof GoalDetails;
  label: string;
  unit?: 'km' | 'm' | 'dagen' | 'kg' | 'min' | 'keuze';
  required: boolean;
}

const input = (key: keyof GoalDetails, label: string, unit: GoalInputSpec['unit'], required = false): GoalInputSpec => ({ key, label, unit, required });

// --- meters ---------------------------------------------------------------------

export type MeterType = 'beste_dag' | 'reeks' | 'volume_of_trend' | 'versheid';

// Wat een meter uit de logs meet. De eerste zes volgen de oude GR5-meters
// (engine/standing.ts#routeDayRows), de rest is nieuw.
export type MeterMetric =
  | 'rugzak' | 'langsteDag' | 'stijgenDalen' | 'stijgen' | 'dalen' | 'dagenOpRij' // de route-meters
  | 'langsteMinuten' | 'langsteKm' | 'weekMinuten' | 'weekKm' | 'weekStijgen' | 'afdalenVers' | 'krachtdagen' | 'reeksDagen'
  | 'extern'; // niet uit logs te halen hier: de aanroeper levert hem aan (volhouden, testloop, krachttrend ...)

// Hoe 100% volgt uit wat de gebruiker invulde (of uit een richtlijn).
export type NeedRule =
  | { from: 'detail'; key: keyof GoalDetails; dayShare?: boolean } // 100% is het ingevulde getal, bij een dagdoel keer het dagaandeel
  | { from: 'hikingDay'; dayShare?: boolean } // de DIN-tijd van de dag (of de verwachte tijd), bij een dagdoel keer het dagaandeel
  | { from: 'fixed'; value: number; byVariant?: Record<string, number> }
  | { from: 'fractionOf'; key: keyof GoalDetails; factor: number; max?: number; variants?: Record<string, { factor: number; max?: number }>; fallback?: number } // fallback: de waarde als het doel het getal niet heeft
  | { from: 'guideline'; key: keyof GoalDetails; value: number } // de richtlijn, de gebruiker mag hem verhogen
  | { from: 'external' };

export type MeterSport = 'hiking' | 'running' | 'cycling' | 'swimming' | 'strength';

export interface MeterSpec {
  id: string;
  label: string;
  type: MeterType;
  metric: MeterMetric;
  unit: 'kg' | 'min' | 'm' | 'dagen' | 'km' | 'aandeel';
  sports: readonly MeterSport[]; // welke logs tellen; leeg = alle uithoudingssporten
  windowDays: Sourced<number>;
  need: Sourced<NeedRule>;
  // Voor reeks: minimale duur van een dag die meetelt, en de grens van wat je thuis oefent.
  minDayMinutes?: number;
  // Een dag telt vanaf dit aandeel van de geplande dagafstand (totale afstand gedeeld door het aantal dagen),
  // als die is ingevuld; anders geldt minDayMinutes.
  dayDistanceShare?: Sourced<number>;
  // Voor versheid: een afdaling telt vanaf zoveel meter dalen (standaard 100).
  minDescentM?: number;
  homeDays?: number;
  // De meter telt alleen mee als dit waar is (anders is hij niet van toepassing, niet ontbrekend).
  appliesWhen?: { key: keyof GoalDetails; atLeast?: number; atMost?: number } | { variant: readonly string[] };
  // Sport die er nog niet is (zwemmen, ronde 4): dan is de meter nog niet meetbaar.
  needsSport?: string;
  measure: string; // hoe hij uit de logs wordt gemeten
  full: string; // hoe 100% volgt
  why: string; // één zin: waarom deze meter meetelt
}

// --- de definitie ----------------------------------------------------------------

export interface VariantSpec {
  id: string;
  label: string;
}

export interface GoalKindDefinition {
  id: GoalKindId;
  label: string;
  group: 'berg' | 'duur' | 'kracht' | 'fit';
  summary: string;
  variants: readonly VariantSpec[];
  inputs: readonly GoalInputSpec[];
  // Een datum hoort bij de soort (fit blijven heeft er geen).
  needsDate: boolean;
  // Bij een doel van één lange dag volgt 100% een aandeel van de doeldag (deel 2.2 van het onderzoek).
  dayShare: boolean;
  // Het aantal dagen achter elkaar dat je thuis oefent.
  homeDaysInRow?: Sourced<number>;
  buildWeeks: { min: Varied<number>; recommended: Varied<number> };
  taperDays: Record<GoalPriority, Varied<number>>;
  recovery: Varied<{ days: number; perTripDay?: number; maxDays?: number }>;
  minimums: readonly SessionMinimum[];
  meters: readonly MeterSpec[];
  // Wat de meters niet meten, en een vaste verwijzing waar dat past.
  caution?: string;
}

// --- gedeelde stukken --------------------------------------------------------------

const B = (part: string) => src(BERG, part);
const D = (part: string) => src(DUUR, part);

const WINDOW_56 = s(56, 'expert', B('1, de vensters van de tochtmeters'));
const WINDOW_42 = s(42, 'afgeleid', D('3.4 en 4.4, de laatste 6 weken'));
const WINDOW_28 = s(28, 'afgeleid', D('2, gedeelde regel 8, de laatste 28 dagen'));
const WINDOW_84 = s(84, 'afgeleid', D('4.3, de laatste 12 weken'));

// Afbouw per belangrijkheid. Verkenning krijgt nooit afbouw.
const noTaper = v(s(0, 'afgeleid', 'docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md, Meedoen: geen afbouw'));
const taper = (top: Varied<number>, voortop: Varied<number>): Record<GoalPriority, Varied<number>> => ({ top, voortop, verkenning: noTaper });

const guidelineMinimum = min('guideline', 'Rustige duur, minstens de beweegrichtlijn', { min: 150 }, 'week', 'sterk', B('2.3, rustige duur: WHO 2020 en Gezondheidsraad 2017'));
const strengthOneTwo = min('strength', 'Krachttraining', { min: 1, max: 2 }, 'week', 'matig', B('2.3, kracht: Knapik 2012 en Schumann 2022'));

// De vier meters van een meerdaagse tocht (dit is wat de GR5 al deed). Een meer
// 'extern' bij het volhouden komt niet in de tochtmeters: de oude meter had hem niet.
const trekMeters = (homeDays: number, homeSource: string): MeterSpec[] => [
  {
    id: 'rugzak', label: 'Rugzak', type: 'beste_dag', metric: 'rugzak', unit: 'kg', sports: ['hiking'], windowDays: WINDOW_56,
    need: s({ from: 'detail', key: 'packKg' }, 'expert', B('4 (4) en 5 (4), rugzak')),
    measure: 'Je zwaarste rugzak op een wandeling van de laatste acht weken.',
    full: 'Het rugzakgewicht dat je bij je tocht invulde.',
    why: 'De rugzak is de grootste beperking van een tocht, vaak meer dan je conditie.',
  },
  {
    id: 'langsteDag', label: 'Langste dag', type: 'beste_dag', metric: 'langsteDag', unit: 'min', sports: ['hiking'], windowDays: WINDOW_56,
    need: s({ from: 'hikingDay' }, 'expert', B('2.2, een meerdaagse tocht houdt het aandeel op 1,0')),
    measure: 'Je langste wandeling (tijd op pad) van de laatste acht weken.',
    full: 'Een gewone dag van de tocht, uit afstand, stijgen en dalen (DIN 33466).',
    why: 'De dagen herhalen zich zonder herstel, dus de gewone dag moet los kunnen.',
  },
  {
    id: 'hoogte', label: 'Stijging en daling', type: 'beste_dag', metric: 'stijgenDalen', unit: 'm', sports: ['hiking'], windowDays: WINDOW_56,
    need: s({ from: 'detail', key: 'gainM' }, 'expert', B('4 (4), stijgen en dalen')),
    measure: 'Je grootste dag omhoog en je grootste dag omlaag van de laatste acht weken.',
    full: 'Een gewone dag van de tocht omhoog en omlaag.',
    why: 'Bergaf kost je benen meer dan bergop, daarom tellen allebei.',
  },
  {
    id: 'dagen', label: 'Dagen achter elkaar', type: 'reeks', metric: 'dagenOpRij', unit: 'dagen', sports: ['hiking'], windowDays: WINDOW_56,
    minDayMinutes: 90, homeDays,
    need: s({ from: 'detail', key: 'days' }, 'expert', homeSource),
    measure: 'Je langste reeks lange wandeldagen (minstens anderhalf uur) van de laatste acht weken.',
    full: 'Het aantal dagen van de tocht, met een grens op wat je thuis kunt oefenen.',
    why: 'Er is geen onderzoek naar dagen achter elkaar bij recreanten; het is oefenen met voeten, eten en slapen.',
  },
];

const volhouden = (why = 'Wat je doet telt zwaarder dan wat je plande.'): MeterSpec => ({
  id: 'volhouden', label: 'Volhouden', type: 'volume_of_trend', metric: 'extern', unit: 'aandeel', sports: [], windowDays: WINDOW_28,
  need: s({ from: 'external' }, 'afgeleid', D('2, gedeelde regel 8 en 3.4 meter 4: de bestaande lat van recentAdherence')),
  measure: 'Het aandeel geplande trainingen dat je deed (engine/onCourse.ts#recentAdherence).',
  full: '80% of meer van wat gepland was.',
  why,
});

// --- de soorten ------------------------------------------------------------------------

const TREK_VARIANTS: VariantSpec[] = [
  { id: 'kort', label: 'Tot en met 3 dagen' },
  { id: 'gewoon', label: '4 tot 10 dagen' },
  { id: 'lang', label: 'Meer dan 10 dagen' },
];

const TREK_HUT: GoalKindDefinition = {
  id: 'trek_hut',
  label: 'Meerdaagse tocht met hutten',
  group: 'berg',
  summary: 'Meerdere dagen lopen met een rugzak en een bed onderweg.',
  variants: TREK_VARIANTS,
  inputs: [
    input('days', 'Hoeveel dagen?', 'dagen', true), input('distanceKm', 'Afstand', 'km', true), input('gainM', 'Omhoog (D+)', 'm', true),
    input('lossM', 'Omlaag (D-)', 'm', true), input('packKg', 'Hoe zwaar is je rugzak?', 'kg'), input('shelter', 'Hut of tent', 'keuze'), input('highestPointM', 'Hoogste punt', 'm'),
  ],
  needsDate: true,
  dayShare: false,
  homeDaysInRow: s(2, 'expert', B('4 (4), bovengrens van 2 dagen voor hut')),
  buildWeeks: {
    min: v(s(12, 'afgeleid', B('4 (2)')), { kort: s(8, 'afgeleid', B('4 (2)')), lang: s(16, 'afgeleid', B('4 (2)')) }),
    recommended: v(s(16, 'matig', B('4 (2), 12 weken uit de peesaanpassing (Bohm 2015)')), { kort: s(12, 'matig', B('4 (2), Bohm 2015')), lang: s(20, 'afgeleid', B('4 (2)')) }),
  },
  taperDays: taper(v(s(10, 'afgeleid', B('4 (3), tussen een dag (7) en de GR5')) ), v(s(3, 'afgeleid', B('2.5, Belangrijk 3 of 4 dagen')))),
  recovery: v(s({ days: 3, perTripDay: 0.5, maxDays: 14 }, 'expert', B('2.6, de helft van het aantal tochtdagen, hoogstens 14'))),
  minimums: [
    strengthOneTwo,
    min('easy_endurance', 'Wandelvolume als rustige duur', { min: 150 }, 'week', 'sterk', B('2.3, rustige duur')),
    min('pack_session', 'Rugzaksessie', { min: 2, max: 4 }, 'maand', 'matig', B('2.3, A1 tot A3 in de eerdere rapporten')),
    min('descent_stimulus', 'Afdaalprikkel', { min: 1 }, 'week', 'matig', B('2.3, elke 7 tot 14 dagen, nooit meer dan 21')),
    min('long_day', 'Lange dag op 100% van een gewone dag', { min: 1 }, 'week', 'expert', B('4 (1)'), 'In de specifieke periode.'),
    min('back_to_back', 'Weekend met twee lange dagen', { min: 2 }, 'laatste 8 weken', 'expert', B('4 (1)')),
  ],
  meters: trekMeters(2, B('4 (4), bovengrens van 2 dagen voor hut')),
};

const TREK_TENT: GoalKindDefinition = {
  ...TREK_HUT,
  id: 'trek_tent',
  label: 'Meerdaagse tocht met tent',
  summary: 'Meerdere dagen lopen met een volle rugzak en je eigen slaapplek.',
  variants: [
    { id: 'kort', label: '1 tot 3 nachten' },
    { id: 'gewoon', label: '4 tot 10 dagen' },
    { id: 'lang', label: 'Meer dan 10 dagen' },
  ],
  homeDaysInRow: s(3, 'expert', B('5 (4), bovengrens van 3 dagen voor tent')),
  buildWeeks: {
    min: v(s(16, 'afgeleid', B('5 (2), de waarden van hut plus 4 weken')), { kort: s(6, 'afgeleid', B('5 (2), kamperen van 1 tot 3 nachten')), lang: s(20, 'afgeleid', B('5 (2)')) }),
    recommended: v(s(20, 'afgeleid', B('5 (2)')), { kort: s(10, 'afgeleid', B('5 (2)')), lang: s(24, 'afgeleid', B('5 (2)')) }),
  },
  taperDays: taper(v(s(14, 'expert', B('5 (3), tent: zwaardere last en slechter herstel')), { kort: s(7, 'expert', B('5 (3), een weekendtrip')) }), v(s(4, 'afgeleid', B('5 (3), Belangrijk 4 dagen')))),
  minimums: [
    ...TREK_HUT.minimums,
    min('pack_session', 'Rugzaksessie met de volle uitrusting', { min: 1 }, 'laatste 8 weken', 'expert', B('5 (1)'), 'Eens per twee weken, en minstens een nacht in de tent met alles erbij vóór de tocht.'),
  ],
  meters: trekMeters(3, B('5 (4), bovengrens van 3 dagen voor tent')),
  caution: 'Voor alleen op pad zonder bereik zie het stuk over noodhulp via satelliet. Water per dag staat in het stuk over zweetverlies.',
};

const DAY_HIKE: GoalKindDefinition = {
  id: 'day_hike',
  label: 'Bergtocht of dagtocht',
  group: 'berg',
  summary: 'Eén lange dag met veel hoogtemeters, zoals een top of een lange klim.',
  variants: [{ id: 'gewoon', label: 'Tot 6 uur en 800 m omhoog' }, { id: 'zwaar', label: 'Zwaarder, tot 10 uur' }],
  inputs: [
    input('distanceKm', 'Afstand', 'km', true), input('gainM', 'Omhoog (D+)', 'm', true), input('lossM', 'Omlaag (D-)', 'm', true),
    input('packKg', 'Dagrugzak', 'kg'), input('highestPointM', 'Hoogste punt', 'm'), input('expectedMinutes', 'Verwachte tijd', 'min'),
  ],
  needsDate: true,
  dayShare: true,
  buildWeeks: {
    min: v(s(6, 'afgeleid', B('3 (2)')), { zwaar: s(10, 'afgeleid', B('3 (2)')) }),
    recommended: v(s(10, 'afgeleid', B('3 (2)')), { zwaar: s(14, 'afgeleid', B('3 (2)')) }),
  },
  taperDays: taper(v(s(7, 'afgeleid', B('3 (3), een dag is een enkele inspanning, korter dan een tocht van weken'))), v(s(3, 'afgeleid', B('3 (3)')))),
  recovery: v(s({ days: 3 }, 'matig', B('2.6, na een dag met veel dalen; 4 tot 5 dagen bij ongewend en 900 m dalen of meer (Bontemps 2020)'))),
  minimums: [
    strengthOneTwo,
    guidelineMinimum,
    min('long_day', 'Lange dag tot het aandeel van de doeldag', { min: 1 }, 'week', 'afgeleid', B('2.2 en 3 (1)'), 'In de specifieke periode.'),
    min('pack_session', 'Rugzaksessie (bij een dagrugzak van 5 kg of meer)', { min: 1 }, 'maand', 'expert', B('3 (1)'), 'Eens per twee weken.'),
    min('descent_stimulus', 'Afdaalprikkel (bij 300 m dalen of meer)', { min: 1 }, 'week', 'matig', B('3 (1), in de laatste 12 weken, elke 7 tot 14 dagen')),
  ],
  meters: [
    {
      id: 'langsteDag', label: 'Langste dag', type: 'beste_dag', metric: 'langsteDag', unit: 'min', sports: ['hiking'], windowDays: WINDOW_56,
      need: s({ from: 'hikingDay', dayShare: true }, 'afgeleid', B('2.2, het aandeel van de doeldag: 1,0 tot 3 uur, 0,6 bij 8 uur, 0,5 vanaf 12 uur')),
      measure: 'Je langste wandeling van de laatste acht weken.',
      full: 'Een aandeel van de verwachte tijd van de doeldag (DIN 33466 of je eigen verwachting).',
      why: 'Niemand loopt de hele doeldag vooraf; ongeveer de helft tot driekwart is genoeg om te weten dat het kan.',
    },
    {
      id: 'hoogte', label: 'Stijging en daling', type: 'beste_dag', metric: 'stijgenDalen', unit: 'm', sports: ['hiking'], windowDays: WINDOW_56,
      need: s({ from: 'detail', key: 'gainM', dayShare: true }, 'afgeleid', B('2.2, hetzelfde aandeel van de doeldag')),
      measure: 'Je grootste dag omhoog en je grootste dag omlaag.',
      full: 'Een aandeel van het stijgen en dalen van de doeldag.',
      why: 'Bergop vraagt spieruithouding, bergaf vraagt tolerantie voor remmen.',
    },
    {
      id: 'rugzak', label: 'Rugzak', type: 'beste_dag', metric: 'rugzak', unit: 'kg', sports: ['hiking'], windowDays: WINDOW_56,
      need: s({ from: 'detail', key: 'packKg' }, 'expert', B('3 (4), alleen als de dagrugzak 5 kg of meer is')),
      appliesWhen: { key: 'packKg', atLeast: 5 },
      measure: 'Je zwaarste rugzak op een wandeling.',
      full: 'Het ingevulde gewicht.',
      why: 'Een rugzak onder 5% van je lichaamsgewicht is geen training.',
    },
    {
      id: 'afdalenVers', label: 'Afdalen vers', type: 'versheid', metric: 'afdalenVers', unit: 'dagen', sports: [], windowDays: s(63, 'zwak', B('3 (4), meter 4: lineair van 14 naar 63 dagen is afgeleid')),
      need: s({ from: 'fixed', value: 14 }, 'matig', B('3 (4), Byrnes 1985 en Maeo 2017')),
      appliesWhen: { key: 'lossM', atLeast: 300 },
      measure: 'Dagen sinds je laatste afdaling van minstens 100 m.',
      full: '100% bij een afdaling in de laatste 14 dagen, lineair omlaag naar 0% bij 63 dagen.',
      why: 'De bescherming van een afdaling is na zes tot negen weken weg.',
    },
  ],
};

const MOUNTAINEERING: GoalKindDefinition = {
  id: 'mountaineering',
  label: 'Mountaineering en alpinisme',
  group: 'berg',
  summary: 'Een zware dag in de hoge bergen, met een vroege start, soms over gletsjer.',
  variants: [{ id: 'gewoon', label: 'Hoge bergtocht' }],
  inputs: [
    input('distanceKm', 'Afstand van de zware dag', 'km', true), input('gainM', 'Omhoog van de zware dag', 'm', true), input('lossM', 'Omlaag van de zware dag', 'm', true),
    input('expectedMinutes', 'Verwachte tijd van de zware dag', 'min'), input('packKg', 'Hoe zwaar is je rugzak?', 'kg'), input('days', 'Hoeveel dagen?', 'dagen'),
    input('highestPointM', 'Hoogste punt', 'm'), input('sleepingPointM', 'Hoogste slaapplek', 'm'),
  ],
  needsDate: true,
  dayShare: true,
  homeDaysInRow: s(2, 'expert', B('6 (4), bovengrens van 2 dagen')),
  buildWeeks: { min: v(s(16, 'expert', B('6 (2), aanbieders van plannen'))), recommended: v(s(24, 'expert', B('6 (2), 4 tot 6 maanden volgens aanbieders'))) },
  taperDays: taper(v(s(14, 'expert', B('6 (3)'))), v(s(4, 'afgeleid', B('6 (3)')))),
  recovery: v(s({ days: 3, perTripDay: 0.5, maxDays: 14 }, 'afgeleid', B('6 (5), herstelweek volgens 2.6; hoogteherstel niet onderzocht'))),
  minimums: [
    min('strength', 'Krachttraining (2 in basis en opbouw, 1 in de specifieke periode)', { min: 1, max: 2 }, 'week', 'matig', B('6 (1)')),
    min('easy_endurance', 'Rustige duur, piekweek van 8 tot 11 uur', { min: 480, max: 660 }, 'week', 'expert', B('6 (1), Uphill Athlete en Alpine Ascents'), 'In minuten.'),
    min('long_day', 'Lange dag met een rugzak van 10 tot 20% van je gewicht', { min: 1 }, 'week', 'expert', B('6 (1)'), 'Vanaf de opbouw.'),
    min('back_to_back', 'Weekend met twee lange dagen', { min: 2, max: 3 }, 'laatste 8 weken', 'expert', B('6 (1)')),
    min('descent_stimulus', 'Afdaalprikkel', { min: 1 }, 'week', 'matig', B('2.3, elke 7 tot 14 dagen')),
  ],
  meters: [
    {
      id: 'langsteDag', label: 'Langste dag', type: 'beste_dag', metric: 'langsteDag', unit: 'min', sports: ['hiking'], windowDays: WINDOW_56,
      need: s({ from: 'hikingDay', dayShare: true }, 'afgeleid', B('2.2, 0,5 bij 12 uur of meer')),
      measure: 'Je langste wandeling van de laatste acht weken.',
      full: 'Een aandeel van de tijd van de zware dag.',
      why: 'Een dag van 10 tot 14 uur oefen je niet in zijn geheel.',
    },
    {
      id: 'stijgen', label: 'Stijgen', type: 'beste_dag', metric: 'stijgen', unit: 'm', sports: ['hiking'], windowDays: WINDOW_56,
      need: s({ from: 'detail', key: 'gainM', dayShare: true }, 'afgeleid', B('6 (4), een proefklim van ongeveer 1.220 m (Alpine Ascents) als maatstaf')),
      measure: 'Je grootste dag omhoog.',
      full: 'Een aandeel van het stijgen van de zware dag.',
      why: 'Spieruithouding bergop verklaart bergprestaties beter dan VO2max.',
    },
    {
      id: 'dalen', label: 'Dalen', type: 'beste_dag', metric: 'dalen', unit: 'm', sports: ['hiking'], windowDays: WINDOW_56,
      need: s({ from: 'detail', key: 'lossM', dayShare: true }, 'afgeleid', B('6 (4)')),
      measure: 'Je grootste dag omlaag.',
      full: 'Een aandeel van het dalen van de zware dag.',
      why: 'Bergaf is de eindsprint van je benen na een lange klim.',
    },
    {
      id: 'rugzak', label: 'Rugzak', type: 'beste_dag', metric: 'rugzak', unit: 'kg', sports: ['hiking'], windowDays: WINDOW_56,
      need: s({ from: 'detail', key: 'packKg' }, 'expert', B('6 (4), 8 tot 12 kg is gebruikelijk')),
      measure: 'Je zwaarste rugzak op een wandeling.',
      full: 'Het ingevulde gewicht.',
      why: 'Met ijzer en een warme jas draag je meer dan op een gewone bergtocht.',
    },
    {
      id: 'dagen', label: 'Dagen achter elkaar', type: 'reeks', metric: 'dagenOpRij', unit: 'dagen', sports: ['hiking'], windowDays: WINDOW_56,
      minDayMinutes: 90, homeDays: 2,
      need: s({ from: 'detail', key: 'days' }, 'expert', B('6 (4), bovengrens van 2')),
      measure: 'Je langste reeks lange wandeldagen.',
      full: 'Het aantal dagen van de tour, met een grens van 2.',
      why: 'Hutten-tochten van twee tot vier dagen vragen herhaalde lange dagen.',
    },
  ],
  caution: 'Dit meet je benen en je uithouding, niet je ervaring op hoogte of op een gletsjer. Volg een cursus van een bergsportvereniging of ga met een gediplomeerde berggids, en overleg bij een medische vraag met een arts. ASCEND geeft geen hoogteadvies.',
};

const RUN_VARIANTS: VariantSpec[] = [
  { id: '5k', label: '5 km' }, { id: '10k', label: '10 km' }, { id: 'half', label: 'Halve marathon' }, { id: 'marathon', label: 'Marathon' },
];

const RUN_RACE: GoalKindDefinition = {
  id: 'run_race',
  label: 'Hardloopwedstrijd',
  group: 'duur',
  summary: 'Een wedstrijd van 5 km tot een marathon.',
  variants: RUN_VARIANTS,
  inputs: [input('variant', 'Afstand', 'keuze', true), input('distanceKm', 'Afstand', 'km'), input('targetMinutes', 'Welke tijd wil je neerzetten?', 'min')],
  needsDate: true,
  dayShare: false,
  buildWeeks: {
    min: v(s(8, 'afgeleid', D('3.2, de 10%-rem laat niet minder toe')), {
      '5k': s(6, 'afgeleid', D('3.2, geen bron: afgeleid van de 10 km')), '10k': s(8, 'expert', D('3.2')),
      half: s(8, 'afgeleid', D('3.2, minstens zes stappen van 10% vanaf 10 km')), marathon: s(14, 'afgeleid', D('3.2, minstens ongeveer 12 stappen van 10%')),
    }),
    recommended: v(s(10, 'expert', D('3.2')), {
      '5k': s(8, 'expert', D('3.2')), '10k': s(10, 'expert', D('3.2')), half: s(12, 'expert', D('3.2')), marathon: s(18, 'expert', D('3.2, Higdon')),
    }),
  },
  taperDays: taper(
    v(s(8, 'afgeleid', D('3.3, midden van 7 tot 10 dagen')), { '5k': s(7, 'expert', D('3.3')), '10k': s(8, 'expert', D('3.3, 7 tot 10 dagen')), half: s(12, 'expert', D('3.3, 10 tot 14 dagen')), marathon: s(18, 'matig', D('3.3, 14 tot 21 dagen, Smyth en Lawlor 2021')) }),
    v(s(4, 'afgeleid', D('2, gedeelde regel 2')), { '5k': s(3, 'afgeleid', D('3.3')), '10k': s(4, 'afgeleid', D('3.3')), half: s(5, 'afgeleid', D('3.3')), marathon: s(7, 'afgeleid', D('3.3')) }),
  ),
  recovery: v(s({ days: 4 }, 'expert', D('3.5')), {
    '5k': s({ days: 3 }, 'expert', D('3.5')), '10k': s({ days: 4 }, 'expert', D('3.5')), half: s({ days: 6 }, 'expert', D('3.5')), marathon: s({ days: 10 }, 'expert', D('3.5, 7 tot 14 dagen')),
  }),
  minimums: [
    min('easy_endurance', 'Rustige loopjes', { min: 2 }, 'week', 'expert', D('3.1')),
    min('long_run', 'Lange loop die groeit', { min: 1 }, 'week', 'expert', D('3.1'), 'Vanaf 10 km; bij 5 km volstaat een loop van 40 tot 50 minuten.'),
    min('hard_session', 'Harde prikkel', { min: 1 }, 'week', 'expert', D('3.1'), 'Vanaf 10 km; intervallen van 2 minuten of langer werken (Wen 2019, sterk voor VO2max).'),
    min('strength', 'Krachttraining', { min: 1 }, 'week', 'sterk', D('2, gedeelde regel 6 (Schumann 2022)')),
  ],
  meters: [
    {
      id: 'verwachteTijd', label: 'Verwachte tijd', type: 'beste_dag', metric: 'extern', unit: 'aandeel', sports: ['running'], windowDays: WINDOW_42,
      need: s({ from: 'external' }, 'matig', D('3.4 meter 1, Riegel tot en met de halve marathon (Vickers en Vertosick 2016)')),
      appliesWhen: { variant: ['5k', '10k', 'half'] },
      measure: 'De wedstrijdtijd uit je laatste testloop of wedstrijd (Riegel), naast je doeltijd.',
      full: 'Gelijk aan of sneller dan je doeltijd; elk procent trager haalt de meter 3 procentpunten omlaag, tot 15% trager.',
      why: 'Voor de marathon voorspelt ASCEND geen tijd, want de formule onderschat daar sterk.',
    },
    {
      id: 'langsteLoop', label: 'Langste loop', type: 'beste_dag', metric: 'langsteKm', unit: 'km', sports: ['running'], windowDays: WINDOW_42,
      need: s({ from: 'fixed', value: 10, byVariant: { '5k': 5, '10k': 10, half: 17.5, marathon: 30 } }, 'expert', D('3.4 meter 2, streefwaarden zijn gewoonte; de middens van de bereiken zijn afgeleid')),
      measure: 'Je langste loop van de laatste 6 weken.',
      full: 'Ongeveer de afstand zelf tot de halve marathon (17,5 km), voor de marathon 30 km.',
      why: 'Het is de mate waarin je het uithoudingsdeel echt gedaan hebt.',
    },
    {
      id: 'weekvolume', label: 'Weekvolume', type: 'volume_of_trend', metric: 'weekKm', unit: 'km', sports: ['running'], windowDays: WINDOW_28,
      need: s({ from: 'fixed', value: 22.5, byVariant: { '5k': 15, '10k': 22.5, half: 30, marathon: 30 } }, 'expert', D('3.4 meter 3; de 30 km voor de marathon is matig (Rasmussen 2013)')),
      measure: 'Het gemiddelde loopvolume per week over de laatste 4 weken.',
      full: 'Een vaste streefwaarde per afstand; 30 km per week is de ondergrens voor een marathon.',
      why: 'Onder 30 km per week gaf een marathon ongeveer twee keer zoveel blessures.',
    },
    volhouden('Het zegt het meest over uitvoering en het minst over aanpassing.'),
  ],
};

const TRAIL: GoalKindDefinition = {
  id: 'trail',
  label: 'Trailrun of bergloop',
  group: 'duur',
  summary: 'Hardlopen in heuvels en bergen, kort of ultra.',
  variants: [{ id: 'kort', label: 'Kort, ongeveer 10 tot 30 km' }, { id: 'ultra', label: 'Ultra, vanaf ongeveer 50 km' }],
  inputs: [input('variant', 'Kort of ultra', 'keuze', true), input('distanceKm', 'Afstand', 'km', true), input('gainM', 'Omhoog (D+)', 'm', true), input('lossM', 'Omlaag (D-)', 'm'), input('expectedMinutes', 'Verwachte tijd', 'min', true)],
  needsDate: true,
  dayShare: false,
  buildWeeks: {
    min: v(s(12, 'afgeleid', B('7 (2)')), { ultra: s(24, 'zwak', D('4.2 en 7 (2): ultra is niet onderbouwd, tussen 20 en 28')) }),
    recommended: v(s(16, 'afgeleid', B('7 (2)')), { ultra: s(28, 'zwak', B('7 (2)')) }),
  },
  taperDays: taper(
    v(s(8, 'afgeleid', D('4.3, 7 tot 10 dagen')), { ultra: s(14, 'expert', D('4.3, 14 tot 21 dagen; geen taperstudie bij ultra')) }),
    v(s(3, 'afgeleid', B('7 (3)'))),
  ),
  recovery: v(s({ days: 4 }, 'expert', D('4.5, 3 tot 5 dagen')), { ultra: s({ days: 12 }, 'expert', D('4.5, 10 tot 14 dagen')) }),
  minimums: [
    min('easy_endurance', 'Rustige loopjes', { min: 2 }, 'week', 'expert', D('4.1')),
    min('long_run', 'Lange loop op tijd, kort tot 2 à 3 uur, ultra tot 4 à 6 uur', { min: 1 }, 'week', 'expert', D('4.1')),
    min('hill_session', 'Heuvelprikkel', { min: 1 }, 'week', 'expert', D('4.1')),
    min('descent_stimulus', 'Bergafprikkel op loopsnelheid', { min: 1 }, 'week', 'matig', D('4.1, het principe is matig, de getallen zijn expert')),
    min('strength', 'Krachttraining (twee keer bij ultra in de opbouw)', { min: 1, max: 2 }, 'week', 'sterk', B('7 (1), Blagrove 2018')),
    min('back_to_back', 'Twee lange dagen achter elkaar (alleen ultra)', { min: 3, max: 4 }, 'laatste 12 weken', 'expert', D('4.3')),
  ],
  meters: [
    {
      id: 'langsteInspanning', label: 'Langste inspanning', type: 'beste_dag', metric: 'langsteMinuten', unit: 'min', sports: ['running', 'hiking'], windowDays: WINDOW_42,
      need: s({ from: 'fractionOf', key: 'expectedMinutes', factor: 0.875, max: 150, variants: { ultra: { factor: 0.4, max: 360 } } }, 'expert', D('4.4 meter 1, tijd op de benen; de aandelen zijn gewoonte')),
      measure: 'Je langste loop of bergwandeling in tijd, laatste 6 weken.',
      full: 'Kort ongeveer 75 tot 100% van de wedstrijdtijd, hoogstens 2,5 uur; ultra ongeveer 40% van de wedstrijdtijd, hoogstens 6 uur.',
      why: 'Op een trail bepaalt het terrein de snelheid, dus tijd zegt meer dan afstand.',
    },
    {
      id: 'weekuren', label: 'Weekvolume', type: 'volume_of_trend', metric: 'weekMinuten', unit: 'min', sports: ['running', 'hiking'], windowDays: WINDOW_28,
      need: s({ from: 'fixed', value: 180, byVariant: { kort: 180, ultra: 300 } }, 'expert', D('4.4 meter 2; volume als voorspeller is zwak (samenvatting)')),
      measure: 'Het gemiddelde van lopen en bergwandelen per week over de laatste 4 weken.',
      full: 'Kort ongeveer 3 uur, ultra ongeveer 5 uur (onderkant van 5 tot 8 uur).',
      why: 'Volume was in onderzoek bij ultralopers belangrijker dan tempo, maar dat is een samenvatting.',
    },
    {
      id: 'stijgen', label: 'Stijgen', type: 'volume_of_trend', metric: 'weekStijgen', unit: 'm', sports: ['running', 'hiking'], windowDays: WINDOW_42,
      need: s({ from: 'fractionOf', key: 'gainM', factor: 0.6, variants: { ultra: { factor: 0.5 } }, fallback: 2000 }, 'afgeleid', D('4.4 meter 3: een ASCEND-keuze, laagste zekerheid in het stuk; zonder D+ van het doel ongeveer 2.000 m per week (afgeleid)')),
      measure: 'Je beste week aan hoogtemeters omhoog van de laatste 6 weken.',
      full: 'Ongeveer de helft tot 60% van het stijgen van de wedstrijd, in één week. Heeft je doel geen D+, dan ongeveer 2.000 m in een week.',
      why: 'Er is geen onderzoek naar de nodige weekstijging; doe in kleinere porties wat de wedstrijd vraagt.',
    },
    {
      id: 'dalen', label: 'Dalen vers', type: 'versheid', metric: 'afdalenVers', unit: 'dagen', sports: [], windowDays: s(42, 'matig', D('4.4 meter 4, na 6 weken loopt de meter terug naar 0')),
      need: s({ from: 'fixed', value: 21 }, 'afgeleid', D('4.4 meter 4, de laatste prikkel jonger dan 21 dagen; de 21 dagen is een afgeleide marge, de bescherming houdt 6 tot 9 weken stand (matig)')),
      minDescentM: 600,
      appliesWhen: { key: 'lossM', atLeast: 300 },
      measure: 'Dagen sinds je laatste bergafprikkel van minstens 600 m dalen in één training.',
      full: '100% bij een afdaling van 600 m of meer in de laatste 21 dagen, lineair omlaag naar 0% bij 6 weken.',
      why: 'De bescherming tegen spierschade bergaf houdt een tijd stand, maar niet eeuwig.',
    },
    {
      id: 'dagenOpRij', label: 'Dagen achter elkaar', type: 'reeks', metric: 'reeksDagen', unit: 'dagen', sports: ['running', 'hiking'], windowDays: WINDOW_84,
      minDayMinutes: 90, homeDays: 3,
      need: s({ from: 'fixed', value: 3 }, 'expert', D('4.4 meter 5, back-to-backs zijn niet getoetst')),
      appliesWhen: { variant: ['ultra'] },
      measure: 'Je langste reeks dagen van minstens anderhalf uur lopen in de laatste 12 weken.',
      full: 'Drie dagen.',
      why: 'In de ultrawereld gangbaar, maar er is geen studie die laat zien dat het werkt.',
    },
    { ...volhouden(), appliesWhen: { variant: ['kort'] } },
  ],
  caution: 'Het bewijs voor trail is dun. Meters en streefwaarden zijn startwaarden die je kunt aanpassen.',
};

const BIKE: GoalKindDefinition = {
  id: 'bike',
  label: 'Fietstocht of fietswedstrijd',
  group: 'duur',
  summary: 'Een tocht, een wedstrijd, een dag met cols of een meerdaagse reis.',
  variants: [
    { id: 'tocht', label: 'Fietstocht' }, { id: 'wedstrijd', label: 'Wedstrijd' }, { id: 'cols', label: 'Cols en bergen' }, { id: 'reis', label: 'Meerdaagse reis met bagage' },
  ],
  inputs: [
    input('variant', 'Soort', 'keuze', true), input('distanceKm', 'Afstand', 'km', true), input('gainM', 'Omhoog (D+)', 'm'), input('expectedMinutes', 'Verwachte tijd (per dag bij een reis)', 'min', true),
    input('days', 'Hoeveel dagen?', 'dagen'), input('baggageKg', 'Bagage', 'kg'),
  ],
  needsDate: true,
  dayShare: false,
  homeDaysInRow: s(3, 'expert', D('5.4 meter 5, ongeveer 3 dagen')),
  buildWeeks: {
    min: v(s(8, 'afgeleid', D('5.2, zonder bron')), { tocht: s(8, 'afgeleid', D('5.2')), wedstrijd: s(12, 'afgeleid', D('5.2')), cols: s(8, 'afgeleid', B('8.1 (2)')), reis: s(6, 'afgeleid', B('8.2 (2)')) }),
    recommended: v(s(12, 'expert', D('5.2')), { tocht: s(10, 'expert', D('5.2')), wedstrijd: s(16, 'expert', D('5.2')), cols: s(12, 'expert', D('5.2, 12 tot 16 weken')), reis: s(12, 'expert', D('5.2')) }),
  },
  taperDays: taper(
    v(s(8, 'afgeleid', D('5.3, 7 tot 10 dagen')), { tocht: s(8, 'expert', D('5.3')), wedstrijd: s(8, 'expert', D('5.3')), cols: s(12, 'expert', D('5.3, 10 tot 14 dagen')), reis: s(10, 'expert', D('5.3, 7 tot 14 dagen')) }),
    v(s(3, 'afgeleid', B('8.1 (3)')), { cols: s(4, 'afgeleid', D('5.3')) }),
  ),
  recovery: v(s({ days: 3 }, 'expert', D('5.5')), { tocht: s({ days: 3 }, 'expert', D('5.5, 2 tot 3 dagen')), wedstrijd: s({ days: 3 }, 'expert', D('5.5')), cols: s({ days: 4 }, 'expert', D('5.5, 3 tot 5 dagen')), reis: s({ days: 6 }, 'expert', D('5.5, 5 tot 7 dagen')) }),
  minimums: [
    min('strength', 'Krachttraining', { min: 1 }, 'week', 'matig', D('5.1 en 8, Rønnestad en Mujika 2014 (samenvatting gelezen)')),
    min('easy_endurance', 'Rustige ritten van 1 tot 2 uur', { min: 2 }, 'week', 'expert', D('5.1')),
    min('bike_long', 'Lange rit die groeit', { min: 1 }, 'week', 'expert', D('5.1'), 'Hoogstens 15 tot 20% langer per week (afgeleid).'),
    min('hill_session', 'Klimrit met lange klimmen van 20 tot 60 minuten (cols)', { min: 1 }, 'week', 'expert', D('5.1')),
    min('back_to_back', 'Twee tot drie ritten achter elkaar met bagage (reis)', { min: 2 }, 'laatste 8 weken', 'expert', B('8.2 (1)')),
  ],
  meters: [
    {
      id: 'langsteRit', label: 'Langste rit', type: 'beste_dag', metric: 'langsteMinuten', unit: 'min', sports: ['cycling'], windowDays: WINDOW_42,
      need: s({ from: 'fractionOf', key: 'expectedMinutes', factor: 0.8, max: 300, variants: { wedstrijd: { factor: 1 }, cols: { factor: 0.7, max: 300 }, reis: { factor: 1 } } }, 'expert', D('5.4 meter 1, streefwaarden zijn expert')),
      measure: 'Je langste fietsrit in tijd, laatste 6 weken.',
      full: 'Tocht ongeveer 80% van de verwachte tijd, hoogstens 5 uur; wedstrijd en gewone reisdag de volle tijd; cols 70%.',
      why: 'Het is de mate waarin je een lange dag al gemaakt hebt.',
    },
    {
      id: 'weekvolume', label: 'Weekvolume', type: 'volume_of_trend', metric: 'weekMinuten', unit: 'min', sports: ['cycling'], windowDays: WINDOW_28,
      need: s({ from: 'fixed', value: 240, byVariant: { tocht: 240, cols: 360, wedstrijd: 420, reis: 420 } }, 'expert', D('5.4 meter 2; er is geen onderzoek, de uren komen uit gewone plannen')),
      measure: 'Het gemiddelde aan fietstijd per week over de laatste 4 weken.',
      full: 'Tocht 4 uur, cols 6 uur, wedstrijd of reis 7 uur.',
      why: 'Rustig volume is de enige realistische manier om uren op te bouwen.',
    },
    {
      id: 'klimmen', label: 'Klimmen', type: 'volume_of_trend', metric: 'weekStijgen', unit: 'm', sports: ['cycling'], windowDays: WINDOW_42,
      need: s({ from: 'fractionOf', key: 'gainM', factor: 0.5, max: 2500 }, 'afgeleid', D('5.4 meter 3, dezelfde ASCEND-keuze als bij trail: laagste zekerheid')),
      appliesWhen: { variant: ['cols'] },
      measure: 'Je beste week aan hoogtemeters op de fiets van de laatste 6 weken.',
      full: 'Ongeveer de helft van het stijgen van het doel in één week, hoogstens 2.500 m.',
      why: 'Cols zelf zijn niet te oefenen in vlak land; een trainer is plan B.',
    },
    {
      id: 'dagenOpRij', label: 'Dagen achter elkaar', type: 'reeks', metric: 'reeksDagen', unit: 'dagen', sports: ['cycling'], windowDays: s(56, 'expert', D('5.4 meter 5, de laatste 8 weken')),
      minDayMinutes: 120, homeDays: 3,
      dayDistanceShare: s(0.6, 'expert', D('5.4 meter 5, een rit van minstens 60% van de geplande dagafstand')),
      need: s({ from: 'detail', key: 'days' }, 'expert', D('5.4 meter 5')),
      appliesWhen: { variant: ['reis'] },
      measure: 'Je langste reeks dagen met een rit van minstens 60% van de geplande dagafstand (of, zonder afstand en dagen in je doel, van minstens twee uur) in de laatste 8 weken.',
      full: 'Het aantal dagen van de reis, met een grens van 3.',
      why: 'Opeenvolgende dagen stapelen vermoeidheid op; voor fietsen is dat afgeleid van wandelen.',
    },
    {
      id: 'bagage', label: 'Bagage', type: 'beste_dag', metric: 'extern', unit: 'kg', sports: ['cycling'], windowDays: WINDOW_56,
      need: s({ from: 'external' }, 'afgeleid', D('5.4 meter 5: eerst de last, dan de afstand; de app heeft nog geen veld voor bagage op een rit')),
      appliesWhen: { variant: ['reis'] },
      measure: 'De belading op je langste ritten.',
      full: 'Minstens 75% van de geplande bagage.',
      why: 'Een rit met tassen is een andere rit dan een zonder.',
    },
    { ...volhouden(), appliesWhen: { variant: ['tocht', 'wedstrijd', 'cols'] } },
  ],
  caution: 'Voor fietsen is er bijna geen onderzoek naar wat een amateur nodig heeft. Meters en streefwaarden zijn startwaarden. Afdalen op de fiets telt niet als beenbelasting.',
};

const TRIATHLON: GoalKindDefinition = {
  id: 'triathlon',
  label: 'Triathlon',
  group: 'duur',
  summary: 'Zwemmen, fietsen en lopen, van sprint tot halve afstand.',
  variants: [{ id: 'sprint', label: 'Sprint' }, { id: 'olympisch', label: 'Olympisch' }, { id: 'half', label: 'Half' }],
  inputs: [input('variant', 'Afstand', 'keuze', true), input('targetMinutes', 'Welke tijd wil je neerzetten?', 'min')],
  needsDate: true,
  dayShare: false,
  buildWeeks: {
    min: v(s(12, 'afgeleid', D('6.2')), { sprint: s(8, 'expert', D('6.2')), olympisch: s(12, 'expert', D('6.2')), half: s(16, 'expert', D('6.2')) }),
    recommended: v(s(16, 'expert', D('6.2')), { sprint: s(12, 'expert', D('6.2')), olympisch: s(16, 'expert', D('6.2')), half: s(24, 'expert', D('6.2')) }),
  },
  taperDays: taper(
    v(s(8, 'afgeleid', D('6.3')), { sprint: s(6, 'expert', D('6.3, 5 tot 7 dagen')), olympisch: s(8, 'expert', D('6.3, 7 tot 10 dagen')), half: s(12, 'expert', D('6.3, 10 tot 14 dagen')) }),
    v(s(4, 'afgeleid', D('2, gedeelde regel 2')), { sprint: s(3, 'afgeleid', D('2')), olympisch: s(4, 'afgeleid', D('2')), half: s(5, 'afgeleid', D('2')) }),
  ),
  recovery: v(s({ days: 4 }, 'expert', D('6.5')), { sprint: s({ days: 4 }, 'expert', D('6.5, 3 tot 5 dagen')), olympisch: s({ days: 4 }, 'expert', D('6.5')), half: s({ days: 8 }, 'expert', D('6.5, 7 tot 10 dagen')) }),
  minimums: [
    min('swim', 'Zwemsessies', { min: 2 }, 'week', 'expert', D('6.1')),
    min('bike_long', 'Fietssessies', { min: 1, max: 3 }, 'week', 'expert', D('6.1')),
    min('long_run', 'Loopsessies', { min: 1, max: 2 }, 'week', 'expert', D('6.1')),
    min('strength', 'Krachttraining', { min: 1 }, 'week', 'sterk', D('2, gedeelde regel 6 (Schumann 2022)')),
    min('brick', 'Koppeltraining, fiets gevolgd door een korte loop', { min: 1 }, 'laatste 8 weken', 'zwak', D('6.1, het bewijs is klein: gewoonte'), 'Eens per 1 tot 2 weken in de laatste 8 weken.'),
  ],
  meters: [
    {
      id: 'langsteZwemmen', label: 'Langste zwemmen', type: 'beste_dag', metric: 'extern', unit: 'km', sports: ['swimming'], windowDays: WINDOW_42, needsSport: 'swimming',
      need: s({ from: 'external' }, 'expert', D('6.4 meter 1: zwemmen is er nog niet als sport')),
      measure: 'De langste aaneengesloten zwemafstand van de laatste 6 weken.',
      full: 'De wedstrijdafstand (sprint 0,75 km, olympisch 1,5 km, half 1,9 km).',
      why: 'Je moet de afstand gezwommen hebben; zwemmen kost weinig lichamelijke belasting.',
    },
    {
      id: 'langsteFiets', label: 'Langste fietsrit', type: 'beste_dag', metric: 'langsteMinuten', unit: 'min', sports: ['cycling'], windowDays: WINDOW_42,
      need: s({ from: 'fixed', value: 80, byVariant: { sprint: 40, olympisch: 80, half: 180 } }, 'afgeleid', D('6.4 meter 2: de fietstijd per afstand is mijn schatting; voor half is meer dan de wedstrijdtijd gangbaar (expert)')),
      measure: 'Je langste fietsrit in tijd, laatste 6 weken.',
      full: 'Sprint 40 minuten, olympisch 80 minuten, half 3 uur.',
      why: 'Het fietsonderdeel is lang genoeg om de benen te belasten voor het lopen.',
    },
    {
      id: 'langsteLoop', label: 'Langste loop', type: 'beste_dag', metric: 'langsteKm', unit: 'km', sports: ['running'], windowDays: WINDOW_42,
      need: s({ from: 'fixed', value: 10, byVariant: { sprint: 5, olympisch: 10, half: 16 } }, 'expert', D('6.4 meter 3')),
      measure: 'Je langste loop van de laatste 6 weken.',
      full: 'De loopafstand; voor half ongeveer 75% van 21,1 km.',
      why: 'Je opbouw voor lopen wordt begrensd door de impact op pezen en botten.',
    },
    {
      id: 'koppel', label: 'Koppeltrainingen', type: 'volume_of_trend', metric: 'extern', unit: 'aandeel', sports: ['cycling', 'running'], windowDays: s(56, 'zwak', D('6.4 meter 4')),
      need: s({ from: 'external' }, 'zwak', D('6.4 meter 4: de meest speculatieve meter van het stuk')),
      measure: 'Het aantal keer fiets gevolgd door loop binnen 30 minuten, loopdeel minstens 10 minuten, in de laatste 8 weken.',
      full: 'Twee voor sprint en olympisch, drie voor half.',
      why: 'Gewoonte, niet getoetst: lopen na fietsen voelt in het begin anders.',
    },
    {
      id: 'weekvolume', label: 'Weekvolume', type: 'volume_of_trend', metric: 'weekMinuten', unit: 'min', sports: ['running', 'cycling', 'hiking'], windowDays: WINDOW_28,
      need: s({ from: 'fixed', value: 360, byVariant: { sprint: 240, olympisch: 360, half: 480 } }, 'expert', D('6.4 meter 5, de onderkant van de bandbreedte van coachsites')),
      measure: 'De totale trainingstijd per week over de laatste 4 weken (zwemmen telt mee zodra het kan).',
      full: 'Sprint 4 uur, olympisch 6 uur, half 8 uur.',
      why: 'De uren zijn een ondergrens, geen doel om te overtreffen.',
    },
  ],
  caution: 'Voor triathlon is er nauwelijks onderzoek; de meeste getallen komen uit coachplannen. Zwemmen is nog geen sport in ASCEND: die meter wordt genoemd maar telt niet mee.',
};

const STRONGER: GoalKindDefinition = {
  id: 'stronger',
  label: 'Sterker worden',
  group: 'kracht',
  summary: 'Kracht is het hoofddoel, duur loopt mee op onderhoud.',
  variants: [],
  inputs: [input('strengthTargets', 'Hoofdoefeningen met een doel (gewicht en herhalingen)', 'keuze', true)],
  needsDate: false,
  dayShare: false,
  buildWeeks: { min: v(s(0, 'afgeleid', B('10 (2), geen minimum'))), recommended: v(s(8, 'zwak', B('10 (2), een horizon van minstens 8 weken om te toetsen'))) },
  taperDays: taper(v(s(7, 'afgeleid', B('10 (3), alleen vóór een testweek, afgeleid van Bosquet'))), v(s(0, 'afgeleid', B('10 (3)')))),
  recovery: v(s({ days: 3 }, 'matig', B('10 (5), 2 tot 3 dagen lichter na een zware testweek (Morán-Navarro 2017)'))),
  minimums: [
    min('strength', 'Elke grote spiergroep', { min: 2 }, 'week', 'sterk', B('10 (1), ACSM 2026 en Schoenfeld 2019')),
    min('weekly_volume', 'Harde sets per spiergroep', { min: 10, max: 20 }, 'week', 'sterk', B('10 (1)'), 'Een ontwerpstreefwaarde, geen eis.'),
    min('easy_endurance', 'Duur op onderhoud', { min: 150 }, 'week', 'sterk', B('10 (1), 150 minuten matig')),
  ],
  meters: [
    {
      id: 'krachttrend', label: 'Krachttrend', type: 'volume_of_trend', metric: 'extern', unit: 'aandeel', sports: ['strength'], windowDays: s(28, 'matig', B('10 (4) meter 1, KR-2')),
      need: s({ from: 'external' }, 'matig', B('10 (4) meter 1: gewicht maal herhalingen, geschat maximum (KR-1)')),
      measure: 'Je beste set van de laatste 4 weken per hoofdoefening, omgerekend naar een geschat maximum.',
      full: 'Het doel dat je invulde als gewicht maal herhalingen.',
      why: 'Het toont "nog 7 kg voor 5 herhalingen", nooit "je max is".',
    },
    {
      id: 'hardeSets', label: 'Harde sets per spiergroep', type: 'volume_of_trend', metric: 'extern', unit: 'aandeel', sports: ['strength'], windowDays: s(28, 'matig', B('10 (4) meter 2')),
      need: s({ from: 'external' }, 'sterk', B('10 (4) meter 2, 10 sets per week (ACSM 2026)')),
      measure: 'Het deel van je spiergroepen dat gemiddeld 10 harde sets per week haalt (engine/muscleVolume.ts).',
      full: '10 harde sets per spiergroep per week; aanpasbaar.',
      why: 'Volume drijft groei; de ideale hoeveelheid voor kracht zelf is niet vastgesteld.',
    },
    volhouden(),
  ],
  caution: 'De snelheid van krachtwinst is niet vastgesteld. ASCEND rekent nooit om van de ene oefening naar de andere.',
};

const FIT: GoalKindDefinition = {
  id: 'fit',
  label: 'Fit blijven',
  group: 'fit',
  summary: 'Geen datum, geen opbouw: je week tegen de beweegrichtlijn.',
  variants: [],
  inputs: [input('weeklyMinutes', 'Minuten per week (standaard de richtlijn)', 'min'), input('strengthDays', 'Krachtdagen per week (standaard 2)', 'dagen')],
  needsDate: false,
  dayShare: false,
  buildWeeks: { min: v(s(0, 'expert', B('11 (2), geen opbouw'))), recommended: v(s(0, 'expert', B('11 (2)'))) },
  taperDays: taper(v(s(0, 'expert', B('11 (3), geen afbouw'))), v(s(0, 'expert', B('11 (3)')))),
  recovery: v(s({ days: 0 }, 'expert', B('11 (5), niet van toepassing'))),
  minimums: [
    min('guideline', 'Matig bewegen (of 75 minuten intensief)', { min: 150 }, 'week', 'sterk', B('11 (1), WHO 2020, Gezondheidsraad 2017')),
    min('strength', 'Spierversterkende training op minstens twee dagen', { min: 2 }, 'week', 'sterk', B('11 (1)')),
  ],
  meters: [
    {
      id: 'minutenPerWeek', label: 'Minuten per week', type: 'volume_of_trend', metric: 'weekMinuten', unit: 'min', sports: [], windowDays: WINDOW_28,
      need: s({ from: 'guideline', key: 'weeklyMinutes', value: 150 }, 'sterk', B('11 (4) meter 1, WHO 2020')),
      measure: 'Het gemiddelde van de laatste 4 weken aan bewegen. Intensief telt hier nog niet dubbel, want de intensiteit is niet overal gemeten.',
      full: '150 minuten per week; je mag het doel verhogen, of verlagen met het label "onder de richtlijn".',
      why: 'De richtlijn heeft een ondergrens en geen bovengrens.',
    },
    {
      id: 'krachtdagen', label: 'Krachtdagen', type: 'volume_of_trend', metric: 'krachtdagen', unit: 'dagen', sports: ['strength'], windowDays: WINDOW_28,
      need: s({ from: 'guideline', key: 'strengthDays', value: 2 }, 'sterk', B('11 (4) meter 2')),
      measure: 'Het gemiddeld aantal dagen per week met krachttraining over de laatste 4 weken.',
      full: 'Twee dagen per week.',
      why: 'Spierversterkende training op twee dagen hoort bij de richtlijn.',
    },
    volhouden(),
  ],
};

export const GOAL_KINDS: Readonly<Record<GoalKindId, GoalKindDefinition>> = {
  trek_hut: TREK_HUT,
  trek_tent: TREK_TENT,
  day_hike: DAY_HIKE,
  mountaineering: MOUNTAINEERING,
  run_race: RUN_RACE,
  trail: TRAIL,
  bike: BIKE,
  triathlon: TRIATHLON,
  stronger: STRONGER,
  fit: FIT,
};

export const GOAL_KIND_LIST: readonly GoalKindDefinition[] = Object.values(GOAL_KINDS);

export function isGoalKindId(x: unknown): x is GoalKindId {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(GOAL_KINDS, x);
}

// De waarde van een getal voor een variant; zonder (bekende) variant de basiswaarde.
export function pickVaried<T>(varied: Varied<T>, variant?: string): Sourced<T> {
  return (variant ? varied.variants?.[variant] : undefined) ?? varied.base;
}

// De variant van een doel: de ingevulde, anders afgeleid uit de getallen.
export function variantOf(kind: GoalKindId, details?: GoalDetails): string | undefined {
  const d = details ?? {};
  const known = GOAL_KINDS[kind].variants.some((x) => x.id === d.variant);
  if (known) return d.variant;
  switch (kind) {
    case 'trek_hut':
    case 'trek_tent':
      return d.days === undefined ? undefined : d.days <= 3 ? 'kort' : d.days <= 10 ? 'gewoon' : 'lang';
    case 'day_hike': {
      const heavy = (d.gainM ?? 0) > 800 || (d.expectedMinutes ?? 0) > 360;
      return heavy ? 'zwaar' : 'gewoon';
    }
    case 'run_race': {
      if (d.distanceKm === undefined) return undefined;
      return d.distanceKm <= 5.5 ? '5k' : d.distanceKm <= 11 ? '10k' : d.distanceKm <= 22 ? 'half' : 'marathon';
    }
    case 'trail':
      return d.distanceKm === undefined ? undefined : d.distanceKm >= 45 ? 'ultra' : 'kort';
    default:
      return undefined;
  }
}

// De afbouw in dagen voor een doel met deze belangrijkheid.
export function taperDaysFor(kind: GoalKindId, priority: GoalPriority, details?: GoalDetails): Sourced<number> {
  return pickVaried(GOAL_KINDS[kind].taperDays[priority], variantOf(kind, details));
}

// Het herstel in dagen na het doel.
export function recoveryDaysFor(kind: GoalKindId, details?: GoalDetails): Sourced<number> {
  const picked = pickVaried(GOAL_KINDS[kind].recovery, variantOf(kind, details));
  const { days, perTripDay, maxDays } = picked.value;
  const trip = details?.days && details.days > 1 && perTripDay ? Math.ceil(details.days * perTripDay) : 0;
  const total = Math.max(days, trip);
  return { ...picked, value: maxDays !== undefined ? Math.min(total, maxDays) : total };
}

export function buildWeeksFor(kind: GoalKindId, details?: GoalDetails): { min: Sourced<number>; recommended: Sourced<number> } {
  const variant = variantOf(kind, details);
  const def = GOAL_KINDS[kind].buildWeeks;
  return { min: pickVaried(def.min, variant), recommended: pickVaried(def.recommended, variant) };
}

// Elk getal in een definitie met zijn label en bron, voor de tests en voor een scherm
// dat later "hoe zeker is dit" toont.
export function allSourcedNumbers(def: GoalKindDefinition): { where: string; evidence: EvidenceLabel; source: string }[] {
  const out: { where: string; evidence: EvidenceLabel; source: string }[] = [];
  const add = (where: string, x: Sourced<unknown>) => out.push({ where, evidence: x.evidence, source: x.source });
  const addVaried = (where: string, x: Varied<unknown>) => {
    add(where, x.base);
    for (const [k, y] of Object.entries(x.variants ?? {})) add(`${where}.${k}`, y);
  };
  addVaried('buildWeeks.min', def.buildWeeks.min);
  addVaried('buildWeeks.recommended', def.buildWeeks.recommended);
  for (const p of Object.keys(def.taperDays) as GoalPriority[]) addVaried(`taperDays.${p}`, def.taperDays[p]);
  addVaried('recovery', def.recovery);
  if (def.homeDaysInRow) add('homeDaysInRow', def.homeDaysInRow);
  def.minimums.forEach((m, i) => out.push({ where: `minimums.${i}.${m.session}`, evidence: m.evidence, source: m.source }));
  for (const m of def.meters) {
    add(`meters.${m.id}.windowDays`, m.windowDays);
    add(`meters.${m.id}.need`, m.need);
  }
  return out;
}
