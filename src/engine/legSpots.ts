// ASCEND: welke plekken van het lichaam bij de benen horen. Eén lijst voor INJURY-LEGS
// (engine/adviceEngine.ts) en voor spierpijn in de benen (engine/legSoreness.ts), zodat een
// nieuwe beenplek op één plek bijkomt. Puur.

export const LEG_BODY_PARTS = ['knie', 'enkel', 'heup', 'hamstring', 'kuit', 'voet', 'achilles', 'quadriceps', 'scheen', 'bil', 'been', 'benen'];

// Een melding staat onder de naam van de plek met de kant erachter ("Knie links").
export function isLegSpot(bodyPart: string): boolean {
  const name = bodyPart.toLowerCase();
  return LEG_BODY_PARTS.some((p) => name.includes(p));
}
