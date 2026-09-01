// Shown for a couple of seconds when a milestone on the Ascent Ladder is
// cleared (components/MilestoneCelebration.tsx) — one is picked at random
// per moment. Deliberately a short, flat list: add more here as they come
// to mind, no other file needs to change.
export interface StoicMotto {
  latin: string;
  nl: string;
}

export const STOIC_MOTTOS: StoicMotto[] = [
  { latin: 'Per aspera ad astra', nl: 'Door tegenspoed naar de sterren' },
  { latin: 'Vires acquirit eundo', nl: 'Het groeit terwijl het gaat' },
  { latin: 'Fortis fortuna adiuvat', nl: 'Het lot steunt de dappere' },
];
