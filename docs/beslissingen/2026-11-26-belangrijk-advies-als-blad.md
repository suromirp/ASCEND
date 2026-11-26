# Belangrijk advies als blad, één antwoord per dag

Datum: 2026-11-26
Status: aangenomen

## Besluit

Een kleine vaste klasse voorstellen komt bij het openen één keer als eigen blad naar voren: de rustiger instap na een pauze (REENTRY), golven zonder doel (NO-GOAL-WAVES) en de ladder van heel licht (BEGINNER-LADDER), op die volgorde (`src/engine/adviceFirst.ts#FIRST_SHEET_RULES`). Het blad heeft Akkoord (mint, het enige gevulde), Bekijk en Niet nu; Liever niet blijft op de kaart. Raken twee adviezen dezelfde dag of dezelfde geplande training, dan blijft er één staan en wacht het andere (`src/engine/oneAnswerPerDay.ts`). Instelling: Belangrijk advies als blad, standaard aan (I-157). Het terugdraairecord van een ronde van de weekcontrole noemt alleen wat die ronde deed (I-155).

De keuzes, elk met de reden:

1. Ziek of vrij voorbij staat niet in de klasse. Daar bestaat geen eigen herplanvoorstel voor; de terugkeer daarna is REENTRY.
2. Een advies-id komt hoogstens één keer als blad. Getoond is getoond: ook Bekijk zonder antwoord, of een blad dat bleef liggen, telt. Alleen Niet nu brengt het de volgende dag (`todayISO()`) terug, hoogstens drie keer (`FIRST_SHEET_MAX_SNOOZES`). Niet nu raakt `adviceResponses` en `learning.ts#declinedRules` niet.
3. Sluiten zonder antwoord (een tik op de achtergrond, de terugknop, omlaag vegen) telt als Niet nu.
4. Hoogstens één blad per keer dat je de app opent, en pas ongeveer anderhalve seconde na het opstarten (`FIRST_SHEET_SETTLE_MS`), zodat een blad dat bij het opstarten hoort (de welkomstvraag) zich eerst meldt.
5. Een gedeelde rij in `src/state/sheetRow.ts`. DebriefSheet, CompletionMoment, PermissionWelcome, UpdatePrompt, LiveUpdateHost, ChangeNotice (alleen de volle melding) en StartWelcome melden zich, ze wachten niet. Alleen het advies wacht en verschijnt als de rij leeg is. Komt er daarna een ander blad, dan blijft het advies staan (de eerste wint) en verschijnt het andere er gewoon boven, zoals nu. De weekterugblik is een kaart en zit niet in de rij.
6. Niet tijdens een training (Forge open, de pil, een open verzoek), niet bij een open concept, niet zonder programma en niet op een dag met een lopende vakantie, tocht of ziekte (`dayRules(...).holds`).
7. Bekijk opent het voorstel van de planningsronde (ProposalSheet via `useHorizonChange`), zoals de kaart. Akkoord rekent het plan uit en past het meteen toe met de nieuwe optie `direct` van `useHorizonChange`; botsen twee doelen, dan toch eerst het voorstel. De paden van de kaart en het blad zijn één helper (`src/components/useAdviceAccept.ts`). Akkoord heeft een grens van 15 seconden; daarna zegt het blad dat het langer duurt en komt de melding onderin zodra het klaar is. Faalt het, dan staat alles terug en zegt het blad dat er niets is aangepast.
8. Eén antwoord per dag werkt op de samengestelde lijst van `src/state/adviceAndWeek.ts` (ook de planner, de golven en de ladder), na `learnFromDeclines`. Volgorde: de klasse van het blad, dan prioriteit, dan id. Het andere advies krijgt `blockedBy` en hangt aan het eerste (`waiting`); het wordt niet opgeslagen. Onder het eerste staat: "Een ander advies voor dezelfde dag wacht tot dit is beantwoord." Wat wacht blijft bezet (`adviceBusyIds`, `catchUpWaiting`, `adviceSessionIds` lezen `waiting`), zodat Niet gedaan? en vanzelf overslaan het niet stil oplossen. `holdCatchUp` in `computeAdvice` blijft staan; dit is het vangnet erna. De weekplanning (WEEKLY-PRESCRIPTION) raakt alleen week +2 en later en botst daardoor zelden.
9. Het voorstel na een zware sport staat niet in de samengestelde lijst: het krijgt de trainingen die een advies op Vandaag al raakt als `taken` (`oneAnswerPerDay.ts#adviceTouchedSessions`). De bergspieren voegen een oefening toe en verschuiven geen dag; die vallen erbuiten.
10. I-155: `RecentPlanChange.alsoRevertLines` bewaart per record van de weekcontrole de regels van die ronde (`repairAudit.ts#joinPlanCheck`); ongedaan maken zet die in het terugdraairecord van dat record. Het eigen record houdt alle regels. Alleen in het geheugen.
11. `schemaVersion` blijft 6. De opdracht noemde "schemaVersion omhoog", maar de codebase houdt de versie gelijk bij een optioneel veld dat er alleen bij komt (zo deden `sportRestOffers`, `places` en `sessionRoutes` het ook), en vier tests verwachten versie 6 letterlijk. Er is wel een migratiestap: `storage/migrationsSettings.ts#migrateFirstSheet`, via `backupClean.ts`; samenvoegen in `backupMerge.ts` houdt per id de verste stand. Een oude back-up zonder `firstSheet` importeert zoals eerst.
12. De instelling staat in het blad Kaarten onder Of kies zelf, niet los op de pagina Vandaag: die zit aan het plafond van twaalf rijen, met al zes onder Geavanceerd (`settingsLayout.test.ts`).

## Reden

De eigenaar vond een groot voorstel tussen de kaarten te makkelijk te missen, en twee adviezen voor dezelfde dag naast elkaar "heel verwarrend". Een blad bij het openen maakt het ene grote voorstel zichtbaar zonder het op te dringen; één antwoord per dag houdt Vandaag leesbaar.

## Alternatieven

Elk advies met een voorstel als blad: te veel onderbreking. Een melding op de telefoon: buiten de app, en niet elk toestel kan het. Wachten in elk blad op de rij: meer kans op een blad dat nooit verschijnt; daarom wacht alleen het advies.

## Bron

`docs/visie/Plek belangrijk advies.md` (Pathfinder, 25 november), I-157 en I-155 in `docs/backlog.md`.

## Vervangt

Niets.

## Terugdraaien

Instelling Belangrijk advies als blad uit geeft alleen de kaart. In de code: `FirstAdviceHost` uit `App.tsx` halen en `oneAnswerPerDay(...)` rond de lijst in `adviceAndWeek.ts` weghalen. De velden `firstSheet` en `firstAdviceSheet` mogen blijven staan; ze worden dan niet meer gelezen.
