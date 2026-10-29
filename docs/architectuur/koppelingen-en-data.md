Wat ASCEND van Garmin leert (intensiteit, zweet, bergschoenen) en de tekst voor Strava.

**Lessons from Garmin** (decisions `2026-10-25-intensiteit-gemeten.md`,
`2026-10-25-zweet-en-water.md`, `2026-10-25-bergschoenen-inlopen.md`). The intensity card on Je
stand counts real minutes per zone from the heart rate profile on a log
(`engine/intensityMinutes.ts`, read by `engine/standing.ts#intensityMix`), and falls back to what a
training was meant to be when there is no heart rate; switch "Intensiteit tellen". Sweat loss is
your own weighing before and after a log (or the watch estimate you type in), kept in
`AppSettings.sweatEntries` next to the logs (`storage/migrations.ts#migrateSweatEntries`); it
gives your own sweat rate by temperature (`engine/sweat.ts`) and the water per GR5 stage
(`engine/stageWater.ts`, "ongeveer", never medical advice). New mountain boots are counted from
the date you started wearing them, walks and treks only (`engine/bootBreakIn.ts`,
`JourneyState.boots`); the Reisplanner tasks for boots and sweat are done by the data
(`engine/journey.ts#withDerivedDone`, `withBootsDone`), never a stored flag. Running shoe
kilometres stay with Garmin.

**Strava text** (`engine/activityText.ts`): ASCEND never writes to Strava (that would
need a server); it prepares a short text to copy. Planned numbers appear only when
the log belongs to a planned session, and no minutes without a measured duration.
