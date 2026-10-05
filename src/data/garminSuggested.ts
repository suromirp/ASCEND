// "Garmin Suggested" guidance mode: the Forerunner 255's Daily Suggested
// Workout is picked manually (there's no supported public API to read it
// automatically — see the ASCEND_training_variants_garmin_spec.md
// research), and ASCEND labels how compatible that suggestion is with the
// day's actual training goal. A second opinion, not the master plan.

export type GarminCompatibility = 'compatible' | 'different' | 'not_equivalent';

export const COMPATIBILITY_LABEL: Record<GarminCompatibility, string> = {
  compatible: 'Past bij vandaag',
  different: 'Nuttig, maar anders',
  not_equivalent: 'Past niet bij vandaag',
};

export const GARMIN_SUGGESTED_TYPES = ['Recovery', 'Base', 'Tempo', 'Threshold', 'VO2 Max', 'Sprint', 'Long', 'Bike', 'Anders'] as const;

// How the Garmin workout types read on screen. The keys stay English: they
// are Garmin's own names and are stored in logs as garminSuggestedType.
export const GARMIN_TYPE_LABEL: Record<string, string> = {
  Recovery: 'Herstel', Base: 'Basis', Tempo: 'Tempo', Threshold: 'Drempel', 'VO2 Max': 'VO2max', Sprint: 'Sprint', Long: 'Lang', Bike: 'Fietsen', Anders: 'Anders',
};

export interface CompatibilityEntry {
  compatibility: GarminCompatibility;
  note: string;
}

// Keyed by SessionTemplate.id, then by the Garmin-suggested type.
export const GARMIN_COMPATIBILITY: Record<string, Record<string, CompatibilityEntry>> = {
  tpl_easy_run: {
    Recovery: { compatibility: 'compatible', note: 'Als de duur genoeg is. Lagere prikkel dan gepland, prima als je moe bent.' },
    Base: { compatibility: 'compatible', note: 'Het meest compatibel met een rustige duurloop.' },
    Tempo: { compatibility: 'not_equivalent', note: 'Dit maakt van de rustige duurloop een zware loop, de dag na Benen A en vlak voor de heuvelintervallen.' },
    Threshold: { compatibility: 'not_equivalent', note: 'Verhoogt de beenvermoeidheid richting de heuvelintervallen.' },
    'VO2 Max': { compatibility: 'not_equivalent', note: 'Te zware intensiteit voor een aerobe-basisdag.' },
    Sprint: { compatibility: 'not_equivalent', note: 'Dit is geen rustige duurtraining meer.' },
    Long: { compatibility: 'different', note: 'Mogelijk te lang voor deze fase. Kan, maar houd rekening met extra vermoeidheid richting het weekend.' },
    Bike: { compatibility: 'different', note: 'Aeroob nuttig, maar minder hardloopspecifiek.' },
    Anders: { compatibility: 'different', note: 'Beoordeel zelf of dit rustig/aeroob genoeg is voor een rustige duurloop.' },
  },
  tpl_bergconditie: {
    Recovery: { compatibility: 'different', note: 'Aeroob overlappend, maar niet bergspecifiek, geen D+-prikkel.' },
    Base: { compatibility: 'different', note: 'Aeroob overlappend, maar niet bergspecifiek, geen D+-prikkel.' },
    Tempo: { compatibility: 'not_equivalent', note: 'Niet aanbevolen als vervanger, zaterdag Benen B volgt hierna.' },
    Threshold: { compatibility: 'not_equivalent', note: 'Niet aanbevolen als vervanger, zaterdag Benen B volgt hierna.' },
    'VO2 Max': { compatibility: 'not_equivalent', note: 'Niet aanbevolen als vervanger, zaterdag Benen B volgt hierna.' },
    Sprint: { compatibility: 'not_equivalent', note: 'Niet aanbevolen als vervanger, zaterdag Benen B volgt hierna.' },
    Long: { compatibility: 'not_equivalent', note: 'Niet aanbevolen als vervanger, zaterdag Benen B volgt hierna.' },
    Bike: { compatibility: 'different', note: 'Aerobe noodgreep, maar geen bergspecifieke D+/wandelprikkel.' },
    Anders: { compatibility: 'different', note: 'Beoordeel zelf of dit richting bergconditie gaat (D+, wandelgang) of alleen aeroob is.' },
  },
};

export function getCompatibility(templateId: string, garminType: string): CompatibilityEntry | undefined {
  return GARMIN_COMPATIBILITY[templateId]?.[garminType];
}
