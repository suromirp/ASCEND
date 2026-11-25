# Sherpa Terugkeer: I-159, een gemiste training op de eerste rustdag

Datum: 25 november 2026. Branch `claude/terugkeer-rustdag`. Besluit: `docs/beslissingen/2026-11-25-terugkeer-rustdag.md`.

## Wat er is gebouwd

- `src/engine/reentry.ts#reentryCatchUp`: kiest de eerste rustdag in de zeven dagen van de instap en de laatste lichte
  gemiste training die daar past. `proposeReentry` roept hem aan na een pauze zonder ziekte (oorzaak `away` of `quiet`)
  en met de instelling aan; het resultaat staat als `catchUp` op het voorstel.
- `reentryCatchUpItems` maakt er een `move` van die als `startItems` met hetzelfde Akkoord meegaat
  (`src/components/CoachCard.tsx`, naast de ruil van de eerste dag). `reentryCatchUpLine` is de zin in het voorstel en in
  de regel van de planningsronde.
- `src/engine/adviceCompute.ts`: de rij is bezet (`usedIds`), zodat geen ander voorstel hem ernaast raakt.
- Instelling Gemiste training op je rustdag (`instap-rustdag`, `AppSettings.reentryCatchUp`, afwezig is aan): verklaring
  in `src/engine/settingsDefs/planning.ts`, uitleg in `uitleg/planning.ts`, waarde in `settingsSummary.ts`, de rij in
  `PlanningGroup.tsx` in het blad Training die niet doorging, `order.ts`, `backupClean.ts` (alleen een boolean). Geen
  migratie: optioneel en additief, zoals de andere vlaggen.

## Bewijs: een nagemaakte week per dag

Vakantie T-12 tot en met T-4, laatste training T-13, terug op maandag, dinsdag en woensdag niet fit, vandaag donderdag.
Uit `src/engine/terugkeerRustdagBewijs.test.ts` (met `BEWIJS=1`):

Voor:
- ma 15 februari: rustdag
- di 16 februari: Bovenlichaam A (gemist)
- wo 17 februari: Rustige duurloop (gemist)
- do 18 februari (vandaag): Bovenlichaam B
- vr 19 februari: rustdag
- za 20 februari: Heuvelintervallen
- zo 21 februari: Lange duurloop
- ma 22 februari: Bovenlichaam A
- di 23 februari: rustdag
- wo 24 februari: Rustige duurloop

Na Akkoord: hetzelfde, behalve wo 17 februari rustdag en vr 19 februari Rustige duurloop (op driekwart van de tijd, zoals
de rest van de instap). De zin in het voorstel: "Rustige duurloop van wo 17 februari deed je niet: die komt op
vr 19 februari, je eerste rustdag in die dagen, net zo kort als de rest."

## Eigen keuzes buiten de letter van de opdracht

1. In hetzelfde voorstel als de instap, geen eigen advies. Na een antwoord op de instap komt het gewone inhalen al terug
   (I-154); twee voorstellen over dezelfde dagen zouden botsen. Gevolg: wie de instap op de eerste dag al Akkoord gaf,
   krijgt voor later gemiste dagen het gewone inhalen (MISSED-CATCH-UP, alleen de sleuteltraining), niet deze regel.
2. "Licht" is kracht of een rustige loop: geen test of wedstrijd, geen harde loop (`isHardRun`, rol `hard_run`), niet de
   lange duurloop of bergtocht (rol `long`). Zware benen mogen wel, met 48 uur.
3. Rustdag: geen open training en niets getraind op die dag, geen vakantie- of tochtdag, en niet een van de twee dagen
   van de ruil van de eerste dag (I-144). Herstel mag blijven staan; het wordt niet weggehaald. Vandaag kan de rustdag
   zijn, net als bij de ruil van de eerste dag.
4. Welke gemiste training: de laatste die past (dichtst bij vandaag), dan volgorde en id. Gemist telt vanaf de dag na je
   laatste echte training; wat voor een vakantie of tocht open stond vervalt (zelfde regel als `pauseSince`).
5. Van jou: een slot van jou, of een rij met status `moved` zonder slot (zoals `lockLevel` hem leest), blijft staan.
6. De 48 uur kijkt naar gelogde zware beensessies en naar geplande open zware beensessies rond de rustdag, met de ruil
   van de eerste dag al toegepast.
7. Een vaste lengte op de gemiste rij gaat mee met de factor (afgerond op 5, minstens 5); zonder vaste lengte doen de
   duurregisters het, omdat de rij in de zeven dagen valt.
8. `src/engine/horizonChange.ts#diffHorizon` keek alleen naar rijen van vandaag en later, dus het voorstel van de
   planningsronde liet de verplaatsing niet zien (en `applyHorizonPlanNow` vergelijkt op dat verschil). Een rij uit het
   verleden die naar vandaag of later komt telt nu ook. De planningsronde zelf raakt geen rijen uit het verleden, dus dit
   verandert alleen iets voor een voorstel met `startItems` dat zoiets doet.
9. Ongedaan maken loopt via de gewone melding (`undoPlanChangeNow` met `before` en `settingsBefore`): de rij gaat terug
   naar zijn dag en de instap gaat weg. Getoetst in `src/storage/reentryCatchUp.test.ts`.

10. De instelling staat niet onder Lichaam, Na een pauze, naast Rustiger instap: Lichaam zit op het plafond van 12 rijen
   (`src/data/settingsLayout.test.ts`). Hij staat in Planning, in het blad Training die niet doorging (Geavanceerd),
   bij de andere instellingen over een gemiste training. Wil de eigenaar hem bij Rustiger instap, dan moet er op Lichaam
   een rij in een blad of het plafond omhoog; dat is een keuze voor Cartographer.
11. Niet in `src/engine/settingsDiff.ts` (Afwijkingen van het advies). Dan zou de bestaande test "als alles anders
   staat" (`src/engine/settingsDiff.test.ts`, opstelling `everything`) een regel `reentryCatchUp: false` nodig hebben,
   en een bestaande test aanpassen mocht niet zonder melding. Gevolg: zet je hem uit, dan noemt de lijst met
   afwijkingen van het advies hem niet. Eén regel in de spec en één in de opstelling; graag een akkoord.
12. De foto van de instellingen (`src/engine/__snapshots__/instellingen-foto.json`) is opnieuw gemaakt met de stap die de
   test zelf voorschrijft voor een nieuwe instelling (`npx vitest run -u src/engine/settingsFoto.test.ts`). Het verschil
   is de nieuwe instelling, de tellingen en het doornummeren van de index.

## Tests

- `src/engine/terugkeerRustdagInhalen.test.ts`: vakantie (voorstel), stille periode (voorstel), ziekte en ziekte met
  vakantie (rustdag blijft), geen lichte gemiste training, zware benen binnen 48 uur (gepland en vandaag gelogd), de dag
  zelf (23:30, niet gemist), week- en maandgrens in Europe/Amsterdam, rijen die je zelf vastzette, Liever niet en de
  instelling uit, een vaste lengte.
- `src/storage/reentryCatchUp.test.ts`: door de echte planningsronde, voor Akkoord niets, na Akkoord op de rustdag, een
  nieuwe ronde laat hem staan, Ongedaan maken zet alles terug.
- `src/engine/terugkeerRustdagBewijs.test.ts`: de week hierboven.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (één waarschuwing in `LegFatigueCard.tsx`, al op main).
- `npx vitest run`: 816 bestanden, 12432 tests; in de volle run faalde alleen de tijdtoets
  `src/engine/leavePlanAround.test.ts` ("stays fast", 6,9 s tegen 4 s) terwijl er twee andere volle runs en een kaart op
  dezelfde machine liepen. Los gedraaid: 17 van 17 groen. Deze wijziging raakt `planPass` niet.
- `npm run build`: groen.
- `npm run kaart:vergelijk`: één verschil, verklaard: het blad Training die niet doorging heeft de nieuwe rij Gemiste
  training op je rustdag (knop, titel, uitlegknop). `docs/app-kaart/instellingen-blad-bundel-niet-doorgegaan.md` is met
  die drie regels bijgewerkt. Tweede run daarna: 110 schermen gelijk, geen verschil, invarianten zonder schendingen.
- `npm run kennisindex:vergelijk`: geen verschil.
- `planGolden.test.ts`, de scheduler en de historie zijn niet aangeraakt; geen bestaande test aangepast. De foto van de
  instellingen is opnieuw gemaakt zoals de test voorschrijft (punt 12).

## Niet gecontroleerd

- Geen screenshot of Lookout: de nieuwe instellingsrij en de langere zin in het voorstel zijn niet op een toestel bekeken.
- Niet nagespeeld met een echte back-up van de eigenaar (die heb ik niet).
