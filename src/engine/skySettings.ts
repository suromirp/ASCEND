// ASCEND: de instelling "Lucht bovenaan" (docs/beslissingen/2026-10-24-nachtlucht.md).
// De lichte lucht bovenaan een tab is 's avonds en 's nachts een fel vlak; deze
// instelling kiest tussen de lichte en de donkere lucht, op tijd of vast.
// Optioneel en zonder migratie: ontbreekt een sleutel of staat er iets geks, dan
// geldt het advies (op tijd, donker vanaf 20:00, weer licht om 07:00).

export type SkySetting = 'auto' | 'day' | 'night';
export type SkyMode = 'day' | 'night';

export const SKY_SETTINGS: SkySetting[] = ['auto', 'day', 'night'];
export const DEFAULT_SKY: SkySetting = 'auto';

export const SKY_NIGHT_FROM_CHOICES = ['19:00', '20:00', '21:00', '22:00'] as const;
export type SkyNightFrom = (typeof SKY_NIGHT_FROM_CHOICES)[number];
export const DEFAULT_SKY_NIGHT_FROM: SkyNightFrom = '20:00';
// Vanaf dit uur is het weer licht.
export const SKY_DAY_FROM_MINUTES = 7 * 60;

export interface SkyConfig {
  sky: SkySetting;
  nightFrom: SkyNightFrom;
}

export function resolveSky(raw: { sky?: unknown; skyNightFrom?: unknown } | undefined): SkyConfig {
  return {
    sky: SKY_SETTINGS.find((s) => s === raw?.sky) ?? DEFAULT_SKY,
    nightFrom: SKY_NIGHT_FROM_CHOICES.find((s) => s === raw?.skyNightFrom) ?? DEFAULT_SKY_NIGHT_FROM,
  };
}

function minutesOf(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
}

// Welke lucht hoort er op dit moment bij? Puur: de klok komt van `date`.
export function skyModeAt(raw: { sky?: unknown; skyNightFrom?: unknown } | undefined, date: Date): SkyMode {
  const { sky, nightFrom } = resolveSky(raw);
  if (sky === 'day') return 'day';
  if (sky === 'night') return 'night';
  const now = date.getHours() * 60 + date.getMinutes();
  return now >= minutesOf(nightFrom) || now < SKY_DAY_FROM_MINUTES ? 'night' : 'day';
}
