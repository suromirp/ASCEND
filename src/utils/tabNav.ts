// ASCEND: wat een tik op de tabbalk met de geschiedenis doet.
//
// Met 'today' (het advies) blijft de geschiedenis kort en klopt de terugknop
// met wat Android-apps doen: Vandaag staat onderaan, een andere tab komt
// erboven, en van tab naar tab wisselen vervangt die ene stap in plaats van
// er steeds een bij te zetten. Met 'previous' is elke tik een nieuwe stap en
// volgt terug precies de volgorde waarin je de tabs opende.
// De router voert het plan uit (App.tsx); hier staat alleen de keuze.

import type { TabBackMode } from '../engine/navigationSettings';

// Staat in de state van een stap: onder deze tab ligt Vandaag.
export interface TabState {
  fromToday?: boolean;
}

export type TabNavPlan =
  | { kind: 'top' }
  | { kind: 'back' }
  | { kind: 'push'; state?: TabState }
  | { kind: 'replace'; state?: TabState };

export interface TabNavInput {
  mode: TabBackMode;
  currentPath: string;
  currentState: TabState | null | undefined;
  target: string;
  // history.state.idx van de router: 0 = de eerste stap van deze sessie.
  historyIdx: number;
  tabs: readonly string[];
  home: string;
}

export function planTabNavigation(input: TabNavInput): TabNavPlan {
  const { mode, currentPath, currentState, target, historyIdx, tabs, home } = input;
  // Nog eens op de tab waar je al bent: bovenaan beginnen.
  if (target === currentPath) return { kind: 'top' };
  if (mode === 'previous') return { kind: 'push' };
  // Vanaf een pagina die geen tab is (Meer, een gids) komt de tab erbovenop,
  // zodat terug op die pagina uitkomt.
  if (!tabs.includes(currentPath)) return { kind: 'push' };
  // Vanaf Vandaag: erbovenop, met de aantekening dat Vandaag eronder ligt.
  if (currentPath === home) return { kind: 'push', state: { fromToday: true } };
  // Vanaf een andere tab terug naar Vandaag: dat is één stap terug, als
  // Vandaag er echt onder ligt. Anders wordt deze stap Vandaag.
  if (target === home) {
    return currentState?.fromToday && historyIdx > 0 ? { kind: 'back' } : { kind: 'replace' };
  }
  // Van tab naar tab: deze stap wordt de nieuwe tab.
  return currentState?.fromToday ? { kind: 'replace', state: { fromToday: true } } : { kind: 'replace' };
}
