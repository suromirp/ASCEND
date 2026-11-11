// ASCEND: de geluiden van de rusttimer in Forge (besluit docs/beslissingen/2026-11-11-rusttimer-geluiden.md).
// Negen keuzes in vijf groepen (Koebel viel af na luisteren, 11 november), het volume, de vooraankondiging en de klank bij een volgende oefening.
// Hier staat alleen wat er klinkt en wanneer; het maken van het geluid doet utils/sound.ts.
// Puur: geen React, geen browser.

export type RestSound =
  | 'pickaxe'
  | 'cornu'
  | 'vikinghorn'
  | 'drum'
  | 'bianzhong'
  | 'hyoshigi'
  | 'templebell'
  | 'clearbell'
  | 'lyre';

export type RestVolume = 'soft' | 'normal' | 'clear';

export const REST_SOUNDS: readonly RestSound[] = ['pickaxe', 'cornu', 'vikinghorn', 'drum', 'bianzhong', 'hyoshigi', 'templebell', 'clearbell', 'lyre'];
export const REST_VOLUMES: readonly RestVolume[] = ['soft', 'normal', 'clear'];

export const DEFAULT_REST_SOUND: RestSound = 'clearbell';
export const DEFAULT_REST_VOLUME: RestVolume = 'normal';

// De kopjes in het blad Geluid na de rust, in deze volgorde.
export const REST_SOUND_GROUPS: readonly { title: string; sounds: readonly RestSound[] }[] = [
  { title: 'Bergen', sounds: ['pickaxe'] },
  { title: 'Rome', sounds: ['cornu'] },
  { title: 'Noorden', sounds: ['vikinghorn', 'drum'] },
  { title: 'Oosten', sounds: ['bianzhong', 'hyoshigi', 'templebell'] },
  { title: 'Overig', sounds: ['clearbell', 'lyre'] },
];

// Een opname in public/sounds/ (bron en licentie in public/sounds/BRONNEN.md). Een geluid zonder
// opname wordt gemaakt met Web Audio. Lukt laden niet, dan klinkt de heldere bel. Meld een opname hier pas
// aan als het bestand in public/sounds/ staat (een test kijkt het na); nu zijn alle tien gemaakt.
export const REST_SOUND_FILES: Partial<Record<RestSound, string>> = {};

// Het geluid dat altijd lukt zolang er geluid kan: gemaakt, zonder bestand.
export const FALLBACK_REST_SOUND: RestSound = 'clearbell';

// De zes keuzes van voor 11 november en Koebel (eruit na luisteren) naar de dichtstbijzijnde nieuwe.
const LEGACY: Record<string, RestSound> = {
  chime: 'clearbell',
  bell: 'clearbell',
  beep: 'clearbell',
  whistle: 'clearbell',
  gong: 'templebell',
  boxing: 'clearbell',
  cowbell: 'clearbell',
};

// Leest een bewaarde waarde defensief: een nieuwe keuze blijft, een oude gaat naar de dichtstbijzijnde
// nieuwe, al het andere is undefined (dan geldt het advies).
export function readRestSound(raw: unknown): RestSound | undefined {
  if (typeof raw !== 'string') return undefined;
  if ((REST_SOUNDS as readonly string[]).includes(raw)) return raw as RestSound;
  return Object.prototype.hasOwnProperty.call(LEGACY, raw) ? LEGACY[raw] : undefined;
}

export function readRestVolume(raw: unknown): RestVolume | undefined {
  return REST_VOLUMES.find((v) => v === raw);
}

// De luidheid voor de piekgrens. De grens zelf (een limiter achteraan) is voor alle drie gelijk, zodat
// Duidelijk voller klinkt maar nooit harder piekt dan de grens.
export const REST_VOLUME_GAIN: Record<RestVolume, number> = { soft: 0.35, normal: 0.6, clear: 0.9 };

// Welke klank: de gewone (volgende set), die voor een volgende oefening, of de zachte tik vooraf.
export type RestCue = 'set' | 'exercise' | 'pre';

export function restCue(nextExercise: boolean | undefined, otherForExercise: boolean): RestCue {
  return nextExercise && otherForExercise ? 'exercise' : 'set';
}

// De vooraankondiging: 10 seconden voor het einde. Bij een rust van 15 seconden of korter niet,
// dan valt de tik vlak na het afvinken.
export const PRE_TICK_SECONDS = 10;
const PRE_TICK_MIN_REST_SECONDS = 15;

// Over hoeveel milliseconden de tik vooraf moet klinken, of null als hij niet (meer) hoort: uit, een
// korte rust, of het moment is al voorbij (de tik komt nooit na het einde of te laat).
export function preTickDelay(rest: { endsAt: number; total: number }, now: number, enabled: boolean): number | null {
  if (!enabled || rest.total <= PRE_TICK_MIN_REST_SECONDS) return null;
  const at = rest.endsAt - PRE_TICK_SECONDS * 1000;
  const delay = at - now;
  // Meer dan een seconde te laat (de app was weg): niet meer, het einde komt zo.
  if (delay < -PRE_TICK_LATE_MS) return null;
  return Math.max(0, delay);
}

const PRE_TICK_LATE_MS = 1000;

// Bij het afgaan opnieuw toetsen: een timer staat stil als de app weg is en gaat bij terugkomst alsnog
// af. Alleen tot een seconde na het moment van de tik; daarna niet meer, en dus nooit na het einde.
export function preTickStillDue(endsAt: number, now: number): boolean {
  return now <= endsAt - PRE_TICK_SECONDS * 1000 + PRE_TICK_LATE_MS;
}

// Hoe lang andere audio zachter gaat (Android, audio focus met ducking): zo lang als de klank klinkt,
// plus een korte uitloop, zodat je muziek niet terugspringt terwijl de bel nog klinkt. `length` is de
// tijd tot de herhaling bij een volgende oefening, `ring` hoe lang één keer klinkt (utils/restBell.ts).
export const DUCK_TAIL_MS = 400;
export const DUCK_PRE_MS = 600;
export const DUCK_MAX_MS = 8000;
export const REPEAT_GAP_S = 0.12;

export function restCueDuckMs(voice: { length: number; ring: number }, cue: RestCue): number {
  if (cue === 'pre') return DUCK_PRE_MS;
  const seconds = cue === 'exercise' ? voice.length + REPEAT_GAP_S + voice.ring : voice.ring;
  return Math.min(DUCK_MAX_MS, Math.round(seconds * 1000) + DUCK_TAIL_MS);
}

// Wat de bel deed: geklonken, de heldere bel in plaats van een opname, of niets omdat de telefoon nu
// geen geluid toelaat (utils/restBell.ts).
export type RestBellOutcome = 'played' | 'fallback' | 'blocked';

// Nooit stilte zonder melding: koos je alleen geluid en laat de telefoon het niet toe, dan trilt hij
// toch, met het ritme van je geluid. Met trillen aan trilde hij al.
export function vibrateInstead(channels: { sound: boolean; vibrate: boolean }, outcome: RestBellOutcome): boolean {
  return channels.sound && !channels.vibrate && outcome === 'blocked';
}

// Wat Luister in de instellingen eronder zegt als het niet klonk zoals gekozen; null als het goed ging.
export function listenNotice(outcome: RestBellOutcome): string | null {
  if (outcome === 'blocked') return 'Je telefoon laat nu geen geluid toe. Tik nog een keer op Luister.';
  if (outcome === 'fallback') return 'De opname laadde niet, je hoorde de heldere bel. Met netwerk lukt het de volgende keer.';
  return null;
}
