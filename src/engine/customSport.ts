// ASCEND: een eigen sport (docs/visie/Sporten die meetellen.md, stap 9). Komt er een activiteit binnen van een
// soort die ASCEND niet kent (tennis, roeien, klimmen), dan vraagt Vandaag: "Je deed iets nieuws. Hoe telt
// dit?", met de vraag waar je het vooral merkt. Dat antwoord vult de vijf kenmerken in, zodat de sport meetelt
// voor je benen zoals zwemmen of padel, zonder code per sport. De weekcheck leest alleen de sporten die als
// gegevensrij bestaan (data/sports.ts); een eigen sport telt mee in je benen en je week. Puur.

import type { ExternalActivity } from './activityImport';
import type { SportTraits } from '../data/sports';
import type { SessionTemplate } from '../models/training';
import { stressProfileOf } from './sportStress';
import { resolveSportCounting } from './sportRole';

export type CustomFeel = 'legs' | 'arms' | 'whole';

export interface CustomSport {
  // custom_<type>, uit de naam van het type bij de bron.
  id: string;
  label: string;
  // Het type zoals de bron het noemt (bijvoorbeeld "Tennis").
  type: string;
  feel: CustomFeel;
  role: 'count' | 'off';
}

export const FEEL_LABEL: Record<CustomFeel, string> = {
  legs: 'Vooral in mijn benen',
  arms: 'In mijn armen en schouders',
  whole: 'In mijn hele lijf',
};
export const FEEL_ADVICE: CustomFeel = 'whole';

// AFGELEID, niet getoetst: het antwoord als kenmerken (impact, remmen, stop en start, bovenlichaam, techniek).
// Benen: een balsport of iets met springen; armen en schouders: roeien, peddelen, klimmen; hele lijf: ertussen.
const FEEL_TRAITS: Record<CustomFeel, SportTraits> = {
  legs: { impact: 2, eccentric: 1, stopStart: 2, upperBody: 0, technique: 1 },
  arms: { impact: 0, eccentric: 0, stopStart: 0, upperBody: 3, technique: 2 },
  whole: { impact: 1, eccentric: 1, stopStart: 1, upperBody: 2, technique: 2 },
};

export function customIdOf(type: string): string {
  return `custom_${type.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

// "VirtualRowing" of "Rock_Climbing" als woord: hoofdletters los, lage streepjes weg.
export function customLabelOf(type: string): string {
  const words = type.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const MAX_CUSTOM = 20;

export function parseCustomSports(raw: unknown): { value: CustomSport[] | undefined; skipped: number } {
  if (raw === undefined) return { value: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { value: undefined, skipped: 1 };
  const out: CustomSport[] = [];
  let skipped = 0;
  for (const r of raw) {
    const e = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
    const type = typeof e.type === 'string' && e.type.trim().length > 0 && e.type.length <= 60 ? e.type.trim() : undefined;
    const feel = (['legs', 'arms', 'whole'] as const).find((f) => f === e.feel);
    const role = e.role === 'count' || e.role === 'off' ? e.role : undefined;
    if (!type || !feel || !role || out.some((c) => c.type === type) || out.length >= MAX_CUSTOM) { skipped++; continue; }
    const label = typeof e.label === 'string' && e.label.trim().length > 0 && e.label.length <= 40 ? e.label.trim() : customLabelOf(type);
    out.push({ id: customIdOf(type), label, type, feel, role });
  }
  return { value: out.length > 0 ? out : undefined, skipped };
}

export function customTemplate(sport: CustomSport): SessionTemplate {
  return {
    id: `sport_${sport.id}`,
    name: sport.label,
    type: 'cardio',
    roles: ['counted_sport'],
    customSport: sport.id,
    durationVariants: { full: 60 },
    baseStressProfile: stressProfileOf({ traits: FEEL_TRAITS[sport.feel], typicalIntensity: 'moderate' }),
  };
}

// De eigen sporten die meetellen. Staat "Vragen bij een nieuwe sport" uit, dan telt een nieuw type meteen
// mee, met het hele lijf als aanname.
export function countingCustomTemplates(settings: { customSports?: unknown; sportCounting?: unknown }): SessionTemplate[] {
  return (parseCustomSports(settings.customSports).value ?? []).filter((c) => c.role === 'count').map(customTemplate);
}

export interface CustomQuestion {
  type: string;
  label: string;
  activity: ExternalActivity;
}

// De nieuwe soorten die op een antwoord wachten, de nieuwste eerst. Met "Vragen bij een nieuwe sport" uit niets.
export function pendingCustomSports(activities: readonly ExternalActivity[], settings: { customSports?: unknown; sportCounting?: unknown }, today: string): CustomQuestion[] {
  if (!resolveSportCounting(settings.sportCounting).askNew) return [];
  const known = new Set((parseCustomSports(settings.customSports).value ?? []).map((c) => c.type));
  const out = new Map<string, CustomQuestion>();
  for (const a of [...activities].sort((x, y) => y.start.localeCompare(x.start))) {
    if (!a.otherType || a.countedSport || known.has(a.otherType) || a.start.slice(0, 10) > today || out.has(a.otherType)) continue;
    out.set(a.otherType, { type: a.otherType, label: customLabelOf(a.otherType), activity: a });
  }
  return [...out.values()];
}

// Met de vraag uit: een nieuw type telt meteen mee, met het advies voor de kenmerken.
export function autoCustomSports(activities: readonly ExternalActivity[], settings: { customSports?: unknown; sportCounting?: unknown }): CustomSport[] {
  if (resolveSportCounting(settings.sportCounting).askNew) return [];
  const known = new Set((parseCustomSports(settings.customSports).value ?? []).map((c) => c.type));
  const out: CustomSport[] = [];
  for (const a of activities) {
    if (!a.otherType || a.countedSport || known.has(a.otherType) || out.some((c) => c.type === a.otherType)) continue;
    out.push({ id: customIdOf(a.otherType), label: customLabelOf(a.otherType), type: a.otherType, feel: FEEL_ADVICE, role: 'count' });
  }
  return out;
}

export function customQuestionLine(q: CustomQuestion): string {
  return `Je deed iets nieuws: ${q.label.toLowerCase()}. Hoe telt dit?`;
}
