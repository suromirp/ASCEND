// ASCEND — the visual side of each training (production feedback: the
// guide was a long block of text; "een mooie visuele view, maar wel
// dezelfde inzichten"). Same content as data/trainingGuide.ts, as a
// structure: a one-line summary, the steps with their intensity, what the
// session builds. engine/workoutPlan.ts turns this into the steps for a
// given week (duration, number of repeats) and into Garmin workout steps.
// Keyed by SessionTemplate.id, like the guide.

export type Intensity = 1 | 2 | 3 | 4;

// "Intensiteit in jouw taal": how it feels, the RPE and the Garmin heart
// rate zone it roughly matches (Garmin's default 5 zones).
export const INTENSITY: Record<Intensity, { label: string; feel: string; rpe: string; zone: string }> = {
  1: { label: 'Heel rustig', feel: 'herstel, ontspannen', rpe: 'RPE 1-2', zone: 'zone 1' },
  2: { label: 'Rustig', feel: 'volledige zinnen kunnen praten', rpe: 'RPE 3-4', zone: 'zone 2' },
  3: { label: 'Stevig', feel: 'korte zinnen', rpe: 'RPE 5-6', zone: 'zone 3' },
  4: { label: 'Hard', feel: 'alleen losse woorden', rpe: 'RPE 8-9', zone: 'zone 4-5' },
};

export type StepKind = 'warmup' | 'run' | 'work' | 'recover' | 'cooldown' | 'strength' | 'walk';

export interface StepSpec {
  kind: StepKind;
  label: string;
  // Fixed length, or the share of the session's minutes left after the
  // fixed steps (the main block of a continuous session).
  minutes?: number;
  seconds?: number;
  rest?: true;
  intensity: Intensity;
  // No zone or RPE to aim for (rest or a recovery walk): the step then
  // reads "Heel rustig · geen hartslagdoel" instead of a zone.
  noTarget?: true;
  detail?: string;
}

export interface RepeatSpec {
  // Repeats per week in the phase (weekInPhase 1-4); scaled with the
  // session's planned minutes in later phases.
  repeatsByWeek: Record<number, number>;
  steps: StepSpec[];
}

export type StructureSpec = StepSpec | RepeatSpec;

export interface WorkoutSpec {
  summary: (repeats?: number) => string;
  keyTag?: string; // e.g. "D+ waar mogelijk"
  structure: StructureSpec[];
  // How it shows up in Garmin Connect, when the session is one you'd run
  // or walk with the watch.
  garminSport?: string;
  builds: { label: string; why: string }[];
}

const MACROFACTOR_BLOCK: StepSpec = {
  kind: 'strength', label: 'Kracht in MacroFactor', rest: true, intensity: 3,
  detail: 'Oefeningen, sets, gewicht en RIR volgens MacroFactor',
};

export const WORKOUTS: Record<string, WorkoutSpec> = {
  tpl_upper_a: {
    summary: () => 'Krachttraining bovenlichaam: borst, rug, schouders en armen. De inhoud komt uit MacroFactor.',
    structure: [MACROFACTOR_BLOCK],
    builds: [
      { label: 'Kracht bovenlichaam', why: 'Een rugzak dragen, stokken gebruiken en een goede houding houden, dag na dag.' },
      { label: 'Spiermassa', why: 'Meer spier maakt je robuuster en helpt blessures voorkomen.' },
    ],
  },
  tpl_upper_b: {
    summary: () => 'Tweede bovenlichaamtraining van de week. De inhoud komt uit MacroFactor.',
    structure: [MACROFACTOR_BLOCK],
    builds: [
      { label: 'Kracht bovenlichaam', why: 'Samen met Bovenlichaam A verdeel je het weekvolume over twee sessies, beter voor groei.' },
      { label: 'Spiermassa', why: 'Voldoende wekelijks volume en consistentie tellen het meest.' },
    ],
  },
  tpl_lower_a: {
    summary: () => 'De belangrijkste beentraining van de week: squat, hinge en eenbenig werk. De inhoud komt uit MacroFactor.',
    structure: [MACROFACTOR_BLOCK],
    builds: [
      { label: 'Beenkracht', why: 'De basis voor stijgen, dalen en lange dagen lopen.' },
      { label: 'Robuustheid', why: 'Sterke benen en pezen vangen de klappen van afdalen en hardlopen op.' },
    ],
  },
  tpl_lower_b: {
    summary: () => 'Tweede beentraining van de week. De inhoud komt uit MacroFactor.',
    structure: [MACROFACTOR_BLOCK],
    builds: [
      { label: 'Beenkracht', why: 'Een tweede prikkel per week voor kracht en spiermassa in je benen.' },
      { label: 'Robuustheid', why: 'Later ook eenbenig werk, step-ups en kuiten, specifiek voor de bergen.' },
    ],
  },
  tpl_easy_run: {
    summary: () => 'Rustig hardlopen. Je moet de hele tijd volledige zinnen kunnen praten.',
    structure: [{ kind: 'run', label: 'Hardlopen', rest: true, intensity: 2, detail: 'Tempo is geen doel, ontspannen blijven' }],
    garminSport: 'Hardlopen',
    builds: [
      { label: 'Aerobe basis', why: 'Hoe lang je rustig kunt blijven bewegen: de motor onder elke lange dag.' },
      { label: 'Herstel tussen zware dagen', why: 'Bewust rustig, zodat Benen A en de heuvels er niet onder lijden.' },
    ],
  },
  tpl_strides_run: {
    summary: (repeats) => `Rustig hardlopen, met aan het eind ${repeats ?? 6} versnellingen van 20 seconden.`,
    structure: [
      { kind: 'run', label: 'Rustig hardlopen', rest: true, intensity: 2, detail: 'Hele zinnen kunnen praten' },
      {
        repeatsByWeek: { 1: 6, 2: 6, 3: 6, 4: 4 },
        steps: [
          { kind: 'work', label: 'Versnelling', seconds: 20, intensity: 3, detail: 'Soepel snel, ongeveer je 5 km-tempo, niet sprinten' },
          { kind: 'recover', label: 'Op adem komen', seconds: 60, intensity: 1, detail: 'Wandelen of heel rustig joggen' },
        ],
      },
    ],
    garminSport: 'Hardlopen',
    builds: [
      { label: 'Weekvolume', why: 'Een extra loop maakt je week langer zonder dat één loop te veel groeit.' },
      { label: 'Loopvaardigheid', why: 'Korte, soepele versnellingen leren je benen sneller te lopen zonder dat het zwaar wordt.' },
    ],
  },
  tpl_tempo_run: {
    summary: (repeats) => `Rustig inlopen, ${repeats ?? 2} blokken rond je drempel, rustig uitlopen.`,
    structure: [
      { kind: 'warmup', label: 'Inlopen', minutes: 10, intensity: 2 },
      {
        // Daniels: threshold work per session at most ~10% of the weekly
        // running volume, as cruise intervals of about 5:1 work to rest
        // (docs/onderzoek, Tussendoel hardloopwedstrijd). At ~20 km a week
        // that is 14 to 21 minutes on threshold.
        repeatsByWeek: { 1: 2, 2: 2, 3: 3, 4: 2 },
        steps: [
          { kind: 'work', label: 'Drempeltempo', minutes: 7, intensity: 3, detail: 'Comfortabel zwaar, korte zinnen lukken nog' },
          { kind: 'recover', label: 'Rustig', seconds: 90, intensity: 2, detail: 'Rustig doorlopen' },
        ],
      },
      { kind: 'cooldown', label: 'Uitlopen', minutes: 8, intensity: 2 },
    ],
    garminSport: 'Hardlopen',
    builds: [
      { label: 'Drempel', why: 'Het tempo dat je lang kunt volhouden schuift op: precies wat een 10 km vraagt.' },
      { label: 'Aerobe basis', why: 'Telt ook mee voor je uithouding richting de GR5.' },
    ],
  },
  tpl_test_run: {
    summary: () => 'Inlopen, 5 km zo snel als je gelijkmatig volhoudt, uitlopen. Een meetpunt, geen wedstrijd.',
    structure: [
      { kind: 'warmup', label: 'Inlopen', minutes: 10, intensity: 2, detail: 'Met 2 tot 3 korte versnellingen' },
      { kind: 'work', label: '5 km test', rest: true, intensity: 4, detail: 'Gelijkmatig: de laatste km mag het zwaarst voelen, niet de eerste' },
      { kind: 'cooldown', label: 'Uitlopen', minutes: 8, intensity: 2 },
    ],
    garminSport: 'Hardlopen',
    builds: [
      { label: 'Je echte tempo', why: 'Daarop stemt ASCEND je doeltijd en je tempolopen af.' },
      { label: 'Vooruitgang', why: 'De tweede test laat zien wat de tempolopen opleverden.' },
    ],
  },
  tpl_race: {
    summary: () => 'Je wedstrijd. Goed inlopen, rustig starten, in de tweede helft versnellen als het gaat.',
    structure: [
      { kind: 'warmup', label: 'Inlopen', minutes: 12, intensity: 2, detail: 'Met 3 tot 4 korte versnellingen van 20 seconden' },
      { kind: 'work', label: 'Wedstrijd', rest: true, intensity: 4, detail: 'Eerste km iets rustiger dan je doeltempo' },
    ],
    garminSport: 'Hardlopen',
    builds: [
      { label: 'Je tussendoel', why: 'Een meetpunt: daarna weet ASCEND je echte tempo.' },
    ],
  },
  tpl_bergconditie: {
    summary: () => 'Langdurig bergop stappen, op de loopband op helling of buiten op een heuvelroute.',
    keyTag: 'D+',
    structure: [{ kind: 'walk', label: 'Bergop wandelen', rest: true, intensity: 2, detail: '8-15% helling, 4-5,5 km/u, RPE 4-5' }],
    garminSport: 'Wandelen (of Loopband)',
    builds: [
      { label: 'Bergop volhouden', why: 'Uren achter elkaar kunnen stijgen zonder dat je verzuurt.' },
      { label: 'D+', why: 'Verticale meters opbouwen richting de hoogtemeters van je tocht.' },
    ],
  },
  tpl_hill_intervals: {
    summary: (repeats) => `Rustig opwarmen, ${repeats ?? 5} keer kort en hard bergop, rustig uitlopen.`,
    keyTag: 'D+',
    structure: [
      { kind: 'warmup', label: 'Opwarmen', minutes: 10, intensity: 2 },
      {
        repeatsByWeek: { 1: 5, 2: 6, 3: 8, 4: 4 },
        steps: [
          { kind: 'work', label: 'Hard bergop', seconds: 60, intensity: 4, detail: 'Hard maar beheerst, je techniek blijft netjes' },
          { kind: 'recover', label: 'Terug naar beneden', minutes: 2, intensity: 1, detail: 'Wandelend of heel rustig joggend' },
        ],
      },
      { kind: 'cooldown', label: 'Uitlopen', minutes: 10, intensity: 2 },
    ],
    garminSport: 'Hardlopen',
    builds: [
      { label: 'Snelheid', why: 'Een echte snelheidsprikkel, met minder impact dan sprinten op de vlakte.' },
      { label: 'D+', why: 'Elke herhaling telt ook als klimtraining.' },
    ],
  },
  tpl_long_run: {
    summary: () => 'De langste sessie van de week, rustig en met hoogtemeters waar het kan. Bewust op vermoeide benen na de heuvels.',
    keyTag: '±300 m D+ als het kan',
    structure: [{ kind: 'run', label: 'Lange duurloop', rest: true, intensity: 2, detail: 'Met hoogteverschil als het kan' }],
    garminSport: 'Hardlopen (of Trailrunning)',
    builds: [
      { label: 'Uithouding', why: 'Tijd op de been: de basis voor lange dagen onderweg.' },
      { label: 'Vermoeide benen', why: 'Doorlopen na een zware dag, precies wat een meerdaagse tocht vraagt.' },
      { label: 'D+', why: 'Hoogtemeters in je benen, ook omlaag.' },
    ],
  },
  tpl_mountain_hike: {
    summary: () => 'Een lange wandeling met hoogteverschil en de rugzak van deze week. Rustig, eten en drinken onderweg zoals op de GR5.',
    keyTag: 'D+ en D− met rugzak',
    structure: [
      { kind: 'warmup', label: 'Rustig inlopen', minutes: 10, intensity: 1, detail: 'Vlak, rugzak goed afstellen' },
      { kind: 'walk', label: 'Bergtocht', rest: true, intensity: 2, detail: 'Omhoog in kleine passen, omlaag beheerst. Elk uur iets eten.' },
      { kind: 'cooldown', label: 'Uitlopen', minutes: 5, intensity: 1, detail: 'Vlak, daarna rekken' },
    ],
    garminSport: 'Wandelen (of Hike)',
    builds: [
      { label: 'Tijd op de benen', why: 'Uren achter elkaar bewegen, zoals een etappe van de GR5.' },
      { label: 'Afdalen', why: 'Je bovenbenen wennen aan dalen; dat is wat het meest pijn doet op dag 3.' },
      { label: 'Rugzak', why: 'Schouders, heupen en voeten wennen stap voor stap aan het gewicht.' },
    ],
  },
  tpl_hike_day_one: {
    summary: () => 'De eerste van twee wandeldagen. Rustiger dan morgen, met hoogteverschil en de rugzak.',
    keyTag: 'Morgen weer op pad',
    structure: [
      { kind: 'warmup', label: 'Rustig inlopen', minutes: 10, intensity: 1 },
      { kind: 'walk', label: 'Wandeldag 1', rest: true, intensity: 2, detail: 'Bewust rustig, je bewaart iets voor morgen' },
      { kind: 'cooldown', label: 'Uitlopen', minutes: 5, intensity: 1, detail: 'Daarna eten, drinken en rekken' },
    ],
    garminSport: 'Wandelen (of Hike)',
    builds: [
      { label: 'Twee dagen op rij', why: 'Op vermoeide benen opnieuw vertrekken, precies wat een meerdaagse tocht vraagt.' },
      { label: 'Herstel tussen dagen', why: 'Je leert hoe eten, slapen en je benen reageren tussen twee tochten.' },
    ],
  },
  tpl_bike: {
    summary: () => 'Een rustige rit voor je conditie, zonder de schokken van hardlopen.',
    structure: [
      { kind: 'warmup', label: 'Rustig inrijden', minutes: 10, intensity: 1 },
      { kind: 'run', label: 'Rustig fietsen', rest: true, intensity: 2, detail: 'Gelijkmatig, liever lang dan hard' },
    ],
    garminSport: 'Fietsen',
    builds: [
      { label: 'Conditie', why: 'Je hart en longen trainen, je benen hebben minder te verduren dan bij een loop.' },
    ],
  },
  tpl_herstel: {
    summary: () => 'Rust of een rustige wandeling. Geen prestatie, alleen bewegen.',
    structure: [{ kind: 'walk', label: 'Rustig wandelen of rust', rest: true, intensity: 1, noTarget: true, detail: 'Allebei goed. Geen tempo of hartslag om op te letten' }],
    builds: [
      { label: 'Herstel', why: 'De vermoeidheid van het weekend laten zakken voor de nieuwe week begint.' },
    ],
  },
};
