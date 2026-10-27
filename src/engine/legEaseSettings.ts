// ASCEND: de instellingen "Lichter bij vermoeide benen" en "Hoe licht"
// (docs/beslissingen/2026-10-27-spierpijn-en-zware-beendag.md). Optioneel en zonder migratie:
// ontbreekt de sleutel of staat er iets geks, dan geldt het advies. Apart van
// engine/legDayEase.ts, zodat de instellingen niet de hele berekening meeladen.
//
// - 'voorstel': de kaart met knoppen (Lichter, een dag later, Liever niet).
// - 'regel': alleen de feitregel, niets te kiezen.
// - 'uit': niets, ook niet de stille regel bij het verplaatsen.
export type LegEaseMode = 'voorstel' | 'regel' | 'uit';
export const LEG_EASE_MODES: LegEaseMode[] = ['voorstel', 'regel', 'uit'];
export const DEFAULT_LEG_EASE: LegEaseMode = 'voorstel';

// - 'standaard': zeker 3 herhalingen over en een set minder per oefening.
// - 'alleen-gewicht': zeker 3 herhalingen over, alle sets blijven.
// - 'extra': zeker 4 herhalingen over en een set minder.
export type LegEaseHow = 'standaard' | 'alleen-gewicht' | 'extra';
export const LEG_EASE_HOWS: LegEaseHow[] = ['standaard', 'alleen-gewicht', 'extra'];
export const DEFAULT_LEG_EASE_HOW: LegEaseHow = 'standaard';

// Leest defensief: een back-up kan van een oudere of beschadigde versie zijn.
export function resolveLegEase(raw: { legEase?: unknown } | undefined | null): LegEaseMode {
  return LEG_EASE_MODES.find((m) => m === raw?.legEase) ?? DEFAULT_LEG_EASE;
}

export function resolveLegEaseHow(raw: { legEaseHow?: unknown } | undefined | null): LegEaseHow {
  return LEG_EASE_HOWS.find((m) => m === raw?.legEaseHow) ?? DEFAULT_LEG_EASE_HOW;
}
