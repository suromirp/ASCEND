# Kaartje bij Route voorstellen: eerst zelf tekenen, tegels later als instelling

Datum: 2026-11-10
Status: voorgesteld

## Besluit

Het paneel Route voorstellen krijgt een kaartje dat ASCEND zelf tekent als SVG, zonder kaarttegels: beide lussen op één schaal en het startpunt als stip. Er gaat niets extra de deur uit. Tegels (OpenStreetMap, of PDOK grijs voor Nederland) komen pas met een eigen besluit, als instelling met standaard Geen en een eigen eerste vraag.

## Reden

De eigenaar wil twee lussen vergelijken voor hij er een naar Garmin Connect stuurt: vorm, omvang, overlap en waar ze beginnen. Dat staat allemaal in de punten die al in het geheugen staan zolang het paneel open is. Elke tegelbron vertelt een nieuwe partij bij elk openen in welk gebied van ongeveer 1,5 tot 3 km de lus ligt, met het IP-adres, en de standaardtegels zijn licht van kleur op een donker scherm. Zelf tekenen kost geen pakket, werkt met de tokens en past bij hoe de app al grafieken tekent. Het onderzoek staat in `docs/onderzoek/Kaartje bij Route voorstellen.md`.

Wat er gebeurt:

- Eén kaartje boven de twee lussen, zodra er minstens één lus is. Geen lus, geen kaartje.
- De lus die bovenaan staat (Welke lus eerst) in mint, de andere in het gedempte inkt-token en gestreept; zo blijft er één mint accent. Het startpunt is een kleine stip met een rand. Daaronder een korte legenda met de namen Avontuurlijk en Simpel.
- Projectie Web Mercator, zodat tegels later onder dezelfde lijnen passen en een tik later om te rekenen is naar een punt.
- Het kaartje is in deze stap niet aan te tikken. Geen beweging nodig; een fade hoogstens 200 ms, ease-out, meteen op de eindstand bij Rustig en Uit.
- De naamsvermelding van OpenStreetMap staat al onder de lussen en blijft daar.
- Hellingen als stippen: niet in deze stap. `RouteProposal` kent alleen het aantal hellingen, niet welke. Wil de eigenaar ze zien, dan kan de planner ze later als lijst in het geheugen meegeven (geen bewaarde vorm, geen migratie).

## Instelling

- Kaartje bij de lussen: Aan (advies) of Uit. Uitleg in één zin: "Een kaartje met beide lussen en het startpunt, door ASCEND zelf getekend; er gaat niets extra naar buiten."
- Optioneel veld `routeMap` in de instellingen (`'on' | 'off'`, onbekend of leeg is aan), zonder migratie; een onbekende waarde in een back-up valt weg.
- De rij staat in het blad Weer en kleding onder Startpunt van je lus. De bouwer controleert de grens van twaalf rijen op die pagina.

## Toestemmingstekst

- Deze stap: de eerste vraag van Route voorstellen verandert niet, want er gaat niets nieuws naar buiten. De uitleg achter de i (`routeVoorstel` in `settingsHelp`) krijgt één zin: het kaartje tekent ASCEND zelf uit de lussen.
- Bij tegels later (eigen besluit) komt er een eigen eerste vraag, bijvoorbeeld: "Voor de ondergrond haalt ASCEND kaarttegels bij OpenStreetMap. Die laten zien in welk gebied van een paar kilometer je lus ligt, samen met je IP-adres. ASCEND bewaart de tegels niet zelf." Bij PDOK de naam Kadaster in plaats van OpenStreetMap.

## CSP

Er is geen CSP in `index.html`, `vite.config.ts` of de Android-app, dus deze stap verandert niets. Komen er later tegels en ooit een CSP, dan komt de tegelhost in `img-src`; `connect-src` alleen bij ophalen met `fetch`.

## Eigen keuzes buiten de opdracht

- Het startpunt staat als stip op het kaartje, ook bij Precies. Het besluit over het startpunt zegt dat het punt nooit op het scherm staat; zonder ondergrond is het een stip ten opzichte van twee lijnen, geen plek die je kunt lezen. Met tegels eronder staat bij Precies de deur op een straatkaart; dat vraagt eerst een ja van de eigenaar.
- Geen kaartbibliotheek. Leaflet of MapLibre pas als slepen, zoomen of bijsturen het echt vraagt.
- Tegels later nooit in de service worker en nooit vooraf ophalen; alleen de HTTP-cache van de browser (regel van OpenStreetMap).

## Alternatieven

- Standaardtegels van OpenStreetMap nu meteen: mag in een app van één gebruiker met vermelding, een herkenbare User-Agent en de browsercache, maar stuurt het gebied naar een nieuwe partij en is licht van kleur. Later als keuze.
- PDOK, BRT Achtergrondkaart grijs: past het best bij donker, zonder sleutel, CC-BY 4.0, maar alleen Nederland. Later als keuze naast OpenStreetMap.
- OpenTopoMap: hoogtelijnen passen bij hellingen, maar een kleine server zonder regels over caching en logs. Niet gekozen.
- OpenFreeMap met MapLibre: zuinigste logregels en een donkere stijl, maar bijna 300 KB gecomprimeerd en WebGL. Niet gekozen.

## Bouwlijst voor het volgende bouwmoment

- `src/engine/routeMap.ts` (nieuw, puur): `routeMapShape` neemt de lussen (soort en punten), het startpunt en een vak (breedte, hoogte, rand) en geeft per lus een pad voor de SVG, de plek van de start en het vak terug, of `undefined` zonder lus. Web Mercator met een functie heen (`toPlane`) en terug (`fromPlane`, voor later). Eén schaal voor beide lussen; een minimale omvang van ongeveer 400 m zodat heen en terug over één lijn niet deelt door nul. Uitdunnen tot ongeveer een halve pixel afwijking, met het eerste en laatste punt altijd erin; getallen in het pad op één decimaal.
- `src/engine/routeMap.test.ts`: alles valt binnen het vak met rand; dezelfde afstand oost en noord is even lang op het scherm; de start is het eerste punt; één lus alleen werkt; heen en terug over één lijn; een punt zonder hoogte telt gewoon mee; uitdunnen houdt begin en eind en blijft binnen de afwijking; zelfde invoer geeft hetzelfde pad; `fromPlane(toPlane(p))` geeft `p` terug.
- Een scan-test die nagaat dat `RouteMap.tsx` en `routeMap.ts` geen `http` en geen `<image>` bevatten, zodat er in deze stap niets naar buiten kan.
- `src/components/RouteMap.tsx` (nieuw, rendert alleen): `<svg role="img">` met een `aria-label` als "Kaartje met twee lussen: Avontuurlijk 8,2 km en Simpel 6 km"; alleen tokens (`--color-action`, `--color-ink-dim`, `--color-ink`, `--color-surface` of `--color-card-border`), geen hex.
- `src/components/RoutePanel.tsx`: het kaartje boven de RouteBlocks als minstens één lus gelukt is en de instelling aan staat.
- Instelling: `routeMap` in het model van de instellingen en de resolve; `src/data/settingsIndex.ts`, `src/data/settingsLayout.ts`, `engine/settingsSummary.ts`, de groepspagina in `src/components/settings/groups/`, en `settingsHelp`.
- Maten: het kaartje vult de binnenbreedte van het paneel, met een vaste hoogte van 176 px zodat er niets verspringt als de lussen binnenkomen. Lijnen 3 px (bovenste lus) en 2 px gestreept (andere), start een stip van 10 px met een rand van 2 px, legenda in 12 px. Lookout meet op 360 en 390 px met vertraagde processor: geen horizontale scroll, legenda leesbaar, het kaartje staat binnen een frame na de lussen, en twee lijnen van elk 2.000 punten tekenen zonder merkbare hapering.
- `npm run kaart:vergelijk` met het nieuwe kaartje verklaard.
- Route-tests uit het werkbriefje: `npx vitest run src/engine/route src/engine/gpx src/integrations/routing src/integrations/fileSender src/storage/routeProposal src/storage/routeSend`.

## Bron

`docs/onderzoek/Kaartje bij Route voorstellen.md`; de wens van de eigenaar via de coördinator (bouwmoment 10 november); `docs/beslissingen/2026-11-09-routeplanner.md` (fase 4), `docs/beslissingen/2026-11-09-startpunt-lus.md`, `docs/beslissingen/2026-11-10-route-naar-garmin-connect.md`.

## Vervangt

Niets. Het besluit over het startpunt blijft staan; alleen de stip op het kaartje is een uitzondering waar de coördinator ja op moet zeggen.

## Terugdraaien

Zet Kaartje bij de lussen op Uit. Helemaal weg: `RouteMap.tsx` en `engine/routeMap.ts` verwijderen, de regel in `RoutePanel` halen en de rij en het veld `routeMap` uit de instellingen. Er is geen bewaarde vorm en er ging niets naar buiten.
