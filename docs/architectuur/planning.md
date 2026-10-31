Hoe de planning werkt: hoofddoel en rollen, scheduler, wie een geplande sessie mag aanraken, labels van doelen, eerst vragen dan plannen, ziek melden, vrije dagen, tochten, weken en rugzakladder.

The main goal is found in one place, `engine/mainGoal.ts#mainGoal` (scopes `active`, `live`,
`activeFirst`); a rule that needs a kind of session asks for a role on the template
(`SessionTemplate.roles`, `engine/templateRoles.ts#hasRole`, the built-in table in
`data/templateRoles.ts`) instead of a list of template ids. Sports are data in
`data/sports.ts` (label, colour, pictogram, five traits, intervals.icu types); lists of
sports are derived from it. `src/storage/planGolden.test.ts` freezes a year of planning for
three cases: a change to the planning only updates its snapshot with the reason in the commit
(`docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md`).

Everything that counts sets (volume, top weights, set totals) goes through
`engine/workSets.ts#isWorkSet`, so a warm-up set is stored but never counted
(`docs/beslissingen/2026-10-22-kracht-per-set.md`).

**Scheduling logic belongs in `/engine`.** The scheduler
(`engine/scheduler.ts`) is deterministic — no AI, no guessing. It enforces
one concrete rule: two "leg-heavy" sessions (Lower Body or a hike) must not
land within 48 hours of each other. Moving a session into conflict produces
a cascade proposal (shown via `RescheduleDialog`) rather than applying
silently.

**Who may touch a planned session** (`engine/weekValidator.ts#lockLevel`):
history (logged or past) never; yours (`PlannedSession.lock`, set by your
own move/skip and by every other accepted proposal item, or legacy status
`'moved'`) never by the automatic planning; a restored row and a putting back
(a tocht changed back or removed, `PlanChangeItem.restore`) get no lock and no
fixed length, because they return to how the system had them
(`docs/beslissingen/2026-10-22-terugzetten-zonder-slot.md`); a test or race only through a proposal;
everything else the system planned is free. Every planning run ends with
the same pass (`engine/planPass.ts`): the race block, then the week check,
which repairs only the system's own sessions and only when the week is
demonstrably better, and announces it ("Planning bijgewerkt", with undo).
A proposal's preview runs that same pass, so what it shows is what you get.
The sync (`storage/database.ts#syncProgramHorizon`) runs whenever the
stored plan changed (a fingerprint is part of its key), not once a day.
Background jobs at boot run one after the other, never at once. Opening never
waits for the sync: the app shows the stored data first and syncs in the
background; whatever changes the plan waits for the queued syncs and then reads
the stored plan (`docs/beslissingen/2026-10-22-openen-wacht-niet-op-de-planning.md`). Design and
reasoning: `docs/onderzoek/Planning op een lijn.md`.

**The planning reads the label of a goal** (Top, Voortop, Verkenning; `engine/goalLabels.ts`,
`engine/goalConflicts.ts`, `engine/runGrowth.ts`, decision
`docs/beslissingen/2026-10-26-planning-met-labels.md`). The label sets the taper of a race in the race
block: Top the race week, Voortop the short taper of its kind (`taperDaysFor`), Verkenning none, but the
race stands on its day as an anchor. The recovery after a race follows the kind and the distance
(`recoveryDaysFor`), never the label: rule AFTER-GOAL in the week check moves or lightens only the system's
own sessions and announces it. Goals that come too close (`goalConflicts`) are said in plain words in the
proposal when a goal is added or moved, in a fixed order (shorten the taper, one label lower, say it
honestly); "Toch allebei" is kept as `TrainingGoal.conflictAccepted` (the date of the other goal) and the
safety limits between heavy leg days stay. With a running goal as Top or Voortop and no tocht as main goal,
the long run grows every two weeks toward the race (`Program.runBuild`), under the 110% cap on your own
logs, and the first week after a race it is at most half the race.

**First ask, then plan** (`storage/database.ts#seedIfEmpty`, `engine/firstPlan.ts`,
`engine/weekShape.ts`, decision `docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md`):
a new install plans nothing. The app starts with `seedIfEmpty({ withProgram: false })`: only
the templates, no program, goal or planning; "Alles verwijderen" ends the same way. Vandaag
shows `StartWelcome` while there is no program and no planning
(`engine/freshStart.ts#needsFirstPlan`, derived from the data, never a flag): "Nieuw beginnen"
or "Back-up terugzetten". The questions (goal, date, days per week, which days, strength) become
what the planning already reads (goal, rest day, `availability.allowedDays`, strength block) plus
`AppSettings.weekShape` (which fixed sessions stay in the weekly pattern and on which day, read
defensively through `engine/sports.ts#parseWeekShape` by `weeklyPatternTemplates` and
`arrangeWeekForRestDay`). The plan is always a proposal with Akkoord through
`computeHorizonPlan`/`applyHorizonPlanNow` with `firstPlan`; Liever niet leaves the app empty.
Restoring a backup on an empty device counts only your own data as disappearing, never templates
the backup lacks. `seedIfEmpty()` without options and `runBootMigrations({ seedProgram: true })`
still fill the full default program, for the tests only. Nothing may create a program or planning
at start without a proposal. Changing the week shape later is not built yet.

**Ziek melden and "weer beter"** (`engine/illness.ts#planIllnessChange`, `components/IllnessCard.tsx`, decision
`docs/beslissingen/2026-10-27-ziek-als-voorstel.md`) are a proposal with Akkoord when the planning changes: the
period is stored only on Akkoord, with Liever niet nothing is stored and nothing changes; when the planning does
not change the period is stored at once. Undo puts the periods back with the planning.

**Free days, holidays and treks** (`engine/leave.ts`, `AppSettings.leavePeriods`,
shown on Week as "Vrije dagen en vakanties"). Three kinds: `no_training` (no
training on those days; what was there moves to an empty day of that week or is
let go), `trek` (a mountain hike on every day, the day before and after light,
rule LEAVE-LIGHT) and `free_days` (an easy backpack walk, or the week's long
training when its own day is tight, only where the week check finds nothing
new). They work through the same planning run as everything else:
`engine/leaveBlock.ts` puts things in (between the race block and the week
check in `planPass`), the week check takes things out (rules LEAVE-OFF and
LEAVE-LIGHT in `weekValidator.ts`). Adding or removing a period is always a
proposal with Akkoord (`engine/leaveProposal.ts` diffs the planning run against
the stored plan; `ProposalSheet` previews it); the period is stored only on
Akkoord, and undo puts the setting back. A session a period moved, let go of or
placed carries `PlannedSession.leave` so removing the period can put it back.
Logged and past sessions, what you locked yourself and a test or race are never
moved by it; they come back as notes in the proposal. Backup schema 5 carries
the periods; older files import as before (`storage/migrations.ts#migrateLeavePeriods`).

**Tochten as goals of their own** (`LeavePeriod.trek`, `engine/trek.ts`, decision
`docs/beslissingen/2026-10-22-tochten-als-doel.md`): a tocht is a trek period with
its details on it, so it plans through the same run as any trek. Its importance
sets the light days before it (`engine/trekTaper.ts`), its terrain the walk on
each day (flat and hills an easy backpack walk, mountains and snow the mountain
hike; the pack weight of a tocht is information only, sessions have no weight of
their own). Changing a tocht keeps its id and passes `replaces` to
`planLeaveChange`: the old work is put back first, a session it let go comes back
on its own row (an `add` item that names the skipped row, mark gone), so a second
change or the removal never duplicates anything. `AppSettings.showNextTrek` puts
the next tocht on Vandaag. A heavy leg day right after a tocht keeps 72 hours
after a mountain hike: it first looks for a day outside that, short or full, and
with `AppSettings.trekLegRest` soft (the default) the short version may stand 48
hours after the tocht; only then it is let go, with the reason in plain words
(`docs/beslissingen/2026-10-22-zware-beendag-na-tocht.md`).

Weeks are derived, not stored: a week is just seven days starting on a
Monday; which phase/week-number it belongs to is computed from
`Program.startDate` + `Phase.weekCount` (`utils/dates.ts`), never persisted
as its own entity. The phases themselves are counted back from the main
goal's date (`engine/programLayout.ts`, applied by
`storage/database.ts#syncProgramHorizon`): a taper right before the goal,
nothing planned on or after it, and no empty weeks before it.

The backpack of the rucksack walk, the mountain hike and the first hiking day
is a ladder over the whole program (`engine/packLadder.ts`, read through
`progressionTarget`): light in the winter, steps of 1 to 2 kg toward the main
goal's rucksack target, up to 1 kg above it in the heaviest weeks, and never
raised in a week the D+ is raised (the D+ and duration live in
`data/hikeLadder.ts`). The target is not hardcoded: `syncProgramHorizon` copies
it from the goal to `Program.packTargetKg`, the same way it lays out the phases,
and also keeps milestone 11 (the full rucksack hike) at that weight. A milestone
you reached under an earlier requirement stays reached
(`engine/gr5Profile.ts#keepClearedMilestones`).

**Without a goal** (`engine/direction.ts#planDirection`, `engine/programLayout.ts#layoutWaves`, decision
`docs/beslissingen/2026-10-31-zonder-doel-stap-4.md`): with no goal on the Ascend tab and no end day of the plan,
the program is one phase "Golven" in waves of four weeks, counted from `AppSettings.directionStart`. No mountain
hike, no first hiking day and no pack ladder: `PATTERN_SWAPS` only act in the phases of a plan with a goal, and the
sync turns a planned hike of the system back into the long run (announced, with undo). The chosen direction travels
as `Program.direction`, set by every sync like the pack target; Fit blijven gives three equal weeks and a lighter
fourth, Rustig aan the same week every week with the hill session as a recovery run (`CALM_SWAPS`). Choosing a
direction is a proposal with Akkoord (trigger `direction_changed`, `components/ascend/useDirectionChange.tsx`); a goal
with a date keeps the old layout, so the golden cases with a goal never move.
