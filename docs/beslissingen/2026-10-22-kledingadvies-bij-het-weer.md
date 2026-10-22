# Kledingadvies bij het weer

Datum: 2026-10-22
Status: aangenomen

## Besluit

ASCEND toont bij een buitentraining onder de weerregel hooguit vier korte regels over wat je aantrekt (romp en benen, handen en hoofd, buitenlaag en voeten, zon of donker), plus bij een tocht één zin over de rugzak. Het is advies en geen planning, dus er is geen voorstel met Akkoord. Na een buitentraining kun je één keer "Te warm", "Goed" of "Te koud" tikken; dat schuift je persoonlijke opslag een halve graad op, per sport, hooguit vier graden. Alles staat bij Overzichten en vragen: de schakelaar "Kledingadvies bij het weer" (standaard aan) en "Je voorkeur bijstellen terug naar standaard".

## Reden

Er bestaat geen gevalideerde tabel van temperatuur naar kleding. De regels volgen de gangbare praktijk van lopers, fietsers en bergsporters (kleed je alsof het warmer is, bescherm handen en hoofd apart) en staan als benoemde constanten in `src/engine/clothing.ts`, zodat ze bij te stellen zijn. De eigen tik van de gebruiker is de manier om de getallen aan hem aan te passen. De hittegewenningssessies van de GR5 (regel B2) krijgen nooit het advies om luchtiger te gaan.

## Alternatieven

Een vaste instelling "ik heb het snel koud": minder precies dan leren van wat je zelf voelde. Het oordeel per training opslaan op het log: dat zou historie herschrijven, daarom bewaart ASCEND alleen de opgetelde bijstelling in de instellingen. Het weer niet meer ophalen als kleding het enige is wat het gebruikt: niet gekozen, want dan is er juist geen kleding meer.

## Bron

`docs/onderzoek/Kleding bij het weer.md`, hoofdstuk "Voorstel voor engine-regels". Aanvullingen bij de bouw: de uv-index komt als één extra uurlijks veld bij Open-Meteo (`uv_index`); "de eerste tien minuten voel je het koel" en "warm op met een jack aan" alleen bij een gevoelstemperatuur onder 14 respectievelijk 12; op een aangename dag (T van 14 tot 22, droog) één regel. Code: `src/engine/clothing.ts`, `src/engine/clothingFeedback.ts`.

## Vervangt

Niets.

## Terugdraaien

Zet de schakelaar uit, of verwijder `<ClothingAdvice />` in `TodayMissionCard.tsx` en `TrainingGuideSheet.tsx` en `<ClothingFeedback />` in `CompletionMoment.tsx`. Het veld `clothingAdjust` in de instellingen blijft dan ongebruikt staan en is onschadelijk.

## Aanvulling na review (22 oktober 2026)

De regel voor een aangename dag in het onderzoeksrapport begint bij 14 graden. Dat botste met de rompregel, die onder 15 nog een dun shirt met lange mouwen zegt. De aangename dag begint nu pas bij 15 graden (de grens voor korte mouwen). Bij wandelen en bergtochten staat er alleen "Shirt, meer is niet nodig.", zonder korte broek: wat je daar aan de benen draagt volgt de gewone beenregel. Verder noemt de weerregel het donker alleen als tijdstip ("donker vanaf 18.12") zodra het kledingadvies aan staat en zelf een regel over het donker toont, en noemt de buitenlaagregel niets wat de rugzakzin al zegt.
