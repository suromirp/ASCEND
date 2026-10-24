// ASCEND: de vormen van het figuur op Lichaam ("lijn met spieren", ontwerp B uit
// docs/beslissingen/2026-10-24-lichaam-als-figuur.md). Alleen tekenpaden op een vlak van
// 200 bij 440, geen kleur. De linkerhelft wordt gespiegeld voor de rechterhelft.
// Man en vrouw verschillen ingetogen: smallere schouders, een smallere taille en
// bredere heupen bij de vrouw, en een zachtere borstlijn. Voor en achter hebben
// hetzelfde silhouet; de spierlijnen verschillen.

export const FIGURE_WIDTH = 200;
export const FIGURE_HEIGHT = 440;

// Het hoofd.
export const HEAD = { cx: 100, cy: 29, rx: 15, ry: 18.5 };

// De linkerhelft van het silhouet, van de hals tot de kruis; open aan de middenlijn.
const HALF_MAN =
  'M93,47 C93,53 92,58 90,61 C84,64 74,66 68,69 C60,72 55,78 54,88 C53,100 50,118 48,138 C47,146 46,150 45,156 C43,172 41,188 40,204 C38,212 35,220 36,228 C37,236 42,240 46,236 C49,232 50,222 51,212 C52,196 55,178 57,160 C58,152 59,146 60,138 C62,124 63,112 66,104 C67,116 67,128 69,140 C71,152 73,162 72,172 C71,184 67,196 66,208 C65,226 66,248 70,272 C72,286 74,296 74,304 C73,318 70,330 71,344 C72,362 76,380 79,396 C79,402 74,406 73,410 C73,414 82,416 92,415 C96,414 96,408 95,402 C94,396 93,388 93,380 C93,364 95,348 95,334 C95,322 95,312 96,304 C97,290 98,272 98,256 C98,244 99,234 100,228';

const HALF_WOMAN =
  'M93,47 C93,53 92,58 90,61 C84,64 76,66 71,69 C63,72 57,78 56,88 C55,100 51,118 48,138 C47,146 46,150 45,156 C43,172 41,188 40,204 C38,212 35,220 36,228 C37,236 42,240 46,236 C49,232 50,222 51,212 C52,196 55,178 57,160 C58,152 59,146 60,138 C62,124 63,112 66,104 C67,116 68,128 71,140 C73,152 75,162 74,172 C72,184 66,196 63,208 C62,226 64,248 69,272 C72,286 74,296 74,304 C73,318 70,330 71,344 C72,362 76,380 79,396 C79,402 74,406 73,410 C73,414 82,416 92,415 C96,414 96,408 95,402 C94,396 93,388 93,380 C93,364 95,348 95,334 C95,322 95,312 96,304 C97,290 98,272 98,256 C98,244 99,234 100,228';

export const SILHOUETTE = { man: HALF_MAN, vrouw: HALF_WOMAN } as const;

// De dunne spierlijnen per helft; gespiegeld voor de andere helft.
const FRONT_HALF = [
  'M92,66 C84,68 76,69 70,71',
  'M66,75 C62,86 61,96 63,104',
  'M56,110 C54,122 54,132 56,142',
  'M51,166 C48,180 47,192 47,202',
  'M88,110 C86,132 86,160 90,186',
  'M89,126 L100,126',
  'M88,142 L100,142',
  'M88,158 L100,158',
  'M75,172 C82,186 90,200 98,214',
  'M74,226 C79,250 83,274 85,292',
  'M97,262 C93,276 91,288 89,296',
  'M80,318 C82,340 84,362 86,386',
  'M93,326 C90,338 89,350 90,362',
];
// De borstlijn en de knieschijf: apart, want de borstlijn verschilt per figuur.
const CHEST_HALF = { man: 'M70,84 C76,98 88,104 100,104', vrouw: 'M72,92 C78,103 90,109 100,107' } as const;
const KNEE_CAP = { cx: 85, cy: 305, rx: 6, ry: 7 };
const FRONT_CENTER = ['M100,106 L100,188'];
const FRONT_NAVEL = { cx: 100, cy: 170, r: 1.4 };

const BACK_HALF = [
  'M70,70 C82,80 92,96 100,124',
  'M80,84 C74,94 76,108 86,114 C92,108 93,96 90,86',
  'M56,96 C54,112 55,128 58,140',
  'M68,112 C74,140 84,160 96,176',
  'M68,200 C70,222 84,238 100,234',
  'M84,246 L85,296',
  'M78,304 C84,309 90,309 95,304',
  'M76,316 C73,332 78,348 85,358',
  'M94,318 C96,332 92,348 86,358',
  'M86,364 L87,394',
];
const BACK_CENTER = ['M100,58 L100,196', 'M100,200 L100,228'];

export interface FigureLines {
  half: string[];
  center: string[];
  chest?: string;
  kneeCap?: { cx: number; cy: number; rx: number; ry: number };
  navel?: { cx: number; cy: number; r: number };
}

export function figureLines(view: 'front' | 'back', figure: 'man' | 'vrouw'): FigureLines {
  if (view === 'back') return { half: BACK_HALF, center: BACK_CENTER };
  return { half: FRONT_HALF, center: FRONT_CENTER, chest: CHEST_HALF[figure], kneeCap: KNEE_CAP, navel: FRONT_NAVEL };
}
