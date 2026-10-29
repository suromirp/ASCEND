Hardlopen en testen: hartslag op het horloge, run in detail en de testloop met de tempo's.

**Heart rate on the watch** (`engine/watchHeartRate.ts`, `engine/heartRateZones.ts`, decision
`docs/beslissingen/2026-10-25-hartslag-op-het-horloge.md`): ASCEND's zones follow Garmin's
"Standaard" split on the threshold (66-81, 81-89, 89-96, 96-101%). With "Zones van ASCEND" (the
advice) a workout sent to intervals.icu carries ASCEND's own beats as a percentage of the
threshold intervals.icu uses (read from its sport settings), so the watch shows the same range
the app judges by; a zone name is only the fallback. An easy step runs from the start of zone 1 to
the end of its own zone ("Rustige loop: ruime grens"), intensity 4 up to the maximum.

**Run in detail, the data** (`storage/activityDetail.ts`, `engine/streamPack.ts`, `engine/runDetail.ts`,
`engine/runDetailRules.ts`, decision `docs/beslissingen/2026-10-27-run-in-detail-gegevens.md`): the full series of a
run or tocht live in a store of their own, `activityStreams` (key `logId`, database version 9), packed as typed
arrays at the moments the watch wrote them; the track is never kept, only the wind against you per kilometre worked
out from it. The series DO go in the backup file by default (base64, setting "Reeksen in back-up", size in the row)
because the source may stop handing Garmin data out and then a restore could not fetch them again; the copies taken
before an import (`backupSnapshots`) never hold them. "Volledige reeks bewaren" decides whether they are kept at all.
`SessionLog.runDetail` (kilometres, laps, a line of about 150 points, the place of the best 5 km) is derived and
append-only like `detail` and `bestEffort`: added once, tied to the totals it was read for (`wholeKm`, `wholeMinutes`),
`runDetailTried` the fingerprint of totals that gave nothing, never a change to a measured number, and a damaged one
is dropped by `migrateLogRunDetail` without losing the log. Kilometres, laps and the verdicts (RD-1 to RD-8) are pure
functions with tests; a test, tempo run or interval training gets one line about the spread of its pace
(`RunInsight.pacing`), the two-line rule after a run stays.

**The test run and the paces** (`engine/racePrediction.ts#countedTests`, `engine/bestEffort.ts`,
`engine/testJudgment.ts`, decisions `docs/beslissingen/2026-10-27-testloop-lezen.md` and
`2026-10-27-testloop-lezen-aanvulling.md`): a test counts with the fastest unbroken 5 km of the watch's series
(`SessionLog.bestEffort`) and with the whole log when there is none; the app says which. `bestEffort` is derived and
append-only, like `detail`, not a new exception to "never rewrite logs": it is added once, tied to the totals it was
read for (`wholeKm`, `wholeMinutes`; a source correction makes it stale and it is read again, `bestEffortTried` stops
a series that gave nothing from being fetched again), and it counts only once `accepted` is set: at once for a test
that has just come in or when counting it changes no pace, otherwise after Akkoord on the old and new paces in the log
sheet, so paces never depend on whether a log was opened. Paces, prediction, target-time check and the watch all read
`pacesFromLogs`/`countedTests` and never `tests.at(-1)` by themselves. A test clearly slower than the last one that
counts waits for your answer ("Telt mee" or "Telt niet mee", `AppSettings.testJudgments`, per log, next to the logs,
"Telt niet mee" never dropped by the cap of 60) and until then the old paces hold; a quiet line on Vandaag
(`TestPendingLine`) says so, and an older waiting test keeps its question while a newer one waits too. Tests on
different bases are compared on the whole run. "Telt niet mee" works on any test afterwards. Setting "Twijfeltest
eerst vragen" (`askDoubtTest`); off means the latest test counts, as before. A test of the last 60 days that still has no best 5 km is read in the background at the opening (`activityDetail.ts#ensureRecentTestEfforts`); one that waits for Akkoord gets a quiet line on Vandaag after the doubt line, never two (`testJudgment.ts#effortOfferLine`), and TARGET-TIME names its basis and waits for that Akkoord (`docs/beslissingen/2026-10-27-snelste-5km-achteraf.md`). The fastest 5 km counts moving time and moving distance: a stop (a pause gap with almost no distance, or a creep under 1 m/s for 3 seconds or more) is not a hole and costs and gives nothing, stops less than 10 s or 20 m of movement apart are one stop, and a catch-up jump right after a stop (more than 1.5 times the median pace over 10 s) makes that stretch a hole; stops are counted in `BestEffort.stops` and `stoppedSec` and said ("Je stond 3 keer stil, samen 1:40; die tijd telt niet mee.", with one dry sentence above 60 seconds or 3 stops); a gap where the distance jumps stays a hole; `BestEffort.v` makes a waiting best effort without it be read once more, and an accepted one of the last 60 days is read once more into `SessionLog.bestEffortReread` (the old one keeps counting; it takes over at once only when no pace changes, else after Akkoord); `bestEffortTried` carries `|v2`; a new test with stops faster than the whole run that changes a pace asks Akkoord; setting "Stilstaan bij een testloop" (`testStops`, skip or count; `docs/beslissingen/2026-10-27-stilstaan-bij-de-testloop.md` and `-aanvulling.md`). A last test with more standing still than "iets te gunstig" (or one waiting as a doubt), with no other test within 14 days, gets a proposal with Akkoord (TEST-RETRY, `adviceEngine.ts`, setting "Nieuwe test voorstellen bij stilstand", `newTestOnStops`): the first hard run (role `hard_run`) at least 3 days after it, within 10 days, becomes a 5 km test on the same day (a `move` with `templateId`), and what the usual spacing finds in the way moves in the same proposal: leg strength to after the test (as TEST-MAKE-ROOM), a long run or hard run of the day after to the next day where it fits (short when that week has a long run of its own, a recovery walk there may give way), the smallest change first with up to three `options`; a session you locked is never moved by itself, only with its name in the proposal, and a hard run you locked never becomes the test; the end state is judged by the leg index on the test day against the same line as TEST-FRESH and TEST-MAKE-ROOM (`FATIGUE_THRESHOLDS.test.fresh`), and a heavy leg day that makes the legs tired moves first, processed last after the runs, to 0 to 3 days after the test with the same building blocks as TEST-MAKE-ROOM; one you locked is offered that move with its name ("die je zelf vastzette, gaat naar ...") and a `remove` as the second option, and only a day that fits nowhere is a `remove` (named: "laat je deze week gaan"), weighing more when it was yours and more than a move, so accepting it leaves nothing for the week check or TEST-MAKE-ROOM to say; the quiet leg-index line in the proposal sheet is worked out on the end state of the proposal; holiday, trek and light days, ids already used by another proposal, the leg day the Benen card speaks for and a day without room (day budget, with the short length of a moved long run) are no candidates, and TEST-RETRY is silent while TEST-MAKE-ROOM speaks; no workable day, no advice; a move never takes the last rest day of a week (a day without training, a recovery walk counts as rest): it first looks for a target day that keeps one, otherwise the same proposal lets the lightest training of that week go (not a long run, hard run, test, race, leg day, your own lock or a logged one) and says so, and with none to let go the long run itself goes this time; Liever niet is kept per test date (`docs/beslissingen/2026-10-28-nieuwe-testpoging.md`, `-ruimte.md`, `-herstel.md`, `-verschuiven.md` and `-rustdag.md`).
