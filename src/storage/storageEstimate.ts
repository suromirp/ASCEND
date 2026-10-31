// ASCEND: vraagt de browser hoeveel ruimte de app gebruikt (navigator.storage.estimate), met een
// tijdsgrens: geeft de browser geen antwoord, dan staat er na een paar seconden een nette tekst
// (engine/storageUse.ts). Kan de browser het niet, dan zegt de rij dat ook.

import { STORAGE_ESTIMATE_MS, type StorageEstimate } from '../engine/storageUse';

type Estimator = () => Promise<{ usage?: number; quota?: number }>;

function browserEstimator(): Estimator | undefined {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  return storage?.estimate ? () => storage.estimate() : undefined;
}

export function estimateStorage(ms: number = STORAGE_ESTIMATE_MS, estimate: Estimator | undefined = browserEstimator()): Promise<StorageEstimate> {
  if (!estimate) return Promise.resolve({ kind: 'unavailable' });
  return new Promise<StorageEstimate>((resolve) => {
    const timer = setTimeout(() => resolve({ kind: 'timeout' }), ms);
    const done = (value: StorageEstimate) => {
      clearTimeout(timer);
      resolve(value);
    };
    estimate().then(
      (e) => done(typeof e?.usage === 'number' && Number.isFinite(e.usage) ? { kind: 'measured', usage: e.usage, quota: typeof e.quota === 'number' && Number.isFinite(e.quota) ? e.quota : undefined } : { kind: 'unavailable' }),
      () => done({ kind: 'unavailable' }),
    );
  });
}
