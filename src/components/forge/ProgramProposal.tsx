// ASCEND: het trainingsprogramma uit een MacroFactor-export als voorstel voor
// de krachtsjablonen. Akkoord bewaart het; je planning en je logs blijven zoals
// ze zijn. Regels: engine/macrofactorProgram.ts. Besluit:
// docs/beslissingen/2026-10-22-programma-uit-macrofactor.md.

import { useState } from 'react';
import { buildStoredProgram, programCycle, proposeMapping, setsText, type MacroFactorProgram, type ProgramMapping } from '../../engine/macrofactorProgram';
import type { StoredStrengthProgram } from '../../engine/strengthProgramStore';
import { exerciseById } from '../../data/exercises';
import { matchExercise } from '../../engine/exerciseMatch';
import type { SessionTemplate } from '../../models/training';
import { todayISO } from '../../utils/dates';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../ui';
import { ForgeSheet } from './parts';

// Op de pagina MacroFactor inlezen: het gevonden programma en de knop naar het voorstel.
export function ProgramOfferCard({ program, current, onOpen }: { program: MacroFactorProgram; current?: StoredStrengthProgram; onOpen: () => void }) {
  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Trainingsprogramma</Eyebrow>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{program.name}</p>
        <p className="mt-0.5 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          {program.days.length} trainingen per week, {program.cycleCount} weken
        </p>
      </div>
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        ASCEND kan je krachttrainingen vullen met de oefeningen, sets, herhalingen en RIR van dit programma, per week. Je planning en wat je al deed blijven zoals ze zijn.
        {current ? ` Het vervangt ${current.name}.` : ''}
      </p>
      <SecondaryButton onClick={onOpen}>Voorstel bekijken</SecondaryButton>
    </Card>
  );
}

export function ProgramProposalSheet({
  program,
  templates,
  current,
  onAccept,
  onClose,
}: {
  program: MacroFactorProgram;
  templates: SessionTemplate[];
  current?: StoredStrengthProgram;
  onAccept: (stored: StoredStrengthProgram) => Promise<void> | void;
  onClose: () => void;
}) {
  const today = todayISO();
  const strength = templates.filter((t) => t.type === 'strength').sort((a, b) => (a.defaultDayOfWeek ?? 9) - (b.defaultDayOfWeek ?? 9));
  const [mapping, setMapping] = useState<ProgramMapping>(() => proposeMapping(program, templates, current));
  // Welke week van het programma deze week is: verder waar je was bij hetzelfde programma.
  const [week, setWeek] = useState(() => (current && current.name === program.name ? Math.min(program.cycleCount, programCycle(current, today) + 1) : 1));
  const [saving, setSaving] = useState(false);
  const stored = buildStoredProgram(program, mapping, today, week);
  const nameOf = (id: string) => strength.find((t) => t.id === id)?.name ?? id;

  function choose(dayName: string, templateId: string | null) {
    setMapping((m) => {
      const next: ProgramMapping = { ...m, [dayName]: templateId };
      // Eén sjabloon hoort bij één dag: een andere dag met dezelfde keuze laat los.
      if (templateId) for (const k of Object.keys(next)) if (k !== dayName && next[k] === templateId) next[k] = null;
      return next;
    });
  }

  return (
    <ForgeSheet title="Programma uit MacroFactor" sub={`${program.name}. Alleen de oefeningen van je krachttrainingen veranderen; je planning en je logs blijven.`} onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <Eyebrow>Welke training wordt wat</Eyebrow>
            {program.days.map((d) => (
              <div key={d.name} className="flex flex-col gap-2">
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{d.name}</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${d.name} wordt`}>
                  {[...strength.map((t) => ({ id: t.id as string | null, label: t.name })), { id: null, label: 'Niet gebruiken' }].map((o) => {
                    const on = (mapping[d.name] ?? null) === o.id;
                    return (
                      <button
                        key={o.id ?? 'geen'}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => choose(d.name, o.id)}
                        className="min-h-[44px] rounded-full border px-3 text-sm"
                        style={{ borderColor: on ? 'var(--color-ink)' : 'var(--color-card-border)', color: on ? 'var(--color-ink)' : 'var(--color-ink-dim)', background: on ? 'var(--color-surface)' : 'transparent' }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {program.cycleCount > 1 && (
            <section className="flex flex-col gap-2">
              <Eyebrow>Deze week is week</Eyebrow>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Week van het programma">
                {Array.from({ length: program.cycleCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={week === n}
                    onClick={() => setWeek(n)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border font-sans text-sm tabular-nums"
                    style={{ borderColor: week === n ? 'var(--color-ink)' : 'var(--color-card-border)', color: week === n ? 'var(--color-ink)' : 'var(--color-ink-dim)', background: week === n ? 'var(--color-surface)' : 'transparent' }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Elke maandag schuift het een week op. Na week {program.cycleCount} begint het weer bij week 1.</p>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <Eyebrow>Zo ziet deze week eruit</Eyebrow>
            {program.days.filter((d) => mapping[d.name]).map((d) => {
              const exercises = d.cycles[week - 1]?.length ? d.cycles[week - 1] : (d.cycles.find((c) => c.length > 0) ?? []);
              return (
                <div key={d.name} className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{nameOf(mapping[d.name]!)} <span className="font-normal" style={{ color: 'var(--color-ink-dim)' }}>· {d.name}</span></p>
                  <ul className="flex flex-col gap-1">
                    {exercises.map((e, i) => {
                      const known = matchExercise(e.name);
                      return (
                        <li key={`${e.name}-${i}`} className="text-xs leading-snug">
                          <span style={{ color: 'var(--color-ink)' }}>{known ? (exerciseById(known)?.name ?? e.name) : e.name}</span>
                          <span className="font-sans tabular-nums" style={{ color: 'var(--color-ink-dim)' }}> · {setsText(e.sets)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {!stored && <p className="text-xs" style={{ color: 'var(--color-warning)' }}>Kies voor minstens één dag een training.</p>}
          </section>

          <div className="flex gap-3">
            <SecondaryButton onClick={close}>Liever niet</SecondaryButton>
            <PrimaryButton
              fullWidth={false}
              disabled={!stored || saving}
              onClick={async () => {
                if (!stored) return;
                setSaving(true);
                await onAccept(stored);
                close();
              }}
            >
              {saving ? 'Opslaan…' : 'Akkoord'}
            </PrimaryButton>
          </div>
        </div>
      )}
    </ForgeSheet>
  );
}
