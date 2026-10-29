import { artOrder } from '../data/exerciseArt';
import { drawingUrl, orderedDrawing, parseDrawing, type ExerciseDrawing } from '../engine/exerciseArtData';

// De tekeningen laden, één keer per tekening per sessie. Geen database: de service worker bewaart
// de bestanden (vite.config.ts, cache "exercise-art"), dit geheugen voorkomt alleen dubbel ophalen.
// Elke vraag heeft een grens in tijd en een uitkomst: een tekening of null, nooit een wachtende knop.

const LOAD_LIMIT_MS = 8000;
const cache = new Map<string, Promise<ExerciseDrawing | null>>();
const ready = new Map<string, ExerciseDrawing>();

// Wie wil weten dat er een tekening bij is gekomen (het kleine kaartje), zonder zelf iets op te halen.
const listeners = new Set<(slug: string) => void>();
export function onDrawingReady(listener: (slug: string) => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
function markReady(slug: string, drawing: ExerciseDrawing) {
  if (ready.has(slug)) return;
  ready.set(slug, drawing);
  listeners.forEach((l) => l(slug));
}

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
      const parsed = parseDrawing(await response.json());
      const drawing = parsed && orderedDrawing(parsed, artOrder(slug));
      if (drawing) markReady(slug, drawing);
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

// Op de achtergrond, een voor een en met rust ertussen, zodat het niets van de rest afpakt. Elke ronde
// kijkt of er nog verbinding is, en na de eerste mislukking stopt het: geen reeks fouten zonder netwerk.
const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export async function prefetchDrawings(
  slugs: string[],
  shouldStop: () => boolean = () => false,
  gapMs = 150,
  online: () => boolean = isOnline,
): Promise<void> {
  for (const slug of slugs) {
    if (shouldStop() || !online()) return;
    if (ready.has(slug)) continue;
    const drawing = await loadDrawing(slug);
    if (!drawing) return;
    await new Promise((resolve) => setTimeout(resolve, gapMs));
  }
}

// Alleen wat de service worker al bewaarde (cache "exercise-art"), zonder netwerk: voor het kleine kaartje in
// een lijst, dat nooit extra moet ophalen. Geen cache of geen treffer is gewoon null.
export async function readCachedDrawing(slug: string): Promise<ExerciseDrawing | null> {
  const known = ready.get(slug);
  if (known) return known;
  try {
    if (typeof caches === 'undefined') return null;
    const store = await caches.open('exercise-art');
    const hit = await store.match(drawingUrl(import.meta.env.BASE_URL, slug));
    if (!hit) return null;
    const parsed = parseDrawing(await hit.json());
    const drawing = parsed && orderedDrawing(parsed, artOrder(slug));
    if (drawing) markReady(slug, drawing);
    return drawing;
  } catch {
    return null;
  }
}
