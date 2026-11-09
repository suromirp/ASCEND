// ASCEND: de stabiele, vlakke stukken van een loop, waaruit "tempo bij zone 2" leest
// (engine/zone2Pieces.ts, docs/onderzoek/Tempo bij zone 2, stabiele stukken.md).
//
// Zonder zones: welk stuk in zone 2 ligt, wordt pas bij het lezen bepaald, zodat een nieuwe
// drempel geen herberekening vraagt. Uit de volledige reeks bewaard op het log als
// `SessionLog.zone2Pieces`, zoals `runDetail`: afgeleid, optioneel, één keer toegevoegd en
// gebonden aan de totalen waarvoor het gelezen is. Een gemeten getal verandert nooit.

export interface Zone2Piece {
  // Waar het stuk vandaan komt: de reeks per seconde, of grof uit de kilometers.
  from: 'stream' | 'km';
  // Seconden sinds de start van de loop (pauzes meegeteld), begin en eind.
  startSec: number;
  endSec: number;
  // Bewegende seconden en meters in het stuk.
  sec: number;
  distanceM: number;
  // Mediaan van de gladgestreken hartslag (bij kilometers: gemiddelde per km, naar afstand).
  hr: number;
  // Seconden per km, naar vlak omgerekend tenzij `flat` (dan het echte tempo).
  paceSecKm: number;
  flat: boolean;
  // Gemiddelde helling van begin tot eind, procent; positief is bergop.
  gradePct: number;
}

export interface Zone2Pieces {
  version: 1;
  // De totalen van het log waarvoor de stukken gelezen zijn (de vingerafdruk).
  wholeKm: number;
  wholeMinutes: number;
  builtAt: string;
  // Leeg betekent: gelezen, geen stuk. Dan wordt de reeks niet opnieuw gelezen.
  pieces: Zone2Piece[];
}
