import { useId } from 'react';

// Pure SVG + CSS brand mark for the splash/loading screen: a twin-peak
// mountain inside a ring, gold gradient strokes, and a point of light that
// travels up the winding trail (CSS `offset-path`, see .ascend-logo-* in
// index.css) before the peak flashes. Replaces the earlier raster
// (webp-based) version — this one stays crisp at any size and needs no
// separate image asset. IDs are namespaced via useId() so multiple
// instances on one page never collide.
//
// The gold gradient stops (#fbead0 → #8f611c) are calibrated brand art, not
// arbitrary colors — kept as exact hex per the approved reference, the same
// documented exception as .topo-texture's hardcoded rgba in index.css.
export function AscendAnimatedLogo({ size = 200 }: { size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const softGlow = `ag-soft-${uid}`;
  const softGlowBig = `ag-softbig-${uid}`;
  const goldStroke = `ag-gold-${uid}`;
  const peakGlow = `ag-peak-${uid}`;
  const dotGlow = `ag-dot-${uid}`;
  const ringGlint = `ag-ring-${uid}`;

  return (
    <svg viewBox="0 0 240 300" width={size} height={size * 1.25} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={softGlow} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5.5" result="blur" />
        </filter>
        <filter id={softGlowBig} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="12" result="blur" />
        </filter>
        <linearGradient id={goldStroke} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbead0" />
          <stop offset="30%" stopColor="#eec066" />
          <stop offset="60%" stopColor="#c9932e" />
          <stop offset="100%" stopColor="#8f611c" />
        </linearGradient>
        <radialGradient id={peakGlow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3cf" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fff3cf" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={dotGlow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8e2" stopOpacity="1" />
          <stop offset="55%" stopColor="#ffdf8a" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffdf8a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ringGlint} gradientUnits="userSpaceOnUse" x1="120" y1="20" x2="120" y2="220">
          <stop offset="0%" stopColor="#fff8e2" stopOpacity="0" />
          <stop offset="48%" stopColor="#fff8e2" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff8e2" stopOpacity="0.9" />
          <stop offset="52%" stopColor="#fff8e2" stopOpacity="0" />
          <stop offset="100%" stopColor="#fff8e2" stopOpacity="0" />
          <animateTransform attributeName="gradientTransform" type="rotate" from="0 120 120" to="360 120 120" dur="11s" repeatCount="indefinite" />
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
          stroke="#ffe9a8"
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
        <circle cx="120" cy="59" r="3" fill="#fff8e2" className="ascend-logo-sparkflash" />
        <path d="M96,71 L96,85 M89,78 L103,78" stroke="#fff8e2" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" filter={`url(#${softGlow})`} />
      </g>

      <circle className="ascend-logo-lightpoint" r="5" fill={`url(#${dotGlow})`} filter={`url(#${softGlow})`} />

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
    </svg>
  );
}
