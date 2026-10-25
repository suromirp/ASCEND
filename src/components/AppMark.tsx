import { Link } from 'react-router-dom';

// Het kleine merkteken linksboven op elke tab: de ring en de toppen van het
// logo in één stille lijn (geen verloop, geen animatie), met het woord
// ASCEND erachter. Het staat op de lichte lucht van SkyBand en is daarom
// donker marine (--color-on-light), op dezelfde hoogte als het tandwiel.
// Tikken brengt je naar Vandaag.
export function AppMark() {
  return (
    <Link
      to="/"
      aria-label="ASCEND, naar Vandaag"
      className="flex h-11 items-center gap-2"
      style={{ color: 'var(--color-on-light)' }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M3.92 16.99 L8.09 8.65 L9.49 10.04 L12 5.01 L14.51 10.04 L15.91 8.65 L20.08 16.99" />
      </svg>
      <span className="text-xs font-semibold leading-4 tracking-[0.16em]">ASCEND</span>
    </Link>
  );
}
