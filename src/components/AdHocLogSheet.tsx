// ASCEND: Losse training, iets loggen dat niet op de planning stond, in twee stappen (besluit
// docs/beslissingen/2026-11-15-wandeling-plannen.md). Stap 1: de sport (Wandelen, Hardlopen, Fietsen, Kracht,
// Anders; engine/adHocGroups.ts). Daarna meteen loggen met de algemeenste training van die sport; welke
// training precies kies je in het logblad achter Welke training precies?. Kracht en Anders hebben geen
// algemene training: stap 2 is dan de lijst. Altijd beschikbaar, wat ASCEND ook mag plannen (Sporten
// beperkt alleen het plannen). Een log blijft een gewone SessionLog met een templateId.

import { useMemo, useRef, useState } from 'react';
import type { Program } from '../models/program';
import type { SessionTemplate } from '../models/training';
import { AD_HOC_GROUP_LABEL, adHocChoices, adHocDefault, adHocGroupOf, adHocGroups, type AdHocGroupKey } from '../engine/adHocGroups';
import { withSportNames } from '../engine/sportTemplate';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { SheetRow, SheetRows } from './SheetRows';
import { Card, SecondaryButton, SheetGrip } from './ui';
import { TextButton } from './TextButton';
import { ExerciseLogger } from './ExerciseLogger';
import { useSheetClose } from '../utils/useSheetClose';

// Een blad met rijen om te kiezen: stap 1 en 2 van Losse training, en de lijst achter Welke training precies?.
// `rows`: wat er te kiezen is; `then` gebeurt nadat het blad dicht is, `stay` meteen (het blad blijft, zoals een stap verder).
type PickRow = { key: string; title: string; then?: () => void; stay?: () => void };
function PickSheet({ eyebrow, title, line, label, rows, onBack, onClose }: { eyebrow: string; title: string; line?: string; label: string; rows: PickRow[]; onBack?: () => void; onClose: () => void }) {
  // Een keuze sluit eerst dit blad netjes (ook de laag van de terugknop); daarna gebeurt de keuze.
  const after = useRef<(() => void) | undefined>(undefined);
  const { closing, requestClose, sheetRef } = useSheetClose(() => {
    const next = after.current;
    if (next) next();
    else onClose();
  });
  const choose = (fn: () => void) => { after.current = fn; requestClose(); };
  return (
    <Portal>
      <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} onClick={requestClose}>
        <div ref={sheetRef} className={`relative max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <SheetGrip />
          <Card className="flex flex-col gap-3 rounded-b-none border-b-0 pb-[max(var(--rand-onder),24px)]">
            <SheetHeader eyebrow={eyebrow} title={title} onBack={onBack} onClose={requestClose} />
            {line && <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{line}</p>}
            <SheetRows label={label}>
              {rows.map((r) => <SheetRow key={r.key} title={r.title} onClick={() => (r.stay ? r.stay() : r.then && choose(r.then))} />)}
            </SheetRows>
            <SecondaryButton onClick={requestClose}>Annuleren</SecondaryButton>
          </Card>
        </div>
      </div>
    </Portal>
  );
}

// Stap 1 en, voor Kracht en Anders, stap 2. `onPick` krijgt de training en de sport.
export function AdHocLogSheet({ templates, onPick, onClose }: { templates: SessionTemplate[]; onPick: (template: SessionTemplate, group: AdHocGroupKey) => void; onClose: () => void }) {
  const [list, setList] = useState<AdHocGroupKey | undefined>();
  if (list) {
    return (
      <PickSheet key={list} eyebrow="Losse training" title={AD_HOC_GROUP_LABEL[list]} line="Welke training was het?" label={AD_HOC_GROUP_LABEL[list]}
        rows={adHocChoices(templates, list).map((t) => ({ key: t.id, title: t.name, then: () => onPick(t, list) }))}
        onBack={() => setList(undefined)} onClose={onClose} />
    );
  }
  return (
    <PickSheet key="sport" eyebrow="Loggen" title="Losse training" line="Iets gedaan dat niet op de planning stond? Kies de sport." label="Sport"
      rows={adHocGroups(templates).map((key) => {
        const first = adHocDefault(templates, key);
        return first ? { key, title: AD_HOC_GROUP_LABEL[key], then: () => onPick(first, key) } : { key, title: AD_HOC_GROUP_LABEL[key], stay: () => setList(key) };
      })}
      onClose={onClose} />
  );
}

// Welke training precies?: een tekstknop in het logblad, met alleen de trainingen van die sport.
export function TrainingSwitch({ templates, group, current, onSwitch }: { templates: SessionTemplate[]; group: AdHocGroupKey; current: SessionTemplate; onSwitch: (t: SessionTemplate) => void }) {
  const [open, setOpen] = useState(false);
  const choices = adHocChoices(templates, group);
  if (choices.length < 2) return null;
  return (
    <>
      <TextButton tone="dim" icon="verder" onClick={() => setOpen(true)}>Welke training precies?</TextButton>
      {open && (
        <PickSheet eyebrow="Losse training" title="Welke training precies?" line={`Nu: ${current.name}.`} label="Trainingen"
          rows={choices.filter((t) => t.id !== current.id).map((t) => ({ key: t.id, title: t.name, then: () => { setOpen(false); onSwitch(t); } }))}
          onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// Het hele verloop van Losse training op Vandaag en Week: de sport, dan het logblad met de standaard
// van die sport en Welke training precies?. Sluit het logblad, dan is het verloop klaar.
export function AdHocLogFlow({ templates: counting, program, date, onClose }: { templates: SessionTemplate[]; program: Program | null; date: string; onClose: () => void }) {
  // Zwemmen, padel en voetbal staan altijd onder Anders, ook zonder rol (alleen om te kiezen; de planning en de beenindex lezen ze niet).
  const templates = useMemo(() => withSportNames(counting), [counting]);
  const [picked, setPicked] = useState<{ template: SessionTemplate; group: AdHocGroupKey } | undefined>();
  if (!picked) return <AdHocLogSheet templates={templates} onPick={(template, group) => setPicked({ template, group })} onClose={onClose} />;
  const group = adHocGroupOf(picked.template) === picked.group ? picked.group : adHocGroupOf(picked.template);
  return (
    <ExerciseLogger
      key={picked.template.id}
      template={picked.template}
      scheduledDate={date}
      program={program}
      startAtForm
      switcher={<TrainingSwitch templates={templates} group={group} current={picked.template} onSwitch={(t) => setPicked({ template: t, group })} />}
      onClose={onClose}
    />
  );
}
