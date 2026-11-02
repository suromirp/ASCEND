// ASCEND: laadt de losse bronnen van een scherm los van elkaar. Elke bron heeft een eigen
// tijdsgrens; zodra een bron klaar is komt zijn deel meteen binnen, zonder op de rest te wachten.
// Een trage of hangende bron houdt dus nooit een andere rij tegen. Duurt een bron te lang of gaf
// hij een fout, dan komt er geen verzonnen waarde: de aanroeper hoort `ok: false` en weet dat de
// bron onbekend is. Komt een te trage bron later alsnog, dan volgt een tweede melding met `ok: true` (de instellingen, docs/architectuur/bediening-en-beweging.md).

import { TimeoutError, withTimeout } from './withTimeout';

export interface Part<K extends string, T> {
  key: K;
  // Hoe lang de bron hoogstens mag duren.
  ms: number;
  // Gooit bij een fout, in plaats van een standaardwaarde terug te geven.
  load: () => Promise<Partial<T>>;
}

export async function loadParts<K extends string, T>(parts: readonly Part<K, T>[], onPart: (key: K, patch: Partial<T>, ok: boolean) => void): Promise<void> {
  await Promise.all(
    parts.map(async (p) => {
      const run = Promise.resolve().then(p.load);
      try {
        onPart(p.key, await withTimeout(run, p.ms), true);
      } catch (err) {
        onPart(p.key, {}, false);
        // Te traag, niet stuk: komt het antwoord alsnog, dan wordt het overgenomen (de aanroeper
        // vergelijkt zijn teller, dus een nieuwere ronde wint altijd).
        if (err instanceof TimeoutError) run.then((patch) => onPart(p.key, patch, true), () => undefined);
      }
    }),
  );
}
