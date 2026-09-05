import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession } from '../models/training';
import type { Objective } from '../models/objectives';
import { makeId } from '../utils/id';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';
import { DYNAMIC_WARMUP, COOLDOWN_UPPER, COOLDOWN_LOWER, COOLDOWN_RUN, COOLDOWN_RECOVERY } from './stretches';

// ---------------------------------------------------------------------------
// Session templates — MAAND 1 (BASISFASE).
//
// Herzien van 4x kracht + 1x Easy Run + Bergconditie naar een schema waarin
// het weekend het bergspecifieke hardloopblok draagt: Upper A/Lower A/Upper B
// blijven overeind, maar Lower B en Bergconditie zijn geretired als aparte
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
// D+/D-, duration, mechanism) — not a new physiological claim, just a
// categorical read of content that already exists above. This is what
// resolveEffectiveStressProfile() falls back to legacyIsLegHeavyToStressProfile()
// for on any template that DOESN'T have one — every template here does.
function buildTemplates(): SessionTemplate[] {
  return [
    {
      id: 'tpl_upper_a',
      name: 'Upper A',
      type: 'strength',
      focus: 'Borst • Rug • Schouders',
      durationVariants: { full: 75, short: 45, minimum: 20 },
      defaultDayOfWeek: 5,
      notes: 'Strength + Hypertrophy. Sets & gewicht bijgehouden in MacroFactor — MacroFactor bepaalt de gymprogressie.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_UPPER,
      baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'moderate' },
      exercises: [
        { id: 'ex1', exerciseName: 'Bench press', sets: 4, reps: '6-8', priority: 'core' },
        { id: 'ex2', exerciseName: 'Zittende kabelroeien', sets: 4, reps: '8-10', priority: 'core' },
        { id: 'ex3', exerciseName: 'Overhead press', sets: 3, reps: '8-10', priority: 'core' },
        { id: 'ex4', exerciseName: 'Lat pulldown', sets: 3, reps: '10-12', priority: 'accessory' },
        { id: 'ex5', exerciseName: 'Lateral raises', sets: 3, reps: '12-15', priority: 'accessory' },
        { id: 'ex6', exerciseName: 'Triceps', sets: 3, reps: '12-15', priority: 'optional' },
        { id: 'ex7', exerciseName: 'Biceps', sets: 3, reps: '12-15', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_lower_a',
      name: 'Lower A — Zware Beendag',
      type: 'strength',
      focus: 'Squat • RDL • Hamstrings • Single-leg',
      durationVariants: { full: 75, short: 45, minimum: 20 },
      defaultDayOfWeek: 3,
      notes: 'Belangrijkste lower strength-training van de week. Sets & gewicht bijgehouden in MacroFactor.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_LOWER,
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'light', eccentricLoad: 'moderate', intensity: 'high' },
      exercises: [
        { id: 'ex8', exerciseName: 'Squat / Leg press', sets: 4, reps: '5-8', priority: 'core' },
        { id: 'ex9', exerciseName: 'RDL / hip hinge', sets: 3, reps: '8-10', priority: 'core' },
        { id: 'ex10', exerciseName: 'Hamstrings (leg curl)', sets: 3, reps: '10-12', priority: 'accessory' },
        { id: 'ex11', exerciseName: 'Single-leg (Bulgarian split squat)', sets: 3, reps: '8-10', priority: 'accessory' },
        { id: 'ex12', exerciseName: 'Calves', sets: 3, reps: '12-15', priority: 'optional' },
        { id: 'ex13', exerciseName: 'Core', sets: 3, reps: '45s', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_upper_b',
      name: 'Upper B',
      type: 'strength',
      focus: 'Borst • Rug • Armen',
      durationVariants: { full: 75, short: 45, minimum: 20 },
      defaultDayOfWeek: 4,
      notes: 'Strength + Hypertrophy. Sets & gewicht bijgehouden in MacroFactor.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_UPPER,
      baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'moderate' },
      exercises: [
        { id: 'ex14', exerciseName: 'Chest press / bench', sets: 4, reps: '6-8', priority: 'core' },
        { id: 'ex15', exerciseName: 'Incline press', sets: 3, reps: '8-10', priority: 'core' },
        { id: 'ex16', exerciseName: 'Row', sets: 4, reps: '8-10', priority: 'core' },
        { id: 'ex17', exerciseName: 'Pulldown / pull-up', sets: 3, reps: '8-10', priority: 'accessory' },
        { id: 'ex18', exerciseName: 'Lateral raises', sets: 3, reps: '12-15', priority: 'accessory' },
        { id: 'ex19', exerciseName: 'Biceps', sets: 3, reps: '12-15', priority: 'optional' },
        { id: 'ex20', exerciseName: 'Triceps', sets: 3, reps: '12-15', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_lower_b',
      name: 'Lower B',
      type: 'strength',
      focus: 'Onderlichaam',
      durationVariants: { full: 70, short: 40, minimum: 20 },
      // Geen defaultDayOfWeek meer — vervangen door het zaterdag/zondag
      // beenblok (tpl_hill_intervals + tpl_long_run). Template blijft
      // gedefinieerd zodat oudere SessionLogs die ernaar verwijzen nog
      // gewoon oplossen in History.
      notes:
        'MacroFactor bepaalt de daadwerkelijke belasting — niet per definitie lichter dan Lower A. Wordt later hiking-specifieker: step-ups, step-downs, single-leg, kuiten/soleus.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_LOWER,
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'light', eccentricLoad: 'moderate', intensity: 'high' },
      exercises: [
        { id: 'ex21', exerciseName: 'Squat (lichter)', sets: 3, reps: '8-10', priority: 'core' },
        { id: 'ex22', exerciseName: 'Step-ups', sets: 3, reps: '10 per been', priority: 'core' },
        { id: 'ex23', exerciseName: 'Hamstrings (leg curl)', sets: 3, reps: '10-12', priority: 'accessory' },
        { id: 'ex24', exerciseName: 'Calves / soleus', sets: 3, reps: '12-15', priority: 'accessory' },
        { id: 'ex25', exerciseName: 'Core', sets: 3, reps: '45s', priority: 'optional' },
      ],
    },
    {
      id: 'tpl_easy_run',
      name: 'Easy Run',
      type: 'cardio',
      focus: 'Aerobe basis',
      durationVariants: { full: 35, short: 20 },
      defaultDayOfWeek: 2,
      cardioTarget: { zone: 'RPE 3-4', targetDurationMin: 35 },
      notes:
        "RPE 3-4/10 — rustig / conversational pace, volledige zinnen kunnen praten. Geen PR's. Garmin + borstband gebruiken. Doel: aerobe basis, efficiënter leren hardlopen, conditie verbeteren zonder woensdag te slopen.",
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'light', impact: 'moderate', eccentricLoad: 'none', intensity: 'low' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 30, note: 'Wennen' },
        { weekInPhase: 2, targetMinutes: 35, note: 'Opbouw' },
        { weekInPhase: 3, targetMinutes: 40, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 27, note: 'Deload (25-30 min)' },
      ],
    },
    {
      id: 'tpl_bergconditie',
      name: 'Bergconditie',
      type: 'hiking',
      focus: 'Incline of hike — D+ opbouw',
      durationVariants: { full: 50, short: 30 },
      // Geen defaultDayOfWeek meer — opgevolgd door tpl_hill_intervals
      // (scherpere, intervalmatige versie op zaterdag). Template blijft
      // gedefinieerd zodat oudere SessionLogs nog gewoon oplossen.
      outdoorTarget: { targetElevationM: 400 },
      notes:
        'Optie A — incline treadmill: helling 8-15%, snelheid ±4-5,5 km/u, RPE 4-5/10, niet aan de handgrepen hangen. Optie B — buiten hiken: liefst hoogteverschil, rustig tempo, D+ en tijd op de benen bijhouden. Voorlopig voornamelijk rustige aerobe training. Garmin + borstband gebruiken. Zijn de benen erg vermoeid? Maak deze sessie lichter.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      baseStressProfile: { lowerBodyLoad: 'moderate', impact: 'light', eccentricLoad: 'light', intensity: 'moderate' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 45, note: 'Wennen' },
        { weekInPhase: 2, targetMinutes: 50, note: 'Opbouw' },
        { weekInPhase: 3, targetMinutes: 60, note: 'Zwaarste week' },
        { weekInPhase: 4, targetMinutes: 40, note: 'Deload (35-45 min)' },
      ],
    },
    {
      id: 'tpl_hill_intervals',
      name: 'Heuvel-/Incline-Intervallen',
      type: 'cardio',
      focus: 'Snelheid × D+ — bergop intervaltraining',
      durationVariants: { full: 45, short: 30 },
      defaultDayOfWeek: 6,
      cardioTarget: { zone: 'RPE 8-9 op de herhalingen, volledig herstel ertussen' },
      notes:
        'Herhalingen van 30-90 sec bergop (buiten) of op een treadmill op 4-5% helling, op hoge inspanning (RPE 8-9), met ruime rust/rustig afdalen ertussen. Bouwt tegelijk loopsnelheid/-kracht én D+ voor de GR5 op — dit is de kwaliteitssessie van de week, geen rustige duurloop. Minder impact op de knieën/enkels dan vlakke sprints, dankzij de helling.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      // Bergop = grotendeels concentrisch, rustig afdalen ertussen houdt de
      // eccentrische/afdaalbelasting laag — dat is precies waarom deze
      // sessie minder kniebelasting geeft dan vlakke sprints (zie notes).
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'heavy', eccentricLoad: 'light', intensity: 'high' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 35, note: 'Wennen — 4-5 herhalingen' },
        { weekInPhase: 2, targetMinutes: 40, note: 'Opbouw — 6 herhalingen' },
        { weekInPhase: 3, targetMinutes: 45, note: 'Zwaarste week — 8 herhalingen' },
        { weekInPhase: 4, targetMinutes: 30, note: 'Deload — 4 herhalingen, rustig' },
      ],
    },
    {
      id: 'tpl_long_run',
      name: 'Lange Duurloop',
      type: 'hiking',
      focus: 'Uithouding × D+ — richting marathon en GR5',
      durationVariants: { full: 75, short: 45 },
      defaultDayOfWeek: 7,
      outdoorTarget: { targetElevationM: 300 },
      notes:
        'De langste sessie van de week, op vermoeide benen na zaterdag — precies die specificiteit is het doel, niet een fout. Rustig tempo (RPE 3-4/10), afstand en hoogtemeters bouw je zelf op t.o.v. vorige week (richtlijn: max +10-15%). Buiten met D+ heeft de voorkeur boven een vlakke route — dit is de sessie die het meest direct naar de GR5 vertaalt.',
      warmup: DYNAMIC_WARMUP,
      cooldown: COOLDOWN_RUN,
      // Langste sessie, op al vermoeide benen, met echte D+/D- — cumulatief
      // zwaar voor de benen ondanks de lage RPE (rustig tempo).
      baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'moderate', intensity: 'low' },
      weeklyProgression: [
        { weekInPhase: 1, targetMinutes: 50, note: 'Wennen — rustig tempo, D+ waar mogelijk' },
        { weekInPhase: 2, targetMinutes: 60, note: 'Opbouw — +10% afstand/D+ t.o.v. week 1' },
        { weekInPhase: 3, targetMinutes: 70, note: 'Zwaarste week — +10-15% t.o.v. week 2' },
        { weekInPhase: 4, targetMinutes: 45, note: 'Deload (35-45 min, D+ ook lager)' },
      ],
    },
    {
      id: 'tpl_herstel',
      name: 'Herstel',
      type: 'recovery',
      focus: 'Rust of rustig wandelen',
      durationVariants: { full: 45 },
      defaultDayOfWeek: 1,
      notes: 'Geen zware training, geen hardlopen, geen zware incline. 30-60 min rustig wandelen is prima. Doel: herstellen van het zware weekend (heuvelintervallen + lange duurloop), frisse start dinsdag.',
      // No dynamic warm-up here — Herstel is a light/rest day, not
      // strenuous enough to need the pre-training prep routine.
      cooldown: COOLDOWN_RECOVERY,
      baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'low' },
    },
  ];
}

// ---------------------------------------------------------------------------
// Program — Maand 1 is de BASISFASE. Maanden 2-4 zijn nog niet door jou
// uitgewerkt; ze hergebruiken voorlopig hetzelfde weekpatroon als placeholder
// (zie README), met alvast de richting uit "LATER / ALPENFASE" verwerkt in de
// omschrijving. Start op de eerstvolgende maandag zodat Week 1 (WENNEN)
// meteen aansluit bij vandaag.
// ---------------------------------------------------------------------------

function buildProgram(): Program {
  const startDate = mondayOfWeek(todayISO());
  return {
    id: 'prog_ascend',
    name: 'ASCEND PROGRAMMA',
    startDate,
    phases: [
      {
        id: 'phase_1',
        name: 'BASISFASE',
        order: 1,
        weekCount: 4,
        description: 'Maand 1: 3x kracht, aerobe basis opbouwen, en een weekend-beenblok (heuvelintervallen + lange duurloop) richting zowel hardloopprogressie als de GR5. Wennen → Opbouw → Zwaarste week → Deload.',
      },
      {
        id: 'phase_2',
        name: 'OPBOUW',
        order: 2,
        weekCount: 4,
        description: 'Placeholder — nog niet door jou ingevuld. Richting uit je notities: 2x hardlopen per week, langere Zone 2, meer incline.',
      },
      {
        id: 'phase_3',
        name: 'BERGCAPACITEIT',
        order: 3,
        weekCount: 4,
        description: 'Placeholder — nog niet door jou ingevuld. Richting: meer D+, step-ups/step-downs, rugzakgewicht, 2-4+ uur hikes.',
      },
      {
        id: 'phase_4',
        name: 'EXPEDITIEKLAAR',
        order: 4,
        weekCount: 4,
        description: 'Placeholder — nog niet door jou ingevuld. Richting: 500 → 750 → 1000+ D+, back-to-back hiking days.',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Planned sessions — het vaste weekpatroon herhaald over het hele programma.
// MA Herstel · DI Easy Run · WO Lower A zwaar · DO Upper B ·
// VR Upper A · ZA Heuvel-/Incline-Intervallen · ZO Lange Duurloop
// ---------------------------------------------------------------------------

function buildPlannedSessions(program: Program, templates: SessionTemplate[]): PlannedSession[] {
  const totalWeeks = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
  const sessions: PlannedSession[] = [];

  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = addDays(program.startDate, week * 7);
    templates
      .filter((t) => t.defaultDayOfWeek)
      .forEach((t, order) => {
        const date = addDays(weekStart, (t.defaultDayOfWeek as number) - 1);
        sessions.push({
          id: makeId('planned'),
          templateId: t.id,
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
// op D+: afstand, D+, D-, uren op de benen, rugzakgewicht en back-to-back
// herstel tellen allemaal mee. Rich content (waarom/behaald wanneer/bronnen)
// per stap staat in data/gr5Details.ts — zie MilestoneDetailSheet.
// ---------------------------------------------------------------------------

function buildObjective(): Objective {
  const objectiveId = 'obj_gr5';
  const defs: Array<[string, Objective['milestones'][number]['requirement']]> = [
    ['40 min Easy Run onafgebroken', { kind: 'duration', activityType: 'cardio', minMinutes: 40 }],
    ['60 min bergconditie volhouden', { kind: 'duration', activityType: 'hiking', minMinutes: 60 }],
    ['15 km wandeling', { kind: 'distance', minKm: 15 }],
    ['300 D+ / D-', { kind: 'elevation', minMeters: 300, minLossMeters: 300 }],
    ['500 D+ / D-', { kind: 'elevation', minMeters: 500, minLossMeters: 500 }],
    ['750 D+ / D-', { kind: 'elevation', minMeters: 750, minLossMeters: 750 }],
    ['1000 D+ + afdaalcapaciteit', { kind: 'elevation', minMeters: 1000, minLossMeters: 1000 }],
    ['15 km + 1000 D+', { kind: 'distanceAndElevation', minKm: 15, minMeters: 1000 }],
    ['Volledige rugzaksessie', { kind: 'backpack', minWeightKg: 12, minKm: 15 }],
    ['Twee dagen achter elkaar', { kind: 'consecutiveDays', days: 2 }],
    ['Weekend bergsimulatie', { kind: 'manual' }],
    ['GR5 KLAAR', { kind: 'manual' }],
  ];

  return {
    id: objectiveId,
    name: 'GR5 / ALPINE READINESS',
    description: 'Opbouw richting een meerdaagse Alpine trektocht zoals de GR5 — de Alpenfase uit je eigen schema.',
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
