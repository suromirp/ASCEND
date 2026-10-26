// ASCEND: de instelling "Hoe voelt je lijf?" (docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md).
// Optioneel en zonder migratie: ontbreekt de sleutel of staat er iets geks, dan geldt het advies
// (alleen als er reden is). Apart van engine/bodyCheck.ts, zodat de instellingen niet de hele
// plekkenlijst meeladen.
//
// - 'reden': de kaart komt bij een open pijnmelding, een zware week of na een tocht of wedstrijd.
// - 'elke-week': ook zonder reden, op de dag van de weekterugblik.
// - 'uit': geen kaart. Klachten melden kan altijd op Lichaam.
export type BodyCheckMode = 'reden' | 'elke-week' | 'uit';

export const BODY_CHECK_MODES: BodyCheckMode[] = ['reden', 'elke-week', 'uit'];
export const DEFAULT_BODY_CHECK: BodyCheckMode = 'reden';

// Leest defensief: een back-up kan van een oudere of beschadigde versie zijn.
export function resolveBodyCheck(raw: { bodyCheck?: unknown } | undefined | null): BodyCheckMode {
  return BODY_CHECK_MODES.find((m) => m === raw?.bodyCheck) ?? DEFAULT_BODY_CHECK;
}
