# Hoe ging het?, spoor 5: zelf invullen voor lopen en wandelen als blad

Datum: 2026-11-12
Status: aangenomen

## Besluit

Zelf invullen voor een training te voet (`engine/briefing.ts#briefingEntry`: hardlopen en wandelen) is het blad Hoe ging het? in twee stappen (`src/components/HowDidItGoSheet.tsx`), zoals spoor 5 van `docs/visie/Ontwerp trainingsscherm minimaal.md` vraagt. Het formulier van het oude trainingsscherm verhuist zonder de uitleg erboven. Gedaan op Vandaag, Gedaan en Vandaag al doen in Week, Gedaan in de Briefing en Zelf invullen openen het blad. `ExerciseLogger` blijft voor de rustdag en wat geen training te voet is (fietsen, de trap); kracht in ASCEND opent zoals altijd Forge.

Eigen keuzes van de bouwer, waar het ontwerp iets open liet:

1. Wat het blad opslaat komt uit dezelfde code als het oude scherm. De toestand en het concept staan in `src/components/logForm/useLogForm.ts`, de velden in `logForm/LogFormParts.tsx`, het log in `logForm/manualLog.ts#buildManualLog`; `ExerciseLogger` gebruikt ze ook. Zo kan het log niet uit elkaar lopen. `logForm/manualLog.test.ts` legt het naast een bevroren kopie van het oude opslaan (loop buiten, loopband, wandeling met rugzak). De vorm en de sleutel van het concept zijn gelijk gebleven: een half formulier van het oude scherm komt terug in het blad.
2. Stap 1 heeft de volgorde van regel 7 in hoofdstuk 6, met de duur ervoor: duur, Beter/Normaal/Slechter, pijn, zwaarte, dan de rij Afstand, hoogtemeters en notities. Hoofdstuk 3 noemde de zwaarte eerder; regel 7 is de vorm waar spoor 6 op verder bouwt.
3. Stap 2 heeft alles wat het oude formulier verder vroeg: Gedaan op (een dag die voorbij is, of een losse training), Waar train je?, de versie (Volledig, Kort), de herhalingen of het blok van een intervaltraining, afstand, helling, stijging, daling, stokken, hartslag, cadans, vermogen, rugzak, terrein, benen bij het inlopen, Iets anders gedaan en notities. Waar train je? en de versie stonden boven het oude formulier, maar ze bepalen wat er wordt opgeslagen, dus ze verhuizen mee. Waar train je? is in het blad één rij stille chips met de korte namen, zoals in de Briefing, zonder de uitleg per plek: zo is Opslaan het enige mint. Een plek die nog op slot zit staat er niet, tenzij hij al gekozen is (zoals in de Briefing); de keuze en de opslag zijn die van het oude scherm.
4. De kop van stap 1 zegt de dag waarop je hem deed (Vandaag, of bijvoorbeeld di 10 nov.); in stap 2 staat de pijl terug. De terugknop van de telefoon gaat in stap 2 eerst naar stap 1 (`useBackToClose`), daarna dicht.
5. Elke weg dicht zonder opslaan (Annuleren, het kruis, de achtergrond, wegslepen, de terugknop van de telefoon) gooit het concept weg. Op het oude scherm hield de terugknop van de telefoon het concept vast; in het blad is dat gelijkgetrokken, zodat sluiten altijd hetzelfde doet. Herladen houdt het concept, zoals nu.
6. Opslaan heeft een grens van 10 seconden: daarna staat "Opslaan duurt lang. Je invulling blijft staan." en blijft de knop uit tot het opslaan klaar is, zodat een tweede tik nooit een tweede log geeft. Mislukt het, dan blijft het blad open met de melding en alles wat je invulde. Het oude scherm had geen grens en geen eigen melding.
7. Een training die al gedaan is (je horloge vinkte af terwijl het blad openstond) krijgt geen Opslaan maar de regel "Deze training staat al als gedaan. Er komt geen tweede log bij." en Sluiten. `logSession` weigerde een tweede log al; nu zie je het.
8. Zelf invullen vanuit de Briefing legt het blad over de Briefing (Vandaag en Week). Na Opslaan gaan blad en Briefing dicht, en in Week ook het blad van de training. Annuleren laat de Briefing staan.
9. Het blad met stappen uit `SessionActionSheet` is een eigen onderdeel geworden (`src/components/SheetFrame.tsx`), met een vaste voet onderaan voor Opslaan. Het blad van een training in Week ziet er hetzelfde uit.
10. Het datumveld bij een losse training is 44 px hoog (de regel voor tikdoelen); in het oude scherm was het lager.

## Reden

Spoor 5 van het ontwerp: achteraf is een eigen moment, nooit onder de uitleg (regel 8). De opdracht eiste dat het log veld voor veld gelijk blijft, dat het concept werkt zoals nu en dat elke knop die wacht een grens en een uitkomst heeft.

## Alternatieven

Het blad met een eigen kopie van de toestand: sneller gebouwd, maar beginwaarden (rugzak van de week, de bewaarde plek, Gedaan op) lopen dan na een tijd uit elkaar. Opslaan opnieuw laten proberen na de grens in tijd: kan bij een losse training een tweede log geven, want `logSession` weert alleen een dubbel log van een geplande training.

## Bron

`docs/visie/Ontwerp trainingsscherm minimaal.md` hoofdstuk 3, regel 7 en 8, hoofdstuk 7 spoor 5; besluit `2026-11-12-trainingsscherm-en-ontwerpregels.md` en `2026-11-12-trainingsscherm-sporen-1-4.md`.

## Vervangt

Niets. Spoor 6 (`WatchAskCard` en `SportFeltBlock` in dezelfde vorm) volgt apart.

## Terugdraaien

In `src/components/ExerciseLogger.tsx` de regel met `HowDidItGoSheet` weghalen en in `TodayMissionCard.tsx` en `SessionActionSheet.tsx` `onManual` weer het oude scherm laten openen. Logs, concept en planning veranderen niet, dus terugdraaien raakt geen gegevens.
