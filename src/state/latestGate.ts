// Alleen de laatste lezing telt (backlog I-38): twee keer loadState kort na elkaar kan in
// omgekeerde volgorde klaar zijn, en dan zou de oudere lezing de nieuwere overschrijven.
// Elke lezing krijgt een volgnummer; alleen de laatst gestarte zet haar uitkomst neer. Een
// verdrongen lezing keert pas terug als de nieuwste klaar is (of faalt), zodat een aanroeper
// die erna doorgaat (het opstarten, een refresh) altijd een neergezette uitkomst ziet.

export interface LatestRunner {
  run(work: (stillLatest: () => boolean) => Promise<void>): Promise<void>;
}

export function createLatestRunner(): LatestRunner {
  let last = 0;
  let latest: Promise<void> = Promise.resolve();
  return {
    run(work) {
      const ticket = ++last;
      const stillLatest = () => ticket === last;
      const done = (async () => {
        await work(stillLatest);
        if (!stillLatest()) await latest;
      })();
      latest = done;
      return done;
    },
  };
}
