// ASCEND: wat je zelf instelt bij "Loopinzicht" (Meer, Overzichten en vragen).
//
// Besluit: docs/beslissingen/2026-10-22-loopinzicht.md. Elke waarde is
// optioneel; ontbreekt hij, dan geldt het advies. Zo merkt niemand iets tot hij
// het zelf verandert, en importeren oude back-ups zonder migratiestap. De
// schakelaar die bepaalt of ASCEND de reeksen van een training ophaalt staat
// niet hier maar bij de andere horlogeschakelaars (engine/watchUse.ts, `details`).

export type InsightTopicSwitch = 'efficiency' | 'longDays' | 'climbing' | 'form';

export interface RunInsightSettings {
  // Na een loop of tocht hoogstens twee regels over wat beter ging en waar je
  // op moet letten.
  enabled?: boolean;
  // Welke onderwerpen meedoen. Ontbrekend = aan.
  topics?: Partial<Record<InsightTopicSwitch, boolean>>;
  // Het weer van die dag erbij zoeken, om eerlijk te vergelijken.
  weather?: boolean;
  // Mijn hartslag komt van de borstband. Zonder borstband vergelijkt ASCEND geen
  // loopjes waarbij de hartslagbron gewisseld kan zijn.
  chestStrap?: boolean;
}

export interface ResolvedRunInsight {
  enabled: boolean;
  topics: Record<InsightTopicSwitch, boolean>;
  weather: boolean;
  chestStrap: boolean;
}

export const TOPIC_SWITCHES: InsightTopicSwitch[] = ['efficiency', 'longDays', 'climbing', 'form'];

export const DEFAULT_RUN_INSIGHT: ResolvedRunInsight = {
  enabled: true,
  topics: { efficiency: true, longDays: true, climbing: true, form: true },
  weather: true,
  chestStrap: true,
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Leest defensief: een back-up kan van een oudere of beschadigde versie zijn.
export function resolveRunInsight(raw: RunInsightSettings | undefined | null): ResolvedRunInsight {
  const r = isRecord(raw) ? raw : {};
  const topicsRaw = isRecord(r.topics) ? r.topics : {};
  const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    enabled: flag(r.enabled, DEFAULT_RUN_INSIGHT.enabled),
    topics: {
      efficiency: flag(topicsRaw.efficiency, true),
      longDays: flag(topicsRaw.longDays, true),
      climbing: flag(topicsRaw.climbing, true),
      form: flag(topicsRaw.form, true),
    },
    weather: flag(r.weather, DEFAULT_RUN_INSIGHT.weather),
    chestStrap: flag(r.chestStrap, DEFAULT_RUN_INSIGHT.chestStrap),
  };
}

// Alleen geldige sleutels blijven staan; de rest valt weg. `dropped` telt wat
// er verloren ging, zodat de import het kan melden.
export function cleanRunInsight(raw: unknown): { value: RunInsightSettings | undefined; dropped: number } {
  if (!isRecord(raw)) return { value: undefined, dropped: 1 };
  const out: RunInsightSettings = {};
  let dropped = 0;
  for (const key of ['enabled', 'weather', 'chestStrap'] as const) {
    if (!(key in raw)) continue;
    if (typeof raw[key] === 'boolean') out[key] = raw[key] as boolean;
    else dropped++;
  }
  if ('topics' in raw) {
    if (isRecord(raw.topics)) {
      const topics: Partial<Record<InsightTopicSwitch, boolean>> = {};
      for (const [k, v] of Object.entries(raw.topics)) {
        if ((TOPIC_SWITCHES as string[]).includes(k) && typeof v === 'boolean') topics[k as InsightTopicSwitch] = v;
        else dropped++;
      }
      if (Object.keys(topics).length > 0) out.topics = topics;
    } else dropped++;
  }
  for (const key of Object.keys(raw)) if (!['enabled', 'weather', 'chestStrap', 'topics'].includes(key)) dropped++;
  return { value: Object.keys(out).length > 0 ? out : undefined, dropped };
}
