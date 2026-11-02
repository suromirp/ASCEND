// De gegevens van de app voor alle schermen. Dit bestand verzamelt alleen, zodat elke aanroeper
// uit './AppDataContext' blijft lezen: de provider (AppDataProvider), de context en useAppData
// (useAppData) en de typen (appDataTypes). De acties staan per onderwerp in eigen hooks, het
// openen in boot en de planningssync in planningSync.

export { AppDataProvider } from './AppDataProvider';
export { useAppData } from './useAppData';
export type { GoalActivationResult, LogSessionInput, MarathonGoalPatch, UndoRestore } from './appDataTypes';
