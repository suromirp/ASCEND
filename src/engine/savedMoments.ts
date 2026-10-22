// What the moment after Gedaan says for the trainings a caller saved: one
// training gets its own moment, several (MacroFactor "Alles opslaan") one
// summary. Every caller keeps its own list, so what one saves is never
// announced with what another saved at the same time.

export interface SavedMoment {
  logId: string;
  recovery: boolean;
  clearedTitle?: string;
  coachNote?: string;
  // Ticked off by itself from the watch (docs/beslissingen/2026-10-22-vanzelf-afvinken.md):
  // the user did not just do anything, so no debrief afterwards.
  auto?: boolean;
}

export interface SavedAnnouncement {
  kind: 'milestone' | 'recovery' | 'session';
  title?: string;
  coachNote?: string;
  logIds: string[];
  // The log "Hoe ging het?" opens for: only a single training the user ticked off.
  debriefLogId?: string;
}

export function announcementFor(saved: SavedMoment[]): SavedAnnouncement | undefined {
  if (saved.length === 0) return undefined;
  const cleared = saved.filter((s) => s.clearedTitle).at(-1);
  const last = saved[saved.length - 1];
  return {
    kind: cleared ? 'milestone' : saved.every((s) => s.recovery) ? 'recovery' : 'session',
    title: cleared?.clearedTitle,
    // The coach's line only speaks for a single training: three of them would each say the same.
    coachNote: saved.length === 1 ? last.coachNote : undefined,
    logIds: saved.map((s) => s.logId),
    debriefLogId: saved.length === 1 && !last.auto ? last.logId : undefined,
  };
}
