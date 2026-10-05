import type { SessionTemplate } from '../models/training';
import { isoWeekday } from '../utils/dates';
// Rich per-training-day content for the Month 1 (BASISFASE) schedule —
// shown in TrainingGuideSheet, reachable both via an info button on the
// session itself (TodayMissionCard/SessionActionSheet) and via the
// standalone Trainingsgids index page. Keyed by SessionTemplate.id from
// data/defaultProgram.ts, so nothing here needs its own id scheme.
//
// Sources link to the exact articles/pages the user supplied
// (trainingsschema_bronnen_urls.txt) rather than organisation homepages —
// matched per section from the original research document's own citations.
// The Garmin Forerunner 255 manual pages are opaque GUID URLs on a domain
// this environment can't fetch to verify, so their per-claim assignment is
// inferred from the order they were supplied and the order the original
// document cited Garmin for each topic, not independently confirmed.

export interface GuideSource {
  label: string;
  url?: string;
}

export interface GuideSubsection {
  heading: string;
  items: string[];
}

export interface GuideSection {
  heading: string;
  body?: string;
  items?: string[];
  subsections?: GuideSubsection[];
  note?: string;
}

export interface TrainingDayGuide {
  subtitle: string;
  registration: string;
  sections: GuideSection[];
  gear: string[];
  garminNote?: string;
  sources: GuideSource[];
}

const ACSM: GuideSource = { label: 'ACSM, Resistance Training Position Stand', url: 'https://www.acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf' };
const MACROFACTOR_LOG: GuideSource = { label: 'MacroFactor, een workout loggen', url: 'https://help.macrofactorapp.com/en/articles/310-how-to-log-a-workout' };
const MACROFACTOR_PROGRESSION: GuideSource = { label: 'MacroFactor, Smart Progressions', url: 'https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions' };
const MACROFACTOR_RIR: GuideSource = { label: 'MacroFactor, wat is RIR', url: 'https://help.macrofactorapp.com/en/articles/385-what-is-rir-and-how-should-i-use-it-during-training' };
const MACROFACTOR_MISSED: GuideSource = { label: 'MacroFactor, gemiste workouts en trainingscycli', url: 'https://help.macrofactorapp.com/en/articles/382-what-happens-to-my-program-if-i-miss-workouts-or-take-time-off' };
const MACROFACTOR_DELOAD: GuideSource = { label: 'MacroFactor, deload: eerste of laatste cyclus', url: 'https://help.macrofactorapp.com/en/articles/297-deload-first-cycle-or-last-cycle' };

const PUBMED_CONCURRENT_TRAINING: GuideSource = { label: 'PubMed, concurrent kracht- en duurtraining', url: 'https://pubmed.ncbi.nlm.nih.gov/28288187/' };
const PUBMED_INJURY_LOAD_1: GuideSource = { label: 'PubMed, trainingsbelasting en hardloopblessures', url: 'https://pubmed.ncbi.nlm.nih.gov/25010379/' };
const PUBMED_INJURY_LOAD_2: GuideSource = { label: 'PubMed, trainingsbelasting en hardloopblessures (vervolg)', url: 'https://pubmed.ncbi.nlm.nih.gov/34749417/' };
const PUBMED_INTENSITY_DISTRIBUTION: GuideSource = { label: 'PubMed, trainingsintensiteit bij afstandslopers', url: 'https://pubmed.ncbi.nlm.nih.gov/PMC6253751/' };
const PUBMED_TALK_TEST: GuideSource = { label: 'PubMed, talk test review', url: 'https://pubmed.ncbi.nlm.nih.gov/28709155/' };
const PUBMED_DOWNHILL: GuideSource = { label: 'PubMed, excentrische belasting bij afdalen', url: 'https://pubmed.ncbi.nlm.nih.gov/22130400/' };
const PUBMED_LOAD_CARRYING: GuideSource = { label: 'PubMed, load-carriage/rugzaktraining', url: 'https://pubmed.ncbi.nlm.nih.gov/35060915/' };

// Garmin Forerunner 255 manual pages — see the file-level note on why exact
// per-claim assignment here is inferred, not independently verified.
const GARMIN_ZONES: GuideSource = { label: 'Garmin, sportspecifieke hartslagzones', url: 'https://www8.garmin.com/manuals-apac/webhelp/forerunner255series/EN-SG/GUID-21F7EFD8-1AE2-4E1A-959E-A98B6A297584-1763.html' };
const GARMIN_HANDRAIL: GuideSource = { label: 'Garmin, nauwkeurigheid bij treadmill-handgrepen', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-BDCC2C12-1D33-45DB-967B-4313BBA83BC9.html' };
const GARMIN_CUSTOM_ACTIVITY: GuideSource = { label: 'Garmin, aangepaste activiteiten & dataschermen', url: 'https://support.garmin.com/en-GB/?faq=o3jGSobIba3z7lLLMexE16&identifier=649059&tab=topics' };
const GARMIN_INDOOR_ACCELEROMETER: GuideSource = { label: 'Garmin, indoor afstand via accelerometer', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/NL-NL/GUID-3A4C7C6C-1FE3-4EB5-B38E-3F744A5C1F00.html' };
const GARMIN_CALIBRATION: GuideSource = { label: 'Garmin, treadmill handmatig kalibreren', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-25FA2988-33F2-4FC9-92FA-E457CBDB9E72.html' };
const GARMIN_ELEVATION_FIELDS: GuideSource = { label: 'Garmin, gegevensvelden Total Ascent/Descent', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-GB/GUID-86541696-B60E-44BC-9A46-4349C86A1CD8.html' };
const GARMIN_RECOVERY_TIME: GuideSource = { label: 'Garmin, Recovery Time', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-73BCE454-042E-420D-96A4-9DBA46626CD4.html' };
const GARMIN_STRAP_PRIORITY: GuideSource = { label: 'Garmin, borstband vs. polssensor', url: 'https://www8.garmin.com/manuals/webhelp/GUID-676967A0-1B23-4384-9BC9-76F3D643F1C8/EN-US/GUID-F5BF67CE-C94E-4842-AE96-A7A05C85B732.html' };
const PUBMED_RUNNING_ECONOMY: GuideSource = { label: 'PubMed, krachttraining en running economy', url: 'https://pubmed.ncbi.nlm.nih.gov/38165636/' };
const PELOTON_HILL_REPEATS: GuideSource = { label: 'Peloton, hill repeats techniek en opbouw', url: 'https://www.onepeloton.com/blog/hill-repeats' };
const OUTSIDE_INCLINE_TREADMILL: GuideSource = { label: 'Outside, incline-intervallen op de treadmill', url: 'https://run.outsideonline.com/training/treadmill-workout-incline/' };
const TRAINIINGPEAKS_TREADMILL_INTERVAL: GuideSource = { label: 'TrainingPeaks, treadmill interval workout voor snelheid', url: 'https://www.trainingpeaks.com/blog/the-ultimate-interval-treadmill-session-to-improve-speed-and-beat-boredom/' };
const TRAILRUNNER_MOUNTAIN_TRAINING: GuideSource = { label: 'Trail Runner Mag, specifiek trainen voor bergrennen', url: 'https://www.trailrunnermag.com/training/trail-tips-training/specific-training-for-mountain-running/' };
const RUNINFINITE_VERTICAL_GAIN: GuideSource = { label: 'Run Infinite, hoeveel D+ is genoeg in training', url: 'https://runinfinite.com/training-for-vertical-gain/' };
const MARATHONHANDBOOK_TEN_PERCENT: GuideSource = { label: 'Marathon Handbook, de 10%-regel voor mijlage-opbouw', url: 'https://marathonhandbook.com/the-10-percent-rule/' };
const RUNBIKECALC_POLARIZED: GuideSource = { label: 'RunBikeCalc, 80/20 polarized training guide', url: 'https://runbikecalc.com/blog/polarized-training-complete-guide-2025' };

export const TRAINING_GUIDES: Record<string, TrainingDayGuide> = {
  tpl_upper_a: {
    subtitle: 'Kracht • Hypertrofie • Bovenlichaam',
    registration: 'ASCEND: alleen voltooid/niet voltooid. Oefeningen, sets, reps, gewicht en RIR log je in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Eerste bovenlichaamtraining van de week, algemene kracht en spiergroei van borst, rug, schouders en armen. Krachttraining blijft ook naast hardlopen en hiken belangrijk: het kan bij lopers zelfs de running economy verbeteren.',
      },
      {
        heading: 'UITVOERING',
        body: 'Het volledige programma, oefeningen, sets, reps, gewicht, RIR, rusttijden, draait in MacroFactor Workouts. Dat hoeft niet nogmaals in ASCEND te worden vastgelegd. MacroFactor gebruikt je gelogde gewichten, reps en RIR voor Smart Progression en past toekomstige aanbevelingen daarop aan.',
      },
      {
        heading: 'WAAR OP LETTEN',
        subsections: [
          { heading: 'Goed', items: ['geplande sets uitgevoerd', 'techniek blijft stabiel', 'MacroFactor-targets voor reps/RIR gehaald', 'geen noodzaak om achteraf extra cardio toe te voegen'] },
          { heading: 'Te zwaar', items: ['techniek verslechtert duidelijk', 'targets worden herhaaldelijk niet gehaald', 'werkelijk RIR ligt veel lager dan voorgeschreven', 'prestaties lopen meerdere sessies achter elkaar terug'] },
        ],
        note: 'Eén mindere training is geen reden om het programma aan te passen, kijk naar trends over meerdere weken.',
      },
      {
        heading: 'DELOAD',
        body: 'MacroFactor plant zijn eigen deload-cyclus op basis van je trainingsgeschiedenis (training cycles, geen kalenderweken), die hoeft niet exact samen te vallen met week 4 van dit ASCEND-blok. Verschuiven of missen van workouts schuift de MacroFactor-cyclus mee.',
      },
    ],
    gear: ['MacroFactor Workouts', 'normale gymuitrusting', 'water', 'geschikt schoeisel'],
    sources: [ACSM, MACROFACTOR_LOG, MACROFACTOR_PROGRESSION, MACROFACTOR_MISSED, MACROFACTOR_DELOAD, PUBMED_RUNNING_ECONOMY],
  },

  tpl_easy_run: {
    subtitle: 'Cardio • Aerobe basis',
    registration: 'ASCEND: duur, afstand, D+, gemiddelde hartslag, via Garmin Forerunner 255 + borstband.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Aerobe basis en hardloopontwikkeling opbouwen, de dag na Benen A, zonder je herstel of de heuvelintervallen van zaterdag te verstoren. De opbouw zit bewust vooral in duur, niet tegelijk in duur én tempo én intensiteit, plotselinge sprongen in trainingsbelasting hangen samen met een hoger blessurerisico.',
      },
      {
        heading: 'INTENSITEIT',
        body: 'RPE ongeveer 3–4/10, ontspannen lopen, volledige zinnen kunnen spreken, geen PR, geen tempo-/thresholdrun. De talk test correspondeert redelijk met een intensiteit rond of onder de aerobe drempel en is een bruikbare praktische maatstaf om rustige duurtraining te sturen.',
      },
      {
        heading: 'WANNEER TE HARD?',
        items: [
          'volledige zinnen spreken wordt moeilijk',
          'ademhaling wordt duidelijk zwaar',
          'RPE blijft boven de 4–5/10',
          'je zit langdurig boven je bedoelde rustige Garmin-zone',
          'je moet bewust "pushen" om tempo vast te houden',
          'het laatste deel voelt als een tempo-/wedstrijdtraining',
          'de heuvelintervallen op zaterdag zijn merkbaar slechter door deze run',
        ],
        note: 'Tempo is géén doel. Op een warme dag, met wind of vermoeidheid kan hetzelfde easy effort aanzienlijk langzamer zijn.',
      },
      {
        heading: 'WANNEER TE LANGZAAM?',
        body: 'Bij een rustige duurloop is te langzaam veel minder een probleem dan te snel. Zolang je écht rustig loopt met een natuurlijke loopbeweging, hoeft het tempo niet omhoog omdat je hartslag laag is, het hoofddoel is rustig volume verzamelen zonder je herstel van Benen A of de heuvelintervallen te verstoren.',
      },
      {
        heading: 'GARMIN',
        body: 'Sportspecifieke running-zones op basis van %LTHR geven een preciezer beeld dan generieke %Max HR-zones. Hoofdscherm: timer, hartslag, hartslagzone, tempo. De borstband heeft de voorkeur boven de polssensor voor trainingssturing.',
      },
    ],
    garminNote: 'Volledige Garmin-instellingen (zones, databeelden, borstband) staan in de Garmin-gids.',
    gear: ['Forerunner 255', 'Garmin borstband', 'hardloopschoenen', 'kleding passend bij het weer'],
    sources: [PUBMED_INJURY_LOAD_1, PUBMED_INJURY_LOAD_2, PUBMED_INTENSITY_DISTRIBUTION, PUBMED_TALK_TEST, GARMIN_ZONES, GARMIN_STRAP_PRIORITY],
  },

  tpl_lower_a: {
    subtitle: 'Kracht • Belangrijkste lower-body sessie',
    registration: 'ASCEND: alleen afvinken. Oefeningen, sets, reps, gewicht en RIR in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Ontwikkelen en behouden van maximale kracht, spiermassa en robuustheid van het onderlichaam, de basis voor hardlopen en later stijgen en rugzakwerk.',
      },
      {
        heading: 'WAAROM MIDDEN IN DE WEEK?',
        body: 'Benen A staat ver genoeg na het zware weekend en ver genoeg ervoor, zodat er minstens 48 uur tussen zware beendagen zit. De dag ervoor is een dag voor het bovenlichaam die je benen spaart, de dag erna een rustige duurloop. Kracht- en duurtraining combineren is prima verdedigbaar, zolang de loop rond Benen A echt rustig blijft.',
      },
      {
        heading: 'CONTROLEPUNT',
        items: [
          'squat-/legpressprestaties gaan meerdere weken achteruit',
          'RDL/hinge wordt duidelijk slechter',
          'warming-upgewichten voelen ongewoon zwaar',
          'benen zijn iedere woensdag nog sterk vermoeid',
        ],
        note: 'Bij dit patroon eerst de rustige duurloop en het weekend lichter maken (korter/langzamer), niet meteen Benen A opofferen.',
      },
    ],
    gear: ['MacroFactor Workouts', 'normale gymuitrusting', 'water', 'geschikt schoeisel'],
    sources: [PUBMED_CONCURRENT_TRAINING],
  },

  tpl_upper_b: {
    subtitle: 'Kracht • Hypertrofie • Bovenlichaam',
    registration: 'ASCEND: alleen afvinken. Oefeningen, sets, reps, gewicht en RIR in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Tweede bovenlichaamprikkel van de week, samen met Bovenlichaam A verdeelt dit het wekelijkse volume over twee sessies. Voor hypertrofie tellen vooral voldoende wekelijks volume en consistentie; voor kracht wegen zwaardere belastingen zwaarder.',
      },
      {
        heading: 'WAAR OP LETTEN',
        body: 'Geen extra endurance nodig deze dag. Dit is bewust ook een dag zónder zware beenbelasting, ingeklemd tussen woensdag (Benen A) en het zware weekend-beenblok (zaterdag heuvelintervallen, zondag lange duurloop).',
      },
    ],
    gear: ['MacroFactor Workouts', 'normale gymuitrusting', 'water', 'geschikt schoeisel'],
    sources: [ACSM, MACROFACTOR_RIR],
  },

  tpl_bergconditie: {
    subtitle: 'Alpiene basis · bergop uithouding',
    registration: 'ASCEND: duur, afstand, helling/D+, gemiddelde hartslag, RPE.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Primair: langdurig bergop kunnen bewegen. Secundair: verticale trainingsbelasting opbouwen richting de GR5.',
      },
      {
        heading: 'OPTIE A, INCLINE TREADMILL',
        body: 'Helling ongeveer 8–15%, snelheid meestal 4–5,5 km/u, RPE 4–5/10, een werkgebied, geen verplichte combinatie. Kies snelheid en helling waarmee je de volledige geplande tijd gecontroleerd kunt volhouden, niet automatisch de zwaarste combinatie. Niet structureel aan de handgrepen hangen, dat vermindert bovendien de nauwkeurigheid van Garmins afstandsmeting.',
      },
      {
        heading: 'GESCHATTE D+, GEEN GPS-METING',
        body: 'Op een treadmill verander je fysiek niet van hoogte, dus Garmins Total Ascent is daar geen betrouwbare maat. ASCEND schat D+ uit afstand × helling% (D+ ≈ afstand in meters × helling% ÷ 100), vul de helling in bij het loggen en ASCEND berekent en vult de schatting voor je in. Dit blijft een trainingsmaat, geen echte hoogtemeting.',
      },
      {
        heading: 'OPTIE B, BUITEN HIKEN',
        body: 'Wanneer mogelijk heeft een echte heuvelroute extra waarde: ongelijke ondergrond, balans, wisselende staplengtes en écht D+/D− die een treadmill niet levert. Log met GPS: duur, afstand, D+, D−, hartslag, RPE.',
      },
      {
        heading: 'WANNEER TE ZWAAR?',
        items: [
          'RPE loopt langdurig naar 6–7+',
          'praten wordt lastig',
          'hartslag lijkt op thresholdtraining',
          'benen zijn zaterdag nog zwaar',
          'Benen B-prestaties dalen structureel',
          'je moet aan de treadmill hangen om tempo vol te houden',
        ],
        note: 'Dan eerst snelheid of helling omlaag, niet meteen de hele training overslaan.',
      },
    ],
    garminNote: 'Zie de Garmin-gids voor custom-activity- en databeeld-tips bij indoor klimmen.',
    gear: ['Forerunner 255', 'Garmin borstband', 'trainingsschoenen', 'water', 'treadmill (of buitenroute)'],
    sources: [GARMIN_HANDRAIL, GARMIN_CUSTOM_ACTIVITY, GARMIN_INDOOR_ACCELEROMETER, GARMIN_CALIBRATION, GARMIN_ELEVATION_FIELDS, PUBMED_DOWNHILL, PUBMED_LOAD_CARRYING],
  },

  tpl_lower_b: {
    subtitle: 'Kracht • Hypertrofie • Onderlichaam',
    registration: 'ASCEND: alleen afvinken. Oefeningen, sets, reps, gewicht en RIR in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Tweede lower-body prikkel van de week. MacroFactor bepaalt de daadwerkelijke belasting, dit is niet per definitie lichter dan Benen A.',
      },
      {
        heading: 'BELANGRIJKSTE MEETPUNT',
        body: 'Let op of de dag ervoor je benen al te moe maakt. Wordt Benen B meerdere weken op rij slechter? Maak dan eerst die dag lichter, in plaats van de krachttraining te schrappen.',
      },
      {
        heading: 'LATER',
        body: 'Kan mountain-specifieker worden: single-leg kracht, step-ups, gecontroleerde step-downs, kuit-/soleuswerk, hamstrings, core/bracing, hoeft nu nog niet los in ASCEND geprogrammeerd te worden zolang MacroFactor het krachtprogramma beheert.',
      },
    ],
    gear: ['MacroFactor Workouts', 'normale gymuitrusting', 'water', 'geschikt schoeisel'],
    sources: [PUBMED_CONCURRENT_TRAINING],
  },

  tpl_herstel: {
    subtitle: 'Herstel · rustig bewegen',
    registration: 'Training is niet verplicht.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Vermoeidheid van het zware weekend (heuvelintervallen + lange duurloop) laten dalen voordat de nieuwe week begint. Een herstelwandeling hoeft niet als prestatie behandeld te worden, geen tempo- of hartslagdoel nodig.',
      },
      { heading: 'OPTIES', items: ['volledige rust', '30–60 min rustige wandeling'] },
      { heading: 'GEEN', items: ['intervallen', 'zware incline', 'lange run', 'zware beentraining'] },
      {
        heading: 'GARMIN RECOVERY TIME',
        body: 'Een hoge Recovery Time betekent niet "36 uur niet sporten", het is Garmins schatting van de tijd tot je optimaal hersteld bent voor de volgende zware workout, en past zich gedurende de dag aan op onder andere slaap, stress en activiteit. Hoge Recovery Time + rustige wandeling is meestal prima; hoge Recovery Time + een zware sessie is wel relevante informatie om mee te wegen.',
      },
    ],
    gear: ['comfortabele wandelschoenen (optioneel)'],
    sources: [GARMIN_RECOVERY_TIME],
  },

  tpl_hill_intervals: {
    subtitle: 'Snelheid × D+ • Bergop intervaltraining',
    registration: 'ASCEND: duur, afstand, helling/D+, gemiddelde hartslag, RPE.',
    sections: [
      {
        heading: 'DOEL',
        body: 'De kwaliteitssessie van de week: bergop intervallen combineren een echte snelheidsprikkel (voor hardloopprogressie) met opbouwende D+ (voor de GR5), twee doelen in één sessie in plaats van losse hardloop- en bergsessies.',
      },
      {
        heading: 'UITVOERING',
        body: '10 min rustig opwarmen. Daarna herhaald: 1 minuut hard bergop (RPE 8-9/10), dan 2 minuten wandelend of heel rustig joggend terug naar beneden. Het aantal herhalingen staat in je plan: van 4 in een rustweek tot 8 in de zwaarste week. Sluit af met 10 min rustig uitlopen.',
      },
      {
        heading: 'WAAROM BERGOP, NIET VLAK?',
        body: 'De helling verlaagt de impact per stap ten opzichte van vlakke sprints, en elke herhaling telt tegelijk mee als D+-training. Dit is dezelfde reden waarom heuvelherhalingen vaak worden aanbevolen als laagdrempelige introductie tot snelheidswerk.',
      },
      {
        heading: 'WANNEER TE ZWAAR?',
        items: [
          'techniek/houding verslechtert duidelijk tijdens de herhalingen',
          'geen volledig herstel meer mogelijk tussen herhalingen binnen de geplande tijd',
          'zondag (lange duurloop) is meerdere weken op rij merkbaar slechter na zaterdag',
        ],
        note: 'Dan eerst het aantal herhalingen of de helling omlaag, niet meteen de hele sessie schrappen.',
      },
    ],
    garminNote: 'Zie de Garmin-gids voor custom-activity- en databeeld-tips bij indoor intervallen.',
    gear: ['Forerunner 255', 'Garmin borstband', 'hardloopschoenen', 'treadmill (of buiten heuvel/trap)'],
    sources: [PELOTON_HILL_REPEATS, OUTSIDE_INCLINE_TREADMILL, TRAINIINGPEAKS_TREADMILL_INTERVAL, RUNBIKECALC_POLARIZED],
  },

  tpl_long_run: {
    subtitle: 'Uithouding × D+ • Richting marathon en GR5',
    registration: 'ASCEND: duur, afstand, D+, D−, gemiddelde hartslag, RPE.',
    sections: [
      {
        heading: 'DOEL',
        body: 'De langste sessie van de week, bouwt zowel de marathon-uithouding (tijd op de been, aerobe basis) als GR5-specificiteit (D+, terrein, op vermoeide benen na zaterdag) tegelijk op.',
      },
      {
        heading: 'OP VERMOEIDE BENEN, BEWUST',
        body: 'Zondag komt direct na zaterdags heuvelintervallen. Dat is geen ongelukkige planning: bergsport-specifieke schema\'s trainen bewust een zwaar weekendblok (klimprikkel, dan een dag op vermoeide benen) omdat dat is wat een meerdaagse tocht als de GR5 daadwerkelijk vraagt.',
      },
      {
        heading: 'OPBOUW',
        body: 'Rustig tempo (RPE 3-4/10). ASCEND bouwt de minuten voor je op en vraagt nooit meer dan 10% boven je langste loop van de afgelopen maand. Elke vierde week is een rustweek.',
      },
      {
        heading: 'WANNEER TE ZWAAR?',
        items: [
          'de laatste 10-15 minuten voelen als tempo-/wedstrijdtraining in plaats van rustig',
          'volledige zinnen spreken wordt structureel moeilijk',
          'herstel duurt meerdere dagen langer dan normaal na deze sessie',
        ],
        note: 'Loop dan een paar weken de korte versie of houd de minuten van vorige week aan, in plaats van de training over te slaan.',
      },
    ],
    garminNote: 'Zie de Garmin-gids voor zones en databeelden bij lange duurlopen.',
    gear: ['Forerunner 255', 'Garmin borstband', 'hardloop-/hikingschoenen', 'water/voeding voor langere duur'],
    sources: [TRAILRUNNER_MOUNTAIN_TRAINING, RUNINFINITE_VERTICAL_GAIN, MARATHONHANDBOOK_TEN_PERCENT],
  },
};

export function getTrainingGuide(templateId: string): TrainingDayGuide | undefined {
  return TRAINING_GUIDES[templateId];
}

// The day a guide belongs to comes from the real schedule, never a label
// typed into this file (those went stale the moment the weekly pattern
// changed): the session's own date when there is one, otherwise the
// template's usual weekday, otherwise "flexibel" (e.g. Benen B, a ride).
const WEEKDAYS_NL = ['MAANDAG', 'DINSDAG', 'WOENSDAG', 'DONDERDAG', 'VRIJDAG', 'ZATERDAG', 'ZONDAG'];

export function guideDayLabel(template: Pick<SessionTemplate, 'defaultDayOfWeek'> | undefined, dateIso?: string): string {
  if (dateIso) return WEEKDAYS_NL[isoWeekday(dateIso) - 1];
  if (template?.defaultDayOfWeek) return WEEKDAYS_NL[template.defaultDayOfWeek - 1];
  return 'FLEXIBEL';
}
