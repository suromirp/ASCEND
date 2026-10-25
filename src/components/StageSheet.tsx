// ASCEND — het detailscherm van één GR5-etappe: de officiële cijfers, de
// etappe naast je beste dag, het bivakregime van het gebied, water en winkel
// waar die bekend zijn, en je eigen plan (slaapplek, samenvoegen, rustdag).
// Alle regels komen uit engine/routePlan.ts; dit bestand toont en zet keuzes.

import type { ReactNode } from 'react';
import { SLEEP_KINDS, SLEEP_LABEL, type RoutePlan, type StageChoice } from '../models/routePlan';
import { EARLY_START_NOTE, GR5_SECTIONS, GR5_STAGES, STAGES_SOURCE, STAGES_TAKEN_ON, type Gr5Stage, type StageFact } from '../data/gr5Stages';
import { BIVOUAC_CHECK_NOTE, BIVOUAC_EVERYWHERE } from '../data/gr5Bivouac';
import { canMergeWithNext, compareWithBest, formatStageTime, hasHighPass, regimesOf, sleepWarning, stageIndex, type DayCompareRow, type ItineraryDay } from '../engine/routePlan';
import type { SessionLog } from '../models/training';
import { stageWaterBasisLine, stageWaterLine, waterPointsLine, type StageWater } from '../engine/stageWater';
import { formatDateNL, formatHoursMinutesNL, weekdayLongNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, Toggle } from './ui';
import { Icon } from './icons';

const SOURCE_LABEL: Record<StageFact['source'], string> = {
  gta: 'Bron: officiële site',
  rapport: 'Bron: onderzoek naar de GR5 met tent',
};

const COMPARE_LABEL: Record<DayCompareRow['key'], string> = {
  tijd: 'Tijd op de been',
  stijgen: 'Omhoog',
  dalen: 'Omlaag',
};

function compareValue(key: DayCompareRow['key'], amount: number): string {
  return key === 'tijd' ? formatHoursMinutesNL(amount) : `${formatNumberNL(amount, 0)} m`;
}

export function StageSheet({
  stage,
  plan,
  day,
  logs,
  today,
  water,
  onChoose,
  onClose,
}: {
  stage: Gr5Stage;
  plan: RoutePlan;
  // De dag in je plan waar deze etappe in zit (bij samenvoegen met twee etappes).
  day: ItineraryDay;
  logs: SessionLog[];
  today: string;
  // Je zweet op deze etappe, als de instelling aan staat en de site een looptijd geeft.
  water?: StageWater;
  onChoose: (stageId: string, patch: Partial<StageChoice>) => void;
  onClose: () => void;
}) {
  const { closing, requestClose } = useSheetClose(onClose);
  const index = stageIndex(stage.id);
  const choice = plan.choices[stage.id] ?? {};
  const section = GR5_SECTIONS.find((s) => s.id === stage.section);
  const mergedAway = day.stages.length === 2 && day.stages[1].id === stage.id; // deze etappe is de tweede helft
  const mergedFirst = day.stages.length === 2 && day.stages[0].id === stage.id;
  const canMerge = canMergeWithNext(plan, index);
  const isLast = index === GR5_STAGES.length - 1;
  // Slaapplek en rustdag horen bij het eind van de dag.
  const dayEndsHere = day.stages[day.stages.length - 1].id === stage.id;
  const warning = sleepWarning(day, day.sleep);
  const regimes = regimesOf(stage);
  const rows = compareWithBest({ kind: 'walk', km: stage.km ?? 0, up: stage.up ?? 0, down: stage.down ?? 0, minutes: stage.minutes ?? 0, incomplete: stage.minutes === null }, logs, today);
  const dayRows = day.stages.length === 2 ? compareWithBest(day, logs, today) : [];

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Etappe ${stage.overall}: ${stage.from} naar ${stage.to}`}
          className={`max-h-[88vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="rounded-b-none border-b-0 pb-8">
            <Eyebrow>{`Etappe ${stage.overall} van 36 · ${section?.name ?? ''}`}</Eyebrow>
            <h3 className="mt-1 font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>{stage.from} naar {stage.to}</h3>
            {day.date && (
              <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--color-action)' }}>
                {weekdayLongNL(day.date)} {formatDateNL(day.date)} · dag {day.dayNumber} van je tocht
              </p>
            )}

            <div className="mt-4 grid grid-cols-4 gap-2">
              <Metric label="Afstand" value={stage.km === null ? 'onbekend' : `${formatNumberNL(stage.km, 1)} km`} />
              <Metric label="Omhoog" value={stage.up === null ? 'onbekend' : `${formatNumberNL(stage.up, 0)} m`} />
              <Metric label="Omlaag" value={stage.down === null ? 'onbekend' : `${formatNumberNL(stage.down, 0)} m`} />
              <Metric label="Looptijd" value={stage.minutes === null ? 'onbekend' : formatStageTime(stage.minutes)} />
            </div>
            <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Omhoog en omlaag zijn de hoogtemeters die je in totaal stijgt en daalt. De looptijd is die van de officiële site, zonder lange pauzes.
            </p>

            {stage.alt && (
              <div className="mt-3 rounded-xl border p-3 text-xs leading-relaxed" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-ink-dim)' }}>
                {stage.alt.label}: {[
                  stage.alt.km !== undefined && `${formatNumberNL(stage.alt.km, 1)} km`,
                  stage.alt.up !== undefined && `${formatNumberNL(stage.alt.up, 0)} m omhoog`,
                  stage.alt.down !== undefined && `${formatNumberNL(stage.alt.down, 0)} m omlaag`,
                  stage.alt.minutes !== undefined && formatHoursMinutesNL(stage.alt.minutes),
                ].filter(Boolean).join(', ')}. Hierboven staat de waarde uit de lijst van de site. Bekijk de GPX voor je gaat.
              </div>
            )}

            {hasHighPass(stage) && stage.highPass && (
              <Block heading="HOGE PAS, VROEG VERTREKKEN">
                {stage.highPass.name} ({formatNumberNL(stage.highPass.m, 0)} m). {EARLY_START_NOTE}
              </Block>
            )}

            <Block heading="NAAST JE BESTE DAG VAN DE LAATSTE ACHT WEKEN">
              <CompareRows rows={rows} />
              {dayRows.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                    Je loopt deze etappe samen met {mergedAway ? `etappe ${day.stages[0].overall}` : `etappe ${day.stages[1].overall}`}. Samen:
                  </p>
                  <CompareRows rows={dayRows} showNote={false} />
                </div>
              )}
            </Block>

            <Block heading="JE PLAN">
              {!mergedFirst && (
                <>
                  <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Waar slaap je na deze etappe?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Slaapplek">
                    {SLEEP_KINDS.map((kind) => {
                      const selected = choice.sleep === kind;
                      return (
                        <button
                          key={kind}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => onChoose(stage.id, { sleep: selected ? undefined : kind })}
                          className="min-h-11 rounded-xl border px-2 text-xs font-medium transition-all active:scale-[0.98]"
                          style={selected
                            ? { borderColor: 'var(--color-action)', background: 'var(--color-card)', color: 'var(--color-action)' }
                            : { borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}
                        >
                          {SLEEP_LABEL[kind]}
                        </button>
                      );
                    })}
                  </div>
                  {warning && (
                    <p className="mt-2 rounded-xl border p-3 text-xs leading-relaxed" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-ink-dim)' }}>{warning}</p>
                  )}
                </>
              )}
              {mergedFirst && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                  Je loopt deze etappe en de volgende als één dag. De slaapplek kies je bij etappe {day.stages[1].overall}.
                </p>
              )}

              {mergedAway && (
                <ToggleRow
                  label={`Samengevoegd met etappe ${day.stages[0].overall}`}
                  hint="Zet uit om beide etappes weer op aparte dagen te lopen."
                  checked
                  onChange={(v) => { if (!v) onChoose(day.stages[0].id, { mergeWithNext: false }); }}
                />
              )}
              {!mergedAway && !isLast && (
                <ToggleRow
                  label="Samenvoegen met de volgende etappe"
                  hint={canMerge ? 'Dan loop je beide etappes op één dag.' : 'Kan niet: de vorige etappe is al met deze samengevoegd.'}
                  checked={!!choice.mergeWithNext && canMerge}
                  disabled={!canMerge}
                  onChange={(v) => onChoose(stage.id, { mergeWithNext: v })}
                />
              )}
              {dayEndsHere && !isLast && (
                <ToggleRow
                  label="Rustdag na deze etappe"
                  hint="Een dag blijven waar je slaapt. Alle volgende dagen schuiven een dag op."
                  checked={!!choice.restAfter}
                  onChange={(v) => onChoose(stage.id, { restAfter: v })}
                />
              )}
            </Block>

            <Block heading="BIVAK IN DIT GEBIED">
              {regimes.length === 0 ? (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                  Voor deze etappe staat geen bivakregel in het onderzoek. Zoek de regel van de gemeente of het gebied op voor je er slaapt.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {regimes.map((r) => (
                    <div key={r.id}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-action)' }}>{r.area}</p>
                      <ul className="mt-1 flex flex-col gap-1.5">
                        {r.lines.map((line) => (
                          <li key={line} className="flex gap-2 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                            <span style={{ color: 'var(--color-action)' }}>·</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                      {r.openPoint && <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Nog open: {r.openPoint}</p>}
                      <Links links={r.sources} />
                    </div>
                  ))}
                  <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--color-warning)' }}>{BIVOUAC_CHECK_NOTE}</p>
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{BIVOUAC_EVERYWHERE}</p>
            </Block>

            <Block heading="WATER EN WINKEL">
              {water && (
                <div className="mb-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)' }}>
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{stageWaterLine(water)}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{stageWaterBasisLine(water)}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{waterPointsLine(stage)}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                    Een richtlijn voor wat je kwijtraakt, geen medisch advies. Het gaat erom dat je niet te veel uitdroogt, niet om alles terug te drinken. De tijd is die van de site, zonder pauzes.
                  </p>
                </div>
              )}
              {!stage.water && !stage.shop ? (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                  Voor deze etappe is niet bekend waar water en winkels zijn. Neem genoeg mee voor de hele dag en filter water van weiden met vee.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {stage.water && <Fact heading="Water" fact={stage.water} />}
                  {stage.shop && <Fact heading="Winkel" fact={stage.shop} />}
                </div>
              )}
            </Block>

            {stage.notes.length > 0 && (
              <Block heading="LET OP">
                <div className="flex flex-col gap-3">
                  {stage.notes.map((n) => (
                    <div key={n.text}>
                      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{n.text}</p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{SOURCE_LABEL[n.source]}</p>
                    </div>
                  ))}
                </div>
              </Block>
            )}

            <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
              <Eyebrow>BRON</Eyebrow>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                Cijfers van {STAGES_SOURCE}, overgenomen op {formatDateNL(STAGES_TAKEN_ON)}. De route verandert soms: gebruik voor vertrek de officiële GPX.
              </p>
              <Links links={[{ label: 'GPX van deze etappe', url: stage.gpx }, ...(section ? [{ label: `Alle etappes van dit stuk op ${STAGES_SOURCE}`, url: section.url }] : [])]} />
            </div>

            <button onClick={requestClose} className="mt-6 min-h-11 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Sluiten
            </button>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border px-1.5 py-2 text-center" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-0.5 text-[13px] font-medium leading-tight" style={{ color: value === 'onbekend' ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>{value}</p>
    </div>
  );
}

function Block({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <Eyebrow>{heading}</Eyebrow>
      <div className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{children}</div>
    </div>
  );
}

function Fact({ heading, fact }: { heading: string; fact: StageFact }) {
  return (
    <div>
      <p className="text-xs font-semibold" style={{ color: 'var(--color-action)' }}>{heading}</p>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{fact.text}</p>
      <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{SOURCE_LABEL[fact.source]}</p>
    </div>
  );
}

function Links({ links }: { links: { label: string; url: string }[] }) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      {links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs underline underline-offset-2" style={{ color: 'var(--color-action)' }}>
          {l.label}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" />
        </a>
      ))}
    </div>
  );
}

function ToggleRow({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`mt-4 flex items-center justify-between gap-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{label}</p>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{hint}</p>
      </div>
      {disabled ? <span className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>niet mogelijk</span> : <Toggle checked={checked} onChange={onChange} label={label} />}
    </div>
  );
}

function CompareRows({ rows, showNote = true }: { rows: DayCompareRow[]; showNote?: boolean }) {
  if (rows.length === 0) return <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Voor deze etappe is niets te vergelijken.</p>;
  const none = rows.every((r) => r.best === 0);
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.key} className="flex items-baseline justify-between gap-3 text-sm">
          <span style={{ color: 'var(--color-ink)' }}>{COMPARE_LABEL[r.key]}</span>
          <span className="text-right text-xs" style={{ color: r.enough ? 'var(--color-success-text)' : 'var(--color-ink-dim)' }}>
            {r.best > 0 ? `jouw beste ${compareValue(r.key, r.best)} van ${compareValue(r.key, r.need)}` : `nodig ${compareValue(r.key, r.need)}`}
            {r.enough ? ', gehaald' : ''}
          </span>
        </div>
      ))}
      {showNote && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        {none
          ? 'Je hebt de laatste acht weken nog geen tocht gelogd waarmee dit te vergelijken is.'
          : 'Je beste dag telt per onderdeel apart. "Gehaald" betekent dat je dit al op één dag deed.'}
      </p>}
    </div>
  );
}
