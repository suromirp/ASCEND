// ASCEND: wat de Briefing anders zegt per manier van trainen (besluit docs/beslissingen/2026-11-12-briefing-per-manier.md).
//
// De feiten, stopregels en stappen van een training (data/sessionStyle.ts, data/workoutStructure.ts) zijn
// geschreven voor de standaard: de heuvel buiten. Kies je de loopband op helling of de StairMaster, dan klopt
// "hard bergop", "op de heuvel" en "terug naar beneden" niet meer. Per manier staat hier alleen wat anders is;
// wat er niet staat, blijft de tekst van de training. De opbouw zelf (minuten, herhalingen, zwaarte) verandert
// niet. Wat er naar je horloge gaat leest de namen van de stappen hier ook (engine/watchWorkout.ts): de
// StairMaster krijgt een eigen wandelworkout (besluit docs/beslissingen/2026-11-12-stairmaster-horloge.md).
//
// Gesleuteld op de sleutel van de manier (data/modalities.ts), en dan op de training: dezelfde manier staat bij
// de heuvelintervallen en bij heuvelsprints en afdalen, met een eigen derde feit.

export interface PlaceBrief {
  // De zin uitleg in de kop, als die van de training niet klopt voor deze manier.
  purpose?: string;
  // Het woord na de sport in de kop ("WANDELEN · TRAP" in plaats van "· BERGOP").
  styleLabel?: string;
  // Het label onder het tweede kerngetal ("8 × 1 min" + label).
  workLabel?: string;
  // Het derde kerngetal; `value` leeg: de waarde van de training blijft (bijvoorbeeld RPE 8-9).
  third?: { value?: string; label: string };
  stopSignals?: string[];
  // De stappen in het profiel en het blad Zo doe je het: oude naam naar nieuwe naam en uitleg.
  steps?: Record<string, { label: string; detail?: string }>;
}

const TREADMILL_STEPS = {
  'Hard bergop': { label: 'Hard op de helling', detail: 'Band op 4 tot 5 procent, hard maar beheerst' },
  'Terug naar beneden': { label: 'Rustig op de band', detail: 'Helling en snelheid flink omlaag' },
};
const STAIR_STEPS = {
  'Hard bergop': { label: 'Stevig traplopen', detail: 'Stevig, je stap blijft netjes' },
  'Terug naar beneden': { label: 'Rustig doorstappen', detail: 'Langzaam doorstappen, niet stilstaan' },
};

const TREADMILL_HILLS: PlaceBrief = {
  workLabel: 'hard op de helling',
  third: { label: 'op de loopband' },
  stopSignals: ['je techniek rommelig wordt of je aan de handgrepen gaat hangen', 'je na 2 minuten rustig op de band nog niet hersteld bent'],
  steps: TREADMILL_STEPS,
};
const STAIR_HILLS: PlaceBrief = {
  styleLabel: 'trap',
  purpose: 'Klimkracht in je benen, in korte stevige blokken op de trap.',
  workLabel: 'stevig traplopen',
  third: { label: 'op de trap' },
  stopSignals: ['je stap slordig wordt of je op de handvatten gaat leunen', 'je na 2 minuten rustig doorstappen nog niet hersteld bent'],
  steps: STAIR_STEPS,
};

const PLACE_BRIEF: Record<string, Record<string, PlaceBrief>> = {
  incline_treadmill_intervals: {
    tpl_hill_intervals: TREADMILL_HILLS,
    // Op de band is er geen afdaling: dat zegt het derde feit eerlijk.
    tpl_hills_descent: {
      purpose: 'Snelheid en klimkracht in één training.',
      workLabel: 'hard op de helling',
      third: { value: 'Geen afdaling', label: 'die mist op de band' },
      stopSignals: ['je techniek rommelig wordt of je aan de handgrepen gaat hangen', 'je scherpe pijn voelt'],
      steps: { ...TREADMILL_STEPS, 'Afdalen herhalen': { label: 'Rustig lopen', detail: 'Rustig op de band, lage helling' } },
    },
  },
  stairmaster_intervals: {
    tpl_hill_intervals: STAIR_HILLS,
    tpl_hills_descent: {
      purpose: 'Snelheid en klimkracht in één training.',
      styleLabel: 'trap',
      workLabel: 'stevig traplopen',
      third: { value: 'Geen afdaling', label: 'die mist op de StairMaster' },
      stopSignals: ['je stap slordig wordt of je op de handvatten gaat leunen', 'je scherpe pijn voelt'],
      steps: { ...STAIR_STEPS, 'Afdalen herhalen': { label: 'Rustig doorstappen', detail: 'Rustig tempo, niet stilstaan' } },
    },
  },
  // De duurloop op de loopband: geen hoogtemeters "als het kan" (buiten), wel de praattest.
  long_run_treadmill: {
    tpl_long_run: { third: { value: 'Praten kan', label: 'hele zinnen' }, stopSignals: ['het laatste kwartier voelt als een wedstrijd in plaats van rustig', 'je geen hele zinnen meer kunt praten: zet de band langzamer'] },
  },
  run_treadmill: {
    tpl_easy_run: { stopSignals: ['je geen hele zinnen meer kunt praten: zet de band langzamer', 'je benen nog zwaar zijn van de beentraining: loop de korte versie'] },
  },
  run_walk: {
    tpl_easy_run: { stopSignals: ['je in het loopstuk geen hele zinnen meer kunt praten: wandel langer', 'je benen nog zwaar zijn van de beentraining: loop de korte versie'] },
  },
};

export function placeBrief(templateId: string, placeKey: string | undefined): PlaceBrief | undefined {
  return placeKey ? PLACE_BRIEF[placeKey]?.[templateId] : undefined;
}

// Alle manieren met een eigen tekst (voor de tests).
export function placeBriefKeys(): { place: string; templateId: string }[] {
  return Object.entries(PLACE_BRIEF).flatMap(([place, byTemplate]) => Object.keys(byTemplate).map((templateId) => ({ place, templateId })));
}
