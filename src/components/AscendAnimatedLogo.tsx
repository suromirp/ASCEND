import { useId } from 'react';

// Het logo van ASCEND, "Ring en pad" (docs/beslissingen/2026-10-25-logo-ring-en-pad.md),
// als SVG zonder afbeelding: een lichte ring, een lichte kam met drie toppen
// die precies op de ring eindigt, een groenblauwe berg die overloopt in
// marine, een rustig S-pad en een stip in mint op de top. De vormen volgen
// public/icon.svg (maat 96 bij 96).
//
// Beweging (alleen als het teken verschijnt, één keer, geen lus): de ring
// tekent zich, dan de kam, de berg kleurt in, het pad loopt omhoog, als laatste
// verschijnt de stip en het woord. De stappen staan bij .alogo-* in
// index.css; in Rustig, Uit en bij beperkte beweging staat alles meteen op de
// eindstand. `animate={false}` toont alleen de eindstand.
//
// Kleuren komen uit de logo-tokens (--color-logo-*), het woord uit --color-ink.
// IDs krijgen een eigen voorvoegsel via useId(), zodat twee exemplaren op één
// pagina elkaar niet raken.
const CREST = 'M19.07 65.86 L34 36 L39 41 L48 23 L57 41 L62 36 L76.93 65.86';

export function AscendAnimatedLogo({ size = 200, withWord = true, animate = true }: { size?: number; withWord?: boolean; animate?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ringPaint = `alogo-ring-${uid}`;
  const mountainPaint = `alogo-mtn-${uid}`;

  return (
    <svg
      viewBox={withWord ? '8 9 80 100' : '8 9 80 78'}
      width={size}
      height={size * (withWord ? 1.25 : 0.975)}
      className={animate ? 'alogo-play' : undefined}
      style={{ overflow: 'visible' }}
      role="img"
      aria-label="ASCEND"
    >
      <defs>
        <linearGradient id={ringPaint} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-logo-ring-top)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-logo-ring-bottom)' }} />
        </linearGradient>
        <linearGradient id={mountainPaint} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.2" style={{ stopColor: 'var(--color-logo-mountain-top)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-logo-mountain-bottom)' }} />
        </linearGradient>
      </defs>

      <path className="alogo-mountain" d={`${CREST} A34 34 0 0 1 19.07 65.86Z`} fill={`url(#${mountainPaint})`} />
      <circle
        className="alogo-ring"
        cx="48"
        cy="48"
        r="34"
        fill="none"
        stroke={`url(#${ringPaint})`}
        strokeWidth="3"
        pathLength={1}
        transform="rotate(-90 48 48)"
      />
      <path
        className="alogo-crest"
        d={CREST}
        fill="none"
        stroke={`url(#${ringPaint})`}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        className="alogo-path"
        d="M48 82 C40 74 40 66 47 58.5 C54 51 54 42 49.5 34 C48 31 47.6 27 48 23"
        fill="none"
        stroke="var(--color-logo-path)"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
      />
      <circle className="alogo-dot" cx="48" cy="23" r="4.2" fill="var(--color-logo-path)" />

      {withWord && (
        <text
          className="alogo-word"
          x="48"
          y="104"
          textAnchor="middle"
          fontFamily="var(--font-display), 'Times New Roman', Cambria, Georgia, serif"
          fontSize="8.5"
          fontWeight="600"
          letterSpacing="2.2"
          fill="var(--color-ink)"
        >
          ASCEND
        </text>
      )}
    </svg>
  );
}
