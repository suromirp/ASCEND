// Een nabootsing van een Capacitor-plugin voor tests. Echte plugins (registerPlugin) zijn een Proxy
// die voor elke eigenschap een methode geeft, ook voor `then`. Een belofte die met zo'n plugin
// vervuld wordt, roept `plugin.then(resolve, reject)` aan; native kent die methode niet en roept
// resolve en reject nooit aan, dus de belofte blijft hangen. Deze nabootsing doet precies dat.

export function fakeCapacitorPlugin(methods: Record<string, (...args: unknown[]) => unknown> = {}): Record<string, (...args: unknown[]) => Promise<unknown>> {
  return new Proxy({} as Record<string, (...args: unknown[]) => Promise<unknown>>, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      // `then`: een belofte die resolve en reject van de aanroeper nooit aanroept.
      if (prop === 'then') return () => new Promise<never>(() => undefined);
      const method = methods[prop];
      return (...args: unknown[]) => Promise.resolve(method ? method(...args) : {});
    },
  });
}

// Wacht op de uitkomst of geeft 'hangt' na ms milliseconden.
export function settlesWithin<T>(promise: Promise<T>, ms = 100): Promise<T | 'hangt'> {
  return Promise.race([promise, new Promise<'hangt'>((resolve) => setTimeout(() => resolve('hangt'), ms))]);
}
