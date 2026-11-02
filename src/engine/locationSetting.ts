// ASCEND: de instelling "Je locatie" (docs/beslissingen/2026-11-02-locatie.md). Puur: geen browser,
// geen plugin. Standaard uit. Aan betekent: ASCEND mag je plek van nu opvragen, voor het weer op
// je plek en voor "waar ben je op je etappe". Er wordt niets bewaard behalve de afgeronde plek
// die het weer al in de instellingen bewaarde (homeLocation); posities op een etappe blijven in
// het geheugen.
//
// Wie het weer al liet volgen met "Gebruik mijn locatie" (de plaats heet dan "Mijn locatie") en de
// instelling nooit zelf aanraakte, houdt wat hij had: voor hem telt de instelling als aan.

import type { LocateFailure } from '../utils/geolocation';
import { isMyLocation } from './weatherLocation';

interface LocationSettings {
  locationOn?: boolean;
  homeLocation?: { name: string };
}

export function locationEnabled(s: LocationSettings): boolean {
  if (typeof s.locationOn === 'boolean') return s.locationOn;
  return isMyLocation(s.homeLocation);
}

export function locationSummary(s: LocationSettings): { checked: boolean } {
  return { checked: locationEnabled(s) };
}

// Wat er zichtbaar gebeurt als aanzetten niet lukt. De instelling blijft dan uit.
export function locationFailureText(reason: LocateFailure): string {
  switch (reason) {
    case 'unsupported':
      return 'Deze browser kan je locatie niet bepalen, dus Je locatie blijft uit.';
    case 'denied':
      return 'Je telefoon of browser staat je locatie niet toe, dus Je locatie blijft uit. Je kunt het toestaan in de instellingen van je telefoon of browser en het dan opnieuw proberen.';
    case 'timeout':
      return 'Je locatie kwam niet binnen tien seconden, dus Je locatie blijft uit. Probeer het buiten of met een beter bereik nog eens.';
    default:
      return 'Je locatie is nu niet beschikbaar, dus Je locatie blijft uit. Controleer of de locatie van je telefoon aan staat en probeer het nog eens.';
  }
}

// Een plaats die je zelf zocht blijft staan (engine/weatherLocation.ts). De naam, of undefined als
// het weer zijn plek van je locatie mag halen.
export function locationKeepsSearchedPlace(place: { name: string } | undefined): string | undefined {
  return place && !isMyLocation(place) ? place.name : undefined;
}

export function searchedPlaceNote(name: string): string {
  return `Je weer blijft op ${name}, want die plaats koos je zelf. Kies op het Weer-scherm Gebruik mijn locatie om je plek te volgen.`;
}

// Op de etappe-regel: wat er staat als je plek niet te bepalen is, of niet bij de etappe past.
export function stageLocateFailureText(reason: LocateFailure | 'away'): string {
  switch (reason) {
    case 'away':
      return 'Je bent niet in de buurt van de etappe van vandaag, dus er is geen afstand om te tonen.';
    case 'denied':
      return 'Je telefoon of browser staat je locatie niet toe, dus de afstand tot het eind van je etappe ontbreekt. Je kunt het toestaan in de instellingen van je telefoon of browser.';
    case 'timeout':
      return 'Je plek kwam niet binnen tien seconden. Probeer het nog eens als je beter bereik hebt.';
    case 'unsupported':
      return 'Deze browser kan je plek niet bepalen, dus de afstand tot het eind van je etappe ontbreekt.';
    default:
      return 'Je plek is nu niet beschikbaar. Controleer of de locatie van je telefoon aan staat.';
  }
}
