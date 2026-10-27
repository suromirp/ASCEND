import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { SessionLog } from '../models/training';
import { entryResultLine, isSweatLog } from '../engine/sweat';
import { asksSweat, buildSweatEntry, preWeightForLog } from '../engine/sweatMoments';
import { makeId } from '../utils/id';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

const SAVE_LIMIT_MS = 10_000;

// Zweetverlies bij het afronden (docs/beslissingen/2026-10-27-zweet-bij-afronden.md): de rij
// "gewicht na" onder het gevoel bij "Hoe ging het?" en op het Gedaan-scherm. Het voorgewicht
// van de herinnering op Vandaag staat er al in; zonder voorgewicht staat er een veld, zonder
// verwijt. Opslaan maakt dezelfde gewone meting als het blad in het Logboek
// (engine/sweatMoments.ts#buildSweatEntry), dus dat blad blijft voor achteraf.
export interface SweatAfterState {
  // Moet de rij verschijnen: de instelling staat aan en het is een loop, wandeling of tocht.
  show: boolean;
  before: number | undefined;
  preKnown: boolean;
  setBefore: (v: number | undefined) => void;
  after: number | undefined;
  setAfter: (v: number | undefined) => void;
  drank: number | undefined;
  setDrank: (v: number | undefined) => void;
  pee: number | undefined;
  setPee: (v: number | undefined) => void;
  watch: number | undefined;
  setWatch: (v: number | undefined) => void;
  result: string | undefined;
  hasNumbers: boolean;
  note: string | null;
  // Slaat de meting op als er een bruikbare uitkomst is. True als het goed ging of er niets
  // te bewaren was; false als opslaan mislukte (de rij zegt dan waarom).
  save: () => Promise<boolean>;
}

export function useSweatAfter(log: SessionLog | undefined): SweatAfterState {
  const { settings, saveSweat } = useAppData();
  const existing = log ? settings.sweatEntries?.find((e) => e.logId === log.id) : undefined;
  const pre = log ? preWeightForLog(settings.sweatPre, settings.sweatEntries, log) : undefined;
  const [before, setBefore] = useState<number | undefined>(existing?.weightBeforeKg ?? pre);
  const [after, setAfter] = useState<number | undefined>(existing?.weightAfterKg);
  const [drank, setDrank] = useState<number | undefined>(existing?.drankMl);
  const [pee, setPee] = useState<number | undefined>(existing?.peeMl);
  const [watch, setWatch] = useState<number | undefined>(existing?.watchMl);
  const [note, setNote] = useState<string | null>(null);
  const show = !!log && asksSweat(settings.askSweat) && isSweatLog(log);

  const draft = log
    ? buildSweatEntry(
        log,
        { weightBeforeKg: before, weightAfterKg: after, drankMl: drank, peeMl: pee, watchMl: watch, tempC: existing?.tempC ?? log.detail?.conditions?.tempC },
        existing,
        makeId('sweat'),
        new Date().toISOString(),
      )
    : undefined;
  const result = draft ? entryResultLine(draft) : undefined;
  const hasNumbers = after !== undefined || watch !== undefined;

  async function save(): Promise<boolean> {
    if (!show || !draft || !result) return true;
    setNote(null);
    try {
      await withTimeout(saveSweat(draft), SAVE_LIMIT_MS);
      return true;
    } catch (err) {
      setNote(err instanceof TimeoutError ? 'Opslaan duurt langer dan verwacht. Probeer het zo nog eens.' : 'Zweetverlies opslaan lukte niet. Probeer het zo nog eens.');
      return false;
    }
  }

  return { show, before, preKnown: pre !== undefined || existing?.weightBeforeKg !== undefined, setBefore, after, setAfter, drank, setDrank, pee, setPee, watch, setWatch, result, hasNumbers, note, save };
}
