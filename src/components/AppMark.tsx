import { Link } from 'react-router-dom';
import { Eyebrow } from './ui';

// Het kleine merkteken linksboven op elke tab: de ring en de toppen van het
// logo in één stille lijn (geen verloop, geen animatie), met het woord
// ASCEND erachter. Brons, nooit goud: het gouden accent is voor de missie.
// Staat op dezelfde hoogte als het tandwiel en schuift met de pagina mee.
// Tikken brengt je naar Vandaag.
export function AppMark() {
  return (
    <Link
      to="/"
      aria-label="ASCEND, naar Vandaag"
      className="absolute left-4 z-10 flex h-11 items-center gap-2"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)', color: 'var(--color-bronze)' }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M5.5 17.5L8 10.5L9.5 12.5L12 6.5L14.5 12.5L16 10.5L18.5 17.5" />
      </svg>
      <Eyebrow>ASCEND</Eyebrow>
    </Link>
  );
}
