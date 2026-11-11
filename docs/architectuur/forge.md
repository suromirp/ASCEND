Forge, de krachttraining: Je stand en volgorde, vergelijken, sessie, verloop, spotter, plaatjes, het blad Oefening, spieren voor de berg en een oefening per scherm.

**Forge and the order of Je stand** (`engine/forgeEntry.ts`, `engine/cardOrder.ts`, `components/stand/ForgeEntryCard.tsx`,
`components/stand/OrderSheet.tsx`, decision `docs/beslissingen/2026-10-28-forge-en-volgorde.md`): Forge is the entry card at
the top of the block Kracht on Je stand (with Krachtprogressie and Trainingsverdeling), with one line of your own numbers
and the fixed explanation as fallback; with Kracht meerekenen off the card stays, with "Aanzetten". Je stand is seven blocks
(benen, belasting, kracht, vier-regels, lopen, invloed, doel) after the fixed first card "Klaar voor het doel"; the order is
a preference in `AppSettings.cardOrder` (optional, read defensively by `resolveCardOrder`, in the backup through
`cleanCardOrder`, no migration), changed in the sheet "Volgorde aanpassen" (handle with `useVerticalDrag` and its optional
`scroller`, Hoger and Lager per row) and the row "Volgorde van Je stand" in Planning under Geavanceerd. The block "Je stand in vier regels"
is now "Ritme" (`resolveCardOrder` turns a saved `vier-regels` into `ritme`; `doel` is gone). No dragging on Vandaag, Logboek, settings or in Forge itself; Ascend and Week
dragging are untouched. A block that is off through its own setting keeps its place.

**Forge** compares each exercise now against 4 and 8 weeks back and the best ever
(`engine/forgeHistory.ts`, decision
`docs/beslissingen/2026-10-24-forge-vergelijken-en-zoeken.md`). A moment only counts
when a training falls in its window; otherwise the row says so or compares with the
previous training, with its date. Exercises on reps (bodyweight) show reps as the
main number. Exercises not done since the furthest moment sit under "Eerder gedaan".
ASCEND is tested quietly against MacroFactor with one measure, **raak**
(`engine/prescriptionCheck.ts`, decision
`docs/beslissingen/2026-10-24-kracht-stil-toetsen.md`): the same function and slack for
both sides, on the same set of the same day, never agreement between the two. For
ASCEND it is an estimate afterwards, except in Forge when the proposed weight was used.
On cables and weight stacks ASCEND learns the weights you really used
(`engine/strengthWeights.ts`, "Gewichten van toestellen": learned, only what you used, or the
profile steps). The model's own rules (decision `docs/beslissingen/2026-10-25-kracht-eigen-regels.md`):
KR-2 takes the best set of a training (the same measure as raak), KR-5 brakes the estimated
strength and not the weight so a weekly wave in the rep range converts freely, after more than
28 days without any strength training it starts 5% lighter, and dumbbells can be read as the
total of two (`dumbbellLog`). In a training Forge proposes a lighter weight after a set below the
range (`engine/forgeAdjust.ts`, "Lichter" or "Liever niet", never a weight that gives reps far
above the range), and the RIR of a set starts empty with the target as a hint; a set ticked
without touching it stores the target with `SetLog.rirAssumed`
(`docs/beslissingen/2026-10-25-bijsturen-in-forge.md`). The drop in strength per working set is
learned per exercise from your own sets, starting at 3% and never from a set with an assumed RIR
(`strengthModel.ts#learnFatigue`, setting "Vermoeidheid per set"); with a coarse step the first set
takes the weight with the smallest expected miss (decision
`docs/beslissingen/2026-10-26-kracht-vermoeidheid-en-grove-stap.md`). "Wijzigingen doorvoeren"
(`engine/forgeInput.ts#carryChange`, `carryMode`: equal sets, the same difference, or off) and raak
for proposals within 5% of what was done (`docs/beslissingen/2026-10-26-doorvoeren-en-raak-dichtbij.md`).
The weights of a machine can be typed in per gym (`GymProfile.exerciseWeightsKg`,
`engine/machineWeights.ts`); a strength log knows its gym (`SessionLog.gymProfileId`, only on new
logs) so the weights learned from use stay per gym, and Forge asks to fill them in when no weight
fits (`docs/beslissingen/2026-10-26-gewichten-per-toestel.md`). A loose add-on weight (a plate or magnet, at most 3, each at most once, every combination) is added to every weight of the block of a cable or stack machine: `GymProfile.addOnKg` for the whole gym, `GymProfile.exerciseAddOnKg` per machine over it (an empty list is none), laid over the block in `strengthWeights.ts#externalWeights` so every candidate follows, and Forge shows "70 + 2,3 kg" under such a set (`engine/machineWeights.ts`, `docs/beslissingen/2026-10-28-tussengewichten.md`). The weights of a machine can also be given as a range (`GymProfile.exerciseWeightRanges`: start, end, step, with `removedKg`, `machineWeights.ts#weightsFromRange`/`ownWeightsFor`): the union of the range(s) and the loose weights in `exerciseWeightsKg`, so the add-ons lie over it as over a list and ASCEND still learns from the weights you really use (`docs/beslissingen/2026-10-29-gewichten-als-bereik.md`).

**A training in Forge is a session** (`engine/forgeSession.ts`, `utils/forgeSessionStore.ts`, `components/forge/SessionPill.tsx`,
`ForgeSessionHost.tsx`, `useForgeSession.ts`, decision `docs/beslissingen/2026-10-29-forge-als-sessie.md`): a started strength training stays open until
Afronden or Verwijderen; everything (rows, course, clock, pauses) is in the draft (`WorkoutDraft`: `startedAt`, `pauses: { from, to? }[]`, `lastActionAt`,
all optional, an old draft works) and survives closing, reloading and the next day: no clock reset on reopening, no age limit on the draft. The clock is
a sum, not a timer: active time = now minus start minus the pauses (`activeSeconds`, `pause`, `resume`, pure and tested). The menu of the training has
Pauzeren/Verder, Kleiner maken (the back button on the left is the same, the session runs on), Afronden and Training verwijderen (a sheet with Annuleren and
Verwijderen); in a pause the clock stands still and a quiet line says "Gepauzeerd" with Verder. Coming back after more than the threshold since your last
action while the clock ran asks once "Je was 22 uur weg. Telt die tijd mee?" ("Nee, als pauze" is the advice); setting "Lange onderbreking vragen na"
(`AppSettings.forgeLongBreak`: 0 = uit, 30, 45 = advice, 60, 90; `resolveBreakAsk`). Afronden logs the active time as the duration; an existing log is never
written to. There is at most one session: a pointer `ascend.forge.sessie` in localStorage (draft key, template, day) lets the pill above the tab bar find it;
starting another training while one runs asks "Naar de training" or "Annuleren" (the guard is the wrapper `ForgeWorkout`, the screen is `ForgeWorkoutInner`).
The pill shows only while a session exists and the full screen of Forge is not open (`registerForgeOpen`), never on the splash; the page gets room under
its content; the breathing dot runs only while the clock runs and the pill is in view, and not in Rustig, Uit or reduced motion (a deliberate, owner-requested
second loop next to the mission card). A tap opens `ForgeSessionHost` through `requestOpenSession`. A session starts at the first real action
(tick, typing a value, adding or removing a set, Pauzeren), not at opening: until then no draft, pointer, pill or gate (the gate does not apply to
`startAtForm` or preview). A pointer whose template or planned session is gone, or whose planned session is logged, is dead (`sessionIsDead`) and
cleaned up (`useSessionHousekeeping`, once in App; at boot also `draftsToPrune`); "Alles verwijderen" and a restore that replaces the planning
call `clearForgeSessions`. Afronden proposes the active time but above 240 minutes (`finishDuration`) the expected duration with an amber line.
Each ticked row carries `doneAt`, on the log `SetLog.at` (`migrateLogSetTimes`, also in `manualMeasured.strength`).

**The course of a training in Forge** (`engine/forgeLog.ts`, `models/forgeLog.ts`, `components/forge/ForgeLogSheet.tsx`, decision
`docs/beslissingen/2026-10-28-forge-logboek.md`, design `docs/visie/Forge logboek en spotter.md`): like the Event Log of MacroFactor, per moment
which set went from what to what and why (bijgestuurd, doorgevoerd, eigen, onder, past-niet, spotter). It is derived: after every change of the
rows `deriveChanges` compares before and after, the action only says why (`ForgeCause`); ticking, a new plan and a swap are no event, typing is one
event per minute and set. It lives next to the draft (`WorkoutDraft.log`, `seen`) and goes onto the log only when it is made
(`SessionLog.forgeLog`, optional, read defensively by `cleanForgeLog`/`migrateLogForgeLog`, in the backup, no schema bump); an existing log is never
written to. A quiet button in the line with the clock opens the sheet, with a dot only for what Forge did or saw and has not been opened yet, never
for your own edits or a solved message. A message goes away when solved or names the set that still does not fit (`forgeAdjust.ts#fitStillOpen`,
`NoFit.setNo`). In the log sheet "Verloop van de training" opens the same sheet.

**Without a spotter** (`engine/spotter.ts`, decision `docs/beslissingen/2026-10-28-zonder-spotter.md`): on a barbell exercise where failure is
dangerous (`Exercise.failureRisk`: benches and squats with a bar; never machines, cables or dumbbells) Forge prescribes at least 1 rep in reserve,
in the target and the hint (`spotterSlot` in `planExercise`, so also after a swap), unless the gym has safety arms (`GymProfile.spotterRack`, row
"Veiligheidsarmen" under Je sportschool) or the setting "Zonder spotter" is off (`strengthModel.noSpotter`, absent = on). One quiet sign per exercise
("1 over, zonder spotter", a shield, explanation behind a tap), never a pop-up, never a block: typing 0 is always possible and is stored as typed.
Raak judges ASCEND's proposal against its own raised target and your own sets against what the plan asked (`comparisonRows`), so a deliberate 1 where
MacroFactor said 0 is no miss; `noSpotter` is part of `checkModelKey`.

**Plaatjes bij oefeningen** (`data/exerciseArt.ts`, `data/muscleRegions.ts`, `engine/muscleMap.ts`, `engine/exerciseArtData.ts`,
`components/ExerciseArtButton.tsx`, `components/ExerciseArtSheet.tsx`, decision
`docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen.md`, research `docs/onderzoek/Afbeeldingen bij oefeningen.md`): in Forge (the
exercise head in a training and the rows of the list) a card of 44 by 44 px opens the sheet of an exercise: the drawing in three steps
(Workout Guide, CC BY-SA 4.0, one `public/exercise-art/<slug>.json` per drawing with a viewBox and three paths, no colour: it takes
`currentColor`), the muscle card (the Lichaam figure with the 19 muscle groups drawn as soft arcs, lila `--color-sport-strength` only for
muscle data, front and back where needed), Doen, Let op and Vaak fout from the cues, and the credit with a direct link to the licence
(opens in a new tab, never takes you out of a training; the kind "Afbeeldingen" in Bronnen has it too). The three images of a file are put in the order of the movement by `ART_ORDER` (step 1 the start, 2 the middle, 3 the end; a permutation, tested), a drawing that shows something wrong or unclear is left out (decision `-aanvulling.md`), and the url carries `?v=` (`DRAWING_VERSION`, raise it when a file changes). The link exercise to drawing is data (`zeker` or `variant` with a note); an exercise without one shows the muscle card
as the main picture, without an apology. The drawings are not in the precache (`globIgnores` in `vite.config.ts`): they load when a sheet
opens, are kept by a runtime cache "exercise-art", and those of your own templates are fetched in the background
(`components/useExerciseArtPrefetch.ts`). Never put them in `globPatterns`. A changed or added drawing keeps `LICENSE.md` and
`ATTRIBUTION.md` in that folder true. The movement plays once on opening (900 ms, Rustig half, Uit and reduced motion straight to the end
state) and `haptics.tap` only fires for a step you take yourself, with 140 ms between. Setting "Plaatjes bij oefeningen"
(`exerciseArt`: beide, spierkaart, uit; `engine/exerciseArtSettings.ts`).

**Het kaartje toont de tekening** (`components/ExerciseArtButton.tsx`, `engine/exerciseArtThumb.ts`, decision
`docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen-kaartje.md`): the 44 by 44 card in the head of an exercise, in the rows of the
list and in the swap sheet shows the middle image (step 2 after `ART_ORDER`) of the drawing in its own square viewBox, in `currentColor`,
only with "Spierkaart en tekening" and only when the drawing is already there (in memory or in the service worker cache through
`exerciseArtLoader#readCachedDrawing`; the card never fetches, but `useDrawingsFor` fetches what is in view: the exercises of an open training and the choices of the swap sheet, decision `2026-10-29-tekeningen-in-beeld.md`). Until then, with "Alleen spierkaart" and when loading fails it stays the
muscle card (`MuscleThumb`); the switch is a 200 ms fade, straight to the end state in Rustig and Uit.

**Het blad Oefening en sets in Forge** (`engine/forgeRows.ts`, `components/swipeRow.ts`, `components/forge/SwipeRow.tsx`,
decision `docs/beslissingen/2026-11-02-forge-herinrichting.md`, which replaces the chip row of `2026-10-29-snelknoppen-in-forge.md`): there are no
quick buttons under the name and no column head Alles any more (`AppSettings.forgeQuickButtons` is no longer read; an old backup drops it silently in
`backupClean.ts`). The three dots (and "Waarom zo" next to a long reason, which sits on one line) open the sheet Oefening: Waarom zo on top, then four
groups under an `Eyebrow` (`SheetGroup` in `parts.tsx`): Oefening (Ruilen or Terug naar, Notitie, Uitleg en tekening, Uit deze training halen for an
added exercise), Sets (Set toevoegen, Opwarmset toevoegen, Alle sets afvinken or Alle vinkjes weghalen, Laatste set verwijderen), Rust (Rusttijd, Rust nu
starten) and Toestel (only a cable or stack). The cues are in Uitleg en tekening, and only without that sheet in a group Tips. "Set toevoegen" also stays
under the sets. A set swipes to the left: 1 to 1,
direction decided after 8 px, past 54 px it stays open with a red 72 px button ("Set 3 verwijderen"), past 60% of the width or 24 px before your finger reaches the screen edge (a swipe starts on the left of the row; never under 96 px) or fast it deletes at
once, never started on kg, reps, RIR or the tick, one row open at a time. "Set 3 verwijderd" with "Ongedaan maken" stands under the sets for
ten seconds. A set you added (`:a` or `:c` in its id, `isOwnRow`) has an outlined number and "eigen set" in the Voorschrift column; a work
set of the program you removed is kept in `WorkoutExercise.dropped` (read through `forgeRows.ts#dropsOf`) and told in one line with "Terugzetten", and the reason gets "Jij doet er 4."
when the count differs. Adding and removing are events in the Forge log (`toegevoegd`, `weggehaald`, no dot on the button).

**Oefeningen opzij vegen** (`engine/forgeLayout.ts`, `components/forge/ForgeStrip.tsx`, `components/forge/SwipeRow.tsx`, decision
`docs/beslissingen/2026-10-29-oefeningen-opzij-vegen.md`): with "Oefeningen in een training" on "Een per scherm" (`AppSettings.forgeLayout`,
absent = scherm; "Onder elkaar" is the old list; also a switch in the menu of the training) a training is one exercise per screen in a
CSS scroll-snap pager (`.forge-pager`, `.forge-page` with `data-forge-page`, `scroll-snap-stop: always`, no library), each page scrolls
vertically on its own, and a strip of cards under the clock jumps (smooth, not in Uit) with the current one in mint and a tick on a
finished one. Forge never pages by itself (`scrollToRow` only scrolls a row on the page in view). A set swipe starts only on a cell with
`data-swipe-zone` (number and prescription; `touch-action: pan-y` there through `.swipe-front`), everywhere else a sideways swipe is the
pager. The set swipe never sets React state or measures while moving: a transform through refs once per frame, the red panel beside the
row moved by the same transform, `will-change` only while swiping, 200 ms ease-out on release (none in Uit). Measured with CDP touch
events: no commits from the moves. An untouched exercise of a reopened draft always takes today's plan (`forgeInput.ts#touchedInDraft`),
and Zonder spotter turns a set to failure into an open set with reserve (`SetTarget.open`, "7+ met 1 over").

**Het eigen cijferblok** (`components/forge/InputDock.tsx`, `engine/forgeInput.ts#tapClosesDock`): het blok blijft open van veld naar veld, met de pijl, bij een tik op een ander vak, bij vegen en bij een tik op de strip met oefeningen. Het sluit bij een tik buiten de velden (ook afvinken), bij de terugknop en bij het verlaten van Forge. De key van `InputDock` is alleen `dockEpoch`, nooit het slot, de set of het veld (`dockKey.scan.test.ts`); wat bij een veld hoort wordt in de render gezet via `fieldKey`. Wat het blok openhoudt draagt `data-dock-keep`.

**Spieren voor de berg** (`engine/mountainMuscles.ts`, `engine/addedExercises.ts`, `components/MountainMuscleNotice.tsx`, `utils/muscleDeclines.ts`,
decisions `docs/beslissingen/2026-11-02-spierindex-klein.md` and `2026-11-02-forge-herinrichting.md`): with a mountain goal (`hasMountainGoal`) the
week review shows one quiet notice when calves, tibialis or glutes got on average under 4 hard sets a week over four weeks (`muscleVolume.ts`, sets via
`isWorkSet`, a rest week and weeks before the program left out), with a proposal for one exercise in the strength training with the most leg work.
Only after Akkoord: the exercise goes into `strengthModel.addedExercises` (per template, at most three, read defensively, no migration), because the
built-in templates are reset at every start; Forge puts those slots (`plus:<id>`) behind the exercises of the training. "Liever niet" keeps that muscle
quiet for eight weeks, remembered on this device only. `swapOptions(..., prefer)` puts, only at an equal `swapScore`, an exercise that works such a
muscle first, with a short reason (`swapReason`); Forge never swaps by itself. No score, no colour per muscle, no heatmap. Setting "Spieren voor de berg"
(`strengthModel.mountainMuscles`, default on, under Geavanceerd in Forge).

**Kern zichtbaar** (decision `docs/beslissingen/2026-11-11-forge-kern-zichtbaar.md`): every exercise shows its role (Kern,
Bijwerk, Extra from `forgeTimeCap.ts#roleLabel`, source `ExercisePriority`) in the head of `ExerciseBlock.tsx`. The advice of
Hoogstens per krachttraining is now 0, "Tonen, niet inkorten" (also an old backup with Uit or without the field): the whole
training stays. Once the active clock (pauses do not count) passes the reference (`referenceMinutes`: a chosen cap, otherwise
60, a leg day 75), the core is ticked and accessory or optional work is open, one dim line sits under the clock in
`ForgeHeader.tsx` (`overTimeLine`, `OverTimeNote`). Finishing with open accessory work is done, never missed (status comes
from the log). "Hoeveel over?" has three modes (`strengthModel.quickRirMode`): the advice asks only after a hard set or
doubt (`asksReserve` mode 'twijfel'), "Vaker vragen" is the old rule; an unasked ticked set keeps the aim as RIR with
`rirAssumed`. The plate line under each set follows `showPlates` (default off); "kan niet precies" always shows.

**Hoogstens per krachttraining** (`engine/forgeTimeCap.ts`, `durationLearning.ts#learnedMinutesPerSet`, decision
`docs/beslissingen/2026-11-03-forge-tijdsgrens.md`, default changed by `2026-11-11-forge-kern-zichtbaar.md`): with a chosen
cap Forge sets up a strength training of at most that many minutes; a leg day
(`isLegHeavyTemplate`, never a template id) has its own (`AppSettings.forgeCapStrength`/`forgeCapLegs`: 0 = tonen, niet
inkorten (the advice), 45, 60, 75, 90; read by `resolveTimeCap`, no migration). It uses the minutes per work set learned from the logs' own work sets (`isWorkSet`, a log counts from six work sets; without
enough logs the template's expected duration, never the learned whole-training duration) and takes
sets off optional, then accessory work, down to two per exercise, then whole exercises from the back; core sets always stay. With a mountain goal (`hasMountainGoal`, Spieren voor de berg on)
an exercise whose primary muscle is a mountain muscle (`servesMountainMuscle`) goes last across both tiers, first down to one set.
Shorter already: nothing changes. Only the content of one session on the screen: the planning and every log stay as they
are. One quiet line says what fell away ("Ingekort tot ongeveer 60 minuten: 2 sets bijwerk vallen weg."). Swapping in a
session uses `addedExercises.ts#sessionPrescription`, so an added exercise that stayed after "Uit deze training halen" can
still be swapped; an exercise without a prescription, or with a ticked set (`canSwap`), gets no Ruilen or Terug naar. The line is
counted on the first state of the session (`capLineFor`), so a reopened draft is told as it is.

**Forge rekent mee** (`engine/forgeReckon.ts`, `strengthModel.ts#prescribe` with `raised`, setting `strengthModel.reckon` under Rekenmodel, default on, decision
`docs/beslissingen/2026-11-03-forge-rekent-mee.md`): one rule, that of the prescription (estimated strength minus `fatiguePerSet` per earlier work set, `expectedReps` at the asked RIR), never a second formula. A weight you type in an open work set puts the expected reps in Herh. (`reckonWeight`, after `carryChange`/`applyWeight`, so a carried weight gets them too), 1 to 30, rounded down, nothing without an estimate, never over reps you typed (`repsEstimated`, `forgeReps`, draft only). Ticking a work set that went otherwise than asked adjusts only the next open work set you did not touch (`reckonAfterTick`): reps first, the weight only to stay in the range, lighter through `forgeAdjust.ts#lighterPick` (the same pick as Lichter, so the two never disagree), only in the direction of what you did; logged as `meegerekend`. Reaching the top of the range with the asked RIR puts the smallest step heavier in the next prescription without asking, with a line and Terugzetten (`WorkoutExercise.raise`, `undoRaise`); this is the prescription of an exercise, not the planning, so no Akkoord. Not on "Alleen wat je gebruikte" at the heaviest used weight.

**Na de eerste vergelijking** (`strengthModel.ts#fatigueFactor`/`learnAfterHard`/`topSetWarmups`/`assumedRaise`, `forgeReckon.ts#reckonBackOffs`/`readRir`/`asksReserve`, `barCheck.ts`, `poundStack.ts`, decision `docs/beslissingen/2026-11-03-forge-na-de-eerste-vergelijking.md`): a top set (0 or 1 in reserve or to failure, followed by a set that asks more) costs the first back-off set 6% extra on top of `fatiguePerSet`, learned per exercise from sets with a filled-in RIR; every place that counts per set uses `fatigueFactor`, never `(1 - f) ** n`. After ticking a top set that went otherwise with a known reserve, all untouched open back-off sets follow it together. A heavy top set gets warm-up steps sized to the jump from what was done before on the same muscles (`doneBefore`): cold a full ladder (20, 60, 80 before 105), warm from another pattern about 60% and 80% (one step when the top set is not heavier), from the same pattern only the steps above what you did and none at 90% or more. "Hoeveel over?" (0, 1, 2, 3+) in the row; since 2026-11-11 only after a hard set or doubt, the old rule (top set and last set) is the mode "Vaker vragen" (`strengthModel.quickRirMode`); without an answer the RIR stays assumed. With an assumed RIR a step up needs 3 or more reps over the top of the range (the top of "7+" is 7), with a line without "over". A weight under the empty bar gets a soft line and does not count as today's strength in the training; a stack typed in converted pounds gets a proposal to save it as a pound range (Opslaan or Liever niet).
