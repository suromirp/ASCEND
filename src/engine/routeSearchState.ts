// ASCEND: de regie van de zoektochten van Route voorstellen, puur (herstel na Warden, 14 november).
// Een geheugen met gelukte antwoorden per sleutel, het ene mislukte antwoord van de sleutel van nu, de
// bijsturing per startpunt en een bijsturing die nog zoekt (`pending`). components/useRouteSearch.ts houdt
// deze stand met useReducer en zoekt alleen als `needsSearch` waar is. Regels:
// - Nooit zoeken voor een sleutel waarvan het antwoord er al is, ook niet een mislukt antwoord: geen
//   automatische herhaling. Opnieuw zoeken is een tik (een nieuwe poging, dus een nieuwe sleutel).
// - Alleen gelukte antwoorden (`plans`) gaan het geheugen in. Een mislukte bijsturing laat niets achter:
//   een tweede tik zoekt echt opnieuw.
// - Een antwoord voor een sleutel die niet meer geldt (een laat antwoord na de terugval) telt niet.
// - Een bijsturing hoort bij één startpunt en één poging; is het startpunt intussen anders, dan vervalt hij
//   zonder regel (bij dat startpunt geldt weer wat ervoor gold).

import type { RouteStyle } from '../models/route';
import type { RoutePlans } from './routePlanner';
import { NO_ADJUST, adjustKey, settleAdjust, type AdjustAction, type LoopAdjust } from './routeAdjust';

export type SearchAnswer = { kind: 'plans'; plans: RoutePlans } | { kind: 'offline' } | { kind: 'timeout' };

// Zoveel gelukte antwoorden blijven in het geheugen: de lus van nu en een paar bijsturingen terug.
export const MEMORY_SIZE = 4;

export interface PendingAdjust {
  base: string;
  attempt: number;
  keyBase: string;
  // De sleutel van de bijgestuurde zoektocht.
  key: string;
  prev: LoopAdjust;
  style: RouteStyle | undefined;
  action: AdjustAction;
}

export interface SearchState {
  memory: { key: string; plans: RoutePlans }[];
  failure?: { key: string; kind: 'offline' | 'timeout' };
  adjust: { base: string; adjust: LoopAdjust };
  pending?: PendingAdjust;
  // De regel als bijsturen niet lukte, met de sleutel waar hij bij hoort: bij een andere start of poging zwijgt hij.
  failLine: string;
  failKey?: string;
}

export const INITIAL_SEARCH_STATE: SearchState = { memory: [], adjust: { base: '', adjust: NO_ADJUST }, failLine: '' };

// De sleutel van een zoektocht: alles van het startpunt, de training en de poging (`keyBase`), plus de bijsturing.
export const searchKey = (keyBase: string, adjust: LoopAdjust): string => `${keyBase}|${adjustKey(adjust)}`;

export const currentAdjust = (s: SearchState, base: string): LoopAdjust => (s.adjust.base === base ? s.adjust.adjust : NO_ADJUST);

export function answerFor(s: SearchState, key: string): SearchAnswer | 'busy' {
  const hit = s.memory.find((m) => m.key === key);
  if (hit) return { kind: 'plans', plans: hit.plans };
  if (s.failure?.key === key) return { kind: s.failure.kind };
  return 'busy';
}

export const needsSearch = (s: SearchState, key: string): boolean => answerFor(s, key) === 'busy';

// Het antwoord van de training zelf (zonder bijsturing) valt er nooit uit: anders zoekt Zoals je training
// na een paar keer Langer opnieuw (Warden).
const isBase = (key: string) => key.endsWith(`|${adjustKey(NO_ADJUST)}`);
function remember(s: SearchState, key: string, plans: RoutePlans): SearchState['memory'] {
  const list = [{ key, plans }, ...s.memory.filter((m) => m.key !== key)];
  const base = list.filter((m) => isBase(m.key));
  const rest = list.filter((m) => !isBase(m.key)).slice(0, Math.max(0, MEMORY_SIZE - base.length));
  return list.filter((m) => base.includes(m) || rest.includes(m));
}

// De regel als bijsturen niet lukte, alleen bij de sleutel waar hij bij hoort.
export const failLineFor = (s: SearchState, key: string): string => (s.failKey === key ? s.failLine : '');

export type SearchEvent =
  // Een antwoord van findRoutes; `currentKey` is de sleutel die nu geldt.
  | { type: 'answer'; key: string; answer: SearchAnswer; currentKey: string }
  // Langer, Korter of Vermijd dit stuk: een nieuwe bijsturing, met de sleutel die daarbij hoort.
  | { type: 'adjust'; base: string; attempt: number; keyBase: string; next: LoopAdjust; action: AdjustAction; style: RouteStyle | undefined }
  // Andere kant op: geen zoektocht.
  | { type: 'reverse'; base: string; style: RouteStyle }
  | { type: 'reset'; base: string }
  | { type: 'failLine'; line: string; key: string }
  // Het startpunt of de poging is anders dan die van de bijsturing die nog zoekt.
  | { type: 'drop' };

// Een bijsturing die klaar is (antwoord binnen, of al in het geheugen): blijven, of terug met de regel.
function settle(s: SearchState, p: PendingAdjust, answer: SearchAnswer): SearchState {
  const outcome = settleAdjust(p.action, p.style, answer);
  if (outcome.keep) return { ...s, pending: undefined, memory: answer.kind === 'plans' ? remember(s, p.key, answer.plans) : s.memory };
  return { ...s, pending: undefined, adjust: { base: p.base, adjust: p.prev }, failLine: outcome.line, failKey: searchKey(p.keyBase, p.prev) };
}

export function searchReducer(s: SearchState, e: SearchEvent): SearchState {
  switch (e.type) {
    case 'answer': {
      // Een laat antwoord voor een sleutel die niet meer geldt: telt niet.
      if (e.key !== e.currentKey) return s;
      if (s.pending && s.pending.key === e.key) return settle(s, s.pending, e.answer);
      const rest = { ...s, pending: undefined };
      if (e.answer.kind === 'plans') return { ...rest, memory: remember(s, e.key, e.answer.plans), failure: s.failure?.key === e.key ? undefined : s.failure };
      return { ...rest, failure: { key: e.key, kind: e.answer.kind } };
    }
    case 'adjust': {
      const prev = currentAdjust(s, e.base);
      const key = searchKey(e.keyBase, e.next);
      // Een tweede tik terwijl de vorige nog zoekt: terug gaat naar wat er voor de eerste gold, nooit naar een bijsturing die niet is nagekeken.
      const prevChecked = s.pending && s.pending.base === e.base && s.pending.attempt === e.attempt ? s.pending.prev : prev;
      const pending: PendingAdjust = { base: e.base, attempt: e.attempt, keyBase: e.keyBase, key, prev: prevChecked, style: e.style, action: e.action };
      const next: SearchState = { ...s, adjust: { base: e.base, adjust: e.next }, pending, failLine: '' };
      // Al eens gelukt (bijvoorbeeld Langer na Korter): meteen klaar, zonder zoektocht.
      const known = s.memory.find((m) => m.key === key);
      return known ? settle(next, pending, { kind: 'plans', plans: known.plans }) : next;
    }
    case 'reverse': {
      const a = currentAdjust(s, e.base);
      const on = a.reversed.includes(e.style);
      return { ...s, failLine: '', adjust: { base: e.base, adjust: { ...a, reversed: on ? a.reversed.filter((x) => x !== e.style) : [...a.reversed, e.style] } } };
    }
    case 'reset':
      return { ...s, failLine: '', pending: undefined, adjust: { base: e.base, adjust: NO_ADJUST } };
    case 'failLine':
      return { ...s, failLine: e.line, failKey: e.key };
    case 'drop':
      // Zonder regel terug naar wat er voor die bijsturing gold: anders blijft er bij dat startpunt een
      // bijsturing staan die nooit is nagekeken.
      return s.pending ? { ...s, pending: undefined, failLine: '', failKey: undefined, adjust: { base: s.pending.base, adjust: s.pending.prev } } : s;
  }
}

// Hoort de bijsturing die nog zoekt nog bij dit startpunt en deze poging?
export const pendingStale = (s: SearchState, base: string, attempt: number): boolean => !!s.pending && (s.pending.base !== base || s.pending.attempt !== attempt);
