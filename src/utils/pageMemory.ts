// ASCEND: wat een pagina onthoudt per geschiedenisstap.
//
// De terugknop moet je terugbrengen waar je was: op dezelfde hoogte, met
// dezelfde week gekozen, hetzelfde zoekwoord, dezelfde uitgeklapte onderdelen.
// Dat hoort bij de stap in de geschiedenis (de `key` van de locatie), niet bij
// de pagina: dezelfde pagina via een nieuwe tik opent weer schoon, dezelfde
// stap via terug komt precies zo terug.
//
// Alles staat in het geheugen en wordt met een kleine vertraging naar
// sessionStorage geschreven, zodat een herlaad binnen dezelfde sessie het
// ook nog weet. sessionStorage kan ontbreken of weigeren (privévenster,
// opslag geblokkeerd): dan werkt het geheugen alleen, zonder foutmelding.
// Het is een beperkt aantal sleutels; de oudste gaan eerst weg.

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface PageMemoryOptions {
  prefix?: string;
  max?: number;
  // Plant een schrijfopdracht in; standaard setTimeout. Voor de tests.
  schedule?: (fn: () => void) => void;
}

export function createPageMemory(getStorage: () => StorageLike | null, options: PageMemoryOptions = {}) {
  const prefix = options.prefix ?? 'ascend.pm.';
  const max = options.max ?? 150;
  const schedule = options.schedule ?? ((fn) => void setTimeout(fn, 250));
  const memory = new Map<string, unknown>();
  // Oudste eerst, nieuwste laatst.
  let order: string[] | null = null;
  const dirty = new Set<string>();
  const removed = new Set<string>();
  let scheduled = false;

  function storage(): StorageLike | null {
    try {
      return getStorage();
    } catch {
      return null;
    }
  }

  function loadOrder(): string[] {
    if (order) return order;
    order = [];
    try {
      const raw = storage()?.getItem(`${prefix}index`);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) order = parsed.filter((k): k is string => typeof k === 'string');
    } catch {
      order = [];
    }
    return order;
  }

  function touch(key: string) {
    const list = loadOrder();
    const i = list.indexOf(key);
    if (i >= 0) list.splice(i, 1);
    list.push(key);
    while (list.length > max) {
      const oldest = list.shift()!;
      memory.delete(oldest);
      dirty.delete(oldest);
      removed.add(oldest);
    }
  }

  function flush() {
    scheduled = false;
    const s = storage();
    if (!s) {
      dirty.clear();
      removed.clear();
      return;
    }
    try {
      for (const key of removed) s.removeItem(prefix + key);
      removed.clear();
      for (const key of dirty) {
        if (memory.has(key)) s.setItem(prefix + key, JSON.stringify(memory.get(key)));
      }
      dirty.clear();
      s.setItem(`${prefix}index`, JSON.stringify(loadOrder()));
    } catch {
      // Opslag vol of geweigerd: het geheugen blijft werken.
      dirty.clear();
      removed.clear();
    }
  }

  return {
    get<T>(key: string): T | undefined {
      if (memory.has(key)) return memory.get(key) as T;
      try {
        const raw = storage()?.getItem(prefix + key);
        if (raw === null || raw === undefined) return undefined;
        const value = JSON.parse(raw) as T;
        memory.set(key, value);
        return value;
      } catch {
        return undefined;
      }
    },
    set(key: string, value: unknown): void {
      memory.set(key, value);
      dirty.add(key);
      removed.delete(key);
      touch(key);
      if (!scheduled) {
        scheduled = true;
        schedule(flush);
      }
    },
    // Meteen wegschrijven (de pagina gaat weg of naar de achtergrond).
    flush,
  };
}

export type PageMemory = ReturnType<typeof createPageMemory>;

// De sleutel van een geschiedenisstap: de key van de locatie en het pad (de
// eerste stap na een verse start heeft altijd de key "default").
export function stepKey(location: { key: string; pathname: string }): string {
  return `${location.key}|${location.pathname}`;
}

export function pageStateKey(location: { key: string; pathname: string }, name: string): string {
  return `state|${stepKey(location)}|${name}`;
}

export function scrollKey(location: { key: string; pathname: string }): string {
  return `scroll|${stepKey(location)}`;
}

function sessionStorageOrNull(): StorageLike | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

// Het gedeelde geheugen van de app.
export const pageMemory = createPageMemory(sessionStorageOrNull);

if (typeof window !== 'undefined') {
  const flush = () => pageMemory.flush();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
