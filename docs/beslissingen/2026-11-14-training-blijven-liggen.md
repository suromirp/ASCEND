# Een training die bleef liggen

Datum: 2026-11-14
Status: aangenomen

## Besluit

Een begonnen, niet afgeronde training in Forge loopt niet dagen door. Na middernacht (met een uur stilte), na een vaste grens zonder handeling (advies 12 uur, instelbaar: alleen middernacht, 4, 8 of 12 uur) of als de geplande sessie in je planning overgeslagen is, wordt hij een concept. De klok staat stil op je laatste handeling, de pil zegt "Niet afgerond" in amber en bij het openen van de app gaat eenmaal het blad Training niet afgerond open met Afronden met wat je deed, Verder en Weggooien (na een tweede tik met Annuleren). Het blad "Er loopt nog een training" heeft dezelfde uitweg; na Weggooien start de nieuwe training gewoon. Er gaat nooit iets stil weg en de planning verandert niet.

## Reden

Profiel afbreker (14 november, backlog N): een vergeten sessie liep 154 uur door naast "blijven liggen" en "Niet gedaan?", en het blok bij een nieuwe training had geen Verwijderen. Afronden met de klok van een nacht gaf een duur van uren.

## Alternatieven

Een sessie na de grens stil weggooien (verliest je sets, tegen "nooit stil weg"). Een overgeslagen sessie dood verklaren in `sessionIsDead` (zelfde verlies). De planner laten weten dat er een concept is (`missedTraining.ts`): planner-bestand, buiten deze opdracht; staat als vervolg.

## Bron

`docs/profielen/2026-11-14-afbreker.md` op `claude/profiel-afbreker`, punten 1, 3, 6 en 8.

## Vervangt

Niets. Vult `2026-10-29-forge-als-sessie.md` aan: een sessie eindigt nog steeds alleen met Afronden of Weggooien, nooit door tijd; de tijd maakt hem alleen een concept.

## Terugdraaien

`leftSession` in `src/engine/forgeSession.ts` laten teruggeven `undefined`; de pil en het blad gedragen zich dan als voorheen. De instelling `forgeLeftAfter` is optioneel en wordt bij import van een onbekende waarde weggelaten.
