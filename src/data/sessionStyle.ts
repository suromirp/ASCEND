// ASCEND — the short head of every training, shared by the training screen
// and the info screen (engine/sessionBrief.ts): what kind of training it is
// in one or two words, why in one sentence, and the two or three signals to
// stop or ease off during the training itself (audit 2026-10, report 6).
// Keyed by SessionTemplate.id, like data/workoutStructure.ts.

export type FactKind = 'steady' | 'intervals' | 'long' | 'hike' | 'strength' | 'recovery';

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
