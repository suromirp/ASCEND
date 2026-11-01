// ASCEND: de kaarten rond de missie op Vandaag (docs/beslissingen/2026-11-01-vandaag-volgorde.md).
//
// Elke kaart die boven de missie kan staan of ermee concurreert heeft een vaste plek in één rij:
// eerst veiligheid en ziekte, dan de ochtendkaart, dan wat vandaag raakt, dan wat over gisteren gaat,
// dan onderhoud zoals de back-up. Hoogstens zoveel als je koos (het advies: één) staat boven de missie;
// de rest komt direct onder de missie, in dezelfde volgorde. Een advies over je planning en een vraag
// over een training die niet doorging komen nooit boven de missie: die beantwoord je in een blad, en
// de missie is waar Vandaag over gaat. Puur: geen React, geen opslag.

export type TodayCardId = 'illness' | 'illnessSign' | 'morning' | 'advice' | 'missed' | 'freshStart' | 'backup';
export type TodayCardGroup = 'safety' | 'morning' | 'today' | 'yesterday' | 'upkeep';

export interface TodayCardSpec {
  id: TodayCardId;
  group: TodayCardGroup;
  // Mag boven de missie staan.
  lead: boolean;
}

// De vaste rangorde, de belangrijkste eerst.
export const TODAY_CARD_RANK: readonly TodayCardSpec[] = [
  // Ziek gemeld of weer opbouwen.
  { id: 'illness', group: 'safety', lead: true },
  // Rusthartslag en HRV wijken een paar ochtenden samen af.
  { id: 'illnessSign', group: 'safety', lead: true },
  { id: 'morning', group: 'morning', lead: true },
  // Het belangrijkste advies (CoachCard), zoals de rustdag terug.
  { id: 'advice', group: 'today', lead: false },
  // Niet gedaan? of een log om te koppelen.
  { id: 'missed', group: 'yesterday', lead: false },
  // Nieuw begonnen: je back-up terugzetten.
  { id: 'freshStart', group: 'upkeep', lead: true },
  { id: 'backup', group: 'upkeep', lead: true },
];

export type AboveMission = 1 | 2 | 'all';
export const ABOVE_MISSION_CHOICES: readonly AboveMission[] = [1, 2, 'all'];
export const ABOVE_MISSION_ADVICE: AboveMission = 1;

// Leest defensief: een back-up kan van een oudere of beschadigde versie zijn.
export function resolveAboveMission(raw: unknown): AboveMission {
  return ABOVE_MISSION_CHOICES.find((c) => c === raw) ?? ABOVE_MISSION_ADVICE;
}

export interface TodayArrangement {
  above: TodayCardId[];
  below: TodayCardId[];
}

// `present`: de kaarten die er nu zijn, in welke volgorde ook.
export function arrangeToday(present: Iterable<TodayCardId>, limit: AboveMission): TodayArrangement {
  const here = new Set(present);
  const max = limit === 'all' ? Infinity : limit;
  const above: TodayCardId[] = [];
  const below: TodayCardId[] = [];
  for (const card of TODAY_CARD_RANK) {
    if (!here.has(card.id)) continue;
    if (card.lead && above.length < max) above.push(card.id);
    else below.push(card.id);
  }
  return { above, below };
}
