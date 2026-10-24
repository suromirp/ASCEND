// ASCEND: de instelling "Figuur" (docs/beslissingen/2026-10-24-lichaam-als-figuur.md):
// of het figuur op Lichaam een man of een vrouw is. Automatisch neemt het over van
// de koppeling als die het weet; nu levert geen enkele koppeling het geslacht, dus
// dan valt het terug op Man en zegt de rij dat eerlijk. Optioneel en zonder
// migratie: ontbreekt de sleutel of staat er iets geks, dan geldt Automatisch.

export type FigureSetting = 'auto' | 'man' | 'vrouw';
export type Figure = 'man' | 'vrouw';

export const FIGURE_SETTINGS: FigureSetting[] = ['auto', 'man', 'vrouw'];
export const DEFAULT_FIGURE: FigureSetting = 'auto';
// Wat Automatisch toont zolang de koppeling het geslacht niet weet.
export const FALLBACK_FIGURE: Figure = 'man';

export function resolveFigureSetting(raw: { figure?: unknown } | undefined): FigureSetting {
  return FIGURE_SETTINGS.find((s) => s === raw?.figure) ?? DEFAULT_FIGURE;
}

export interface ResolvedFigure {
  setting: FigureSetting;
  figure: Figure;
  // Waar het figuur vandaan komt: je keuze, de koppeling of de terugval.
  source: 'chosen' | 'linked' | 'fallback';
}

// `linkedSex`: wat een koppeling over de gebruiker weet (nog geen enkele levert het).
export function resolveFigure(raw: { figure?: unknown } | undefined, linkedSex?: Figure | null): ResolvedFigure {
  const setting = resolveFigureSetting(raw);
  if (setting === 'man' || setting === 'vrouw') return { setting, figure: setting, source: 'chosen' };
  if (linkedSex) return { setting, figure: linkedSex, source: 'linked' };
  return { setting, figure: FALLBACK_FIGURE, source: 'fallback' };
}
