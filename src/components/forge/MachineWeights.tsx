// ASCEND: de standen van een toestel invullen. Eén formulier, twee bladen: in Forge (het menu van een
// oefening en de regel als geen gewicht past) en in de instellingen. Geen rekenwerk; dat staat in
// engine/toestelStanden.ts en engine/machineWeights.ts. Opslaan gaat alles of niets, met een grens in tijd
// (storage/machineStands.ts). Besluit: docs/beslissingen/2026-11-09-forge-toestelstanden.md.
//
// Van boven naar beneden: de uitleg, de standen als chips die je wegstreept, Stand toevoegen, "Veel tegelijk"
// (de bestaande Lijst en Bereik, wat eruit komt wordt bij de standen gevoegd), de keuze wat Forge voorstelt,
// Annuleren en Opslaan, en Standen wissen (met Terugdraaien). Er is geen `key` op het formulier: komt het
// inlezen later binnen, dan staan de standen er vanzelf bij en blijft wat je al invulde staan.

import { useId, useState } from 'react';
import { exerciseById } from '../../data/exercises';
import { addOnsFor, formatAddOns, formatMachineWeights, parseMachineWeights, rangeProblem, poundRangeFor, rangeWeights, weightsFromRange, type ParsedList, type WeightRange } from '../../engine/machineWeights';
import { standsFor, mergeStands, STAND_LIMITS, STANDS_WIPED_TEXT, type StandsBefore } from '../../engine/toestelStanden';
import { RANGE_LIMITS, type RangeUnit, resolveStrengthSettings, type GymProfile, type StrengthSettings } from '../../engine/strengthSettings';
import { clearStandsNow, restoreStandsNow, saveStandsNow } from '../../storage/machineStands';
import { useAppData } from '../../state/AppDataContext';
import { formatNumberNL } from '../../utils/number';
import { Sheet } from '../settings/Sheet';
import { ChoiceStrip } from '../ChoiceStrip';
import { TextButton } from '../TextButton';
import { PrimaryButton, SecondaryButton } from '../ui';
import { ForgeSheet } from './parts';
import { useSeedStands, useStandIo } from './useForgeStands';

type RangeDraft = { start: string; end: string; step: string; removed: number[]; unit: RangeUnit };

// "4,5" of "4.5"; undefined als het geen getal is.
function toKg(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : undefined;
}

const kgText = (n: number) => formatNumberNL(n, 2);
const EMPTY_DRAFT: RangeDraft = { start: '', end: '', step: '', removed: [], unit: 'kg' };
const isBlank = (d: RangeDraft) => d.start.trim() === '' && d.end.trim() === '' && d.step.trim() === '';

// Het bereik van een concept: de getallen en wat er mis mee is.
function readDraft(d: RangeDraft): { range?: WeightRange; problem?: string; all: number[] } {
  // Op 0,01 afgerond, net als bij opslaan: wat je ziet is wat er bewaard wordt.
  const round = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * 100) / 100);
  const startKg = round(toKg(d.start));
  const endKg = round(toKg(d.end));
  const stepKg = round(toKg(d.step));
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

const SAVE_FAILED = 'Opslaan lukte niet. Probeer het nog eens.';
const FULL = `Dit toestel heeft al ${STAND_LIMITS.maxCount} standen. Haal er een weg.`;

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
  const io = useStandIo();
  const exercise = exerciseById(exerciseId);
  const now = standsFor(profile, exercise);
  const [added, setAdded] = useState<number[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  // Jouw keuze in dit blad; zolang je niets koos geldt wat er staat (ook als het inlezen later binnenkomt).
  const [onlyChoice, setOnly] = useState<boolean | undefined>(undefined);
  const only = onlyChoice ?? now?.only ?? false;
  // Na Standen wissen: wat er stond, voor Terugdraaien. Het blad blijft open zodat de regel te zien is.
  const [wiped, setWiped] = useState<StandsBefore | null>(null);
  const [mode, setMode] = useState<'list' | 'range'>('list');
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<RangeDraft[]>([EMPTY_DRAFT]);
  const [extra, setExtra] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const id = useId();
  const addOns = addOnsFor(profile, exercise);

  // De standen die er zijn plus wat je er in dit blad bij zette, oplopend. Een doorgestreepte staat er nog, maar telt niet mee.
  const shown = mergeStands(now?.kg ?? [], added).kg;
  const kept = shown.filter((w) => !removed.includes(w));

  const parsed: ParsedList = text.trim() === '' ? { ok: true, list: [] } : parseMachineWeights(text);
  const loose = parsed.ok ? parsed.list : [];
  const setLoose = (list: number[]) => setText(formatMachineWeights([...new Set(list)].sort((a, b) => a - b)));
  const reads = drafts.map(readDraft);
  const used = drafts.map((d, i) => ({ d, r: reads[i] })).filter(({ d }) => !isBlank(d));
  const ranges = used.map(({ r }) => r.range).filter((r): r is WeightRange => !!r);
  const badRead = used.find(({ r }) => !r.range);
  const bulk = [...loose, ...ranges.flatMap(rangeWeights)];
  const problem = !parsed.ok ? parsed.reason : badRead ? badRead.r.problem : undefined;
  const showError = touched && !!problem;
  // Wat er na Opslaan staat: de standen die overblijven plus wat je bij Veel tegelijk invulde.
  const result = mergeStands(kept, bulk);

  const setDraft = (i: number, patch: Partial<RangeDraft>) => {
    setTouched(true);
    setDrafts((all) => all.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  };
  const addExtra = (kg: number) => {
    setTouched(true);
    setLoose([...loose, kg]);
  };
  const extraKg = toKg(extra);
  const extraOk = extraKg !== undefined && extraKg >= STAND_LIMITS.minKg && extraKg <= STAND_LIMITS.maxKg;
  const full = kept.length >= STAND_LIMITS.maxCount;

  async function save() {
    if (problem) return setTouched(true);
    if (result.tooMany) return;
    setBusy(true);
    setFailed(false);
    try {
      const out = await saveStandsNow({ exercise, kg: result.kg, only }, io);
      if (out.kind === 'saved') {
        onSaved?.(out.settings);
        onDone();
        return;
      }
      if (out.kind === 'failed') setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  async function wipe() {
    setBusy(true);
    setFailed(false);
    try {
      const out = await clearStandsNow({ exercise }, io);
      if (out.kind === 'saved') {
        onSaved?.(out.settings);
        setAdded([]);
        setRemoved([]);
        setOnly(undefined);
        setWiped(out.before);
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  // Terugdraaien: precies wat er stond komt terug, alles of niets.
  async function undoWipe() {
    if (!wiped) return;
    setBusy(true);
    setFailed(false);
    try {
      const out = await restoreStandsNow({ before: wiped }, io);
      if (out.kind === 'saved') {
        onSaved?.(out.settings);
        setWiped(null);
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Dit zijn de gewichten die je op dit toestel in {profile.name} gebruikte. Minder en Meer springen van stand naar stand.
      </p>
      {shown.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={`Standen van ${exerciseName}, tik om er een weg te halen`}>
          {shown.map((w) => {
            const on = !removed.includes(w);
            return (
              <WeightChip
                key={w}
                kg={w}
                on={on}
                label={`${kgText(w)} kg, ${on ? 'tik om weg te halen' : 'weggehaald, tik om terug te zetten'}`}
                onClick={() => {
                  setTouched(true);
                  setRemoved((r) => (on ? [...r, w] : r.filter((x) => x !== w)));
                }}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Nog geen standen. Tik tijdens een training het getal dat op het blok staat; Forge onthoudt het.
        </p>
      )}
      <div className="flex items-end gap-2">
        <KgField label="Stand toevoegen" value={extra} placeholder="20" onChange={setExtra} />
        <SecondaryButton
          disabled={!extraOk || full}
          onClick={() => {
            if (extraKg === undefined) return;
            setTouched(true);
            setAdded((a) => [...a, extraKg]);
            setRemoved((r) => r.filter((x) => x !== extraKg));
            setExtra('');
          }}
        >
          Toevoegen
        </SecondaryButton>
      </div>
      {full && (
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{FULL}</p>
      )}

      <h3 className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Veel tegelijk</h3>
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Heeft het blok vaste stappen, vul ze dan in één keer in. Ze komen bij de standen hierboven.
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
          </div>
          {showError && (
            <p className="text-xs leading-snug" role="alert" style={{ color: 'var(--color-danger-text)' }}>
              {problem}
            </p>
          )}
        </>
      )}
      <ChoiceStrip
        label="Wat Forge voorstelt"
        options={[
          { value: 'estimate', label: 'Ook schatten' },
          { value: 'only', label: 'Alleen deze standen' },
        ]}
        value={only ? 'only' : 'estimate'}
        onChange={(v) => v && setOnly(v === 'only')}
      />
      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Met ook schatten stelt Forge ook gewichten tussen en boven je standen voor. Bij alleen deze standen nooit een gewicht dat je niet intikte.
      </p>
      {result.tooMany && (
        <p className="text-xs leading-snug" role="alert" style={{ color: 'var(--color-danger-text)' }}>{FULL}</p>
      )}
      {failed && (
        <p className="text-xs leading-snug" role="alert" style={{ color: 'var(--color-danger-text)' }}>{SAVE_FAILED}</p>
      )}
      <div className="flex gap-3">
        <SecondaryButton onClick={onDone}>Annuleren</SecondaryButton>
        <PrimaryButton fullWidth={false} disabled={busy || result.tooMany || (!!problem && touched)} onClick={() => void save()}>
          Opslaan
        </PrimaryButton>
      </div>
      {wiped ? (
        <div className="flex items-center justify-between gap-3" role="status">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{STANDS_WIPED_TEXT}</p>
          <TextButton disabled={busy} onClick={() => void undoWipe()}>
            Terugdraaien
          </TextButton>
        </div>
      ) : (
        shown.length > 0 && (
          <TextButton tone="danger" disabled={busy} onClick={() => void wipe()}>
            Standen wissen
          </TextButton>
        )
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
  useSeedStands(exerciseId);
  const name = exerciseById(exerciseId)?.name ?? exerciseId;
  return (
    <Sheet eyebrow="Je sportschool" title={name} line={profile.name} onClose={onClose}>
      {(close) => <MachineWeightsForm exerciseId={exerciseId} exerciseName={name} profile={profile} onDone={close} />}
    </Sheet>
  );
}

// In Forge, met `onSaved` om meteen opnieuw te kijken of er een lichter gewicht past.
export function MachineWeightsForgeSheet({ exerciseId, onSaved, onClose }: { exerciseId: string; onSaved?: (next: StrengthSettings) => void; onClose: () => void }) {
  const profile = useActiveProfile();
  useSeedStands(exerciseId);
  const name = exerciseById(exerciseId)?.name ?? exerciseId;
  return (
    <ForgeSheet title={name} sub={profile.name} onClose={onClose}>
      {(close) => <MachineWeightsForm exerciseId={exerciseId} exerciseName={name} profile={profile} onDone={close} onSaved={onSaved} />}
    </ForgeSheet>
  );
}
