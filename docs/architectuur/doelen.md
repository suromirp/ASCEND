Doelen en voortgang: de Ascend-tab, klaar voor je doel, de GR5-voortgang en een race met doeltijd.

**The Ascend tab is your goals** (`pages/Ascend.tsx`, `components/ascend/`, `engine/goalList.ts`, decision
`docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md`): goals in the order you choose (`TrainingGoal.order`; one
sort key, `goalLabels.ts#sortedForList`, read by the list and by `goalConflicts.ts`; every move writes the order of
the whole visible list), the first one open, a goal sheet per goal, and a season strip on the sky (switch "Seizoensstrook
tonen"). A new label, a goal added or changed, "In hutten" or "Met tent", and an order that shifts a conflict
(`goalList.ts#moveOutcome`) are always a proposal with Akkoord, never silent. "Klaar voor je doel" of the main goal: only for
`trek_hut`, `trek_tent` or no kind (`goalReadinessFor.ts#usesMilestoneReadiness`) it is
`gr5Readiness.ts#computeMainGoalReadiness`, the same as on Je stand; every other kind goes through
`goalReadinessFor.ts#goalReadinessFor`. `/ascend/doelen` redirects to the tab. Krachtprogressie
and Trainingsverdeling live on Je stand.

Readiness percentages (`engine/readiness.ts` — strength, cardio,
climbing/D+, endurance, recovery, consistency, pack capability) are
intentionally simple, isolated formulas over the last 28 days of logs, each
in its own commented section so a formula can be swapped later without
touching the rest of the file. Those are not shown as progress toward the
main goal any more.

**One progress language toward the GR5** (`engine/gr5Readiness.ts`, decision
`docs/beslissingen/2026-10-22-gr5-voortgang-een-percentage.md`): "Klaar voor de
GR5" is a single percentage, the average of four meters (rugzak, langste dag,
stijging en daling, dagen achter elkaar), each capped at 100%, always shown
with the sentence it is made of (`Gr5ReadinessCard`, tap opens the four meters
in `Gr5ReadinessSheet`). Ascend and Je stand read the same function. The
milestones stay a ladder ("volgend kamp"), never a second progress number. The
coach (Ascend) and "Volgehouden" (Je stand) count with the same function,
`engine/onCourse.ts#recentAdherence`. Do not add another percentage or
"x van y" for goal progress next to these; extend the engine function instead.

**A race with a goal time** (`engine/raceReadiness.ts`, decision `docs/beslissingen/2026-10-28-klaar-voor-je-doel-snelheid.md`):
"Klaar voor je doel" of a running race with a goal time and a distance up to the half marathon makes speed the main meter (the gap between the
expected time from the test that counts, `countedTests`/`racePaces`, the same source as TARGET-TIME, and the goal time, worked out as weeks of
work at the average growth of `data/goalGrowth.ts` by `engine/goalGap.ts`: fill = 10 / (10 + weeks), 50% at ten weeks; decision
`2026-10-28-klaar-voor-je-doel-logisch.md`) and
weighs it most (`RACE_SPEED_WEIGHTS`: speed 60%, longest run 20%, weekly volume 20%; setting "Klaar voor je doel bij een doeltijd",
speed or equal). It is still one percentage. Without a test, or while the fastest 5 km waits for Akkoord, speed does not count and one
line says so; without a goal time nothing changes. The card never judges the goal time ("het doel blijft het doel"): it shows the
distance to the goal as work and one dry line whether the goal time fits average growth by race day (the decision's `-aanvulling.md`), read from the same weeks as the meter: "45:00 vraagt ongeveer 39 weken; tot 20 maart zijn het er 21". "Hier is nog het meeste te winnen" is the meter with the biggest weighted gap (`weightedGapWeakest`), so number, meters and lines never contradict; you judge for yourself. The change "+x in 4 weeks" shows only when the goal already had a value
four weeks ago (`ReadinessOptions.since`). TARGET-TIME carries the goal time in its id, so one Liever niet holds for every later test
until the goal time changes; setting "Doeltijd aanpassen voorstellen" (`proposeTargetTime`) switches it off. TARGET-TIME,
the card and the sheet all use the one calculation `racePaces.ts#raceOutlook` (average growth from today); there is no second band.
The same weeks-of-work language carries the Krachttrend of "Sterker worden" (`engine/strengthReadiness.ts`, level from the length of
your own history on that exercise, never beginner) and the condition meter Tempo for a day hike with `GoalDetails.timeLimitMinutes` or an
ultra with `cutoffMinutes` (`engine/limitReadiness.ts`, 10% margin; decision `2026-10-28-klaar-voor-je-doel-logisch-voorwaarden.md`).
The finish (`2026-10-28-klaar-voor-je-doel-logisch-afwerking.md`): which calculation belongs to which goal lives in one place,
`engine/goalReadinessFor.ts#goalReadinessFor`, read by the Ascend card and the sheet (`useGoalViews`); the proposal of TARGET-TIME is
the smallest whole minute that fits the weeks there are (`raceOutlook().wholeMinutes`, the same number the card calls "ongeveer"), so
after Akkoord the card says it fits; a meter without weight never makes "het meeste te winnen" and does not keep the number under 100.
Two settings: "Groei bij het rekenen" (`goalGrowth`: gemiddeld = the middle of the band, voorzichtig = the bottom, `data/goalGrowth.ts#growthPer`)
and "Marge bij een tijdslimiet" (`limitMargin`: 10%, 5%, geen); Sterker worden follows "Weging bij een doeltijd" too. The follow-up (`2026-10-28-klaar-voor-je-doel-vervolg.md`): the main goal only gets the milestones calculation when it is a tocht (`trek_hut`, `trek_tent`) or has no kind (`goalReadinessFor.ts#usesMilestoneReadiness`), any other main goal gets the calculation of its own kind, and Je stand reads `goalReadinessFor` too, so both show the same number; a goal time within the spread of the prediction (`PREDICTION_SPREAD`) of the time on race day counts as "past" (`RaceOutlook.holds`, the same line as TARGET-TIME; `fits` stays strict and sets the whole minute of the proposal), so the card never contradicts an Akkoord a day later; up to and including 10 km the expected time on race day is a clock ("ongeveer 20:05"), above that whole minutes (`racePaces.ts#outlookSaid`); the form of Sterker worden takes a fully filled exercise with Volgende (`strengthTargetsDraft.ts#finishStrengthTargets`, a half filled one blocks with one sentence) and the strength meter knows an exercise by name, id or alias. The 0,55% is the middle
of 0,3 to 0,8% derived from several sources, never attributed to one study. The form of Sterker worden takes the strength targets per exercise
(`StrengthTargetsField`, `engine/strengthTargetsDraft.ts`); a cutoff only belongs to an ultra, also when editing.
