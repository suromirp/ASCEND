// ASCEND: laadt de losse bronnen van een scherm los van elkaar. Elke bron heeft een eigen
// tijdsgrens en een terugval; zodra een bron klaar is (of de tijd om is) komt zijn deel meteen
// binnen, zonder op de rest te wachten. Een trage of hangende bron houdt dus nooit een andere
// rij tegen (de instellingen, docs/architectuur/bediening-en-beweging.md).

import { withTimeout } from './withTimeout';

export interface Part<K extends string, T> {
  key: K;
  // Hoe lang de bron hoogstens mag duren; daarna geldt de terugval.
  ms: number;
  load: () => Promise<Partial<T>>;
  // Wat er staat als de bron te lang duurt of een fout geeft.
  fallback: Partial<T>;
}

export async function loadParts<K extends string, T>(parts: readonly Part<K, T>[], onPart: (key: K, patch: Partial<T>) => void): Promise<void> {
  await Promise.all(
    parts.map(async (p) => {
      let patch: Partial<T>;
      try {
        patch = await withTimeout(Promise.resolve().then(p.load), p.ms);
      } catch {
        patch = p.fallback;
      }
      onPart(p.key, patch);
    }),
  );
}
