import { describe, expect, it } from 'vitest';
import todaySrc from './Today.tsx?raw';

// Regel 5 van de ontwerpregels: hoogstens één gevulde mint knop (PrimaryButton) op Vandaag, de hoofdknop van de
// missie (besluit 2026-11-12-missiekaart.md). Deze scan leest welke onderdelen Vandaag zelf tekent en eist voor elk
// onderdeel met een PrimaryButton een reden: het is de missie, de knop staat alleen in een blad (een eigen laag met
// een eigen knop), of Vandaag maakt hem stil. Een nieuwe kaart met een gevulde knop faalt hier tot hij een plek kiest.
// Grens: de scan leest per onderdeel alleen de functie met zijn eigen naam (`export function X`). Een PrimaryButton in
// een kindcomponent zonder eigen function-kop, of in een ander bestand dat het onderdeel gebruikt, ziet hij niet.
// Tijdens het draaien telt de tekstkaart dezelfde knoppen op elk scherm (scripts/app-kaart/kaart.mjs, "[gevulde mint
// knoppen: ...]").
const sources = import.meta.glob('../components/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// De missie zelf: precies één van deze staat op de plek van de missie. Het welkom staat in plaats van Vandaag.
const MISSION = new Set(['TodayMissionCard', 'QuietDayCard', 'DoneTodayCard', 'StartWelcome']);
// De knop staat alleen in een blad dat de kaart opent (eigen laag, één knop in die laag).
const IN_SHEET = new Set([
  'AdHocLogSheet', 'CoachCard', 'DailyStretchCard', 'ExerciseLogger', 'JourneyWeekCard', 'NotFitLink', 'ProposalSheet',
  'RescheduleDialog', 'SessionActionSheet', 'WeekReviewCard', 'WeeklyQuestionCard', 'WeightReminder',
]);
// Vandaag geeft een stille stand mee: de knop wordt omlijnd naast de missie (en een beslissing is altijd omlijnd).
const QUIETED: Record<string, RegExp> = {
  IllnessStatusCard: /<IllnessStatusCard quiet=\{missionMint\} \/>/g,
  FreshStartCard: /<FreshStartCard state=\{freshStart\} quiet=\{missionMint \|\| !!illness\} \/>/,
  WatchActivityCard: /<WatchActivityCard quiet \/>/,
  ScheduleAnomalyCard: /<ScheduleAnomalyCard quiet \/>/,
  MacroFactorCard: /<MacroFactorCard primary=\{false\} \/>/,
};

function importsOfToday(): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of todaySrc.matchAll(/import \{([^}]*)\} from '\.\.\/components\/([^']+)'/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.replace(/\btype\b/, '').trim();
      if (name) map.set(name, `../components/${m[2]}.tsx`);
    }
  }
  return map;
}

// De functie van een onderdeel in zijn bestand, tot de volgende functie op het hoogste niveau.
function bodyOf(src: string, name: string): string {
  const start = src.search(new RegExp(`\\nexport function ${name}\\b`));
  if (start < 0) return src;
  const next = src.slice(start + 1).search(/\n(export )?function [A-Z]/);
  return next < 0 ? src.slice(start) : src.slice(start, start + 1 + next);
}

describe('Vandaag: hoogstens één gevulde mint knop (regel 5)', () => {
  const imports = importsOfToday();
  const used = [...new Set([...todaySrc.matchAll(/<([A-Z][A-Za-z]+)[\s/>]/g)].map((m) => m[1]))].filter((n) => imports.has(n));

  it('leest de onderdelen van Vandaag', () => {
    expect(used).toContain('TodayMissionCard');
    expect(used.length).toBeGreaterThan(30);
  });

  it('elk onderdeel met een gevulde knop is de missie, staat in een blad, of wordt stil gemaakt', () => {
    const unexplained = used.filter((name) => {
      const src = sources[imports.get(name)!];
      if (!src || !bodyOf(src, name).includes('<PrimaryButton')) return false;
      return !MISSION.has(name) && !IN_SHEET.has(name) && !(name in QUIETED);
    });
    expect(unexplained).toEqual([]);
  });

  it('een onderdeel dat stil gemaakt wordt krijgt de stille stand ook echt mee', () => {
    for (const [name, re] of Object.entries(QUIETED)) expect(todaySrc, name).toMatch(re);
  });

  it('een kaart die stil kan, kiest dan een omlijnde knop in plaats van een gevulde', () => {
    for (const name of ['IllnessStatusCard', 'FreshStartCard', 'WatchActivityCard', 'ScheduleAnomalyCard']) {
      const src = sources[imports.get(name)!];
      expect(src, name).toMatch(/quiet\s*(\?|&&)[\s\S]{0,200}?<SecondaryButton/);
    }
  });

  it('de missiekaart heeft één knop per stand: de gevulde knoppen sluiten elkaar uit', () => {
    const card = sources['../components/TodayMissionCard.tsx'];
    // De drie PrimaryButtons staan in één keten view.button === ...; Verplaatsen en Niet fit? zijn tekstknoppen.
    expect(card).toMatch(/view\.button === 'elsewhere' \?[\s\S]*?view\.button === 'start' \?[\s\S]*?<PrimaryButton[\s\S]*?view\.button === 'briefing' \?[\s\S]*?<PrimaryButton[\s\S]*?\) : \([\s\S]*?<PrimaryButton/);
    expect(card).toContain('<TextButton tone="dim" onClick={() => setShowMove(true)}>Verplaatsen</TextButton>');
    expect(card).toContain('<NotFitLink plain />');
    expect(card).not.toContain('<NotFitLink outlined');
  });

  it('de missie staat er één keer, met de kaarten op hun plek rond de missie', () => {
    expect(todaySrc.match(/\{missionCard\}/g)).toHaveLength(1);
    expect(todaySrc).toContain('const missionMint = ');
  });
});
