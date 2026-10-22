import { useState } from 'react';
import type { PainReport } from '../models/checkIn';
import { PAIN_AREA_OPTIONS } from '../data/bodyAreas';
import { BONE_RISK_AREAS, PAIN_HOLDS_BACK } from '../engine/pain';

// "Pijn op een plek?" after a session (docs/onderzoek/Pijn spierpijn en
// vermoeidheid melden.md): pain you can point at in a tendon, joint or bone,
// with a score, apart from muscle soreness (asked the next morning).
export function PainReportFields({ value, onChange }: { value: PainReport[]; onChange: (next: PainReport[]) => void }) {
  const [asked, setAsked] = useState<boolean | undefined>(value.length > 0 ? true : undefined);
  const chip = (on: boolean, warn = true) => ({
    borderColor: on ? (warn ? 'var(--color-warning)' : 'var(--color-gold)') : 'var(--color-card-border)',
    color: on ? (warn ? 'var(--color-warning)' : 'var(--color-gold)') : 'var(--color-ink-dim)',
  });
  const update = (area: string, patch: Partial<PainReport>) => onChange(value.map((p) => (p.area === area ? { ...p, ...patch } : p)));

  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Pijn op een plek? Een pees, gewricht of bot dat je kunt aanwijzen.</p>
      <div className="mt-2 flex gap-2">
        {([false, true] as const).map((yes) => (
          <button key={String(yes)} onClick={() => { setAsked(yes); if (!yes) onChange([]); }} aria-pressed={asked === yes} className="min-h-[44px] flex-1 rounded-lg border text-xs font-semibold" style={chip(asked === yes, yes)}>
            {yes ? 'Ja' : 'Nee'}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Spierpijn vragen we morgenochtend.</p>

      {asked && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {PAIN_AREA_OPTIONS.map((area) => {
              const on = value.some((p) => p.area === area);
              return (
                <button
                  key={area}
                  aria-pressed={on}
                  onClick={() => onChange(on ? value.filter((p) => p.area !== area) : [...value, { area, score: 3 }])}
                  className="min-h-[44px] rounded-lg border px-3 text-xs"
                  style={chip(on)}
                >
                  {area}
                </button>
              );
            })}
          </div>

          {value.map((p) => (
            <div key={p.area} className="flex flex-col gap-2.5 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{p.area}</p>
                <div className="flex gap-1">
                  {(['links', 'rechts', 'beide'] as const).map((side) => (
                    <button key={side} onClick={() => update(p.area, { side: p.side === side ? undefined : side })} aria-pressed={p.side === side} className="min-h-[44px] rounded-md border px-2 text-xs" style={chip(p.side === side, false)}>
                      {side}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoeveel, op het ergste moment? 1 is net te voelen, 10 is niet door te lopen.</p>
                <div className="mt-1.5 grid grid-cols-10 gap-1" role="radiogroup" aria-label={`Pijn ${p.area} van 1 tot 10`}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      role="radio"
                      aria-checked={p.score === n}
                      onClick={() => update(p.area, { score: n })}
                      className="min-h-[44px] rounded-md border text-xs tabular-nums"
                      style={{
                        borderColor: p.score === n ? 'var(--color-warning)' : 'var(--color-card-border)',
                        background: p.score === n ? 'var(--color-warning)' : 'transparent',
                        color: p.score === n ? 'var(--color-bg)' : n >= 6 ? 'var(--color-warning)' : 'var(--color-ink-dim)',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Werd het erger naarmate je doorging?" on={!!p.worseDuring} onChange={(v) => update(p.area, { worseDuring: v || undefined })} />
              {BONE_RISK_AREAS.includes(p.area) && p.score >= PAIN_HOLDS_BACK && (
                <Toggle label="Zit het op één plekje op het bot?" on={!!p.onBone} onChange={(v) => update(p.area, { onBone: v || undefined })} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: 'var(--color-ink)' }}>{label}</span>
      <div className="flex gap-1">
        {([false, true] as const).map((v) => (
          <button key={String(v)} onClick={() => onChange(v)} aria-pressed={on === v} className="min-h-[44px] rounded-md border px-2.5 text-xs" style={{ borderColor: on === v ? (v ? 'var(--color-warning)' : 'var(--color-gold)') : 'var(--color-card-border)', color: on === v ? (v ? 'var(--color-warning)' : 'var(--color-gold)') : 'var(--color-ink-dim)' }}>
            {v ? 'ja' : 'nee'}
          </button>
        ))}
      </div>
    </div>
  );
}
