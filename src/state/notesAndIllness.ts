// Wat speelde er, zweetmetingen en ziek melden.

import { useCallback, useRef } from 'react';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { SettingsRepo, type AppSettings } from '../storage/database';
import { planIllnessChange, type IllnessChange, type IllnessPlan } from '../engine/illness';
import type { PlanChangeProposal } from '../models/planChange';
import { todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import type { InfluenceEntry } from '../models/influence';
import type { SweatEntry } from '../models/sweat';
import { clearSweatPre, setSweatPre } from '../engine/sweatMoments';
import { applyChange, blankEntry, type NoteTarget } from '../engine/influence';
import type { UndoRestore } from './appDataTypes';
import { planSettled } from './planningSync';
import type { Dispatch, SetStateAction } from 'react';

export function useNotesAndIllness(deps: {
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  settings: AppSettings;
  templates: SessionTemplate[];
  commitPlanChange: (proposal: PlanChangeProposal, title: string, restore?: UndoRestore | undefined, afterWrites?: (() => Promise<void>) | undefined) => Promise<boolean>;
  showStatusOnlyChange: (proposal: PlanChangeProposal, restore?: UndoRestore | undefined) => Promise<void>;
}) {
  const { plannedSessions, sessionLogs, setSettings, settings, templates, commitPlanChange, showStatusOnlyChange } = deps;
  // Notes of "Wat speelde er": one write at a time, each from the stored list.
  const influenceTail = useRef<Promise<unknown>>(Promise.resolve());
  const writeInfluences = useCallback((compute: (stored: InfluenceEntry[]) => InfluenceEntry[]): Promise<void> => {
    const job = influenceTail.current.then(async () => {
      const stored = await SettingsRepo.get();
      setSettings(await SettingsRepo.set({ influences: compute(stored.influences ?? []) }));
    });
    influenceTail.current = job.catch(() => undefined);
    return job;
  }, [setSettings]);
  const saveInfluence = useCallback(
    (target: NoteTarget, change: (entry: InfluenceEntry) => InfluenceEntry) =>
      writeInfluences((list) => {
        const now = new Date().toISOString();
        const found = list.find((e) => (target.logId ? e.logId === target.logId : !e.logId && e.date === target.date));
        return applyChange(list, found ?? blankEntry(target, makeId('influence'), now), change, now);
      }),
    [writeInfluences],
  );
  // Weighings for sweat loss share the same one-at-a-time lane as the notes.
  const saveSweat = useCallback(
    async (entry: SweatEntry | { logId: string; remove: true }) => {
      const job = influenceTail.current.then(async () => {
        const stored = await SettingsRepo.get();
        const rest = (stored.sweatEntries ?? []).filter((e) => e.logId !== entry.logId);
        setSettings(await SettingsRepo.set({ sweatEntries: 'remove' in entry ? rest : [...rest, entry] }));
      });
      influenceTail.current = job.catch(() => undefined);
      return job;
    },
    [setSettings],
  );
  const saveSweatPre = useCallback(
    async (date: string, weightKg: number | null) => {
      const job = influenceTail.current.then(async () => {
        const stored = await SettingsRepo.get();
        const list = weightKg === null ? clearSweatPre(stored.sweatPre, date) : setSweatPre(stored.sweatPre, { date, weightKg, updatedAt: new Date().toISOString() }, todayISO());
        setSettings(await SettingsRepo.set({ sweatPre: list }));
      });
      influenceTail.current = job.catch(() => undefined);
      return job;
    },
    [setSettings],
  );
  const removeInfluence = useCallback((id: string) => writeInfluences((list) => list.filter((e) => e.id !== id)), [writeInfluences]);
  const clearInfluences = useCallback(() => writeInfluences(() => []), [writeInfluences]);

  // Ziek melden en weer beter zijn voorstellen (engine/illness.ts#planIllnessChange):
  // niets wordt bewaard voor Akkoord (applyIllness), bij Liever niet blijft alles
  // zoals het was.
  const planIllness = useCallback(
    (change: IllnessChange): IllnessPlan | undefined =>
      planIllnessChange(change, settings.illnessEpisodes ?? [], plannedSessions, templates, sessionLogs, todayISO()),
    [settings.illnessEpisodes, plannedSessions, templates, sessionLogs],
  );

  const applyIllness = useCallback(async (plan: IllnessPlan) => {
    await planSettled();
    const stored = await SettingsRepo.get();
    // Undo zet de periodes terug zoals ze waren, samen met de planning.
    const restore = { settings: { illnessEpisodes: stored.illnessEpisodes ?? [] } };
    setSettings(await SettingsRepo.set({ illnessEpisodes: plan.episodesAfter }));
    if (!(await commitPlanChange(plan.proposal, plan.proposal.issue, restore))) await showStatusOnlyChange(plan.proposal, restore);
  }, [commitPlanChange, showStatusOnlyChange, setSettings]);

  return { saveInfluence, saveSweat, saveSweatPre, removeInfluence, clearInfluences, planIllness, applyIllness };
}
