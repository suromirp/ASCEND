Lichaam, hoe voelt je lijf, zware beendag bij vermoeide benen, korte nacht en wat speelde er.

**Lichaam** (`/lichaam`, `/lichaam/:plek`, decision
`docs/beslissingen/2026-10-24-lichaam-als-figuur.md`) is the one place for
stretching and complaints; `/stretches` and `/blessures` only redirect. Spots,
stretches, care and the injury name are data (`data/bodySpots.ts`,
`data/bodyCare.ts`) read through pure functions in `engine/bodyMap.ts`, which also
lays out the tap boxes (44 by 44 px, never overlapping, tested). A complaint is
stored under the name from `data/bodyAreas.ts` with the side after it, so
INJURY-LEGS recognises it; a new leg spot belongs in `LEG_BODY_PARTS`. Reporting
does not change the planning; once it does, it goes through a proposal with
Akkoord. Care texts say "kan helpen", never "voorkomt", with the strength of the
evidence from `docs/onderzoek/`.

**Hoe voelt je lijf?** (`engine/bodyCheck.ts`, decision
`docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md`) replaces the weekly complaints question: a
card on Vandaag only when there is a reason (setting `bodyCheck`), "Voel me fris" or tap a spot,
then spierpijn, stijf or pijn and the side (nek, bovenrug and onderrug also `midden`). It writes
to the same `InjuryNote` list as Lichaam (`kind`, `side`); spierpijn and stijf never count as an
injury and close after 7 days when read (`engine/injuryKind.ts`). "Wat terugkomt" on Lichaam is
derived, never stored (`engine/bodyRecurrence.ts`).

**A heavy leg day on tired legs** (`engine/legDayEase.ts`, `engine/legSoreness.ts`, decision
`docs/beslissingen/2026-10-27-spierpijn-en-zware-beendag.md`, design `docs/visie/Spierpijn en een zware beendag.md`):
a heavy leg day of today with a reason (soreness you reported, in the morning check or as a "spierpijn" note on a leg spot
of today or yesterday, the last answer wins; a hard run earlier today, a test run too, through `earlierTodayPoints` with 6
hours between when the time is unknown, said as "je loopt vandaag ook" when it is only planned; or a leg index above 12) gets
one card on Vandaag (`LegEaseCard`) and the same question in Forge. A hard run of today (not a test or race) gets the same
card too, only with "a day later" and no Lichter. MORNING-CHECK makes the same choice as the card
(`legDayEase.ts#legEaseCardSession`, the training `easeTarget` picks) and skips that one training, so one soreness gives one
card; without a card (setting not on voorstel, open pain on a leg spot) it speaks itself. The choices: "Lichter" (`easeSlots`: at least 3 reps in reserve, the last set off, extras gone, only exercises that
load the legs) or a day later (`adviceEngine.ts#legEaseMoveAdvice`, rule LEG-EASE, a proposal with Akkoord), always with
"Liever niet". The choice is kept per date and training in `AppSettings.legEaseDays` (last 60, `migrateLegEaseDays`) and
never touches a template, the planning or a log. `legFatigueOn` and the planner stay as they were, so `planGolden.test.ts`
does not move; the week rule LEG-FRESH is not built. A log of a training you eased is left out of "raak" per row, only for exercises that load the legs and
tied by the planned session with a day of room for the date (`strengthHistory.ts#comparisonRows`, `eased`). A soreness note of the
same day does not make a logged training "tired" (it has no time), the morning check does (`legsTiredAt`). Moving a heavy leg day or hard run shows a quiet line with the leg index of
the new day (`moveLegNote`). Settings "Lichter bij vermoeide benen" (`legEase`: voorstel, regel, uit; uit also silences the
quiet line) and "Hoe licht" (`legEaseHow`). Soreness only in the upper body is an optional chip "Alleen bovenlichaam" under Spierpijn in the morning check (`MorningCheckIn.soreWhere: 'upper'`, absent = legs, `wellbeing.ts#upperOnly`): it counts as no leg soreness for MORNING-CHECK, the card, `legSoreness` and the leg index, and Vandaag says "in je bovenlichaam" (`docs/beslissingen/2026-10-29-spierpijn-waar.md`).

**A doubtful short night** (watch off the wrist: under 4 hours, or under half your own
average once there are 7 days) becomes a question in the morning check instead of a
warning (`engine/shortNight.ts`, decision `docs/beslissingen/2026-10-25-korte-nacht-vragen.md`).
Your verdict per date lives in `AppSettings.nightJudgments`, tied to the measured minutes
(a later full night makes it lapse), read through `storage/migrations.ts#migrateNightJudgments`
and merged per date on restore. "Niet goed gemeten" keeps sleep, sleep score and HRV of
that night out of your own averages and the suggestion; resting heart rate still counts;
the numbers at Garmin and intervals.icu are never changed. Switch "Vragen bij een korte
nacht" (`AppSettings.askShortNight`).

**Wat speelde er** (`models/influence.ts`, `AppSettings.influences`, decision
`docs/beslissingen/2026-10-25-wat-speelde-er.md`): your own note about a training or a day
(alcohol with its amount, wiet, ziek, kort geslapen, stress, an own word). Noted only in the
Logboek: the sheet of a training and a tapped day in the calendar, never on the morning card.
A note on a training touches the morning of that day, one on a calendar day the morning after
(`engine/influence.ts#affectedMorning`, the one rule). It is a list next to the history, so a
log is never changed; it travels in the backup (`storage/migrations.ts#migrateInfluences`,
merged per id). An easy run with a heart rate outside 1.5 times the noise of the loopinzicht
gets a sign in Logboek and Week; "Niet meetellen voor hartslag" keeps a run out of Tempo bij
zone 2 and later comparisons, "Deze nacht niet meetellen" keeps a morning out of the resting
heart rate and HRV averages; load, leg index and the GR5 meters always count. What ASCEND knows
itself (a heavy leg day from the logbook, warmth from the weather, a short night from the watch,
an illness) is shown as a plain line, never asked to confirm, and counts in the overview by
itself (`engine/influence.ts#derivedFactEntries`, never stored; warmth only for heart rate at pace
and effort; only your own notes leave the bands; decision
`docs/beslissingen/2026-10-25-feiten-tellen-vanzelf.md`). ASCEND never names alcohol or wiet
itself; "lijkt op" (`engine/influenceEffects.ts#looksLike`) only for your own notes, with 4 times
on each side and bands that do not touch. Je stand shows "Wat doet dit met je?" from 3 times per reason against
your own band; a test the same day after 3 or more glasses (or wiet that day) gets a proposal
with Akkoord (`engine/influenceProposal.ts`). Morning numbers from intervals.icu are kept 400
days for this (`engine/wellnessRange.ts`). A reason is never in a list, a notification or the
Strava text. Setting "Voorbeelden bij naam noemen" (`AppSettings.influenceNames`, on by default) only
decides whether the explanation and help name alcohol and wiet or say "wat je dronk of gebruikte";
the chips stay (`data/settingsHelp.ts#settingsHelp`, decision `docs/beslissingen/2026-10-27-redenen-bij-naam.md`).
