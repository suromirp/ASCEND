import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession } from '../models/training';
import type { Objective } from '../models/objectives';
import { makeId } from '../utils/id';
import { addDays, mondayOfWeek, resolveProgramWeek, todayISO } from '../utils/dates';
import { activeSwaps, layoutPhases, patternForWeek } from '../engine/programLayout';
import { DYNAMIC_WARMUP, COOLDOWN_UPPER, COOLDOWN_LOWER, COOLDOWN_RUN, COOLDOWN_RECOVERY } from './stretches';
import { HIKE_DAY_ONE_LADDER, MOUNTAIN_HIKE_LADDER } from './hikeLadder';
import { TENT_PACK_KG, packMilestone } from '../engine/gr5Profile';

// ---------------------------------------------------------------------------
// Session templates: de vaste week. Hoe lang en zwaar een sessie in een
// bepaalde week is, volgt uit weeklyProgression en de fase
// (engine/programLayout.ts). De bergtocht en wandeldag 1 van 2 nemen vanaf
// Bergcapaciteit de plek in van de lange duurloop en de intervallen.
//
// Herzien van 4x kracht + 1x Easy Run + Bergconditie naar een schema waarin
// het weekend het bergspecifieke hardloopblok draagt: Bovenlichaam A/Benen A/Bovenlichaam B
// blijven overeind, maar Benen B en Bergconditie zijn geretired als aparte
// wekelijkse sessies (tpl_lower_b/tpl_bergconditie blijven wél gedefinieerd
// zodat oudere SessionLogs die ernaar verwijzen nog gewoon oplossen — zie
// storage/database.ts syncTemplateAndScheduleDefinitions). Zaterdag +
// zondag vormen samen het beenblok: heuvel-/incline-intervallen (snelheid ×
// D+) gevolgd door een lange duurloop/hike (uithouding × D+, richting zowel
// een marathon als de GR5). Bewust een aaneengesloten, zwaar weekend — geen
// automatische 48u-conflictcheck ertussen (zie engine/scheduler.ts) omdat
// dat "op vermoeide benen" trainen hier het punt is, niet een fout.
// Maandag is daarom de nieuwe rustdag, na het zware weekend.
// ---------------------------------------------------------------------------

// baseStressProfile (Technical Architecture v0.3.1 REVISED, Phase 3): the
// sensible qualitative default for each template's own workout shape,
// derived from what the template's notes/target already say about it (RPE,
// D+/D−, duration, mechanism) — not a new physiological claim, just a
// categorical read of content that already exists above. This is what
// resolveEffectiveStressProfile() falls back to legacyIsLegHeavyToStressProfile()
// for on any template that DOESN'T have one — every template here does.
function buildTemplates(): SessionTemplate[] {
  return [
    {
      id: 'tpl_upper_a',
      name: 'Bovenlichaam A',
      type: 'strength',
      focus: 'Borst • Rug • Schouders',
      durationVariants: { full: 75, short: 45, minimum: 20 },
      // Dinsdag, niet donderdag: Bovenlichaam A en Bovenlichaam B trainen dezelfde spieren
      // (borst, rug, schouders) en horen ~48 uur uit elkaar te liggen, net
      // als twee zware beendagen. Di + vr = 3 dagen ertussen.
      defaultDayOfWeek: 2,
      notes: 'Strength + Hypertrophy. Sets & gewicht bijgehouden in MacroFactor, MacroFactor bepaalt de gymprogressie.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_UPPER,
      baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'moderate', upperBodyLoad: 'heavy', cardioLoad: 'none' },
      exercises: [
        { id: 'ex1', exerciseName: 'Barbell Bench Press', sets: 4, reps: '6-8', priority: 'core' },
        { id: 'ex2', exerciseName: 'Bent-Over Underhand Grip Barbell Row', sets: 4, reps: '8-10', priority: 'core' },
        { id: 'ex3', exerciseName: 'Barbell Overhead Press', sets: 3, reps: '8-10', priority: 'core' },
        { id: 'ex4', exerciseName: 'Underhand Grip Cable Lat Pulldown', sets: 3, reps: '10-12', priority: 'accessory' },
        { id: 'ex5', exerciseName: 'Standing Dumbbell Lateral Raise', sets: 3, reps: '12-15', priority: 'accessory' },
        { id: 'ex6', exerciseName: 'Cable V-Bar Triceps Pushdown', sets: 3, reps: '12-15', priority: 'optional' },
        { id: 'ex7', exerciseName: 'Dumbbell Preacher Curl', sets: 3, reps: '12-15', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_lower_a',
      name: 'Benen A (zwaar)',
      type: 'strength',
      focus: 'Squat • RDL • Hamstrings • Single-leg',
      durationVariants: { full: 75, short: 45, minimum: 20 },
      defaultDayOfWeek: 3,
      // Fase 6 (sports-science review, item F1): sets/reps below are
      // unchanged (well-supported as-is) — the addition is ex13b's
      // controlled-eccentric/unilateral work, and this note. Lange-duur
      // beenuithouding voor de berg wordt primair opgebouwd via wandelen/
      // hiken/rugzaktraining, niet via extra herhalingen in de gym — deze
      // sessie traint kracht en excentrische controle als aanvulling
      // daarop, niet als vervanging.
      notes:
        'Belangrijkste lower strength-training van de week. Sets & gewicht bijgehouden in MacroFactor. Lange-duur beenuithouding voor de berg bouw je primair op via wandelen/hiken/rugzaktraining, deze sessie is een aanvulling daarop (kracht, excentrische controle), geen vervanging.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_LOWER,
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'light', eccentricLoad: 'moderate', intensity: 'high', upperBodyLoad: 'none', cardioLoad: 'none' },
      exercises: [
        { id: 'ex8', exerciseName: 'Barbell Back Squat', sets: 4, reps: '5-8', priority: 'core', notes: 'Of Leg Press, als het rek bezet is.' },
        { id: 'ex9', exerciseName: 'Barbell Romanian Deadlift', sets: 3, reps: '8-10', priority: 'core' },
        { id: 'ex10', exerciseName: 'Seated Hamstring Curl', sets: 3, reps: '10-12', priority: 'accessory' },
        { id: 'ex11', exerciseName: 'Bulgarian Split Squat', sets: 3, reps: '8-10', priority: 'accessory' },
        { id: 'ex13b', exerciseName: 'Step-Down', sets: 3, reps: '8-10 per been', priority: 'accessory', notes: 'Gecontroleerd excentrisch: langzaam neer.' },
        { id: 'ex12', exerciseName: 'Pin-Loaded Leg Press Calf Raise', sets: 3, reps: '12-15', priority: 'optional' },
        { id: 'ex13', exerciseName: 'Plank', sets: 3, reps: '45s', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_upper_b',
      name: 'Bovenlichaam B',
      type: 'strength',
      focus: 'Borst • Rug • Armen',
      durationVariants: { full: 75, short: 45, minimum: 20 },
      defaultDayOfWeek: 5,
      notes: 'Strength + Hypertrophy. Sets & gewicht bijgehouden in MacroFactor.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_UPPER,
      baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'moderate', upperBodyLoad: 'heavy', cardioLoad: 'none' },
      exercises: [
        { id: 'ex14', exerciseName: 'Pin-Loaded Machine Chest Press', sets: 4, reps: '6-8', priority: 'core' },
        { id: 'ex15', exerciseName: '45° Incline Dumbbell Press', sets: 3, reps: '8-10', priority: 'core' },
        { id: 'ex16', exerciseName: 'Chest-Supported Dumbbell Row', sets: 4, reps: '8-10', priority: 'core' },
        { id: 'ex17', exerciseName: 'Neutral Grip Machine-Assisted Pull-Up', sets: 3, reps: '8-10', priority: 'accessory', notes: 'Of Underhand Grip Cable Lat Pulldown.' },
        { id: 'ex18', exerciseName: 'Standing Dumbbell Lateral Raise', sets: 3, reps: '12-15', priority: 'accessory' },
        { id: 'ex19', exerciseName: 'Incline Hammer Curl', sets: 3, reps: '12-15', priority: 'optional' },
        { id: 'ex20', exerciseName: 'Overhead Triceps Extension', sets: 3, reps: '12-15', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_lower_b',
      name: 'Benen B',
      type: 'strength',
      focus: 'Onderlichaam',
      durationVariants: { full: 70, short: 40, minimum: 20 },
      // Geen defaultDayOfWeek meer — vervangen door het zaterdag/zondag
      // beenblok (tpl_hill_intervals + tpl_long_run). Template blijft
      // gedefinieerd zodat oudere SessionLogs die ernaar verwijzen nog
      // gewoon oplossen in History.
      // Fase 6 (sports-science review, item F1): sets/reps below are
      // unchanged (well-supported as-is) — ex22b (step-downs) actually
      // delivers on this template's own long-standing "wordt later hiking-
      // specifieker" note. Lange-duur beenuithouding voor de berg bouw je
      // primair op via wandelen/hiken/rugzaktraining, niet via extra
      // herhalingen in de gym — deze sessie is een aanvulling, geen
      // vervanging.
      notes:
        'MacroFactor bepaalt de daadwerkelijke belasting, niet per definitie lichter dan Benen A. Hiking-specifiek: step-ups, step-downs, single-leg, kuiten/soleus. Lange-duur beenuithouding voor de berg bouw je primair op via wandelen/hiken/rugzaktraining, deze sessie is een aanvulling daarop, geen vervanging.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_LOWER,
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'light', eccentricLoad: 'moderate', intensity: 'high', upperBodyLoad: 'none', cardioLoad: 'none' },
      exercises: [
        { id: 'ex21', exerciseName: 'Goblet Squat', sets: 3, reps: '8-10', priority: 'core', notes: 'Lichter dan op Benen A.' },
        { id: 'ex22', exerciseName: 'Step-Up', sets: 3, reps: '10 per been', priority: 'core' },
        { id: 'ex22b', exerciseName: 'Step-Down', sets: 3, reps: '8-10 per been', priority: 'accessory', notes: 'Gecontroleerd excentrisch: langzaam neer.' },
        { id: 'ex23', exerciseName: 'Seated Single Leg Hamstring Curl', sets: 3, reps: '10-12', priority: 'accessory' },
        { id: 'ex24', exerciseName: 'Seated Pin-Loaded Machine Calf Raise', sets: 3, reps: '12-15', priority: 'accessory' },
        { id: 'ex25', exerciseName: 'Side Plank', sets: 3, reps: '45s', priority: 'optional', notes: 'Per kant.' },
      ],
    },
    {
      id: 'tpl_easy_run',
      name: 'Rustige duurloop',
      type: 'cardio',
      focus: 'Aerobe basis',
      durationVariants: { full: 35, short: 20 },
      // Donderdag: de dag na Benen A, rustig en licht voor de benen, en
      // ruim voor de heuvelintervallen op zaterdag.
      defaultDayOfWeek: 4,
      cardioTarget: { zone: 'RPE 3-4', targetDurationMin: 35 },
      notes:
        "RPE 3-4/10, rustig / conversational pace, volledige zinnen kunnen praten. Geen PR's. Garmin + borstband gebruiken. Doel: aerobe basis, efficiënter leren hardlopen, conditie verbeteren zonder woensdag te slopen.",
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'light', impact: 'moderate', eccentricLoad: 'none', intensity: 'low', upperBodyLoad: 'none', cardioLoad: 'moderate' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 30, note: 'Wennen' },
        { weekInPhase: 2, targetMinutes: 35, note: 'Opbouw' },
        { weekInPhase: 3, targetMinutes: 40, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 27, note: 'Rustweek (25-30 min)' },
      ],
    },
    {
      id: 'tpl_bergconditie',
      name: 'Bergop wandelen',
      type: 'hiking',
      focus: 'Incline of hike, D+ opbouw',
      durationVariants: { full: 50, short: 30 },
      // Geen defaultDayOfWeek meer — opgevolgd door tpl_hill_intervals
      // (scherpere, intervalmatige versie op zaterdag). Template blijft
      // gedefinieerd zodat oudere SessionLogs nog gewoon oplossen.
      outdoorTarget: { targetElevationM: 400 },
      notes:
        'Optie A, incline treadmill: helling 8-15%, snelheid ±4-5,5 km/u, RPE 4-5/10, niet aan de handgrepen hangen. Optie B, buiten hiken: liefst hoogteverschil, rustig tempo, D+ en tijd op de benen bijhouden. Voorlopig voornamelijk rustige aerobe training. Garmin + borstband gebruiken. Zijn de benen erg vermoeid? Maak deze sessie lichter.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'moderate', impact: 'light', eccentricLoad: 'light', intensity: 'moderate', upperBodyLoad: 'none', cardioLoad: 'moderate' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 45, note: 'Wennen' },
        { weekInPhase: 2, targetMinutes: 50, note: 'Opbouw' },
        { weekInPhase: 3, targetMinutes: 60, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 40, note: 'Rustweek (35-45 min)' },
      ],
    },
    {
      id: 'tpl_hill_intervals',
      name: 'Heuvelintervallen',
      type: 'cardio',
      focus: 'Snelheid × D+, bergop intervaltraining',
      durationVariants: { full: 45, short: 30 },
      defaultDayOfWeek: 6,
      cardioTarget: { zone: 'RPE 8-9 op de herhalingen, volledig herstel ertussen' },
      notes:
        'Herhalingen van 30-90 sec bergop (buiten) of op een treadmill op 4-5% helling, op hoge inspanning (RPE 8-9), met ruime rust/rustig afdalen ertussen. Bouwt tegelijk loopsnelheid/-kracht én D+ voor de GR5 op, dit is de kwaliteitssessie van de week, geen rustige duurloop. Minder impact op de knieën/enkels dan vlakke sprints, dankzij de helling.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      // Bergop = grotendeels concentrisch, rustig afdalen ertussen houdt de
      // eccentrische/afdaalbelasting laag — dat is precies waarom deze
      // sessie minder kniebelasting geeft dan vlakke sprints (zie notes).
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'heavy', eccentricLoad: 'light', intensity: 'high', upperBodyLoad: 'none', cardioLoad: 'heavy' },
      // Time-budget scheduling redesign — de bewuste zaterdag/zondag-
      // combinatie met tpl_long_run (zie de programma-toelichting hierboven)
      // als data i.p.v. de oude hardcoded INTENTIONAL_BACK_TO_BACK_TEMPLATE_IDS
      // in engine/scheduler.ts.
      pairingOverride: [
        { withTemplateId: 'tpl_long_run', verdict: 'prefer' },
        { withTemplateId: 'tpl_mountain_hike', verdict: 'prefer' },
      ],
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 35, note: 'Wennen' },
        { weekInPhase: 2, targetMinutes: 40, note: 'Opbouw' },
        { weekInPhase: 3, targetMinutes: 45, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 30, note: 'Rustweek, rustig' },
      ],
    },
    {
      id: 'tpl_long_run',
      name: 'Lange duurloop',
      type: 'hiking',
      // A run toward the marathon, with D+: it counts as running (sports
      // on/off, History totals), its type keeps the outdoor/D+ logging.
      sport: 'running',
      focus: 'Uithouding × D+, richting marathon en GR5',
      durationVariants: { full: 75, short: 45 },
      defaultDayOfWeek: 7,
      outdoorTarget: { targetElevationM: 300 },
      notes:
        'De langste sessie van de week, op vermoeide benen na zaterdag, precies die specificiteit is het doel, niet een fout. Rustig tempo (RPE 3-4/10), De minuten bouwt ASCEND voor je op, nooit meer dan 10% boven je langste loop van de afgelopen maand. Buiten met D+ heeft de voorkeur boven een vlakke route, dit is de sessie die het meest direct naar de GR5 vertaalt.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      // Langste sessie, op al vermoeide benen, met echte D+/D− — cumulatief
      // zwaar voor de benen ondanks de lage RPE (rustig tempo).
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'moderate', intensity: 'low', upperBodyLoad: 'none', cardioLoad: 'heavy' },
      pairingOverride: [{ withTemplateId: 'tpl_hill_intervals', verdict: 'prefer' }],
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 50, note: 'Wennen, rustig tempo' },
        { weekInPhase: 2, targetMinutes: 60, note: 'Opbouw' },
        { weekInPhase: 3, targetMinutes: 70, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 45, note: 'Rustweek (35-45 min, D+ ook lager)' },
      ],
    },
    // Fase 3 — de lange zondag vanaf Bergcapaciteit (engine/programLayout.ts
    // PATTERN_SWAPS): een bergtocht met een eigen ladder voor duur, D+ en
    // rugzak per week (docs/onderzoek rapport 1, "Fase 2 tot en met 4 in
    // getallen"; rapport 2, regels A1-A3). Duur en D+ staan in
    // data/hikeLadder.ts. De rugzak staat daar bewust niet: die klimt in
    // stappen van 1 tot 2 kg naar het rugzakdoel van je doel, nooit in
    // dezelfde week als een D+-stap (engine/packLadder.ts, gelezen door
    // progressionTarget). Geen vaste weekdag: de tocht neemt de plek in van de
    // sessie die hij vervangt.
    {
      id: 'tpl_mountain_hike',
      name: 'Bergtocht',
      type: 'hiking',
      sport: 'hiking',
      focus: 'Tijd op de benen × D+ en D− × rugzak, richting de GR5',
      durationVariants: { full: 180, short: 90 },
      outdoorTarget: { targetElevationM: 500, backpackWeightKg: 6 },
      cardioTarget: { zone: 'Zone 1-2, RPE 3-4: je kunt blijven praten' },
      notes:
        'Een lange wandeling met zoveel mogelijk hoogteverschil, omhoog en omlaag, met de rugzak van deze week. Rustig tempo, eten en drinken onderweg zoals op de GR5. Geen heuvels in de buurt? Herhaal een helling, een trap of een duin, of loop het stijgende deel op de loopband en het dalen op een trap. Ga je mee met stokken op de GR5? Loop er in de tochten van deze weken al mee, dan weten je schouders en polsen wat ze moeten doen.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_LOWER,
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'heavy', intensity: 'low', upperBodyLoad: 'light', cardioLoad: 'moderate' },
      pairingOverride: [
        { withTemplateId: 'tpl_hill_intervals', verdict: 'prefer' },
        { withTemplateId: 'tpl_hike_day_one', verdict: 'prefer' },
      ],
      weeklyProgression: MOUNTAIN_HIKE_LADDER.map((step) => ({ ...step })),
    },
    // Expeditieklaar: de zaterdag wordt de eerste van twee wandeldagen op
    // rij (rapport 1: back-to-back weekend). Bewust gekoppeld aan de
    // bergtocht van zondag, zoals de heuvels aan de lange duurloop. Dezelfde
    // rugzak als de zondag (je draagt je tent elke dag), minder hoogtemeters;
    // de ladder staat in data/hikeLadder.ts.
    {
      id: 'tpl_hike_day_one',
      name: 'Wandeldag 1 van 2',
      type: 'hiking',
      sport: 'hiking',
      focus: 'Twee dagen achter elkaar: morgen weer op pad',
      durationVariants: { full: 150, short: 90 },
      outdoorTarget: { targetElevationM: 400, backpackWeightKg: 8 },
      cardioTarget: { zone: 'Zone 1-2, RPE 3: bewust rustig, morgen volgt dag 2' },
      notes:
        'De eerste van twee wandeldagen, zoals op de GR5. Rustiger dan zondag, met hoogteverschil en dezelfde rugzak als morgen. Het doel is niet deze dag zwaar maken, maar morgen op vermoeide benen weer kunnen vertrekken. Slaap je er een nacht tussen in je tent, dan oefen je ook tent opzetten, koken en slapen, precies wat je op de GR5 elke dag doet.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_LOWER,
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'moderate', intensity: 'low', upperBodyLoad: 'light', cardioLoad: 'moderate' },
      pairingOverride: [{ withTemplateId: 'tpl_mountain_hike', verdict: 'prefer' }],
      weeklyProgression: HIKE_DAY_ONE_LADDER.map((step) => ({ ...step })),
    },
    {
      id: 'tpl_herstel',
      name: 'Herstelwandeling',
      type: 'recovery',
      focus: 'Rust of rustig wandelen',
      durationVariants: { full: 45 },
      defaultDayOfWeek: 1,
      notes: 'Geen zware training, geen hardlopen, geen zware incline. 30-60 min rustig wandelen is prima. Doel: herstellen van het zware weekend (heuvelintervallen + lange duurloop), frisse start van de nieuwe week.',
      // No dynamic warm-up here — Herstel is a light/rest day, not
      // strenuous enough to need the pre-training prep routine.
      cooldown: COOLDOWN_RECOVERY,
      baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'low', upperBodyLoad: 'none', cardioLoad: 'none' },
    },
    // Tussendoel (een hardloopwedstrijd vóór het hoofddoel): in de 8 weken
    // ervoor wordt de rustige duurloop een tempoloop (engine/raceBlock.ts).
    // Geen vaste dag: hij neemt de plek van de rustige duurloop in.
    {
      id: 'tpl_tempo_run',
      name: 'Tempoloop',
      type: 'cardio',
      sport: 'running',
      focus: 'Drempeltempo, richting je wedstrijd',
      durationVariants: { full: 45, short: 30 },
      notes:
        'Rustig inlopen, dan blokken rond je drempel: comfortabel zwaar, je kunt nog korte zinnen zeggen (RPE 6-7, zone 3). Niet harder dan dat: het gaat om lang volhouden, niet om snel. Uitlopen. Houdt je wedstrijdtempo bij, telt ook gewoon als looptraining voor de GR5.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'moderate', impact: 'moderate', eccentricLoad: 'light', intensity: 'moderate', upperBodyLoad: 'none', cardioLoad: 'heavy' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 40, note: 'Wennen aan drempeltempo' },
        { weekInPhase: 2, targetMinutes: 45, note: 'Iets langer op drempel' },
        { weekInPhase: 3, targetMinutes: 50, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 35, note: 'Rustweek' },
      ],
    },
    // Zaterdag in het wedstrijdblok (engine/raceBlock.ts): lange intervallen
    // rond je 5 km-tempo in plaats van de heuvels. Intervallen van 2 minuten
    // of langer verhogen VO2max meer dan rustig lopen (Milanović 2015, Wen
    // 2019; 4 x 4 min, Helgerud 2007). Geen vaste dag: de heuvels' plek.
    {
      id: 'tpl_intervals',
      name: 'Intervallen',
      type: 'cardio',
      sport: 'running',
      focus: 'Snelheid voor je wedstrijd: lange blokken rond je 5 km-tempo',
      durationVariants: { full: 55, short: 40 },
      cardioTarget: { zone: 'Zone 4 in de blokken, ongeveer je 5 km-tempo' },
      notes:
        'Rustig inlopen met een paar versnellingen. Dan blokken van 4 minuten hard: zone 4, ongeveer je 5 km-tempo, alleen nog losse woorden. Ertussen 3 minuten rustig joggen. Uitlopen. Gelijkmatig: het laatste blok even snel als het eerste.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'moderate', impact: 'heavy', eccentricLoad: 'light', intensity: 'high', upperBodyLoad: 'none', cardioLoad: 'heavy' },
      pairingOverride: [{ withTemplateId: 'tpl_long_run', verdict: 'prefer' }],
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 50, note: 'Wennen' },
        { weekInPhase: 2, targetMinutes: 55, note: 'Vier blokken' },
        { weekInPhase: 3, targetMinutes: 60, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 45, note: 'Rustweek' },
      ],
    },
    // Zaterdag, om de twee weken (engine/raceBlock.ts#saturdayTemplate): de
    // heuvels met daarna gecontroleerd afdalen. De GR5 vraagt ±30.000 m
    // dalen; een paar korte afdaalprikkels beschermen weken tegen
    // spierschade, maar na 6 tot 9 weken zonder herhaling is dat weg
    // (repeated bout effect; docs/onderzoek/Trainingsvormen en varianten.md).
    {
      id: 'tpl_hills_descent',
      name: 'Heuvelsprints en afdalen',
      type: 'cardio',
      sport: 'running',
      focus: 'Bergop snelheid, daarna gecontroleerd afdalen voor de GR5',
      durationVariants: { full: 45, short: 30 },
      outdoorTarget: { targetElevationM: 150 },
      notes:
        'Opwarmen, dan een paar keer 1 minuut hard bergop met wandelend terug. Daarna het nieuwe deel: rustig en beheerst naar beneden, telkens opnieuw. Een trappenhuis af (met de lift of rustig omhoog), een duin af, of een heuvel af. Kleine pasjes, knieën licht gebogen, niet rennen. De eerste keren geeft dit spierpijn in je bovenbenen; dat is precies de prikkel, en het wordt snel minder.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'heavy', intensity: 'high', upperBodyLoad: 'none', cardioLoad: 'moderate' },
      pairingOverride: [
        { withTemplateId: 'tpl_long_run', verdict: 'prefer' },
        { withTemplateId: 'tpl_mountain_hike', verdict: 'prefer' },
      ],
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 35, note: 'Kort afdalen' },
        { weekInPhase: 2, targetMinutes: 40, note: 'Op en af' },
        { weekInPhase: 3, targetMinutes: 45, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 35, note: 'Rustweek, kort afdalen' },
      ],
    },
    // Uit de catalogus voor de extra training (engine/extraRun.ts): ASCEND
    // stelt hem voor als de weken ervoor goed gingen. Geen vaste dag: hij komt op de dag
    // die het verst van de zware beendagen ligt.
    {
      id: 'tpl_strides_run',
      name: 'Duurloop met versnellingen',
      type: 'cardio',
      sport: 'running',
      focus: 'Extra rustige kilometers, plus soepel snel leren lopen',
      durationVariants: { full: 35, short: 25 },
      cardioTarget: { zone: 'RPE 3-4, de versnellingen soepel snel' },
      notes:
        'Rustig in zone 2, net als je rustige duurloop. Aan het eind 6 versnellingen van 20 seconden: rustig optrekken tot ongeveer je 5 km-tempo, ontspannen, niet sprinten. Ertussen wandelen of heel rustig joggen tot je weer op adem bent. Een extra loop maakt je week langer zonder dat één loop te lang wordt.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'light', impact: 'moderate', eccentricLoad: 'none', intensity: 'low', upperBodyLoad: 'none', cardioLoad: 'moderate' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 30, note: 'Extra loop' },
        { weekInPhase: 2, targetMinutes: 35, note: 'Extra loop' },
        { weekInPhase: 3, targetMinutes: 35, note: 'Extra loop' },
        { weekInPhase: 4, targetMinutes: 25, note: 'Rustweek' },
      ],
    },
    // De catalogus voor de extra training (engine/extraRun.ts): ASCEND kiest
    // er per week één uit, naar wat je doel het meest nodig heeft, en vraagt
    // eerst je akkoord. Geen vaste dag.
    {
      id: 'tpl_fartlek',
      name: 'Fartlek',
      type: 'cardio',
      sport: 'running',
      focus: 'Snelheid, speels: korte harde stukken in een rustige loop',
      durationVariants: { full: 40, short: 30 },
      cardioTarget: { zone: 'Rustig, met stukken van 1 minuut op 5 tot 10 km-tempo' },
      notes:
        'Rustig inlopen, dan stukken van 1 minuut hard: ongeveer je 5 tot 10 km-tempo, alleen losse woorden. Ertussen anderhalve minuut rustig. Op gevoel mag: een lantaarnpaal of bocht als eindpunt. Uitlopen. Sneller dan je tempoloop, zodat de twee niet hetzelfde trainen.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'light', impact: 'moderate', eccentricLoad: 'none', intensity: 'high', upperBodyLoad: 'none', cardioLoad: 'moderate' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 35, note: 'Wennen' },
        { weekInPhase: 2, targetMinutes: 40, note: 'Iets meer stukken' },
        { weekInPhase: 3, targetMinutes: 40, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 30, note: 'Rustweek' },
      ],
    },
    {
      id: 'tpl_progression_run',
      name: 'Progressieve duurloop',
      type: 'cardio',
      sport: 'running',
      focus: 'Tempo: rustig beginnen, het laatste stuk iets steviger',
      durationVariants: { full: 45, short: 30 },
      cardioTarget: { zone: 'Zone 2, het laatste stuk zone 3' },
      notes:
        'Begin rustig in zone 2. Het laatste stuk (10 tot 20 minuten, staat in je plan) iets steviger, zone 3: korte zinnen lukken nog. Niet harder dan dat, en de laatste minuten weer rustig. Oefent tempo houden op vermoeide benen, zonder een zware training te worden.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'light', impact: 'moderate', eccentricLoad: 'none', intensity: 'moderate', upperBodyLoad: 'none', cardioLoad: 'moderate' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 40, note: 'Wennen' },
        { weekInPhase: 2, targetMinutes: 45, note: 'Opbouw' },
        { weekInPhase: 3, targetMinutes: 45, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 35, note: 'Rustweek' },
      ],
    },
    {
      id: 'tpl_recovery_run',
      name: 'Herstelloop',
      type: 'cardio',
      sport: 'running',
      focus: 'Heel rustig losdraaien',
      durationVariants: { full: 25, short: 20 },
      cardioTarget: { zone: 'Zone 1, RPE 2-3' },
      notes:
        'Heel rustig, langzamer dan je rustige duurloop. Geen tempo, geen doel. Voelen je benen zwaar, dan mag je wandelen of hem overslaan.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'light', impact: 'light', eccentricLoad: 'none', intensity: 'low', upperBodyLoad: 'none', cardioLoad: 'light' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 25, note: 'Herstel' },
        { weekInPhase: 2, targetMinutes: 25, note: 'Herstel' },
        { weekInPhase: 3, targetMinutes: 25, note: 'Herstel' },
        { weekInPhase: 4, targetMinutes: 20, note: 'Rustweek' },
      ],
    },
    {
      id: 'tpl_ruck_walk',
      name: 'Rugzakwandeling',
      type: 'hiking',
      sport: 'hiking',
      focus: 'Lang onderweg met een rugzak, zonder de klap van hardlopen',
      durationVariants: { full: 75, short: 45 },
      outdoorTarget: { backpackWeightKg: 5 },
      notes:
        'Stevig doorwandelen met de rugzak van deze week, heuvels of trappen als dat kan. Deze winter begin je licht, rond 5 tot 6 kilo; het gewicht klimt in kleine stappen naar je rugzakdoel. Rustig, je kunt hele zinnen praten. Bouwt uren onderweg en het dragen van een rugzak op, met veel minder belasting voor je benen dan een loop. Nooit zwaarder dan de rugzak van je bergtocht die week.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'moderate', impact: 'light', eccentricLoad: 'light', intensity: 'low', upperBodyLoad: 'light', cardioLoad: 'moderate' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 60, note: 'Wennen' },
        { weekInPhase: 2, targetMinutes: 75, note: 'Langer onderweg' },
        { weekInPhase: 3, targetMinutes: 90, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 50, note: 'Rustweek' },
      ],
    },
    // Een meetpunt in het tussendoelblok (engine/raceBlock.ts): de week
    // ervoor en vier weken voor de wedstrijd, op de plek van de rustige of
    // de tempoloop.
    {
      id: 'tpl_test_run',
      name: 'Testloop 5 km',
      type: 'cardio',
      sport: 'running',
      focus: 'Je tempo meten',
      durationVariants: { full: 45 },
      notes:
        '10 minuten inlopen, dan 5 km zo snel als je gelijkmatig kunt volhouden, op een vlakke route. Uitlopen. Vul daarna alleen de 5 km in: afstand 5 en de tijd van de test, met de zwaarte die je voelde. Dan weet ASCEND je echte tempo.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'moderate', impact: 'moderate', eccentricLoad: 'light', intensity: 'high', upperBodyLoad: 'none', cardioLoad: 'heavy' },
    },
    {
      id: 'tpl_race',
      name: 'Wedstrijd',
      type: 'cardio',
      sport: 'running',
      focus: 'Je tussendoel',
      durationVariants: { full: 60 },
      notes:
        'Goed inlopen met een paar korte versnellingen. Start iets rustiger dan je doeltempo en versnel in de tweede helft als het gaat. Genieten: dit is waar je voor trainde.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'heavy', eccentricLoad: 'moderate', intensity: 'high', upperBodyLoad: 'none', cardioLoad: 'heavy' },
    },
    // Fase 4 — fietsen. Geen vaste dag in het weekpatroon (geen
    // defaultDayOfWeek): je logt een rit wanneer je fietst, en ASCEND plant
    // er alleen een in als Fietsen aan staat (Instellingen → Training) en de
    // weekplanning erom vraagt. Buiten is de standaard, binnen de
    // uitzondering (modaliteit).
    {
      id: 'tpl_bike',
      name: 'Fietstocht',
      type: 'cardio',
      sport: 'cycling',
      focus: 'Duurvermogen op de fiets',
      durationVariants: { full: 90, short: 45 },
      notes:
        'Grotendeels continu, RPE 3-4/10. Telt mee voor je conditie en, buiten met hoogtemeters, deels voor klimmen. Niet voor tijd op de benen, afdalen of rugzak dragen: daarvoor blijft hiken nodig. Binnen fietsen telt niet mee voor klimmen.',
      // Beenwerk zonder impact of excentrische belasting — geen "zware
      // beendag" voor de 48-uursregel.
      baseStressProfile: { lowerBodyLoad: 'moderate', impact: 'none', eccentricLoad: 'none', intensity: 'low', upperBodyLoad: 'none', cardioLoad: 'moderate' },
    },
  ];
}

// ---------------------------------------------------------------------------
// Program — start op de maandag van deze week, zodat week 1 meteen
// aansluit bij vandaag. Zonder doeldatum zijn het de vier blokken van vier
// weken; zodra het hoofddoel een datum heeft, rekent
// storage/database.ts#syncProgramHorizon de fases terug vanaf die datum
// (engine/programLayout.ts).
// ---------------------------------------------------------------------------

export function buildProgram(): Program {
  const startDate = mondayOfWeek(todayISO());
  return {
    id: 'prog_ascend',
    name: 'ASCEND PROGRAMMA',
    startDate,
    phases: layoutPhases(startDate, undefined, todayISO()),
  };
}

// ---------------------------------------------------------------------------
// Planned sessions — het vaste weekpatroon herhaald over het hele programma.
// MA Herstel · DI Bovenlichaam A · WO Benen A zwaar · DO Easy Run ·
// VR Bovenlichaam B · ZA Heuvel-/Incline-Intervallen · ZO Lange Duurloop,
// vanaf Bergcapaciteit op zondag een bergtocht en in Expeditieklaar op
// zaterdag de eerste van twee wandeldagen.
// ---------------------------------------------------------------------------

function buildPlannedSessions(program: Program, templates: SessionTemplate[]): PlannedSession[] {
  const totalWeeks = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
  const sessions: PlannedSession[] = [];
  // Week 1 starts this Monday, but nothing is planned on the days before the
  // app was installed (production bug: a fresh install opened on Saturday
  // showed five "missed" sessions and a coach asking to catch them up).
  const firstDay = todayISO();
  const pattern = templates.filter((t) => t.defaultDayOfWeek);
  const swaps = activeSwaps(templates, {}, () => true);

  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = addDays(program.startDate, week * 7);
    const phaseId = resolveProgramWeek(program, weekStart)?.phase.id;
    patternForWeek(pattern, templates, swaps, phaseId).forEach(({ template, dayOfWeek }, order) => {
      const date = addDays(weekStart, dayOfWeek - 1);
      if (date < firstDay) return;
      sessions.push({
        id: makeId('planned'),
        templateId: template.id,
        scheduledDate: date,
        weekStartDate: weekStart,
        status: 'planned',
        order,
      });
    });
  }
  return sessions;
}

// ---------------------------------------------------------------------------
// GR5 / Alpine Readiness — herzien op de daadwerkelijke eisen van de Grande
// Traversée des Alpes (±600–620 km, ±30.000 D+, 36–40 etappes), niet alleen
// op D+: afstand, D+, D−, uren op de benen, rugzakgewicht en back-to-back
// herstel tellen allemaal mee. Rich content (waarom/behaald wanneer/bronnen)
// per stap staat in data/gr5Details.ts — zie MilestoneDetailSheet.
//
// Sports-science review (Fase 5, item G1): heringedeeld van één lineaire
// keten in parallelle assen (aerobe basis, tijd-op-de-benen, ascent/D+,
// descent/D− als eigen as, rugzak, meerdaagse belastbaarheid) die
// geïnterleaved staan in plaats van axis-voor-axis — je hoeft niet eerst
// alle D+ te maxen voordat rugzak of meerdaagse training aan bod komen.
// Descent volgt bewust een tempo achter ascent (excentrische tolerantie
// bouwt trager op dan concentrische capaciteit) in plaats van elke D+-stap
// automatisch een gelijke D− te laten eisen. Rugzak start lichter en
// eerder, in plaats van in één late sprong naar het volledige eventgewicht.
// Meerdaagse belastbaarheid start met een lichte 2-dagen-streak vroeg in de
// ladder, met de zwaardere weekend-bergsimulatie als latere capstone.
// Stabiele ids blijven vrijwel allemaal ongewijzigd (alleen de nieuwe
// rugzak-mijlpaal is echt nieuw) zodat storage/goalMilestoneSync.ts al
// bestaande GoalMilestoneProgress-rijen op een al-gemigreerd device zonder
// dataverlies kan laten doorlopen — zie dat bestand.
// ---------------------------------------------------------------------------

export function buildObjective(): Objective {
  const objectiveId = 'obj_gr5';
  const defs: Array<[string, Objective['milestones'][number]['requirement']]> = [
    ['40 min rustig: hardlopen of stevig wandelen', { kind: 'duration', activityType: ['cardio', 'hiking'], minMinutes: 40 }],
    ['60 min bergconditie volhouden', { kind: 'duration', activityType: 'hiking', minMinutes: 60 }],
    ['15 km wandeling', { kind: 'distance', minKm: 15 }],
    ['Twee dagen achter elkaar (licht)', { kind: 'consecutiveDays', days: 2 }],
    ['300 D+', { kind: 'elevation', minMeters: 300 }],
    ['Lichte rugzaktocht: 8 kg, 10 km', { kind: 'backpack', minWeightKg: 8, minKm: 10 }],
    ['500 D+ / 300 D−', { kind: 'elevation', minMeters: 500, minLossMeters: 300 }],
    ['750 D+ / 500 D−', { kind: 'elevation', minMeters: 750, minLossMeters: 500 }],
    ['1000 D+ / 750 D−', { kind: 'elevation', minMeters: 1000, minLossMeters: 750 }],
    ['15 km + 1000 D+', { kind: 'distanceAndElevation', minKm: 15, minMeters: 1000 }],
    // De eis gaat mee met het rugzakdoel (14 kg met tent); een eigen doel
    // zet storage/goalMilestoneSync.ts en de planningssync er later in.
    [packMilestone(TENT_PACK_KG).title, packMilestone(TENT_PACK_KG).requirement],
    ['Weekend bergsimulatie', { kind: 'manual' }],
    ['GR5 KLAAR', { kind: 'manual' }],
  ];

  return {
    id: objectiveId,
    name: 'GR5 / ALPENKLAAR',
    description: 'Opbouw richting een meerdaagse Alpine trektocht zoals de GR5, de Alpenfase uit je eigen schema.',
    milestones: defs.map(([title, requirement], i) => ({
      id: `${objectiveId}_m${i + 1}`,
      objectiveId,
      order: i + 1,
      title,
      requirement,
    })),
  };
}

export function buildDefaultProgramData() {
  const program = buildProgram();
  const templates = buildTemplates();
  const plannedSessions = buildPlannedSessions(program, templates);
  const objective = buildObjective();

  // Clean start — je begint dit schema nu, dus er is bewust geen verzonnen
  // geschiedenis of alvast-behaalde mijlpaal. Week 1 begint op nul.
  return {
    program,
    templates,
    plannedSessions,
    objectives: [objective],
    sessionLogs: [],
    milestoneProgress: [],
  };
}
