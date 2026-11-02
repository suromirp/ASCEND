// ASCEND: hoe ASCEND met een sport omgaat (docs/visie/Sporten die meetellen.md, 3.2 en 5). Eén bron:
// `AppSettings.sportHandling` met per sport een rol ("Plan dit voor mij", "Vaste dag", "Telt mee als
// ik het doe", "Negeren") en voor een vaste dag de afspraken. Zonder keuze valt het terug op de oude
// instelling: een sport die aan staat wordt gepland, een sport die uit staat doet niet mee, en een
// sport die ASCEND niet plant (zwemmen, padel, voetbal) heeft nog geen rol. Puur: geen React, geen IndexedDB.

import { ALL_SPORT_IDS, SPORT_IDS, anySportDefinition, type AnySportId, type SportId, type SportRole } from '../data/sports';
import { DEFAULT_ENABLED_SPORTS } from './sports';

export interface FixedSlot {
  // 1 maandag tot 7 zondag.
  day: number;
  minutes: number;
  intensity: 'low' | 'moderate' | 'high';
}

interface SportHandling {
  role: SportRole;
  fixed?: FixedSlot[];
}

export type SportHandlingMap = Partial<Record<AnySportId, SportHandling>>;

const ROLES: SportRole[] = ['plan', 'fixed', 'count', 'off'];
const INTENSITIES: FixedSlot['intensity'][] = ['low', 'moderate', 'high'];

function parseSlot(raw: unknown): FixedSlot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const day = typeof r.day === 'number' && Number.isInteger(r.day) && r.day >= 1 && r.day <= 7 ? r.day : undefined;
  const minutes = typeof r.minutes === 'number' && Number.isFinite(r.minutes) && r.minutes >= 10 && r.minutes <= 300 ? Math.round(r.minutes) : undefined;
  const intensity = INTENSITIES.find((i) => i === r.intensity);
  return day && minutes && intensity ? { day, minutes, intensity } : undefined;
}

// Defensief gelezen (een oude of beschadigde back-up): alleen bekende sporten, een rol die die sport
// kent, en vaste afspraken met een echte dag, lengte en zwaarte (hoogstens een per dag). Wat niet klopt
// valt weg; `skipped` telt het.
export function parseSportHandling(raw: unknown): { value: SportHandlingMap | undefined; skipped: number } {
  if (raw === undefined) return { value: undefined, skipped: 0 };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { value: undefined, skipped: 1 };
  const out: SportHandlingMap = {};
  let skipped = 0;
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    const id = ALL_SPORT_IDS.find((s) => s === key);
    const e = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : undefined;
    const role = ROLES.find((r) => r === e?.role);
    if (!id || !role || !(anySportDefinition(id).roles as readonly SportRole[]).includes(role)) { skipped++; continue; }
    const slots = Array.isArray(e?.fixed) ? (e!.fixed as unknown[]) : [];
    const fixed: FixedSlot[] = [];
    for (const s of slots) {
      const slot = parseSlot(s);
      if (slot && !fixed.some((f) => f.day === slot.day)) fixed.push(slot);
      else skipped++;
    }
    out[id] = { role, ...(role === 'fixed' && fixed.length > 0 ? { fixed: fixed.sort((a, b) => a.day - b.day) } : {}) };
  }
  return { value: Object.keys(out).length > 0 ? out : undefined, skipped };
}

// Hoe sporten meetellen (Instellingen, Planning): vragen bij een nieuwe sport, vragen hoe zwaar het was, en
// hoe lang de benen rust krijgen na een zware sport. Het advies: twee keer aan, en Ruim.
export interface SportCounting {
  askNew: boolean;
  askFelt: boolean;
  rest: 'ruim' | 'korter';
}

export function resolveSportCounting(raw: unknown): SportCounting {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    askNew: r.askNew !== false,
    askFelt: r.askFelt !== false,
    rest: r.rest === 'korter' ? 'korter' : 'ruim',
  };
}

// Leest defensief voor een import: alleen de drie bekende velden met een bekende waarde, en alleen wat
// afwijkt van het advies. Niets over: undefined.
export function cleanSportCounting(raw: unknown): { value: Partial<SportCounting> | undefined; skipped: number } {
  if (raw === undefined) return { value: undefined, skipped: 0 };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { value: undefined, skipped: 1 };
  const r = raw as Record<string, unknown>;
  const out: Partial<SportCounting> = {};
  let skipped = 0;
  for (const key of ['askNew', 'askFelt'] as const) {
    if (!(key in r)) continue;
    if (typeof r[key] === 'boolean') out[key] = r[key] as boolean;
    else skipped++;
  }
  if ('rest' in r) {
    if (r.rest === 'ruim' || r.rest === 'korter') out.rest = r.rest;
    else skipped++;
  }
  for (const key of Object.keys(r)) if (!['askNew', 'askFelt', 'rest'].includes(key)) skipped++;
  return { value: Object.keys(out).length > 0 ? out : undefined, skipped };
}

export interface RoleSettings {
  sportHandling?: unknown;
  enabledSports?: Partial<Record<SportId, boolean>>;
  sportCounting?: unknown;
}

// De rol van een sport, of undefined als er nog niets gekozen is (een sport die ASCEND niet plant). Staat
// "Vragen bij een nieuwe sport" uit, dan begint zo'n sport op Telt mee als ik het doe.
export function sportRole(settings: RoleSettings, sport: AnySportId): SportRole | undefined {
  const chosen = parseSportHandling(settings.sportHandling).value?.[sport]?.role;
  if (chosen) return chosen;
  const planned = SPORT_IDS.find((s) => s === sport);
  if (!planned) return resolveSportCounting(settings.sportCounting).askNew ? undefined : 'count';
  // Uit: ASCEND plant hem niet, maar wat je doet blijft een training in je logboek die meetelt.
  return { ...DEFAULT_ENABLED_SPORTS, ...settings.enabledSports }[planned] ? 'plan' : 'count';
}

// Telt wat je deed mee voor je benen en je week? Alles behalve Negeren en nog niet gekozen.
export function sportCounts(settings: Parameters<typeof sportRole>[0], sport: AnySportId): boolean {
  const role = sportRole(settings, sport);
  return role !== undefined && role !== 'off';
}
