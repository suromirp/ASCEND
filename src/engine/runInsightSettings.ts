// ASCEND: wat je zelf instelt bij "Loopinzicht" (Meer, Overzichten en vragen).
//
// Besluit: docs/beslissingen/2026-10-22-loopinzicht.md. Elke waarde is
// optioneel; ontbreekt hij, dan geldt het advies. Zo merkt niemand iets tot hij
// het zelf verandert, en importeren oude back-ups zonder migratiestap. De
// schakelaar die bepaalt of ASCEND de reeksen van een training ophaalt staat
// niet hier maar bij de andere horlogeschakelaars (engine/watchUse.ts, `details`).

export type InsightTopicSwitch = 'efficiency' | 'longDays' | 'climbing' | 'form';

// De grootheden van de kaart Loopvorm op "Run in detail" (engine/runDetailView.ts#FormKey).
export type RunFormSwitch = 'cadence' | 'stanceTimeMs' | 'stepLengthM' | 'oscillationMm' | 'stanceBalanceLeftPct';

// Wat het scherm "Run in detail" laat zien (docs/visie/Run in detail.md, hoofdstuk 9).
// Ontbrekend = het advies: alles aan, de balans uit.
export interface RunDetailScreenSettings {
  show?: boolean;
  patterns?: boolean;
  advice?: boolean;
  form?: Partial<Record<RunFormSwitch, boolean>>;
}

export interface ResolvedRunDetailScreen {
  show: boolean;
  patterns: boolean;
  advice: boolean;
  form: Record<RunFormSwitch, boolean>;
}

export const FORM_SWITCHES: RunFormSwitch[] = ['cadence', 'stanceTimeMs', 'stepLengthM', 'oscillationMm', 'stanceBalanceLeftPct'];

// De balans staat uit: na één run zegt hij niets (docs/beslissingen/2026-10-22-loopinzicht.md).
export const DEFAULT_RUN_DETAIL_SCREEN: ResolvedRunDetailScreen = {
  show: true,
  patterns: true,
  advice: true,
  form: { cadence: true, stanceTimeMs: true, stepLengthM: true, oscillationMm: true, stanceBalanceLeftPct: false },
};

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
  // Het scherm "Run in detail". Los van `enabled`: het scherm staat ook als het
  // inzicht na een training uit staat.
  detail?: RunDetailScreenSettings;
}

export interface ResolvedRunInsight {
  enabled: boolean;
  topics: Record<InsightTopicSwitch, boolean>;
  weather: boolean;
  chestStrap: boolean;
  detail: ResolvedRunDetailScreen;
}

export const TOPIC_SWITCHES: InsightTopicSwitch[] = ['efficiency', 'longDays', 'climbing', 'form'];

export const DEFAULT_RUN_INSIGHT: ResolvedRunInsight = {
  enabled: true,
  topics: { efficiency: true, longDays: true, climbing: true, form: true },
  weather: true,
  chestStrap: true,
  detail: DEFAULT_RUN_DETAIL_SCREEN,
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
    detail: resolveRunDetailScreen(r.detail),
  };
}

export function resolveRunDetailScreen(raw: unknown): ResolvedRunDetailScreen {
  const d = isRecord(raw) ? raw : {};
  const formRaw = isRecord(d.form) ? d.form : {};
  const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  const D = DEFAULT_RUN_DETAIL_SCREEN;
  return {
    show: flag(d.show, D.show),
    patterns: flag(d.patterns, D.patterns),
    advice: flag(d.advice, D.advice),
    form: Object.fromEntries(FORM_SWITCHES.map((k) => [k, flag(formRaw[k], D.form[k])])) as Record<RunFormSwitch, boolean>,
  };
}

const FORM_NAMES: Record<RunFormSwitch, string> = { cadence: 'cadans', stanceTimeMs: 'grondcontact', stepLengthM: 'staplengte', oscillationMm: 'op en neer', stanceBalanceLeftPct: 'balans' };

// "cadans en nog 3", "niets", "grondcontact": what the card Loopvorm shows, in a few words.
export function formSwitchesLine(form: Record<RunFormSwitch, boolean>): string {
  const on = FORM_SWITCHES.filter((k) => form[k]);
  if (on.length === 0) return 'niets';
  return on.length === 1 ? FORM_NAMES[on[0]] : `${FORM_NAMES[on[0]]} en nog ${on.length - 1}`;
}

function cleanDetail(raw: unknown): { value: RunDetailScreenSettings | undefined; dropped: number } {
  if (!isRecord(raw)) return { value: undefined, dropped: 1 };
  const out: RunDetailScreenSettings = {};
  let dropped = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'show' || k === 'patterns' || k === 'advice') {
      if (typeof v === 'boolean') out[k] = v;
      else dropped++;
    } else if (k === 'form' && isRecord(v)) {
      const form: Partial<Record<RunFormSwitch, boolean>> = {};
      for (const [fk, fv] of Object.entries(v)) {
        if ((FORM_SWITCHES as string[]).includes(fk) && typeof fv === 'boolean') form[fk as RunFormSwitch] = fv;
        else dropped++;
      }
      if (Object.keys(form).length > 0) out.form = form;
    } else dropped++;
  }
  return { value: Object.keys(out).length > 0 ? out : undefined, dropped };
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
  if ('detail' in raw) {
    const d = cleanDetail(raw.detail);
    if (d.value) out.detail = d.value;
    dropped += d.dropped;
  }
  for (const key of Object.keys(raw)) if (!['enabled', 'weather', 'chestStrap', 'topics', 'detail'].includes(key)) dropped++;
  return { value: Object.keys(out).length > 0 ? out : undefined, dropped };
}
