# Pathfinder vooraf: route voorstellen, start en laden (11 november)

Melding van de eigenaar: de lus begon in een andere stad dan waar hij was ("De lus begint bij je vaste punt"), hij zag zichzelf niet op de kaart, hij wil starten waar je nu bent met meerdere opties eronder, al te kiezen tijdens het laden, en de laadbalk lijkt vast te lopen.

Oorzaken (gelezen in de code): `storage/routeStart.ts#startFromMap` maakt van een getikt punt (Start hier) je vaste punt en zet de instelling op Vast punt; en bij Waar je nu bent valt `hereStart` bij een mislukte of te grove locatie stil terug op het vaste punt.

## Eisen voor de bouwer

1. Startkeuzes als chips (`engine/places.ts#startChoices`, uit Plekken spoor 2) in een rij met vaste hoogte boven de kaart en boven de zoekstand, label "Start bij", in de Briefing en in het blad Route. Zichtbaar in elke stand (lezen, zoeken, kaart, fout, offline), 44 bij 44, zinsletters, één mint accent, geen verspringen. Hoogstens vier chips: Waar je nu bent, Thuis, een voorgestelde plek, Andere plek (Andere plek is spoor 7).
2. Gekozen bij openen: Waar je nu bent (advies); Thuis alleen bij instelling Vast punt of na een tik. Een tik geldt voor deze training en wordt niet bewaard.
3. Een tik tijdens het zoeken breekt af en begint opnieuw; geen tweede locatievraag per tik; geen aanroep na sluiten.
4. Locatie geweigerd of te grof: nooit stil terugvallen. Een zichtbare regel met de reden en de keuze (Thuis als die er is, anders Ongeveer); valt hij toch terug, dan noemt de regel waar hij nu begint (Thuis of Ongeveer), nooit "je vaste punt".
5. De regel "De lus begint bij je vaste punt." verdwijnt. Chips en regel zeggen niet hetzelfde: de regel alleen bij een terugval of afwijking. Geen "vast punt" meer in teksten (eerste vraag, RouteNeedsPoint, MAP_HINT, settingsHelp regel 881).
6. De rij "Zet mijn plek als start" in RouteMap verdwijnt (wordt de chip); `routeSheet.scan.test.ts` regel 58 beweegt mee.
7. Eigen plek als ijsblauwe stip (de bestaande `me` in RouteMap) bij Waar je nu bent altijd, op de plek die de zoektocht al vond, zonder tweede vraag; alleen bij een precieze plek (50 m of beter); bij Thuis of een getikt punt alleen als de plek bekend is. Geen nieuwe kleur.
8. Start hier bewaart niets meer (`startFromMap` schrijft niet, zet `routeStart` niet om); Thuis verschuift niet (test, `routeStart.test.ts` regel 182 beweegt mee). Bewust Thuis maken kan alleen via een tekstknop "Bewaar als plek" bij een getikt punt, met de keuze "Maak dit Thuis" en één zin dat Thuis verhuist en routes blijven.
9. Laadbalk: één doorlopende, vertragende beweging op tijd van 0 naar ongeveer 90 procent in de zoektijd (`PROPOSAL_LIMIT_MS`), geen herhaling, nooit vol voor hij klaar is; bij een nieuwe stap schuift hij 300 ms ease-out naar het nieuwe doel, bij klaar naar 100 procent. Rustig en Uit: geen beweging, de balk staat op het aandeel van de stap. Dit is een uitzondering op 150 tot 400 ms voor een voortgangsbalk op tijd: eigen besluit en een regel in `docs/werkbriefjes/bediening-en-beweging.md`.
10. `npm run kaart:vergelijk` met elk verschil verklaard; geen echte plaatsnamen in tests of docs; Lookout op 360, 390 en 412 px met de standen locatie geweigerd, te grof en trage opslag; daarna Pathfinder moment 2.
