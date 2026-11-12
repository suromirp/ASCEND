// ASCEND: wat de missiekaart op Vandaag toont (besluit docs/beslissingen/2026-11-12-missiekaart.md).
//
// Regel 1 van de ontwerpregels: elk feit één keer. Voor een training te voet woont alles wat je vooraf regelt in de
// Briefing (zone, hartslag, tempo, praattest, hoogte, weer, kleding, route, horloge); de kaart zegt dan alleen wat je
// vandaag doet: de naam, de minuten en de ene knop. Een waarschuwing staat nooit achter een tik: slecht weer en een
// mislukte verzending naar je horloge blijven op de kaart. Regel 5: één mint, de hoofdknop.
//
// Puur: geen React, geen opslag.

import type { MissionChip } from './missionFacts';

export type MissionCardButton = 'elsewhere' | 'start' | 'briefing' | 'done';

export interface MissionCardInput {
  // Een training te voet, niet kracht in MacroFactor: de naam opent de Briefing (engine/briefing.ts#briefingEntry).
  briefingReach: boolean;
  // De knop is Briefing (engine/briefing.ts#missionButton).
  briefingButton: boolean;
  // Kracht bijgehouden in MacroFactor: het korte formulier op de kaart.
  quickComplete: boolean;
  // Kracht in ASCEND: Training starten.
  inAppStrength: boolean;
}

export interface MissionCardView {
  // De naam is een knop naar de Briefing, met een zichtbaar pijltje.
  nameOpensBriefing: boolean;
  // Zonebalk en zonezin; tempo en de zin over het tempo; losse feiten als "Praten kan" of de hoogte.
  zone: boolean;
  pace: boolean;
  otherFacts: boolean;
  // Weer: de hele regel, of alleen als het een waarschuwing is.
  weather: 'full' | 'warning';
  // Horloge: de stand, of alleen als het versturen mislukte.
  watch: 'full' | 'failed';
  // Heuvels in de buurt, de route en kleding: wat je vooraf regelt, alleen op de kaart zonder Briefing (daar
  // staan ze; heuvels in de buurt ook in Waarom deze training).
  beforehand: boolean;
  button: MissionCardButton;
}

export function missionCardView(input: MissionCardInput): MissionCardView {
  const briefing = input.briefingReach && !input.quickComplete;
  const button: MissionCardButton = input.quickComplete ? 'elsewhere' : input.inAppStrength ? 'start' : input.briefingButton ? 'briefing' : 'done';
  return {
    nameOpensBriefing: briefing,
    zone: !briefing,
    pace: !briefing,
    otherFacts: !briefing,
    weather: briefing ? 'warning' : 'full',
    watch: briefing ? 'failed' : 'full',
    beforehand: !briefing,
    button,
  };
}

// De feiten onder de naam. De duur staat altijd (dat is de missie); de rest alleen als de kaart ze toont.
export function missionChipsShown(chips: readonly MissionChip[], view: Pick<MissionCardView, 'zone' | 'pace' | 'otherFacts'>): MissionChip[] {
  return chips.filter((c) => (c.kind === 'duur' ? true : c.kind === 'zone' ? view.zone : c.kind === 'tempo' ? view.pace : view.otherFacts));
}
