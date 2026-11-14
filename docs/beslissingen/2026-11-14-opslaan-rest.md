# Opslaan, de rest: dezelfde losse training, in beeld, en één melding

Datum: 2026-11-14
Status: aangenomen

## Besluit

Dezelfde losse training is dezelfde training (`templateId`) op dezelfde dag, zolang de eerste opslag nog loopt. Een tweede poging met een andere invulling wacht dan op de eerste. Staat dat log er, dan krijgt de tweede nee en komt er geen tweede log bij. Mislukte de eerste, dan schrijft de tweede zelf. Is de eerste klaar, dan is de dag weer vrij: twee keer lopen op een dag blijft twee logs.

In beeld is strenger geworden. Een blad telt niet meer als in beeld vanaf het moment dat het begint te sluiten (`onLeave` van `useSheetClose`), niet pas als het weg is. De kaart Van je horloge telt alleen als in beeld voor de activiteit die hij op dat moment als voorstel toont. Een schrijffout die niemand ziet gaat naar de melding bovenin en laat op de kaart geen zin achter.

Opnieuw tikken terwijl een eerdere poging nog loopt geeft een eigen zin: "Opslaan duurt langer dan verwacht. Kijk in je logboek of hij er staat. Staat hij er niet, sluit ASCEND dan af en open de app opnieuw." Dat geldt voor de kaart, het blad van een training (MacroFactor), de sportvraag en Forge (met "Je sets blijven bewaard").

Forge toont bij een schrijffout alleen zijn eigen zin. Het blad van een training slaat een MacroFactor-training op via dezelfde stap als de kaart (`saveOnCard`). `logWithOwnNotice` houdt de melding bovenin alleen tegen als het scherm `onWriteError` meegeeft.

## Reden

Dit zijn de punten die na vijf rondes Opslaan open bleven (Warden en Lookout, 14 november, en "Nog open" in `2026-11-14-nee-van-logsession.md`).

Een losse training had geen sleutel. Het oude trainingsscherm sluiten, weer openen, iets anders invullen en opslaan terwijl de eerste opslag hing gaf twee logs van één training. Wachten in plaats van meteen nee zeggen houdt de tweede invulling veilig: mislukt de eerste, dan gaat er niets verloren.

De zin "probeer het nog eens" klopte niet meer zodra een poging vasthing: nog eens tikken geeft dan steeds nee, en alleen opnieuw starten helpt. Vrijgeven op een klok blijft afgewezen, want de schrijfactie kan alsnog landen.

Per pad wat je ziet, voor en na:

- In beeld, mislukt. Voor en na: de amber zin op het scherm, niets bovenin. Forge voor: zijn zin en de melding bovenin. Na: alleen zijn zin. Het blad van een training (MacroFactor) voor: de knop sprong terug zonder zin, met alleen de melding bovenin. Na: de zin onder de knop.
- Weg. Voor en na: de melding bovenin. Nieuw: een blad dat aan het sluiten is telt als weg, en de kaart die intussen een ander voorstel of een vraag toont ook.
- Laat antwoord. Voor en na: eerst de zin van de grens, daarna ja (het blad sluit) of nee (amber). Forge en de sportvraag: een nee na de grens gaat bovenin, het blad zei al dat het langer duurt.
- Tweede poging terwijl de eerste loopt. Voor: nog eens de zin van de grens met "probeer het nog eens", bij Forge "Opslaan lukte niet". Na: de zin hierboven, niet amber. Een losse training met een andere invulling, voor: een tweede log. Na: de tweede wacht; hangt de eerste, dan zegt het scherm "Opslaan duurt langer dan verwacht. Je invulling blijft staan."; landt de eerste, dan "Opslaan lukte niet. Kijk eerst in je logboek of hij er toch staat; je invulling staat er nog."
- Automatisch (vanzelf afvinken). Voor en na: stil. Loopt het nog en tik je Opslaan, dan na: de zin dat het opslaan nog loopt.

## Alternatieven

De tweede losse poging meteen nee geven. Niet gekozen: mislukt de eerste daarna, dan staat er niets en zei het scherm al "lukte niet" over iets dat nog niet beslist was.

De sleutel breder maken (elke losse training op die dag). Niet gekozen: twee verschillende trainingen op één dag zijn gewoon.

Een eigen zin tonen zodra een poging lang hangt, zonder tweede tik. Niet gekozen: daarvoor is een klok nodig die niets zegt over of het nog landt. De zin van de grens is op dat moment waar.

Een pakket voor een nagemaakt scherm in de tests (jsdom). Niet gekozen: het gedrag van de kaart en het blad staat nu in `saveOnCard` en is daar zonder scherm getest. Wat aan het scherm zelf hangt blijft een bronscan.

## Bron

Backlog, Inbox "Opslaan, rest". Bouwt voort op `2026-11-14-nee-van-logsession.md` en `2026-11-12-dubbel-log.md`.

## Vervangt

Niets. Vult "Nog open" van `2026-11-14-nee-van-logsession.md` in voor de losse training, Forge, het blad van een training en de zin bij een poging die vasthangt.

## Terugdraaien

Haal `looseInFlight` uit `src/state/logSession.ts`, `saveOnCard` uit `src/state/logSave.ts` en `onLeave` uit `src/utils/useSheetClose.ts`, en zet de schermen terug op hun vorige aanroep. Er is geen opgeslagen vorm veranderd.

## Nog open

Het oude trainingsscherm (`ExerciseLogger.tsx`) is hier niet aangeraakt: zijn tests zijn nog een bronscan. De sportvraag telt tijdens zijn sluitanimatie nog als in beeld. Today en Week vinken een rustdag of krachttraining af zonder het antwoord te lezen. Het blad Hoe ging het? toont bij "stond er al" de zin voor mislukt tot het logboek opnieuw gelezen is.
