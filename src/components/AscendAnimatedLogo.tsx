import { useId } from 'react';

// Pure SVG + CSS brand mark for the splash/loading screen: a twin-peak
// mountain inside a ring, gold gradient strokes, and a point of light that
// travels up the winding trail (CSS `offset-path`, see .ascend-logo-* in
// index.css) before the peak flashes. Replaces the earlier raster
// (webp-based) version — this one stays crisp at any size and needs no
// separate image asset. IDs are namespaced via useId() so multiple
// instances on one page never collide.
//
// Kleuren: het teken zelf is ongewijzigd, alleen de verf. De streek loopt van
// marine (--color-ink) boven naar mint (--color-action) onder, het licht en de
// vonk zijn mint. Op de lichte lucht van Ascend (.on-light) worden dat vanzelf
// donker marine en donkere mint; geen losse hexkleuren.
export function AscendAnimatedLogo({ size = 200, withWord = true }: { size?: number; withWord?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const softGlow = `ag-soft-${uid}`;
  const softGlowBig = `ag-softbig-${uid}`;
  const goldStroke = `ag-gold-${uid}`;
  const peakGlow = `ag-peak-${uid}`;
  const dotGlow = `ag-dot-${uid}`;
  const ringGlint = `ag-ring-${uid}`;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <svg viewBox={withWord ? '0 0 240 300' : '0 0 240 235'} width={size} height={size * (withWord ? 1.25 : 0.98)} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={softGlow} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5.5" result="blur" />
        </filter>
        <filter id={softGlowBig} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="12" result="blur" />
        </filter>
        <linearGradient id={goldStroke} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--color-ink)' }} />
          <stop offset="45%" style={{ stopColor: 'var(--color-ink)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-action)' }} />
        </linearGradient>
        <radialGradient id={peakGlow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopOpacity="0.95" style={{ stopColor: 'var(--color-action)' }} />
          <stop offset="100%" stopOpacity="0" style={{ stopColor: 'var(--color-action)' }} />
        </radialGradient>
        <radialGradient id={dotGlow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopOpacity="1" style={{ stopColor: 'var(--color-action)' }} />
          <stop offset="55%" stopOpacity="0.8" style={{ stopColor: 'var(--color-action)' }} />
          <stop offset="100%" stopOpacity="0" style={{ stopColor: 'var(--color-action)' }} />
        </radialGradient>
        <linearGradient id={ringGlint} gradientUnits="userSpaceOnUse" x1="120" y1="20" x2="120" y2="220">
          <stop offset="0%" stopOpacity="0" style={{ stopColor: 'var(--color-action)' }} />
          <stop offset="48%" stopOpacity="0" style={{ stopColor: 'var(--color-action)' }} />
          <stop offset="50%" stopOpacity="0.9" style={{ stopColor: 'var(--color-action)' }} />
          <stop offset="52%" stopOpacity="0" style={{ stopColor: 'var(--color-action)' }} />
          <stop offset="100%" stopOpacity="0" style={{ stopColor: 'var(--color-action)' }} />
          {/* SMIL is not reached by the CSS reduced-motion rule. */}
          {!reducedMotion && <animateTransform attributeName="gradientTransform" type="rotate" from="0 120 120" to="360 120 120" dur="11s" repeatCount="indefinite" />}
        </linearGradient>
      </defs>

      <g filter={`url(#${softGlowBig})`} className="ascend-logo-glowpulse" style={{ transformOrigin: '120px 120px' }}>
        <circle cx="120" cy="120" r="95" fill="none" stroke={`url(#${goldStroke})`} strokeWidth="3" />
        <path
          d="M50,168 L68,112 L78,124 L92,86 L102,98 L120,58 L138,98 L148,86 L162,124 L172,112 L190,168"
          fill="none"
          stroke={`url(#${goldStroke})`}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M120,58 C108,82 133,100 116,122 C102,142 130,158 112,182 C102,196 122,204 112,206"
          fill="none"
          stroke="var(--color-action)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="120" cy="59" r="10" fill={`url(#${peakGlow})`} />
      </g>

      <g>
        <circle cx="120" cy="120" r="95" fill="none" stroke={`url(#${goldStroke})`} strokeWidth="2.5" className="ascend-logo-ringbreathe" />
        <circle cx="120" cy="120" r="95" fill="none" stroke={`url(#${ringGlint})`} strokeWidth="3" filter={`url(#${softGlow})`} />
        <path
          d="M50,168 L68,112 L78,124 L92,86 L102,98 L120,58 L138,98 L148,86 L162,124 L172,112 L190,168"
          fill="none"
          stroke={`url(#${goldStroke})`}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M120,58 C108,82 133,100 116,122 C102,142 130,158 112,182 C102,196 122,204 112,206"
          fill="none"
          stroke={`url(#${goldStroke})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="120" cy="59" r="3" fill="var(--color-action)" className="ascend-logo-sparkflash" />
        <path d="M96,71 L96,85 M89,78 L103,78" stroke="var(--color-action)" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" filter={`url(#${softGlow})`} />
      </g>

      <circle className="ascend-logo-lightpoint" r="5" fill={`url(#${dotGlow})`} filter={`url(#${softGlow})`} />

      {withWord && (
      <text
        x="120"
        y="258"
        textAnchor="middle"
        fontFamily="var(--font-display), 'Times New Roman', Cambria, Georgia, serif"
        fontSize="36"
        fontWeight="600"
        letterSpacing="9"
        fill={`url(#${goldStroke})`}
      >
        ASCEND
      </text>
      )}
    </svg>
  );
}
