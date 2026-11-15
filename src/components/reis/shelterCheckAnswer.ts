import type { TrekShelter } from '../../engine/trekShelter';

// Wat een tik op de vraag "Je tocht staat op hutten. Klopt dat?" doet (components/reis/ShelterCheck.tsx).
// Klopt legt het antwoord meteen vast. Tent en Beide starten alleen het voorstel; het antwoord komt pas vast
// te liggen als de uitkomst er is: bij Akkoord (onStored) of Liever niet (onDeclined). Mislukt of veroudert
// het voorstel, dan wordt er niets vastgelegd en blijft de vraag staan. Het doel zelf verandert hier nooit:
// dat doet alleen het voorstel na Akkoord.
export interface ShelterCheckDeps {
  recordAsked: () => void;
  choose: (shelter: TrekShelter, outcome: { onStored: () => void; onDeclined: () => void }) => Promise<void> | void;
}

export function answerShelterCheck(answer: TrekShelter | 'klopt', deps: ShelterCheckDeps): void {
  if (answer === 'klopt') {
    deps.recordAsked();
    return;
  }
  void deps.choose(answer, { onStored: deps.recordAsked, onDeclined: deps.recordAsked });
}
