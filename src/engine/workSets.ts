// ASCEND: which sets count. A warm-up set is stored (SetLog.kind) but never
// counted as work: sets, top weights and volume read the working sets only. A
// set without `kind` is a working set, so a log from before the field reads as
// it always did. Pure.

import type { SetLog } from '../models/training';

export const isWorkSet = (set: SetLog): boolean => set.kind !== 'warmup';
