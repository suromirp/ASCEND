// ASCEND — een tekst naar thuis: kopiëren naar het klembord, of delen met de
// deelknop van de telefoon (Web Share, beschikbaar op Android). Zonder server:
// de tekst verlaat de telefoon alleen via wat de gebruiker zelf kiest.

export function canShareText(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

// true als het gelukt is. Valt terug op een tijdelijk tekstvak wanneer de
// klembord-API ontbreekt of geweigerd wordt (bijvoorbeeld zonder gebaar).
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Hieronder volgt de terugval.
  }
  if (typeof document === 'undefined') return false;
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export type ShareResult = 'shared' | 'cancelled' | 'unavailable' | 'failed';

export async function shareText(title: string, text: string): Promise<ShareResult> {
  if (!canShareText()) return 'unavailable';
  try {
    await navigator.share({ title, text });
    return 'shared';
  } catch (e) {
    // Het deelvenster wegtikken is geen fout.
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
