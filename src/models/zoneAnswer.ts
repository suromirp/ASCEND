// ASCEND: je antwoord op "Zones bijwerken na een test" (engine/zoneUpdate.ts,
// docs/beslissingen/2026-11-02-week-en-vandaag-hulp.md). Een lijst naast de logs, per test: de log
// zelf verandert er nooit door. Optioneel en additief, dus het schemanummer van de back-up verandert
// niet (storage/migrations.ts#migrateZoneAnswers).

export const MAX_ZONE_ANSWERS = 60;

export interface ZoneAnswer {
  // De log van de test.
  logId: string;
  answer: 'accepted' | 'declined';
  // De dag van het antwoord.
  date: string;
  // De drempelhartslag ervoor (absent: niet ingevuld) en die het voorstel gaf.
  lthrFrom?: number;
  lthrTo: number;
}
