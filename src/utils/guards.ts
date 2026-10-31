// Gedeelde type-wachters voor het lezen van JSON van buiten (back-ups, bestanden, API's).

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
