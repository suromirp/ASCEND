// Alleen de laatste lezing telt (backlog I-38): twee keer loadState kort na elkaar kan in
// omgekeerde volgorde klaar zijn, en dan zou de oudere lezing de nieuwere overschrijven.
// Elke lezing krijgt een volgnummer; alleen de laatst gestarte zet zijn uitkomst neer.

export interface LatestGate {
  start(): number;
  isLatest(ticket: number): boolean;
}

export function createLatestGate(): LatestGate {
  let last = 0;
  return {
    start: () => ++last,
    isLatest: (ticket) => ticket === last,
  };
}
