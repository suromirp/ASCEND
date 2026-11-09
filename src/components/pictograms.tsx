import type { ReactNode } from 'react';

// De pictogrammen van de sporten, de rust en het lichaam: kleine illustraties in
// drie tinten van één kleur (stijl C, docs/beslissingen/2026-10-24-pictogrammen-in-stijl-c.md).
// Een lichte achtergrondvorm, een middentint en de volle hoofdvorm; de volle vorm
// draagt het silhouet, zodat het ook op 24 px leesbaar blijft. De kleur is die van
// de omringende tekst (currentColor): de aanroeper zet de sportkleur. De bediening
// (tandwiel, pijltjes, info, vinkje, terug) blijft de lijnset in icons.tsx.
//
// De tinten zijn dekking op de kleur zelf (geen eigen kleurwaarden): --pic-light en
// --pic-mid staan in index.css, op de lichte lucht wat sterker. De drie lagen komen
// na elkaar op (mx-pic-1 tot en met mx-pic-3), alleen als het pictogram verschijnt.

export type PictogramName = 'rust' | 'lichaam' | 'lopen' | 'kracht' | 'eigengewicht' | 'wandelen' | 'rekken' | 'bergtocht' | 'fietsen' | 'zwemmen' | 'padel' | 'voetbal';

type Tone = 'light' | 'mid' | 'strong' | 'full' | 'cut';

const TONE_OPACITY: Record<Tone, string> = {
  light: 'var(--pic-light, 0.4)',
  mid: 'var(--pic-mid, 0.6)',
  strong: '0.82',
  full: '1',
  // Een uitgespaarde lijn in de kleur van de kaart waarop het pictogram staat.
  cut: '0.45',
};

function Layer({ n, tone, children }: { n: 1 | 2 | 3; tone: Tone; children: ReactNode }) {
  return (
    <g className={`mx-pic-${n}`} style={{ opacity: TONE_OPACITY[tone] }}>
      {children}
    </g>
  );
}

const round = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const SHAPES: Record<PictogramName, ReactNode> = {
  // Een hangmat tussen twee palen, met iemand erin die uitrust.
  rust: (
    <>
      <Layer n={1} tone="light">
        <path d="M3 3.5v17M21 3.5v17" fill="none" stroke="currentColor" strokeWidth="2" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <path d="M3 8.5c3.2 5 14.8 5 18 0" fill="none" stroke="currentColor" strokeWidth="1.5" {...round} />
      </Layer>
      <Layer n={3} tone="full">
        <path d="M4.8 10.4c2.8 3.8 11.6 3.8 14.4 0-.3 3-3.2 5.2-7.2 5.2s-6.9-2.2-7.2-5.2z" fill="currentColor" />
        <circle cx="7.6" cy="9.4" r="1.9" fill="currentColor" />
      </Layer>
    </>
  ),
  // Een lichaam met één gemarkeerde plek: het knopje voor rekken en klachten.
  lichaam: (
    <>
      <Layer n={1} tone="light">
        <circle cx="14" cy="18.2" r="3.4" fill="currentColor" />
      </Layer>
      <Layer n={2} tone="mid">
        <path d="M9 7.8h6c1 0 1.8.8 1.8 1.8v4.2c0 .6-.4 1-1 1H8.2c-.6 0-1-.4-1-1V9.6c0-1 .8-1.8 1.8-1.8z" fill="currentColor" />
      </Layer>
      <Layer n={3} tone="full">
        <circle cx="12" cy="4.2" r="2.3" fill="currentColor" />
        <path d="M10.4 15.4L9.8 21M13.4 15.4l.5 5.6" fill="none" stroke="currentColor" strokeWidth="2.6" {...round} />
        <circle cx="14" cy="18.2" r="1.5" fill="currentColor" />
      </Layer>
    </>
  ),
  // Een hardloopschoen met snelheidsstreepjes.
  lopen: (
    <>
      <Layer n={1} tone="light">
        <path d="M1.4 10.5h2.4M2 13.5h1.6" fill="none" stroke="currentColor" strokeWidth="1.3" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <path d="M3 17.2V12.6c0-.5.3-.9.8-1.1l2.4-.9 1.8-3.8c.2-.4.5-.6.9-.6h2.3c.4 0 .8.3.9.7l.7 2.2 3.6 1.4c2.3.9 4.6 1.9 4.6 3.9v2.8z" fill="currentColor" />
      </Layer>
      <Layer n={3} tone="full">
        <path d="M3 18h18v1.6c0 .8-.6 1.4-1.4 1.4H4.4C3.6 21 3 20.4 3 19.6z" fill="currentColor" />
        <path d="M15.5 17.2v-5.4l3 1.1c1.6.6 2.5 1.5 2.5 2.9v1.4z" fill="currentColor" />
        <path d="M10.6 9.4l2.2 1M9.4 11.6l2.6 1.1" fill="none" stroke="currentColor" strokeWidth="1.2" {...round} />
      </Layer>
    </>
  ),
  // Een halter: twee grote schijven op een stang.
  kracht: (
    <>
      <Layer n={1} tone="mid">
        <rect x="2" y="8.8" width="2.8" height="6.4" rx="1.3" fill="currentColor" />
        <rect x="19.2" y="8.8" width="2.8" height="6.4" rx="1.3" fill="currentColor" />
        <rect x="8.6" y="10.8" width="6.8" height="2.4" rx="1.2" fill="currentColor" />
      </Layer>
      <Layer n={2} tone="full">
        <rect x="5" y="5.5" width="3.8" height="13" rx="1.9" fill="currentColor" />
        <rect x="15.2" y="5.5" width="3.8" height="13" rx="1.9" fill="currentColor" />
      </Layer>
      <Layer n={3} tone="cut">
        <path d="M6.9 8v4M17.1 8v4" fill="none" stroke="var(--color-card)" strokeWidth="1" {...round} />
      </Layer>
    </>
  ),
  // Een figuur in een push-up op de grond: kracht zonder gewicht (Eigen gewicht, calisthenics).
  eigengewicht: (
    <>
      <Layer n={1} tone="light">
        <path d="M2.5 21.7h19" fill="none" stroke="currentColor" strokeWidth="1.4" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <path d="M8 11.6v8.6" fill="none" stroke="currentColor" strokeWidth="2.2" {...round} />
      </Layer>
      <Layer n={3} tone="full">
        <circle cx="4.9" cy="8.6" r="2.2" fill="currentColor" />
        <path d="M8.2 11.4l11.6 6.8" fill="none" stroke="currentColor" strokeWidth="3" {...round} />
        <path d="M19.8 18.2l.6 2.6" fill="none" stroke="currentColor" strokeWidth="2.4" {...round} />
      </Layer>
    </>
  ),
  // Een wandelaar met rugzak en stok.
  wandelen: (
    <>
      <Layer n={1} tone="light">
        <path d="M3 21.7h18" fill="none" stroke="currentColor" strokeWidth="1.4" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <rect x="5.4" y="7" width="5.2" height="7.6" rx="2.2" fill="currentColor" />
        <path d="M13 9l4.2 2M17.8 8.6L16.4 21" fill="none" stroke="currentColor" strokeWidth="1.4" {...round} />
      </Layer>
      <Layer n={3} tone="full">
        <rect x="5.4" y="7" width="5.2" height="2.8" rx="1.4" fill="currentColor" />
        <circle cx="13.8" cy="4.4" r="2.1" fill="currentColor" />
        <path d="M13.2 8l-1 5.2" fill="none" stroke="currentColor" strokeWidth="3" {...round} />
        <path d="M12.2 13.2L9.4 20.6M12.2 13.2l3.4 3.6-.6 4" fill="none" stroke="currentColor" strokeWidth="2.4" {...round} />
      </Layer>
    </>
  ),
  // Een rekkend poppetje met de armen omhoog, op een mat.
  rekken: (
    <>
      <Layer n={1} tone="light">
        <rect x="4" y="21.2" width="16" height="1.8" rx=".9" fill="currentColor" />
      </Layer>
      <Layer n={2} tone="mid">
        <path d="M11 8.8L6.4 4.8M13 8.8l4.6-4" fill="none" stroke="currentColor" strokeWidth="2.2" {...round} />
      </Layer>
      <Layer n={3} tone="full">
        <circle cx="12" cy="4.2" r="2.2" fill="currentColor" />
        <rect x="10.2" y="7.4" width="3.6" height="7" rx="1.8" fill="currentColor" />
        <path d="M11 14.4l-3 6.6M13 14.4l3 6.6" fill="none" stroke="currentColor" strokeWidth="2.4" {...round} />
      </Layer>
    </>
  ),
  // Een fiets met twee wielen (het Logboek kent fietsen als sport).
  fietsen: (
    <>
      <Layer n={1} tone="light">
        <path d="M2.5 21.7h19" fill="none" stroke="currentColor" strokeWidth="1.4" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <circle cx="5.8" cy="16" r="3.8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="18.2" cy="16" r="3.8" fill="none" stroke="currentColor" strokeWidth="2" />
      </Layer>
      <Layer n={3} tone="full">
        <path d="M5.8 16l4.4-7.2h5.6l2.4 7.2M10.2 8.8L12.6 16h5.6M15.8 8.8l-.8-2.6h2.2M9 6.6h2.6" fill="none" stroke="currentColor" strokeWidth="2.2" {...round} />
        <circle cx="12.6" cy="16" r="1.5" fill="currentColor" />
      </Layer>
    </>
  ),
  // Een zwemmer in borstcrawl met één arm over het water, op een golf.
  zwemmen: (
    <>
      <Layer n={1} tone="light">
        <path d="M2 21.8c1.7-1.4 3.3-1.4 5 0s3.3 1.4 5 0 3.3-1.4 5 0 3.3 1.4 5 0" fill="none" stroke="currentColor" strokeWidth="1.5" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <path d="M2 18.8c1.7-1.4 3.3-1.4 5 0s3.3 1.4 5 0 3.3-1.4 5 0 3.3 1.4 5 0" fill="none" stroke="currentColor" strokeWidth="1.8" {...round} />
        <circle cx="3.4" cy="11.8" r="0.9" fill="currentColor" />
        <circle cx="5.6" cy="10.2" r="0.7" fill="currentColor" />
      </Layer>
      <Layer n={3} tone="full">
        <circle cx="18.6" cy="11.8" r="2.1" fill="currentColor" />
        <path d="M4.2 15.8c3.4-1.9 8-2.3 12.8-1.1" fill="none" stroke="currentColor" strokeWidth="3" {...round} />
        <path d="M11.5 13.6C11 8.6 15.4 5.8 20.5 7.6" fill="none" stroke="currentColor" strokeWidth="2.4" {...round} />
      </Layer>
    </>
  ),
  // Een padelracket met gaten in de kop, en een bal. De racket staat rechtop in een binnenste g die
  // als geheel draait, zodat de animatie van de laag (translateY) er niet mee botst. Net als bij kracht
  // zijn er twee lagen 3: de volle kop en de uitgespaarde gaten verschijnen tegelijk.
  padel: (
    <>
      <Layer n={1} tone="light">
        <path d="M3 22.2h18" fill="none" stroke="currentColor" strokeWidth="1.4" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <circle cx="18.6" cy="17.4" r="2.4" fill="currentColor" />
        <g transform="rotate(35 10 12)">
          <path d="M8.3 13.6h3.4l.5 2.6H7.8z" fill="currentColor" />
          <rect x="8.8" y="16" width="2.4" height="5" rx="1.2" fill="currentColor" />
        </g>
      </Layer>
      <Layer n={3} tone="full">
        <g transform="rotate(35 10 12)">
          <path d="M10 2.3c3.4 0 5.6 2.4 5.6 5.6 0 2.4-1.4 4.4-3 5.8H7.4c-1.6-1.4-3-3.4-3-5.8 0-3.2 2.2-5.6 5.6-5.6z" fill="currentColor" />
        </g>
      </Layer>
      <Layer n={3} tone="cut">
        <g transform="rotate(35 10 12)" fill="var(--color-card)">
          <circle cx="8.2" cy="5.4" r="0.8" />
          <circle cx="11.8" cy="5.4" r="0.8" />
          <circle cx="6.6" cy="8.2" r="0.8" />
          <circle cx="10" cy="8.2" r="0.8" />
          <circle cx="13.4" cy="8.2" r="0.8" />
          <circle cx="8.2" cy="11" r="0.8" />
          <circle cx="11.8" cy="11" r="0.8" />
        </g>
      </Layer>
    </>
  ),
  // Een voetbal met snelheidsstreepjes.
  voetbal: (
    <>
      <Layer n={1} tone="light">
        <path d="M1.4 8.5h3M1.4 11.5h2.2M1.4 14.5h3M8 22h11" fill="none" stroke="currentColor" strokeWidth="1.3" {...round} />
      </Layer>
      <Layer n={2} tone="mid">
        <circle cx="13.5" cy="11.5" r="8" fill="currentColor" />
      </Layer>
      <Layer n={3} tone="full">
        <circle cx="13.5" cy="11.5" r="7.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13.5 8.5l2.85 2.07-1.09 3.36h-3.52l-1.09-3.36z" fill="currentColor" />
        <path d="M13.5 8.5V4.4M16.35 10.57l3.9-1.26M15.26 13.93l2.41 3.31M11.74 13.93l-2.41 3.31M10.65 10.57L6.75 9.31" fill="none" stroke="currentColor" strokeWidth="1.5" {...round} />
      </Layer>
    </>
  ),
  // Een berg met sneeuwkap, een tweede top en de zon, met een stippelpad.
  bergtocht: (
    <>
      <Layer n={1} tone="light">
        <path d="M13 12.5l2.6-3.6 6.6 10.6H11z" fill="currentColor" />
        <circle cx="18" cy="5" r="1.9" fill="currentColor" />
      </Layer>
      <Layer n={2} tone="strong">
        <path d="M1.8 19.5L9.8 6.8l7.6 12.7z" fill="currentColor" />
      </Layer>
      <Layer n={3} tone="full">
        <path d="M9.8 6.8l-2.4 3.8 1.6-.9 1.3 1.2 1.2-1.2 1.6.9z" fill="currentColor" />
        <path d="M5.6 19.5c1.4-1.6 3.4-1.6 4.6-3" fill="none" stroke="var(--color-card)" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="1.6 1.6" strokeLinecap="round" />
      </Layer>
    </>
  ),
};

export function Pictogram({
  name,
  size = 24,
  label,
  className,
}: {
  name: PictogramName;
  size?: number;
  // Staat het pictogram alleen, geef dan een label; naast een woord is het versiering.
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={`pictogram${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {SHAPES[name]}
    </svg>
  );
}
