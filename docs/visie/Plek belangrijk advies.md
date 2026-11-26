# Plek belangrijk advies

Pathfinder, moment 1 (vooraf), 26 november 2026, voor I-157. Alleen gelezen, niets gebouwd. Bouwen kan pas na Cartographer en op het bouwmoment.

## Wat de eigenaar zag

Na een lange pauze stond op Vandaag alleen de kaart Gemist. De terugkeer zat in het blad "2 adviezen" achter Bekijk (`src/components/CoachCard.tsx`, `TodaySheet` met `AdviceItem` per advies), en twee adviezen wilden dezelfde dag veranderen zonder te zeggen dat ze elkaar uitsluiten. I-154 (f61b85b, `docs/beslissingen/2026-11-23-terugkeer-voor-inhalen.md`) lost dat voor REENTRY tegen inhalen op, in `src/engine/adviceCompute.ts` (`holdCatchUp`). De algemene regel ontbreekt nog.

## 1. Welke voorstellen in de vaste klasse

Criterium: een voorstel dat de hele week of het plan raakt, dat je niet zelf kunt bedenken en dat misgaat als je het mist. Bovendien één dat op dit moment open staat en waar de rest van het scherm niet los van kan.

In de klasse, en klein houden (drie, hoogstens vier):
- REENTRY, de rustiger instap (`src/engine/adviceBlock.ts#reentryAdvice`, `src/engine/reentry.ts`). Het voorbeeld van de eigenaar.
- Ziek of vrij voorbij: alleen als het een eigen voorstel is dat de week herplant (REST-WEEK-SKIP in `adviceBlock.ts` hoort er niet bij, zie onder).
- NO-GOAL-WAVES (`src/engine/noGoalWaves.ts`): een programmawijziging van het hele plan. Eenmalig, na een update.
- BEGINNER-LADDER (`src/engine/beginnerLadderOffer.ts`): idem, een programmawijziging in een lopende start.

Juist niet in de klasse:
- Alles met een kleine, dag- of sessiegrootte: MISSED-CATCH-UP, SKIPPED-KEY-TO-REST, REST-SWAP, REST-PULL, REST-BACK, HARD-THEN-SPACE, LIGHT-TWICE, SAME-MUSCLE-SPACING, TEST-RETRY, EXTRA-SESSION (`adviceWeek.ts`, `adviceLoad.ts`, `adviceCompute.ts`). Die blijven de kaart op Vandaag.
- Alles met een eigen moment: MORNING-CHECK en LEG-EASE (`adviceMorning.ts`, de ochtendkaart), weer (`weatherAdvice`), de afdaalklok (`descentClock.ts`), WEEK-CHECK (`weekFixProposal.ts`, Week), TARGET-TIME en GR5-PACK-TENT (Ascend).
- Alles wat de eigenaar zelf vroeg (Minder tijd vandaag, `shorterToday`), en wat van buiten komt (updates, toestemmingen).

Reden: een blad bij openen is een onderbreking. Het mag alleen voor iets waarvan het antwoord de rest van de dag of week bepaalt. Meer dan een handvol en het wordt een tweede Gemist-kaart.

Hoe het in de code kan: één lijst `FIRST_SHEET_RULES` (REENTRY, NO-GOAL-WAVES, BEGINNER-LADDER) in een nieuw `src/engine/adviceFirst.ts`, een pure functie `firstSheetAdvice(advice, state)` die het ene advies of niets teruggeeft. Niet als vlag op `Advice` in `adviceShared.ts`: dan sluipt hij in elke regel. Let op: NO-GOAL-WAVES en BEGINNER-LADDER komen niet uit `computeAdvice` maar worden in `src/state/adviceAndWeek.ts` ervoor gezet (`wavesOffer`, `ladderOffer`); de functie moet dus op de samengestelde lijst `advice` werken, niet erbinnen.

## 2. Waar en wanneer het blad verschijnt

Waar: één host in `src/App.tsx`, naast `<DebriefSheet />`, `<PermissionWelcome ready={mainReady} />` en `<LiveUpdateHost ready={mainReady} />`. Niet in `src/pages/Today.tsx`: dan komt het alleen als je op Vandaag landt en niet bij een link of Week. Bouw hem als `FirstAdviceHost` met `ready={mainReady}`, het blad zelf met `useSheetClose`, `ref={sheetRef}` en `<SheetGrip />`, zoals `DebriefSheet.tsx`. Inhoud: hergebruik `AdviceItem` uit `CoachCard.tsx` (dezelfde zin, één plek), geen tweede uitleg.

Knoppen: Akkoord (mint, het enige gevulde), Bekijk (opent hetzelfde voorstelblad als nu, `ProposalSheet.tsx`, met wat er verandert) en Niet nu. Let op de vaste woorden: in CoachCard heet de afwijzing Liever niet; die blijft Liever niet (antwoord, onthouden). Niet nu is hier alleen uitstellen.

Wanneer, alle voorwaarden samen:
- Eén keer per voorstel-id (REENTRY heeft een id per terugkeer, `found.id`). Onthoud in een kleine map per id met datum in de instellingen (`settings`), geen vlag op het log.
- Niet tijdens een training: geen `openSession` (`useOpenRequest`, `ForgeSessionHost`), geen open concept (`openDraftId`), geen lopende `SessionPillSlot`.
- Niet naast een ander blad of moment: wacht op `DebriefSheet` (`debriefLogId`), `CompletionMoment` (`celebration`), `PermissionWelcome`, `UpdatePrompt`, `ChangeNotice`, de weekterugblik en StartWelcome (`TodayPage` met `empty || hold`). Eén gedeelde "is er een blad open"-stand is nodig; die bestaat nu niet. Voorstel: een kleine rij in `src/state/` waar elk van die hosts zich bij meldt, en de eerste in de rij wint. Zonder die rij botst het met PermissionWelcome op de eerste start.
- Niet naast de ochtendkaart: de ochtendkaart is een kaart (`MorningCard`, `useMorningCardVisible`), geen blad, dus er botst niets; wel hoort de volgorde te kloppen. Eerst het blad, bij Niet nu of Akkoord staat de ochtendkaart er gewoon onder. De ochtendkaart en het blad antwoorden op iets anders (voel je je goed, tegen: wat doe je met je week); laat het blad voorgaan, want een instap bepaalt wat MORNING-CHECK dan nog betekent.
- Alleen met zichtbare uitkomst en tijdsgrens: Akkoord gaat door `respondToAdvice` en `useHorizon` zoals nu; de knop wacht met een tijdsgrens (CLAUDE.md).
- Niet bij een lege app of zonder programma (zelfde `needsFirstPlan` als `TodayPage`).
- Niet in een vakantie of ziekte die nog loopt: dan staat het voorstel er niet eens (de terugkeer komt pas daarna).

Waarom in App en niet op Vandaag: de eigenaar opent de app ook via Week of een link; een voorstel dat de hele week raakt hoort daar dan ook vooraan.

## 3. Hoe Niet nu werkt

Niet nu is geen antwoord. Het voorstel blijft open en verandert niets in `adviceResponses` (dat is voor Akkoord en Liever niet; `learning.ts#declinedRules` telt alleen die, en Niet nu hoort daar niet in te komen).

Advies: Niet nu zet de volgende keer op de volgende dag (dagwissel, `todayISO()`) en hoogstens drie keer; daarna blijft alleen de kaart op Vandaag. Dat is rustig genoeg, en drie dagen is ook het venster van het inhalen. Terwijl het blad niet open is, staat het voorstel gewoon als kaart op Vandaag (CoachCard). Geen herinnering die vanzelf groter wordt.

Opslaan: een kleine map `firstSheet: Record<adviceId, { shownOn, snoozes }>` in `AppSettings`. Dat is een opgeslagen vorm: dus een migratiestap in `src/storage/migrations.ts`, ook als het veld optioneel is (CLAUDE.md), en een regel in de export. Niet in `adviceResponses`: dat is append-only antwoord op een advies.

## 4. Adviezen die dezelfde dag raken

Waar ze nu staan, allemaal in `src/engine/`:
- `adviceCompute.ts#computeAdvice`: de plek waar alles samenkomt. `missed`, `skippedKey`, `testRoom`, `restSwap`, `restPull`, `tooHard`, `tooLight`, `injury`, `strength`, `spacing`, `extraSession`, `restWeekSkip`, `repeatWeek`, `reentry`, `tentPack`, `targetTime`, `retry`, `weather`, `morning`, `restBackLeft`, dan `fullWeekNow` en `descent`.
- Wat al botsingen oplost, elk met een eigen kleine regel: `usedIds` (regel 506 en volgende: een training in twee voorstellen), `retryUsed`, `catchUpDays` en `restBackLeft` (inhalen gaat voor REST-BACK), `takenDays` voor de afdaalklok, `weekBusy` voor de volle week, `holdCatchUp` voor de terugkeer (I-154), `oneVoicePerLog` in `oneVoice.ts` (één stem per log), `adviceShared.ts#adviceBusyIds`, `noGymGuard.ts`.
- Buiten `computeAdvice`: `plannerAdvice`, `wavesOffer`, `ladderOffer` (`src/state/adviceAndWeek.ts`), het weer en de ochtend (`MorningProposalCard.tsx`, `MorningCard.tsx`), het voorstel na een zware sport (`useSportRest`, `src/components`), de weekcontrole (`weekFixProposal.ts`), en de berg-spieren (`useMountainMuscleProposal.ts`). Dat de laatste drie niet door `computeAdvice` gaan is de reden dat I-155 bestaat (twee kaarten voor dezelfde training): ze kennen elkaar niet.

Waar de regel het best komt: in de engine, op één plek, als een tweede stap na `computeAdvice`, niet in elke regel. Naast `oneVoice.ts` een `oneAnswerPerDay.ts` met `oneAnswerPerDay(advice)`: het neemt de lijst die `adviceAndWeek.ts` samenstelt (dus ook de voorstellen van buiten `computeAdvice`), kijkt per datum welke `plannedSessionId`s en `toDate`/`fromDate` ze raken (zoals `adviceBusyIds` al doet) en laat bij een botsing één advies staan: de hoogste kans (de volgorde `FIRST_SHEET_RULES`, dan prioriteit, dan id). Het weggevallen advies krijgt `blockedBy: <id>` mee, niet opgeslagen.

Het tweede deel van de wens, "of zeg dat ze elkaar uitsluiten": kies dat de eigenaar het ziet, maar alleen als het verlies reëel is. Advies: toon er één; en onder dat ene advies een korte regel "Een ander advies voor dezelfde dag wacht tot dit is beantwoord" (stem: het droge feit eerst). Zeg niet welke, geen tweede kaart. Na Akkoord of Liever niet komt het andere terug of is het vervallen, omdat de planner opnieuw rekent (de bestaande aanpak van I-154 voor inhalen).

De I-154-regel (REENTRY wint van inhalen) wordt hierdoor een geval van de algemene: laat `holdCatchUp` staan als snelle weg en vervang hem later, niet nu.

## 5. Instelling

Vandaag en meldingen: `src/engine/settingsDefs/vandaag.ts` (naast "Hoe voelt je lijf?"), uitleg in `src/engine/settingsDefs/uitleg/vandaag.ts`, waarde in `src/engine/settingsSummary.ts`, pagina `src/components/settings/groups/VandaagGroup.tsx` en `VandaagSheets.tsx`. Titel: "Belangrijk advies als blad". Advies aan. Eén zin: "Een groot voorstel, zoals een rustiger instap, komt bij het openen één keer als blad naar voren." Met Uit komt alleen de kaart op Vandaag, zoals nu.

Niet in Lichaam en herstel: de instelling `rustigerInstap` (`settingsDefs/lichaam.ts`) beslist of de terugkeer wordt voorgesteld, niet hoe hij verschijnt. Dat blijven twee dingen, op twee plekken, met een verwijzing in de uitleg van beide.

Geen instelling voor het aantal keren Niet nu: drie is vast, de eigenaar vroeg om één keer.

## Samenhang en risico's

- Eén plek per ding: het blad hergebruikt `AdviceItem`; geen tweede tekst. Op Vandaag blijft de kaart gewoon staan; de eigenaar die Niet nu koos, ziet hem daar terug. Geen dubbele zin op één scherm tegelijk: het blad bedekt Vandaag, dus de invariant "dezelfde zin twee keer" geldt niet, maar controleer dat de kaart eronder niet opnieuw knippert zodra het blad sluit.
- Het is een blad bij openen, dus een nieuwe flow: Lookout moet hem zien bij een koude start, na Akkoord, na Niet nu, met een openstaande training en met PermissionWelcome tegelijk. Een nagemaakte stand is niet zijn echte gebruik.
- Houd de klasse klein. Elke nieuwe regel in `FIRST_SHEET_RULES` is een besluit in `docs/beslissingen/`.
- Niet gedaan en niet kunnen zien: ik heb de app niet gedraaid en geen schermen gezien. Welke ids precies per terugkeer ontstaan heb ik niet nagespeeld (alleen `reentryAdvice` gelezen). Of `useOpenRequest` ook een lopende training zonder concept dekt, moet de bouwer nalopen.
