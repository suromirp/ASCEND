import { useMemo, type CSSProperties, type ReactNode } from 'react';
import type { Quote } from '../data/quoteLibrary';
import { QUOTE_NL } from '../data/quoteTranslations';
import { completionSummary, type CompletionLine } from '../engine/completionSummary';
import { useAppData } from '../state/AppDataContext';
import { todayISO } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { useLegFatigueInputs } from './LegFatigueCard';
import { Card, Eyebrow, PrimaryButton } from './ui';
import './completion.css';

export interface CelebrationEvent {
  id: string;
  kind: 'milestone' | 'session' | 'recovery';
  title?: string; // milestone title: only set for kind === 'milestone'
  quote: Quote;
  // The coach's one-line reaction to what you filled in (engine/coach.ts).
  coachNote?: string;
  // The logs this moment is about: one for a training, several for "Alles
  // opslaan" (one summary instead of one screen each). Empty for a milestone
  // you marked yourself.
  logIds?: string[];
}

const CLOSE_MS = 200;
const EYEBROW: Record<CelebrationEvent['kind'], string> = { milestone: 'Kamp behaald', session: 'Gedaan', recovery: 'Herstel gedaan' };

// Mounted unconditionally in App.tsx, driven entirely by AppDataContext's
// `celebration` state, so it works no matter which screen triggered it
// (logging a session on Today, the watch or MacroFactor card, "markeer als
// behaald" on Ascend). A calm full screen: the training and its facts, three
// lines that mean something (your goal, your week, your legs) and the quote.
// One button goes on; the debrief (components/DebriefSheet.tsx) opens after
// it, as before. Stays until you go on, so the quote gets read.
export function CompletionMoment({ event, onDismiss }: { event: CelebrationEvent | null; onDismiss: () => void }) {
  if (!event) return null;
  return <CompletionScreen key={event.id} event={event} onDismiss={onDismiss} />;
}

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

function CompletionScreen({ event, onDismiss }: { event: CelebrationEvent; onDismiss: () => void }) {
  const { closing, requestClose } = useSheetClose(onDismiss, CLOSE_MS);
  const { sessionLogs, plannedSessions, templates, trainingGoals, goalMilestones, goalMilestoneProgress } = useAppData();
  const legs = useLegFatigueInputs();
  const summary = useMemo(
    () => completionSummary({
      logs: sessionLogs,
      logIds: event.logIds ?? [],
      templates,
      plannedSessions,
      goals: trainingGoals,
      goalMilestones,
      goalMilestoneProgress,
      legs,
      today: todayISO(),
      milestoneTitle: event.kind === 'milestone' ? event.title : undefined,
    }),
    [sessionLogs, plannedSessions, templates, trainingGoals, goalMilestones, goalMilestoneProgress, legs, event],
  );
  const { facts, lines } = summary;
  const flag = event.kind === 'milestone';

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[60] overflow-y-auto ${closing ? 'completion-out' : 'completion-in'}`}
        style={{ background: 'var(--color-bg)' }}
        aria-label={flag ? 'Kamp behaald' : 'Training gedaan'}
        onClick={(e) => {
          if (e.target === e.currentTarget) requestClose();
        }}
      >
        <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col px-4">
          <Contours flag={flag} />

          <div className="relative flex flex-1 flex-col pt-14">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 mt-[14px]" style={{ height: 80 }} aria-hidden="true" />
              <div className="completion-rise" style={delay(300)}>
                <Eyebrow>{summary.count > 1 ? 'Opgeslagen' : EYEBROW[event.kind]}</Eyebrow>
              </div>
              <h1 className="completion-rise mt-2 font-display text-[28px] leading-tight" style={{ color: 'var(--color-ink)', ...delay(320) }}>
                {summary.title}
              </h1>
              {facts.main.length > 0 && (
                <p className="completion-rise mt-2 text-balance text-[15px] tabular-nums" style={{ color: 'var(--color-ink-dim)', ...delay(360) }}>
                  {facts.main.join(' · ')}
                </p>
              )}
              {facts.extra.length > 0 && (
                <p className="completion-rise mt-1 text-balance text-[13px] tabular-nums" style={{ color: 'var(--color-ink-dim)', ...delay(380) }}>
                  {facts.extra.join(' · ')}
                </p>
              )}
              {facts.fromWatch && (
                <p className="completion-rise mt-1 text-xs" style={{ color: 'var(--color-stone)', ...delay(400) }}>
                  Cijfers van je horloge
                </p>
              )}
            </div>

            {event.coachNote && (
              <p
                className="completion-rise mt-5 border-l-2 pl-3 text-[14.5px] leading-snug"
                style={{ borderColor: 'var(--color-bronze)', color: 'var(--color-ink)', ...delay(440) }}
              >
                {event.coachNote}
              </p>
            )}

            {lines.length > 0 && (
              <Card className="mt-5 !py-1">
                {lines.map((line, i) => (
                  <LineRow key={line.id} line={line} first={i === 0} at={480 + i * 70} />
                ))}
              </Card>
            )}

            <QuoteBlock quote={event.quote} at={720} />

            <div
              className="completion-rise sticky bottom-0 -mx-4 mt-auto px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-6"
              style={{ background: 'linear-gradient(to top, var(--color-bg) 65%, transparent)', ...delay(780) }}
            >
              <PrimaryButton onClick={requestClose}>Verder</PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// The contour lines around the tick are a height line on a map: the ring and
// the tick are drawn, then two contours are inked in. For a cleared camp the
// glyph is the peak, and the flag goes up once.
function Contours({ flag }: { flag: boolean }) {
  const CX = 195;
  const CY = 110;
  const rings = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ rx: 70 + i * 34, ry: 54 + i * 27, opacity: 0.22 - i * 0.026 }));
  return (
    <svg
      viewBox="0 0 390 360"
      preserveAspectRatio="xMidYMin slice"
      className="pointer-events-none absolute inset-x-0 top-0 h-[360px] w-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="completion-glow" cx="50%" cy="31%" r="55%">
          <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="390" height="360" fill="url(#completion-glow)" className="completion-appear" style={delay(0)} />
      <g className="completion-appear" style={delay(0)}>
        {rings.map((r) => (
          <ellipse key={r.rx} cx={CX} cy={CY} rx={r.rx} ry={r.ry} fill="none" stroke="var(--color-bronze)" strokeOpacity={r.opacity} strokeWidth="1" />
        ))}
      </g>
      <ellipse cx={CX} cy={CY} rx="138" ry="108" fill="none" stroke="var(--color-gold)" strokeWidth="1.8" strokeLinecap="round" pathLength={100} strokeDashoffset={-52} opacity="0.9" className="completion-ink" style={{ '--ink': '38 62', '--d': '560ms' } as CSSProperties} />
      <ellipse cx={CX} cy={CY} rx="104" ry="81" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" strokeLinecap="round" pathLength={100} strokeDashoffset={-58} opacity="0.6" className="completion-ink" style={{ '--ink': '22 78', '--d': '700ms' } as CSSProperties} />
      <circle cx={CX} cy={CY} r="40" fill="var(--color-bg)" fillOpacity="0.7" className="completion-appear" style={delay(0)} />
      <circle cx={CX} cy={CY} r="39" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" pathLength={100} className="completion-draw" style={{ ...delay(100), transformOrigin: `${CX}px ${CY}px`, transform: 'rotate(-90deg)' }} />
      {flag ? (
        <g transform={`translate(${CX - 20} ${CY - 20}) scale(1.667)`} fill="none" stroke="var(--color-gold)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 19l6-10 3.5 5.5 2.5-3.5L21 19z" pathLength={100} className="completion-draw" style={{ ...delay(420), '--t': '0.5s' } as CSSProperties} />
          <path d="M15 11V5.5l3 1-3 1" className="completion-flag" style={delay(820)} />
        </g>
      ) : (
        <path d={`M${CX - 15} ${CY + 1} l9 9 l21 -21`} fill="none" stroke="var(--color-gold)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength={100} className="completion-draw" style={{ ...delay(420), '--t': '0.28s' } as CSSProperties} />
      )}
    </svg>
  );
}

function LineRow({ line, first, at }: { line: CompletionLine; first: boolean; at: number }) {
  return (
    <div
      className="completion-rise flex min-h-[52px] items-center gap-3 py-2.5 text-[14.5px] leading-snug"
      style={{ borderTop: first ? undefined : '1px solid var(--color-card-border)', color: 'var(--color-ink)', ...delay(at) }}
    >
      <span className="shrink-0" style={{ color: line.id === 'goal' ? 'var(--color-bronze)' : line.id === 'week' ? 'var(--color-success-text)' : 'var(--color-ink-dim)' }}>
        <LineIcon id={line.id} />
      </span>
      <span>
        {line.text}
        {line.note && <span style={{ color: 'var(--color-ink-dim)' }}> {line.note}</span>}
      </span>
    </div>
  );
}

function LineIcon({ id }: { id: CompletionLine['id'] }) {
  const paths: Record<CompletionLine['id'], ReactNode> = {
    goal: (
      <>
        <path d="M3 19l6-10 3.5 5.5 2.5-3.5L21 19z" />
        <path d="M15 11V5.5l3 1-3 1" />
      </>
    ),
    week: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
    legs: (
      <>
        <path d="M3 18h18" />
        <path d="M6.5 18a5.5 5.5 0 0 1 11 0" />
        <path d="M12 6.5V8.5" />
        <path d="M5.6 10.1l1.3 1.3" />
        <path d="M18.4 10.1l-1.3 1.3" />
        <path d="M7 21h10" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[id]}
    </svg>
  );
}

// The quote in Dutch with its source, as in the design; without a
// translation the original words and the author.
function QuoteBlock({ quote, at }: { quote: Quote; at: number }) {
  const nl = QUOTE_NL[quote.id];
  const text = nl?.text ?? quote.quote;
  const source = nl ? [nl.author, nl.source].filter(Boolean).join(', ') : quote.author;
  return (
    <figure className="completion-rise mx-3 mt-6 text-center" style={delay(at)}>
      <blockquote className="font-display text-[17px] leading-relaxed" style={{ color: 'var(--color-ink)' }}>“{text}”</blockquote>
      <figcaption className="mt-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{source}</figcaption>
    </figure>
  );
}
