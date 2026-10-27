// ASCEND: wat je koos op een dag met vermoeide benen (docs/beslissingen/2026-10-27-spierpijn-en-zware-beendag.md).
// Een lijst naast de logs: de training en het log zelf veranderen er nooit door. Optioneel en
// additief, dus het schemanummer van de back-up verandert niet
// (storage/migrations.ts#migrateLegEaseDays).

// Zoveel keuzes blijven bewaard.
export const MAX_LEG_EASE_DAYS = 60;

export type LegEaseChoice = 'lichter' | 'liever-niet';
export type LegEaseReason = 'spierpijn' | 'flink' | 'harde-loop' | 'index';

export interface LegEaseDay {
  // De dag van de training.
  date: string;
  plannedSessionId: string;
  choice: LegEaseChoice;
  reasons: LegEaseReason[];
  // De beenindex op het moment van kiezen.
  index: number;
  // Het tijdstip van kiezen (ISO).
  at: string;
}
