// De redenen van "Wat speelde er" in de vaste volgorde van de chips, met hun woorden
// (models/influence.ts). Alcohol en wiet staan gewoon tussen de rest: geen eigen
// icoon en geen eigen kleur. Warm en een zware beendag weet ASCEND zelf uit het weer en het
// logboek; ze staan als gewone regel in het blad en daarom niet als chip.

import type { AlcoholAmount, InfluenceReason } from '../models/influence';

export const REASON_LABEL: Record<InfluenceReason, string> = {
  alcohol: 'Alcohol',
  wiet: 'Wiet',
  ziek: 'Ziek',
  kort_geslapen: 'Kort geslapen',
  laat_gegeten: 'Laat gegeten',
  cafeine: 'Cafeïne',
  stress: 'Stress',
  warm: 'Warm',
  zware_beendag: 'Zware beendag',
  anders: 'Iets anders',
};

// De chips, in deze volgorde.
export const REASON_CHIPS: InfluenceReason[] = ['alcohol', 'wiet', 'ziek', 'kort_geslapen', 'laat_gegeten', 'cafeine', 'stress', 'anders'];

export const AMOUNT_LABEL: Record<AlcoholAmount, string> = {
  weinig: '1 à 2',
  matig: '3 tot 5',
  veel: '6 of meer',
};

export const AMOUNTS: AlcoholAmount[] = ['weinig', 'matig', 'veel'];

export const MAX_LABEL_LENGTH = 40;
