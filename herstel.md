# Warden: Waar je nu bent (I-61), commit 79397b0

Oordeel: NIET AKKOORD, één blokkerend punt (klein te herstellen). De rest klopt.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (één bestaande waarschuwing in `LegFatigueCard.tsx`, niet van deze wijziging).
- `npx vitest run`: 11180 groen op de branch zelf.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: geen verschil.
- `npm run kaart:vergelijk`: niet afgerond binnen mijn tijd, dus niet beoordeeld.
- Niet gedaan: een echt toestel. Punt 1 komt uit de Android-bron van de plugin en een nagemaakte plugin, niet uit een meting.
- Geen gedachtestreepjes, geen losse hexkleuren en geen persoonsgegevens in de wijziging. Geen nieuwe bewaarde vorm, dus geen migratie nodig. Het besluit staat in `docs/beslissingen/2026-11-15-waar-je-nu-bent-scherp.md`.

## Blokkerend

1. `src/integrations/geolocation.ts:52` en `:68`. Een watch die pas begint nadat hij gestopt is, stopt nooit meer.
   De plugin (`GeolocationPlugin.kt`, 8.2.4) geeft zijn id meteen, maar begint pas te volgen na zijn eigen venster om toegang (`handlePermissionRequest`, dan `completeWatchPosition`). Dat venster komt precies in de gevallen die deze wijziging nu doorlaat: de vraag om toegang gooide, gaf 'prompt' (venster weggetikt) of 'unknown'. Loopt de grens van 15 s af of sluit je het paneel terwijl dat venster openstaat, dan stuurt de schil één `clearWatch`; de plugin kent het id nog niet ("WatchId not found.", weggeslikt in de catch). Zegt de gebruiker daarna ja, dan begint het volgen: fijn, elke seconde, tot de app sluit. De schil gooit elke plek weg (dat klopt), maar ruimt niet nog eens op. Dezelfde volgorde kan zonder venster in een smal gat: `startWatch` start in een coroutine op de hoofddraad, `clearWatch` kan er net voor komen.
   Proef: `src/integrations/wardenWaarJeNuBent.proef.test.ts`, "stoppen terwijl het venster van Android nog openstaat" (rood op 79397b0).
   Voorstel: in de callback van `watchPosition` bij een handle die al weg is niet alleen terugkeren, maar de plugin nog een keer laten stoppen, bijvoorbeeld `if (!appWatches.has(handle)) { void id.then((cid) => cid === undefined ? undefined : load().then((m) => m.Geolocation.clearWatch({ id: cid }))).catch(() => undefined); return; }`. Dan stopt de eerste late plek het volgen. De proeftest wordt daarmee groen.

## Moet

2. `src/integrations/geolocation.ts:44-76`. De schil om de plugin (eigen handle, stoppen voor het id er is, late callback) heeft op de branch geen enkele test; alleen `watchFine` met een nagemaakte browser en `followUntilSharp` met een nagemaakte watch. Neem de proeftests over (dertien groen, één rood tot punt 1 hersteld is).
3. `src/storage/routeStart.ts:87` en `:133`. Bij 'prompt' of 'unknown' vraagt `watchPosition` zelf nog eens om toegang, en de klok van 15 s loopt dan al. Wie het venster rustig leest krijgt "Je locatie kwam niet op tijd." terwijl er nog niets gevraagd is aan de gps. Kiest hij in dat tweede venster Bij benadering, dan volgt de app 15 s een plek die nooit scherp wordt en zegt daarna "buiten of bij een raam", wat niet helpt. Voorstel: na een antwoord dat niet granted, denied of approximate is één keer `checkPermissions` lezen vlak voor het volgen (geeft dat approximate, dan meteen die reden), en de regel in het besluit eerlijk maken: de grens telt vanaf de start van het volgen, het venster inbegrepen. Minstens vastleggen in het werkbriefje.

## Mag

4. `src/storage/routeStart.ts:81`. Naar de achtergrond stopt het volgen niet zelf; het stopt door de grens (timers lopen in de WebView door, hooguit trager). Dat is begrensd en dus geen fout, maar het staat nergens. Voorstel: bij `visibilitychange` naar hidden `finish` met de laatste grove plek, of het als bewuste keuze in het besluit zetten. Niet op een toestel nagemeten.
5. `src/engine/routeStart.ts:218`. Thuis als midden gaat onafgerond naar de kaart, de grove plek op drie en de weerplaats op twee decimalen. Het is alleen de camera (geen ring), en de tegels op zoom 14 verraden hooguit de buurt, maar het midden van het beeld is dan precies je deur. Voorstel: ook `roundHere(home)`.
6. `src/components/useRouteSearch.ts:479` met `src/components/RouteMap.tsx:173`. `askCenter` is elke render een nieuw object, dus het effect met `center` in de afhankelijkheden zet bij elke render drie keer `setData`. Voorstel: `useMemo` op de getallen, of het effect op `center?.lat` en `center?.lon`.
7. `src/storage/routeStart.ts:132`. Bij `approximate` is er geen grove plek voor het midden, terwijl Android die juist wel geeft; de kaart valt dan op Thuis of de weerplaats. Kan later.

## Wat klopt (nagelopen)

- De mapping: bij de plugin is `location` de alias van grof en fijn samen en alleen granted als beide er zijn (`Bridge.getPermissionStates`: "multiple permissions with the same alias must all be true"); `coarseLocation` is alleen grof. `fineAccessOf` leest dat goed, en kijkt naar grof voordat hij denied zegt. De zinnen van de plugin ("denied", "in time") vallen in `errorCode` niet goed voor de time-out ("Could not obtain location in time" bevat geen "timeout"): die wordt 2, niet 3. Zie hieronder.
- Stoppen in `followUntilSharp`: bij een scherpe plek, de grens, Sluiten, een fout, een fout of plek al tijdens `watch()`, en bij een signaal dat al afgebroken is begint er geen watch. Een late plek na de grens of na Sluiten telt niet en bewaart niets, ook door de echte schil heen (proeftests groen). Dubbel stoppen geeft één `clearWatch`.
- Nooit stil Thuis: bij elke reden blijft het plan `ask` zonder punt, `startView.ready` is false en `maySearch` zegt nee, ook met instelling Thuis; de kaart krijgt geen `start`, alleen `center`, en `dotFeatures` tekent daar niets. Bij Ongeveer komt de vraag niet voor (proeftests in `src/engine/wardenWaarJeNuBent.proef.test.ts`).
- Privacy: de grove plek staat alleen in de state van het paneel; niets nieuws in de opslag of de back-up.

## Nog een moet, gevonden bij het nalopen

8. `src/integrations/geolocation.ts:19-24` (bestaande code, nu pas van belang). De time-out van de plugin heet "Could not obtain location in time. Try with a higher timeout." Dat past toevallig op `/timeout/` door het laatste woord, dus hij wordt 3 en `followUntilSharp` wacht door: goed. Maar het hangt aan één woord in een Engelse zin van een ander. Voorstel: lees `err.code` van de plugin (`OS-PLUG-GLOC-0010` voor te laat, `-0003` voor geweigerd) en houd de tekst als terugval. De proeftest "de time-out van de plugin zelf stopt het volgen niet" legt het huidige gedrag vast.

## Voorgestelde regel voor het werkbriefje (Valkuilen, koppelingen-en-data)

Een watch van de plugin kan pas beginnen nadat je hem stopte (het venster van Android stond nog open, of `clearWatch` was net eerder): een plek voor een handle die al gestopt is, stopt de plugin nog een keer. De schil in `integrations/geolocation.ts` heeft een eigen test met een nagemaakte plugin die "WatchId not found." geeft zolang het volgen niet begon.

## Proeftests

- `src/integrations/wardenWaarJeNuBent.proef.test.ts`: 14 tests, 13 groen, 1 rood (punt 1).
- `src/engine/wardenWaarJeNuBent.proef.test.ts`: 10 tests, groen.
- Let op bij overnemen: de nagemaakte module van vitest geeft bij twee `import()` in dezelfde tik de tweede leeg terug; daarom start de test twee watches na elkaar. In de echte app speelt dat niet.
