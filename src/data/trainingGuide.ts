// Rich per-training-day content for the Month 1 (BASISFASE) schedule —
// shown in TrainingGuideSheet, reachable both via an info button on the
// session itself (TodayMissionCard/SessionActionSheet) and via the
// standalone Trainingsgids index page. Keyed by SessionTemplate.id from
// data/defaultProgram.ts, so nothing here needs its own id scheme.
//
// Sources link to the official organisations' homepages, not specific
// deep-linked articles — same approach as data/gr5Details.ts, for the same
// reason: the underlying citations didn't come with stable direct URLs.

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
  dayLabel: string;
  subtitle: string;
  registration: string;
  sections: GuideSection[];
  gear: string[];
  garminNote?: string;
  sources: GuideSource[];
}

const PUBMED: GuideSource = { label: 'PubMed — wetenschappelijke literatuur', url: 'https://pubmed.ncbi.nlm.nih.gov' };
const GARMIN: GuideSource = { label: 'Garmin — support & training', url: 'https://www.garmin.com' };
const MACROFACTOR: GuideSource = { label: 'MacroFactor — help center', url: 'https://macrofactorapp.com' };
const ACSM: GuideSource = { label: 'ACSM — Resistance Training Position Stand', url: 'https://www.acsm.org' };

export const TRAINING_GUIDES: Record<string, TrainingDayGuide> = {
  tpl_upper_a: {
    dayLabel: 'MAANDAG',
    subtitle: 'Kracht • Hypertrofie • Bovenlichaam',
    registration: 'Ascend: alleen voltooid/niet voltooid. Oefeningen, sets, reps, gewicht en RIR log je in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Eerste bovenlichaamtraining van de week — algemene kracht en spiergroei van borst, rug, schouders en armen. Krachttraining blijft ook naast hardlopen en hiken belangrijk: het kan bij lopers zelfs de running economy verbeteren.',
      },
      {
        heading: 'UITVOERING',
        body: 'Het volledige programma — oefeningen, sets, reps, gewicht, RIR, rusttijden — draait in MacroFactor Workouts. Dat hoeft niet nogmaals in Ascend te worden vastgelegd. MacroFactor gebruikt je gelogde gewichten, reps en RIR voor Smart Progression en past toekomstige aanbevelingen daarop aan.',
      },
      {
        heading: 'WAAR OP LETTEN',
        subsections: [
          { heading: 'Goed', items: ['geplande sets uitgevoerd', 'techniek blijft stabiel', 'MacroFactor-targets voor reps/RIR gehaald', 'geen noodzaak om achteraf extra cardio toe te voegen'] },
          { heading: 'Te zwaar', items: ['techniek verslechtert duidelijk', 'targets worden herhaaldelijk niet gehaald', 'werkelijk RIR ligt veel lager dan voorgeschreven', 'prestaties lopen meerdere sessies achter elkaar terug'] },
        ],
        note: 'Eén mindere training is geen reden om het programma aan te passen — kijk naar trends over meerdere weken.',
      },
      {
        heading: 'DELOAD',
        body: 'MacroFactor plant zijn eigen deload-cyclus op basis van je trainingsgeschiedenis (training cycles, geen kalenderweken) — die hoeft niet exact samen te vallen met week 4 van dit Ascend-blok. Verschuiven of missen van workouts schuift de MacroFactor-cyclus mee.',
      },
    ],
    gear: ['MacroFactor Workouts', 'normale gymuitrusting', 'water', 'geschikt schoeisel'],
    sources: [ACSM, MACROFACTOR],
  },

  tpl_easy_run: {
    dayLabel: 'DINSDAG',
    subtitle: 'Cardio • Aerobe basis',
    registration: 'Ascend: duur, afstand, D+, gemiddelde hartslag — via Garmin Forerunner 255 + borstband.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Aerobe basis en hardloopontwikkeling opbouwen zonder woensdag (Lower A) te verstoren. De opbouw zit bewust vooral in duur, niet tegelijk in duur én tempo én intensiteit — plotselinge sprongen in trainingsbelasting hangen samen met een hoger blessurerisico.',
      },
      {
        heading: 'INTENSITEIT',
        body: 'RPE ongeveer 3–4/10 — ontspannen lopen, volledige zinnen kunnen spreken, geen PR, geen tempo-/thresholdrun. De talk test correspondeert redelijk met een intensiteit rond of onder de aerobe drempel en is een bruikbare praktische maatstaf om rustige duurtraining te sturen.',
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
          'woensdag (Lower A) is merkbaar slechter door dinsdag',
        ],
        note: 'Tempo is géén doel. Op een warme dag, met wind of vermoeidheid kan hetzelfde easy effort aanzienlijk langzamer zijn.',
      },
      {
        heading: 'WANNEER TE LANGZAAM?',
        body: 'Bij een Easy Run is te langzaam veel minder een probleem dan te snel. Zolang je écht rustig loopt met een natuurlijke loopbeweging, hoeft het tempo niet omhoog omdat je hartslag laag is — het hoofddoel is rustig volume verzamelen zonder Lower A te beschadigen.',
      },
      {
        heading: 'GARMIN',
        body: 'Sportspecifieke running-zones op basis van %LTHR geven een preciezer beeld dan generieke %Max HR-zones. Hoofdscherm: timer, hartslag, hartslagzone, tempo. De borstband heeft de voorkeur boven de polssensor voor trainingssturing.',
      },
    ],
    garminNote: 'Volledige Garmin-instellingen (zones, databeelden, borstband) staan in de Garmin-gids.',
    gear: ['Forerunner 255', 'Garmin borstband', 'hardloopschoenen', 'kleding passend bij het weer'],
    sources: [PUBMED, GARMIN],
  },

  tpl_lower_a: {
    dayLabel: 'WOENSDAG',
    subtitle: 'Kracht • Belangrijkste lower-body sessie',
    registration: 'Ascend: alleen afvinken. Oefeningen, sets, reps, gewicht en RIR in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Ontwikkelen en behouden van maximale kracht, spiermassa en robuustheid van het onderlichaam — de basis voor hardlopen en later stijgen en rugzakwerk.',
      },
      {
        heading: 'WAAROM NA DE EASY RUN?',
        body: 'Dinsdag is bewust rustig gehouden zodat woensdag kwaliteit kan leveren. Kracht- en duurtraining combineren is prima verdedigbaar — de praktische regel is: houd dinsdag rustig genoeg zodat Lower A niet lijdt onder de combinatie.',
      },
      {
        heading: 'CONTROLEPUNT',
        items: [
          'squat-/legpressprestaties gaan meerdere weken achteruit',
          'RDL/hinge wordt duidelijk slechter',
          'warming-upgewichten voelen ongewoon zwaar',
          'benen zijn iedere woensdag nog sterk vermoeid',
        ],
        note: 'Bij dit patroon eerst dinsdag aanpassen (korter/langzamer) — niet meteen Lower A opofferen.',
      },
    ],
    gear: ['MacroFactor Workouts', 'normale gymuitrusting', 'water', 'geschikt schoeisel'],
    sources: [PUBMED],
  },

  tpl_upper_b: {
    dayLabel: 'DONDERDAG',
    subtitle: 'Kracht • Hypertrofie • Bovenlichaam',
    registration: 'Ascend: alleen afvinken. Oefeningen, sets, reps, gewicht en RIR in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Tweede bovenlichaamprikkel van de week — samen met Upper A verdeelt dit het wekelijkse volume over twee sessies. Voor hypertrofie tellen vooral voldoende wekelijks volume en consistentie; voor kracht wegen zwaardere belastingen zwaarder.',
      },
      {
        heading: 'WAAR OP LETTEN',
        body: 'Geen extra endurance nodig deze dag. Dit is bewust ook een dag zónder zware beenbelasting, ingeklemd tussen woensdag (Lower A) en vrijdag (Bergconditie).',
      },
    ],
    gear: ['MacroFactor Workouts', 'normale gymuitrusting', 'water', 'geschikt schoeisel'],
    sources: [ACSM, MACROFACTOR],
  },

  tpl_bergconditie: {
    dayLabel: 'VRIJDAG',
    subtitle: 'Alpine Base • Uphill Endurance',
    registration: 'Ascend: duur, afstand, helling/D+, gemiddelde hartslag, RPE.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Primair: langdurig bergop kunnen bewegen. Secundair: verticale trainingsbelasting opbouwen richting de GR5.',
      },
      {
        heading: 'OPTIE A — INCLINE TREADMILL',
        body: 'Helling ongeveer 8–15%, snelheid meestal 4–5,5 km/u, RPE 4–5/10 — een werkgebied, geen verplichte combinatie. Kies snelheid en helling waarmee je de volledige geplande tijd gecontroleerd kunt volhouden, niet automatisch de zwaarste combinatie. Niet structureel aan de handgrepen hangen — dat vermindert bovendien de nauwkeurigheid van Garmins afstandsmeting.',
      },
      {
        heading: 'GESCHATTE D+ — GEEN GPS-METING',
        body: 'Op een treadmill verander je fysiek niet van hoogte, dus Garmins Total Ascent is daar geen betrouwbare maat. Ascend schat D+ uit afstand × helling% (D+ ≈ afstand in meters × helling% ÷ 100) — vul de helling in bij het loggen en Ascend berekent en vult de schatting voor je in. Dit blijft een trainingsmaat, geen echte hoogtemeting.',
      },
      {
        heading: 'OPTIE B — BUITEN HIKEN',
        body: 'Wanneer mogelijk heeft een echte heuvelroute extra waarde: ongelijke ondergrond, balans, wisselende staplengtes en écht D+/D- die een treadmill niet levert. Log met GPS: duur, afstand, D+, D-, hartslag, RPE.',
      },
      {
        heading: 'WANNEER TE ZWAAR?',
        items: [
          'RPE loopt langdurig naar 6–7+',
          'praten wordt lastig',
          'hartslag lijkt op thresholdtraining',
          'benen zijn zaterdag nog zwaar',
          'Lower B-prestaties dalen structureel',
          'je moet aan de treadmill hangen om tempo vol te houden',
        ],
        note: 'Dan eerst snelheid of helling omlaag — niet meteen de hele training overslaan.',
      },
    ],
    garminNote: 'Zie de Garmin-gids voor custom-activity- en databeeld-tips bij indoor klimmen.',
    gear: ['Forerunner 255', 'Garmin borstband', 'trainingsschoenen', 'water', 'treadmill (of buitenroute)'],
    sources: [GARMIN, PUBMED],
  },

  tpl_lower_b: {
    dayLabel: 'ZATERDAG',
    subtitle: 'Kracht • Hypertrofie • Onderlichaam',
    registration: 'Ascend: alleen afvinken. Oefeningen, sets, reps, gewicht en RIR in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Tweede lower-body prikkel van de week. MacroFactor bepaalt de daadwerkelijke belasting — dit is niet per definitie lichter dan Lower A.',
      },
      {
        heading: 'BELANGRIJKSTE MEETPUNT',
        body: 'Deze training is de controle of vrijdag (Bergconditie) goed gedoseerd was. Wordt Lower B gedurende meerdere weken aantoonbaar slechter na vrijdag? Pas dan eerst Bergconditie aan — niet meteen de krachttraining schrappen.',
      },
      {
        heading: 'LATER',
        body: 'Kan mountain-specifieker worden: single-leg kracht, step-ups, gecontroleerde step-downs, kuit-/soleuswerk, hamstrings, core/bracing — hoeft nu nog niet los in Ascend geprogrammeerd te worden zolang MacroFactor het krachtprogramma beheert.',
      },
    ],
    gear: ['MacroFactor Workouts', 'normale gymuitrusting', 'water', 'geschikt schoeisel'],
    sources: [PUBMED],
  },

  tpl_herstel: {
    dayLabel: 'ZONDAG',
    subtitle: 'Recovery • Rustige beweging',
    registration: 'Training is niet verplicht.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Vermoeidheid laten dalen voordat maandag de volgende trainingscyclus begint. Een herstelwandeling hoeft niet als prestatie behandeld te worden — geen tempo- of hartslagdoel nodig.',
      },
      { heading: 'OPTIES', items: ['volledige rust', '30–60 min rustige wandeling'] },
      { heading: 'GEEN', items: ['intervallen', 'zware incline', 'lange run', 'zware beentraining'] },
      {
        heading: 'GARMIN RECOVERY TIME',
        body: 'Een hoge Recovery Time betekent niet "36 uur niet sporten" — het is Garmins schatting van de tijd tot je optimaal hersteld bent voor de volgende zware workout, en past zich gedurende de dag aan op onder andere slaap, stress en activiteit. Hoge Recovery Time + rustige wandeling is meestal prima; hoge Recovery Time + een zware Lower-sessie is wel relevante informatie om mee te wegen.',
      },
    ],
    gear: ['comfortabele wandelschoenen (optioneel)'],
    sources: [GARMIN],
  },
};

export function getTrainingGuide(templateId: string): TrainingDayGuide | undefined {
  return TRAINING_GUIDES[templateId];
}
