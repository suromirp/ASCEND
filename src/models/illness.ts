// A reported illness. Kept with the settings (AppSettings.illnessEpisodes),
// like the injury log it is a status, not training history: nothing about
// what was actually trained is changed by it.

// The "neck check": symptoms only above the neck (nose, throat) vs fever
// or symptoms below the neck (chest, aching muscles), plus stomach flu.
export type IllnessKind = 'above_neck' | 'below_neck' | 'stomach';

export interface IllnessEpisode {
  id: string;
  kind: IllnessKind;
  startDate: string; // ISO date
  endDate?: string; // ISO date of "weer beter"; undefined while ill
}
