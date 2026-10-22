import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { placementOf, settingsPageRoute, type SettingsPageId } from '../../data/settingsLayout';

// Springen naar een rij: zoeken, een link vanaf een andere pagina (Forge, Vandaag)
// en het tandwiel geven dit door als `state` van de route.
//   jumpTo     het id van de rij (of het oude anker `instelling-<id>`)
//   openSheet  het blad van die rij opent meteen
//   reason     de rij staat er nu niet; de pagina zegt waarom
//   from       de tab waar je vandaan kwam (het overzicht licht die groep op)
export interface SettingsJumpState {
  jumpTo?: string;
  openSheet?: boolean;
  reason?: string;
  from?: string;
}

const ANCHOR_PREFIX = 'instelling-';

// Een oud anker (`instelling-forge`) of een id van de index wordt een rij.
export function normalizeJumpTarget(raw: string | undefined): { page: SettingsPageId; row: string; sheet?: boolean } | undefined {
  if (!raw) return undefined;
  const id = raw.startsWith(ANCHOR_PREFIX) ? raw.slice(ANCHOR_PREFIX.length) : raw;
  return placementOf(id);
}

export function jumpState(raw: unknown): SettingsJumpState {
  return raw && typeof raw === 'object' ? (raw as SettingsJumpState) : {};
}

export function useJumpState(): SettingsJumpState {
  return jumpState(useLocation().state);
}

// De sprong naar een andere groep, met alles wat de pagina daar nodig heeft.
export function jumpRoute(page: SettingsPageId, state: SettingsJumpState = {}): { to: string; state: SettingsJumpState } {
  return { to: settingsPageRoute(page), state };
}

export function flashRow(rowId: string) {
  const el = document.getElementById(`${ANCHOR_PREFIX}${rowId}`);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  el.classList.remove('flash');
  // Een nieuwe klasse op een volgend beeld, zodat de animatie opnieuw begint.
  window.requestAnimationFrame(() => el.classList.add('flash'));
  window.setTimeout(() => el.classList.remove('flash'), 1800);
}

// Na het tekenen naar de rij scrollen en hem laten oplichten.
export function useFlashOnMount(rowId: string | undefined) {
  const done = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!rowId || done.current === rowId) return;
    done.current = rowId;
    const t = window.setTimeout(() => flashRow(rowId), 80);
    return () => window.clearTimeout(t);
  }, [rowId]);
}
