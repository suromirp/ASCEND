# Gemist: wat je miste doe je niet dubbel, de rest gaat terug naar het plan

Datum: 2026-11-15
Status: aangenomen

## Besluit

Week en de weekterugblik zeggen over gemiste trainingen hetzelfde: wat je miste doe je niet dubbel, en de rest van je week kan terug naar het plan met Week opnieuw plannen.

- De rij onder de dagen in Week zegt: "Je hebt deze week 2 trainingen gemist. Die doe je niet dubbel; zet de rest terug naar het plan." (`engine/weekList.ts#replanSub`). Het getal gaat over deze week en staat er met die woorden.
- De regel Gemist in de weekterugblik van een lopende week met een programma verwijst naar die rij: "Laat het los; dubbel doen helpt niet. De rest van je week zet Week opnieuw plannen terug naar het plan." (`engine/weekGlance.ts#attentionLines`, `MISSED_REPLAN_HINT`, `WeekReview.replan`). Een voorbije week heeft die rij niet en dus ook geen verwijzing. Een gemiste sleuteltraining houdt zijn eigen zin: die komt na Akkoord op een vrije dag, als dat past. Dat is inhalen op een vrije dag, geen dubbel doen.
- Het inhaaladvies noemt geen eigen aantal meer in de titel. Het kijkt drie dagen terug, ook over de weekgrens, terwijl de rij in Week de hele lopende week telt. De titel zegt nu de dagen: "Gemist sinds vr 9 oktober: Bovenlichaam B en Rustige duurloop" (`engine/adviceWeek.ts#missedAdvice`). Eén training houdt "Lange duurloop van za 14 november gemist".
- De weekterugblik sluit de som (`engine/weekGlance.ts#weekRestLines`): onder de telling staat "Overgeslagen: ..." (telt mee in "van n") en "Vervallen: ..., telt niet mee" (een pauze haalde hem uit de telling), met dezelfde trainingen als de rijen in Week die dat woord zeggen (`WeekReview.skipped` en `lapsed`, vervallen via `engine/sessionStatus.ts#isPausedFor`). Valt Gemist buiten de twee regels om op te letten, dan staat hij daar ook, zonder advies.
- Een training op een andere dag gedaan dan gepland blijft in Week op de geplande dag en zegt "gedaan di 27" (`engine/weekRow.ts#doneOnOtherDay`, dezelfde dag als `engine/logDay.ts`; een training uit MacroFactor over middernacht krijgt niets). De dag is de staart die nooit wordt afgekapt; "aangepast" komt erbij als hij een regel in Aangepast door ASCEND heeft. Alleen weergave: de log en de planning blijven zoals ze zijn.

## Reden

Pathfinder (15 november, backlog I-40 tot I-43) zag op de tekstkaart dat de rij "Je hebt 2 trainingen gemist. Zet de rest terug naar het plan." en de terugblik "Laat het los; dubbel doen helpt niet" bij dezelfde trainingen het tegenovergestelde leken te zeggen. Ze zeiden het niet: Week opnieuw plannen zet alleen de rest van de week terug, vandaag en later, en haalt niets in (`engine/replanWeek.ts`). Maar "zet terug" na "gemist" las als inhalen. Nu zeggen beide de twee helften: niet dubbel, de rest terug. Verder telde de titel van het inhaaladvies andere dagen dan de rij in Week, noemde de terugblik overgeslagen en vervallen nergens terwijl de telling ze meetelde of wegliet, en zei een rij nergens dat de training op een andere dag gedaan was.

## Alternatieven

- De rij in Week laten inhalen aanbieden en de terugblik "laat los" laten weghalen. Niet gekozen: inhalen is één sleuteltraining op een vrije dag, met Akkoord via het inhaaladvies (`engine/adviceWeek.ts#missedAdvice`); alles inhalen is stapelen (`docs/onderzoek`, rapport 2, regel C8).
- Het inhaaladvies ook de hele week laten tellen. Niet gekozen: het venster van drie dagen is bewust, zodat een oude gemiste training geen voorstel meer krijgt; het advies kan ook over de weekgrens kijken. Zeggen over welke dagen het gaat is genoeg.
- Overgeslagen en vervallen als regels in Let op. Niet gekozen: Let op heeft hoogstens twee regels en is voor wat aandacht vraagt; overgeslagen is een eigen keuze en vervallen een gemelde pauze.
- De rij van een training die op een andere dag gedaan is naar die dag verplaatsen. Niet gekozen: dat herschrijft de planning om een log te tonen (werkbriefje Week, Nooit); de beendag en de telling blijven op de geplande dag.

## Bron

Backlog I-40, I-41, I-42 en I-43 (Pathfinder, 15 november); de coördinator gaf het advies voor I-42 mee (de kaart biedt opnieuw plannen aan, de terugblik zegt dat je niet dubbel doet en verwijst naar de kaart). Toetsen in `src/engine/weekSamenhang.test.ts` en `src/engine/weekRow.test.ts`; invarianten op de tekstkaart in `scripts/app-kaart/invarianten.mjs`.

## Vervangt

Niets. Vult `2026-11-15-week-telling-zonder-sportschool.md` aan: de telling blijft, de woorden eromheen zeggen nu één ding.

## Terugdraaien

De tekst in `engine/weekList.ts#replanSub`, `MISSED_REPLAN_HINT` en `weekRestLines` in `engine/weekGlance.ts`, de titel in `engine/adviceWeek.ts#missedAdvice`, en `doneOn` in `engine/weekRow.ts` en `components/WeekPlanner.tsx`. Er verandert geen opgeslagen vorm.
