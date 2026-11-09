# Weerwaarschuwingen en lawinegevaar bij een tocht

Datum: 2026-11-09
Status: aangenomen

## Besluit

Op de dag van een tocht of een lange training buiten (minstens anderhalf uur), en de dag ervoor, staat bovenaan Vandaag een regel met het droge feit eerst als er onweer, zware windstoten of hitte verwacht wordt: "Onweer verwacht vanaf 15:00 in Chamonix." Bij een tocht in de bergen of de sneeuw in het sneeuwseizoen komt daar het lawinegevaar bij: "Lawinegevaar aanzienlijk, 3 van 5, morgen rond Val d'Isère." Beide zijn alleen tekst; de planning verandert er nooit door, en er is geen voorstel. Elk heeft een eigen instelling onder Vandaag, Weer en kleding (Weerwaarschuwingen, Lawinegevaar), standaard aan. De hutten langs de GR5 zijn niet gebouwd.

## Reden

Meteoalarm, de Europese bron van officiële waarschuwingen, is gecontroleerd op 9 november 2026: `feeds.meteoalarm.org` (de JSON-API en de Atom-feeds) antwoordt zonder `access-control-allow-origin`. Een webapp zonder backend kan die dus niet lezen, en een eigen doorgeefluik mag niet (alles lokaal). Daarom vaste drempels op het weermodel van Open-Meteo, dat wel `access-control-allow-origin: *` stuurt en al de bron van het weer is: weercode 95 of hoger is onweer, windstoten vanaf 75 km per uur (de grens voor code geel in het binnenland bij het KNMI), en 30 graden of warmer, tussen 6 en 22 uur. De kaart zegt eerlijk dat het geen officiële waarschuwing is en verwijst naar Meteoalarm.

Het lawinebulletin is wel open en bereikbaar: `static.avalanche.report/eaws_bulletins/<datum>/<datum>.ratings.json` geeft de hoogste gevarenklasse per waarschuwingsgebied voor heel Europa (ongeveer 25 kB), en `regions.avalanches.org/micro-regions/` de gebieden per dienst als GeoJSON. Beide sturen `access-control-allow-origin: *`. Welk gebied bij de plek hoort rekent de telefoon zelf uit; naar buiten gaan alleen een bestandsnaam en een datum. ASCEND kent de bestanden van de Alpen en de Pyreneeën (22 stuks, met grenzen en grootte gemeten op 9 november); heel Spanje en Scandinavië zijn te groot om te halen. Bij de Mont Blanc overlappen vier diensten, dus het lichtste bestand eerst en hoogstens vier.

Wanneer, als bij het bergweer: een tocht met een eigen plek al de dag ervoor; zonder eigen plek alleen op een dag van de tocht en alleen als het weer je locatie volgt. Een lange training buiten gebruikt de plek van je weer. Het sneeuwseizoen is november tot en met mei, of altijd bij terrein sneeuw; zonder bulletin (klasse 0 of geen bestand) is er niets.

Veiligheid: de kaart is een veiligheidskaart in de vaste rij van Vandaag (`engine/todayCards.ts`, `weatherWarning`), staat dus altijd boven de missie, en de tekst staat er helemaal; niets achter een tik of ingeklapt.

Netwerk: alleen als de instelling aan staat, er een doel is en de telefoon online is. Het weer per plek hoogstens eens per uur met een grens van tien seconden (`storage/weatherWarnings.ts`), het lawinegevaar per dag en gebied hoogstens eens per drie uur en het gebied per plek een maand, alles samen met een grens van vijftien seconden (`storage/avalanche.ts`). Beide caches staan op dit toestel onder eigen sleutels en gaan nooit mee in de back-up. Falen is stil: geen regel en geen foutmelding, Vandaag blijft zoals het was.

## Alternatieven

- Meteoalarm via een eigen doorgeefluik of een openbare CORS-proxy. Niet gekozen: geen backend, en een proxy van een ander ziet de plek.
- Een voorstel met Akkoord om de training te verschuiven bij onweer. Niet gekozen: de opdracht vraagt liever alleen een regel, en wat je in de bergen doet is vakwerk.
- Het onweer uit CAPE, zoals het bergweer. Niet gekozen voor een waarschuwing: CAPE is kans op buien, geen verwachting; dat gaf te vaak een regel.
- Hutten langs de GR5 via refuges.info. Niet gebouwd: `src/data/gr5Stages.ts` heeft geen coördinaten per etappe. Nodig: de GPX van de eigenaar omgezet naar `coords` per etappe (begin en eind, of een lijn), daarna een vraag per etappe naar refuges.info binnen een straal, met dezelfde regels voor cache en grens in tijd.

## Bron

De opdracht van de coördinator (backlog, Voor de GR5 en de bergen, akkoord eigenaar 7 november), `docs/beslissingen/2026-10-31-kansen-stap-0.md`, `docs/beslissingen/2026-11-01-kansen-middelgroot.md` (bergweer), metingen met curl op 9 november 2026. Geen persoonsgegevens; alle testdata is nagemaakt.

## Vervangt

Niets.

## Terugdraaien

Zet Weerwaarschuwingen of Lawinegevaar uit; dan gaat er niets naar buiten en is er geen regel. In de code: haal `weatherWarning` uit `TODAY_CARD_RANK` en de kaart uit `pages/Today.tsx`. De twee instellingen zijn optioneel; een back-up met die sleutels blijft importeren in een oudere app.
