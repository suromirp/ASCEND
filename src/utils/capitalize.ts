// Eerste letter een hoofdletter, de rest blijft zoals het is. Een lege tekst blijft leeg.
export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
