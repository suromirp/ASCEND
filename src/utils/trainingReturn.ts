// De beslissing achter de terugweg naar de training na de sprong naar Instellingen (useForgeSession.ts#useTrainingReturn).
// Alleen de terugknop (POP) na een bezoek aan de Forge-instellingen opent de training, één keer; elke andere weg
// weg van Instellingen wist hem; zonder bezoek of zonder (geldige) terugweg gebeurt er niets.

export interface ReturnInput {
  // Er is een terugweg en hij is niet verlopen (`trainingReturn()`).
  pending: boolean;
  // De pagina Forge in Instellingen is al bezocht sinds de terugweg bestaat.
  seen: boolean;
  onSettings: boolean;
  type: 'POP' | 'PUSH' | 'REPLACE';
}

export function decideReturn(i: ReturnInput): { seen: boolean; action: 'openen' | 'wissen' | 'niets' } {
  if (!i.pending) return { seen: false, action: 'niets' };
  if (i.onSettings) return { seen: true, action: 'niets' };
  if (!i.seen) return { seen: false, action: 'niets' };
  return { seen: false, action: i.type === 'POP' ? 'openen' : 'wissen' };
}
