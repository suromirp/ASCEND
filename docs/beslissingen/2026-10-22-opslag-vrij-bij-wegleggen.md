# Opslag vrij bij wegleggen

Datum: 2026-10-22
Status: aangenomen

## Besluit

Een ASCEND die uit beeld gaat (visibilitychange naar hidden) of bevroren wordt,
begint geen nieuwe transacties in IndexedDB; wie de opslag nodig heeft, wacht tot
de app weer in beeld is. Bij het freeze-signaal breekt de app elke transactie af
die dan nog openstaat, zodat een bevroren ASCEND een andere nooit blokkeert
(`storage/lifecycle.ts`). Hangt het openen toch, dan doet het opstartscherm na
20 seconden een proef van hoogstens 3 seconden (één alleen-lezen transactie op
`meta`). Antwoordt de opslag niet, dan zegt het scherm dat ASCEND waarschijnlijk
nog ergens anders open staat of is vastgelopen, met wat je doet: alle
ASCEND-tabbladen in Chrome sluiten en in de telefooninstellingen Apps, Chrome,
Geforceerd stoppen; je gegevens blijven staan. Back-up maken doet eerst dezelfde
proef en zegt binnen enkele seconden dat het niet lukt, in plaats van te blijven
staan. Het scherm noemt het precieze onderdeel van de migraties.

De opstartstappen onthouden per versie van de app wat al gelopen heeft (in
`meta`, sleutel `bootMigrations`): een tweede opening leest één ding en schrijft
niets. Een teruggezette back-up wist dat geheugen. Herstelstappen die niet
onmisbaar zijn, krijgen 8 seconden; blijft er een hangen, dan opent de app
zonder, en lopen de herstelstappen de volgende keer.

## Reden

De eigenaar zag op Android in de geïnstalleerde app "Dit duurt te lang. Het
openen blijft hangen bij de stap: migraties", en Back-up maken bleef op "Back-up
wordt gemaakt…" staan. Nagespeeld in Chromium met zijn eigen back-up en
MacroFactor-bestand, CPU zes keer trager: alle migratiestappen samen duren
minder dan 150 ms, ook de tiende keer openen; geen stap loopt eindeloos. Twee
tabbladen tegelijk openen gaat goed. Precies hetzelfde scherm komt wel als een
andere ASCEND van dezelfde site bevroren wordt terwijl er een schrijftransactie
openstaat: dan antwoordt de opslag aan niemand meer, ook na 95 seconden niet,
het openingsslot merkt niets (dat is vrij) en de export hangt mee.

Wat Chrome doet met een bevroren pagina die IndexedDB vasthoudt: een pagina met
een verbinding die anderen blokkeert, wordt in principe niet bevroren
(energiebesparing op desktop), een pagina in de back/forward-cache die anderen
blokkeert wordt uit die cache gezet, en sinds eind 2024 telt een bevroren pagina
als inactief. Het ontdooien van zo'n bevroren pagina staat in Chromium nog als
werk te doen (TODO bij bug 362464956), en de grens die Chromium op lange
transacties zet, hielp in de proef niet. Op Android kan het besturingssysteem
bovendien de hele app bevriezen; dan is er geen freeze-signaal. Chrome raadt zelf
aan om bij hidden en freeze geen werk meer te beginnen en verbindingen los te
laten. `commit()` op een lopende transactie werkte in de proef niet (Chrome
neemt het alleen aan tijdens een gebeurtenis van die transactie); afbreken wel:
met het freeze-signaal kreeg een tweede tabblad de opslag meteen.

## Alternatieven

Bij hidden alle open transacties afbreken: zou ook werk afbreken dat een
fractie van een seconde later klaar was, bij elk kort wisselen van app. Alle
verbindingen sluiten bij freeze: helpt niet tegen een transactie die al loopt en
maakt elke volgende aanroep duurder. Na een paar seconden zonder slot of zonder
opslag gewoon doorgaan: de app kan zonder opslag niets tonen.

## Bron

Gesprek met de eigenaar op 22 oktober 2026; naspelen met zijn back-up alleen
lokaal (nooit in de repo). Chrome-documentatie: Page Lifecycle API
(developer.chrome.com/docs/web-platform/page-lifecycle-api) en Freezing on
Energy Saver (developer.chrome.com/blog/freezing-on-energy-saver); Chromium-commit
"[IndexedDB] Treat frozen clients as inactive" (d32aa3d9, november 2024).

## Vervangt

Niets. Vult `2026-10-22-openen-wacht-niet-op-de-planning.md` aan.

## Terugdraaien

`installStorageLifecycle()` uit `src/main.tsx` halen en in
`storage/database.ts#getDB` het wachten op `whenStorageOpen` weghalen. Het
geheugen van de opstartstappen gaat weg door `migrationsToRun` altijd alle
stappen te laten geven.
