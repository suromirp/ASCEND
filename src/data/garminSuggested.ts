// "Garmin Suggested" guidance mode: the Forerunner 255's Daily Suggested
// Workout is picked manually (there's no supported public API to read it
// automatically — see the ASCEND_training_variants_garmin_spec.md
// research), and ASCEND labels how compatible that suggestion is with the
// day's actual training goal. A second opinion, not the master plan.

export type GarminCompatibility = 'compatible' | 'different' | 'not_equivalent';

export const COMPATIBILITY_LABEL: Record<GarminCompatibility, string> = {
  compatible: 'Compatibel',
  different: 'Nuttig, maar anders',
  not_equivalent: 'Niet gelijkwaardig',
};

export const GARMIN_SUGGESTED_TYPES = ['Recovery', 'Base', 'Tempo', 'Threshold', 'VO2 Max', 'Sprint', 'Long', 'Bike', 'Anders'] as const;

export interface CompatibilityEntry {
  compatibility: GarminCompatibility;
  note: string;
}

// Keyed by SessionTemplate.id, then by the Garmin-suggested type.
export const GARMIN_COMPATIBILITY: Record<string, Record<string, CompatibilityEntry>> = {
  tpl_easy_run: {
    Recovery: { compatibility: 'compatible', note: 'Compatibel als de duur voldoende is, lagere prikkel dan gepland, maar prima wanneer je moe bent.' },
    Base: { compatibility: 'compatible', note: 'Het meest compatibel met een rustige duurloop.' },
    Tempo: { compatibility: 'not_equivalent', note: 'Niet gelijkwaardig: dit maakt van de rustige duurloop een zware loop, de dag na Benen A en vlak voor de heuvelintervallen.' },
    Threshold: { compatibility: 'not_equivalent', note: 'Niet gelijkwaardig: verhoogt de beenvermoeidheid richting de heuvelintervallen.' },
    'VO2 Max': { compatibility: 'not_equivalent', note: 'Niet gelijkwaardig, te zware intensiteit voor een aerobe-basisdag.' },
    Sprint: { compatibility: 'not_equivalent', note: 'Niet gelijkwaardig, dit is geen rustige duurtraining meer.' },
    Long: { compatibility: 'different', note: 'Mogelijk te veel duur voor Maand 1, kan, maar houd rekening met extra vermoeidheid richting het weekend.' },
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
