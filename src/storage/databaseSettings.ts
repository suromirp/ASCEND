// De instellingen (AppSettings) met hun standaard, en of de rekoefeningen van vandaag zijn afgevinkt.

import type { WatchFieldStore } from '../engine/watchFields';
import type { ZoneAnswer } from '../models/zoneAnswer';
import type { AboveMission } from '../engine/todayCards';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { ExternalOneRm, WeightEntry } from '../models/metrics';
import type { SweatEntry, SweatPre } from '../models/sweat';
import type { MorningCheckIn, NightJudgment, WeeklyHealthCheck, WeeklyIntention } from '../models/checkIn';
import type { LegEaseDay } from '../models/legEase';
import type { TestJudgment } from '../models/testJudgment';
import type { InfluenceEntry } from '../models/influence';
import type { SportId } from '../data/sports';
import type { OverviewSettings } from '../engine/overviewSettings';
import type { StrengthSettings } from '../engine/strengthSettings';
import type { ClothingAdjust } from '../engine/clothingFeedback';
import type { RunInsightSettings } from '../engine/runInsightSettings';
import type { MorningNoticeSettings } from '../engine/morningNotice';
import type { PhaseLengthOverrides } from '../engine/programLayout';
import type { KindAmountMap } from '../data/trainingKinds';
import type { CustomSport } from '../engine/customSport';
import type { SportCounting, SportHandlingMap } from '../engine/sportRole';
import type { WeekShape } from '../engine/sports';
import type { RestWeekday } from '../engine/restDay';
import type { JourneyState } from '../engine/journey';
import type { PackListState } from '../engine/packList';
import { MetaRepo } from './databaseRepos';

// User-facing app preferences (as opposed to internal bookkeeping like
// `seeded`/`schemaVersion` above). Stored as a single object under one meta
// key so future settings don't each need their own key and migration.
export interface AppSettings {
  // When true, strength sessions are tracked externally (e.g. MacroFactor)
  // and ASCEND only records that the session happened, skipping the
  // per-exercise sets/reps/weight entry form.
  strengthTrackedExternally: boolean;
  // Synthesised drum hits on app open (see utils/introDrums.ts) — no audio
  // file, generated with the Web Audio API. Browsers block autoplay
  // without a user gesture, so it actually fires on the first tap/click
  // after launch, not literally on the splash frame itself.
  introSoundEnabled: boolean;
  // ISO timestamp of the last successful Settings → Export. Everything is
  // local-only (see CLAUDE.md) — this is what a weekly "you haven't backed
  // up" nudge compares against.
  lastExportedAt?: string;
  // ISO timestamp the export nudge was last dismissed. Tracked separately
  // from lastExportedAt so dismissing it actually snoozes for a week,
  // rather than reappearing on the very next app open.
  lastExportReminderDismissedAt?: string;
  // How fast runs and hikes build up (engine/ambition.ts). Unset: standaard.
  ambition?: 'rustig' | 'standaard' | 'stevig';
  // Real rest, or a light recovery day of 20-30 minutes (data/restDayCopy.ts).
  restDayMode?: 'rest' | 'active';
  // Your rest day, Monday to Friday (engine/restDay.ts). Unset: Monday.
  restDay?: RestWeekday;
  // Leg strength and a hard run on one day, 6+ hours apart (engine/scheduler.ts#setHardSameDayAllowed).
  hardSameDay?: boolean;
  // Leg strength the day after the long run, 24 hours instead of 48 (engine/scheduler.ts#setLongRunThenLegs). Unset: off.
  longRunThenLegs?: boolean;
  // Rest before a test: at least this many hours after the last heavy day for running or legs
  // (engine/scheduler.ts#setTestRestHours). Unset: 72, the advice. Only 48 or 72.
  testRest?: 48 | 72;
  // Your own heart rate values (Settings → Training → Mijn hartslag); the
  // training screens then show zones in bpm (engine/heartRateZones.ts).
  heartRate?: { maxHr?: number; lthr?: number; restingHr?: number };
  // "Nieuw begonnen" card on Today closed with NIEUW BEGINNEN.
  freshStartDismissedAt?: string;
  // Marathon goal — deliberately not a second Objective/MilestoneDefinition
  // ladder (several screens assume objectives[0] is "the" objective); a
  // standalone settings-backed goal instead, mirroring the GR5 card's UI.
  // undefined raceType means the goal card is hidden/not yet set up.
  marathonRaceType?: 'half' | 'full';
  marathonTargetDate?: string; // ISO date
  marathonTargetTimeMinutes?: number;
  // Fase 2 — how plan changes reach the calendar (engine/changeImpact.ts).
  // Absent = 'auto_small'. Optional with a default, so older stored
  // settings and backups need no migration step.
  changeApplyMode?: 'always_ask' | 'auto_small' | 'auto_all';
  // Fase 2 — which sports ASCEND may plan (engine/sports.ts). Logging is
  // never restricted. Absent = engine/sports.ts#DEFAULT_ENABLED_SPORTS.
  enabledSports?: Record<SportId, boolean>;
  // Sporten die meetellen (engine/sportRole.ts, docs/beslissingen/2026-10-31-sporten-rol-en-belasting.md):
  // per sport de rol ('plan', 'fixed', 'count', 'off') en bij een vaste dag de afspraken (dag, minuten,
  // zwaarte). Absent = the old settings: a sport that is on is planned, off does nothing, a sport ASCEND
  // does not plan has no role yet. Optional and additive; cleaned on import (migrations.ts#migrateSportHandling).
  sportHandling?: SportHandlingMap;
  // Hoe sporten meetellen (engine/sportRole.ts#resolveSportCounting): vragen bij een nieuwe sport, vragen hoe
  // zwaar het was, en de rust na een zware sport. Absent = het advies. Optional and additive; cleaned on
  // import (migrations.ts#migrateSportCounting).
  sportCounting?: Partial<SportCounting>;
  // Hoeveel per soort (engine/kindAmount.ts): per soort training Minder of Meer; Normaal staat er niet in.
  // Optional and additive; cleaned on import (migrations.ts#migrateKindAmount).
  kindAmount?: KindAmountMap;
  // Je eigen sporten (engine/customSport.ts): het type bij de bron, waar je het merkt en of het meetelt.
  // Optional and additive; cleaned on import (migrations.ts#migrateCustomSports).
  customSports?: CustomSport[];
  // "Zoveel keer per week" per sport (engine/sportFrequency.ts). A sport
  // missing here is on Automatisch: the weekly pattern and weekly planning
  // decide. Optional, so older settings need no migration.
  sportFrequency?: Partial<Record<SportId, number>>;
  // The shape of your week, chosen at the first questions (engine/weekShape.ts,
  // read by engine/sports.ts#weeklyPatternTemplates). Unset: the full default
  // pattern. Optional, so older settings and backups need no migration.
  weekShape?: WeekShape;
  // Fase 3 — the long Sunday from Bergcapaciteit on (engine/programLayout.ts).
  // Absent = 'hike'. Optional, so older settings need no migration.
  longSundaySession?: 'hike' | 'run';
  // Your own starting estimate of how long a strength training takes, per
  // template id (engine/durationLearning.ts). ASCEND switches to what it
  // learns from your logs once there are enough. Optional, no migration.
  sessionDurationEstimates?: Record<string, number>;
  // Your own phase lengths toward the goal (engine/programLayout.ts
  // #PhaseLengthOverrides). Absent = fully automatic. Optional, no migration.
  programPhaseOverrides?: PhaseLengthOverrides;
  // Ziek gemeld (engine/illness.ts). Optional, so older settings and
  // backups need no migration; travels with the settings in an export.
  illnessEpisodes?: IllnessEpisode[];
  // Vrije dagen, vakanties en tochten (engine/leave.ts). Optional and
  // additive, so older settings need no change; travels with the settings in
  // a backup (backup schema 5, storage/migrations.ts#migrateLeavePeriods).
  // Added and removed only with Akkoord on the proposal that goes with it.
  leavePeriods?: LeavePeriod[];
  // The next tocht (a trek you set up as a goal of your own, models/leave.ts
  // TrekDetails) on Vandaag. Absent = on. Optional and additive.
  showNextTrek?: boolean;
  // The season strip on the Ascend tab (engine/goalList.ts#seasonStrip). Absent = on. Optional and additive.
  showSeasonStrip?: boolean;
  // Vaardigheidsdoelen op de Ascend-tab (models/skillGoals.ts). Absent = on. Optional and additive; off hides the
  // cards and the tile, the goals and their cleared steps stay.
  showSkillGoals?: boolean;
  // Bergschoenen inlopen (engine/bootBreakIn.ts): het doel in kilometers (absent
  // = 100) en of een lange tocht ernaar herinnert (absent = aan). Optional and
  // additive; the date and name live in `journey.boots`.
  bootBreakInKm?: number;
  bootBreakInReminder?: boolean;
  // The line about the watch on a training ("Verstuurd naar je horloge om
  // 19.04", or the offer to link) and the small watch mark in the Week list
  // (only for sent or failed). Absent = on. Optional and additive.
  showWatchStatus?: boolean;
  showWatchStatusOnWeek?: boolean;
  // What goes before the name of a training sent to the watch: "ASC " (short,
  // absent = short), "ASCEND \u00b7 " (long) or nothing. Unless none, the
  // description starts with a dated line. Optional and additive.
  watchNamePrefix?: 'short' | 'long' | 'none';
  // Whose heart rate numbers the watch gets (engine/watchHeartRate.ts):
  // 'ascend' (absent = ascend) writes the beats of your own zones as a
  // percentage that intervals.icu turns into the same beats; 'intervals' sends
  // the zone name as before. Optional and additive.
  watchHeartRate?: 'ascend' | 'intervals';
  // An easy or long run gets only an upper limit (start of zone 1 to the end
  // of zone 2). Absent = on. Only with watchHeartRate 'ascend'.
  watchCalmRun?: boolean;
  // Take a done or past training out of the intervals.icu agenda at the next
  // round. Absent = on. Optional and additive.
  watchRemoveDone?: boolean;
  // The text for Strava on a done training (engine/
  // activityText.ts). Absent = on. Optional and additive, so no migration step.
  stravaText?: boolean;
  // What the text for Strava holds (engine/activityText.ts): only the title, or the
  // title and one line why. Absent = title and line. Optional and additive.
  stravaTextParts?: 'title' | 'title-line';
  // Datavelden voor je horloge (engine/watchFields.ts): the page that draws which data
  // pages to put on the watch per kind of training. Absent = on. Optional and additive.
  watchFieldsShown?: boolean;
  // Which watch the data pages are drawn for: an id from data/watchModels.ts. Absent or
  // unknown = the first model. Optional and additive.
  watchModel?: string;
  // The user's own versions next to the advice, per kind of training (at most two).
  // Read defensively (cleanWatchFieldStore, resolveVersion); absent = only the advice.
  watchFieldVersions?: WatchFieldStore;
  // The button "Route voorstellen" on a running session (engine/routePlanner.ts).
  // Absent = on. Optional and additive, so no migration step.
  routeProposal?: boolean;
  // Which loop comes first in the route proposal: one long loop past different
  // hills ('adventure', absent = adventure) or the same hill up and down ('simple').
  routeStyle?: 'simple' | 'adventure';
  // Where a proposed loop starts (engine/routeStart.ts): about your place, rounded to a kilometre
  // ('approx', absent = approx) or your own start point ('exact'). The point itself is never a
  // setting: it lives only on this device, outside the backup (storage/routeStart.ts).
  routeStart?: 'approx' | 'exact';
  // What lies under the loops on the route map (engine/routeMap.ts): a dark street map in the
  // app's colours ('dark', absent = dark), a light one ('light'), or nothing ('none': no tiles).
  routeMapBase?: 'dark' | 'light' | 'none';
  // Rest after a bergtocht: 'soft' (absent = soft) lets the short version of a
  // heavy leg day stand 48 hours after it, 'strict' keeps 72 hours.
  trekLegRest?: 'soft' | 'strict';
  // De afdaalklok (engine/descentClock.ts, docs/beslissingen/2026-11-11-afdaalklok.md): na 21 dagen zonder
  // afdaling een regel en een voorstel voor een korte trapsessie, en één bekende afdaling voor een bergtocht.
  // 'advies' (absent): aan bij een bergdoel of bergtocht. 'altijd': bij elk doel. 'uit': nooit. Elke andere
  // waarde leest als het advies (resolveDescentClock), dus er is geen migratiestap nodig. Optional and additive.
  descentClock?: 'advies' | 'altijd' | 'uit';
  // A training that moves for a holiday or a tocht (engine/leaveSpacing.ts): 'drop' (absent = drop,
  // the advice) lets it go rather than put it right before or after its own next time, 'shift' moves
  // it to any day of that week that fits. Optional and additive, so no migration step.
  leaveCrowding?: 'drop' | 'shift';
  // Around a holiday (engine/leaveAround.ts): 'wide' (absent = wide, the advice) looks for the best
  // arrangement over all workable days of the weeks around it, also over the week border; 'little'
  // leaves it to the week check, which moves a training to the nearest day of its own week. Optional
  // and additive, so no migration step.
  leaveAround?: 'wide' | 'little';
  // A new period without a gym (engine/noGym.ts): 'bodyweight' (absent = bodyweight, the advice)
  // puts a short session with your own weight in place of a gym session, 'drop' lets it go. Only
  // the starting choice in the sheet: the period keeps its own choice, so changing this never
  // changes a plan. Optional and additive, so no migration step.
  noGymStrength?: 'bodyweight' | 'drop';
  // How fast the long run grows toward a running race (engine/runGrowth.ts): 'weekly' (absent =
  // weekly, the advice), 'biweekly' or 'wave' (per block of four weeks, as before). Optional, additive.
  longRunGrowth?: 'weekly' | 'biweekly' | 'wave' | 'firm' | 'fast';
  // After the main goal (engine/programLayout.ts#planEndDay): 'stop' (absent =
  // stop) plans nothing during and after it until you choose a new goal;
  // 'maintain' plans maintenance weeks once the trip is over. During the trip
  // itself nothing is planned either way. Optional and additive.
  afterMainGoal?: 'stop' | 'maintain';
  // Kennisbank: what you marked as read and this week's lesson
  // (engine/weeklyLesson.ts). Optional and additive; travels in an export.
  knowledge?: { read?: string[]; week?: { weekStart: string; topicId: string } };
  // Trend weight (engine/bodyWeight.ts), e.g. from MacroFactor, entered
  // about every two weeks. Kept with the settings so it travels in an
  // export without a backup schema change; carries a source like every
  // other metric, so a Health Connect/MacroFactor adapter can fill it.
  weightEntries?: WeightEntry[];
  // The 1RM per exercise as MacroFactor reports it (models/metrics.ts#ExternalOneRm,
  // engine/macrofactorOneRm.ts), shown next to ASCEND's own estimate on Forge.
  // History, like the weight: kept with the settings so it travels in a backup
  // without a schema change, and a restore adds to it and never drops a day the
  // device has. Optional and additive: absent on an older device or backup, and
  // read defensively on import (storage/migrations.ts#migrateExternalOneRm).
  externalOneRm?: ExternalOneRm[];
  // The short morning check-in: legs, energy, sleep (models/checkIn.ts).
  // Optional and additive, travels with the settings in an export.
  morningCheckIns?: MorningCheckIn[];
  // Your own verdict on a night the watch only partly measured, per date
  // (engine/shortNight.ts, models/checkIn.ts#NightJudgment). The numbers from the
  // watch are never changed; this is ASCEND's own note. Optional and additive, so
  // the backup schema number does not move; travels with the settings and is read
  // defensively on import (storage/migrations.ts#migrateNightJudgments).
  nightJudgments?: NightJudgment[];
  // Je eigen wegingen voor en na een training: het zweetverlies (models/sweat.ts,
  // engine/sweat.ts). Een lijst naast de logs, zodat een log nooit verandert; wordt
  // defensief gelezen (storage/migrations.ts#migrateSweatEntries) en per id samengevoegd.
  sweatEntries?: SweatEntry[];
  // Je gewicht van vóór een training, bewaard tot de log van die dag er is (één per dag,
  // twee weken). Een concept naast de metingen; storage/migrations.ts#migrateSweatPre.
  sweatPre?: SweatPre[];
  // "Zweetverlies vragen": de herinnering om je te wegen en de rij bij het afronden.
  // Standaard aan.
  askSweat?: boolean;
  // Water per etappe tonen op Etappes en in het blad van een etappe. Standaard aan.
  showStageWater?: boolean;
  // "Vragen bij een korte nacht": ask instead of warning when the watch saw
  // doubtfully little sleep. Absent = on. Optional and additive.
  askShortNight?: boolean;
  // "Zonder doel" (engine/direction.ts, docs/beslissingen/2026-10-27-zonder-doel-stap-1.md): the
  // direction you chose when you have no goal ('maintain' Fit blijven, 'improve' Fitter worden,
  // 'stronger' Sterker worden, 'easy' Rustig aan), the Monday it started, and your own weekly
  // budget (minutes, times of strength, whether hard minutes count double). Absent = nothing
  // chosen, the advice of Fit blijven; the plan does not follow it yet. Optional and additive;
  // read defensively and cleaned on import (storage/migrations.ts#migrateDirection).
  direction?: 'maintain' | 'improve' | 'stronger' | 'easy';
  directionStart?: string;
  weekBudget?: { minutes?: number; strength?: number; doubleHard?: boolean };
  // De beginnersstart zonder doel (engine/beginnerStart.ts): 'auto' (advies, uit je logs), 'ja' of
  // 'nee'. Absent = auto. Optional and additive; cleaned on import (migrations.ts#migrateWaveSettings).
  beginnerStart?: 'auto' | 'ja' | 'nee';
  // De instelling Golven zonder doel (engine/waves.ts#resolveWaveSettings): de lengte (3, 4 of 6
  // weken; absent = 4) en of de laatste week lichter is (absent = ja). Optional and additive.
  waves?: { length?: 3 | 6; lightWeek?: false; review?: false; weeksForStep?: number };
  // De terugblik na een golf: de maandag waarop de golf begon waar je al een keuze voor maakte
  // (engine/waveReviewCard.ts). Een antwoord, geen vlag op een training. Optional and additive.
  waveReviewDone?: string;
  // Je Akkoord op neutrale golven voor een plan dat er al was (engine/noGoalWaves.ts): zonder dit
  // houdt de planningsronde een plan dat nog niet in golven loopt zoals het is. Een antwoord op een
  // voorstel, geen vlag op een training. Optional and additive; cleaned on import
  // (migrations.ts#migrateWaveSettings).
  noGoalWaves?: 'agreed';
  // "Twijfeltest eerst vragen": a test run that came out clearly slower than the one before
  // waits for your answer before it changes your paces. Absent = on. Optional and additive.
  askDoubtTest?: boolean;
  // "Nieuwe test voorstellen bij stilstand": a test run with a lot of standing still (or one that
  // waits for your answer) gets a proposal for a new attempt in place of the next hard run.
  // Absent = on. Optional and additive.
  newTestOnStops?: boolean;
  // "Rustdag terugzetten voorstellen": liet een voorstel je rustdag vervallen en is die dag weer leeg,
  // dan stelt ASCEND voor hem terug te zetten, met Akkoord (engine/restDayBack.ts). Absent = on.
  // Optional and additive.
  restDayBack?: boolean;
  // "Training die niet doorging" (engine/missedTraining.ts, docs/beslissingen/2026-11-01-niet-doorgegaan.md):
  // wat ASCEND doet met een training die voorbij is zonder log. 'ask' (absent) vraagt het één keer op
  // Vandaag, 'auto' zet hem zelf op overgeslagen met een melding en Ongedaan maken, 'off' doet niets.
  // `missedTrainingDays`: na hoeveel dagen (1, 2 of 3; absent = 2). `missedLink`: een log van het horloge
  // of MacroFactor op een andere dag wordt een voorstel om hem te koppelen (absent = on). Optional and additive.
  missedTraining?: 'ask' | 'auto' | 'off';
  missedTrainingDays?: 1 | 2 | 3;
  missedLink?: boolean;
  // "Kaarten boven de missie" (engine/todayCards.ts, docs/beslissingen/2026-11-01-vandaag-volgorde.md): hoeveel
  // kaarten op Vandaag boven de missie mogen staan, 1, 2 of 'all'. Absent = 1, het advies. Optional and additive.
  cardsAboveMission?: AboveMission;
  // "Voorstel bij een probleem in de week": what is wrong in a week and may not be repaired by
  // ASCEND itself (a training you or an accepted proposal fixed) gets a proposal with Akkoord.
  // Off keeps the notice and the lines in the rows, only the proposal is gone. Absent = on.
  weekFixProposal?: boolean;
  // Trainingen slepen in Week (components/useWeekDrag.ts). Afwezig is aan; uit haalt de grepen weg.
  dragWeek?: boolean;
  // Loslaten op een training in Week (engine/dropOnTraining.ts): 'swap' ruilt de twee van dag, 'together' zet
  // ze samen op die dag. Afwezig is 'swap', het advies. Optional and additive.
  dropOnTraining?: 'swap' | 'together';
  // Melding na jouw keuze in Week (engine/weekKept.ts): 'mine' zegt dat jij koos om een training te laten staan
  // (Benen fris op Vandaag), 'plain' houdt de gewone melding met knop. Afwezig is 'mine', het advies. Optional and additive.
  weekAfterChoice?: 'mine' | 'plain';
  // `forgeQuickButtons` (Snelknoppen tonen) bestaat niet meer: de snelknoppen zijn weg
  // (docs/beslissingen/2026-11-02-forge-herinrichting.md). Een oude waarde in een back-up wordt genegeerd.
  // Een set naar links vegen om hem te verwijderen (components/forge/SwipeRow.tsx). Afwezig is aan.
  forgeSwipeDelete?: boolean;
  // Oefeningen in een training (engine/forgeLayout.ts): 'scherm' een per scherm, opzij vegen (het advies) of 'lijst'
  // onder elkaar. Afwezig is het advies. Optional and additive; read defensively, so no migration step is needed.
  forgeLayout?: 'scherm' | 'lijst';
  // "Lange onderbreking vragen na" (engine/forgeSession.ts): kom je terug in een lopende training en was je laatste
  // handeling zo lang geleden terwijl de klok liep, dan vraagt Forge of die tijd meetelt. In minuten; 0 is uit.
  // Afwezig is 45 (het advies). Optional and additive; read defensively, so no migration step is needed.
  forgeLongBreak?: 0 | 30 | 45 | 60 | 90;
  // "Hoogstens per krachttraining" (engine/forgeTimeCap.ts): Forge kort een krachttraining in tot ongeveer zoveel
  // minuten, eerst het bijwerk. Gewone krachttraining (afwezig = 60, het advies) en beendag (afwezig = 75); 0 is uit.
  // Optional and additive; read defensively by resolveTimeCap, so no migration step is needed.
  forgeCapStrength?: 0 | 45 | 60 | 75 | 90;
  forgeCapLegs?: 0 | 45 | 60 | 75 | 90;
  // De volgorde van de blokken op Je stand, per pagina (engine/cardOrder.ts). Absent = de standaard.
  // Gelezen door resolveCardOrder; onbekende en dubbele id's vallen weg. Optional and additive.
  cardOrder?: { stand?: string[] };
  // "Trillen": een korte tik in je hand bij een schakelaar, een afgevinkte set, een training
  // oppakken en Akkoord. Absent = aan. Het rustsignaal van Forge staat hier los van.
  haptics?: boolean;
  // "Je locatie" (engine/locationSetting.ts, docs/beslissingen/2026-11-02-locatie.md): ASCEND mag je plek
  // van nu opvragen, voor het weer op je plek en voor je plek op een etappe. Absent = uit, behalve voor wie
  // het weer al liet volgen met "Mijn locatie". Alleen een yes or no; optional and additive, no migration.
  locationOn?: boolean;
  // "Doeltijd aanpassen voorstellen": a test that says your goal time is out of reach (or far too easy)
  // gets a proposal to change it (rule TARGET-TIME). Absent = on. One Liever niet holds for every later
  // test until the goal time itself changes. Optional and additive.
  proposeTargetTime?: boolean;
  // "Klaar voor je doel bij een doeltijd": 'speed' (advice, absent = speed) lets speed weigh most in
  // the number of a race with a goal time, 'equal' weighs every meter the same (engine/raceReadiness.ts).
  readinessWeighting?: 'speed' | 'equal';
  // "Groei bij het rekenen": 'average' (advice, absent = average) rekent met het midden van de groeiband,
  // 'careful' met de onderkant. Meter, regel en voorstel lezen dezelfde groei (data/goalGrowth.ts).
  goalGrowth?: 'average' | 'careful';
  // "Marge bij een tijdslimiet": 'ten' (advice, absent = ten), 'five' of 'none' procent marge onder de limiet
  // of cutoff (engine/limitReadiness.ts). Optional and additive.
  limitMargin?: 'ten' | 'five' | 'none';
  // "Stilstaan bij een testloop": 'skip' (advice, absent = skip) leaves the time of a stop at a
  // traffic light out of the fastest 5 km, 'count' keeps the clock as it ran. Read when the series is
  // read; what is stored stays as it was. Optional and additive.
  testStops?: 'skip' | 'count';
  // "Minder tijd vandaag" in het menu van de missiekaart (engine/shorterToday.ts): 'kern' (advice,
  // absent = kern) houdt de kernsets of de kern van de loop, 'volume' doet alles met minder, 'off'
  // laat de regel weg. Optional and additive.
  shorterToday?: 'kern' | 'volume' | 'off';
  // "Zones bijwerken na een test" (engine/zoneUpdate.ts): na een test die meetelt een voorstel met
  // Akkoord voor je drempelhartslag. Absent = on. Optional and additive.
  zonesAfterTest?: boolean;
  // De antwoorden op dat voorstel, per test (logId). Optional and additive
  // (storage/migrations.ts#migrateZoneAnswers).
  zoneAnswers?: ZoneAnswer[];
  // "Volledige reeks bewaren": keep the full series of a run or tocht on this device
  // (activityStreams). Absent = on. Off keeps only the derived profile and kilometres.
  // Optional and additive.
  keepStreams?: boolean;
  // "Tempo uit stabiele stukken": tempo bij zone 2 reads the stable pieces of every outdoor run
  // (engine/aerobicTrend.ts#tempoPiecesOn). Absent = on; off is the old average per easy run.
  // Optional and additive.
  tempoStablePieces?: boolean;
  // "Reeksen in back-up": the full series travel in the backup file (base64). Absent = on,
  // because the source may stop giving them out; off makes a small backup. The copies taken
  // before an import never hold them. Optional and additive.
  streamsInBackup?: boolean;
  // "Reeksen in back-up" as a choice (engine/streamsBackup.ts): 'twoYears' (advice, absent = twoYears,
  // or 'none' when the old switch streamsInBackup is off), 'all' or 'none'. Picking one drops the old
  // switch. Optional and additive; read on import by storage/migrations.ts#migrateDataSettings.
  streamsBackup?: 'twoYears' | 'all' | 'none';
  // "Ochtendgetallen in back-up" (engine/morningBackup.ts): the date, resting heart rate, HRV,
  // sleep duration and sleep score of each morning travel in the backup (payload.mornings).
  // Absent = on. Optional and additive; checked on import like the other switches (storage/backupNormalize.ts).
  morningInBackup?: boolean;
  // "Melden als je horloge stilvalt" (engine/sourceWatch.ts): one quiet line on Vandaag when
  // nothing comes in from the watch for three days while the link works. Absent = on.
  watchSilence?: boolean;
  // "Vroeg ziek zien" (engine/illnessSigns.ts): a question on Vandaag when resting heart rate and
  // HRV are off together for two mornings in a row. Absent = on. Optional and additive.
  illnessSigns?: boolean;
  // "Hitte bij je tempo" (engine/heatPace.ts): a line under the weather of a run when it is warm
  // or humid. Absent = on. Optional and additive.
  heatPace?: boolean;
  // "Patronen per weekdag" (engine/weekdayPattern.ts): a quiet line on Week when a training falls
  // away clearly more often on one weekday. Absent = on. Optional and additive.
  weekdayPattern?: boolean;
  // "Luchtkwaliteit" (engine/airQuality.ts): a line under the weather of a hard training outside
  // when the European air quality index is poor. Asks air-quality-api.open-meteo.com with the same
  // rounded place as the forecast. Absent = on. Optional and additive.
  airQuality?: boolean;
  // "Ochtendregel" (engine/morningRule.ts): the three watch numbers with a word each on the morning
  // card, and the question "Ben je moe?" when two of the three are off. Absent = on.
  morningRule?: boolean;
  // "Voorstel bij een slechte ochtend" (engine/morningProposal.ts): when two of the three watch numbers are off
  // (morningRule) and a hard session is planned today, one proposal with Akkoord to do it later. Absent = on.
  morningProposal?: boolean;
  // "Bergweer op hoogte" (engine/mountainWeather.ts): on a day of a tocht in the mountains or the snow with a highest
  // point, while the weather follows your location, the weather at that height on Vandaag. Asks Open-Meteo with the same rounded place as
  // the forecast, at most once an hour. Absent = on. Optional and additive.
  mountainWeather?: boolean;
  // "Weerwaarschuwingen" (engine/weatherWarnings.ts): onweer, zware windstoten of hitte op de dag van een tocht of
  // een lange training buiten, of de dag ervoor, als regel op Vandaag. Asks Open-Meteo with the rounded place of the
  // tocht or the weather, at most once an hour. Absent = on. Optional and additive; never changes the planning.
  weatherWarnings?: boolean;
  // "Lawinegevaar" (engine/avalanche.ts): the EAWS danger level near a tocht in the mountains or the snow in the snow
  // season, when the tocht has a place. Absent = on. Optional and additive; never changes the planning.
  avalancheBulletin?: boolean;
  // "Wennen aan warmte" (engine/heatAcclimation.ts): one line in the reisplanner in the last three weeks before
  // a departure from June to September. Absent = on. Optional and additive.
  heatAcclimation?: boolean;
  // "Tempocurve tussen testen" (engine/paceCurve.ts): the fastest 5 km or 3 km of your usual runs since the last
  // test that counts, next to that test on Je stand, as a check. The test stays the source of the paces. Absent = on.
  paceCurve?: boolean;
  // "Etappetijd op je eigen tempo" (engine/climbPace.ts#stageTimeEstimate): a GR5 stage and a usual day of the main
  // goal as a band of hours on your own climbing pace, once there are enough climbs; else the old estimate. Absent = on.
  stageOwnPace?: boolean;
  // "Je klimtempo" (engine/climbPace.ts): your own metres per hour up and down from the climbs of your walks
  // and tochten, on Je stand once there are six climbs from three tochten. Absent = on. Optional and additive.
  climbPace?: boolean;
  // "Oude voorstellen opruimen" (engine/proposalTidy.ts): decided proposals older than this many
  // months are summarised. 3 (advice, absent = 3), 6, 12 or 0 (off). Optional and additive.
  proposalTidyMonths?: 0 | 3 | 6 | 12;
  // Your own verdict per test run: "Telt mee" or "Telt niet mee" (models/testJudgment.ts,
  // engine/testJudgment.ts). The log is never changed. Optional and additive, so the backup
  // schema number does not move; read defensively on import
  // (storage/migrations.ts#migrateTestJudgments) and merged per log on restore.
  testJudgments?: TestJudgment[];
  // "Wat speelde er": your own notes about a day or a training (models/influence.ts).
  // Never changes a log or the watch numbers. Optional and additive, so the backup
  // schema number does not move; travels with the settings and is read defensively
  // on import (storage/migrations.ts#migrateInfluences), merged per id on restore.
  influences?: InfluenceEntry[];
  // The switches of "Wat speelde er" (group Lichaam). All absent = the advice:
  // the sign on a training with a deviating heart rate, the overview on Je stand and
  // the proposal to move a test are on, and the possible cause includes your pattern.
  influenceSign?: boolean;
  influenceCause?: 'uit' | 'weet' | 'patroon';
  influenceOverview?: boolean;
  influenceTestMove?: boolean;
  // Alcohol and wiet named in the explanation and the help of "Wat speelde er"
  // (absent = on). Off: the same texts in neutral words. Your own chips stay.
  influenceNames?: boolean;
  // The one question per week in the week review (models/checkIn.ts).
  weeklyHealthChecks?: WeeklyHealthCheck[];
  // The question of the week and your one-line plan (engine/weeklyQuestion.ts).
  // Optional and additive, so older settings and backups need no schema step;
  // it travels with the settings in an export and is validated on import.
  weeklyIntentions?: WeeklyIntention[];
  weightReminderSnoozedAt?: string; // ISO date
  // Reisplanner: which tasks on the way to the GR5 are ticked off
  // (engine/journey.ts). Optional and additive, so older settings and
  // backups need no schema step; travels with the settings in an export and
  // is read defensively (normalizeJourneyState).
  journey?: JourneyState;
  // Paklijst with weights (engine/packList.ts). Absent means the example
  // list from data/packList.ts. Same rules as `journey`.
  packList?: PackListState;
  // Days between weight reminders; 0 = never remind. Absent = 14.
  weightReminderDays?: number;
  // "Gewicht uit MacroFactor gebruiken" (engine/bodyWeight.ts#weightsInUse):
  // absent or true = the weight read from a MacroFactor export counts, false =
  // it stays stored but is not used. Optional and additive, so older settings
  // and backups need no schema step; travels with the settings in an export.
  weightFromMacroFactor?: boolean;
  // "Gewicht uit Health Connect gebruiken" (engine/bodyWeight.ts#weightsInUse,
  // docs/beslissingen/2026-11-04-gewicht-uit-health-connect.md): absent or true = a round of
  // Health Connect reads your weighings and they count, false = nothing is read and what is
  // stored is not used. Optional and additive; travels with the settings in an export.
  weightFromHealthConnect?: boolean;
  // "Gewichtstrend gebruiken" (engine/weightTrend.ts, docs/beslissingen/2026-11-09-gewichtstrend.md):
  // absent or true = the sheet and row Lichaamsgewicht show the trend over your weighings of the
  // last 14 days, false = the latest weighing. What Forge, the rucksack share and the leg index
  // use is `weightForLoad`. Optional and additive, so no schema step.
  weightTrend?: boolean;
  // "Gewicht bij eigen gewicht" (engine/weightTrend.ts#loadWeight, docs/beslissingen/2026-11-09-gewicht-bij-eigen-gewicht.md):
  // het gewicht waarmee Forge (eigen gewicht, optrekhulp, dips), het rugzakaandeel en de beenindex rekenen.
  // Afwezig of 'trend' = de gewichtstrend (met te weinig wegingen de laatste weging), 'latest' = de laatste weging.
  // Optioneel en additief, dus geen schemastap.
  weightForLoad?: 'trend' | 'latest';
  // "Overzicht Gewicht opent op" (engine/weightOverview.ts, docs/beslissingen/2026-11-09-overzicht-gewicht.md):
  // de periode waarmee het overzicht Gewicht achter de kaart op Je stand opent. Afwezig of '4w' = 4 weken
  // (het advies), '3m' = 3 maanden, '1y' = een jaar. Alleen wat je ziet. Optioneel en additief, dus geen schemastap.
  weightRange?: '4w' | '3m' | '1y';
  // "Gewicht op Je stand" (engine/weightCard.ts, docs/beslissingen/2026-11-09-gewicht-buiten-instellingen.md):
  // absent = aan zodra er een weging is, false = geen kaart Gewicht op Je stand en geen wegingen in het
  // Logboek. Alleen wat je ziet. Optioneel en additief, dus geen migratiestap.
  weightCard?: boolean;
  // "Vetpercentage tonen" (engine/bodyFat.ts): absent or true = the fat percentage and the
  // fat-free mass from the weigh-ins are shown under Lichaamsgewicht, false = they stay stored
  // but are not shown. Optional and additive, so older settings and backups need no step.
  showBodyFat?: boolean;
  // Where you live, for distances to training spots (engine/trainingSpots.ts).
  // Only ever stored on this device.
  homeLocation?: { name: string; lat: number; lon: number };
  // "Overzichten en vragen" (engine/overviewSettings.ts): what shows on Today
  // and what ASCEND proposes. Absent or missing keys = how the app always was.
  // Optional and additive; travels with the settings in a backup.
  overviews?: OverviewSettings;
  // "Forge" / Kracht meerekenen (engine/strengthSettings.ts): the switch, the
  // choices and the gym profile. Absent or missing keys = the advice. Optional
  // and additive; travels with the settings in a backup, where only valid
  // values are kept (storage/backupNormalize.ts).
  strengthModel?: StrengthSettings;
  // What you told ASCEND about the clothing advice: degrees to dress lighter
  // (plus) or heavier (minus), per sport, plus or minus 4 at most
  // (engine/clothingFeedback.ts). Absent = 0 everywhere. Optional and additive,
  // so older settings and backups need no migration step; travels with the
  // settings in a backup and is read defensively on import.
  clothingAdjust?: ClothingAdjust;
  // What the back button does on a tab ('today': to Vandaag first, 'previous':
  // to the tab before) and for how many minutes after a restart the app opens
  // where you were (0 = never). Absent = the advice (engine/navigationSettings.ts).
  // Optional and additive; travels in a backup, where only valid values are kept
  // (storage/migrations.ts#cleanNavigationSettings).
  tabBack?: 'today' | 'previous';
  resumeMinutes?: number;
  // "Beweging" (engine/motionSettings.ts): how much the app moves. Absent = 'full'.
  // Optional and additive; read defensively, so no migration step is needed.
  motion?: 'full' | 'calm' | 'off';
  // "Citaat op Vandaag" (engine/quoteSettings.ts): Engels (standaard), Nederlands of Uit. Absent = 'en'.
  // Optional and additive; read defensively, so no migration step is needed (an old backup reads as 'en').
  quoteLanguage?: 'en' | 'nl' | 'off';
  // "Hoe voelt je lijf?" (engine/bodyCheck.ts): wanneer de kaart op Vandaag komt: alleen als er
  // reden is (de standaard), elke week of nooit. Optional and additive; read defensively
  // (engine/bodyCheck.ts#resolveBodyCheck), so no migration step is needed.
  bodyCheck?: 'reden' | 'elke-week' | 'uit';
  // "Lichter bij vermoeide benen" (engine/legDayEase.ts): na spierpijn, een harde loop eerder die dag of een
  // hoge beenindex een voorstel voor een lichtere beendag of een dag later ('voorstel', het advies), alleen de
  // feitregel ('regel') of niets ('uit'). `legEaseHow`: hoe licht (3 herhalingen over en een set minder,
  // alleen het gewicht, of extra licht). Optional and additive; read defensively
  // (engine/legEaseSettings.ts), so no migration step is needed.
  legEase?: 'voorstel' | 'regel' | 'uit';
  legEaseHow?: 'standaard' | 'alleen-gewicht' | 'extra';
  // "Plaatjes bij oefeningen" (engine/exerciseArtSettings.ts): het spierkaartje en de tekening bij een oefening in
  // Forge ('beide', het advies), alleen het spierkaartje, of niets. Optional and additive; read defensively, so no
  // migration step is needed.
  exerciseArt?: 'beide' | 'spierkaart' | 'uit';
  // "Uitleg standaard uitgeklapt" (engine/exerciseArtSettings.ts#resolveGuideOpen): staat "Lees verder" in de uitleg van
  // een oefening bij het openen al open. Afwezig is uit. Optional and additive; no migration step is needed.
  guideOpen?: boolean;
  // Wat je koos op een dag met vermoeide benen, per datum en training (models/legEase.ts). Een lijst naast de
  // logs; de laatste 60. Optional and additive; read defensively on import
  // (storage/migrations.ts#migrateLegEaseDays) and merged per date and session.
  legEaseDays?: LegEaseDay[];
  // "Lucht bovenaan" (engine/skySettings.ts): the light or dark sky on the tabs, by
  // the clock ('auto', the default), always light or always dark, and from when it is
  // dark. Optional and additive; read defensively, so no migration step is needed.
  sky?: 'auto' | 'day' | 'night';
  skyNightFrom?: 'zon' | '19:00' | '20:00' | '21:00' | '22:00';
  // "Intensiteit tellen" (engine/intensitySettings.ts): of Je stand de minuten telt naar je
  // hartslag ('heartrate', de standaard) of naar het plan ('plan'). Optional and additive;
  // read defensively, so no migration step is needed.
  intensityCounting?: 'heartrate' | 'plan';
  // "Figuur" (engine/figureSettings.ts): of het figuur op Lichaam een man of een vrouw is.
  // Absent = 'auto' (van de koppeling als die het weet, anders een man). Optional and
  // additive; read defensively, so no migration step is needed.
  figure?: 'auto' | 'man' | 'vrouw';
  // "Loopinzicht" (engine/runInsightSettings.ts): the two lines after a run or
  // tocht, the weather lookup and the chest strap. Absent or missing keys = the
  // advice. Optional and additive; travels with the settings in a backup, where
  // only valid values are kept (storage/backupNormalize.ts).
  runInsight?: RunInsightSettings;
  // "Ochtendmelding" (engine/morningNotice.ts): a notice in the morning with the
  // question how you feel, shown by the service worker on a periodic sync. Absent
  // = off, at 07:30. The service worker reads this record from IndexedDB, so keep
  // the name and the shape. Optional and additive; travels with the settings in a
  // backup (the permission of the phone does not), where it is read defensively.
  morningNotice?: MorningNoticeSettings;
  // De meldingen van de Android-app (engine/deviceNotices.ts, docs/beslissingen/2026-11-01-android-app.md):
  // "Einde van de rust" (een melding op de eindtijd van de rust in Forge, ook met het scherm uit) en
  // "Weekmelding op zondag" met zijn tijd. Absent = aan, om 19:00. In de browser doen ze niets.
  // Optional and additive, so no migration step; a backup keeps only valid values (storage/backupNormalize.ts).
  restNotice?: boolean;
  weekNotice?: boolean;
  weekNoticeTime?: '18:00' | '19:00' | '20:00' | '21:00';
  // "De avond ervoor" (engine/eveningBefore.ts, docs/beslissingen/2026-11-11-avond-ervoor.md): vanaf de
  // tijd kijkt Vandaag naar morgen, met een melding als aparte keuze. Absent = aan vanaf 20:00, melding uit.
  // Optional and additive, so no migration step; a backup keeps only valid values (storage/backupClean.ts).
  eveningBefore?: boolean;
  eveningBeforeTime?: '19:00' | '20:00' | '21:00' | '22:00';
  eveningNotice?: boolean;
  // "Automatisch bijwerken" (engine/liveUpdate.ts): de Android-app haalt een nieuwere webversie
  // stil op voor de volgende start. Absent = aan. Optional and additive.
  autoUpdate?: boolean;
  // "Automatische back-up" (engine/autoBackup.ts, docs/beslissingen/2026-11-02-automatische-backup.md):
  // 'weekly' (zondagavond, the advice, absent = weekly), 'daily' or 'off'; and how many of the files
  // ASCEND wrote itself stay (4, 8 the advice, 16, or 0 for all). Where the files go and which ones
  // ASCEND wrote is of this device only and never travels in a backup (storage/autoBackup.ts).
  // Optional and additive; a backup keeps only valid values (storage/migrations.ts#migrateAutoBackupSettings).
  autoBackup?: 'off' | 'weekly' | 'daily';
  autoBackupKeep?: 0 | 4 | 8 | 16;
}

export const DEFAULT_SETTINGS: AppSettings = {
  strengthTrackedExternally: false,
  introSoundEnabled: true,
};

export const SettingsRepo = {
  get: async (): Promise<AppSettings> => {
    const stored = await MetaRepo.get<Partial<AppSettings>>('settings');
    return { ...DEFAULT_SETTINGS, ...stored };
  },
  set: async (patch: Partial<AppSettings>): Promise<AppSettings> => {
    const next = { ...(await SettingsRepo.get()), ...patch };
    await MetaRepo.set('settings', next);
    return next;
  },
};

// Whether today's daily stretch routine has been checked off. Stores the
// ISO date it was last marked done for each routine, not a bare boolean —
// comparing that date to today's is what makes the checkbox reset itself
// every day without any cleanup job.
export interface StretchCompletion {
  morning?: string;
  evening?: string;
}

export const StretchCompletionRepo = {
  get: async (): Promise<StretchCompletion> => {
    return (await MetaRepo.get<StretchCompletion>('stretchCompletion')) ?? {};
  },
  set: async (patch: Partial<StretchCompletion>): Promise<StretchCompletion> => {
    const next = { ...(await StretchCompletionRepo.get()), ...patch };
    await MetaRepo.set('stretchCompletion', next);
    return next;
  },
};
