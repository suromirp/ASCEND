// ASCEND: waar de app opent na een verse start.
//
// Twee dingen, allebei alleen bij een echte start (de app is opnieuw geopend,
// niet herladen of terug uit de geschiedenis) en alleen als er geen eigen
// adres is meegegeven (een snelkoppeling, een gedeeld bestand):
// 1. Terug naar de pagina waar je was, als dat binnen de ingestelde tijd is
//    (instelling "Na een herstart"). Vandaag blijft eronder liggen, dus terug
//    gaat naar Vandaag.
// 2. Opent de app op een andere tab dan Vandaag (een gedeelde link), dan komt
//    Vandaag eronder te liggen als de terugknop dat vraagt ('today').

import type { TabBackMode } from '../engine/navigationSettings';

export interface LastRoute {
  path: string;
  at: number;
}

export interface LaunchInput {
  pathname: string;
  search: string;
  historyIdx: number;
  // 'navigate' | 'reload' | 'back_forward' | 'prerender'
  navigationType: string;
  now: number;
  last: LastRoute | null;
  resumeMinutes: number;
  mode: TabBackMode;
  tabs: readonly string[];
  home: string;
}

// De pagina die boven Vandaag gezet wordt, of null: laat alles zoals het is.
export function planLaunch(input: LaunchInput): string | null {
  const { pathname, search, historyIdx, navigationType, now, last, resumeMinutes, mode, tabs, home } = input;
  if (navigationType === 'reload' || navigationType === 'back_forward') return null;
  if (historyIdx !== 0 || search) return null;
  if (pathname === home) {
    if (resumeMinutes <= 0 || !last) return null;
    const age = now - last.at;
    if (!(age >= 0 && age <= resumeMinutes * 60_000)) return null;
    if (last.path === home) return null;
    return last.path;
  }
  // Een eigen adres naar een tab: Vandaag eronder, als dat bij de instelling hoort.
  if (mode === 'today' && tabs.includes(pathname)) return pathname;
  return null;
}

const STORAGE_KEY = 'ascend.lastRoute';

export function parseLastRoute(raw: string | null): LastRoute | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { path, at } = value as Record<string, unknown>;
    if (typeof path !== 'string' || !path.startsWith('/') || typeof at !== 'number' || !Number.isFinite(at)) return null;
    return { path, at };
  } catch {
    return null;
  }
}

// localStorage kan ontbreken of weigeren: dan onthoudt de app het niet.
export function readLastRoute(storage: Pick<Storage, 'getItem'> | null): LastRoute | null {
  try {
    return parseLastRoute(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function writeLastRoute(storage: Pick<Storage, 'setItem'> | null, path: string, now: number): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ path, at: now }));
  } catch {
    // Opslag geweigerd: dan geen hervatten.
  }
}

export function localStorageOrNull(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
