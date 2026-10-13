// ASCEND — the short head of every training, shared by the training screen
// and the info screen (engine/sessionBrief.ts): what kind of training it is
// in one or two words, why in one sentence, and the two or three signals to
// stop or ease off during the training itself (audit 2026-10, report 6).
// Keyed by SessionTemplate.id, like data/workoutStructure.ts.

export type FactKind = 'steady' | 'intervals' | 'long' | 'hike' | 'strength' | 'recovery' | 'tempo' | 'race' | 'test' | 'strides' | 'fartlek' | 'progression' | 'ruck' | 'vo2' | 'descent';

export interface SessionStyle {
  styleLabel: string; // after the sport: "HARDLOPEN · BERGOP"
  purpose: string;
  stopSignals: string[];
  facts: FactKind;
}

export const SESSION_STYLE: Record<string, SessionStyle> = {
  tpl_upper_a: {
    styleLabel: 'bovenlichaam',
    purpose: 'Kracht voor borst, rug, schouders en armen.',
    stopSignals: ['een oefening scherp pijn doet in een gewricht', 'je techniek wegzakt bij de laatste herhalingen'],
    facts: 'strength',
  },
  tpl_upper_b: {
    styleLabel: 'bovenlichaam',
    purpose: 'De tweede krachttraining voor je bovenlichaam deze week.',
    stopSignals: ['een oefening scherp pijn doet in een gewricht', 'je techniek wegzakt bij de laatste herhalingen'],
    facts: 'strength',
  },
  tpl_lower_a: {
    styleLabel: 'benen',
    purpose: 'De zware beentraining van de week: sterke benen om omhoog te klimmen en beheerst te dalen.',
    stopSignals: ['je knie of rug scherp pijn doet', 'je techniek wegzakt bij de laatste herhalingen'],
    facts: 'strength',
  },
  tpl_lower_b: {
    styleLabel: 'benen',
    purpose: 'De tweede beentraining van de week.',
    stopSignals: ['je knie of rug scherp pijn doet', 'je techniek wegzakt bij de laatste herhalingen'],
    facts: 'strength',
  },
  tpl_easy_run: {
    styleLabel: 'rustig',
    purpose: 'Rustige kilometers voor je basisconditie, zonder je benen te vermoeien.',
    stopSignals: ['je geen hele zinnen meer kunt praten: ga langzamer of wandel even', 'je benen nog zwaar zijn van de beentraining: loop de korte versie'],
    facts: 'steady',
  },
  tpl_intervals: {
    styleLabel: 'intervallen',
    purpose: 'Lange blokken rond je 5 km-tempo: de training die je conditie het meest laat groeien, richting je wedstrijd.',
    stopSignals: ['je het laatste blok duidelijk niet meer op tempo haalt: stop daar, de rest is uitlopen', 'je scherpe pijn voelt'],
    facts: 'vo2',
  },
  tpl_hills_descent: {
    styleLabel: 'op en af',
    purpose: 'Bergop snelheid, en daarna rustig afdalen zodat je bovenbenen de dalingen van de GR5 leren verdragen.',
    stopSignals: ['je knie scherp pijn doet bij het dalen: stoppen en de rest wandelen op vlak terrein', 'je benen gaan trillen bij het afdalen: genoeg voor vandaag'],
    facts: 'descent',
  },
  tpl_fartlek: {
    styleLabel: 'fartlek',
    purpose: 'Speelse snelheid: korte harde stukken in een rustige loop.',
    stopSignals: ['je na de rustige anderhalve minuut nog niet op adem bent: maak de harde stukken iets rustiger', 'je benen zwaar blijven in de rustige stukken: loop de rest rustig uit'],
    facts: 'fartlek',
  },
  tpl_progression_run: {
    styleLabel: 'progressief',
    purpose: 'Rustig beginnen en het laatste stuk iets steviger: tempo houden als je al even onderweg bent.',
    stopSignals: ['het laatste stuk zwaarder wordt dan korte zinnen: terug naar rustig', 'je scherpe pijn voelt'],
    facts: 'progression',
  },
  tpl_recovery_run: {
    styleLabel: 'herstel',
    purpose: 'Heel rustig losdraaien, zodat je benen herstellen.',
    stopSignals: ['je benen zwaar of pijnlijk zijn: wandel of stop, dat is ook herstel'],
    facts: 'steady',
  },
  tpl_ruck_walk: {
    styleLabel: 'rugzak',
    purpose: 'Uren onderweg en een rugzak dragen, met veel minder klap voor je benen dan een loop.',
    stopSignals: ['je schouders of onderrug gaan zeuren: rugzak strakker op de heupen of lichter', 'je knieën pijn doen bij het dalen: korter stappen of de trap nemen'],
    facts: 'ruck',
  },
  tpl_strides_run: {
    styleLabel: 'versnellingen',
    purpose: 'Een extra rustige loop, met aan het eind een paar korte versnellingen voor een soepele, snellere pas.',
    stopSignals: ['je geen hele zinnen meer kunt praten in het rustige deel: ga langzamer', 'een versnelling ergens scherp pijn doet: sla de rest over'],
    facts: 'strides',
  },
  tpl_tempo_run: {
    styleLabel: 'tempo',
    purpose: 'Blokken rond je drempel: het tempo dat je lang kunt volhouden schuift op, richting je wedstrijd.',
    stopSignals: ['je in de blokken niet eens korte zinnen meer kunt zeggen: je loopt te hard', 'je benen nog zwaar zijn van de beentraining: loop de korte versie'],
    facts: 'tempo',
  },
  tpl_test_run: {
    styleLabel: 'test',
    purpose: 'Een meetpunt: 5 km zo snel als je gelijkmatig volhoudt. Daarna weet ASCEND je echte tempo.',
    stopSignals: ['je scherpe pijn voelt: stoppen, de test kan een andere keer'],
    facts: 'test',
  },
  tpl_race: {
    styleLabel: 'wedstrijd',
    purpose: 'Je tussendoel. Rustig starten, genieten, en daarna weet ASCEND je echte tempo.',
    stopSignals: ['je scherpe pijn voelt: stoppen is dan de slimste keuze'],
    facts: 'race',
  },
  tpl_bergconditie: {
    styleLabel: 'bergop',
    purpose: 'Lang en rustig bergop stappen voor je klimconditie.',
    stopSignals: ['je niet meer kunt praten', 'je kuiten of achillespees gaan zeuren'],
    facts: 'steady',
  },
  tpl_hill_intervals: {
    styleLabel: 'bergop',
    purpose: 'Snelheid en hoogtemeters in één training.',
    stopSignals: ['je techniek rommelig wordt bij het bergop lopen', 'je na 2 minuten terug naar beneden nog niet hersteld bent'],
    facts: 'intervals',
  },
  tpl_long_run: {
    styleLabel: 'lang',
    purpose: 'De langste loop van de week, rustig en op vermoeide benen, voor uithouding en hoogtemeters.',
    stopSignals: ['de laatste kwartier voelt als een wedstrijd in plaats van rustig', 'je geen hele zinnen meer kunt praten: wandel een stuk'],
    facts: 'long',
  },
  tpl_mountain_hike: {
    styleLabel: 'met rugzak',
    purpose: 'Uren op de benen met hoogtemeters en rugzak, zo dicht mogelijk bij een GR5-dag.',
    stopSignals: ['je knieën gaan zeuren bij het dalen: kleinere passen, stokken gebruiken', 'je bergop niet meer kunt praten: langzamer', 'je honger of dorst krijgt: eten en drinken, elk uur'],
    facts: 'hike',
  },
  tpl_hike_day_one: {
    styleLabel: 'dag 1 van 2',
    purpose: 'De eerste van twee wandeldagen. Rustiger dan morgen: je bewaart iets voor dag 2.',
    stopSignals: ['je merkt dat morgen zo niet gaat lukken: maak het korter of vlakker', 'je knieën of voeten gaan zeuren'],
    facts: 'hike',
  },
  tpl_bike: {
    styleLabel: 'rustig',
    purpose: 'Een rustige rit voor je conditie, zonder de schokken van hardlopen.',
    stopSignals: ['je niet meer kunt praten: lichter schakelen'],
    facts: 'steady',
  },
  tpl_herstel: {
    styleLabel: 'rust of wandelen',
    purpose: 'De vermoeidheid van het weekend laten zakken voor de nieuwe week begint.',
    stopSignals: [],
    facts: 'recovery',
  },
};
