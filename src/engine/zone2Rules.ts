// ASCEND: alle drempels voor "tempo bij zone 2" op stabiele stukken, bij elkaar.
//
// Bron: docs/onderzoek/Tempo bij zone 2, stabiele stukken.md (het hoofdstuk staat bij elke
// regel). Bijna alles is een eigen keuze (gok in het verslag) die na twee tot vier weken op
// echte lopen wordt nagekeken; daarom staan ze hier en nergens anders. Besluit:
// docs/beslissingen/2026-11-09-tempo-stabiele-stukken.md.

export const ZONE2_RULES = {
  // H1: hartslag en tempo eerst gladgestreken over zoveel seconden.
  smoothSec: 30,
  // H1: een stuk duurt minstens zo lang, zonder pauze van meer dan 20 s (MAX_GAP_SEC).
  minPieceSec: 5 * 60,
  // H1 en H4: de eerste 10 minuten van een loop tellen nooit.
  startAfterSec: 10 * 60,
  // H1: na een duidelijke tempowissel of een pauze duurt het zo lang voor de hartslag bij is.
  settleSec: 3 * 60,
  // H1: minstens dit deel van de 30-secondenwaarden ligt binnen de band rond de mediaan.
  withinShare: 0.9,
  // H1: hartslagband rond de mediaan van het stuk, slagen.
  hrBandBpm: 5,
  // H1: tempoband rond de mediaan van het stuk (vlak tempo, als snelheid), deel.
  paceBand: 0.07,
  // H2: minder op en minder neer dan dit per km telt als vlak, dan geldt het echte tempo.
  flatMetresPerKm: 5,
  // H2: een stuk met een gemiddelde helling boven dit deel valt weg.
  maxNetGrade: 0.02,
  // H2: een stukje van zoveel meter steiler dan STEEP_GRADE knipt het stuk.
  steepWindowM: 200,
  steepGrade: 0.04,
  // H4: na deze minuut telt een stuk alleen als de drift tot dan klein bleef.
  driftFromSec: 60 * 60,
  // H4: tempo per slag hoogstens dit deel onder dat van het eerste stabiele stuk.
  maxDrift: 0.03,
  // H5: na het eerste stuk boven zone 3 van meer dan zoveel seconden telt niets meer.
  hardZone: 3 as const,
  hardSec: 2 * 60,
  // H3: gevoelstemperatuur. Onder free geen correctie, tot out een kleine, daarboven telt de loop niet.
  heatFreeC: 20,
  heatOutC: 25,
  heatBpmPerC: 0.7,
  dewOutC: 18,
  // H1, laatste alinea: zoveel aaneengesloten kilometers geven grof een stuk.
  minKms: 2,
  // H6: een loop telt met zijn minuten in stukken, tot dit plafond.
  runWeightCapMin: 30,
  // H7: eerste schatting onder zoveel lopen, zoveel dagen of zoveel verschillende weken.
  firstRuns: 8,
  firstSpanDays: 28,
  firstWeeks: 3,
  // H7: de lijn gaat door de lopen van zoveel weken.
  lineWeeks: 8,
  // H7: band van 80 procent (normale verdeling, z voor 10 procent aan elke kant).
  bandZ: 1.2816,
  // H7: ondergrens voor de spreiding per loop, deel van het tempo.
  minSpread: 0.02,
  // H7: afronden op zoveel seconden; een band breder dan tooWideSec zegt niets.
  roundSec: 5,
  tooWideSec: 30,
  // H7: progressMoment viert alleen als de kant van de band het dichtst bij nul zoveel sneller is.
  celebrateSec: 5,
} as const;
