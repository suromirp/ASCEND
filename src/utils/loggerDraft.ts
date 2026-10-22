// ASCEND: het concept van het afvinkblad, per sessie in sessionStorage.
//
// Herladen midden in het invullen (de browser ververst zichzelf, een update,
// een per ongeluk getrokken pagina) liet alles verdwijnen. Het blad schrijft
// daarom wat je invulde weg zodra het verandert en leest het terug als je
// hetzelfde blad opnieuw opent. Na Opslaan en na Annuleren gaat het concept weg.
// sessionStorage kan ontbreken of een fout geven (privévenster, geblokkeerde
// gegevens): dan werkt het blad gewoon zonder concept.

const PREFIX = 'ascend.afvinkconcept.';

// Eén sleutel per sessie: de geplande sessie, anders de training en de dag.
export function draftKey(templateId: string, plannedSessionId: string | undefined, scheduledDate: string | undefined): string {
  return `${PREFIX}${plannedSessionId ?? `${templateId}:${scheduledDate ?? 'los'}`}`;
}

export function saveDraft(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // geen opslag: geen concept
  }
}

export function loadDraft<T extends object>(key: string): Partial<T> | undefined {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Partial<T>) : undefined;
  } catch {
    return undefined;
  }
}

export function clearDraft(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // niets te wissen
  }
}

// Een getal of '' uit een concept; alles anders valt terug op de standaard.
export function draftNumber<D extends number | ''>(value: unknown, fallback: D): number | '' | D {
  return typeof value === 'number' && Number.isFinite(value) ? value : value === '' ? '' : fallback;
}
