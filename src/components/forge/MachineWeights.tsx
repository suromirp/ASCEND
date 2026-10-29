// ASCEND: de gewichten van een toestel invullen. Eén formulier, twee bladen: in Forge (het menu
// van een oefening en de regel als geen gewicht past) en in de instellingen. Geen rekenwerk;
// dat staat in engine/machineWeights.ts. Besluit: docs/beslissingen/2026-10-26-gewichten-per-toestel.md.

import { useId, useState } from 'react';
import { exerciseById } from '../../data/exercises';
import { MACHINE_LIST_LIMITS, addOnsFor, cleanMachineList, formatAddOns, formatMachineWeights, ownWeightsFor, parseMachineWeights, rangeProblem, poundRangeFor, rangeWeights, rangesFor, weightsFromRange, withMachineSetup, type ParsedList, type WeightRange } from '../../engine/machineWeights';
import { RANGE_LIMITS, type RangeUnit, normalizeStrengthSettings, resolveStrengthSettings, type GymProfile, type StrengthSettings } from '../../engine/strengthSettings';
import { useAppData } from '../../state/AppDataContext';
import { formatNumberNL } from '../../utils/number';
import { Sheet } from '../settings/Sheet';
import { ChoiceStrip } from '../ChoiceStrip';
import { TextButton } from '../TextButton';
import { PrimaryButton, SecondaryButton } from '../ui';
import { ForgeSheet } from './parts';

// Zet of wist de losse gewichten en bereiken van één toestel in het actieve profiel. Geeft de nieuwe
// instellingen terug, zodat de aanroeper er meteen mee kan rekenen.
function useSaveMachineWeights() {
  const { settings, updateSettings } = useAppData();
  return (exerciseId: string, setup: { list?: number[]; ranges?: WeightRange[] }): StrengthSettings => {
    const next = normalizeStrengthSettings(withMachineSetup(settings.strengthModel, exerciseId, setup)) ?? {};
    void updateSettings({ strengthModel: next });
    return next;
  };
}

type RangeDraft = { start: string; end: string; step: string; removed: number[]; unit: RangeUnit };

// "4,5" of "4.5"; undefined als het geen getal is.
function toKg(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : undefined;
}

const kgText = (n: number) => formatNumberNL(n, 2);
const draftOf = (r: WeightRange): RangeDraft => ({ start: String(r.startKg).replace('.', ','), end: String(r.endKg).replace('.', ','), step: String(r.stepKg).replace('.', ','), removed: r.removedKg ?? [], unit: r.unit ?? 'kg' });
const EMPTY_DRAFT: RangeDraft = { start: '', end: '', step: '', removed: [], unit: 'kg' };
const isBlank = (d: RangeDraft) => d.start.trim() === '' && d.end.trim() === '' && d.step.trim() === '';

// Het bereik van een concept: de getallen en wat er mis mee is.
function readDraft(d: RangeDraft): { range?: WeightRange; problem?: string; all: number[] } {
  const startKg = toKg(d.start);
  const endKg = toKg(d.end);
  const stepKg = toKg(d.step);
  if (startKg === undefined || endKg === undefined || stepKg === undefined) return { problem: 'Vul begin, eind en stap in, met cijfers.', all: [] };
  const problem = rangeProblem(startKg, endKg, stepKg, d.unit);
  if (problem) return { problem, all: [] };
  const all = weightsFromRange(startKg, endKg, stepKg, d.unit);
  return { range: { startKg, endKg, stepKg, ...(d.unit === 'lb' ? { unit: 'lb' as const } : {}), ...(d.removed.length > 0 ? { removedKg: d.removed } : {}) }, all };
}

function WeightChip({ kg, on, onClick, label }: { kg: number; on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className="min-h-[44px] min-w-[44px] rounded-full border px-3 font-sans text-sm tabular-nums"
      style={{ borderColor: 'var(--color-control-border)', background: 'transparent', color: on ? 'var(--color-ink)' : 'var(--color-ink-dim)', textDecoration: on ? 'none' : 'line-through' }}
    >
      {kgText(kg)}
    </button>
  );
}

const inputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' } as const;

function KgField({ label, value, onChange, placeholder, unit = 'kg' }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; unit?: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</label>
      <div className="flex items-center gap-1">
        <input id={id} type="text" inputMode="decimal" value={value} autoComplete="off" spellCheck={false} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="min-h-[44px] w-full min-w-0 rounded-xl border px-2 text-base tabular-nums" style={inputStyle} />
        <span className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{unit}</span>
      </div>
    </div>
  );
}

function MachineWeightsForm({
  exerciseId,
  exerciseName,
  profile,
  onDone,
  onSaved,
}: {
  exerciseId: string;
  exerciseName: string;
  profile: GymProfile;
  // Sluit het blad.
  onDone: () => void;
  onSaved?: (next: StrengthSettings) => void;
}) {
  const save = useSaveMachineWeights();
  const exercise = exerciseById(exerciseId);
  const existing = ownWeightsFor(profile, exercise);
  const existingList = cleanMachineList(profile.exerciseWeightsKg?.[exerciseId]);
  const existingRanges = rangesFor(profile, exercise);
  const [mode, setMode] = useState<'list' | 'range'>(existingRanges.length > 0 ? 'range' : 'list');
  const [text, setText] = useState(existingList ? formatMachineWeights(existingList) : '');
  const [drafts, setDrafts] = useState<RangeDraft[]>(existingRanges.length > 0 ? existingRanges.map(draftOf) : [EMPTY_DRAFT]);
  const [extra, setExtra] = useState('');
  const [touched, setTouched] = useState(false);
  const id = useId();
  const addOns = addOnsFor(profile, exercise);

  const parsed: ParsedList = text.trim() === '' ? { ok: true, list: [] } : parseMachineWeights(text);
  const loose = parsed.ok ? parsed.list : [];
  const setLoose = (list: number[]) => setText(formatMachineWeights([...new Set(list)].sort((a, b) => a - b)));
  const reads = drafts.map(readDraft);
  const used = drafts.map((d, i) => ({ d, r: reads[i] })).filter(({ d }) => !isBlank(d));
  const ranges = used.map(({ r }) => r.range).filter((r): r is WeightRange => !!r);
  const badRead = used.find(({ r }) => !r.range);
  const anyWeights = loose.length > 0 || ranges.some((r) => rangeWeights(r).length > 0);
  const problem = !parsed.ok ? parsed.reason : badRead ? badRead.r.problem : !anyWeights ? 'Vul de gewichten in, als lijst of als bereik.' : undefined;
  const showError = touched && !!problem;

  const setDraft = (i: number, patch: Partial<RangeDraft>) => {
    setTouched(true);
    setDrafts((all) => all.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  };
  const addExtra = (kg: number) => {
    setTouched(true);
    setLoose([...loose, kg]);
  };
  const extraKg = toKg(extra);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        De gewichten van {exerciseName} in {profile.name}. Dan stelt ASCEND hier alleen gewichten uit deze opgave voor, en ze leert daarnaast van wat je echt gebruikt.
      </p>
      <ChoiceStrip
        label="Hoe vul je de gewichten in"
        options={[
          { value: 'list', label: 'Lijst' },
          { value: 'range', label: 'Bereik' },
        ]}
        value={mode}
        onChange={(v) => v && setMode(v)}
      />
      {mode === 'list' ? (
        <>
          <label htmlFor={id} className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Gewichten in kg, met een spatie ertussen</label>
          <input
            id={id}
            type="text"
            value={text}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={showError}
            aria-describedby={`${id}-info`}
            placeholder="4,5 9 13,5 18"
            onChange={(e) => {
              setText(e.target.value);
              setTouched(true);
            }}
            className="min-h-[44px] w-full rounded-xl border px-3 text-base tabular-nums"
            style={{ ...inputStyle, borderColor: showError ? 'var(--color-danger-text)' : 'var(--color-control-border)' }}
          />
          <p id={`${id}-info`} className="text-xs leading-snug" role={showError ? 'alert' : undefined} style={{ color: showError ? 'var(--color-danger-text)' : 'var(--color-ink-dim)' }}>
            {parsed.ok && loose.length > 0
              ? `${loose.length} ${loose.length === 1 ? 'gewicht' : 'gewichten'}, van ${kgText(loose[0])} tot ${kgText(loose[loose.length - 1])} kg.`
              : showError
                ? problem
                : 'Bijvoorbeeld 4,5 9 13,5 18.'}
          </p>
          {ranges.length > 0 && (
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Daarnaast {ranges.length === 1 ? 'telt je bereik' : 'tellen je bereiken'} mee. Kijk bij Bereik.
            </p>
          )}
        </>
      ) : (
        <>
          {drafts.map((d, i) => {
            const read = reads[i];
            const kept = read.range ? rangeWeights(read.range) : [];
            const endKg = toKg(d.end);
            const stepKg = toKg(d.step);
            const top = read.all[read.all.length - 1];
            const offStep = d.unit === 'kg' && read.range !== undefined && endKg !== undefined && top !== undefined && top !== endKg;
            const flagged = showError && !isBlank(d);
            const pound = d.unit === 'kg' && offStep && endKg !== undefined && stepKg !== undefined ? poundRangeFor(toKg(d.start) ?? 0, endKg, stepKg) : undefined;
            const unitText = d.unit;
            
            return (
              <div key={i} className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Bereik {i + 1}</span>
                  {drafts.length > 1 && (
                    <TextButton tone="dim" onClick={() => setDrafts((all) => all.filter((_, j) => j !== i))}>
                      Bereik weghalen
                    </TextButton>
                  )}
                </div>
                <ChoiceStrip
                  label="Eenheid van dit bereik"
                  options={[
                    { value: 'kg', label: 'kg' },
                    { value: 'lb', label: 'lb' },
                  ]}
                  value={d.unit}
                  onChange={(v) => v && setDraft(i, { unit: v, removed: [] })}
                />
                <div className="flex gap-2">
                  <KgField unit={unitText} label="Begin" value={d.start} placeholder={d.unit === 'lb' ? '10' : '4,5'} onChange={(v) => setDraft(i, { start: v, removed: [] })} />
                  <KgField unit={unitText} label="Eind" value={d.end} placeholder={d.unit === 'lb' ? '250' : '113'} onChange={(v) => setDraft(i, { end: v, removed: [] })} />
                  <KgField unit={unitText} label="Stap" value={d.step} placeholder={d.unit === 'lb' ? '15' : '7'} onChange={(v) => setDraft(i, { step: v, removed: [] })} />
                </div>
                {read.range ? (
                  <>
                    <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                      {kept.length > 0 ? `Hoogste gewicht: ${kgText(kept[kept.length - 1])} kg` : 'Alle gewichten zijn weggehaald.'}
                    </p>
                    {addOns.length > 0 && (
                      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                        Met tussengewichten {formatAddOns(addOns)} erbij.
                      </p>
                    )}
                    {offStep && endKg !== undefined && stepKg !== undefined && (
                      <div className="flex flex-col items-start gap-1">
                        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                          {kgText(endKg)} ligt niet op een stap van {kgText(stepKg)}; het hoogste is {kgText(top)}. Voeg {kgText(endKg)} toe als het blok daar eindigt.
                        </p>
                        {d.unit === 'kg' && !loose.includes(endKg) && <TextButton onClick={() => addExtra(endKg)}>{kgText(endKg)} toevoegen</TextButton>}
                      </div>
                    )}
                    {pound && (
                      <div className="flex flex-col items-start gap-1">
                        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                          Dit blok lijkt in pond: {pound.start} tot {pound.end} lb per {pound.step}. Zo omrekenen?
                        </p>
                        <TextButton onClick={() => setDraft(i, { unit: 'lb', start: String(pound.start), end: String(pound.end), step: String(pound.step), removed: [] })}>In pond</TextButton>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Gewichten van dit bereik, tik om er een weg te halen">
                      {read.all.map((w) => {
                        const on = !d.removed.includes(w);
                        return (
                          <WeightChip
                            key={w}
                            kg={w}
                            on={on}
                            label={`${kgText(w)} kg, ${on ? 'tik om weg te halen' : 'weggehaald, tik om terug te zetten'}`}
                            onClick={() => setDraft(i, { removed: on ? [...d.removed, w] : d.removed.filter((x) => x !== w) })}
                          />
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs leading-snug" role={flagged ? 'alert' : undefined} style={{ color: flagged ? 'var(--color-danger-text)' : 'var(--color-ink-dim)' }}>
                    {isBlank(d) ? 'Bijvoorbeeld begin 4,5, eind 113 en stap 7.' : read.problem}
                  </p>
                )}
              </div>
            );
          })}
          {drafts.length < RANGE_LIMITS.maxRanges && <TextButton onClick={() => setDrafts((all) => [...all, EMPTY_DRAFT])}>Bereik toevoegen</TextButton>}
          <div className="flex flex-col gap-2">
            <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Losse gewichten</span>
            {loose.length > 0 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Losse gewichten, tik om er een weg te halen">
                {loose.map((w) => (
                  <WeightChip key={w} kg={w} on label={`${kgText(w)} kg, tik om weg te halen`} onClick={() => setLoose(loose.filter((x) => x !== w))} />
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <KgField label="Gewicht" value={extra} placeholder="113" onChange={setExtra} />
              <SecondaryButton
                disabled={extraKg === undefined || extraKg < MACHINE_LIST_LIMITS.minKg || extraKg > MACHINE_LIST_LIMITS.maxKg}
                onClick={() => {
                  if (extraKg === undefined) return;
                  addExtra(extraKg);
                  setExtra('');
                }}
              >
                Gewicht toevoegen
              </SecondaryButton>
            </div>
          </div>
          {showError && (
            <p className="text-xs leading-snug" role="alert" style={{ color: 'var(--color-danger-text)' }}>
              {problem}
            </p>
          )}
        </>
      )}
      <div className="flex gap-3">
        <SecondaryButton onClick={onDone}>Annuleren</SecondaryButton>
        <PrimaryButton
          fullWidth={false}
          disabled={!!problem && touched}
          onClick={() => {
            if (problem) return setTouched(true);
            const next = save(exerciseId, { list: loose, ranges });
            onSaved?.(next);
            onDone();
          }}
        >
          Opslaan
        </PrimaryButton>
      </div>
      {existing && (
        <TextButton
          tone="danger"
          onClick={() => {
            const next = save(exerciseId, {});
            onSaved?.(next);
            onDone();
          }}
        >
          Lijst wissen
        </TextButton>
      )}
    </div>
  );
}

function useActiveProfile(): GymProfile {
  const { settings } = useAppData();
  return resolveStrengthSettings(settings.strengthModel).profile;
}

// In de instellingen.
export function MachineWeightsSheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const profile = useActiveProfile();
  const name = exerciseById(exerciseId)?.name ?? exerciseId;
  return (
    <Sheet eyebrow="Je sportschool" title={name} onClose={onClose}>
      {(close) => <MachineWeightsForm exerciseId={exerciseId} exerciseName={name} profile={profile} onDone={close} />}
    </Sheet>
  );
}

// In Forge, met `onSaved` om meteen opnieuw te kijken of er een lichter gewicht past.
export function MachineWeightsForgeSheet({ exerciseId, onSaved, onClose }: { exerciseId: string; onSaved?: (next: StrengthSettings) => void; onClose: () => void }) {
  const profile = useActiveProfile();
  const name = exerciseById(exerciseId)?.name ?? exerciseId;
  return (
    <ForgeSheet title={`Gewichten van ${name}`} sub={profile.name} onClose={onClose}>
      {(close) => <MachineWeightsForm exerciseId={exerciseId} exerciseName={name} profile={profile} onDone={close} onSaved={onSaved} />}
    </ForgeSheet>
  );
}
