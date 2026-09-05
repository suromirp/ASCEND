// Rich per-milestone content for the GR5 / Alpine Readiness ladder — shown
// in MilestoneDetailSheet when a ladder item is tapped. Keyed by the
// milestone's 1-based `order` (matches `obj_gr5_m{order}` in
// data/defaultProgram.ts) rather than by id, so this stays a plain content
// lookup independent of storage concerns.
//
// Sources link to the exact articles/pages supplied by the user
// (trainingsschema_bronnen_urls.txt) wherever a specific citation could be
// matched to its claim; a few less specific PubMed mentions still fall back
// to a general reference since no single confirmed URL matched them.

export interface MilestoneSource {
  label: string;
  url?: string;
}

export interface MilestoneDetail {
  subtitle: string;
  type: string;
  goal: string;
  why: string;
  note?: string;
  achievedWhen?: string[];
  achievedWhenGroups?: { heading: string; items: string[] }[];
  data?: string[];
  preparation?: string;
  sources: MilestoneSource[];
}

// "GR5 Alpes" (Grande Traversée des Alpes) is the org actually cited for
// etappe/route data — grande-traversee-alpes.com, not ffrandonnee.fr, which
// turned out to be a different real organisation (see FFRANDONNEE_SACADOS
// below, used only for the packing-list backpack-prep citation).
const GR5_ALPES: MilestoneSource = { label: 'GR5 Alpes — officiële GTA-etappes', url: 'https://www.grande-traversee-alpes.com/en/' };
const GR5_ALPES_WAYMARKING: MilestoneSource = { label: 'GR5 Alpes — bewegwijzering & routemoeilijkheid', url: 'https://www.grande-traversee-alpes.com/en/portfolio-item/balisage-et-difficulte-de-litineraire/' };
const GR5_ALPES_EQUIPMENT: MilestoneSource = { label: 'GR5 Alpes — uitrusting', url: 'https://www.grande-traversee-alpes.com/en/portfolio-item/equipement/' };
const FFRANDONNEE_SACADOS: MilestoneSource = { label: 'FFRandonnée — rugzak en uitrusting voorbereiden', url: 'https://www.ffrandonnee.fr/randonner/conseils/preparer-son-sac-a-dos' };
const NKBV: MilestoneSource = { label: 'NKBV — je eerste tocht voorbereiden', url: 'https://nkbv.nl/kenniscentrum/het-voorbereiden-van-je-eerste-tocht.html' };
const PUBMED: MilestoneSource = { label: 'PubMed — wetenschappelijke literatuur', url: 'https://pubmed.ncbi.nlm.nih.gov' };
const PUBMED_INTENSITY_DISTRIBUTION: MilestoneSource = { label: 'PubMed — trainingsintensiteit bij afstandslopers', url: 'https://pubmed.ncbi.nlm.nih.gov/PMC6253751/' };
const PUBMED_INJURY_LOAD: MilestoneSource = { label: 'PubMed — trainingsbelasting en blessurerisico', url: 'https://pubmed.ncbi.nlm.nih.gov/25010379/' };
const PUBMED_DOWNHILL: MilestoneSource = { label: 'PubMed — excentrische belasting bij afdalen', url: 'https://pubmed.ncbi.nlm.nih.gov/22130400/' };
const PUBMED_LOAD_CARRYING: MilestoneSource = { label: 'PubMed — load-carriage/rugzaktraining', url: 'https://pubmed.ncbi.nlm.nih.gov/35060915/' };
const GARMIN_ZONES: MilestoneSource = { label: 'Garmin — sportspecifieke hartslagzones', url: 'https://www8.garmin.com/manuals-apac/webhelp/forerunner255series/EN-SG/GUID-21F7EFD8-1AE2-4E1A-959E-A98B6A297584-1763.html' };

// Full GR5/Alpine kit list — separate from the per-milestone ladder content
// above, shown as its own reference card on the Ascend page (not tied to
// any single milestone). "Later" because none of this is needed for Maand
// 1's incline/hike training; it becomes relevant once the ladder gets
// closer to a real multi-day GR5 attempt.
export const GR5_PACKING_LIST: string[] = [
  'ingelopen, geschikte wandelschoenen',
  'passende kleding voor regen en kou',
  'rugzak',
  'water',
  'EHBO',
  'hoofdlamp',
  'regenbescherming',
  'topografische kaart',
  'GPS / GPX-tracks (offline)',
  'kompas',
  'smartphone',
  'zonnebril',
  'zonnebrand',
  'hoofddeksel',
  'handschoenen',
  'nooddeken',
  'eventueel trekkingstokken',
];

export const GR5_PACKING_NOTE =
  'Onnodig zwaar pakken is ongunstig — de etappes zijn al lang genoeg. GPX/offline navigatie is verstandig; let daarbij ook op batterijmanagement, want niet elke hut heeft goede laadmogelijkheden. Reken op weercontrole, routevoorbereiding, voldoende eten/drinken en iemand thuis laten weten welke tocht je doet.';

export const GR5_PACKING_SOURCES: MilestoneSource[] = [GR5_ALPES_EQUIPMENT, GR5_ALPES_WAYMARKING, FFRANDONNEE_SACADOS, NKBV];

// Backs the "TRAININGSVERDELING RICHTING GR5" card on the Ascend page —
// the meta-analysis behind "hardlopen blijft in het schema, gaat niet ten
// koste van kracht".
export const GR5_TRAINING_SPLIT_SOURCES: MilestoneSource[] = [
  { label: 'PubMed — concurrent kracht- en duurtraining, umbrella review', url: 'https://pubmed.ncbi.nlm.nih.gov/34757594/' },
];

export const GR5_MILESTONE_DETAILS: Record<number, MilestoneDetail> = {
  1: {
    subtitle: 'Aerobic Base',
    type: 'Ondersteunende conditiemijlpaal',
    goal: '40 minuten onafgebroken comfortabel hardlopen, zonder dat het een zware training wordt.',
    why: 'Bouwt aerobe capaciteit en cardiovasculaire efficiëntie op als basis voor de rest van de ladder. Vervangt bergwandelen niet — traint de langdurige belasting, rugzak, terrein en excentrische afdalingen onvoldoende specifiek — maar is een nuttige aanvulling naast klimtraining.',
    achievedWhen: [
      '40 min onafgebroken',
      'gecontroleerde ademhaling, gesprekstempo',
      'geen sterke terugval in de laatste 10 min',
      'de volgende dag normaal functionerende benen',
    ],
    data: ['Tijd', 'Gemiddelde hartslag', 'Tijd in zones', 'Tempo', 'Training Effect'],
    preparation: 'Bouw op via 30 → 35 → 40 min easy.',
    sources: [PUBMED_INTENSITY_DISTRIBUTION, GARMIN_ZONES],
  },
  2: {
    subtitle: 'Uphill Endurance',
    type: 'Eerste bergspecifieke aerobe mijlpaal',
    goal: '60 minuten continu klimmen/wandelen op incline volhouden, zonder dat de sessie een maximale inspanning wordt.',
    why: 'Bergop lopen vraagt sterk meer energie en zuurstof naarmate de helling toeneemt — een incline-sessie traint specifiek de cardiovasculaire kant van klimmen.',
    note: 'Test klimconditie, niet volledige berggereedheid: een incline-sessie levert nauwelijks de excentrische afdalingsbelasting van een echte berg.',
    achievedWhen: [
      '60 min continu',
      'circa 8–15% incline',
      'niet structureel aan de handgrepen hangen',
      'gecontroleerde aerobe inspanning — snelheid is niet het doel',
    ],
    data: ['Duur', 'Gemiddelde hartslag', 'Helling', 'Snelheid', 'Geschatte D+', 'RPE'],
    preparation: 'Bouw op via 20 → 30 → 45 → 60 min.',
    sources: [PUBMED],
  },
  3: {
    subtitle: 'Time on Feet',
    type: 'Time-on-feet mijlpaal',
    goal: '15 km wandelen zonder dat voeten, gewrichten of algemene vermoeidheid de beperkende factor worden.',
    why: 'Een GR5-etappe is geen uurtje klimmen — je bent vaak 5–8 uur onderweg. Officiële etappes zijn bijvoorbeeld 15,8 km/6u05/+1422 m of 22,6 km/7u38. Puur cardiovasculair fit zijn is dus niet genoeg.',
    achievedWhen: [
      '15 km onafgebroken',
      'comfortabel tempo',
      'voeten blijven goed',
      'geen beperkende gewrichtspijn',
      'daarna nog normaal kunnen bewegen',
    ],
    data: ['Afstand', 'Tijd', 'Hartslag', 'Tempo', 'Eventuele rugzak', 'Voetproblemen'],
    preparation: 'Bouw op via 8 → 10 → 12 → 15 km.',
    sources: [GR5_ALPES],
  },
  4: {
    subtitle: 'Vertical Base I',
    type: 'Eerste echte verticale belasting',
    goal: 'Minstens 300 hoogtemeters stijgen én, waar mogelijk, weer afdalen.',
    why: 'Vanaf dit niveau gaat training meer op bergwandelen lijken dan op gewoon wandelen. Afdalen is fysiologisch fundamenteel anders dan klimmen: de quadriceps moeten excentrisch remmen, wat spierfunctie en balans tijdelijk kan verslechteren — daarom telt D- vanaf hier expliciet mee, niet alleen D+.',
    achievedWhen: [
      '300 D+ gestegen',
      '300 D- afgedaald waar het terrein dat toelaat',
      'gecontroleerde afdaling, geen wankele knieën',
    ],
    preparation: 'Heuvels, trappen, incline-training voor D+; step-downs / split squats / squats voor excentrische kracht; echte heuvelroutes waar mogelijk.',
    sources: [PUBMED_DOWNHILL],
  },
  5: {
    subtitle: 'Vertical Base II',
    type: 'Opbouw lokale spieruithouding',
    goal: '500 verticale meters gecontroleerd verwerken, op en af.',
    why: 'Lokale musculaire uithouding van quadriceps, glutes, hamstrings en kuiten/soleus wordt vanaf hier steeds belangrijker.',
    note: 'Verhoog niet elke sessie tegelijk afstand, tempo én D+ fors — grote plotselinge sprongen in belasting hangen samen met een hoger blessurerisico.',
    achievedWhen: ['500 D+ is geen maximale inspanning meer', 'de afdaling blijft technisch en fysiek gecontroleerd'],
    preparation: 'Bouw op via 300 → 400 → 500 D+.',
    sources: [PUBMED_INJURY_LOAD],
  },
  6: {
    subtitle: 'Mountain Endurance',
    type: 'Halve bergdag',
    goal: 'Een serieuze halve bergdag kunnen verwerken — 750 D+/D-.',
    why: '750 D+ begint richting een normale Alpine trainingsdag te gaan, met nog ruimte voor verdere progressie. Echt terrein (ongelijke ondergrond, stabiliteit, voetenwerk) wordt vanaf hier steeds belangrijker — dat is op een treadmill niet goed na te bootsen.',
    achievedWhen: [
      '750 D+, vergelijkbare D- waar terrein dat toelaat',
      'enkele uren onderweg',
      'geen compleet lege benen',
      'normaal herstel binnen circa 24–48 uur',
    ],
    sources: [],
  },
  7: {
    subtitle: 'Alpine Climbing & Descent',
    type: 'Kernmijlpaal — bewust niet alleen "1000 D+"',
    goal: '1000 meter stijgen én een serieuze afdaling goed verdragen.',
    why: 'De officiële GR5 kent veel etappes rond of boven 1000 D+, sommige richting 1400 D+. Afdalen veroorzaakt relatief veel excentrische spierbelasting terwijl hartslag en zuurstofverbruik juist lager kunnen zijn dan bergop — je kunt dus conditioneel prima afdalen en de volgende dag alsnog forse quadricepsschade voelen. Herhaalde blootstelling aan afdalen bouwt hier weerstand tegen op (het "repeated-bout effect").',
    achievedWhen: [
      '1000 D+',
      'liefst ongeveer evenveel D-',
      'gecontroleerde afdaling',
      'knieën/quads blijven bruikbaar',
      'de volgende dag geen extreme bewegingsbeperking',
    ],
    sources: [GR5_ALPES, PUBMED_DOWNHILL],
  },
  8: {
    subtitle: 'Alpine Day',
    type: 'Eerste echte GR5-etappesimulatie',
    goal: '15 km combineren met minimaal 1000 D+ — niet óf afstand óf hoogtemeters, maar beide tegelijk.',
    why: 'Dat is precies wat de GR5 vraagt. Een officiële etappe is bijvoorbeeld 13,6 km / +1055 m / -814 m; andere dagen zijn aanzienlijk langer.',
    achievedWhen: [
      '≥15 km',
      '≥1000 D+',
      'flinke D-',
      'circa 4–7 uur onderweg',
      'energie blijft redelijk stabiel',
      'geen beperkende voetproblemen',
      'de volgende dag nog functioneel',
    ],
    data: ['Afstand', 'D+', 'D-', 'Verstreken tijd', 'Beweegtijd', 'Hartslag', 'Training Effect'],
    sources: [GR5_ALPES],
  },
  9: {
    subtitle: '15–20 km + 750–1000 D+ met GR5-pack',
    type: 'Concrete rugzaktest — geen willekeurig zware rugzak',
    goal: '15–20 km + 750–1000 D+ met het daadwerkelijk geplande GR5-rugzakgewicht, schoenen en uitrusting.',
    why: 'Energiebehoefte stijgt met rugzakgewicht, loopsnelheid én helling. Onderzoek naar load-carriage-training vindt de grootste vooruitgang wanneer kracht- en aerobe training gecombineerd worden met daadwerkelijke, progressieve trainingen mét belasting — precies de combinatie van gym + cardio + trekking.',
    note: 'De officiële GR5-organisatie waarschuwt expliciet tegen onnodig zwaar pakken — de etappes zijn al lang genoeg.',
    achievedWhen: [
      'daadwerkelijke GR5-uitrusting, schoenen en rugzak',
      'minimaal meerdere uren onderweg',
      'geen schuurplekken',
      'geen ernstige schouder-/heupdruk',
      'eten en drinken onderweg werken goed',
      'voeten blijven goed',
    ],
    sources: [PUBMED_LOAD_CARRYING, GR5_ALPES],
  },
  10: {
    subtitle: 'Back-to-Back',
    type: 'Herstel-/gereedheidsmijlpaal',
    goal: 'Dag 1: 15–20 km / 750–1000 D+. Dag 2: opnieuw minimaal 12–15 km / 500–1000 D+, met de geplande rugzak.',
    why: 'De GR5 is geen losse daghike maar tientallen opeenvolgende etappes — dit ontbreekt volledig als je alleen losse weekendhikes doet.',
    achievedWhen: ['dag 2 geeft geen complete instorting', 'voeten/gewrichten worden niet de beperkende factor'],
    data: ['Spierpijn', 'Voeten/blaren', 'Slaap', 'Voedingsstrategie', 'Functioneren op vermoeide benen'],
    sources: [GR5_ALPES],
  },
  11: {
    subtitle: '2–3 dagen + volledige uitrusting',
    type: 'Volledige praktijksimulatie — meer dan twee dagen achter elkaar',
    goal: '2–3 dagen met de complete praktijksetup: rugzak, voeding, water, schoenen, trekkingstokken, regen-/koude-uitrusting, navigatie, slaap/bivak of hut. Idealiter minstens één dag rond 15–20 km + 1000 D+, en de volgende ochtend opnieuw op pad.',
    why: 'Dit test wat een gym of treadmill niet kan testen: eten tijdens lange inspanning, hydratatie, slaapkwaliteit, vochtige kleding, voetverzorging, materiaal, navigatie en herstel. De officiële GR5-organisatie noemt voor zelfstandige trekking expliciet navigatie, materiaal, weer, water/voeding, gezondheid/veiligheid en bivakvaardigheden als noodzakelijke onderdelen.',
    achievedWhen: [
      '2–3 opeenvolgende dagen voltooid',
      'volledige uitrusting getest, inclusief slaapsysteem',
      'geen ernstige uitval van voeten, gewrichten of materiaal',
    ],
    sources: [GR5_ALPES],
  },
  12: {
    subtitle: 'Volledige gereedheid',
    type: 'Praktische readiness-definitie — geen officiële medische norm',
    goal: 'Alle onderdelen van fysieke, materiële en bergvaardigheids-gereedheid samen bewezen.',
    why: 'Gebaseerd op de daadwerkelijke etappes van de Grande Traversée des Alpes (±600–620 km, ±30.000 D+, 36–40 etappes) — met officiële etappes tot +1422/+1426 m en dagen van meer dan 20 km.',
    achievedWhenGroups: [
      {
        heading: 'FYSIEK',
        items: [
          '15–20+ km dagafstand',
          '1000–1400 D+ kunnen verwerken',
          'lange afdaling kunnen verwerken',
          '6–8 uur op de benen',
          'daadwerkelijke GR5-rugzak',
          'twee dagen achter elkaar bewezen',
          'volledige meerdaagse simulatie voltooid',
        ],
      },
      {
        heading: 'MATERIEEL',
        items: [
          'schoenen ingelopen',
          'rugzak getest',
          'regenkleding getest',
          'slaap-/bivaksysteem getest',
          'watermanagement getest',
          'trekkingstokken gebruikt',
        ],
      },
      {
        heading: 'BERGVAARDIGHEDEN',
        items: [
          'GPX + kaart kunnen gebruiken',
          'basale kompasnavigatie',
          'weersverwachting kunnen interpreteren',
          'een omkeerbeslissing kunnen nemen',
          'water/voeding kunnen plannen',
          'weten wat te doen bij slecht weer',
        ],
      },
    ],
    sources: [GR5_ALPES, GR5_ALPES_WAYMARKING],
  },
};

export function getGR5MilestoneDetail(order: number): MilestoneDetail | undefined {
  return GR5_MILESTONE_DETAILS[order];
}
