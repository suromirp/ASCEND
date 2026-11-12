import { useNavigate } from 'react-router-dom';
import { Card } from '../ui';
import { ChevronGlyph } from '../vandaag/glyphs';

// Het beeld van Je stand in twee seconden: drie regels op de lucht, Benen, Belasting en Ritme, in de vorm van
// het blok Stand en morgen op Vandaag. Links het vaste woord gedempt met een vaste breedte, daarnaast het oordeel
// in gewone inkt (Inter, halfvet) met eronder het ene feit, rechts een pijltje. Elke regel opent zijn eigen
// scherm onder /stand (docs/visie/Ontwerp Stand minimaal.md, 2). Let op is alleen een amber stip voor het
// vaste woord, met dezelfde grenzen als op Vandaag (engine/standPage.ts#standWarnings).

export interface SummaryLine { id: string; label: string; word: string; fact: string; to: string; warn: boolean }

export function StandSummary({ lines }: { lines: SummaryLine[] }) {
  const navigate = useNavigate();
  return (
    <Card className="!p-0">
      <ul aria-label="Je stand in drie regels">
        {lines.map((l) => (
          <li key={l.id} className="border-t first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
            <button
              type="button"
              onClick={() => navigate(l.to, { state: { from: 'stand' } })}
              aria-label={`${l.label}: ${l.word}, ${l.fact}${l.warn ? ', let op' : ''}. Open ${l.label}.`}
              data-stand-line={l.id}
              className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left"
            >
              <span className="flex w-[88px] shrink-0 items-center gap-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                {l.warn && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-warning)' }} />}
                {l.label}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{l.word}</span>
                <span className="text-xs leading-snug tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{l.fact}</span>
              </span>
              <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><ChevronGlyph /></span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
