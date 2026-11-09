// De blokken onderaan "Run in detail" (docs/visie/Run in detail.md, 4.7 tot 4.10): loopvorm,
// wat opvalt, tegen je eerdere runs en het advies voor de volgende keer. Elk blok staat er
// alleen als er gegevens voor zijn; de inhoud komt uit engine/runDetailView.ts.

import { useState } from 'react';
import type { RunDetail } from '../../models/runDetail';
import type { FormKey, RunAdvice, RunPattern, SimilarComparison } from '../../engine/runDetailView';
import { FORM_INFO, formFactLine, formSeries } from '../../engine/runDetailView';
import { formatPace } from '../../engine/aerobicTrend';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow, InfoButton, Segmented } from '../ui';
import { KmLineChart } from './RunDetailCharts';
import { ExplainSheet } from './RunDetailSheets';

const dim = { color: 'var(--color-ink-dim)' };
const ink = { color: 'var(--color-ink)' };

// 4.7: one figure at a time, with what it is and one fact from this run.
export function FormCard({ rd, keys }: { rd: RunDetail; keys: FormKey[] }) {
  const [key, setKey] = useState<FormKey>(keys[0]);
  const shown = keys.includes(key) ? key : keys[0];
  const info = FORM_INFO[shown];
  const points = formSeries(rd, shown);
  const fact = formFactLine(rd, shown);
  return (
    <Card>
      <Eyebrow>Loopvorm</Eyebrow>
      {keys.length > 1 && (
        <div className="mt-3">
          {keys.length <= 3 ? (
            <Segmented tall label="Grootheid" value={shown} onChange={setKey} options={keys.map((k) => ({ value: k, label: FORM_INFO[k].label }))} />
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Grootheid">
              {keys.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={k === shown}
                  onClick={() => setKey(k)}
                  className="min-h-[44px] rounded-full border px-4 text-sm"
                  style={{
                    borderColor: k === shown ? 'var(--color-action)' : 'var(--color-control-border)',
                    background: k === shown ? 'var(--color-action-muted)' : 'transparent',
                    color: k === shown ? 'var(--color-ink)' : 'var(--color-ink-dim)',
                  }}
                >
                  {FORM_INFO[k].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-xs" style={dim}>{info.label} per kilometer, in {info.unit}</p>
      <div className="mt-1">
        <KmLineChart points={points} format={(v) => formatNumberNL(v, info.decimals)} />
      </div>
      <p className="mt-3 text-sm leading-snug" style={dim}>{info.meaning}</p>
      {fact && <p className="mt-2 text-sm leading-snug" style={ink}>{fact}</p>}
    </Card>
  );
}

// 4.8: at most three, each with its sheet "Waarom".
export function PatternsCard({ patterns }: { patterns: RunPattern[] }) {
  const [open, setOpen] = useState<RunPattern | null>(null);
  return (
    <Card>
      <Eyebrow>Wat opvalt</Eyebrow>
      {patterns.length === 0 ? (
        <p className="mt-2 text-sm leading-snug" style={ink}>Niets dat opvalt. Een gelijkmatige run.</p>
      ) : (
        <div className="mt-1 flex flex-col">
          {patterns.map((p) => (
            <div key={p.topic + p.text} className="flex min-h-[52px] items-start gap-3 border-t py-3 first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold" style={dim}>{p.topic}</p>
                <p className="mt-0.5 text-sm leading-snug" style={ink}>{p.text}</p>
              </div>
              <div className="pt-2"><InfoButton onClick={() => setOpen(p)} label={`Waarom: ${p.topic}`} /></div>
            </div>
          ))}
        </div>
      )}
      {open && (
        <ExplainSheet
          eyebrow={open.topic}
          title="Waarom"
          onClose={() => setOpen(null)}
          points={[
            { head: 'Vergeleken', text: open.why.compared },
            { head: 'Hoe sterk', text: open.why.strength },
            { head: 'Wat het kan betekenen', text: open.why.meaning },
          ]}
        />
      )}
    </Card>
  );
}

// 4.9: against earlier runs the gate chose, or one sentence why not.
export function CompareCard({ rd, comparison, reason }: { rd: RunDetail; comparison?: SimilarComparison; reason?: string }) {
  const own = rd.kms.filter((k) => !k.partial).map((k) => ({ km: k.index, value: k.paceSecKm }));
  const median = comparison?.medianPerKm.flatMap((v, i) => (v === null || rd.kms[i]?.partial ? [] : [{ km: i + 1, value: v }])) ?? [];
  return (
    <Card>
      <Eyebrow>Tegen je eerdere runs</Eyebrow>
      {comparison ? (
        <>
          <p className="mt-2 text-sm leading-snug" style={dim}>Vergeleken met je {comparison.n} laatste runs van dezelfde soort en ongeveer dezelfde afstand.</p>
          <div className="mt-2 flex flex-col">
            {comparison.rows.map((r) => (
              <div key={r.label} className="border-t py-2.5 first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm" style={ink}>{r.label}</span>
                  <span className="text-sm font-semibold" style={{ color: r.word === 'Beter' ? 'var(--color-action)' : r.word === 'Slechter' ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{r.word}</span>
                </div>
                <p className="font-sans text-xs tabular-nums leading-snug" style={dim}>{r.value}, {r.note}</p>
              </div>
            ))}
          </div>
          {median.length >= 2 && own.length >= 2 && (
            <div className="mt-3">
              <p className="mb-1 text-xs" style={dim}>Tempo per kilometer: jij in mint, het midden van de eerdere runs gestippeld. Hoger is sneller.</p>
              <KmLineChart points={own} compare={median} color="var(--color-action)" invert format={formatPace} />
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm leading-snug" style={dim}>{reason ? `Niet te vergelijken: ${reason}.` : 'Niet te vergelijken.'}</p>
      )}
      <p className="mt-2 text-xs leading-snug" style={dim}>Je trend over weken staat op Stand, onder Lopen.</p>
    </Card>
  );
}

// 4.10 and 6.5: one or two suggestions, never a change of the planning.
export function AdviceCard({ advice }: { advice: RunAdvice }) {
  const [why, setWhy] = useState(false);
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>{advice.title}</Eyebrow>
        <InfoButton onClick={() => setWhy(true)} label="Waarom dit advies" />
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {advice.lines.map((l) => <p key={l} className="text-sm leading-snug" style={ink}>{l}</p>)}
      </div>
      {why && (
        <ExplainSheet
          eyebrow={advice.title}
          title="Waarom"
          onClose={() => setWhy(false)}
          points={[
            { head: 'Waar het op rust', text: advice.why },
            { head: 'Je planning', text: 'verandert niet door dit advies. Wil je iets aanpassen, dan gaat dat zoals altijd via een voorstel met Akkoord.' },
          ]}
        />
      )}
    </Card>
  );
}
