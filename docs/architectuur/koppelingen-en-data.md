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

**Vangnet voor de bron** (decision `2026-10-31-kansen-stap-0.md`). `engine/sourceWatch.ts` says in one quiet line on
Vandaag when nothing comes in from the watch for three days while the link works (`storage/sourceWatch.ts`,
`components/SourceSilenceLine.tsx`, setting `watchSilence`). The mornings (date, resting heart rate, HRV, sleep
duration and score only) travel in the backup as `payload.mornings` (`engine/morningBackup.ts`,
`storage/migrations.ts#migrateMornings`, setting `morningInBackup`); a restore only adds mornings the device lacks.
The activities request asks only the fields `mapIntervalsActivity` reads (`ACTIVITY_FIELDS`), and asks once more
without the list when the answer is refused; a field read there belongs in that list.

**Signals from your data** (same decision, sheet "Signalen uit je gegevens" on Lichaam, `engine/signalSettings.ts`,
all on by default): early illness (`engine/illnessSigns.ts`, a question on Vandaag), heat and dew point under the
weather of a run (`engine/heatPace.ts`; the forecast now has `dewPointC` and `humidityPct`), a weekday where trainings
fall away (`engine/weekdayPattern.ts`, a line on Week), air quality for a hard training outside (`engine/airQuality.ts`,
`storage/airQuality.ts`, a cache at air-quality-api.open-meteo.com, never in a backup) and the morning rule two of
three (`engine/morningRule.ts`: on the morning card one word under each watch number, amber when it asks attention, and
at two of three "Ben je moe?" with Ja or Nee, which becomes the energy of the morning check). None of them changes the planning.
