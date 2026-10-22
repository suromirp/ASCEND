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
const FRANDSEN_SPIKES: GuideSource = { label: 'Frandsen e.a. 2025, te grote sprong in één loop (BJSM)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12421110/' };
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
    subtitle: 'Kracht · bovenlichaam',
    registration: 'ASCEND: alleen voltooid/niet voltooid. Oefeningen, sets, reps, gewicht en RIR log je in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Eerste bovenlichaamtraining van de week, algemene kracht en spiergroei van borst, rug, schouders en armen. Krachttraining blijft ook naast hardlopen en hiken belangrijk: het kan je zelfs zuiniger laten lopen.',
      },
      {
        heading: 'UITVOERING',
        body: 'Het volledige programma staat in MacroFactor Workouts: oefeningen, sets, herhalingen, gewicht, rust en hoeveel herhalingen je in de tank houdt (RIR). Dat hoef je niet nog eens in ASCEND vast te leggen. MacroFactor past je volgende trainingen aan op wat je logt.',
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

  tpl_intervals: {
    subtitle: 'Hardlopen • Lange intervallen',
    registration: 'ASCEND: duur, afstand, gemiddelde hartslag en hoe zwaar het voelde, via je Garmin.',
    sections: [
      {
        heading: 'WAAROM',
        body: 'In het blok voor je wedstrijd komen deze intervallen op zaterdag, in plaats van de heuvels. Intervallen van 2 minuten of langer verhogen je conditie (VO2max) aantoonbaar meer dan rustig lopen, vooral bij minstens een kwartier hard werk per keer en een blok van 4 weken of langer. Samen met de tempoloop zijn het je twee kwaliteitstrainingen; meer hoeft niet.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          '12 minuten inlopen, met aan het eind 3 korte versnellingen.',
          'Blokken van 4 minuten hard: zone 4, ongeveer je 5 km-tempo. Alleen losse woorden lukken nog.',
          'Tussen de blokken 3 minuten rustig joggen.',
          '8 minuten uitlopen.',
        ],
        note: 'Gelijkmatig is het doel: het laatste blok even snel als het eerste. Haal je dat duidelijk niet meer, stop dan daar.',
      },
    ],
    gear: ['Garmin met borstband', 'hardloopschoenen'],
    sources: [PUBMED_INTENSITY_DISTRIBUTION],
  },

  tpl_hills_descent: {
    subtitle: 'Hardlopen en wandelen • Op en af',
    registration: 'ASCEND: duur, D+ en D− als je die hebt, en hoe zwaar het voelde.',
    sections: [
      {
        heading: 'WAAROM',
        body: 'De GR5 vraagt ongeveer 30.000 meter dalen. Dalen beschadigt je bovenbenen het meest, maar na een paar korte afdaalsessies veel minder: dat beschermingseffect houdt weken, en is na 6 tot 9 weken zonder herhaling weg. Daarom wordt de heuveldag om de twee weken "op en af".',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          '10 minuten opwarmen.',
          'Een paar keer 1 minuut hard bergop, wandelend terug.',
          'Daarna rustig en beheerst afdalen, telkens opnieuw: een trappenhuis af, een duin af of een heuvel af.',
          'Kleine pasjes, knieën licht gebogen, niet rennen.',
        ],
        note: 'De eerste keren krijg je spierpijn in je bovenbenen. Dat is de prikkel en het wordt snel minder. Scherpe pijn in je knie: stoppen.',
      },
    ],
    gear: ['hardloopschoenen', 'een trappenhuis, duin of heuvel'],
    sources: [PUBMED_DOWNHILL],
  },

  tpl_fartlek: {
    subtitle: 'Hardlopen • Speelse snelheid',
    registration: 'ASCEND: duur, afstand, gemiddelde hartslag en hoe zwaar het voelde, via je Garmin.',
    sections: [
      {
        heading: 'WAAROM',
        body: 'ASCEND kiest deze training als tempo je grootste tekort is voor een hardloopdoel. Korte harde stukken op ongeveer je 5 tot 10 km-tempo, sneller dan je tempoloop, zodat de twee iets anders trainen. Het grootste deel van je week blijft rustig, zoals het hoort.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          '10 minuten rustig inlopen.',
          'Stukken van 1 minuut hard: ongeveer je 5 tot 10 km-tempo, alleen losse woorden (zone 4).',
          'Anderhalve minuut rustig doorlopen ertussen.',
          '5 minuten uitlopen.',
        ],
        note: 'Op gevoel, niet op het horloge. Een heuvel of een lantaarnpaal als eindpunt mag ook: dat is precies wat fartlek is.',
      },
    ],
    gear: ['Garmin met borstband', 'hardloopschoenen'],
    sources: [PUBMED_INTENSITY_DISTRIBUTION, PUBMED_TALK_TEST],
  },

  tpl_progression_run: {
    subtitle: 'Hardlopen • Progressief',
    registration: 'ASCEND: duur, afstand, gemiddelde hartslag en hoe zwaar het voelde, via je Garmin.',
    sections: [
      {
        heading: 'WAAROM',
        body: 'ASCEND kiest deze training als tempo je grootste tekort is, in de zwaarste week van een blok. Rustig beginnen en pas aan het eind steviger: je oefent tempo houden op benen die al moe zijn, zonder dat het een zware training wordt.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          'Rustig in zone 2, hele zinnen kunnen praten.',
          'Het laatste stuk iets steviger, zone 3: korte zinnen lukken nog. Dat stuk groeit van 10 naar 20 minuten.',
          'De laatste paar minuten weer rustig uitlopen.',
        ],
        note: 'Niet harder dan zone 3. Wordt het zwaarder, loop dan gewoon rustig uit.',
      },
    ],
    gear: ['Garmin met borstband', 'hardloopschoenen'],
    sources: [PUBMED_INTENSITY_DISTRIBUTION, PUBMED_TALK_TEST],
  },

  tpl_recovery_run: {
    subtitle: 'Hardlopen • Herstel',
    registration: 'ASCEND: duur en hoe het voelde. Meer hoeft niet.',
    sections: [
      {
        heading: 'WAAROM',
        body: 'ASCEND kiest deze training in de week na je wedstrijd, minstens 48 uur erna. Eerlijk: er is geen bewijs dat een herstelloop je sneller laat herstellen dan rust. Het is rustig extra volume dat het ritme erin houdt. Rust, wandelen of fietsen is net zo goed.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: ['Heel rustig, langzamer dan je rustige duurloop.', 'Geen tempo, geen hartslagdoel.'],
        note: 'Zware of pijnlijke benen? Wandel of sla hem over. Ook dat is herstel.',
      },
    ],
    gear: ['hardloopschoenen'],
    sources: [PUBMED_INJURY_LOAD_1],
  },

  tpl_ruck_walk: {
    subtitle: 'Wandelen • Rugzak',
    registration: 'ASCEND: duur, afstand, hoogtemeters en het gewicht van je rugzak.',
    sections: [
      {
        heading: 'WAAROM',
        body: 'ASCEND kiest deze training als lang onderweg zijn of een rugzak dragen je grootste tekort is voor de GR5. Wandelen met een rugzak bouwt uren op de been en draagkracht op, met veel minder klap voor je benen dan hardlopen. Onderzoek naar rugzaktraining vond het meeste effect als het gewicht stap voor stap omhoog gaat, naast conditie en kracht.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          'De rugzak van deze week, strak op je heupen. Deze winter begin je licht, rond 5 tot 6 kilo, en het gewicht klimt in kleine stappen.',
          'Stevig doorwandelen, hele zinnen kunnen praten.',
          'Heuvels, duinen of trappen als dat kan, ook naar beneden.',
          'Loop je op de GR5 met stokken? Neem ze nu al mee en oefen: bergop korter, bergaf langer, en voel hoe je schouders en polsen reageren.',
        ],
        note: 'Nooit zwaarder dan de rugzak van je bergtocht die week. Gaan schouders, rug of knieën zeuren: lichter of korter.',
      },
    ],
    gear: ['rugzak met heupband', 'wandelschoenen'],
    sources: [PUBMED_LOAD_CARRYING],
  },

  tpl_strides_run: {
    subtitle: 'Hardlopen • Extra loop',
    registration: 'ASCEND: duur, afstand, gemiddelde hartslag en hoe zwaar het voelde, via je Garmin.',
    sections: [
      {
        heading: 'WAAROM',
        body: 'In de Opbouw stelt ASCEND een extra loop voor als de weken ervoor goed gingen: bijna alles gedaan, geen pijn, niet steeds zwaarder dan gepland. Zo groeit je weekvolume, terwijl geen enkele loop meer dan 10% boven je langste van de afgelopen maand komt. Juist zo\'n sprong in één loop hing samen met meer blessures, het weektotaal niet.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          'Rustig hardlopen in zone 2, je kunt hele zinnen praten.',
          'Aan het eind 6 versnellingen van 20 seconden: rustig optrekken tot ongeveer je 5 km-tempo.',
          'Ontspannen schouders, snelle korte passen, niet sprinten.',
          'Ertussen wandelen of heel rustig joggen tot je weer op adem bent.',
        ],
        note: 'Moe of stijf? Laat de versnellingen weg en loop alleen het rustige deel. Gaat het een paar weken minder, dan stelt ASCEND hem niet meer voor.',
      },
    ],
    gear: ['Garmin met borstband', 'hardloopschoenen'],
    sources: [PUBMED_INJURY_LOAD_1, FRANDSEN_SPIKES],
  },

  tpl_tempo_run: {
    subtitle: 'Hardlopen • Drempeltempo',
    registration: 'ASCEND: duur, afstand, gemiddelde hartslag en hoe zwaar het voelde, via je Garmin.',
    sections: [
      {
        heading: 'WAAROM',
        body: 'Je hebt een hardloopwedstrijd als tussendoel. In de 8 weken ervoor wordt de rustige duurloop een tempoloop: blokken rond je drempel, het tempo dat je ongeveer een uur kunt volhouden. Dat is de training die je 10 km-tempo het meest laat opschuiven, en hij telt ook gewoon mee voor je basis richting de GR5.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          '10 minuten rustig inlopen.',
          'Blokken van 7 minuten comfortabel zwaar: je kunt nog korte zinnen zeggen, niet meer (RPE 6-7, zone 3).',
          'Tussen de blokken anderhalve minuut rustig doorlopen.',
          '8 minuten uitlopen.',
        ],
        note: 'Niet harder dan drempel. Te hard lopen is de meest gemaakte fout: het voelt goed, maar je herstelt slechter en de week erna lijdt eronder.',
      },
    ],
    gear: ['Garmin met borstband', 'hardloopschoenen'],
    sources: [PUBMED_INTENSITY_DISTRIBUTION, PUBMED_TALK_TEST],
  },

  tpl_test_run: {
    subtitle: 'Hardlopen • Meetpunt',
    registration: 'ASCEND: alleen de 5 km zelf. Afstand 5, de tijd van de test, en de zwaarte die je voelde (meestal 8 of 9).',
    sections: [
      {
        heading: 'WAAROM',
        body: 'Een rustig loopje zegt niets over je wedstrijdtempo. Een 5 km op tijd wel: daaruit rekent ASCEND hoe haalbaar je doeltijd is, en de tweede test laat zien wat je tempolopen opleverden.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          'Kies een vlakke route of een atletiekbaan.',
          '10 minuten inlopen met 2 tot 3 korte versnellingen.',
          '5 km zo snel als je gelijkmatig volhoudt. Start niet te snel: de laatste kilometer mag het zwaarst voelen.',
          'Rustig uitlopen.',
        ],
        note: 'Vul bij het afvinken alleen de test zelf in, niet het in- en uitlopen. Anders klopt je tempo niet.',
      },
    ],
    gear: ['Garmin', 'hardloopschoenen'],
    sources: [PUBMED_INJURY_LOAD_1],
  },

  tpl_race: {
    subtitle: 'Hardlopen • Wedstrijd',
    registration: 'ASCEND: je tijd, afstand en gemiddelde hartslag. Dit is je nieuwe meetpunt.',
    sections: [
      {
        heading: 'DE DAGEN ERVOOR',
        body: 'ASCEND houdt de dagen voor de wedstrijd licht: geen heuvels of zware beentraining vlak ervoor. De dag erna is de lange duurloop kort.',
      },
      {
        heading: 'OP DE DAG',
        items: [
          'Eet zoals je gewend bent, niets nieuws.',
          'Goed inlopen: 10 tot 15 minuten rustig met 3 tot 4 korte versnellingen.',
          'Start de eerste kilometer iets rustiger dan je doeltempo.',
          'Voelt het halverwege goed, versnel dan geleidelijk.',
        ],
      },
    ],
    gear: ['Garmin', 'je vertrouwde schoenen'],
    sources: [PUBMED_INJURY_LOAD_1],
  },

  tpl_easy_run: {
    subtitle: 'Cardio • Aerobe basis',
    registration: 'ASCEND: duur, afstand, D+, gemiddelde hartslag, via Garmin Forerunner 255 + borstband.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Aerobe basis en hardloopontwikkeling opbouwen, zonder je herstel van de beentraining of de heuvelintervallen in het weekend te verstoren. De opbouw zit bewust vooral in duur, niet tegelijk in duur én tempo én intensiteit, plotselinge sprongen in trainingsbelasting hangen samen met een hoger blessurerisico.',
      },
      {
        heading: 'INTENSITEIT',
        body: 'RPE ongeveer 3-4 van 10: ontspannen lopen en hele zinnen kunnen praten. Geen record, geen tempoloop. De praattest is een goede maatstaf: kun je praten, dan zit je rond of onder je aerobe drempel, precies waar deze training hoort.',
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
        note: 'Tempo is géén doel. Op een warme dag, met wind of als je moe bent, is dezelfde rustige inspanning een stuk langzamer.',
      },
      {
        heading: 'WANNEER TE LANGZAAM?',
        body: 'Bij een rustige duurloop is te langzaam veel minder een probleem dan te snel. Zolang je écht rustig loopt met een natuurlijke loopbeweging, hoeft het tempo niet omhoog omdat je hartslag laag is, het hoofddoel is rustig volume verzamelen zonder je herstel van Benen A of de heuvelintervallen te verstoren.',
      },
      {
        heading: 'GARMIN',
        body: 'Hartslagzones op basis van je drempelhartslag zijn preciezer dan zones op basis van je maximale hartslag. Hoofdscherm: timer, hartslag, hartslagzone, tempo. De borstband heeft de voorkeur boven de polssensor voor trainingssturing.',
      },
    ],
    garminNote: 'Volledige Garmin-instellingen (zones, databeelden, borstband) staan in de Garmin-gids.',
    gear: ['Forerunner 255', 'Garmin borstband', 'hardloopschoenen', 'kleding passend bij het weer'],
    sources: [PUBMED_INJURY_LOAD_1, PUBMED_INJURY_LOAD_2, PUBMED_INTENSITY_DISTRIBUTION, PUBMED_TALK_TEST, GARMIN_ZONES, GARMIN_STRAP_PRIORITY],
  },

  tpl_lower_a: {
    subtitle: 'Kracht · benen',
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
          'je benen zijn op de dag van de beentraining nog steeds erg moe',
        ],
        note: 'Bij dit patroon eerst de rustige duurloop en het weekend lichter maken (korter/langzamer), niet meteen Benen A opofferen.',
      },
    ],
    gear: ['MacroFactor Workouts', 'normale gymuitrusting', 'water', 'geschikt schoeisel'],
    sources: [PUBMED_CONCURRENT_TRAINING],
  },

  tpl_upper_b: {
    subtitle: 'Kracht · bovenlichaam',
    registration: 'ASCEND: alleen afvinken. Oefeningen, sets, reps, gewicht en RIR in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'De tweede training voor je bovenlichaam deze week. Samen met Bovenlichaam A verdeel je het werk over twee trainingen. Voor spiergroei tellen vooral genoeg werk per week en regelmaat; voor kracht vooral zwaarder gewicht.',
      },
      {
        heading: 'WAAR OP LETTEN',
        body: 'Geen extra conditietraining nodig vandaag. Dit is bewust een dag zonder zware beenbelasting, tussen de beentraining en het zware weekend.',
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
        heading: 'OPTIE A, LOOPBAND OP HELLING',
        body: 'Helling ongeveer 8–15%, snelheid meestal 4–5,5 km/u, RPE 4–5/10, een werkgebied, geen verplichte combinatie. Kies snelheid en helling waarmee je de volledige geplande tijd gecontroleerd kunt volhouden, niet automatisch de zwaarste combinatie. Niet structureel aan de handgrepen hangen, dat vermindert bovendien de nauwkeurigheid van Garmins afstandsmeting.',
      },
      {
        heading: 'GESCHATTE D+, GEEN GPS-METING',
        body: 'Op een loopband ga je niet echt omhoog, dus de hoogtemeters van je Garmin kloppen daar niet. ASCEND schat D+ uit afstand × helling% (D+ ≈ afstand in meters × helling% ÷ 100), vul de helling in bij het loggen en ASCEND berekent en vult de schatting voor je in. Dit blijft een trainingsmaat, geen echte hoogtemeting.',
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
          'je hartslag zit op het niveau van een tempoloop',
          'benen zijn zaterdag nog zwaar',
          'Benen B-prestaties dalen structureel',
          'je moet aan de loopband hangen om het tempo vol te houden',
        ],
        note: 'Dan eerst snelheid of helling omlaag, niet meteen de hele training overslaan.',
      },
    ],
    garminNote: 'Zie de Garmin-gids voor custom-activity- en databeeld-tips bij indoor klimmen.',
    gear: ['Forerunner 255', 'Garmin borstband', 'trainingsschoenen', 'water', 'loopband (of buitenroute)'],
    sources: [GARMIN_HANDRAIL, GARMIN_CUSTOM_ACTIVITY, GARMIN_INDOOR_ACCELEROMETER, GARMIN_CALIBRATION, GARMIN_ELEVATION_FIELDS, PUBMED_DOWNHILL, PUBMED_LOAD_CARRYING],
  },

  tpl_lower_b: {
    subtitle: 'Kracht · benen',
    registration: 'ASCEND: alleen afvinken. Oefeningen, sets, reps, gewicht en RIR in MacroFactor.',
    sections: [
      {
        heading: 'DOEL',
        body: 'De tweede beentraining van de week. MacroFactor bepaalt de daadwerkelijke belasting, dit is niet per definitie lichter dan Benen A.',
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
    gear: ['Forerunner 255', 'Garmin borstband', 'hardloopschoenen', 'loopband (of buiten een heuvel of trap)'],
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
        body: 'De lange duurloop komt direct na de heuvelintervallen. Dat is geen ongelukkige planning: bergsport-specifieke schema\'s trainen bewust een zwaar weekendblok (klimprikkel, dan een dag op vermoeide benen) omdat dat is wat een meerdaagse tocht als de GR5 daadwerkelijk vraagt.',
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

  // Fase 3: the GR5 sessions from Bergcapaciteit on, and the bike ride.
  tpl_mountain_hike: {
    subtitle: 'Wandelen · met rugzak',
    registration: 'ASCEND: duur, afstand, hoogtemeters omhoog en omlaag, rugzakgewicht, zwaarte.',
    sections: [
      {
        heading: 'DOEL',
        body: 'De training die het meest op een GR5-dag lijkt: uren op de benen, echte hoogtemeters omhoog en vooral omlaag, en de rugzak op je rug. Duur, hoogtemeters en rugzakgewicht groeien per week in kleine stappen. Het rugzakgewicht gaat nooit omhoog in een week waarin ook de hoogtemeters omhoog gaan, en loopt naar je rugzakdoel, met in de zwaarste weken tot 1 kg erboven.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          'Rustig tempo: je kunt blijven praten, ook bergop (zone 1 tot 2, RPE 3-4).',
          'Bergop kleine passen, bergaf beheerst en met gebogen knieën. Dalen is wat je bovenbenen het meest vraagt.',
          'Elk uur iets eten en regelmatig drinken, zoals je dat op de GR5 ook doet.',
          'Loop je op de GR5 met stokken? Oefen er nu al mee: lengte instellen, bergop korter, bergaf langer, en ook met je rugzak van deze week.',
          'Geen heuvels in de buurt? Herhaal een helling, trap of duin. Of loop het stijgende deel op de loopband en daal op een trap.',
        ],
      },
      {
        heading: 'WANNEER TE ZWAAR?',
        items: [
          'je knieën gaan zeuren bij het dalen',
          'je kunt bergop geen hele zinnen meer praten',
          'je schouders of heupen doen pijn van de rugzak',
          'je krijgt honger of dorst die niet meer weggaat',
        ],
        note: 'Neem dan kleinere passen bij het dalen, gebruik stokken (in een kleine studie gaven wandelstokken na een bergtocht minder spierschade en spierpijn, dus oefen er nu al mee), of loop de tocht met een kilo of twee minder in je rugzak. Liever de rugzak een week langer op hetzelfde gewicht dan een stap te snel.',
      },
      {
        heading: 'VEILIG OP PAD',
        body: 'Check de route en het weer, en laat iemand weten waar je loopt en wanneer je terug bent. Dit is de langste training van de week, tot vijf uur in Expeditieklaar.',
      },
    ],
    gear: ['rugzak met het gewicht van deze week', 'water', 'eten voor elk uur', 'regenjas', 'wandelschoenen', 'stokken als je die op de GR5 gebruikt', 'Forerunner 255'],
    sources: [
      { label: 'NKBV, fit de bergen in', url: 'https://nkbv.nl/kenniscentrum/fit-de-bergen-in-conditie.html' },
      { label: 'NKBV, veilig bergwandelen', url: 'https://nkbv.nl/kenniscentrum/veilig-bergwandelen.html' },
      { label: 'PubMed, trainen voor het dragen van gewicht', url: 'https://pubmed.ncbi.nlm.nih.gov/22130400/' },
      { label: 'PubMed, voorbereiden op afdalen', url: 'https://pubmed.ncbi.nlm.nih.gov/28288187/' },
    ],
  },

  tpl_hike_day_one: {
    subtitle: 'Wandelen · dag 1 van 2',
    registration: 'ASCEND: duur, afstand, hoogtemeters omhoog en omlaag, rugzakgewicht, zwaarte.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Twee dagen achter elkaar wandelen, zoals op de GR5. Deze eerste dag is bewust rustiger dan morgen. Het doel is niet deze dag zwaar maken, maar morgen op vermoeide benen gewoon weer kunnen vertrekken.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: [
          'Bewust rustig (RPE 3): je bewaart iets voor morgen.',
          'Hoogteverschil en de rugzak van deze week, net als morgen.',
          'Na afloop goed eten, drinken en slapen. Je leert hier hoe je herstelt tussen twee tochtdagen.',
          'Slaap je er een nacht tussen in je tent? Dan oefen je ook tent opzetten, koken en slapen, zoals op de GR5 elke dag.',
        ],
      },
      {
        heading: 'WANNEER TE ZWAAR?',
        items: [
          'je bent na afloop zo moe dat morgen niet lukt',
          'je knieën of voeten zeuren al aan het eind van vandaag',
        ],
        note: 'Maak vandaag dan korter of vlakker. Morgen is de belangrijkste dag van het weekend.',
      },
    ],
    gear: ['rugzak met het gewicht van deze week', 'water', 'eten', 'regenjas', 'wandelschoenen', 'Forerunner 255'],
    sources: [
      { label: 'NKBV, fit de bergen in', url: 'https://nkbv.nl/kenniscentrum/fit-de-bergen-in-conditie.html' },
      { label: 'PubMed, trainen voor het dragen van gewicht', url: 'https://pubmed.ncbi.nlm.nih.gov/22130400/' },
    ],
  },

  tpl_bike: {
    subtitle: 'Fietsen · rustig',
    registration: 'ASCEND: duur, afstand, zwaarte.',
    sections: [
      {
        heading: 'DOEL',
        body: 'Een rustige rit voor je conditie, zonder de schokken van hardlopen. Telt als fietsen, niet als hardlopen.',
      },
      {
        heading: 'ZO DOE JE HET',
        items: ['Rustig tempo: je kunt hele zinnen praten (zone 2, RPE 3-4).', 'Liever wat langer rustig dan kort en hard.'],
      },
      {
        heading: 'WANNEER TE ZWAAR?',
        items: ['je kunt niet meer praten', 'je benen zijn de dag erna nog zwaar voor een krachttraining of loop'],
        note: 'Fiets dan korter of in een lichtere versnelling.',
      },
    ],
    gear: ['fiets', 'helm', 'water', 'Forerunner 255'],
    sources: [],
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
