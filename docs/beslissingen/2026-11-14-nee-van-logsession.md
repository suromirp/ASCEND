# Nee van logSession op elk scherm hetzelfde

Datum: 2026-11-14
Status: aangenomen

## Besluit

Een scherm leest het antwoord van `logSession` niet meer kaal, maar via `src/state/logSave.ts`. `saveLogWithin` geeft een van vier uitkomsten: opgeslagen, stond er al, niet gelukt, of duurt te lang. Alleen bij opgeslagen gaat een concept weg of een blad dicht. Het oude trainingsscherm, de kaart Van je horloge (Opslaan en vanzelf afvinken) en de sportvraag lopen er nu doorheen.

## Reden

Nee van `logSession` betekent drie dingen: het schrijven mislukte, het log stond er al, of een eerdere poging is nog onderweg. Drie plekken maakten dat onderscheid niet.

Het oude trainingsscherm (`ExerciseLogger.tsx`) gooide bij nee niets weg, maar had geen grens in tijd en geen zin op het scherm zelf. Stond het log er al, dan bleef het formulier open zonder enige uitleg. Nu staat onder het formulier dezelfde zin als op het blad Hoe ging het?. Na tien seconden zegt het scherm dat het lang duurt. De knop blijft dan uit tot het opslaan klaar is, omdat een losse training geen sleutel heeft die een tweede log tegenhoudt. Terug en Annuleren werken gewoon.

Vanzelf afvinken (`WatchActivityCard.tsx`) deed bij nee niets, en dat was goed. Wel hield een opslag die bleef hangen het afvinken tegen tot je de app herstartte, en een fout bij het noteren brak de rij af. Nu gaat de rij na de grens verder, en wordt een log dat later alsnog landt toch genoteerd als vanzelf afgevinkt. Een log dat er al stond wordt niet zo genoteerd: dat sloeg je zelf op.

Opslaan op de kaart Van je horloge sloot het blad Andere training ook als het opslaan mislukte, en zei op de kaart niets. Er was geen grens in tijd. Nu blijft het blad open met de zin erbij, zijn de keuzes uit zolang het opslaat, en mag je na de grens opnieuw tikken: dezelfde activiteit komt nooit twee keer in je logboek. Stond het log er al, dan leest de kaart het logboek opnieuw.

De bewaarstap van de sportvraag stond twee keer in `SportAskLine.tsx`. Die is nu één functie, `saveLogThenChoice`, met een echte test voor de time-out: de keuze wordt niet gezet als het log pas na de grens landt.

## Alternatieven

Het oude trainingsscherm na de grens weer vrijgeven, zoals Forge. Niet gekozen: een losse training die je intussen aanpast zou dan twee keer in je logboek komen.

`runLogSession` zelf drie uitkomsten laten teruggeven. Niet gekozen: dat raakt elke aanroeper en de plekken die nee bewust negeren.

## Bron

Review van Warden op 12 november, backlog "Nee van logSession bij andere schermen". Bouwt voort op `2026-11-12-dubbel-log.md`.

## Vervangt

Niets.

## Terugdraaien

Zet de drie aanroepen terug op `await logSession(...)` en haal `src/state/logSave.ts` weg. Er is geen opgeslagen vorm veranderd.

## Aanvulling na review (Warden en Lookout, 14 november)

Terug en Annuleren. Het oude trainingsscherm wiste het concept bij elk weggaan. Na de grens is weggaan de enige uitweg, en als het late antwoord dan nee is, was alles weg. Nu wist weggaan het concept alleen als er niet opgeslagen wordt (`closeClearsDraft`), zoals het blad Hoe ging het?. Lukt het opslaan alsnog, dan wist die uitkomst het concept zelf.

Nooit twee keer. `runLogSession` hield een horloge-activiteit die onderweg was alleen tegen als er geen geplande training bij zat. Opnieuw tikken na de grens met een andere keuze (gepland of los, of een andere geplande training) gaf zo twee logs van dezelfde activiteit, omdat kijken en schrijven niet één transactie is. Nu krijgt elke volgende poging met dezelfde `externalId` nee zolang de eerste loopt. Op de kaart blijft bij zo'n tweede tik de zin van de grens staan, in plaats van "Opslaan lukte niet".

Zichtbaar. In het blad Andere training stonden "Opslaan…" en de foutzin onder een lijst die langer kan zijn dan het scherm. Ze staan nu vast onderin het blad, boven Annuleren. Alleen mislukt is amber; de andere zinnen zijn gedempt. De keuzerijen zijn minstens 44 px hoog.

Toetsbaar. Wat een scherm bij welke uitkomst doet staat als pure functie in `state/logSave.ts` (`formAfterSave`, `cardAfterSave`) en is daar getest. De zin voor "stond er al" komt uit één bron (`ALREADY_LOGGED_NOTE`).

## Aanvulling na de doorloop (Pathfinder, 14 november)

Eén melding. Bij een mislukte schrijfactie kwam bovenin de algemene melding, over de grip van het blad heen, en daaronder de zin van het scherm zelf. Een scherm dat de uitkomst zelf toont geeft nu `onWriteError` mee aan `logSession`; de melding bovenin blijft dan weg, ook als het antwoord pas na de grens komt. `saveLogWithin`, `autoTickLog`, `saveLogThenChoice` en het blad Hoe ging het? (`logWithOwnNotice`) doen dat. Een fout na het schrijven gaat nog wel bovenin: het log staat er dan en het scherm zegt opgeslagen.

De back-uptip. Wat de melding bovenin wist (de opslag is vol, maak een back-up) gaat niet verloren. De eerste keer zegt het scherm zijn gewone zin. Mislukt het schrijven een tweede keer op rij, dan zegt het scherm de reden en de tip zelf (`failedNote`, de woorden van `describeWriteError`). Vanzelf afvinken dat mislukt geeft geen melding: je deed zelf niets, en de activiteit blijft een voorstel.

Eén woordenset (`LOG_SAVE_NOTE` en `FORM_SAVE_NOTE` in `state/logSave.ts`). Mislukt begint overal met "Opslaan lukte niet.", traag met "Opslaan duurt langer dan verwacht.". Waar de knop na de grens uit is staat "Je invulling blijft staan."; waar je opnieuw mag tikken "Kijk zo in je logboek of hij er staat. Zo niet, probeer het nog eens.". De woorden van het blad Hoe ging het? zijn leidend; alleen zijn zin voor traag kreeg het vaste begin. De sportvraag zegt na de grens niet meer "Dit lukte niet": het log kan nog landen. Alleen mislukt is amber, ook daar.

## Nog open

Het oude trainingsscherm sluiten en weer openen terwijl de eerste opslag van een losse training nog hangt, en dan iets anders invullen en opslaan, geeft een tweede log: een losse training heeft geen sleutel. Dat vraagt een keuze over wat "dezelfde losse training" is en is hier niet opgelost.

Forge (`FinishSheet.tsx`) toont bij een schrijffout nog zijn eigen zin en de melding bovenin, met zijn eigen woorden over je sets.

`SessionActionSheet.tsx` (MacroFactor-training opslaan) leest nee nog kaal: het blad blijft open zonder zin. Today en Week vinken een rustdag of krachttraining af zonder het antwoord te lezen; daar wordt niets weggegooid. Het blad Hoe ging het? toont bij "stond er al" de zin voor mislukt, tot het logboek opnieuw gelezen is.

## Aanvulling na Warden ronde 2 (coördinator, 14 november)

Een poging die nooit antwoordt houdt haar geplande training of horloge-activiteit vast tot de app herlaadt. Dat is bewust: de schrijfactie kan alsnog landen, en vrijgeven op een klok kan een tweede log geven. Nog open: de kaart zegt dan blijvend "Probeer het zo nog eens", terwijl alleen herstarten helpt; een eigen zin daarvoor volgt. Een vanzelf afvinken dat nog loopt telt nu ook als laat antwoord, zodat een tik op Opslaan de zin van de grens toont.
