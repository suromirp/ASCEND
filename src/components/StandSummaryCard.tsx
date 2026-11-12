import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { useLegFatigueInputs } from './LegFatigueCard';
import { fatigueWord, legFatigueOn } from '../engine/legFatigue';
import { LOAD_JUMP, loadVersusBefore, weeklyLoad } from '../engine/standing';
import { standLines, type TomorrowEntry } from '../engine/yourDay';
import { ChevronGlyph } from './vandaag/glyphs';

// Vandaag → het blok Stand en morgen onder Je dag (docs/visie/Ontwerp Je dag.md, 4): korte regels
// zonder kop en zonder schijven. Links het vaste woord gedempt, rechts de waarde in gewone inkt,
// nooit een gekleurd woord in een zin. Let op is alleen een amber stip voor het vaste woord.
// `tomorrow` ontbreekt als de grote kaart al zegt dat er morgen niets staat.
export function StandSummaryCard({ tomorrow }: { tomorrow?: TomorrowEntry }) {
  const navigate = useNavigate();
  const { sessionLogs, plannedSessions, templates } = useAppData();
  const inputs = useLegFatigueInputs();
  const today = inputs.today;
  const legs = useMemo(() => legFatigueOn(today, inputs), [today, inputs]);
  const load = useMemo(() => loadVersusBefore(weeklyLoad({ logs: sessionLogs, plannedSessions, templates, today, minutesOf: inputs.minutesOf }, 4, 0)), [sessionLogs, plannedSessions, templates, today, inputs.minutesOf]);
  const { word, level } = fatigueWord(legs.index);
  const lines = standLines({ legsWord: word, legsLevel: level, load, loadJump: LOAD_JUMP, tomorrow });

  return (
    <ul aria-label="Stand en morgen" className="overflow-hidden rounded-2xl border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}>
      {lines.map((line) => (
        <li key={line.key} className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
          <button
            type="button"
            onClick={() => navigate(line.to)}
            aria-label={`${line.label}: ${line.value}${line.warn ? ', let op' : ''}`}
            data-stand-line={line.key}
            className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left"
          >
            <span className="flex w-[76px] shrink-0 items-center gap-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
              {line.warn && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-warning)' }} />}
              {line.label}
            </span>
            <span className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{line.value}</span>
            <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><ChevronGlyph /></span>
          </button>
        </li>
      ))}
    </ul>
  );
}
