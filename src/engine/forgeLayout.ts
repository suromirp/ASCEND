// ASCEND: de instelling "Oefeningen in een training" (docs/beslissingen/2026-10-29-oefeningen-opzij-vegen.md).
// Optioneel en zonder migratie: ontbreekt de sleutel of staat er iets geks, dan geldt het advies.
//
// - 'scherm': een oefening per scherm, opzij vegen van oefening naar oefening, met een strook kaartjes
//   bovenaan (het advies, de eigenaar vroeg erom).
// - 'lijst': alle oefeningen onder elkaar, zoals eerst.
export type ForgeLayout = 'scherm' | 'lijst';
export const FORGE_LAYOUTS: ForgeLayout[] = ['scherm', 'lijst'];
export const DEFAULT_FORGE_LAYOUT: ForgeLayout = 'scherm';

export function resolveForgeLayout(raw: { forgeLayout?: unknown } | undefined | null): ForgeLayout {
  return FORGE_LAYOUTS.find((m) => m === raw?.forgeLayout) ?? DEFAULT_FORGE_LAYOUT;
}

// De pagina die bij een scrollpositie hoort: de dichtstbijzijnde, binnen de lijst.
export function pageAt(scrollLeft: number, pageWidth: number, count: number): number {
  if (count <= 0 || pageWidth <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(Math.abs(scrollLeft) / pageWidth)));
}
