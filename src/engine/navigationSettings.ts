// ASCEND: instellingen voor de terugknop en het hervatten na een herstart.
// Besluit: docs/beslissingen/2026-10-22-terugknop-en-hervatten.md.
//
// Beide zijn optioneel en komen zonder migratie mee in een back-up: ontbreekt
// een sleutel, dan geldt het advies.

// Wat de terugknop doet vanaf een tab:
// - 'today': terug vanaf een andere tab gaat naar Vandaag, terug op Vandaag
//   sluit de app. Zo werken de meeste Android-apps.
// - 'previous': terug gaat naar de tab die je daarvoor had, in de volgorde
//   waarin je ze opende.
export type TabBackMode = 'today' | 'previous';

export const TAB_BACK_MODES: TabBackMode[] = ['today', 'previous'];
export const DEFAULT_TAB_BACK: TabBackMode = 'today';

// Na een herstart van de app terug naar de pagina waar je was, als dat
// minder dan zoveel minuten geleden is. 0 = altijd op Vandaag beginnen.
export const RESUME_MINUTE_CHOICES = [0, 60, 120, 240, 480] as const;
export const DEFAULT_RESUME_MINUTES = 120;

export interface NavigationSettings {
  tabBack: TabBackMode;
  resumeMinutes: number;
}

export function resolveNavigation(raw: { tabBack?: unknown; resumeMinutes?: unknown } | undefined): NavigationSettings {
  const tabBack = TAB_BACK_MODES.find((m) => m === raw?.tabBack) ?? DEFAULT_TAB_BACK;
  const minutes = RESUME_MINUTE_CHOICES.find((m) => m === raw?.resumeMinutes) ?? DEFAULT_RESUME_MINUTES;
  return { tabBack, resumeMinutes: minutes };
}

export function resumeLabel(minutes: number): string {
  if (minutes <= 0) return 'Uit';
  if (minutes < 60) return `${minutes} minuten`;
  return `${minutes / 60} uur`;
}
