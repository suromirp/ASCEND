// ASCEND: wat het scherm Sporten laat zien (docs/visie/Sporten die meetellen.md, 2.1 en 2.2). Per sport de
// rol, één regel met wat die rol nu betekent, de keuzes in het blad en een weekstrook van maandag tot zondag.
// Puur: geen React, geen IndexedDB.

import { ALL_SPORT_IDS, anySportDefinition, type AnySportId, type SportRole } from '../data/sports';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays } from '../utils/dates';
import { legRestHours, stressProfileOf } from './sportStress';
import { parseSportHandling, sportRole, type FixedSlot, type RoleSettings } from './sportRole';
import { templateSport } from './sports';

// De vaste volgorde: eerst wat ASCEND plant, dan wat alleen kan meetellen.
export const SPORT_ORDER: readonly AnySportId[] = ALL_SPORT_IDS;

// De vaste woorden van de rollen.
export const ROLE_LABEL: Record<SportRole, string> = {
  plan: 'Plan dit voor mij',
  fixed: 'Vaste dag',
  count: 'Telt mee als ik het doe',
  off: 'Negeren',
};
// Kort, voor de pil op de kaart.
export const ROLE_PILL: Record<SportRole, string> = { plan: 'Gepland', fixed: 'Vaste dag', count: 'Telt mee', off: 'Negeren' };
export const NOT_CHOSEN = 'Nog niet gekozen';

export const ROLE_NOTE: Record<SportRole, string> = {
  plan: 'ASCEND zet het in je week, op dagen die bij je benen passen.',
  fixed: 'Jij kiest de dag. ASCEND plant de rest eromheen.',
  count: 'Je plant het zelf. Wat je doet telt mee in je benen en je week.',
  off: 'ASCEND doet er niets mee.',
};

// De keuzes in het blad. Een sport die ASCEND plant kent geen Negeren: zijn logs zijn trainingen uit je
// eigen logboek en tellen altijd mee voor je benen. Uit is daar Telt mee als ik het doe. Een vaste dag
// bestaat alleen voor een sport die ASCEND zelf niet plant.
export function roleChoices(sport: AnySportId): SportRole[] {
  const def = anySportDefinition(sport);
  if (def.plannable) return ['plan', 'count'];
  return (['fixed', 'count', 'off'] as SportRole[]).filter((r) => (def.roles as readonly SportRole[]).includes(r));
}

const DAY_NAME = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const dayName = (day: number): string => DAY_NAME[day - 1] ?? '';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function joinDays(days: number[]): string {
  const names = days.map(dayName);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} en ${names.at(-1)}`;
}

export function slotRestHours(sport: AnySportId, slot: Pick<FixedSlot, 'intensity'>): number {
  return legRestHours(stressProfileOf(anySportDefinition(sport), slot.intensity));
}

export interface SportCardInfo {
  sport: AnySportId;
  label: string;
  role: SportRole | undefined;
  pill: string;
  line: string;
}

// De regel onder de naam: het droge feit eerst.
export function sportCardLine(sport: AnySportId, role: SportRole | undefined, settings: RoleSettings & { sportFrequency?: Partial<Record<string, number>> }): string {
  const def = anySportDefinition(sport);
  if (role === undefined) return 'Zodra je dit doet, vraagt ASCEND hoe het telt.';
  if (role === 'plan') {
    const n = settings.sportFrequency?.[sport];
    return n ? `${n === 1 ? 'Eén keer' : `${n} keer`} per week. ASCEND kiest de dagen.` : 'Je weekschema bepaalt hoe vaak. ASCEND kiest de dagen.';
  }
  if (role === 'fixed') {
    const slots = parseSportHandling(settings.sportHandling).value?.[sport]?.fixed ?? [];
    if (slots.length === 0) return 'Nog geen dag gekozen.';
    const heavy = slots.filter((s) => slotRestHours(sport, s) >= 72);
    const days = cap(joinDays(slots.map((s) => s.day)));
    if (heavy.length > 0) return `${days}. De ${joinDays(heavy.map((s) => s.day))} telt als zwaar: de 72 uur erna blijven je benen vrij van zware kracht.`;
    if (slots.some((s) => slotRestHours(sport, s) > 0)) return `${days}. De dag erna blijft lichter voor je benen.`;
    return `${days}. ASCEND plant de rest eromheen.`;
  }
  if (role === 'count') {
    if (def.plannable) return 'Telt mee voor je benen en je week. ASCEND plant het niet.';
    return legRestHours(stressProfileOf(def)) > 0 ? 'Je plant het zelf. Log je het, dan blijft de dag erna lichter.' : 'Je plant het zelf. Log je het, dan telt het mee in je week.';
  }
  return 'Doet niet mee in je planning en je benen. Je kunt het wel loggen.';
}

export function sportCards(settings: RoleSettings & { sportFrequency?: Partial<Record<string, number>> }): SportCardInfo[] {
  return SPORT_ORDER.map((sport) => {
    const role = sportRole(settings, sport);
    return { sport, label: anySportDefinition(sport).label, role, pill: role ? ROLE_PILL[role] : NOT_CHOSEN, line: sportCardLine(sport, role, settings) };
  });
}

// De waarde van de rij Sporten: "2 gepland", met eronder "1 vaste dag, 1 telt mee". Kort genoeg voor 360 px.
export function sportsRowSummary(settings: RoleSettings): { value: string; sub?: string } {
  const n: Record<SportRole, number> = { plan: 0, fixed: 0, count: 0, off: 0 };
  for (const sport of SPORT_ORDER) {
    const role = sportRole(settings, sport);
    if (role) n[role]++;
  }
  const parts = [n.plan > 0 && `${n.plan} gepland`, n.fixed > 0 && `${n.fixed} vaste dag`, n.count > 0 && `${n.count} telt mee`].filter(Boolean) as string[];
  if (parts.length === 0) return { value: 'Niets gekozen' };
  const [first, ...rest] = parts;
  return rest.length > 0 ? { value: first, sub: cap(rest.join(', ')) } : { value: first };
}

// --- de weekstrook -------------------------------------------------------------------------

// 'fixed' gevuld mint (een vaste dag), 'planned' mint omlijnd (ASCEND plant de sport), 'rest' een grijze
// ring (rustig voor je benen na een zware sport), 'none' leeg.
export type WeekDot = 'fixed' | 'planned' | 'rest' | 'none';

export function sportWeekDots(input: {
  sport: AnySportId;
  settings: RoleSettings;
  weekStart: string;
  sessions: readonly PlannedSession[];
  templates: readonly SessionTemplate[];
}): WeekDot[] {
  const dots: WeekDot[] = Array.from({ length: 7 }, () => 'none');
  const role = sportRole(input.settings, input.sport);
  if (role === 'plan') {
    const byId = new Map(input.templates.map((t) => [t.id, t]));
    for (let i = 0; i < 7; i++) {
      const day = addDays(input.weekStart, i);
      if (input.sessions.some((s) => s.scheduledDate === day && s.status !== 'skipped' && byId.get(s.templateId) && templateSport(byId.get(s.templateId)!) === input.sport)) dots[i] = 'planned';
    }
  }
  if (role === 'fixed') {
    const slots = parseSportHandling(input.settings.sportHandling).value?.[input.sport]?.fixed ?? [];
    for (const s of slots) dots[s.day - 1] = 'fixed';
    for (const s of slots) {
      const restDays = Math.max(0, slotRestHours(input.sport, s) / 24 - 1);
      for (let d = 1; d <= restDays; d++) {
        const i = s.day - 1 + d;
        if (i < 7 && dots[i] === 'none') dots[i] = 'rest';
      }
    }
  }
  return dots;
}

const DOT_WORD: Record<Exclude<WeekDot, 'none'>, string> = { fixed: 'vaste dag', planned: 'gepland', rest: 'rustig voor je benen' };

// De strook in woorden, voor een schermlezer.
export function weekDotsLabel(dots: readonly WeekDot[]): string {
  const parts: string[] = [];
  for (const kind of ['fixed', 'planned', 'rest'] as const) {
    const days = dots.flatMap((d, i) => (d === kind ? [i + 1] : []));
    if (days.length > 0) parts.push(`${cap(joinDays(days))}: ${DOT_WORD[kind]}`);
  }
  return parts.length > 0 ? `Deze week. ${parts.join('. ')}.` : 'Deze week niets.';
}
