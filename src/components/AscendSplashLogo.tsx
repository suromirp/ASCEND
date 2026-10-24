import { useId } from 'react';

// Splash/loading-screen brand mark, distinct from the persistent
// AscendAnimatedLogo used inline on Today: this one draws itself in once
// (ring, mountain silhouette, trail all stroke-reveal, peak flashes, the
// wordmark fades up) and only then settles into the same kind of ambient
// loop (glow pulse, ring breathe, a light travelling the trail) — an entry
// animation that only makes sense the first time something appears, not on
// every re-render of a header icon. IDs are namespaced via useId().
//
// Kleuren: dezelfde verf als AscendAnimatedLogo: de streek loopt van wit
// (--color-ink) boven naar mint (--color-action) onder, het licht en de vonk
// zijn mint. Geen losse hexkleuren.
export function AscendSplashLogo({ size = 200 }: { size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const softGlow = `asl-soft-${uid}`;
  const softGlowBig = `asl-softbig-${uid}`;
  const goldStroke = `asl-gold-${uid}`;
  const peakGlow = `asl-peak-${uid}`;
  const dotGlow = `asl-dot-${uid}`;

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
      </defs>

      <g filter={`url(#${softGlowBig})`} className="ascend-splash-glow" style={{ transformOrigin: '120px 120px' }}>
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
        <circle
          cx="120"
          cy="120"
          r="95"
          fill="none"
          stroke={`url(#${goldStroke})`}
          strokeWidth="2.5"
          pathLength={1}
          strokeDasharray={1}
          className="ascend-splash-ring-draw"
        />
        <circle cx="120" cy="120" r="95" fill="none" stroke={`url(#${goldStroke})`} strokeWidth="2.5" className="ascend-splash-ring-solid" />
        <path
          d="M50,168 L68,112 L78,124 L92,86 L102,98 L120,58 L138,98 L148,86 L162,124 L172,112 L190,168"
          fill="none"
          stroke={`url(#${goldStroke})`}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          className="ascend-splash-mountain-draw"
        />
        <path
          d="M120,58 C108,82 133,100 116,122 C102,142 130,158 112,182 C102,196 122,204 112,206"
          fill="none"
          stroke={`url(#${goldStroke})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          className="ascend-splash-trail-draw"
        />
        <circle cx="120" cy="59" r="3" fill="var(--color-action)" className="ascend-splash-spark" />
        <path d="M96,71 L96,85 M89,78 L103,78" stroke="var(--color-action)" strokeWidth="1.2" strokeLinecap="round" filter={`url(#${softGlow})`} className="ascend-splash-spark" />
      </g>

      <circle className="ascend-splash-light-point" r="5" fill={`url(#${dotGlow})`} filter={`url(#${softGlow})`} />

      <text
        x="120"
        y="258"
        textAnchor="middle"
        fontFamily="var(--font-display), 'Times New Roman', Cambria, Georgia, serif"
        fontSize="36"
        fontWeight="600"
        fill={`url(#${goldStroke})`}
        className="ascend-splash-wordmark"
      >
        ASCEND
      </text>
    </svg>
  );
}
