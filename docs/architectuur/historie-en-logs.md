De regel dat historie nooit herschreven wordt, met de uitzonderingen op verzoek van de eigenaar en het append-only patroon.

**Never rewrite historical logs when schedules change.** Completion is
never stored as a flag — a session is "done" the moment a `SessionLog`
exists that references the `PlannedSession` (`engine/sessionStatus.ts`).
One deliberate exception, at the owner's explicit request: a log made by hand
takes over the measured numbers of the watch and keeps its own in
`SessionLog.manualMeasured`, so it can be put back
(`docs/beslissingen/2026-10-22-garmin-is-leidend.md`). A second, of the same
kind: an existing strength log takes over the duration, sets and reps in
reserve of a MacroFactor workout, in the same field (its `strength` part) and
put back with the same `restoreManual`
(`docs/beslissingen/2026-10-22-macrofactor-leidend-voor-kracht.md`, which
refers to the first and leaves it as it was). A new log from a MacroFactor workout
whose file duration is too long (over 300 minutes) takes a duration the user sets in "Duur aanpassen"
when it is made (never empty, so load and leg index keep counting it), and keeps the file's minutes in `SessionLog.fileDurationMinutes`;
nothing existing is rewritten (`engine/macrofactorDuration.ts`,
`docs/beslissingen/2026-10-29-mf-training-te-lang.md`). A third: a log from the watch
can be cut at the beginning and the end (a drive home with the watch still on),
which replaces its duration, distance, climb and heart rate and keeps the old
ones in `SessionLog.trim`, put back by `engine/trimLog.ts#undoTrim`
(`docs/beslissingen/2026-10-24-activiteit-inkorten.md`).
A fourth: a log tied to an intervals.icu activity follows that activity when it is
corrected there. Its measured numbers (duration, distance, climb and descent, heart
rate, cadence) are replaced only when they differ from the fingerprint of the source
kept at linking (`SessionLog.sourceSync.seen`, bound to the activity by `externalId`),
so a change at the source is told apart from something ASCEND did itself. The numbers
from before stay in `sourceSync.updated` and are put back by
`engine/sourceCorrection.ts#restoreSourceUpdate`; a hand-made log keeps (and extends)
its `manualMeasured`; a log cut here (`trim`) is never written over, the new numbers are
only offered; a deleted activity changes nothing. Switch "Correcties uit intervals.icu
overnemen" (`docs/beslissingen/2026-10-25-correcties-uit-intervals.md`).
The same append-only pattern applies to `MilestoneProgress` (the record of
when an Ascent Ladder milestone was actually cleared, vs. the static
`Objective` / `MilestoneDefinition` ladder).
Which day a log is shown on (`engine/logDay.ts`) is read only: the day of its planned training for a MacroFactor log when that is exactly the day after `completedDate`, else `completedDate`; nothing is stored or rewritten, and everything that computes load, legs or planning keeps `completedDate` (`docs/beslissingen/2026-10-29-dag-van-een-training.md`).
