# De reden van een overgeslagen of vervallen training staat op het blad

Datum: 2026-11-16
Status: aangenomen

## Besluit

Het blad van een overgeslagen of vervallen training zegt meteen onder de kop in één regel waarom, nooit achter een tik (I-80). De reden komt uit één functie, `engine/skipReason.ts#skipReason`: het voorstel achter het slot op de rij (met de reden van het item uit dat voorstel), jouw slot ("Je koos dit zelf."), het merk van een periode die hem liet vallen, en anders de telling van de ene regel (ziek, vakantie, tocht, zonder sportschool, na de race). Bij ziekte heet hij Vervallen, ook als een ziekmelding hem op overgeslagen zette. Week (teken en woord van de rij) en Vandaag (de rij in Je dag) nemen dat woord over uit dezelfde functie, via `components/useSkipReason.ts`; alleen de weergave verandert, de telling van gemist leest de stand zelf. Weet de app het niet, dan staat er geen regel.

Toch doen volgt de stap verplaatsen door jou in de ene regel (`engine/dayRules.ts`), alleen voor de oorzaken van ziekte: koorts of buikgriep weigert, dus de knop komt niet; verkouden of opbouwen na ziekte met een zware training vraagt eerst, met dezelfde zin als slepen en Liever niet als hoofdknop. Een overgeslagen rij heeft geen mint hoofdknop zolang je ziek bent, als hij door ziekte verviel, of als Toch doen eerst vraagt of niet mag: de keuzes staan als stille rijen. Dat geldt alleen voor een overgeslagen rij; een vervallen rij die niet overgeslagen is houdt zijn hoofdknop, zodat je een training die je toch deed gewoon met Gedaan invult.

De notitie van de week op het blad en op Vandaag noemt geen bereik in minuten meer ("Rustweek (35-45 min)" wordt "Rustweek"). Dat bereik is de vaste tekst van stap 4 van het sjabloon, terwijl de minuten ernaast per golf groeien en door ambitie, hoeveel per soort, de rem van 110 procent en een rustiger instap bewegen. Het getal van de dag is de minuten zelf.

## Reden

Gemeten op 16 november (nagemaakt voorbeeld): een lange duurloop die een verkoudheid van de planning haalde, toonde "Overgeslagen · Hardlopen · 55 min · Rustweek (35-45 min, D+ ook lager)" met Toch doen als mint hoofdknop. De reden stond in het voorstel, maar nergens op het blad, en 55 naast 35-45 sprak elkaar tegen.

## Alternatieven

- De reden achter Waarom staat dit hier?. Niet gekozen: zorg en gezondheid staan nooit achter een tik.
- Toch doen bij ziekte altijd weigeren. Niet gekozen: de ene regel laat rustig bewegen met neus of keel toe; alleen zwaar vraagt eerst.
- Toch doen ook toetsen op vakantie, tocht en je rustdag. Niet gekozen in deze stap: dat verandert gedrag buiten ziekte; het staat als open punt in de oplevering.
- De notities in het sjabloon zelf aanpassen. Niet gekozen: opgeslagen sjablonen van bestaande gebruikers houden de oude tekst; het weghalen bij het tonen geldt voor iedereen.

## Bron

Backlogpunt I-80, `docs/beslissingen/2026-11-15-vervallen-een-bron.md`, `docs/beslissingen/2026-11-16-een-regel-uitzonderingen.md`.

## Vervangt

Niets.

## Terugdraaien

In `components/SessionActionSheet.tsx` de regel `reason`, `backCheck` en `quiet` weghalen; `engine/substitutions.ts#weeklyProgressionNote` weer de notitie zonder `withoutMinuteRange` laten geven.
