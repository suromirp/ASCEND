// Modality options per non-strength training day — multiple valid ways to
// hit the same day's training goal (e.g. Friday's goal is "uphill/mountain
// endurance", not literally "treadmill"), each tagged with a role so the
// picker can show why one is favoured over another. Content adapted from
// the user's ASCEND_training_variants_garmin_spec.md research.
//
// Kept as plain content (not a TypeScript union of keys) so adding a
// modality is a data change, not a model change — see
// ActivityModality in models/training.ts.

export interface ModalitySource {
  label: string;
  url?: string;
}

export type ModalityRole = 'PRIMARY' | 'EQUIVALENT' | 'CROSS_TRAINING' | 'FALLBACK' | 'LATER_PHASE';

export const ROLE_LABEL: Record<ModalityRole, string> = {
  PRIMARY: 'Primair',
  EQUIVALENT: 'Gelijkwaardig',
  CROSS_TRAINING: 'Cross-training',
  FALLBACK: 'Noodgreep',
  LATER_PHASE: 'Later',
};

// What the day's log form should show for this modality — keeps the field
// set data-driven instead of a big switch on modality string in the UI.
export interface ModalityFields {
  distance?: boolean;
  inclinePercent?: boolean; // treadmill incline % -> Ascend estimates D+
  elevation?: boolean; // manual/GPS D+ (and D- when outdoor)
  elevationLoss?: boolean;
  steps?: boolean; // StairMaster floors/steps
  cadence?: boolean;
  power?: boolean;
  backpackWeight?: boolean;
  terrain?: boolean;
}

export interface ModalityDefinition {
  key: string;
  label: string;
  role: ModalityRole;
  environment: 'outdoor' | 'treadmill' | 'indoor' | 'rest';
  garminProfile?: string;
  durationHint?: string;
  how: string;
  why: string;
  whenNotIdeal?: string[];
  garminNote?: string;
  fields: ModalityFields;
  locked?: boolean; // shown but not selectable in Month 1 (LATER_PHASE)
  sources?: ModalitySource[];
}

const PUBMED_RUN_BIKE_CROSS: ModalitySource = { label: 'PubMed — hardlopen vs. fietsen cross-training review', url: 'https://pubmed.ncbi.nlm.nih.gov/42267259/' };
const PUBMED_INCLINE_WALKING: ModalitySource = { label: 'PubMed — inclined treadmill walking', url: 'https://pubmed.ncbi.nlm.nih.gov/21200344/' };
const PUBMED_STAIR_CLIMBING: ModalitySource = { label: 'PubMed — trapklimmen en cardiorespiratoire fitheid', url: 'https://pubmed.ncbi.nlm.nih.gov/28009784/' };
const PUBMED_DOWNHILL_1: ModalitySource = { label: 'PubMed — downhill-preconditionering', url: 'https://pubmed.ncbi.nlm.nih.gov/28288187/' };
const PUBMED_DOWNHILL_2: ModalitySource = { label: 'PubMed — spierschade door afdalen', url: 'https://pubmed.ncbi.nlm.nih.gov/25693898/' };
const PUBMED_LOAD_CARRYING: ModalitySource = { label: 'PubMed — load-carriage training', url: 'https://pubmed.ncbi.nlm.nih.gov/22130400/' };
const PUBMED_LOADED_WALKING: ModalitySource = { label: 'PubMed — energiekosten van rugzaklopen', url: 'https://pubmed.ncbi.nlm.nih.gov/10774872/' };
const NKBV_FIT_DE_BERGEN_IN: ModalitySource = { label: 'NKBV — fit de bergen in, conditie', url: 'https://nkbv.nl/kenniscentrum/fit-de-bergen-in-conditie.html' };
const NKBV_VEILIG_BERGWANDELEN: ModalitySource = { label: 'NKBV — veilig bergwandelen', url: 'https://nkbv.nl/kenniscentrum/veilig-bergwandelen.html?sfnsn=mo' };
const NKBV_OEFENINGEN_CONDITIE: ModalitySource = { label: 'NKBV — oefeningen om je conditie te verbeteren', url: 'https://nkbv.nl/kenniscentrum/oefeningen-om-je-conditie-te-verbeteren.html' };
const GARMIN_INDOOR_ACCELEROMETER: ModalitySource = { label: 'Garmin — indoor snelheid/afstand via accelerometer', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-3A4C7C6C-1FE3-4EB5-B38E-3F744A5C1F00.html' };
const GARMIN_CYCLING_PERFORMANCE: ModalitySource = { label: 'Garmin — cycling performance metrics', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-44C7BB4B-EFF7-4A42-AC03-8A6AABB94807.html' };
const GARMIN_SMART_TRAINER: ModalitySource = { label: 'Garmin — smart trainer', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-5956B2AD-038A-4998-860B-032081F18F61.html' };
const PELOTON_HILL_REPEATS: ModalitySource = { label: 'Peloton — hill repeats techniek en opbouw', url: 'https://www.onepeloton.com/blog/hill-repeats' };
const OUTSIDE_INCLINE_TREADMILL: ModalitySource = { label: 'Outside — incline-intervallen op de treadmill', url: 'https://run.outsideonline.com/training/treadmill-workout-incline/' };
const TRAILRUNNER_MOUNTAIN_TRAINING: ModalitySource = { label: 'Trail Runner Mag — specifiek trainen voor bergrennen', url: 'https://www.trailrunnermag.com/training/trail-tips-training/specific-training-for-mountain-running/' };
const RUNINFINITE_VERTICAL_GAIN: ModalitySource = { label: 'Run Infinite — hoeveel D+ is genoeg in training', url: 'https://runinfinite.com/training-for-vertical-gain/' };
const MARATHONHANDBOOK_TEN_PERCENT: ModalitySource = { label: 'Marathon Handbook — de 10%-regel voor mijlage-opbouw', url: 'https://marathonhandbook.com/the-10-percent-rule/' };

export const TUESDAY_MODALITIES: ModalityDefinition[] = [
  {
    key: 'run_outdoor',
    label: 'Hardlopen — buiten',
    role: 'PRIMARY',
    environment: 'outdoor',
    garminProfile: 'Run',
    durationHint: 'geplande duur',
    how: 'Continu rustig lopen. RPE 3-4/10, gesprekstempo, volledige zinnen blijven mogelijk. Geen PR najagen — ook de laatste minuten moeten nog gecontroleerd voelen.',
    why: 'Traint direct de hardloop-specifieke mechaniek en running economy, en bouwt tegelijk de aerobe basis op. Blijft daarom de standaard zolang hardloopverbetering een apart doel is naast fietsen.',
    whenNotIdeal: ['duidelijke beenpijn', 'ongewoon hoge impactgevoeligheid', 'de vorige krachtsessie maakte normaal lopen lastig'],
    fields: { distance: true, elevation: true },
    sources: [],
  },
  {
    key: 'run_treadmill',
    label: 'Hardlopen — treadmill',
    role: 'EQUIVALENT',
    environment: 'treadmill',
    garminProfile: 'Treadmill',
    durationHint: 'geplande duur',
    how: 'Zelfde geplande duur, RPE 3-4/10. Houd de helling laag als het doel specifiek een rustige duurloop is (niet bergconditie) — gebruik snelheid om een natuurlijke, ontspannen loopcadans te houden.',
    why: 'Geeft precieze controle over tempo en omgeving terwijl je toch blijft hardlopen.',
    garminNote: 'Indoor snelheid/afstand zijn gebaseerd op de accelerometer en kunnen verbeteren na kalibratie.',
    fields: { distance: true, inclinePercent: true, elevation: true },
    sources: [GARMIN_INDOOR_ACCELEROMETER],
  },
  {
    key: 'bike_outdoor',
    label: 'Fietsen — buiten',
    role: 'CROSS_TRAINING',
    environment: 'outdoor',
    garminProfile: 'Bike',
    durationHint: '±40-60 min',
    how: 'Grotendeels continu trappen, RPE 3-4/10, gesprek blijft makkelijk. Maak van elke heuvel geen sprint — rustige, soepele cadans in een makkelijke/gemiddelde versnelling.',
    why: 'Goede aerobe training met minder impact — nuttig voor afwisseling, extra duurvermogen, of wanneer je de belasting op de benen even wilt verlagen.',
    garminNote: 'Gebruik niet blindelings je hardloop-LTHR-zones voor fietsen — de Forerunner ondersteunt aparte sportprofielen/zones. Cycling Daily Suggested Workouts vereisen een fiets-VO2max-schatting, waarvoor mogelijk een vermogensmeter nodig is.',
    fields: { distance: true, elevation: true, cadence: true, power: true },
    sources: [PUBMED_RUN_BIKE_CROSS, GARMIN_CYCLING_PERFORMANCE],
  },
  {
    key: 'bike_indoor',
    label: 'Fietsen — indoor',
    role: 'CROSS_TRAINING',
    environment: 'indoor',
    garminProfile: 'Bike Indoor',
    durationHint: '±40-60 min',
    how: 'RPE 3-4, continu rustig fietsen. Geen noodzaak om afstand na te jagen.',
    why: 'Zeer goed te controleren, laag-impact aerobe training.',
    garminNote: 'Met een compatibele smart trainer kan Garmin afhankelijk van de ondersteuning interacteren met weerstand/targets.',
    fields: { cadence: true, power: true },
    sources: [GARMIN_SMART_TRAINER],
  },
  {
    key: 'run_walk',
    label: 'Hardlopen/wandelen afgewisseld',
    role: 'FALLBACK',
    environment: 'outdoor',
    garminProfile: 'Run',
    durationHint: '30-40 min',
    how: 'Bijvoorbeeld: 4 min rustig lopen, 1 min wandelen, herhalen tot de geplande duur — de exacte verhouding mag variëren.',
    why: 'Behoudt een hardloop-specifieke prikkel maar verlaagt de continue impact en vermoeidheid.',
    whenNotIdeal: ['geen — dit is zelf al de lichtere optie'],
    fields: { distance: true },
    sources: [],
  },
];

export const FRIDAY_MODALITIES: ModalityDefinition[] = [
  {
    key: 'incline_treadmill',
    label: 'Incline treadmill',
    role: 'PRIMARY',
    environment: 'treadmill',
    garminProfile: 'Treadmill / custom "Bergconditie"',
    durationHint: 'geplande duur',
    how: 'Werkgebied voor Maand 1: helling ±8-15%, snelheid ±4-5,5 km/u, RPE 4-5/10. Dit zijn bereiken, geen verplichte combinatie — 15% + 5,5 km/u kan veel te zwaar zijn. Kies een combinatie die je de hele geplande tijd gecontroleerd volhoudt. Niet aan de handgrepen hangen.',
    why: 'Bergop lopen verhoogt de metabole vraag sterk, ook bij een rustig wandeltempo — een goede cardiovasculaire prikkel met behoud van een wandelbeweging.',
    whenNotIdeal: ['traint geen excentrische afdaalbelasting, technisch terrein of balans op oneffen ondergrond'],
    garminNote: 'Garmin weet niet dat de band bijvoorbeeld op 12% staat — Total Ascent is hier geen betrouwbare D+-bron. Ascend berekent een geschatte D+ uit afstand × helling%, duidelijk gelabeld als schatting.',
    fields: { distance: true, inclinePercent: true, elevation: true },
    sources: [PUBMED_INCLINE_WALKING],
  },
  {
    key: 'hill_hike',
    label: 'Hike met hoogteverschil — buiten',
    role: 'PRIMARY',
    environment: 'outdoor',
    garminProfile: 'Hike / outdoor wandelen',
    durationHint: 'geplande duur',
    how: 'Wandel/hike een route met beschikbare klimmen en dalingen. Houd de inspanning in Maand 1 aeroob en gecontroleerd.',
    why: 'Specifieker dan een treadmill: echte stijging, échte daling, oneffen ondergrond, wisselende staplengte, balans — de daadwerkelijke hikingbeweging.',
    fields: { distance: true, elevation: true, elevationLoss: true, terrain: true, backpackWeight: true },
    sources: [NKBV_FIT_DE_BERGEN_IN, NKBV_VEILIG_BERGWANDELEN],
  },
  {
    key: 'stairmaster',
    label: 'StairMaster / Stepmill',
    role: 'EQUIVALENT',
    environment: 'indoor',
    garminProfile: 'Stair Stepper',
    durationHint: 'geplande duur',
    how: 'Continu gecontroleerd stappen, RPE 4-5. Maak er geen full-out intervalsessie van en leun niet zwaar op de handvatten. Forceer niet exact de treadmill-duur als StairMaster duidelijk meer lokale beenvermoeidheid geeft — de bedoelde prikkel en hoe zaterdag (Lower B) daarna gaat, wegen zwaarder dan minuten exact matchen.',
    why: 'Elke stap lijkt op een herhaalde step-up en geeft een sterke verticale beenuithoudingsprikkel. NKBV noemt step-ups specifiek als bergvoorbereiding.',
    whenNotIdeal: ['lijkt minder op normale hikinggang dan incline treadmill', 'geen technisch terrein of echte afdaling'],
    garminNote: '"Verdiepingen" verschillen per machine — behandel dit niet automatisch als gestandaardiseerde D+, en meng machine-vertical niet met echte buiten-D+.',
    fields: { steps: true },
    sources: [NKBV_OEFENINGEN_CONDITIE, PUBMED_STAIR_CLIMBING],
  },
  {
    key: 'outdoor_stairs',
    label: 'Buitentrappen',
    role: 'EQUIVALENT',
    environment: 'outdoor',
    garminProfile: 'Hike / Stair Stepper',
    durationHint: 'geplande duur',
    how: 'Klim in een gecontroleerd wandeltempo, daal gecontroleerd af, herhaal. Houd Maand 1 grotendeels aeroob.',
    why: 'Voegt zowel herhaald klimmen als écht afdalen toe. De afdaalcomponent is relevant omdat trekken excentrisch remmen bevat — langdurig afdalen kan krachtverlies en spierpijn geven, terwijl geleidelijke eerdere blootstelling daar juist weerstand tegen opbouwt.',
    whenNotIdeal: ['repetitief', 'traptreden-afdaling is niet identiek aan een alpien pad', 'wordt snel te intensief als het sprints worden'],
    fields: { elevation: true, elevationLoss: true },
    sources: [PUBMED_DOWNHILL_1, PUBMED_DOWNHILL_2],
  },
  {
    key: 'trail_hike',
    label: 'Trail / oneffen terrein',
    role: 'EQUIVALENT',
    environment: 'outdoor',
    garminProfile: 'Hike / Trail Run',
    durationHint: 'geplande duur',
    how: 'Kies bos, zand, duinen, wortels, rotsen of ander onverhard terrein.',
    why: 'Ook met bescheiden D+ waardevol: traint voetplaatsing, enkel-/voettolerantie, balans, terreingevoel en tijd op de benen. NKBV benadrukt dat bergterrein zwaarder is dan vlakke paden en adviseert onverhard wandelen als voorbereiding.',
    whenNotIdeal: ['beoordeel deze sessie niet alleen op D+ — duur, terreinmoeilijkheid en RPE tellen net zo mee'],
    fields: { distance: true, elevation: true, elevationLoss: true, terrain: true },
    sources: [NKBV_FIT_DE_BERGEN_IN],
  },
  {
    key: 'walking_hill_repeats',
    label: 'Wandel-heuvelherhalingen',
    role: 'EQUIVALENT',
    environment: 'outdoor',
    garminProfile: 'Hike',
    durationHint: 'geplande duur',
    how: 'Bijv.: 10 min rustige warming-up, dan herhaald 5 min doelgericht omhoog + rustig gecontroleerd omlaag, afsluiten met 10 min rustig — binnen de geplande totale duur.',
    why: 'Haalt betekenisvolle D+ en D- uit één klein lokaal heuveltje. Geen zware hardloop-heuvelherhalingen: het doel is bergconditie zonder Lower B te slopen, geen VO2max-training.',
    fields: { elevation: true, elevationLoss: true },
    sources: [],
  },
  {
    key: 'loaded_hike',
    label: 'Hike met rugzakgewicht',
    role: 'LATER_PHASE',
    environment: 'outdoor',
    garminProfile: 'Hike',
    durationHint: 'later',
    how: 'Nog niet in Maand 1 — later geleidelijk het daadwerkelijk verwachte GR5-rugzakgewicht opbouwen, geen willekeurig zware rugzak.',
    why: 'Onderzoek naar load-carriage-training vond het grootste effect wanneer progressieve rugzakbelasting werd toegevoegd naast aerobe en krachttraining. Rugzaklopen verhoogt bovendien de metabole kosten en verandert de bewegingsvraag.',
    fields: { distance: true, elevation: true, elevationLoss: true, backpackWeight: true, terrain: true },
    locked: true,
    sources: [PUBMED_LOAD_CARRYING, PUBMED_LOADED_WALKING],
  },
  {
    key: 'bike_easy_friday',
    label: 'Fietsen (noodgreep)',
    role: 'FALLBACK',
    environment: 'outdoor',
    garminProfile: 'Bike',
    durationHint: '±40-60 min',
    how: 'Rustig, continu fietsen — alleen wanneer heuvels/treadmill/trap niet beschikbaar zijn, of om de belasting op de onderbenen tijdelijk te verlagen.',
    why: 'Behoudt aerobe training wanneer geen andere optie beschikbaar is.',
    whenNotIdeal: ['reproduceert geen hikinggang, D+-beenuithouding, voet-/enkelbelasting, excentrisch afdalen of rugzakdragen — telt niet mee als bergspecifieke D+-gereedheid'],
    fields: { distance: true, cadence: true, power: true },
    sources: [],
  },
];

export const HILL_INTERVAL_MODALITIES: ModalityDefinition[] = [
  {
    key: 'hill_repeats_outdoor',
    label: 'Heuvelherhalingen — buiten',
    role: 'PRIMARY',
    environment: 'outdoor',
    garminProfile: 'Run',
    durationHint: 'geplande duur, incl. warming-up/cooling-down',
    how: 'Warm 10 min rustig op. Daarna herhaald: 30-90 sec bergop op hoge inspanning (RPE 8-9), rustig aflopen of teruglopen als volledig herstel. Begin met 4-5 herhalingen, bouw op naar 8-10.',
    why: 'Combineert een sterke loop-specifieke snelheidsprikkel met opbouwende D+ — de helling verlaagt bovendien de impact per stap t.o.v. vlakke sprints.',
    whenNotIdeal: ['geen toegang tot een bruikbare helling', 'acute beenpijn of ongewone impactgevoeligheid'],
    fields: { distance: true, elevation: true, cadence: true },
    sources: [PELOTON_HILL_REPEATS],
  },
  {
    key: 'incline_treadmill_intervals',
    label: 'Incline-intervallen — treadmill',
    role: 'EQUIVALENT',
    environment: 'treadmill',
    garminProfile: 'Treadmill',
    durationHint: 'geplande duur, incl. warming-up/cooling-down',
    how: 'Helling op 4-5%. Herhaald: 30-90 sec hoog tempo (RPE 8-9), tussendoor helling/snelheid fors omlaag voor volledig herstel. Niet aan de handgrepen hangen.',
    why: 'Even effectief als buiten heuvelrennen voor de snelheids- en D+-prikkel, en volledig los van weer of beschikbaar terrein te plannen.',
    garminNote: 'Total Ascent is op een treadmill niet betrouwbaar — Ascend schat D+ uit afstand × helling%, net als bij Bergconditie.',
    fields: { distance: true, inclinePercent: true, elevation: true, cadence: true },
    sources: [OUTSIDE_INCLINE_TREADMILL, GARMIN_INDOOR_ACCELEROMETER],
  },
  {
    key: 'stairmaster_intervals',
    label: 'StairMaster-intervallen',
    role: 'FALLBACK',
    environment: 'indoor',
    garminProfile: 'Stair Stepper',
    durationHint: 'geplande duur',
    how: 'Herhaald: 30-90 sec hoog tempo, daartussen rustig doorstappen tot volledig herstel — alleen wanneer geen heuvel of treadmill beschikbaar is.',
    why: 'Behoudt de verticale beenprikkel wanneer de primaire opties niet beschikbaar zijn.',
    whenNotIdeal: ['mist de loop-specifieke snelheidscomponent van buiten/treadmill'],
    fields: { steps: true },
    sources: [],
  },
];

export const LONG_RUN_MODALITIES: ModalityDefinition[] = [
  {
    key: 'long_hike_outdoor',
    label: 'Lange hike met D+ — buiten',
    role: 'PRIMARY',
    environment: 'outdoor',
    garminProfile: 'Hike',
    durationHint: 'geplande duur',
    how: 'Rustig tempo (RPE 3-4/10), route met zoveel mogelijk hoogteverschil. Bouw afstand/D+ t.o.v. vorige week op met max +10-15%.',
    why: 'De meest GR5-specifieke vorm: echte D+/D-, tijd op de benen, wisselend terrein — bouwt tegelijk marathon-uithouding en bergcapaciteit op.',
    fields: { distance: true, elevation: true, elevationLoss: true, terrain: true, backpackWeight: true },
    sources: [TRAILRUNNER_MOUNTAIN_TRAINING, RUNINFINITE_VERTICAL_GAIN],
  },
  {
    key: 'long_run_outdoor',
    label: 'Lange duurloop — buiten',
    role: 'PRIMARY',
    environment: 'outdoor',
    garminProfile: 'Run',
    durationHint: 'geplande duur',
    how: 'Rustig, gelijkmatig tempo (RPE 3-4/10), gesprekstempo blijft mogelijk. Bouw afstand op t.o.v. vorige week met max +10%.',
    why: 'De klassieke marathon-lange-duurloop: bouwt aerobe uithouding en de mentale/fysieke gewenning aan lang op de been zijn.',
    whenNotIdeal: ['geen route met hoogteverschil beschikbaar en D+ is het hoofddoel deze week'],
    fields: { distance: true, elevation: true },
    sources: [MARATHONHANDBOOK_TEN_PERCENT],
  },
  {
    key: 'long_run_treadmill',
    label: 'Lange duurloop — treadmill',
    role: 'FALLBACK',
    environment: 'treadmill',
    garminProfile: 'Treadmill',
    durationHint: 'geplande duur',
    how: 'Zelfde geplande duur en RPE 3-4/10 — alleen bij slecht weer of wanneer buiten niet haalbaar is.',
    why: 'Behoudt de duurprikkel wanneer buiten geen optie is, al mist het de D+/terrein-specificiteit die deze sessie juist waardevol maakt.',
    whenNotIdeal: ['mist échte D+/D- en terreinwisseling — telt niet mee als bergspecifieke voorbereiding'],
    fields: { distance: true, inclinePercent: true, elevation: true },
    sources: [],
  },
];

// Named for the rest day's original weekday (Sunday) — Herstel moved to
// Monday when the week was reshaped around a weekend hill/long-run block,
// but this content (rest/recovery-walk options) didn't change, and it's
// keyed by templateId below, not by name.
export const SUNDAY_MODALITIES: ModalityDefinition[] = [
  {
    key: 'rest',
    label: 'Volledige rust',
    role: 'PRIMARY',
    environment: 'rest',
    durationHint: '—',
    how: 'Geen training.',
    why: 'Laat vermoeidheid dalen voordat maandag de volgende cyclus begint.',
    fields: {},
    sources: [],
  },
  {
    key: 'recovery_walk',
    label: 'Herstelwandeling',
    role: 'EQUIVALENT',
    environment: 'outdoor',
    garminProfile: 'Walk',
    durationHint: '30-60 min',
    how: 'Ontspannen tempo, geen tempo- of hartslagdoel.',
    why: 'Actief herstel zonder trainingsbelasting.',
    fields: { distance: true },
    sources: [],
  },
  {
    key: 'very_easy_bike',
    label: 'Zeer rustig fietsen',
    role: 'FALLBACK',
    environment: 'outdoor',
    garminProfile: 'Bike',
    durationHint: '20-45 min',
    how: 'RPE 1-2, zeer lichte versnelling. Voelt het als een training? Dan is het geen herstel meer.',
    why: 'Alternatieve lichte actieve-herstelvorm.',
    fields: { distance: true },
    sources: [],
  },
  {
    key: 'gentle_mobility',
    label: 'Zachte mobiliteit',
    role: 'FALLBACK',
    environment: 'indoor',
    durationHint: '10-20 min',
    how: 'Geen agressief stretchen, geen vermoeidheidsdoel.',
    why: 'Lichte beweging zonder trainingsbelasting.',
    fields: {},
    sources: [],
  },
];

export const MODALITIES_BY_TEMPLATE: Record<string, ModalityDefinition[]> = {
  tpl_easy_run: TUESDAY_MODALITIES,
  tpl_bergconditie: FRIDAY_MODALITIES,
  tpl_herstel: SUNDAY_MODALITIES,
  tpl_hill_intervals: HILL_INTERVAL_MODALITIES,
  tpl_long_run: LONG_RUN_MODALITIES,
};

export function getModalities(templateId: string): ModalityDefinition[] | undefined {
  return MODALITIES_BY_TEMPLATE[templateId];
}

export function getModality(templateId: string, key: string): ModalityDefinition | undefined {
  return getModalities(templateId)?.find((m) => m.key === key);
}

export function defaultModality(templateId: string): string | undefined {
  const modalities = getModalities(templateId);
  return modalities?.find((m) => m.role === 'PRIMARY' && !m.locked)?.key ?? modalities?.[0]?.key;
}
