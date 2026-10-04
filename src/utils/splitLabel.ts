// How a strength split reads on screen. A split the user named themselves
// is shown as they typed it.
export const SPLIT_PRESET_LABEL: Record<string, string> = {
  upper_lower: 'Boven / onder',
  full_body: 'Hele lichaam',
  push_pull_legs: 'Duwen / trekken / benen',
};

export function splitLabel(split: string): string {
  return SPLIT_PRESET_LABEL[split] ?? split;
}

// "3× per week · boven / onder"
export function strengthBlockLabel(sessionsPerWeek: number, split: string): string {
  return `${sessionsPerWeek}× per week · ${splitLabel(split).toLowerCase()}`;
}
