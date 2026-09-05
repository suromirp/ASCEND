import type { DataSourceAdapter } from './types';

// The manual adapter represents data the user typed in themselves. It is
// always "connected". Its fetch methods are intentionally omitted — manual
// entries are written straight to storage by the UI (ExerciseLogger etc.)
// rather than pulled from a remote API.
export const manualAdapter: DataSourceAdapter = {
  id: 'manual',
  label: 'Handmatig',
  isConnected: () => true,
};
