# Warden: Waar je nu bent (I-61), herkeuring van f29ca07

Oordeel: AKKOORD. De punten 1, 2, 3, 5, 6 en 8 zijn goed hersteld en het herstel breekt niets nieuws (diff 79397b0..f29ca07).

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npx vitest run src/integrations src/engine/routeStart src/storage/routeStart`: 27 bestanden, 370 tests groen.
- `npm run lint`: groen (alleen de bestaande waarschuwing in `LegFatigueCard.tsx`).
- `npm run kennisindex:vergelijk`: geen verschil.
- Geen gedachtestreepjes en geen losse hexkleuren in de wijziging; geen persoonsgegevens (punten in de tests zijn nagemaakt); geen nieuwe bewaarde vorm.
- Niet gedraaid: de volledige testset, `npm run build`, `npm run kaart:vergelijk`, en een echt toestel. Punt 1 blijft bewezen met een nagemaakte plugin, niet met een meting.
- `src/engine/briefingPerManier.test.ts` niet beoordeeld, zoals gevraagd (main wint bij de merge).

## Per punt

1. Hersteld. `src/integrations/geolocation.ts:58-61`: een plek of fout voor een handle die al weg is, laat de plugin nog een keer stoppen. Nagegaan met een mutatie: zonder regel 59 wordt de test "stoppen terwijl het venster van Android nog openstaat" in `src/integrations/geolocationWatch.test.ts` rood, met de regel groen. De test bewaakt het herstel dus echt.
2. Hersteld. `src/integrations/geolocationWatch.test.ts` (20 tests) dekt de schil: stoppen voor het id, dubbel stoppen, twee watches naast elkaar, de late start, en `locateStartHere` door de echte schil heen. `src/engine/routeStartAsk.test.ts` neemt de proeftests van de vraag over.
3. Hersteld. `src/storage/routeStart.ts:140-141`: na een antwoord dat geen ja of nee is leest de app één keer `checkPermissions` (`checkFineAppLocationPermission`); bij benadering geeft meteen `approximate`, granted en denied kijken niet nog eens, een fout laat het volgen gewoon doorgaan. Vier tests. Het besluit zegt nu eerlijk dat de 15 s tellen vanaf de start van het volgen, het venster inbegrepen, en dat de achtergrond het volgen niet zelf stopt (punt 4 als bewuste keuze).
5. Hersteld. `src/engine/routeStart.ts:219`: Thuis als midden gaat door `roundHere`; test op drie decimalen.
6. Hersteld. `src/components/RouteMap.tsx:111-114`: het midden is een `useMemo` op de twee getallen, dus een nieuw object met dezelfde plek zet de kaart niet opnieuw.
8. Hersteld. `errorCode` leest eerst de code van de plugin (`GLOC-0003` wordt 1, `GLOC-0010` wordt 3) en houdt de tekst als terugval, nu ook met "in time". Twee tests.

De voorgestelde regel staat in `docs/werkbriefjes/koppelingen-en-data.md` onder Valkuilen, met de naam van de test erbij.

## Klein, niet blokkerend

- `src/storage/routeStart.ts:140`. Het lezen zonder venster krijgt dezelfde grens als het venster zelf (`PERMISSION_LIMIT_MS`, 60 s). Na een vraag die zelf 60 s hing kan de knop zo in het ergste geval twee minuten wachten voor het volgen begint. Begrensd, dus geen fout; voorstel: een eigen korte grens van een paar seconden voor `checkPermission`.
- `src/integrations/geolocation.ts:4-5`. De kop zegt nog "Alleen de ruwe plek (coarse) wordt gevraagd", terwijl het bestand nu ook de fijne plek vraagt. Bestaande tekst; een regel bijwerken bij een volgende beurt.
- Punt 7 uit de vorige uitslag (geen grove plek voor het midden bij `approximate`) staat nog open; dat mocht later.
- Een watch die pas na het stoppen begint en daarna nooit een plek of fout geeft, wordt niet opgeruimd. In de praktijk geeft de plugin na zijn eigen time-out een fout en die stopt hem dan; niet op een toestel nagemeten.

Akkoord voor main.
