// ASCEND: leest wat de bronbewaking nodig heeft (engine/sourceWatch.ts) uit de opslag: de
// koppeling, het laatste ophalen, de dagen van wat er binnenkwam, en welke stilte je al met
// "Begrepen" wegtikte. Die keuze is een herinnering op dit toestel, geen gegeven: ze gaat niet
// mee in de back-up.

import { MetaRepo, RecoveryMetricsRepo } from './database';
import { getConnection, getWatchState } from './externalActivities';
import { INTERVALS_ADAPTER_ID } from '../integrations/intervalsIcu';
import { silenceKey, sourceSilence, type SourceSilence, type SourceWatchInput } from '../engine/sourceWatch';
import { fromIntervals } from '../engine/logSource';
import type { AppSettings } from './database';
import type { SessionLog } from '../models/training';

const SEEN_KEY = 'sourceSilenceSeen';

// Wat de bronbewaking en de stand van de Briefing nodig hebben (engine/sourceWatch.ts,
// engine/briefing.ts): de koppeling, Vanzelf afvinken en de dagen van wat er binnenkwam. Gooit als de
// opslag niet leest; de aanroeper kiest dan de veilige kant.
export async function readWatchLink(logs: readonly SessionLog[], today: string): Promise<{ link: { linked: boolean; autoTick: boolean; activities: boolean }; source: SourceWatchInput }> {
  const [connection, state, metrics] = await Promise.all([getConnection(), getWatchState(), RecoveryMetricsRepo.getAll()]);
  const activityDays = [
    ...state.activities.map((a) => a.start.slice(0, 10)),
    ...state.history.map((a) => a.start.slice(0, 10)),
    ...logs.filter(fromIntervals).map((l) => l.completedDate.slice(0, 10)),
  ];
  const morningDays = metrics.filter((m) => m.id.startsWith(`${INTERVALS_ADAPTER_ID}:`)).map((m) => m.date);
  return {
    link: { linked: !!connection, autoTick: state.autoTick, activities: state.use.activities },
    source: {
      today,
      linked: !!connection,
      fetchedAt: state.fetchedAt,
      activitiesOn: state.use.activities,
      morningsOn: state.use.sleep || state.use.restingHeartRate || state.use.hrv,
      activityDays,
      morningDays,
      logs,
    },
  };
}

// De stilte van nu, of undefined. Nooit een fout: bij twijfel zegt de regel niets.
export async function readSourceSilence(logs: readonly SessionLog[], settings: Pick<AppSettings, 'watchSilence'>, today: string): Promise<SourceSilence | undefined> {
  if (settings.watchSilence === false) return undefined;
  try {
    const [{ source }, seen] = await Promise.all([readWatchLink(logs, today), MetaRepo.get<string>(SEEN_KEY)]);
    const silence = sourceSilence(source);
    return silence && silenceKey(silence) !== seen ? silence : undefined;
  } catch {
    return undefined;
  }
}

export async function dismissSourceSilence(silence: SourceSilence): Promise<void> {
  await MetaRepo.set(SEEN_KEY, silenceKey(silence));
}
