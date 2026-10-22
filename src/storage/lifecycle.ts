// ASCEND: de opslag laat los als de app weggelegd wordt.
//
// Een ASCEND die Chrome bevriest terwijl er nog een transactie in IndexedDB
// openstaat, houdt die opslag vast: elke andere ASCEND (een tweede tabblad, de
// geïnstalleerde app) wacht dan zonder einde, al bij de eerste leesactie van
// het openen. Chrome lost dat bij een bevroren pagina niet zelf op
// (docs/beslissingen/2026-10-22-opslag-vrij-bij-wegleggen.md). Daarom:
//
// - Verborgen (visibilitychange naar hidden) of bevroren: geen nieuwe
//   transacties. Wie de opslag nodig heeft (getDB) wacht tot de app weer in
//   beeld is; wat al loopt, rondt in die paar milliseconden gewoon af.
// - Bij freeze: elke transactie die dan nog openstaat wordt
//   afgebroken (alles of niets, dus niets half), zodat de opslag vrijkomt
//   zonder op deze bevroren pagina te wachten.
//
// De keuze zelf (wanneer is de opslag dicht) is puur en getest; de rest is de
// dunne laag om document en IDBDatabase heen.

export type PageLife = 'visible' | 'hidden' | 'frozen';

export function storageOpenFor(life: PageLife): boolean {
  return life === 'visible';
}

let life: PageLife = 'visible';
let waiters: (() => void)[] = [];
const openTransactions = new Set<IDBTransaction>();
let installed = false;

// Exported for the tests; the page itself drives it from its events.
export function setPageLife(next: PageLife): void {
  life = next;
  if (storageOpenFor(life)) {
    const ready = waiters;
    waiters = [];
    ready.forEach((fn) => fn());
  }
}

// Resolves at once while the app is in view; otherwise when it is back.
export function whenStorageOpen(): Promise<void> {
  if (storageOpenFor(life)) return Promise.resolve();
  return new Promise((resolve) => waiters.push(resolve));
}

// Every transaction still open when the page freezes is broken off. It is
// rolled back as a whole (IndexedDB transactions are all or nothing), so the
// data stays as it was before it; the step that started it fails when the page
// comes back and runs again on a later opening. commit() would keep the writes,
// but Chrome only accepts it while the transaction is active, which it never is
// between two events (tried in Chromium: the lock stayed).
export function releaseOpenTransactions(): number {
  let n = 0;
  for (const tx of openTransactions) {
    try {
      tx.abort();
      n++;
    } catch {
      // Already finished.
    }
  }
  openTransactions.clear();
  return n;
}

export function openTransactionCount(): number {
  return openTransactions.size;
}

// Once per page, from main.tsx. No-op outside a browser (tests).
export function installStorageLifecycle(): void {
  if (installed || typeof document === 'undefined' || typeof IDBDatabase === 'undefined') return;
  installed = true;

  const native = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (this: IDBDatabase, ...args: Parameters<IDBDatabase['transaction']>) {
    const tx = native.apply(this, args);
    openTransactions.add(tx);
    const done = () => openTransactions.delete(tx);
    tx.addEventListener('complete', done);
    tx.addEventListener('abort', done);
    return tx;
  } as IDBDatabase['transaction'];

  if (document.visibilityState === 'hidden') life = 'hidden';
  document.addEventListener('visibilitychange', () => setPageLife(document.visibilityState === 'hidden' ? 'hidden' : 'visible'));
  document.addEventListener('freeze', () => {
    setPageLife('frozen');
    releaseOpenTransactions();
  });
  document.addEventListener('resume', () => setPageLife(document.visibilityState === 'hidden' ? 'hidden' : 'visible'));
}
