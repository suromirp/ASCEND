// ASCEND: "Duur aanpassen" on a row of the card "Uit MacroFactor" whose duration in
// the file is too long. A minutes field, starting with the duration ASCEND already
// expects for this training. Nothing is stored here: the card
// keeps the choice until "Alles verwerken"
// (docs/beslissingen/2026-10-29-mf-training-te-lang.md).

import { useState } from 'react';
import { dayOptions, fileDurationSentence, isValidMinutes, type DurationChoice, type NewProposal } from '../engine/macrofactorDuration';
import { MAX_STRENGTH_MINUTES } from '../engine/logDuration';
import { useSheetClose } from '../utils/useSheetClose';
import { NumberField } from './NumberField';
import { Portal } from './Portal';
import { SheetHeader } from './SheetHeader';
import { TextButton } from './TextButton';
import { Card, PrimaryButton, Segmented, SheetGrip } from './ui';
import { formatDateNL, weekdayLongNL, weekdayShortNL } from '../utils/dates';

export function MacroFactorDurationSheet({
  proposal,
  suggested,
  current,
  onChoose,
  onClose,
}: {
  proposal: NewProposal;
  // The duration ASCEND expects for this training.
  suggested: number;
  // The choice made before, if any: minutes.
  current?: DurationChoice;
  onChoose: (choice: DurationChoice) => void;
  onClose: () => void;
}) {
  const { closing, requestClose, sheetRef } = useSheetClose(onClose, 200);
  const [minutes, setMinutes] = useState<number | undefined>(current?.minutes ?? suggested);
  const days = dayOptions(proposal);
  const [date, setDate] = useState<string>(current?.date ?? days.defaultDay);
  const valid = isValidMinutes(minutes);

  function choose(choice: DurationChoice) {
    onChoose(choice);
    requestClose();
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div
          ref={sheetRef}
          className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Duur aanpassen"
        >
          <SheetGrip />
          <Card className="rounded-b-none border-b-0 pb-8">
            <div className="-mt-2"><SheetHeader eyebrow={proposal.template.name} title="Duur aanpassen" onClose={requestClose} /></div>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{fileDurationSentence(proposal.workout)}</p>
            {days.plannedDay && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>Welke dag?</p>
                <Segmented
                  label="Welke dag?"
                  tall
                  value={date}
                  onChange={setDate}
                  options={[
                    { value: days.fileDay, label: `${weekdayShortNL(days.fileDay)} ${formatDateNL(days.fileDay)}`, aria: `Dag van het bestand, ${weekdayShortNL(days.fileDay)} ${formatDateNL(days.fileDay)}` },
                    { value: days.plannedDay, label: `${weekdayShortNL(days.plannedDay)} ${formatDateNL(days.plannedDay)}`, aria: `Dag van de geplande training, ${weekdayShortNL(days.plannedDay)} ${formatDateNL(days.plannedDay)}` },
                  ]}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Je training hoort bij {weekdayLongNL(days.plannedDay)} {formatDateNL(days.plannedDay)}. Het bestand zegt {weekdayLongNL(days.fileDay)} {formatDateNL(days.fileDay)}.</p>
              </div>
            )}
            <div className="mt-4">
              <NumberField
                label="Hoe lang duurde je training?"
                value={minutes}
                onChange={setMinutes}
                unit="min"
                tall
                helper={valid || minutes === undefined ? `ASCEND verwacht ${suggested} min voor deze training.` : `Kies een duur van 1 tot ${MAX_STRENGTH_MINUTES} minuten.`}
              />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <PrimaryButton onClick={() => valid && choose({ minutes, date })} disabled={!valid}>Opslaan</PrimaryButton>
              <TextButton tone="dim" className="self-start" onClick={requestClose}>Annuleren</TextButton>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
