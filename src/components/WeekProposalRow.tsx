// ASCEND: een voorstel dat het vak boven de dagen niet kreeg (engine/weekList.ts#weekBox), als rij "Voorstel" in
// de lijst onder de dagen. De rij opent een blad met hetzelfde advies als de kaart, met Liever niet en Akkoord;
// er verandert niets zonder Akkoord.

import { useState } from 'react';
import type { Advice } from '../engine/adviceShared';
import { proposalRow } from '../engine/weekList';
import { AdviceItem } from './CoachCard';
import { Sheet } from './settings/Sheet';
import { SheetRow } from './SheetRows';

export function WeekProposalRow({ advice }: { advice: Advice }) {
  const [open, setOpen] = useState(false);
  const row = proposalRow(advice);
  return (
    <>
      <SheetRow title={row.title} sub={row.sub} onClick={() => setOpen(true)} sheetFrom />
      {open && (
        <Sheet eyebrow="Week" title={advice.title} onClose={() => setOpen(false)}>
          <div className="pb-2"><AdviceItem advice={advice} compact /></div>
        </Sheet>
      )}
    </>
  );
}
