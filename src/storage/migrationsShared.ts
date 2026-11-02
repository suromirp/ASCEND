// Kleine hulpjes die meerdere migratiestappen delen.

// Een eindig getal, een optioneel eindig getal en een gewoon object (geen lijst).
export const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const optFin = (v: unknown): boolean => v === undefined || fin(v);
export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Een kalenderdag als JJJJ-MM-DD.
const ISO_DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
// The shape and a real date: 2026-13-45 has the shape but is no day.
export const ISO_DAY = {
  test(value: string): boolean {
    if (!ISO_DAY_SHAPE.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  },
};
