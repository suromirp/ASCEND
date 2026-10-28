// ASCEND: "Koppel je trainingen". One compact line per MacroFactor workout NAME,
// not per workout: which ASCEND training is it, as a loose strength training,
// or "Niet inlezen". A choice counts at once for every workout with that name
// and is remembered on this phone.
//
// Every name comes with a suggestion and the reason in words
// (engine/macrofactorNames.ts). "Alle voorstellen overnemen" fills every empty
// choice with it in one tap; the user changes the few that are wrong and
// confirms with "Koppelingen kloppen". Nothing about the plan or the logs changes
// here.
//
// "Als losse krachttraining" is for trainings from before the plan: the log
// gets the template as its kind but belongs to no planned session.

import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useMacroFactor } from '../state/useMacroFactor';
import { setMapping, setMappings } from '../storage/macrofactor';
import { describeSuggestion, type LinkRow } from '../engine/macrofactorNames';
import type { SessionTemplate } from '../models/training';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, Num, PrimaryButton, SecondaryButton, SheetGrip } from './ui';

const NOT_READ = '__niet_inlezen';
const NONE = '';
const PLAN = 'plan:';
const LOOSE = 'loose:';

type Choice = string;

function decode(value: Choice): { templateId: string | null; loose: boolean } {
  if (value === NOT_READ) return { templateId: null, loose: false };
  if (value.startsWith(LOOSE)) return { templateId: value.slice(LOOSE.length), loose: true };
  return { templateId: value.slice(PLAN.length), loose: false };
}

// The stored choice of a row, as a value.
function storedValue(row: LinkRow): Choice {
  if (row.linked === null) return NOT_READ;
  if (row.linked !== undefined) return (row.loose ? LOOSE : PLAN) + row.linked;
  return NONE;
}

const suggestionValue = (row: LinkRow): Choice =>
  row.suggestion ? (row.suggestion.loose ? LOOSE : PLAN) + row.suggestion.templateId : NONE;

const countText = (n: number) => (n === 1 ? '1 training' : `${n} trainingen`);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function MacroFactorLinkCard({ primary }: { primary: boolean }) {
  const { templates } = useAppData();
  const { rows } = useMacroFactor();
  // Choices not confirmed yet, per name key.
  const [draft, setDraft] = useState<Record<string, Choice>>({});
  const [editing, setEditing] = useState<string | null>(null);
  if (rows.length === 0) return null;

  const strength = templates.filter((t) => t.type === 'strength');
  const templateName = (id: string) => strength.find((t) => t.id === id)?.name ?? 'deze training';
  const open = rows.filter((r) => r.linked === undefined);
  const chosen = (r: LinkRow) => draft[r.key] ?? NONE;
  const ready = open.filter((r) => chosen(r) !== NONE);
  const takeable = open.filter((r) => chosen(r) === NONE && r.suggestion);
  const without = open.filter((r) => chosen(r) === NONE && !r.suggestion);
  const editRow = rows.find((r) => r.key === editing);

  function takeAll() {
    setDraft((d) => ({ ...d, ...Object.fromEntries(takeable.map((r) => [r.key, suggestionValue(r)])) }));
  }

  async function confirm() {
    await setMappings(ready.map((r) => ({ name: r.name, ...decode(chosen(r)) })));
    setDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !ready.some((r) => r.key === k))));
  }

  // A row that is linked already changes at once, like before; an open row
  // changes its draft until "Koppelingen kloppen".
  function change(row: LinkRow, value: Choice) {
    if (row.linked === undefined) setDraft((d) => ({ ...d, [row.key]: value }));
    else void setMapping(row.name, decode(value).templateId, decode(value).loose);
  }

  return (
    <Card className="flex flex-col gap-3">
      <Eyebrow>Koppel je trainingen</Eyebrow>
      <div>
        <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>
          {open.length === 0 ? 'Alles is gekoppeld' : open.length === 1 ? 'Eén naam koppelen' : <><Num>{open.length}</Num> namen koppelen</>}
        </p>
        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Welke training in ASCEND hoort bij elke naam uit MacroFactor. ASCEND kijkt naar de oefeningen en stelt per naam iets voor. Wat je kiest geldt meteen voor alle trainingen met die naam, en ASCEND onthoudt het op deze telefoon.
        </p>
      </div>

      {takeable.length > 0 &&
        (primary && ready.length === 0 ? (
          <PrimaryButton onClick={takeAll}>Alle voorstellen overnemen ({takeable.length})</PrimaryButton>
        ) : (
          <SecondaryButton onClick={takeAll}>Alle voorstellen overnemen ({takeable.length})</SecondaryButton>
        ))}

      <ul className="flex flex-col">
        {rows.map((row) => (
          <NameRow
            key={row.key}
            row={row}
            value={row.linked === undefined ? chosen(row) : storedValue(row)}
            templateName={templateName}
            onEdit={() => setEditing(row.key)}
          />
        ))}
      </ul>

      {without.length > 0 && (
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          {without.length === 1 ? 'Voor deze naam' : `Voor ${without.length} namen`} is er geen voorstel: {without.map((r) => r.name).join(', ')}. Kies zelf een training, of Niet inlezen.
        </p>
      )}

      {open.length > 0 &&
        (primary && ready.length > 0 && takeable.length === 0 ? (
          <PrimaryButton onClick={() => void confirm()} disabled={ready.length === 0}>Koppelingen kloppen</PrimaryButton>
        ) : (
          <SecondaryButton onClick={() => void confirm()} disabled={ready.length === 0}>Koppelingen kloppen</SecondaryButton>
        ))}
      {open.length > 0 && ready.length === 0 && takeable.length === 0 && (
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Kies eerst een training bij een naam. Dan kun je bevestigen.</p>
      )}

      {editRow && (
        <ChoiceSheet
          row={editRow}
          templateName={templateName}
          value={editRow.linked === undefined ? chosen(editRow) : storedValue(editRow)}
          strength={strength}
          onChange={(v) => change(editRow, v)}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function NameRow({
  row,
  value,
  templateName,
  onEdit,
}: {
  row: LinkRow;
  value: Choice;
  templateName: (id: string) => string;
  onEdit: () => void;
}) {
  const { templateId, loose } = value === NONE ? { templateId: undefined, loose: false } : decode(value);
  const hasChoice = value !== NONE;
  let line: string;
  if (value === NOT_READ) line = 'Niet inlezen';
  else if (hasChoice && templateId) line = `${templateName(templateId)}${loose ? ', als losse krachttraining' : ''}`;
  else if (row.suggestion) line = `Voorstel: ${templateName(row.suggestion.templateId)}${row.suggestion.loose ? ', als losse krachttraining' : ''}`;
  else line = 'Nog geen voorstel';
  const reason =
    row.suggestion && (!hasChoice || (templateId === row.suggestion.templateId && loose === !!row.suggestion.loose))
      ? `${capitalize(row.suggestion.basis === 'content' && row.suggestion.reason ? row.suggestion.reason : describeSuggestion(row.suggestion, templateName(row.suggestion.templateId)))}.`
      : undefined;

  return (
    <li className="flex items-center gap-3 border-t py-2.5 first:border-t-0" style={{ borderColor: 'var(--color-card-border)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-sm" style={{ color: 'var(--color-ink)', overflowWrap: 'anywhere' }}>{row.name}</p>
          <p className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{countText(row.count)}</p>
        </div>
        <p className="mt-0.5 text-sm" style={{ color: hasChoice ? 'var(--color-action)' : 'var(--color-ink-dim)' }}>{line}</p>
        {reason && <p className="line-clamp-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{reason}</p>}
      </div>
      <SecondaryButton className="!flex-none px-3" onClick={onEdit}>{hasChoice || row.suggestion ? 'Wijzigen' : 'Kiezen'}</SecondaryButton>
    </li>
  );
}

// One name: the training it is, with "Als losse krachttraining" for trainings
// that are not part of a planned session.
function ChoiceSheet({
  row,
  templateName,
  value,
  strength,
  onChange,
  onClose,
}: {
  row: LinkRow;
  templateName: (id: string) => string;
  value: Choice;
  strength: SessionTemplate[];
  onChange: (value: Choice) => void;
  onClose: () => void;
}) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-6">
            <Eyebrow>Welke training is dit?</Eyebrow>
            <p className="text-sm" style={{ color: 'var(--color-ink)', overflowWrap: 'anywhere' }}>{row.name}</p>
            {row.suggestion && (
              <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                {capitalize(row.suggestion.basis === 'content' && row.suggestion.reason ? row.suggestion.reason : describeSuggestion(row.suggestion, templateName(row.suggestion.templateId)))}.
              </p>
            )}
            <select
              value={value}
              aria-label={`Welke training in ASCEND is ${row.name}?`}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border px-3 text-sm"
              style={{
                borderColor: 'var(--color-control-border)',
                background: 'var(--color-charcoal)',
                color: value === NONE ? 'var(--color-ink-dim)' : 'var(--color-ink)',
              }}
            >
              {value === NONE && <option value={NONE}>Kies een training</option>}
              <optgroup label="Bij je planning">
                {strength.map((t) => (
                  <option key={t.id} value={PLAN + t.id}>{t.name}</option>
                ))}
              </optgroup>
              <optgroup label="Als losse krachttraining">
                {strength.map((t) => (
                  <option key={t.id} value={LOOSE + t.id}>Als losse krachttraining: {t.name}</option>
                ))}
              </optgroup>
              <option value={NOT_READ}>Niet inlezen</option>
            </select>
            <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Een losse krachttraining hoort bij geen geplande training. Handig voor trainingen van voor je planning: ze tellen wel mee in Forge, met de gekozen training als soort.
            </p>
            <PrimaryButton onClick={requestClose}>Klaar</PrimaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
