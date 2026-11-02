// ASCEND: laadt de losse bronnen van een scherm los van elkaar. Elke bron heeft een eigen
// tijdsgrens; zodra een bron klaar is komt zijn deel meteen binnen, zonder op de rest te wachten.
// Een trage of hangende bron houdt dus nooit een andere rij tegen. Duurt een bron te lang of gaf
// hij een fout, dan komt er geen verzonnen waarde: de aanroeper hoort `ok: false` en weet dat de
// bron onbekend is (de instellingen, docs/architectuur/bediening-en-beweging.md).

import { withTimeout } from './withTimeout';

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
      try {
        onPart(p.key, await withTimeout(Promise.resolve().then(p.load), p.ms), true);
      } catch {
        onPart(p.key, {}, false);
      }
    }),
  );
}
