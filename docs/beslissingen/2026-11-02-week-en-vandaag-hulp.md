# Vier kleine hulpmiddelen in Week en Vandaag

Datum: 2026-11-02
Status: aangenomen

## Besluit

Vier hulpmiddelen, elk zonder stille wijziging van je planning:

1. "Waarom staat dit hier?" in het blad van een training in Week. Eén tik laat de reden van de plek zien, alleen uit
   wat al bewaard is (`engine/placeReason.ts`): een inhaal (`catchUp`), het voorstel achter het slot
   (`PlannedSession.lock.proposalId`, met de titel, de dag van Akkoord en de reden van het item), je eigen verplaatsing
   (`lock.by` is `user`, met de dag), een vakantie of tocht (`leave`), een ruil van het wedstrijdblok (`raceBlock`), een
   verschuiving van de planning zonder bewaarde regel (`movedFromDate` zonder slot), of het weekpatroon
   (`engine/planPass.ts#patternDays`). Een voorstel dat alleen de lengte of de training op zijn dag veranderde, staat
   erbij in een tweede zin; de plek komt dan uit het weekpatroon. Weet de app het niet, dan zegt hij dat eerlijk: met een
   andere vaste dag "Je weekpatroon zet hem op vrijdag. Waarom hij nu op woensdag staat, is niet bewaard.", zonder
   vaste dag "Waarom precies deze dag, is niet bewaard." Geen nieuwe opslag.
2. "Minder tijd vandaag" in het menu van de missiekaart (`engine/shorterToday.ts`). Je kiest 30, 45 of 60 minuten
   (alleen wat korter is dan de training). Het voorstel is dezelfde training op dezelfde dag met een vaste lengte
   (een `move` naar dezelfde dag met `plannedMinutes`, het slot van een voorstel), met het verschil in gewone zinnen:
   bij kracht de kernoefeningen bij naam of een set minder per oefening, bij een loop met blokken de kern of minder
   herhalingen, anders hetzelfde tempo korter. Akkoord via `ProposalSheet`, Ongedaan maken in de melding. De log van
   die dag blijft een gewone log (geen variant, geen vlag). Een test of wedstrijd kan niet korter; het blad zegt dat en
   biedt Verplaatsen, dat door het bestaande voorstel gaat. Instelling "Minder tijd vandaag" (`shorterToday`:
   Kernsets als advies, Minder van alles, Uit) onder Vandaag en meldingen.
3. "Zones bijwerken na een test" (`engine/zoneUpdate.ts`, `components/ZoneUpdateCard.tsx`). Na een test die meetelt en
   de laatste is (`countedTests`) schat de app een drempelhartslag: de gemiddelde hartslag van kilometer 2 tot en met 5
   van de snelste 5 km (`runDetail.bestFive`), keer 0,98. Die factor is een aanname die nog getoetst wordt. Verschilt die 3 bpm of meer van de drempel die er staat, dan
   staat in het logblad en in de nabespreking van de test een voorstel met per zone het oude en het nieuwe getal, en
   de tempo's die met de test meeveranderen. Akkoord bewaart alleen `heartRate.lthr`; Liever niet laat alles staan. Het
   antwoord staat per test in `settings.zoneAnswers` (eigen migratiestap `migrateZoneAnswers`), zodat het voorstel
   niet terugkomt. Na Akkoord kan Ongedaan maken de oude drempel terugzetten. Instelling "Zones bijwerken na een test"
   (`zonesAfterTest`, aan als advies) onder Planning, Geavanceerd.
4. "Details ophalen" voor een oudere run (`engine/detailFetch.ts`). Een run van de laatste 14 dagen haalt zijn
   kilometers en reeks op als het blad opent, zoals voor een nieuwe run. Een oudere run zonder `runDetail` doet dat
   nooit vanzelf; daar staat de knop, die via `ensureRunDetail` met `manual` alleen die run ophaalt, met een grens van
   15 seconden en een zichtbare uitkomst. Een tik vraagt het ook opnieuw na een mislukte poging in dezelfde sessie.
   Een oudere run die zijn kilometers al heeft, houdt het onderhoud bij het openen. `runDetail` blijft afgeleid en
   append-only.

## Reden

De eigenaar wil weten waarom iets in zijn week staat, op een drukke dag liever korter dan niets trainen, zijn zones
laten meegaan met zijn test zonder dat dat stil gebeurt, en de details van oudere runs kunnen ophalen zonder dat de
app alles tegelijk binnenhaalt.

## Alternatieven

- Bij 1 de reden van elke plaatsing opslaan op de rij. Niet gedaan: wat bewaard is, is genoeg voor bijna elke rij, en
  waar het niet genoeg is zegt de app dat. De weekcontrole schrijft haar reparaties zonder rij-id weg; dat blijft zo.
- Bij 2 de oefeningen in Forge echt wegstrepen met een variant. Niet gedaan: de korte varianten staan uit
  (`SESSION_VARIANTS_ENABLED`) en een log met variant `minimum` telt anders in de progressie. Het voorstel zegt wat je
  doet; de log blijft gewoon.
- Bij 3 ook de tempo's achter Akkoord zetten. Niet gedaan: de tempo's volgen de test al, met hun eigen vraag bij een
  twijfeltest en de Akkoord op een snelste 5 km (`2026-10-27-testloop-lezen.md`). Een tweede poort zou het horloge, de
  voorspelling en de trainingen uit elkaar trekken. Het voorstel laat ze wel zien.
- Bij 3 de hartslag van de hele log gebruiken. Niet gedaan: een gekoppelde test komt binnen met in- en uitlopen, dat
  geeft een te lage drempel. Zonder kilometers van het horloge geen voorstel.
- Bij 4 alle oudere runs op de achtergrond aanvullen. Niet gedaan: dat zijn veel verzoeken in een keer bij
  intervals.icu, en de eigenaar vroeg om een knop.

## Bron

Opdracht van de eigenaar, ronde 2b punt 11. De factor 0,98 is een aanname op basis van de test van 30 minuten van
Friel (laatste 20 minuten als drempel); een 5 km is korter en harder. Nog te toetsen door Scout.

## Vervangt

Niets. Het openen van het blad van een run ouder dan 14 dagen zonder kilometers haalt niets meer vanzelf op; dat was
het gedrag uit `2026-10-27-run-in-detail-gegevens.md` en is nu de knop.

## Terugdraaien

1: de prop `placeReason` uit `pages/Week.tsx` halen. 2: instelling op Uit, of de prop `onShorter` weghalen. 3:
instelling uit; een opgeslagen antwoord doet dan niets meer. 4: `AUTO_DETAIL_DAYS` in `engine/detailFetch.ts` heel groot
zetten, dan haalt elk blad weer vanzelf op.
