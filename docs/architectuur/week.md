De Week-tab: waarschuwingen, slepen en inhalen.

**Warnings in Week** (`engine/weekConcerns.ts`, `engine/weekFixProposal.ts`, `components/WeekNotice.tsx`, decision
`docs/beslissingen/2026-10-28-waarschuwingen-in-week.md`, design `docs/visie/Waarschuwingen in Week.md`): amber in Week means
only "something is wrong here"; a heavy leg day is the muted text "zware benen" in the row, no icon (the `LegMark` is gone, the
ridge legend is muted). The week check reads the shown week with `CheckInput.reportYours` (REST-DAY then also reports a
training with your lock, level 1; off by default so the planning and `planGolden.test.ts` do not move) and gives the card
"Let op" under the sky (`weekConcerns`: headline, fact, row text for REST-DAY, LEG-SPACING, TWO-HARD-RUNS, AFTER-TEST,
ONE-LONG, TEST-FRESH). What the check may not repair itself because it is yours becomes a proposal with Akkoord
(`planWeekFix`: `repairWeeks` with `CheckInput.mayMove` on exactly that session, or in a full week the lightest training goes,
never a long run, hard run, leg day, test, race or tocht), as `Advice` `WEEK-CHECK` through `ProposalSheet`, only when the week
is demonstrably better, with the id `weekfix:<rule>:<ids>:<dates>`. It is not in `advice` and not on Vandaag. Liever niet keeps the
card, quieter, with "Toch een voorstel"; the problem is never hidden. Setting "Voorstel bij een probleem in de week"
(`weekFixProposal`, absent = on): off keeps the card and the row texts and drops only the button. Not built yet: the sentence in
the action sheet of a training, the link with TEST-MAKE-ROOM (no second proposal for one training), the other rules.

**Dragging a training in Week** (`engine/weekDrag.ts`, `components/useWeekDrag.ts`, `components/useVerticalDrag.ts`, decision
`docs/beslissingen/2026-10-28-slepen-in-week.md`, design `docs/visie/Slepen in Week.md`): the handle in the row (only the handle, no long
press) moves a training to another day of the shown week, never to another week. It is a faster hand, not a new rule: letting go goes
through `Week.tsx#moveTo` and `decideMove`, the same road as "Verplaatsen" in the action sheet (same lock, `movedFromDate` and
`ChangeNotice` with Ongedaan maken). Clean is applied at once; a cascade, an unresolvable clash, your rest day, a day the time does not
fit and any test open `RescheduleDialog` with Akkoord. Logged, past, skipped, rest, race and holiday or trek trainings have no handle
(`dragEligibility`); the verdict per day (`dayVerdicts`, built on `keptDayReason` from `moveSuggestions.ts`) is mint when it fits, amber
when it asks, muted when it cannot. The pointer mechanics are shared with the goals on Ascend (`useVerticalDrag`, `edgeScroll`); a change
there changes both. Setting "Trainingen slepen in Week" (`dragWeek`, absent = on).

**Inhalen** (`engine/catchUp.ts`, `storage/catchUpApply.ts`, decision `docs/beslissingen/2026-10-29-gemiste-training-inhalen.md`): a missed
training (past, no log, not skipped, no test, race, rest walk or leave, this or last week) can be caught up through the same road as
moving: "Inhalen" in the action sheet and the handle in Week (setting "Trainingen slepen in Week"), only to today or later. The old row is
not moved: `applyProposal` skips it (your lock) and adds a new row with the same template and length on the chosen day (your lock,
`PlannedSession.catchUp`); undo puts the old one back and removes the new one. A clash still asks Akkoord. Rows say "ingehaald van wo 28"
and "ingehaald op do 29". The automatic planning does not touch this, `planGolden.test.ts` does not move.

**De dag van een log in Week** (`engine/logDay.ts`, decision `docs/beslissingen/2026-10-29-dag-van-een-training.md`): to show, a MacroFactor log counts on the day of its planned training when that is exactly the day after `completedDate` (begun before midnight, finished after), so the row and the chart "Belasting per dag" say the same; the log is never rewritten. Only display uses it (Week, the weekly review, Vandaag, the Logboek calendar); leg index, load over 7 and 28 days, readiness and planning stay on `completedDate`.
