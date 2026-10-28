import { drawingUrl, parseDrawing, type ExerciseDrawing } from '../engine/exerciseArtData';

// De tekeningen laden, één keer per tekening per sessie. Geen database: de service worker bewaart
// de bestanden (vite.config.ts, cache "exercise-art"), dit geheugen voorkomt alleen dubbel ophalen.
// Elke vraag heeft een grens in tijd en een uitkomst: een tekening of null, nooit een wachtende knop.

const LOAD_LIMIT_MS = 8000;
const cache = new Map<string, Promise<ExerciseDrawing | null>>();
const ready = new Map<string, ExerciseDrawing>();

export function loadedDrawing(slug: string): ExerciseDrawing | undefined {
  return ready.get(slug);
}

export function loadDrawing(slug: string): Promise<ExerciseDrawing | null> {
  const hit = cache.get(slug);
  if (hit) return hit;
  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOAD_LIMIT_MS);
    try {
      const response = await fetch(drawingUrl(import.meta.env.BASE_URL, slug), { signal: controller.signal });
      if (!response.ok) return null;
      const drawing = parseDrawing(await response.json());
      if (drawing) ready.set(slug, drawing);
      return drawing;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
  cache.set(slug, promise);
  // Een mislukte poging blijft niet hangen: de volgende keer mag het opnieuw.
  void promise.then((d) => {
    if (!d) cache.delete(slug);
  });
  return promise;
}

// Op de achtergrond, een voor een en met rust ertussen, zodat het niets van de rest afpakt.
export async function prefetchDrawings(slugs: string[], shouldStop: () => boolean = () => false, gapMs = 150): Promise<void> {
  for (const slug of slugs) {
    if (shouldStop()) return;
    if (ready.has(slug)) continue;
    await loadDrawing(slug);
    await new Promise((resolve) => setTimeout(resolve, gapMs));
  }
}
