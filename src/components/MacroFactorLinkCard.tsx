// ASCEND: "Koppel je trainingen". One line per MacroFactor workout NAME, not per
// workout: which ASCEND training is it, or "Niet inlezen". A choice counts at
// once for every workout with that name and is remembered on this phone.
//
// A name that is not linked yet comes with a suggestion, prefilled and with the
// reason in words (engine/macrofactorNames.ts); the user confirms all of them
// with "Koppelingen klopt" or changes a line first. Nothing about the plan or the
// logs changes here.

import { useAppData } from '../state/AppDataContext';
import { useMacroFactor } from '../state/useMacroFactor';
import { setMapping, setMappings } from '../storage/macrofactor';
import { describeSuggestion, type LinkRow } from '../engine/macrofactorNames';
import type { SessionTemplate } from '../models/training';
import { Card, Eyebrow, Num, PrimaryButton, SecondaryButton } from './ui';

const NOT_READ = '__niet_inlezen';
const NONE = '';

// What the select shows: the stored choice, else the suggestion, else nothing.
function valueOf(row: LinkRow): string {
  if (row.linked === null) return NOT_READ;
  if (row.linked !== undefined) return row.linked;
  return row.suggestion?.templateId ?? NONE;
}

const countText = (n: number) => (n === 1 ? '1 training' : `${n} trainingen`);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function MacroFactorLinkCard({ primary }: { primary: boolean }) {
  const { templates } = useAppData();
  const { rows } = useMacroFactor();
  if (rows.length === 0) return null;

  const strength = templates.filter((t) => t.type === 'strength');
  const open = rows.filter((r) => r.linked === undefined);
  const ready = open.filter((r) => valueOf(r) !== NONE);
  const allReady = open.length > 0 && ready.length === open.length;
  const templateName = (id: string) => strength.find((t) => t.id === id)?.name ?? 'deze training';

  async function confirm() {
    await setMappings(ready.map((r) => ({ name: r.name, templateId: valueOf(r) === NOT_READ ? null : valueOf(r) })));
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Koppel je trainingen</Eyebrow>
      <div>
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>
          {open.length === 0 ? 'Alles is gekoppeld' : open.length === 1 ? 'Eén naam koppelen' : <><Num>{open.length}</Num> namen koppelen</>}
        </p>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Welke training in ASCEND hoort bij elke naam uit MacroFactor. Je kiest per naam, niet per training, en wat je kiest geldt meteen voor alle trainingen met die naam. ASCEND onthoudt het op deze telefoon.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <NameRow key={row.key} row={row} strength={strength} templateName={templateName} />
        ))}
      </div>
      {open.length > 0 && (
        <>
          {primary ? (
            <PrimaryButton onClick={() => void confirm()} disabled={!allReady}>Koppelingen klopt</PrimaryButton>
          ) : (
            <SecondaryButton onClick={() => void confirm()} disabled={!allReady}>Koppelingen klopt</SecondaryButton>
          )}
          {!allReady && (
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Kies eerst bij elke naam een training, of Niet inlezen. Dan kun je bevestigen.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function NameRow({ row, strength, templateName }: { row: LinkRow; strength: SessionTemplate[]; templateName: (id: string) => string }) {
  const value = valueOf(row);
  const suggested = row.linked === undefined && row.suggestion && value === row.suggestion.templateId;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-sm" style={{ color: 'var(--color-ink)', overflowWrap: 'anywhere' }}>{row.name}</p>
        <p className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{countText(row.count)}</p>
      </div>
      <select
        value={value}
        aria-label={`Welke training in ASCEND is ${row.name}?`}
        onChange={(e) => void setMapping(row.name, e.target.value === NOT_READ ? null : e.target.value)}
        className="min-h-[44px] w-full rounded-xl border px-3 text-sm"
        style={{
          borderColor: 'var(--color-control-border)',
          background: 'var(--color-charcoal)',
          color: value === NONE ? 'var(--color-ink-dim)' : 'var(--color-ink)',
        }}
      >
        {value === NONE && <option value={NONE}>Kies een training</option>}
        {strength.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
        <option value={NOT_READ}>Niet inlezen</option>
      </select>
      {suggested && row.suggestion && (
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          {capitalize(describeSuggestion(row.suggestion, templateName(row.suggestion.templateId)))}.
        </p>
      )}
    </div>
  );
}
