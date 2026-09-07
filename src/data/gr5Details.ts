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

// Moved here from the old Objective.description field (models/objectives.ts)
// as part of the Phase 1 goal-engine migration — TrainingGoal (models/goals.ts)
// carries no description field of its own, matching Technical Architecture
// v0.3.1 REVISED's domain model. This is static narrative copy about the
// GR5 track, same category as GR5_PACKING_NOTE below, not user data.
export const GR5_TRACK_DESCRIPTION =
  'Opbouw richting een meerdaagse Alpine trektocht zoals de GR5 — de Alpenfase uit je eigen schema.';

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
    goal: '40 minuten onafgebroken comfortabel tempo — hardlopen of stevig doorwandelen, zonder dat het een zware training wordt.',
    why: 'Bouwt aerobe capaciteit en cardiovasculaire efficiëntie op als basis voor de rest van de ladder. Hardlopen en stevig wandelen tellen hier allebei mee als bewijs — het gaat om de aerobe basis zelf, niet om één specifieke discipline. Vervangt bergwandelen met hoogtemeters niet — traint de langdurige belasting, rugzak, terrein en excentrische afdalingen onvoldoende specifiek — maar is een nuttige aanvulling naast klimtraining.',
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
    subtitle: 'Back-to-Back — Licht',
    type: 'Vroege gewenningsmijlpaal voor opeenvolgende dagen',
    goal: 'Twee dagen na elkaar actief zijn — geen rustdag ertussen — op een niveau dat je al gewend bent.',
    why: 'De GR5 bestaat uit tientallen opeenvolgende etappedagen, niet losse geïsoleerde trainingsdagen. Vroeg wennen aan trainen zonder rustdag ertussen — ook op licht niveau — is iets dat één enkele lange sessie nooit kan simuleren.',
    note: 'Bewust licht en vroeg in de ladder gezet. De zwaardere, volledige back-to-back-praktijktest met echte uitrusting komt later terug als "Weekend bergsimulatie".',
    achievedWhen: [
      'twee opeenvolgende dagen training, geen rustdag ertussen',
      'dag 2 voelt niet structureel zwaarder aan dan normaal',
      'geen opbouwende vermoeidheid die de rest van de week verstoort',
    ],
    sources: [PUBMED_INJURY_LOAD],
  },
  5: {
    subtitle: 'Vertical Base I — Ascent',
    type: 'Eerste echte verticale belasting (stijgen)',
    goal: 'Minstens 300 hoogtemeters stijgen.',
    why: 'Vanaf dit niveau gaat training meer op bergwandelen lijken dan op gewoon wandelen. Afdalen is fysiologisch fundamenteel anders dan klimmen — de quadriceps moeten excentrisch remmen — en die tolerantie bouwt doorgaans trager op dan stijgcapaciteit. Daarom staat D- hier bewust nog niet verplicht: de eigen afdaal-as begint een trede verderop, op een lager niveau dan deze stijgtrede.',
    achievedWhen: ['300 D+ gestegen', 'gecontroleerde inspanning, geen maximale poging'],
    preparation: 'Heuvels, trappen, incline-training.',
    sources: [PUBMED_DOWNHILL],
  },
  6: {
    subtitle: 'Load Carriage I — Licht',
    type: 'Eerste rugzakblootstelling',
    goal: '8 kg rugzak dragen over minimaal 10 km.',
    why: 'Rugzakgewicht in één late sprong naar het volledige eventgewicht introduceren slaat de geleidelijke gewenning over. Vroege, lichtere blootstelling aan gewicht op de rug (schouders, heupen, houding, voetenwerk) bouwt daar geleidelijker naartoe — onderzoek naar load-carriage-training vindt de grootste vooruitgang bij progressieve, herhaalde training mét belasting, niet bij één zware sessie.',
    achievedWhen: ['8 kg rugzak', 'minimaal 10 km', 'geen schuurplekken', 'houding blijft comfortabel'],
    preparation: 'Bouw op via 4 → 6 → 8 kg.',
    sources: [PUBMED_LOAD_CARRYING],
  },
  7: {
    subtitle: 'Vertical Base II',
    type: 'Opbouw lokale spieruithouding + eerste D--as',
    goal: '500 hoogtemeters stijgen; los daarvan minstens 300 hoogtemeters gecontroleerd afdalen.',
    why: 'Lokale musculaire uithouding van quadriceps, glutes, hamstrings en kuiten/soleus wordt vanaf hier steeds belangrijker. D- staat hier bewust op een lager niveau dan D+ — de eigen, tragere opbouw van excentrische tolerantie, niet een simpele kopie van de stijgwaarde.',
    note: 'Verhoog niet elke sessie tegelijk afstand, tempo én D+ fors — grote plotselinge sprongen in belasting hangen samen met een hoger blessurerisico.',
    achievedWhen: ['500 D+ is geen maximale inspanning meer', '300 D- gecontroleerd, technisch en fysiek in controle'],
    preparation: 'D+: bouw op via 300 → 400 → 500. D-: bouw op via 150 → 200 → 300.',
    sources: [PUBMED_INJURY_LOAD, PUBMED_DOWNHILL],
  },
  8: {
    subtitle: 'Mountain Endurance',
    type: 'Halve bergdag',
    goal: 'Een serieuze halve bergdag kunnen verwerken — 750 D+, met los daarvan minstens 500 D-.',
    why: '750 D+ begint richting een normale Alpine trainingsdag te gaan, met nog ruimte voor verdere progressie. Echt terrein (ongelijke ondergrond, stabiliteit, voetenwerk) wordt vanaf hier steeds belangrijker — dat is op een treadmill niet goed na te bootsen. D- loopt hier bewust nog één trede achter D+ aan.',
    achievedWhen: [
      '750 D+',
      'minstens 500 D- gecontroleerd afgedaald',
      'enkele uren onderweg',
      'geen compleet lege benen',
      'normaal herstel binnen circa 24–48 uur',
    ],
    sources: [],
  },
  9: {
    subtitle: 'Alpine Climbing & Descent',
    type: 'Kernmijlpaal — stijgen en afdalen groeien nu naar elkaar toe',
    goal: '1000 meter stijgen; los daarvan minstens 750 meter een serieuze afdaling goed verdragen.',
    why: 'De officiële GR5 kent veel etappes rond of boven 1000 D+, sommige richting 1400 D+. Afdalen veroorzaakt relatief veel excentrische spierbelasting terwijl hartslag en zuurstofverbruik juist lager kunnen zijn dan bergop — je kunt dus conditioneel prima afdalen en de volgende dag alsnog forse quadricepsschade voelen. Herhaalde blootstelling aan afdalen bouwt hier weerstand tegen op (het "repeated-bout effect") — de D--as haalt de D+-as hier bewust bijna in, niet volledig gelijk.',
    achievedWhen: [
      '1000 D+',
      'minstens 750 D- gecontroleerde afdaling',
      'knieën/quads blijven bruikbaar',
      'de volgende dag geen extreme bewegingsbeperking',
    ],
    sources: [GR5_ALPES, PUBMED_DOWNHILL],
  },
  10: {
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
  11: {
    subtitle: '15–20 km + 750–1000 D+ met GR5-pack',
    type: 'Volledige rugzaktest — na de lichtere gewenningssessie eerder in de ladder',
    goal: '15–20 km + 750–1000 D+ met het daadwerkelijk geplande GR5-rugzakgewicht (rond 12 kg), schoenen en uitrusting.',
    why: 'Energiebehoefte stijgt met rugzakgewicht, loopsnelheid én helling. Onderzoek naar load-carriage-training vindt de grootste vooruitgang wanneer kracht- en aerobe training gecombineerd worden met daadwerkelijke, progressieve trainingen mét belasting — precies de combinatie van gym + cardio + trekking, en precies waarom de lichtere 8 kg-sessie eerder in de ladder eraan vooraf ging.',
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
  12: {
    subtitle: '2–3 dagen + volledige uitrusting',
    type: 'Volledige praktijksimulatie — de zware back-to-back-capstone',
    goal: '2–3 dagen met de complete praktijksetup: rugzak, voeding, water, schoenen, trekkingstokken, regen-/koude-uitrusting, navigatie, slaap/bivak of hut. Idealiter minstens één dag rond 15–20 km + 1000 D+, en de volgende ochtend opnieuw op pad.',
    why: 'Dit test wat een gym of treadmill niet kan testen: eten tijdens lange inspanning, hydratatie, slaapkwaliteit, vochtige kleding, voetverzorging, materiaal, navigatie en herstel. De officiële GR5-organisatie noemt voor zelfstandige trekking expliciet navigatie, materiaal, weer, water/voeding, gezondheid/veiligheid en bivakvaardigheden als noodzakelijke onderdelen. Bouwt voort op de lichte back-to-back-gewenning vroeg in de ladder, nu met echte afstand, D+ en volledige uitrusting.',
    achievedWhen: [
      '2–3 opeenvolgende dagen voltooid',
      'volledige uitrusting getest, inclusief slaapsysteem',
      'geen ernstige uitval van voeten, gewrichten of materiaal',
    ],
    sources: [GR5_ALPES],
  },
  13: {
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
