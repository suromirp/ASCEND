# Nieuwe testpoging na een test met veel stilstand

Datum: 2026-10-28
Status: aangenomen

## Besluit

Had je laatste testloop veel stilstand, dan stelt ASCEND een nieuwe poging voor, met Akkoord (regel TEST-RETRY in `engine/adviceEngine.ts`). Dit vult `2026-10-27-stilstaan-bij-de-testloop.md` en de aanvullingen aan; die blijven zoals ze zijn.

1. **Wanneer.** De laatste testloop van de afgelopen 21 dagen heeft een snelste 5 km met meer stilstand dan de app al "iets te gunstig" noemt (`manyStops`: meer dan 60 seconden of meer dan 3 stops, dezelfde constanten), of hij wacht op je antwoord als twijfeltest (trager dan je vorige). Er staat binnen 14 dagen geen andere testloop of wedstrijd gepland, en je bent niet ziek. Een test die je zelf "Telt niet mee" noemde geeft geen voorstel.
2. **Wat.** De eerste harde loop (rol `hard_run` op het sjabloon, geen lijst met id's) die minstens 3 dagen na die test valt, uiterlijk 10 dagen vooruit, en waar een test past volgens dezelfde afstandsregels als elke testloop (`respectsHeavySpacing`: geen zware beendag of tocht in de 48 uur ervoor, geen zware loop of beendag de dag erna), wordt die dag een testloop van 5 km. Het is één `move`-item op dezelfde rij en dag met `templateId` en de lengte van de testloop, dus de voorvertoning in het adviesblad klopt en "ongedaan maken" zet de rij terug zoals hij was. Er komt geen training bij. Is er geen geschikte dag, dan zegt ASCEND niets.
3. **Tekst.** Het droge feit eerst: "Je testloop van di 27 oktober had 2:16 stilstand, dus hij is iets te gunstig. Met Akkoord wordt Heuvelintervallen op za 31 oktober een testloop van 5 km. Kies een route zonder stoplichten en zet auto-pauze uit." Bij een twijfeltest zonder veel stilstand staat er dat de test nog op je antwoord wacht.
4. **Liever niet.** Laat alles staan en vraagt niet opnieuw voor dezelfde test: het id is `retest:<datum van de test>`. Een nieuwere test mag opnieuw vragen.
5. **Instelling.** "Nieuwe test voorstellen bij stilstand" in Planning (`AppSettings.newTestOnStops`, aan is het advies en de waarde als hij ontbreekt). Een waarde die geen schakelaar is valt weg bij het importeren van een back-up.

## Reden

Een test met veel stoplichten geeft een tempo dat te mooi is of een test die niet telt. De snelste oplossing is een nieuwe poging op een plek waar een harde loop toch al stond, zonder dat er belasting bijkomt.

## Alternatieven

- De test erbij zetten in plaats van een harde loop te vervangen. Dat stapelt belasting.
- Een lijst met sjabloon-id's. De rol `hard_run` staat al op de sjablonen.
- Zelf een dag zoeken buiten de planningsronde. De afstandsregels van de test zijn al één functie; die hergebruiken houdt de voorvertoning gelijk aan wat Akkoord doet.

## Gevolg

Een normale week met heuvelintervallen op zaterdag en de lange duurloop op zondag geeft zaterdag geen voorstel: de dag na een test blijft rustig. Dan wordt de eerstvolgende andere harde loop gekozen, of er is geen advies. De golden snapshots in `planGolden.test.ts` veranderen niet, want het advies verschijnt alleen met een testlog met stops en verandert nooit stil de planning.

## Bron

De testloop van de eigenaar op 2026-10-27 met wachten voor stoplichten.

## Vervangt

Niets.

## Terugdraaien

Zet "Nieuwe test voorstellen bij stilstand" uit, of haal `testRetryAdvice` uit `computeAdvice`.
