// De kleine tekens van het Vandaag-scherm: lijniconen van 1,6 px met ronde
// uiteinden, zonder kleur van zichzelf (ze nemen currentColor over). Eigen
// bestand zodat Vandaag niet wacht op de iconenset van de tabbalk.

import type { ReactNode } from 'react';

function Glyph({ size = 18, className, children }: { size?: number; className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const CheckGlyph = ({ size, draw }: { size?: number; draw?: boolean }) => <Glyph size={size} className={draw ? 'mx-check mx-check-draw' : 'mx-check'}><path d="M5 12.5l4.2 4L19 7" /></Glyph>;
// Het maantje van een rustdag.
export const MoonGlyph = ({ size }: { size?: number }) => <Glyph size={size}><path d="M19.5 14.2A8 8 0 1 1 9.8 4.5a6.4 6.4 0 0 0 9.7 9.7z" /></Glyph>;
export const ChevronGlyph =({ size }: { size?: number }) => <Glyph size={size}><path d="M9 6l6 6-6 6" /></Glyph>;

// Een rustdag is een dal: groene hoogtelijnen met een gouden stip onderin.
export function ValleyLines() {
  return (
    <svg viewBox="0 0 322 80" width="100%" height="80" className="block" aria-hidden="true">
      <path d="M0 16 C60 16 80 56 161 56 S262 16 322 16" fill="none" stroke="var(--color-alpine)" strokeOpacity=".35" />
      <path d="M0 30 C60 30 90 66 161 66 S262 30 322 30" fill="none" stroke="var(--color-alpine)" strokeWidth="1.6" />
      <path d="M0 46 C60 46 100 74 161 74 S262 46 322 46" fill="none" stroke="var(--color-alpine)" strokeOpacity=".5" />
      <circle cx="161" cy="66" r="4" fill="var(--color-gold)" />
    </svg>
  );
}
